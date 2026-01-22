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
  title: { margin: 0, fontSize: "24px" },
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
  btnExport: {
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer"
  },
  row: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: { background: "#667eea", color: "white", padding: "12px 8px", textAlign: "left" },
  td: { padding: "10px 8px", borderBottom: "1px solid #eee" },
  badge: { display: "inline-block", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  badgeAdmin: { background: "#667eea", color: "white" },
  badgeUser: { background: "#28a745", color: "white" },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", background: "#e0e0e0" },
  tabActive: { padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", background: "#667eea", color: "white" },
  msg: { padding: "12px", borderRadius: "8px", marginTop: "12px", textAlign: "center" },
  msgSuccess: { background: "#d4edda", color: "#155724" },
  msgError: { background: "#f8d7da", color: "#721c24" },
  attendanceCard: { background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: "8px", padding: "12px", marginBottom: "8px" },
  statusIn: { color: "#28a745", fontWeight: "bold" },
  statusOut: { color: "#dc3545", fontWeight: "bold" },
  photoPreview: { width: "100%", maxWidth: "300px", borderRadius: "8px", marginTop: "8px" },
  photoThumb: { width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px", cursor: "pointer" },
  modal: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
  },
  modalContent: { background: "white", padding: "20px", borderRadius: "12px", maxWidth: "90%", maxHeight: "90%", overflow: "auto" },
  video: { width: "100%", maxWidth: "400px", borderRadius: "8px" },
  locationInfo: { fontSize: "12px", color: "#666", marginTop: "4px" }
};

// ===== Helper =====
function getToken() { return localStorage.getItem("token"); }
function setToken(t) { if (t) localStorage.setItem("token", t); else localStorage.removeItem("token"); }

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ===== App =====
function App() {
  const [user, setUser] = React.useState(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState({ text: "", type: "" });
  const [items, setItems] = React.useState([]);
  const [tab, setTab] = React.useState("absen");
  const [users, setUsers] = React.useState([]);
  const [allItems, setAllItems] = React.useState([]);

  // form tambah user
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState("user");

  // GPS & Photo
  const [location, setLocation] = React.useState(null);
  const [photo, setPhoto] = React.useState(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [gettingLocation, setGettingLocation] = React.useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  // Modal photo
  const [modalPhoto, setModalPhoto] = React.useState(null);

  // Export filter
  const [exportStart, setExportStart] = React.useState("");
  const [exportEnd, setExportEnd] = React.useState("");

  async function loadMe() {
    try {
      const r = await api("/api/auth/me");
      setUser(r.user);
    } catch { setUser(null); }
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

  React.useEffect(() => { loadMe().then(() => loadHistory()); }, []);

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
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  async function onLogout() {
    setToken(null);
    setUser(null);
    setItems([]);
    setUsers([]);
    setAllItems([]);
    setTab("absen");
    setMsg({ text: "", type: "" });
    setPhoto(null);
    setLocation(null);
  }

  // GPS
  function getLocation() {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      setMsg({ text: "GPS tidak didukung di browser ini", type: "error" });
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setMsg({ text: "Lokasi berhasil didapat!", type: "success" });
        setGettingLocation(false);
      },
      (err) => {
        setMsg({ text: "Gagal mendapatkan lokasi: " + err.message, type: "error" });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Camera
  async function openCamera() {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setMsg({ text: "Gagal membuka kamera: " + err.message, type: "error" });
      setShowCamera(false);
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setPhoto(dataUrl);
    closeCamera();
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  async function checkIn() {
    if (!location) {
      setMsg({ text: "Silakan ambil lokasi GPS dulu!", type: "error" });
      return;
    }
    if (!photo) {
      setMsg({ text: "Silakan ambil foto selfie dulu!", type: "error" });
      return;
    }
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/attendance/check-in", {
        method: "POST",
        body: { note: "via web", latitude: location.latitude, longitude: location.longitude, photo }
      });
      setMsg({ text: "Check-in sukses!", type: "success" });
      setPhoto(null);
      setLocation(null);
      await loadHistory();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  async function checkOut() {
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/attendance/check-out", { method: "POST" });
      setMsg({ text: "Check-out sukses!", type: "success" });
      await loadHistory();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  async function addUser(e) {
    e.preventDefault();
    setMsg({ text: "Loading...", type: "" });
    try {
      await api("/api/users", { method: "POST", body: { name: newName, email: newEmail, password: newPassword, role: newRole } });
      setMsg({ text: "User berhasil ditambahkan!", type: "success" });
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("user");
      await loadUsers();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  async function deleteUser(id) {
    if (!confirm("Yakin hapus user ini?")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setMsg({ text: "User dihapus!", type: "success" });
      await loadUsers();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  function exportCSV() {
    let url = "/api/attendance/export";
    const params = [];
    if (exportStart) params.push(`start=${exportStart}`);
    if (exportEnd) params.push(`end=${exportEnd}`);
    if (params.length) url += "?" + params.join("&");

    // Add token in query for download
    const token = getToken();
    url += (params.length ? "&" : "?") + `token=${token}`;

    window.open(url, "_blank");
  }

  async function viewPhoto(id) {
    try {
      const r = await api(`/api/attendance/${id}/photo`);
      setModalPhoto(r.photo);
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  // ===== Render Login =====
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ textAlign: "center", color: "#667eea", marginBottom: "24px" }}>📋 Absen App</h1>
          <h3 style={{ marginBottom: "16px" }}>Login</h3>
          <form onSubmit={onLogin}>
            <input style={styles.input} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={styles.input} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" style={styles.btnPrimary}>Login</button>
          </form>
          {msg.text && <div style={{ ...styles.msg, ...(msg.type === "error" ? styles.msgError : styles.msgSuccess) }}>{msg.text}</div>}
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
            <span style={{ ...styles.badge, ...(user.role === "admin" ? styles.badgeAdmin : styles.badgeUser) }}>{user.role}</span>
          </div>
        </div>
        <button onClick={onLogout} style={styles.btnSecondary}>Logout</button>
      </div>

      {/* Tabs */}
      {user.role === "admin" && (
        <div style={styles.tabs}>
          <button style={tab === "absen" ? styles.tabActive : styles.tab} onClick={() => setTab("absen")}>🕐 Absen Saya</button>
          <button style={tab === "users" ? styles.tabActive : styles.tab} onClick={() => setTab("users")}>👥 Kelola User</button>
          <button style={tab === "allAbsen" ? styles.tabActive : styles.tab} onClick={() => setTab("allAbsen")}>📊 Semua Absen</button>
        </div>
      )}

      {/* Message */}
      {msg.text && <div style={{ ...styles.msg, ...(msg.type === "error" ? styles.msgError : styles.msgSuccess) }}>{msg.text}</div>}

      {/* Tab: Absen */}
      {tab === "absen" && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>📍 Ambil Lokasi & Foto</h3>
            
            <div style={styles.row}>
              <button onClick={getLocation} style={styles.btnSecondary} disabled={gettingLocation}>
                {gettingLocation ? "Mengambil GPS..." : "📍 Ambil Lokasi"}
              </button>
              <button onClick={openCamera} style={styles.btnSecondary}>📷 Ambil Foto</button>
            </div>

            {location && (
              <div style={styles.locationInfo}>
                ✅ Lokasi: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </div>
            )}

            {photo && (
              <div>
                <p style={{ fontSize: "14px", color: "#666" }}>✅ Foto siap:</p>
                <img src={photo} alt="Selfie" style={styles.photoPreview} />
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>⏰ Check-in / Check-out</h3>
            <div style={styles.row}>
              <button onClick={checkIn} style={styles.btnSuccess}>✅ Check-in</button>
              <button onClick={checkOut} style={styles.btnDanger}>🚪 Check-out</button>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>📜 Riwayat Saya (20 terakhir)</h3>
            {items.length === 0 ? (
              <p style={{ color: "#888" }}>Belum ada riwayat.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} style={styles.attendanceCard}>
                  <div><span style={styles.statusIn}>IN:</span> {formatDate(it.check_in)}</div>
                  <div><span style={styles.statusOut}>OUT:</span> {formatDate(it.check_out)}</div>
                  {it.latitude && <div style={styles.locationInfo}>📍 {it.latitude.toFixed(6)}, {it.longitude.toFixed(6)}</div>}
                  {it.photo && <img src={it.photo} alt="Foto" style={styles.photoThumb} onClick={() => setModalPhoto(it.photo)} />}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tab: Users */}
      {tab === "users" && user.role === "admin" && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>➕ Tambah User Baru</h3>
            <form onSubmit={addUser}>
              <input style={styles.input} placeholder="Nama" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input style={styles.input} placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <input style={styles.input} placeholder="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <select style={styles.input} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" style={styles.btnPrimary}>Tambah User</button>
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
                        <span style={{ ...styles.badge, ...(u.role === "admin" ? styles.badgeAdmin : styles.badgeUser) }}>{u.role}</span>
                      </td>
                      <td style={styles.td}>
                        {u.id !== user.id && <button onClick={() => deleteUser(u.id)} style={styles.btnSmall}>Hapus</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab: All Attendance */}
      {tab === "allAbsen" && user.role === "admin" && (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>📊 Semua Absen</h3>

          {/* Export */}
          <div style={{ ...styles.row, alignItems: "center", marginBottom: "16px" }}>
            <input type="date" style={{ ...styles.input, width: "auto", marginBottom: 0 }} value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
            <span>s/d</span>
            <input type="date" style={{ ...styles.input, width: "auto", marginBottom: 0 }} value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
            <button onClick={exportCSV} style={styles.btnExport}>📥 Export CSV</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Check-in</th>
                  <th style={styles.th}>Check-out</th>
                  <th style={styles.th}>Lokasi</th>
                  <th style={styles.th}>Foto</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((it) => (
                  <tr key={it.id}>
                    <td style={styles.td}>{it.user_name}</td>
                    <td style={styles.td}>{formatDate(it.check_in)}</td>
                    <td style={styles.td}>{formatDate(it.check_out)}</td>
                    <td style={styles.td}>
                      {it.latitude ? (
                        <a href={`https://maps.google.com/?q=${it.latitude},${it.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: "12px" }}>
                          📍 Lihat
                        </a>
                      ) : "-"}
                    </td>
                    <td style={styles.td}>
                      {it.photo ? <button onClick={() => viewPhoto(it.id)} style={{ ...styles.btnSmall, background: "#667eea" }}>Lihat</button> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div style={styles.modal} onClick={closeCamera}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>📷 Ambil Foto Selfie</h3>
            <video ref={videoRef} autoPlay playsInline style={styles.video} />
            <div style={{ ...styles.row, marginTop: "12px" }}>
              <button onClick={capturePhoto} style={styles.btnSuccess}>📸 Ambil</button>
              <button onClick={closeCamera} style={styles.btnSecondary}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {modalPhoto && (
        <div style={styles.modal} onClick={() => setModalPhoto(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={modalPhoto} alt="Foto" style={{ maxWidth: "100%", borderRadius: "8px" }} />
            <button onClick={() => setModalPhoto(null)} style={{ ...styles.btnSecondary, marginTop: "12px" }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
