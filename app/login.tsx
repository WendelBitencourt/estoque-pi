import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../theme';
import { loginComGoogle, loginComEmail, loginAnonimo } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  '248660348216-5msumruutuim8mgft2b6ebu2h6p7oe1d.apps.googleusercontent.com';

type Modo = 'inicial' | 'email';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [modo, setModo] = useState<Modo>('inicial');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token ?? null;
      const accessToken = response.params.access_token ?? null;
      if (idToken || accessToken) {
        handleLoginGoogle(idToken, accessToken);
      } else {
        setErro('Não foi possível obter credenciais do Google.');
      }
    } else if (response?.type === 'error') {
      setErro('Não foi possível entrar com Google. Tente novamente.');
    }
  }, [response]);

  async function handleLoginGoogle(idToken: string | null, accessToken: string | null) {
    try {
      setCarregando(true);
      setErro('');
      await loginComGoogle(idToken, accessToken);
      // AuthContext detecta o usuário e _layout redireciona para /
    } catch {
      setErro('Não foi possível entrar com Google. Feche o app e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  async function handleLoginEmail() {
    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    try {
      setCarregando(true);
      setErro('');
      await loginComEmail(email.trim(), senha);
    } catch {
      setErro('E-mail ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  }

  async function handleLoginAnonimo() {
    try {
      setCarregando(true);
      setErro('');
      await loginAnonimo();
    } catch {
      setErro('Não foi possível entrar. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.header}>
            <View style={[styles.logoWrap, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.logoEmoji}>🏠</Text>
            </View>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>
              Casa da Criança
            </Text>
            <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
              Controle de estoque · Itapira/SP
            </Text>
          </View>

          {/* ── Google ── */}
          <TouchableOpacity
            style={[
              styles.botaoGoogle,
              { borderColor: colors.border },
              (!request || carregando) && { opacity: 0.6 },
            ]}
            onPress={() => { setErro(''); promptAsync(); }}
            disabled={!request || carregando}
            activeOpacity={0.85}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={[styles.botaoGoogleTexto, { color: '#3c4043' }]}>
              Entrar com Google
            </Text>
          </TouchableOpacity>

          {/* ── Divisor ── */}
          <View style={styles.divisorRow}>
            <View style={[styles.divisorLinha, { backgroundColor: colors.border }]} />
            <Text style={[styles.divisorTexto, { color: colors.textDisabled }]}>ou</Text>
            <View style={[styles.divisorLinha, { backgroundColor: colors.border }]} />
          </View>

          {/* ── E-mail / senha ── */}
          {modo === 'inicial' ? (
            <TouchableOpacity
              style={[styles.botaoSecundario, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => { setModo('email'); setErro(''); }}
              activeOpacity={0.8}
            >
              <Text style={styles.botaoSecEmoji}>✉️</Text>
              <Text style={[styles.botaoSecTexto, { color: colors.textPrimary }]}>
                Entrar com e-mail e senha
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.emailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.campoLabel, { color: colors.textSecondary }]}>E-mail</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <Text style={[styles.campoLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                Senha
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDisabled}
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleLoginEmail}
                />
              </View>

              <View style={styles.emailBotoes}>
                <TouchableOpacity
                  style={[styles.voltarBtn, { borderColor: colors.border }]}
                  onPress={() => { setModo('inicial'); setErro(''); }}
                >
                  <Text style={[styles.voltarTexto, { color: colors.textSecondary }]}>
                    Voltar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.entrarBtn,
                    { backgroundColor: carregando ? colors.surfaceSecondary : colors.primary },
                  ]}
                  onPress={handleLoginEmail}
                  disabled={carregando}
                  activeOpacity={0.85}
                >
                  {carregando ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={styles.entrarTexto}>Entrar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── SMS (em breve) ── */}
          <TouchableOpacity
            style={[
              styles.botaoSecundario,
              { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 12 },
            ]}
            onPress={() =>
              Alert.alert(
                'Login por SMS',
                'Para usar o login por SMS é necessária uma versão instalada do app. Por enquanto use Google ou e-mail.',
                [{ text: 'OK' }]
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.botaoSecEmoji}>📱</Text>
            <Text style={[styles.botaoSecTexto, { color: colors.textPrimary }]}>
              Entrar com SMS
            </Text>
            <Text style={[styles.emBreve, { color: colors.textDisabled }]}>em breve</Text>
          </TouchableOpacity>

          {/* ── Erros ── */}
          {erro.length > 0 && (
            <View style={[styles.erroWrap, { backgroundColor: colors.riscoAltoLight }]}>
              <Text style={[styles.erroTexto, { color: colors.riscoAltoDark }]}>{erro}</Text>
            </View>
          )}

          {/* ── Loading (Google) ── */}
          {carregando && modo === 'inicial' && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingTexto, { color: colors.textSecondary }]}>
                Entrando…
              </Text>
            </View>
          )}

          {/* ── Visitante ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleLoginAnonimo}
              disabled={carregando}
              activeOpacity={0.6}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Entrar como visitante em modo demonstração"
            >
              <Text style={[styles.visitanteTexto, { color: colors.textDisabled }]}>
                Entrar como visitante · modo demonstração
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 52,
    paddingBottom: 36,
  },

  header: { alignItems: 'center', marginBottom: 44, gap: 10 },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoEmoji: { fontSize: 52 },
  titulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, textAlign: 'center' },

  botaoGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  googleG: { fontSize: 20, fontWeight: '800', color: '#4285F4' },
  botaoGoogleTexto: { fontSize: 17, fontWeight: '600' },

  divisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  divisorLinha: { flex: 1, height: 1 },
  divisorTexto: { fontSize: 14 },

  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  botaoSecEmoji: { fontSize: 20 },
  botaoSecTexto: { flex: 1, fontSize: 16, fontWeight: '600' },
  emBreve: { fontSize: 12 },

  emailCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  campoLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  input: { fontSize: 16 },
  emailBotoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  voltarBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  voltarTexto: { fontSize: 15, fontWeight: '600' },
  entrarBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  entrarTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  erroWrap: { borderRadius: 12, padding: 14, marginTop: 14 },
  erroTexto: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  loadingTexto: { fontSize: 15 },

  footer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 36,
  },
  visitanteTexto: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
