/**
 * KYC Service
 * Handles identity verification, document uploads, and KYC status management
 *
 * ⚠️  STUB IMPLEMENTATION
 * All functions return placeholder data until backend API + file storage is implemented.
 * This fixes Supabase usage without imports that was causing build failures.
 */

import {
  KYCSubmission,
  KYCSubmissionRequest,
  KYCSubmissionResponse,
  KYCStatusResponse,
  KYCDocument,
  DocumentType,
  KYCStatus,
} from '../types/kyc.types';

/**
 * Upload a document to storage
 */
export const uploadDocument = async (
  file: File,
  documentType: DocumentType,
  userId: string
): Promise<string> => {
  try {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed');
    }

    // TODO: Implement file upload to backend storage (AWS S3, Cloudinary, etc.)
    // TODO: Create backend API endpoint /api/kyc/upload-document
    console.log('uploadDocument: Placeholder - simulating upload for', file.name);

    // Return placeholder URL
    return `https://placeholder.com/${userId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`;
  } catch (error: any) {
    console.error('Error uploading document:', error);
    throw new Error(error.message || 'Failed to upload document');
  }
};

/**
 * Submit KYC application with documents
 */
export const submitKYC = async (
  request: KYCSubmissionRequest
): Promise<KYCSubmissionResponse> => {
  try {
    // TODO: Implement backend API endpoint /api/kyc/submit
    // TODO: Handle file uploads via uploadDocument()
    // TODO: Store submission in database

    console.log('submitKYC: Placeholder - simulating submission for', request.full_name);

    // Mock submission object
    const mockSubmission: KYCSubmission = {
      id: `kyc_${Date.now()}`,
      user_id: 'current_user_id',
      status: 'pending' as KYCStatus,
      document_type: request.document_type,
      document_number: request.document_number,
      full_name: request.full_name,
      date_of_birth: request.date_of_birth,
      nationality: request.nationality,
      address: request.address,
      city: request.city,
      state: request.state,
      postal_code: request.postal_code,
      country: request.country,
      phone: request.phone,
      front_document_url: 'https://placeholder.com/front.jpg',
      back_document_url: request.back_document ? 'https://placeholder.com/back.jpg' : undefined,
      selfie_url: 'https://placeholder.com/selfie.jpg',
      proof_of_address_url: 'https://placeholder.com/address.jpg',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      submission: mockSubmission,
      message: 'KYC submitted successfully (placeholder)! Documents are under review.',
    };
  } catch (error: any) {
    console.error('Error submitting KYC:', error);
    throw new Error(error.message || 'Failed to submit KYC');
  }
};

/**
 * Get current KYC status for the logged-in user
 */
export const getKYCStatus = async (): Promise<KYCStatusResponse> => {
  try {
    // TODO: Implement backend API endpoint /api/kyc/status
    // TODO: Get current user from auth token
    // TODO: Fetch KYC submission from database

    console.log('getKYCStatus: Placeholder - returning not_submitted status');

    return {
      status: 'not_submitted' as KYCStatus,
      submission: undefined,
      can_resubmit: true,
    };
  } catch (error: any) {
    console.error('Error getting KYC status:', error);
    throw new Error(error.message || 'Failed to get KYC status');
  }
};

/**
 * Get all KYC documents for the logged-in user
 */
export const getKYCDocuments = async (): Promise<KYCDocument[]> => {
  try {
    // TODO: Implement backend API endpoint /api/kyc/documents
    console.log('getKYCDocuments: Placeholder - returning empty array');
    return [];
  } catch (error: any) {
    console.error('Error getting KYC documents:', error);
    throw new Error(error.message || 'Failed to get KYC documents');
  }
};

/**
 * Delete a document (only for rejected or not submitted KYC)
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    // TODO: Implement backend API endpoint /api/kyc/documents/:id
    // TODO: Delete from storage and database
    console.log('deleteDocument: Placeholder - simulating delete for', documentId);
  } catch (error: any) {
    console.error('Error deleting document:', error);
    throw new Error(error.message || 'Failed to delete document');
  }
};

/**
 * Get KYC submission by ID (admin only)
 */
export const getKYCSubmissionById = async (submissionId: string): Promise<KYCSubmission | null> => {
  try {
    // TODO: Implement backend API endpoint /api/admin/kyc/submissions/:id
    console.log('getKYCSubmissionById: Placeholder - returning null for', submissionId);
    return null;
  } catch (error: any) {
    console.error('Error getting KYC submission:', error);
    throw new Error(error.message || 'Failed to get KYC submission');
  }
};

/**
 * Get all KYC submissions (admin only)
 */
export const getAllKYCSubmissions = async (
  status?: KYCStatus
): Promise<KYCSubmission[]> => {
  try {
    // TODO: Implement backend API endpoint /api/admin/kyc/submissions
    console.log('getAllKYCSubmissions: Placeholder - returning empty array, filter:', status);
    return [];
  } catch (error: any) {
    console.error('Error getting KYC submissions:', error);
    throw new Error(error.message || 'Failed to get KYC submissions');
  }
};

/**
 * Approve KYC submission (admin only)
 */
export const approveKYC = async (
  submissionId: string,
  notes?: string
): Promise<void> => {
  try {
    // TODO: Implement backend API endpoint /api/admin/kyc/approve
    // TODO: Update submission status to 'approved'
    // TODO: Update user's kyc_status field
    console.log('approveKYC: Placeholder - simulating approval for', submissionId, notes);
  } catch (error: any) {
    console.error('Error approving KYC:', error);
    throw new Error(error.message || 'Failed to approve KYC');
  }
};

/**
 * Reject KYC submission (admin only)
 */
export const rejectKYC = async (
  submissionId: string,
  rejectionReason: string,
  notes?: string
): Promise<void> => {
  try {
    // TODO: Implement backend API endpoint /api/admin/kyc/reject
    // TODO: Update submission status to 'rejected'
    // TODO: Store rejection reason and notes
    console.log('rejectKYC: Placeholder - simulating rejection for', submissionId, rejectionReason, notes);
  } catch (error: any) {
    console.error('Error rejecting KYC:', error);
    throw new Error(error.message || 'Failed to reject KYC');
  }
};
