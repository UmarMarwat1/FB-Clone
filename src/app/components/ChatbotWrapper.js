"use client"
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { supabase, getCurrentSession } from "../../../lib/supabaseCLient"
import Chatbot from "./Chatbot"
import { useComments } from "../context/CommentsContext"

export default function ChatbotWrapper() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { commentsOpen } = useComments()
  const userRef = useRef(null)

  useEffect(() => {
    getUser()
    
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only update if user actually changed to prevent infinite loops
        if (session?.user?.id !== userRef.current?.id) {
          userRef.current = session?.user || null
          setUser(session?.user || null)
        }
        setLoading(false)
      }
    )

    return () => {
      window.removeEventListener('resize', checkMobile)
      subscription.unsubscribe()
    }
  }, [])

  async function getUser() {
    try {
      const session = await getCurrentSession()
      const currentUser = session?.user || null
      userRef.current = currentUser
      setUser(currentUser)
    } catch (error) {
      console.error("Error getting user:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  // Don't show chatbot on login, signup, or main page (which is login)
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null

  // Only show chatbot if user is logged in
  if (!user) return null

  // Hide AI Chat button on mobile screens when on reels page
  if (isMobile && pathname.startsWith('/reels')) return null

  // Hide AI Chat button completely from Messages page
  if (pathname.startsWith('/messages')) return null

  return <Chatbot user={user} commentsOpen={commentsOpen} />
}