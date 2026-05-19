import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { getProdutoById } from '../../data/produtos';
import {
  getLotesByProduto,
  getEstoqueTotal,
  getRiscoProduto,
  diasParaVencer,
  Lote,
} from '../../data/lotes';

const CATEGORIA_LABEL: Record<string, string> = {
  alimentos: 'Alimentos',
  higiene: 'Higiene pessoal',
  bebe: 'Bebê',
  limpeza: 'Limpeza',
  vestuario: 'Vestuário',
};

function formatarDataCompleta(iso: string) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function LoteCard({ lote }: { lote: Lote }) {
  const { colors } = useTheme();
  const dias = diasParaVencer(lote.validade);

  function handleEditar() {
    Alert.alert('Editar lote', `Lote ${lote.codigo} — disponível na próxima fase.`);
  }

  function handleExcluir() {
    Alert.alert(
      'Excluir lote',
      `Deseja excluir o lote ${lote.codigo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => {} },
      ]
    );
  }

  const bordaEsquerda =
    lote.risco === 'risco_alto'
      ? colors.riscoAlto
      : lote.risco === 'atencao'
      ? colors.riscoAtencao
      : colors.riscoSeguro;

  return (
    <View
      style={[
        styles.loteCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: bordaEsquerda,
        },
      ]}
    >
      {/* linha superior */}
      <View style={styles.loteTop}>
        <View style={styles.loteTitulo}>
          <Text style={[styles.loteCodigo, { color: colors.textPrimary }]}>
            Lote {lote.codigo}
          </Text>
          <RiskBadge risco={lote.risco} diasParaVencer={dias} />
        </View>
      </View>

      {/* linha do meio — info */}
      <View style={styles.loteInfoRow}>
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>
            Quantidade
          </Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>
            {lote.quantidade} un.
          </Text>
        </View>
        <View style={[styles.loteInfoDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>
            Validade
          </Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>
            {formatarDataCompleta(lote.validade)}
          </Text>
        </View>
        <View style={[styles.loteInfoDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>
            Cadastrado
          </Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>
            {formatarDataCompleta(lote.dataCadastro)}
          </Text>
        </View>
      </View>

      {/* ações */}
      <View style={[styles.loteAcoes, { borderTopColor: colors.divider }]}>
        <TouchableOpacity style={styles.loteBtn} onPress={handleEditar} activeOpacity={0.7}>
          <Text style={[styles.loteBtnTexto, { color: colors.primary }]}>✏️  Editar</Text>
        </TouchableOpacity>
        <View style={[styles.loteAcoesDivider, { backgroundColor: colors.divider }]} />
        <TouchableOpacity style={styles.loteBtn} onPress={handleExcluir} activeOpacity={0.7}>
          <Text style={[styles.loteBtnTexto, { color: colors.riscoAlto }]}>🗑️  Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProdutoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const produto = getProdutoById(id);

  if (!produto) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Produto não encontrado' }} />
        <View style={styles.erroWrap}>
          <Text style={styles.erroEmoji}>❓</Text>
          <Text style={[styles.erroTexto, { color: colors.textSecondary }]}>
            Produto não encontrado.
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.voltarLink, { color: colors.primary }]}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lotes = getLotesByProduto(produto.id);
  const total = getEstoqueTotal(produto.id);
  const risco = getRiscoProduto(produto.id);

  return (
    <>
      <Stack.Screen options={{ title: produto.nome }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero do produto */}
          <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={styles.heroEmoji}>{produto.emoji}</Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.heroNome, { color: colors.textPrimary }]}>
                {produto.nome}
              </Text>
              <Text style={[styles.heroCategoria, { color: colors.textSecondary }]}>
                {CATEGORIA_LABEL[produto.categoria] ?? produto.categoria}
              </Text>
              <RiskBadge risco={risco} />
            </View>
          </View>

          {/* Cards de resumo */}
          <View style={styles.resumoRow}>
            <View style={[styles.resumoCard, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.resumoValor, { color: colors.primaryDark }]}>{total}</Text>
              <Text style={[styles.resumoLabel, { color: colors.primaryDark }]}>
                em estoque
              </Text>
            </View>
            <View style={[styles.resumoCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.resumoValor, { color: colors.textPrimary }]}>
                {lotes.length}
              </Text>
              <Text style={[styles.resumoLabel, { color: colors.textSecondary }]}>
                {lotes.length === 1 ? 'lote ativo' : 'lotes ativos'}
              </Text>
            </View>
          </View>

          {/* Lotes */}
          <View style={styles.secaoHeader}>
            <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
              LOTES ATIVOS
            </Text>
            <Text style={[styles.secaoAviso, { color: colors.textDisabled }]}>
              do mais antigo ao mais novo
            </Text>
          </View>

          {lotes.length === 0 ? (
            <View style={[styles.vazioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.vazioEmoji}>📭</Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Nenhum lote cadastrado.
              </Text>
            </View>
          ) : (
            <View style={styles.lotesList}>
              {lotes.map((lote) => (
                <LoteCard key={lote.id} lote={lote} />
              ))}
            </View>
          )}

          {/* Ações principais */}
          <View style={styles.acoesRow}>
            <TouchableOpacity
              style={[styles.acaoBotao, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/entrada')}
              activeOpacity={0.85}
            >
              <Text style={styles.acaoEmoji}>📥</Text>
              <Text style={styles.acaoTexto}>Registrar{'\n'}entrada</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acaoBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push('/baixa')}
              activeOpacity={0.85}
            >
              <Text style={styles.acaoEmoji}>📤</Text>
              <Text style={[styles.acaoTexto, { color: colors.textPrimary }]}>
                Registrar{'\n'}saída
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  erroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  erroEmoji: { fontSize: 48 },
  erroTexto: { fontSize: 17 },
  voltarLink: { fontSize: 16, fontWeight: '600' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  heroEmojiBg: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 44 },
  heroInfo: { flex: 1, gap: 6 },
  heroNome: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, lineHeight: 28 },
  heroCategoria: { fontSize: 15 },

  resumoRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  resumoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  resumoValor: { fontSize: 30, fontWeight: '800' },
  resumoLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  secaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  secaoAviso: { fontSize: 12 },

  lotesList: { gap: 12 },

  loteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  loteTop: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  loteTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loteCodigo: { fontSize: 17, fontWeight: '700' },

  loteInfoRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 0,
  },
  loteInfoItem: { flex: 1, alignItems: 'center', gap: 2 },
  loteInfoLabel: { fontSize: 12, fontWeight: '600' },
  loteInfoValor: { fontSize: 15, fontWeight: '700' },
  loteInfoDivider: { width: 1, marginVertical: 2, marginHorizontal: 8 },

  loteAcoes: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  loteBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  loteBtnTexto: { fontSize: 15, fontWeight: '600' },
  loteAcoesDivider: { width: 1, marginVertical: 10 },

  vazioCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  vazioEmoji: { fontSize: 36 },
  vazioTexto: { fontSize: 16, textAlign: 'center' },

  acoesRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  acaoBotao: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  acaoEmoji: { fontSize: 26 },
  acaoTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
});
