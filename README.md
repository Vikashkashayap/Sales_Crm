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
```

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
│   ├── models/          # User, Lead, Note, FollowUp, Activity, Notification, Task, Document
│   ├── routes/
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
│       │   ├── admin/
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
