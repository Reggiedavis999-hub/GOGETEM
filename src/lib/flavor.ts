/**
 * Store builds (App Store, Google Play) are made with EXPO_PUBLIC_STORE_BUILD=1 (see eas.json) and use the clean name.
 * The web version and the sideloaded Android APK are not store builds and carry the full name.
 */
export const STORE_BUILD = process.env.EXPO_PUBLIC_STORE_BUILD === '1';
export const ASSISTANT_NAME = STORE_BUILD ? "Go Get 'Em" : 'Go Get That Bitch';
