/**
 * Quick test: login + register student
 * Usage: node scripts/testStudentRegister.js <email> <password>
 */
import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:5000/api';
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/testStudentRegister.js <email> <password>');
  process.exit(1);
}

const ts = Date.now();
const studentPayload = {
  fullName: `API Test ${ts}`,
  phone: `98${String(ts).slice(-8)}`,
  email: `apitest${ts}@test.com`,
  programName: 'integrated 2027',
  courseType: 'Integrated',
  totalFee: 57000,
  discount: 0,
  installmentPlan: 'Full Payment',
  amountPaid: 57000,
  targetYear: '2027',
  leadId: null,
};

async function run() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('LOGIN FAILED:', loginData.message);
    process.exit(1);
  }
  console.log('Login OK:', loginData.user.name, `(${loginData.user.role})`);

  const token = loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const createRes = await fetch(`${API}/students`, {
    method: 'POST',
    headers,
    body: JSON.stringify(studentPayload),
  });
  const createData = await createRes.json();

  if (!createRes.ok) {
    console.error('REGISTER FAILED:', createRes.status, createData.message);
    process.exit(1);
  }

  console.log('REGISTER SUCCESS');
  console.log('  studentCode:', createData.studentCode);
  console.log('  fullName:', createData.fullName);
  console.log('  _id:', createData._id);

  const listRes = await fetch(`${API}/students`, { headers });
  const list = await listRes.json();
  const found = list.find((s) => s._id === createData._id);
  console.log('  in admissions list:', found ? 'YES' : 'NO');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
