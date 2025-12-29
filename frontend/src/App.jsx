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
import ChatWindow from './components/ChatWindow';
import useSocket from './hooks/useSocket';
import api from './api';
import Settings from './components/Settings';
import './components/AuthPage.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const socket = useSocket(); // ✅ socket returned immediately

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
      {token && <Navbar user={user} authHeaders={authHeaders} onLogout={logout} onUpdateUser={updateUser} />}
      {!token ? (
        <div className="auth-page-container">
          {/* Animated Side Elements */}
          <div className="auth-side-element left"></div>
          <div className="auth-side-element right"></div>
          <div className="auth-side-element left-small"></div>
          <div className="auth-side-element right-small"></div>
          
          {/* Floating Icons */}
          <div className="auth-icon heart">❤️</div>
          <div className="auth-icon star">⭐</div>
          <div className="auth-icon camera">📷</div>
          <div className="auth-icon like">👍</div>
          
          {/* Gradient Orbs */}
          <div className="auth-orb orb-1"></div>
          <div className="auth-orb orb-2"></div>
          
          {/* Particles */}
          <div className="auth-particle"></div>
          <div className="auth-particle"></div>
          <div className="auth-particle"></div>
          <div className="auth-particle"></div>
          
          <div className="auth-title-container">
            <h1 className="auth-title">Instagram-lite</h1>
          </div>
          <div className="auth-content-wrapper">
            <div className="auth-forms-container">
              <Signup onAuth={handleAuth} />
              <Login onAuth={handleAuth} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginLeft: 100, maxWidth: 600, padding: 16 }}>
          <>
            <h1>Instagram-lite</h1>
            <SearchBar />
            <Routes>
              <Route 
                path="/" 
                element={
                  <>
                    <CreatePost token={token} />
                    <Feed socket={socket} user={user} authHeaders={authHeaders} />
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
                    socket={socket} // pass socket if needed
                  />
                }
              />
              <Route 
                path="/messages/:friendId" 
                element={<ChatWindow user={user} authHeaders={authHeaders} socket={socket} />}
              />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </>
        </div>
      )}
    </Router>
  );
}
