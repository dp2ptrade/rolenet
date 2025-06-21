#!/bin/bash

# Script to set up Android build configurations for RoleNet
# This script helps implement product flavors, signing configurations, and EAS build profiles

echo "Setting up Android build configurations for RoleNet..."

# Check if we're in the project root directory
if [ ! -f "./app.config.js" ] || [ ! -d "./android" ]; then
  echo "Error: This script must be run from the RoleNet project root directory."
  exit 1
fi

# Create backup of original files
echo "Creating backups of original files..."
mkdir -p ./backups/$(date +"%Y%m%d%H%M%S")
cp ./android/app/build.gradle ./backups/$(date +"%Y%m%d%H%M%S")/build.gradle.bak
cp ./eas.json ./backups/$(date +"%Y%m%d%H%M%S")/eas.json.bak

# Update build.gradle with product flavors and signing configs
echo "Updating build.gradle with product flavors and signing configurations..."

# Create a temporary file for the new build.gradle content
TEMP_BUILD_GRADLE=$(mktemp)

# Process the build.gradle file
cat ./android/app/build.gradle | awk '{
    # Print the current line
    print $0;
    
    # After the android { line, add the flavor dimensions and product flavors
    if ($0 ~ /android \{/ && !flavors_added) {
        flavors_added = 1;
    }
    
    # After the defaultConfig block, add the flavor dimensions and product flavors
    if ($0 ~ /defaultConfig \{/ && !default_config_found) {
        default_config_found = 1;
    }
    
    if ($0 ~ /\}/ && default_config_found && !flavors_added) {
        print "    flavorDimensions \"environment\"";
        print "    productFlavors {";
        print "        development {";
        print "            dimension \"environment\"";
        print "            applicationIdSuffix \".dev\"";
        print "            versionNameSuffix \"-dev\"";
        print "        }";
        print "        staging {";
        print "            dimension \"environment\"";
        print "            applicationIdSuffix \".staging\"";
        print "            versionNameSuffix \"-staging\"";
        print "        }";
        print "        production {";
        print "            dimension \"environment\"";
        print "            // Uses the default applicationId without suffix";
        print "        }";
        print "    }";
        flavors_added = 1;
    }
    
    # Add environment variable references at the top of the file
    if ($0 ~ /apply plugin: "com.android.application"/ && !env_vars_added) {
        print "";
        print "def RELEASE_STORE_FILE = System.getenv(\"RELEASE_STORE_FILE\") ?: \"release-key.keystore\"";
        print "def RELEASE_STORE_PASSWORD = System.getenv(\"RELEASE_STORE_PASSWORD\") ?: \"\"";
        print "def RELEASE_KEY_ALIAS = System.getenv(\"RELEASE_KEY_ALIAS\") ?: \"\"";
        print "def RELEASE_KEY_PASSWORD = System.getenv(\"RELEASE_KEY_PASSWORD\") ?: \"\"";
        print "";
        env_vars_added = 1;
    }
    
    # Update the signingConfigs section
    if ($0 ~ /signingConfigs \{/ && !signing_configs_updated) {
        in_signing_configs = 1;
    }
    
    if (in_signing_configs && $0 ~ /\}/ && !signing_configs_updated) {
        print "        release {";
        print "            storeFile file(RELEASE_STORE_FILE)";
        print "            storePassword RELEASE_STORE_PASSWORD";
        print "            keyAlias RELEASE_KEY_ALIAS";
        print "            keyPassword RELEASE_KEY_PASSWORD";
        print "        }";
        in_signing_configs = 0;
        signing_configs_updated = 1;
    }
    
    # Update the buildTypes section to use the release signing config
    if ($0 ~ /release \{/ && !release_updated) {
        in_release = 1;
    }
    
    if (in_release && $0 ~ /signingConfig signingConfigs.debug/) {
        print "            signingConfig signingConfigs.release";
        in_release = 0;
        release_updated = 1;
        next;
    }
}' > "$TEMP_BUILD_GRADLE"

# Replace the original build.gradle with the updated one
cp "$TEMP_BUILD_GRADLE" ./android/app/build.gradle
rm "$TEMP_BUILD_GRADLE"

# Update eas.json with build profiles
echo "Updating eas.json with build profiles..."

cat > ./eas.json << 'EOL'
{
  "cli": {
    "version": ">= 16.10.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDevelopmentDebug",
        "package": "com.zxoom.rolenetapp.dev"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleStagingRelease",
        "package": "com.zxoom.rolenetapp.staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleProductionRelease",
        "package": "com.zxoom.rolenetapp"
      },
      "env": {
        "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
        "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
        "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOL

echo "Creating a sample script to generate a release keystore..."

cat > ./scripts/generate_keystore.sh << 'EOL'
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
EOL

# Make the scripts executable
chmod +x ./scripts/generate_keystore.sh
chmod +x ./scripts/setup_android_build_config.sh

echo ""
echo "Setup complete! The following changes have been made:"
echo "1. Updated android/app/build.gradle with product flavors and signing configurations"
echo "2. Updated eas.json with build profiles for different environments"
echo "3. Created a script to generate a release keystore at scripts/generate_keystore.sh"
echo ""
echo "Next steps:"
echo "1. Generate a release keystore by running: ./scripts/generate_keystore.sh"
echo "2. Set up environment variables in EAS for secure signing"
echo "3. Build your app with different profiles using:"
echo "   - eas build --profile development --platform android"
echo "   - eas build --profile preview --platform android"
echo "   - eas build --profile production --platform android"
echo ""
echo "For more details, see the Android Build Configuration Guide at docs/ANDROID_BUILD_GUIDE.md"