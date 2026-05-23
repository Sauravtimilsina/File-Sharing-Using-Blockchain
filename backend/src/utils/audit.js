const repositories = require("../repositories");

const MAX_VALUE_LENGTH = 255;
const safeValue = (value) => typeof value === "string" ? value.slice(0, MAX_VALUE_LENGTH) : null;

const requestMeta = (req) => ({
  ipAddress: safeValue(req.ip),
  userAgent: safeValue(req.get("user-agent")),
});

const recordLoginAudit = async (req, input) => {
  try {
    await repositories.loginAuditLogs.create({
      userId: input.userId || null,
      identifier: safeValue(input.identifier),
      eventType: input.eventType,
      reason: safeValue(input.reason),
      ...requestMeta(req),
    });
  } catch (error) {
    console.error("Login audit write failed:", error.message);
  }
};

const recordActivityAudit = async (req, input) => {
  try {
    await repositories.activityAuditLogs.create({
      actorId: input.actorId || req.user?.id || null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId || null,
      ...requestMeta(req),
    });
  } catch (error) {
    console.error("Activity audit write failed:", error.message);
  }
};

module.exports = { recordActivityAudit, recordLoginAudit };
