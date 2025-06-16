# RoleNet Supabase Edge Functions

This directory contains the Edge Functions for the RoleNet app, providing server-side logic for push notifications and ping processing.

## Functions Overview

### 1. send-notification

Handles push notifications via the Expo Push API.

**Endpoint**: `https://your-project.supabase.co/functions/v1/send-notification`

**Method**: POST

**Headers**:
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Request Body**:
```typescript
{
  userId: string;           // Target user ID
  title: string;           // Notification title
  body: string;            // Notification body
  data?: object;           // Optional additional data
  type: 'ping' | 'message' | 'friend_request' | 'call';
}
```

**Response**:
```typescript
{
  success: boolean;
  result?: object;         // Expo push result
  error?: string;          // Error message if failed
}
```

**Features**:
- Validates user notification preferences
- Sends push notifications via Expo Push API
- Logs notification delivery status in database
- Handles different notification types
- Respects user's notification settings

**Example Usage**:
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-notification`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: 'user-uuid',
      title: 'New Ping!',
      body: 'You received a new ping from John',
      type: 'ping',
      data: {
        pingId: 'ping-uuid',
        senderId: 'sender-uuid'
      }
    })
  }
);
```

### 2. process-ping

Processes ping requests with comprehensive business logic.

**Endpoint**: `https://your-project.supabase.co/functions/v1/process-ping`

**Method**: POST

**Headers**:
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Request Body**:
```typescript
{
  senderId: string;        // Sender user ID
  receiverId: string;      // Receiver user ID
  message: string;         // Ping message
  type?: 'connection' | 'collaboration' | 'help' | 'other';
}
```

**Response**:
```typescript
{
  success: boolean;
  ping?: object;           // Created ping object
  notification_sent?: boolean; // Whether notification was sent
  error?: string;          // Error message if failed
}
```

**Features**:
- Validates sender and receiver exist
- Prevents duplicate pending pings
- Creates ping record in database
- Automatically triggers push notification
- Updates user activity statistics
- Logs user activities
- Handles various ping types

**Example Usage**:
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/process-ping`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      senderId: 'sender-uuid',
      receiverId: 'receiver-uuid',
      message: 'Hi! I\'d like to connect with you for a project collaboration.',
      type: 'collaboration'
    })
  }
);
```

## Deployment

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

### Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy send-notification
supabase functions deploy process-ping
```

### Local Development

```bash
# Start local development server
supabase functions serve

# Test functions locally
curl -X POST http://localhost:54321/functions/v1/send-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","title":"Test","body":"Test notification","type":"ping"}'
```

## Environment Variables

The following environment variables are automatically available in Edge Functions:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)

## Database Dependencies

These functions require the following database tables:

- `users`: User information and push tokens
- `pings`: Ping records
- `notifications`: Notification logs
- `activity_logs`: User activity tracking
- `user_stats`: User statistics

Make sure to run the database schema from `lib/database-schema.sql` before deploying.

## Error Handling

Both functions include comprehensive error handling:

- **400 Bad Request**: Missing or invalid input parameters
- **404 Not Found**: User not found
- **409 Conflict**: Duplicate ping attempt
- **500 Internal Server Error**: Database or external API errors

All errors return a JSON response with `success: false` and an `error` message.

## Security

- Functions use Row Level Security (RLS) policies
- Service role key is used for admin operations
- User permissions are validated before operations
- Push tokens are securely stored and accessed

## Monitoring

Monitor function performance and errors in the Supabase dashboard:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click on each function to view:
   - Invocation logs
   - Error rates
   - Performance metrics
   - Recent executions

## Troubleshooting

### Common Issues

1. **"User not found"**: Ensure user exists in the database
2. **"No push token"**: User needs to register for push notifications
3. **"Notification disabled"**: Check user's notification preferences
4. **"Duplicate ping"**: User already has a pending ping to the same receiver

### Debug Mode

Enable debug logging by checking the function logs in the Supabase dashboard.

## Integration with React Native App

To use these functions in your RoleNet app:

1. **For sending pings**: Use the `process-ping` function instead of directly inserting into the database
2. **For notifications**: The `send-notification` function is called automatically by `process-ping`
3. **Manual notifications**: Call `send-notification` directly for custom notifications

```typescript
// In your React Native app
import { supabase } from './lib/supabase';

// Send a ping (recommended approach)
const sendPing = async (receiverId: string, message: string) => {
  const { data, error } = await supabase.functions.invoke('process-ping', {
    body: {
      senderId: currentUser.id,
      receiverId,
      message,
      type: 'connection'
    }
  });
  
  if (error) {
    console.error('Failed to send ping:', error);
    return;
  }
  
  console.log('Ping sent successfully:', data);
};

// Send custom notification
const sendCustomNotification = async (userId: string, title: string, body: string) => {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: {
      userId,
      title,
      body,
      type: 'message'
    }
  });
  
  if (error) {
    console.error('Failed to send notification:', error);
    return;
  }
  
  console.log('Notification sent:', data);
};
```

## Performance Considerations

- Functions are optimized for fast execution
- Database queries use proper indexes
- Push notifications are sent asynchronously
- Error handling prevents function crashes
- Proper CORS headers for web compatibility

## Future Enhancements

Potential improvements:

1. **Batch notifications**: Send multiple notifications in one request
2. **Scheduled notifications**: Support for delayed notifications
3. **Rich notifications**: Support for images and actions
4. **Analytics**: Track notification open rates
5. **A/B testing**: Support for notification variants