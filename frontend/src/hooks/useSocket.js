// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket({ onNewPost, onPostLiked, onPostUnliked, onNewComment, onPostViewed } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    // use env base URL or fallback
    const URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    socketRef.current = io(URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      console.log("socket connected", socketRef.current.id);
    });
    socketRef.current.on("disconnect", () => {
      console.log("socket disconnected");
    });

    if (onNewPost) socketRef.current.on("new_post", onNewPost);
    if (onPostLiked) socketRef.current.on("post_liked", onPostLiked);
    if (onPostUnliked) socketRef.current.on("post_unliked", onPostUnliked);
    if (onNewComment) socketRef.current.on("new_comment", onNewComment);
    if (onPostViewed) socketRef.current.on("post_viewed", onPostViewed);

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  return socketRef.current;
}
