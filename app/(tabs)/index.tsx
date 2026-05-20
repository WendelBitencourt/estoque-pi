import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote, NivelRisco } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer } from '../../services/risco';

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

function ResumoCard({ label, valor, bg, textColor, emoji }: {
  label: string; valor: number; bg: string; textColor: string; emoji: string;
}) {
  return (
    <View style={[styles.resumoCard, { backgroundColor: bg }]}>
      <Text style={styles.resumoEmoji}>{emoji}</Text>
      <Text style={[styles.resumoValor, { color: textColor }]}>{valor}</Text>
      <Text style={[styles.resumoLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export default function InicioScreen() {
  const { colors } = useTheme();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);

  useEffect(() => {
    const u1 = subscribeToProdutos(setProdutos);
    const u2 = subscribeAllLotes(setLotes);
    return () => { u1(); u2(); };
  }, []);

  function lotesParaProduto(produtoId: string) {
    return lotes.filter((l) => l.produtoId === produtoId);
  }

  function estoqueTotal(produtoId: string) {
    return lotesParaProduto(produtoId).reduce((s, l) => s + l.quantidade, 0);
  }

  // Produtos que têm pelo menos um lote em risco_alto ou atencao
  const produtosAtencao = produtos
    .map((p) => {
      const ls = lotesParaProduto(p.id);
      const risco = ls.length > 0 ? getRiscoProduto(ls) : 'seguro' as NivelRisco;
      return { produto: p, risco, ls };
    })
    .filter(({ risco }) => risco === 'risco_alto' || risco === 'atencao')
    .map(({ produto, risco, ls }) => {
      const pior = ls.sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())[0];
      return {
        produto,
        risco,
        diasPiorLote: pior ? diasParaVencer(pior.validade) : 0,
        total: estoqueTotal(produto.id),
      };
    });

  const resumo = {
    riscoAlto: produtos.filter((p) => getRiscoProduto(lotesParaProduto(p.id)) === 'risco_alto').length,
    atencao:   produtos.filter((p) => getRiscoProduto(lotesParaProduto(p.id)) === 'atencao').length,
    seguros:   produtos.filter((p) => getRiscoProduto(lotesParaProduto(p.id)) === 'seguro').length,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.saudacao, { color: colors.textPrimary }]}>{getSaudacao()}! 👋</Text>
            <Text style={[styles.data, { color: colors.textSecondary }]}>{getDataFormatada()}</Text>
          </View>
          <View style={[styles.logoBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.logoEmoji}>🏠</Text>
          </View>
        </View>

        {/* Cards de resumo */}
        <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>RESUMO DO ESTOQUE</Text>
        <View style={styles.resumoRow}>
          <ResumoCard label="Risco alto" valor={resumo.riscoAlto} bg={colors.riscoAltoLight} textColor={colors.riscoAltoDark} emoji="🔴" />
          <ResumoCard label="Atenção" valor={resumo.atencao} bg={colors.riscoAtencaoLight} textColor={colors.riscoAtencaoDark} emoji="🟡" />
          <ResumoCard label="Seguros" valor={resumo.seguros} bg={colors.riscoSeguroLight} textColor={colors.riscoSeguroDark} emoji="🟢" />
        </View>

        {/* Lista de atenção */}
        <View style={styles.secaoHeader}>
          <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>REQUER ATENÇÃO</Text>
          <TouchableOpacity onPress={() => router.push('/estoque')}>
            <Text style={[styles.verTodos, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {produtosAtencao.length === 0 ? (
          <View style={[styles.vazio, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.vazioEmoji}>✅</Text>
            <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>
              Tudo em ordem! Nenhum produto em risco.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {produtosAtencao.map(({ produto, risco, diasPiorLote, total }) => (
              <TouchableOpacity
                key={produto.id}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/produto/${produto.id}`)}
                activeOpacity={0.75}
              >
                <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
                  {produto.fotoUrl ? (
                    <Image source={{ uri: produto.fotoUrl }} style={styles.itemFoto} />
                  ) : (
                    <Text style={styles.itemEmoji}>{produto.emoji}</Text>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{total} em estoque</Text>
                </View>
                <RiskBadge risco={risco} diasParaVencer={diasPiorLote} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botões de ação */}
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

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  saudacao: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  data: { fontSize: 15, textTransform: 'capitalize' },
  logoBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 24 },

  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 28 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  verTodos: { fontSize: 14, fontWeight: '600', marginBottom: 12 },

  resumoRow: { flexDirection: 'row', gap: 10 },
  resumoCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  resumoEmoji: { fontSize: 22 },
  resumoValor: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  resumoLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  lista: { gap: 10 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  itemEmojiBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemEmoji: { fontSize: 26 },
  itemFoto: { width: 48, height: 48, borderRadius: 14 },
  itemInfo: { flex: 1 },
  itemNome: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  itemSub: { fontSize: 14 },

  vazio: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  vazioEmoji: { fontSize: 36 },
  vazioTexto: { fontSize: 16, textAlign: 'center', lineHeight: 22 },

  botaoPrincipal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32, paddingVertical: 20, borderRadius: 20 },
  botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, paddingVertical: 18, borderRadius: 20, borderWidth: 1.5 },
  botaoEmoji: { fontSize: 22 },
  botaoTexto: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  bottomSpace: { height: 20 },
});
