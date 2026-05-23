# Secure File Transfer

Secure File Transfer is an academic web system for encrypted upload, file sharing, download, and integrity verification.

## Core Flow

1. A user registers and verifies the account with OTP.
2. The user signs in with JWT-backed authentication.
3. Uploaded files are encrypted with AES-256-CBC.
4. SHA-256 hashes are stored with a blockchain-style integrity ledger.
5. Users can verify files, share them with another account, and download authorized files.

## Features

- OTP account verification
- JWT authentication
- Password hashing with bcrypt
- Encrypted file upload
- SHA-256 integrity fingerprints
- Tamper verification checks
- Controlled sharing between users
- Responsive React interface with light and dark themes

## Stack

- Frontend: React, Vite, Tailwind CSS, Lucide icons
- Backend: Node.js, Express
- Current data adapter: Supabase Postgres through a repository adapter

## Local Setup

### Backend

1. Install dependencies in `backend`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set secrets, mail credentials, and Supabase values in `backend/.env`.
4. Apply the Supabase migrations from the top-level `supabase/migrations` folder.
5. Run `npm run dev`.
6. Run `npm run check:supabase` to verify the database tables, private Storage bucket, and Supabase API access.

### Frontend

1. Install dependencies in `frontend`.
2. Copy `frontend/.env.example` to `frontend/.env` when the API URL differs from the default local URL.
3. Run `npm run dev`.

## Database Configuration

The API controllers call a repository layer. `DB_PROVIDER=supabase` uses the Supabase Data API adapter and is the safest local default on IPv4-only networks. `DB_PROVIDER=postgres` uses the direct Supabase Postgres connection when your network supports it or when you use a Supabase pooler connection string.

The Supabase schema lives in the migration set at `supabase/migrations`. It creates `users`, `otps`, `files`, `shares`, and `blocks` tables, enables RLS, keeps browser roles away from those tables because the current app uses its own backend JWT flow, and provisions the private `encrypted-files` Storage bucket.

The browser Supabase publishable key is only needed for future direct frontend Supabase features. The API adapter uses a backend secret key or legacy service-role key and that value must never be exposed in `VITE_*` variables.

The local env files keep Supabase server and browser access separate:

```env
# backend/.env
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_DB_URL=postgresql://postgres:your_database_password@db.your-project-ref.supabase.co:5432/postgres
```

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

`SUPABASE_DB_URL` must be the Postgres connection string, not a Supabase API key.

## File Object Storage

Metadata lives in Supabase Postgres. File objects can live in the private Supabase Storage bucket by setting:

- `FILE_STORAGE_PROVIDER=supabase`
- `SUPABASE_STORAGE_BUCKET=encrypted-files`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Apply the storage migration with `supabase db push` after linking the project, or push it with the hosted database URL. To copy already-encrypted local objects from `backend/uploads` into the bucket, run `npm run migrate:local-files-to-storage` in `backend` after the backend-only Supabase values are set.

## Runtime Configuration

- `PORT`: backend port
- `DB_PROVIDER`: `supabase` for the Supabase Data API adapter, or `postgres` for direct Supabase Postgres/pooler access
- `SUPABASE_DB_URL`: hosted Supabase Postgres connection string used by the direct Postgres adapter
- `SUPABASE_URL`: Supabase project URL for the backend adapter
- `SUPABASE_SECRET_KEY`: backend-only Supabase secret key
- `CLIENT_ORIGINS`: comma-separated frontend origins allowed by CORS
- `MAX_UPLOAD_BYTES`: backend file upload cap; example uses `1073741824` for 1 GB
- `UPLOAD_TMP_DIR`: optional temporary upload staging directory; defaults outside the project in the OS temp folder
- `FILE_STORAGE_PROVIDER`: `local` by default or `supabase` for the private Storage bucket
- `SUPABASE_STORAGE_BUCKET`: private Storage bucket used when `FILE_STORAGE_PROVIDER=supabase`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: mail transport settings for verification and sharing messages
- `JWT_SECRET` and `OTP_SECRET`: backend-only random secrets; production startup rejects short placeholder values
- `VITE_API_BASE_URL`: frontend API base URL

## Health Checks

- `GET /api/health`: lightweight process and SMTP status
- `GET /api/health/ready`: readiness check for Supabase Postgres tables, private Storage bucket, and Supabase API access
- `npm run check:supabase`: command-line version of the readiness check
- `npm run check:file-storage`: verifies encryption, configured storage upload/download, decryption hash, and cleanup

## Large File Note

The backend upload pipeline stages multipart uploads on disk and streams processing for local storage.

The current upload endpoint still receives a single HTTP request. When a hosting service, load balancer, or gateway has a smaller request-body cap, large-file support should move to chunked uploads or direct object-storage uploads with a resumable upload flow.

## Next Security Work

- Role-based access control
- File expiry and revocation
- Direct resumable uploads for large objects
- Audit logs for share and download events
- Stronger key management and rotation

## Author

Saurav Timilsina
