require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./utils/db");
const runtimeConfig = require("./config/runtime");

const isLocalBrowserOrigin = (origin) => process.env.NODE_ENV !== "production"
  && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const allowOrigin = (origin, callback) => {
  if (!origin || runtimeConfig.corsOrigins.includes(origin) || isLocalBrowserOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Origin is not allowed by CORS."));
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
app.use(helmet());
app.use(express.json());


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
  return res.status(500).json({ message: "Unexpected server error" });
});

module.exports = app;
