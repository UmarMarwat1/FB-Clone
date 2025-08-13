"use client"
import { useState, useEffect } from "react"
import { supabase, getFriends } from "../../../../lib/supabaseCLient"
import PostCard from "./PostCard"
import styles from "../feed.module.css"

export default function PostsFeed({ user }) {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      // Use the new API route that handles posts with media
      const response = await fetch('/api/posts')
      const result = await response.json()
      
      if (result.posts) {
        // Filter posts to show only user's and friends' posts
        let friends = []
        try {
          friends = await getFriends(user.id)
        } catch (friendsError) {
          console.warn('Error fetching friends for posts (likely new user):', friendsError)
          // For new users without friends table setup, just show their own posts
          friends = []
        }
        
        const friendIds = friends.map(friendship => 
          friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
        )
        
        // Add current user to the list so they can see their own posts
        friendIds.push(user.id)
        
        // Filter posts to show only from friends and user
        const filteredPosts = result.posts.filter(post => 
          friendIds.includes(post.user_id)
        )
        
        setPosts(filteredPosts || [])
      } else {
        setError("Failed to fetch posts")
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError("Failed to fetch posts")
    }
  }

  const handlePostDeleted = (postId) => {
    // Remove the deleted post from state
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
  }

  return (
    <div className={styles.postsFeed}>
      {error && <div className={styles.error}>{error}</div>}
      
      {posts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No posts from friends yet. Add some friends to see their posts!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            user={user} 
            onPostDeleted={handlePostDeleted}
          />
        ))
      )}
    </div>
  )
} 