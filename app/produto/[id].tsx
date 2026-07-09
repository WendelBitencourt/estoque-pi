import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote, NivelRisco } from '../../services/tipos';
import { getProdutoById, toggleOcultarNecessidades } from '../../services/produtosService';
import { subscribeLotesByProduto } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer, aplicarRisco } from '../../services/risco';
import { getSaidasProduto } from '../../services/movimentacoesService';
import { preverFimEstoque, PrevisaoEstoque } from '../../services/mlService';

const CATEGORIA_LABEL: Record<string, string> = {
  alimentos: 'Alimentos',
  higiene: 'Higiene pessoal',
  limpeza: 'Limpeza',
};

function formatarDataCompleta(iso: string) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const CLASSE_LABEL: Record<string, string> = {
  risco_alto: 'Consumo Imediato',
  atencao:    'Risco de Vencimento',
  seguro:     'Seguro',
};

function PrevisaoBanner({ produtoId, estoqueTotal }: { produtoId: string; estoqueTotal: number }) {
  const { colors } = useTheme();
  const [saidas, setSaidas] = useState<{ data: string; quantidade: number }[] | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoEstoque | null | undefined>(undefined);

  useEffect(() => {
    getSaidasProduto(produtoId).then(setSaidas).catch(() => setSaidas([]));
  }, [produtoId]);

  useEffect(() => {
    if (saidas === null) return;
    if (saidas.length < 3) {
      setPrevisao({ suficiente: false, taxaUnidDia: null, diasRestantes: null, r2: null, mensagem: 'Dados insuficientes' });
      return;
    }
    setPrevisao(undefined);
    preverFimEstoque(saidas, estoqueTotal)
      .then(setPrevisao)
      .catch(() => setPrevisao(null));
  }, [saidas, estoqueTotal]);

  if (previsao === undefined) {
    return (
      <View style={[styles.prevCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.prevCarregando, { color: colors.textSecondary }]}>Calculando previsão…</Text>
      </View>
    );
  }

  if (previsao === null) {
    return (
      <View style={[styles.prevCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.prevIcone}>📡</Text>
        <View style={styles.prevTextos}>
          <Text style={[styles.prevTitulo, { color: colors.textPrimary }]}>Sem conexão</Text>
          <Text style={[styles.prevSub, { color: colors.textSecondary }]}>Previsão indisponível</Text>
        </View>
      </View>
    );
  }

  if (!previsao.suficiente) {
    return (
      <View style={[styles.prevCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.prevIcone}>📊</Text>
        <View style={styles.prevTextos}>
          <Text style={[styles.prevTitulo, { color: colors.textPrimary }]}>Previsão indisponível</Text>
          <Text style={[styles.prevSub, { color: colors.textSecondary }]}>Registre pelo menos 3 saídas para ativar</Text>
        </View>
      </View>
    );
  }

  if (estoqueTotal === 0) {
    return (
      <View style={[styles.prevCard, { backgroundColor: colors.riscoAltoLight, borderColor: colors.riscoAlto }]}>
        <Text style={styles.prevIcone}>📭</Text>
        <View style={styles.prevTextos}>
          <Text style={[styles.prevTitulo, { color: colors.riscoAltoDark }]}>Estoque zerado</Text>
          <Text style={[styles.prevSub, { color: colors.riscoAltoDark }]}>Registre uma entrada para repor</Text>
        </View>
      </View>
    );
  }

  const dias = previsao.diasRestantes;
  const corDias = dias === null ? colors.textPrimary : dias <= 7 ? colors.riscoAltoDark : dias <= 30 ? colors.riscoAtencaoDark : colors.riscoSeguroDark;
  const bgDias  = dias === null ? colors.surfaceSecondary : dias <= 7 ? colors.riscoAltoLight : dias <= 30 ? colors.riscoAtencaoLight : colors.riscoSeguroLight;
  const bordaDias = dias === null ? colors.border : dias <= 7 ? colors.riscoAlto : dias <= 30 ? colors.riscoAtencao : colors.riscoSeguro;

  return (
    <View style={[styles.prevResultado, { backgroundColor: bgDias, borderColor: bordaDias }]}>
      <View style={styles.prevResultadoTopo}>
        <View>
          <Text style={[styles.prevLabel, { color: corDias }]}>estoque dura ainda</Text>
          <Text style={[styles.prevDias, { color: corDias }]}>
            {dias !== null ? `~${dias} dias` : previsao.mensagem}
          </Text>
        </View>
        {previsao.taxaUnidDia !== null && (
          <Text style={[styles.prevTaxa, { color: corDias }]}>
            {previsao.taxaUnidDia.toFixed(1).replace('.', ',')} un./dia
          </Text>
        )}
      </View>
      {previsao.r2 !== null && (
        <View style={styles.prevR2Wrap}>
          <View style={[styles.prevR2Trilho, { backgroundColor: colors.surface }]}>
            <View style={[styles.prevR2Fill, { flex: previsao.r2, backgroundColor: corDias, opacity: 0.7 }]} />
            <View style={{ flex: 1 - previsao.r2 }} />
          </View>
          <Text style={[styles.prevR2Label, { color: corDias }]}>
            precisão R² {previsao.r2.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

function LoteCard({ lote, mediaConsumoDias }: { lote: Lote & { risco: NivelRisco }; mediaConsumoDias: number }) {
  const { colors } = useTheme();
  const dias = diasParaVencer(lote.validade);

  // Risco sempre presente (classificado ao vivo em aplicarRisco) → lookup direto.
  const { bordaEsquerda, corML, bgML } = {
    risco_alto: { bordaEsquerda: colors.riscoAlto,    corML: colors.riscoAltoDark,    bgML: colors.riscoAltoLight },
    atencao:    { bordaEsquerda: colors.riscoAtencao, corML: colors.riscoAtencaoDark, bgML: colors.riscoAtencaoLight },
    seguro:     { bordaEsquerda: colors.riscoSeguro,  corML: colors.riscoSeguroDark,  bgML: colors.riscoSeguroLight },
  }[lote.risco];

  return (
    <View style={[styles.loteCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: bordaEsquerda }]}>
      <View style={styles.loteTop}>
        <View style={styles.loteTitulo}>
          <Text style={[styles.loteCodigo, { color: colors.textPrimary }]}>Lote {lote.codigo}</Text>
          <RiskBadge risco={lote.risco} diasParaVencer={dias} />
        </View>
      </View>
      <View style={styles.loteInfoRow}>
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>Quantidade</Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>{lote.quantidade} un.</Text>
        </View>
        <View style={[styles.loteInfoDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>Validade</Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>{formatarDataCompleta(lote.validade)}</Text>
        </View>
        <View style={[styles.loteInfoDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.loteInfoItem}>
          <Text style={[styles.loteInfoLabel, { color: colors.textSecondary }]}>Cadastrado</Text>
          <Text style={[styles.loteInfoValor, { color: colors.textPrimary }]}>{formatarDataCompleta(lote.dataCadastro)}</Text>
        </View>
      </View>

      {/* Explicação da classificação pelo ML */}
      <View style={[styles.mlRow, { backgroundColor: bgML }]}>
        <Text style={[styles.mlTexto, { color: corML }]}>
          {`🧠 ${dias <= 0 ? 'Vencido' : `${dias}d restantes`} · consumo médio ${mediaConsumoDias}d → ${CLASSE_LABEL[lote.risco]}`}
        </Text>
      </View>
    </View>
  );
}

export default function ProdutoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [produto, setProduto] = useState<Produto | null | undefined>(undefined);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [ocultado, setOcultado] = useState(false);
  const [salvandoOcultar, setSalvandoOcultar] = useState(false);

  useEffect(() => {
    getProdutoById(id).then((p) => {
      setProduto(p);
      if (p) setOcultado(p.ocultarNecessidades ?? true);
    }).catch(() => setProduto(null));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeLotesByProduto(id, setLotes);
    return unsub;
  }, [id]);

  // Risco recalculado ao vivo (dias/qtd atuais + média do produto), substituindo
  // o campo congelado do Firestore. useMemo aqui — antes dos early returns —
  // para não quebrar a ordem dos hooks.
  const lotesComRisco = useMemo(
    () => aplicarRisco(lotes, produto?.mediaConsumoDias ?? 0),
    [lotes, produto?.mediaConsumoDias]
  );

  if (produto === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Carregando…' }} />
        <View style={styles.erroWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!produto) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Produto não encontrado' }} />
        <View style={styles.erroWrap}>
          <Text style={styles.erroEmoji}>❓</Text>
          <Text style={[styles.erroTexto, { color: colors.textSecondary }]}>Produto não encontrado.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.voltarLink, { color: colors.primary }]}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = lotesComRisco.reduce((s, l) => s + l.quantidade, 0);
  const risco = lotesComRisco.length > 0 ? getRiscoProduto(lotesComRisco) : 'seguro';

  async function handleToggleOcultar() {
    const novoValor = !ocultado;
    setSalvandoOcultar(true);
    try {
      await toggleOcultarNecessidades(produto!.id, novoValor);
      setOcultado(novoValor);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvandoOcultar(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: produto.nome }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero do produto */}
          <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
              {produto.fotoUrl ? (
                <Image source={{ uri: produto.fotoUrl }} style={styles.heroFoto} />
              ) : (
                <Text style={styles.heroEmoji}>{produto.emoji}</Text>
              )}
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
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
              <Text style={[styles.resumoLabel, { color: colors.primaryDark }]}>em estoque</Text>
            </View>
            <View style={[styles.resumoCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.resumoValor, { color: colors.textPrimary }]}>{lotesComRisco.length}</Text>
              <Text style={[styles.resumoLabel, { color: colors.textSecondary }]}>
                {lotesComRisco.length === 1 ? 'lote ativo' : 'lotes ativos'}
              </Text>
            </View>
          </View>

          {/* Banner de previsão de consumo */}
          <PrevisaoBanner produtoId={produto.id} estoqueTotal={total} />

          {/* Lotes */}
          <View style={styles.secaoHeader}>
            <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>LOTES ATIVOS</Text>
            <Text style={[styles.secaoAviso, { color: colors.textDisabled }]}>do mais antigo ao mais novo</Text>
          </View>

          {lotesComRisco.length === 0 ? (
            <View style={[styles.vazioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.vazioEmoji}>📭</Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>Nenhum lote cadastrado.</Text>
            </View>
          ) : (
            <View style={styles.lotesList}>
              {lotesComRisco.map((lote) => <LoteCard key={lote.id} lote={lote} mediaConsumoDias={produto.mediaConsumoDias} />)}
            </View>
          )}

          {/* Ações */}
          <View style={styles.acoesRow}>
            <TouchableOpacity
              style={[styles.acaoBotao, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/entrada?produtoId=${produto.id}`)}
              activeOpacity={0.85}
              accessibilityLabel="Registrar entrada de doação"
            >
              <Text style={styles.acaoEmoji}>📥</Text>
              <Text style={styles.acaoTexto}>Registrar{'\n'}entrada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acaoBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push(`/baixa?produtoId=${produto.id}`)}
              activeOpacity={0.85}
              accessibilityLabel="Registrar saída de produto"
            >
              <Text style={styles.acaoEmoji}>📤</Text>
              <Text style={[styles.acaoTexto, { color: colors.textPrimary }]}>Registrar{'\n'}saída</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acaoBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push(`/cadastro?produtoId=${produto.id}`)}
              activeOpacity={0.85}
              accessibilityLabel="Editar produto"
            >
              <Text style={styles.acaoEmoji}>✏️</Text>
              <Text style={[styles.acaoTexto, { color: colors.textPrimary }]}>Editar{'\n'}produto</Text>
            </TouchableOpacity>
          </View>

          {/* Visibilidade na lista de necessidades */}
          <View style={[styles.ocultarCard, { backgroundColor: colors.surface, borderColor: ocultado ? colors.riscoAlto : colors.border }]}>
            <View style={styles.ocultarInfo}>
              <Text style={styles.ocultarIcone}>{ocultado ? '🙈' : '👁️'}</Text>
              <View style={styles.ocultarTextos}>
                <Text style={[styles.ocultarTitulo, { color: colors.textPrimary }]}>
                  {ocultado ? 'Oculto da lista de necessidades' : 'Visível na lista de necessidades'}
                </Text>
                <Text style={[styles.ocultarSub, { color: colors.textSecondary }]}>
                  {ocultado
                    ? 'Este produto não aparece mesmo sem estoque.'
                    : 'Aparece quando estiver sem estoque.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.ocultarBotao, { backgroundColor: ocultado ? colors.primaryLight : colors.surfaceSecondary, borderColor: ocultado ? colors.primary : colors.border }]}
              onPress={handleToggleOcultar}
              disabled={salvandoOcultar}
              activeOpacity={0.75}
              accessibilityLabel={ocultado ? 'Mostrar na lista de necessidades' : 'Ocultar da lista de necessidades'}
            >
              {salvandoOcultar ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.ocultarBotaoTexto, { color: ocultado ? colors.primaryDark : colors.textSecondary }]}>
                  {ocultado ? 'Mostrar' : 'Ocultar'}
                </Text>
              )}
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
    flexDirection: 'row', alignItems: 'center', gap: 18,
    padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  heroEmojiBg: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 44 },
  heroFoto: { width: 80, height: 80, borderRadius: 22 },
  heroInfo: { flex: 1, gap: 6 },
  heroNome: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, lineHeight: 28 },
  heroCategoria: { fontSize: 15 },

  resumoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  resumoCard: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'center', gap: 4 },
  resumoValor: { fontSize: 30, fontWeight: '800' },
  resumoLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  secaoAviso: { fontSize: 12 },

  lotesList: { gap: 12 },
  loteCard: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  loteTop: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  loteTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loteCodigo: { fontSize: 17, fontWeight: '700' },
  loteInfoRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16 },
  loteInfoItem: { flex: 1, alignItems: 'center', gap: 2 },
  loteInfoLabel: { fontSize: 12, fontWeight: '600' },
  loteInfoValor: { fontSize: 15, fontWeight: '700' },
  loteInfoDivider: { width: 1, marginVertical: 2, marginHorizontal: 8 },

  mlRow:   { paddingHorizontal: 16, paddingVertical: 10 },
  mlTexto: { fontSize: 13, fontWeight: '600' },

  vazioCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10 },
  vazioEmoji: { fontSize: 36 },
  vazioTexto: { fontSize: 16, textAlign: 'center' },

  acoesRow: { flexDirection: 'row', gap: 12, marginTop: 28, marginBottom: 16 },
  acaoBotao: { flex: 1, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 6 },
  acaoEmoji: { fontSize: 26 },
  acaoTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  // PrevisaoBanner — estado de carregamento / sem dados / sem conexão
  prevCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  prevCarregando: { fontSize: 14 },
  prevIcone:      { fontSize: 26 },
  prevTextos:     { flex: 1 },
  prevTitulo:     { fontSize: 15, fontWeight: '700' },
  prevSub:        { fontSize: 13, marginTop: 2 },

  // PrevisaoBanner — estado normal (resultado)
  prevResultado: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 20,
    gap: 10,
  },
  prevResultadoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  prevLabel: { fontSize: 12, fontWeight: '600', opacity: 0.75, marginBottom: 2 },
  prevDias:  { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  prevTaxa:  { fontSize: 14, fontWeight: '600', opacity: 0.85 },

  prevR2Wrap:   { gap: 4 },
  prevR2Trilho: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  prevR2Fill:   { height: '100%' },
  prevR2Label:  { fontSize: 11, opacity: 0.65 },

  ocultarCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  ocultarInfo:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ocultarIcone:    { fontSize: 26 },
  ocultarTextos:   { flex: 1, gap: 2 },
  ocultarTitulo:   { fontSize: 15, fontWeight: '700' },
  ocultarSub:      { fontSize: 13, lineHeight: 18 },
  ocultarBotao:    { borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  ocultarBotaoTexto: { fontSize: 14, fontWeight: '700' },
});
