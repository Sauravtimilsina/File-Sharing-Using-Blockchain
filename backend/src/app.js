require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./utils/db");
const runtimeConfig = require("./config/runtime");

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const shareRoutes = require("./routes/shareRoutes");

const app = express();

const isLocalBrowserOrigin = (origin) =>
  process.env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const allowOrigin = (origin, callback) => {
  if (!origin || runtimeConfig.corsOrigins.includes(origin) || isLocalBrowserOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Origin is not allowed by CORS."));
};

app.set("trust proxy", 1);

app.use(
  cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    origin: allowOrigin,
  })
);

app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Secure File Transfer backend is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await connectDB();

    res.json({
      status: "ok",
      message: "Backend is healthy",
      database: runtimeConfig.database.provider,
    });
  } catch (error) {
    console.error("Health check error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Backend is running but database configuration failed",
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/share", shareRoutes);

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);

  if (res.headersSent) return next(error);

  return res.status(500).json({
    message: "Unexpected server error",
  });
});

module.exports = app;