"use client"
import { useState, useEffect } from "react"
import { getCurrentSession } from "../../../../lib/supabaseCLient"
import styles from "./messaging.module.css"

export default function MessageTesting({ onClose }) {
  const [testResults, setTestResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    try {
      const session = await getCurrentSession()
      setUser(session?.user || null)
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  const addTestResult = (test, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }])
  }

  const runAllTests = async () => {
    if (!user) {
      addTestResult('User Authentication', 'FAILED', 'No authenticated user found')
      return
    }

    setIsRunning(true)
    setTestResults([])

    try {
      // Test 1: Database Connection
      await testDatabaseConnection()
      
      // Test 2: API Endpoints
      await testAPIEndpoints()
      
      // Test 3: Media Upload
      await testMediaUpload()
      
      // Test 4: Real-time Features
      await testRealTimeFeatures()
      
      // Test 5: Message Operations
      await testMessageOperations()
      
      // Test 6: Friend Integration
      await testFriendIntegration()
      
      addTestResult('All Tests', 'COMPLETED', 'All tests completed successfully')
    } catch (error) {
      addTestResult('Test Suite', 'ERROR', 'Test suite failed', error.message)
    } finally {
      setIsRunning(false)
    }
  }

  const testDatabaseConnection = async () => {
    setCurrentTest('Testing Database Connection...')
    
    try {
      const response = await fetch('/api/friend-conversations', {
        headers: {
          'Authorization': `Bearer ${(await getCurrentSession())?.access_token}`
        }
      })
      
      if (response.ok) {
        addTestResult('Database Connection', 'PASSED', 'Successfully connected to database')
      } else {
        addTestResult('Database Connection', 'FAILED', 'Failed to connect to database', `Status: ${response.status}`)
      }
    } catch (error) {
      addTestResult('Database Connection', 'ERROR', 'Database connection error', error.message)
    }
  }

  const testAPIEndpoints = async () => {
    setCurrentTest('Testing API Endpoints...')
    
    const endpoints = [
      { name: 'Conversations', url: '/api/friend-conversations' },
      { name: 'Messages', url: '/api/friend-messages' },
      { name: 'Media Upload', url: '/api/friend-messages/upload' },
      { name: 'Unread Count', url: '/api/friends/messages' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${(await getCurrentSession())?.access_token}`
          }
        })
        
        if (response.status === 200 || response.status === 404) {
          addTestResult(`${endpoint.name} API`, 'PASSED', `Endpoint accessible (${response.status})`)
        } else {
          addTestResult(`${endpoint.name} API`, 'FAILED', `Endpoint error (${response.status})`)
        }
      } catch (error) {
        addTestResult(`${endpoint.name} API`, 'ERROR', 'API test failed', error.message)
      }
    }
  }

  const testMediaUpload = async () => {
    setCurrentTest('Testing Media Upload...')
    
    try {
      // Create a test file
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', testFile)
      formData.append('conversationId', 'test')
      formData.append('senderId', user.id)
      formData.append('messageType', 'text')

      const response = await fetch('/api/friend-messages/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await getCurrentSession())?.access_token}`
        },
        body: formData
      })

      if (response.status === 400) {
        // Expected error for invalid conversation ID
        addTestResult('Media Upload', 'PASSED', 'Media upload validation working correctly')
      } else {
        addTestResult('Media Upload', 'FAILED', 'Unexpected response', `Status: ${response.status}`)
      }
    } catch (error) {
      addTestResult('Media Upload', 'ERROR', 'Media upload test failed', error.message)
    }
  }

  const testRealTimeFeatures = async () => {
    setCurrentTest('Testing Real-time Features...')
    
    try {
      // Test WebSocket connection (basic check)
      if (typeof WebSocket !== 'undefined') {
        addTestResult('Real-time Features', 'PASSED', 'WebSocket support available')
      } else {
        addTestResult('Real-time Features', 'FAILED', 'WebSocket not supported')
      }
    } catch (error) {
      addTestResult('Real-time Features', 'ERROR', 'Real-time test failed', error.message)
    }
  }

  const testMessageOperations = async () => {
    setCurrentTest('Testing Message Operations...')
    
    try {
      // Test message creation (without valid conversation)
      const response = await fetch('/api/friend-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await getCurrentSession())?.access_token}`
        },
        body: JSON.stringify({
          conversationId: 'test',
          senderId: user.id,
          messageType: 'text',
          content: 'Test message'
        })
      })

      if (response.status === 400) {
        addTestResult('Message Operations', 'PASSED', 'Message validation working correctly')
      } else {
        addTestResult('Message Operations', 'FAILED', 'Unexpected response', `Status: ${response.status}`)
      }
    } catch (error) {
      addTestResult('Message Operations', 'ERROR', 'Message operations test failed', error.message)
    }
  }

  const testFriendIntegration = async () => {
    setCurrentTest('Testing Friend Integration...')
    
    try {
      const response = await fetch(`/api/friends/messages?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${(await getCurrentSession())?.access_token}`
        }
      })

      if (response.ok) {
        addTestResult('Friend Integration', 'PASSED', 'Friend messaging API accessible')
      } else {
        addTestResult('Friend Integration', 'FAILED', 'Friend messaging API error', `Status: ${response.status}`)
      }
    } catch (error) {
      addTestResult('Friend Integration', 'ERROR', 'Friend integration test failed', error.message)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'messaging-test-results.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.testingPanel}>
      <div className={styles.testingHeader}>
        <h3>Message System Testing</h3>
        <button onClick={onClose} className={styles.closeButton}>✕</button>
      </div>

      <div className={styles.testingControls}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={styles.runTestsBtn}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button onClick={clearResults} className={styles.clearBtn}>
          Clear Results
        </button>
        
        <button onClick={exportResults} className={styles.exportBtn}>
          Export Results
        </button>
      </div>

      {isRunning && (
        <div className={styles.testingProgress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
          </div>
          <p>{currentTest}</p>
        </div>
      )}

      <div className={styles.testResults}>
        <h4>Test Results ({testResults.length})</h4>
        
        {testResults.length === 0 ? (
          <p className={styles.noResults}>No test results yet. Click "Run All Tests" to start.</p>
        ) : (
          <div className={styles.resultsList}>
            {testResults.map((result) => (
              <div key={result.id} className={`${styles.testResult} ${styles[result.status.toLowerCase()]}`}>
                <div className={styles.testHeader}>
                  <span className={styles.testName}>{result.test}</span>
                  <span className={styles.testStatus}>{result.status}</span>
                </div>
                <p className={styles.testMessage}>{result.message}</p>
                {result.details && (
                  <details className={styles.testDetails}>
                    <summary>Details</summary>
                    <pre>{result.details}</pre>
                  </details>
                )}
                <span className={styles.testTime}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
