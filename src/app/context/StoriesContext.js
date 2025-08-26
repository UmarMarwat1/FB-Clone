'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase, getFriends } from '../../../lib/supabaseCLient'
import { checkDatabaseTables, checkStorageAccess } from '../utils/checkDatabase'

const StoriesContext = createContext()

export function StoriesProvider({ children }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000
  // Maximum cache size (number of stories to keep in memory)
  const MAX_CACHE_SIZE = 100
  
  // Ref for cleanup interval
  const cleanupIntervalRef = useRef(null)

  const isCacheValid = () => {
    if (!lastFetchTime) return false
    return Date.now() - lastFetchTime < CACHE_DURATION
  }

  // Guard to avoid overlapping fetches
  const isFetchingRef = useRef(false)

  // Clean up expired stories from cache
  const cleanupExpiredStories = (storiesData) => {
    if (!storiesData || storiesData.length === 0) return storiesData
    
    const now = new Date().toISOString()
    
    const validStories = storiesData.filter(story => {
      // If story doesn't have expires_at field, keep it (backwards compatibility)
      if (!story.expires_at) {
        return true
      }
      
      const storyExpiresAt = new Date(story.expires_at)
      const currentTime = new Date(now)
      return storyExpiresAt > currentTime
    })
    
    if (validStories.length !== storiesData.length) {
      console.log(`Cleaned up ${storiesData.length - validStories.length} expired stories from cache`)
    }
    
    return validStories
  }

  // Limit cache size to prevent memory issues
  const limitCacheSize = (storiesData) => {
    if (!storiesData || storiesData.length <= MAX_CACHE_SIZE) return storiesData
    
    // Keep the most recent stories
    const limitedStories = storiesData.slice(-MAX_CACHE_SIZE)
    console.log(`Limited cache size from ${storiesData.length} to ${limitedStories.length} stories`)
    
    return limitedStories
  }

  const fetchStories = async (forceRefresh = false) => {
    // Return cached data if it's still valid and not forcing refresh
    if (!forceRefresh && isCacheValid() && stories.length > 0) {
      console.log('Using cached stories data')
      return stories
    }

    // Validate current user before attempting fetch
    if (!currentUser || !currentUser.id) {
      console.log('No valid user found, skipping stories fetch')
      setStories([])
      setLoading(false)
      return []
    }

    if (isFetchingRef.current) {
      return stories
    }
    isFetchingRef.current = true
    try {
      setLoading(true)
      setError(null)

      // Reduce console noise in production; keep single concise log
      console.log('Stories: evaluating fetch for user', currentUser?.id)

      // 1) First determine if we should fetch stories at all (cheap checks only)
      //    We do this BEFORE any broad stories query to avoid unnecessary fetches
      let shouldFetchStories = false

      if (currentUser?.id) {
        try {
          // Check if user has any friends with better error handling
          let userFriends = []
          try {
            userFriends = await getFriends(currentUser.id)
          } catch (friendsError) {
            console.warn('Stories: friends check failed (likely none/new user)')
            // If friends table doesn't exist or user has no friends, continue with stories check
            userFriends = []
          }
          
          // Check if user has created any stories themselves
          let validUserStories = []
          try {
            const { data: userStories, error: userStoriesError } = await supabase
              .from('stories')
              .select('id, expires_at')
              .eq('user_id', currentUser.id)
              .eq('is_active', true)
              .limit(10) // Get a few to check expiration client-side
            
            if (userStoriesError) {
              console.warn('Stories: own stories check failed (likely none)')
              // If stories table doesn't exist or user has no stories, set empty array
              validUserStories = []
            } else {
              // Filter out expired stories client-side to handle missing expires_at
              const now = new Date().toISOString()
              validUserStories = userStories?.filter(story => {
                if (!story.expires_at) return true // Keep stories without expiration date
                return new Date(story.expires_at) > new Date(now)
              }) || []
            }
          } catch (storiesError) {
            console.warn('Stories: own stories query failed (likely table missing)')
            validUserStories = []
          }

          // If user has no friends and no valid stories, return empty array
          if ((!userFriends || userFriends.length === 0) && (!validUserStories || validUserStories.length === 0)) {
            console.log('Stories: no friends and no stories -> skip fetch (cache set)')
            setStories([])
            setLastFetchTime(Date.now())
            setLoading(false) // Important: Set loading to false
            return []
          }

          console.log(`User has ${userFriends?.length || 0} friends and ${validUserStories?.length || 0} valid stories`)
          shouldFetchStories = true
        } catch (overallError) {
          console.warn('Stories: precheck errored; treat as new user, skip fetch')
          // For new users or when tables don't exist, skip stories fetch
          console.log('Skipping stories fetch due to database setup issues (likely new user)')
          setStories([])
          setLastFetchTime(Date.now())
          setLoading(false)
          return []
        }
      }
      
      // If for any reason we still shouldn't fetch, return early and mark cache time
      if (!shouldFetchStories) {
        setStories([])
        setLastFetchTime(Date.now()) // prevent repeated checks until cache expires
        setLoading(false)
        return []
      }

      // 2) Only now perform broader checks and the actual stories fetch
      // Check database setup first
      const dbCheck = await checkDatabaseTables()
      if (!dbCheck.stories || !dbCheck.profiles) {
        const missingTables = []
        if (!dbCheck.stories) missingTables.push('stories')
        if (!dbCheck.story_media) missingTables.push('story_media')
        if (!dbCheck.story_views) missingTables.push('story_views')
        if (!dbCheck.profiles) missingTables.push('profiles')

        setError(`Missing database tables: ${missingTables.join(', ')}. Please run the database setup from STORIES_SETUP.md`)
        setLoading(false)
        return []
      }

      // Check storage access (non-blocking)
      const storageCheck = await checkStorageAccess()
      if (!storageCheck.exists) {
        console.warn('Stories storage bucket not accessible:', storageCheck.error)
      }

      // Fetch stories (including those without expires_at for backwards compatibility)
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        
      // Filter expired stories client-side to handle missing expires_at fields
      const now = new Date().toISOString()
      
      const filteredStoriesData = storiesData?.filter(story => {
        if (!story.expires_at) {
          return true // Keep stories without expiration date
        }
        
        const storyExpiresAt = new Date(story.expires_at)
        const currentTime = new Date(now)
        return storyExpiresAt > currentTime
      }) || []

      if (storiesError) {
        console.warn('Stories fetch skipped due to database error:', storiesError)
        // Do not throw to avoid noisy console errors for new users; just surface a soft error
        setError('Unable to load stories at the moment. Please try again later.')
        setLoading(false)
        return []
      }

      console.log('Fetched stories:', filteredStoriesData)

      // If we have stories, fetch related data efficiently
      let storiesWithDetails = []
      
      if (filteredStoriesData && filteredStoriesData.length > 0) {
        try {
          // Get all unique user IDs from stories
          const userIds = [...new Set(filteredStoriesData.map(story => story.user_id))]
          
          // Fetch all profiles in one query
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', userIds)

          if (profilesError) {
            console.warn('Error fetching profiles:', profilesError)
          }

          // Create a map for quick profile lookup
          const profileMap = new Map()
          profiles?.forEach(profile => {
            profileMap.set(profile.id, profile)
          })

          // Fetch all story media in one query
          const storyIds = filteredStoriesData.map(story => story.id)
          const { data: allStoryMedia, error: mediaError } = await supabase
            .from('story_media')
            .select('*')
            .in('story_id', storyIds)
            .order('media_order', { ascending: true })

          if (mediaError) {
            console.warn('Error fetching story media:', mediaError)
          }

          // Create a map for quick story media lookup
          const storyMediaMap = new Map()
          allStoryMedia?.forEach(media => {
            if (!storyMediaMap.has(media.story_id)) {
              storyMediaMap.set(media.story_id, [])
            }
            storyMediaMap.get(media.story_id).push(media)
          })

          // Combine all data
          storiesWithDetails = filteredStoriesData.map(story => ({
            ...story,
            story_media: storyMediaMap.get(story.id) || [],
            profiles: profileMap.get(story.user_id) || {
              id: story.user_id,
              username: 'Unknown User',
              full_name: 'Unknown User',
              avatar_url: '/default-avatar.svg'
            }
          }))

          // Sort stories by user_id first, then by created_at to ensure proper grouping
          storiesWithDetails.sort((a, b) => {
            // First sort by user_id to group stories from same user together
            if (a.user_id !== b.user_id) {
              return a.user_id.localeCompare(b.user_id)
            }
            // Then sort by creation time within each user's stories
            return new Date(a.created_at) - new Date(b.created_at)
          })
        } catch (detailError) {
          console.warn('Error fetching story details:', detailError)
          // Fallback: use stories without detailed info
          storiesWithDetails = filteredStoriesData.map(story => ({
            ...story,
            story_media: [],
            profiles: {
              id: story.user_id,
              username: 'Unknown User',
              full_name: 'Unknown User',
              avatar_url: '/default-avatar.svg'
            }
          }))

          // Sort stories by user_id first, then by created_at to ensure proper grouping
          storiesWithDetails.sort((a, b) => {
            // First sort by user_id to group stories from same user together
            if (a.user_id !== b.user_id) {
              return a.user_id.localeCompare(b.user_id)
            }
            // Then sort by creation time within each user's stories
            return new Date(a.created_at) - new Date(b.created_at)
          })
        }
      }

      console.log('Fetched stories with details:', storiesWithDetails)
      
      // Clean up expired stories and limit cache size
      const cleanedStories = cleanupExpiredStories(storiesWithDetails)
      const limitedStories = limitCacheSize(cleanedStories)
      
      setStories(limitedStories)
      setLastFetchTime(Date.now())
      return limitedStories
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError(err.message || 'Failed to fetch stories')
      return []
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }

  const refreshStories = () => {
    return fetchStories(true) // Force refresh
  }

  const clearCache = useCallback(() => {
    console.log('Clearing stories cache')
    setStories([])
    setLastFetchTime(null)
    setError(null)
  }, [])

  // Enhanced cache cleanup with user context
  const clearCacheForUser = useCallback((userId) => {
    console.log(`Clearing stories cache for user: ${userId}`)
    setStories([])
    setLastFetchTime(null)
    setError(null)
  }, [])

  // Clean up cache when user changes
  const handleUserChange = useCallback((newUser) => {
    // Use ref to prevent infinite loops
    if (currentUser && newUser && currentUser.id !== newUser.id) {
      console.log('User changed, clearing cache')
      clearCache()
    }
    // Only update if user actually changed
    if (currentUser?.id !== newUser?.id) {
      setCurrentUser(newUser)
    }
  }, [currentUser?.id, clearCache])

  // Periodic cache cleanup - re-enabled with longer interval
  useEffect(() => {
    // Clean up expired stories every 30 minutes (stories last 24h, so less frequent checks are fine)
    cleanupIntervalRef.current = setInterval(() => {
      if (stories.length > 0) {
        const cleanedStories = cleanupExpiredStories(stories)
        if (cleanedStories.length !== stories.length) {
          console.log('Periodic cleanup: removed expired stories')
          setStories(cleanedStories)
        }
      }
    }, 30 * 60 * 1000) // 30 minutes

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [stories])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
      console.log('StoriesContext unmounting, clearing cache')
      clearCache()
    }
  }, [clearCache])

  // Cache cleanup on app visibility change - REMOVED to fix disappearing stories
  // The aggressive cache clearing was causing stories to disappear when users switched tabs
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       console.log('App went to background, cleaning up cache')
  //       // Clear cache when app goes to background to save memory
  //       clearCache()
  //     }
  //   }

  //   document.addEventListener('visibilitychange', handleVisibilityChange)
    
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange)
  //   }
  // }, [])

  const value = {
    stories,
    loading,
    error,
    lastFetchTime,
    fetchStories,
    refreshStories,
    clearCache,
    clearCacheForUser,
    handleUserChange,
    isCacheValid,
    setCurrentUser
  }

  return (
    <StoriesContext.Provider value={value}>
      {children}
    </StoriesContext.Provider>
  )
}

export function useStories() {
  const context = useContext(StoriesContext)
  if (!context) {
    throw new Error('useStories must be used within a StoriesProvider')
  }
  return context
}
