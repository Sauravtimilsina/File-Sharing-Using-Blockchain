const jwt = require("jsonwebtoken");
const repositories = require("../repositories");
const runtimeConfig = require("../config/runtime");

const lockedMessage = "Your account is locked due to multiple failed login attempts. Please contact admin.";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, runtimeConfig.requireRuntimeSecret("JWT_SECRET", process.env.JWT_SECRET), {
      algorithms: ["HS256"],
      audience: "secure-transfer-web",
      issuer: "secure-transfer-api",
    });

    if (typeof decoded.id !== "string" || !decoded.id) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    const user = await repositories.users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ message: lockedMessage });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before continuing." });
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = auth;
