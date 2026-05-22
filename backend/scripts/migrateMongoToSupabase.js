require("dotenv").config();

const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const Block = require("../src/models/Block");
const File = require("../src/models/File");
const OTP = require("../src/models/OTP");
const Share = require("../src/models/Share");
const User = require("../src/models/User");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongoUrl = process.env.MONGO_MIGRATION_URL || process.env.MONGO_URI || process.env.DATABASE_URL;
const batchSize = 250;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY before running the migration.");
}

if (!mongoUrl || !mongoUrl.startsWith("mongodb")) {
  throw new Error("Set MONGO_MIGRATION_URL to the MongoDB database that contains the existing data.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const chunks = (rows) => {
  const result = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    result.push(rows.slice(index, index + batchSize));
  }
  return result;
};

const upsertRows = async (table, rows) => {
  for (const batch of chunks(rows)) {
    if (!batch.length) continue;
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
  console.log(`${table}: ${rows.length} row(s) migrated`);
};

const asId = (value) => value?.toString();

const run = async () => {
  await mongoose.connect(mongoUrl);

  const [users, files, shares, blocks, otps] = await Promise.all([
    User.find().lean(),
    File.find().lean(),
    Share.find().lean(),
    Block.find().lean(),
    OTP.find().lean(),
  ]);

  await upsertRows("users", users.map((user) => ({
    id: asId(user._id),
    username: user.username,
    email: user.email,
    password: user.password,
    is_verified: Boolean(user.isVerified),
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  })));

  await upsertRows("files", files.map((file) => ({
    id: asId(file._id),
    owner_id: asId(file.owner),
    filename: file.filename,
    stored_name: file.storedName,
    hash: file.hash,
    created_at: file.createdAt,
    updated_at: file.updatedAt,
  })));

  await upsertRows("shares", shares.map((share) => ({
    id: asId(share._id),
    file_id: asId(share.fileId),
    owner_id: asId(share.owner),
    shared_with_id: asId(share.sharedWith),
    created_at: share.createdAt,
    updated_at: share.updatedAt,
  })));

  await upsertRows("blocks", blocks.map((block) => ({
    id: asId(block._id),
    block_index: block.index,
    file_id: asId(block.fileId),
    file_hash: block.fileHash,
    previous_hash: block.previousHash,
    timestamp: block.timestamp,
  })));

  await upsertRows("otps", otps.map((otp) => ({
    id: asId(otp._id),
    email: otp.email,
    otp: otp.otp,
    expires_at: otp.expiresAt,
    created_at: otp.createdAt,
  })));
};

run()
  .then(() => {
    console.log("MongoDB to Supabase migration complete");
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
