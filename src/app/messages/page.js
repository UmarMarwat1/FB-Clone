"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase, getCurrentSession } from "../../../lib/supabaseCLient"
import Header from "../feed/components/Header"
import FriendMessaging from "../components/messaging/FriendMessaging"
import styles from "./messages.module.css"

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Memoize the onClose function to prevent recreation
  const handleClose = useCallback(() => {
    router.push('/feed')
  }, [router])

  // Memoize the onUnreadCountChange function to prevent recreation
  const handleUnreadCountChange = useCallback(() => {
    // This function is intentionally empty for the page version
  }, [])

  // Memoize the user object to prevent unnecessary re-renders
  const memoizedUser = useMemo(() => user, [user?.id])

  useEffect(() => {
    getUser()
  }, [])

  async function getUser() {
    try {
      const session = await getCurrentSession()
      if (!session?.user) {
        router.push("/login")
        return
      }
      setUser(session.user)
    } catch (error) {
      console.error("Error getting user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!user) return null

  return (
    <div className={styles.messagesPage}>
      <Header user={user} setUser={setUser} />
      <div className={styles.messagingInterface}>
        <FriendMessaging 
          key={`page-messaging-${user.id}`}
          user={memoizedUser} 
          onClose={handleClose}
          onUnreadCountChange={handleUnreadCountChange}
        />
      </div>
    </div>
  )
}
