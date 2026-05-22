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
3. Set secrets, mail credentials, and `SUPABASE_DB_URL` for the hosted Supabase Postgres adapter.
4. Run `backend/supabase/schema.sql` once in the Supabase SQL Editor.
5. Run `npm run dev`.

### Frontend

1. Install dependencies in `frontend`.
2. Copy `frontend/.env.example` to `frontend/.env` when the API URL differs from the default local URL.
3. Run `npm run dev`.

## Database Configuration

The API controllers call a repository layer. `DB_PROVIDER=postgres` uses the direct Supabase Postgres connection, `DB_PROVIDER=supabase` uses the Supabase Data API adapter, and `DB_PROVIDER=mongodb` remains available for local fallback and migration work. When `DB_PROVIDER` is omitted, the backend chooses Postgres when `SUPABASE_DB_URL` exists, otherwise Supabase Data API when both backend Supabase API values exist, and otherwise MongoDB.

The Supabase schema is in `backend/supabase/schema.sql`, and the deployable migration set is in `supabase/migrations`. It creates `users`, `otps`, `files`, `shares`, and `blocks` tables, preserves text IDs so MongoDB ObjectIds can be migrated, enables RLS, keeps browser roles away from those tables because the current app uses its own backend JWT flow, and provisions the private `encrypted-files` Storage bucket.

To migrate MongoDB records after the Supabase schema is created:

1. Set `SUPABASE_DB_URL` and `MONGO_MIGRATION_URL` in `backend/.env`.
2. Run `npm run migrate:mongo-to-postgres` in `backend`.
3. Keep `DB_PROVIDER=postgres` for normal API traffic after the migration succeeds.

The browser Supabase publishable key is only needed for future direct frontend Supabase features. The API adapter uses a backend secret key or legacy service-role key and that value must never be exposed in `VITE_*` variables.

## File Object Storage

Metadata lives in Supabase Postgres. File objects can live in the private Supabase Storage bucket by setting:

- `FILE_STORAGE_PROVIDER=supabase`
- `SUPABASE_STORAGE_BUCKET=encrypted-files`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Apply the storage migration with `supabase db push` after linking the project, or push it with the hosted database URL. To copy already-encrypted local objects from `backend/uploads` into the bucket, run `npm run migrate:local-files-to-storage` in `backend` after the backend-only Supabase values are set.

## Runtime Configuration

- `PORT`: backend port
- `DB_PROVIDER`: `postgres` for direct Supabase Postgres, `supabase` for the Data API adapter, or `mongodb` for fallback/migration
- `SUPABASE_DB_URL`: hosted Supabase Postgres connection string used by the direct Postgres adapter
- `SUPABASE_URL`: Supabase project URL for the backend adapter
- `SUPABASE_SECRET_KEY`: backend-only Supabase secret key
- `MONGO_MIGRATION_URL`: source MongoDB URL for the migration script
- `CLIENT_ORIGINS`: comma-separated frontend origins allowed by CORS
- `MAX_UPLOAD_BYTES`: backend file upload cap; example uses `1073741824` for 1 GB
- `FILE_STORAGE_PROVIDER`: `local` by default or `supabase` for the private Storage bucket
- `SUPABASE_STORAGE_BUCKET`: private Storage bucket used when `FILE_STORAGE_PROVIDER=supabase`
- `VITE_API_BASE_URL`: frontend API base URL

## Large File Note

The backend upload pipeline stages multipart uploads on disk and streams processing for local storage.

The current upload endpoint still receives a single HTTP request. When a hosting service, load balancer, or gateway has a smaller request-body cap, large-file support should move to chunked uploads or direct object-storage uploads with a resumable upload flow.

## Vercel and Cloudflare

The root `vercel.json` uses Vercel Services so the Vite frontend and Express backend deploy from one repository. Deployment does not require running local `npm run dev` commands. Set the Vercel project Framework Preset to `Services` before deploying this configuration.

Set Vercel environment variables for the backend secrets, database URL, storage settings, mail provider, CORS origins, and frontend settings. The frontend defaults to the Services backend prefix `/_/backend/api`; set `VITE_API_BASE_URL` only when the API is hosted elsewhere. The Vercel Express service is suitable for normal API requests, but the large multipart upload route needs a host or direct-upload design that accepts the required file size. Cloudflare can serve DNS, proxying, and static security headers; `frontend/public/_headers` is included for a Pages-style static deployment.

## Next Security Work

- Role-based access control
- File expiry and revocation
- Direct resumable uploads for large objects
- Audit logs for share and download events
- Stronger key management and rotation

## Author

Saurav Timilsina
