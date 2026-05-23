require("dns").setDefaultResultOrder("ipv4first");
const { Pool } = require("pg");
const runtimeConfig = require("../config/runtime");

if (!runtimeConfig.database.postgresUrl) {
  throw new Error("Postgres backend adapter requires SUPABASE_DB_URL or POSTGRES_URL.");
}

const useSsl = process.env.POSTGRES_SSL === "false"
  ? false
  : {
    rejectUnauthorized: false,
  };

module.exports = new Pool({
  connectionString: runtimeConfig.database.postgresUrl,
  ssl: useSsl,
});
