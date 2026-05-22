import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../theme';
import { SkeletonLista } from '../../components/SkeletonCard';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote, NivelRisco } from '../../services/tipos';
import { subscribeToProdutos, toggleOcultarNecessidades } from '../../services/produtosService';
import { subscribeAllLotes } from '../../services/lotesService';
import { getRiscoProduto, diasParaVencer } from '../../services/risco';
import { getEntradasMensais } from '../../services/movimentacoesService';
import { agruparDoacoes } from '../../services/mlService';

interface ItemNecessidade {
  produtoId: string;
  nome: string;
  emoji: string;
  total: number;
  risco: NivelRisco;
  diasPiorLote: number | null;
  motivo: string;
}

function buildLista(
  produtos: Produto[],
  lotes: Lote[]
): { urgentes: ItemNecessidade[]; atencao: ItemNecessidade[] } {
  const urgentes: ItemNecessidade[] = [];
  const atencaoList: ItemNecessidade[] = [];

  for (const p of produtos.filter((p) => !p.ocultarNecessidades)) {
    const ls = lotes.filter((l) => l.produtoId === p.id);
    const risco = ls.length > 0 ? getRiscoProduto(ls) : ('seguro' as NivelRisco);
    const total = ls.reduce((s, l) => s + l.quantidade, 0);
    const pior = [...ls].sort(
      (a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime()
    )[0] ?? null;
    const dias = pior ? diasParaVencer(pior.validade) : null;

    let motivo = '';
    if (total === 0) {
      motivo = 'Sem estoque';
    } else if (risco === 'risco_alto') {
      motivo = dias !== null && dias <= 0 ? 'Produto vencido' : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
    } else if (risco === 'atencao') {
      motivo = `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
    }

    const item: ItemNecessidade = {
      produtoId: p.id,
      nome: p.nome,
      emoji: p.emoji,
      total,
      risco,
      diasPiorLote: dias,
      motivo,
    };

    if (total === 0 || risco === 'risco_alto') urgentes.push(item);
    else if (risco === 'atencao') atencaoList.push(item);
  }

  return { urgentes, atencao: atencaoList };
}

function gerarTexto(
  urgentes: ItemNecessidade[],
  atencao: ItemNecessidade[],
  sugestao: string | null
): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const linhas: string[] = [
    `💙 *Casa da Criança — Lista de Necessidades*`,
    `📅 ${hoje}`,
    '',
  ];

  if (urgentes.length > 0) {
    linhas.push('🚨 *Urgente (acabaram ou vão vencer logo):*');
    for (const i of urgentes) {
      const detalhe = i.total === 0 ? 'acabou' : i.motivo.toLowerCase();
      linhas.push(`  ${i.emoji} ${i.nome} (${detalhe})`);
    }
    linhas.push('');
  }

  if (atencao.length > 0) {
    linhas.push('📦 *Atenção nas próximas semanas:*');
    for (const i of atencao) {
      linhas.push(`  ${i.emoji} ${i.nome} (${i.motivo.toLowerCase()})`);
    }
    linhas.push('');
  }

  if (urgentes.length === 0 && atencao.length === 0) {
    linhas.push('✅ O estoque está bem no momento. Obrigada pelas doações anteriores!');
    linhas.push('');
  }

  if (sugestao) {
    linhas.push(`💡 *Sugestão:* ${sugestao}.`);
    linhas.push('');
  }

  linhas.push('Obrigada pelo carinho! 🤍');
  return linhas.join('\n');
}

function NecessidadeItem({ item }: { item: ItemNecessidade }) {
  const { colors } = useTheme();

  async function handleOcultar() {
    try {
      await toggleOcultarNecessidades(item.produtoId, true);
    } catch {
      Alert.alert('Erro', 'Não foi possível ocultar. Tente novamente.');
    }
  }

  return (
    <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.itemMain}
        onPress={() => router.push(`/produto/${item.produtoId}`)}
        activeOpacity={0.75}
        accessibilityLabel={`${item.nome}, ${item.motivo}`}
      >
        <View style={[styles.itemEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={styles.itemEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemNome, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={[styles.itemEstoque, { color: colors.textSecondary }]}>
            {item.total === 0 ? '⚠️ Sem estoque' : `${item.total} em estoque`}
          </Text>
          <Text
            style={[
              styles.itemMotivo,
              { color: item.risco === 'risco_alto' ? colors.riscoAltoDark : colors.riscoAtencaoDark },
            ]}
          >
            {item.motivo}
          </Text>
        </View>
        {item.total > 0 && (
          <RiskBadge risco={item.risco} diasParaVencer={item.diasPiorLote ?? undefined} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ocultarBtn}
        onPress={handleOcultar}
        hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
        accessibilityLabel={`Ocultar ${item.nome} da lista de necessidades`}
      >
        <Text style={[styles.ocultarTexto, { color: colors.textDisabled }]}>Ocultar da lista</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NecessidadesScreen() {
  const { colors } = useTheme();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(true);
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

  // Busca sugestão estratégica do K-Means em background
  useEffect(() => {
    setCarregandoSugestao(true);
    const agora = new Date();
    getEntradasMensais()
      .then((historico) =>
        agruparDoacoes(historico, agora.getMonth() + 1, agora.getFullYear())
      )
      .then((resultado) => {
        if (resultado.suficiente && resultado.descricaoMesAtual) {
          setSugestao(resultado.descricaoMesAtual);
        }
      })
      .catch(() => {})
      .finally(() => setCarregandoSugestao(false));
  }, []);

  const { urgentes, atencao } = useMemo(() => buildLista(produtos, lotes), [produtos, lotes]);
  const total = urgentes.length + atencao.length;

  async function handleWhatsApp() {
    const texto = gerarTexto(urgentes, atencao, sugestao);
    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
    const suportado = await Linking.canOpenURL(url).catch(() => false);
    if (suportado) {
      Linking.openURL(url);
    } else {
      // WhatsApp não instalado — abre compartilhamento nativo
      Share.share({ message: texto }).catch(() => {});
    }
  }

  function handleCopiar() {
    const texto = gerarTexto(urgentes, atencao, sugestao);
    Share.share({ message: texto, title: 'Lista de Necessidades — Casa da Criança' })
      .catch(() => Alert.alert('Não foi possível compartilhar', 'Verifique se o WhatsApp está instalado ou copie o texto manualmente.'));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={[styles.headerIconBg, { backgroundColor: colors.accentLight }]}>
            <Text style={styles.headerIcon}>📝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>Lista de Necessidades</Text>
            <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
              {total === 0
                ? 'Tudo em ordem no estoque!'
                : `${total} ${total === 1 ? 'produto precisa' : 'produtos precisam'} de doação`}
            </Text>
          </View>
        </View>

        {/* Sugestão estratégica (K-Means) */}
        {carregandoSugestao ? (
          <View style={[styles.sugestaoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.textDisabled} />
            <Text style={[styles.sugestaoTexto, { color: colors.textDisabled }]}>
              Analisando padrões de doação…
            </Text>
          </View>
        ) : sugestao ? (
          <View style={[styles.sugestaoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={styles.sugestaoEmoji}>💡</Text>
            <Text style={[styles.sugestaoTexto, { color: colors.primaryDark }]}>{sugestao}.</Text>
          </View>
        ) : null}

        {/* Botão WhatsApp */}
        <TouchableOpacity
          style={[styles.whatsappBtn, { opacity: total === 0 && !sugestao ? 0.6 : 1 }]}
          onPress={handleWhatsApp}
          activeOpacity={0.85}
          accessibilityLabel="Compartilhar lista no WhatsApp"
        >
          <Text style={styles.whatsappEmoji}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.whatsappTitulo}>Compartilhar no WhatsApp</Text>
            <Text style={styles.whatsappSub}>Envie a lista para grupos de doadores</Text>
          </View>
          <Text style={styles.whatsappSeta}>›</Text>
        </TouchableOpacity>

        {/* Botão Copiar (fallback) */}
        <TouchableOpacity
          style={[styles.copiarBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleCopiar}
          activeOpacity={0.8}
          accessibilityLabel="Copiar texto da lista"
        >
          <Text style={[styles.copiarTexto, { color: colors.textSecondary }]}>📋  Copiar texto</Text>
        </TouchableOpacity>

        {/* Lista vazia / carregando */}
        {carregando ? (
          <SkeletonLista n={3} />
        ) : total === 0 ? (
          <View style={[styles.vazioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.vazioEmoji}>🎉</Text>
            <Text style={[styles.vazioTitulo, { color: colors.textPrimary }]}>Estoque em dia!</Text>
            <Text style={[styles.vazioSub, { color: colors.textSecondary }]}>
              Nenhum produto precisa de doação urgente no momento.
            </Text>
          </View>
        ) : (
          <>
            {urgentes.length > 0 && (
              <View style={styles.secao}>
                <View style={styles.secaoHeaderRow}>
                  <View style={[styles.secaoDot, { backgroundColor: colors.riscoAlto }]} />
                  <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>URGENTE</Text>
                  <View style={[styles.secaoCount, { backgroundColor: colors.riscoAltoLight }]}>
                    <Text style={[styles.secaoCountTexto, { color: colors.riscoAltoDark }]}>
                      {urgentes.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.secaoDesc, { color: colors.textSecondary }]}>
                  Acabaram ou vão vencer em breve
                </Text>
                <View style={styles.lista}>
                  {urgentes.map((item) => <NecessidadeItem key={item.produtoId} item={item} />)}
                </View>
              </View>
            )}

            {atencao.length > 0 && (
              <View style={styles.secao}>
                <View style={styles.secaoHeaderRow}>
                  <View style={[styles.secaoDot, { backgroundColor: colors.riscoAtencao }]} />
                  <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>ATENÇÃO</Text>
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
                  {atencao.map((item) => <NecessidadeItem key={item.produtoId} item={item} />)}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  headerIconBg:{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerIcon:  { fontSize: 30 },
  titulo:      { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitulo:   { fontSize: 14, marginTop: 2, lineHeight: 20 },

  // Sugestão K-Means
  sugestaoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  sugestaoEmoji: { fontSize: 20 },
  sugestaoTexto: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },

  // Botão WhatsApp
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 18, marginBottom: 10,
    backgroundColor: '#25D366',
    ...Platform.select({
      ios:     { shadowColor: '#25D366', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  whatsappEmoji: { fontSize: 30 },
  whatsappTitulo:{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  whatsappSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  whatsappSeta:  { fontSize: 26, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },

  // Botão Copiar
  copiarBtn: {
    alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 28,
  },
  copiarTexto: { fontSize: 15, fontWeight: '600' },

  // Seções
  secao:         { marginBottom: 28 },
  secaoHeaderRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secaoDot:      { width: 8, height: 8, borderRadius: 4 },
  secaoTitulo:   { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, flex: 1 },
  secaoCount:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  secaoCountTexto:{ fontSize: 12, fontWeight: '700' },
  secaoDesc:     { fontSize: 14, marginBottom: 12, lineHeight: 20 },

  lista: { gap: 10 },
  itemCard: {
    borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  itemMain: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16,
  },
  itemEmojiBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemEmoji:   { fontSize: 26 },
  itemInfo:    { flex: 1, gap: 2 },
  itemNome:    { fontSize: 17, fontWeight: '700' },
  itemEstoque: { fontSize: 13 },
  itemMotivo:  { fontSize: 13, fontWeight: '700' },
  ocultarBtn:  { alignSelf: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  ocultarTexto: { fontSize: 12, textDecorationLine: 'underline' },

  // Estado vazio
  vazioCard:  { borderRadius: 20, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12, marginTop: 8 },
  vazioEmoji: { fontSize: 52 },
  vazioTitulo:{ fontSize: 22, fontWeight: '800' },
  vazioSub:   { fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
