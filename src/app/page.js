"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseCLient"
import styles from "./page.module.css"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push("/feed")
  }

  return (
    <div className={styles.fbBg}>
      <div className={styles.fbContainer}>
        <div className={styles.fbLeft}>
          <h1 className={styles.fbLogo}>facebook</h1>
          <p className={styles.fbDesc}>Facebook helps you connect and share with the people in your life.</p>
        </div>
        <div className={styles.fbRight}>
          <form className={styles.fbForm} onSubmit={handleLogin}>
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
            <button type="submit" className={styles.fbButton}>Log In</button>
            {error && <p className={styles.fbError}>{error}</p>}
            <div className={styles.fbDivider}></div>
            <button type="button" className={styles.fbCreateBtn} onClick={() => router.push("/signup")}>Create New Account</button>
            <div className={styles.fbDivider}></div>
            <button type="button" className={styles.fbForgetBtn} onClick={() => router.push("/forget-password")}>Forgot Password?</button>
          </form>
        </div>
      </div>
    </div>
  )
}
