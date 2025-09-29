// src/components/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

const PC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function ChatWindow({ user, authHeaders, socket }) {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ---- WebRTC call state ----
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, in-call
  const [incomingCaller, setIncomingCaller] = useState(null);

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
    if (!newMessage.trim() || !socket || !friend) return;

    socket.emit('sendMessage', { 
        receiverId: friend.id, 
        content: newMessage 
    });

    setNewMessage(""); // clear input
    };

    useEffect(() => {
    if (!socket) return;

    // Incoming offer (someone is calling you)
    const handleOffer = async ({ offer, callerId, meta }) => {
      // If the incoming is not for current chat friend, ignore (or optionally notify)
      if (Number(callerId) !== Number(friendId)) {
        // optional global incoming-call UI
        return;
      }

      // Save offer and show accept UI
      pendingOfferRef.current = { offer, callerId, meta };
      setIncomingCaller({ id: callerId, meta });
      setCallState("ringing");
    };

    const handleAnswer = async ({ answer, calleeId }) => {
      // if caller (we initiated), set remote description
      if (pcRef.current && answer) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState("in-call");
        } catch (err) {
          console.error("Error setting remote description (answer)", err);
        }
      }
    };

    const handleIce = async ({ candidate, fromId }) => {
      if (!pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error adding ICE candidate", err);
      }
    };

    const handleHangup = ({ fromId }) => {
      // end call
      closeCall();
      // optionally show a 'call ended' message
    };

    const handleRejected = ({ fromId }) => {
      // callee rejected
      closeCall();
      alert("Call was rejected.");
    };

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
  }, [socket, friendId]);

  // ---------------- Caller: start call ----------------
  const startCall = async () => {
    if (!socket || !friend) return alert("Socket or friend not ready.");
    setCallState("calling");

    try {
      const localStream = await ensureLocalStream();
      const pc = createPeerConnection(friend.id);

      // add local tracks
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // send offer via signaling server
      socket.emit("call:offer", {
        receiverId: friend.id,
        offer: pc.localDescription,
        meta: { username: user?.username, id: user?.id }
      });
      // waiting for answer...
    } catch (err) {
      console.error("Failed to start call", err);
      closeCall();
      alert("Could not start call (microphone permission?).");
    }
  };

  // ---------------- Callee: accept incoming call ----------------
  const acceptCall = async () => {
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

      // create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // send answer back to caller
      socket.emit("call:answer", {
        callerId: pending.callerId,
        answer: pc.localDescription,
      });

      pendingOfferRef.current = null;
      setIncomingCaller(null);
    } catch (err) {
      console.error("Accept call failed", err);
      closeCall();
    }
  };

  // ---------------- Callee: decline ----------------
  const declineCall = () => {
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
    const pc = new RTCPeerConnection(PC_CONFIG);
    pcRef.current = pc;

    // when remote track arrives -> attach to audio element
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    };

    // ICE candidate -> send to other peer via socket
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket && targetId) {
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
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = s;
      return s;
    } catch (err) {
      console.error("getUserMedia error", err);
      throw err;
    }
  }

  function closeCall() {
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

  if (!friend) return <div>Loading chat...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #ddd", fontWeight: "bold" }}>
        <span>{friend.username}</span>
        <button onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>✖</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={startCall} disabled={callState !== "idle" || !friend || !socket}>🎙️ Voice Call</button>
        {callState === "in-call" && (
          <button onClick={hangup} style={{ backgroundColor: "red", color: "#fff" }}>End Call</button>
        )}
      </div>

      {callState === "ringing" && incomingCaller && (
        <div style={{ padding: 12, background: "#ffeeba", display: "flex", justifyContent: "space-between" }}>
          <div>Incoming call from <b>{incomingCaller.meta?.username || incomingCaller.id}</b></div>
          <div>
            <button onClick={acceptCall}>Accept</button>
            <button onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}

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
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}