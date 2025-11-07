/**
 * Migrate Existing Users to Binary Tree Structure
 * Populates mlm_binary_node table based on sponsor relationships
 */

const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function migrateBinaryTree() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  console.log('✅ Connected to MySQL\n');

  try {
    // Get all users ordered by creation date (ensures sponsors come before referrals)
    const [users] = await connection.execute(
      'SELECT id, email, sponsor_id, created_at FROM users ORDER BY created_at ASC'
    );

    console.log(`📊 Found ${users.length} users to migrate\n`);

    let processed = 0;
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      processed++;

      // Check if binary node already exists
      const [existing] = await connection.execute(
        'SELECT id FROM mlm_binary_node WHERE referralId = ?',
        [user.id]
      );

      if (existing.length > 0) {
        console.log(`⏭️  [${processed}/${users.length}] Skipping ${user.email} (already exists)`);
        skipped++;
        continue;
      }

      const nodeId = crypto.randomUUID();

      if (!user.sponsor_id) {
        // Root user (no sponsor) - create without parent
        await connection.execute(
          `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
           VALUES (?, ?, NULL, NULL, NULL)`,
          [nodeId, user.id]
        );
        console.log(`🌳 [${processed}/${users.length}] Created ROOT node for ${user.email}`);
        created++;
        continue;
      }

      // Find sponsor's binary node
      const [sponsorNode] = await connection.execute(
        'SELECT id, referralId, leftChildId, rightChildId FROM mlm_binary_node WHERE referralId = ?',
        [user.sponsor_id]
      );

      if (sponsorNode.length === 0) {
        console.log(`⚠️  [${processed}/${users.length}] Sponsor node not found for ${user.email}, creating without parent`);
        await connection.execute(
          `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
           VALUES (?, ?, NULL, NULL, NULL)`,
          [nodeId, user.id]
        );
        created++;
        continue;
      }

      const sponsor = sponsorNode[0];

      // Determine placement (left or right)
      let position = null;
      if (!sponsor.leftChildId) {
        position = 'left';
      } else if (!sponsor.rightChildId) {
        position = 'right';
      }

      if (!position) {
        // Both positions occupied, create without parent (will need manual placement)
        console.log(`⚠️  [${processed}/${users.length}] Both positions occupied for ${user.email}, creating orphan node`);
        await connection.execute(
          `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
           VALUES (?, ?, NULL, NULL, NULL)`,
          [nodeId, user.id]
        );
        created++;
        continue;
      }

      // Create binary node with parent
      await connection.execute(
        `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
         VALUES (?, ?, ?, NULL, NULL)`,
        [nodeId, user.id, sponsor.id]
      );

      // Update sponsor's child pointer
      const updateField = position === 'left' ? 'leftChildId' : 'rightChildId';
      await connection.execute(
        `UPDATE mlm_binary_node SET ${updateField} = ? WHERE id = ?`,
        [nodeId, sponsor.id]
      );

      console.log(`✅ [${processed}/${users.length}] Placed ${user.email} at ${position} of sponsor`);
      created++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users: ${users.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log('='.repeat(60));

    // Verify migration
    const [nodeCount] = await connection.execute('SELECT COUNT(*) as count FROM mlm_binary_node');
    console.log(`\n✅ Binary tree now has ${nodeCount[0].count} nodes\n`);

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
migrateBinaryTree()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
