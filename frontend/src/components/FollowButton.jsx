// src/components/FollowButton.jsx
import React from "react";

export default function FollowButton({ isFollowing, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle} // now correctly uses the prop
      disabled={disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        background: isFollowing ? "#fff" : "#007bff",
        color: isFollowing ? "#333" : "#fff",
        border: isFollowing ? "1px solid #ccc" : "none",
        cursor: "pointer",
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
