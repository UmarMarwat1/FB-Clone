'use client'
import { createContext, useContext, useState } from 'react'

const CommentsContext = createContext()

export function CommentsProvider({ children }) {
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <CommentsContext.Provider value={{ commentsOpen, setCommentsOpen }}>
      {children}
    </CommentsContext.Provider>
  )
}

export function useComments() {
  const context = useContext(CommentsContext)
  if (!context) {
    throw new Error('useComments must be used within a CommentsProvider')
  }
  return context
}
