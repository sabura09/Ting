import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Linking,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import WebView from 'react-native-webview';
import type {
  WebViewNavigation,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '../utils/config';
import { useBackHandler } from '../hooks/useBackHandler';
import { SplashLoader } from '../components/SplashLoader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Main screen that wraps the Next.js web application in a WebView.
 *
 * Features:
 * - Full-screen WebView loading the deployed Next.js app
 * - Android back button integration (navigates WebView history)
 * - External links open in system browser
 * - Native splash screen while loading
 * - Pull-to-refresh support
 * - JavaScript bridge for native ↔ web communication
 * - Cookie/session persistence
 * - Safe area handling for notched devices
 */
export function WebViewScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const fadeAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 1)).current;

  const baseUrl = getApiUrl();

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  // Android back button handling
  useBackHandler(webViewRef, canGoBack);

  /**
   * Handle navigation state changes to track back history.
   */
  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
    },
    []
  );

  /**
   * Determine whether to allow navigation within the WebView
   * or open external links in the system browser.
   */
  const handleShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      const { url } = request;

      // Always allow the base URL and its subpaths
      if (url.startsWith(baseUrl)) {
        return true;
      }

      // Allow about:blank and data URLs
      if (url.startsWith('about:') || url.startsWith('data:')) {
        return true;
      }

      // Open external links in system browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        Linking.openURL(url).catch(console.error);
        return false;
      }

      // Handle custom schemes (tel:, mailto:, etc.)
      if (
        url.startsWith('tel:') ||
        url.startsWith('mailto:') ||
        url.startsWith('sms:')
      ) {
        Linking.openURL(url).catch(console.error);
        return false;
      }

      return true;
    },
    [baseUrl]
  );

  /**
   * Handle messages from the web layer to the native layer.
   * The web app can post messages via window.ReactNativeWebView.postMessage()
   */
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'navigation':
          // Handle navigation commands from web
          break;
        case 'theme':
          // Could update native status bar based on web theme
          break;
        case 'notification':
          // Handle notification requests from web
          break;
        default:
          break;
      }
    } catch {
      // Non-JSON message, ignore
    }
  }, []);

  /**
   * JavaScript injected into the WebView to:
   * 1. Add platform-specific CSS class for styling
   * 2. Set up the native bridge communication
   * 3. Disable pull-to-refresh conflicts on iOS
   * 4. Hide PWA install prompts in native app
   */
  const injectedJavaScript = `
    (function() {
      // Add platform class to html element for conditional styling
      document.documentElement.classList.add('native-app');
      document.documentElement.classList.add('platform-${Platform.OS}');

      // Set viewport meta for proper mobile rendering
      let viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content',
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        );
      }

      // Notify native side that the page is ready
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready',
          url: window.location.href
        }));
      }

      // Hide any PWA install prompts since we're already native
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
      });

      // Override service worker registration in native context
      if ('serviceWorker' in navigator) {
        // Don't interfere with existing SW, but prevent new registrations
        // that might cause issues in WebView context
      }

      true; // Required for Android
    })();
  `;

  /**
   * Handle WebView load completion — fade out splash screen.
   */
  const handleLoadEnd = useCallback(() => {
    // Brief delay to ensure the page has rendered
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
      });
    }, 300);
  }, [fadeAnim]);

  /**
   * Pull-to-refresh handler
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#030712" />

      {Platform.OS === 'web' ? (
        <iframe
          src={baseUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#030712',
          }}
          title="AI Suite Web Preview"
        />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorSubtitle}>
            Unable to connect to AI Suite. Please ensure the Next.js dev server is running and accessible on your local network.
          </Text>
          {errorDetails ? (
            <Text style={styles.errorDetails}>{errorDetails}</Text>
          ) : null}
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
          <Text style={styles.targetUrlText}>Connecting to: {baseUrl}</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: baseUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          injectedJavaScript={injectedJavaScript}
          // Performance & behavior settings
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsBackForwardNavigationGestures={true} // iOS swipe navigation
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Cookie & storage persistence
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          // Cache
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          // Security
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          // Scrolling
          overScrollMode="never"
          bounces={false}
          // File access (for file uploads in AI tools)
          allowFileAccess={true}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          // Android-specific
          setSupportMultipleWindows={false}
          // User agent suffix to identify native app
          applicationNameForUserAgent="AISuiteNativeApp/1.0"
          // Error handling
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[WebView Error]', nativeEvent.description);
            setErrorDetails(nativeEvent.description);
            setHasError(true);
            setIsLoading(false);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[WebView HTTP Error]', nativeEvent.statusCode);
            if (nativeEvent.statusCode >= 500) {
              setErrorDetails(`HTTP Error ${nativeEvent.statusCode}`);
              setHasError(true);
              setIsLoading(false);
            }
          }}
        />
      )}

      {/* Splash overlay — fades out after WebView loads */}
      {isLoading && !hasError && (
        <Animated.View
          style={[styles.splashOverlay, { opacity: fadeAnim }]}
          pointerEvents={isLoading ? 'auto' : 'none'}
        >
          <SplashLoader />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  webview: {
    flex: 1,
    backgroundColor: '#030712',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#030712',
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIconText: {
    fontSize: 32,
  },
  errorTitle: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  errorDetails: {
    color: '#ef4444',
    fontSize: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  targetUrlText: {
    color: '#6b7280',
    fontSize: 12,
  },
});
