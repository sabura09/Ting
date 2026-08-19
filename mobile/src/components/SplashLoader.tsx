import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

/**
 * Native splash/loading screen displayed while the WebView initializes.
 * Features animated logo text and a pulsing loading indicator.
 */
export function SplashLoader() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing loader animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading dots animation
    Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 3,
        duration: 1500,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background gradient effect using layered views */}
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Text style={styles.iconText}>AI</Text>
            </View>
          </View>
        </View>

        {/* App name */}
        <Text style={styles.title}>AI Suite</Text>
        <Text style={styles.subtitle}>Your AI Productivity Hub</Text>

        {/* Loading indicator */}
        <View style={styles.loaderContainer}>
          <Animated.View
            style={[
              styles.loaderBar,
              { opacity: pulseAnim },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGradient1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  bgGradient2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 28,
  },
  iconOuter: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f9fafb',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(156, 163, 175, 0.8)',
    fontWeight: '400',
    letterSpacing: 0.3,
    marginBottom: 40,
  },
  loaderContainer: {
    width: width * 0.35,
    height: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
});
