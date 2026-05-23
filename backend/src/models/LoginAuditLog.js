const mongoose = require("mongoose");

const loginAuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  identifier: { type: String, required: true },
  eventType: { type: String, required: true, enum: ["success", "failure", "locked"] },
  reason: String,
  ipAddress: String,
  userAgent: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

loginAuditLogSchema.index({ createdAt: -1 });
loginAuditLogSchema.index({ identifier: 1, createdAt: -1 });
loginAuditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LoginAuditLog", loginAuditLogSchema);
