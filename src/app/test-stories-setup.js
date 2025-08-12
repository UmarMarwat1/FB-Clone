// Simple script to test stories database setup
// Run this in browser console to debug database issues

import { supabase } from '../../lib/supabaseCLient'

export async function testStoriesSetup() {
  console.log('Testing Stories Database Setup...')
  
  const results = {
    connection: false,
    tables: {},
    storage: {},
    user: null,
    errors: []
  }

  try {
    // Test connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      results.errors.push(`Connection: ${connectionError.message}`)
    } else {
      results.connection = true
      console.log('✅ Connection successful')
    }

    // Test current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      results.errors.push(`User auth: ${userError.message}`)
    } else {
      results.user = user
      console.log('✅ User authenticated:', user?.email)
    }

    // Test each table
    const tables = ['stories', 'story_media', 'story_views', 'profiles']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          results.tables[table] = { exists: false, error: error.message }
          results.errors.push(`Table ${table}: ${error.message}`)
          console.log(`❌ Table ${table}:`, error.message)
        } else {
          results.tables[table] = { exists: true, count: data.length }
          console.log(`✅ Table ${table}: exists`)
        }
      } catch (err) {
        results.tables[table] = { exists: false, error: err.message }
        results.errors.push(`Table ${table}: ${err.message}`)
        console.log(`❌ Table ${table}:`, err.message)
      }
    }

    // Test storage
    try {
      const { data, error } = await supabase.storage
        .from('stories')
        .list('', { limit: 1 })
      
      if (error) {
        results.storage = { exists: false, error: error.message }
        results.errors.push(`Storage: ${error.message}`)
        console.log('❌ Storage bucket:', error.message)
      } else {
        results.storage = { exists: true }
        console.log('✅ Storage bucket: accessible')
      }
    } catch (err) {
      results.storage = { exists: false, error: err.message }
      results.errors.push(`Storage: ${err.message}`)
      console.log('❌ Storage bucket:', err.message)
    }

    // Summary
    console.log('\n=== SETUP SUMMARY ===')
    console.log('Connection:', results.connection ? '✅' : '❌')
    console.log('User:', results.user ? '✅' : '❌')
    console.log('Tables:')
    Object.entries(results.tables).forEach(([table, status]) => {
      console.log(`  ${table}: ${status.exists ? '✅' : '❌'}`)
    })
    console.log('Storage:', results.storage.exists ? '✅' : '❌')
    
    if (results.errors.length > 0) {
      console.log('\n=== ERRORS ===')
      results.errors.forEach(error => console.log('❌', error))
    }

    return results
  } catch (error) {
    console.error('Setup test failed:', error)
    results.errors.push(`Setup test: ${error.message}`)
    return results
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.testStoriesSetup = testStoriesSetup
  console.log('Run testStoriesSetup() to check your database setup')
}
