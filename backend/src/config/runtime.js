const parseOrigins = (value) => {
  const defaults = [
    "http://localhost:5173",
    "https://file-sharing-using-blockchain.vercel.app",
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

const requireStrongProductionSecret = (name, value) => {
  if (isProduction && (looksLikePlaceholder(value) || value.length < 32)) {
    throw new Error(
      `${name} must be set in the deployment environment with at least 32 random characters. `
      + "Generate one with: npm run generate:secrets",
    );
  }
};

requireStrongProductionSecret("JWT_SECRET", process.env.JWT_SECRET);
requireStrongProductionSecret("OTP_SECRET", process.env.OTP_SECRET || process.env.JWT_SECRET);

const runtimeConfig = {
  port: Number(process.env.PORT) || 5000,
  isProduction,
  database: {
    provider: process.env.DB_PROVIDER || (hasPostgresConfig ? "postgres" : hasSupabaseBackendConfig ? "supabase" : "mongodb"),
    url: process.env.DATABASE_URL || process.env.MONGO_URI,
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
};

module.exports = runtimeConfig;
