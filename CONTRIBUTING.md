# Contributing

Thank you for taking interest in Secure File Transfer.

## Development Setup

1. Fork and clone the repository.
2. Install backend dependencies from `backend/`.
3. Install frontend dependencies from `frontend/`.
4. Copy `.env.example` files to local `.env` files.
5. Configure Supabase, SMTP, and backend secrets locally.
6. Run the backend and frontend in separate terminals.

## Branch Naming

Use clear branch names:

```text
feature/file-expiry
fix/upload-validation
docs/readme-setup
security/key-rotation
```

## Before Opening a Pull Request

- Run `npm run lint` in `frontend/`.
- Run `npm run build` in `frontend/`.
- Run relevant backend checks such as `npm run check:supabase` or `npm run check:file-storage`.
- Do not commit `.env`, credentials, database dumps, private keys, local uploads, or generated build output.
- Keep pull requests focused on one change.

## Commit Style

Prefer short, descriptive commits:

```text
docs: improve Supabase setup guide
fix: validate upload size errors
feat: add share revocation history
```

## Security Contributions

If you find a vulnerability, do not open a public issue. Follow `SECURITY.md`.
