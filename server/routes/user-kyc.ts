/**
 * User KYC Routes - MySQL Backend
 * Handles user-level KYC submission and status checking
 */

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware: Authenticate any logged-in user
function authenticateUser(req: Request, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role?: string };

    (req as any).user = decoded;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.use(authenticateUser);

/**
 * GET /api/user/kyc/status
 * Get current user's KYC status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get user's KYC submission
    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT
        id,
        status,
        document_type,
        document_number,
        full_name,
        date_of_birth,
        nationality,
        address,
        city,
        state,
        postal_code,
        country,
        phone,
        front_document_url,
        back_document_url,
        selfie_url,
        proof_of_address_url,
        rejection_reason,
        admin_notes,
        submitted_at,
        reviewed_at,
        created_at,
        updated_at
       FROM kyc_verifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (submissions.length === 0) {
      return res.json({
        status: 'not_submitted',
        submission: null,
        can_resubmit: true
      });
    }

    const submission = submissions[0];
    const canResubmit = submission.status === 'rejected' || submission.status === 'resubmit';

    res.json({
      status: submission.status,
      submission: submission,
      can_resubmit: canResubmit
    });

  } catch (error: any) {
    console.error('Error getting KYC status:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

/**
 * POST /api/user/kyc/submit
 * Submit KYC application
 *
 * Note: This is a simplified implementation that accepts document URLs.
 * In production, you would implement file upload with cloud storage (AWS S3, Cloudinary, etc.)
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      document_type,
      document_number,
      full_name,
      date_of_birth,
      nationality,
      address,
      city,
      state,
      postal_code,
      country,
      phone,
      front_document_url,
      back_document_url,
      selfie_url,
      proof_of_address_url
    } = req.body;

    // Validate required fields
    if (!document_type || !document_number || !full_name || !date_of_birth ||
        !nationality || !address || !city || !country || !phone ||
        !front_document_url || !selfie_url || !proof_of_address_url) {
      return res.status(400).json({
        error: 'Missing required fields. All fields except back_document_url are required.'
      });
    }

    // Check if user already has a pending or approved submission
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, status FROM kyc_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'pending') {
        return res.status(400).json({
          error: 'You already have a pending KYC submission under review'
        });
      }
      if (existing[0].status === 'approved') {
        return res.status(400).json({
          error: 'Your KYC is already approved'
        });
      }
    }

    // Insert or update KYC submission
    if (existing.length > 0 && existing[0].status === 'rejected') {
      // Update existing rejected submission
      await pool.query(
        `UPDATE kyc_verifications SET
          status = 'pending',
          document_type = ?,
          document_number = ?,
          full_name = ?,
          date_of_birth = ?,
          nationality = ?,
          address = ?,
          city = ?,
          state = ?,
          postal_code = ?,
          country = ?,
          phone = ?,
          front_document_url = ?,
          back_document_url = ?,
          selfie_url = ?,
          proof_of_address_url = ?,
          submitted_at = NOW(),
          updated_at = NOW(),
          reviewed_by = NULL,
          reviewed_at = NULL,
          rejection_reason = NULL,
          admin_notes = NULL
         WHERE id = ?`,
        [
          document_type, document_number, full_name, date_of_birth,
          nationality, address, city, state, postal_code, country, phone,
          front_document_url, back_document_url, selfie_url, proof_of_address_url,
          existing[0].id
        ]
      );
    } else {
      // Create new submission
      await pool.query(
        `INSERT INTO kyc_verifications (
          user_id, status, document_type, document_number, full_name, date_of_birth,
          nationality, address, city, state, postal_code, country, phone,
          front_document_url, back_document_url, selfie_url, proof_of_address_url,
          submitted_at, created_at, updated_at
        ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          userId, document_type, document_number, full_name, date_of_birth,
          nationality, address, city, state, postal_code, country, phone,
          front_document_url, back_document_url, selfie_url, proof_of_address_url
        ]
      );
    }

    // Update user's kyc_status field
    await pool.query(
      'UPDATE users SET kyc_status = ? WHERE id = ?',
      ['pending', userId]
    );

    res.json({
      success: true,
      message: 'KYC submitted successfully! Your documents are under review.'
    });

  } catch (error: any) {
    console.error('Error submitting KYC:', error);
    res.status(500).json({ error: 'Failed to submit KYC application' });
  }
});

/**
 * POST /api/user/kyc/upload-document
 * Upload a single KYC document
 *
 * Note: This is a placeholder implementation.
 * In production, implement file upload middleware (multer) and cloud storage integration.
 *
 * Expected body:
 * {
 *   file_data: string (base64) or file metadata,
 *   document_type: string (e.g., 'passport_front', 'selfie', etc.)
 * }
 *
 * Returns:
 * {
 *   url: string (URL to the uploaded file)
 * }
 */
router.post('/upload-document', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { file_data, document_type, file_name, file_size, mime_type } = req.body;

    if (!file_data || !document_type) {
      return res.status(400).json({ error: 'file_data and document_type are required' });
    }

    // TODO: Implement actual file upload to cloud storage
    // For now, return a placeholder URL
    const timestamp = Date.now();
    const placeholderUrl = `https://kyc-storage.finaster.com/${userId}/${document_type}_${timestamp}.jpg`;

    // Optionally store metadata in database
    /*
    await pool.query(
      `INSERT INTO kyc_documents (
        user_id, document_type, file_name, file_url, file_size, mime_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, document_type, file_name || `${document_type}.jpg`, placeholderUrl, file_size || 0, mime_type || 'image/jpeg']
    );
    */

    res.json({
      success: true,
      url: placeholderUrl,
      message: 'Document uploaded successfully (placeholder)'
    });

  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/user/kyc/documents
 * Get all KYC documents for the current user
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get user's KYC submission documents
    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT
        front_document_url,
        back_document_url,
        selfie_url,
        proof_of_address_url,
        created_at
       FROM kyc_verifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (submissions.length === 0) {
      return res.json({ documents: [] });
    }

    const submission = submissions[0];
    const documents = [];

    if (submission.front_document_url) {
      documents.push({
        type: 'front_document',
        url: submission.front_document_url,
        uploaded_at: submission.created_at
      });
    }

    if (submission.back_document_url) {
      documents.push({
        type: 'back_document',
        url: submission.back_document_url,
        uploaded_at: submission.created_at
      });
    }

    if (submission.selfie_url) {
      documents.push({
        type: 'selfie',
        url: submission.selfie_url,
        uploaded_at: submission.created_at
      });
    }

    if (submission.proof_of_address_url) {
      documents.push({
        type: 'proof_of_address',
        url: submission.proof_of_address_url,
        uploaded_at: submission.created_at
      });
    }

    res.json({ documents });

  } catch (error: any) {
    console.error('Error getting KYC documents:', error);
    res.status(500).json({ error: 'Failed to get KYC documents' });
  }
});

export default router;
