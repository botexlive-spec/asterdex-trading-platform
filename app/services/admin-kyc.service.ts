/**
 * Admin KYC Service
 * Handles KYC verification and management for admin panel
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface KYCSubmissionAdmin {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_rank?: string;
  user_investment?: number;
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url?: string;
  selfie_url: string;
  address_proof_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'resubmission_required';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface KYCStats {
  total_submissions: number;
  pending: number;
  approved: number;
  rejected: number;
  resubmission_required: number;
}

/**
 * Get all KYC submissions with filters
 */
export const getAllKYCSubmissions = async (filters?: {
  status?: string;
  search?: string;
  priority?: string;
}): Promise<KYCSubmissionAdmin[]> => {
  try {
        // Verify admin access
    await requireAdmin();

let query = supabase
      .from('kyc_documents')
      .select(`
        *,
        user:user_id(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      // Search by user email or name - need to join with users table
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      user_name: item.user?.raw_user_meta_data?.full_name || item.user?.raw_user_meta_data?.name || 'Unknown',
      user_email: item.user?.email,
      user_rank: 'Member',
      user_investment: 0,
    }));
  } catch (error: any) {
    console.error('Error getting KYC submissions:', error);
    throw new Error(error.message || 'Failed to get KYC submissions');
  }
};

/**
 * Get KYC submission by ID
 */
export const getKYCSubmission = async (submissionId: string): Promise<KYCSubmissionAdmin | null> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('kyc_documents')
      .select(`
        *,
        user:user_id(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      user_name: data.user?.raw_user_meta_data?.full_name || data.user?.raw_user_meta_data?.name || 'Unknown',
      user_email: data.user?.email,
      user_rank: 'Member',
      user_investment: 0,
    };
  } catch (error: any) {
    console.error('Error getting KYC submission:', error);
    throw new Error(error.message || 'Failed to get KYC submission');
  }
};

/**
 * Approve KYC submission
 */
export const approveKYC = async (
  submissionId: string,
  notes?: string
): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: { user: admin }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!admin) throw new Error('Admin not authenticated');

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('kyc_documents')
      .select('user_id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;
    if (!submission) throw new Error('KYC submission not found');

    if (submission.status === 'approved') {
      throw new Error('KYC already approved');
    }

    // Update KYC document status
    const { error: updateDocError } = await supabase
      .from('kyc_documents')
      .update({
        status: 'approved',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', submissionId);

    if (updateDocError) throw updateDocError;

    // Update user KYC status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        kyc_status: 'approved',
        kyc_approved_at: new Date().toISOString(),
      })
      .eq('id', submission.user_id);

    if (updateUserError) throw updateUserError;

    // Log admin action
    await supabase.from('admin_actions').insert({
      user_id: submission.user_id,
      admin_id: admin.id,
      action: 'approve_kyc',
      metadata: { submission_id: submissionId, notes },
    });

    // TODO: Send approval email to user
  } catch (error: any) {
    console.error('Error approving KYC:', error);
    throw new Error(error.message || 'Failed to approve KYC');
  }
};

/**
 * Reject KYC submission
 */
export const rejectKYC = async (
  submissionId: string,
  reason: string
): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: { user: admin }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!admin) throw new Error('Admin not authenticated');

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('kyc_documents')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;
    if (!submission) throw new Error('KYC submission not found');

    // Update KYC document status
    const { error: updateDocError } = await supabase
      .from('kyc_documents')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateDocError) throw updateDocError;

    // Update user KYC status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        kyc_status: 'rejected',
      })
      .eq('id', submission.user_id);

    if (updateUserError) throw updateUserError;

    // Log admin action
    await supabase.from('admin_actions').insert({
      user_id: submission.user_id,
      admin_id: admin.id,
      action: 'reject_kyc',
      metadata: { submission_id: submissionId, reason },
    });

    // TODO: Send rejection email to user with reason
  } catch (error: any) {
    console.error('Error rejecting KYC:', error);
    throw new Error(error.message || 'Failed to reject KYC');
  }
};

/**
 * Request KYC resubmission
 */
export const requestKYCResubmission = async (
  submissionId: string,
  reason: string
): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: { user: admin }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!admin) throw new Error('Admin not authenticated');

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('kyc_documents')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;
    if (!submission) throw new Error('KYC submission not found');

    // Update KYC document status
    const { error: updateDocError } = await supabase
      .from('kyc_documents')
      .update({
        status: 'resubmission_required',
        rejection_reason: reason,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateDocError) throw updateDocError;

    // Update user KYC status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        kyc_status: 'pending',
      })
      .eq('id', submission.user_id);

    if (updateUserError) throw updateUserError;

    // Log admin action
    await supabase.from('admin_actions').insert({
      user_id: submission.user_id,
      admin_id: admin.id,
      action: 'request_kyc_resubmission',
      metadata: { submission_id: submissionId, reason },
    });

    // TODO: Send resubmission request email to user
  } catch (error: any) {
    console.error('Error requesting KYC resubmission:', error);
    throw new Error(error.message || 'Failed to request KYC resubmission');
  }
};

/**
 * Get KYC statistics
 */
export const getKYCStats = async (): Promise<KYCStats> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: submissions } = await supabase
      .from('kyc_documents')
      .select('status');

    const stats: KYCStats = {
      total_submissions: submissions?.length || 0,
      pending: submissions?.filter(s => s.status === 'pending').length || 0,
      approved: submissions?.filter(s => s.status === 'approved').length || 0,
      rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
      resubmission_required: submissions?.filter(s => s.status === 'resubmission_required').length || 0,
    };

    return stats;
  } catch (error: any) {
    console.error('Error getting KYC stats:', error);
    throw new Error(error.message || 'Failed to get KYC stats');
  }
};
