import Payment from '../models/Payment.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function generateReceiptNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `MD-RCPT-${year}${month}-`;
  const escaped = escapeRegex(prefix);

  const rows = await Payment.find({ receiptNumber: { $regex: `^${escaped}` } })
    .select('receiptNumber')
    .lean();

  let maxNum = 0;
  for (const row of rows) {
    const code = row.receiptNumber;
    if (!code?.startsWith(prefix)) continue;
    const num = parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `${prefix}${String(maxNum + 1 + attempt).padStart(5, '0')}`;
    const taken = await Payment.exists({ receiptNumber: candidate });
    if (!taken) return candidate;
  }

  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

