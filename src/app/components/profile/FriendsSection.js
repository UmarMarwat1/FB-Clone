"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./FriendsSection.module.css";

export default function FriendsSection({ userId, currentUserId, isOwner, compact = false }) {
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Fetching friends data for userId:", userId);

      const [friendsRes, followersRes, followingRes] = await Promise.all([
        fetch(`/api/friends/${userId}`),
        fetch(`/api/followers/${userId}`),
        fetch(`/api/following/${userId}`)
      ]);

      console.log("Response status - Friends:", friendsRes.status, "Followers:", followersRes.status, "Following:", followingRes.status);

      const [friendsData, followersData, followingData] = await Promise.all([
        friendsRes.json(),
        followersRes.json(),
        followingRes.json()
      ]);

      console.log("Friends data:", friendsData);
      console.log("Followers data:", followersData);
      console.log("Following data:", followingData);

      if (friendsData.success) setFriends(friendsData.friends);
      if (followersData.success) setFollowers(followersData.followers);
      if (followingData.success) setFollowing(followingData.following);

      if (!friendsData.success) {
        console.error("Friends fetch failed:", friendsData.error);
      }

    } catch (err) {
      console.error("Error fetching friends data:", err);
      setError("Failed to load friends data");
    } finally {
      setLoading(false);
    }
  };

  const handleFriendAction = async (targetUserId, action) => {
    if (!currentUserId) return;

    try {
      let endpoint = "";
      let method = "POST";
      let body = {};

      switch (action) {
        case "add_friend":
          endpoint = "/api/friend-requests";
          body = { senderId: currentUserId, receiverId: targetUserId };
          break;
        case "remove_friend":
          endpoint = "/api/friends/remove";
          method = "DELETE";
          body = { userId: currentUserId, friendId: targetUserId };
          break;
        case "follow":
          endpoint = "/api/follow";
          body = { followerId: currentUserId, followingId: targetUserId };
          break;
        case "unfollow":
          endpoint = "/api/follow";
          method = "DELETE";
          body = { followerId: currentUserId, followingId: targetUserId };
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh the data
        fetchAllData();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Friend action error:", error);
      alert("Action failed");
    }
  };

  const renderUserCard = (user, relationship) => {
    const isSelf = currentUserId === user.id;
    
    return (
      <div key={user.id} className={styles.userCard}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image 
                src={user.avatar_url} 
                alt="Avatar" 
                width={50}
                height={50}
                className={styles.avatar} 
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {user.full_name?.charAt(0) || user.username?.charAt(0) || "?"}
              </div>
            )}
          </div>
          
          <div className={styles.userDetails}>
            <h4 className={styles.userName}>{user.full_name || "Unknown User"}</h4>
            <p className={styles.userHandle}>@{user.username}</p>
            {user.mutual_friends && (
              <p className={styles.mutualFriends}>
                {user.mutual_friends} mutual friends
              </p>
            )}
          </div>
        </div>

        {!isSelf && currentUserId && (
          <div className={styles.actionButtons}>
            {relationship === "friend" ? (
              <>
                <button 
                  className={styles.messageBtn}
                  onClick={() => {/* Navigate to message */}}
                >
                  Message
                </button>
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleFriendAction(user.id, "remove_friend")}
                >
                  Remove
                </button>
              </>
            ) : relationship === "following" ? (
              <button 
                className={styles.unfollowBtn}
                onClick={() => handleFriendAction(user.id, "unfollow")}
              >
                Unfollow
              </button>
            ) : relationship === "follower" ? (
              <button 
                className={styles.followBtn}
                onClick={() => handleFriendAction(user.id, "follow")}
              >
                Follow Back
              </button>
            ) : (
              <button 
                className={styles.addFriendBtn}
                onClick={() => handleFriendAction(user.id, "add_friend")}
              >
                Add Friend
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const getCurrentList = () => {
    switch (activeTab) {
      case "friends":
        return friends;
      case "followers":
        return followers;
      case "following":
        return following;
      default:
        return [];
    }
  };

  const getCurrentRelationship = () => {
    switch (activeTab) {
      case "friends":
        return "friend";
      case "followers":
        return "follower";
      case "following":
        return "following";
      default:
        return "none";
    }
  };

  // Render compact version for left column
  if (compact) {
    if (loading) {
      return (
        <div className={`${styles.friendsContainer} ${styles.compact}`}>
          <div className={styles.sectionHeader}>
            <h3>Friends</h3>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`${styles.friendsContainer} ${styles.compact}`}>
          <div className={styles.sectionHeader}>
            <h3>Friends</h3>
          </div>
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${styles.friendsContainer} ${styles.compact}`}>
        <div className={styles.sectionHeader}>
          <h3>Friends</h3>
          {isOwner && (
            <button className={styles.addFriendBtn}>
              + Add Friends
            </button>
          )}
        </div>
        
        {friends.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p>No friends yet</p>
          </div>
        ) : (
          <div className={styles.compactFriendsGrid}>
            {friends.slice(0, 6).map((friend) => (
              <div key={friend.id} className={styles.compactFriendItem}>
                <Image 
                  src={friend.avatar_url || "/default-avatar.png"} 
                  alt={friend.full_name || friend.username} 
                  width={40}
                  height={40}
                  className={styles.compactFriendAvatar}
                />
                <span className={styles.compactFriendName}>
                  {friend.full_name || friend.username}
                </span>
              </div>
            ))}
            {friends.length > 6 && (
              <div className={styles.moreFriends}>
                <span>+{friends.length - 6} more</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading friends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={fetchAllData} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  const currentList = getCurrentList();
  const relationship = getCurrentRelationship();

  return (
    <div className={styles.friendsContainer}>
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tab} ${activeTab === "friends" ? styles.active : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          Friends ({friends.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "followers" ? styles.active : ""}`}
          onClick={() => setActiveTab("followers")}
        >
          Followers ({followers.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "following" ? styles.active : ""}`}
          onClick={() => setActiveTab("following")}
        >
          Following ({following.length})
        </button>
      </div>

      <div className={styles.friendsList}>
        {currentList.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h3>No {activeTab} yet</h3>
            <p>
              {isOwner 
                ? `You don't have any ${activeTab} yet.`
                : `This user doesn't have any ${activeTab} yet.`
              }
            </p>
          </div>
        ) : (
          <div className={styles.usersGrid}>
            {currentList.map(user => renderUserCard(user, relationship))}
          </div>
        )}
      </div>
    </div>
  );
}
