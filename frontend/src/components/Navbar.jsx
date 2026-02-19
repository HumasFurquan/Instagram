// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePicture from "./ProfilePicture";
import api from "../api";
import FriendRequestsDropdown from "./FriendRequestsDropdown";
import FriendsDropdown from "./FriendsDropdown";
import "./Navbar.css";

export default function Navbar({ user, authHeaders, onUpdateUser, socket }) {
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

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
      if (request.receiver_id === user.id) {
        setFriendRequests((prev) => [request, ...prev]);
      }
    };

    const handleRequestUpdate = (updated) => {
      setFriendRequests((prev) => prev.filter((r) => r.id !== updated.id));
      if (updated.status === "accepted") {
        setFriends((prev) => [
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
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

// Handle accepting friend request
  const handleAccept = async (requestId) => {
    try {
      await api.post(`/friends/accept/${requestId}`, {}, { headers: authHeaders() });

      // Remove from requests list
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));

      // Optionally: add to friends (if backend returns friend info, better to re-fetch friends)
      const acceptedRequest = friendRequests.find(r => r.id === requestId);
      if (acceptedRequest) {
        setFriends(prev => [...prev, { id: acceptedRequest.sender_id, username: acceptedRequest.username }]);
      }
    } catch (err) {
      console.error("Error accepting friend request", err);
    }
  };

// Handle rejecting friend request
  const handleReject = async (requestId) => {
    try {
      await api.post(`/friends/decline/${requestId}`, {}, { headers: authHeaders() });
      setFriendRequests(prev => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error rejecting friend request", err);
    }
  };

  const handleOpenChat = (friend) => {
    navigate(`/messages/${friend.id}`);
    setMessagesOpen(false);
  };

  return (
    <div className="navbar">
      {/* Top: Logo */}
      <div className="navbar-logo" onClick={() => navigate("/")}>
      <i className="fa-solid fa-snowflake fa-3x"></i>
      </div>

      {/* Middle: Nav Links */}
      <div className="navbar-links">
        <button onClick={() => navigate("/")}>
        <i className="fa-solid fa-house"></i>
        </button>
        <button onClick={() => navigate("/search")}>
        <i className="fa-solid fa-magnifying-glass"></i>
        </button>
        {/* <button onClick={() => navigate("/create")}>
        <i className="fa-solid fa-plus"></i>
        </button> */}

        {/* Friend request notifications */}
        {user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setRequestsOpen((prev) => !prev);
                setFriendsOpen(false);
              }}
            >
              <i className="fa-solid fa-bell"></i>
              {friendRequests.length > 0 && `(${friendRequests.length})`}
            </button>
            {requestsOpen && (
              <FriendRequestsDropdown
                requests={friendRequests}
                authHeaders={authHeaders}
                onRequestHandled={(updated) =>
                  setFriendRequests((prev) =>
                    prev.filter((r) => r.id !== updated.id)
                  )
                }
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}
          </div>
        )}

        {/* Messages button */}
        {user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setMessagesOpen(prev => !prev);
                setRequestsOpen(false);
                setFriendsOpen(false);
              }}
            >
              <i className="fa-solid fa-comments"></i> Messages
            </button>
            {messagesOpen && (
              <div className="navbar-dropdown">
                {friends.map(friend => (
                  <div key={friend.id} className="navbar-dropdown-item"                  >
                    <span>{friend.username}</span>
                    <button onClick={() => handleOpenChat(friend)}
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friends list button */}
        {user && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setFriendsOpen((prev) => !prev);
                setRequestsOpen(false);
              }}
            >
              <i className="fa-solid fa-user-group"></i> Friends {friends.length > 0 && `(${friends.length})`}
            </button>
            {friendsOpen && (
              <FriendsDropdown
                friends={friends}
                authHeaders={authHeaders}
                onSelectFriend={(friend) => navigate(`/user/${friend.id}`)}
                onUnfriend={handleUnfriend} // pass handler here
              />
            )}
          </div>
        )}

        <button onClick={() => navigate("/settings")} style={{ cursor: "pointer" }}>
        <i className="fa-solid fa-gear"></i> Settings
        </button>
      </div>

      {/* Bottom: Profile */}
      <div  className="navbar-profile">
        <ProfilePicture
          user={user}
          authHeaders={authHeaders}
          onUpdateUser={onUpdateUser}
        />
      </div>
    </div>
  );
}
