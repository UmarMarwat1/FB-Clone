"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, getFriends, getFriendRequests, searchUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeFriend, getFriendStatus } from "../../../lib/supabaseCLient"
import styles from "./friends.module.css"

export default function FriendsPage() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, activeTab])

  async function getUser() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
    } else {
      setUser(data.user)
    }
  }

  async function loadData() {
    setLoading(true)
    setError('')
    
    try {
      if (activeTab === 'friends') {
        const data = await getFriends(user.id)
        setFriends(data || [])
      } else if (activeTab === 'requests') {
        const data = await getFriendRequests(user.id)
        setFriendRequests(data || [])
      }
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    }
    
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    try {
      console.log('Searching for:', searchTerm, 'Current user:', user.id)
      const data = await searchUsers(searchTerm, user.id)
      console.log('Search results:', data)
      const resultsWithStatus = await Promise.all(
        data.map(async (u) => {
          const status = await getFriendStatus(user.id, u.id)
          return { ...u, friendStatus: status }
        })
      )
      setSearchResults(resultsWithStatus)
    } catch (err) {
      setError('Search failed')
      console.error(err)
    }
  }

  // async function handleSendRequest(receiverId) {
  //   try {
  //     await sendFriendRequest(user.id, receiverId)
  //     setError('')
  //     handleSearch() // Refresh search results
  //   } catch (err) {
  //     setError('Failed to send friend request')
  //     console.error(err)
  //   }
  // }
  async function handleSendRequest(receiverId) {
    try {
      await sendFriendRequest(user.id, receiverId)
      setFriendRequests(prev => [...prev, {
        id: Math.random().toString(), // temporary unique ID
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      }])
      setError('')
      handleSearch() // Refresh search results
    } catch (err) {
      setError('Failed to send friend request')
      console.error(err)
    }
  }

  async function handleAcceptRequest(requestId) {
    try {
      await acceptFriendRequest(requestId, user.id)
      setError('')
      loadData()
    } catch (err) {
      setError('Failed to accept request')
      console.error(err)
    }
  }

  async function handleRejectRequest(requestId) {
    try {
      await rejectFriendRequest(requestId, user.id)
      setError('')
      loadData()
    } catch (err) {
      setError('Failed to reject request')
      console.error(err)
    }
  }

  async function handleCancelRequest(requestId) {
    try {
      await cancelFriendRequest(requestId, user.id)
      setError('')
      loadData()
    } catch (err) {
      setError('Failed to cancel request')
      console.error(err)
    }
  }

  async function handleRemoveFriend(friendshipId) {
    try {
      await removeFriend(friendshipId, user.id)
      setError('')
      loadData()
    } catch (err) {
      setError('Failed to remove friend')
      console.error(err)
    }
  }

  const getIncomingRequests = () => {
    return friendRequests.filter(req => req.receiver_id === user?.id && req.status === 'pending')
  }

  const getOutgoingRequests = () => {
    return friendRequests.filter(req => req.sender_id === user?.id && req.status === 'pending')
  }

  const getFriendName = (friendship) => {
    // Get the other user's profile (not the current user)
    const otherUser = friendship.user1_id === user?.id ? friendship.user2 : friendship.user1;
    return otherUser?.username || otherUser?.full_name || `User ${otherUser?.id?.slice(0, 8) || 'Unknown'}`;
  }

  const getFriendAvatar = (friendship) => {
    // Get the other user's profile (not the current user)
    const otherUser = friendship.user1_id === user?.id ? friendship.user2 : friendship.user1;
    const name = otherUser?.username || otherUser?.full_name || otherUser?.id || '';
    return name.charAt(0).toUpperCase();
  }

  const getRequestUserName = (request, isSender = false) => {
    const userId = isSender ? request.sender_id : request.receiver_id
    return `User ${userId.slice(0, 8)}`
  }

  const getRequestUserAvatar = (request, isSender = false) => {
    const userId = isSender ? request.sender_id : request.receiver_id
    return userId.charAt(0).toUpperCase()
  }

  if (!user) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.friendsPage}>
      <div className={styles.friendsContainer}>
        <h1 className={styles.pageTitle}>Friends</h1>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'friends' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'requests' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({getIncomingRequests().length + getOutgoingRequests().length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'search' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading...</div>}
          
          {/* Friends Tab */}
          {activeTab === 'friends' && !loading && (
            <div className={styles.friendsList}>
              {friends.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No friends yet. Start by searching for people!</p>
                </div>
              ) : (
                friends.map((friendship) => (
                  <div key={friendship.id} className={styles.friendCard}>
                    <div className={styles.friendInfo}>
                      <div className={styles.friendAvatar}>
                        {getFriendAvatar(friendship)}
                      </div>
                      <div className={styles.friendDetails}>
                        <h3>{getFriendName(friendship)}</h3>
                        <p>Friends since {new Date(friendship.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      className={styles.removeFriendBtn}
                      onClick={() => handleRemoveFriend(friendship.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && !loading && (
            <div className={styles.requestsSection}>
              {/* Incoming Requests */}
              <div className={styles.requestSection}>
                <h3>Incoming Requests ({getIncomingRequests().length})</h3>
                {getIncomingRequests().length === 0 ? (
                  <p className={styles.noRequests}>No incoming requests</p>
                ) : (
                  getIncomingRequests().map((request) => (
                    <div key={request.id} className={styles.requestCard}>
                      <div className={styles.requestInfo}>
                        <div className={styles.requestAvatar}>
                          {getRequestUserAvatar(request)}
                        </div>
                        <div className={styles.requestDetails}>
                          <h4>{getRequestUserName(request)}</h4>
                          <p>Sent you a friend request</p>
                        </div>
                      </div>
                      <div className={styles.requestActions}>
                        <button 
                          className={styles.acceptBtn}
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          Accept
                        </button>
                        <button 
                          className={styles.rejectBtn}
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Outgoing Requests */}
              <div className={styles.requestSection}>
                <h3>Outgoing Requests ({getOutgoingRequests().length})</h3>
                {getOutgoingRequests().length === 0 ? (
                  <p className={styles.noRequests}>No outgoing requests</p>
                ) : (
                  getOutgoingRequests().map((request) => (
                    <div key={request.id} className={styles.requestCard}>
                      <div className={styles.requestInfo}>
                        <div className={styles.requestAvatar}>
                          {getRequestUserAvatar(request, true)}
                        </div>
                        <div className={styles.requestDetails}>
                          <h4>{getRequestUserName(request, true)}</h4>
                          <p>Friend request sent</p>
                        </div>
                      </div>
                      <button 
                        className={styles.cancelBtn}
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className={styles.searchSection}>
              <div className={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Search by username or full name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className={styles.searchInput}
                />
                <button 
                  className={styles.searchBtn}
                  onClick={handleSearch}
                >
                  Search
                </button>
              </div>

              <div className={styles.searchResults}>
                {searchResults.map((user) => (
                  <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {(user.username || user.full_name || user.id.slice(0, 1)).toUpperCase()}
                      </div>
                      <div className={styles.userDetails}>
                        <h4>{user.username || user.full_name || `User ${user.id.slice(0, 8)}`}</h4>
                        <p>{user.full_name && user.username ? user.full_name : ''}</p>
                      </div>
                    </div>
                    <div className={styles.userActions}>
                      {/* {user.friendStatus?.status === 'friends' && (
                        <span className={styles.friendStatus}>Friends</span>
                      )}
                      {user.friendStatus?.status === 'sent' && (
                        <span className={styles.pendingStatus}>Request Sent</span>
                      )}
                      {user.friendStatus?.status === 'received' && (
                        <span className={styles.pendingStatus}>Request Received</span>
                      )}
                      {user.friendStatus?.status === 'none' && (
                        <button 
                          className={styles.addFriendBtn}
                          onClick={() => handleSendRequest(user.id)}
                        >
                          Add Friend
                        </button>
                      )} */
                        <div className={styles.userActions}>
                        {user.friendStatus?.status === 'friends' && (
                          <span className={styles.friendStatus}>Friends</span>
                        )}
                        {user.friendStatus?.status === 'sent' && (
                          <span className={styles.pendingStatus}>Request Sent</span>
                        )}
                        {user.friendStatus?.status === 'received' && (
                          <span className={styles.pendingStatus}>Request Received</span>
                        )}
                        {user.friendStatus?.status === 'none' && (
                          <button 
                            className={styles.addFriendBtn}
                            onClick={() => handleSendRequest(user.id)}
                          >
                            Add Friend
                          </button>
                        )}
                      </div>
                      }
                    </div>
                  </div>
                ))}
                {searchTerm && searchResults.length === 0 && (
                  <p className={styles.noResults}>No users found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 