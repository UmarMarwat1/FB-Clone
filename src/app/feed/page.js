"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, getCurrentSession } from "../../../lib/supabaseCLient"
import Header from "./components/Header"
import Sidebar from "./components/Sidebar"
import Stories from "./components/Stories"
import CreatePost from "./components/CreatePost"
import PostsFeed from "./components/PostsFeed"
import styles from "./feed.module.css"

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [refreshPosts, setRefreshPosts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [])

  async function getUser() {
    const session = await getCurrentSession()
    if (!session?.user) {
      router.push("/")
    } else {
      setUser(session.user)
    }
  }

  const handlePostCreated = () => {
    // Trigger PostsFeed refresh by updating the key
    setRefreshPosts(prev => prev + 1)
  }

  if (!user) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.feedPage}>
      <Header user={user} setUser={setUser} />
      
      {/* Main Content */}
      <div className={styles.mainContent}>
        <Sidebar />
        
        {/* Center Feed */}
        <div className={styles.centerFeed}>
          <Stories />
          <CreatePost user={user} onPostCreated={handlePostCreated} />
          <PostsFeed user={user} key={refreshPosts} />
        </div>
        
        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          <div className={styles.contactsHeader}>
            <h4>Contacts</h4>
          </div>
          <div className={styles.contactItem}>
            <div className={styles.contactAvatar}>
              <span>👤</span>
            </div>
            <span>John Doe</span>
          </div>
          <div className={styles.contactItem}>
            <div className={styles.contactAvatar}>
              <span>👤</span>
            </div>
            <span>Jane Smith</span>
          </div>
        </div>
      </div>
    </div>
  )
} 