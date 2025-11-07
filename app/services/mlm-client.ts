/**
 * MLM API Client - MySQL Backend
 * Replaces Supabase calls with MySQL backend API endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
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

/**
 * Get user dashboard data
 */
export async function getUserDashboard() {
  return apiRequest('/api/dashboard');
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(limit: number = 50, offset: number = 0, type?: string) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (type) {
    params.append('type', type);
  }

  return apiRequest(`/api/transactions?${params.toString()}`);
}

/**
 * Get packages (stub - implement when needed)
 */
export async function getPackages() {
  return apiRequest('/api/packages');
}

/**
 * Get user packages (stub - implement when needed)
 */
export async function getUserPackages() {
  return apiRequest('/api/packages/user');
}
