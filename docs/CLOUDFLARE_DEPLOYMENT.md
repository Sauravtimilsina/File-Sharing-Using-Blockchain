# Cloudflare frontend deployment

The React frontend is deployed as static assets and `/api/*` is handled by the
Express application through Cloudflare's Node.js HTTP compatibility layer. The
API connects to Supabase and Resend using Worker secrets.

## Cloudflare Workers Builds

- Repository: `Sauravtimilsina/File-Sharing-Using-Blockchain`
- Production branch: `main`
- Build command: `npm install`
- Deploy command: `npx wrangler deploy`
- Build output: `frontend/dist` (configured in `wrangler.jsonc`)
- The frontend uses same-origin `/api` by default.

`VITE_API_BASE_URL` is public and must contain only the backend API URL. Never
place Supabase secret keys, database URLs, encryption keys, JWT/OTP secrets, or
the Resend API key in Cloudflare frontend variables.

## Worker variables and secrets

```env
NODE_ENV=production
CLIENT_ORIGINS=https://YOUR-WORKER-DOMAIN
DB_PROVIDER=supabase
FILE_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=encrypted-files
EMAIL_PROVIDER=resend
```

Also set the backend-only Supabase, JWT, OTP, encryption, and Resend secrets
listed in `backend/.env.example` under Worker Settings > Variables and Secrets.
Do not commit the production `.env`.

After deployment, verify `https://YOUR-BACKEND/api/health`, register a new test
account, confirm the emailed OTP, upload/download a small test file, and open a
deep frontend URL such as `/shared` directly to confirm SPA fallback routing.
