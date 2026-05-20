import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../theme';
import { Produto, Lote, Categoria } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';

type FiltroCategoria = Categoria | null;

const CATEGORIAS: { valor: Categoria; label: string; emoji: string }[] = [
  { valor: 'alimentos', label: 'Alimentos', emoji: '🥛' },
  { valor: 'higiene',   label: 'Higiene',   emoji: '🧴' },
  { valor: 'limpeza',   label: 'Limpeza',   emoji: '🫧' },
];

const CATEGORIA_LABEL: Record<Categoria, string> = {
  alimentos: 'Alimentos',
  higiene:   'Higiene',
  limpeza:   'Limpeza',
};

interface ProdutoInfo {
  produto: Produto;
  totalEstoque: number;
}

function ProdutoCard({ info }: { info: ProdutoInfo }) {
  const { colors } = useTheme();
  const { produto } = info;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${produto.id}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.emojiBg, { backgroundColor: colors.surfaceSecondary }]}>
        {produto.fotoUrl ? (
          <Image source={{ uri: produto.fotoUrl }} style={styles.foto} />
        ) : (
          <Text style={styles.emoji}>{produto.emoji}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.nome, { color: colors.textPrimary }]} numberOfLines={1}>
          {produto.nome}
        </Text>
        <Text style={[styles.categoria, { color: colors.textSecondary }]}>
          {CATEGORIA_LABEL[produto.categoria]}
          {produto.conteudo ? `  ·  ${produto.conteudo}` : ''}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.badgeTexto, { color: colors.textDisabled }]}>Aguardando</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProdutosScreen() {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);

  useEffect(() => {
    const u1 = subscribeToProdutos(setProdutos);
    const u2 = subscribeAllLotes(setLotes);
    return () => { u1(); u2(); };
  }, []);

  const itens = useMemo<ProdutoInfo[]>(() => {
    return produtos
      .map((p) => ({
        produto: p,
        totalEstoque: lotes
          .filter((l) => l.produtoId === p.id)
          .reduce((s, l) => s + l.quantidade, 0),
      }))
      .filter((info) => {
        const semDoacao    = info.totalEstoque === 0;
        const matchBusca   = info.produto.nome.toLowerCase().includes(busca.toLowerCase().trim());
        const matchCat     = filtroCategoria === null || info.produto.categoria === filtroCategoria;
        return semDoacao && matchBusca && matchCat;
      });
  }, [produtos, lotes, busca, filtroCategoria]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Produtos</Text>

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

        <View style={styles.chipsRow}>
          {CATEGORIAS.map((cat) => {
            const ativo = filtroCategoria === cat.valor;
            return (
              <TouchableOpacity
                key={cat.valor}
                style={[styles.chip, {
                  backgroundColor: ativo ? colors.accent : colors.surface,
                  borderColor:     ativo ? colors.accent : colors.border,
                }]}
                onPress={() => setFiltroCategoria(ativo ? null : cat.valor)}
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.chipLabel, { color: ativo ? '#FFFFFF' : colors.textSecondary }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {itens.length === 0 ? (
        <View style={styles.vazioWrap}>
          <Text style={styles.vazioEmoji}>✅</Text>
          <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
            {busca || filtroCategoria
              ? 'Nenhum produto encontrado.'
              : 'Todos os produtos têm doações registradas.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(item) => item.produto.id}
          renderItem={({ item }) => <ProdutoCard info={item} />}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

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
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 14 },
  titulo: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

  buscaWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  buscaIcn:   { fontSize: 18 },
  buscaInput: { flex: 1, fontSize: 16 },

  chipsRow:  { flexDirection: 'row', gap: 8 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 14, fontWeight: '600' },

  lista: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  emojiBg: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji:   { fontSize: 24 },
  foto:    { width: 48, height: 48, borderRadius: 13 },
  info:    { flex: 1, gap: 3 },
  nome:    { fontSize: 16, fontWeight: '700' },
  categoria: { fontSize: 13 },

  badge:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTexto: { fontSize: 13, fontWeight: '700' },

  vazioWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  vazioEmoji: { fontSize: 40 },
  vazioTexto: { fontSize: 16 },

  fabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  fab:     { borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  fabTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
