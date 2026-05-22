import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../theme';
import { StepIndicator } from '../../components/StepIndicator';
import { RiskBadge } from '../../components/RiskBadge';
import { Produto, Lote } from '../../services/tipos';
import { subscribeToProdutos } from '../../services/produtosService';
import { atualizarMediaConsumo } from '../../services/produtosService';
import { subscribeLotesByProduto, ajustarQuantidadeLote } from '../../services/lotesService';
import { criarMovimentacao, recalcularMediaConsumo } from '../../services/movimentacoesService';
import { diasParaVencer } from '../../services/risco';
import { notificarEstoqueZerado } from '../../services/notificacoesService';

type TipoBaixa = 'saida' | 'descarte';

const STEP_LABELS = ['Produto', 'Lote', 'Confirmar'];

function formatarData(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Passo 1: buscar produto ──────────────────────────────────────────────────

function Passo1({
  selecionado,
  produtos,
  onSelecionar,
  onAvancar,
}: {
  selecionado: Produto | null;
  produtos: Produto[];
  onSelecionar: (p: Produto | null) => void;
  onAvancar: () => void;
}) {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');

  const sugestoes = busca.trim().length > 0
    ? produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 6)
    : [];

  return (
    <View style={styles.passoWrap}>
      <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>
        Qual produto está saindo?
      </Text>
      <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
        Busque pelo nome do produto que foi usado ou descartado.
      </Text>

      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.inputIcn}>🔍</Text>
        <TextInput
          style={[styles.inputTexto, { color: colors.textPrimary }]}
          placeholder="Buscar produto…"
          placeholderTextColor={colors.textDisabled}
          value={busca}
          onChangeText={(t) => {
            setBusca(t);
            if (selecionado) onSelecionar(null);
          }}
          autoFocus
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Text style={{ fontSize: 16, color: colors.textDisabled }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {sugestoes.length > 0 && (
        <View style={[styles.autocomplete, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sugestoes.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.sugestaoItem,
                i < sugestoes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
              onPress={() => { onSelecionar(p); setBusca(''); }}
              activeOpacity={0.7}
            >
              {p.fotoUrl ? (
                <Image source={{ uri: p.fotoUrl }} style={styles.sugestaoFoto} />
              ) : (
                <Text style={styles.sugestaoEmoji}>{p.emoji}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.sugestaoNome, { color: colors.textPrimary }]}>{p.nome}</Text>
                <Text style={[styles.sugestaoSub, { color: colors.textSecondary }]}>{p.categoria}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selecionado && (
        <View style={[styles.selecionadoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          {selecionado.fotoUrl ? (
            <Image source={{ uri: selecionado.fotoUrl }} style={styles.selecionadoFoto} />
          ) : (
            <Text style={styles.selecionadoEmoji}>{selecionado.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.selecionadoNome, { color: colors.primaryDark }]}>{selecionado.nome}</Text>
            <Text style={[styles.selecionadoSub, { color: colors.primary }]}>Produto selecionado ✓</Text>
          </View>
          <TouchableOpacity onPress={() => onSelecionar(null)}>
            <Text style={[styles.trocar, { color: colors.primary }]}>Trocar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.avancarBtn, { backgroundColor: selecionado ? colors.primary : colors.surfaceSecondary }]}
        onPress={onAvancar}
        disabled={!selecionado}
        activeOpacity={0.85}
      >
        <Text style={[styles.avancarTexto, { color: selecionado ? '#FFF' : colors.textDisabled }]}>
          Continuar →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Passo 2: escolher lote e quantidade ─────────────────────────────────────

function Passo2({
  produto,
  loteSelecionado,
  quantidade,
  tipo,
  onLote,
  onQuantidade,
  onTipo,
  onAvancar,
  onVoltar,
}: {
  produto: Produto;
  loteSelecionado: Lote | null;
  quantidade: string;
  tipo: TipoBaixa;
  onLote: (l: Lote) => void;
  onQuantidade: (v: string) => void;
  onTipo: (t: TipoBaixa) => void;
  onAvancar: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();
  const [lotes, setLotes] = useState<Lote[]>([]);

  useEffect(() => {
    const unsub = subscribeLotesByProduto(produto.id, setLotes);
    return unsub;
  }, [produto.id]);

  const qtd = Number(quantidade);
  const maxQtd = loteSelecionado?.quantidade ?? 0;
  const qtdValida = qtd > 0 && qtd <= maxQtd;
  const podeAvancar = loteSelecionado !== null && qtdValida;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.passoWrap, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>
          Qual lote vai sair?
        </Text>
        <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
          Use primeiro os lotes mais antigos para evitar desperdício.
        </Text>

        {/* Produto resumo */}
        <View style={[styles.produtoResumo, { backgroundColor: colors.surfaceSecondary }]}>
          {produto.fotoUrl ? (
            <Image source={{ uri: produto.fotoUrl }} style={styles.produtoFoto} />
          ) : (
            <Text style={styles.produtoEmoji}>{produto.emoji}</Text>
          )}
          <Text style={[styles.produtoNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
        </View>

        {/* Tipo de baixa */}
        <View style={styles.campoWrap}>
          <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>Tipo de baixa *</Text>
          <View style={styles.tipoRow}>
            {([
              { valor: 'saida', emoji: '📤', label: 'Saída', sub: 'Produto foi utilizado' },
              { valor: 'descarte', emoji: '🗑️', label: 'Descarte', sub: 'Produto inutilizável' },
            ] as const).map((t) => {
              const ativo = tipo === t.valor;
              const bg = ativo
                ? t.valor === 'descarte' ? colors.riscoAltoLight : colors.primaryLight
                : colors.surface;
              const border = ativo
                ? t.valor === 'descarte' ? colors.riscoAlto : colors.primary
                : colors.border;
              const textC = ativo
                ? t.valor === 'descarte' ? colors.riscoAltoDark : colors.primaryDark
                : colors.textSecondary;
              return (
                <TouchableOpacity
                  key={t.valor}
                  style={[styles.tipoCard, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => onTipo(t.valor)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tipoEmoji}>{t.emoji}</Text>
                  <Text style={[styles.tipoLabel, { color: textC }]}>{t.label}</Text>
                  <Text style={[styles.tipoSub, { color: textC }]}>{t.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lista de lotes */}
        <View style={styles.campoWrap}>
          <View style={styles.lotesTituloRow}>
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>Lote *</Text>
            <Text style={[styles.lotesDica, { color: colors.textDisabled }]}>do mais antigo ao mais novo</Text>
          </View>

          {lotes.length === 0 ? (
            <View style={[styles.semLote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.semLoteEmoji}>📭</Text>
              <Text style={[styles.semLoteTexto, { color: colors.textSecondary }]}>
                Nenhum lote em estoque para este produto.
              </Text>
            </View>
          ) : (
            <View style={styles.lotesLista}>
              {lotes.map((lote) => {
                const ativo = loteSelecionado?.id === lote.id;
                const dias = diasParaVencer(lote.validade);
                return (
                  <TouchableOpacity
                    key={lote.id}
                    style={[
                      styles.loteItem,
                      {
                        backgroundColor: ativo ? colors.primaryLight : colors.surface,
                        borderColor: ativo ? colors.primary : colors.border,
                        borderLeftColor: ativo
                          ? colors.primary
                          : lote.risco === 'risco_alto' ? colors.riscoAlto
                          : lote.risco === 'atencao' ? colors.riscoAtencao
                          : colors.riscoSeguro,
                      },
                    ]}
                    onPress={() => { onLote(lote); onQuantidade('1'); }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.loteItemTop}>
                      <Text style={[styles.loteCodigo, { color: ativo ? colors.primaryDark : colors.textPrimary }]}>
                        {lote.codigo}
                      </Text>
                      <RiskBadge risco={lote.risco} diasParaVencer={dias} />
                    </View>
                    <View style={styles.loteItemInfo}>
                      <Text style={[styles.loteDetalhe, { color: ativo ? colors.primary : colors.textSecondary }]}>
                        📅 Val. {formatarData(lote.validade)}
                      </Text>
                      <Text style={[styles.loteDetalhe, { color: ativo ? colors.primary : colors.textSecondary }]}>
                        📦 {lote.quantidade} disponíveis
                      </Text>
                    </View>
                    {ativo && (
                      <Text style={[styles.loteSelecionadoTag, { color: colors.primary }]}>✓ Selecionado</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Quantidade */}
        {loteSelecionado && (
          <View style={styles.campoWrap}>
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
              Quantidade *{' '}
              <Text style={{ color: colors.textDisabled, fontWeight: '400' }}>
                (máx. {loteSelecionado.quantidade})
              </Text>
            </Text>
            <View style={styles.qtdRow}>
              <TouchableOpacity
                style={[styles.qtdBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => onQuantidade(String(Math.max(1, qtd - 1)))}
              >
                <Text style={[styles.qtdBtnTexto, { color: colors.textPrimary }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.qtdInput, {
                  color: qtdValida ? colors.textPrimary : colors.riscoAlto,
                  borderColor: qtdValida ? colors.border : colors.riscoAlto,
                  backgroundColor: colors.surface,
                }]}
                value={quantidade}
                onChangeText={(t) => onQuantidade(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                textAlign="center"
                maxLength={4}
              />
              <TouchableOpacity
                style={[styles.qtdBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => onQuantidade(String(Math.min(maxQtd, qtd + 1)))}
              >
                <Text style={[styles.qtdBtnTexto, { color: colors.textPrimary }]}>＋</Text>
              </TouchableOpacity>
            </View>
            {qtd > maxQtd && (
              <Text style={[styles.erroTexto, { color: colors.riscoAlto }]}>
                Quantidade maior que o disponível no lote ({maxQtd})
              </Text>
            )}
          </View>
        )}

        <View style={{ flex: 1, minHeight: 16 }} />

        <View style={styles.botoesRow}>
          <TouchableOpacity style={[styles.voltarBtn, { borderColor: colors.border }]} onPress={onVoltar}>
            <Text style={[styles.voltarTexto, { color: colors.textSecondary }]}>← Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.avancarBtnFlex, { backgroundColor: podeAvancar ? colors.primary : colors.surfaceSecondary }]}
            onPress={onAvancar}
            disabled={!podeAvancar}
            activeOpacity={0.85}
          >
            <Text style={[styles.avancarTexto, { color: podeAvancar ? '#FFF' : colors.textDisabled }]}>
              Revisar →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Passo 3: confirmação ────────────────────────────────────────────────────

function Passo3({
  produto,
  lote,
  quantidade,
  tipo,
  salvando,
  onConfirmar,
  onVoltar,
}: {
  produto: Produto;
  lote: Lote;
  quantidade: string;
  tipo: TipoBaixa;
  salvando: boolean;
  onConfirmar: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();
  const isDescarte = tipo === 'descarte';
  const badgeBg = isDescarte ? colors.riscoAltoLight : colors.primaryLight;
  const badgeTexto = isDescarte ? colors.riscoAltoDark : colors.primaryDark;

  return (
    <View style={styles.passoWrap}>
      <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>Tudo certo?</Text>
      <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
        Confirme os dados antes de registrar a {isDescarte ? 'descarte' : 'saída'}.
      </Text>

      <View style={[styles.confirmarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.confirmarHeader}>
          {produto.fotoUrl ? (
            <Image source={{ uri: produto.fotoUrl }} style={styles.confirmarFoto} />
          ) : (
            <Text style={styles.confirmarEmoji}>{produto.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.confirmarNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
            <Text style={[styles.confirmarSub, { color: colors.textSecondary }]}>Lote {lote.codigo}</Text>
          </View>
          <View style={[styles.tipoBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.tipoBadgeTexto, { color: badgeTexto }]}>
              {isDescarte ? '🗑️ Descarte' : '📤 Saída'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.confirmarLinhas}>
          <ConfirmarLinha label="Quantidade" valor={quantidade} colors={colors} />
          <ConfirmarLinha label="Validade do lote" valor={formatarData(lote.validade)} colors={colors} />
          <ConfirmarLinha label="Restará no lote" valor={String(lote.quantidade - Number(quantidade))} colors={colors} />
          <ConfirmarLinha label="Data do registro" valor={new Date().toLocaleDateString('pt-BR')} colors={colors} />
        </View>

        {isDescarte && (
          <View style={[styles.alertaDescarte, { backgroundColor: colors.riscoAltoLight, borderTopColor: colors.divider }]}>
            <Text style={[styles.alertaDescarteTex, { color: colors.riscoAltoDark }]}>
              ⚠️  Esta ação registrará o produto como descartado e não poderá ser desfeita depois.
            </Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.botoesRow}>
        <TouchableOpacity
          style={[styles.voltarBtn, { borderColor: colors.border }]}
          onPress={onVoltar}
          disabled={salvando}
        >
          <Text style={[styles.voltarTexto, { color: colors.textSecondary }]}>← Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmarBtn, { backgroundColor: salvando ? colors.surfaceSecondary : isDescarte ? colors.riscoAlto : colors.primary }]}
          onPress={onConfirmar}
          disabled={salvando}
          activeOpacity={0.85}
        >
          {salvando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.confirmarBtnTexto}>
              ✓  {isDescarte ? 'Confirmar descarte' : 'Confirmar saída'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ConfirmarLinha({ label, valor, colors }: { label: string; valor: string; colors: any }) {
  return (
    <View style={styles.confirmarLinha}>
      <Text style={[styles.confirmarKey, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.confirmarVal, { color: colors.textPrimary }]}>{valor}</Text>
    </View>
  );
}

// ── Tela de sucesso ─────────────────────────────────────────────────────────

function Sucesso({
  produto,
  quantidade,
  tipo,
  onNovo,
  onVoltar,
}: {
  produto: Produto;
  quantidade: string;
  tipo: TipoBaixa;
  onNovo: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();
  const isDescarte = tipo === 'descarte';
  const scale = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      scale.value = withSpring(1, { damping: 10, stiffness: 80 });
    }
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.sucessoWrap, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[styles.sucessoCirculo, { backgroundColor: isDescarte ? colors.riscoAltoLight : colors.riscoSeguroLight }, circleStyle]}
      >
        <Text style={styles.sucessoIcon}>{isDescarte ? '🗑️' : '✓'}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: 'center', gap: 12, width: '100%' }}>
        <Text style={[styles.sucessoTitulo, { color: colors.textPrimary }]}>
          {isDescarte ? 'Descarte registrado!' : 'Saída registrada!'}
        </Text>
        <Text style={[styles.sucessoSub, { color: colors.textSecondary }]}>
          {quantidade} de {produto.nome} {isDescarte ? 'foram descartados' : 'foram retirados'} do estoque.
        </Text>
        <TouchableOpacity
          style={[styles.novoBotao, { backgroundColor: colors.primary }]}
          onPress={onNovo}
          activeOpacity={0.85}
        >
          <Text style={styles.novoBotaoTexto}>+ Registrar outra baixa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.voltarInicioBtn} onPress={onVoltar}>
          <Text style={[styles.voltarInicioTexto, { color: colors.textSecondary }]}>Voltar para o início</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Tela principal ──────────────────────────────────────────────────────────

export default function BaixaScreen() {
  const { colors } = useTheme();
  const [passo, setPasso] = useState(0);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [tipo, setTipo] = useState<TipoBaixa>('saida');

  useEffect(() => {
    const unsub = subscribeToProdutos(setProdutos);
    return unsub;
  }, []);

  function resetar() {
    setPasso(0);
    setSucesso(false);
    setSalvando(false);
    setProduto(null);
    setLote(null);
    setQuantidade('1');
    setTipo('saida');
  }

  async function handleConfirmar() {
    if (!produto || !lote || salvando) return;
    setSalvando(true);
    try {
      const qtd = Number(quantidade);
      await ajustarQuantidadeLote(lote.id, -qtd);
      await criarMovimentacao({
        tipo,
        produtoId: produto.id,
        loteId: lote.id,
        quantidade: qtd,
      });
      // Recalcula a média de consumo com base no histórico real
      const novaMedia = await recalcularMediaConsumo(produto.id);
      if (novaMedia !== null) {
        await atualizarMediaConsumo(produto.id, novaMedia);
      }
      // Alerta imediato se este lote ficou zerado
      if (lote.quantidade - qtd <= 0) {
        notificarEstoqueZerado(produto.nome).catch(() => {});
      }
      setSucesso(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a baixa. Tente novamente.');
      setSalvando(false);
    }
  }

  if (sucesso && produto) {
    return (
      <Sucesso
        produto={produto}
        quantidade={quantidade}
        tipo={tipo}
        onNovo={resetar}
        onVoltar={() => router.replace('/')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.indicadorWrap, { borderBottomColor: colors.divider }]}>
        <StepIndicator total={3} atual={passo} labels={STEP_LABELS} />
      </View>

      <View style={styles.passoContainer}>
        {passo === 0 && (
          <Passo1
            selecionado={produto}
            produtos={produtos}
            onSelecionar={(p) => { setProduto(p); setLote(null); }}
            onAvancar={() => produto && setPasso(1)}
          />
        )}
        {passo === 1 && produto && (
          <Passo2
            produto={produto}
            loteSelecionado={lote}
            quantidade={quantidade}
            tipo={tipo}
            onLote={setLote}
            onQuantidade={setQuantidade}
            onTipo={setTipo}
            onAvancar={() => setPasso(2)}
            onVoltar={() => setPasso(0)}
          />
        )}
        {passo === 2 && produto && lote && (
          <Passo3
            produto={produto}
            lote={lote}
            quantidade={quantidade}
            tipo={tipo}
            salvando={salvando}
            onConfirmar={handleConfirmar}
            onVoltar={() => setPasso(1)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  indicadorWrap: { paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1 },
  passoContainer: { flex: 1, paddingHorizontal: 20 },
  passoWrap: { flex: 1, paddingTop: 24, paddingBottom: 16, gap: 16 },
  passoTitulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  passoSub: { fontSize: 16, lineHeight: 22, marginTop: -8 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52,
  },
  inputIcn: { fontSize: 20 },
  inputTexto: { flex: 1, fontSize: 17 },

  autocomplete: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginTop: -8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  sugestaoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sugestaoEmoji: { fontSize: 24 },
  sugestaoFoto: { width: 36, height: 36, borderRadius: 8 },
  sugestaoNome: { fontSize: 16, fontWeight: '600' },
  sugestaoSub: { fontSize: 13 },

  selecionadoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 2,
  },
  selecionadoEmoji: { fontSize: 30 },
  selecionadoFoto: { width: 40, height: 40, borderRadius: 10 },
  selecionadoNome: { fontSize: 17, fontWeight: '700' },
  selecionadoSub: { fontSize: 14, fontWeight: '600' },
  trocar: { fontSize: 14, fontWeight: '600' },

  avancarBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  avancarBtnFlex: { flex: 2, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  avancarTexto: { fontSize: 17, fontWeight: '700' },

  produtoResumo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  produtoEmoji: { fontSize: 28 },
  produtoFoto: { width: 40, height: 40, borderRadius: 10 },
  produtoNome: { fontSize: 18, fontWeight: '700' },

  campoWrap: { gap: 8 },
  campoLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  tipoRow: { flexDirection: 'row', gap: 12 },
  tipoCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 4 },
  tipoEmoji: { fontSize: 28 },
  tipoLabel: { fontSize: 16, fontWeight: '700' },
  tipoSub: { fontSize: 12, textAlign: 'center' },

  lotesTituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lotesDica: { fontSize: 12 },
  lotesLista: { gap: 10 },
  loteItem: {
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 14, gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  loteItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loteCodigo: { fontSize: 16, fontWeight: '700' },
  loteItemInfo: { flexDirection: 'row', gap: 16 },
  loteDetalhe: { fontSize: 14 },
  loteSelecionadoTag: { fontSize: 13, fontWeight: '700' },

  semLote: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  semLoteEmoji: { fontSize: 32 },
  semLoteTexto: { fontSize: 15, textAlign: 'center' },

  qtdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtdBtn: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtdBtnTexto: { fontSize: 24, fontWeight: '500', lineHeight: 28 },
  qtdInput: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, fontSize: 22, fontWeight: '700' },
  erroTexto: { fontSize: 13, fontWeight: '600' },

  botoesRow: { flexDirection: 'row', gap: 12 },
  voltarBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  voltarTexto: { fontSize: 16, fontWeight: '600' },

  confirmarCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  confirmarHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  confirmarEmoji: { fontSize: 36 },
  confirmarFoto: { width: 52, height: 52, borderRadius: 14 },
  confirmarNome: { fontSize: 19, fontWeight: '800' },
  confirmarSub: { fontSize: 14 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tipoBadgeTexto: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 20 },
  confirmarLinhas: { padding: 20, gap: 14 },
  confirmarLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmarKey: { fontSize: 15 },
  confirmarVal: { fontSize: 16, fontWeight: '700' },
  alertaDescarte: { padding: 16, borderTopWidth: 1 },
  alertaDescarteTex: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  confirmarBtn: { flex: 2, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  confirmarBtnTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  sucessoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  sucessoCirculo: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sucessoIcon: { fontSize: 48 },
  sucessoTitulo: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sucessoSub: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  novoBotao: { borderRadius: 18, paddingVertical: 18, paddingHorizontal: 32, marginTop: 8, alignSelf: 'stretch', alignItems: 'center' },
  novoBotaoTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  voltarInicioBtn: { paddingVertical: 12 },
  voltarInicioTexto: { fontSize: 16, fontWeight: '600' },
});
