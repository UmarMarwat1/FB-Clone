import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

export async function POST(request) {
  try {
    const { userId, notificationType } = await request.json()
    
    if (!userId || !notificationType) {
      return Response.json({ error: 'Missing userId or notificationType' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Create a test notification
    const testNotification = {
      user_id: userId,
      sender_id: userId, // For testing, sender is same as user
      notification_type: notificationType,
      title: `Test ${notificationType.replace('_', ' ')}`,
      message: `This is a test notification for ${notificationType}`,
      related_id: '00000000-0000-0000-0000-000000000000',
      related_type: 'test'
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()

    if (error) {
      console.error('Error creating test notification:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, notification: data[0] })
  } catch (error) {
    console.error('Test notification error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
