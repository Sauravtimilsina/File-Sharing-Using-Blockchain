const Block = require("../models/Block");
const File = require("../models/File");
const OTP = require("../models/OTP");
const Share = require("../models/Share");
const User = require("../models/User");

const asId = (value) => value?.toString?.() || value;

const mapUser = (user) => user && ({
  _id: asId(user._id),
  username: user.username,
  email: user.email,
  password: user.password,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const mapFile = (file) => file && ({
  _id: asId(file._id),
  owner: asId(file.owner),
  filename: file.filename,
  storedName: file.storedName,
  hash: file.hash,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
});

const mapShare = (share) => share && ({
  _id: asId(share._id),
  fileId: share.fileId?.filename
    ? {
      _id: asId(share.fileId._id),
      filename: share.fileId.filename,
      hash: share.fileId.hash,
    }
    : asId(share.fileId),
  owner: share.owner?.username
    ? {
      _id: asId(share.owner._id),
      username: share.owner.username,
    }
    : asId(share.owner),
  sharedWith: asId(share.sharedWith),
  createdAt: share.createdAt,
  updatedAt: share.updatedAt,
});

const mapBlock = (block) => block && ({
  _id: asId(block._id),
  index: block.index,
  fileId: asId(block.fileId),
  fileHash: block.fileHash,
  previousHash: block.previousHash,
  timestamp: block.timestamp,
});

module.exports = {
  users: {
    findExisting: async ({ email, username }) => mapUser(await User.findOne({ $or: [{ email }, { username }] })),
    findByEmail: async (email) => mapUser(await User.findOne({ email })),
    findById: async (id) => mapUser(await User.findById(id)),
    create: async (input) => mapUser(await User.create(input)),
    updateUnverifiedCredentials: async (id, input) => {
      const user = await User.findById(id);
      if (!user) return null;
      user.username = input.username;
      user.password = input.password;
      await user.save();
      return mapUser(user);
    },
    markVerified: async (id) => {
      const user = await User.findById(id);
      if (!user) return null;
      user.isVerified = true;
      await user.save();
      return mapUser(user);
    },
  },
  otps: {
    deleteByEmail: (email) => OTP.deleteMany({ email }),
    create: (input) => OTP.create(input),
    findByEmailAndCode: (email, otp) => OTP.findOne({ email, otp }),
  },
  files: {
    create: async (input) => mapFile(await File.create(input)),
    findByOwner: async (owner) => (await File.find({ owner }).sort({ createdAt: -1 })).map(mapFile),
    findById: async (id) => mapFile(await File.findById(id)),
  },
  shares: {
    findByFileAndRecipient: async (fileId, sharedWith) => mapShare(await Share.findOne({ fileId, sharedWith })),
    create: async (input) => mapShare(await Share.create(input)),
    findReceivedByUser: async (sharedWith) => (
      await Share.find({ sharedWith })
        .populate("fileId", "filename hash")
        .populate("owner", "username")
        .sort({ createdAt: -1 })
    ).map(mapShare),
  },
  blocks: {
    findLast: async () => mapBlock(await Block.findOne().sort({ index: -1 })),
    create: async (input) => mapBlock(await Block.create(input)),
    findByFileId: async (fileId) => mapBlock(await Block.findOne({ fileId })),
  },
};
