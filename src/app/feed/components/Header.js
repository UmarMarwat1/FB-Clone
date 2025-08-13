"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, getCurrentSession } from "../../../../lib/supabaseCLient"
import styles from "../feed.module.css"

export default function Header({ user, setUser }) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest(`.${styles.profileDropdownContainer}`)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileDropdown])

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout failed:', error)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo}>facebook</div>
        <div className={styles.searchBar}>
          <input type="text" placeholder="Search Facebook" />
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn}>Home</button>
          <button 
            className={styles.headerBtn}
            onClick={() => router.push('/friends')}
          >
            Friends
          </button>
          <button className={styles.headerBtn}>Messages</button>
          <button className={styles.headerBtn}>Notifications</button>
          <div className={styles.profileDropdownContainer}>
            <button 
              className={styles.profileBtn}
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </button>
            {showProfileDropdown && (
              <div className={styles.profileDropdown}>
                <div className={styles.dropdownItem}>
                  <span>👤</span> Profile
                </div>
                <div className={styles.dropdownItem}>
                  <span>⚙️</span> Settings
                </div>
                <div className={styles.dropdownDivider}></div>
                <div className={styles.dropdownItem}>
                  <span>🏠</span> Home
                </div>
                <div className={styles.dropdownItem}>
                  <span>👥</span> 
                  <button
                  className={styles.dropdownBtn}
                  onClick={() => router.push("/friends")}
                  >Friends</button>
                </div>
                <div className={styles.dropdownItem}>
                  <span>💬</span> Messages
                </div>
                <div className={styles.dropdownItem}>
                  <span>🔔</span> Notifications
                </div>
                <div className={styles.dropdownItem}>
                  <span>📺</span> Watch
                </div>
                <div className={styles.dropdownItem}>
                  <span>🛒</span> Marketplace
                </div>
                <div className={styles.dropdownDivider}></div>
                <div 
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  <span>🚪</span> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 