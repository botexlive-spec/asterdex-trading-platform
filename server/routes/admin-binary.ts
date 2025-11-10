/**
 * Admin Binary Tree API Routes
 * Admin-only routes for binary tree management, placement, and reporting
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '';

// Authentication middleware
function authenticateToken(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin authorization middleware
function requireAdmin(req: Request, res: Response, next: any) {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/binary/tree/:userId
 * Get binary tree for a specific user (admin view)
 */
router.get('/tree/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Recursive function to build tree
    async function buildTree(nodeUserId: string, depth: number = 0, maxDepth: number = 5): Promise<any> {
      if (depth > maxDepth) return null;

      const nodeResult = await query(
        `SELECT
          bt.id,
          bt.user_id,
          bt.parent_id,
          bt.left_child_id,
          bt.right_child_id,
          bt.position,
          bt.level,
          bt.left_volume,
          bt.right_volume,
          bt.left_unmatched,
          bt.right_unmatched,
          bt.created_at,
          bt.updated_at,
          u.email,
          u.full_name,
          p.name as package_name
         FROM binary_tree bt
         LEFT JOIN users u ON bt.user_id = u.id
         LEFT JOIN user_packages up ON u.id = up.user_id AND up.status = 'active'
         LEFT JOIN packages p ON up.package_id = p.id
         WHERE bt.user_id = ?
         LIMIT 1`,
        [nodeUserId]
      );

      if (nodeResult.rows.length === 0) return null;

      const node = nodeResult.rows[0];

      // Build left and right subtrees
      let leftChild = null;
      let rightChild = null;

      if (node.left_child_id) {
        const leftUserResult = await query(
          'SELECT user_id FROM binary_tree WHERE id = ?',
          [node.left_child_id]
        );
        if (leftUserResult.rows.length > 0) {
          leftChild = await buildTree(leftUserResult.rows[0].user_id, depth + 1, maxDepth);
        }
      }

      if (node.right_child_id) {
        const rightUserResult = await query(
          'SELECT user_id FROM binary_tree WHERE id = ?',
          [node.right_child_id]
        );
        if (rightUserResult.rows.length > 0) {
          rightChild = await buildTree(rightUserResult.rows[0].user_id, depth + 1, maxDepth);
        }
      }

      return {
        id: node.id,
        user_id: node.user_id,
        parent_id: node.parent_id,
        position: node.position,
        left_child_id: node.left_child_id,
        right_child_id: node.right_child_id,
        left_volume: parseFloat(node.left_volume),
        right_volume: parseFloat(node.right_volume),
        total_volume: parseFloat(node.left_volume) + parseFloat(node.right_volume),
        level: node.level,
        created_at: node.created_at,
        updated_at: node.updated_at,
        user: {
          full_name: node.full_name,
          email: node.email,
          package_name: node.package_name
        },
        left: leftChild,
        right: rightChild
      };
    }

    const tree = await buildTree(userId);

    if (!tree) {
      return res.status(404).json({ error: 'Binary tree node not found for this user' });
    }

    res.json(tree);

  } catch (error: any) {
    console.error('❌ Admin binary tree error:', error);
    res.status(500).json({ error: 'Failed to get binary tree' });
  }
});

/**
 * GET /api/admin/binary/nodes
 * Get all binary nodes (flat list) with pagination
 */
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query(
      `SELECT
        bt.id,
        bt.user_id,
        bt.parent_id,
        bt.position,
        bt.level,
        bt.left_volume,
        bt.right_volume,
        bt.left_unmatched,
        bt.right_unmatched,
        bt.matched_to_date,
        bt.created_at,
        bt.updated_at,
        u.email,
        u.full_name,
        u.is_active
       FROM binary_tree bt
       LEFT JOIN users u ON bt.user_id = u.id
       ORDER BY bt.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM binary_tree');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      nodes: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        parent_id: row.parent_id,
        position: row.position,
        level: row.level,
        left_volume: parseFloat(row.left_volume),
        right_volume: parseFloat(row.right_volume),
        total_volume: parseFloat(row.left_volume) + parseFloat(row.right_volume),
        left_unmatched: parseFloat(row.left_unmatched),
        right_unmatched: parseFloat(row.right_unmatched),
        matched_to_date: parseFloat(row.matched_to_date),
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          email: row.email,
          full_name: row.full_name,
          is_active: row.is_active
        }
      })),
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Admin binary nodes error:', error);
    res.status(500).json({ error: 'Failed to get binary nodes' });
  }
});

/**
 * GET /api/admin/binary/settings
 * Get binary tree settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM binary_settings ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        id: 'default',
        match_bonus_percentage: 10,
        max_daily_matches: 100,
        carryover_enabled: true,
        require_active_left: true,
        require_active_right: true,
        min_volume_per_leg: 100,
        updated_at: new Date().toISOString()
      });
    }

    const settings = result.rows[0];
    res.json({
      id: settings.id,
      match_bonus_percentage: parseFloat(settings.match_bonus_percentage),
      max_daily_matches: parseInt(settings.max_daily_matches),
      carryover_enabled: settings.carryover_enabled === 1,
      require_active_left: settings.require_active_left === 1,
      require_active_right: settings.require_active_right === 1,
      min_volume_per_leg: parseFloat(settings.min_volume_per_leg),
      updated_at: settings.updated_at
    });

  } catch (error: any) {
    console.error('❌ Admin binary settings error:', error);
    res.status(500).json({ error: 'Failed to get binary settings' });
  }
});

/**
 * PUT /api/admin/binary/settings
 * Save binary tree settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const {
      match_bonus_percentage,
      max_daily_matches,
      carryover_enabled,
      require_active_left,
      require_active_right,
      min_volume_per_leg
    } = req.body;

    // Validate input
    if (match_bonus_percentage < 0 || match_bonus_percentage > 100) {
      return res.status(400).json({ error: 'Match bonus percentage must be between 0 and 100' });
    }

    // Check if settings exist
    const existingResult = await query('SELECT id FROM binary_settings LIMIT 1');

    if (existingResult.rows.length > 0) {
      // Update existing settings
      await query(
        `UPDATE binary_settings SET
          match_bonus_percentage = ?,
          max_daily_matches = ?,
          carryover_enabled = ?,
          require_active_left = ?,
          require_active_right = ?,
          min_volume_per_leg = ?,
          updated_at = NOW()
         WHERE id = ?`,
        [
          match_bonus_percentage,
          max_daily_matches,
          carryover_enabled ? 1 : 0,
          require_active_left ? 1 : 0,
          require_active_right ? 1 : 0,
          min_volume_per_leg,
          existingResult.rows[0].id
        ]
      );
    } else {
      // Insert new settings
      await query(
        `INSERT INTO binary_settings (
          match_bonus_percentage,
          max_daily_matches,
          carryover_enabled,
          require_active_left,
          require_active_right,
          min_volume_per_leg,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          match_bonus_percentage,
          max_daily_matches,
          carryover_enabled ? 1 : 0,
          require_active_left ? 1 : 0,
          require_active_right ? 1 : 0,
          min_volume_per_leg
        ]
      );
    }

    res.json({ success: true, message: 'Binary settings saved successfully' });

  } catch (error: any) {
    console.error('❌ Admin save binary settings error:', error);
    res.status(500).json({ error: 'Failed to save binary settings' });
  }
});

/**
 * POST /api/admin/binary/placement
 * Manually place a user in the binary tree
 */
router.post('/placement', async (req: Request, res: Response) => {
  try {
    const { userId, parentId, position } = req.body;

    // Validate input
    if (!userId || !parentId || !position) {
      return res.status(400).json({ error: 'userId, parentId, and position are required' });
    }

    if (position !== 'left' && position !== 'right') {
      return res.status(400).json({ error: 'Position must be "left" or "right"' });
    }

    // Check if user already has a binary node
    const existingNodeResult = await query(
      'SELECT id FROM binary_tree WHERE user_id = ?',
      [userId]
    );

    if (existingNodeResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already has a binary tree node' });
    }

    // Get parent node
    const parentResult = await query(
      `SELECT id, left_child_id, right_child_id, level FROM binary_tree WHERE user_id = ?`,
      [parentId]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent user not found in binary tree' });
    }

    const parent = parentResult.rows[0];

    // Check if position is available
    const childField = position === 'left' ? 'left_child_id' : 'right_child_id';
    if (parent[childField]) {
      return res.status(400).json({ error: `${position} position is already occupied` });
    }

    // Create new binary node
    const insertResult = await query(
      `INSERT INTO binary_tree (
        user_id,
        parent_id,
        position,
        level,
        left_volume,
        right_volume,
        left_unmatched,
        right_unmatched,
        matched_to_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, NOW(), NOW())`,
      [userId, parent.id, position, parent.level + 1]
    );

    const newNodeId = insertResult.insertId;

    // Update parent's child reference
    await query(
      `UPDATE binary_tree SET ${childField} = ?, updated_at = NOW() WHERE id = ?`,
      [newNodeId, parent.id]
    );

    res.json({
      success: true,
      message: 'User placed in binary tree successfully',
      node_id: newNodeId,
      position,
      level: parent.level + 1
    });

  } catch (error: any) {
    console.error('❌ Admin binary placement error:', error);
    res.status(500).json({ error: 'Failed to place user in binary tree' });
  }
});

/**
 * GET /api/admin/binary/reports
 * Get binary matching reports
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get recent binary matches with user info
    const result = await query(
      `SELECT
        bm.id,
        bm.user_id,
        bm.matched_volume,
        bm.left_volume_before,
        bm.right_volume_before,
        bm.left_volume_after,
        bm.right_volume_after,
        bm.payout_amount,
        bm.payout_percentage,
        bm.created_at,
        u.email as user_email,
        u.full_name as user_name,
        bt.left_unmatched as carryover_left,
        bt.right_unmatched as carryover_right
       FROM binary_matches bm
       LEFT JOIN users u ON bm.user_id = u.id
       LEFT JOIN binary_tree bt ON bm.user_id = bt.user_id
       ORDER BY bm.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM binary_matches');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      reports: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        left_volume: parseFloat(row.left_volume_before),
        right_volume: parseFloat(row.right_volume_before),
        weaker_leg: parseFloat(row.left_volume_before) < parseFloat(row.right_volume_before) ? 'left' : 'right',
        match_bonus: parseFloat(row.payout_amount),
        matches_count: 1, // Each row is one match
        carryover_left: parseFloat(row.carryover_left || 0),
        carryover_right: parseFloat(row.carryover_right || 0),
        report_date: row.created_at,
        created_at: row.created_at
      })),
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Admin binary reports error:', error);
    res.status(500).json({ error: 'Failed to get binary reports' });
  }
});

/**
 * POST /api/admin/binary/recalculate
 * Recalculate binary volumes for all nodes
 */
router.post('/recalculate', async (req: Request, res: Response) => {
  try {
    // Get all nodes ordered by level (bottom to top)
    const nodesResult = await query(
      `SELECT id, user_id, left_child_id, right_child_id, level
       FROM binary_tree
       ORDER BY level DESC`
    );

    let updatedCount = 0;

    for (const node of nodesResult.rows) {
      let leftVolume = 0;
      let rightVolume = 0;

      // Get left child volume
      if (node.left_child_id) {
        const leftResult = await query(
          `SELECT left_volume, right_volume FROM binary_tree WHERE id = ?`,
          [node.left_child_id]
        );
        if (leftResult.rows.length > 0) {
          const child = leftResult.rows[0];
          leftVolume = parseFloat(child.left_volume) + parseFloat(child.right_volume);
        }
      }

      // Get right child volume
      if (node.right_child_id) {
        const rightResult = await query(
          `SELECT left_volume, right_volume FROM binary_tree WHERE id = ?`,
          [node.right_child_id]
        );
        if (rightResult.rows.length > 0) {
          const child = rightResult.rows[0];
          rightVolume = parseFloat(child.left_volume) + parseFloat(child.right_volume);
        }
      }

      // Add user's own package value
      const packageResult = await query(
        `SELECT p.price
         FROM user_packages up
         JOIN packages p ON up.package_id = p.id
         WHERE up.user_id = ? AND up.status = 'active'
         LIMIT 1`,
        [node.user_id]
      );

      if (packageResult.rows.length > 0) {
        const packageValue = parseFloat(packageResult.rows[0].price);
        // Distribute package value to both legs equally
        leftVolume += packageValue / 2;
        rightVolume += packageValue / 2;
      }

      // Update node volumes
      await query(
        `UPDATE binary_tree
         SET left_volume = ?,
             right_volume = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [leftVolume, rightVolume, node.id]
      );

      updatedCount++;
    }

    res.json({
      success: true,
      message: `Successfully recalculated volumes for ${updatedCount} nodes`,
      updated_count: updatedCount
    });

  } catch (error: any) {
    console.error('❌ Admin binary recalculate error:', error);
    res.status(500).json({ error: 'Failed to recalculate binary volumes' });
  }
});

export default router;
