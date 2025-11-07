/**
 * Seed binary tree with test users
 * Creates a sample binary tree structure for testing
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

dotenv.config();

async function seedBinaryTree() {
  let connection;

  try {
    console.log('🔌 Connecting to MySQL database...');

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'finaster_mlm',
    });

    console.log('✅ Connected to MySQL\n');

    // Step 1: Get root user
    const [rootNodes] = await connection.query(
      'SELECT * FROM binary_tree WHERE position = "root" LIMIT 1'
    );

    if (rootNodes.length === 0) {
      console.error('❌ No root node found in binary_tree table');
      process.exit(1);
    }

    const rootNode = rootNodes[0];
    const rootUserId = rootNode.user_id;
    console.log(`📍 Root user ID: ${rootUserId}\n`);

    // Step 2: Get other users (excluding root)
    const [users] = await connection.query(
      'SELECT id, email, full_name FROM users WHERE id != ? AND role = "user" LIMIT 10',
      [rootUserId]
    );

    if (users.length === 0) {
      console.error('❌ No other users found to add to binary tree');
      process.exit(1);
    }

    console.log(`👥 Found ${users.length} users to add to binary tree\n`);

    // Step 3: Create binary tree structure
    // Level 0: Root (already exists)
    // Level 1: 2 children (left and right of root)
    // Level 2: 4 children (2 under each level 1 node)

    const nodesToCreate = [];
    let userIndex = 0;

    // Level 1 - Left child of root
    if (users[userIndex]) {
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: rootUserId,
        left_child_id: null,
        right_child_id: null,
        level: 1,
        position: 'left',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    // Level 1 - Right child of root
    if (users[userIndex]) {
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: rootUserId,
        left_child_id: null,
        right_child_id: null,
        level: 1,
        position: 'right',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    // Level 2 - Children of Level 1 nodes
    if (nodesToCreate.length >= 1 && users[userIndex]) {
      // Left-Left (child of first level 1 node)
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      const parent = nodesToCreate[0];
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: parent.user_id,
        left_child_id: null,
        right_child_id: null,
        level: 2,
        position: 'left',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    if (nodesToCreate.length >= 1 && users[userIndex]) {
      // Left-Right (child of first level 1 node)
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      const parent = nodesToCreate[0];
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: parent.user_id,
        left_child_id: null,
        right_child_id: null,
        level: 2,
        position: 'right',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    if (nodesToCreate.length >= 2 && users[userIndex]) {
      // Right-Left (child of second level 1 node)
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      const parent = nodesToCreate[1];
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: parent.user_id,
        left_child_id: null,
        right_child_id: null,
        level: 2,
        position: 'left',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    if (nodesToCreate.length >= 2 && users[userIndex]) {
      // Right-Right (child of second level 1 node)
      const user = users[userIndex++];
      const nodeId = crypto.randomUUID();
      const parent = nodesToCreate[1];
      nodesToCreate.push({
        id: nodeId,
        user_id: user.id,
        parent_id: parent.user_id,
        left_child_id: null,
        right_child_id: null,
        level: 2,
        position: 'right',
        left_volume: 0,
        right_volume: 0,
        email: user.email,
        name: user.full_name,
      });
    }

    console.log(`🌳 Creating ${nodesToCreate.length} binary tree nodes...\n`);

    // Step 4: Insert all nodes into binary_tree table
    for (const node of nodesToCreate) {
      await connection.query(
        `INSERT INTO binary_tree (id, user_id, parent_id, left_child_id, right_child_id, level, position, left_volume, right_volume, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          node.id,
          node.user_id,
          node.parent_id,
          node.left_child_id,
          node.right_child_id,
          node.level,
          node.position,
          node.left_volume,
          node.right_volume,
        ]
      );
      console.log(`  ✅ Created node: ${node.name} (${node.email}) - Level ${node.level}, Position: ${node.position}`);
    }

    // Step 5: Update parent nodes with child references
    console.log('\n🔗 Linking parent-child relationships...\n');

    // Update root with level 1 children
    if (nodesToCreate.length >= 2) {
      await connection.query(
        'UPDATE binary_tree SET left_child_id = ?, right_child_id = ? WHERE user_id = ?',
        [nodesToCreate[0].user_id, nodesToCreate[1].user_id, rootUserId]
      );
      console.log(`  ✅ Linked root → Left: ${nodesToCreate[0].email}, Right: ${nodesToCreate[1].email}`);
    }

    // Update level 1 left node with its children
    if (nodesToCreate.length >= 4) {
      await connection.query(
        'UPDATE binary_tree SET left_child_id = ?, right_child_id = ? WHERE user_id = ?',
        [nodesToCreate[2].user_id, nodesToCreate[3].user_id, nodesToCreate[0].user_id]
      );
      console.log(`  ✅ Linked ${nodesToCreate[0].email} → Left: ${nodesToCreate[2].email}, Right: ${nodesToCreate[3].email}`);
    }

    // Update level 1 right node with its children
    if (nodesToCreate.length >= 6) {
      await connection.query(
        'UPDATE binary_tree SET left_child_id = ?, right_child_id = ? WHERE user_id = ?',
        [nodesToCreate[4].user_id, nodesToCreate[5].user_id, nodesToCreate[1].user_id]
      );
      console.log(`  ✅ Linked ${nodesToCreate[1].email} → Left: ${nodesToCreate[4].email}, Right: ${nodesToCreate[5].email}`);
    }

    // Step 6: Verify the tree
    console.log('\n📊 Verifying binary tree structure...\n');
    const [treeNodes] = await connection.query(
      'SELECT COUNT(*) as count FROM binary_tree'
    );
    console.log(`  Total nodes in tree: ${treeNodes[0].count}`);

    const [treeStructure] = await connection.query(
      `SELECT bt.user_id, u.email, u.full_name, bt.level, bt.position, bt.left_child_id, bt.right_child_id
       FROM binary_tree bt
       JOIN users u ON bt.user_id = u.id
       ORDER BY bt.level, bt.position`
    );

    console.log('\n📋 Binary Tree Structure:');
    console.table(treeStructure);

    console.log('\n✅ Binary tree seeded successfully!');
    console.log('\n🎯 You can now test the genealogy page to see the full tree with links!');

  } catch (error) {
    console.error('❌ Error seeding binary tree:', error.message);
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 MySQL connection closed');
    }
  }
}

// Run the seeding
seedBinaryTree();
