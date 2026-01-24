/**
 * Helper function to send push notifications via Supabase Edge Function
 * This should be called from server-side code after creating a notification
 */

interface PushNotificationPayload {
  user_id: string
  title: string
  body: string
  data?: {
    type?: 'new_match' | 'new_comment' | 'trade_requested' | 'trade_confirmed'
    matchId?: string
    url?: string
  }
}

/**
 * Sends a push notification to a user via the Supabase Edge Function
 * This is a fire-and-forget operation - errors are logged but not thrown
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Push notification skipped: missing Supabase configuration')
    return
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Push notification failed:', error)
    }
  } catch (error) {
    // Log but don't throw - push notifications are non-critical
    console.error('Push notification error:', error)
  }
}
