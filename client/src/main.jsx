import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [health, setHealth] = React.useState(null);

  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h1>Absen App (Testing)</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
