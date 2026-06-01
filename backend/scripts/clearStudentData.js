
/**
 * Deletes all student / admission / payment data from MongoDB.
 * Keeps: users, leads, notes, tasks, follow-ups, settings.
 *
 * Usage: node scripts/clearStudentData.js --yes
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import EmailLog from '../models/EmailLog.js';
import ReminderLog from '../models/ReminderLog.js';
import Activity from '../models/Activity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sales_crm';

const confirmed = process.argv.includes('--yes');

async function clearReceiptFiles() {
  const receiptsDir = path.join(__dirname, '..', 'receipts');
  try {
    const entries = await fs.readdir(receiptsDir);
    let removed = 0;
    for (const name of entries) {
      if (name === '.gitkeep') continue;
      await fs.rm(path.join(receiptsDir, name), { force: true, recursive: true });
      removed += 1;
    }
    return removed;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw err;
  }
}

async function run() {
  if (!confirmed) {
    console.error('Destructive operation. Re-run with: node scripts/clearStudentData.js --yes');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Connected to database: ${dbName}`);

  const [payments, reminders, emailLogs, activities, students] = await Promise.all([
    Payment.deleteMany({}),
    ReminderLog.deleteMany({}),
    EmailLog.deleteMany({ studentId: { $exists: true, $ne: null } }),
    Activity.deleteMany({ 'metadata.studentId': { $exists: true } }),
    Student.deleteMany({}),
  ]);

  const receiptsRemoved = await clearReceiptFiles();

  console.log('Deleted:');
  console.log(`  Students:      ${students.deletedCount}`);
  console.log(`  Payments:      ${payments.deletedCount}`);
  console.log(`  Reminder logs: ${reminders.deletedCount}`);
  console.log(`  Email logs:    ${emailLogs.deletedCount}`);
  console.log(`  Activities:    ${activities.deletedCount}`);
  console.log(`  Receipt files: ${receiptsRemoved}`);
  console.log('Done. Leads and users were not removed.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
