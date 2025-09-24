// src/components/FriendRequestsDropdown.jsx
import React, { useEffect, useRef } from 'react';

export default function FriendRequestsDropdown({
  requests,
  onAccept,
  onReject,
  onClose
}) {
  const dropdownRef = useRef();

  // Optional: close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (onClose) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button>Notifications ({requests.length})</button>
      {requests.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            listStyle: 'none',
            padding: 8,
            zIndex: 100
          }}
        >
          {requests.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4
              }}
            >
              <img
                src={r.profile_picture_url || '/default-avatar.png'}
                alt={r.username || `User ${r.sender_id}`}
                width={24}
                height={24}
                style={{ borderRadius: '50%' }}
              />
              <span>{r.username || `User ${r.sender_id}`}</span>
              <button onClick={() => onAccept(r.id)}>Accept</button>
              <button onClick={() => onReject(r.id)}>Decline</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
