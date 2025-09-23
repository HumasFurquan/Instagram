// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePicture from "./ProfilePicture";
import api from "../api";
import FriendRequestsDropdown from "./FriendRequestsDropdown";
import FriendsDropdown from "./FriendsDropdown";

export default function Navbar({ user, authHeaders, onUpdateUser, socket }) {
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  // Fetch pending requests + accepted friends
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [reqRes, friendsRes] = await Promise.all([
          api.get("/friends/requests", { headers: authHeaders() }),
          api.get("/friends", { headers: authHeaders() }),
        ]);
        setFriendRequests(reqRes.data || []);
        setFriends(friendsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch friends/requests", err);
      }
    }
    fetchData();
  }, [user, authHeaders]);

  // Socket real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewRequest = (request) => {
      if (request.receiver_id === user.id) setFriendRequests(prev => [request, ...prev]);
    };

    const handleRequestUpdate = (updated) => {
      setFriendRequests(prev => prev.filter(r => r.id !== updated.id));
      if (updated.status === "accepted") {
        setFriends(prev => [
          ...prev,
          updated.sender_id === user.id ? updated.receiver : updated.sender,
        ]);
      }
    };

    socket.on("new_friend_request", handleNewRequest);
    socket.on("friend_request_updated", handleRequestUpdate);

    return () => {
      socket.off("new_friend_request", handleNewRequest);
      socket.off("friend_request_updated", handleRequestUpdate);
    };
  }, [socket, user]);

  // Handle unfriend: remove friend instantly from state
  const handleUnfriend = (friendId) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: 100,
        borderRight: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 0",
        backgroundColor: "#fff",
        boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
        zIndex: 1000,
      }}
    >
      {/* Top: Logo */}
      <div style={{ marginBottom: 32, cursor: "pointer" }} onClick={() => navigate("/")}>
        <h3 style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Insta</h3>
      </div>

      {/* Middle: Nav Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <button onClick={() => navigate("/")} style={{ cursor: "pointer" }}>🏠</button>
        <button onClick={() => navigate("/search")} style={{ cursor: "pointer" }}>🔍</button>
        <button onClick={() => navigate("/create")} style={{ cursor: "pointer" }}>➕</button>

        {/* Friend request notifications */}
        {user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setRequestsOpen(prev => !prev); setFriendsOpen(false); }}
              style={{ cursor: "pointer" }}
            >
              🔔 {friendRequests.length > 0 && `(${friendRequests.length})`}
            </button>
            {requestsOpen && (
              <FriendRequestsDropdown
                requests={friendRequests}
                authHeaders={authHeaders}
                onRequestHandled={updated => setFriendRequests(prev => prev.filter(r => r.id !== updated.id))}
              />
            )}
          </div>
        )}

        {/* Friends list button */}
        {user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setFriendsOpen(prev => !prev); setRequestsOpen(false); }}
              style={{ cursor: "pointer" }}
            >
              👥 Friends {friends.length > 0 && `(${friends.length})`}
            </button>
            {friendsOpen && (
              <FriendsDropdown
                friends={friends}
                authHeaders={authHeaders}
                onSelectFriend={friend => navigate(`/user/${friend.id}`)}
                onUnfriend={handleUnfriend} // pass handler here
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom: Profile */}
      <div style={{ marginBottom: 16 }}>
        <ProfilePicture user={user} authHeaders={authHeaders} onUpdateUser={onUpdateUser} />
      </div>
    </div>
  );
}
