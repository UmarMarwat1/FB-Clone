"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getCurrentSession } from "../../../../lib/supabaseCLient";
import FacebookProfileLayout from "../../components/profile/FacebookProfileLayout";
import Header from "../../feed/components/Header";
import styles from "./profilePage.module.css";

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username;
  
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        setLoading(true);
        
        // Get current session
        const session = await getCurrentSession();
        setCurrentUser(session?.user || null);
        
        // Fetch profile by username
        const response = await fetch(`/api/profile/username/${username}`);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error || "Profile not found");
          return;
        }
        
        setProfile(data.profile);
        setIsOwner(session?.user?.id === data.profile.id);
        
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    
    if (username) {
      fetchProfileData();
    }
  }, [username]);

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Profile Not Found</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <h2>User Not Found</h2>
        <p>The user @{username} does not exist.</p>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <Header user={currentUser} setUser={setCurrentUser} />
      <FacebookProfileLayout
        profile={profile}
        currentUser={currentUser}
        isOwner={isOwner}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}
