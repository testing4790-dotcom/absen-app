import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db/index.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit for base64 photo
app.use(express.json({ limit: "10mb" }));

// health
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ ok: true, message: "API is healthy", db: r.rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, message: "DB not connected" });
  }
});

// helper token
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Bootstrap admin pertama
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
 * Admin: Get all users
 */
app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
  );
  res.json({ ok: true, users: r.rows });
});

/**
 * Admin: Create user
 */
app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, message: "name, email, password required" });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role",
      [name, email.toLowerCase(), password_hash, role === "admin" ? "admin" : "user"]
    );
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(400).json({ ok: false, message: "Email sudah terdaftar" });
    }
    throw e;
  }
});

/**
 * Admin: Delete user
 */
app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ ok: false, message: "Tidak bisa hapus diri sendiri" });
  }
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ ok: true, message: "User deleted" });
});

/**
 * Login
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
 */
app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

/**
 * Check-in (with GPS + Photo)
 */
app.post("/api/attendance/check-in", requireAuth, async (req, res) => {
  const { note, latitude, longitude, photo } = req.body || {};

  const open = await pool.query(
    `SELECT id FROM attendance WHERE user_id=$1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );
  if (open.rows[0]) {
    return res.status(400).json({ ok: false, message: "Anda sudah check-in, silakan check-out dulu." });
  }

  const r = await pool.query(
    `INSERT INTO attendance(user_id, note, latitude, longitude, photo) 
     VALUES($1, $2, $3, $4, $5)
     RETURNING id, user_id, check_in, check_out, note, latitude, longitude`,
    [req.user.id, note || null, latitude || null, longitude || null, photo || null]
  );

  res.json({ ok: true, attendance: r.rows[0] });
});

/**
 * Check-out
 */
app.post("/api/attendance/check-out", requireAuth, async (req, res) => {
  const open = await pool.query(
    `SELECT id FROM attendance WHERE user_id=$1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );
  if (!open.rows[0]) {
    return res.status(400).json({ ok: false, message: "Tidak ada check-in aktif." });
  }

  const r = await pool.query(
    `UPDATE attendance SET check_out = NOW() WHERE id=$1
     RETURNING id, user_id, check_in, check_out, note, latitude, longitude`,
    [open.rows[0].id]
  );

  res.json({ ok: true, attendance: r.rows[0] });
});

/**
 * My history
 */
app.get("/api/attendance/history", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const r = await pool.query(
    `SELECT id, user_id, check_in, check_out, note, latitude, longitude, photo
     FROM attendance WHERE user_id=$1 ORDER BY check_in DESC LIMIT $2`,
    [req.user.id, limit]
  );

  res.json({ ok: true, items: r.rows });
});

/**
 * Admin: Get all attendance
 */
app.get("/api/attendance/all", requireAuth, requireRole("admin"), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);

  const r = await pool.query(
    `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email,
            a.check_in, a.check_out, a.note, a.latitude, a.longitude, a.photo
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.check_in DESC LIMIT $1`,
    [limit]
  );

  res.json({ ok: true, items: r.rows });
});

/**
 * Admin: Export CSV
 */
app.get("/api/attendance/export", requireAuth, requireRole("admin"), async (req, res) => {
  const { start, end } = req.query;

  let query = `
    SELECT a.id, u.name AS user_name, u.email AS user_email,
           a.check_in, a.check_out, a.note, a.latitude, a.longitude
    FROM attendance a
    JOIN users u ON u.id = a.user_id
  `;
  const params = [];

  if (start && end) {
    query += ` WHERE a.check_in >= $1 AND a.check_in <= $2`;
    params.push(start, end);
  } else if (start) {
    query += ` WHERE a.check_in >= $1`;
    params.push(start);
  } else if (end) {
    query += ` WHERE a.check_in <= $1`;
    params.push(end);
  }

  query += ` ORDER BY a.check_in DESC`;

  const r = await pool.query(query, params);

  // Build CSV
  const header = "ID,Nama,Email,Check-In,Check-Out,Note,Latitude,Longitude\n";
  const rows = r.rows.map((row) => {
    return [
      row.id,
      `"${row.user_name || ""}"`,
      `"${row.user_email || ""}"`,
      `"${row.check_in || ""}"`,
      `"${row.check_out || ""}"`,
      `"${(row.note || "").replace(/"/g, '""')}"`,
      row.latitude || "",
      row.longitude || ""
    ].join(",");
  }).join("\n");

  const csv = header + rows;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=laporan-absen.csv");
  res.send(csv);
});

/**
 * Get single attendance photo
 */
app.get("/api/attendance/:id/photo", requireAuth, async (req, res) => {
  const { id } = req.params;

  let query = `SELECT photo, user_id FROM attendance WHERE id = $1`;
  const r = await pool.query(query, [id]);

  if (!r.rows[0]) {
    return res.status(404).json({ ok: false, message: "Not found" });
  }

  // Admin bisa lihat semua, user hanya miliknya
  if (req.user.role !== "admin" && r.rows[0].user_id !== req.user.id) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  if (!r.rows[0].photo) {
    return res.status(404).json({ ok: false, message: "No photo" });
  }

  res.json({ ok: true, photo: r.rows[0].photo });
});

// ===== Serve frontend build =====
const __dirname = path.resolve();
const distPath = path.join(__dirname, "client", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
