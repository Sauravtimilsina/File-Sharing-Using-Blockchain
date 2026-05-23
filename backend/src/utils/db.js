const runtimeConfig = require("../config/runtime");

const connectDB = async () => {
  try {
    if (runtimeConfig.database.provider === "postgres") {
      const postgresPool = require("../repositories/postgresPool");
      await postgresPool.query("select 1");
      console.log("Database connected with Supabase Postgres adapter");
      return;
    }

    if (runtimeConfig.database.provider === "supabase") {
      if (!runtimeConfig.database.supabaseUrl || !runtimeConfig.database.supabaseSecretKey) {
        throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY for the Supabase backend adapter.");
      }

      console.log("Database adapter configured for Supabase");
      return;
    }

    throw new Error(`Unsupported DB_PROVIDER "${runtimeConfig.database.provider}".`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
