require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");
const { Pool } = require("pg");
const { hashDecryptedFile } = require("../src/services/fileService");

const ownerEmail = process.env.RESTORE_FILE_OWNER_EMAIL;
const storedName = "c1c81d7e-5c31-4ab1-90cd-e2fd390c1cb7.html.enc";
const filename = "Restored HTML upload.html";
const gitPath = `HEAD:backend/uploads/${storedName}`;
const uploadPath = path.join(__dirname, "../uploads", storedName);

if (!ownerEmail) {
  throw new Error("Set RESTORE_FILE_OWNER_EMAIL in backend/.env before restoring the tracked encrypted file.");
}

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const restoreBlob = async () => {
  try {
    await fs.access(uploadPath);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const encrypted = execFileSync("git", ["show", gitPath]);
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });
  await fs.writeFile(uploadPath, encrypted);
};

const run = async () => {
  await restoreBlob();

  const hash = await hashDecryptedFile(storedName);
  const client = await pool.connect();

  try {
    await client.query("begin");

    const ownerResult = await client.query(
      "select id from public.users where email = $1 limit 1",
      [ownerEmail],
    );
    const owner = ownerResult.rows[0];

    if (!owner) {
      throw new Error(`No Supabase user found for restore owner ${ownerEmail}.`);
    }

    const existingResult = await client.query(
      "select id from public.files where stored_name = $1 limit 1",
      [storedName],
    );

    let fileId = existingResult.rows[0]?.id;

    if (!fileId) {
      fileId = crypto.randomUUID();
      await client.query(
        `insert into public.files (id, owner_id, filename, stored_name, hash)
         values ($1, $2, $3, $4, $5)`,
        [fileId, owner.id, filename, storedName, hash],
      );
    }

    const blockResult = await client.query(
      "select 1 from public.blocks where file_id = $1 limit 1",
      [fileId],
    );

    if (!blockResult.rows.length) {
      const lastBlockResult = await client.query(
        "select block_index, file_hash from public.blocks order by block_index desc limit 1",
      );
      const lastBlock = lastBlockResult.rows[0];

      await client.query(
        `insert into public.blocks (id, block_index, file_id, file_hash, previous_hash, timestamp)
         values ($1, $2, $3, $4, $5, now())`,
        [
          crypto.randomUUID(),
          lastBlock ? Number(lastBlock.block_index) + 1 : 0,
          fileId,
          hash,
          lastBlock ? lastBlock.file_hash : "0",
        ],
      );
    }

    await client.query("commit");
    console.log(JSON.stringify({ fileId, filename, storedName, ownerEmail, hash }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

run()
  .catch((error) => {
    console.error("Restore failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
