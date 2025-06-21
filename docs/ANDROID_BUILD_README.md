# Android Build Configuration Resources

This directory contains comprehensive documentation and resources for configuring Android builds in the RoleNet app. These resources will help you set up product flavors, signing configurations, and EAS Build profiles to solve common development issues like APK installation signature mismatches.

## Available Resources

### Documentation

1. **[Android Build Configuration Guide](./ANDROID_BUILD_GUIDE.md)**  
   A comprehensive guide covering product flavors, signing configurations, and EAS Build profiles.

2. **[APK Signature Troubleshooting Guide](./APK_SIGNATURE_TROUBLESHOOTING.md)**  
   Detailed troubleshooting steps for resolving the common "Package signatures do not match" error.

3. **[Sample Build.gradle Configuration](./SAMPLE_BUILD_GRADLE.md)**  
   A complete example of the `build.gradle` file with product flavors and signing configurations implemented.

4. **[Sample EAS.json Configuration](./SAMPLE_EAS_JSON.md)**  
   A complete example of the `eas.json` file with build profiles for different environments.

### Scripts

1. **[Setup Android Build Config Script](../scripts/setup_android_build_config.sh)**  
   An automated script that helps implement the recommended configurations in your project.

2. **[Generate Keystore Script](../scripts/generate_keystore.sh)**  
   A helper script for generating a release keystore for signing your Android app.

## Quick Start

To quickly implement the recommended configurations:

1. Read the [Android Build Configuration Guide](./ANDROID_BUILD_GUIDE.md) to understand the concepts.

2. Run the setup script from the project root:

   ```bash
   chmod +x ./scripts/setup_android_build_config.sh
   ./scripts/setup_android_build_config.sh
   ```

3. Generate a release keystore:

   ```bash
   chmod +x ./scripts/generate_keystore.sh
   ./scripts/generate_keystore.sh
   ```

4. Set up environment variables in EAS:

   ```bash
   eas secret:create --scope project --name RELEASE_STORE_PASSWORD --value "your_password"
   eas secret:create --scope project --name RELEASE_KEY_ALIAS --value "your_key_alias"
   eas secret:create --scope project --name RELEASE_KEY_PASSWORD --value "your_key_password"
   ```

5. Build your app with different profiles:

   ```bash
   # For development builds
   eas build --profile development --platform android

   # For staging/preview builds
   eas build --profile preview --platform android

   # For production builds
   eas build --profile production --platform android
   ```

## Common Issues and Solutions

### APK Installation Signature Mismatch

If you encounter the error "INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package signatures do not match the previously installed version", refer to the [APK Signature Troubleshooting Guide](./APK_SIGNATURE_TROUBLESHOOTING.md).

Common solutions include:

1. Uninstall the existing app before installing the new version
2. Use product flavors with different package names
3. Use the same signing key for all builds

### EAS Build Issues

If you encounter issues with EAS Build:

1. Verify that your environment variables are correctly set in the EAS dashboard or via the CLI
2. Check the EAS Build logs for specific error messages
3. Try running with `--no-wait` flag to avoid concurrency limits

## Best Practices

1. **Use Product Flavors**: Set up development, staging, and production flavors with different package names
2. **Consistent Signing Strategy**: Establish a clear signing strategy for different build types and environments
3. **Document Keystore Information**: Keep secure records of all keystores and passwords
4. **Use Environment Variables**: Store signing information in environment variables rather than hardcoding them
5. **Automate Builds**: Use scripts or CI/CD to ensure consistent build configurations

## Additional Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android Signing Documentation](https://developer.android.com/studio/publish/app-signing)
- [Android Product Flavors Documentation](https://developer.android.com/studio/build/build-variants#product-flavors)

## Need Help?

If you encounter any issues or have questions about the Android build configuration, please refer to the specific guide for your issue or consult the Expo and Android documentation.