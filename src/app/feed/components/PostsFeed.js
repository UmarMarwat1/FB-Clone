"use client"
import { useState, useEffect } from "react"
import { supabase } from "../../../../lib/supabaseCLient"
import PostCard from "./PostCard"
import styles from "../feed.module.css"

export default function PostsFeed({ user }) {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    let { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
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
          <p>No posts yet. Be the first to share something!</p>
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