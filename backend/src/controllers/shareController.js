const Share = require("../models/Share");
const File = require("../models/File");
const User = require("../models/User");
const { sendShareNotification } = require("../utils/email");



const shareFile = async (req, res) => {
  try {
    const { fileId, sharedWithEmail } = req.body;

    if (!fileId || !sharedWithEmail) {
      return res.status(400).json({ message: "Please provide fileId and sharedWithEmail" });
    }

    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only share your own files" });
    }

    
    const recipient = await User.findOne({ email: sharedWithEmail });
    if (!recipient) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    
    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot share a file with yourself" });
    }

    
    const existingShare = await Share.findOne({
      fileId,
      sharedWith: recipient._id,
    });
    if (existingShare) {
      return res.status(400).json({ message: "File already shared with this user" });
    }

    
    const share = await Share.create({
      fileId,
      owner: req.user.id,
      sharedWith: recipient._id,
    });

    
    const owner = await User.findById(req.user.id);
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
