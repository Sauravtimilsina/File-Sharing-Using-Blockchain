require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config({ path: ".env", quiet: true });

const pool = require("../src/repositories/postgresPool");
const { checkSupabaseHealth } = require("../src/utils/supabaseHealth");

const main = async () => {
  const health = await checkSupabaseHealth();

  console.log(`postgres_ok=${health.database.ok ? 1 : 0}`);
  console.log(`tables=${health.database.tables.join(",")}`);
  console.log(
    `bucket=${health.database.storageBucket?.id || "missing"} public=${health.database.storageBucket?.public}`,
  );
  console.log(`supabase_api_ok=${health.api.ok ? 1 : 0} rows=${health.api.rows || 0}`);

  if (!health.ok) throw new Error("Supabase health check failed.");
};

main()
  .catch((error) => {
    console.error(`supabase_check_error=${error.code || ""} ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
