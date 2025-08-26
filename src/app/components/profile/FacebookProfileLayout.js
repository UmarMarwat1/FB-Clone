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

  const renderMobileLayout = () => {
    return (
      <div className={styles.mobileLayout}>
        {/* Mobile Profile Sections */}
        <div className={styles.mobileProfileSections}>
          <AboutSection 
            userId={profile.id} 
            isOwner={isOwner} 
            onUpdate={onProfileUpdate}
            compact={true}
            mobile={true}
          />
          <MediaSection 
            userId={profile.id} 
            isOwner={isOwner}
            compact={true}
            mobile={true}
          />
          <FriendsSection 
            userId={profile.id} 
            currentUserId={currentUser?.id} 
            isOwner={isOwner}
            compact={true}
            mobile={true}
          />
        </div>
        
        {/* Mobile Posts Section */}
        <div className={styles.mobilePostsSection}>
          <UserPostsSection 
            userId={profile.id} 
            isOwner={isOwner} 
            currentUser={currentUser}
          />
        </div>
      </div>
    );
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
        {/* Desktop Layout */}
        <div className={styles.desktopLayout}>
          {renderMainContent()}
        </div>
        
        {/* Mobile Layout */}
        <div className={styles.mobileLayoutWrapper}>
          {renderMobileLayout()}
        </div>
      </div>
    </div>
  );
}
