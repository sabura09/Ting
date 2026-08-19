import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Hook to handle Android hardware back button for WebView navigation.
 *
 * When pressed, it navigates back within the WebView history.
 * If there's no history to go back to, it exits the app.
 */
export function useBackHandler(
  webViewRef: React.RefObject<any>,
  canGoBack: boolean
) {
  const handleBackPress = useCallback(() => {
    if (Platform.OS !== 'android') return false;

    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true; // Prevent default back behavior (exit app)
    }

    return false; // Allow default (exit app)
  }, [canGoBack, webViewRef]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => subscription.remove();
  }, [handleBackPress]);
}
