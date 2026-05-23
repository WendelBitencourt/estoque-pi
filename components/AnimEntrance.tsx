import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

let AnimView: any = View;
let FadeInDownAnim: any = null;
let FadeInAnim: any = null;
let useSharedValue: any, useAnimatedStyle: any, withSpring: any;

if (!isExpoGo) {
  const R = require('react-native-reanimated');
  AnimView        = R.default.View;
  FadeInDownAnim  = R.FadeInDown;
  FadeInAnim      = R.FadeIn;
  useSharedValue  = R.useSharedValue;
  useAnimatedStyle = R.useAnimatedStyle;
  withSpring      = R.withSpring;
}

/** FadeInDown with optional springify — drops to plain View in Expo Go */
export function FadeDown({
  children,
  delay = 0,
  duration = 400,
  damping = 18,
  springify = true,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  damping?: number;
  springify?: boolean;
  style?: ViewStyle;
}) {
  if (isExpoGo) return <View style={style}>{children}</View>;
  let anim = FadeInDownAnim.delay(delay).duration(duration);
  if (springify) anim = anim.springify().damping(damping);
  return <AnimView entering={anim} style={style}>{children}</AnimView>;
}

/** Spring scale-in popup (used on success screens) — drops to plain View in Expo Go */
function ScaleInAnimated({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimView style={[style, animStyle]}>{children}</AnimView>;
}

export function ScaleIn({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  if (isExpoGo) return <View style={style}>{children}</View>;
  return <ScaleInAnimated style={style}>{children}</ScaleInAnimated>;
}

/** FadeIn — drops to plain View in Expo Go */
export function FadeIn({
  children,
  duration = 500,
  style,
}: {
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
}) {
  if (isExpoGo) return <View style={style}>{children}</View>;
  return <AnimView entering={FadeInAnim.duration(duration)} style={style}>{children}</AnimView>;
}
