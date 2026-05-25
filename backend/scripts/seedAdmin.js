import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales_crm';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const exists = await User.findOne({ role: 'admin' });
  if (exists) {
    console.log('Admin user already exists:', exists.email);
    process.exit(0);
    return;
  }
  await User.create({
    name: 'Admin',
    email: 'admin@crm.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Admin user created: admin@crm.com / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
