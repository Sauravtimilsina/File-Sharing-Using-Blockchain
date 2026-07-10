const parseOrigins = (value) => {
  const defaults = [
    "http://localhost:5173",
  ];

  if (!value) return defaults;

  return [...new Set([
    ...defaults,
    ...value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ])];
};

const hasSupabaseBackendConfig = Boolean(
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
);
const hasPostgresConfig = Boolean(process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL);
const isProduction = process.env.NODE_ENV === "production";

const looksLikePlaceholder = (value) => !value
  || value.includes("replace_with")
  || value.includes("your_")
  || value.includes("mail_");

const requireRuntimeSecret = (name, value) => {
  if (!value || looksLikePlaceholder(value) || (isProduction && value.length < 32)) {
    throw new Error(
      `${name} must be set in the runtime environment with at least 32 random characters. `
      + "Generate one with: npm run generate:secrets",
    );
  }

  return value;
};

const runtimeConfig = {
  port: Number(process.env.PORT) || 5000,
  isProduction,
  database: {
    provider: process.env.DB_PROVIDER || (hasPostgresConfig ? "postgres" : hasSupabaseBackendConfig ? "supabase" : "postgres"),
    postgresUrl: process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL,
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  corsOrigins: parseOrigins(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 1024 * 1024 * 1024,
  uploadTmpDir: process.env.UPLOAD_TMP_DIR,
  storage: {
    provider: process.env.FILE_STORAGE_PROVIDER || "local",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "encrypted-files",
  },
  requireRuntimeSecret,
};

module.exports = runtimeConfig;
