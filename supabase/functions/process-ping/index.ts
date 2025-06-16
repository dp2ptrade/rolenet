import { serve } from '@std/http'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PingPayload {
  senderId: string
  receiverId: string
  message: string
  type?: 'connection' | 'collaboration' | 'help' | 'other'
}

interface User {
  id: string
  name: string
  role: string
  avatarUrl: string | null
}

interface NotificationResult {
  success: boolean
  [key: string]: any
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_PINGS = 5
const MAX_MESSAGE_LENGTH = 500

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

    const { senderId, receiverId, message, type = 'connection' }: PingPayload = await req.json()

    // Validate input
    if (!senderId || !receiverId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: senderId, receiverId, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Basic message content validation (no empty or whitespace-only messages)
    if (!message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message cannot be empty or contain only whitespace' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prevent self-ping
    if (senderId === receiverId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot send ping to yourself' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Rate limiting check
    const rateLimitStart = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()
    const { data: recentPings, error: rateLimitError } = await supabaseClient
      .from('pings')
      .select('id')
      .eq('senderId', senderId)
      .gte('createdAt', rateLimitStart)

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
    } else if (recentPings && recentPings.length >= RATE_LIMIT_MAX_PINGS) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait before sending more pings.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if sender and receiver exist
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, role, avatarUrl')
      .in('id', [senderId, receiverId])

    if (usersError) {
      console.error('Users query error:', usersError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to validate users' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!users || users.length !== 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sender or receiver' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const sender: User | undefined = users.find((u: User) => u.id === senderId)
    const receiver: User | undefined = users.find((u: User) => u.id === receiverId)

    if (!sender || !receiver) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sender or receiver not found' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if there's already a pending ping between these users
    const { data: existingPing, error: existingPingError } = await supabaseClient
      .from('pings')
      .select('id')
      .eq('senderId', senderId)
      .eq('receiverId', receiverId)
      .eq('status', 'pending')
      .single()

    if (existingPingError && existingPingError.code !== 'PGRST116') {
      console.error('Existing ping check error:', existingPingError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check existing pings' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingPing) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ping already sent to this user' }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Start a transaction-like operation
    let ping: any = null
    let notificationResult: NotificationResult = { success: false }

    try {
      // Create the ping
      const { data: createdPing, error: pingError } = await supabaseClient
        .from('pings')
        .insert({
          senderId,
          receiverId,
          message: message.trim(),
          type,
          status: 'pending',
          createdAt: new Date().toISOString()
        })
        .select()
        .single()

      if (pingError) {
        throw new Error(`Failed to create ping: ${pingError.message}`)
      }

      ping = createdPing

      // Send push notification to receiver
      const notificationPayload = {
        userId: receiverId,
        title: `New Ping from ${sender.name}`,
        body: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        data: {
          pingId: ping.id,
          senderId,
          senderName: sender.name,
          senderRole: sender.role,
          senderAvatar: sender.avatarUrl,
          type: 'ping'
        },
        type: 'ping' as const
      }

      // Call the send-notification function
      try {
        const notificationResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationPayload)
          }
        )

        if (notificationResponse.ok) {
          notificationResult = await notificationResponse.json()
          console.log('Notification result:', notificationResult)
        } else {
          console.error('Notification request failed:', notificationResponse.status, notificationResponse.statusText)
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
      }

      // Update user activity stats (optional - handle errors gracefully)
      try {
        const [senderStatsResult, receiverStatsResult] = await Promise.allSettled([
          supabaseClient.rpc('increment_user_stat', {
            user_id: senderId,
            stat_name: 'pings_sent'
          }),
          supabaseClient.rpc('increment_user_stat', {
            user_id: receiverId,
            stat_name: 'pings_received'
          })
        ])

        if (senderStatsResult.status === 'rejected') {
          console.error('Failed to update sender stats:', senderStatsResult.reason)
        }
        if (receiverStatsResult.status === 'rejected') {
          console.error('Failed to update receiver stats:', receiverStatsResult.reason)
        }
      } catch (statsError) {
        console.error('Failed to update user stats:', statsError)
      }

      // Create activity log (optional - handle errors gracefully)
      try {
        await supabaseClient
          .from('activityLogs')
          .insert({
            userId: senderId,
            action: 'ping_sent',
            targetUserId: receiverId,
            metadata: {
              pingId: ping.id,
              message: message.substring(0, 100),
              type
            },
            createdAt: new Date().toISOString()
          })
      } catch (logError) {
        console.error('Failed to create activity log:', logError)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          ping: {
            id: ping.id,
            senderId: ping.senderId,
            receiverId: ping.receiverId,
            message: ping.message,
            type: ping.type,
            status: ping.status,
            createdAt: ping.createdAt
          },
          notification_sent: notificationResult.success,
          sender: {
            id: sender.id,
            name: sender.name,
            role: sender.role
          },
          receiver: {
            id: receiver.id,
            name: receiver.name,
            role: receiver.role
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (transactionError) {
      // If ping creation failed, we don't need to rollback since it didn't succeed
      // If ping creation succeeded but other operations failed, we keep the ping
      // since notifications and stats are non-critical
      console.error('Transaction error:', transactionError)
      
      if (!ping) {
        // Ping creation failed
        throw transactionError
      } else {
        // Ping was created but other operations failed - return success with warnings
        return new Response(
          JSON.stringify({ 
            success: true, 
            ping: {
              id: ping.id,
              senderId: ping.senderId,
              receiverId: ping.receiverId,
              message: ping.message,
              type: ping.type,
              status: ping.status,
              createdAt: ping.createdAt
            },
            notification_sent: false,
            warnings: ['Some background operations failed but ping was created successfully']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

  } catch (error) {
    console.error('Error processing ping:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})