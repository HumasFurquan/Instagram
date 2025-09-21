// src/components/SearchBar.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!query) return setSuggestions([]);
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?query=${query}`);
        setSuggestions(res.data || []);
      } catch (err) {
        console.error('Search error', err);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (userId) => {
    navigate(`/users/${userId}`);
    setQuery('');
    setSuggestions([]);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Search people..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ padding: 8, width: '100%', borderRadius: 6, border: '1px solid #ccc' }}
      />
      {suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          listStyle: 'none',
          padding: 0,
          margin: 0,
          zIndex: 10
        }}>
          {suggestions.map(u => (
            <li
              key={u.id}
              onClick={() => handleSelect(u.id)}
              style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {u.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
