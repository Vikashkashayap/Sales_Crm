/**
 * Fixes bad unique indexes on students collection (e.g. leadId allowing only one null).
 * Run once: node scripts/fixStudentIndexes.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Student from '../models/Student.js';

await mongoose.connect(process.env.MONGODB_URI);
const indexes = await Student.collection.indexes();
console.log('Current indexes:', JSON.stringify(indexes, null, 2));

for (const idx of indexes) {
  if (idx.name === '_id_') continue;
  if (idx.key?.leadId === 1 && idx.unique) {
    console.log('Dropping unique leadId index:', idx.name);
    await Student.collection.dropIndex(idx.name);
  }
}

console.log('Done. Remaining indexes:');
console.log(JSON.stringify(await Student.collection.indexes(), null, 2));
process.exit(0);
