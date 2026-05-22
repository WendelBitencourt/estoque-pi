import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme';
import { NivelRisco } from '../services/tipos';

interface Props {
  risco: NivelRisco | null;
  diasParaVencer?: number;
}

export function RiskBadge({ risco, diasParaVencer }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const prevRisco = useRef<NivelRisco | null>(null);

  useEffect(() => {
    if (risco === 'risco_alto' && prevRisco.current !== 'risco_alto') {
      scale.value = withSequence(
        withTiming(1.14, { duration: 220 }),
        withTiming(1, { duration: 220 }),
      );
    }
    prevRisco.current = risco;
  }, [risco]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (risco === null) {
    return (
      <Animated.View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }, animStyle]}>
        <Text style={[styles.label, { color: colors.textDisabled }]}>Calculando…</Text>
      </Animated.View>
    );
  }

  const config: Record<NivelRisco, { label: string; bg: string; text: string }> = {
    risco_alto: {
      label: diasParaVencer !== undefined ? `Vence em ${diasParaVencer}d` : 'Risco alto',
      bg: colors.riscoAltoLight,
      text: colors.riscoAltoDark,
    },
    atencao: {
      label: diasParaVencer !== undefined ? `Vence em ${diasParaVencer}d` : 'Atenção',
      bg: colors.riscoAtencaoLight,
      text: colors.riscoAtencaoDark,
    },
    seguro: {
      label: diasParaVencer !== undefined ? `${diasParaVencer}d` : 'OK',
      bg: colors.riscoSeguroLight,
      text: colors.riscoSeguroDark,
    },
  };

  const { label, bg, text } = config[risco];

  return (
    <Animated.View style={[styles.badge, { backgroundColor: bg }, animStyle]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
