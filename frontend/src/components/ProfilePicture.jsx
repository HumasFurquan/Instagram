// src/components/ProfilePicture.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api";

export default function ProfilePicture({ user, authHeaders, onUpdateUser }) {
  const [profilePic, setProfilePic] = useState({
    url: user?.profile_picture_url || null,
    public_id: user?.profile_picture_public_id || null,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log("👤 ProfilePicture mounted. Current user:", user);
  }, [user]);

  // Open file dialog
  const triggerFileDialog = () => {
    if (fileInputRef.current) {
      console.log("📂 Triggering file input click...");
      fileInputRef.current.click();
    } else {
      console.warn("⚠️ File input ref is not set!");
    }
  };

  // Handle upload
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      console.warn("⚠️ No file selected");
      return;
    }
    console.log("📂 Selected file:", file.name);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post(
        `/users/${user.id}/profile-picture`,
        formData,
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Upload response:", res.data);

      setProfilePic({
        url: res.data.url,
        public_id: res.data.public_id,
      });

      // Update parent App state and localStorage
      if (onUpdateUser) {
        const updatedUser = {
          ...user,
          profile_picture_url: res.data.url,
          profile_picture_public_id: res.data.public_id,
        };
        onUpdateUser(updatedUser);
      }
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  }

  // Handle delete
  async function handleDelete() {
    try {
      if (!profilePic.public_id) {
        console.warn("⚠️ No public_id to delete");
        return;
      }

      await api.delete(`/users/${user.id}/profile-picture`, {
        headers: authHeaders(),
        data: { public_id: profilePic.public_id },
      });

      console.log("🗑️ Profile picture deleted");

      setProfilePic({ url: null, public_id: null });

      if (onUpdateUser) {
        const updatedUser = {
          ...user,
          profile_picture_url: null,
          profile_picture_public_id: null,
        };
        onUpdateUser(updatedUser);
      }
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: 16 }}>
      <h2>Profile</h2>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {profilePic.url ? (
        <>
          <img
            src={profilePic.url}
            alt="Profile"
            style={{ width: 100, height: 100, borderRadius: "50%" }}
          />
          <br />
          <button onClick={handleDelete} style={{ marginTop: 8 }}>
            Delete Profile Picture
          </button>
        </>
      ) : (
        <button onClick={triggerFileDialog}>Add Profile Picture</button>
      )}
    </div>
  );
}
