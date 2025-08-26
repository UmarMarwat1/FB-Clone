"use client"
import { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabaseCLient"
import styles from "./testNotifications.module.css"

export default function TestNotificationsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    getUser()
  }, [])

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
    }
  }

  const createTestNotification = async (notificationType) => {
    if (!user) {
      setMessage("Please login first")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          notificationType
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage(`✅ Test ${notificationType} notification created successfully!`)
        
        // Test fetching notifications directly
        setTimeout(async () => {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (currentUser) {
              const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(5)
              
              if (error) {
                console.error('Error fetching notifications directly:', error)
              } else {
                console.log('Direct fetch result:', notifications)
                setMessage(prev => `${prev}\n\n📊 Direct fetch: Found ${notifications?.length || 0} notifications`)
              }
            }
          } catch (err) {
            console.error('Direct fetch error:', err)
          }
        }, 1000)
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className={styles.container}>Please login to test notifications</div>
  }

  const notificationTypes = [
    'friend_request',
    'friend_request_accepted', 
    'new_follower',
    'friend_post',
    'friend_reel',
    'new_message',
    'birthday_reminder'
  ]

  return (
    <div className={styles.container}>
      <h1>Test Notifications</h1>
      <p>User: {user.email}</p>
      
      <div className={styles.notificationTypes}>
        {notificationTypes.map((type) => (
          <button
            key={type}
            onClick={() => createTestNotification(type)}
            disabled={loading}
            className={styles.testButton}
          >
            Test {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes('✅') ? styles.success : styles.error}`}>
          {message}
        </div>
      )}

      <div className={styles.instructions}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click on any test button to create a test notification</li>
          <li>Go to the feed page and click the notification bell</li>
          <li>You should see the test notification in the dropdown</li>
          <li>Click on the notification to test navigation</li>
        </ol>
      </div>
    </div>
  )
}
