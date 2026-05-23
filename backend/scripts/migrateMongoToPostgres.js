require("dotenv").config();

const mongoose = require("mongoose");
const { Pool } = require("pg");
const Block = require("../src/models/Block");
const ActivityAuditLog = require("../src/models/ActivityAuditLog");
const File = require("../src/models/File");
const LoginAuditLog = require("../src/models/LoginAuditLog");
const OTP = require("../src/models/OTP");
const Share = require("../src/models/Share");
const User = require("../src/models/User");

const mongoUrl = process.env.MONGO_MIGRATION_URL || process.env.MONGO_URI;
const postgresUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!mongoUrl) {
  throw new Error("Set MONGO_MIGRATION_URL or MONGO_URI before running the migration.");
}

if (!postgresUrl) {
  throw new Error("Set SUPABASE_DB_URL or POSTGRES_URL before running the migration.");
}

const pool = new Pool({
  connectionString: postgresUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const asId = (value) => value?.toString();

const migrate = async (client, label, rows, query, valuesFor) => {
  for (const row of rows) {
    await client.query(query, valuesFor(row));
  }

  console.log(`${label}: ${rows.length} row(s) migrated`);
};

const run = async () => {
  await mongoose.connect(mongoUrl);

  const [users, files, shares, blocks, otps, loginAuditLogs, activityAuditLogs] = await Promise.all([
    User.find().lean(),
    File.find().lean(),
    Share.find().lean(),
    Block.find().lean(),
    OTP.find().lean(),
    LoginAuditLog.find().lean(),
    ActivityAuditLog.find().lean(),
  ]);
  const userIds = new Set(users.map((user) => asId(user._id)));
  const validFiles = files.filter((file) => userIds.has(asId(file.owner)));
  const fileIds = new Set(validFiles.map((file) => asId(file._id)));
  const validShares = shares.filter((share) => (
    fileIds.has(asId(share.fileId))
    && userIds.has(asId(share.owner))
    && userIds.has(asId(share.sharedWith))
  ));
  const validBlocks = blocks.filter((block) => fileIds.has(asId(block.fileId)));

  console.log(`files skipped for missing owners: ${files.length - validFiles.length}`);
  console.log(`shares skipped for missing references: ${shares.length - validShares.length}`);
  console.log(`blocks skipped for missing files: ${blocks.length - validBlocks.length}`);

  const client = await pool.connect();

  try {
    await client.query("begin");

    await migrate(
      client,
      "users",
      users,
      `insert into public.users
         (id, username, email, password, is_verified, failed_login_attempts, locked_until,
          last_login_at, last_login_ip, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do update set
         username = excluded.username,
         email = excluded.email,
         password = excluded.password,
         is_verified = excluded.is_verified,
         failed_login_attempts = excluded.failed_login_attempts,
         locked_until = excluded.locked_until,
         last_login_at = excluded.last_login_at,
         last_login_ip = excluded.last_login_ip,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      (user) => [
        asId(user._id),
        user.username,
        user.email,
        user.password,
        Boolean(user.isVerified),
        Number(user.failedLoginAttempts || 0),
        user.lockedUntil || null,
        user.lastLoginAt || null,
        user.lastLoginIp || null,
        user.createdAt,
        user.updatedAt,
      ],
    );

    await migrate(
      client,
      "files",
      validFiles,
      `insert into public.files
         (id, owner_id, filename, stored_name, hash, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         owner_id = excluded.owner_id,
         filename = excluded.filename,
         stored_name = excluded.stored_name,
         hash = excluded.hash,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      (file) => [
        asId(file._id),
        asId(file.owner),
        file.filename,
        file.storedName,
        file.hash,
        file.createdAt,
        file.updatedAt,
      ],
    );

    await migrate(
      client,
      "shares",
      validShares,
      `insert into public.shares
         (id, file_id, owner_id, shared_with_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         file_id = excluded.file_id,
         owner_id = excluded.owner_id,
         shared_with_id = excluded.shared_with_id,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      (share) => [
        asId(share._id),
        asId(share.fileId),
        asId(share.owner),
        asId(share.sharedWith),
        share.createdAt,
        share.updatedAt,
      ],
    );

    await migrate(
      client,
      "blocks",
      validBlocks,
      `insert into public.blocks
         (id, block_index, file_id, file_hash, previous_hash, timestamp)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         block_index = excluded.block_index,
         file_id = excluded.file_id,
         file_hash = excluded.file_hash,
         previous_hash = excluded.previous_hash,
         timestamp = excluded.timestamp`,
      (block) => [
        asId(block._id),
        block.index,
        asId(block.fileId),
        block.fileHash,
        block.previousHash,
        block.timestamp,
      ],
    );

    await migrate(
      client,
      "otps",
      otps,
      `insert into public.otps
         (id, email, purpose, otp, otp_hash, expires_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         email = excluded.email,
         purpose = excluded.purpose,
         otp = excluded.otp,
         otp_hash = excluded.otp_hash,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at`,
      (otp) => [
        asId(otp._id),
        otp.email,
        otp.purpose || "email_verification",
        otp.otp,
        otp.otpHash || null,
        otp.expiresAt,
        otp.createdAt,
      ],
    );

    await migrate(
      client,
      "login audit logs",
      loginAuditLogs,
      `insert into public.login_audit_logs
         (id, user_id, identifier, event_type, reason, ip_address, user_agent, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         user_id = excluded.user_id,
         identifier = excluded.identifier,
         event_type = excluded.event_type,
         reason = excluded.reason,
         ip_address = excluded.ip_address,
         user_agent = excluded.user_agent,
         created_at = excluded.created_at`,
      (log) => [
        asId(log._id),
        userIds.has(asId(log.userId)) ? asId(log.userId) : null,
        log.identifier,
        log.eventType,
        log.reason || null,
        log.ipAddress || null,
        log.userAgent || null,
        log.createdAt,
      ],
    );

    await migrate(
      client,
      "activity audit logs",
      activityAuditLogs,
      `insert into public.activity_audit_logs
         (id, actor_id, action, target_type, target_id, ip_address, user_agent, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         actor_id = excluded.actor_id,
         action = excluded.action,
         target_type = excluded.target_type,
         target_id = excluded.target_id,
         ip_address = excluded.ip_address,
         user_agent = excluded.user_agent,
         created_at = excluded.created_at`,
      (log) => [
        asId(log._id),
        userIds.has(asId(log.actorId)) ? asId(log.actorId) : null,
        log.action,
        log.targetType,
        log.targetId || null,
        log.ipAddress || null,
        log.userAgent || null,
        log.createdAt,
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

run()
  .then(() => {
    console.log("MongoDB to Supabase Postgres migration complete");
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await pool.end();
  });
