'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentSession } from '../../../../lib/supabaseCLient'
import ReelPlayer from '../../components/ReelPlayer'
import ReelComments from '../../components/ReelComments'
import styles from '../reels.module.css'

export default function SingleReelPage() {
  const params = useParams()
  const [reel, setReel] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          setCurrentUser({ ...user, ...profile })
        }

        // Fetch reel
        const response = await fetch(`/api/reels/${params.id}`)
        const data = await response.json()

        if (data.success) {
          setReel(data.reel)
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('Error fetching reel:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id])

  const handleView = async (reelId, watchDuration) => {
    if (!currentUser) return
    
    try {
      await fetch(`/api/reels/${reelId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewer_id: currentUser.id,
          watch_duration: watchDuration
        })
      })
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  const handleLike = async (reelId, likeType) => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/reels/${reelId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          like_type: likeType
        })
      })

      const data = await response.json()
      if (data.success) {
        setReel(prev => ({
          ...prev,
          like_count: data.action === 'created' 
            ? (prev.like_count || 0) + 1 
            : data.action === 'removed'
              ? Math.max(0, (prev.like_count || 0) - 1)
              : prev.like_count
        }))
      }
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }

  const handleComment = () => {
    setShowComments(true)
  }

  const handleShare = async (reelId) => {
    if (!currentUser) return

    try {
      await fetch(`/api/reels/${reelId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          share_type: 'external'
        })
      })

      const reelUrl = `${window.location.origin}/reels/${reelId}`
      await navigator.clipboard.writeText(reelUrl)
      alert('Reel link copied to clipboard!')
    } catch (error) {
      console.error('Error sharing reel:', error)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading Reel...</p>
      </div>
    )
  }

  if (!reel) {
    return (
      <div className={styles.notFound}>
        <h2>Reel Not Found</h2>
        <p>This reel may have been deleted or doesn&apos;t exist.</p>
        <Link href="/reels" className={styles.backButton}>
          Back to Reels
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.singleReelPage}>
      <header className={styles.header}>
        <Link href="/reels" className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </Link>
        <h1>Reel</h1>
      </header>

      <main className={styles.singleReelMain}>
        <div className={styles.reelContainer}>
          <ReelPlayer
            reel={reel}
            isActive={true}
            onView={handleView}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            currentUser={currentUser}
          />
        </div>

        {showComments && (
          <ReelComments
            reelId={reel.id}
            currentUser={currentUser}
            onClose={() => setShowComments(false)}
          />
        )}
      </main>
    </div>
  )
}