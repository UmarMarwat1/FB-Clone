"use client"
import { useState, useEffect } from "react"
import { supabase, getCurrentSession } from "../../../lib/supabaseCLient"
import { useRouter } from "next/navigation"
import styles from "./resetPassword.module.css"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const session = await getCurrentSession()
      if (!session?.user) {
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords match nahi kar rahe")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password kam se kam 6 characters ka hona chahiye")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Password successfully update ho gaya hai!")
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error) {
      setError("Kuch error hua. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2>New Password Set Karein</h2>
        <p>Apna new password enter karein</p>
        
        <form onSubmit={handleResetPassword}>
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
          
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            className={styles.button}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        {message && (
          <div className={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
} 