import fs from 'fs';
import path from 'path';
import { ONBOARDING_DIRS } from './onboardingDocuments.js';

/** Uses examMedium on Student; accepts legacy `medium` if present. */
export function getStudentMedium(student) {
  const raw = String(student?.examMedium || student?.medium || 'English').trim();
  return raw.toLowerCase() === 'hindi' ? 'Hindi' : 'English';
}

/** Normalize for loose matching (case, spaces, punctuation) */
export function normalizePdfName(filename) {
  return String(filename || '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9\s]/g, '');
}

function readPdfFilesFromDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => ({
      filename: entry.name,
      path: path.join(dirPath, entry.name),
    }));
}

function resolvePreviewUrlFromPath(absPath) {
  const normalized = absPath.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    return `/uploads/${normalized.split('/uploads/')[1]}`;
  }
  if (normalized.includes('/email-attachments/')) {
    return `/email-attachments/${normalized.split('/email-attachments/')[1]}`;
  }
  return null;
}

/**
 * Scans onboarding folders dynamically — no hardcoded filenames.
 * Hindi: hindi/ + common/
 * English: english/ + common/
 */
export function buildWelcomeKitAttachments(medium) {
  const mediumDir = medium === 'Hindi' ? ONBOARDING_DIRS.hindi : ONBOARDING_DIRS.english;
  const mediumPdfs = readPdfFilesFromDir(mediumDir);
  const commonPdfs = readPdfFilesFromDir(ONBOARDING_DIRS.common);

  const seen = new Set();
  const attachments = [];

  for (const pdf of [...mediumPdfs, ...commonPdfs]) {
    const norm = normalizePdfName(pdf.filename);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    attachments.push({
      filename: pdf.filename,
      path: pdf.path,
      contentType: 'application/pdf',
    });
  }

  attachments.sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' })
  );

  const foundPdfs = attachments.map((a) => a.filename);
  const missing = [];

  console.log('[welcome-kit] Found PDFs:', foundPdfs);
  console.log('[welcome-kit] Missing PDFs:', missing);

  return { attachments, missing, foundPdfs };
}

export function listWelcomeKitDocumentsForMedium(medium) {
  const { attachments } = buildWelcomeKitAttachments(medium);

  return attachments.map((att, index) => ({
    key: `scan_${index}_${normalizePdfName(att.filename)}`,
    label: att.filename.replace(/\.pdf$/i, ''),
    filename: att.filename,
    exists: true,
    previewUrl: resolvePreviewUrlFromPath(att.path),
  }));
}
