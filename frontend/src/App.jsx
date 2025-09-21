// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Signup from './components/Signup';
import Login from './components/Login';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import UserFeed from './components/UserFeed';
import SearchBar from './components/SearchBar';
import api from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleAuth = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token); 
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    setToken(null); 
    setUser(null);
  };

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const toggleFollow = async (targetUserId, isCurrentlyFollowing) => {
  if (!user || !token) return alert('Please login to follow users.');

  try {
    // Optimistic UI update (optional)
    // update all posts from this user locally
    // Example if using state in Feed/UserFeed

    if (isCurrentlyFollowing) {
      await api.delete(`/follows/${targetUserId}`, { headers: authHeaders() });
    } else {
      await api.post(`/follows/${targetUserId}`, {}, { headers: authHeaders() });
    }
  } catch (err) {
    console.error('Failed to toggle follow', err);
    alert('Could not update follow status.');
  }
  };


  return (
    <Router>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
        <h1>Instagram-lite</h1>

        {!token ? (
          <>
            <Signup onAuth={handleAuth} />
            <hr />
            <Login onAuth={handleAuth} />
          </>
        ) : (
          <>
            <div>
              Welcome {user?.username} 
              <button onClick={logout}>Logout</button>
            </div>
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
