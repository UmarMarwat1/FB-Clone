"use client"
import styles from "../feed.module.css"
import { useRouter } from "next/navigation"
export default function Sidebar() {
  const router = useRouter()
  return (
    <div className={styles.leftSidebar}>
      <div 
        className={styles.sidebarItem}
        onClick={() => router.push('/profile')}
        style={{ cursor: 'pointer' }}
      >
        <span>👤</span> Profile
      </div>
      <div className={styles.sidebarItem}>
        <span>👥</span>
         <button 
         className={styles.SidebarBtn}
         onClick={() => router.push("/friends")}>Friends</button>
      </div>
      <div className={styles.sidebarItem}>
        <span>📰</span> News Feed
      </div>
      <div className={styles.sidebarItem}>
        <span>📺</span> Watch
      </div>
      <div className={styles.sidebarItem}>
        <span>🏪</span> Marketplace
      </div>
    </div>
  )
} 