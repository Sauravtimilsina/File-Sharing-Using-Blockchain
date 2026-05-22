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
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const mapFile = (file) => file && ({
  _id: file.id,
  owner: file.owner_id,
  filename: file.filename,
  storedName: file.stored_name,
  hash: file.hash,
  createdAt: file.created_at,
  updatedAt: file.updated_at,
});

const mapShare = (share, file, owner) => share && ({
  _id: share.id,
  fileId: file
    ? {
      _id: file.id,
      filename: file.filename,
      hash: file.hash,
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
  },
  otps: {
    deleteByEmail: async (email) => failOnError(await supabase.from("otps").delete().eq("email", email)),
    create: async (input) => failOnError(await supabase.from("otps").insert({
      email: input.email,
      otp: input.otp,
      expires_at: input.expiresAt,
    })),
    findByEmailAndCode: async (email, otp) => {
      const record = await singleOrNull(supabase.from("otps").select("*").eq("email", email).eq("otp", otp));
      return record && {
        email: record.email,
        otp: record.otp,
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
      })
      .select("*")
      .single())),
    findByOwner: async (owner) => failOnError(await supabase
      .from("files")
      .select("*")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })).map(mapFile),
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
        .order("created_at", { ascending: false }));

      if (!shares.length) return [];

      const [files, owners] = await Promise.all([
        supabase.from("files").select("id,filename,hash").in("id", shares.map((share) => share.file_id)),
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
  },
};
