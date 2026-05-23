const runtimeConfig = require("../config/runtime");

const adapters = {
  postgres: () => require("./postgresRepository"),
  supabase: () => require("./supabaseRepository"),
};

const loadAdapter = adapters[runtimeConfig.database.provider];

if (!loadAdapter) {
  throw new Error(`Unsupported DB_PROVIDER "${runtimeConfig.database.provider}".`);
}

module.exports = loadAdapter();
