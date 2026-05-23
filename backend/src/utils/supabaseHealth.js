const { createClient } = require("@supabase/supabase-js");
const runtimeConfig = require("../config/runtime");

const requiredTables = [
  "activity_audit_logs",
  "blocks",
  "files",
  "login_audit_logs",
  "otps",
  "shares",
  "users",
];

const checkPostgres = async () => {
  const pool = require("../repositories/postgresPool");
  const ping = await pool.query("select 1 as ok");

  const tableResult = await pool.query(
    `select table_name
     from information_schema.tables
     where table_schema = $1
       and table_name = any($2)
     order by table_name`,
    ["public", requiredTables],
  );
  const tables = tableResult.rows.map((row) => row.table_name);
  const missingTables = requiredTables.filter((table) => !tables.includes(table));

  const bucketResult = await pool.query(
    "select id, public from storage.buckets where id = $1",
    [runtimeConfig.storage.bucket],
  );

  return {
    ok: ping.rows[0]?.ok === 1,
    tables,
    missingTables,
    storageBucket: bucketResult.rows[0]
      ? {
        id: bucketResult.rows[0].id,
        public: bucketResult.rows[0].public,
      }
      : null,
  };
};

const checkSupabaseApi = async () => {
  if (!runtimeConfig.database.supabaseUrl || !runtimeConfig.database.supabaseSecretKey) {
    return {
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SECRET_KEY.",
    };
  }

  const supabase = createClient(
    runtimeConfig.database.supabaseUrl,
    runtimeConfig.database.supabaseSecretKey,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    rows: data.length,
  };
};

const checkSupabaseApiTables = async () => {
  if (!runtimeConfig.database.supabaseUrl || !runtimeConfig.database.supabaseSecretKey) {
    return {
      ok: false,
      tables: [],
      missingTables: requiredTables,
      error: "Missing SUPABASE_URL or SUPABASE_SECRET_KEY.",
    };
  }

  const supabase = createClient(
    runtimeConfig.database.supabaseUrl,
    runtimeConfig.database.supabaseSecretKey,
    { auth: { persistSession: false } },
  );

  const results = await Promise.all(requiredTables.map(async (table) => {
    const { error } = await supabase.from(table).select("id").limit(1);
    return {
      table,
      ok: !error,
      error: error?.message,
    };
  }));

  const tables = results.filter((result) => result.ok).map((result) => result.table).sort();
  const missingTables = results.filter((result) => !result.ok).map((result) => result.table);

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  const storageBucket = buckets?.find((bucket) => bucket.id === runtimeConfig.storage.bucket) || null;

  return {
    ok: missingTables.length === 0 && !bucketError && Boolean(storageBucket),
    tables,
    missingTables,
    storageBucket: storageBucket
      ? {
        id: storageBucket.id,
        public: storageBucket.public,
      }
      : null,
    error: bucketError?.message,
  };
};

const checkSupabaseHealth = async () => {
  const [database, api] = await Promise.all([
    runtimeConfig.database.provider === "postgres"
      ? checkPostgres()
      : checkSupabaseApiTables(),
    checkSupabaseApi(),
  ]);

  const ok = database.ok
    && database.missingTables.length === 0
    && Boolean(database.storageBucket)
    && api.ok;

  return {
    ok,
    database,
    api,
  };
};

module.exports = {
  checkSupabaseHealth,
  requiredTables,
};
