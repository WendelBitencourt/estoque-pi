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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTheme } from '../../theme';
import { Categoria } from '../../data/produtos';

// ── constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS: { valor: Categoria; label: string; emoji: string }[] = [
  { valor: 'alimentos', label: 'Alimentos', emoji: '🥛' },
  { valor: 'higiene', label: 'Higiene', emoji: '🧴' },
  { valor: 'bebe', label: 'Bebê', emoji: '👶' },
  { valor: 'limpeza', label: 'Limpeza', emoji: '🫧' },
  { valor: 'vestuario', label: 'Vestuário', emoji: '👕' },
];

const UNIDADES = ['un', 'kg', 'g', 'L', 'mL', 'pct', 'cx', 'par', 'rolo'];

// ── tela ─────────────────────────────────────────────────────────────────────

export default function CadastroScreen() {
  const { colors } = useTheme();

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [unidade, setUnidade] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const podeEnviar = nome.trim().length >= 2 && categoria !== null && unidade !== null;

  function handleSalvar() {
    if (!podeEnviar) return;
    // Mock: sem persistência real nesta fase
    setSucesso(true);
  }

  // ── tela de sucesso ──────────────────────────────────────────────────────
  if (sucesso) {
    const cat = CATEGORIAS.find((c) => c.valor === categoria);
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.sucessoWrap}>
          <View style={[styles.sucessoCirculo, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.sucessoEmoji}>{cat?.emoji ?? '📦'}</Text>
          </View>
          <Text style={[styles.sucessoTitulo, { color: colors.textPrimary }]}>
            Produto cadastrado!
          </Text>
          <Text style={[styles.sucessoSub, { color: colors.textSecondary }]}>
            "{nome}" foi adicionado ao estoque.{'\n'}Agora você pode registrar entradas dele.
          </Text>

          <TouchableOpacity
            style={[styles.botaoPrimario, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/entrada')}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoPrimarioTexto}>📥  Registrar entrada agora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoSecundario, { borderColor: colors.border }]}
            onPress={() => {
              setNome('');
              setCategoria(null);
              setUnidade(null);
              setSucesso(false);
            }}
          >
            <Text style={[styles.botaoSecundarioTexto, { color: colors.textSecondary }]}>
              Cadastrar outro produto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={[styles.linkTexto, { color: colors.primary }]}>
              Voltar para o início
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── formulário ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Botão escanear */}
          <TouchableOpacity
            style={[styles.escanearCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={() =>
              Alert.alert(
                'Scanner',
                'O scanner de código de barras estará disponível na próxima fase do app.',
                [{ text: 'Entendi' }]
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.escanearEmoji}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.escanearTitulo, { color: colors.primaryDark }]}>
                Escanear código de barras
              </Text>
              <Text style={[styles.escanearSub, { color: colors.primary }]}>
                Preenche os dados automaticamente
              </Text>
            </View>
            <Text style={[styles.escanearSeta, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.separador, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <View style={[styles.sepLinha, { backgroundColor: colors.border }]} />
            <Text style={[styles.sepTexto, { color: colors.textDisabled }]}>ou preencha</Text>
            <View style={[styles.sepLinha, { backgroundColor: colors.border }]} />
          </View>

          {/* Nome */}
          <View style={styles.campoWrap}>
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
              Nome do produto *
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: nome.trim().length >= 2 ? colors.riscoSeguro : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.inputTexto, { color: colors.textPrimary }]}
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
          <View style={styles.campoWrap}>
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
              Categoria *
            </Text>
            <View style={styles.categoriaGrid}>
              {CATEGORIAS.map((cat) => {
                const ativo = categoria === cat.valor;
                return (
                  <TouchableOpacity
                    key={cat.valor}
                    style={[
                      styles.categoriaItem,
                      {
                        backgroundColor: ativo ? colors.primary : colors.surface,
                        borderColor: ativo ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategoria(cat.valor)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categoriaEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.categoriaLabel,
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

          {/* Unidade */}
          <View style={styles.campoWrap}>
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>
              Unidade de medida *
            </Text>
            <View style={styles.unidadesWrap}>
              {UNIDADES.map((u) => {
                const ativo = unidade === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unidadeChip,
                      {
                        backgroundColor: ativo ? colors.accent : colors.surface,
                        borderColor: ativo ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setUnidade(u)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.unidadeLabel,
                        { color: ativo ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {unidade && (
              <Text style={[styles.unidadeDica, { color: colors.textSecondary }]}>
                As quantidades serão registradas em <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{unidade}</Text>.
              </Text>
            )}
          </View>

          {/* Preview do produto */}
          {nome.trim().length >= 2 && categoria && unidade && (
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                PRÉVIA DO PRODUTO
              </Text>
              <View style={styles.previewConteudo}>
                <View style={[styles.previewEmojiBg, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={styles.previewEmoji}>
                    {CATEGORIAS.find((c) => c.valor === categoria)?.emoji ?? '📦'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewNome, { color: colors.textPrimary }]}>
                    {nome.trim()}
                  </Text>
                  <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                    {CATEGORIAS.find((c) => c.valor === categoria)?.label} · {unidade}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Botão salvar */}
          <TouchableOpacity
            style={[
              styles.salvarBtn,
              { backgroundColor: podeEnviar ? colors.primary : colors.surfaceSecondary },
            ]}
            onPress={handleSalvar}
            disabled={!podeEnviar}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.salvarTexto,
                { color: podeEnviar ? '#FFFFFF' : colors.textDisabled },
              ]}
            >
              Salvar produto
            </Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ── estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  },
  categoriaEmoji: { fontSize: 20 },
  categoriaLabel: { fontSize: 15, fontWeight: '600' },

  unidadesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unidadeChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
  unidadeLabel: { fontSize: 16, fontWeight: '700' },
  unidadeDica: { fontSize: 13, lineHeight: 18 },

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
  previewEmoji: { fontSize: 28 },
  previewNome: { fontSize: 18, fontWeight: '700' },
  previewSub: { fontSize: 14, marginTop: 2 },

  salvarBtn: {
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  salvarTexto: { fontSize: 18, fontWeight: '700' },

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
