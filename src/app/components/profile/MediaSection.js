"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./MediaSection.module.css";

export default function MediaSection({ userId, isOwner, compact = false, mobile = false }) {
  const [media, setMedia] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  useEffect(() => {
    fetchMediaData();
  }, [userId]);

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      setError("");

      const mediaRes = await fetch(`/api/media/${userId}`);
      const mediaData = await mediaRes.json();

      if (mediaData.success) {
        console.log('MediaSection: Received media data:', mediaData.media);
        setMedia(mediaData.media);
      } else {
        console.error('MediaSection: Failed to fetch media:', mediaData.error);
      }

    } catch (err) {
      console.error("Error fetching media:", err);
      setError("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  const openMediaViewer = (mediaItem) => {
    setSelectedMedia(mediaItem);
  };

  const closeMediaViewer = () => {
    setSelectedMedia(null);
  };

  const renderMediaItem = (item) => {
    const isVideo = item.media_type === "video";
    
    return (
      <div 
        key={item.id} 
        className={styles.mediaItem}
        onClick={() => openMediaViewer(item)}
      >
        {isVideo ? (
          <video 
            src={item.media_url} 
            className={styles.mediaThumbnail}
            muted
          />
        ) : (
          <Image 
            src={item.media_url} 
            alt={item.title || "Media"} 
            width={200}
            height={200}
            className={styles.mediaThumbnail}
          />
        )}
        
        <div className={styles.mediaOverlay}>
          {isVideo && <span className={styles.playIcon}>▶️</span>}
          <div className={styles.mediaInfo}>
            {item.title && <p className={styles.mediaTitle}>{item.title}</p>}
            <p className={styles.mediaDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render compact version for left column
  if (compact) {
    if (loading) {
      return (
        <div className={`${styles.mediaContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
          <div className={styles.sectionHeader}>
            <h3>Photos</h3>
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
        <div className={`${styles.mediaContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
          <div className={styles.sectionHeader}>
            <h3>Photos</h3>
          </div>
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${styles.mediaContainer} ${styles.compact} ${mobile ? styles.mobile : ''}`}>
        <div className={styles.sectionHeader}>
          <h3>Photos</h3>
          {isOwner && (
            <button className={styles.addPhotoBtn}>
              <span className={styles.addPhotoIcon}>+</span>
              Add Photo
            </button>
          )}
        </div>
        
        {media.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📷</div>
            <p>No photos yet</p>
            {isOwner && (
              <button className={styles.addPhotoBtn}>
                <span className={styles.addPhotoIcon}>+</span>
                Add Your First Photo
              </button>
            )}
          </div>
        ) : (
          <div className={styles.mediaGrid}>
            {media.slice(0, 6).map(renderMediaItem)}
            {media.length > 6 && (
              <div className={styles.mediaMore}>
                <span>+{media.length - 6} more</span>
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
        <p>Loading media...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={fetchMediaData} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.mediaContainer}>
      <div className={styles.sectionHeader}>
        <h3>Photos & Videos</h3>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.viewBtn} ${viewMode === "grid" ? styles.active : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button 
              className={`${styles.viewBtn} ${viewMode === "list" ? styles.active : ""}`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
          {isOwner && (
            <button className={styles.addMediaBtn}>
              + Add Photos/Videos
            </button>
          )}
        </div>
      </div>

      {media.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>📷</div>
          <h3>No photos or videos yet</h3>
          <p>
            {isOwner 
              ? "Share your first photo or video to get started!" 
              : "This user hasn't shared any photos or videos yet."
            }
          </p>
          {isOwner && (
            <button className={styles.addMediaBtn}>
              Add Your First Photo
            </button>
          )}
        </div>
      ) : (
        <div className={`${styles.mediaGrid} ${viewMode === "list" ? styles.listView : ""}`}>
          {media.map(renderMediaItem)}
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div className={styles.mediaViewer} onClick={closeMediaViewer}>
          <div className={styles.mediaViewerContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeMediaViewer}>×</button>
            {selectedMedia.media_type === "video" ? (
              <video 
                src={selectedMedia.media_url} 
                controls 
                autoPlay
                className={styles.viewerMedia}
              />
            ) : (
              <Image 
                src={selectedMedia.media_url} 
                alt={selectedMedia.title || "Media"} 
                width={800}
                height={600}
                className={styles.viewerMedia}
              />
            )}
            <div className={styles.viewerInfo}>
              {selectedMedia.title && <h3>{selectedMedia.title}</h3>}
              <p>{new Date(selectedMedia.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
