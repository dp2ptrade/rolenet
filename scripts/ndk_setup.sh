#!/bin/zsh

# Set the ANDROID_NDK_HOME environment variable
export ANDROID_NDK_HOME="/Users/tushershikder/Library/Android/sdk/ndk/25.13"

# Add the following lines to your ~/.zshrc file to make the setting permanent:
echo "
# Android NDK Setup
export ANDROID_NDK_HOME=\"$ANDROID_NDK_HOME\"
" >> ~/.zshrc

# Source the .zshrc file to apply changes immediately
source ~/.zshrc

echo "ANDROID_NDK_HOME has been set to: $ANDROID_NDK_HOME"
echo "This setting has been added to your ~/.zshrc file for permanent use."
echo "You can now run 'eas build' to build your Android app."