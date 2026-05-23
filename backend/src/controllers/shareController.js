const repositories = require("../repositories");
const { sendShareNotification } = require("../utils/email");
const { recordActivityAudit } = require("../utils/audit");
const { cleanEmail, isEmail, isRecordId } = require("../utils/validation");



const shareFile = async (req, res) => {
  try {
    const fileId = typeof req.body.fileId === "string" ? req.body.fileId : "";
    const sharedWithEmail = cleanEmail(req.body.sharedWithEmail);

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

    
    const existingShare = await repositories.shares.findByFileAndRecipient(fileId, recipient._id);
    if (existingShare) {
      return res.status(400).json({ message: "File already shared with this user" });
    }

    
    const share = await repositories.shares.create({
      fileId,
      owner: req.user.id,
      sharedWith: recipient._id,
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
      },
    });
  } catch (error) {
    console.error("Share error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { shareFile };
