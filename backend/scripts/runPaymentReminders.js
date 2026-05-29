import 'dotenv/config';
import connectDB from '../config/db.js';
import { runPaymentReminders } from '../jobs/paymentReminderJob.js';

connectDB();

runPaymentReminders({ triggeredBy: 'manual' })
  .then((result) => {
    console.log('[payment-reminder] Manual run result:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[payment-reminder] Manual run failed:', err.message);
    process.exit(1);
  });
