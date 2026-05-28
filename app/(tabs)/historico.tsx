import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../theme';
import { Movimentacao, Produto, Lote, TipoMovimentacao } from '../../services/tipos';
import { subscribeToMovimentacoes } from '../../services/movimentacoesService';
import { subscribeToProdutos } from '../../services/produtosService';
import { SkeletonLista } from '../../components/SkeletonCard';
import { subscribeAllLotesRaw } from '../../services/lotesService';

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Filtro = 'todos' | TipoMovimentacao;

const FILTROS: { valor: Filtro; label: string; emoji: string }[] = [
  { valor: 'todos',    label: 'Todos',     emoji: '📋' },
  { valor: 'entrada',  label: 'Entradas',  emoji: '📥' },
  { valor: 'saida',    label: 'Saídas',    emoji: '📤' },
  { valor: 'descarte', label: 'Descartes', emoji: '🗑️' },
];

const CONFIG_TIPO: Record<
  TipoMovimentacao,
  { emoji: string; label: string; cor: (c: any) => string; bgCor: (c: any) => string }
> = {
  entrada:  { emoji: '📥', label: 'Entrada',  cor: (c) => c.riscoSeguroDark, bgCor: (c) => c.riscoSeguroLight },
  saida:    { emoji: '📤', label: 'Saída',    cor: (c) => c.primaryDark,     bgCor: (c) => c.primaryLight },
  descarte: { emoji: '🗑️', label: 'Descarte', cor: (c) => c.riscoAltoDark,   bgCor: (c) => c.riscoAltoLight },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelMes(chave: string) {
  const [year, month] = chave.split('-');
  return `${MESES_PT[Number(month) - 1]} ${year}`;
}

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// ── Componentes de item ───────────────────────────────────────────────────────

function MovItem({
  mov,
  produtoMap,
  loteMap,
}: {
  mov: Movimentacao;
  produtoMap: Map<string, Produto>;
  loteMap: Map<string, Lote>;
}) {
  const { colors } = useTheme();
  const produto = produtoMap.get(mov.produtoId);
  const lote    = loteMap.get(mov.loteId);
  const cfg     = CONFIG_TIPO[mov.tipo];
  if (!produto) return null;

  return (
    <TouchableOpacity
      style={[styles.movCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${produto.id}`)}
      activeOpacity={0.75}
      accessibilityLabel={`${cfg.label} de ${produto.nome}, ${mov.quantidade} unidades`}
    >
      <View style={[styles.movIconWrap, { backgroundColor: cfg.bgCor(colors) }]}>
        <Text style={styles.movIconEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={styles.movInfo}>
        <View style={styles.movNomeRow}>
          <Text style={styles.movProdEmoji}>{produto.emoji}</Text>
          <Text style={[styles.movNome, { color: colors.textPrimary }]} numberOfLines={1}>
            {produto.nome}
          </Text>
        </View>
        <Text style={[styles.movSub, { color: colors.textSecondary }]}>
          Lote {lote?.codigo ?? '—'}{mov.observacao ? ` · ${mov.observacao}` : ''}
        </Text>
      </View>
      <View style={styles.movDireita}>
        <Text style={[styles.movQtd, { color: cfg.cor(colors) }]}>
          {mov.tipo === 'entrada' ? '+' : '−'}{mov.quantidade}
        </Text>
        <Text style={[styles.movData, { color: colors.textDisabled }]}>
          {formatarData(mov.data)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ResumoCard({ emoji, label, valor, bg, cor }: {
  emoji: string; label: string; valor: number; bg: string; cor: string;
}) {
  return (
    <View style={[styles.resumoCard, { backgroundColor: bg }]}>
      <Text style={styles.resumoEmoji}>{emoji}</Text>
      <Text style={[styles.resumoValor, { color: cor }]}>{valor}</Text>
      <Text style={[styles.resumoLabel, { color: cor }]}>{label}</Text>
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function HistoricoScreen() {
  const { colors } = useTheme();
  const [filtro, setFiltro]           = useState<Filtro>('todos');
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [produtos, setProdutos]           = useState<Produto[]>([]);
  const [lotes, setLotes]                 = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const recebido = useRef({ movs: false, prod: false, lotes: false });

  function marcarRecebido(chave: 'movs' | 'prod' | 'lotes') {
    recebido.current[chave] = true;
    if (recebido.current.movs && recebido.current.prod && recebido.current.lotes) setCarregando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 6000);
    const u1 = subscribeToMovimentacoes((d) => { setMovimentacoes(d); marcarRecebido('movs'); });
    const u2 = subscribeToProdutos((d)       => { setProdutos(d);      marcarRecebido('prod'); });
    const u3 = subscribeAllLotesRaw((d)      => { setLotes(d);         marcarRecebido('lotes'); });
    return () => { u1(); u2(); u3(); clearTimeout(timer); };
  }, []);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const loteMap    = useMemo(() => new Map(lotes.map((l)  => [l.id, l])), [lotes]);

  const totaisGerais = useMemo(() => ({
    entradas:  movimentacoes.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0),
    saidas:    movimentacoes.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0),
    descartes: movimentacoes.filter((m) => m.tipo === 'descarte').reduce((s, m) => s + m.quantidade, 0),
  }), [movimentacoes]);

  const secoes = useMemo(() => {
    const filtradas = filtro === 'todos' ? movimentacoes : movimentacoes.filter((m) => m.tipo === filtro);
    const grupos: Record<string, Movimentacao[]> = {};
    for (const mov of filtradas) {
      const chave = mov.data.slice(0, 7);
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(mov);
    }
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([chave, data]) => ({
        title: chave,
        data: data.sort((a, b) => b.data.localeCompare(a.data)),
      }));
  }, [filtro, movimentacoes]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Histórico</Text>

        <View style={styles.resumoRow}>
          <ResumoCard emoji="📥" label="Entradas"  valor={totaisGerais.entradas}  bg={colors.riscoSeguroLight} cor={colors.riscoSeguroDark} />
          <ResumoCard emoji="📤" label="Saídas"    valor={totaisGerais.saidas}    bg={colors.primaryLight}     cor={colors.primaryDark} />
          <ResumoCard emoji="🗑️" label="Descartes" valor={totaisGerais.descartes} bg={colors.riscoAltoLight}   cor={colors.riscoAltoDark} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.valor;
            const bgAtiva = f.valor === 'entrada'
              ? colors.riscoSeguro : f.valor === 'saida'
              ? colors.primary : f.valor === 'descarte'
              ? colors.riscoAlto : colors.primary;
            return (
              <TouchableOpacity
                key={f.valor}
                style={[styles.chip, { backgroundColor: ativo ? bgAtiva : colors.surface, borderColor: ativo ? bgAtiva : colors.border }]}
                onPress={() => setFiltro(f.valor)}
                accessibilityLabel={`Filtrar por ${f.label}`}
              >
                <Text style={styles.chipEmoji}>{f.emoji}</Text>
                <Text style={[styles.chipLabel, { color: ativo ? '#FFF' : colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {carregando ? (
        <SkeletonLista n={5} />
      ) : secoes.length === 0 ? (
        <View style={styles.vazioWrap}>
          <Text style={styles.vazioEmoji}>📭</Text>
          <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
            {filtro === 'todos' ? 'Nenhuma movimentação ainda' : 'Nenhum registro desse tipo'}
          </Text>
          <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
            {filtro === 'todos'
              ? 'As entradas, saídas e descartes vão aparecer aqui.'
              : 'Tente mudar o filtro para ver outros registros.'}
          </Text>
          {filtro === 'todos' ? (
            <TouchableOpacity
              style={[styles.vazioBotao, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/entrada')}
              activeOpacity={0.85}
              accessibilityLabel="Registrar primeira entrada"
            >
              <Text style={styles.vazioBotaoTexto}>Registrar entrada</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.vazioBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setFiltro('todos')}
              activeOpacity={0.8}
              accessibilityLabel="Ver todos os registros"
            >
              <Text style={[styles.vazioBotaoTexto, { color: colors.textPrimary }]}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MovItem mov={item} produtoMap={produtoMap} loteMap={loteMap} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.secaoHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
                {labelMes(section.title).toUpperCase()}
              </Text>
              <View style={[styles.secaoLinha, { backgroundColor: colors.divider }]} />
              <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>
                {section.data.length} mov.
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listaContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 16 },

  titulo:       { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

  resumoRow:   { flexDirection: 'row', gap: 10 },
  resumoCard:  { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 2 },
  resumoEmoji: { fontSize: 20 },
  resumoValor: { fontSize: 26, fontWeight: '800' },
  resumoLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  chipsRow:  { gap: 8, paddingBottom: 4 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: 44 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 14, fontWeight: '600' },

  listaContent: { paddingHorizontal: 20, paddingBottom: 32 },
  secaoHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  secaoTitulo:  { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 },
  secaoLinha:   { flex: 1, height: 1 },
  secaoCount:   { fontSize: 12, fontWeight: '600' },

  movCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  movIconWrap:  { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  movIconEmoji: { fontSize: 22 },
  movInfo:      { flex: 1, gap: 3 },
  movNomeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movProdEmoji: { fontSize: 16 },
  movNome:      { fontSize: 16, fontWeight: '700', flex: 1 },
  movSub:       { fontSize: 13, lineHeight: 17 },
  movDireita:   { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  movQtd:       { fontSize: 16, fontWeight: '800' },
  movData:      { fontSize: 12 },

  vazioWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 40 },
  vazioEmoji:    { fontSize: 48 },
  vazioTitulo:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vazioTexto:    { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  vazioBotao:    { marginTop: 4, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  vazioBotaoTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
