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
      // First get the current user's friends
      const friends = await getFriends(user.id)
      const friendIds = friends.map(friendship => 
        friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
      )
      
      // Add current user to the list so they can see their own posts
      friendIds.push(user.id)
      
      // Fetch posts only from friends (including user's own posts)
      let { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at, user_id")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false })
      
      if (error) {
        setError(error.message)
        return
      }
      
      // Get user profiles for all post authors
      if (data) {
        const userIds = [...new Set(data.map(post => post.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("id", userIds);
        
        // Combine posts with user profiles
        const postsWithProfiles = data.map(post => ({
          ...post,
          author: profiles?.find(profile => profile.id === post.user_id)
        }));
        
        setPosts(postsWithProfiles || [])
      } else {
        setPosts([])
      }
    } catch (err) {
      setError('Failed to fetch posts')
      console.error(err)
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