import React from "react";
import ReactDOM from "react-dom/client";

// ===== Styles =====
const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
    background: "#f5f7fa",
    minHeight: "100vh"
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  title: {
    margin: 0,
    fontSize: "24px"
  },
  card: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "16px",
    marginBottom: "12px",
    boxSizing: "border-box"
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%"
  },
  btnSuccess: {
    background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    flex: 1
  },
  btnDanger: {
    background: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    flex: 1
  },
  btnSecondary: {
    background: "#6c757d",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer"
  },
  btnSmall: {
    background: "#dc3545",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer"
  },
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },
  th: {
    background: "#667eea",
    color: "white",
    padding: "12px 8px",
    textAlign: "left"
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #eee"
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  badgeAdmin: {
    background: "#667eea",
    color: "white"
  },
  badgeUser: {
    background: "#28a745",
    color: "white"
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  tab: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    background: "#e0e0e0"
  },
  tabActive: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    background: "#667eea",
    color: "white"
  },
  msg: {
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
    textAlign: "center"
  },
  msgSuccess: {
    background: "#d4edda",
    color: "#155724"
  },
  msgError: {
    background: "#f8d7da",
    color: "#721c24"
  },
  attendanceCard: {
    background: "#f8f9fa",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px"
  },
  statusIn: {
    color: "#28a745",
    fontWeight: "bold"
  },
  statusOut: {
    color: "#dc3545",
    fontWeight: "bold"
  }
};

// ===== Helper =====
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

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ===== App =====
function App() {
  const [user, setUser] = React.useState(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState({ text: "", type: "" });
  const [items, setItems] = React.useState([]);
  const [tab, setTab] = React.useState("absen"); // absen | users | allAbsen
  const [users, setUsers] = React.useState([]);
  const [allItems, setAllItems] = React.useState([]);

  // form tambah user
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState("user");

  async function loadMe() {
    try {
      const r = await api("/api/auth/me");
      setUser(r.user);
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

  async function loadUsers() {
    try {
      const r = await api("/api/users");
      setUsers(r.users || []);
    } catch {}
  }

  async function loadAllAttendance() {
    try {
      const r = await api("/api/attendance/all?limit=100");
      setAllItems(r.items || []);
    } catch {}
  }

  React.useEffect(() => {
    loadMe().then(() => {
      loadHistory();
    });
  }, []);

  React.useEffect(() => {
    if (user?.role === "admin") {
      if (tab === "users") loadUsers();
      if (tab === "allAbsen") loadAllAttendance();
    }
  }, [tab, user]);

  async function onLogin(e) {
    e.preventDefault();
    setMsg({ text: "Loading...", type: "" });
    try {
      const r = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      setUser(r.user);
      setMsg({ text: "Login sukses!", type: "success" });
      await loadHistory();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function onLogout() {
    setToken(null);
    setUser(null);
    setItems([]);
    setUsers([]);
    setAllItems([]);
    setTab("absen");
    setMsg({ text: "", type: "" });
  }

  async function checkIn() {
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/attendance/check-in", { method: "POST", body: { note: "via web" } });
      setMsg({ text: "Check-in sukses!", type: "success" });
      await loadHistory();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function checkOut() {
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/attendance/check-out", { method: "POST" });
      setMsg({ text: "Check-out sukses!", type: "success" });
      await loadHistory();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function addUser(e) {
    e.preventDefault();
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/users", {
        method: "POST",
        body: { name: newName, email: newEmail, password: newPassword, role: newRole }
      });
      setMsg({ text: "User berhasil ditambahkan!", type: "success" });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      await loadUsers();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function deleteUser(id) {
    if (!confirm("Yakin hapus user ini?")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setMsg({ text: "User dihapus!", type: "success" });
      await loadUsers();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  // ===== Render Login =====
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ textAlign: "center", color: "#667eea", marginBottom: "24px" }}>
            📋 Absen App
          </h1>
          <h3 style={{ marginBottom: "16px" }}>Login</h3>
          <form onSubmit={onLogin}>
            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" style={styles.btnPrimary}>
              Login
            </button>
          </form>
          {msg.text && (
            <div style={{ ...styles.msg, ...(msg.type === "error" ? styles.msgError : styles.msgSuccess) }}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== Render Dashboard =====
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Absen App</h1>
          <div style={{ marginTop: "8px" }}>
            Halo, <b>{user.name}</b>{" "}
            <span style={{ ...styles.badge, ...(user.role === "admin" ? styles.badgeAdmin : styles.badgeUser) }}>
              {user.role}
            </span>
          </div>
        </div>
        <button onClick={onLogout} style={styles.btnSecondary}>
          Logout
        </button>
      </div>

      {/* Tabs (admin only) */}
      {user.role === "admin" && (
        <div style={styles.tabs}>
          <button
            style={tab === "absen" ? styles.tabActive : styles.tab}
            onClick={() => setTab("absen")}
          >
            🕐 Absen Saya
          </button>
          <button
            style={tab === "users" ? styles.tabActive : styles.tab}
            onClick={() => setTab("users")}
          >
            👥 Kelola User
          </button>
          <button
            style={tab === "allAbsen" ? styles.tabActive : styles.tab}
            onClick={() => setTab("allAbsen")}
          >
            📊 Semua Absen
          </button>
        </div>
      )}

      {/* Message */}
      {msg.text && (
        <div style={{ ...styles.msg, ...(msg.type === "error" ? styles.msgError : styles.msgSuccess) }}>
          {msg.text}
        </div>
      )}

      {/* Tab: Absen */}
      {tab === "absen" && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>⏰ Check-in / Check-out</h3>
            <div style={styles.row}>
              <button onClick={checkIn} style={styles.btnSuccess}>
                ✅ Check-in
              </button>
              <button onClick={checkOut} style={styles.btnDanger}>
                🚪 Check-out
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>📜 Riwayat Saya (20 terakhir)</h3>
            {items.length === 0 ? (
              <p style={{ color: "#888" }}>Belum ada riwayat.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} style={styles.attendanceCard}>
                  <div>
                    <span style={styles.statusIn}>IN:</span> {formatDate(it.check_in)}
                  </div>
                  <div>
                    <span style={styles.statusOut}>OUT:</span> {formatDate(it.check_out)}
                  </div>
                  {it.note && <div style={{ color: "#666", fontSize: "12px" }}>📝 {it.note}</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tab: Users (admin) */}
      {tab === "users" && user.role === "admin" && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>➕ Tambah User Baru</h3>
            <form onSubmit={addUser}>
              <input
                style={styles.input}
                placeholder="Nama"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <select
                style={styles.input}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" style={styles.btnPrimary}>
                Tambah User
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>👥 Daftar User</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nama</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(u.role === "admin" ? styles.badgeAdmin : styles.badgeUser) }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {u.id !== user.id && (
                          <button onClick={() => deleteUser(u.id)} style={styles.btnSmall}>
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab: All Attendance (admin) */}
      {tab === "allAbsen" && user.role === "admin" && (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>📊 Semua Absen (100 terakhir)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Check-in</th>
                  <th style={styles.th}>Check-out</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((it) => (
                  <tr key={it.id}>
                    <td style={styles.td}>{it.user_name}</td>
                    <td style={styles.td}>{formatDate(it.check_in)}</td>
                    <td style={styles.td}>{formatDate(it.check_out)}</td>
                    <td style={styles.td}>{it.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
