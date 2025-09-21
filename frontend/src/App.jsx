// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Signup from './components/Signup';
import Login from './components/Login';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import UserFeed from './components/UserFeed';
import SearchBar from './components/SearchBar';
import Navbar from './components/Navbar';
import api from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleAuth = ({ token, user }) => {
    console.log("✅ handleAuth called, setting user:", user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token); 
    setUser(user);
  };

  const logout = () => {
    console.log("✅ Logging out");
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    setToken(null); 
    setUser(null);
  };

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  // Update user state and localStorage when profile picture changes
  const updateUser = (newUser) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const toggleFollow = async (targetUserId, isCurrentlyFollowing) => {
    if (!user || !token) return alert('Please login to follow users.');
    try {
      if (isCurrentlyFollowing) {
        await api.delete(`/follows/${targetUserId}`, { headers: authHeaders() });
      } else {
        await api.post(`/follows/${targetUserId}`, {}, { headers: authHeaders() });
      }
    } catch (err) {
      console.error('❌ Failed to toggle follow', err);
      alert('Could not update follow status.');
    }
  };

  return (
    <Router>
      {/* Navbar fixed outside the scrollable content */}
      {token && <Navbar user={user} authHeaders={authHeaders} onLogout={logout} onUpdateUser={updateUser} />}

      {/* Main content shifted right by 100px to avoid overlap */}
      <div style={{ marginLeft: token ? 100 : 0, maxWidth: 600, padding: 16 }}>
        <h1>Instagram-lite</h1>

        {!token ? (
          <>
            <Signup onAuth={handleAuth} />
            <hr />
            <Login onAuth={handleAuth} />
          </>
        ) : (
          <>
            <SearchBar />

            <Routes>
              <Route 
                path="/" 
                element={
                  <>
                    <CreatePost token={token} />
                    <Feed />
                  </>
                } 
              />
              <Route
                path="/users/:userId"
                element={
                  <UserFeed 
                    user={user} 
                    authHeaders={authHeaders} 
                    toggleFollow={toggleFollow} 
                    onUpdateUser={updateUser}
                  />
                }
              />
            </Routes>
          </>
        )}
      </div>
    </Router>
  );
}
