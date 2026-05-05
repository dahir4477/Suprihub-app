const express = require("express");
const { pool, initializeDatabase } = require("./db");

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/submit", async (req, res) => {
  const { name, email, message } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return res.status(400).json({ error: "name, email, and message are required" });
  }

  const safeName = name.trim();
  const safeEmail = email.trim().toLowerCase();
  const safeMessage = message.trim();

  if (!safeName || !safeEmail || !safeMessage) {
    return res.status(400).json({ error: "name, email, and message cannot be empty" });
  }

  if (!isValidEmail(safeEmail)) {
    return res.status(400).json({ error: "email is invalid" });
  }

  try {
    await pool.query(
      "INSERT INTO submissions (name, email, message) VALUES ($1, $2, $3)",
      [safeName, safeEmail, safeMessage]
    );
    return res.status(201).json({ message: "Dispatch request submitted successfully." });
  } catch (error) {
    console.error("Insert failed:", error);
    return res.status(500).json({ error: "Unable to save submission" });
  }
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, isValidEmail, start };
