// src/components/FriendsDropdown.jsx
import React, { useState, useEffect } from "react";
import api from "../api";

export default function FriendsDropdown({ friends, authHeaders, onSelectFriend, onUnfriend }) {
  const [localFriends, setLocalFriends] = useState(friends || []);

  // Sync localFriends if parent friends prop changes
  useEffect(() => {
    setLocalFriends(friends || []);
  }, [friends]);

  const handleUnfriend = async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`, { headers: authHeaders() });
      setLocalFriends(prev => prev.filter(f => f.id !== friendId));

      // Notify Navbar to update count immediately
      if (onUnfriend) onUnfriend(friendId);
    } catch (err) {
      console.error("Failed to unfriend:", err.response?.data?.message || err.message);
      alert("Could not remove friend. Please try again.");
    }
  };

  if (!localFriends || localFriends.length === 0) {
    return (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: 6,
          padding: 8,
          width: 220,
          zIndex: 2000,
        }}
      >
        <p style={{ margin: 0, textAlign: "center", color: "#666" }}>
          No friends yet
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: 6,
        padding: 8,
        width: 220,
        maxHeight: 300,
        overflowY: "auto",
        zIndex: 2000,
      }}
    >
      {localFriends.map(friend => (
        <div
          key={friend.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            borderBottom: "1px solid #eee",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#007bff" }}
            onClick={() => onSelectFriend(friend)}
          >
            <img
              src={friend.profile_picture_url || "/default-avatar.png"}
              alt={friend.username}
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
            <span>{friend.username}</span>
          </div>
          <button
            onClick={() => handleUnfriend(friend.id)}
            style={{
              padding: "4px 8px",
              backgroundColor: "#888",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Unfriend
          </button>
        </div>
      ))}
    </div>
  );
}
