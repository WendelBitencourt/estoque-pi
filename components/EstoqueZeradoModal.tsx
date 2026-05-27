import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  visivel: boolean;
  nomeProduto: string;
  codigoLote: string;
  esgotado: boolean; // true = todos os lotes do produto zeraram
  naLista: boolean; // produto já visível na lista de necessidades
  onAdicionar: () => void;
  onVerLista: () => void;
  onFechar: () => void;
};

export function EstoqueZeradoModal({
  visivel,
  nomeProduto,
  codigoLote,
  esgotado,
  naLista,
  onAdicionar,
  onVerLista,
  onFechar,
}: Props) {
  const { colors } = useTheme();

  const cor = esgotado ? colors.riscoAlto : colors.riscoAtencao;
  const corFundo = esgotado ? colors.riscoAltoLight : colors.riscoAtencaoLight;
  const emoji = esgotado ? '⚠️' : '📦';
  const titulo = esgotado ? 'Produto esgotado' : 'Lote esgotado';
  const mensagem = esgotado
    ? `${nomeProduto} chegou a zero unidades no estoque.`
    : `O lote ${codigoLote} de ${nomeProduto} acabou, mas ainda há estoque em outros lotes.`;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onFechar}
    >
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={[s.iconeWrap, { backgroundColor: corFundo }]}>
            <Text style={s.icone}>{emoji}</Text>
          </View>

          <Text style={[s.titulo, { color: cor }]}>{titulo}</Text>
          <Text style={[s.mensagem, { color: colors.textSecondary }]}>{mensagem}</Text>

          <View style={s.acoes}>
            {naLista ? (
              <>
                <View style={[s.jaNaLista, { backgroundColor: colors.riscoSeguroLight }]}>
                  <Text style={[s.jaNaListaTexto, { color: colors.riscoSeguroDark }]}>
                    ✓ Já está na lista de necessidades
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.btnPrimario, { backgroundColor: colors.primary }]}
                  onPress={onVerLista}
                  activeOpacity={0.85}
                  accessibilityLabel="Ver lista de necessidades"
                >
                  <Text style={s.btnPrimarioTexto}>Ver lista de necessidades</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[s.btnPrimario, { backgroundColor: colors.primary }]}
                  onPress={onAdicionar}
                  activeOpacity={0.85}
                  accessibilityLabel="Adicionar à lista de necessidades"
                >
                  <Text style={s.btnPrimarioTexto}>Adicionar à lista de necessidades</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSecundario, { borderColor: colors.border }]}
                  onPress={onVerLista}
                  activeOpacity={0.7}
                  accessibilityLabel="Ver lista de necessidades"
                >
                  <Text style={[s.btnSecundarioTexto, { color: colors.primary }]}>
                    Ver lista de necessidades
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={s.btnFechar}
              onPress={onFechar}
              activeOpacity={0.7}
              accessibilityLabel="Fechar"
            >
              <Text style={[s.btnFecharTexto, { color: colors.textSecondary }]}>Agora não</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconeWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icone: { fontSize: 36 },
  titulo: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  mensagem: { fontSize: 16, lineHeight: 23, textAlign: 'center', marginBottom: 24 },
  acoes: { width: '100%', gap: 12 },
  btnPrimario: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  btnPrimarioTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  btnSecundario: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  btnSecundarioTexto: { fontSize: 16, fontWeight: '700' },
  btnFechar: { paddingVertical: 12, alignItems: 'center' },
  btnFecharTexto: { fontSize: 15, fontWeight: '600' },
  jaNaLista: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  jaNaListaTexto: { fontSize: 15, fontWeight: '700' },
});
