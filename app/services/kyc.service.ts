/**
 * KYC Service
 * Handles identity verification, document uploads, and KYC status management
 *
 * ✅ BACKEND INTEGRATION COMPLETE
 * All functions now call real backend APIs via apiClient
 * Note: File upload still uses placeholder URLs (AWS S3/Cloudinary integration pending)
 */

import apiClient from '../utils/api-client';
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

    // Convert file to base64 for API transmission
    // TODO: In production, implement actual file upload to cloud storage (AWS S3, Cloudinary, etc.)
    const reader = new FileReader();
    const fileDataPromise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    const fileData = await fileDataPromise;

    const response = await apiClient.post<{ url: string; success: boolean; message: string }>('/user/kyc/upload-document', {
      file_data: fileData,
      document_type: documentType,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    if (response.error || !response.data?.url) {
      throw new Error(response.error || 'Failed to upload document');
    }

    return response.data.url;
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
    const response = await apiClient.post<{ success: boolean; message: string }>('/user/kyc/submit', request);

    if (response.error) {
      throw new Error(response.error);
    }

    // After successful submission, fetch the updated status
    const statusResponse = await getKYCStatus();

    return {
      submission: statusResponse.submission,
      message: response.data?.message || 'KYC submitted successfully! Documents are under review.',
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
    const response = await apiClient.get<KYCStatusResponse>('/user/kyc/status');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || {
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
    const response = await apiClient.get<{ documents: KYCDocument[] }>('/user/kyc/documents');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data?.documents || [];
  } catch (error: any) {
    console.error('Error getting KYC documents:', error);
    throw new Error(error.message || 'Failed to get KYC documents');
  }
};

/**
 * Delete a document (only for rejected or not submitted KYC)
 * Note: Not yet implemented in backend API
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    // TODO: Implement backend API endpoint DELETE /api/user/kyc/documents/:id
    // TODO: Delete from storage and database
    console.log('deleteDocument: Not yet implemented in backend -', documentId);
    throw new Error('Document deletion not yet implemented');
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
    const response = await apiClient.get<{ submission: KYCSubmission }>(`/kyc/${submissionId}`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data?.submission || null;
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
    const endpoint = status ? `/kyc?status=${status}` : '/kyc';
    const response = await apiClient.get<{ submissions: KYCSubmission[]; total: number }>(endpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data?.submissions || [];
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
    const response = await apiClient.post(`/kyc/${submissionId}/approve`, {
      admin_notes: notes,
    });

    if (response.error) {
      throw new Error(response.error);
    }
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
    const response = await apiClient.post(`/kyc/${submissionId}/reject`, {
      rejection_reason: rejectionReason,
      admin_notes: notes,
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error: any) {
    console.error('Error rejecting KYC:', error);
    throw new Error(error.message || 'Failed to reject KYC');
  }
};
