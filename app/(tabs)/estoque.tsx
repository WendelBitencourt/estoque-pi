import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { PRODUTOS, Categoria } from '../../data/produtos';
import { getRiscoProduto, getEstoqueTotal, getLotesByProduto, diasParaVencer, NivelRisco } from '../../data/lotes';

// --- tipos de filtro ---

type FiltroRisco = 'todos' | 'risco_alto' | 'atencao';
type FiltroCategoria = Categoria | null;

const CATEGORIAS: { valor: Categoria; label: string; emoji: string }[] = [
  { valor: 'alimentos', label: 'Alimentos', emoji: '🥛' },
  { valor: 'higiene', label: 'Higiene', emoji: '🧴' },
  { valor: 'bebe', label: 'Bebê', emoji: '👶' },
  { valor: 'limpeza', label: 'Limpeza', emoji: '🫧' },
  { valor: 'vestuario', label: 'Vestuário', emoji: '👕' },
];

// --- componente de item ---

interface ItemInfo {
  produto: (typeof PRODUTOS)[0];
  risco: NivelRisco;
  total: number;
  proximaValidade: string;
  dias: number;
  codigoLote: string;
}

function ProdutoItem({ item }: { item: ItemInfo }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${item.produto.id}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={styles.itemEmoji}>{item.produto.emoji}</Text>
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemNome, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.produto.nome}
        </Text>
        <Text style={[styles.itemLote, { color: colors.textSecondary }]}>
          Lote {item.codigoLote} · val. {formatarData(item.proximaValidade)}
        </Text>
        <Text style={[styles.itemQtd, { color: colors.textSecondary }]}>
          {item.total} em estoque
        </Text>
      </View>

      <RiskBadge risco={item.risco} diasParaVencer={item.dias} />
    </TouchableOpacity>
  );
}

// --- utilitários ---

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function buildItemInfo(p: (typeof PRODUTOS)[0]): ItemInfo {
  const lotes = getLotesByProduto(p.id); // ordenados por validade
  const pior = lotes[0];
  return {
    produto: p,
    risco: getRiscoProduto(p.id),
    total: getEstoqueTotal(p.id),
    proximaValidade: pior?.validade ?? '',
    dias: pior ? diasParaVencer(pior.validade) : 9999,
    codigoLote: pior?.codigo ?? '—',
  };
}

// --- tela ---

export default function EstoqueScreen() {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>(null);

  const todosItens = useMemo(() => PRODUTOS.map(buildItemInfo), []);

  const itensFiltrados = useMemo(() => {
    return todosItens.filter((item) => {
      const matchBusca = item.produto.nome
        .toLowerCase()
        .includes(busca.toLowerCase().trim());
      const matchRisco =
        filtroRisco === 'todos' || item.risco === filtroRisco;
      const matchCategoria =
        filtroCategoria === null || item.produto.categoria === filtroCategoria;
      return matchBusca && matchRisco && matchCategoria;
    });
  }, [todosItens, busca, filtroRisco, filtroCategoria]);

  const secoes = useMemo(() => {
    const atencao = itensFiltrados.filter(
      (i) => i.risco === 'risco_alto' || i.risco === 'atencao'
    );
    const seguros = itensFiltrados.filter((i) => i.risco === 'seguro');
    const result = [];
    if (atencao.length > 0) result.push({ title: 'Requer atenção', data: atencao });
    if (seguros.length > 0) result.push({ title: 'Estoque seguro', data: seguros });
    return result;
  }, [itensFiltrados]);

  const chipRisco: { valor: FiltroRisco; label: string; emoji: string }[] = [
    { valor: 'todos', label: 'Todos', emoji: '📦' },
    { valor: 'risco_alto', label: 'Risco alto', emoji: '🔴' },
    { valor: 'atencao', label: 'Atenção', emoji: '🟡' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header fixo */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Estoque</Text>

        {/* Barra de busca */}
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

        {/* Chips de filtro — rolagem horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chipRisco.map((c) => {
            const ativo = filtroRisco === c.valor && filtroCategoria === null;
            return (
              <TouchableOpacity
                key={c.valor}
                style={[
                  styles.chip,
                  {
                    backgroundColor: ativo ? colors.primary : colors.surface,
                    borderColor: ativo ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setFiltroRisco(c.valor);
                  setFiltroCategoria(null);
                }}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: ativo ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.chipDivider} />

          {CATEGORIAS.map((cat) => {
            const ativo = filtroCategoria === cat.valor;
            return (
              <TouchableOpacity
                key={cat.valor}
                style={[
                  styles.chip,
                  {
                    backgroundColor: ativo ? colors.accent : colors.surface,
                    borderColor: ativo ? colors.accent : colors.border,
                  },
                ]}
                onPress={() =>
                  setFiltroCategoria(ativo ? null : cat.valor)
                }
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: ativo ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de produtos */}
      {secoes.length === 0 ? (
        <View style={styles.vazioWrap}>
          <Text style={styles.vazioEmoji}>🔍</Text>
          <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
            Nenhum produto encontrado.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.produto.id}
          renderItem={({ item }) => <ProdutoItem item={item} />}
          renderSectionHeader={({ section }) => (
            <View
              style={[styles.secaoHeader, { backgroundColor: colors.background }]}
            >
              <View
                style={[
                  styles.secaoDot,
                  {
                    backgroundColor:
                      section.title === 'Requer atenção'
                        ? colors.riscoAtencao
                        : colors.riscoSeguro,
                  },
                ]}
              />
              <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
                {section.title.toUpperCase()}
              </Text>
              <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>
                {section.data.length}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listaContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

      {/* Botão novo produto */}
      <View style={[styles.fabWrap, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/cadastro')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabTexto}>＋  Novo produto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 14,
  },
  titulo: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  buscaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  buscaIcn: { fontSize: 18 },
  buscaInput: { flex: 1, fontSize: 16 },

  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 14, fontWeight: '600' },
  chipDivider: { width: 1, backgroundColor: 'transparent', marginHorizontal: 2 },

  listaContent: { paddingHorizontal: 20, paddingBottom: 100 },

  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  secaoDot: { width: 8, height: 8, borderRadius: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1, flex: 1 },
  secaoCount: { fontSize: 13, fontWeight: '600' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  itemEmojiBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemEmoji: { fontSize: 26 },
  itemInfo: { flex: 1, gap: 2 },
  itemNome: { fontSize: 17, fontWeight: '700' },
  itemLote: { fontSize: 13 },
  itemQtd: { fontSize: 13 },

  vazioWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  vazioEmoji: { fontSize: 40 },
  vazioTexto: { fontSize: 16 },

  fabWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  fab: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  fabTexto: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
