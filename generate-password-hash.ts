/**
 * Generate password hashes for seed data
 */
import bcrypt from 'bcryptjs';

async function generateHashes() {
  console.log('Generating password hashes...\n');

  const passwords = [
    { name: 'admin123', password: 'admin123' },
    { name: 'user123', password: 'user123' },
  ];

  for (const { name, password } of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${name}:`);
    console.log(hash);
    console.log('');
  }

  // Test verification
  console.log('\nVerifying hashes...');
  const testHash = await bcrypt.hash('user123', 10);
  const isValid = await bcrypt.compare('user123', testHash);
  console.log(`Test verification: ${isValid ? '✓ PASS' : '✗ FAIL'}`);
}

generateHashes();
