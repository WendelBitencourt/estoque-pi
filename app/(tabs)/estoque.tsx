import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SectionList,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { SkeletonLista } from '../../components/SkeletonCard';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote, NivelRisco, Categoria } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer } from '../../services/risco';

type FiltroRisco = 'todos' | 'risco_alto' | 'atencao' | 'seguro';
type FiltroCategoria = Categoria | null;

const CATEGORIAS: { valor: Categoria; label: string; emoji: string }[] = [
  { valor: 'alimentos', label: 'Alimentos', emoji: '🥛' },
  { valor: 'higiene', label: 'Higiene', emoji: '🧴' },
  { valor: 'limpeza', label: 'Limpeza', emoji: '🫧' },
];

interface ItemInfo {
  produto: Produto;
  risco: NivelRisco;
  total: number;
  proximaValidade: string;
  dias: number;
  codigoLote: string;
}

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function ProdutoItem({ item, index = 0 }: { item: ItemInfo; index?: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 55).duration(400).springify().damping(18)}>
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/produto/${item.produto.id}`)}
        activeOpacity={0.75}
        accessibilityLabel={`${item.produto.nome}, ${item.total} em estoque, lote ${item.codigoLote}`}
      >
        <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
          {item.produto.fotoUrl ? (
            <Image source={{ uri: item.produto.fotoUrl }} style={styles.itemFoto} />
          ) : (
            <Text style={styles.itemEmoji}>{item.produto.emoji}</Text>
          )}
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
    </Animated.View>
  );
}

export default function EstoqueScreen() {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const recebido = useRef({ produtos: false, lotes: false });

  function marcarRecebido(chave: 'produtos' | 'lotes') {
    recebido.current[chave] = true;
    if (recebido.current.produtos && recebido.current.lotes) setCarregando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 6000); // fallback
    const u1 = subscribeToProdutos((d) => { setProdutos(d); marcarRecebido('produtos'); });
    const u2 = subscribeAllLotes((d)   => { setLotes(d);    marcarRecebido('lotes'); });
    return () => { u1(); u2(); clearTimeout(timer); };
  }, []);

  const todosItens = useMemo<ItemInfo[]>(() => {
    return produtos
      .map((p) => {
        const ls = lotes.filter((l) => l.produtoId === p.id);
        const pior = ls[0];
        return {
          produto: p,
          risco: ls.length > 0 ? getRiscoProduto(ls) : 'seguro',
          total: ls.reduce((s, l) => s + l.quantidade, 0),
          proximaValidade: pior?.validade ?? '',
          dias: pior ? diasParaVencer(pior.validade) : 9999,
          codigoLote: pior?.codigo ?? '—',
        };
      })
      .filter((item) => item.total > 0); // só exibe produtos com doações registradas
  }, [produtos, lotes]);

  const itensFiltrados = useMemo(() => todosItens.filter((item) => {
    const matchBusca = item.produto.nome.toLowerCase().includes(busca.toLowerCase().trim());
    const matchRisco =
      filtroRisco === 'todos' ||
      item.risco === filtroRisco;
    const matchCategoria = filtroCategoria === null || item.produto.categoria === filtroCategoria;
    return matchBusca && matchRisco && matchCategoria;
  }), [todosItens, busca, filtroRisco, filtroCategoria]);

  const secoes = useMemo(() => {
    const atencao = itensFiltrados.filter((i) => i.risco === 'risco_alto' || i.risco === 'atencao');
    const seguros = itensFiltrados.filter((i) => i.risco === 'seguro');
    const result = [];
    if (atencao.length > 0) result.push({ title: 'Requer atenção', data: atencao });
    if (seguros.length > 0) result.push({ title: 'Estoque seguro', data: seguros });
    return result;
  }, [itensFiltrados]);

  const chipRisco: { valor: FiltroRisco; label: string; emoji: string }[] = [
    { valor: 'todos',     label: 'Todos',     emoji: '📦' },
    { valor: 'risco_alto', label: 'Risco alto', emoji: '🔴' },
    { valor: 'atencao',   label: 'Atenção',   emoji: '🟡' },
    { valor: 'seguro',    label: 'Seguro',    emoji: '🟢' },
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
          {CATEGORIAS.map((cat) => {
            const ativo = filtroCategoria === cat.valor;
            return (
              <TouchableOpacity
                key={cat.valor}
                style={[styles.chip, { backgroundColor: ativo ? colors.accent : colors.surface, borderColor: ativo ? colors.accent : colors.border }]}
                onPress={() => setFiltroCategoria(ativo ? null : cat.valor)}
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
      ) : secoes.length === 0 ? (
        <View style={styles.vazioWrap}>
          {lotes.length === 0 ? (
            <>
              <Text style={styles.vazioEmoji}>📦</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
                Nenhuma doação registrada
              </Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Registre a primeira entrada para acompanhar o estoque.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/entrada')}
                activeOpacity={0.85}
                accessibilityLabel="Registrar primeira entrada"
              >
                <Text style={styles.vazioBotaoTexto}>Registrar entrada</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.vazioEmoji}>🔍</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
                Nenhum item encontrado
              </Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Tente ajustar os filtros ou a busca.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => { setBusca(''); setFiltroRisco('todos'); setFiltroCategoria(null); }}
                activeOpacity={0.8}
                accessibilityLabel="Limpar filtros"
              >
                <Text style={[styles.vazioBotaoTexto, { color: colors.textPrimary }]}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.produto.id}
          renderItem={({ item, index }) => <ProdutoItem item={item} index={index} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.secaoHeader, { backgroundColor: colors.background }]}>
              <View style={[styles.secaoDot, { backgroundColor: section.title === 'Requer atenção' ? colors.riscoAtencao : colors.riscoSeguro }]} />
              <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>{section.title.toUpperCase()}</Text>
              <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>{section.data.length}</Text>
            </View>
          )}
          contentContainerStyle={styles.listaContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 14 },
  titulo: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

  buscaWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  buscaIcn: { fontSize: 18 },
  buscaInput: { flex: 1, fontSize: 16 },

  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: 44 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 14, fontWeight: '600' },
  chipDivider: { width: 1, backgroundColor: 'transparent', marginHorizontal: 2 },

  listaContent: { paddingHorizontal: 20, paddingBottom: 100 },
  secaoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  secaoDot: { width: 8, height: 8, borderRadius: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1, flex: 1 },
  secaoCount: { fontSize: 13, fontWeight: '600' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  itemEmojiBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemEmoji: { fontSize: 26 },
  itemFoto: { width: 50, height: 50, borderRadius: 14 },
  itemInfo: { flex: 1, gap: 2 },
  itemNome: { fontSize: 17, fontWeight: '700' },
  itemLote: { fontSize: 13 },
  itemQtd: { fontSize: 13 },

  vazioWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 40 },
  vazioEmoji: { fontSize: 48 },
  vazioTitulo: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vazioTexto: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  vazioBotao: { marginTop: 4, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  vazioBotaoTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
