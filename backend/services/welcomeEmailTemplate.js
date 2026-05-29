const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildProgramLabel(student) {
  const program = String(student?.programName || '').trim();
  const year = String(student?.targetYear || '').trim();
  if (program && year && !program.includes(year)) {
    return `${program} ${year}`;
  }
  return program || year || 'your selected program';
}

const ESSENTIAL_RESOURCES = [
  {
    label: 'Daily Activity and Reflection Tracker',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdBezdCq6cA8bspF7_gsUQsm1C3yfQtMTQnWh47D_wDU3AV4A/viewform',
  },
  {
    label: "Last 5 Years' Papers (Prelims & Mains)",
    url: 'https://mentorsdaily.com/previous-year-papers',
  },
  {
    label: 'Sample Syllabus Analysis',
    url: 'https://drive.google.com/file/d/1rL3PhuotX8we_M3Ngi-cbUcMhWkbs2Ev/view',
  },
];

const p = 'margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;';
const h = 'margin:16px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#000000;';
const ul = 'margin:0 0 12px;padding-left:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;';
const a = 'color:#1155cc;text-decoration:underline;';

function buildResourceLinksHtml() {
  const items = ESSENTIAL_RESOURCES.map(
    (item) =>
      `<li style="margin-bottom:6px;"><a href="${item.url}" style="${a}">${esc(item.label)}</a></li>`
  ).join('');
  return `<ul style="${ul}">${items}</ul>`;
}

function buildResourceLinksText() {
  return ESSENTIAL_RESOURCES.map((item) => `  - ${item.label}: ${item.url}`).join('\n');
}

function buildEnglishBodyHtml(name, program, resourceLinks) {
  return `
<p style="${p}">Dear <strong>${name}</strong>,</p>
<p style="${p}">
  A warm welcome to <strong>MentorsDaily</strong>.
  We are pleased to confirm your successful enrollment in the <strong>${program}</strong>, designed to provide structured guidance, strategic clarity, and continuous support throughout your UPSC preparation journey.
</p>

<p style="${h}">What Happens Next</p>
<ul style="${ul}">
  <li>Your personalized mentor will be assigned within <strong>48 hours</strong></li>
  <li>Your preparation will follow a structured, phase-wise roadmap</li>
  <li>You will receive regular mentorship sessions, study resources, and progress guidance to help you stay consistent and focused</li>
</ul>

<p style="${h}">Important Attachments</p>
<p style="${p}"><strong>1. Payment Invoice</strong><br/>
Please find your fee payment invoice attached for your reference.</p>
<p style="${p}"><strong>2. Admission Form (Action Required)</strong><br/>
To complete verification, kindly follow the steps below:</p>
<ul style="${ul}">
  <li>Download and print the attached Admission Form</li>
  <li>Fill it manually and sign it</li>
  <li>Scan the completed form</li>
  <li>Reply to this email with the scanned copy attached</li>
</ul>

<p style="${h}">Essential Resources for Your Preparation</p>
<p style="${p}">You will receive access to the following resources:</p>
${resourceLinks}

<p style="${h}">Need Assistance?</p>
<p style="${p}">Our mentors and support team are always available to assist you.</p>
<p style="${p}">
  <strong>Academic &amp; Program Support</strong><br/>
  Email: <a href="mailto:contact@mentorsdaily.com" style="${a}">contact@mentorsdaily.com</a><br/>
  Call / WhatsApp: +91 87662 33193
</p>
<p style="${p}">
  <strong>Finance-Related Queries</strong><br/>
  Email: <a href="mailto:services@mentorsdaily.com" style="${a}">services@mentorsdaily.com</a>
</p>

<p style="${h}">Important Notice (Please Read Carefully)</p>
<p style="${p}">
  To ensure uninterrupted access to mentorship services, please complete all enrollment formalities within <strong>7 days</strong> of receiving this email.
</p>
<ul style="${ul}">
  <li>Incomplete formalities after the deadline will result in temporary suspension of services</li>
  <li>On the 8th day, the candidature will be marked as "Absconded"</li>
</ul>

<p style="${h}">Refund &amp; Assurance Policy</p>
<ul style="${ul}">
  <li>Students are eligible for a <strong>100% refund</strong> of the course fee within 15 days of enrollment, if they choose to discontinue</li>
  <li>The registration fee is <strong>non-refundable</strong> under any circumstances</li>
</ul>
<p style="${p}">
  <strong>100% Refund Guarantee</strong><br/>
  MentorsDaily assures a 100% refund of the course fee if you clear UPSC Prelims in your targeted year.
  (Please refer to the attached policy document for details.)
</p>

<p style="${p}">
  We are confident that with your dedication and our mentorship, you will make strong and steady progress.
  Once again, welcome to MentorsDaily. We look forward to mentoring, guiding, and celebrating your achievements at every stage of your journey.
</p>
<p style="${p}">Warm regards,<br/><strong>Team MentorsDaily</strong></p>`;
}

function buildHindiBodyHtml(name, program, resourceLinks) {
  return `
<hr style="border:none;border-top:1px solid #cccccc;margin:20px 0;" />
<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#555555;">हिंदी संस्करण (Hindi Version)</p>

<p style="${p}">प्रिय <strong>${name}</strong>,</p>
<p style="${p}">
  <strong>MentorsDaily</strong> में आपका हार्दिक स्वागत है।
  हमें यह बताते हुए प्रसन्नता हो रही है कि आपका <strong>${program}</strong> में नामांकन सफलतापूर्वक पूर्ण हो गया है।
</p>

<p style="${h}">आगे क्या होगा</p>
<ul style="${ul}">
  <li>48 घंटे के भीतर आपको आपका पर्सनलाइज़्ड मेंटर अलॉट कर दिया जाएगा</li>
  <li>आपकी तैयारी संरचित एवं चरणबद्ध (Phase-wise) तरीके से आगे बढ़ेगी</li>
  <li>नियमित मेंटरशिप, अध्ययन सामग्री और मार्गदर्शन उपलब्ध कराया जाएगा</li>
</ul>

<p style="${h}">महत्वपूर्ण संलग्नक</p>
<p style="${p}"><strong>1. पेमेंट इनवॉइस</strong> — कृपया संलग्न शुल्क भुगतान इनवॉइस देखें।</p>
<p style="${p}"><strong>2. एडमिशन फॉर्म (कार्रवाई आवश्यक)</strong></p>
<ul style="${ul}">
  <li>संलग्न एडमिशन फॉर्म डाउनलोड एवं प्रिंट करें</li>
  <li>फॉर्म को हस्तलिखित रूप से भरें और हस्ताक्षर करें</li>
  <li>भरे हुए फॉर्म को स्कैन करें</li>
  <li>इस ईमेल का उत्तर देते हुए स्कैन की गई प्रति संलग्न करें</li>
</ul>

<p style="${h}">आपकी तैयारी के लिए आवश्यक संसाधन</p>
${resourceLinks}

<p style="${h}">सहायता हेतु संपर्क करें</p>
<p style="${p}">
  <strong>शैक्षणिक एवं प्रोग्राम सहायता</strong><br/>
  Email: <a href="mailto:contact@mentorsdaily.com" style="${a}">contact@mentorsdaily.com</a><br/>
  Call / WhatsApp: +91 87662 33193
</p>
<p style="${p}">
  <strong>वित्त संबंधी प्रश्नों के लिए</strong><br/>
  Email: <a href="mailto:services@mentorsdaily.com" style="${a}">services@mentorsdaily.com</a>
</p>

<p style="${h}">महत्वपूर्ण सूचना</p>
<ul style="${ul}">
  <li>कृपया सभी नामांकन औपचारिकताएँ <strong>7 दिनों</strong> के भीतर पूर्ण करें</li>
  <li>समय सीमा के बाद सेवाएँ अस्थायी रूप से निलंबित कर दी जाएंगी</li>
</ul>

<p style="${p}">सादर,<br/><strong>MentorsDaily Team</strong></p>`;
}

export function buildWelcomeEmailHtml(student, { logoCid = null } = {}) {
  const name = esc(student?.fullName || 'Student');
  const program = esc(buildProgramLabel(student));
  const resourceLinks = buildResourceLinksHtml();

  const logoHtml = logoCid
    ? `<p style="margin:0 0 4px;"><img src="cid:${logoCid}" alt="MentorsDaily" height="44" style="height:44px;width:auto;border:0;display:block;" /></p>`
    : `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#000000;">MentorsDaily</p>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222;line-height:1.6;">
${logoHtml}
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">Welcome &amp; Admission Confirmation</p>
${buildEnglishBodyHtml(name, program, resourceLinks)}
${buildHindiBodyHtml(name, program, resourceLinks)}
</div>`.trim();
}

export function buildWelcomeEmailText(student) {
  const name = student?.fullName || 'Student';
  const program = buildProgramLabel(student);
  const resources = buildResourceLinksText();

  return `MentorsDaily
Welcome & Admission Confirmation

Dear ${name},

A warm welcome to MentorsDaily. We are pleased to confirm your successful enrollment in the ${program}, designed to provide structured guidance, strategic clarity, and continuous support throughout your UPSC preparation journey.

What Happens Next
- Your personalized mentor will be assigned within 48 hours
- Your preparation will follow a structured, phase-wise roadmap
- You will receive regular mentorship sessions, study resources, and progress guidance

Important Attachments
1. Payment Invoice — attached for your reference.
2. Admission Form (Action Required) — download, fill, sign, scan, and reply to this email with the scanned copy.

Essential Resources for Your Preparation
${resources}

Need Assistance?
Academic & Program Support: contact@mentorsdaily.com | +91 87662 33193
Finance Queries: services@mentorsdaily.com

Important Notice
Please complete all enrollment formalities within 7 days of receiving this email.

Warm regards,
Team MentorsDaily

---
हिंदी संस्करण

प्रिय ${name},
MentorsDaily में आपका हार्दिक स्वागत है। आपका ${program} में नामांकन सफलतापूर्वक पूर्ण हो गया है।

सादर,
MentorsDaily Team`;
}

export function buildWelcomeEmailSubject(student) {
  const program = buildProgramLabel(student);
  return `Welcome to MentorsDaily — ${program}`;
}
