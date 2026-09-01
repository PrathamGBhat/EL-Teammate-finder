const express = require("express");
const cookieParser = require("cookie-parser");
const { PUBLIC_DIR } = require("./config/constants");
const { connectDB } = require("./db/connect");
const { seed } = require("./db/seed");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const connectionsRoutes = require("./routes/connections");
const teamsRoutes = require("./routes/teams");
const advertisementsRoutes = require("./routes/advertisements");
const searchRoutes = require("./routes/search");
const adminRoutes = require("./routes/admin");
const configRoutes = require("./routes/config");

const app = express();

// Database connection middleware (essential for Vercel serverless environments & local dev)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    // Non-blocking seed execution check if database has no data yet
    seed().catch((err) => console.error("Seed check error:", err));
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    return res.status(500).json({ error: "Database connection failed" });
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder serving for the frontend
app.use(express.static(PUBLIC_DIR));

// API Routers
app.use("/api", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/advertisements", advertisementsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/config", configRoutes);

// Fallback for unmatched API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "Unknown API route" });
});

module.exports = app;
