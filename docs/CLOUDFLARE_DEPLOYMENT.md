# Cloudflare frontend deployment

The React frontend is deployed as static assets. The Express backend remains a
separate Node.js service and connects to Supabase and Resend using backend-only
secrets.

## Cloudflare Workers Builds

- Repository: `Sauravtimilsina/File-Sharing-Using-Blockchain`
- Production branch: `main`
- Build command: `npm ci --prefix frontend && npm run build --prefix frontend`
- Deploy command: `npx wrangler deploy`
- Build output: `frontend/dist` (configured in `wrangler.jsonc`)
- Build environment variable: `VITE_API_BASE_URL=https://YOUR-BACKEND/api`

`VITE_API_BASE_URL` is public and must contain only the backend API URL. Never
place Supabase secret keys, database URLs, encryption keys, JWT/OTP secrets, or
the Resend API key in Cloudflare frontend variables.

## Backend production environment

Deploy `backend/` to a persistent Node.js host and set at least:

```env
NODE_ENV=production
CLIENT_ORIGINS=https://YOUR-CLOUDFLARE-DOMAIN
DB_PROVIDER=supabase
FILE_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=encrypted-files
EMAIL_PROVIDER=resend
```

Also set the backend-only Supabase, database, JWT, OTP, encryption, and Resend
secrets listed in `backend/.env.example`. Do not commit the production `.env`.

After deployment, verify `https://YOUR-BACKEND/api/health`, register a new test
account, confirm the emailed OTP, upload/download a small test file, and open a
deep frontend URL such as `/shared` directly to confirm SPA fallback routing.
