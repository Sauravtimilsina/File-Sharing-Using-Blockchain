const mongoose = require("mongoose");
const runtimeConfig = require("../config/runtime");

let connectionPromise = null;

const connectDB = async () => {
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    if (runtimeConfig.database.provider === "postgres") {
      const postgresPool = require("../repositories/postgresPool");
      await postgresPool.query("select 1");
      console.log("Database connected with Supabase Postgres adapter");
      return;
    }

    if (runtimeConfig.database.provider === "supabase") {
      if (!runtimeConfig.database.supabaseUrl || !runtimeConfig.database.supabaseSecretKey) {
        throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY for Supabase adapter.");
      }

      console.log("Database adapter configured for Supabase");
      return;
    }

    if (runtimeConfig.database.provider === "mongodb") {
      if (!runtimeConfig.database.url) {
        throw new Error("Missing DATABASE_URL or MONGO_URI for MongoDB connection.");
      }

      await mongoose.connect(runtimeConfig.database.url);
      console.log("Database connected with MongoDB adapter");
      return;
    }

    throw new Error(`Unsupported DB_PROVIDER "${runtimeConfig.database.provider}".`);
  })();

  return connectionPromise;
};

module.exports = connectDB;