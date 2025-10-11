import React from "react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();

  const handlePrivateClick = () => {
    console.log("Private button clicked");
    // later you can toggle privacy in backend here
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("token");

    // 🔥 Force re-render by navigating
    navigate("/login", { replace: true });

    // Optional: clear any global state or user context if you use one
    window.location.reload(); // ensures full reset (only if needed)
  };

  return (
    <div
      style={{
        padding: "30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "80vh",
      }}
    >
      <h2 style={{ marginBottom: "40px" }}>⚙️ Settings</h2>

      <button
        onClick={handlePrivateClick}
        style={{
          padding: "10px 20px",
          marginBottom: "20px",
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#007bff",
          color: "white",
          cursor: "pointer",
          fontSize: "16px",
          width: "150px",
        }}
      >
        Private
      </button>

      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#dc3545",
          color: "white",
          cursor: "pointer",
          fontSize: "16px",
          width: "150px",
        }}
      >
        Logout
      </button>
    </div>
  );
}
