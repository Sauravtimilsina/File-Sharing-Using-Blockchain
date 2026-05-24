# Secure File Transfer

Secure File Transfer is a full-stack web application for encrypted file upload, controlled sharing, download, and integrity verification. It is built as an academic cybersecurity project, but the repository is organized like a production-ready starter for secure document exchange workflows.

## Project Idea

Most file-sharing examples stop at uploading and downloading. This project adds the security layer around the workflow:

- Users register, verify their account with OTP, and sign in with JWT authentication.
- Files are encrypted before storage with AES-256-CBC.
- SHA-256 fingerprints are stored in a blockchain-style integrity ledger.
- Owners can share files with other registered users and revoke access.
- Recipients can preview, download, and verify files they are allowed to access.
- Profile fields and file metadata are encrypted before being persisted.

## Features

- OTP account verification and password reset flow
- JWT authentication with protected API routes
- Password hashing with bcrypt
- Encrypted file upload and download
- Private Supabase Storage support for encrypted file objects
- Supabase Postgres schema with migrations and RLS enabled
- SHA-256 integrity verification
- Blockchain-style block records for file integrity history
- Controlled user-to-user file sharing
- Share expiry and lifecycle fields in the schema
- Responsive React interface with light and dark themes
- Backend health and readiness checks

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express, Multer, Helmet, CORS |
| Database | Supabase Postgres |
| Storage | Supabase Storage or local encrypted file storage |
| Security | JWT, bcrypt, AES-256-CBC, SHA-256, OTP |
| Tooling | Supabase CLI migrations, ESLint, npm |

## Repository Structure

```text
.
|-- backend/              # Express API, auth, encryption, storage, repositories
|-- frontend/             # React + Vite client
|-- supabase/             # Supabase config and database/storage migrations
|-- .github/              # CI workflow and contribution templates
|-- CHANGELOG.md          # Release history
|-- CONTRIBUTING.md       # Development and pull request guide
|-- SECURITY.md           # Security and secret handling policy
`-- README.md
```

## Quick Start

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project, or Supabase CLI for local development
- SMTP credentials for OTP email delivery

### 1. Clone the Repository

```bash
git clone https://github.com/Sauravtimilsina/File-Sharing-Using-Blockchain.git
cd File-Sharing-Using-Blockchain
```

### 2. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure Environment Variables

Copy the example files:

```bash
cd backend
copy .env.example .env

cd ../frontend
copy .env.example .env
```

On macOS or Linux, use `cp` instead of `copy`.

Generate backend secrets:

```bash
cd backend
npm run generate:secrets
```

Paste the generated values into `backend/.env`.

Do not reuse values from another developer's machine. Every clone should generate its own `JWT_SECRET`, `OTP_SECRET`, and `ENCRYPTION_KEY`.

### 4. Configure Supabase

Create a Supabase project, then set these backend-only values in `backend/.env`:

```env
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_backend_only_supabase_secret_key
SUPABASE_DB_URL=postgresql://postgres:your_database_password@db.your-project-ref.supabase.co:5432/postgres
FILE_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=encrypted-files
```

Apply the migrations from `supabase/migrations` using the Supabase CLI:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Then verify backend access:

```bash
cd backend
npm run check:supabase
```

If you only want to test file handling locally before connecting Supabase Storage, set `FILE_STORAGE_PROVIDER=local`. The database still needs the Supabase Postgres schema from the migrations.

### 5. Run the App

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open the frontend URL shown by Vite, usually `http://localhost:5173`.

### Fresh Clone Verification

Before sharing or deploying a new copy, run:

```bash
cd backend
npm install
node --check src/server.js

cd ../frontend
npm install
npm run lint
npm run build
```

The backend also needs a real `backend/.env` before `npm run dev` or `npm start` can connect to the database.

## Environment Variables

### Backend

The backend owns all private configuration:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port, defaults to `5000` |
| `NODE_ENV` | Runtime mode, use `production` in deployed environments |
| `DB_PROVIDER` | `supabase` for Supabase Data API or `postgres` for direct Postgres |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Backend-only Supabase secret/service key |
| `SUPABASE_DB_URL` | Supabase Postgres connection string |
| `POSTGRES_SSL` | Optional; set to `false` only for local Postgres without SSL |
| `CLIENT_ORIGINS` | Comma-separated allowed frontend origins |
| `MAX_UPLOAD_BYTES` | Upload size limit |
| `UPLOAD_TMP_DIR` | Optional temporary upload directory |
| `FILE_STORAGE_PROVIDER` | `supabase` or `local` |
| `SUPABASE_STORAGE_BUCKET` | Private bucket for encrypted objects |
| `JWT_SECRET` | Random JWT signing secret |
| `OTP_SECRET` | Random OTP signing secret |
| `ENCRYPTION_KEY` | 32-byte hex encryption key |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email transport settings |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `RESEND_FROM`, `BREVO_API_KEY`, `BREVO_FROM` | Optional transactional email provider settings |
| `DEV_SHOW_OTP` | Optional local-only helper; set to `true` to include OTP values in development responses |

### Frontend

The frontend must only contain public browser-safe values:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_API_TIMEOUT_MS=60000
```

Never put Supabase secret keys, database URLs, JWT secrets, OTP secrets, SMTP passwords, tokens, or `ENCRYPTION_KEY` in `frontend/.env` or any `VITE_*` variable.

## Useful Commands

### Backend

```bash
npm run dev                         # Start API with nodemon
npm start                           # Start API with node
npm run generate:secrets            # Generate JWT, OTP, and encryption secrets
npm run check:supabase              # Verify Supabase tables, bucket, and API access
npm run check:file-storage          # Verify encrypted upload/download storage flow
npm run check:smtp                  # Verify SMTP configuration
npm run encrypt:profiles            # Encrypt existing profile and metadata fields
npm run migrate:local-files-to-storage
```

### Frontend

```bash
npm run dev       # Start Vite dev server
npm run build     # Build production assets
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Process and SMTP health |
| `GET` | `/api/health/ready` | Supabase and storage readiness |
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/verify-otp` | Verify OTP |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `GET` | `/api/auth/me` | Current authenticated user |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/files/upload` | Upload encrypted file |
| `GET` | `/api/files/my-files` | List owner files |
| `GET` | `/api/files/shared` | List files shared with current user |
| `GET` | `/api/files/verify/:id` | Verify file integrity |
| `GET` | `/api/files/download/:id` | Download an authorized file |
| `POST` | `/api/share/file` | Share a file |
| `DELETE` | `/api/share/:id` | Revoke a share |

## Security Notes

- `.env` files are ignored and must never be committed.
- Only `.env.example` files should be public.
- Backend secrets must stay in `backend/.env` or the deployment provider's secret manager.
- Frontend `VITE_*` variables are shipped to the browser and are not secret.
- The current app uses its own backend JWT flow. Supabase keys and database credentials must remain backend-only.
- Rotate any key immediately if it was ever committed, pasted into an issue, or exposed in a screenshot.
- Before publishing, enable GitHub secret scanning and Dependabot alerts in the repository settings.

## GitHub Discovery Setup

Recommended repository description:

```text
Encrypted file transfer system with OTP auth, Supabase storage, SHA-256 integrity checks, and secure sharing.
```

Recommended topics:

```text
secure-file-transfer, encrypted-file-sharing, react, vite, nodejs, express, supabase, postgres, cybersecurity, jwt-authentication, otp-verification, aes-encryption, sha256, file-integrity, final-year-project
```

Use releases for important milestones such as:

- `v1.0.0` - first public release
- `v1.1.0` - resumable uploads or improved sharing
- `v1.2.0` - audit logs or key rotation

For social sharing, use a short post like:

```text
I published Secure File Transfer, a full-stack cybersecurity project for encrypted uploads, controlled sharing, and SHA-256 integrity verification.

Built with React, Node.js, Express, Supabase Postgres, and Supabase Storage.
```

## Roadmap

- Role-based access control
- Direct resumable uploads for large encrypted objects
- Audit logs for share, preview, download, and revoke events
- Stronger key management and rotation workflow
- Automated backend tests
- Deployment guide for Render, Railway, Vercel, and Supabase

## Releases and Updates

This project uses `CHANGELOG.md` for public release notes. When preparing a release:

1. Update `CHANGELOG.md`.
2. Run frontend lint and build.
3. Run backend Supabase and storage checks.
4. Create a GitHub release with a clear title, summary, screenshots if available, and setup notes.
5. Share the release on your GitHub profile README, LinkedIn, and developer communities.

## Contributing

Contributions are welcome. Read `CONTRIBUTING.md` before opening a pull request.

## Author

Saurav Timilsina

## License

This project is licensed under the MIT License. See `LICENSE` for details.
