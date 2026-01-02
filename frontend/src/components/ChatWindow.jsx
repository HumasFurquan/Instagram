// src/components/ChatWindow.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import VideoCall from "./VideoCall";
import useSocket from "../hooks/useSocket";
import "./ChatWindow.css"

const PC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function ChatWindow({ user, authHeaders }) {
  const { friendId } = useParams();

  // Handlers
  const handleNewMessage = (message) => {
    if (
      (message.sender_id === friend?.id && message.receiver_id === user.id) ||
      (message.sender_id === user.id && message.receiver_id === friend?.id)
    ) {
      console.log("📩 New message received in this chat:", message);
      setMessages((prev) => [...prev, message]);
    }
  };

  // Incoming offer (someone is calling you)
    const handleOffer = async ({ offer, callerId, meta }) => {
    console.log("📞 Incoming call offer from:", callerId, meta);

    // Save offer and show accept UI
    pendingOfferRef.current = { offer, callerId, meta };
    setIncomingCaller({ id: callerId, meta });
    setCallState("ringing");

    // Ensure the video modal opens automatically
    setShowVideoCall(true);
  };

    const handleAnswer = async ({ answer, calleeId }) => {
      console.log("📞 Received ANSWER from callee:", calleeId);

      // if caller (we initiated), set remote description
      if (pcRef.current && answer) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("✅ Remote description set with answer.");
          setCallState("in-call");
        } catch (err) {
          console.error("❌ Error setting remote description (answer)", err);
        }
      }
    };

    const handleIce = async ({ candidate, fromId }) => {
      console.log("❄️ Received ICE candidate from:", fromId, candidate);
      if (!pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ ICE candidate added.");
      } catch (err) {
        console.warn("⚠️ Error adding ICE candidate", err);
      }
    };

    const handleHangup = ({ fromId }) => {
      console.log("📴 Hangup received from:", fromId);
      // end call
      closeCall();
      // optionally show a 'call ended' message
    };

    const handleRejected = ({ fromId }) => {
      console.log("🚫 Call rejected by:", fromId);
      // callee rejected
      closeCall();
      alert("Call was rejected.");
    };

  // Import the new hook
  const socket = useSocket({
    onNewMessage: handleNewMessage,
    onCallOffer: handleOffer,
    onCallAnswer: handleAnswer,
    onIceCandidate: handleIce,
    onHangup: handleHangup,
    onRejected: handleRejected,
  });

  const [connected, setConnected] = useState(false);

  // track connection state
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("🔌 Socket connected!");
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected!");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ---- WebRTC call state ----
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, in-call
  const [incomingCaller, setIncomingCaller] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Auto-open video modal when there's an incoming call
  useEffect(() => {
    console.log("📡 Call state changed:", callState);
    // if (callState === "ringing") setShowVideoCall(true);
    // console.log("📞 Showing incoming call popup.");
  }, [callState]);

  const openVideoModal = (isOutgoing = false) => {
    if (!incomingCaller && callState !== "in-call" && !isOutgoing) {
      console.warn("⚠️ No incoming caller and not in call, modal will not open");
      return;
    }
    console.log("🎥 Opening video modal");
    setShowVideoCall(true);
  };

  const closeVideoModal = () => {
    console.log("❌ Closing video modal");
    setShowVideoCall(false);
  };

  const messagesEndRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingOfferRef = useRef(null); // used when an incoming offer arrives

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
        console.log("👤 Friend info loaded:", res.data);
        setFriend(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch friend info", err);
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
    if (!newMessage.trim() || !socket || !friend) return;

    socket.emit('sendMessage', { 
        receiverId: friend.id, 
        content: newMessage 
    });

    setNewMessage(""); // clear input
    };

  useEffect(() => {
    if (!socket) return;

    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIce);
    socket.on("call:hangup", handleHangup);
    socket.on("call:rejected", handleRejected);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIce);
      socket.off("call:hangup", handleHangup);
      socket.off("call:rejected", handleRejected);
    };
  }, [socket]);

  // ---------------- Caller: start call ----------------
  const startCall = async () => {
    if (!socket || !friend) return alert("Socket or friend not ready.");
    console.log("📞 Starting call to:", friend.id);
    setCallState("calling");

    try {
      const localStream = await ensureLocalStream();
      const pc = createPeerConnection(friend.id);

      // add local tracks
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      console.log("🎙️ Local stream tracks added.");

      // create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("📤 Sending offer:", offer);

      // send offer via signaling server
      socket.emit("call:offer", {
        receiverId: friend.id,
        offer: pc.localDescription,
        meta: { username: user?.username, id: user?.id }
      });
      // waiting for answer...
    } catch (err) {
      console.error("❌ Failed to start call", err);
      closeCall();
      alert("Could not start call (microphone permission?).");
    }
  };

  // ---------------- Callee: accept incoming call ----------------
  const acceptCall = async () => {
    console.log("✅ Accepting call...");
    const pending = pendingOfferRef.current;
    if (!pending || !socket) return;
    setCallState("in-call");
    try {
      const localStream = await ensureLocalStream();
      const pc = createPeerConnection(pending.callerId);

      // add local tracks
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // set remote (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));
      console.log("📥 Remote description set with offer.");

      // create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("📤 Sending answer:", answer);

      // send answer back to caller
      socket.emit("call:answer", {
        callerId: pending.callerId,
        answer: pc.localDescription,
      });

      pendingOfferRef.current = null;
      setIncomingCaller(null);
    } catch (err) {
      console.error("❌ Accept call failed", err);
      closeCall();
    }
  };

  // ---------------- Callee: decline ----------------
  const declineCall = () => {
    console.log("🚫 Declining call...");
    const pending = pendingOfferRef.current;
    if (!pending || !socket) {
      setCallState("idle");
      pendingOfferRef.current = null;
      setIncomingCaller(null);
      return;
    }
    // notify caller
    socket.emit("call:reject", { callerId: pending.callerId });
    pendingOfferRef.current = null;
    setIncomingCaller(null);
    setCallState("idle");
  };

  // ---------------- Hangup (either side) ----------------
  const hangup = () => {
    console.log("📴 Hanging up...");
    // inform remote
    if (socket && pcRef.current) {
      // find remote id (friend.id or incomingCaller)
      const otherId = (callState === "ringing" && incomingCaller?.id) ? incomingCaller.id : friend?.id;
      if (otherId) socket.emit("call:hangup", { targetId: otherId });
    }
    closeCall();
  };

    // ---------------- WebRTC: helpers ----------------
  function createPeerConnection(targetId) {
    console.log("🔗 Creating PeerConnection with:", targetId);
    const pc = new RTCPeerConnection(PC_CONFIG);
    pcRef.current = pc;

    // when remote track arrives -> attach to audio element
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      console.log("🎧 Remote track received:", remoteStream);
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    };

    // ICE candidate -> send to other peer via socket
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket && targetId) {
        console.log("📤 Sending ICE candidate:", ev.candidate);
        socket.emit("call:ice-candidate", {
          targetId,
          candidate: ev.candidate,
        });
      }
    };

    return pc;
  }

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      console.log("🎙️ Requesting user media (mic/cam)...");
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = s;
      console.log("✅ Got local stream:", s);
      return s;
    } catch (err) {
      console.error("❌ getUserMedia error", err);
      throw err;
    }
  }

  function closeCall() {
    console.log("❌ Closing call, resetting state.");
    setCallState("idle");
    setIncomingCaller(null);
    // stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    // close pc
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }

  // Debugging logs
  console.log("👤 Friend:", friend);
  console.log("🔌 Socket:", socket);
  console.log("📡 CallState:", callState);
  console.log("📲 IncomingCaller:", incomingCaller);

  if (!friend) return <div>Loading chat...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #ddd", fontWeight: "bold" }}>
        <span>{friend.username}</span>
        <button onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>✖</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={startCall} disabled={!connected || callState !== "idle" || !friend}>🎙️ Voice Call</button>
        <button
          onClick={() => {
            openVideoModal(true); // mark as outgoing
            startCall();           // initiate the video call
          }}
          disabled={!connected || !friend}
        >
          🎥 Video Call
        </button>
        {callState === "in-call" && (
          <button onClick={hangup} style={{ backgroundColor: "red", color: "#fff" }}>End Call</button>
        )}
      </div>

      {callState === "ringing" && incomingCaller && (
      <div className="incoming-call-dropdown">
        <div className="incoming-call-name">
          Incoming call from
          <span>{incomingCaller.meta?.username || incomingCaller.id}</span>
        </div>
        <div className="incoming-call-actions">
          <button className="friend-request-btn accept" onClick={acceptCall}>Accept</button>
          <button className="friend-request-btn reject" onClick={declineCall}>Decline</button>
        </div>
      </div>
    )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${
              msg.sender_id === user.id ? "sent" : "received"
            }`}
          >
            <span className="chat-bubble">{msg.content}</span>
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
      
      {/* Video call modal */}
      {showVideoCall && (incomingCaller || callState === "in-call") && (
          <VideoCall
            currentUser={user}
            otherUserId={incomingCaller?.id || friend.id}
            socket={socket}
            onClose={closeVideoModal}
          />
      )}

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}