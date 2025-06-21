# Media Picker Implementation Guide

This guide explains the media picker functionality that has been added to the RoleNet chat system, allowing users to upload and share images and files.

## 🚀 Features Added

### 1. Media Picker Component
- **Image Selection**: Choose images from photo library
- **Camera Integration**: Take photos directly from the app
- **File Upload**: Upload documents and other file types
- **Loading States**: Visual feedback during upload process
- **Permission Handling**: Automatic permission requests for camera and media library

### 2. Media Upload System
- **Supabase Storage Integration**: Secure file storage using Supabase Storage
- **Automatic File Naming**: Unique file names to prevent conflicts
- **Public URL Generation**: Accessible URLs for shared media
- **Error Handling**: Comprehensive error handling with user feedback

### 3. Enhanced Chat Interface
- **Media Message Display**: Proper rendering of images and files in chat
- **File Interaction**: Clickable file attachments
- **Upload Progress**: Loading indicators during media upload
- **Message Types**: Support for text, image, and file message types

## 📦 Dependencies Added

```json
{
  "expo-document-picker": "latest",
  "expo-image-picker": "^16.0.6" (already installed)
}
```

## 🗂️ Files Modified/Created

### New Files:
1. `components/MediaPicker.tsx` - Main media picker component
2. `tmp/supabase_sql/setup_chat_media_storage.sql` - Storage bucket setup
3. `MEDIA_PICKER_SETUP.md` - This documentation file

### Modified Files:
1. `lib/supabaseService.ts` - Added media upload functionality
2. `app/chat.tsx` - Integrated media picker and enhanced message rendering
3. `package.json` - Added expo-document-picker dependency

## 🛠️ Setup Instructions

### 1. Database Setup
Run the SQL script to create the storage bucket and policies:

```sql
-- Execute the contents of tmp/supabase_sql/setup_chat_media_storage.sql
-- in your Supabase SQL Editor
```

### 2. Storage Configuration
Ensure your Supabase project has:
- Storage enabled
- Public access configured for the `chat-media` bucket
- Proper RLS policies (included in the SQL script)

### 3. App Configuration
The media picker is automatically integrated into the chat interface. No additional configuration required.

## 🎯 Usage

### For Users:
1. **Open any chat conversation**
2. **Tap the attachment icon** (📎) next to the text input
3. **Choose from options**:
   - Photo Library: Select existing images
   - Take Photo: Capture new photos
   - Document: Upload files
4. **Wait for upload** (loading indicator will show)
5. **Message sent** with media attachment

### For Developers:

#### MediaPicker Component
```tsx
import MediaPicker from '@/components/MediaPicker';

<MediaPicker
  onMediaSelected={handleMediaSelected}
  disabled={isUploadingMedia}
/>
```

#### Upload Media Function
```tsx
const { data, error, publicUrl } = await ChatService.uploadMedia({
  uri: media.uri,
  type: media.type,
  name: media.name,
});
// Media is automatically stored in user-specific folder (user.id) for security
```

## 🔧 Technical Implementation

### Message Deletion
When a message with media is deleted:
1. The message record is retrieved to check for media content
2. The message is deleted from the database
3. If media exists, the associated file is automatically removed from storage

### Media Upload Flow
1. User selects media through MediaPicker
2. Current user ID is retrieved for secure storage
3. File is uploaded to user-specific folder in Supabase Storage
4. Public URL is generated
5. Message is created with media URL and type
6. Real-time message appears in chat

### File Storage Structure
```
chat-media/
├── {user_id}/
│   ├── {timestamp}-{random}.jpg
│   ├── {timestamp}-{random}.pdf
│   └── {timestamp}-{random}.docx
└── {another_user_id}/
    ├── {timestamp}-{random}.jpg
    └── {timestamp}-{random}.png
```

### Message Types
- **Text**: Regular text messages
- **Image**: Messages with image attachments
- **File**: Messages with document attachments

## 🎨 UI/UX Features

### Visual Indicators
- **Loading spinner** during upload
- **File icons** for different file types
- **Image previews** in chat bubbles
- **Tap to open** for file attachments

### Error Handling
- Permission denied alerts
- Upload failure notifications
- Network error handling
- File size validation (handled by Supabase)

## 🔒 Security Features

### Storage Policies
- **Authenticated access only**: Users must be logged in
- **Upload permissions**: Users can only upload to their own user-specific folder in the chat-media bucket
- **View permissions**: Users can view all chat media
- **Delete permissions**: Users can only delete their own files
- **User isolation**: Media files are stored in user-specific folders for improved security

### File Validation
- **Content type checking**: Validates file types
- **Automatic file naming**: Prevents naming conflicts
- **Secure URLs**: Public URLs with Supabase security

## 🚨 Troubleshooting

### Common Issues

1. **Upload fails**
   - Check Supabase Storage is enabled
   - Verify bucket policies are applied
   - Ensure user is authenticated

2. **Permission errors**
   - Grant camera/media library permissions
   - Check app permissions in device settings

3. **Images not displaying**
   - Verify public URL generation
   - Check bucket public access settings
   - Ensure RLS policies allow SELECT

### Debug Steps
1. Check console logs for error messages
2. Verify Supabase Storage dashboard
3. Test with different file types
4. Check network connectivity

## 🔄 Future Enhancements

### Potential Improvements
- **File size limits**: Add client-side validation
- **Image compression**: Reduce file sizes before upload
- **Progress indicators**: Show upload progress percentage
- **File previews**: Preview files before sending
- **Media gallery**: View all shared media in conversation
- **Download functionality**: Save media to device

### Performance Optimizations
- **Lazy loading**: Load images on demand
- **Caching**: Cache frequently accessed media
- **Compression**: Optimize image sizes
- **CDN integration**: Use CDN for faster delivery

## 📱 Platform Support

- ✅ **iOS**: Full support with native image picker
- ✅ **Android**: Full support with native image picker
- ✅ **Web**: Limited support (no camera access)

## 🤝 Contributing

When contributing to the media picker functionality:

1. **Test on multiple platforms**
2. **Handle edge cases** (no permissions, network errors)
3. **Follow existing code patterns**
4. **Update documentation** for new features
5. **Add proper error handling**

---

**Note**: This implementation provides a solid foundation for media sharing in the RoleNet chat system. The modular design allows for easy extension and customization based on specific requirements.