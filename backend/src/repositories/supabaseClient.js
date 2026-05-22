const { createClient } = require("@supabase/supabase-js");
const runtimeConfig = require("../config/runtime");

if (!runtimeConfig.database.supabaseUrl || !runtimeConfig.database.supabaseSecretKey) {
  throw new Error("Supabase backend adapter requires SUPABASE_URL and SUPABASE_SECRET_KEY.");
}

module.exports = createClient(
  runtimeConfig.database.supabaseUrl,
  runtimeConfig.database.supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
