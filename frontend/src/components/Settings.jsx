import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Settings() {
  const navigate = useNavigate();
  const [isPrivate, setIsPrivate] = useState(false);

  // Fetch current user's privacy status on mount
  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const res = await api.get("/users/me"); // /users/me route in backend
        setIsPrivate(res.data.is_private);
      } catch (err) {
        console.error("Failed to fetch privacy:", err);
        alert("Failed to fetch your settings. Please try again.");
      }
    };
    fetchPrivacy();
  }, []);

  // Toggle privacy status
  const handlePrivateClick = async () => {
    try {
      const newStatus = !isPrivate;
      await api.patch("/users/privacy", { is_private: newStatus });
      setIsPrivate(newStatus);
      alert(`Your profile is now ${newStatus ? "Private 🔒" : "Public 🌐"}`);
    } catch (err) {
      console.error("Privacy toggle error:", err);
      alert("Failed to update privacy. Please try again.");
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
    window.location.reload();
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
          backgroundColor: isPrivate ? "#6c757d" : "#007bff",
          color: "white",
          cursor: "pointer",
          fontSize: "16px",
          width: "150px",
        }}
      >
        {isPrivate ? "Private 🔒" : "Public 🌐"}
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
