'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentSession } from '../../../../lib/supabaseCLient'
import ReelUpload from '../../components/ReelUpload'
import styles from './upload.module.css'

export default function ReelUploadPage() {
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

  const handleUploadComplete = (reel) => {
    console.log('Upload complete, reel data:', reel)
    
    // Validate reel before redirect
    if (!reel || !reel.id) {
      console.error('Invalid reel data for redirect:', reel)
      // Redirect to reels page instead
      router.push('/reels')
      return
    }
    
    console.log('Redirecting to reel:', reel.id)
    // Redirect to the uploaded reel
    router.push(`/reels/${reel.id}`)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className={styles.authRequired}>
        <h2>Sign in Required</h2>
        <p>Please sign in to create Reels</p>
        <a href="/login" className={styles.loginButton}>
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className={styles.uploadPage}>
      <header className={styles.header}>
        <a href="/reels" className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Reels
        </a>
        <h1>Create Reel</h1>
      </header>

      <main className={styles.main}>
        <ReelUpload 
          currentUser={currentUser}
          onUploadComplete={handleUploadComplete}
        />
      </main>
    </div>
  )
}