# Certificate Studio — Enterprise Bulk Certificate Generator

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/Database-SQLite_+_SQLAlchemy_2.0-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![ReportLab](https://img.shields.io/badge/PDF_Engine-ReportLab_5.0-blue.svg)](https://www.reportlab.com)
[![Pytest](https://img.shields.io/badge/Tests-21_Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)

**Certificate Studio** is a production-grade, full-stack bulk certificate generation platform. It enables administrators and educational organizations to submit bulk certificate generation requests for multiple recipients in a single API call, generate individualized tamper-resistant vector PDF certificates in the background, track progress in real-time, and securely download credentials.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Project Directory Structure](#project-directory-structure)
5. [Prerequisites](#prerequisites)
6. [Backend Setup & Installation](#backend-setup--installation)
7. [Frontend Setup & Installation](#frontend-setup--installation)
8. [Running the Application](#running-the-application)
9. [REST API Reference](#rest-api-reference)
10. [Sample Payloads & cURL Commands](#sample-payloads--curl-commands)
11. [PDF Certificate Design](#pdf-certificate-design)
12. [Testing Suite](#testing-suite)
13. [Security Considerations](#security-considerations)
14. [Architectural Decisions & Trade-Offs](#architectural-decisions--trade-offs)
15. [Technical Interview Questions & Answers](#technical-interview-questions--answers)

---

## Key Features

- **Bulk Generation in One Request:** Submit batches of up to 500 recipients with certificate title, event name, organization name, and issue date in one `POST /api/jobs` call.
- **Asynchronous In-Process Background Execution:** Immediate `HTTP 202 Accepted` response. Background processing is executed using native `FastAPI BackgroundTasks` without external brokers.
- **Strict Recipient Fault Isolation:** If rendering fails for one recipient (e.g. malformed data or disk anomaly), remaining recipients continue uninterrupted.
- **Incremental Real-Time Progress Polling:** Frontend automatically polls active jobs (`PENDING` or `PROCESSING`) every 1.8 seconds. Progress percentage formula updates row-by-row:
  $$\text{Progress} = \frac{\text{successful} + \text{failed}}{\text{total}} \times 100\%$$
- **Predefined Landscape Vector PDF Template:** Custom ReportLab engine producing landscape A4 vector certificates with double borders, gold rosettes, security seals, and reference identifiers.
- **Secure File Downloads:** PDF downloads via `GET /api/certificates/{id}` are strictly sanitized against path traversal, verify generation state (`409 Conflict` if pending), and stream through `FileResponse`.
- **Administrative SaaS Interface:** Built with React 19, Tailwind CSS, Lucide icons, and React Router. Features live API health indicators, dynamic stat cards, auto-polling progress monitors, and a sample recipient loader for 1-click evaluation.

---

## Technology Stack

### Backend
- **Python 3.11+** (Tested on Python 3.13)
- **FastAPI:** High-performance asynchronous REST framework with automated OpenAPI 3.1 documentation.
- **SQLAlchemy 2.0:** Relational ORM configured with write-ahead logging (WAL) and foreign-key enforcement for SQLite.
- **SQLite:** Zero-configuration, ACID-compliant local database.
- **Pydantic v2 & email-validator:** Request and response schemas with strict RFC 5322 email validation.
- **ReportLab:** Direct vector PDF generation engine.
- **FastAPI BackgroundTasks:** Native asynchronous background worker.
- **Pytest & HTTPX:** Comprehensive automated test suite with isolated in-memory test databases.

### Frontend
- **React 19 & Vite:** Modern reactive UI with hot-module reloading and fast build times.
- **Tailwind CSS v3:** Clean utility-first design system implementing an enterprise SaaS aesthetic.
- **React Router v6:** Declarative client-side routing.
- **Lucide React:** Lightweight, accessible vector iconography.
- **Axios:** Centralized HTTP client with error interceptors.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│      (Dashboard, CreateJob, JobDetails, History)       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│                     FastAPI API                        │
│   /api/health | /api/jobs | /api/certificates/{id}     │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
  1. Synchronous Validation               │ 4. BackgroundTask
  2. Insert Job & Cert Records            │    (process_generation_job)
  3. Return HTTP 202                      │
              ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   SQLite Database (WAL)   │ │  Isolated DB Session     │
│   - GenerationJob         │ ├──────────────────────────┤
│   - Certificate           │ │ For each recipient:      │
└───────────────────────────┘ │  ┌─────────────────────┐ │
                              │  │ ReportLab Engine    │ │
                              │  │ (Generate Vector PDF│ │
                              │  └──────────┬──────────┘ │
                              │             ▼            │
                              │  generated_certificates/ │
                              │  certificate_{id}.pdf    │
                              │             │            │
                              │  Update success/failure  │
                              │  Commit row progress     │
                              │                          │
                              │ Final status computation │
                              └──────────────────────────┘
```

---

## Project Directory Structure

```text
bulk-certificate-generator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI entrypoint, CORS, lifespan
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py           # GET /api/health
│   │   │       ├── jobs.py             # POST /api/jobs, GET /api/jobs, GET /api/jobs/{id}
│   │   │       └── certificates.py     # GET /api/certificates/{id}
│   │   ├── core/
│   │   │   └── config.py               # Pydantic BaseSettings configuration
│   │   ├── db/
│   │   │   ├── database.py             # Engine, SessionLocal, SQLite PRAGMA
│   │   │   └── models.py               # GenerationJob & Certificate SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── job.py                  # Job Pydantic schemas & validators
│   │   │   └── certificate.py          # Recipient & Certificate schemas
│   │   └── services/
│   │       ├── certificate_generator.py# ReportLab landscape A4 vector engine
│   │       └── job_processor.py        # Fault-tolerant background worker
│   ├── tests/
│   │   ├── conftest.py                 # Isolated in-memory SQLite fixtures
│   │   ├── test_jobs.py                # Job creation, validation, and status tests
│   │   ├── test_certificates.py        # Download and security edge-case tests
│   │   └── test_generation.py          # ReportLab direct PDF verification
│   ├── generated_certificates/         # Output directory for rendered PDFs
│   ├── requirements.txt                # Python dependencies
│   └── .env.example                    # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProgressBar.jsx         # Real-time percentage progress bar
│   │   │   ├── StatCard.jsx            # KPI metric cards
│   │   │   └── StatusBadge.jsx         # Status badge pills with icons
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx     # Responsive sidebar, topbar, & health indicator
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # Operations overview & recent jobs
│   │   │   ├── CreateJob.jsx           # Multi-section generation form + sample loader
│   │   │   ├── JobDetails.jsx          # Live auto-polling progress & download roster
│   │   │   └── History.jsx             # Searchable, filterable audit history
│   │   ├── services/
│   │   │   └── api.js                  # Axios HTTP client
│   │   ├── App.jsx                     # Route declarations
│   │   ├── index.css                   # Tailwind styling
│   │   └── main.jsx                    # Vite React mount
│   ├── index.html                      # HTML shell with Inter typography
│   ├── package.json                    # Node dependencies
│   ├── tailwind.config.js              # Tailwind design tokens
│   ├── postcss.config.js               # PostCSS pipeline
│   └── vite.config.js                  # Vite configuration with /api proxy
├── demo_valid_job.json                 # Sample payload with 5 recipients
├── demo_invalid_email.json             # Sample payload demonstrating 422 validation
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Python 3.11+** (Verified compatible up to Python 3.13)
- **Node.js 18+** and **npm 9+**
- Modern Web Browser (Chrome, Firefox, Edge, Safari)

---

## Backend Setup & Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (optional, sensible defaults are embedded):
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```

---

## Frontend Setup & Installation

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## Running the Application

### 1. Start the Backend Server (Terminal 1)
```bash
cd backend
# Ensure virtual environment is activated
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- The backend API will be available at: `http://127.0.0.1:8000`
- Interactive OpenAPI Swagger documentation: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Development Server (Terminal 2)
```bash
cd frontend
npm run dev
```
- Open `http://localhost:5173` in your browser.
- The top-right badge should display a green **API Connected** indicator.

---

## REST API Reference

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/health` | Service and database health check | `200 OK` |
| `POST` | `/api/jobs` | Submit a bulk certificate generation job | `202 Accepted` |
| `GET` | `/api/jobs` | List recent generation jobs (supports pagination & filtering) | `200 OK` |
| `GET` | `/api/jobs/{job_id}` | Retrieve job details, counters, and progress percentage | `200 OK` |
| `GET` | `/api/jobs/{job_id}/certificates` | List all recipients and download URLs for a job | `200 OK` |
| `GET` | `/api/certificates/{certificate_id}` | Download generated vector PDF certificate | `200 OK` / `409` / `404` |

---

## Sample Payloads & cURL Commands

### 1. Create a Bulk Generation Job (`POST /api/jobs`)

```bash
curl -X POST http://127.0.0.1:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "certificate_title": "Certificate of Excellence",
    "event_name": "Cloud Native Summit 2026",
    "organization_name": "Cloud Computing Alliance",
    "issue_date": "2026-10-15",
    "recipients": [
      {
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.org",
        "course": "Kubernetes Microservices"
      },
      {
        "name": "John Doe",
        "email": "john@enterprise.com",
        "course": "Site Reliability Engineering"
      },
      {
        "name": "Jane Smith",
        "email": "jane@technet.org",
        "course": "Cloud Security"
      },
      {
        "name": "Alan Turing",
        "email": "alan@cambridge.ac.uk",
        "course": "Automated Testing"
      },
      {
        "name": "Ada Lovelace",
        "email": "ada@analytics.io",
        "course": "Infrastructure as Code"
      }
    ]
  }'
```

**Response (`202 Accepted`):**
```json
{
  "job_id": 1,
  "status": "PENDING",
  "total": 5
}
```

### 2. Validation Failure Demonstration (`422 Unprocessable Content`)

Submitting an invalid email address:
```bash
curl -i -X POST http://127.0.0.1:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "certificate_title": "Certificate of Participation",
    "event_name": "AI Workshop",
    "organization_name": "ABC Org",
    "issue_date": "2026-10-08",
    "recipients": [
      {
        "name": "Invalid User",
        "email": "not-an-email-address",
        "course": "AI"
      }
    ]
  }'
```

**Response (`422 Unprocessable Content`):**
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "recipients", 0, "email"],
      "msg": "value is not a valid email address: An email address must have an @-sign.",
      "input": "not-an-email-address"
    }
  ]
}
```

### 3. Retrieve Job Progress (`GET /api/jobs/{job_id}`)

```bash
curl http://127.0.0.1:8000/api/jobs/1
```

**Response (`200 OK`):**
```json
{
  "job_id": 1,
  "certificate_title": "Certificate of Excellence",
  "event_name": "Cloud Native Summit 2026",
  "organization_name": "Cloud Computing Alliance",
  "issue_date": "2026-10-15",
  "status": "COMPLETED",
  "total": 5,
  "successful": 5,
  "failed": 0,
  "completed": 5,
  "pending": 0,
  "progress_percentage": 100.0,
  "created_at": "2026-10-11T08:53:36.399689",
  "completed_at": "2026-10-11T08:53:36.455573"
}
```

### 4. Download Certificate PDF (`GET /api/certificates/{id}`)

```bash
curl -O -J http://127.0.0.1:8000/api/certificates/1
```

---

## PDF Certificate Design

The PDF generator (`backend/app/services/certificate_generator.py`) produces landscape A4 certificates using ReportLab:
- **Dimensions:** 841.89 × 595.27 points (Standard Landscape A4).
- **Geometric Borders:** Double border with a 3pt outer border in dark slate (`#1E293B`) and a 1pt inner border in warm gold (`#D97706`) with corner square ornaments.
- **Header:** Uppercase issuing organization name with tracked spacing.
- **Title & Divider:** Grand certificate title in bold typography with a gold center diamond divider.
- **Recipient Typography:** High-contrast recipient name (28pt) with centered underline.
- **Official Security Seal:** Custom vector-drawn circular badge with golden ridges and "VERIFIED OFFICIAL" center text.
- **Authentication Metadata:** Issue date, authorized signatory line, and reference identifier (`Ref: CERT-000001`).
- **Filename Security:** Always saved using the certificate record ID (`certificate_1.pdf`) to prevent filesystem collision and injection.

---

## Testing Suite

The project includes an automated Pytest test suite covering all 21 functional scenarios:

1. Valid job creation (`202 Accepted`).
2. Job creation with multiple recipients.
3. Validation: blank/empty recipient name (`422`).
4. Validation: malformed email address (`422`).
5. Validation: missing course name (`422`).
6. Validation: empty recipients array (`422`).
7. Validation: missing required certificate title (`422`).
8. Direct ReportLab PDF generation verification (valid `%PDF-` header and non-zero bytes).
9. Successful bulk generation completes and updates records.
10. Accurate progress calculation formula and counters.
11. Fault isolation: one recipient failing sets job status to `COMPLETED_WITH_ERRORS`.
12. All recipients failing sets job status to `FAILED`.
13. Retrieving a job's certificate list.
14. Downloading a successful certificate (`200 OK`, `application/pdf`).
15. Attempting to download a pending certificate (`409 Conflict`).
16. Attempting to download a failed certificate (`409 Conflict`).
17. Attempting to retrieve a nonexistent job (`404 Not Found`).
18. Attempting to retrieve a nonexistent certificate (`404 Not Found`).
19. Certificate marked success but missing from disk (`404 Not Found`).
20. Job listing, pagination, and search filtering.
21. Service health check endpoint.

### Running Tests
```bash
cd backend
.\venv\Scripts\pytest -v
```

---

## Security Considerations

1. **Path Traversal Protection:**
   File downloads validate the target filename using `os.path.basename()` and verify that the resolved path is strictly contained within the configured `CERTIFICATES_DIR` via `resolved_file.relative_to(base_dir)`.
2. **Untrusted Input Sanitization:**
   PDF filenames are never constructed using user-supplied names. Files are stored strictly as `certificate_{id}.pdf` using auto-incremented database primary keys.
3. **Database Injection Prevention:**
   All queries utilize SQLAlchemy's parameterized ORM abstractions.
4. **State Protection Before File Delivery:**
   `GET /api/certificates/{id}` checks generation status before attempting file access: returns `409 Conflict` if the certificate is `PENDING` or `FAILED`, protecting against premature reads.
5. **No Stack Trace Exposure:**
   Production exception handlers catch unhandled server errors and return clean JSON error structures without exposing server internals.

---

## Architectural Decisions & Trade-Offs

### 1. In-Process `FastAPI BackgroundTasks` vs Distributed Queue (Celery/Redis)
- **Decision:** Used FastAPI native `BackgroundTasks` without external brokers.
- **Rationale:** Keeps deployment trivial with zero external dependencies (no Redis daemon, no Celery workers). Fully fulfills the throughput requirements for dozens to hundreds of recipients.
- **Trade-off:** In-process tasks are memory-bound and do not survive application restarts. For enterprise volumes (>50,000 certificates/hour), migrating to Celery + Redis or AWS SQS + Lambda would provide distributed durability.

### 2. SQLite with Write-Ahead Logging (WAL)
- **Decision:** SQLite with `PRAGMA journal_mode=WAL` and `check_same_thread=False`.
- **Rationale:** Provides concurrent readers while a single background writer persists generation progress. Eliminates database locking issues common in default SQLite rollback journals.

### 3. Session Management in Background Tasks
- **Decision:** Instantiating a fresh `SessionLocal()` within the background worker.
- **Rationale:** FastAPI's default dependency injection yields a request-scoped session that closes when the HTTP 202 response returns. Using a fresh session inside the worker prevents "Session is closed" errors.

---

## Technical Interview Questions & Answers

### Q1: Why did you choose FastAPI BackgroundTasks instead of Celery or RQ?
**Answer:**
For the requirements of this application, introducing Celery would require running a separate Redis or RabbitMQ container, a Celery worker daemon, and a broker monitoring service. FastAPI `BackgroundTasks` operates in-process, requiring zero external infrastructure while maintaining non-blocking HTTP responsiveness. In `job_processor.py`, we isolate database sessions so the background task operates independently after the HTTP response terminates. If the requirements evolve to require distributed horizontal scaling or job retries across server reboots, the architecture is modular enough that `job_processor.py` can be converted into a Celery task by replacing the function decorator.

### Q2: How is session isolation handled between requests and background tasks in SQLAlchemy?
**Answer:**
FastAPI route handlers use the `get_db` dependency which yields a request-scoped session that is explicitly closed in a `finally` block when the HTTP response finishes. If that same session were passed to `BackgroundTasks`, background code would attempt to access an already-closed connection. To solve this, `job_processor.py` calls `SessionLocal()` directly, creating a fresh, independent connection pool lease that is committed after each recipient and cleanly closed when generation finishes.

### Q3: How does the system achieve fault isolation when an individual recipient PDF fails?
**Answer:**
Inside `process_generation_job`, each certificate generation is wrapped in an individual `try/except` block. If ReportLab encounters a rendering error or character encoding failure on recipient #4, the exception is caught, the certificate record status is updated to `FAILED` with a sanitized error message, `job.failure_count` is incremented, and the transaction is committed. The loop then proceeds immediately to recipient #5. The parent job's final status is calculated after the loop: `COMPLETED` if all succeed, `COMPLETED_WITH_ERRORS` if partial, or `FAILED` if all fail.

### Q4: How do you prevent path traversal attacks during file downloads?
**Answer:**
We implement three defense layers in `certificates.py`:
1. The route only accepts an integer `certificate_id`, never a client-supplied path string.
2. The database stores only the filename basename (`certificate_123.pdf`). When resolving the file, we apply `os.path.basename()` to strip any directory traversal tokens (`../`).
3. We resolve the absolute path and assert `resolved_file.relative_to(base_dir)`. If the target is not within the configured storage folder, an HTTP 400 Bad Request is returned.

### Q5: How is real-time progress calculated and communicated?
**Answer:**
Progress is computed server-side using persisted database counters:
$$\text{Progress} = \frac{\text{successful} + \text{failed}}{\text{total}} \times 100\%$$
Because the background processor commits after each recipient, any call to `GET /api/jobs/{id}` returns accurate live progress. The React frontend polls every 1.8 seconds while the job is in `PENDING` or `PROCESSING` state, updating the horizontal progress bar smoothly, and automatically terminates polling when a terminal state is reached.
