"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getFriends } from "../../../../lib/supabaseCLient";
import { useMessagingIntegration } from "../messaging/hooks/useMessagingIntegration";
import styles from "./FriendsSection.module.css";

export default function FriendsSection({ userId, currentUserId, isOwner, compact = false, mobile = false }) {
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Messaging integration
  const { startChatWithFriend } = useMessagingIntegration();

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Fetching friends data for userId:", userId);

      // Use the working getFriends function for friends
      const friendsData = await getFriends(userId);
      console.log("Friends data from getFriends:", friendsData);

      if (friendsData && Array.isArray(friendsData)) {
        // Transform the data to match the expected format
        const transformedFriends = friendsData.map(friendship => {
          // Get the other user's profile from the friendship
          const otherUser = friendship.user1_id === userId ? friendship.user2 : friendship.user1;
          console.log("Processing friendship:", friendship, "Other user:", otherUser);
          return {
            id: otherUser?.id || (friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id),
            username: otherUser?.username || 'Unknown User',
            full_name: otherUser?.full_name || 'Unknown User',
            avatar_url: otherUser?.avatar_url || null
          };
        });
        console.log("Transformed friends:", transformedFriends);
        setFriends(transformedFriends);
      } else {
        console.log("No friends data or invalid format:", friendsData);
        setFriends([]);
      }

      // Fetch followers and following using the working API endpoints
      try {
        const [followersRes, followingRes] = await Promise.all([
          fetch(`/api/followers/${userId}`),
          fetch(`/api/following/${userId}`)
        ]);

        const [followersData, followingData] = await Promise.all([
          followersRes.json(),
          followingRes.json()
        ]);

        console.log("Followers data:", followersData);
        console.log("Following data:", followingData);

        if (followersData.success) setFollowers(followersData.followers);
        if (followingData.success) setFollowing(followingData.following);

      } catch (followError) {
        console.error("Error fetching followers/following:", followError);
        // Set empty arrays for followers/following if there's an error
        setFollowers([]);
        setFollowing([]);
      }

    } catch (err) {
      console.error("Error fetching friends data:", err);
      setError("Failed to load friends data");
      setFriends([]);
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
                  onClick={async () => {
                    try {
                      // Create a user object with the required properties
                      const userForChat = {
                        id: user.id,
                        username: user.username,
                        full_name: user.full_name,
                        avatar_url: user.avatar_url
                      };
                      await startChatWithFriend(userForChat);
                      // The messaging system will handle opening the chat
                    } catch (error) {
                      console.error('Error starting chat:', error);
                      alert('Failed to start chat. Please try again.');
                    }
                  }}
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
        <div className={`${styles.friendsContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
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
        <div className={`${styles.friendsContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
          <div className={styles.sectionHeader}>
            <h3>Friends</h3>
          </div>
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    // Debug info - remove this after testing
    console.log("Rendering compact friends section with:", { friends, userId, isOwner });

    return (
      <div className={`${styles.friendsContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
        <div className={styles.sectionHeader}>
          <h3>Friends</h3>
          {isOwner && (
            <button className={styles.addFriendBtn}>
              <span className={styles.addFriendIcon}>+</span>
              Add Friend
            </button>
          )}
          {/* Test button - remove after testing */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={() => {
                console.log("Testing getFriends function...");
                fetchAllData();
              }}
              style={{ 
                background: '#ff6b6b', 
                color: 'white', 
                border: 'none', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Test Fetch
            </button>
          )}
        </div>
        
        {/* Debug info - remove after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ padding: '8px', fontSize: '12px', color: '#666', background: '#f0f0f0', margin: '8px' }}>
            Debug: {friends.length} friends found for user {userId}
          </div>
        )}
        
        {friends.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>👥</div>
            <p>No friends yet</p>
            {isOwner && (
              <button className={styles.addFriendBtn}>
                <span className={styles.addFriendIcon}>+</span>
                Find Friends
              </button>
            )}
          </div>
        ) : (
          <div className={styles.friendsGrid}>
            {friends.slice(0, 6).map(friend => (
              <div key={friend.id} className={styles.friendItem}>
                <div className={styles.friendAvatar}>
                  {friend.avatar_url ? (
                    <Image 
                      src={friend.avatar_url} 
                      alt={friend.full_name || friend.username} 
                      width={60}
                      height={60}
                      className={styles.avatarImage}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {(friend.full_name || friend.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.friendInfo}>
                  <h4 className={styles.friendName}>{friend.full_name || friend.username}</h4>
                  <p className={styles.friendStatus}>Friend</p>
                </div>
              </div>
            ))}
            {friends.length > 6 && (
              <div className={styles.friendsMore}>
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
