import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { NivelRisco } from '../services/tipos';

interface Props {
  risco: NivelRisco;
  diasParaVencer?: number;
}

export function RiskBadge({ risco, diasParaVencer }: Props) {
  const { colors } = useTheme();

  const config = {
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
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
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
