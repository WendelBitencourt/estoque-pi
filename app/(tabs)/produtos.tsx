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
import { useState, useEffect, useMemo, useRef } from 'react';
import { SkeletonLista } from '../../components/SkeletonCard';
import { useTheme } from '../../theme';
import { Produto, Lote } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { CategoriaItem, CATEGORIAS_PADRAO, subscribeCategorias } from '../../services/categoriasService';

type FiltroCategoria = string | null;

interface ProdutoInfo {
  produto: Produto;
  totalEstoque: number;
}

function ProdutoCard({ info, categorias }: { info: ProdutoInfo; categorias: CategoriaItem[] }) {
  const { colors } = useTheme();
  const { produto } = info;
  const catLabel = categorias.find((c) => c.id === produto.categoria)?.label ?? produto.categoria;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${produto.id}`)}
      activeOpacity={0.75}
      accessibilityLabel={`${produto.nome}, ${catLabel}${info.totalEstoque > 0 ? `, ${info.totalEstoque} em estoque` : ', aguardando doação'}`}
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
          {catLabel}
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
          {categorias.map((cat) => {
            const ativo = filtroCategoria === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, {
                  backgroundColor: ativo ? colors.accent : colors.surface,
                  borderColor:     ativo ? colors.accent : colors.border,
                }]}
                onPress={() => setFiltroCategoria(ativo ? null : cat.id)}
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

      {carregando ? (
        <SkeletonLista n={5} />
      ) : itens.length === 0 ? (
        <View style={styles.vazioWrap}>
          {produtos.length === 0 ? (
            <>
              <Text style={styles.vazioEmoji}>📋</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
                Nenhum produto cadastrado
              </Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Cadastre os produtos que a Casa da Criança recebe em doação.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/cadastro')}
                activeOpacity={0.85}
                accessibilityLabel="Cadastrar primeiro produto"
              >
                <Text style={styles.vazioBotaoTexto}>Cadastrar produto</Text>
              </TouchableOpacity>
            </>
          ) : busca || filtroCategoria ? (
            <>
              <Text style={styles.vazioEmoji}>🔍</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
                Nenhum produto encontrado
              </Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Tente ajustar a busca ou remover os filtros.
              </Text>
              <TouchableOpacity
                style={[styles.vazioBotao, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => { setBusca(''); setFiltroCategoria(null); }}
                activeOpacity={0.8}
                accessibilityLabel="Limpar busca e filtros"
              >
                <Text style={[styles.vazioBotaoTexto, { color: colors.textPrimary }]}>Limpar busca</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.vazioEmoji}>✅</Text>
              <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
                Tudo com estoque!
              </Text>
              <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
                Todos os produtos têm doações registradas.
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(item) => item.produto.id}
          renderItem={({ item }) => <ProdutoCard info={item} categorias={categorias} />}
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

  buscaWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  buscaIcn:   { fontSize: 18 },
  buscaInput: { flex: 1, fontSize: 16 },

  chipsRow:  { flexDirection: 'row', gap: 8 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: 44 },
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

  vazioWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 80 },
  vazioEmoji:    { fontSize: 48 },
  vazioTitulo:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vazioTexto:    { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  vazioBotao:    { marginTop: 4, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  vazioBotaoTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  fabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  fab:     { borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  fabTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
