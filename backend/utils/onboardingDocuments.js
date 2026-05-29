import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ONBOARDING_BASE_DIR = path.join(__dirname, '..', 'uploads', 'onboarding');

/** @deprecated Legacy folder — still checked as fallback */
export const LEGACY_ATTACHMENTS_DIR = path.join(__dirname, '..', 'email-attachments');

export const ONBOARDING_DIRS = {
  english: path.join(ONBOARDING_BASE_DIR, 'english'),
  hindi: path.join(ONBOARDING_BASE_DIR, 'hindi'),
  common: path.join(ONBOARDING_BASE_DIR, 'common'),
};

/** Canonical catalog — admin uploads overwrite these filenames */
export const ONBOARDING_DOCUMENT_CATALOG = [
  {
    key: 'english_promise',
    label: 'Mentorsdaily Promise',
    medium: 'english',
    filename: 'Mentorsdaily Promise English.pdf',
  },
  {
    key: 'english_book_list',
    label: 'Book List',
    medium: 'english',
    filename: 'Book List English.pdf',
  },
  {
    key: 'english_syllabus',
    label: 'Syllabus Analysis',
    medium: 'english',
    filename: 'Syllabus Analysis English.pdf',
  },
  {
    key: 'common_enrollment',
    label: 'Student Enrollment Form',
    medium: 'common',
    filename: 'Student Enrollment Form.pdf',
  },
  {
    key: 'english_welcome_letter',
    label: 'Welcome Letter',
    medium: 'english',
    filename: 'Welcome Letter English.pdf',
  },
  {
    key: 'english_batch_schedule',
    label: 'Batch Schedule',
    medium: 'english',
    filename: 'Batch Schedule English.pdf',
  },
  {
    key: 'english_fee_structure',
    label: 'Fee Structure',
    medium: 'english',
    filename: 'Fee Structure English.pdf',
  },
  {
    key: 'hindi_promise',
    label: 'Mentorsdaily Promise',
    medium: 'hindi',
    filename: 'Mentorsdaily Promise Hindi.pdf',
  },
  {
    key: 'hindi_book_list',
    label: 'Book List',
    medium: 'hindi',
    filename: 'Book List Hindi.pdf',
  },
  {
    key: 'hindi_syllabus',
    label: 'Syllabus Analysis',
    medium: 'hindi',
    filename: 'Syllabus Analysis Hindi.pdf',
  },
  {
    key: 'hindi_welcome_letter',
    label: 'Welcome Letter',
    medium: 'hindi',
    filename: 'Welcome Letter Hindi.pdf',
  },
  {
    key: 'hindi_batch_schedule',
    label: 'Batch Schedule',
    medium: 'hindi',
    filename: 'Batch Schedule Hindi.pdf',
  },
  {
    key: 'hindi_fee_structure',
    label: 'Fee Structure',
    medium: 'hindi',
    filename: 'Fee Structure Hindi.pdf',
  },
];

const ENGLISH_WELCOME_KEYS = [
  'english_promise',
  'english_book_list',
  'english_syllabus',
  'common_enrollment',
  'english_welcome_letter',
  'english_batch_schedule',
  'english_fee_structure',
];

const HINDI_WELCOME_KEYS = [
  'hindi_promise',
  'hindi_book_list',
  'hindi_syllabus',
  'common_enrollment',
  'hindi_welcome_letter',
  'hindi_batch_schedule',
  'hindi_fee_structure',
];

/** Legacy filenames in email-attachments/ for backward compatibility */
const LEGACY_FILENAME_MAP = {
  'Mentorsdaily Promise English.pdf': [
    'Mentorsdaily Promise Eng.pdf',
    'Mentorsdaily Promise English.pdf',
  ],
  'Book List English.pdf': ['New Book List English.pdf', 'Book List English.pdf'],
  'Syllabus Analysis English.pdf': [
    'Sample Syllabus Analysis English.pdf',
    'Syllabus Analysis English.pdf',
  ],
  'Mentorsdaily Promise Hindi.pdf': [
    'Mentorsdaily Promise Hindi.pdf',
  ],
  'Book List Hindi.pdf': ['New Book List Hindi.pdf', 'Book List Hindi.pdf'],
  'Syllabus Analysis Hindi.pdf': [
    'Sample Syllabus Analysis Hindi.pdf',
    'Syllabus Analysis Hindi.pdf',
  ],
};

const catalogByKey = new Map(ONBOARDING_DOCUMENT_CATALOG.map((d) => [d.key, d]));

export function getDocumentByKey(key) {
  return catalogByKey.get(key) || null;
}

export function getWelcomeKitDocumentKeys(medium) {
  return medium === 'Hindi' ? HINDI_WELCOME_KEYS : ENGLISH_WELCOME_KEYS;
}

export function ensureOnboardingDirs() {
  for (const dir of Object.values(ONBOARDING_DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeForMatch(filename) {
  return String(filename || '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9\s]/g, '');
}

function findPdfInDirectory(dirPath, canonicalFilename) {
  if (!fs.existsSync(dirPath)) return null;

  const targetNorm = normalizeForMatch(canonicalFilename);
  const targetCompact = targetNorm.replace(/\s/g, '');

  for (const entry of fs.readdirSync(dirPath)) {
    if (!entry.toLowerCase().endsWith('.pdf')) continue;

    const entryNorm = normalizeForMatch(entry);
    if (entryNorm === targetNorm) return path.join(dirPath, entry);

    const entryCompact = entryNorm.replace(/\s/g, '');
    if (entryCompact === targetCompact) return path.join(dirPath, entry);

    if (
      entryNorm.includes(targetNorm) ||
      targetNorm.includes(entryNorm) ||
      entryCompact.includes(targetCompact) ||
      targetCompact.includes(entryCompact)
    ) {
      return path.join(dirPath, entry);
    }
  }

  return null;
}

export function getDocumentAbsolutePath(doc) {
  const dir = ONBOARDING_DIRS[doc.medium];
  const fuzzy = findPdfInDirectory(dir, doc.filename);
  if (fuzzy) return fuzzy;

  const primary = path.join(dir, doc.filename);
  if (fs.existsSync(primary)) return primary;

  const legacyNames = LEGACY_FILENAME_MAP[doc.filename] || [doc.filename];
  const legacySubdir = doc.medium === 'common' ? null : doc.medium;

  for (const name of legacyNames) {
    if (legacySubdir) {
      const legacyPath = path.join(LEGACY_ATTACHMENTS_DIR, legacySubdir, name);
      if (fs.existsSync(legacyPath)) return legacyPath;
    }
    const legacyRoot = path.join(LEGACY_ATTACHMENTS_DIR, name);
    if (fs.existsSync(legacyRoot)) return legacyRoot;
  }

  return primary;
}

/** Relative URL works with Vite proxy in dev and same-origin in production */
export function resolveDocumentPreviewUrl(doc) {
  const abs = getDocumentAbsolutePath(doc);
  if (!fs.existsSync(abs)) return null;

  const normalized = abs.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const rel = normalized.split('/uploads/')[1];
    return `/uploads/${rel}`;
  }
  if (normalized.includes('/email-attachments/')) {
    const rel = normalized.split('/email-attachments/')[1];
    return `/email-attachments/${rel}`;
  }
  return null;
}

export function listCatalogWithStatus() {
  return ONBOARDING_DOCUMENT_CATALOG.map((doc) => {
    const absPath = getDocumentAbsolutePath(doc);
    const exists = fs.existsSync(absPath);
    let size = 0;
    let updatedAt = null;
    if (exists) {
      const stat = fs.statSync(absPath);
      size = stat.size;
      updatedAt = stat.mtime;
    }
    return {
      ...doc,
      exists,
      size,
      updatedAt,
      previewUrl: exists ? resolveDocumentPreviewUrl(doc) : null,
      absPath: exists ? absPath : null,
    };
  });
}
