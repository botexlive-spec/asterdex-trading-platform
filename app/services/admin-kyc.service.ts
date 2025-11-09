/**
 * Admin KYC Service
 * Handles KYC verification and management for admin panel
 */


/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: KYC verification and management
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-kyc.ts
 * 2. Replace TODO comments with actual API calls using apiRequest()
 * 3. Follow pattern from admin-rank.service.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage or sessionStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}


// ============================================
// SERVICE FUNCTIONS (Need MySQL Backend APIs)
// ============================================


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
    const params = new URLSearchParams();

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }

    if (filters?.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const result = await apiRequest(`/api/kyc${queryString ? '?' + queryString : ''}`);

    return (result.data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      user_name: item.user_meta?.full_name || item.user_meta?.name || 'Unknown',
      user_email: item.user_email,
      user_rank: 'Member',
      user_investment: 0,
      document_type: item.document_type,
      document_number: item.document_number,
      document_front_url: item.document_front_url,
      document_back_url: item.document_back_url,
      selfie_url: item.selfie_url,
      address_proof_url: item.address_proof_url,
      status: item.status,
      rejection_reason: item.rejection_reason,
      reviewed_by: item.reviewed_by,
      reviewed_at: item.reviewed_at,
      notes: item.admin_notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
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
    const result = await apiRequest(`/api/kyc/${submissionId}`);

    if (!result.data) return null;

    const item = result.data;
    return {
      id: item.id,
      user_id: item.user_id,
      user_name: item.user_meta?.full_name || item.user_meta?.name || 'Unknown',
      user_email: item.user_email,
      user_rank: 'Member',
      user_investment: 0,
      document_type: item.document_type,
      document_number: item.document_number,
      document_front_url: item.document_front_url,
      document_back_url: item.document_back_url,
      selfie_url: item.selfie_url,
      address_proof_url: item.address_proof_url,
      status: item.status,
      rejection_reason: item.rejection_reason,
      reviewed_by: item.reviewed_by,
      reviewed_at: item.reviewed_at,
      notes: item.admin_notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
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
    await apiRequest(`/api/kyc/${submissionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });

    console.log(`KYC submission ${submissionId} approved successfully`);
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
    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    await apiRequest(`/api/kyc/${submissionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    console.log(`KYC submission ${submissionId} rejected successfully`);
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
    await apiRequest(`/api/kyc/${submissionId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ message: reason }),
    });

    console.log(`KYC resubmission requested for ${submissionId}`);
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
    const result = await apiRequest('/api/kyc/stats');

    return {
      total_submissions: result.totalSubmissions || 0,
      pending: result.pending || 0,
      approved: result.approved || 0,
      rejected: result.rejected || 0,
      resubmission_required: result.resubmitRequired || 0,
    };
  } catch (error: any) {
    console.error('Error getting KYC stats:', error);
    throw new Error(error.message || 'Failed to get KYC stats');
  }
};
