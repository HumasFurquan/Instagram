// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import ProfilePicture from "./ProfilePicture";

export default function Navbar({ user, authHeaders, onUpdateUser }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: 100,
        borderRight: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 0",
        backgroundColor: "#fff",
        boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
        zIndex: 1000,
      }}
    >
      {/* Top: Logo */}
      <div
        style={{ marginBottom: 32, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <h3 style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          Insta
        </h3>
      </div>

      {/* Middle: Nav Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <button onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          🏠
        </button>
        <button onClick={() => navigate("/search")} style={{ cursor: "pointer" }}>
          🔍
        </button>
        <button onClick={() => navigate("/create")} style={{ cursor: "pointer" }}>
          ➕
        </button>
      </div>

      {/* Bottom: Profile */}
      <div style={{ marginBottom: 16 }}>
        <ProfilePicture 
          user={user} 
          authHeaders={authHeaders} 
          onUpdateUser={onUpdateUser} // ✅ Pass callback to update App.jsx user state
        />
      </div>
    </div>
  );
}
