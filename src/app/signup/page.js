"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseCLient"
import styles from "../page.module.css"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      
      // Insert into profiles table
      const user = data.user
      if (user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          { id: user.id, username }
        ])
        
        if (profileError) {
          console.error('Profile insertion error:', profileError)
          setError(`Database error saving new user: ${profileError.message}`)
          return
        }
      }
      setSuccess("Account created! Please check your email to verify.")
    } catch (err) {
      console.error('Signup error:', err)
      setError(`Signup failed: ${err.message}`)
    }
  }

  return (
    <div className={styles.fbBg}>
      <div className={styles.fbContainer}>
        <div className={styles.fbLeft}>
          <h1 className={styles.fbLogo}>facebook</h1>
          <p className={styles.fbDesc}>Create a new account to connect with your friends.</p>
        </div>
        <div className={styles.fbRight}>
          <form className={styles.fbForm} onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className={styles.fbInput}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={styles.fbInput}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={styles.fbInput}
            />
            <button type="submit" className={styles.fbButton}>Sign Up</button>
            {error && <p className={styles.fbError}>{error}</p>}
            {success && <p style={{color:'#42b72a',textAlign:'center'}}>{success}</p>}
            <div className={styles.fbDivider}></div>
            <button type="button" className={styles.fbCreateBtn} onClick={() => router.push("/")}>Back to Login</button>
          </form>
        </div>
      </div>
    </div>
  )
} 