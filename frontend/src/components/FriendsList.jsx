import React, { useEffect, useState } from 'react';
import api from '../api';

export default function FriendsList({ authHeaders }) {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    async function fetchFriends() {
      const res = await api.get('/friends', { headers: authHeaders() });
      setFriends(res.data);
    }
    fetchFriends();
  }, [authHeaders]);

  return (
    <div>
      <h3>Friends</h3>
      {friends.map(f => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <img src={f.profile_picture_url || '/default-avatar.png'} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
          <span>{f.username}</span>
        </div>
      ))}
    </div>
  );
}
