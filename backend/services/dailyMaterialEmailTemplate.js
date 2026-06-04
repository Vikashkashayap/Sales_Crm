/**
 * Plain-text and HTML bodies for daily study material emails.
 */
export function buildDailyMaterialSubject(title) {
  return `Today's Study Material - ${title || 'Update'}`;
}

export function buildDailyMaterialText({ leadName, title, description }) {
  const name = leadName || 'there';
  return [
    `Hello ${name},`,
    '',
    "We are sharing today's study material with you.",
    '',
    description || '',
    '',
    'Please find the attached PDF.',
    '',
    'Regards,',
    'Mentors Daily',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');
}

export function buildDailyMaterialHtml({ leadName, title, description }) {
  const name = leadName || 'there';
  const desc = (description || '').replace(/\n/g, '<br/>');
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>We are sharing today's study material with you.</p>
    ${desc ? `<p>${desc}</p>` : ''}
    <p>Please find the attached PDF.</p>
    <p>Regards,<br/><strong>Mentors Daily</strong></p>
  </div>
  `.trim();
}
