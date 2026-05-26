import mongoose from 'mongoose';
import Student from '../models/Student.js';

const fixStudentIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('students');
    const indexes = await collection.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      // Old index blocked multiple students without a lead (leadId: null)
      if (idx.key?.leadId === 1 && idx.unique && !idx.sparse) {
        await collection.dropIndex(idx.name);
        console.log(`Dropped conflicting students index: ${idx.name}`);
      }
    }
    await Student.syncIndexes();
  } catch (err) {
    console.warn('Student index check skipped:', err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await fixStudentIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
