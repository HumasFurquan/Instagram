// src/components/FriendRequestsDropdown.jsx
import React, { useEffect, useRef } from "react";
import "./FriendRequestsDropdown.css";

export default function FriendRequestsDropdown({
  requests,
  onAccept,
  onReject,
  onClose
}) {
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!requests || requests.length === 0) return null;

  return (
    <div ref={dropdownRef} className="friend-requests-dropdown">
      {requests.map((r) => (
        <li key={r.id} className="friend-request-item">
        <div className="friend-request-top">
          <img
            src={r.profile_picture_url || "/default-avatar.png"}
            alt={r.username || `User ${r.sender_id}`}
            className="friend-request-avatar"
          />
          <span className="friend-request-name">
            {r.username || `User ${r.sender_id}`}
          </span>
        </div>
      
        <div className="friend-request-actions">
          <button
            className="friend-request-btn accept"
            onClick={() => onAccept(r.id)}
          >
            Accept
          </button>
          <button
            className="friend-request-btn reject"
            onClick={() => onReject(r.id)}
          >
            Decline
          </button>
        </div>
      </li>       
      ))}
    </div>
  );
}
