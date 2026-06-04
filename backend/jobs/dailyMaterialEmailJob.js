import cron from 'node-cron';
import DailyMaterial from '../models/DailyMaterial.js';
import MarketingRecipient from '../models/MarketingRecipient.js';
import EmailLog from '../models/EmailLog.js';
import { startOfDay, endOfDay } from '../utils/dateHelpers.js';
import { sendDailyMaterialToRecipient } from '../services/dailyMaterialEmailService.js';

/** Recipients eligible for daily material emails (uploaded list only). */
export function buildMarketingRecipientFilter(extra = {}) {
  return {
    isDeleted: { $ne: true },
    email: { $exists: true, $nin: [null, ''] },
    ...extra,
  };
}

/**
 * Send today's active daily material to uploaded marketing recipients only.
 */
export async function runDailyMaterialEmails({ triggeredBy = 'cron' } = {}) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const material = await DailyMaterial.findOne({
    status: 'active',
    sendDate: { $gte: todayStart, $lt: todayEnd },
  }).lean();

  if (!material) {
    console.log(`[daily-material] No active material for today (${triggeredBy})`);
    return { skipped: true, reason: 'no_material', sent: 0, failed: 0 };
  }

  const recipients = await MarketingRecipient.find(buildMarketingRecipientFilter())
    .select('name email')
    .lean();

  if (!recipients.length) {
    console.log(`[daily-material] No recipients in email list (${triggeredBy})`);
    return { skipped: true, reason: 'no_recipients', sent: 0, failed: 0 };
  }

  const alreadySentIds = await EmailLog.find({
    emailType: 'daily_material',
    materialId: material._id,
    status: 'sent',
    sentAt: { $gte: todayStart, $lt: todayEnd },
  }).distinct('marketingRecipientId');

  const alreadySentSet = new Set(alreadySentIds.map((id) => String(id)));

  let sent = 0;
  let failed = 0;
  let skippedAlready = 0;
  let skippedNoEmail = 0;

  console.log(
    `[daily-material] Run started (${triggeredBy}) — material="${material.title}", recipients=${recipients.length}, alreadySent=${alreadySentSet.size}`
  );

  for (const recipient of recipients) {
    const email = String(recipient.email || '').trim();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }

    if (alreadySentSet.has(String(recipient._id))) {
      skippedAlready += 1;
      continue;
    }

    try {
      await sendDailyMaterialToRecipient({ recipient, material });
      sent += 1;
      alreadySentSet.add(String(recipient._id));
    } catch (err) {
      failed += 1;
      console.error(`[daily-material] Failed for ${email}:`, err.message);
    }
  }

  console.log(
    `[daily-material] Run finished (${triggeredBy}) — sent=${sent}, failed=${failed}, skippedAlready=${skippedAlready}, skippedNoEmail=${skippedNoEmail}`
  );

  return {
    skipped: false,
    materialId: material._id,
    sent,
    failed,
    skippedAlready,
    skippedNoEmail,
    recipientCount: recipients.length,
  };
}

let scheduledTask = null;

const TIMEZONE = process.env.DAILY_MATERIAL_TIMEZONE || 'Asia/Kolkata';

function parseMaterialSchedule() {
  const timeStr = String(process.env.DAILY_MATERIAL_TIME || '').trim();
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map((v) => Number(v));
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return { hour: h, minute: m };
    }
  }

  const hourRaw = process.env.DAILY_MATERIAL_HOUR;
  const hour =
    typeof hourRaw === 'string' && hourRaw.includes(':')
      ? Number(hourRaw.split(':')[0])
      : Number(hourRaw);
  const minute = Number(process.env.DAILY_MATERIAL_MINUTE ?? 0);

  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function startDailyMaterialEmailJob() {
  if (process.env.DAILY_MATERIAL_EMAILS === 'false') {
    console.log('[daily-material] Job not started — DAILY_MATERIAL_EMAILS=false');
    return null;
  }

  const { hour, minute } = parseMaterialSchedule();
  const cronExpr = `${minute} ${hour} * * *`;

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    cronExpr,
    () => {
      runDailyMaterialEmails({ triggeredBy: 'cron' }).catch((err) => {
        console.error('[daily-material] Unhandled job error:', err.message);
      });
    },
    { timezone: TIMEZONE }
  );

  console.log(
    `[daily-material] Scheduled daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (${TIMEZONE}) — marketing list only`
  );
  return scheduledTask;
}

export function stopDailyMaterialEmailJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
