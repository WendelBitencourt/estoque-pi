import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function OfflineBar() {
  const [isOffline, setIsOffline] = useState(false);
  const anim = useRef(new Animated.Value(-38)).current;

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return unsub;
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isOffline ? 0 : -38,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOffline, anim]);

  return (
    <Animated.View
      style={[styles.barra, { transform: [{ translateY: anim }] }]}
      pointerEvents="none"
    >
      <Text style={styles.texto}>
        📡  Sem internet — seus dados serão salvos ao reconectar
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
