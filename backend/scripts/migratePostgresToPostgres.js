require("dotenv").config();

const { Pool } = require("pg");

const sourceUrl = process.env.SOURCE_SUPABASE_DB_URL;
const targetUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
const tables = ["users", "otps", "files", "shares", "blocks", "login_audit_logs", "activity_audit_logs"];

if (!sourceUrl || !targetUrl) {
  throw new Error("Set SOURCE_SUPABASE_DB_URL and SUPABASE_DB_URL before copying Supabase data.");
}

const poolOptions = (connectionString) => ({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const source = new Pool(poolOptions(sourceUrl));
const target = new Pool(poolOptions(targetUrl));

const quoted = (name) => `"${name.replace(/"/g, "\"\"")}"`;

const copyTable = async (sourceClient, targetClient, table) => {
  const result = await sourceClient.query(`select * from public.${table}`);
  if (!result.rows.length) {
    console.log(`${table}: 0 row(s) copied`);
    return;
  }

  const columns = result.fields.map((field) => field.name);
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${quoted(column)} = excluded.${quoted(column)}`)
    .join(", ");
  const insert = `insert into public.${table}
    (${columns.map(quoted).join(", ")})
    values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
    on conflict (id) do update set ${updates}`;

  for (const row of result.rows) {
    await targetClient.query(insert, columns.map((column) => row[column]));
  }

  console.log(`${table}: ${result.rows.length} row(s) copied`);
};

const run = async () => {
  const sourceClient = await source.connect();
  const targetClient = await target.connect();

  try {
    await targetClient.query("begin");
    for (const table of tables) {
      await copyTable(sourceClient, targetClient, table);
    }
    await targetClient.query("commit");
  } catch (error) {
    await targetClient.query("rollback");
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
  }
};

run()
  .then(() => console.log("Supabase Postgres copy complete"))
  .catch((error) => {
    console.error("Supabase Postgres copy failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.end();
    await target.end();
  });
