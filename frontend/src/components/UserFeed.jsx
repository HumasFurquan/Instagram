// src/components/UserFeed.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import PostItem from './PostItem';
import useSocket from '../hooks/useSocket';

export default function UserFeed({ user, authHeaders }) {
  const { userId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // ---------------- State for friends ----------------
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]); // requests received
  const [sentRequests, setSentRequests] = useState([]);       // requests sent

  // ---------------- Socket handlers ----------------
  useSocket({
    onPostLiked: ({ postId, likes_count, userId: actorId }) =>
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count, liked: actorId === user?.id ? true : p.liked }
            : p
        )
      ),
    onPostUnliked: ({ postId, likes_count, userId: actorId }) =>
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count, liked: actorId === user?.id ? false : p.liked }
            : p
        )
      ),
    onNewComment: ({ postId, comment }) => {
      const normalizedComment = {
        id: comment.id,
        user_id: comment.user_id,
        username: comment.username || comment.user?.username,
        text: comment.text,
        created_at: comment.created_at,
      };
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: [normalizedComment, ...(p.comments || [])],
                comments_count: (p.comments_count || 0) + 1,
              }
            : p
        )
      );
    },
    onNewPost: newPost => {
      if (Number(newPost.user_id) === Number(userId)) {
        const normalized = normalizePost(newPost, userProfile);
        normalized.is_following_author = friendsList?.includes(normalized.user_id);
        setPosts(prev => [normalized, ...prev]);
      }
    },
    onPostViewed: ({ postId, views_count }) =>
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, views_count } : p))
      ),
    onUserFollowed: ({ followerId, followeeId }) => {
      if (Number(followerId) !== Number(user.id)) return;
      setPosts(prev =>
        prev.map(p =>
          p.user_id === followeeId
            ? { ...p, is_following_author: true }
            : p
        )
      );
    },
    onUserUnfollowed: ({ followerId, followeeId }) => {
      if (Number(followerId) !== Number(user.id)) return;
      setPosts(prev =>
        prev.map(p =>
          p.user_id === followeeId
            ? { ...p, is_following_author: false }
            : p
        )
      );
    },
  });

  // ---------------- Load user profile, posts, and friends ----------------
  useEffect(() => {
    async function fetchUserAndPosts() {
      try {
        // 1️⃣ Fetch user profile
        const userRes = await api.get(`/users/${userId}`, { headers: authHeaders() });
        setUserProfile(userRes.data);

        // 2️⃣ Fetch user's posts
        const postsRes = await api.get(`/posts/user/${userId}`, { headers: authHeaders() });
        const serverPosts = (postsRes.data || []).map(p =>
          normalizePost(p, userRes.data)
        );
        setPosts(serverPosts);

        // 3️⃣ Fetch my friends, pending requests, and sent requests
        const friendsRes = await api.get(`/friends`, { headers: authHeaders() });
        const pendingRes = await api.get(`/friends/requests`, { headers: authHeaders() });
        const sentRes = await api.get(`/friends/sent`, { headers: authHeaders() });

        setFriendsList(friendsRes.data.map(f => f.id));
        setPendingRequests(pendingRes.data.map(r => r.sender_id)); // requests received
        setSentRequests(sentRes.data.map(r => r.receiver_id));     // requests sent
      } catch (err) {
        console.error('Failed to fetch user, posts, or friends', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserAndPosts();
  }, [userId, authHeaders]);

  // ---------------- Normalize post ----------------
  function normalizePost(post, fallbackUserProfile) {
    return {
      ...post,
      image_url: post.image_url ?? null,  // ✅ add this
      likes_count: post.likes_count ?? 0,
      views_count: post.views_count ?? 0,
      comments_count: post.comments_count ?? 0,
      liked: !!post.liked,
      comments: post.comments || [],
      user_id: post.user_id,
      is_following_author: post.is_following_author ?? false,
      profile_picture_url:
        post.profile_picture_url ??
        post.user?.profile_picture_url ??
        fallbackUserProfile?.profile_picture_url ??
        null,
    };
  }

  // ---------------- Follow toggle ----------------
  async function toggleFollow(targetUserId) {
    if (!user) return alert('Please login to follow users.');

    const isCurrentlyFollowing = posts.find(p => p.user_id === targetUserId)?.is_following_author;

    setPosts(prev =>
      prev.map(p =>
        p.user_id === targetUserId
          ? { ...p, is_following_author: !isCurrentlyFollowing }
          : p
      )
    );

    try {
      if (!isCurrentlyFollowing) {
        await api.post(`/follows/${targetUserId}`, {}, { headers: authHeaders() });
      } else {
        await api.delete(`/follows/${targetUserId}`, { headers: authHeaders() });
      }
    } catch (err) {
      setPosts(prev =>
        prev.map(p =>
          p.user_id === targetUserId
            ? { ...p, is_following_author: isCurrentlyFollowing }
            : p
        )
      );
      alert('Could not update follow status. Please try again.');
    }
  }

  // ---------------- Render ----------------
  return (
    <div>
      <h2>User Posts {loading && '— loading...'}</h2>
      {!loading && posts.length === 0 && <div>No posts yet.</div>}
      {posts.map(p => (
        <PostItem
          key={p.id}
          post={p}
          user={user}
          authHeaders={authHeaders}
          toggleFollow={toggleFollow}
          friendsList={friendsList}          
          pendingRequests={pendingRequests}  
          sentRequests={sentRequests}       // ✅ pass sent requests
          onDelete={(postId) => {
            setPosts(prev => prev.filter(post => post.id !== postId));
          }} // ✅ pass delete handler
        />
      ))}
    </div>
  );
}
