/**
 * KYC Service
 * Handles identity verification, document uploads, and KYC status management
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
 * Upload a document to Supabase Storage
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

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get document URL');
    }

    // Create document record
    await supabase.from('kyc_documents').insert({
      user_id: userId,
      document_type: documentType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
    });

    return urlData.publicUrl;
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
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Check if user already has a pending or approved submission
    const { data: existingSubmission } = await supabase
      .from('kyc_submissions')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (existingSubmission) {
      if (existingSubmission.status === 'pending') {
        throw new Error('You already have a pending KYC submission under review');
      }
      if (existingSubmission.status === 'approved') {
        throw new Error('Your KYC is already approved');
      }
    }

    // Upload documents
    console.log('Uploading front document...');
    const frontDocumentUrl = await uploadDocument(
      request.front_document,
      request.document_type as DocumentType,
      user.id
    );

    let backDocumentUrl: string | undefined;
    if (request.back_document) {
      console.log('Uploading back document...');
      backDocumentUrl = await uploadDocument(
        request.back_document,
        `${request.document_type}_back` as DocumentType,
        user.id
      );
    }

    console.log('Uploading selfie...');
    const selfieUrl = await uploadDocument(request.selfie, 'selfie', user.id);

    console.log('Uploading proof of address...');
    const proofOfAddressUrl = await uploadDocument(
      request.proof_of_address,
      'proof_of_address',
      user.id
    );

    // Create or update KYC submission
    const submissionData = {
      user_id: user.id,
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
      front_document_url: frontDocumentUrl,
      back_document_url: backDocumentUrl,
      selfie_url: selfieUrl,
      proof_of_address_url: proofOfAddressUrl,
      submitted_at: new Date().toISOString(),
    };

    let submission;
    if (existingSubmission && existingSubmission.status === 'rejected') {
      // Update existing rejected submission
      const { data, error } = await supabase
        .from('kyc_submissions')
        .update(submissionData)
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (error) throw error;
      submission = data;
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('kyc_submissions')
        .insert(submissionData)
        .select()
        .single();

      if (error) throw error;
      submission = data;
    }

    // Update user's KYC status
    await supabase
      .from('users')
      .update({
        kyc_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return {
      submission: submission as KYCSubmission,
      message: 'KYC submitted successfully! Your documents are under review.',
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get user's KYC status from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const status = (userData?.kyc_status as KYCStatus) || 'not_submitted';

    // Get submission details if exists
    const { data: submission } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const canResubmit = status === 'not_submitted' || status === 'rejected';

    return {
      status,
      submission: submission as KYCSubmission | undefined,
      can_resubmit: canResubmit,
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return (data || []) as KYCDocument[];
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('kyc_documents')
      .select('file_url, user_id')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;
    if (!document) throw new Error('Document not found');

    // Verify ownership
    if (document.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Extract file path from URL
    const urlParts = document.file_url.split('/');
    const filePath = urlParts.slice(-2).join('/'); // Get last two parts (userId/filename)

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('kyc-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('kyc_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;
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
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select(`
        *,
        user:users (
          id,
          email,
          full_name
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) throw error;

    return data as KYCSubmission;
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
    let query = supabase
      .from('kyc_submissions')
      .select(`
        *,
        user:users (
          id,
          email,
          full_name
        )
      `)
      .order('submitted_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as KYCSubmission[];
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get submission
    const { data: submission, error: subError } = await supabase
      .from('kyc_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (subError) throw subError;
    if (!submission) throw new Error('Submission not found');

    // Update submission status
    const { error: updateError } = await supabase
      .from('kyc_submissions')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // Update user's KYC status
    await supabase
      .from('users')
      .update({
        kyc_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.user_id);
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get submission
    const { data: submission, error: subError } = await supabase
      .from('kyc_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (subError) throw subError;
    if (!submission) throw new Error('Submission not found');

    // Update submission status
    const { error: updateError } = await supabase
      .from('kyc_submissions')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        notes,
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // Update user's KYC status
    await supabase
      .from('users')
      .update({
        kyc_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.user_id);
  } catch (error: any) {
    console.error('Error rejecting KYC:', error);
    throw new Error(error.message || 'Failed to reject KYC');
  }
};
