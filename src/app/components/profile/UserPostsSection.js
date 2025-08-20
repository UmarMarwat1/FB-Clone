"use client";
import { useState, useEffect } from "react";
import PostCard from "../../feed/components/PostCard";
import styles from "./UserPostsSection.module.css";

export default function UserPostsSection({ userId, isOwner, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchPosts(1, true);
  }, [userId]);

  const fetchPosts = async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      console.log("Fetching posts for userId:", userId, "page:", pageNum);

      const response = await fetch(`/api/posts/user/${userId}?page=${pageNum}&limit=10`);
      console.log("Posts response status:", response.status);
      
      const data = await response.json();
      console.log("Posts data:", data);

      if (!data.success) {
        console.error("Posts fetch failed:", data.error);
        setError(data.error || "Failed to load posts");
        return;
      }

      if (reset) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);

    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, false);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const handlePostCreatorClick = () => {
    // This will be implemented later when we add post creation functionality
    console.log("Post creator clicked");
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => fetchPosts(1, true)} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.postsContainer}>
      {/* Post Creator Section */}
      {isOwner && (
        <div className={styles.postCreator}>
          <div className={styles.postCreatorHeader}>
            <img 
              src={currentUser?.avatar_url || "/default-avatar.png"} 
              alt="Profile" 
              className={styles.postCreatorAvatar}
            />
            <input
              type="text"
              placeholder="What's on your mind?"
              className={styles.postCreatorInput}
              onClick={handlePostCreatorClick}
              readOnly
            />
          </div>
          <div className={styles.postCreatorActions}>
            <button className={`${styles.postCreatorAction} ${styles.liveVideo}`}>
              <span className={styles.postCreatorActionIcon}>📹</span>
              Live video
            </button>
            <button className={`${styles.postCreatorAction} ${styles.photoVideo}`}>
              <span className={styles.postCreatorActionIcon}>🖼️</span>
              Photo/video
            </button>
            <button className={`${styles.postCreatorAction} ${styles.lifeEvent}`}>
              <span className={styles.postCreatorActionIcon}>🏁</span>
              Life event
            </button>
          </div>
        </div>
      )}

      {/* Posts Header */}
      <div className={styles.postsHeader}>
        <h2>Posts</h2>
        <div className={styles.postsHeaderActions}>
          <div className={styles.postsViewToggle}>
            <button className={styles.active}>List view</button>
            <button>Grid view</button>
          </div>
          <button className={styles.postsHeaderAction}>
            <span>🔧</span>
            Filters
          </button>
          <button className={styles.postsHeaderAction}>
            <span>⚙️</span>
            Manage posts
          </button>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No posts yet</h3>
          <p>
            {isOwner 
              ? "Share your first post to get started!" 
              : "This user hasn't posted anything yet."
            }
          </p>
          {isOwner && (
            <button className={styles.createPostBtn}>
              Create Your First Post
            </button>
          )}
        </div>
      ) : (
        <div className={styles.postsList}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && posts.length > 0 && (
        <div className={styles.loadMoreContainer}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={styles.loadMoreBtn}
          >
            {loadingMore ? (
              <>
                <div className={styles.smallSpinner}></div>
                Loading...
              </>
            ) : (
              "Load More Posts"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
