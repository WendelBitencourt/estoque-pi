import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTheme } from '../../theme';
import { RiskBadge } from '../../components/RiskBadge';
import { PRODUTOS } from '../../data/produtos';
import {
  getRiscoProduto,
  getEstoqueTotal,
  getLotesByProduto,
  diasParaVencer,
  NivelRisco,
} from '../../data/lotes';

// ── helpers ──────────────────────────────────────────────────────────────────

interface ItemNecessidade {
  produtoId: string;
  nome: string;
  emoji: string;
  unidade: string;
  total: number;
  risco: NivelRisco;
  diasPiorLote: number | null;
  motivo: string;
}

function buildLista(): { urgentes: ItemNecessidade[]; atencao: ItemNecessidade[] } {
  const urgentes: ItemNecessidade[] = [];
  const atencao: ItemNecessidade[] = [];

  for (const p of PRODUTOS) {
    const risco = getRiscoProduto(p.id);
    const total = getEstoqueTotal(p.id);
    const lotes = getLotesByProduto(p.id);
    const pior = lotes[0] ?? null;
    const dias = pior ? diasParaVencer(pior.validade) : null;

    let motivo = '';
    if (total === 0) {
      motivo = 'Sem estoque';
    } else if (risco === 'risco_alto') {
      motivo = dias !== null && dias <= 0
        ? 'Produto vencido'
        : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
    } else if (risco === 'atencao') {
      motivo = `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
    }

    const item: ItemNecessidade = {
      produtoId: p.id,
      nome: p.nome,
      emoji: p.emoji,
      unidade: p.unidade,
      total,
      risco,
      diasPiorLote: dias,
      motivo,
    };

    if (total === 0 || risco === 'risco_alto') urgentes.push(item);
    else if (risco === 'atencao') atencao.push(item);
  }

  return { urgentes, atencao };
}

function gerarTextoWhatsApp(urgentes: ItemNecessidade[], atencao: ItemNecessidade[]): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const linhas = [
    `🏠 *Casa da Criança — Lista de Necessidades*`,
    `📅 ${hoje}`,
    '',
  ];

  if (urgentes.length > 0) {
    linhas.push('🔴 *URGENTE — precisa de doação agora:*');
    for (const i of urgentes) {
      linhas.push(`  ${i.emoji} ${i.nome} (${i.motivo})`);
    }
    linhas.push('');
  }

  if (atencao.length > 0) {
    linhas.push('🟡 *Atenção — vai precisar em breve:*');
    for (const i of atencao) {
      linhas.push(`  ${i.emoji} ${i.nome} (${i.motivo})`);
    }
    linhas.push('');
  }

  linhas.push('Qualquer doação é muito bem-vinda! 🙏');
  return linhas.join('\n');
}

// ── componente de item ───────────────────────────────────────────────────────

function NecessidadeItem({ item }: { item: ItemNecessidade }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${item.produtoId}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={styles.itemEmoji}>{item.emoji}</Text>
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemNome, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.nome}
        </Text>
        <View style={styles.itemDetalhesRow}>
          <Text style={[styles.itemEstoque, { color: colors.textSecondary }]}>
            {item.total === 0
              ? '⚠️ Sem estoque'
              : `${item.total} ${item.unidade} em estoque`}
          </Text>
        </View>
        <Text style={[styles.itemMotivo, {
          color: item.risco === 'risco_alto' ? colors.riscoAltoDark : colors.riscoAtencaoDark,
        }]}>
          {item.motivo}
        </Text>
      </View>

      <RiskBadge risco={item.risco} diasParaVencer={item.diasPiorLote ?? undefined} />
    </TouchableOpacity>
  );
}

// ── tela ─────────────────────────────────────────────────────────────────────

export default function NecessidadesScreen() {
  const { colors } = useTheme();
  const { urgentes, atencao } = useMemo(buildLista, []);
  const total = urgentes.length + atencao.length;

  function handleCompartilhar() {
    const texto = gerarTextoWhatsApp(urgentes, atencao);
    Share.share({ message: texto }).catch(() => {
      Alert.alert(
        'Compartilhar',
        'A lista foi preparada. O compartilhamento via WhatsApp estará disponível na próxima fase.',
        [{ text: 'OK' }]
      );
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIconBg, { backgroundColor: colors.accentLight }]}>
            <Text style={styles.headerIcon}>📝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>
              Lista de Necessidades
            </Text>
            <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
              {total === 0
                ? 'Tudo em ordem no estoque!'
                : `${total} ${total === 1 ? 'produto precisa' : 'produtos precisam'} de doação`}
            </Text>
          </View>
        </View>

        {/* Botão WhatsApp */}
        <TouchableOpacity
          style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
          onPress={handleCompartilhar}
          activeOpacity={0.85}
          disabled={total === 0}
        >
          <Text style={styles.whatsappEmoji}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.whatsappTitulo}>Compartilhar no WhatsApp</Text>
            <Text style={styles.whatsappSub}>
              Envie a lista para grupos de doadores
            </Text>
          </View>
          <Text style={styles.whatsappSeta}>›</Text>
        </TouchableOpacity>

        {total === 0 ? (
          /* Estado vazio */
          <View style={[styles.vazioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.vazioEmoji}>🎉</Text>
            <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>
              Estoque em dia!
            </Text>
            <Text style={[styles.vazioSub, { color: colors.textSecondary }]}>
              Nenhum produto precisa de doação urgente no momento.
            </Text>
          </View>
        ) : (
          <>
            {/* Urgentes */}
            {urgentes.length > 0 && (
              <View style={styles.secao}>
                <View style={styles.secaoHeaderRow}>
                  <View style={[styles.secaoDot, { backgroundColor: colors.riscoAlto }]} />
                  <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
                    URGENTE
                  </Text>
                  <View style={[styles.secaoCount, { backgroundColor: colors.riscoAltoLight }]}>
                    <Text style={[styles.secaoCountTexto, { color: colors.riscoAltoDark }]}>
                      {urgentes.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.secaoDesc, { color: colors.textSecondary }]}>
                  Precisam de doação o quanto antes
                </Text>
                <View style={styles.lista}>
                  {urgentes.map((item) => (
                    <NecessidadeItem key={item.produtoId} item={item} />
                  ))}
                </View>
              </View>
            )}

            {/* Atenção */}
            {atencao.length > 0 && (
              <View style={styles.secao}>
                <View style={styles.secaoHeaderRow}>
                  <View style={[styles.secaoDot, { backgroundColor: colors.riscoAtencao }]} />
                  <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
                    ATENÇÃO
                  </Text>
                  <View style={[styles.secaoCount, { backgroundColor: colors.riscoAtencaoLight }]}>
                    <Text style={[styles.secaoCountTexto, { color: colors.riscoAtencaoDark }]}>
                      {atencao.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.secaoDesc, { color: colors.textSecondary }]}>
                  Vencimento próximo — providencie em breve
                </Text>
                <View style={styles.lista}>
                  {atencao.map((item) => (
                    <NecessidadeItem key={item.produtoId} item={item} />
                  ))}
                </View>
              </View>
            )}

            {/* Dica */}
            <View style={[styles.dicaCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={styles.dicaEmoji}>💡</Text>
              <Text style={[styles.dicaTexto, { color: colors.primaryDark }]}>
                Compartilhe esta lista com grupos de doadores e parceiros da Casa da Criança para agilizar as doações.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, flexGrow: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 30 },
  titulo: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitulo: { fontSize: 14, marginTop: 2, lineHeight: 20 },

  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#25D366', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  whatsappEmoji: { fontSize: 30 },
  whatsappTitulo: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  whatsappSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  whatsappSeta: { fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: '300' },

  secao: { marginBottom: 28 },
  secaoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secaoDot: { width: 8, height: 8, borderRadius: 4 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, flex: 1 },
  secaoCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  secaoCountTexto: { fontSize: 12, fontWeight: '700' },
  secaoDesc: { fontSize: 14, marginBottom: 12, lineHeight: 20 },

  lista: { gap: 10 },
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
  itemDetalhesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemEstoque: { fontSize: 13 },
  itemMotivo: { fontSize: 13, fontWeight: '700' },

  vazioCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  vazioEmoji: { fontSize: 52 },
  vazioTitulo: { fontSize: 22, fontWeight: '800' },
  vazioSub: { fontSize: 16, textAlign: 'center', lineHeight: 24 },

  dicaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  dicaEmoji: { fontSize: 22, marginTop: 1 },
  dicaTexto: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
