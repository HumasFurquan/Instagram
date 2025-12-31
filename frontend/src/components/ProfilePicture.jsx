// src/components/ProfilePicture.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api";
import "./ProfilePicture.css";

export default function ProfilePicture({ user, authHeaders, onUpdateUser }) {
  const [profilePic, setProfilePic] = useState({
    url: user?.profile_picture_url || null,
    public_id: user?.profile_picture_public_id || null,
  });

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Log mount
  useEffect(() => {
    console.log("👤 ProfilePicture mounted. Current user:", user);
  }, [user]);

  // Trigger file dialog
  const triggerFileDialog = () => {
    if (fileInputRef.current) {
      console.log("📂 Opening file selector...");
      fileInputRef.current.click();
    } else {
      console.warn("⚠️ File input reference not found.");
    }
  };

  // Upload handler
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      console.warn("⚠️ No file selected.");
      return;
    }

    console.log("📂 Selected file:", file.name);
    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);

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

      console.log("✅ Upload successful:", res.data);

      const updated = {
        url: res.data.url,
        public_id: res.data.public_id,
      };

      setProfilePic(updated);
      alert("✅ Profile picture updated!");

      // Update parent user state
      if (onUpdateUser) {
        const updatedUser = {
          ...user,
          profile_picture_url: updated.url,
          profile_picture_public_id: updated.public_id,
        };
        onUpdateUser(updatedUser);
      }
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!profilePic.public_id) {
      console.warn("⚠️ No Cloudinary public_id found for deletion.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete your profile picture?"))
      return;

    setLoading(true);

    try {
      await api.delete(`/users/${user.id}/profile-picture`, {
        headers: authHeaders(),
        data: { public_id: profilePic.public_id },
      });

      console.log("🗑️ Profile picture deleted.");

      setProfilePic({ url: null, public_id: null });
      alert("🗑️ Profile picture deleted!");

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
      alert("Failed to delete profile picture.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-picture-container">
      <div className="profile-picture-header">
        {!profilePic.url && (
          <i className="fa-solid fa-user-circle"></i>
        )}
        {/* <span>Profile Picture</span> */}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="profile-file-input"
      />

      {profilePic.url ? (
        <>
        <div className="profile-picture-wrapper">
            <img src={profilePic.url} alt="Profile" />
            <div
              className="profile-picture-overlay"
              onClick={triggerFileDialog}
            >
              <i className="fa-solid fa-camera"></i>
            </div>
        </div>

          <button
            className="profile-btn delete"
            onClick={handleDelete}
            disabled={loading}
          >
            <i className="fa-solid fa-trash"></i>
            {loading ? "Deleting..." : "Remove"}
          </button>
        </>
      ) : (
        <button
          className="profile-btn add"
          onClick={triggerFileDialog}
          disabled={loading}
        >
          <i className="fa-solid fa-plus"></i>
          {loading ? "Uploading..." : "Add Picture"}
        </button>
      )}
    </div>
  );
}
