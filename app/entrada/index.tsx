import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { StepIndicator } from '../../components/StepIndicator';
import { BarcodeScanner } from '../../components/BarcodeScanner';
import { Produto, NivelRisco } from '../../services/tipos';
import { subscribeToProdutos, getProdutoPorEan } from '../../services/produtosService';
import { criarLote } from '../../services/lotesService';
import { criarMovimentacao } from '../../services/movimentacoesService';
import { classificarRiscoML } from '../../services/mlService';
import { calcularRisco, diasParaVencer } from '../../services/risco';

const STEP_LABELS = ['Produto', 'Quantidade', 'Confirmar'];

// ── utilitários ─────────────────────────────────────────────────────────────

function mascararData(raw: string): string {
  const nums = raw.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

function validarData(data: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return false;
  const [d, m, y] = data.split('/').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date > new Date();
}

// ── Passo 1: escolher produto ────────────────────────────────────────────────

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
  const [scannerAberto, setScannerAberto] = useState(false);
  const [buscandoPorEan, setBuscandoPorEan] = useState(false);

  const sugestoes = busca.trim().length > 0
    ? produtos
        .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
        .slice(0, 6)
    : [];

  async function aoScanear(ean: string) {
    setScannerAberto(false);
    setBuscandoPorEan(true);
    try {
      const prod = await getProdutoPorEan(ean);
      if (prod) {
        onSelecionar(prod);
        onAvancar();
      } else {
        // Produto não cadastrado — vai para cadastro com o EAN pré-preenchido
        router.push(`/cadastro?ean=${ean}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar o produto. Tente novamente.');
    } finally {
      setBuscandoPorEan(false);
    }
  }

  return (
    <View style={styles.passoWrap}>
      <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>
        Qual produto foi doado?
      </Text>
      <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
        Digite o nome ou escaneie o código de barras.
      </Text>

      {/* Busca */}
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.inputIcn}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Buscar produto…"
          placeholderTextColor={colors.textDisabled}
          value={busca}
          onChangeText={setBusca}
          autoFocus
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Text style={{ fontSize: 16, color: colors.textDisabled }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sugestões de autocomplete */}
      {sugestoes.length > 0 && (
        <View style={[styles.autocomplete, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sugestoes.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.sugestaoItem,
                i < sugestoes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
              onPress={() => {
                onSelecionar(p);
                setBusca('');
              }}
              activeOpacity={0.7}
            >
              {p.fotoUrl ? (
                <Image source={{ uri: p.fotoUrl }} style={styles.sugestaoFoto} />
              ) : (
                <Text style={styles.sugestaoEmoji}>{p.emoji}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.sugestaoNome, { color: colors.textPrimary }]}>{p.nome}</Text>
                <Text style={[styles.sugestaoSub, { color: colors.textSecondary }]}>
                  {p.categoria}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Produto selecionado */}
      {selecionado && (
        <View style={[styles.selecionadoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          {selecionado.fotoUrl ? (
            <Image source={{ uri: selecionado.fotoUrl }} style={styles.selecionadoFoto} />
          ) : (
            <Text style={styles.selecionadoEmoji}>{selecionado.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.selecionadoNome, { color: colors.primaryDark }]}>
              {selecionado.nome}
            </Text>
            <Text style={[styles.selecionadoSub, { color: colors.primary }]}>
              Produto selecionado ✓
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSelecionar(null)}>
            <Text style={[styles.trocar, { color: colors.primary }]}>Trocar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botão escanear */}
      <TouchableOpacity
        style={[
          styles.escanearBtn,
          { borderColor: colors.border, backgroundColor: colors.surface },
          buscandoPorEan && { opacity: 0.6 },
        ]}
        onPress={() => setScannerAberto(true)}
        disabled={buscandoPorEan}
        activeOpacity={0.75}
      >
        {buscandoPorEan ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.escanearEmoji}>📷</Text>
        )}
        <Text style={[styles.escanearTexto, { color: colors.textSecondary }]}>
          {buscandoPorEan ? 'Verificando produto…' : 'Escanear código de barras'}
        </Text>
      </TouchableOpacity>

      {/* Cadastrar produto novo */}
      <TouchableOpacity
        style={styles.novoLink}
        onPress={() => router.push('/cadastro')}
      >
        <Text style={[styles.novoLinkTexto, { color: colors.primary }]}>
          + Produto não encontrado? Cadastrar novo
        </Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[
          styles.avancarBtn,
          { backgroundColor: selecionado ? colors.primary : colors.surfaceSecondary },
        ]}
        onPress={onAvancar}
        disabled={!selecionado}
        activeOpacity={0.85}
      >
        <Text style={[styles.avancarTexto, { color: selecionado ? '#FFF' : colors.textDisabled }]}>
          Continuar →
        </Text>
      </TouchableOpacity>

      <BarcodeScanner
        visivel={scannerAberto}
        onScan={aoScanear}
        onFechar={() => setScannerAberto(false)}
      />
    </View>
  );
}

// ── Passo 2: quantidade e validade ──────────────────────────────────────────

function Passo2({
  produto,
  quantidade,
  validade,
  risco,
  carregandoRisco,
  onQuantidade,
  onValidade,
  onAvancar,
  onVoltar,
}: {
  produto: Produto;
  quantidade: string;
  validade: string;
  risco: NivelRisco | null;
  carregandoRisco: boolean;
  onQuantidade: (v: string) => void;
  onValidade: (v: string) => void;
  onAvancar: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();

  const qtdValida = Number(quantidade) > 0;
  const dataValida = validarData(validade);
  const podeAvancar = qtdValida && dataValida;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.passoWrap, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>
          Quantos vieram?
        </Text>
        <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
          Informe a quantidade e a validade do produto.
        </Text>

        {/* Produto resumo */}
        <View style={[styles.produtoResumo, { backgroundColor: colors.surfaceSecondary }]}>
          {produto.fotoUrl ? (
            <Image source={{ uri: produto.fotoUrl }} style={styles.produtoResumoFoto} />
          ) : (
            <Text style={styles.produtoResumoEmoji}>{produto.emoji}</Text>
          )}
          <Text style={[styles.produtoResumoNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
        </View>

        {/* Quantidade */}
        <View style={styles.campoWrap}>
          <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
            Quantidade *
          </Text>
          <View style={styles.qtdRow}>
            <TouchableOpacity
              style={[styles.qtdBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => onQuantidade(String(Math.max(1, Number(quantidade) - 1)))}
            >
              <Text style={[styles.qtdBtnTexto, { color: colors.textPrimary }]}>−</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.qtdInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={quantidade}
              onChangeText={(t) => onQuantidade(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              textAlign="center"
              maxLength={4}
            />

            <TouchableOpacity
              style={[styles.qtdBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => onQuantidade(String(Number(quantidade) + 1))}
            >
              <Text style={[styles.qtdBtnTexto, { color: colors.textPrimary }]}>＋</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Validade */}
        <View style={styles.campoWrap}>
          <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
            Data de validade *
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: dataValida ? colors.riscoSeguro : colors.border }]}>
            <Text style={styles.inputIcn}>📅</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textDisabled}
              value={validade}
              onChangeText={(t) => onValidade(mascararData(t))}
              keyboardType="numeric"
              maxLength={10}
            />
            {dataValida && <Text style={{ fontSize: 18 }}>✅</Text>}
          </View>
          {validade.length === 10 && !dataValida && (
            <Text style={[styles.erroTexto, { color: colors.riscoAlto }]}>
              Data inválida ou já vencida
            </Text>
          )}
        </View>

        {/* Badge de risco ML */}
        {carregandoRisco && (
          <View style={[styles.riscoBanner, { backgroundColor: colors.surfaceSecondary }]}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[styles.riscoBannerTexto, { color: colors.textSecondary }]}>
              Calculando risco pela IA…
            </Text>
          </View>
        )}
        {!carregandoRisco && risco !== null && (
          <View style={[styles.riscoBanner, {
            backgroundColor: risco === 'risco_alto' ? colors.riscoAltoLight
              : risco === 'atencao' ? colors.riscoAtencaoLight
              : colors.riscoSeguroLight,
          }]}>
            <Text style={[styles.riscoBannerTexto, {
              color: risco === 'risco_alto' ? colors.riscoAltoDark
                : risco === 'atencao' ? colors.riscoAtencaoDark
                : colors.riscoSeguroDark,
            }]}>
              {risco === 'risco_alto'
                ? '🔴 Alto risco — lote pode vencer antes de ser consumido'
                : risco === 'atencao'
                ? '🟡 Atenção — monitorar este lote de perto'
                : '🟢 Validade confortável em relação ao consumo'}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View style={styles.botoesRow}>
          <TouchableOpacity
            style={[styles.voltarBtn, { borderColor: colors.border }]}
            onPress={onVoltar}
          >
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
  quantidade,
  validade,
  risco,
  salvando,
  onConfirmar,
  onVoltar,
}: {
  produto: Produto;
  quantidade: string;
  validade: string;
  risco: NivelRisco | null;
  salvando: boolean;
  onConfirmar: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.passoWrap}>
      <Text style={[styles.passoTitulo, { color: colors.textPrimary }]}>
        Tudo certo?
      </Text>
      <Text style={[styles.passoSub, { color: colors.textSecondary }]}>
        Confirme as informações antes de salvar.
      </Text>

      {/* Card de confirmação */}
      <View style={[styles.confirmarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.confirmarHeader}>
          {produto.fotoUrl ? (
            <Image source={{ uri: produto.fotoUrl }} style={styles.confirmarFoto} />
          ) : (
            <Text style={styles.confirmarEmoji}>{produto.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.confirmarNome, { color: colors.textPrimary }]}>{produto.nome}</Text>
            <Text style={[styles.confirmarSub, { color: colors.textSecondary }]}>Entrada de doação</Text>
          </View>
          <View style={[styles.entradaBadge, { backgroundColor: colors.riscoSeguroLight }]}>
            <Text style={[styles.entradaBadgeTexto, { color: colors.riscoSeguroDark }]}>📥 Entrada</Text>
          </View>
        </View>

        <View style={[styles.confirmarDivider, { backgroundColor: colors.divider }]} />

        <View style={styles.confirmarLinhas}>
          <View style={styles.confirmarLinha}>
            <Text style={[styles.confirmarKey, { color: colors.textSecondary }]}>Quantidade</Text>
            <Text style={[styles.confirmarVal, { color: colors.textPrimary }]}>
              {quantidade}
            </Text>
          </View>
          <View style={styles.confirmarLinha}>
            <Text style={[styles.confirmarKey, { color: colors.textSecondary }]}>Validade</Text>
            <Text style={[styles.confirmarVal, { color: colors.textPrimary }]}>{validade}</Text>
          </View>
          <View style={styles.confirmarLinha}>
            <Text style={[styles.confirmarKey, { color: colors.textSecondary }]}>Data do registro</Text>
            <Text style={[styles.confirmarVal, { color: colors.textPrimary }]}>
              {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
          {risco !== null && (
            <View style={styles.confirmarLinha}>
              <Text style={[styles.confirmarKey, { color: colors.textSecondary }]}>Risco</Text>
              <View style={[styles.riscoPill, {
                backgroundColor: risco === 'risco_alto' ? colors.riscoAltoLight
                  : risco === 'atencao' ? colors.riscoAtencaoLight
                  : colors.riscoSeguroLight,
              }]}>
                <Text style={[styles.riscoPillTexto, {
                  color: risco === 'risco_alto' ? colors.riscoAltoDark
                    : risco === 'atencao' ? colors.riscoAtencaoDark
                    : colors.riscoSeguroDark,
                }]}>
                  {risco === 'risco_alto' ? '🔴 Alto risco'
                    : risco === 'atencao' ? '🟡 Atenção'
                    : '🟢 Seguro'}
                </Text>
              </View>
            </View>
          )}
        </View>
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
          style={[styles.confirmarBtn, { backgroundColor: salvando ? colors.surfaceSecondary : colors.primary }]}
          onPress={onConfirmar}
          disabled={salvando}
          activeOpacity={0.85}
        >
          {salvando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.confirmarBtnTexto}>✓  Confirmar entrada</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Tela de sucesso ─────────────────────────────────────────────────────────

function Sucesso({ produto, quantidade, onNovo, onVoltar }: {
  produto: Produto;
  quantidade: string;
  onNovo: () => void;
  onVoltar: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sucessoWrap, { backgroundColor: colors.background }]}>
      <View style={[styles.sucessoCirculo, { backgroundColor: colors.riscoSeguroLight }]}>
        <Text style={styles.sucessoCheck}>✓</Text>
      </View>
      <Text style={[styles.sucessoTitulo, { color: colors.textPrimary }]}>
        Entrada registrada!
      </Text>
      <Text style={[styles.sucessoSub, { color: colors.textSecondary }]}>
        {quantidade} de {produto.nome} adicionados ao estoque.
      </Text>

      <TouchableOpacity
        style={[styles.novoBotao, { backgroundColor: colors.primary }]}
        onPress={onNovo}
        activeOpacity={0.85}
      >
        <Text style={styles.novoBotaoTexto}>+ Registrar outra entrada</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.voltarInicioBtn} onPress={onVoltar}>
        <Text style={[styles.voltarInicioTexto, { color: colors.textSecondary }]}>
          Voltar para o início
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Tela principal ──────────────────────────────────────────────────────────

export default function EntradaScreen() {
  const { colors } = useTheme();
  const [passo, setPasso] = useState(0);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [validade, setValidade] = useState('');
  const [risco, setRisco] = useState<NivelRisco | null>(null);
  const [carregandoRisco, setCarregandoRisco] = useState(false);

  useEffect(() => {
    const unsub = subscribeToProdutos(setProdutos);
    return unsub;
  }, []);

  // Classifica risco via ML sempre que validade ou quantidade mudam
  useEffect(() => {
    if (!produto || !validarData(validade) || Number(quantidade) < 1) {
      setRisco(null);
      setCarregandoRisco(false);
      return;
    }
    setCarregandoRisco(true);
    const ctrl = { cancelado: false };
    const [d, m, y] = validade.split('/');
    const validadeISO = `${y}-${m}-${d}`;
    const dias = diasParaVencer(validadeISO);
    classificarRiscoML(dias, produto.mediaConsumoDias, Number(quantidade))
      .then((r) => { if (!ctrl.cancelado) { setRisco(r); setCarregandoRisco(false); } })
      .catch(() => {
        if (!ctrl.cancelado) {
          setRisco(calcularRisco(validadeISO));
          setCarregandoRisco(false);
        }
      });
    return () => { ctrl.cancelado = true; };
  }, [produto, validade, quantidade]);

  function resetar() {
    setPasso(0);
    setSucesso(false);
    setSalvando(false);
    setProduto(null);
    setQuantidade('1');
    setValidade('');
    setRisco(null);
    setCarregandoRisco(false);
  }

  async function handleConfirmar() {
    if (!produto || salvando) return;
    setSalvando(true);
    try {
      const loteId = await criarLote({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        quantidade: Number(quantidade),
        validade,
        mediaConsumoDias: produto.mediaConsumoDias,
      });
      await criarMovimentacao({
        tipo: 'entrada',
        produtoId: produto.id,
        loteId,
        quantidade: Number(quantidade),
      });
      setSucesso(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a entrada. Tente novamente.');
      setSalvando(false);
    }
  }

  if (sucesso && produto) {
    return (
      <Sucesso
        produto={produto}
        quantidade={quantidade}
        onNovo={resetar}
        onVoltar={() => router.replace('/')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Indicador de progresso */}
      <View style={[styles.indicadorWrap, { borderBottomColor: colors.divider }]}>
        <StepIndicator
          total={3}
          atual={passo}
          labels={STEP_LABELS}
        />
      </View>

      {/* Conteúdo do passo */}
      <View style={styles.passoContainer}>
        {passo === 0 && (
          <Passo1
            selecionado={produto}
            produtos={produtos}
            onSelecionar={setProduto}
            onAvancar={() => produto && setPasso(1)}
          />
        )}
        {passo === 1 && produto && (
          <Passo2
            produto={produto}
            quantidade={quantidade}
            validade={validade}
            risco={risco}
            carregandoRisco={carregandoRisco}
            onQuantidade={setQuantidade}
            onValidade={setValidade}
            onAvancar={() => setPasso(2)}
            onVoltar={() => setPasso(0)}
          />
        )}
        {passo === 2 && produto && (
          <Passo3
            produto={produto}
            quantidade={quantidade}
            validade={validade}
            risco={risco}
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

  indicadorWrap: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },

  passoContainer: { flex: 1, paddingHorizontal: 20 },

  passoWrap: { flex: 1, paddingTop: 24, paddingBottom: 16, gap: 16 },
  passoTitulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  passoSub: { fontSize: 16, lineHeight: 22, marginTop: -8 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcn: { fontSize: 20 },
  input: { flex: 1, fontSize: 17 },

  autocomplete: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  sugestaoEmoji: { fontSize: 24 },
  sugestaoFoto: { width: 36, height: 36, borderRadius: 8 },
  sugestaoNome: { fontSize: 16, fontWeight: '600' },
  sugestaoSub: { fontSize: 13 },

  selecionadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  selecionadoEmoji: { fontSize: 30 },
  selecionadoFoto: { width: 40, height: 40, borderRadius: 10 },
  selecionadoNome: { fontSize: 17, fontWeight: '700' },
  selecionadoSub: { fontSize: 14, fontWeight: '600' },
  trocar: { fontSize: 14, fontWeight: '600' },

  escanearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    justifyContent: 'center',
  },
  escanearEmoji: { fontSize: 22 },
  escanearTexto: { fontSize: 16, fontWeight: '600' },

  novoLink: { alignItems: 'center', paddingVertical: 4 },
  novoLinkTexto: { fontSize: 14, fontWeight: '600' },

  produtoResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  produtoResumoEmoji: { fontSize: 28 },
  produtoResumoFoto: { width: 40, height: 40, borderRadius: 10 },
  produtoResumoNome: { fontSize: 18, fontWeight: '700' },

  campoWrap: { gap: 8 },
  campoLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  erroTexto: { fontSize: 13, fontWeight: '600' },

  qtdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtdBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtdBtnTexto: { fontSize: 24, fontWeight: '500', lineHeight: 28 },
  qtdInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 22,
    fontWeight: '700',
  },


  botoesRow: { flexDirection: 'row', gap: 12 },
  voltarBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  voltarTexto: { fontSize: 16, fontWeight: '600' },
  avancarBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  avancarBtnFlex: {
    flex: 2,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  avancarTexto: { fontSize: 17, fontWeight: '700' },

  confirmarCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  confirmarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
  },
  confirmarEmoji: { fontSize: 36 },
  confirmarFoto: { width: 52, height: 52, borderRadius: 14 },
  confirmarNome: { fontSize: 19, fontWeight: '800' },
  confirmarSub: { fontSize: 14 },
  entradaBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  entradaBadgeTexto: { fontSize: 13, fontWeight: '700' },
  confirmarDivider: { height: 1, marginHorizontal: 20 },
  confirmarLinhas: { padding: 20, gap: 14 },
  confirmarLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmarKey: { fontSize: 15 },
  confirmarVal: { fontSize: 16, fontWeight: '700' },
  confirmarBtn: {
    flex: 2,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmarBtnTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  sucessoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  sucessoCirculo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sucessoCheck: { fontSize: 52, color: '#7CB342' },
  sucessoTitulo: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sucessoSub: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  novoBotao: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  novoBotaoTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  voltarInicioBtn: { paddingVertical: 12 },
  voltarInicioTexto: { fontSize: 16, fontWeight: '600' },

  riscoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  riscoBannerTexto: { fontSize: 15, fontWeight: '600', flex: 1 },

  riscoPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riscoPillTexto: { fontSize: 14, fontWeight: '700' },
});
