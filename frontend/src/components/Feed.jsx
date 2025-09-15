// src/components/Feed.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import useSocket from "../hooks/useSocket";
import PostItem from "./PostItem";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  useSocket({
    onNewPost: newPost => {
      setPosts(prev => [newPost, ...prev]);
    },
    // when a like happens on server, it emits post_liked { postId, userId }
    onPostLiked: ({ postId, userId }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                // only set liked=true for the client that actually performed the like
                liked: user?.id === userId ? true : p.liked
              }
            : p
        )
      );
    },
    onPostUnliked: ({ postId, userId }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                liked: user?.id === userId ? false : p.liked
              }
            : p
        )
      );
    },
    onNewComment: ({ postId, comment }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: [comment, ...(p.comments || [])], comments_count: (p.comments_count || 0) + 1 }
            : p
        )
      );
    },
    onPostViewed: ({ postId }) => {
      // optional real-time view reaction (not changing like behavior)
      // left intentionally minimal since you didn't ask to change views UI here
    }
  });

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.get("/posts", { headers: authHeaders() });
      const serverPosts = (res.data || []).map(p => ({
        ...p,
        // ensure liked exists
        liked: !!p.liked,
        comments: p.comments || [],
        comments_count: p.comments_count || 0,
        views_count: p.views_count || 0
        // NOTE: intentionally not using likes_count per your request
      }));
      setPosts(serverPosts);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Feed {loading && "— loading..."}</h2>
      {posts.map(p => (
        <PostItem key={p.id} post={p} user={user} authHeaders={authHeaders} />
      ))}
      {posts.length === 0 && !loading && <div>No posts yet.</div>}
    </div>
  );
}
