import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import {
  CategoriaItem,
  CATEGORIAS_PADRAO,
  subscribeCategorias,
  salvarCategorias,
  gerarSlug,
} from '../../services/categoriasService';
import { mensagemErro } from '../../utils/erros';

const EMOJIS_SUGERIDOS = ['📦', '👕', '👟', '🏠', '🎒', '🧸', '📚', '🍼', '🌿', '💊'];

export default function CategoriasScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [categorias, setCategorias] = useState<CategoriaItem[]>(CATEGORIAS_PADRAO);
  const [salvando, setSalvando] = useState(false);

  const [adicionando, setAdicionando] = useState(false);
  const [novoLabel, setNovoLabel] = useState('');
  const [novoEmoji, setNovoEmoji] = useState('📦');

  useEffect(() => {
    return subscribeCategorias(setCategorias);
  }, []);

  async function handleRemover(id: string) {
    const cat = categorias.find((c) => c.id === id);
    if (!cat || cat.padrao) return;

    Alert.alert(
      `Remover "${cat.label}"?`,
      'Produtos já cadastrados nessa categoria não são afetados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const nova = categorias.filter((c) => c.id !== id);
            try {
              setSalvando(true);
              await salvarCategorias(nova);
            } catch (e) {
              Alert.alert('Erro', mensagemErro(e, 'Não foi possível remover a categoria.'));
            } finally {
              setSalvando(false);
            }
          },
        },
      ]
    );
  }

  async function handleAdicionar() {
    const label = novoLabel.trim();
    if (label.length < 2) {
      Alert.alert('Nome inválido', 'O nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    const id = gerarSlug(label);
    if (categorias.some((c) => c.id === id)) {
      Alert.alert('Já existe', 'Já existe uma categoria com esse nome.');
      return;
    }
    const nova: CategoriaItem = { id, label, emoji: novoEmoji };
    const lista = [...categorias, nova];
    try {
      setSalvando(true);
      await salvarCategorias(lista);
      setNovoLabel('');
      setNovoEmoji('📦');
      setAdicionando(false);
    } catch (e) {
      Alert.alert('Erro', mensagemErro(e, 'Não foi possível salvar a categoria.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Cabeçalho */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.voltarBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Voltar"
        >
          <Text style={[styles.voltarTexto, { color: colors.primary }]}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Categorias</Text>
        {salvando ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loadingRight} />
        ) : (
          <View style={styles.loadingRight} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Lista de categorias */}
        <View style={[styles.cartao, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {categorias.map((cat, index) => (
            <View
              key={cat.id}
              style={[
                styles.itemRow,
                { borderBottomColor: colors.divider },
                index === categorias.length - 1 && styles.itemRowLast,
              ]}
            >
              <Text style={styles.itemEmoji}>{cat.emoji}</Text>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
              {cat.padrao ? (
                <Text style={[styles.itemPadrao, { color: colors.textDisabled }]}>padrão</Text>
              ) : (
                <TouchableOpacity
                  onPress={() => handleRemover(cat.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Remover categoria ${cat.label}`}
                >
                  <Text style={[styles.removerTexto, { color: colors.riscoAlto }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Formulário de nova categoria */}
        {adicionando ? (
          <View style={[styles.cartao, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitulo, { color: colors.textSecondary }]}>NOVA CATEGORIA</Text>

            {/* Seletor de emoji */}
            <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>Emoji</Text>
            <View style={styles.emojiRow}>
              {EMOJIS_SUGERIDOS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiChip,
                    {
                      backgroundColor: novoEmoji === e ? colors.primary : colors.surfaceSecondary,
                      borderColor: novoEmoji === e ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNovoEmoji(e)}
                  accessibilityLabel={`Emoji ${e}`}
                >
                  <Text style={styles.emojiChipTexto}>{e}</Text>
                </TouchableOpacity>
              ))}
              {/* Input livre para emoji personalizado */}
              <TextInput
                style={[
                  styles.emojiChip,
                  styles.emojiInput,
                  { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background },
                ]}
                value={EMOJIS_SUGERIDOS.includes(novoEmoji) ? '' : novoEmoji}
                onChangeText={(t) => { if (t) setNovoEmoji(t.slice(-2)); }}
                placeholder="✏️"
                placeholderTextColor={colors.textDisabled}
                maxLength={2}
              />
            </View>

            {/* Input de nome */}
            <Text style={[styles.campoLabel, { color: colors.textSecondary, marginTop: 14 }]}>Nome</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Ex: Roupas, Calçados, Brinquedos…"
                placeholderTextColor={colors.textDisabled}
                value={novoLabel}
                onChangeText={setNovoLabel}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleAdicionar}
              />
            </View>

            {/* Pré-visualização */}
            {novoLabel.trim().length > 0 && (
              <View style={[styles.preview, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.previewEmoji}>{novoEmoji}</Text>
                <Text style={[styles.previewLabel, { color: colors.primaryDark }]}>
                  {novoLabel.trim()}
                </Text>
              </View>
            )}

            {/* Botões */}
            <View style={styles.formBotoes}>
              <TouchableOpacity
                style={[styles.cancelarBtn, { borderColor: colors.border }]}
                onPress={() => { setAdicionando(false); setNovoLabel(''); setNovoEmoji('📦'); }}
              >
                <Text style={[styles.cancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.salvarBtn, { backgroundColor: novoLabel.trim().length < 2 ? colors.surfaceSecondary : colors.primary }]}
                onPress={handleAdicionar}
                disabled={novoLabel.trim().length < 2 || salvando}
              >
                <Text style={[styles.salvarTexto, { color: novoLabel.trim().length < 2 ? colors.textDisabled : '#FFF' }]}>
                  Adicionar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => setAdicionando(true)}
            activeOpacity={0.8}
            accessibilityLabel="Adicionar nova categoria"
          >
            <Text style={[styles.addBtnTexto, { color: colors.primary }]}>+ Adicionar categoria</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.dica, { color: colors.textDisabled }]}>
          As categorias padrão não podem ser removidas.{'\n'}
          Produtos já cadastrados não são afetados ao remover uma categoria.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  voltarBtn: { minWidth: 70 },
  voltarTexto: { fontSize: 17, fontWeight: '600' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  loadingRight: { minWidth: 70, alignItems: 'flex-end' },

  scroll: { padding: 20, gap: 16 },

  cartao: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  itemPadrao: { fontSize: 13 },
  removerTexto: { fontSize: 18, fontWeight: '700' },

  formTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1, padding: 18, paddingBottom: 12 },
  campoLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, paddingHorizontal: 18, marginBottom: 8 },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18 },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipTexto: { fontSize: 22 },
  emojiInput: { fontSize: 22 },

  inputWrap: {
    marginHorizontal: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  input: { fontSize: 16 },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 18,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  previewEmoji: { fontSize: 24 },
  previewLabel: { fontSize: 16, fontWeight: '700' },

  formBotoes: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 14 },
  cancelarBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelarTexto: { fontSize: 15, fontWeight: '600' },
  salvarBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  salvarTexto: { fontSize: 16, fontWeight: '700' },

  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addBtnTexto: { fontSize: 16, fontWeight: '700' },

  dica: { fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
});
