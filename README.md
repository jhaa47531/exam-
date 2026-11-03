# ExamPro – Enterprise Online Examination & Proctoring System

ExamPro is a full-stack, production-oriented online examination platform designed for universities, colleges, and certification authorities. It features server-authoritative timing, automated grading, manual subjective evaluation, real-time anti-cheating telemetry, and mandatory College ID card verification.

---

## 🌟 Key Architecture & Capabilities

1. **Strict Two-Role RBAC (Admin & Student)**:
   - Students register and submit university credentials.
   - Admin roles can only be provisioned server-side or via Supabase database administration; students can never self-assign admin status.
   - Every API endpoint is guarded by authentication and role middleware.

2. **College ID Verification Flow**:
   - Students register with their Full Name, College Roll ID, University Enrollment Number, Course, Semester, and an uploaded College ID card.
   - Account status starts as `PENDING`. Unverified students are strictly restricted from accessing examinations.
   - The Controller of Examinations reviews private ID card photos via short-lived signed previews and can either **Approve** or **Reject with Reason**.
   - If rejected, students receive real-time feedback and can resubmit corrected documentation.

3. **Server-Authoritative Exam Timing & Anti-Cheating**:
   - Examination timers are computed and enforced server-side (`scheduled_end_time = min(now + duration, common_window_end)`).
   - Timers survive browser reloads, network reconnects, and device switching.
   - Real-time client security telemetry logs tab switches (`visibilitychange`), window blurs, and fullscreen exits.
   - Proctors monitor active sessions on a Live Radar table and can issue **Warnings**, trigger temporary **Exam Holds** (30s, 1m, 5m, 10m, or custom duration), **Resume**, or permanently **Terminate** with recorded reasons.

4. **Automated & Manual Grading**:
   - Objective questions (Multiple Choice & True/False) are automatically evaluated upon submission with negative marking deductions if configured.
   - Subjective written answers can be reviewed and scored with written feedback by proctor administrators.
   - Pass/Fail status and percentage calculations are computed server-side and never trusted from frontend inputs.

---

## 🚀 Technology Stack

- **Frontend**: React 19, Vite, TypeScript, React Router 7, Tailwind CSS 4, Lucide React, Canvas Confetti.
- **Backend**: Node.js, Express.js, TypeScript (`tsx`), Supabase JS SDK, Server-Sent Events (SSE) for real-time monitoring.
- **Database & Storage**: Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), private Supabase Storage bucket (`college-id-cards`).

---

## 📁 Project Structure

```
ExamPro/
  backend/
    src/
      config/        # Supabase client & in-memory relational fallback engine
      controllers/   # Auth, Student, Admin, and Exam controllers
      middleware/    # JWT token auth & role verification guards
      routes/        # REST API endpoints
      services/      # Exam timing, autosave, and real-time SSE live monitoring
      utils/         # Pure grading math and unit tests (grading.ts & grading.test.ts)
      app.ts         # Express server configuration
  database/
    migrations/      # 001_initial_schema.sql (All 17 relational tables & indexes)
    policies/        # 001_rls_policies.sql (Row Level Security & Storage rules)
    README.md        # Database schema and Supabase deployment guide
  src/
    components/      # Reusable UI widgets & DemoBar persona switcher
    context/         # AuthContext & session management
    layouts/         # AuthLayout, AdminLayout (all 13 links), StudentLayout
    pages/
      auth/          # Login, Register (with ID upload), ForgotPassword
      student/       # StudentDashboard, AvailableExams, ExamInterface, ExamResultView, Profile
      admin/         # AdminDashboard, StudentVerification, LiveMonitoring, Exams, Questions, Results
    services/        # Typed API client
    types/           # Common TypeScript definitions
    App.tsx          # React Router route hierarchy
    main.tsx         # Frontend bootstrap
  server.ts          # Unified Full-Stack entry point (Express + Vite)
  .env.example       # Environment template
  README.md
```

---

## ⚙️ Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Variables in `.env`:
```ini
# Supabase Configuration (Optional: fallback engine runs out-of-the-box if omitted)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

PORT=3000
```

### 3. Run Unit Tests
```bash
npx --yes tsx --test backend/src/utils/grading.test.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Personas (Pre-seeded for instant evaluation)

| Role | Email | Password | Status / Access |
|---|---|---|---|
| **Chief Proctor (Admin)** | `admin@exampro.edu` | `Admin@1234` | Full Controller of Examinations dashboard |
| **Verified Student** | `student@college.edu` | `Student@1234` | Alex Rivera (BCA Sem 3) - Ready to take DBMS exam |
| **Pending Student** | `aditya@student.edu` | `Student@1234` | Aditya Kumar Jha - Awaiting College ID verification |
| **Rejected Student** | `sarah.connor@student.edu` | `Student@1234` | Sarah Connor - Can review rejection reason and resubmit |

*You can also toggle between all personas instantly using the top **ExamPro System Sandbox** bar.*

---

## 🛡️ Database & RLS Setup in Supabase

1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run `database/migrations/001_initial_schema.sql` to instantiate the 17 tables and indexes.
3. Run `database/policies/001_rls_policies.sql` to enable Row Level Security and storage rules.
4. Create a private bucket in **Storage** called `college-id-cards`.
