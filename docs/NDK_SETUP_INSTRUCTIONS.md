# Android NDK Setup Instructions

## Option 1: Using the Setup Script (Recommended)

1. Run the setup script to automatically configure the NDK environment:

```bash
./ndk_setup.sh
```

This script will:
- Set the ANDROID_NDK_HOME environment variable to point to NDK version 25.13
- Add this setting to your ~/.zshrc file for permanent use
- Apply the changes immediately

## Option 2: Manual Setup

### 1. Set the ANDROID_NDK_HOME environment variable manually

Add the following line to your ~/.zshrc file:

```bash
export ANDROID_NDK_HOME="/Users/tushershikder/Library/Android/sdk/ndk/25.13"
```

Then apply the changes:

```bash
source ~/.zshrc
```

### 2. Verify the setup

Verify that the environment variable is set correctly:

```bash
echo $ANDROID_NDK_HOME
```

It should output: `/Users/tushershikder/Library/Android/sdk/ndk/25.13`

## Option 3: Install a Different NDK Version (If Needed)

If you need a specific NDK version:

1. Open Android Studio
2. Go to Tools > SDK Manager
3. Select the SDK Tools tab
4. Check the "Show Package Details" checkbox
5. Expand the "NDK (Side by side)" option
6. Select the NDK version you need
7. Click "Apply" to install
8. Update your ANDROID_NDK_HOME to point to the new version

## Troubleshooting

If you encounter issues with the NDK setup:

1. Make sure the NDK directory exists at the specified path
2. Try using a different NDK version
3. Restart your terminal after setting the environment variable
4. Consider using EAS cloud builds instead of local builds

## Next Steps

After setting up the NDK, you can run the build command:

```bash
eas build
```