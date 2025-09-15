// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket(handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    socketRef.current = io(URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => console.log("socket connected", socketRef.current.id));
    socketRef.current.on("disconnect", () => console.log("socket disconnected"));

    if (handlers.onNewPost) socketRef.current.on("new_post", handlers.onNewPost);
    if (handlers.onPostLiked) socketRef.current.on("post_liked", handlers.onPostLiked);
    if (handlers.onPostUnliked) socketRef.current.on("post_unliked", handlers.onPostUnliked);
    if (handlers.onNewComment) socketRef.current.on("new_comment", handlers.onNewComment);
    if (handlers.onPostViewed) socketRef.current.on("post_viewed", handlers.onPostViewed);

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  return socketRef.current;
}
