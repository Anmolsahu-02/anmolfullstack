/**
 * Seed script — creates a demo user in MongoDB.
 * Run once: node src/scripts/seedDemoUser.js
 *
 * Demo credentials:
 *   Email:    demo@akshar.com
 *   Password: Demo@1234
 *   Role:     writer
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/akshar';
  console.log('Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  const email = 'demo@akshar.com';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log('Demo user already exists — skipping creation.');
    console.log('  Email:', email);
    console.log('  Role:', existing.role);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  const user = await User.create({
    name: 'Demo Writer',
    email,
    passwordHash,
    role: 'writer',
  });

  console.log('✅ Demo user created!');
  console.log('  Email:    demo@akshar.com');
  console.log('  Password: Demo@1234');
  console.log('  Role:     writer');
  console.log('  ID:', user._id.toString());

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
