'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, getCurrentSession } from '../../../../lib/supabaseCLient'
import StoriesFeed from '../../components/StoriesFeed'
import { useStories } from '../../context/StoriesContext'

export default function Stories() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { handleUserChange, clearCache } = useStories()
  const hasLoadedRef = useRef(false)

  const getCurrentUser = useCallback(async () => {
    // Prevent multiple calls
    if (hasLoadedRef.current) return
    
    try {
      hasLoadedRef.current = true
      const session = await getCurrentSession()
      
      if (session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        const userData = {
          id: session.user.id,
          email: session.user.email,
          username: profile?.username,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url
        }
        setCurrentUser(userData)
        // Only call handleUserChange once
        if (handleUserChange) {
          handleUserChange(userData)
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      // Clear cache if there's an error (user might be logged out)
      if (clearCache) {
        clearCache()
      }
    } finally {
      setLoading(false)
    }
  }, []) // Remove dependencies to prevent infinite loops

  useEffect(() => {
    getCurrentUser()
  }, [getCurrentUser])

  if (loading) {
    return (
      <div style={{ padding: '16px', color: '#65676b' }}>
        Loading...
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '16px', color: '#65676b' }}>
        Please log in to view stories
      </div>
    )
  }

  return <StoriesFeed currentUser={currentUser} />
} 