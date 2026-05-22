import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { SkeletonLista } from '../../components/SkeletonCard';
import { Produto, Lote } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer } from '../../services/risco';
import { getSaidasProduto } from '../../services/movimentacoesService';
import { preverFimEstoque } from '../../services/mlService';

function getSaudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getDataFormatada() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function CardClasse({ emoji, nome, valor, total, bg, textColor, descricao }: {
  emoji: string; nome: string; valor: number; total: number;
  bg: string; textColor: string; descricao: string;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <View style={[styles.cardClasse, { backgroundColor: bg }]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <Text style={[styles.cardValor, { color: textColor }]}>{valor}</Text>
      </View>
      <Text style={[styles.cardNome, { color: textColor }]}>{nome}</Text>
      <Text style={[styles.cardPct,  { color: textColor }]}>{pct}% dos lotes</Text>
      <Text style={[styles.cardDesc, { color: textColor }]}>{descricao}</Text>
    </View>
  );
}

export default function InicioScreen() {
  const { colors } = useTheme();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes]       = useState<Lote[]>([]);
  const [previsoes, setPrevisoes] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const recebido = useRef({ produtos: false, lotes: false });

  function marcarRecebido(chave: 'produtos' | 'lotes') {
    recebido.current[chave] = true;
    if (recebido.current.produtos && recebido.current.lotes) setCarregando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 6000);
    const u1 = subscribeToProdutos((d) => { setProdutos(d); marcarRecebido('produtos'); });
    const u2 = subscribeAllLotes((d)   => { setLotes(d);    marcarRecebido('lotes'); });
    return () => { u1(); u2(); clearTimeout(timer); };
  }, []);

  const produtoMap = useMemo(() => {
    const m: Record<string, Produto> = {};
    produtos.forEach((p) => { m[p.id] = p; });
    return m;
  }, [produtos]);

  const totalLotes = lotes.length;

  const dist = useMemo(() => ({
    alto:    lotes.filter((l) => l.risco === 'risco_alto').length,
    atencao: lotes.filter((l) => l.risco === 'atencao').length,
    seguro:  lotes.filter((l) => l.risco === 'seguro').length,
  }), [lotes]);

  const lotesAlto       = lotes.filter((l) => l.risco === 'risco_alto');
  const unidadesEmRisco = lotesAlto.reduce((s, l) => s + l.quantidade, 0);
  const diasMaisUrgente = lotesAlto.length > 0
    ? Math.min(...lotesAlto.map((l) => diasParaVencer(l.validade)))
    : null;

  // Produtos em risco para a lista "Requer atenção"
  const produtosAtencao = useMemo(() =>
    produtos
      .map((p) => {
        const ls = lotes.filter((l) => l.produtoId === p.id);
        const risco = ls.length > 0 ? getRiscoProduto(ls) : 'seguro' as const;
        return { produto: p, risco, ls };
      })
      .filter(({ risco }) => risco === 'risco_alto' || risco === 'atencao')
      .map(({ produto, risco, ls }) => {
        const pior = [...ls].sort((a, b) =>
          new Date(a.validade).getTime() - new Date(b.validade).getTime()
        )[0];
        return {
          produto,
          risco,
          diasPiorLote: pior ? diasParaVencer(pior.validade) : 0,
          total: ls.reduce((s, l) => s + l.quantidade, 0),
        };
      }),
  [produtos, lotes]);

  const atencaoKey = useMemo(
    () => produtosAtencao.map((x) => `${x.produto.id}:${x.total}`).join(','),
    [produtosAtencao]
  );

  useEffect(() => {
    if (produtosAtencao.length === 0) return;
    produtosAtencao.forEach(({ produto, total }) => {
      getSaidasProduto(produto.id)
        .then((saidas) => preverFimEstoque(saidas, total))
        .then((p) => {
          if (p.suficiente && p.diasRestantes !== null) {
            setPrevisoes((prev) => ({ ...prev, [produto.id]: p.diasRestantes! }));
          }
        })
        .catch(() => {});
    });
  }, [atencaoKey]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cabeçalho ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.saudacao, { color: colors.textPrimary }]}>{getSaudacao()}! 👋</Text>
            <Text style={[styles.data, { color: colors.textSecondary }]}>{getDataFormatada()}</Text>
          </View>
          <View style={[styles.iaBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.iaEmoji}>🧠</Text>
          </View>
        </View>

        {/* ── Alerta de Desperdício ── */}
        {totalLotes > 0 && (
          unidadesEmRisco > 0 ? (
            <Animated.View entering={FadeIn.duration(500)}>
              <TouchableOpacity
                style={[styles.alertaBanner, { backgroundColor: colors.riscoAltoLight, borderColor: colors.riscoAlto }]}
                onPress={() => router.push('/estoque')}
                activeOpacity={0.8}
                accessibilityLabel={`Alerta de desperdício: ${unidadesEmRisco} ${unidadesEmRisco === 1 ? 'unidade' : 'unidades'} em risco de vencer. Toque para ver o estoque.`}
              >
                <Text style={styles.alertaIcone}>⚠️</Text>
                <View style={styles.alertaTextos}>
                  <Text style={[styles.alertaTitulo, { color: colors.riscoAltoDark }]}>
                    Alerta de Desperdício
                  </Text>
                  <Text style={[styles.alertaDescricao, { color: colors.riscoAltoDark }]}>
                    {unidadesEmRisco} {unidadesEmRisco === 1 ? 'unidade' : 'unidades'} em risco de vencer
                    {diasMaisUrgente !== null ? ` — mais urgente em ${diasMaisUrgente}d` : ''}
                  </Text>
                </View>
                <Text style={[styles.alertaSeta, { color: colors.riscoAltoDark }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(500)}>
              <View style={[styles.alertaBanner, { backgroundColor: colors.riscoSeguroLight, borderColor: colors.riscoSeguro }]}>
                <Text style={styles.alertaIcone}>✅</Text>
                <View style={styles.alertaTextos}>
                  <Text style={[styles.alertaTitulo, { color: colors.riscoSeguroDark }]}>Sem risco de desperdício</Text>
                  <Text style={[styles.alertaDescricao, { color: colors.riscoSeguroDark }]}>
                    Nenhum item em risco de vencer antes de ser consumido.
                  </Text>
                </View>
              </View>
            </Animated.View>
          )
        )}

        {/* ── Distribuição de risco ── */}
        {totalLotes > 0 && (
          <>
            <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
              CLASSIFICAÇÃO DE VALIDADE — {totalLotes} LOTES
            </Text>

            <View style={styles.barra}>
              {dist.alto    > 0 && <View style={[styles.barraSegmento, { flex: dist.alto,    backgroundColor: colors.riscoAlto    }]} />}
              {dist.atencao > 0 && <View style={[styles.barraSegmento, { flex: dist.atencao, backgroundColor: colors.riscoAtencao }]} />}
              {dist.seguro  > 0 && <View style={[styles.barraSegmento, { flex: dist.seguro,  backgroundColor: colors.riscoSeguro  }]} />}
            </View>

            <View style={styles.cardsRow}>
              <CardClasse emoji="🔴" nome="Consumo Imediato"   valor={dist.alto}    total={totalLotes} bg={colors.riscoAltoLight}    textColor={colors.riscoAltoDark}    descricao="Vence antes de ser consumido" />
              <CardClasse emoji="🟡" nome="Risco de Vencimento" valor={dist.atencao} total={totalLotes} bg={colors.riscoAtencaoLight} textColor={colors.riscoAtencaoDark} descricao="Monitorar de perto" />
              <CardClasse emoji="🟢" nome="Seguro"              valor={dist.seguro}  total={totalLotes} bg={colors.riscoSeguroLight}  textColor={colors.riscoSeguroDark}  descricao="Validade confortável" />
            </View>
          </>
        )}

        {/* ── Requer atenção ── */}
        <View style={styles.secaoHeader}>
          <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>REQUER ATENÇÃO</Text>
          {produtosAtencao.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/estoque')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Ver todos os itens que requerem atenção"
            >
              <Text style={[styles.verTodos, { color: colors.primary }]}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

        {carregando ? (
          <SkeletonLista n={3} />
        ) : produtosAtencao.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={[styles.vazio, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.vazioEmoji}>{totalLotes === 0 ? '📦' : '✅'}</Text>
            <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
              {totalLotes === 0
                ? 'Nenhuma doação registrada ainda.'
                : 'Tudo em ordem! Nenhum produto em risco.'}
            </Text>
            {totalLotes === 0 && (
              <TouchableOpacity
                style={[styles.vazioBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/entrada')}
                activeOpacity={0.85}
                accessibilityLabel="Registrar primeira entrada"
              >
                <Text style={styles.vazioBtnTexto}>Registrar entrada</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <View style={styles.lista}>
            {produtosAtencao.map(({ produto, risco, diasPiorLote, total }, i) => (
              <Animated.View
                key={produto.id}
                entering={FadeInDown.delay(i * 80).duration(450).springify().damping(16)}
              >
                <TouchableOpacity
                  style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/produto/${produto.id}`)}
                  activeOpacity={0.75}
                  accessibilityLabel={`${produto.nome}, ${total} em estoque${diasPiorLote !== null ? `, vence em ${diasPiorLote} dias` : ''}`}
                >
                  <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
                    {produto.fotoUrl
                      ? <Image source={{ uri: produto.fotoUrl }} style={styles.itemFoto} />
                      : <Text style={styles.itemEmoji}>{produto.emoji}</Text>
                    }
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
                    <Text style={[styles.itemSub,  { color: colors.textSecondary }]}>
                      {total} em estoque{previsoes[produto.id] !== undefined ? ` · ⏱ ~${previsoes[produto.id]}d` : ''}
                    </Text>
                  </View>
                  <RiskBadge risco={risco} diasParaVencer={diasPiorLote} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ── Ações ── */}
        <TouchableOpacity
          style={[styles.botaoPrincipal, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/entrada')}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoEmoji}>📥</Text>
          <Text style={styles.botaoTexto}>Registrar entrada de doação</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoSecundario, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
          onPress={() => router.push('/necessidades')}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoEmoji}>📝</Text>
          <Text style={[styles.botaoTexto, { color: colors.accent }]}>Ver lista de necessidades</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  saudacao: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  data:     { fontSize: 15, textTransform: 'capitalize' },
  iaBadge:  { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iaEmoji:  { fontSize: 26 },

  // Alerta
  alertaBanner:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 24 },
  alertaIcone:     { fontSize: 26 },
  alertaTextos:    { flex: 1, gap: 3 },
  alertaTitulo:    { fontSize: 15, fontWeight: '800' },
  alertaDescricao: { fontSize: 13, lineHeight: 18 },
  alertaSeta:      { fontSize: 22, fontWeight: '700' },

  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 28 },
  verTodos:    { fontSize: 14, fontWeight: '600' },

  // Distribuição
  barra:         { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  barraSegmento: { height: '100%' },
  cardsRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cardClasse:    { flex: 1, borderRadius: 16, padding: 12, gap: 2 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardEmoji:     { fontSize: 18 },
  cardValor:     { fontSize: 26, fontWeight: '800' },
  cardNome:      { fontSize: 11, fontWeight: '800', marginTop: 4 },
  cardPct:       { fontSize: 11, opacity: 0.75 },
  cardDesc:      { fontSize: 10, opacity: 0.65, marginTop: 4, lineHeight: 14 },

  // Lista atenção
  lista:    { gap: 10 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  itemEmojiBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemEmoji:   { fontSize: 26 },
  itemFoto:    { width: 48, height: 48, borderRadius: 14 },
  itemInfo:    { flex: 1 },
  itemNome:    { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  itemSub:     { fontSize: 14 },

  vazio:      { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  vazioEmoji: { fontSize: 36 },
  vazioTexto: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  vazioBtn:   { marginTop: 4, paddingVertical: 13, paddingHorizontal: 26, borderRadius: 14 },
  vazioBtnTexto: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  botaoPrincipal:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32, paddingVertical: 20, borderRadius: 20 },
  botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, paddingVertical: 18, borderRadius: 20, borderWidth: 1.5 },
  botaoEmoji:  { fontSize: 22 },
  botaoTexto:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

});
