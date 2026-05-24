const repositories = require("../repositories");
const { sendShareNotification } = require("../utils/email");
const { recordActivityAudit } = require("../utils/audit");
const { cleanEmail, isEmail, isRecordId } = require("../utils/validation");

const EXPIRY_MS = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const getExpiryDate = (value) => (
  EXPIRY_MS[value] ? new Date(Date.now() + EXPIRY_MS[value]) : null
);

const isShareActive = (share) => (
  share
    && !share.revokedAt
    && (!share.expiresAt || new Date(share.expiresAt) > new Date())
);

const shareFile = async (req, res) => {
  try {
    const fileId = typeof req.body.fileId === "string" ? req.body.fileId : "";
    const sharedWithEmail = cleanEmail(req.body.sharedWithEmail);
    const expiresAt = getExpiryDate(req.body.expiresIn);

    if (!isRecordId(fileId) || !isEmail(sharedWithEmail)) {
      return res.status(400).json({ message: "Please provide fileId and sharedWithEmail" });
    }

    
    const file = await repositories.files.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only share your own files" });
    }

    
    const recipient = await repositories.users.findByEmail(sharedWithEmail);
    if (!recipient) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    
    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot share a file with yourself" });
    }

    
    const existingShare = await repositories.shares.findAnyByFileAndRecipient(fileId, recipient._id);
    if (isShareActive(existingShare)) {
      return res.status(400).json({ message: "File already shared with this user" });
    }

    const share = existingShare
      ? await repositories.shares.reactivate(existingShare._id, req.user.id, expiresAt)
      : await repositories.shares.create({
        fileId,
        owner: req.user.id,
        sharedWith: recipient._id,
        expiresAt,
      });
    await recordActivityAudit(req, {
      action: "file_share",
      targetType: "share",
      targetId: share._id,
    });

    
    const owner = await repositories.users.findById(req.user.id);
    sendShareNotification(recipient.email, owner.username, file.filename).catch((err) => {
      console.error("Share notification email error:", err.message);
    });

    res.status(201).json({
      message: "File shared successfully",
      share: {
        id: share._id,
        fileId: share.fileId,
        sharedWith: recipient.email,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    console.error("Share error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyShares = async (req, res) => {
  try {
    const shares = await repositories.shares.findSentByOwner(req.user.id);
    return res.status(200).json({ shares });
  } catch (error) {
    console.error("GetMyShares error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const revokeShare = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) return res.status(404).json({ message: "Share not found" });

    const share = await repositories.shares.revoke(req.params.id, req.user.id);
    if (!share) return res.status(404).json({ message: "Share not found" });

    await recordActivityAudit(req, {
      action: "share_revoke",
      targetType: "share",
      targetId: share._id,
    });

    return res.status(200).json({ message: "Share access revoked." });
  } catch (error) {
    console.error("Revoke share error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getMyShares, revokeShare, shareFile };
