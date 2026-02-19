// src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket; // singleton socket

export default function useSocket(handlers = {}, token) {
  const socketRef = useRef(null);

  useEffect(() => {
    const URL =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_BASE ||
      'http://localhost:5000';

    // If no token, disconnect existing socket and return
    if (!token) {
      if (socket) {
        console.log('🔌 Disconnecting socket due to missing token');
        socket.disconnect();
        socket = null;
      }
      return;
    }

    // Only create socket if it doesn't exist
    if (!socket) {
      socket = io(URL, {
        withCredentials: true,      // required for cookies/auth
        transports: ['websocket'],  // force websocket
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000,
        auth: { token },             // send token for server auth
      });

      socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
      socket.on('connect_error', (err) => console.error('❌ Socket connection error:', err));
      socket.on('disconnect', (reason) => console.log('⚡ Socket disconnected:', reason));
    }

    socketRef.current = socket;

    // Register all handlers
    if (handlers.onNewPost) socket.on('new_post', handlers.onNewPost);
    if (handlers.onPostLiked) socket.on('post_liked', handlers.onPostLiked);
    if (handlers.onPostUnliked) socket.on('post_unliked', handlers.onPostUnliked);
    if (handlers.onNewComment) socket.on('new_comment', handlers.onNewComment);
    if (handlers.onPostViewed) socket.on('post_viewed', handlers.onPostViewed);
    if (handlers.onFollowUpdated) socket.on('follow_updated', handlers.onFollowUpdated);
    if (handlers.onUserFollowed) socket.on('user_followed', handlers.onUserFollowed);
    if (handlers.onUserUnfollowed) socket.on('user_unfollowed', handlers.onUserUnfollowed);

    return () => {
      // Remove handlers to prevent duplicates
      if (!socket) return;
      if (handlers.onNewPost) socket.off('new_post', handlers.onNewPost);
      if (handlers.onPostLiked) socket.off('post_liked', handlers.onPostLiked);
      if (handlers.onPostUnliked) socket.off('post_unliked', handlers.onPostUnliked);
      if (handlers.onNewComment) socket.off('new_comment', handlers.onNewComment);
      if (handlers.onPostViewed) socket.off('post_viewed', handlers.onPostViewed);
      if (handlers.onFollowUpdated) socket.off('follow_updated', handlers.onFollowUpdated);
      if (handlers.onUserFollowed) socket.off('user_followed', handlers.onUserFollowed);
      if (handlers.onUserUnfollowed) socket.off('user_unfollowed', handlers.onUserUnfollowed);
      // DO NOT disconnect here; handled on token change
    };
  }, [token]); // ✅ reconnect whenever token changes

  return socketRef.current;
}