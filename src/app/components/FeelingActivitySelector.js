"use client"
import { useState } from 'react'
import styles from './feelingActivitySelector.module.css'

const FEELINGS = [
  { name: 'Happy', emoji: '😊', color: '#FFD700' },
  { name: 'Excited', emoji: '🤩', color: '#FF6B6B' },
  { name: 'Love', emoji: '❤️', color: '#E91E63' },
  { name: 'Grateful', emoji: '🙏', color: '#4CAF50' },
  { name: 'Proud', emoji: '😎', color: '#2196F3' },
  { name: 'Relaxed', emoji: '😌', color: '#9C27B0' },
  { name: 'Motivated', emoji: '💪', color: '#FF9800' },
  { name: 'Blessed', emoji: '🙌', color: '#795548' },
  { name: 'Thankful', emoji: '😇', color: '#607D8B' },
  { name: 'Laughing', emoji: '😂', color: '#FFEB3B' },
  { name: 'Cool', emoji: '😎', color: '#00BCD4' },
  { name: 'Amazing', emoji: '🤯', color: '#8BC34A' },
  { name: 'Loved', emoji: '🥰', color: '#F44336' },
  { name: 'Peaceful', emoji: '☮️', color: '#3F51B5' },
  { name: 'Joyful', emoji: '😄', color: '#FFC107' },
  { name: 'Surprised', emoji: '😲', color: '#9E9E9E' }
]

const ACTIVITIES = [
  { name: 'Eating', icon: '🍽️', color: '#FF6B6B' },
  { name: 'Traveling', icon: '✈️', color: '#4ECDC4' },
  { name: 'Working', icon: '💼', color: '#45B7D1' },
  { name: 'Studying', icon: '📚', color: '#F7DC6F' },
  { name: 'Shopping', icon: '🛍️', color: '#BB8FCE' },
  { name: 'Cooking', icon: '👨‍🍳', color: '#82E0AA' },
  { name: 'Gaming', icon: '🎮', color: '#F1948A' },
  { name: 'Reading', icon: '📖', color: '#85C1E9' },
  { name: 'Exercising', icon: '🏃', color: '#52BE80' },
  { name: 'Sleeping', icon: '😴', color: '#AEB6BF' },
  { name: 'Watching', icon: '📺', color: '#F8C471' },
  { name: 'Listening to music', icon: '🎵', color: '#D7BDE2' },
  { name: 'Dancing', icon: '💃', color: '#FAD7A0' },
  { name: 'Driving', icon: '🚗', color: '#A9DFBF' },
  { name: 'Walking', icon: '🚶', color: '#F9E79F' },
  { name: 'Swimming', icon: '🏊', color: '#A3E4D7' },
  { name: 'Playing', icon: '⚽', color: '#FADBD8' },
  { name: 'Celebrating', icon: '🎉', color: '#D5A6BD' },
  { name: 'Relaxing', icon: '🧘', color: '#AED6F1' },
  { name: 'Praying', icon: '🤲', color: '#D2B4DE' }
]

export default function FeelingActivitySelector({ onSelectionChange, initialSelection = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('feelings')
  const [selection, setSelection] = useState(initialSelection || { type: null, value: null, emoji: null })
  const [searchTerm, setSearchTerm] = useState('')

  const handleSelection = (type, item) => {
    const newSelection = {
      type,
      value: item.name,
      emoji: item.emoji || item.icon,
      color: item.color
    }
    setSelection(newSelection)
    onSelectionChange(newSelection)
    setIsOpen(false)
    setSearchTerm('')
  }

  const clearSelection = () => {
    const emptySelection = { type: null, value: null, emoji: null }
    setSelection(emptySelection)
    onSelectionChange(emptySelection)
  }

  const filteredFeelings = FEELINGS.filter(feeling =>
    feeling.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredActivities = ACTIVITIES.filter(activity =>
    activity.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.selectorContainer}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`${styles.triggerBtn} ${selection.value ? styles.hasSelection : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.triggerIcon}>😊</span>
        <span className={styles.triggerText}>
          {selection.value ? (
            <span style={{ color: selection.color }}>
              {selection.emoji} {selection.type === 'feeling' ? 'Feeling' : 'Activity'}: {selection.value}
            </span>
          ) : (
            'Feeling/Activity'
          )}
        </span>
        {selection.value && (
          <span
            className={styles.clearBtn}
            onClick={(e) => {
              e.stopPropagation()
              clearSelection()
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                clearSelection()
              }
            }}
          >
            ✕
          </span>
        )}
      </button>

      {/* Selection Modal */}
      {isOpen && (
        <div className={styles.modal} onClick={() => setIsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>How are you feeling?</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search feelings or activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Tabs */}
            <div className={styles.tabContainer}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'feelings' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('feelings')}
              >
                😊 Feelings
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'activities' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('activities')}
              >
                🎯 Activities
              </button>
            </div>

            {/* Content */}
            <div className={styles.optionsContainer}>
              {activeTab === 'feelings' && (
                <div className={styles.optionsGrid}>
                  {filteredFeelings.map((feeling) => (
                    <button
                      key={feeling.name}
                      type="button"
                      className={`${styles.optionBtn} ${
                        selection.value === feeling.name && selection.type === 'feeling' ? styles.selected : ''
                      }`}
                      onClick={() => handleSelection('feeling', feeling)}
                      style={{ '--accent-color': feeling.color }}
                    >
                      <span className={styles.optionEmoji}>{feeling.emoji}</span>
                      <span className={styles.optionText}>{feeling.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'activities' && (
                <div className={styles.optionsGrid}>
                  {filteredActivities.map((activity) => (
                    <button
                      key={activity.name}
                      type="button"
                      className={`${styles.optionBtn} ${
                        selection.value === activity.name && selection.type === 'activity' ? styles.selected : ''
                      }`}
                      onClick={() => handleSelection('activity', activity)}
                      style={{ '--accent-color': activity.color }}
                    >
                      <span className={styles.optionEmoji}>{activity.icon}</span>
                      <span className={styles.optionText}>{activity.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* No Results */}
            {searchTerm && (
              (activeTab === 'feelings' && filteredFeelings.length === 0) ||
              (activeTab === 'activities' && filteredActivities.length === 0)
            ) && (
              <div className={styles.noResults}>
                <p>No {activeTab} found for &quot;{searchTerm}&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
