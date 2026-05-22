const { Pool } = require("pg");
const runtimeConfig = require("../config/runtime");

if (!runtimeConfig.database.postgresUrl) {
  throw new Error("Postgres backend adapter requires SUPABASE_DB_URL or POSTGRES_URL.");
}

module.exports = new Pool({
  connectionString: runtimeConfig.database.postgresUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});
