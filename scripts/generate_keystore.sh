#!/bin/bash

# Script to generate a release keystore for signing Android apps

echo "This script will help you generate a release keystore for signing your Android app."
echo "You will be prompted to enter information for your key."
echo ""

# Prompt for keystore details
read -p "Enter keystore filename (default: release-key.keystore): " KEYSTORE_FILE
KEYSTORE_FILE=${KEYSTORE_FILE:-release-key.keystore}

read -p "Enter key alias (default: rolenet-key): " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-rolenet-key}

read -p "Enter keystore password: " KEYSTORE_PASSWORD
read -p "Enter key password (press Enter to use the same as keystore password): " KEY_PASSWORD
KEY_PASSWORD=${KEY_PASSWORD:-$KEYSTORE_PASSWORD}

# Generate the keystore
echo "Generating keystore..."
keytool -genkey -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$KEYSTORE_PASSWORD" -keypass "$KEY_PASSWORD"

if [ $? -eq 0 ]; then
  echo ""
  echo "Keystore generated successfully: $KEYSTORE_FILE"
  echo "Key alias: $KEY_ALIAS"
  echo ""
  echo "To use this keystore with EAS Build, set the following environment variables:"
  echo "eas secret:create --scope project --name RELEASE_STORE_PASSWORD --value \"$KEYSTORE_PASSWORD\""  
  echo "eas secret:create --scope project --name RELEASE_KEY_ALIAS --value \"$KEY_ALIAS\""  
  echo "eas secret:create --scope project --name RELEASE_KEY_PASSWORD --value \"$KEY_PASSWORD\""  
  echo ""
  echo "Make sure to move the keystore file to your android/app/ directory or upload it to EAS."
else
  echo "Failed to generate keystore."
fi
