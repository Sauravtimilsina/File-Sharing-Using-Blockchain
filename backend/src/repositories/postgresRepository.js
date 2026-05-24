const pool = require("./postgresPool");
const { decryptField, encryptField } = require("../utils/fieldCrypto");

const one = async (text, values = []) => {
  const result = await pool.query(text, values);
  return result.rows[0] || null;
};

const many = async (text, values = []) => {
  const result = await pool.query(text, values);
  return result.rows;
};

const mapUser = (user) => user && ({
  _id: user.id,
  username: user.username,
  email: user.email,
  password: user.password,
  isVerified: user.is_verified,
  failedLoginAttempts: Number(user.failed_login_attempts || 0),
  lockedUntil: user.locked_until,
  dailyLockCount: Number(user.daily_lock_count || 0),
  lockCountDate: user.lock_count_date,
  fullName: decryptField(user.full_name),
  jobTitle: decryptField(user.job_title),
  department: decryptField(user.department),
  phone: decryptField(user.phone),
  bio: decryptField(user.bio),
  avatarDataUrl: decryptField(user.avatar_data_url),
  lastLoginAt: user.last_login_at,
  lastLoginIp: user.last_login_ip,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const mapFile = (file) => file && ({
  _id: file.id,
  owner: file.owner_id,
  filename: decryptField(file.filename),
  storedName: file.stored_name,
  hash: file.hash,
  fileSize: Number(file.file_size || 0),
  mimeType: decryptField(file.mime_type),
  createdAt: file.created_at,
  updatedAt: file.updated_at,
  deletedAt: file.deleted_at,
});

const mapShare = (share) => share && ({
  _id: share.id,
  fileId: share.file_id_filename
    ? {
      _id: share.file_id,
      filename: decryptField(share.file_id_filename),
      fileSize: Number(share.file_id_file_size || 0),
      mimeType: decryptField(share.file_id_mime_type),
    }
    : share.file_id,
  owner: share.owner_username
    ? {
      _id: share.owner_id,
      username: share.owner_username,
    }
    : share.owner_id,
  sharedWith: share.shared_with_id,
  expiresAt: share.expires_at,
  revokedAt: share.revoked_at,
  createdAt: share.created_at,
  updatedAt: share.updated_at,
});

const mapBlock = (block) => block && ({
  _id: block.id,
  index: Number(block.block_index),
  fileId: block.file_id,
  fileHash: block.file_hash,
  previousHash: block.previous_hash,
  blockHash: block.block_hash,
  previousBlockHash: block.previous_block_hash,
  timestamp: block.timestamp,
});

module.exports = {
  users: {
    findExisting: async ({ email, username }) => mapUser(await one(
      "select * from public.users where email = $1 or username = $2 limit 1",
      [email, username],
    )),
    findByEmail: async (email) => mapUser(await one(
      "select * from public.users where email = $1 limit 1",
      [email],
    )),
    findByUsername: async (username) => mapUser(await one(
      "select * from public.users where username = $1 limit 1",
      [username],
    )),
    findById: async (id) => mapUser(await one(
      "select * from public.users where id = $1 limit 1",
      [id],
    )),
    create: async (input) => mapUser(await one(
      `insert into public.users (username, email, password, is_verified)
       values ($1, $2, $3, $4)
       returning *`,
      [input.username, input.email, input.password, input.isVerified],
    )),
    updateUnverifiedCredentials: async (id, input) => mapUser(await one(
      `update public.users
       set username = $2, password = $3, updated_at = now()
       where id = $1
       returning *`,
      [id, input.username, input.password],
    )),
    markVerified: async (id) => mapUser(await one(
      `update public.users
       set is_verified = true, updated_at = now()
       where id = $1
       returning *`,
      [id],
    )),
    updateProfile: async (id, input) => mapUser(await one(
      `update public.users
       set username = $2,
           full_name = $3,
           job_title = $4,
           department = $5,
           phone = $6,
           bio = $7,
           updated_at = now()
       where id = $1
       returning *`,
      [
        id,
        input.username,
        encryptField(input.fullName),
        encryptField(input.jobTitle),
        encryptField(input.department),
        encryptField(input.phone),
        encryptField(input.bio),
      ],
    )),
    updateAvatar: async (id, avatarDataUrl) => mapUser(await one(
      `update public.users
       set avatar_data_url = $2,
           updated_at = now()
       where id = $1
       returning *`,
      [id, encryptField(avatarDataUrl)],
    )),
    updatePassword: async (id, password, options = { resetLock: true }) => {
      if (options.resetLock === false) {
        return mapUser(await one(
          `update public.users
           set password = $2,
               updated_at = now()
           where id = $1
           returning *`,
          [id, password],
        ));
      }

      return mapUser(await one(
        `update public.users
         set password = $2,
             failed_login_attempts = 0,
             locked_until = null,
             updated_at = now()
         where id = $1
         returning *`,
        [id, password],
      ));
    },
    recordLoginFailure: async (id, input = {}) => {
      if (input.lockedUntil) {
        return mapUser(await one(
          `update public.users
           set failed_login_attempts = failed_login_attempts + 1,
               locked_until = $2,
               daily_lock_count = $3,
               lock_count_date = $4,
               updated_at = now()
           where id = $1
           returning *`,
          [id, input.lockedUntil, input.dailyLockCount, input.lockCountDate],
        ));
      }

      return mapUser(await one(
        `update public.users
         set failed_login_attempts = failed_login_attempts + 1,
             updated_at = now()
         where id = $1
         returning *`,
        [id],
      ));
    },
    recordLoginSuccess: async (id, ipAddress) => mapUser(await one(
      `update public.users
       set failed_login_attempts = 0,
           locked_until = null,
           last_login_at = now(),
           last_login_ip = $2,
           updated_at = now()
       where id = $1
       returning *`,
      [id, ipAddress],
    )),
  },
  otps: {
    deleteByEmail: (email, purpose = "email_verification") => pool.query(
      "delete from public.otps where email = $1 and purpose = $2",
      [email, purpose],
    ),
    create: (input) => pool.query(
      "insert into public.otps (email, purpose, otp_hash, expires_at) values ($1, $2, $3, $4)",
      [input.email, input.purpose || "email_verification", input.otpHash, input.expiresAt],
    ),
    findLatestByEmail: async (email, purpose = "email_verification") => {
      const record = await one(
        `select email, purpose, otp, otp_hash, expires_at
         from public.otps
         where email = $1 and purpose = $2
         order by created_at desc
         limit 1`,
        [email, purpose],
      );

      return record && {
        email: record.email,
        purpose: record.purpose,
        otp: record.otp,
        otpHash: record.otp_hash,
        expiresAt: record.expires_at,
      };
    },
  },
  files: {
    create: async (input) => mapFile(await one(
      `insert into public.files (owner_id, filename, stored_name, hash, file_size, mime_type)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [input.owner, encryptField(input.filename), input.storedName, input.hash, input.fileSize, encryptField(input.mimeType)],
    )),
    findByOwner: async (owner) => (await many(
      "select * from public.files where owner_id = $1 and deleted_at is null order by created_at desc limit 200",
      [owner],
    )).map(mapFile),
    findById: async (id) => mapFile(await one(
      "select * from public.files where id = $1 and deleted_at is null limit 1",
      [id],
    )),
    updateFilename: async (id, filename) => mapFile(await one(
      `update public.files
       set filename = $2, updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, encryptField(filename)],
    )),
    markDeleted: async (id, userId) => mapFile(await one(
      `update public.files
       set deleted_at = now(), deleted_by = $2, updated_at = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, userId],
    )),
  },
  shares: {
    findById: async (id) => mapShare(await one(
      "select * from public.shares where id = $1 limit 1",
      [id],
    )),
    findByFileAndRecipient: async (fileId, sharedWith) => mapShare(await one(
      `select * from public.shares
       where file_id = $1
         and shared_with_id = $2
         and revoked_at is null
         and (expires_at is null or expires_at > now())
       limit 1`,
      [fileId, sharedWith],
    )),
    findAnyByFileAndRecipient: async (fileId, sharedWith) => mapShare(await one(
      `select * from public.shares
       where file_id = $1
         and shared_with_id = $2
       limit 1`,
      [fileId, sharedWith],
    )),
    create: async (input) => mapShare(await one(
      `insert into public.shares (file_id, owner_id, shared_with_id, expires_at)
       values ($1, $2, $3, $4)
       returning *`,
      [input.fileId, input.owner, input.sharedWith, input.expiresAt || null],
    )),
    reactivate: async (shareId, ownerId, expiresAt) => mapShare(await one(
      `update public.shares
       set revoked_at = null,
           revoked_by = null,
           expires_at = $3,
           updated_at = now()
       where id = $1 and owner_id = $2
       returning *`,
      [shareId, ownerId, expiresAt || null],
    )),
    revoke: async (shareId, ownerId) => mapShare(await one(
      `update public.shares
       set revoked_at = now(), revoked_by = $2, updated_at = now()
       where id = $1 and owner_id = $2 and revoked_at is null
       returning *`,
      [shareId, ownerId],
    )),
    findSentByOwner: async (ownerId) => (await many(
      `select
         shares.*,
         files.filename as file_id_filename,
         files.file_size as file_id_file_size,
         files.mime_type as file_id_mime_type,
         users.username as owner_username
       from public.shares
       join public.files on files.id = shares.file_id
       join public.users on users.id = shares.owner_id
       where shares.owner_id = $1
         and shares.revoked_at is null
         and files.deleted_at is null
       order by shares.created_at desc
       limit 200`,
      [ownerId],
    )).map(mapShare),
    findReceivedByUser: async (sharedWith) => (await many(
      `select
         shares.*,
         files.filename as file_id_filename,
         files.file_size as file_id_file_size,
         files.mime_type as file_id_mime_type,
         users.username as owner_username
       from public.shares
       join public.files on files.id = shares.file_id
       join public.users on users.id = shares.owner_id
       where shares.shared_with_id = $1
         and shares.revoked_at is null
         and (shares.expires_at is null or shares.expires_at > now())
         and files.deleted_at is null
       order by shares.created_at desc
      limit 200`,
      [sharedWith],
    )).map(mapShare),
  },
  blocks: {
    findLast: async () => mapBlock(await one(
      "select * from public.blocks order by block_index desc limit 1",
    )),
    create: async (input) => mapBlock(await one(
      `insert into public.blocks (block_index, file_id, file_hash, previous_hash, timestamp, block_hash, previous_block_hash)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [input.index, input.fileId, input.fileHash, input.previousHash, input.timestamp, input.blockHash, input.previousBlockHash],
    )),
    findByFileId: async (fileId) => mapBlock(await one(
      "select * from public.blocks where file_id = $1 limit 1",
      [fileId],
    )),
    findRecent: async (limit = 200) => (await many(
      "select * from public.blocks order by block_index desc limit $1",
      [limit],
    )).map(mapBlock),
  },
  loginAuditLogs: {
    create: (input) => pool.query(
      `insert into public.login_audit_logs
         (user_id, identifier, event_type, reason, ip_address, user_agent)
       values ($1, $2, $3, $4, $5, $6)`,
      [input.userId, input.identifier, input.eventType, input.reason, input.ipAddress, input.userAgent],
    ),
  },
  activityAuditLogs: {
    create: (input) => pool.query(
      `insert into public.activity_audit_logs
         (actor_id, action, target_type, target_id, ip_address, user_agent)
       values ($1, $2, $3, $4, $5, $6)`,
      [input.actorId, input.action, input.targetType, input.targetId, input.ipAddress, input.userAgent],
    ),
    findRecentByActor: async (actorId, limit = 30) => (await many(
      `select id, action, target_type, target_id, created_at
       from public.activity_audit_logs
       where actor_id = $1
       order by created_at desc
       limit $2`,
      [actorId, limit],
    )).map((log) => ({
      _id: log.id,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      createdAt: log.created_at,
    })),
  },
};
