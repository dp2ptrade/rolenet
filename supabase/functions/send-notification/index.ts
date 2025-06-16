import { serve } from '@std/http'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, any>
  type: 'ping' | 'message' | 'friend_request' | 'call'
  priority?: 'default' | 'normal' | 'high'
  sound?: string
  badge?: number
  ttl?: number // Time to live in seconds
}

interface ExpoMessage {
  to: string
  sound: string
  title: string
  body: string
  data: Record<string, any>
  priority?: 'default' | 'normal' | 'high'
  badge?: number
  ttl?: number
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      userId, 
      title, 
      body, 
      data, 
      type, 
      priority = 'default',
      sound = 'default',
      badge,
      ttl = 2419200 // 4 weeks default
    }: NotificationPayload = await req.json()

    // Validate required fields
    if (!userId || !title || !body || !type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId, title, body, type' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate notification type
    const validTypes = ['ping', 'message', 'friend_request', 'call']
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's push token and preferences from database
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('pushToken, notificationPreferences, isActive')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `User not found: ${userError?.message || 'Unknown error'}` 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user account is active
    if (user.isActive === false) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User account is inactive' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has notifications enabled for this type
    const preferences = user.notificationPreferences || {}
    if (preferences[type] === false) {
      // Still log the notification but mark as skipped
      await supabaseClient
        .from('notifications')
        .insert({
          userId,
          title,
          body,
          type,
          data,
          sentAt: new Date().toISOString(),
          status: 'skipped_preferences'
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification disabled by user preferences' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user.pushToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No push token found for user' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate push token format (Expo tokens start with ExponentPushToken)
    if (!user.pushToken.startsWith('ExponentPushToken[') && !user.pushToken.startsWith('ExpoPushToken[')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid push token format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare the push notification message
    const message: ExpoMessage = {
      to: user.pushToken,
      sound,
      title: title.slice(0, 100), // Limit title length
      body: body.slice(0, 200), // Limit body length
      data: {
        ...data,
        type,
        timestamp: new Date().toISOString(),
        userId
      },
      priority,
      ttl
    }

    // Add badge if provided
    if (badge !== undefined && badge >= 0) {
      message.badge = badge
    }

    // Send push notification using Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!expoResponse.ok) {
      throw new Error(`Expo API request failed: ${expoResponse.status} ${expoResponse.statusText}`)
    }

    const result = await expoResponse.json()

    // Check for errors in the response
    if (result.data && result.data[0]) {
      const pushResult = result.data[0]
      
      if (pushResult.status === 'error') {
        // Handle specific error types
        if (pushResult.details?.error === 'DeviceNotRegistered') {
          // Remove invalid push token
          await supabaseClient
            .from('users')
            .update({ pushToken: null })
            .eq('id', userId)
        }
        
        throw new Error(`Push notification failed: ${pushResult.message || pushResult.details?.error}`)
      }
    }

    // Log successful notification in database
    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert({
        userId,
        title: message.title,
        body: message.body,
        type,
        data,
        sentAt: new Date().toISOString(),
        status: 'sent',
        expoTicket: result.data?.[0]?.id
      })

    if (insertError) {
      console.error('Failed to log notification:', insertError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        message: 'Notification sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    
    // Try to log the failed notification
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const payload = await req.json().catch(() => ({}))
      
      await supabaseClient
        .from('notifications')
        .insert({
          userId: payload.userId || 'unknown',
          title: payload.title || 'Failed notification',
          body: payload.body || 'Failed to send',
          type: payload.type || 'unknown',
          data: payload.data || {},
          sentAt: new Date().toISOString(),
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        })
    } catch (logError) {
      console.error('Failed to log error notification:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})