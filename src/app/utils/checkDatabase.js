import { supabase } from '../../../lib/supabaseCLient'

export async function checkDatabaseTables() {
  const results = {
    stories: false,
    story_media: false,
    story_views: false,
    profiles: false,
    errors: []
  }

  // Check each table
  const tables = ['stories', 'story_media', 'story_views', 'profiles']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        results.errors.push(`${table}: ${error.message}`)
        results[table] = false
      } else {
        results[table] = true
      }
    } catch (err) {
      results.errors.push(`${table}: ${err.message}`)
      results[table] = false
    }
  }

  return results
}

export async function checkStorageAccess() {
  try {
    // Try to list objects in the stories bucket
    const { data, error } = await supabase.storage
      .from('stories')
      .list('', { limit: 1 })
    
    if (error) {
      return { exists: false, error: error.message }
    }
    
    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}
