"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import styles from "./ProfileTabs.module.css";

const tabs = [
  { id: "posts", label: "Posts", icon: "📝" },
  { id: "friends", label: "Friends", icon: "👥" },
  { id: "photos", label: "Photos", icon: "📷" },
  { id: "about", label: "About", icon: "ℹ️" }
];

export default function ProfileTabs({ activeTab, onTabChange, profile }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync URL with active tab
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab && tabs.some(tab => tab.id === urlTab)) {
      onTabChange(urlTab);
    }
  }, [searchParams, activeTab, onTabChange]);

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    
    // Update URL without triggering a navigation
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("tab", tabId);
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsList}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
