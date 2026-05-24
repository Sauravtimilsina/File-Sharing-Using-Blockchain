require("dotenv").config();

const runtimeConfig = require("../src/config/runtime");
const { encryptField } = require("../src/utils/fieldCrypto");

const PROFILE_COLUMNS = ["full_name", "job_title", "department", "phone", "bio", "avatar_data_url"];

const encryptProfileRow = (row) => PROFILE_COLUMNS.reduce((update, column) => {
  update[column] = encryptField(row[column] || "");
  return update;
}, {});

const runPostgres = async () => {
  const pool = require("../src/repositories/postgresPool");
  const { rows } = await pool.query(`select id, ${PROFILE_COLUMNS.join(", ")} from public.users`);

  for (const row of rows) {
    const update = encryptProfileRow(row);
    await pool.query(
      `update public.users
       set full_name = $2,
           job_title = $3,
           department = $4,
           phone = $5,
           bio = $6,
           avatar_data_url = $7,
           updated_at = now()
       where id = $1`,
      [
        row.id,
        update.full_name,
        update.job_title,
        update.department,
        update.phone,
        update.bio,
        update.avatar_data_url,
      ],
    );
  }

  await pool.end();
  return rows.length;
};

const failOnError = (result) => {
  if (result.error) throw result.error;
  return result.data;
};

const runSupabase = async () => {
  const supabase = require("../src/repositories/supabaseClient");
  const rows = failOnError(await supabase.from("users").select(`id,${PROFILE_COLUMNS.join(",")}`));

  for (const row of rows) {
    failOnError(await supabase
      .from("users")
      .update({
        ...encryptProfileRow(row),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id));
  }

  return rows.length;
};

const main = async () => {
  const count = runtimeConfig.database.provider === "supabase"
    ? await runSupabase()
    : await runPostgres();

  console.log(`Encrypted profile fields for ${count} user${count === 1 ? "" : "s"}.`);
};

main().catch((error) => {
  console.error("Profile encryption failed:", error.message);
  process.exit(1);
});
