// src/components/SearchBar.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css'; // Import CSS file

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
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="search-bar-input"
        placeholder="Search people..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((u) => (
            <li
              key={u.id}
              className="search-suggestion-item"
              onClick={() => handleSelect(u.id)}
            >
              {u.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
