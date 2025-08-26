"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase, getCurrentSession } from "../../../../lib/supabaseCLient";
import MediaUploader from "../MediaUploader";
import FeelingActivitySelector from "../FeelingActivitySelector";
import PostCard from "../../feed/components/PostCard";
import styles from "./UserPostsSection.module.css";

export default function UserPostsSection({ userId, isOwner, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Post creation state
  const [content, setContent] = useState("");
  const [postError, setPostError] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [feelingActivity, setFeelingActivity] = useState({ type: null, value: null, emoji: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);

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

  // Post creation functions
  async function handlePost(e) {
    e.preventDefault();
    setPostError(null);
    
    // Validation logic
    const hasContent = content.trim().length > 0;
    const hasMedia = uploadedMedia.length > 0;
    const hasFeelingActivity = feelingActivity.value !== null;
    
    if (!hasContent && !hasMedia && !hasFeelingActivity) {
      setPostError("Please add some content, media, or select a feeling/activity");
      return;
    }
    
    if (!hasContent && !hasMedia && hasFeelingActivity) {
      setPostError("Feelings/Activities cannot be posted alone. Please add some text or media");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare post data
      const postData = {
        content: hasContent ? content.trim() : null,
        media: uploadedMedia,
        feeling: feelingActivity.type === 'feeling' ? feelingActivity.value : null,
        activity: feelingActivity.type === 'activity' ? feelingActivity.value : null
      };

      // Get access token for authentication
      const session = await getCurrentSession();
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setContent("");
        setUploadedMedia([]);
        setFeelingActivity({ type: null, value: null, emoji: null });
        setShowPostForm(false);
        setShowMediaUploader(false);
        
        // Refresh posts
        fetchPosts(1, true);
      } else {
        setPostError(result.error || "Failed to create post");
      }
    } catch (err) {
      console.error('Post creation error:', err);
      setPostError("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowPostForm(false);
    setContent("");
    setPostError(null);
    setUploadedMedia([]);
    setFeelingActivity({ type: null, value: null, emoji: null });
    setShowMediaUploader(false);
  };

  const handleMediaChange = (mediaFiles) => {
    setUploadedMedia(mediaFiles);
  };

  const handleFeelingActivityChange = (selection) => {
    setFeelingActivity(selection);
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
    <>
      {/* Create Post Section */}
      {isOwner && (
        <div className={styles.createPostSection}>
          <div className={styles.createPostHeader}>
            <div className={styles.userAvatar}>
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <button 
              className={styles.createPostInput}
              onClick={() => setShowPostForm(true)}
            >
              What&apos;s on your mind?
            </button>
          </div>
        </div>
      )}

      {/* Post Form Modal */}
      {showPostForm && (
        <div 
          className={styles.postFormOverlay} 
          onClick={closeModal}
          onKeyDown={(e) => e.key === 'Escape' && closeModal()}
        >
          <div 
            className={styles.postForm} 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className={styles.postFormHeader}>
              <h3>Create Post</h3>
              <button 
                className={styles.closeBtn}
                onClick={closeModal}
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePost}>
              {/* User Info with Feeling/Activity */}
              <div className={styles.postUserHeader}>
                <div className={styles.postUserInfo}>
                  <div className={styles.userAvatar}>
                    {currentUser?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <div className={styles.userName}>
                      {currentUser?.username || currentUser?.email?.split('@')[0] || 'User'}
                    </div>
                    {feelingActivity.value && (
                      <div className={styles.feelingDisplay}>
                        {feelingActivity.emoji} {feelingActivity.type === 'feeling' ? 'is feeling' : 'is'} {feelingActivity.value}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <textarea
                placeholder="What&apos;s on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.postTextarea}
              />

              {/* Feeling/Activity Selector */}
              <div className={styles.postOption}>
                <FeelingActivitySelector 
                  onSelectionChange={handleFeelingActivityChange}
                  initialSelection={feelingActivity}
                />
              </div>

              {/* Media Uploader */}
              {showMediaUploader && (
                <div className={styles.postOption}>
                  <MediaUploader 
                    onMediaChange={handleMediaChange}
                    maxFiles={10}
                  />
                </div>
              )}

              {/* Show Media Toggle Button */}
              {!showMediaUploader && (
                <div className={styles.postOption}>
                  <button
                    type="button"
                    className={styles.addMediaBtn}
                    onClick={() => setShowMediaUploader(true)}
                  >
                    📷 Add Photos/Videos
                  </button>
                </div>
              )}

              {/* Media Preview */}
              {uploadedMedia.length > 0 && (
                <div className={styles.mediaPreview}>
                  <div className={styles.mediaPreviewHeader}>
                    <span>{uploadedMedia.length} file(s) uploaded</span>
                    <button
                      type="button"
                      className={styles.removeMediaBtn}
                      onClick={() => {
                        setUploadedMedia([]);
                        setShowMediaUploader(false);
                      }}
                    >
                      Remove All
                    </button>
                  </div>
                  <div className={styles.mediaPreviewGrid}>
                    {uploadedMedia.slice(0, 4).map((media, index) => (
                      <div key={index} className={styles.mediaPreviewItem}>
                        {media.type === 'image' ? (
                          <Image 
                            src={media.url} 
                            alt="Preview" 
                            width={100}
                            height={100}
                          />
                        ) : (
                          <div className={styles.videoPreviewItem}>
                            <video src={media.url} />
                            <span className={styles.videoIcon}>▶️</span>
                          </div>
                        )}
                        {uploadedMedia.length > 4 && index === 3 && (
                          <div className={styles.moreMediaOverlay}>
                            +{uploadedMedia.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {postError && <p className={styles.error}>{postError}</p>}
              
              <div className={styles.postFormActions}>
                <button 
                  type="submit" 
                  className={styles.postSubmitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
                <button 
                  type="button" 
                  className={styles.postCancelBtn}
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts Container */}
      <div className={styles.postsContainer}>
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
    </>
  );
}
