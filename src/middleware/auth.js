import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, name }
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
