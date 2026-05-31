import { Text, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme';
import { NivelRisco } from '../services/tipos';
import Constants from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

let useSharedValue: any, useAnimatedStyle: any, withSequence: any, withTiming: any, ReanimView: any;
if (!isExpoGo) {
  const R = require('react-native-reanimated');
  useSharedValue   = R.useSharedValue;
  useAnimatedStyle = R.useAnimatedStyle;
  withSequence     = R.withSequence;
  withTiming       = R.withTiming;
  ReanimView       = R.default.View;
}

interface Props {
  risco: NivelRisco | null;
  diasParaVencer?: number;
}

function RiskBadgeAnimated({ risco, diasParaVencer }: Props) {
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

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (risco === null) {
    return (
      <ReanimView style={[styles.badge, { backgroundColor: colors.surfaceSecondary }, animStyle]}>
        <Text style={[styles.label, { color: colors.textDisabled }]}>Calculando…</Text>
      </ReanimView>
    );
  }

  const config: Record<NivelRisco, { label: string; bg: string; text: string }> = {
    risco_alto: {
      label: diasParaVencer === undefined
        ? 'Risco alto'
        : diasParaVencer <= 0
        ? 'Vencido'
        : `Vence em ${diasParaVencer}d`,
      bg: colors.riscoAltoLight, text: colors.riscoAltoDark,
    },
    atencao: {
      label: diasParaVencer !== undefined ? `Vence em ${diasParaVencer}d` : 'Atenção',
      bg: colors.riscoAtencaoLight, text: colors.riscoAtencaoDark,
    },
    seguro: {
      label: diasParaVencer !== undefined ? `${diasParaVencer}d` : 'OK',
      bg: colors.riscoSeguroLight, text: colors.riscoSeguroDark,
    },
  };

  const { label, bg, text } = config[risco];
  return (
    <ReanimView style={[styles.badge, { backgroundColor: bg }, animStyle]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </ReanimView>
  );
}

function RiskBadgeFallback({ risco, diasParaVencer }: Props) {
  const { colors } = useTheme();

  if (risco === null) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.label, { color: colors.textDisabled }]}>Calculando…</Text>
      </View>
    );
  }

  const config: Record<NivelRisco, { label: string; bg: string; text: string }> = {
    risco_alto: {
      label: diasParaVencer === undefined
        ? 'Risco alto'
        : diasParaVencer <= 0
        ? 'Vencido'
        : `Vence em ${diasParaVencer}d`,
      bg: colors.riscoAltoLight, text: colors.riscoAltoDark,
    },
    atencao: {
      label: diasParaVencer !== undefined ? `Vence em ${diasParaVencer}d` : 'Atenção',
      bg: colors.riscoAtencaoLight, text: colors.riscoAtencaoDark,
    },
    seguro: {
      label: diasParaVencer !== undefined ? `${diasParaVencer}d` : 'OK',
      bg: colors.riscoSeguroLight, text: colors.riscoSeguroDark,
    },
  };

  const { label, bg, text } = config[risco];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

export const RiskBadge = isExpoGo ? RiskBadgeFallback : RiskBadgeAnimated;

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
});
