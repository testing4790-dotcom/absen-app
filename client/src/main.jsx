import React from "react";
import ReactDOM from "react-dom/client";

function getToken() {
  return localStorage.getItem("token");
}
function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function App() {
  const [user, setUser] = React.useState(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [items, setItems] = React.useState([]);

  async function loadMe() {
    try {
      const r = await api("/api/auth/me");
      setUser(r.user);
      setMsg("");
    } catch {
      setUser(null);
    }
  }

  async function loadHistory() {
    try {
      const r = await api("/api/attendance/history?limit=20");
      setItems(r.items || []);
    } catch {}
  }

  React.useEffect(() => {
    loadMe().then(loadHistory);
  }, []);

  async function onLogin(e) {
    e.preventDefault();
    setMsg("Loading...");
    try {
      const r = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      setUser(r.user);
      setMsg("Login sukses");
      await loadHistory();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function onLogout() {
    setToken(null);
    setUser(null);
    setItems([]);
  }

  async function checkIn() {
    setMsg("Loading...");
    try {
      await api("/api/attendance/check-in", { method: "POST", body: { note: "via web" } });
      setMsg("Check-in sukses");
      await loadHistory();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function checkOut() {
    setMsg("Loading...");
    try {
      await api("/api/attendance/check-out", { method: "POST" });
      setMsg("Check-out sukses");
      await loadHistory();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16, maxWidth: 720 }}>
      <h1>Absen App</h1>

      {!user ? (
        <>
          <h3>Login</h3>
          <form onSubmit={onLogin} style={{ display: "grid", gap: 8 }}>
            <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>

          <p style={{ color: "#444" }}>
            Catatan: admin pertama dibuat lewat endpoint <code>/api/bootstrap-admin</code>.
          </p>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              Login sebagai: <b>{user.name}</b> ({user.role})
            </div>
            <button onClick={onLogout}>Logout</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={checkIn}>Check-in</button>
            <button onClick={checkOut}>Check-out</button>
          </div>

          <h3 style={{ marginTop: 16 }}>Riwayat (20 terakhir)</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
                <div><b>In:</b> {it.check_in}</div>
                <div><b>Out:</b> {it.check_out || "-"}</div>
                <div><b>Note:</b> {it.note || "-"}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ marginTop: 16, color: "crimson" }}>{msg}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
