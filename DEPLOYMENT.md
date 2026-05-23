# Free Deployment Guide

This project is deployment-ready for a free setup using:

- Frontend: Vercel Hobby plan
- Backend: Render Free web service
- Database and encrypted file storage: Supabase Free project

## 1. Backend on Render

1. Go to Render and create a new Blueprint from this GitHub repository.
2. Render will read `render.yaml`.
3. Generate secrets locally:

```bash
cd backend
npm run generate:secrets
```

4. Set these secret environment variables in Render:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_DB_URL=
CLIENT_ORIGINS=https://your-vercel-frontend-url.vercel.app
JWT_SECRET=copy_from_generate_secrets_output
OTP_SECRET=copy_from_generate_secrets_output
ENCRYPTION_KEY=copy_from_generate_secrets_output
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_TIMEOUT_MS=10000
```

Render already gets these non-secret defaults from `render.yaml`:

```env
NODE_ENV=production
DB_PROVIDER=postgres
FILE_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=encrypted-files
MAX_UPLOAD_BYTES=1073741824
```

After deploy, copy the backend URL. It will look like:

```txt
https://secure-file-transfer-api.onrender.com
```

## 2. Frontend on Vercel

1. Import this GitHub repository in Vercel.
2. Set the project root directory to `frontend`.
3. Use:

```txt
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

4. Add this Vercel environment variable:

```env
VITE_API_BASE_URL=https://secure-file-transfer-api.onrender.com/api
```

The `frontend/vercel.json` file makes React Router pages work after refresh.

## 3. Final CORS Update

After Vercel gives the frontend URL, update Render's `CLIENT_ORIGINS` to that exact URL, then redeploy the backend.

Example:

```env
CLIENT_ORIGINS=https://secure-file-transfer.vercel.app
```

## Free Tier Notes

Render free services can sleep when inactive, so the first backend request after a while can be slow. Vercel Hobby and Supabase Free are suitable for student/demo use, but watch their usage dashboards.
