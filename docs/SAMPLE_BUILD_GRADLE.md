# Sample Android Build.gradle Implementation

This file provides a complete example of the `build.gradle` file with product flavors and signing configurations implemented. You can use this as a reference when updating your own `build.gradle` file.

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Environment variables for release signing
def RELEASE_STORE_FILE = System.getenv("RELEASE_STORE_FILE") ?: "release-key.keystore"
def RELEASE_STORE_PASSWORD = System.getenv("RELEASE_STORE_PASSWORD") ?: ""
def RELEASE_KEY_ALIAS = System.getenv("RELEASE_KEY_ALIAS") ?: ""
def RELEASE_KEY_PASSWORD = System.getenv("RELEASE_KEY_PASSWORD") ?: ""

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

/**
 * This is the configuration block to customize your React Native Android app.
 * By default you don't need to apply any configuration, just uncomment the lines you need.
 */
react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
    hermesCommand = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"
    codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()

    // Use Expo CLI to bundle the app, this ensures the Metro config
    // works correctly with Expo projects.
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"

    /* Autolinking */
    autolinkLibrariesWithApp()
}

/**
 * Set this to true to Run Proguard on Release builds to minify the Java bytecode.
 */
def enableProguardInReleaseBuilds = (findProperty('android.enableProguardInReleaseBuilds') ?: false).toBoolean()

/**
 * The preferred build flavor of JavaScriptCore (JSC)
 */
def jscFlavor = 'org.webkit:android-jsc:+'

android {
    ndkVersion rootProject.ext.ndkVersion

    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.zxoom.rolenetapp'
    defaultConfig {
        applicationId 'com.zxoom.rolenetapp'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
    
    // Define flavor dimensions and product flavors
    flavorDimensions "environment"
    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
        }
        production {
            dimension "environment"
            // Uses the default applicationId without suffix
        }
    }
    
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.release
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
        }
    }
    
    packagingOptions {
        jniLibs {
            useLegacyPackaging (findProperty('expo.useLegacyPackaging')?.toBoolean() ?: false)
        }
    }
    
    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}

// Apply static values from `gradle.properties` to the `android.packagingOptions`
// Accepts values in comma delimited lists, example:
// android.packagingOptions.pickFirsts=/LICENSE,**/picasa.ini
["pickFirsts", "excludes", "merges", "doNotStrip"].each { prop ->
    // Split option: 'foo,bar' -> ['foo', 'bar']
    def options = (findProperty("android.packagingOptions.$prop") ?: "").split(",");
    // Trim all elements in place.
    for (i in 0..<options.size()) options[i] = options[i].trim();
    // `[] - ""` is essentially `[""].filter(Boolean)` removing all empty strings.
    options -= ""

    if (options.length > 0) {
        println "android.packagingOptions.$prop += $options ($options.length)"
        // Ex: android.packagingOptions.pickFirsts += '**/SCCS/**'
        options.each {
            android.packagingOptions[prop] += it
        }
    }
}

dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")

    def isGifEnabled = (findProperty('expo.gif.enabled') ?: "") == "true";
    def isWebpEnabled = (findProperty('expo.webp.enabled') ?: "") == "true";
    def isWebpAnimatedEnabled = (findProperty('expo.webp.animated') ?: "") == "true";

    if (isGifEnabled) {
        // For animated gif support
        implementation("com.facebook.fresco:animated-gif:${reactAndroidLibs.versions.fresco.get()}")
    }

    if (isWebpEnabled) {
        // For webp support
        implementation("com.facebook.fresco:webpsupport:${reactAndroidLibs.versions.fresco.get()}")
        if (isWebpAnimatedEnabled) {
            // Animated webp support
            implementation("com.facebook.fresco:animated-webp:${reactAndroidLibs.versions.fresco.get()}")
        }
    }

    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
```

## Key Changes Explained

1. **Environment Variables for Signing**
   ```gradle
   def RELEASE_STORE_FILE = System.getenv("RELEASE_STORE_FILE") ?: "release-key.keystore"
   def RELEASE_STORE_PASSWORD = System.getenv("RELEASE_STORE_PASSWORD") ?: ""
   def RELEASE_KEY_ALIAS = System.getenv("RELEASE_KEY_ALIAS") ?: ""
   def RELEASE_KEY_PASSWORD = System.getenv("RELEASE_KEY_PASSWORD") ?: ""
   ```
   These variables allow you to securely provide signing information through environment variables.

2. **Product Flavors**
   ```gradle
   flavorDimensions "environment"
   productFlavors {
       development {
           dimension "environment"
           applicationIdSuffix ".dev"
           versionNameSuffix "-dev"
       }
       staging {
           dimension "environment"
           applicationIdSuffix ".staging"
           versionNameSuffix "-staging"
       }
       production {
           dimension "environment"
           // Uses the default applicationId without suffix
       }
   }
   ```
   This creates three different app variants with unique package names.

3. **Release Signing Configuration**
   ```gradle
   release {
       storeFile file(RELEASE_STORE_FILE)
       storePassword RELEASE_STORE_PASSWORD
       keyAlias RELEASE_KEY_ALIAS
       keyPassword RELEASE_KEY_PASSWORD
   }
   ```
   This configures the release signing to use the environment variables.

4. **Updated Build Types**
   ```gradle
   buildTypes {
       debug {
           signingConfig signingConfigs.debug
       }
       release {
           signingConfig signingConfigs.release
           // ... other settings ...
       }
   }
   ```
   This ensures that release builds use the release signing configuration.

With these changes, you can build different variants of your app with different package names and appropriate signing configurations.