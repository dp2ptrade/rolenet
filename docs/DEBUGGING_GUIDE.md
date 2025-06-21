# 🔍 Media Upload Debugging Guide

## Enhanced Error Logging Implementation

We've implemented comprehensive error logging throughout the media upload pipeline to help identify the root cause of `net::ERR_CONNECTION_RESET` errors.

### 📊 Logging Coverage

#### 1. MediaPicker Component
- **Image Selection**: Logs permission status, picker results, asset details
- **Camera Capture**: Logs camera permissions, capture results, photo details
- **Error Handling**: Detailed error objects with stack traces

#### 2. Supabase Service (uploadMedia)
- **Authentication**: User verification and session status
- **File Processing**: Blob creation, size validation, type checking
- **Upload Process**: Upload timing, progress, and detailed error responses
- **URL Generation**: Public URL creation and validation

#### 3. Chat Screen (handleMediaSelected)
- **Media Validation**: URI, size, and type validation
- **Upload Flow**: Complete upload process tracking
- **Error Classification**: User-friendly error messages based on error type

## 🔧 Debugging Steps

### Step 1: Monitor Console Logs

With enhanced logging enabled, monitor the console for:

```
📸 Starting image picker...
📸 Image picker result: { canceled: false, assetsCount: 1 }
📸 Selected asset: { uri: "...", type: "image", fileSize: 1234567 }
💬 Media selected in chat: { uri: "...", size: 1234567 }
🔄 Starting media upload process...
🔐 Checking user authentication...
✅ User authenticated: user-id-123
📝 Generated filename: user-id-123/1703123456789.jpg
🔄 Converting URI to blob...
✅ Blob created: { size: 1234567, type: "image/jpeg" }
☁️ Uploading to Supabase Storage...
⏱️ Upload took 2500ms
✅ Upload successful
🔗 Getting public URL...
✅ Public URL generated: https://...
💬 Media upload completed in 2500ms
```

### Step 2: Check for Specific Error Patterns

#### Authentication Errors
```
❌ Authentication failed: { message: "...", ... }
```
**Solution**: Check user session, re-authenticate if needed

#### File Size Errors
```
❌ File too large: 15728640
```
**Solution**: Implement client-side compression or size limits

#### Network/Connection Errors
```
❌ Failed to fetch file: 0 
❌ Supabase upload error: { message: "...", statusCode: 0 }
```
**Solution**: Check network connectivity, retry mechanism

#### CORS/Domain Errors
```
❌ Supabase upload error: { message: "CORS error", statusCode: 0 }
```
**Solution**: Verify Supabase project CORS settings

### Step 3: Test Different Scenarios

#### File Type Testing
```bash
# Test with different image formats
- JPEG images (small, medium, large)
- PNG images with transparency
- HEIC images from iOS devices
- WebP images
```

#### Size Testing
```bash
# Test file size limits
- Very small files (< 100KB)
- Medium files (1-5MB)
- Large files (5-10MB)
- Oversized files (> 10MB)
```

#### Network Conditions
```bash
# Test under different network conditions
- Strong WiFi connection
- Weak WiFi connection
- Mobile data (4G/5G)
- Airplane mode toggle
```

### Step 4: Supabase Project Verification

#### Check Project Status
1. Visit [Supabase Dashboard](https://app.supabase.com)
2. Verify project is active and not paused
3. Check API usage limits and quotas
4. Verify storage bucket exists and is configured

#### Verify Storage Configuration
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'chat-media';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

#### Test Storage Access
```javascript
// Test basic storage access
const { data, error } = await supabase.storage
  .from('chat-media')
  .list('', { limit: 1 });

console.log('Storage test:', { data, error });
```

### Step 5: Network Request Monitoring

#### Enable Network Debugging
```javascript
// Add to lib/supabase.ts for detailed network logging
if (__DEV__) {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    console.log('🌐 Network Request:', {
      url: typeof url === 'string' ? url : url.toString(),
      method: options?.method || 'GET',
      headers: options?.headers,
      bodySize: options?.body ? JSON.stringify(options.body).length : 0
    });
    
    try {
      const response = await originalFetch(url, options);
      console.log('🌐 Network Response:', {
        url: typeof url === 'string' ? url : url.toString(),
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response;
    } catch (error) {
      console.error('🌐 Network Error:', {
        url: typeof url === 'string' ? url : url.toString(),
        error: error.message
      });
      throw error;
    }
  };
}
```

### Step 6: Implement Retry Logic

#### Add Retry Mechanism
```javascript
// Enhanced upload with retry logic
static async uploadMediaWithRetry(uri: string, bucket: string = 'chat-media', maxRetries: number = 3): Promise<string> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Upload attempt ${attempt}/${maxRetries}`);
      return await this.uploadMedia(uri, bucket);
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Upload attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

## 🚨 Common Issues and Solutions

### Issue 1: Connection Reset During Upload
**Symptoms**: `net::ERR_CONNECTION_RESET` in console
**Possible Causes**:
- Network timeout during large file upload
- Supabase project rate limiting
- Mobile network instability
- File corruption during blob conversion

**Solutions**:
1. Implement file compression before upload
2. Add retry logic with exponential backoff
3. Split large files into chunks
4. Validate file integrity before upload

### Issue 2: Authentication Failures
**Symptoms**: "User not authenticated" errors
**Possible Causes**:
- Expired session tokens
- Invalid Supabase configuration
- User logged out during upload

**Solutions**:
1. Refresh session before upload
2. Implement automatic re-authentication
3. Verify Supabase client configuration

### Issue 3: CORS Errors
**Symptoms**: CORS-related error messages
**Possible Causes**:
- Incorrect allowed origins in Supabase
- Missing authentication headers
- Invalid API endpoint configuration

**Solutions**:
1. Update Supabase CORS settings
2. Verify authentication token inclusion
3. Check API endpoint configuration

## 📈 Performance Monitoring

### Key Metrics to Track
- Upload duration (target: < 5 seconds for 5MB files)
- Success rate (target: > 95%)
- Retry frequency (target: < 10%)
- Error distribution by type

### Monitoring Implementation
```javascript
// Add to your analytics service
const trackUploadMetrics = (metrics: {
  duration: number;
  fileSize: number;
  success: boolean;
  errorType?: string;
  retryCount?: number;
}) => {
  // Send to your analytics service
  console.log('📊 Upload Metrics:', metrics);
};
```

## 🔍 Next Steps

1. **Run the app with enhanced logging** and attempt media uploads
2. **Collect and analyze logs** to identify failure patterns
3. **Test different file types and sizes** to isolate issues
4. **Monitor network requests** to identify connection problems
5. **Implement retry logic** for improved reliability
6. **Contact Supabase support** if issues persist with project-specific problems

The enhanced logging will provide detailed insights into where exactly the upload process is failing, making it much easier to identify and resolve the root cause of the connection reset errors.