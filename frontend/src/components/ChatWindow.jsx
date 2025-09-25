// src/components/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function ChatWindow({ user, authHeaders, socket }) {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Fetch friend info
  useEffect(() => {
    async function fetchFriend() {
      try {
        const res = await api.get(`/users/${friendId}`, { headers: authHeaders() });
        setFriend(res.data);
      } catch (err) {
        console.error("Failed to fetch friend info", err);
      }
    }
    fetchFriend();
  }, [friendId, authHeaders]);

  // Fetch messages
  useEffect(() => {
    if (!friend) return;

    async function fetchMessages() {
      try {
        const res = await api.get(`/messages/${friend.id}`, { headers: authHeaders() });
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    }

    fetchMessages();
  }, [friend, authHeaders]);

  // Socket listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
        // Only append if this message belongs to this chat window
        if (
        (message.sender_id === friend?.id && message.receiver_id === user.id) ||
        (message.sender_id === user.id && message.receiver_id === friend?.id)
        ) {
        setMessages((prev) => [...prev, message]);
        }
    };

    socket.on("new_message", handleNewMessage);
    return () => socket.off("new_message", handleNewMessage);
    }, [socket, friend, user]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('sendMessage', { 
        receiverId: friend.id, 
        content: newMessage 
    });

    setNewMessage(""); // clear input
    };

  if (!friend) return <div>Loading chat...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #ddd", fontWeight: "bold" }}>
        <span>{friend.username}</span>
        <button onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>✖</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", height: 400, padding: "8px 16px", backgroundColor: "#f9f9f9" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ textAlign: msg.sender_id === user.id ? "right" : "left", marginBottom: 8 }}>
            <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 16, backgroundColor: msg.sender_id === user.id ? "#DCF8C6" : "#fff", border: "1px solid #ddd", maxWidth: "70%" }}>
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", borderTop: "1px solid #ddd" }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "8px 12px", border: "none", outline: "none" }}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
        />
        <button onClick={sendMessage} style={{ padding: "0 16px", border: "none", cursor: "pointer", backgroundColor: "#007bff", color: "#fff" }}>
          Send
        </button>
      </div>
    </div>
  );
}
