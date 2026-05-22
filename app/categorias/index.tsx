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
  const [expandida, setExpandida] = useState<string | null>(null);

  // estados para adicionar nova categoria
  const [adicionando, setAdicionando] = useState(false);
  const [novoLabel, setNovoLabel] = useState('');
  const [novoEmoji, setNovoEmoji] = useState('📦');

  // estado para adicionar palavra-chave em categoria expandida
  const [novaChave, setNovaChave] = useState('');

  useEffect(() => {
    return subscribeCategorias(setCategorias);
  }, []);

  async function salvar(lista: CategoriaItem[]) {
    try {
      setSalvando(true);
      await salvarCategorias(lista);
    } catch (e) {
      Alert.alert('Erro', mensagemErro(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemoverCategoria(id: string) {
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
          onPress: () => salvar(categorias.filter((c) => c.id !== id)),
        },
      ]
    );
  }

  async function handleAdicionarChave(catId: string) {
    const chave = novaChave.trim().toLowerCase();
    if (!chave) return;
    const lista = categorias.map((c) => {
      if (c.id !== catId) return c;
      const atual = c.palavrasChave ?? [];
      if (atual.includes(chave)) return c;
      return { ...c, palavrasChave: [...atual, chave] };
    });
    setNovaChave('');
    await salvar(lista);
  }

  async function handleRemoverChave(catId: string, chave: string) {
    const lista = categorias.map((c) => {
      if (c.id !== catId) return c;
      return { ...c, palavrasChave: (c.palavrasChave ?? []).filter((k) => k !== chave) };
    });
    await salvar(lista);
  }

  async function handleAdicionarCategoria() {
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
    await salvar([...categorias, { id, label, emoji: novoEmoji, palavrasChave: [] }]);
    setNovoLabel('');
    setNovoEmoji('📦');
    setAdicionando(false);
    setExpandida(id);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
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
          <ActivityIndicator size="small" color={colors.primary} style={styles.headerRight} />
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={[styles.cartao, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {categorias.map((cat, index) => {
            const aberta = expandida === cat.id;
            const chaves = cat.palavrasChave ?? [];
            const isLast = index === categorias.length - 1;

            return (
              <View key={cat.id}>
                {/* Linha principal */}
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    { borderBottomColor: colors.divider },
                    (!aberta && isLast) && styles.itemRowLast,
                  ]}
                  onPress={() => setExpandida(aberta ? null : cat.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${cat.label}, ${chaves.length} palavra${chaves.length !== 1 ? 's' : ''}-chave, toque para ${aberta ? 'fechar' : 'expandir'}`}
                >
                  <Text style={styles.itemEmoji}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
                    {!aberta && chaves.length > 0 && (
                      <Text style={[styles.itemDica, { color: colors.textDisabled }]} numberOfLines={1}>
                        {chaves.slice(0, 4).join(' · ')}{chaves.length > 4 ? ` +${chaves.length - 4}` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.seta, { color: colors.textDisabled }]}>
                    {aberta ? '▾' : '›'}
                  </Text>
                  {!cat.padrao && (
                    <TouchableOpacity
                      onPress={() => handleRemoverCategoria(cat.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={`Remover categoria ${cat.label}`}
                    >
                      <Text style={[styles.removerTexto, { color: colors.riscoAlto }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Painel expandido de palavras-chave */}
                {aberta && (
                  <View style={[styles.painelChaves, { backgroundColor: colors.surfaceSecondary, borderBottomColor: isLast ? 'transparent' : colors.divider }]}>
                    <Text style={[styles.chavesLabel, { color: colors.textSecondary }]}>
                      PALAVRAS-CHAVE PARA O SCANNER
                    </Text>
                    <Text style={[styles.chavesDica, { color: colors.textDisabled }]}>
                      Se o nome ou tags do produto contiverem alguma dessas palavras, esta categoria será selecionada automaticamente.
                    </Text>

                    {/* Chips das chaves existentes */}
                    {chaves.length > 0 ? (
                      <View style={styles.chavesWrap}>
                        {chaves.map((kw) => (
                          <View
                            key={kw}
                            style={[styles.chaveChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          >
                            <Text style={[styles.chaveChipTexto, { color: colors.textPrimary }]}>{kw}</Text>
                            <TouchableOpacity
                              onPress={() => handleRemoverChave(cat.id, kw)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              accessibilityLabel={`Remover palavra-chave ${kw}`}
                            >
                              <Text style={[styles.chaveChipRemover, { color: colors.textDisabled }]}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.semChaves, { color: colors.textDisabled }]}>
                        Nenhuma palavra-chave ainda.
                      </Text>
                    )}

                    {/* Input para nova palavra-chave */}
                    <View style={styles.addChaveRow}>
                      <View style={[styles.addChaveInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <TextInput
                          style={[styles.addChaveTexto, { color: colors.textPrimary }]}
                          placeholder="Nova palavra-chave…"
                          placeholderTextColor={colors.textDisabled}
                          value={novaChave}
                          onChangeText={setNovaChave}
                          autoCapitalize="none"
                          returnKeyType="done"
                          onSubmitEditing={() => handleAdicionarChave(cat.id)}
                        />
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addChaveBtn,
                          { backgroundColor: novaChave.trim() ? colors.primary : colors.surfaceSecondary },
                        ]}
                        onPress={() => handleAdicionarChave(cat.id)}
                        disabled={!novaChave.trim()}
                        accessibilityLabel="Adicionar palavra-chave"
                      >
                        <Text style={[styles.addChaveBtnTexto, { color: novaChave.trim() ? '#FFF' : colors.textDisabled }]}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Botão / formulário de nova categoria */}
        {adicionando ? (
          <View style={[styles.cartao, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitulo, { color: colors.textSecondary }]}>NOVA CATEGORIA</Text>

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
              <TextInput
                style={[styles.emojiChip, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, textAlign: 'center', fontSize: 22 }]}
                value={EMOJIS_SUGERIDOS.includes(novoEmoji) ? '' : novoEmoji}
                onChangeText={(t) => { if (t) setNovoEmoji(t.slice(-2)); }}
                placeholder="✏️"
                placeholderTextColor={colors.textDisabled}
                maxLength={2}
              />
            </View>

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
                onSubmitEditing={handleAdicionarCategoria}
              />
            </View>

            {novoLabel.trim().length > 0 && (
              <View style={[styles.preview, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 24 }}>{novoEmoji}</Text>
                <Text style={[{ fontSize: 16, fontWeight: '700' }, { color: colors.primaryDark }]}>
                  {novoLabel.trim()}
                </Text>
              </View>
            )}

            <View style={styles.formBotoes}>
              <TouchableOpacity
                style={[styles.cancelarBtn, { borderColor: colors.border }]}
                onPress={() => { setAdicionando(false); setNovoLabel(''); setNovoEmoji('📦'); }}
              >
                <Text style={[{ fontSize: 15, fontWeight: '600' }, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.salvarBtn, { backgroundColor: novoLabel.trim().length < 2 ? colors.surfaceSecondary : colors.primary }]}
                onPress={handleAdicionarCategoria}
                disabled={novoLabel.trim().length < 2 || salvando}
              >
                <Text style={[{ fontSize: 16, fontWeight: '700' }, { color: novoLabel.trim().length < 2 ? colors.textDisabled : '#FFF' }]}>
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
          Categorias padrão não podem ser removidas.{'\n'}
          Ao remover uma categoria, os produtos já cadastrados não são afetados.
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
  headerRight: { minWidth: 70, alignItems: 'flex-end' },

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
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  itemLabel: { fontSize: 16, fontWeight: '600' },
  itemDica: { fontSize: 12, marginTop: 2 },
  seta: { fontSize: 18, marginRight: 4 },
  removerTexto: { fontSize: 18, fontWeight: '700', marginLeft: 4 },

  painelChaves: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  chavesLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  chavesDica: { fontSize: 12, lineHeight: 17 },
  chavesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chaveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chaveChipTexto: { fontSize: 14 },
  chaveChipRemover: { fontSize: 13, fontWeight: '700' },
  semChaves: { fontSize: 13, fontStyle: 'italic' },

  addChaveRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addChaveInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'center',
  },
  addChaveTexto: { fontSize: 15 },
  addChaveBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChaveBtnTexto: { fontSize: 22, fontWeight: '700', lineHeight: 26 },

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

  inputWrap: {
    marginHorizontal: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
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

  formBotoes: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 14 },
  cancelarBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  salvarBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },

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
