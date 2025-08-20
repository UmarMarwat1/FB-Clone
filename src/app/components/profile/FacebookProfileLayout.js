"use client";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import UserPostsSection from "./UserPostsSection";
import FriendsSection from "./FriendsSection";
import MediaSection from "./MediaSection";
import AboutSection from "./AboutSection";
import styles from "./FacebookProfileLayout.module.css";

export default function FacebookProfileLayout({ 
  profile, 
  currentUser, 
  isOwner, 
  activeTab, 
  onTabChange, 
  onProfileUpdate 
}) {
  const renderMainContent = () => {
    switch (activeTab) {
      case "posts":
        return (
          <div className={styles.twoColumnLayout}>
            <div className={styles.leftColumn}>
              <AboutSection 
                userId={profile.id} 
                isOwner={isOwner} 
                onUpdate={onProfileUpdate}
                compact={true}
              />
              <MediaSection 
                userId={profile.id} 
                isOwner={isOwner}
                compact={true}
              />
              <FriendsSection 
                userId={profile.id} 
                currentUserId={currentUser?.id} 
                isOwner={isOwner}
                compact={true}
              />
            </div>
            <div className={styles.rightColumn}>
              <UserPostsSection 
                userId={profile.id} 
                isOwner={isOwner} 
                currentUser={currentUser}
              />
            </div>
          </div>
        );
      case "friends":
        return <FriendsSection userId={profile.id} currentUserId={currentUser?.id} isOwner={isOwner} />;
      case "photos":
        return <MediaSection userId={profile.id} isOwner={isOwner} />;
      case "about":
        return <AboutSection userId={profile.id} isOwner={isOwner} onUpdate={onProfileUpdate} />;
      default:
        return <UserPostsSection userId={profile.id} isOwner={isOwner} currentUser={currentUser} />;
    }
  };

  return (
    <div className={styles.profileLayout}>
      <div className={styles.headerContainer}>
        <ProfileHeader 
          profile={profile}
          currentUserId={currentUser?.id}
          isOwner={isOwner}
          onUpdate={onProfileUpdate}
        />
        
        <ProfileTabs 
          activeTab={activeTab}
          onTabChange={onTabChange}
          profile={profile}
        />
      </div>
      
      <div className={styles.contentContainer}>
        {renderMainContent()}
      </div>
    </div>
  );
}
