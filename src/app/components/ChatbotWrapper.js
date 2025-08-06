"use client"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "../../../lib/supabaseCLient"
import Chatbot from "./Chatbot"

export default function ChatbotWrapper() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    getUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function getUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
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

  return <Chatbot user={user} />
}