const supabase = require("./supabaseClient");

const failOnError = (result) => {
  if (result.error) throw result.error;
  return result.data;
};

const mapUser = (user) => user && ({
  _id: user.id,
  username: user.username,
  email: user.email,
  password: user.password,
  isVerified: user.is_verified,
  failedLoginAttempts: Number(user.failed_login_attempts || 0),
  lockedUntil: user.locked_until,
  lastLoginAt: user.last_login_at,
  lastLoginIp: user.last_login_ip,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const mapFile = (file) => file && ({
  _id: file.id,
  owner: file.owner_id,
  filename: file.filename,
  storedName: file.stored_name,
  hash: file.hash,
  fileSize: Number(file.file_size || 0),
  mimeType: file.mime_type,
  createdAt: file.created_at,
  updatedAt: file.updated_at,
});

const mapShare = (share, file, owner) => share && ({
  _id: share.id,
  fileId: file
    ? {
      _id: file.id,
      filename: file.filename,
      fileSize: Number(file.file_size || 0),
      mimeType: file.mime_type,
    }
    : share.file_id,
  owner: owner
    ? {
      _id: owner.id,
      username: owner.username,
    }
    : share.owner_id,
  sharedWith: share.shared_with_id,
  createdAt: share.created_at,
  updatedAt: share.updated_at,
});

const mapBlock = (block) => block && ({
  _id: block.id,
  index: Number(block.block_index),
  fileId: block.file_id,
  fileHash: block.file_hash,
  previousHash: block.previous_hash,
  timestamp: block.timestamp,
});

const singleOrNull = async (query) => {
  const result = await query.maybeSingle();
  return failOnError(result);
};

module.exports = {
  users: {
    findExisting: async ({ email, username }) => {
      const [emailUser, usernameUser] = await Promise.all([
        singleOrNull(supabase.from("users").select("*").eq("email", email)),
        singleOrNull(supabase.from("users").select("*").eq("username", username)),
      ]);

      return mapUser(emailUser || usernameUser);
    },
    findByEmail: async (email) => mapUser(await singleOrNull(
      supabase.from("users").select("*").eq("email", email),
    )),
    findByUsername: async (username) => mapUser(await singleOrNull(
      supabase.from("users").select("*").eq("username", username),
    )),
    findById: async (id) => mapUser(await singleOrNull(
      supabase.from("users").select("*").eq("id", id),
    )),
    create: async (input) => mapUser(failOnError(await supabase
      .from("users")
      .insert({
        username: input.username,
        email: input.email,
        password: input.password,
        is_verified: input.isVerified,
      })
      .select("*")
      .single())),
    updateUnverifiedCredentials: async (id, input) => mapUser(failOnError(await supabase
      .from("users")
      .update({
        username: input.username,
        password: input.password,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single())),
    markVerified: async (id) => mapUser(failOnError(await supabase
      .from("users")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single())),
    updateProfile: async (id, input) => mapUser(failOnError(await supabase
      .from("users")
      .update({
        username: input.username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single())),
    updatePassword: async (id, password, options = { resetLock: true }) => {
      const update = {
        password,
        updated_at: new Date().toISOString(),
      };

      if (options.resetLock !== false) {
        update.failed_login_attempts = 0;
        update.locked_until = null;
      }

      return mapUser(failOnError(await supabase
        .from("users")
        .update(update)
        .eq("id", id)
        .select("*")
        .single()));
    },
    recordLoginFailure: async (id, lockedUntil) => {
      const user = await singleOrNull(supabase.from("users").select("failed_login_attempts").eq("id", id));
      return mapUser(failOnError(await supabase
        .from("users")
        .update({
          failed_login_attempts: Number(user?.failed_login_attempts || 0) + 1,
          ...(lockedUntil ? { locked_until: lockedUntil } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single()));
    },
    recordLoginSuccess: async (id, ipAddress) => mapUser(failOnError(await supabase
      .from("users")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single())),
  },
  otps: {
    deleteByEmail: async (email, purpose = "email_verification") => failOnError(await supabase
      .from("otps")
      .delete()
      .eq("email", email)
      .eq("purpose", purpose)),
    create: async (input) => failOnError(await supabase.from("otps").insert({
      email: input.email,
      purpose: input.purpose || "email_verification",
      otp_hash: input.otpHash,
      expires_at: input.expiresAt,
    })),
    findLatestByEmail: async (email, purpose = "email_verification") => {
      const record = failOnError(await supabase
        .from("otps")
        .select("*")
        .eq("email", email)
        .eq("purpose", purpose)
        .order("created_at", { ascending: false })
        .limit(1))[0];
      return record && {
        email: record.email,
        otp: record.otp,
        otpHash: record.otp_hash,
        expiresAt: record.expires_at,
      };
    },
  },
  files: {
    create: async (input) => mapFile(failOnError(await supabase
      .from("files")
      .insert({
        owner_id: input.owner,
        filename: input.filename,
        stored_name: input.storedName,
        hash: input.hash,
        file_size: input.fileSize,
        mime_type: input.mimeType,
      })
      .select("*")
      .single())),
    findByOwner: async (owner) => failOnError(await supabase
      .from("files")
      .select("*")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .limit(200)).map(mapFile),
    findById: async (id) => mapFile(await singleOrNull(supabase.from("files").select("*").eq("id", id))),
  },
  shares: {
    findByFileAndRecipient: async (fileId, sharedWith) => mapShare(await singleOrNull(
      supabase.from("shares").select("*").eq("file_id", fileId).eq("shared_with_id", sharedWith),
    )),
    create: async (input) => mapShare(failOnError(await supabase
      .from("shares")
      .insert({
        file_id: input.fileId,
        owner_id: input.owner,
        shared_with_id: input.sharedWith,
      })
      .select("*")
      .single())),
    findReceivedByUser: async (sharedWith) => {
      const shares = failOnError(await supabase
        .from("shares")
        .select("*")
        .eq("shared_with_id", sharedWith)
        .order("created_at", { ascending: false })
        .limit(200));

      if (!shares.length) return [];

      const [files, owners] = await Promise.all([
        supabase.from("files").select("id,filename,file_size,mime_type").in("id", shares.map((share) => share.file_id)),
        supabase.from("users").select("id,username").in("id", shares.map((share) => share.owner_id)),
      ]);

      const filesById = new Map(failOnError(files).map((file) => [file.id, file]));
      const ownersById = new Map(failOnError(owners).map((owner) => [owner.id, owner]));

      return shares.map((share) => mapShare(share, filesById.get(share.file_id), ownersById.get(share.owner_id)));
    },
  },
  blocks: {
    findLast: async () => mapBlock(await singleOrNull(
      supabase.from("blocks").select("*").order("block_index", { ascending: false }).limit(1),
    )),
    create: async (input) => mapBlock(failOnError(await supabase
      .from("blocks")
      .insert({
        block_index: input.index,
        file_id: input.fileId,
        file_hash: input.fileHash,
        previous_hash: input.previousHash,
        timestamp: input.timestamp,
      })
      .select("*")
      .single())),
    findByFileId: async (fileId) => mapBlock(await singleOrNull(
      supabase.from("blocks").select("*").eq("file_id", fileId),
    )),
    findRecent: async (limit = 200) => failOnError(await supabase
      .from("blocks")
      .select("*")
      .order("block_index", { ascending: false })
      .limit(limit)).map(mapBlock),
  },
  loginAuditLogs: {
    create: async (input) => failOnError(await supabase.from("login_audit_logs").insert({
      user_id: input.userId,
      identifier: input.identifier,
      event_type: input.eventType,
      reason: input.reason,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    })),
  },
  activityAuditLogs: {
    create: async (input) => failOnError(await supabase.from("activity_audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    })),
  },
};
