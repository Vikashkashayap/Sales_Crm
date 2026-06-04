/**
 * Manual run: node scripts/runDailyMaterialEmails.js
 * Sends today's active daily material to all eligible leads.
 */
import 'dotenv/config';
import connectDB from '../config/db.js';
import { runDailyMaterialEmails } from '../jobs/dailyMaterialEmailJob.js';

await connectDB();
const result = await runDailyMaterialEmails({ triggeredBy: 'manual' });
console.log(JSON.stringify(result, null, 2));
process.exit(0);
