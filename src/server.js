import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// API (sementara test)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API is healthy" });
});

// Serve static hasil build Vite: client/dist
const __dirname = path.resolve();
const distPath = path.join(__dirname, "client", "dist");
app.use(express.static(distPath));

// fallback SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
