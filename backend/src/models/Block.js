const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  index: Number,
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
  },
  fileHash: String,
  previousHash: String,
  timestamp: Date,
});

module.exports = mongoose.model("Block", blockSchema);
