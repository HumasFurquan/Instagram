// src/components/VideoCall.jsx
import React, { useRef, useEffect, useState } from "react";

export default function VideoCall({ socket, currentUser, otherUserId, onClose }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [calling, setCalling] = useState(false);
  const [incomingFrom, setIncomingFrom] = useState(null);
  const [showIncomingPrompt, setShowIncomingPrompt] = useState(false);
  const [connected, setConnected] = useState(false);

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ],
  };

  useEffect(() => {
    if (!socket) {
        console.log("❌ VideoCall: socket not ready");
        return;
    }
    console.log("✅ VideoCall: socket ready, attaching listeners");

    // Incoming offer from another user
    socket.on("video:offer", ({ offer, callerId }) => {
      console.log("📞 VideoCall: incoming offer from", callerId);
      setIncomingFrom(callerId);
      setShowIncomingPrompt(true);
      window.__incomingOffer = { callerId, offer };
    });

    // Caller receives answer
    socket.on("video:answer", async ({ answer }) => {
      console.log("📤 VideoCall: received answer", answer);
      if (pcRef.current && answer) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setConnected(true);
      }
    });

    // ICE candidates
    socket.on("video:ice-candidate", async ({ candidate }) => {
        console.log("❄️ VideoCall: received ICE candidate", candidate);
      try {
        if (candidate && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    // Hangup
    socket.on("video:hangup", () => {
        console.log("📴 VideoCall: hangup received");
        cleanup();
    });

    // Rejected call
    socket.on("video:rejected", () => {
        console.log("🚫 VideoCall: call rejected");
      cleanup();
      alert("Call rejected or unavailable");
    });

    return () => {
        console.log("❌ VideoCall: cleaning up listeners");
      socket.off("video:offer");
      socket.off("video:answer");
      socket.off("video:ice-candidate");
      socket.off("video:hangup");
      socket.off("video:rejected");
      cleanup();
    };
    // eslint-disable-next-line
  }, [socket]);

  const createPeerAndStream = async () => {
    pcRef.current = new RTCPeerConnection(rtcConfig);

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("video:ice-candidate", {
          toUserId: otherUserId,
          fromUserId: currentUser.id,
          candidate: e.candidate,
        });
      }
    };

    pcRef.current.ontrack = (e) => {
        console.log("🎥 Remote track received:", e.streams[0].getTracks());
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log("🎬 Local stream tracks:", localStream.getTracks());
    
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

    localStream.getTracks().forEach((t) => pcRef.current.addTrack(t, localStream));
    return pcRef.current;
  };

  // Caller initiates
  const startCall = async () => {
    setCalling(true);
    const pc = await createPeerAndStream();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("video:offer", {
      toUserId: otherUserId,
      fromUserId: currentUser.id,
      offer: pc.localDescription,
    });
  };

  // Callee accepts
  const acceptCall = async () => {
    setShowIncomingPrompt(false);
    const { callerId, offer } = window.__incomingOffer || {};
    if (!callerId || !offer) return alert("No incoming offer found");

    const pc = await createPeerAndStream();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("video:answer", {
      toUserId: callerId,
      fromUserId: currentUser.id,
      answer: pc.localDescription,
    });

    setConnected(true);
    delete window.__incomingOffer;
  };

  const rejectCall = () => {
    const { callerId } = window.__incomingOffer || {};
    if (callerId) {
      socket.emit("video:reject", { toUserId: callerId, fromUserId: currentUser.id });
    }
    setShowIncomingPrompt(false);
    delete window.__incomingOffer;
  };

  const hangup = () => {
    if (socket) {
      socket.emit("video:hangup", { toUserId: otherUserId, fromUserId: currentUser.id });
    }
    cleanup();
    if (onClose) onClose();
  };

  function cleanup() {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setCalling(false);
      setConnected(false);
      setIncomingFrom(null);
      setShowIncomingPrompt(false);
      delete window.__incomingOffer;
    } catch (err) {
      console.warn("cleanup error", err);
    }
  }

  return (
    <div className="video-call-container">
      {showIncomingPrompt && (
        <div className="incoming-prompt">
          <p>Incoming video call from user {incomingFrom}</p>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}

      {!calling && !showIncomingPrompt && (
        <button onClick={startCall}>Start Video Call</button>
      )}

      {(calling || connected || showIncomingPrompt) && (
        <div className="videos">
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 160 }} />
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 320 }} />
          <div>
            <button onClick={hangup}>Hang up</button>
          </div>
        </div>
      )}
    </div>
  );
}
