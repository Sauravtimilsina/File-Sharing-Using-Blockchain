const pool = require("./postgresPool");

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

const mapShare = (share) => share && ({
  _id: share.id,
  fileId: share.file_id_filename
    ? {
      _id: share.file_id,
      filename: share.file_id_filename,
      hash: share.file_id_hash,
    }
    : share.file_id,
  owner: share.owner_username
    ? {
      _id: share.owner_id,
      username: share.owner_username,
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
  },
  otps: {
    deleteByEmail: (email) => pool.query("delete from public.otps where email = $1", [email]),
    create: (input) => pool.query(
      "insert into public.otps (email, otp, expires_at) values ($1, $2, $3)",
      [input.email, input.otp, input.expiresAt],
    ),
    findByEmailAndCode: async (email, otp) => {
      const record = await one(
        "select email, otp, expires_at from public.otps where email = $1 and otp = $2 order by created_at desc limit 1",
        [email, otp],
      );

      return record && {
        email: record.email,
        otp: record.otp,
        expiresAt: record.expires_at,
      };
    },
  },
  files: {
    create: async (input) => mapFile(await one(
      `insert into public.files (owner_id, filename, stored_name, hash)
       values ($1, $2, $3, $4)
       returning *`,
      [input.owner, input.filename, input.storedName, input.hash],
    )),
    findByOwner: async (owner) => (await many(
      "select * from public.files where owner_id = $1 order by created_at desc",
      [owner],
    )).map(mapFile),
    findById: async (id) => mapFile(await one(
      "select * from public.files where id = $1 limit 1",
      [id],
    )),
  },
  shares: {
    findByFileAndRecipient: async (fileId, sharedWith) => mapShare(await one(
      "select * from public.shares where file_id = $1 and shared_with_id = $2 limit 1",
      [fileId, sharedWith],
    )),
    create: async (input) => mapShare(await one(
      `insert into public.shares (file_id, owner_id, shared_with_id)
       values ($1, $2, $3)
       returning *`,
      [input.fileId, input.owner, input.sharedWith],
    )),
    findReceivedByUser: async (sharedWith) => (await many(
      `select
         shares.*,
         files.filename as file_id_filename,
         files.hash as file_id_hash,
         users.username as owner_username
       from public.shares
       join public.files on files.id = shares.file_id
       join public.users on users.id = shares.owner_id
       where shares.shared_with_id = $1
       order by shares.created_at desc`,
      [sharedWith],
    )).map(mapShare),
  },
  blocks: {
    findLast: async () => mapBlock(await one(
      "select * from public.blocks order by block_index desc limit 1",
    )),
    create: async (input) => mapBlock(await one(
      `insert into public.blocks (block_index, file_id, file_hash, previous_hash, timestamp)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.index, input.fileId, input.fileHash, input.previousHash, input.timestamp],
    )),
    findByFileId: async (fileId) => mapBlock(await one(
      "select * from public.blocks where file_id = $1 limit 1",
      [fileId],
    )),
  },
};
