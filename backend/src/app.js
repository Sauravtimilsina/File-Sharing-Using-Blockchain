require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./utils/db");
const runtimeConfig = require("./config/runtime");

const isLocalBrowserOrigin = (origin) => process.env.NODE_ENV !== "production"
  && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const isAllowedVercelOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:"
      && (
        hostname === "file-sharing-using-blockchain.vercel.app"
        || hostname.endsWith("-sauravtimilsinas-projects.vercel.app")
      );
  } catch {
    return false;
  }
};

const allowOrigin = (origin, callback) => {
  if (
    !origin
    || runtimeConfig.corsOrigins.includes(origin)
    || isLocalBrowserOrigin(origin)
    || isAllowedVercelOrigin(origin)
  ) {
    callback(null, true);
    return;
  }

  const error = new Error("Origin is not allowed by CORS.");
  error.statusCode = 403;
  callback(error);
};

connectDB();

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  origin: allowOrigin,
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  hsts: process.env.NODE_ENV === "production",
}));
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  next();
});
app.use(express.json({ limit: "32kb" }));


const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const shareRoutes = require("./routes/shareRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/share", shareRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  if (res.headersSent) return next(error);
  if (error.statusCode === 403 && error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ message: "Origin is not allowed by CORS." });
  }
  return res.status(500).json({ message: "Unexpected server error" });
});

module.exports = app;
