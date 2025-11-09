/**
 * HTTP Client with Auth Interceptors
 * Automatically attaches tokens and handles refresh token flow
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when refresh completes
 */
function onRefreshComplete(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

    if (!refreshToken) {
      console.log('⚠️ No refresh token available');
      return null;
    }

    console.log('🔄 Refreshing access token...');

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Refresh token expired or invalid');
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;

    // Update stored access token
    if (localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', newAccessToken);
    } else {
      sessionStorage.setItem('auth_token', newAccessToken);
    }

    console.log('✅ Access token refreshed successfully');
    return newAccessToken;

  } catch (error) {
    console.error('❌ Token refresh failed:', error);

    // Clear all auth data if refresh fails
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');

    // Redirect to login
    window.location.href = '/login';

    return null;
  }
}

/**
 * Enhanced fetch with automatic token refresh
 */
export async function httpClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

  // Attach Authorization header
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired
  if (response.status === 401) {
    console.log('🔒 Token expired, attempting refresh...');

    if (!isRefreshing) {
      isRefreshing = true;

      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        // Notify all subscribers
        onRefreshComplete(newToken);

        // Retry original request with new token
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, will redirect to login
        throw new Error('Session expired');
      }
    } else {
      // Wait for ongoing refresh to complete
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          resolve(fetch(url, { ...options, headers }));
        });
      });
    }
  }

  return response;
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<T> {
  const response = await httpClient(`${API_URL}${endpoint}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, data: any): Promise<T> {
  const response = await httpClient(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, data: any): Promise<T> {
  const response = await httpClient(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  const response = await httpClient(`${API_URL}${endpoint}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Export default for convenience
export default {
  get,
  post,
  put,
  delete: del,
  httpClient,
};
