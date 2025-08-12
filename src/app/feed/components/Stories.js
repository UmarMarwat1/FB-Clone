'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../../lib/supabaseCLient'
import StoriesFeed from '../../components/StoriesFeed'
import { useStories } from '../../context/StoriesContext'

export default function Stories() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { handleUserChange, clearCache } = useStories()

  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        const userData = {
          id: user.id,
          email: user.email,
          username: profile?.username,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url
        }
        setCurrentUser(userData)
        handleUserChange(userData)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      // Clear cache if there's an error (user might be logged out)
      clearCache()
    } finally {
      setLoading(false)
    }
  }, [handleUserChange, clearCache])

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