/**
 * Genealogy/Binary Tree API Routes
 * Handles binary MLM tree structure with automatic placement
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_mlm_secret_key_change_in_production_2024';

/**
 * Middleware to verify JWT token
 */
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

/**
 * Build binary tree recursively
 */
async function buildBinaryTree(userId: string, depth: number = 5, currentDepth: number = 0): Promise<any> {
  if (currentDepth >= depth) {
    return null;
  }

  // Get user data
  const userResult = await query(
    `SELECT id, email, full_name, total_investment, wallet_balance,
            left_volume, right_volume, current_rank, is_active, created_at
     FROM users WHERE id = ?`,
    [userId]
  );

  if (!userResult.rows || userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  // Get binary node data
  const nodeResult = await query(
    `SELECT id, parentId, leftChildId, rightChildId
     FROM mlm_binary_node WHERE referralId = ?`,
    [userId]
  );

  const node = nodeResult.rows[0];

  // Build the tree node
  const treeNode: any = {
    user_id: user.id,
    email: user.email,
    full_name: user.full_name,
    total_investment: parseFloat(user.total_investment || 0),
    wallet_balance: parseFloat(user.wallet_balance || 0),
    left_volume: 0,  // Will be calculated from downline
    right_volume: 0,  // Will be calculated from downline
    current_rank: user.current_rank,
    is_active: user.is_active,
    created_at: user.created_at,
    level: currentDepth,
    position: currentDepth === 0 ? 'root' : null,
    children: [],
  };

  // Recursively get left and right children
  if (node?.leftChildId) {
    // Get the user ID from the left child node
    const leftNodeResult = await query(
      'SELECT referralId FROM mlm_binary_node WHERE id = ?',
      [node.leftChildId]
    );
    console.log(`  🔍 [Genealogy] Left child node ${node.leftChildId} → user:`, leftNodeResult.rows[0]?.referralId);
    if (leftNodeResult.rows && leftNodeResult.rows.length > 0) {
      const leftUserId = leftNodeResult.rows[0].referralId;
      const leftChild = await buildBinaryTree(leftUserId, depth, currentDepth + 1);
      if (leftChild) {
        leftChild.position = 'left';
        treeNode.children.push(leftChild);
        console.log(`  ✅ [Genealogy] Added left child:`, leftChild.email, `(investment: $${leftChild.total_investment})`);
        // Calculate left volume: child's investment + child's total volume
        treeNode.left_volume = leftChild.total_investment + leftChild.left_volume + leftChild.right_volume;
      }
    }
  }

  if (node?.rightChildId) {
    // Get the user ID from the right child node
    const rightNodeResult = await query(
      'SELECT referralId FROM mlm_binary_node WHERE id = ?',
      [node.rightChildId]
    );
    console.log(`  🔍 [Genealogy] Right child node ${node.rightChildId} → user:`, rightNodeResult.rows[0]?.referralId);
    if (rightNodeResult.rows && rightNodeResult.rows.length > 0) {
      const rightUserId = rightNodeResult.rows[0].referralId;
      const rightChild = await buildBinaryTree(rightUserId, depth, currentDepth + 1);
      if (rightChild) {
        rightChild.position = 'right';
        treeNode.children.push(rightChild);
        console.log(`  ✅ [Genealogy] Added right child:`, rightChild.email, `(investment: $${rightChild.total_investment})`);
        // Calculate right volume: child's investment + child's total volume
        treeNode.right_volume = rightChild.total_investment + rightChild.left_volume + rightChild.right_volume;
      }
    }
  }

  console.log(`  📊 [Genealogy] Returning node for ${treeNode.email}: ${treeNode.children.length} children, left_volume: $${treeNode.left_volume}, right_volume: $${treeNode.right_volume}`);
  return treeNode;
}

/**
 * GET /api/genealogy/tree
 * Get binary tree for current user
 */
router.get('/tree', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const depth = parseInt(req.query.depth as string) || 5;

    console.log(`🌳 [Genealogy] Building binary tree for user: ${userId}, depth: ${depth}`);

    const tree = await buildBinaryTree(userId, depth);

    if (!tree) {
      return res.json({
        success: true,
        tree: null,
        message: 'No binary tree data found. Create your first referral to start building your network.',
      });
    }

    console.log(`✅ [Genealogy] Tree built successfully`);
    console.log(`📤 [Genealogy] Sending tree structure:`, JSON.stringify({
      root: tree?.email,
      children_count: tree?.children?.length || 0,
      children_positions: tree?.children?.map(c => ({ email: c.email, position: c.position })) || []
    }, null, 2));

    res.json({
      success: true,
      tree,
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Error building tree:', error);
    res.status(500).json({ error: 'Failed to build binary tree' });
  }
});

/**
 * POST /api/genealogy/initialize
 * Initialize binary tree node for user (if not exists)
 */
router.post('/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log(`🌱 [Genealogy] Initializing binary node for user: ${userId}`);

    // Check if node already exists
    const existingNode = await query(
      'SELECT id FROM mlm_binary_node WHERE referralId = ?',
      [userId]
    );

    if (existingNode.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Binary node already exists',
        nodeId: existingNode.rows[0].id,
      });
    }

    // Create new binary node
    const nodeId = crypto.randomUUID();
    await query(
      `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
       VALUES (?, ?, NULL, NULL, NULL)`,
      [nodeId, userId]
    );

    console.log(`✅ [Genealogy] Binary node created: ${nodeId}`);

    res.json({
      success: true,
      message: 'Binary node initialized',
      nodeId,
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Error initializing node:', error);
    res.status(500).json({ error: 'Failed to initialize binary node' });
  }
});

/**
 * POST /api/genealogy/place-member
 * Place a new member in binary tree under specific parent
 */
router.post('/place-member', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId, parentId, position } = req.body;

    if (!memberId || !parentId || !position) {
      return res.status(400).json({ error: 'memberId, parentId, and position are required' });
    }

    if (position !== 'left' && position !== 'right') {
      return res.status(400).json({ error: 'position must be "left" or "right"' });
    }

    console.log(`🎯 [Genealogy] Placing member ${memberId} under ${parentId} at ${position}`);

    // Check if parent node exists
    const parentNode = await query(
      'SELECT id, leftChildId, rightChildId FROM mlm_binary_node WHERE referralId = ?',
      [parentId]
    );

    if (parentNode.rows.length === 0) {
      return res.status(404).json({ error: 'Parent node not found. Initialize parent first.' });
    }

    const parent = parentNode.rows[0];

    // Check if position is available
    const occupiedChildId = position === 'left' ? parent.leftChildId : parent.rightChildId;
    if (occupiedChildId) {
      return res.status(400).json({ error: `${position} position is already occupied` });
    }

    // Create binary node for new member
    const newNodeId = crypto.randomUUID();
    await query(
      `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
       VALUES (?, ?, ?, NULL, NULL)`,
      [newNodeId, memberId, parentId]
    );

    // Update parent's child pointer
    const updateField = position === 'left' ? 'leftChildId' : 'rightChildId';
    await query(
      `UPDATE mlm_binary_node SET ${updateField} = ? WHERE id = ?`,
      [memberId, parent.id]
    );

    console.log(`✅ [Genealogy] Member placed successfully at ${position}`);

    res.json({
      success: true,
      message: `Member placed at ${position} position`,
      nodeId: newNodeId,
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Error placing member:', error);
    res.status(500).json({ error: 'Failed to place member in binary tree' });
  }
});

/**
 * GET /api/genealogy/available-positions/:parentId
 * Get available positions under a parent
 */
router.get('/available-positions/:parentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { parentId } = req.params;

    const parentNode = await query(
      'SELECT leftChildId, rightChildId FROM mlm_binary_node WHERE referralId = ?',
      [parentId]
    );

    if (parentNode.rows.length === 0) {
      return res.status(404).json({ error: 'Parent node not found' });
    }

    const parent = parentNode.rows[0];
    const availablePositions = [];

    if (!parent.leftChildId) availablePositions.push('left');
    if (!parent.rightChildId) availablePositions.push('right');

    res.json({
      success: true,
      availablePositions,
      leftOccupied: !!parent.leftChildId,
      rightOccupied: !!parent.rightChildId,
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Error checking positions:', error);
    res.status(500).json({ error: 'Failed to check available positions' });
  }
});

/**
 * GET /api/genealogy/stats
 * Get binary tree statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get user volumes
    const userResult = await query(
      'SELECT left_volume, right_volume FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const leftVolume = parseFloat(user.left_volume || 0);
    const rightVolume = parseFloat(user.right_volume || 0);

    // Calculate stats
    const weakerLeg = leftVolume < rightVolume ? 'left' : 'right';
    const weakerLegVolume = Math.min(leftVolume, rightVolume);
    const strongerLegVolume = Math.max(leftVolume, rightVolume);
    const carryForward = strongerLegVolume - weakerLegVolume;

    res.json({
      success: true,
      stats: {
        leftVolume,
        rightVolume,
        weakerLeg,
        weakerLegVolume,
        strongerLegVolume,
        carryForward,
        totalBinaryPoints: weakerLegVolume,
      },
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get binary tree stats' });
  }
});

/**
 * POST /api/genealogy/add-member
 * Add new member under authenticated user's tree
 * Users can add members under their own node or any node in their downline
 */
router.post('/add-member', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const {
      fullName,
      email,
      phone,
      password,
      initialInvestment = 0,
      parentId,
      position, // 'left' or 'right'
    } = req.body;

    console.log('👤 [Genealogy] User adding new member:', {
      currentUser: currentUserId,
      email,
      parentId,
      position
    });

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (!parentId || !position) {
      return res.status(400).json({ error: 'Parent ID and position (left/right) are required' });
    }

    if (position !== 'left' && position !== 'right') {
      return res.status(400).json({ error: 'Position must be "left" or "right"' });
    }

    // Verify that parentId is either the current user OR someone in their downline
    if (parentId !== currentUserId) {
      const isInDownline = await query(
        `WITH RECURSIVE team_tree AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        )
        SELECT id FROM team_tree WHERE id = ?`,
        [currentUserId, parentId]
      );

      if (isInDownline.rows.length === 0) {
        return res.status(403).json({
          error: 'You can only add members under your own node or nodes in your downline'
        });
      }
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Check if parent exists
    const parentResult = await query('SELECT id FROM users WHERE id = ?', [parentId]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent user not found' });
    }

    // Check if parent has a binary node
    const parentBinaryNode = await query(
      'SELECT id, leftChildId, rightChildId FROM mlm_binary_node WHERE referralId = ?',
      [parentId]
    );

    if (parentBinaryNode.rows.length === 0) {
      return res.status(400).json({ error: 'Parent does not have a binary tree node' });
    }

    const parentNode = parentBinaryNode.rows[0];

    // Check if position is already occupied
    const occupiedChildId = position === 'left' ? parentNode.leftChildId : parentNode.rightChildId;
    if (occupiedChildId) {
      return res.status(400).json({ error: `${position} position is already occupied` });
    }

    // Generate unique referral code
    const referralCode = `REF${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Hash password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    await query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, sponsor_id, referral_code,
        wallet_balance, total_investment, total_earnings, roi_earnings,
        commission_earnings, binary_earnings, current_rank, left_volume,
        right_volume, phone_number, kyc_status, email_verified, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email,
        passwordHash,
        fullName,
        'user',
        parentId,
        referralCode,
        initialInvestment,
        initialInvestment,
        0, // total_earnings
        0, // roi_earnings
        0, // commission_earnings
        0, // binary_earnings
        'starter',
        0, // left_volume
        0, // right_volume
        phone || null,
        'not_submitted',
        false,
        true,
      ]
    );

    console.log(`✅ [Genealogy] User created: ${userId}`);

    // Create binary tree node for new user
    const nodeId = crypto.randomUUID();
    await query(
      `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
       VALUES (?, ?, ?, NULL, NULL)`,
      [nodeId, userId, parentNode.id]
    );

    console.log(`✅ [Genealogy] Binary node created: ${nodeId}`);

    // Update parent's child pointer
    const updateField = position === 'left' ? 'leftChildId' : 'rightChildId';
    await query(
      `UPDATE mlm_binary_node SET ${updateField} = ? WHERE id = ?`,
      [nodeId, parentNode.id]
    );

    console.log(`✅ [Genealogy] Placed user at ${position} of parent ${parentId}`);

    // Create transaction record for initial investment if any
    if (initialInvestment > 0) {
      await query(
        `INSERT INTO mlm_transactions (
          user_id, transaction_type, amount, status, description
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          'package_purchase',
          initialInvestment,
          'completed',
          'Initial investment upon account creation',
        ]
      );
    }

    // Get created user (without password)
    const userResult = await query(
      'SELECT id, email, full_name, referral_code, wallet_balance, total_investment, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      user: userResult.rows[0],
      binaryNode: { id: nodeId, position },
      message: `User ${fullName} created successfully at ${position} position`,
    });
  } catch (error: any) {
    console.error('❌ [Genealogy] Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

export default router;
