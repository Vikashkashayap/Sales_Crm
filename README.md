# Sales CRM — Premium SaaS Platform

A scalable Sales CRM built on **MERN** (MongoDB, Express, React, Node.js) with JWT auth, role-based access (Admin / Sales BDA), lead management, analytics, follow-ups, and Excel import.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Axios, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Auth | JWT (7-day expiry), bcrypt |

> **Note:** The codebase uses **MongoDB + Mongoose** (not Prisma/PostgreSQL). The frontend uses **Vite + React** (not Next.js). All extensions preserve existing auth and the **Upload Leads** flow.

## Features

### Admin
- Analytics dashboard (pipeline, sources, trends, team performance)
- All leads — table + Kanban views
- Search, filters, pagination
- Create / edit / assign / soft-delete leads
- Excel upload (`.xlsx`) — **unchanged UI** at `/admin/upload`
- Duplicate detection on import
- Export leads to Excel
- User management (activate/deactivate, stats, delete)
- Follow-ups monitoring
- **Marketing — Daily Materials** (PDF upload, scheduled send date, active/inactive)
- **Marketing — Email Logs** (per-lead send success/failure)
- Automated daily study material emails (9:00 AM server time via cron)
- In-app notifications
- Activity timeline per lead

### Sales (BDA)
- Personal dashboard (conversion, follow-ups, tasks)
- Assigned leads only — table + Kanban
- Update status, notes, follow-ups
- Lead detail drawer with notes & activity

### Shared
- Dark / light theme
- Toast notifications
- Protected routes
- Rate limiting (300 req / 15 min per IP)

## Quick Start

### 1. MongoDB
Ensure MongoDB is running locally or use Atlas. Set `MONGODB_URI` in `backend/.env`.

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET, PORT
npm install
npm run seed    # optional: creates admin@crm.com / admin123
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

- First time: **http://localhost:3000/setup** to seed admin
- Login: `admin@crm.com` / `admin123` (if seeded)

## Environment Variables

**backend/.env**
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/sales_crm
JWT_SECRET=your_secure_secret_here

# Daily material emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_app_password
SMTP_FROM=services@yourdomain.com
DAILY_MATERIAL_EMAILS=true
```

See `backend/.env.example` for the full list.

### Daily Email Automation

1. Admin uploads a PDF under **Marketing → Daily Materials**, sets title, description, and **send date**, and marks it **active**.
2. Every day at **9:00 AM server local time**, the cron job looks for an **active** material whose `sendDate` is **today**.
3. If found, it emails **only the uploaded marketing list** on Daily Materials (not fresh CRM leads) with the PDF attached.
4. Upload that list via **Marketing → Daily Materials → Upload Excel** (columns: Name, Email).
5. Each send is logged under **Marketing → Email Logs** (`sent` / `failed` with error message).
6. Manual test run: `cd backend && npm run materials:run`

PDFs are stored in `backend/uploads/materials/` and served at `/uploads/materials/...`.

## API Overview

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/seed-admin` | Public (once) |
| POST | `/api/auth/register` | Admin |
| GET | `/api/leads` | Auth (array or paginated with query) |
| POST | `/api/leads` | Auth |
| GET | `/api/leads/:id` | Auth |
| PUT | `/api/leads/:id` | Auth |
| DELETE | `/api/leads/:id` | Admin |
| PUT | `/api/leads/assign/:id` | Admin |
| POST | `/api/leads/upload-excel` | Admin |
| GET | `/api/leads/export` | Admin |
| GET | `/api/dashboard/stats` | Auth |
| GET | `/api/dashboard/analytics` | Admin |
| GET | `/api/dashboard/sales` | Sales |
| GET | `/api/users/sales` | Auth |
| GET | `/api/users` | Admin |
| GET | `/api/followups` | Auth |
| GET | `/api/notifications` | Auth |
| GET | `/api/tasks` | Auth |
| GET | `/api/notes/:leadId` | Auth |
| POST | `/api/materials` | Admin (multipart PDF) |
| GET | `/api/materials` | Admin |
| PATCH | `/api/materials/:id` | Admin (activate/deactivate) |
| DELETE | `/api/materials/:id` | Admin |
| GET | `/api/materials/recipients` | Admin |
| POST | `/api/materials/recipients/upload-excel` | Admin |
| DELETE | `/api/materials/recipients/:id` | Admin |
| DELETE | `/api/materials/recipients/clear` | Admin |
| GET | `/api/email-logs` | Admin |

## Lead Statuses

`New` → `Contacted` → `Interested` → `Qualified` → `Proposal Sent` → `Negotiation` → `Converted` / `Lost`

Legacy statuses (`Follow-up`, `Won`) remain supported for existing data.

## Excel Upload Format

Columns: **Name**, **Mobile** (required), **City**, **Source** (optional).  
Also supported: Email, Company. Duplicates (same mobile) are skipped.

## Folder Structure

```
Sales_CRM/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/          # User, Lead, DailyMaterial, EmailLog, …
│   ├── routes/
│   ├── services/        # emailService, dailyMaterialEmailService
│   ├── jobs/            # paymentReminderJob, dailyMaterialEmailJob
│   ├── uploads/materials/   # daily PDF storage
│   ├── utils/
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       │   ├── charts/
│       │   ├── layout/
│       │   └── leads/
│       ├── context/
│       ├── pages/
│       │   ├── admin/   # AdminDailyMaterialsPage, AdminEmailLogsPage, …
│       │   └── sales/
│       └── utils/
└── README.md
```

## Roles

| Role | Access |
|------|--------|
| `admin` | Full CRM, users, upload, export, analytics |
| `sales` | Assigned leads, personal dashboard, notes, follow-ups |

## Security

- JWT on all protected routes
- `adminOnly` middleware for sensitive actions
- Password hashing (bcrypt, 10 rounds)
- Account deactivation check on login
- Rate limiting middleware
- Soft delete for leads (not hard delete by default)

## License

MIT — extend freely for your organization.
