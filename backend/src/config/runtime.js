const parseOrigins = (value) => {
  if (!value) return ["http://localhost:5173"];

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const hasSupabaseBackendConfig = Boolean(
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
);
const hasPostgresConfig = Boolean(process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL);

const runtimeConfig = {
  port: Number(process.env.PORT) || 5000,
  database: {
    provider: process.env.DB_PROVIDER || (hasPostgresConfig ? "postgres" : hasSupabaseBackendConfig ? "supabase" : "mongodb"),
    url: process.env.DATABASE_URL || process.env.MONGO_URI,
    postgresUrl: process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL,
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  corsOrigins: parseOrigins(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 1024 * 1024 * 1024,
  storage: {
    provider: process.env.FILE_STORAGE_PROVIDER || "local",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "encrypted-files",
  },
};

module.exports = runtimeConfig;
