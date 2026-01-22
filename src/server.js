import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db/index.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// health
app.get("/api/health", async (req, res) => {
  // cek koneksi db juga
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ ok: true, message: "API is healthy", db: r.rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, message: "DB not connected" });
  }
});

// helper buat token
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Bootstrap admin pertama (sekali saja)
 * Endpoint ini akan:
 * - jika belum ada user sama sekali, bikin admin dari body
 * - jika sudah ada user, endpoint ditolak
 *
 * POST /api/bootstrap-admin
 * body: { name, email, password }
 */
app.post("/api/bootstrap-admin", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, message: "name, email, password required" });
  }

  const count = await pool.query("SELECT COUNT(*)::int AS c FROM users");
  if (count.rows[0].c > 0) {
    return res.status(403).json({ ok: false, message: "Admin already bootstrapped" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const ins = await pool.query(
    "INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,'admin') RETURNING id,name,email,role",
    [name, email.toLowerCase(), password_hash]
  );

  const user = ins.rows[0];
  const token = signToken(user);
  res.json({ ok: true, user, token });
});

/**
 * Admin create user
 * POST /api/users
 * header: Authorization: Bearer <token-admin>
 * body: { name, email, password, role? }
 */
app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, message: "name, email, password required" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const r = await pool.query(
    "INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role",
    [name, email.toLowerCase(), password_hash, role === "admin" ? "admin" : "user"]
  );

  res.json({ ok: true, user: r.rows[0] });
});

/**
 * Login
 * POST /api/auth/login
 * body: { email, password }
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "email & password required" });
  }

  const r = await pool.query(
    "SELECT id,name,email,role,password_hash FROM users WHERE email=$1",
    [email.toLowerCase()]
  );
  const user = r.rows[0];
  if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const token = signToken(user);
  res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/**
 * Me
 * GET /api/auth/me
 */
app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

/**
 * Check-in
 * POST /api/attendance/check-in
 * body: { note? }
 */
app.post("/api/attendance/check-in", requireAuth, async (req, res) => {
  const { note } = req.body || {};

  // pastikan belum ada sesi absen yang belum check-out
  const open = await pool.query(
    `SELECT id FROM attendance
     WHERE user_id=$1 AND check_out IS NULL
     ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );
  if (open.rows[0]) {
    return res.status(400).json({ ok: false, message: "You already checked-in and not checked-out yet." });
  }

  const r = await pool.query(
    `INSERT INTO attendance(user_id, note) VALUES($1,$2)
     RETURNING id,user_id,check_in,check_out,note`,
    [req.user.id, note || null]
  );

  res.json({ ok: true, attendance: r.rows[0] });
});

/**
 * Check-out
 * POST /api/attendance/check-out
 */
app.post("/api/attendance/check-out", requireAuth, async (req, res) => {
  const open = await pool.query(
    `SELECT id FROM attendance
     WHERE user_id=$1 AND check_out IS NULL
     ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );
  if (!open.rows[0]) {
    return res.status(400).json({ ok: false, message: "No active check-in found." });
  }

  const r = await pool.query(
    `UPDATE attendance
     SET check_out = NOW()
     WHERE id=$1
     RETURNING id,user_id,check_in,check_out,note`,
    [open.rows[0].id]
  );

  res.json({ ok: true, attendance: r.rows[0] });
});

/**
 * My history
 * GET /api/attendance/history?limit=50
 */
app.get("/api/attendance/history", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const r = await pool.query(
    `SELECT id, user_id, check_in, check_out, note
     FROM attendance
     WHERE user_id=$1
     ORDER BY check_in DESC
     LIMIT $2`,
    [req.user.id, limit]
  );

  res.json({ ok: true, items: r.rows });
});

// ===== Serve frontend build =====
const __dirname = path.resolve();
const distPath = path.join(__dirname, "client", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
