import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket({ onNewPost, onPostLiked, onPostUnliked, onNewComment, onPostViewed }) {
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io("http://localhost:5000"); // replace with your backend URL

    if (onNewPost) socket.current.on("new_post", onNewPost);
    if (onPostLiked) socket.current.on("post_liked", onPostLiked);
    if (onPostUnliked) socket.current.on("post_unliked", onPostUnliked);
    if (onNewComment) socket.current.on("new_comment", onNewComment);
    if (onPostViewed) socket.current.on("post_viewed", onPostViewed);

    return () => {
      socket.current.disconnect();
    };
  }, []);

  return socket.current;
}
