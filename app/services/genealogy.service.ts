/**
 * Genealogy Service - MySQL Backend API
 * Handles binary tree genealogy with MySQL backend
 * NO SUPABASE - Pure MySQL API
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Binary Tree Node Structure
 */
export interface BinaryTreeNode {
  user_id: string;
  email: string;
  full_name: string;
  total_investment: number;
  wallet_balance: number;
  left_volume: number;
  right_volume: number;
  current_rank: string;
  is_active: boolean;
  created_at: string;
  level: number;
  position: 'root' | 'left' | 'right';
  children: BinaryTreeNode[];
}

/**
 * Binary Tree Stats
 */
export interface BinaryTreeStats {
  leftVolume: number;
  rightVolume: number;
  weakerLeg: 'left' | 'right';
  weakerLegVolume: number;
  strongerLegVolume: number;
  carryForward: number;
  totalBinaryPoints: number;
}

/**
 * Available Positions Response
 */
export interface AvailablePositionsResponse {
  success: boolean;
  availablePositions: Array<'left' | 'right'>;
  leftOccupied: boolean;
  rightOccupied: boolean;
}

/**
 * Get binary tree for current user
 */
export async function getBinaryTree(depth: number = 5): Promise<BinaryTreeNode | null> {
  try {
    console.log(`🌳 [Genealogy] Fetching binary tree (depth: ${depth})...`);
    const startTime = Date.now();

    const response = await apiRequest<{ success: boolean; tree: BinaryTreeNode | null; message?: string }>(
      `/api/genealogy/tree?depth=${depth}`
    );

    const loadTime = Date.now() - startTime;
    console.log(`✅ [Genealogy] Tree loaded in ${loadTime}ms`);

    if (response.message) {
      console.log(`ℹ️  [Genealogy] ${response.message}`);
    }

    return response.tree;
  } catch (error: any) {
    console.error('❌ [Genealogy] Error fetching binary tree:', error);
    throw new Error(error.message || 'Failed to fetch binary tree');
  }
}

/**
 * Initialize binary tree node for user (if not exists)
 */
export async function initializeBinaryNode(): Promise<{ success: boolean; nodeId: string; message: string }> {
  try {
    console.log('🌱 [Genealogy] Initializing binary node...');

    const response = await apiRequest<{ success: boolean; nodeId: string; message: string }>(
      '/genealogy/initialize',
      { method: 'POST' }
    );

    console.log(`✅ [Genealogy] ${response.message}`);
    return response;
  } catch (error: any) {
    console.error('❌ [Genealogy] Error initializing binary node:', error);
    throw new Error(error.message || 'Failed to initialize binary node');
  }
}

/**
 * Place a member in binary tree
 */
export async function placeMemberInTree(
  memberId: string,
  parentId: string,
  position: 'left' | 'right'
): Promise<{ success: boolean; nodeId: string; message: string }> {
  try {
    console.log(`🎯 [Genealogy] Placing member ${memberId} under ${parentId} at ${position}...`);

    const response = await apiRequest<{ success: boolean; nodeId: string; message: string }>(
      '/genealogy/place-member',
      {
        method: 'POST',
        body: JSON.stringify({ memberId, parentId, position }),
      }
    );

    console.log(`✅ [Genealogy] ${response.message}`);
    return response;
  } catch (error: any) {
    console.error('❌ [Genealogy] Error placing member:', error);
    throw new Error(error.message || 'Failed to place member in binary tree');
  }
}

/**
 * Get available positions under a parent
 */
export async function getAvailablePositions(parentId: string): Promise<AvailablePositionsResponse> {
  try {
    console.log(`🔍 [Genealogy] Checking available positions under ${parentId}...`);

    const response = await apiRequest<AvailablePositionsResponse>(
      `/api/genealogy/available-positions/${parentId}`
    );

    console.log(`✅ [Genealogy] Available positions:`, response.availablePositions);
    return response;
  } catch (error: any) {
    console.error('❌ [Genealogy] Error checking positions:', error);
    throw new Error(error.message || 'Failed to check available positions');
  }
}

/**
 * Get binary tree statistics
 */
export async function getBinaryTreeStats(): Promise<BinaryTreeStats> {
  try {
    console.log('📊 [Genealogy] Fetching binary tree stats...');

    const response = await apiRequest<{ success: boolean; stats: BinaryTreeStats }>(
      '/genealogy/stats'
    );

    console.log(`✅ [Genealogy] Stats loaded:`, response.stats);
    return response.stats;
  } catch (error: any) {
    console.error('❌ [Genealogy] Error fetching stats:', error);
    throw new Error(error.message || 'Failed to fetch binary tree stats');
  }
}

/**
 * Count total nodes in tree
 */
export function countTreeNodes(node: BinaryTreeNode | null): number {
  if (!node) return 0;

  let count = 1; // Count current node

  node.children.forEach(child => {
    count += countTreeNodes(child);
  });

  return count;
}

/**
 * Find a node by user ID in tree
 */
export function findNodeById(tree: BinaryTreeNode | null, userId: string): BinaryTreeNode | null {
  if (!tree) return null;
  if (tree.user_id === userId) return tree;

  for (const child of tree.children) {
    const found = findNodeById(child, userId);
    if (found) return found;
  }

  return null;
}

/**
 * Get tree depth
 */
export function getTreeDepth(node: BinaryTreeNode | null): number {
  if (!node) return 0;

  if (node.children.length === 0) return 1;

  const childDepths = node.children.map(child => getTreeDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Flatten tree to array
 */
export function flattenTree(node: BinaryTreeNode | null): BinaryTreeNode[] {
  if (!node) return [];

  const result: BinaryTreeNode[] = [node];

  node.children.forEach(child => {
    result.push(...flattenTree(child));
  });

  return result;
}

/**
 * Create Member Data Interface
 */
export interface CreateMemberData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  initialInvestment?: number;
  parentId: string;
  position: 'left' | 'right';
}

/**
 * Create Member Response Interface
 */
export interface CreateMemberResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    referral_code: string;
    wallet_balance: number;
    total_investment: number;
    created_at: string;
  };
  binaryNode: {
    id: string;
    position: string;
  };
  message: string;
}

/**
 * Create new member under current user's tree
 * Users can add members under their own node or nodes in their downline
 */
export async function createMember(data: CreateMemberData): Promise<CreateMemberResponse> {
  try {
    console.log('👤 [Genealogy Service] Creating member:', {
      email: data.email,
      parentId: data.parentId,
      position: data.position,
    });

    const response = await apiRequest<CreateMemberResponse>('/genealogy/add-member', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    console.log('✅ [Genealogy Service] Member created:', response.user.email);
    return response;
  } catch (error: any) {
    console.error('❌ [Genealogy Service] Error creating member:', error);
    throw new Error(error.message || 'Failed to create member');
  }
}
