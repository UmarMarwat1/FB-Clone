"use client"
import { useState, useRef, useEffect } from "react"
import { useNotifications } from "../context/NotificationContext"
import NotificationDropdown from "./NotificationDropdown"
import styles from "./notificationBell.module.css"

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount } = useNotifications()
  const dropdownRef = useRef(null)
  const bellRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        bellRef.current && 
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])

  // Lock body scroll on mobile when dropdown is open
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const closeDropdown = () => {
    setIsOpen(false)
  }

  return (
    <div className={styles.notificationContainer}>
      <button
        ref={bellRef}
        className={styles.notificationBell}
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div className={styles.mobileOverlay} onClick={closeDropdown} />
          <div ref={dropdownRef} className={styles.dropdownContainer}>
            <NotificationDropdown onClose={closeDropdown} />
          </div>
        </>
      )}
    </div>
  )
}
