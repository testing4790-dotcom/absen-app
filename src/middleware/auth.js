import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  // Cek header dulu, lalu query param (untuk download link)
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ ok: false, message: "Forbidden" });
    next();
  };
}
