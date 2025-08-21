'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import ReelsFeed from '../components/ReelsFeed'
import styles from './reels.module.css'

export default function ReelsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [])

  async function getUser() {
    try {
      const session = await getCurrentSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setCurrentUser({ ...session.user, ...profile })
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading Reels...</p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className={styles.authRequired}>
        <h2>Sign in Required</h2>
        <p>Please sign in to view Reels</p>
        <Link href="/login" className={styles.loginButton}>
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.reelsPage}>
      {/* Top left - Facebook logo and Reels text */}
      <div className={styles.topLeft}>
        <div className={styles.facebookLogo} onClick={() => router.push('/feed')}>f</div>
        <span className={styles.reelsText}>Reels</span>
      </div>

      {/* Top right - Create reels button */}
      <div className={styles.topRight}>
        <Link href="/reels/upload" className={styles.createButton}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Create reel
        </Link>
      </div>

      {/* Main content */}
      <ReelsFeed currentUser={currentUser} />
    </div>
  )
}