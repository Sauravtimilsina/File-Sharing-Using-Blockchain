# Security Policy

Secure File Transfer handles authentication, encrypted files, storage credentials, and database access. Treat security reports and secret handling carefully.

## Supported Versions

The latest commit on the default branch is the only actively maintained version unless releases state otherwise.

## Reporting a Vulnerability

Please do not create a public GitHub issue for a vulnerability.

Report privately to the maintainer with:

- A short description of the issue
- Steps to reproduce
- Impact and affected files or endpoints
- Any safe proof-of-concept details

## Secret Handling Rules

Never commit:

- `.env` files
- Supabase secret or service-role keys
- Database connection strings
- JWT or OTP secrets
- `ENCRYPTION_KEY`
- SMTP usernames or passwords
- API keys, OAuth secrets, tokens, private keys, certificates, or database dumps
- Uploaded files from `backend/uploads`

Only commit `.env.example` files with placeholder values.

## If a Secret Is Exposed

1. Revoke or rotate the exposed secret immediately.
2. Remove it from the working tree.
3. Purge it from Git history before publishing.
4. Check application logs and provider dashboards for suspicious access.
5. Enable GitHub secret scanning and Dependabot alerts.

## Frontend Safety

Anything prefixed with `VITE_` is visible in the browser. Do not put private values in frontend environment variables.
