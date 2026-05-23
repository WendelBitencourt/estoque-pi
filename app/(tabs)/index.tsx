import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { SkeletonLista } from '../../components/SkeletonCard';
import { FadeDown, FadeIn } from '../../components/AnimEntrance';
import { Produto, Lote, NivelRisco } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer } from '../../services/risco';

const RISCO_ORDEM: Record<string, number> = { risco_alto: 0, atencao: 1, seguro: 2 };
function riscoOrdem(r: NivelRisco | null) { return r === null ? 1 : RISCO_ORDEM[r] ?? 2; }

interface ProdutoAtencaoCard {
  produto: Produto;
  riscoGeral: NivelRisco;
  total: number;
  lotesAtencao: Lote[];
  countRiscoAlto: number;
  countAtencao: number;
}

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function CardAtencao({ item, index = 0 }: { item: ProdutoAtencaoCard; index?: number }) {
  const { colors } = useTheme();
  const [expandido, setExpandido] = useState(true);

  const borderLeft =
    item.riscoGeral === 'risco_alto' ? colors.riscoAlto : colors.riscoAtencao;

  return (
    <FadeDown delay={Math.min(index, 6) * 80} duration={450}>
      <View style={[styles.atCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: borderLeft }]}>

          <TouchableOpacity
            style={styles.atHeader}
            onPress={() => setExpandido((v) => !v)}
            activeOpacity={0.75}
            accessibilityLabel={`${item.produto.nome}, ${item.total} unidades, ${expandido ? 'recolher' : 'ver'} lotes`}
          >
            <View style={[styles.atEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
              {item.produto.fotoUrl
                ? <Image source={{ uri: item.produto.fotoUrl }} style={styles.atFoto} />
                : <Text style={styles.atEmoji}>{item.produto.emoji}</Text>}
            </View>

            <View style={styles.atInfo}>
              <Text style={[styles.atNome, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.produto.nome}
              </Text>
              <View style={styles.atSubRow}>
                <Text style={[styles.atTotal, { color: colors.textSecondary }]}>
                  {item.total} un.
                </Text>
                <View style={styles.atMiniRiscos}>
                  {item.countRiscoAlto > 0 && (
                    <View style={[styles.atMiniPill, { backgroundColor: colors.riscoAltoLight }]}>
                      <View style={[styles.atMiniDot, { backgroundColor: colors.riscoAlto }]} />
                      <Text style={[styles.atMiniNum, { color: colors.riscoAltoDark }]}>{item.countRiscoAlto}</Text>
                    </View>
                  )}
                  {item.countAtencao > 0 && (
                    <View style={[styles.atMiniPill, { backgroundColor: colors.riscoAtencaoLight }]}>
                      <View style={[styles.atMiniDot, { backgroundColor: colors.riscoAtencao }]} />
                      <Text style={[styles.atMiniNum, { color: colors.riscoAtencaoDark }]}>{item.countAtencao}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.atExpandirCol}>
              <Text style={[styles.atExpandirNum, { color: colors.textDisabled }]}>
                {item.lotesAtencao.length} {item.lotesAtencao.length === 1 ? 'lote' : 'lotes'}
              </Text>
              <Text style={[styles.atExpandirSeta, { color: colors.textDisabled }]}>
                {expandido ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandido && (
            <FadeDown duration={220} springify={false}>
              <View style={[styles.atDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.atLotesWrap}>
                {item.lotesAtencao.map((lote) => {
                  const dias = diasParaVencer(lote.validade);
                  const loteBorder =
                    lote.risco === 'risco_alto' ? colors.riscoAlto : colors.riscoAtencao;
                  return (
                    <View key={lote.id} style={[styles.atLoteRow, { borderLeftColor: loteBorder, backgroundColor: colors.background }]}>
                      <View style={styles.atLoteInfo}>
                        <Text style={[styles.atLoteCodigo, { color: colors.textPrimary }]}>{lote.codigo}</Text>
                        <Text style={[styles.atLoteDetalhe, { color: colors.textSecondary }]}>
                          val. {formatarData(lote.validade)} · {lote.quantidade} un.
                        </Text>
                      </View>
                      <RiskBadge risco={lote.risco} diasParaVencer={dias} />
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[styles.atVerDetalhes, { borderColor: colors.border }]}
                  onPress={() => router.push(`/produto/${item.produto.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.atVerDetalhesTexto, { color: colors.textSecondary }]}>
                    Ver detalhes  →
                  </Text>
                </TouchableOpacity>
              </View>
            </FadeDown>
          )}
        </View>
    </FadeDown>
  );
}

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

function CardClasse({ nome, valor, total, bg, textColor, descricao }: {
  nome: string; valor: number; total: number;
  bg: string; textColor: string; descricao: string;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <View style={[styles.cardClasse, { backgroundColor: bg }]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardDot, { backgroundColor: textColor }]} />
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
  const { top } = useSafeAreaInsets();
  // StatusBar.currentHeight é mais confiável no Android para dispositivos sem notch
  const topInset = Platform.OS === 'android'
    ? Math.max(top, StatusBar.currentHeight ?? 24)
    : top;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes]       = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [footerExpandido, setFooterExpandido] = useState(true);
  const [footerHeight, setFooterHeight] = useState(220);
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

  const produtosAtencao = useMemo<ProdutoAtencaoCard[]>(() =>
    produtos
      .map((p) => {
        const ls = lotes.filter((l) => l.produtoId === p.id);
        if (ls.length === 0) return null;
        const riscoGeral = getRiscoProduto(ls);
        if (riscoGeral === 'seguro') return null;
        const lotesAtencao = ls
          .filter((l) => l.risco === 'risco_alto' || l.risco === 'atencao')
          .sort((a, b) => riscoOrdem(a.risco) - riscoOrdem(b.risco) || new Date(a.validade).getTime() - new Date(b.validade).getTime());
        return {
          produto: p,
          riscoGeral: riscoGeral as NivelRisco,
          total: ls.reduce((s, l) => s + l.quantidade, 0),
          lotesAtencao,
          countRiscoAlto: ls.filter((l) => l.risco === 'risco_alto').length,
          countAtencao:   ls.filter((l) => l.risco === 'atencao').length,
        } as ProdutoAtencaoCard;
      })
      .filter((x): x is ProdutoAtencaoCard => x !== null),
  [produtos, lotes]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: footerHeight + 16, paddingTop: topInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >

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
            <FadeIn duration={500}>
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
            </FadeIn>
          ) : (
            <FadeIn duration={500}>
              <View style={[styles.alertaBanner, { backgroundColor: colors.riscoSeguroLight, borderColor: colors.riscoSeguro }]}>
                  <Text style={styles.alertaIcone}>✅</Text>
                  <View style={styles.alertaTextos}>
                    <Text style={[styles.alertaTitulo, { color: colors.riscoSeguroDark }]}>Sem risco de desperdício</Text>
                    <Text style={[styles.alertaDescricao, { color: colors.riscoSeguroDark }]}>
                      Nenhum item em risco de vencer antes de ser consumido.
                    </Text>
                  </View>
                </View>
            </FadeIn>
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
              <CardClasse nome="Consumo Imediato"   valor={dist.alto}    total={totalLotes} bg={colors.riscoAltoLight}    textColor={colors.riscoAltoDark}    descricao="Vence antes de ser consumido" />
              <CardClasse nome="Risco de Vencimento" valor={dist.atencao} total={totalLotes} bg={colors.riscoAtencaoLight} textColor={colors.riscoAtencaoDark} descricao="Monitorar de perto" />
              <CardClasse nome="Seguro"              valor={dist.seguro}  total={totalLotes} bg={colors.riscoSeguroLight}  textColor={colors.riscoSeguroDark}  descricao="Validade confortável" />
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
          <FadeIn duration={400} style={[styles.vazio, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          </FadeIn>
        ) : (
          <View style={styles.lista}>
            {produtosAtencao.map((item, i) => (
              <CardAtencao key={item.produto.id} item={item} index={i} />
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── Footer fixo ── */}
      <View
        style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider, paddingBottom: 8 }]}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity
          style={styles.footerToggle}
          onPress={() => setFooterExpandido((v) => !v)}
          activeOpacity={0.6}
          accessibilityLabel={footerExpandido ? 'Recolher ações' : 'Expandir ações'}
        >
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            📥 Registrar doação  /  📝 Lista de Necessidades{'  '}{footerExpandido ? '▾' : '▴'}
          </Text>
        </TouchableOpacity>

        {footerExpandido && (
          <FadeDown duration={200} springify={false} style={styles.footerBotoes}>
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
          </FadeDown>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  footer:           { paddingHorizontal: 20, borderTopWidth: 1 },
  footerToggle:     { alignItems: 'center', paddingVertical: 10, gap: 4 },
  footerHandlePill: { width: 36, height: 4, borderRadius: 2 },
  footerLabel: { fontSize: 14, fontWeight: '600' },
  footerBotoes:     { gap: 10 },

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
  cardDot:       { width: 16, height: 16, borderRadius: 8 },
  cardValor:     { fontSize: 26, fontWeight: '800' },
  cardNome:      { fontSize: 11, fontWeight: '800', marginTop: 4 },
  cardPct:       { fontSize: 11, opacity: 0.75 },
  cardDesc:      { fontSize: 10, opacity: 0.65, marginTop: 4, lineHeight: 14 },

  // Lista atenção
  lista: { gap: 10 },

  atCard: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 4,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  atHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  atEmojiBg:    { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  atEmoji:      { fontSize: 24 },
  atFoto:       { width: 46, height: 46, borderRadius: 12 },
  atInfo:       { flex: 1, gap: 4 },
  atNome:       { fontSize: 16, fontWeight: '700' },
  atSubRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atTotal:      { fontSize: 13 },
  atMiniRiscos: { flexDirection: 'row', gap: 4 },
  atMiniPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  atMiniDot:    { width: 6, height: 6, borderRadius: 3 },
  atMiniNum:    { fontSize: 12, fontWeight: '700' },
  atExpandirCol:  { alignItems: 'center', gap: 2, paddingLeft: 4 },
  atExpandirNum:  { fontSize: 11, fontWeight: '600' },
  atExpandirSeta: { fontSize: 10 },
  atDivider:    { height: 1 },
  atLotesWrap:  { padding: 12, gap: 8 },
  atLoteRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderRadius: 8, paddingLeft: 10, paddingRight: 8, paddingVertical: 8 },
  atLoteInfo:   { flex: 1, gap: 2 },
  atLoteCodigo: { fontSize: 14, fontWeight: '700' },
  atLoteDetalhe:{ fontSize: 12 },
  atVerDetalhes:     { borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  atVerDetalhesTexto:{ fontSize: 13, fontWeight: '600' },

  vazio:      { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  vazioEmoji: { fontSize: 36 },
  vazioTexto: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  vazioBtn:   { marginTop: 4, paddingVertical: 13, paddingHorizontal: 26, borderRadius: 14 },
  vazioBtnTexto: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  botaoPrincipal:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 18 },
  botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 18, borderWidth: 1.5 },
  botaoEmoji:  { fontSize: 22 },
  botaoTexto:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

});
