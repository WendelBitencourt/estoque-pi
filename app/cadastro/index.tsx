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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mensagemErro } from '../../utils/erros';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { Categoria } from '../../services/tipos';
import * as ImagePicker from 'expo-image-picker';
import { buscarPorEan } from '../../services/barcode';
import { criarProduto } from '../../services/produtosService';
import { uploadFoto } from '../../services/storageService';
import { BarcodeScanner } from '../../components/BarcodeScanner';

// ── constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS: { valor: Categoria; label: string; emoji: string }[] = [
  { valor: 'alimentos', label: 'Alimentos', emoji: '🥛' },
  { valor: 'higiene', label: 'Higiene', emoji: '🧴' },
  { valor: 'limpeza', label: 'Limpeza', emoji: '🫧' },
];

// ── tela ─────────────────────────────────────────────────────────────────────

export default function CadastroScreen() {
  const { colors } = useTheme();
  const { ean: eanParam } = useLocalSearchParams<{ ean?: string }>();

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [ean, setEan] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoComErro, setFotoComErro] = useState(false);
  const [fonteDados, setFonteDados] = useState<'cosmos' | 'openfoodfacts' | 'cache' | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [scannerAberto, setScannerAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [promptNaoEncontrado, setPromptNaoEncontrado] = useState(false);

  const podeEnviar = nome.trim().length >= 2 && categoria !== null;

  // Auto-preenche quando a tela abre com ?ean= (vindo da tela de entrada)
  useEffect(() => {
    if (!eanParam) return;
    const codigo = String(eanParam);
    setEan(codigo);
    setBuscando(true);
    buscarPorEan(codigo).then((resultado) => {
      setBuscando(false);
      if (resultado.status !== 'encontrado') return;
      setNome(resultado.dados.nome);
      setCategoria(resultado.dados.categoria);

      if (resultado.dados.conteudo) setConteudo(resultado.dados.conteudo);
      setFotoUrl(resultado.dados.fotoUrl);
      setFotoComErro(false);
      setFonteDados(resultado.dados.fonte);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── lógica do scanner ────────────────────────────────────────────────────

  async function aoEscanear(codigoEan: string) {
    setScannerAberto(false);
    setBuscando(true);
    setEan(codigoEan);

    const resultado = await buscarPorEan(codigoEan);
    setBuscando(false);

    if (resultado.status === 'encontrado') {
      setNome(resultado.dados.nome);
      setCategoria(resultado.dados.categoria);

      if (resultado.dados.conteudo) setConteudo(resultado.dados.conteudo);
      setFotoUrl(resultado.dados.fotoUrl);
      setFotoComErro(false);
      setFonteDados(resultado.dados.fonte);
      return;
    }

    if (resultado.status === 'nao_encontrado') {
      setPromptNaoEncontrado(true);
      return;
    }

    const mensagens: Record<'limite_excedido' | 'sem_internet', string> = {
      limite_excedido:
        'O serviço de consulta atingiu o limite de hoje.\nPreencha o nome e a categoria manualmente.',
      sem_internet:
        'Sem conexão com a internet.\nPreencha o nome e a categoria manualmente.',
    };

    Alert.alert('Produto não identificado', mensagens[resultado.status], [
      { text: 'Ok' },
    ]);
  }

  async function handleTirarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar a galeria para escolher uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setEnviandoFoto(true);
    try {
      const url = await uploadFoto(uri);
      setFotoUrl(url);
      setFotoComErro(false);
      setFonteDados(null);
    } catch (e) {
      Alert.alert('Foto não enviada', mensagemErro(e, 'Não foi possível enviar a foto. Verifique a conexão e tente novamente.'));
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleAbrirCamera() {
    setPromptNaoEncontrado(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar a câmera para tirar uma foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setEnviandoFoto(true);
    try {
      const url = await uploadFoto(uri);
      setFotoUrl(url);
      setFotoComErro(false);
      setFonteDados(null);
    } catch (e) {
      Alert.alert('Foto não enviada', mensagemErro(e, 'Não foi possível enviar a foto. Verifique a conexão e tente novamente.'));
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSalvar() {
    if (!podeEnviar || salvando) return;
    setSalvando(true);
    try {
      const cat = CATEGORIAS.find((c) => c.valor === categoria)!;
      await criarProduto({
        nome: nome.trim(),
        categoria: categoria!,
        emoji: cat.emoji,
        ean: ean ?? undefined,
        fotoUrl: fotoUrl ?? undefined,
        conteudo: conteudo.trim() || undefined,
      });
      setSucesso(true);
    } catch {
      Alert.alert('Produto não salvo', 'Não foi possível salvar o cadastro. Verifique a conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  // ── tela de sucesso ──────────────────────────────────────────────────────
  if (sucesso) {
    const cat = CATEGORIAS.find((c) => c.valor === categoria);
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.sucessoWrap}>
          <View style={[s.sucessoCirculo, { backgroundColor: colors.primaryLight }]}>
            <Text style={s.sucessoEmoji}>{cat?.emoji ?? '📦'}</Text>
          </View>
          <Text style={[s.sucessoTitulo, { color: colors.textPrimary }]}>
            Produto cadastrado!
          </Text>
          <Text style={[s.sucessoSub, { color: colors.textSecondary }]}>
            "{nome}" foi adicionado ao estoque.{'\n'}Agora você pode registrar entradas dele.
          </Text>

          <TouchableOpacity
            style={[s.botaoPrimario, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/entrada')}
            activeOpacity={0.85}
          >
            <Text style={s.botaoPrimarioTexto}>📥  Registrar entrada agora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.botaoSecundario, { borderColor: colors.border }]}
            onPress={() => {
              setNome('');
              setCategoria(null);
              setEan(null);
              setConteudo('');
              setFotoUrl(null);
              setFotoComErro(false);
              setFonteDados(null);
              setSucesso(false);
            }}
          >
            <Text style={[s.botaoSecundarioTexto, { color: colors.textSecondary }]}>
              Cadastrar outro produto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Voltar para o início"
          >
            <Text style={[s.linkTexto, { color: colors.primary }]}>
              Voltar para o início
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── formulário ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Botão escanear */}
          <TouchableOpacity
            style={[s.escanearCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={() => setScannerAberto(true)}
            activeOpacity={0.8}
            disabled={buscando}
          >
            <Text style={s.escanearEmoji}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.escanearTitulo, { color: colors.primaryDark }]}>
                Escanear código de barras
              </Text>
              <Text style={[s.escanearSub, { color: colors.primary }]}>
                Preenche os dados automaticamente
              </Text>
            </View>
            {buscando ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[s.escanearSeta, { color: colors.primary }]}>›</Text>
            )}
          </TouchableOpacity>

          {/* Campo de foto — aparece após escaneamento */}
          {fotoUrl !== null && (
            <View style={s.campoWrap}>
              <Text style={[s.campoLabel, { color: colors.textSecondary }]}>
                Foto do produto
              </Text>
              <View style={[s.fotoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {fotoComErro ? (
                  <View style={[s.fotoFallback, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={s.fotoFallbackEmoji}>
                      {CATEGORIAS.find((c) => c.valor === categoria)?.emoji ?? '📦'}
                    </Text>
                    <Text style={[s.fotoFallbackTexto, { color: colors.textDisabled }]}>
                      Foto indisponível
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: fotoUrl }}
                    style={s.fotoImagem}
                    resizeMode="contain"
                    onError={() => setFotoComErro(true)}
                  />
                )}
                {fonteDados && !fotoComErro && (
                  <View style={[s.fonteBadge, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[s.fonteTexto, { color: colors.textDisabled }]}>
                      {fonteDados === 'cosmos'
                        ? 'via Cosmos'
                        : fonteDados === 'openfoodfacts'
                        ? 'via Open Food Facts'
                        : 'do estoque'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Botão adicionar foto manual */}
          <TouchableOpacity
            style={[s.fotoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleTirarFoto}
            activeOpacity={0.8}
            disabled={enviandoFoto}
          >
            <Text style={s.escanearEmoji}>🖼️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.escanearTitulo, { color: colors.textPrimary }]}>
                {fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
              </Text>
              <Text style={[s.escanearSub, { color: colors.textSecondary }]}>
                Escolher da galeria
              </Text>
            </View>
            {enviandoFoto ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[s.escanearSeta, { color: colors.textSecondary }]}>›</Text>
            )}
          </TouchableOpacity>

          <View style={[s.separador, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <View style={[s.sepLinha, { backgroundColor: colors.border }]} />
            <Text style={[s.sepTexto, { color: colors.textDisabled }]}>ou preencha</Text>
            <View style={[s.sepLinha, { backgroundColor: colors.border }]} />
          </View>

          {/* Nome */}
          <View style={s.campoWrap}>
            <Text style={[s.campoLabel, { color: colors.textSecondary }]}>
              Nome do produto *
            </Text>
            <View
              style={[
                s.inputWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: nome.trim().length >= 2 ? colors.riscoSeguro : colors.border,
                },
              ]}
            >
              <TextInput
                style={[s.inputTexto, { color: colors.textPrimary }]}
                placeholder="Ex: Arroz, Sabonete, Fralda…"
                placeholderTextColor={colors.textDisabled}
                value={nome}
                onChangeText={setNome}
                maxLength={60}
                returnKeyType="done"
              />
              {nome.trim().length >= 2 && <Text style={{ fontSize: 18 }}>✅</Text>}
            </View>
          </View>

          {/* Categoria */}
          <View style={s.campoWrap}>
            <Text style={[s.campoLabel, { color: colors.textSecondary }]}>
              Categoria *
            </Text>
            <View style={s.categoriaGrid}>
              {CATEGORIAS.map((cat) => {
                const ativo = categoria === cat.valor;
                return (
                  <TouchableOpacity
                    key={cat.valor}
                    style={[
                      s.categoriaItem,
                      {
                        backgroundColor: ativo ? colors.primary : colors.surface,
                        borderColor: ativo ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategoria(cat.valor)}
                    activeOpacity={0.75}
                    accessibilityLabel={`Categoria: ${cat.label}${ativo ? ', selecionada' : ''}`}
                  >
                    <Text style={s.categoriaEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        s.categoriaLabel,
                        { color: ativo ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Conteúdo por embalagem */}
          <View style={s.campoWrap}>
            <Text style={[s.campoLabel, { color: colors.textSecondary }]}>
              Conteúdo por embalagem
            </Text>
            <View
              style={[
                s.inputWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[s.inputTexto, { color: colors.textPrimary }]}
                placeholder="Ex: 500g, 1L, 250mL…"
                placeholderTextColor={colors.textDisabled}
                value={conteudo}
                onChangeText={setConteudo}
                maxLength={30}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Preview do produto */}
          {nome.trim().length >= 2 && categoria && (
            <View style={[s.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.previewLabel, { color: colors.textSecondary }]}>
                PRÉVIA DO PRODUTO
              </Text>
              <View style={s.previewConteudo}>
                <View style={[s.previewEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
                  {fotoUrl && !fotoComErro ? (
                    <Image
                      source={{ uri: fotoUrl }}
                      style={s.previewFoto}
                      onError={() => setFotoComErro(true)}
                    />
                  ) : (
                    <Text style={s.previewEmoji}>
                      {CATEGORIAS.find((c) => c.valor === categoria)?.emoji ?? '📦'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.previewNome, { color: colors.textPrimary }]}>
                    {nome.trim()}
                  </Text>
                  <Text style={[s.previewSub, { color: colors.textSecondary }]}>
                    {CATEGORIAS.find((c) => c.valor === categoria)?.label}
                    {conteudo ? ` · ${conteudo}` : ''}
                    {ean ? ` · EAN ${ean}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Botão salvar */}
          <TouchableOpacity
            style={[
              s.salvarBtn,
              { backgroundColor: podeEnviar && !salvando ? colors.primary : colors.surfaceSecondary },
            ]}
            onPress={handleSalvar}
            disabled={!podeEnviar || buscando || salvando}
            activeOpacity={0.85}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  s.salvarTexto,
                  { color: podeEnviar ? '#FFFFFF' : colors.textDisabled },
                ]}
              >
                Salvar produto
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: produto não encontrado */}
      <Modal
        visible={promptNaoEncontrado}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptNaoEncontrado(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>📦</Text>
            <Text style={[s.modalTitulo, { color: colors.textPrimary }]}>
              Produto não encontrado
            </Text>
            <Text style={[s.modalTexto, { color: colors.textSecondary }]}>
              Este código de barras não está nas nossas bases de dados.{'\n'}
              Tire uma foto do produto e preencha o nome e a categoria manualmente.
            </Text>
            <TouchableOpacity
              style={[s.modalBtnPrimario, { backgroundColor: colors.primary }]}
              onPress={handleAbrirCamera}
              activeOpacity={0.85}
            >
              <Text style={s.modalBtnPrimarioTexto}>📷  Tirar foto agora</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtnSecundario, { borderColor: colors.border }]}
              onPress={() => setPromptNaoEncontrado(false)}
              activeOpacity={0.75}
            >
              <Text style={[s.modalBtnSecundarioTexto, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal do scanner */}
      <BarcodeScanner
        visivel={scannerAberto}
        onScan={aoEscanear}
        onFechar={() => setScannerAberto(false)}
      />
    </SafeAreaView>
  );
}

// ── estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  escanearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  escanearEmoji: { fontSize: 32 },
  escanearTitulo: { fontSize: 16, fontWeight: '700' },
  escanearSub: { fontSize: 13, marginTop: 2 },
  escanearSeta: { fontSize: 26, fontWeight: '300' },

  fotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
  },
  separador: { marginVertical: 20 },
  sepLinha: { flex: 1, height: 1 },
  sepTexto: { fontSize: 13, fontWeight: '600' },

  campoWrap: { gap: 10, marginBottom: 24 },
  campoLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 54,
  },
  inputTexto: { flex: 1, fontSize: 17 },

  categoriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  categoriaEmoji: { fontSize: 20 },
  categoriaLabel: { fontSize: 15, fontWeight: '600' },

  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  previewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  previewConteudo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  previewEmojiBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  fotoImagem: {
    width: '100%',
    height: 200,
  },
  fotoFallback: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fotoFallbackEmoji: { fontSize: 52 },
  fotoFallbackTexto: { fontSize: 14 },
  fonteBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 10,
  },
  fonteTexto: { fontSize: 12, fontWeight: '600' },

  previewFoto: { width: 52, height: 52, borderRadius: 14 },
  previewEmoji: { fontSize: 28 },
  previewNome: { fontSize: 18, fontWeight: '700' },
  previewSub: { fontSize: 14, marginTop: 2 },

  salvarBtn: {
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  salvarTexto: { fontSize: 18, fontWeight: '700' },

  // modal produto não encontrado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  modalEmoji: { fontSize: 52, marginBottom: 4 },
  modalTitulo: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modalTexto: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modalBtnPrimario: {
    borderRadius: 16,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnPrimarioTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  modalBtnSecundario: {
    borderRadius: 16,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnSecundarioTexto: { fontSize: 16, fontWeight: '600' },

  // sucesso
  sucessoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  sucessoCirculo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sucessoEmoji: { fontSize: 50 },
  sucessoTitulo: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sucessoSub: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  botaoPrimario: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  botaoPrimarioTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  botaoSecundario: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
  },
  botaoSecundarioTexto: { fontSize: 16, fontWeight: '600' },
  linkTexto: { fontSize: 15, fontWeight: '600', paddingVertical: 8 },
});
