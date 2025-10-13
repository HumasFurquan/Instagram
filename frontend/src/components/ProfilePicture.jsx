// src/components/ProfilePicture.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api";

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
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <h2>👤 Profile Picture</h2>

      {/* Hidden File Input */}
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
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #007bff",
            }}
          />
          <br />
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: loading ? "#aaa" : "#dc3545",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Deleting..." : "Delete Picture"}
          </button>
        </>
      ) : (
        <button
          onClick={triggerFileDialog}
          disabled={loading}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#007bff",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 10,
          }}
        >
          {loading ? "Uploading..." : "Add Profile Picture"}
        </button>
      )}
    </div>
  );
}
