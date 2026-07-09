import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { SkeletonLista } from '../../components/SkeletonCard';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote, NivelRisco } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer, aplicarRiscoMulti } from '../../services/risco';
import { CategoriaItem, CATEGORIAS_PADRAO, subscribeCategorias } from '../../services/categoriasService';
import { FadeDown } from '../../components/AnimEntrance';

type FiltroRisco = 'todos' | 'risco_alto' | 'atencao' | 'seguro';

interface ProdutoEstoque {
  produto: Produto;
  lotes: (Lote & { risco: NivelRisco })[];
  riscoGeral: NivelRisco;
  total: number;
  countRiscoAlto: number;
  countAtencao: number;
  countSeguro: number;
}

const RISCO_ORDEM: Record<string, number> = { risco_alto: 0, atencao: 1, seguro: 2 };

function riscoOrdem(r: NivelRisco | null): number {
  if (r === null) return 1;
  return RISCO_ORDEM[r] ?? 2;
}

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// ── Card de produto colapsável ───────────────────────────────────────────────

function ProdutoCard({ item, index = 0 }: { item: ProdutoEstoque; index?: number }) {
  const { colors } = useTheme();
  const [expandido, setExpandido] = useState(true);

  const cardBorderLeft =
    item.riscoGeral === 'risco_alto' ? colors.riscoAlto
    : item.riscoGeral === 'atencao'  ? colors.riscoAtencao
    : colors.riscoSeguro;

  return (
    <FadeDown delay={Math.min(index, 6) * 55} duration={400}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: cardBorderLeft }]}>

          {/* ── Cabeçalho (toque = expandir/recolher) ── */}
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setExpandido((v) => !v)}
            activeOpacity={0.75}
            accessibilityLabel={`${item.produto.nome}, ${item.total} unidades, ${expandido ? 'recolher' : 'ver'} ${item.lotes.length} lotes`}
          >
            <View style={[styles.emojiBg, { backgroundColor: colors.surfaceSecondary }]}>
              {item.produto.fotoUrl
                ? <Image source={{ uri: item.produto.fotoUrl }} style={styles.foto} />
                : <Text style={styles.emoji}>{item.produto.emoji}</Text>}
            </View>

            <View style={styles.headerInfo}>
              <Text style={[styles.nome, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.produto.nome}
              </Text>

              <View style={styles.headerSubRow}>
                <Text style={[styles.totalTexto, { color: colors.textSecondary }]}>
                  {item.total} un.
                </Text>

                <View style={styles.miniRiscos}>
                  {item.countRiscoAlto > 0 && (
                    <View style={[styles.miniPill, { backgroundColor: colors.riscoAltoLight }]}>
                      <View style={[styles.miniDot, { backgroundColor: colors.riscoAlto }]} />
                      <Text style={[styles.miniNum, { color: colors.riscoAltoDark }]}>{item.countRiscoAlto}</Text>
                    </View>
                  )}
                  {item.countAtencao > 0 && (
                    <View style={[styles.miniPill, { backgroundColor: colors.riscoAtencaoLight }]}>
                      <View style={[styles.miniDot, { backgroundColor: colors.riscoAtencao }]} />
                      <Text style={[styles.miniNum, { color: colors.riscoAtencaoDark }]}>{item.countAtencao}</Text>
                    </View>
                  )}
                  {item.countSeguro > 0 && (
                    <View style={[styles.miniPill, { backgroundColor: colors.riscoSeguroLight }]}>
                      <View style={[styles.miniDot, { backgroundColor: colors.riscoSeguro }]} />
                      <Text style={[styles.miniNum, { color: colors.riscoSeguroDark }]}>{item.countSeguro}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.expandirCol}>
              <Text style={[styles.expandirNum, { color: colors.textDisabled }]}>
                {item.lotes.length} {item.lotes.length === 1 ? 'lote' : 'lotes'}
              </Text>
              <Text style={[styles.expandirSeta, { color: colors.textDisabled }]}>
                {expandido ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ── Lotes (colapsável) ── */}
          {expandido && (
            <FadeDown duration={220} springify={false}>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.lotesWrap}>
                {item.lotes.map((lote) => {
                  const dias = diasParaVencer(lote.validade);
                  const loteBorder =
                    lote.risco === 'risco_alto' ? colors.riscoAlto
                    : lote.risco === 'atencao'  ? colors.riscoAtencao
                    : lote.risco === 'seguro'   ? colors.riscoSeguro
                    : colors.border;
                  return (
                    <View key={lote.id} style={[styles.loteRow, { borderLeftColor: loteBorder, backgroundColor: colors.background }]}>
                      <View style={styles.loteInfo}>
                        <Text style={[styles.loteCodigo, { color: colors.textPrimary }]}>{lote.codigo}</Text>
                        <Text style={[styles.loteDetalhe, { color: colors.textSecondary }]}>
                          val. {formatarData(lote.validade)} · {lote.quantidade} un.
                        </Text>
                      </View>
                      <RiskBadge risco={lote.risco} diasParaVencer={dias} />
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.verDetalhesBtn, { borderColor: colors.border }]}
                  onPress={() => router.push(`/produto/${item.produto.id}`)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Ver detalhes de ${item.produto.nome}`}
                >
                  <Text style={[styles.verDetalhesTexto, { color: colors.textSecondary }]}>
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

// ── Tela principal ───────────────────────────────────────────────────────────

export default function EstoqueScreen() {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState<CategoriaItem[]>(CATEGORIAS_PADRAO);
  const recebido = useRef({ produtos: false, lotes: false });

  function marcarRecebido(chave: 'produtos' | 'lotes') {
    recebido.current[chave] = true;
    if (recebido.current.produtos && recebido.current.lotes) setCarregando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 6000);
    const u1 = subscribeToProdutos((d) => { setProdutos(d); marcarRecebido('produtos'); });
    const u2 = subscribeAllLotes((d)   => { setLotes(d);    marcarRecebido('lotes'); });
    const u3 = subscribeCategorias(setCategorias);
    return () => { u1(); u2(); u3(); clearTimeout(timer); };
  }, []);

  // Risco recalculado ao vivo (média resolvida por produto), no lugar do campo congelado.
  const lotesComRisco = useMemo(() => aplicarRiscoMulti(lotes, produtos), [lotes, produtos]);

  const itens = useMemo<ProdutoEstoque[]>(() => {
    return produtos
      .map((p) => {
        const ls = lotesComRisco
          .filter((l) => l.produtoId === p.id)
          .sort((a, b) =>
            riscoOrdem(a.risco) - riscoOrdem(b.risco) ||
            new Date(a.validade).getTime() - new Date(b.validade).getTime()
          );
        if (ls.length === 0) return null;
        const total = ls.reduce((s, l) => s + l.quantidade, 0);
        if (total === 0) return null;
        return {
          produto: p,
          lotes: ls,
          riscoGeral: getRiscoProduto(ls),
          total,
          countRiscoAlto: ls.filter((l) => l.risco === 'risco_alto').length,
          countAtencao:   ls.filter((l) => l.risco === 'atencao').length,
          countSeguro:    ls.filter((l) => l.risco === 'seguro').length,
        };
      })
      .filter((i): i is ProdutoEstoque => i !== null);
  }, [produtos, lotesComRisco]);

  const itensFiltrados = useMemo(() => {
    return itens
      .filter((item) => {
        const matchBusca     = item.produto.nome.toLowerCase().includes(busca.toLowerCase().trim());
        const matchCategoria = filtroCategoria === null || item.produto.categoria === filtroCategoria;
        const matchRisco =
          filtroRisco === 'todos'      ? true
          : filtroRisco === 'risco_alto' ? item.countRiscoAlto > 0
          : filtroRisco === 'atencao'    ? item.countAtencao > 0
          : /* seguro */                  item.riscoGeral === 'seguro';
        return matchBusca && matchCategoria && matchRisco;
      })
      .sort((a, b) => RISCO_ORDEM[a.riscoGeral] - RISCO_ORDEM[b.riscoGeral]);
  }, [itens, busca, filtroRisco, filtroCategoria]);

  const atencaoItens = useMemo(() => itensFiltrados.filter((i) => i.riscoGeral !== 'seguro'), [itensFiltrados]);
  const segurosItens = useMemo(() => itensFiltrados.filter((i) => i.riscoGeral === 'seguro'), [itensFiltrados]);

  const chipRisco: { valor: FiltroRisco; label: string; emoji: string }[] = [
    { valor: 'todos',      label: 'Todos',      emoji: '📦' },
    { valor: 'risco_alto', label: 'Risco alto',  emoji: '🔴' },
    { valor: 'atencao',    label: 'Atenção',     emoji: '🟡' },
    { valor: 'seguro',     label: 'Seguro',      emoji: '🟢' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Estoque</Text>

        <View style={[styles.buscaWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.buscaIcn}>🔍</Text>
          <TextInput
            style={[styles.buscaInput, { color: colors.textPrimary }]}
            placeholder="Buscar produto…"
            placeholderTextColor={colors.textDisabled}
            value={busca}
            onChangeText={setBusca}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {busca.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Text style={{ fontSize: 16, color: colors.textDisabled }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {chipRisco.map((c) => {
            const ativo = filtroRisco === c.valor;
            return (
              <TouchableOpacity
                key={c.valor}
                style={[styles.chip, { backgroundColor: ativo ? colors.primary : colors.surface, borderColor: ativo ? colors.primary : colors.border }]}
                onPress={() => setFiltroRisco(c.valor)}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={[styles.chipLabel, { color: ativo ? '#FFFFFF' : colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.chipDivider} />
          {categorias.map((cat) => {
            const ativo = filtroCategoria === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, { backgroundColor: ativo ? colors.accent : colors.surface, borderColor: ativo ? colors.accent : colors.border }]}
                onPress={() => setFiltroCategoria(ativo ? null : cat.id)}
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.chipLabel, { color: ativo ? '#FFFFFF' : colors.textSecondary }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {carregando ? (
        <SkeletonLista n={5} />
      ) : itensFiltrados.length === 0 ? (
        <View style={styles.vazioWrap}>
          {lotes.length === 0 ? (
            <>
              <Text style={styles.vazioEmoji}>📦</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>Nenhuma doação registrada</Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Registre a primeira entrada para acompanhar o estoque.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/entrada')}
                activeOpacity={0.85}
              >
                <Text style={styles.vazioBotaoTexto}>Registrar entrada</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.vazioEmoji}>🔍</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>Nenhum item encontrado</Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Tente ajustar os filtros ou a busca.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => { setBusca(''); setFiltroRisco('todos'); setFiltroCategoria(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.vazioBotaoTexto, { color: colors.textPrimary }]}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator={false}>

          {atencaoItens.length > 0 && (
            <>
              <View style={styles.secaoHeader}>
                <View style={[styles.secaoDot, { backgroundColor: colors.riscoAtencao }]} />
                <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>REQUER ATENÇÃO</Text>
                <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>{atencaoItens.length}</Text>
              </View>
              {atencaoItens.map((item, i) => (
                <ProdutoCard key={item.produto.id} item={item} index={i} />
              ))}
              {segurosItens.length > 0 && <View style={{ height: 24 }} />}
            </>
          )}

          {segurosItens.length > 0 && (
            <>
              <View style={styles.secaoHeader}>
                <View style={[styles.secaoDot, { backgroundColor: colors.riscoSeguro }]} />
                <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>ESTOQUE SEGURO</Text>
                <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>{segurosItens.length}</Text>
              </View>
              {segurosItens.map((item, i) => (
                <ProdutoCard key={item.produto.id} item={item} index={atencaoItens.length + i} />
              ))}
            </>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 14 },
  titulo: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

  buscaWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  buscaIcn:   { fontSize: 18 },
  buscaInput: { flex: 1, fontSize: 16 },

  chipsRow:    { gap: 8, paddingBottom: 4 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: 44 },
  chipEmoji:   { fontSize: 14 },
  chipLabel:   { fontSize: 14, fontWeight: '600' },
  chipDivider: { width: 1, backgroundColor: 'transparent', marginHorizontal: 2 },

  listaContent: { paddingHorizontal: 20, paddingBottom: 100 },

  secaoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  secaoDot:    { width: 8, height: 8, borderRadius: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1, flex: 1 },
  secaoCount:  { fontSize: 13, fontWeight: '600' },

  // Card
  card: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 4,
    marginBottom: 10, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  emojiBg:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji:       { fontSize: 24 },
  foto:        { width: 46, height: 46, borderRadius: 12 },
  headerInfo:  { flex: 1, gap: 4 },
  nome:        { fontSize: 16, fontWeight: '700' },
  headerSubRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalTexto:  { fontSize: 13 },

  miniRiscos: { flexDirection: 'row', gap: 4 },
  miniPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  miniDot:    { width: 6, height: 6, borderRadius: 3 },
  miniNum:    { fontSize: 12, fontWeight: '700' },

  expandirCol:  { alignItems: 'center', gap: 2, paddingLeft: 4 },
  expandirNum:  { fontSize: 11, fontWeight: '600' },
  expandirSeta: { fontSize: 10 },

  divider:   { height: 1, marginHorizontal: 0 },
  lotesWrap: { padding: 12, gap: 8 },

  loteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, borderRadius: 8,
    paddingLeft: 10, paddingRight: 8, paddingVertical: 8,
  },
  loteInfo:    { flex: 1, gap: 2 },
  loteCodigo:  { fontSize: 14, fontWeight: '700' },
  loteDetalhe: { fontSize: 12 },

  verDetalhesBtn: {
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  verDetalhesTexto: { fontSize: 13, fontWeight: '600' },

  vazioWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 40 },
  vazioEmoji:     { fontSize: 48 },
  vazioTitulo:    { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vazioTexto:     { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  vazioBotao:     { marginTop: 4, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  vazioBotaoTexto:{ color: '#FFF', fontSize: 16, fontWeight: '700' },
});
