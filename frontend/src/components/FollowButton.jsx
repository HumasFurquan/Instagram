// src/components/FollowButton.jsx
import React from "react";
import "./FollowButton.css";

export default function FollowButton({ isFollowing, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`follow-btn ${isFollowing ? "following" : "follow"}`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}