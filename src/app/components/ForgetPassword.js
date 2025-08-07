"use client"
import { useState } from "react"
import { supabase } from "../../../lib/supabaseCLient"
import styles from "./forgetPassword.module.css"

export default function ForgetPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Password reset link email mein bhej diya gaya hai!")
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
        <h2>Password Reset</h2>
        <p>Apna email address enter karein</p>
        
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            className={styles.button}
          >
            {loading ? "Sending..." : "Reset Password"}
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