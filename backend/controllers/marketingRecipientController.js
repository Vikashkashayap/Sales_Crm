import MarketingRecipient from '../models/MarketingRecipient.js';
import {
  parseMarketingPastedText,
  parseMarketingWorkbook,
} from '../utils/marketingRecipientImport.js';

async function persistRecipients(rows, userId) {
  let inserted = 0;
  let updated = 0;
  let skippedExisting = 0;

  for (const row of rows) {
    const existing = await MarketingRecipient.findOne({ email: row.email });
    if (existing) {
      if (existing.isDeleted) {
        existing.isDeleted = false;
        existing.name = row.name;
        existing.mobile = row.mobile || existing.mobile;
        existing.source = row.source || existing.source;
        existing.createdBy = userId;
        await existing.save();
        updated += 1;
      } else {
        skippedExisting += 1;
      }
      continue;
    }

    await MarketingRecipient.create({
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      source: row.source || 'Excel Upload',
      createdBy: userId,
    });
    inserted += 1;
  }

  return { inserted, updated, skippedExisting };
}

function importResponse(res, {
  inserted,
  updated,
  skippedExisting,
  skippedNoEmail = 0,
  skippedDuplicate = 0,
  sheetResults = [],
  emptyPayload,
  recipients,
}) {
  if (!recipients?.length) {
    return res.status(400).json(emptyPayload);
  }

  const sheetsProcessed = sheetResults
    .filter((s) => !s.skipped && (s.imported ?? 0) > 0)
    .map((s) => s.sheet);

  return res.json({
    message: `Imported ${inserted} new, ${updated} restored/updated`,
    count: inserted + updated,
    inserted,
    updated,
    skippedDuplicates: skippedExisting,
    skippedExisting,
    skippedNoEmail,
    skippedDuplicate,
    sheetsProcessed,
    sheetResults,
    totalInFile: recipients.length,
  });
}

export const listRecipients = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const filter = { isDeleted: { $ne: true } };

    const [recipients, total] = await Promise.all([
      MarketingRecipient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketingRecipient.countDocuments(filter),
    ]);

    res.json({
      recipients: recipients.map((r) => ({ ...r, id: r._id })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list recipients' });
  }
};

export const getRecipientsStats = async (_req, res) => {
  try {
    const total = await MarketingRecipient.countDocuments({ isDeleted: { $ne: true } });
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get stats' });
  }
};

/** Multi-sheet Excel — same parser as Upload Leads; email required per row. */
export const uploadRecipientsExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    const { recipients, sheetResults, workbook, skippedNoEmail, skippedDuplicate } =
      parseMarketingWorkbook(req.file.buffer);

    const { inserted, updated, skippedExisting } = await persistRecipients(
      recipients,
      req.user._id
    );

    return importResponse(res, {
      inserted,
      updated,
      skippedExisting,
      skippedNoEmail,
      skippedDuplicate,
      sheetResults,
      recipients,
      emptyPayload: {
        message:
          'No valid recipients found. Each row needs Name + Email (phone-only rows are skipped for daily email).',
        sheets: workbook?.SheetNames,
        hint: 'Use the same Excel format as Upload Leads — full_name and email columns.',
        sheetResults,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Import failed',
      hint: error.hint,
      headers: error.headers,
    });
  }
};

/** Paste from Excel — same as Upload Leads paste box. */
export const uploadRecipientsPaste = async (req, res) => {
  try {
    const { text, source } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({
        message: 'Paste Excel data first (copy rows, then Ctrl+V here).',
      });
    }
    const sourceName = String(source || 'Paste Upload').trim() || 'Paste Upload';
    const { recipients, sheetResults, skippedNoEmail, skippedDuplicate } =
      parseMarketingPastedText(text, sourceName);

    const { inserted, updated, skippedExisting } = await persistRecipients(
      recipients,
      req.user._id
    );

    return importResponse(res, {
      inserted,
      updated,
      skippedExisting,
      skippedNoEmail,
      skippedDuplicate,
      sheetResults,
      recipients,
      emptyPayload: {
        message:
          'No valid recipients found. Include Name + Email columns (same layout as Upload Leads paste).',
        hint: 'Copy rows from Excel (Ctrl+C) and paste here. Rows without email are skipped.',
        headers: sheetResults.find((s) => s.headers)?.headers,
        sheetResults,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Import failed' });
  }
};

export const createRecipientManual = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const mobile = String(req.body.mobile || '').trim();

    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const existing = await MarketingRecipient.findOne({ email });
    if (existing && !existing.isDeleted) {
      return res.status(400).json({ message: 'Email already in marketing list' });
    }

    if (existing?.isDeleted) {
      existing.isDeleted = false;
      existing.name = name;
      existing.mobile = mobile;
      existing.source = req.body.source || 'Manual';
      existing.createdBy = req.user._id;
      await existing.save();
      return res.status(201).json({ message: 'Recipient restored', recipient: existing });
    }

    const recipient = await MarketingRecipient.create({
      name,
      email,
      mobile,
      source: req.body.source || 'Manual',
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Recipient added', recipient });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not add recipient' });
  }
};

export const deleteRecipient = async (req, res) => {
  try {
    const doc = await MarketingRecipient.findById(req.params.id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    doc.isDeleted = true;
    await doc.save();
    res.json({ message: 'Recipient removed from email list' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
};

export const clearAllRecipients = async (req, res) => {
  try {
    const result = await MarketingRecipient.updateMany(
      { isDeleted: { $ne: true } },
      { $set: { isDeleted: true } }
    );
    res.json({
      message: 'Email list cleared',
      removed: result.modifiedCount ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Clear failed' });
  }
};
