import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  total: number;
  atual: number;
  labels: string[];
}

export function StepIndicator({ total, atual, labels }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {Array.from({ length: total }).map((_, i) => {
        const concluido = i < atual;
        const ativo = i === atual;
        return (
          <View key={i} style={styles.stepWrap}>
            <View
              style={[
                styles.circulo,
                {
                  backgroundColor: concluido || ativo ? colors.primary : colors.surfaceSecondary,
                  borderColor: concluido || ativo ? colors.primary : colors.border,
                },
              ]}
            >
              {concluido ? (
                <Text style={styles.check}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.numero,
                    { color: ativo ? '#FFF' : colors.textDisabled },
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: ativo ? colors.primary : concluido ? colors.textSecondary : colors.textDisabled },
              ]}
              numberOfLines={1}
            >
              {labels[i]}
            </Text>
            {i < total - 1 && (
              <View
                style={[
                  styles.linha,
                  { backgroundColor: concluido ? colors.primary : colors.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  circulo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  check: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  numero: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  linha: {
    position: 'absolute',
    top: 18,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: 0,
  },
});
