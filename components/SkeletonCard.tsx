import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '../theme';

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,   { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, animStyle]}
    >
      <View style={[s.sqr, { backgroundColor: colors.surfaceSecondary }]} />
      <View style={s.lines}>
        <View style={[s.line1, { backgroundColor: colors.surfaceSecondary }]} />
        <View style={[s.line2, { backgroundColor: colors.surfaceSecondary }]} />
      </View>
      <View style={[s.badge, { backgroundColor: colors.surfaceSecondary }]} />
    </Animated.View>
  );
}

export function SkeletonLista({ n = 4 }: { n?: number }) {
  return (
    <View style={s.wrap}>
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 100} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  sqr:   { width: 48, height: 48, borderRadius: 14 },
  lines: { flex: 1, gap: 8 },
  line1: { height: 14, borderRadius: 7, width: '70%' },
  line2: { height: 11, borderRadius: 6, width: '45%' },
  badge: { width: 52, height: 26, borderRadius: 10 },
});
