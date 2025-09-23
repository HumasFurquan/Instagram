// src/components/FriendRequestsDropdown.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';

export default function FriendRequestsDropdown({ authHeaders, socket, currentUser, onRequestHandled }) {
  const [requests, setRequests] = useState([]);
  const dropdownRef = useRef();

  // Load pending friend requests
  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await api.get('/friends/requests', { headers: authHeaders() });
        setRequests(res.data || []);
      } catch (err) {
        console.error("Failed to fetch friend requests", err);
      }
    }
    fetchRequests();
  }, [authHeaders]);

  // Socket real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('new_friend_request', request => {
      if (request.receiver_id === currentUser.id) {
        setRequests(prev => [request, ...prev]);
      }
    });

    socket.on('friend_request_updated', updated => {
      // remove request from list when accepted/declined
      setRequests(prev => prev.filter(r => r.id !== updated.id));
    });

    return () => {
      socket.off('new_friend_request');
      socket.off('friend_request_updated');
    };
  }, [socket, currentUser]);

  // Accept friend request
  const handleAccept = async (requestId) => {
    try {
      const res = await api.post(`/friends/accept/${requestId}`, {}, { headers: authHeaders() });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (socket) socket.emit('friend_request_accepted', { requestId, userId: currentUser.id });
      if (onRequestHandled) onRequestHandled({ id: requestId, status: 'accepted' });
    } catch (err) {
      console.error(err);
      alert("Failed to accept friend request");
    }
  };

  // Decline friend request
  const handleDecline = async (requestId) => {
    try {
      await api.post(`/friends/decline/${requestId}`, {}, { headers: authHeaders() });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (socket) socket.emit('friend_request_declined', { requestId, userId: currentUser.id });
      if (onRequestHandled) onRequestHandled({ id: requestId, status: 'declined' });
    } catch (err) {
      console.error(err);
      alert("Failed to decline friend request");
    }
  };

  // Optional: close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setRequests(prev => prev); // optional: could close dropdown
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button>Notifications ({requests.length})</button>
      {requests.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          listStyle: 'none',
          padding: 8,
          zIndex: 100
        }}>
          {requests.map(r => (
            <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <img
                src={r.profile_picture_url || '/default-avatar.png'}
                alt={r.username || `User ${r.sender_id}`}
                width={24}
                height={24}
                style={{ borderRadius: '50%' }}
              />
              <span>{r.username || `User ${r.sender_id}`}</span>
              <button onClick={() => handleAccept(r.id)}>Accept</button>
              <button onClick={() => handleDecline(r.id)}>Decline</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
