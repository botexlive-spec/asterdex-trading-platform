/**
 * API Client - Centralized export
 * Re-exports the axios-based API client for use throughout the app
 */

import { apiClient, userAPI, adminAPI } from '../api/axios';

// Export the main API client as default
export default apiClient;

// Named exports for specific API instances
export { apiClient, userAPI, adminAPI };
