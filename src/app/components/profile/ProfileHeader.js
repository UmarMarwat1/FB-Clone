"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession } from "../../../../lib/supabaseCLient";
import styles from "./ProfileHeader.module.css";

export default function ProfileHeader({ profile, currentUserId, isOwner, onUpdate }) {
  const router = useRouter();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [success, setSuccess] = useState("");
  
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Check if current user is following this profile
  useState(() => {
    async function checkFollowStatus() {
      if (!currentUserId || isOwner) return;
      
      try {
        const response = await fetch(`/api/follow/status?followerId=${currentUserId}&followingId=${profile.id}`);
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    }
    
    checkFollowStatus();
  }, [currentUserId, profile.id, isOwner]);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("Starting avatar upload for file:", file.name, "size:", file.size, "type:", file.type);

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", profile.id);
      formData.append("type", "avatar");

      // Get the current session to include access token in request
      const session = await getCurrentSession();
      
      console.log("Uploading to /api/profile/upload with userId:", profile.id);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      console.log("Upload response status:", response.status);
      const data = await response.json();
      console.log("Upload response data:", data);

      if (data.success) {
        onUpdate({ ...profile, avatar_url: data.url });
        setSuccess("Profile picture updated successfully!");
      } else {
        console.error("Avatar upload failed:", data);
        alert(`Failed to upload avatar: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Failed to upload avatar: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("Starting cover upload for file:", file.name, "size:", file.size, "type:", file.type);

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", profile.id);
      formData.append("type", "cover");

      // Get the current session to include access token in request
      const session = await getCurrentSession();
      
      console.log("Uploading cover to /api/profile/upload with userId:", profile.id);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      console.log("Cover upload response status:", response.status);
      const data = await response.json();
      console.log("Cover upload response data:", data);

      if (data.success) {
        onUpdate({ ...profile, cover_url: data.url });
        setSuccess("Cover photo updated successfully!");
      } else {
        console.error("Cover upload failed:", data);
        alert(`Failed to upload cover photo: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Cover upload error:", error);
      alert("Failed to upload cover photo: " + error.message);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || isOwner) return;

    setIsFollowLoading(true);
    try {
      const method = isFollowing ? "DELETE" : "POST";
      const response = await fetch("/api/follow", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followerId: currentUserId,
          followingId: profile.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
        // Optionally update follower count in parent component
        const newCount = isFollowing 
          ? (profile.followers_count || 0) - 1 
          : (profile.followers_count || 0) + 1;
        onUpdate({ ...profile, followers_count: newCount });
      } else {
        alert("Failed to update follow status");
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
      alert("Failed to update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const getFollowButtonText = () => {
    if (isFollowLoading) return "Loading...";
    return isFollowing ? "Unfollow" : "Follow";
  };

  return (
    <div className={styles.profileHeader}>
      {success && (
        <div className={styles.successMessage}>
          {success}
          <button onClick={() => setSuccess("")} className={styles.closeBtn}>×</button>
        </div>
      )}
      {/* Cover Photo */}
      <div className={styles.coverContainer}>
        {profile.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className={styles.coverPhoto}
          />
        ) : (
          <div className={styles.coverPlaceholder}>
            <span>No cover photo</span>
          </div>
        )}
        
        {isOwner && (
                        <button 
                className={styles.coverUploadBtn}
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
              >
                📷 {isUploadingCover ? "Uploading..." : "Edit cover photo"}
              </button>
        )}
        
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          style={{ display: "none" }}
        />
      </div>

      {/* Profile Info */}
      <div className={styles.profileInfo}>
        <div className={styles.avatarContainer}>
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="Avatar" 
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.full_name?.charAt(0) || profile.username?.charAt(0) || "?"}
            </div>
          )}
          
          {isOwner && (
            <button 
              className={styles.avatarUploadBtn}
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "..." : "📷"}
            </button>
          )}
          
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: "none" }}
          />
        </div>

        <div className={styles.userDetails}>
          <h1 className={styles.fullName}>
            {profile.full_name || "Unknown User"}
          </h1>
          <p className={styles.username}>@{profile.username}</p>
          
          {profile.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}

          <div className={styles.userStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{profile.posts_count || 0}</span> <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.stat}>
              • <span className={styles.statNumber}>{profile.friends_count || 0}</span> <span className={styles.statLabel}>friends</span>
            </div>
            <div className={styles.stat}>
              • <span className={styles.statNumber}>{profile.followers_count || 0}</span> <span className={styles.statLabel}>followers</span>
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          {isOwner ? (
            <button 
              className={styles.editProfileBtn}
              onClick={() => router.push("/profile/edit")}
            >
              Edit Profile
            </button>
          ) : currentUserId ? (
            <>
              <button 
                className={`${styles.followBtn} ${isFollowing ? styles.following : ""}`}
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
              >
                {getFollowButtonText()}
              </button>
              <button className={styles.messageBtn}>
                Message
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
