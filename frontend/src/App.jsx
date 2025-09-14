import React, { useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleAuth = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token); setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setToken(null); setUser(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Instagram-lite</h1>
      {!token ? (
        <>
          <Signup onAuth={handleAuth}/>
          <hr/>
          <Login onAuth={handleAuth}/>
        </>
      ) : (
        <>
          <div>Welcome {user?.username} <button onClick={logout}>Logout</button></div>
          <CreatePost token={token}/>
          <Feed />
        </>
      )}
    </div>
  );
}
