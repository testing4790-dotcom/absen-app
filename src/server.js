import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db/index.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

// base64 foto cukup besar
app.use(express.json({ limit: "15mb" }));

const OFFICE_RADIUS_M = 25;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toJakartaDateString(date = new Date()) {
  // hasil: YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function isFiniteNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// health
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ ok: true, message: "API is healthy", db: r.rows?.[0]?.ok === 1 });
  } catch {
    res.status(500).json({ ok: false, message: "DB not connected" });
  }
});

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
  if (!user) return res.status(401).json({ ok: false, message: "Email/password salah" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, message: "Email/password salah" });

  const token = signToken(user);
  res.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ===== USERS (ADMIN) =====
app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
  );
  res.json({ ok: true, users: r.rows });
});

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

app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ ok: false, message: "Tidak bisa hapus diri sendiri" });
  }
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ ok: true, message: "User deleted" });
});

// ===== LEAVE / CUTI / IZIN =====
const LEAVE_TYPES = new Set(["cuti", "izin", "sakit", "dinas", "wfh"]);

app.post("/api/leave/request", requireAuth, async (req, res) => {
  const { type, start_date, end_date, reason } = req.body || {};
  if (!type || !start_date || !end_date || !reason) {
    return res.status(400).json({ ok: false, message: "type, start_date, end_date, reason wajib diisi" });
  }
  if (!LEAVE_TYPES.has(type)) {
    return res.status(400).json({ ok: false, message: "type tidak valid" });
  }

  // validasi sederhana format YYYY-MM-DD
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(start_date) || !re.test(end_date)) {
    return res.status(400).json({ ok: false, message: "Format tanggal harus YYYY-MM-DD" });
  }

  // start <= end
  if (start_date > end_date) {
    return res.status(400).json({ ok: false, message: "start_date tidak boleh lebih besar dari end_date" });
  }

  const r = await pool.query(
    `INSERT INTO leave_requests(user_id, type, start_date, end_date, reason, status)
     VALUES($1,$2,$3,$4,$5,'pending')
     RETURNING id, user_id, type, start_date, end_date, reason, status, created_at`,
    [req.user.id, type, start_date, end_date, reason]
  );

  res.json({ ok: true, item: r.rows[0], message: "Pengajuan terkirim (menunggu persetujuan admin)" });
});

app.get("/api/leave/my", requireAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT id, type, start_date, end_date, reason, status, admin_note, decided_at, created_at
     FROM leave_requests
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ ok: true, items: r.rows });
});

app.patch("/api/leave/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;

  const r = await pool.query(
    `UPDATE leave_requests
     SET status='cancelled'
     WHERE id=$1 AND user_id=$2 AND status='pending'
     RETURNING id, status`,
    [id, req.user.id]
  );

  if (!r.rows[0]) {
    return res.status(400).json({ ok: false, message: "Hanya bisa membatalkan pengajuan yang masih pending" });
  }

  res.json({ ok: true, item: r.rows[0] });
});

// admin list
app.get("/api/leave/all", requireAuth, requireRole("admin"), async (req, res) => {
  const status = req.query.status || "pending";

  const r = await pool.query(
    `SELECT lr.id, lr.user_id, u.name AS user_name, u.email AS user_email,
            lr.type, lr.start_date, lr.end_date, lr.reason, lr.status,
            lr.admin_note, lr.created_at
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     WHERE lr.status=$1
     ORDER BY lr.created_at DESC
     LIMIT 200`,
    [status]
  );

  res.json({ ok: true, items: r.rows });
});

app.patch("/api/leave/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body || {};

  const r = await pool.query(
    `UPDATE leave_requests
     SET status='approved', admin_note=$2, decided_by=$3, decided_at=NOW()
     WHERE id=$1 AND status='pending'
     RETURNING id, status`,
    [id, admin_note || null, req.user.id]
  );

  if (!r.rows[0]) {
    return res.status(400).json({ ok: false, message: "Data tidak ditemukan / sudah diproses" });
  }

  res.json({ ok: true, item: r.rows[0] });
});

app.patch("/api/leave/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body || {};

  const r = await pool.query(
    `UPDATE leave_requests
     SET status='rejected', admin_note=$2, decided_by=$3, decided_at=NOW()
     WHERE id=$1 AND status='pending'
     RETURNING id, status`,
    [id, admin_note || null, req.user.id]
  );

  if (!r.rows[0]) {
    return res.status(400).json({ ok: false, message: "Data tidak ditemukan / sudah diproses" });
  }

  res.json({ ok: true, item: r.rows[0] });
});

// ===== ATTENDANCE (lebih profesional) =====
app.get("/api/attendance/status", requireAuth, async (req, res) => {
  const today = toJakartaDateString();

  const open = await pool.query(
    `SELECT id, check_in, latitude, longitude
     FROM attendance
     WHERE user_id=$1 AND check_out IS NULL
     ORDER BY check_in DESC
     LIMIT 1`,
    [req.user.id]
  );

  const leaveToday = await pool.query(
    `SELECT id, type, start_date, end_date, status
     FROM leave_requests
     WHERE user_id=$1 AND status='approved' AND $2::date BETWEEN start_date AND end_date
     LIMIT 1`,
    [req.user.id, today]
  );

  const hasOpen = !!open.rows[0];
  const hasLeave = !!leaveToday.rows[0];

  res.json({
    ok: true,
    today,
    open: open.rows[0] || null,
    leave_today: leaveToday.rows[0] || null,
    can_check_in: !hasOpen && !hasLeave,
    can_check_out: hasOpen
  });
});

/**
 * Check-in (wajib GPS + foto) + blok jika sedang approved leave hari ini
 */
app.post("/api/attendance/check-in", requireAuth, async (req, res) => {
  const { note, latitude, longitude, photo } = req.body || {};

  const lat = isFiniteNumber(latitude);
  const lon = isFiniteNumber(longitude);

  if (lat === null || lon === null) {
    return res.status(400).json({ ok: false, message: "Lokasi GPS wajib untuk check-in" });
  }
  if (!photo) {
    return res.status(400).json({ ok: false, message: "Foto selfie wajib untuk check-in" });
  }

  const today = toJakartaDateString();

  // cek leave approved hari ini
  const leaveToday = await pool.query(
    `SELECT id, type, start_date, end_date
     FROM leave_requests
     WHERE user_id=$1 AND status='approved' AND $2::date BETWEEN start_date AND end_date
     LIMIT 1`,
    [req.user.id, today]
  );
  if (leaveToday.rows[0]) {
    return res.status(400).json({
      ok: false,
      message: `Anda sedang ${leaveToday.rows[0].type} (approved). Tidak bisa check-in.`
    });
  }

  // cek open session
  const open = await pool.query(
    `SELECT id FROM attendance
     WHERE user_id=$1 AND check_out IS NULL
     ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );
  if (open.rows[0]) {
    return res.status(400).json({ ok: false, message: "Anda sudah check-in, silakan check-out dulu." });
  }

  try {
    const r = await pool.query(
      `INSERT INTO attendance(user_id, note, latitude, longitude, photo)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id,user_id,check_in,check_out,note,latitude,longitude`,
      [req.user.id, note || "via web", lat, lon, photo]
    );

    res.json({ ok: true, message: "Check-in berhasil", attendance: r.rows[0] });
  } catch (e) {
    // kalau unique index open session kena (race)
    if (e.code === "23505") {
      return res.status(400).json({ ok: false, message: "Anda sudah punya sesi check-in aktif." });
    }
    throw e;
  }
});

/**
 * Check-out (wajib GPS) + harus dalam radius 25m dari lokasi check-in
 */
app.post("/api/attendance/check-out", requireAuth, async (req, res) => {
  const { latitude, longitude, photo } = req.body || {};
  const lat = isFiniteNumber(latitude);
  const lon = isFiniteNumber(longitude);

  if (lat === null || lon === null) {
    return res.status(400).json({ ok: false, message: "Lokasi GPS wajib untuk check-out" });
  }

  const open = await pool.query(
    `SELECT id, latitude, longitude, check_in
     FROM attendance
     WHERE user_id=$1 AND check_out IS NULL
     ORDER BY check_in DESC LIMIT 1`,
    [req.user.id]
  );

  if (!open.rows[0]) {
    return res.status(400).json({ ok: false, message: "Tidak ada check-in aktif." });
  }

  const inLat = open.rows[0].latitude;
  const inLon = open.rows[0].longitude;

  let dist = null;
  if (inLat !== null && inLon !== null) {
    dist = distanceMeters(inLat, inLon, lat, lon);
    if (dist > OFFICE_RADIUS_M) {
      return res.status(400).json({
        ok: false,
        message: `Check-out harus di sekitar lokasi check-in (<=${OFFICE_RADIUS_M}m). Jarak Anda ~${Math.round(dist)}m.`,
        distance_m: dist
      });
    }
  }

  const r = await pool.query(
    `UPDATE attendance
     SET check_out = NOW(),
         check_out_latitude = $2,
         check_out_longitude = $3,
         check_out_photo = $4
     WHERE id=$1
     RETURNING id,user_id,check_in,check_out,note,latitude,longitude,check_out_latitude,check_out_longitude`,
    [open.rows[0].id, lat, lon, photo || null]
  );

  res.json({
    ok: true,
    message: "Check-out berhasil",
    distance_m: dist,
    attendance: r.rows[0]
  });
});

app.get("/api/attendance/history", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const r = await pool.query(
    `SELECT id, user_id, check_in, check_out, note,
            latitude, longitude, check_out_latitude, check_out_longitude,
            photo
     FROM attendance
     WHERE user_id=$1
     ORDER BY check_in DESC
     LIMIT $2`,
    [req.user.id, limit]
  );

  res.json({ ok: true, items: r.rows });
});

app.get("/api/attendance/all", requireAuth, requireRole("admin"), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);

  const r = await pool.query(
    `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email,
            a.check_in, a.check_out, a.note,
            a.latitude, a.longitude,
            a.check_out_latitude, a.check_out_longitude,
            (a.photo IS NOT NULL) AS has_photo
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.check_in DESC
     LIMIT $1`,
    [limit]
  );

  res.json({ ok: true, items: r.rows });
});

app.get("/api/attendance/export", requireAuth, requireRole("admin"), async (req, res) => {
  const { start, end } = req.query;

  let query = `
    SELECT a.id, u.name AS user_name, u.email AS user_email,
           a.check_in, a.check_out, a.note,
           a.latitude, a.longitude,
           a.check_out_latitude, a.check_out_longitude
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

  const header =
    "ID,Nama,Email,Check-In,Check-Out,Note,InLat,InLon,OutLat,OutLon\n";

  const rows = r.rows
    .map((row) => {
      return [
        row.id,
        `"${row.user_name || ""}"`,
        `"${row.user_email || ""}"`,
        `"${row.check_in || ""}"`,
        `"${row.check_out || ""}"`,
        `"${(row.note || "").replace(/"/g, '""')}"`,
        row.latitude ?? "",
        row.longitude ?? "",
        row.check_out_latitude ?? "",
        row.check_out_longitude ?? ""
      ].join(",");
    })
    .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=laporan-absen.csv");
  res.send(header + rows);
});

app.get("/api/attendance/:id/photo", requireAuth, async (req, res) => {
  const { id } = req.params;

  const r = await pool.query(`SELECT photo, user_id FROM attendance WHERE id = $1`, [id]);
  if (!r.rows[0]) return res.status(404).json({ ok: false, message: "Not found" });

  if (req.user.role !== "admin" && r.rows[0].user_id !== req.user.id) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  if (!r.rows[0].photo) return res.status(404).json({ ok: false, message: "No photo" });

  res.json({ ok: true, photo: r.rows[0].photo });
});

// ===== Serve frontend build =====
const __dirname = path.resolve();
const distPath = path.join(__dirname, "client", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
