import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import emailLogRoutes from './routes/emailLogRoutes.js';
import { ensureOnboardingDirs } from './utils/onboardingDocuments.js';
import { ensureMaterialsDir } from './utils/materialUpload.js';
import { startPaymentReminderJob } from './jobs/paymentReminderJob.js';
import { startDailyMaterialEmailJob } from './jobs/dailyMaterialEmailJob.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
ensureOnboardingDirs();
ensureMaterialsDir();
// Payment reminder cron: PAYMENT_REMINDER_TIME in .env (default 10:00 AM IST)
startPaymentReminderJob();
// Daily study material emails at 9:00 AM server local time
startDailyMaterialEmailJob();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/email-logs', emailLogRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/email-attachments', express.static(path.join(__dirname, 'email-attachments')));
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sales CRM API running', version: '2.0' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
