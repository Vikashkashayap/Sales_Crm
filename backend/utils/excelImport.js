import * as XLSX from 'xlsx';

/** Normalize Excel cell to string (handles numbers, scientific notation). */
export function cellToString(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '';
    return String(Math.round(val));
  }
  let s = String(val).trim();
  if (/e[+-]?\d+/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = String(Math.round(n));
  }
  return s;
}

/** Normalize Indian/international phone for storage & duplicate checks. */
export function normalizeMobile(val) {
  const raw = cellToString(val);
  if (!raw) return '';
  if (raw.includes('@')) return '';
  if (raw.toLowerCase().startsWith('p:+')) {
    return normalizeMobile(raw.slice(2));
  }
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length >= 10 ? digits : '';
}

export function normalizeEmail(val) {
  const s = cellToString(val).toLowerCase().trim();
  if (!s || !s.includes('@')) return '';
  const match = s.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0] : '';
}

export function looksLikeEmail(val) {
  return !!normalizeEmail(val);
}

export function looksLikePhone(val) {
  return normalizeMobile(val).length >= 10;
}

export function looksLikeName(val) {
  const s = cellToString(val);
  if (!s || s.length < 2) return false;
  if (looksLikeEmail(s)) return false;
  if (looksLikePhone(s)) return false;
  if (/^(paid|unassigned|intake|new|yes|no|na|-)$/i.test(s)) return false;
  if (/^(yes|no)[_(\s-]/i.test(s)) return false;
  if (/^planning$/i.test(s)) return false;
  if (/^\d{4}$/.test(s)) return false;
  return /[a-zA-Z\u0900-\u097F]/.test(s);
}

/** Person name vs long UPSC form answers ("I become ips", "Just i want to"). */
export function looksLikePersonName(val) {
  const s = cellToString(val);
  if (!looksLikeName(val)) return false;
  if (s.length > 50) return false;
  if (/\bi\s+(want|become|need|will|am|was|have)\b/i.test(s)) return false;
  if (/\b(sir|mai|nhii|bna|strategy|policy|financial|dream|because)\b/i.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 5) return false;
  if (words.length >= 3 && /\b(the|for|to|my|want|just|use|standing)\b/i.test(s)) return false;
  return true;
}

function looksLikeGender(val) {
  return /^(male|female|m|f|other)$/i.test(cellToString(val).trim());
}

function looksLikeDate(val) {
  const s = cellToString(val);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s);
}

function looksLikeTargetYear(val) {
  return /^(19|20)\d{2}$/.test(cellToString(val).trim());
}

function looksLikeStudyHours(val) {
  return /^\d+\+?$/.test(cellToString(val)) || /^\d+\s*-\s*\d+$/.test(cellToString(val));
}

function looksLikePreparingStatus(val) {
  return /^(planning|yes|no)/i.test(cellToString(val));
}

function hasExplicitHeaderRow(headerMap) {
  return (
    headerMap.nameIdx >= 0 ||
    headerMap.emailIdx >= 0 ||
    headerMap.mobileIdx >= 0 ||
    headerMap.dobIdx >= 0 ||
    headerMap.genderIdx >= 0 ||
    headerMap.targetYearIdx >= 0
  );
}

/** Google Form / Sheets UPSC export: 9 columns without header row. */
export function detectUpscFormLayout(rows) {
  const dataRows = rows.filter((r) => r?.some((c) => cellToString(c)));
  if (dataRows.length < 1) return null;

  const colCount = Math.max(...dataRows.map((r) => r.length));
  if (colCount < 8 || colCount > 10) return null;

  const sample = dataRows.slice(0, Math.min(8, dataRows.length));
  const need = Math.max(1, Math.ceil(sample.length * 0.4));
  const score = (idx, fn) => sample.filter((r) => fn(r[idx])).length;

  const emailAt5 = score(5, looksLikeEmail);
  const phoneAt6 = score(6, looksLikePhone);
  const yearAt1 = score(1, looksLikeTargetYear);
  const nameAt4 = score(4, looksLikePersonName);

  if (emailAt5 >= need && phoneAt6 >= need && yearAt1 >= need && nameAt4 >= 1) {
    return {
      headers: [
        'are_you_preparing_for_upsc',
        'attempt_year',
        'study_hours',
        'why_upsc',
        'full_name',
        'email',
        'phone_number',
        'gender',
        'date_of_birth',
      ],
      dataRows,
      preparingUpscIdx: 0,
      targetYearIdx: 1,
      studyHoursIdx: 2,
      whyPrepareIdx: 3,
      nameIdx: 4,
      emailIdx: 5,
      mobileIdx: 6,
      genderIdx: 7,
      dobIdx: 8,
    };
  }

  // 8 columns — missing first "preparing" column
  const emailAt4 = score(4, looksLikeEmail);
  const phoneAt5 = score(5, looksLikePhone);
  const yearAt0 = score(0, looksLikeTargetYear);
  const nameAt3 = score(3, looksLikePersonName);
  if (colCount >= 8 && emailAt4 >= need && phoneAt5 >= need && nameAt3 >= 1) {
    return {
      headers: ['attempt_year', 'study_hours', 'why_upsc', 'full_name', 'email', 'phone_number', 'gender', 'date_of_birth'],
      dataRows,
      preparingUpscIdx: -1,
      targetYearIdx: 0,
      studyHoursIdx: 1,
      whyPrepareIdx: 2,
      nameIdx: 3,
      emailIdx: 4,
      mobileIdx: 5,
      genderIdx: 6,
      dobIdx: 7,
    };
  }

  return null;
}

function normalizeHeader(h) {
  return cellToString(h).replace(/\?+$/, '').trim();
}

const NAME_PATTERNS = [
  /^name$/i,
  /^full[_\s-]*name$/i,
  /^full\s*name$/i,
  /^customer(\s*name)?$/i,
  /^client(\s*name)?$/i,
  /^lead(\s*name)?$/i,
  /^contact(\s*name)?$/i,
  /^owner(\s*name)?$/i,
  /^applicant$/i,
  /^person$/i,
  /^your\s*name$/i,
];

const MOBILE_PATTERNS = [
  /^mobile(\s*no\.?)?$/i,
  /^phone[_\s-]*number$/i,
  /^phone(\s*number)?$/i,
  /^phone$/i,
  /^contact(\s*(no|number))?$/i,
  /^whatsapp(\s*no\.?)?$/i,
  /^cell$/i,
  /^tel(ephone)?$/i,
  /mobile|phone|whatsapp/i,
];

const CITY_PATTERNS = [/^city$/i, /^state$/i, /^location$/i, /^area$/i, /^address$/i, /city|location/i];
const SOURCE_PATTERNS = [/^source$/i, /^lead\s*source$/i, /^channel$/i, /^platform$/i, /source|campaign/i];
const EMAIL_PATTERNS = [
  /^email(\s*address)?$/i,
  /^e-?mail$/i,
  /^email\s*id$/i,
  /email/i,
];
const COMPANY_PATTERNS = [/^company$/i, /^organisation$/i, /^organization$/i, /^firm$/i, /company/i];
const PLATFORM_PATTERNS = [/^platform$/i, /^ad\s*platform$/i];
const TARGET_YEAR_PATTERNS = [
  /^target[_\s-]*year$/i,
  /^exam[_\s-]*year$/i,
  /^attempt[_\s-]*year$/i,
  /target.*year/i,
  /attempt.*year/i,
];
const WHY_PREPARE_PATTERNS = [
  /^why[_\s-]*do[_\s-]*you[_\s-]*want[_\s-]*to[_\s-]*prepare/i,
  /^why[_\s-]*do[_\s-]*you[_\s-]*want[_\s-]*to[_\s-]*appear/i,
  /^why[_\s-]*prepare/i,
  /^r[_\s-]*upsc$/i,
  /why.*prepare/i,
  /why.*appear.*upsc/i,
  /why.*upsc/i,
  /want.*appear/i,
  /^r[_\s-]*upsc/i,
];
const PREPARING_UPSC_PATTERNS = [
  /^are[_\s-]*you[_\s-]*preparing[_\s-]*for[_\s-]*upsc/i,
  /^are[_\s-]*you[_\s-]*prepa/i,
  /preparing.*upsc/i,
  /are.*you.*prepa/i,
];
const STUDY_HOURS_PATTERNS = [
  /^how[_\s-]*many[_\s-]*hours/i,
  /^how[_\s-]*many[_\s-]*hour/i,
  /hours.*study/i,
  /study.*hours/i,
  /daily.*basis/i,
  /many.*hour/i,
];
const DOB_PATTERNS = [
  /^date[_\s-]*of[_\s-]*birth$/i,
  /^dob$/i,
  /^birth[_\s-]*date$/i,
  /date.*birth/i,
];
const GENDER_PATTERNS = [/^gender$/i, /^sex$/i];

function findColumnIndex(headers, patterns) {
  const isExact = (p) => p.source.startsWith('^') && p.source.endsWith('$');
  for (const pass of ['exact', 'partial']) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h) continue;
      for (const p of patterns) {
        const exact = isExact(p);
        if (pass === 'exact' && !exact) continue;
        if (pass === 'partial' && exact) continue;
        if (p.test(h)) return i;
      }
    }
  }
  return -1;
}

function bestColumnIndex(scores, minScore = 1) {
  let best = -1;
  let max = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > max) {
      max = scores[i];
      best = i;
    }
  }
  return max >= minScore ? best : -1;
}

/** Detect columns by scanning actual cell values (fixes mislabeled headers). */
export function detectColumnsFromContent(dataRows, sampleSize = 10) {
  const sample = dataRows.slice(0, sampleSize).filter((r) => r?.some((c) => cellToString(c)));
  if (!sample.length) return { nameIdx: -1, mobileIdx: -1, emailIdx: -1 };

  const colCount = Math.max(...sample.map((r) => r.length), 0);
  const emailScores = [];
  const phoneScores = [];
  const nameScores = [];

  for (let c = 0; c < colCount; c++) {
    let e = 0;
    let p = 0;
    let n = 0;
    for (const row of sample) {
      const v = row[c];
      if (looksLikeEmail(v)) e++;
      if (looksLikePhone(v)) p++;
      if (looksLikePersonName(v)) n++;
    }
    emailScores[c] = e;
    phoneScores[c] = p;
    nameScores[c] = n;
  }

  let emailIdx = bestColumnIndex(emailScores);
  let mobileIdx = bestColumnIndex(phoneScores);
  let nameIdx = bestColumnIndex(nameScores);

  if (nameIdx === emailIdx && emailIdx >= 0) {
    nameScores[emailIdx] = 0;
    nameIdx = bestColumnIndex(nameScores);
  }
  if (nameIdx === mobileIdx && mobileIdx >= 0) {
    nameScores[mobileIdx] = 0;
    nameIdx = bestColumnIndex(nameScores);
  }

  return { nameIdx, mobileIdx, emailIdx };
}

export function mapColumns(headers) {
  const normalized = headers.map((h) => normalizeHeader(h));
  return {
    headers: normalized,
    nameIdx: findColumnIndex(normalized, NAME_PATTERNS),
    mobileIdx: findColumnIndex(normalized, MOBILE_PATTERNS),
    cityIdx: findColumnIndex(normalized, CITY_PATTERNS),
    sourceIdx: findColumnIndex(normalized, SOURCE_PATTERNS),
    emailIdx: findColumnIndex(normalized, EMAIL_PATTERNS),
    companyIdx: findColumnIndex(normalized, COMPANY_PATTERNS),
    platformIdx: findColumnIndex(normalized, PLATFORM_PATTERNS),
    targetYearIdx: findColumnIndex(normalized, TARGET_YEAR_PATTERNS),
    whyPrepareIdx: findColumnIndex(normalized, WHY_PREPARE_PATTERNS),
    preparingUpscIdx: findColumnIndex(normalized, PREPARING_UPSC_PATTERNS),
    studyHoursIdx: findColumnIndex(normalized, STUDY_HOURS_PATTERNS),
    dobIdx: findColumnIndex(normalized, DOB_PATTERNS),
    genderIdx: findColumnIndex(normalized, GENDER_PATTERNS),
  };
}

/** Merge header-based + content-based column detection. */
export function resolveColumns(headers, dataRows) {
  const headerMap = mapColumns(headers);
  const contentMap = detectColumnsFromContent(dataRows);

  const pick = (headerIdx, contentIdx, validateFn) => {
    if (headerIdx >= 0) {
      const hits = dataRows.slice(0, 8).filter((r) => validateFn(r[headerIdx])).length;
      if (hits >= 1) return headerIdx;
    }
    if (contentIdx >= 0) {
      const hits = dataRows.slice(0, 8).filter((r) => validateFn(r[contentIdx])).length;
      if (hits >= 2) return contentIdx;
    }
    return contentIdx >= 0 ? contentIdx : headerIdx;
  };

  let nameIdx = headerMap.nameIdx >= 0
    ? headerMap.nameIdx
    : pick(headerMap.nameIdx, contentMap.nameIdx, looksLikePersonName);
  let emailIdx = headerMap.emailIdx >= 0
    ? headerMap.emailIdx
    : pick(headerMap.emailIdx, contentMap.emailIdx, looksLikeEmail);
  let mobileIdx = headerMap.mobileIdx >= 0
    ? headerMap.mobileIdx
    : pick(headerMap.mobileIdx, contentMap.mobileIdx, looksLikePhone);

  if (nameIdx === emailIdx && emailIdx >= 0) {
    const alt = detectColumnsFromContent(dataRows);
    nameIdx = alt.nameIdx >= 0 && alt.nameIdx !== emailIdx ? alt.nameIdx : headerMap.nameIdx;
  }

  if (nameIdx < 0 && emailIdx >= 0) {
    nameIdx = headerMap.nameIdx >= 0 && headerMap.nameIdx !== emailIdx ? headerMap.nameIdx : -1;
  }

  return {
    headers: headerMap.headers,
    nameIdx,
    mobileIdx,
    emailIdx,
    cityIdx: headerMap.cityIdx,
    sourceIdx: headerMap.sourceIdx,
    companyIdx: headerMap.companyIdx,
    platformIdx: headerMap.platformIdx,
    targetYearIdx: headerMap.targetYearIdx,
    whyPrepareIdx: headerMap.whyPrepareIdx,
    preparingUpscIdx: headerMap.preparingUpscIdx,
    studyHoursIdx: headerMap.studyHoursIdx,
    dobIdx: headerMap.dobIdx,
    genderIdx: headerMap.genderIdx,
  };
}

export function findHeaderRowIndex(rows) {
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    const headers = (rows[i] || []).map((h) => normalizeHeader(h));
    const headerMap = mapColumns(headers);
    if (hasExplicitHeaderRow(headerMap)) return i;
  }
  return -1;
}

function buildColumnMap(headers, dataRows, upscLayout = null) {
  if (upscLayout) {
    return {
      headers: upscLayout.headers,
      nameIdx: upscLayout.nameIdx,
      mobileIdx: upscLayout.mobileIdx,
      emailIdx: upscLayout.emailIdx,
      cityIdx: -1,
      sourceIdx: -1,
      companyIdx: -1,
      platformIdx: -1,
      targetYearIdx: upscLayout.targetYearIdx,
      whyPrepareIdx: upscLayout.whyPrepareIdx,
      preparingUpscIdx: upscLayout.preparingUpscIdx,
      studyHoursIdx: upscLayout.studyHoursIdx,
      dobIdx: upscLayout.dobIdx,
      genderIdx: upscLayout.genderIdx,
    };
  }
  return resolveColumns(headers, dataRows);
}

function splitHeaderAndData(matrix) {
  let headerRow = findHeaderRowIndex(matrix);
  if (headerRow >= 0) {
    return {
      headers: (matrix[headerRow] || []).map((h) => normalizeHeader(h)),
      dataRows: matrix.slice(headerRow + 1).filter((row) =>
        row.some((c) => cellToString(c) !== '')
      ),
      upscLayout: null,
    };
  }

  const upscLayout = detectUpscFormLayout(matrix);
  if (upscLayout) {
    return {
      headers: upscLayout.headers,
      dataRows: upscLayout.dataRows,
      upscLayout,
    };
  }

  return {
    headers: (matrix[0] || []).map((h) => normalizeHeader(h)),
    dataRows: matrix.slice(1).filter((row) =>
      row.some((c) => cellToString(c) !== '')
    ),
    upscLayout: null,
  };
}

export function parseSheetToData(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!matrix.length) return { dataRows: [], headers: [], headerRow: -1, upscLayout: null };

  const headerRow = findHeaderRowIndex(matrix);
  const { headers, dataRows, upscLayout } = splitHeaderAndData(matrix);

  return { dataRows, headers, headerRow, upscLayout };
}

export function extractLeadFromRow(row, cols, sheetName) {
  let name = cols.nameIdx >= 0 ? cellToString(row[cols.nameIdx]) : '';
  let email = cols.emailIdx >= 0 ? normalizeEmail(row[cols.emailIdx]) : '';
  let mobile = cols.mobileIdx >= 0 ? normalizeMobile(row[cols.mobileIdx]) : '';

  if (!email) {
    for (let i = 0; i < row.length; i++) {
      if (i === cols.nameIdx || i === cols.mobileIdx) continue;
      const e = normalizeEmail(row[i]);
      if (e) {
        email = e;
        break;
      }
    }
  }

  if (!mobile) {
    for (let i = 0; i < row.length; i++) {
      if (i === cols.emailIdx) continue;
      const p = normalizeMobile(row[i]);
      if (p) {
        mobile = p;
        break;
      }
    }
  }

  if (cols.nameIdx < 0 && (!name || !looksLikeName(name) || /^ad:/i.test(name) || name.length > 80)) {
    if (email) {
      name = email
        .split('@')[0]
        .replace(/[._+]/g, ' ')
        .replace(/\d+/g, '')
        .trim() || email.split('@')[0];
    }
  }
  if (!name && mobile) name = `Lead ${mobile.slice(-4)}`;

  if (!name) return null;
  if (!mobile && !email) return null;

  if (!mobile) mobile = email;

  let platform = cols.platformIdx >= 0 ? cellToString(row[cols.platformIdx]) : '';
  if (!platform && cols.sourceIdx >= 0) {
    const src = cellToString(row[cols.sourceIdx]);
    if (src && src.length <= 40) platform = src;
  }
  if (platform && platform.length > 40) platform = '';

  const source = platform
    ? `${sheetName} · ${platform}`
    : sheetName || 'Excel Upload';

  const targetYear = cols.targetYearIdx >= 0 ? cellToString(row[cols.targetYearIdx]) : '';
  let requirement = cols.whyPrepareIdx >= 0 ? cellToString(row[cols.whyPrepareIdx]) : '';
  const preparingUpsc = cols.preparingUpscIdx >= 0 ? cellToString(row[cols.preparingUpscIdx]) : '';
  const studyHours = cols.studyHoursIdx >= 0 ? cellToString(row[cols.studyHoursIdx]) : '';
  const extraParts = [];
  if (preparingUpsc) extraParts.push(`Preparing for UPSC: ${preparingUpsc}`);
  if (studyHours) extraParts.push(`Daily study hours: ${studyHours}`);
  if (extraParts.length) {
    requirement = requirement ? `${requirement} | ${extraParts.join(' | ')}` : extraParts.join(' | ');
  }
  const dateOfBirth = cols.dobIdx >= 0 ? cellToString(row[cols.dobIdx]) : '';
  const gender = cols.genderIdx >= 0 ? cellToString(row[cols.genderIdx]) : '';

  return {
    name,
    mobile,
    email: email || (mobile.includes('@') ? normalizeEmail(mobile) : ''),
    city: cols.cityIdx >= 0 ? cellToString(row[cols.cityIdx]) : '',
    platform,
    targetYear,
    requirement,
    dateOfBirth,
    gender,
    source,
    company: cols.companyIdx >= 0 ? cellToString(row[cols.companyIdx]) : '',
  };
}

/** Parse every sheet in the workbook. */
export function parseAllSheets(workbook) {
  const parsed = [];
  const sheetResults = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) {
      sheetResults.push({ sheet: sheetName, imported: 0, skipped: true, reason: 'empty' });
      continue;
    }

    const { dataRows, headers, upscLayout } = parseSheetToData(sheet);
    if (!dataRows.length) {
      sheetResults.push({ sheet: sheetName, imported: 0, skipped: true, reason: 'no rows' });
      continue;
    }

    const cols = buildColumnMap(headers, dataRows, upscLayout);
    const hasContact = cols.mobileIdx >= 0 || cols.emailIdx >= 0;
    const content = detectColumnsFromContent(dataRows);

    if (!upscLayout) {
      if (cols.nameIdx < 0 && content.nameIdx >= 0) cols.nameIdx = content.nameIdx;
      if (cols.emailIdx < 0) cols.emailIdx = content.emailIdx;
      if (cols.mobileIdx < 0) cols.mobileIdx = content.mobileIdx;
    }

    const canImport =
      (cols.nameIdx >= 0 || content.emailIdx >= 0) &&
      (cols.mobileIdx >= 0 || cols.emailIdx >= 0 || content.mobileIdx >= 0 || content.emailIdx >= 0);

    if (!canImport) {
      sheetResults.push({
        sheet: sheetName,
        imported: 0,
        skipped: true,
        reason: 'columns not found',
        headers: headers.filter(Boolean).slice(0, 12),
      });
      continue;
    }

    let count = 0;
    let skippedEmpty = 0;

    for (const row of dataRows) {
      const lead = extractLeadFromRow(row, cols, sheetName);
      if (!lead) {
        skippedEmpty++;
        continue;
      }
      parsed.push(lead);
      count++;
    }

    sheetResults.push({
      sheet: sheetName,
      imported: count,
      skippedEmpty,
      skipped: count === 0,
    });
  }

  return { parsed, sheetResults };
}

/** Parse tab/comma-separated text pasted from Excel (clipboard). */
export function parsePastedGrid(text, sourceName = 'Paste Upload') {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { parsed: [], sheetResults: [{ sheet: sourceName, imported: 0, skipped: true, reason: 'empty' }] };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim());
  const matrix = lines.map((line) => {
    const tabParts = line.split('\t');
    if (tabParts.length > 1) return tabParts.map((c) => cellToString(c));
    return line.split(',').map((c) => cellToString(c));
  });

  if (!matrix.length) {
    return { parsed: [], sheetResults: [{ sheet: sourceName, imported: 0, skipped: true, reason: 'empty' }] };
  }

  const { headers, dataRows, upscLayout } = splitHeaderAndData(matrix);

  if (!dataRows.length) {
    return {
      parsed: [],
      sheetResults: [{ sheet: sourceName, imported: 0, skipped: true, reason: 'no rows', headers: headers.filter(Boolean).slice(0, 12) }],
    };
  }

  const cols = buildColumnMap(headers, dataRows, upscLayout);
  const content = detectColumnsFromContent(dataRows);

  if (!upscLayout) {
    if (cols.nameIdx < 0 && content.nameIdx >= 0) cols.nameIdx = content.nameIdx;
    if (cols.emailIdx < 0) cols.emailIdx = content.emailIdx;
    if (cols.mobileIdx < 0) cols.mobileIdx = content.mobileIdx;
  }

  const canImport =
    (cols.nameIdx >= 0 || content.emailIdx >= 0) &&
    (cols.mobileIdx >= 0 || cols.emailIdx >= 0 || content.mobileIdx >= 0 || content.emailIdx >= 0);

  if (!canImport) {
    return {
      parsed: [],
      sheetResults: [{
        sheet: sourceName,
        imported: 0,
        skipped: true,
        reason: 'columns not found',
        headers: headers.filter(Boolean).slice(0, 12),
      }],
    };
  }

  const parsed = [];
  let skippedEmpty = 0;

  for (const row of dataRows) {
    const lead = extractLeadFromRow(row, cols, sourceName);
    if (!lead) {
      skippedEmpty++;
      continue;
    }
    parsed.push(lead);
  }

  return {
    parsed,
    sheetResults: [{
      sheet: sourceName,
      imported: parsed.length,
      skippedEmpty,
      skipped: parsed.length === 0,
    }],
  };
}
