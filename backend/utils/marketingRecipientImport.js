import * as XLSX from 'xlsx';
import {
  cellToString,
  normalizeEmail,
  parseAllSheets,
  parsePastedGrid,
} from './excelImport.js';

const NAME_HEADERS = ['name', 'lead name', 'student name', 'full name'];
const EMAIL_HEADERS = ['email', 'e-mail', 'email id', 'email address', 'mail'];
const MOBILE_HEADERS = ['mobile', 'phone', 'contact', 'number', 'whatsapp'];

function findColumnIndex(headers, candidates) {
  const normalized = headers.map((h) => cellToString(h).toLowerCase());
  for (const cand of candidates) {
    const idx = normalized.findIndex((h) => h === cand || h.includes(cand));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Parse .xlsx for marketing email list. Requires Email column; Name optional.
 */
export function parseMarketingRecipientExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) {
    throw new Error('Excel sheet is empty');
  }

  const headers = (rows[0] || []).map((h) => cellToString(h));
  let nameIdx = findColumnIndex(headers, NAME_HEADERS);
  let emailIdx = findColumnIndex(headers, EMAIL_HEADERS);
  let mobileIdx = findColumnIndex(headers, MOBILE_HEADERS);

  // Fallback: scan first row for email-like / name-like cells
  if (emailIdx < 0) {
    emailIdx = headers.findIndex((_, i) => {
      const sample = rows.slice(1, 6).map((r) => normalizeEmail(r[i]));
      return sample.filter(Boolean).length >= 2;
    });
  }
  if (nameIdx < 0 && emailIdx >= 0) {
    nameIdx = emailIdx > 0 ? 0 : emailIdx === 0 ? 1 : -1;
  }

  if (emailIdx < 0) {
    const err = new Error('Email column not found in Excel');
    err.headers = headers;
    err.hint = 'Add a column named Email (or E-mail). Optional: Name, Mobile.';
    throw err;
  }

  const recipients = [];
  const seen = new Set();
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const email = normalizeEmail(row[emailIdx]);
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    if (seen.has(email)) {
      skippedDuplicate += 1;
      continue;
    }
    seen.add(email);

    const name =
      nameIdx >= 0 ? cellToString(row[nameIdx]).trim() : email.split('@')[0] || 'Student';
    const mobile = mobileIdx >= 0 ? cellToString(row[mobileIdx]).trim() : '';

    recipients.push({
      name: name || email.split('@')[0],
      email,
      mobile,
    });
  }

  if (!recipients.length) {
    throw new Error('No valid rows with email found in Excel');
  }

  return {
    recipients,
    sheetName,
    skippedNoEmail,
    skippedDuplicate,
    headers,
  };
}

/** Convert lead-style parsed rows to marketing recipients (email required). */
export function parsedLeadsToRecipients(parsedLeads = []) {
  const recipients = [];
  const seen = new Set();
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  for (const lead of parsedLeads) {
    const email = normalizeEmail(lead.email);
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    if (seen.has(email)) {
      skippedDuplicate += 1;
      continue;
    }
    seen.add(email);
    recipients.push({
      name: (lead.name || '').trim() || email.split('@')[0],
      email,
      mobile: lead.mobile || '',
      source: lead.source || 'Excel Upload',
    });
  }

  return { recipients, skippedNoEmail, skippedDuplicate };
}

/** Same multi-sheet parser as Upload Leads. */
export function parseMarketingWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const { parsed, sheetResults } = parseAllSheets(workbook);
  const { recipients, skippedNoEmail, skippedDuplicate } = parsedLeadsToRecipients(parsed);
  return { recipients, sheetResults, workbook, skippedNoEmail, skippedDuplicate };
}

/** Same paste parser as Upload Leads. */
export function parseMarketingPastedText(text, sourceName = 'Paste Upload') {
  const { parsed, sheetResults } = parsePastedGrid(text, sourceName);
  const { recipients, skippedNoEmail, skippedDuplicate } = parsedLeadsToRecipients(parsed);
  return { recipients, sheetResults, skippedNoEmail, skippedDuplicate };
}
