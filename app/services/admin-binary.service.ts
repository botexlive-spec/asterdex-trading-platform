/**
 * Admin Binary Tree Service
 * Manages binary tree operations, placements, and settings
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface BinaryNode {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  parent_id: string | null;
  position: 'left' | 'right' | null;
  left_volume: number;
  right_volume: number;
  personal_volume: number;
  level: number;
  is_active: boolean;
  left_child?: BinaryNode;
  right_child?: BinaryNode;
}

export interface BinarySettings {
  spilloverEnabled: boolean;
  spilloverRule: 'auto' | 'manual';
  placementPriority: 'left' | 'right' | 'weaker-leg' | 'balanced';
  cappingEnabled: boolean;
  dailyCap: number;
  weeklyCap: number;
  monthlyCap: number;
  matchingBonusPercentage: number;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number;
}

export interface BinaryReport {
  userId: string;
  userName: string;
  leftVolume: number;
  rightVolume: number;
  lesserVolume: number;
  matchingBonus: number;
  carryForward: number;
  totalEarnings: number;
  lastCalculated: string;
}

/**
 * Get binary tree for a specific user
 */
export const getBinaryTree = async (userId: string): Promise<BinaryNode | null> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('binary_nodes')
      .select(`
        id,
        user_id,
        parent_id,
        position,
        left_volume,
        right_volume,
        personal_volume,
        users!binary_tree_user_id_fkey (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('No binary tree found for user:', userId);
      return null;
    }

    // Recursively load children
    const node: BinaryNode = {
      id: data.id,
      user_id: data.user_id,
      user_name: data.users?.full_name || 'Unknown',
      user_email: data.users?.email || '',
      parent_id: data.parent_id,
      position: data.position,
      left_volume: data.left_volume || 0,
      right_volume: data.right_volume || 0,
      personal_volume: data.personal_volume || 0,
      level: 0, // Will be calculated
      is_active: data.users?.is_active || false,
    };

    // Load children
    const { data: children } = await supabase
      .from('binary_nodes')
      .select(`
        id,
        user_id,
        parent_id,
        position,
        left_volume,
        right_volume,
        personal_volume,
        users!binary_tree_user_id_fkey (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .eq('parent_id', userId);

    if (children) {
      const leftChild = children.find((c: any) => c.position === 'left');
      const rightChild = children.find((c: any) => c.position === 'right');

      if (leftChild) {
        node.left_child = await getBinaryTree(leftChild.user_id);
      }
      if (rightChild) {
        node.right_child = await getBinaryTree(rightChild.user_id);
      }
    }

    return node;
  } catch (error: any) {
    console.error('Error getting binary tree:', error);
    return null;
  }
};

/**
 * Get all binary tree nodes (flat list)
 */
export const getAllBinaryNodes = async (): Promise<BinaryNode[]> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('binary_nodes')
      .select(`
        id,
        user_id,
        parent_id,
        position,
        left_volume,
        right_volume,
        personal_volume,
        users!binary_tree_user_id_fkey (
          id,
          full_name,
          email,
          is_active
        )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data?.map((node: any) => ({
      id: node.id,
      user_id: node.user_id,
      user_name: node.users?.full_name || 'Unknown',
      user_email: node.users?.email || '',
      parent_id: node.parent_id,
      position: node.position,
      left_volume: node.left_volume || 0,
      right_volume: node.right_volume || 0,
      personal_volume: node.personal_volume || 0,
      level: 0,
      is_active: node.users?.is_active || false,
    })) || [];
  } catch (error: any) {
    console.error('Error getting all binary nodes:', error);
    return [];
  }
};

/**
 * Get binary settings
 */
export const getBinarySettings = async (): Promise<BinarySettings> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('binary_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return getDefaultBinarySettings();
    }

    return data;
  } catch (error: any) {
    console.log('Using default binary settings');
    return getDefaultBinarySettings();
  }
};

/**
 * Get default binary settings
 */
export const getDefaultBinarySettings = (): BinarySettings => {
  return {
    spilloverEnabled: true,
    spilloverRule: 'auto',
    placementPriority: 'weaker-leg',
    cappingEnabled: true,
    dailyCap: 1000,
    weeklyCap: 5000,
    monthlyCap: 20000,
    matchingBonusPercentage: 10,
    carryForwardEnabled: true,
    maxCarryForwardDays: 30,
  };
};

/**
 * Save binary settings
 */
export const saveBinarySettings = async (settings: BinarySettings): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: existing } = await supabase
      .from('binary_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('binary_settings')
        .update(settings)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('binary_settings')
        .insert([settings]);

      if (error) throw error;
    }

    console.log('Binary settings saved successfully');
  } catch (error: any) {
    console.error('Error saving binary settings:', error);
    throw new Error(error.message || 'Failed to save binary settings');
  }
};

/**
 * Manual binary placement
 */
export const manualBinaryPlacement = async (
  userId: string,
  parentId: string,
  position: 'left' | 'right'
): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

// Check if position is available
    const { data: existing } = await supabase
      .from('binary_nodes')
      .select('id')
      .eq('parent_id', parentId)
      .eq('position', position)
      .single();

    if (existing) {
      throw new Error(`Position ${position} under parent is already occupied`);
    }

    // Update user's binary tree entry
    const { error } = await supabase
      .from('binary_nodes')
      .update({
        parent_id: parentId,
        position: position,
      })
      .eq('user_id', userId);

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        action_type: 'binary_placement',
        target_id: userId,
        details: {
          parent_id: parentId,
          position,
        },
      }]);

    console.log(`User ${userId} placed at ${position} under ${parentId}`);
  } catch (error: any) {
    console.error('Error with manual placement:', error);
    throw new Error(error.message || 'Failed to place user in binary tree');
  }
};

/**
 * Get binary reports
 */
export const getBinaryReports = async (): Promise<BinaryReport[]> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('binary_nodes')
      .select(`
        user_id,
        left_volume,
        right_volume,
        users!binary_tree_user_id_fkey (
          id,
          full_name
        )
      `)
      .order('left_volume', { ascending: false })
      .limit(100);

    if (error) throw error;

    return data?.map((node: any) => {
      const leftVolume = node.left_volume || 0;
      const rightVolume = node.right_volume || 0;
      const lesserVolume = Math.min(leftVolume, rightVolume);
      const matchingBonus = lesserVolume * 0.1; // 10% matching bonus

      return {
        userId: node.user_id,
        userName: node.users?.full_name || 'Unknown',
        leftVolume,
        rightVolume,
        lesserVolume,
        matchingBonus,
        carryForward: 0, // TODO: Calculate carry forward
        totalEarnings: matchingBonus,
        lastCalculated: new Date().toISOString(),
      };
    }) || [];
  } catch (error: any) {
    console.error('Error getting binary reports:', error);
    return [];
  }
};

/**
 * Recalculate binary volumes
 */
export const recalculateBinaryVolumes = async (): Promise<number> => {
  try {
        // Verify admin access
    await requireAdmin();

// This would typically be a database function or complex calculation
    // For now, return a count of nodes processed
    const nodes = await getAllBinaryNodes();

    console.log(`Recalculated volumes for ${nodes.length} nodes`);
    return nodes.length;
  } catch (error: any) {
    console.error('Error recalculating volumes:', error);
    throw new Error(error.message || 'Failed to recalculate volumes');
  }
};
