import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { sairDaConta, redefinirSenha } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { seedDadosHistoricos } from '../../services/seedService';
import {
  carregarConfig,
  salvarConfig,
  pedirPermissao,
  agendarResumoDiario,
  cancelarResumoDiario,
} from '../../services/notificacoesService';

// ── tipos locais ─────────────────────────────────────────────────────────────

type ThemeMode = 'auto' | 'light' | 'dark';

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatarHora = (hora: number, minuto: number) => `${pad2(hora)}:${pad2(minuto)}`;

// ── subcomponentes ────────────────────────────────────────────────────────────

function SecaoHeader({ titulo, emoji }: { titulo: string; emoji: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.secaoHeaderWrap}>
      <Text style={styles.secaoEmoji}>{emoji}</Text>
      <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>{titulo}</Text>
    </View>
  );
}

function ItemToggle({
  label,
  descricao,
  valor,
  onChange,
}: {
  label: string;
  descricao?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.itemWrap, { borderBottomColor: colors.divider }]}>
      <View style={styles.itemTextos}>
        <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{label}</Text>
        {descricao && (
          <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{descricao}</Text>
        )}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? (valor ? colors.primary : colors.surface) : undefined}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function ItemNavegacao({
  label,
  descricao,
  valorAtual,
  onPress,
  danger,
}: {
  label: string;
  descricao?: string;
  valorAtual?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.itemWrap, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={descricao ? `${label}: ${descricao}` : label}
    >
      <View style={styles.itemTextos}>
        <Text style={[styles.itemLabel, { color: danger ? colors.riscoAlto : colors.textPrimary }]}>
          {label}
        </Text>
        {descricao && (
          <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{descricao}</Text>
        )}
      </View>
      <View style={styles.itemDireita}>
        {valorAtual && (
          <Text style={[styles.itemValor, { color: colors.textSecondary }]}>{valorAtual}</Text>
        )}
        {!danger && <Text style={[styles.itemSeta, { color: colors.textDisabled }]}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cartao, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

// ── tela principal ────────────────────────────────────────────────────────────

export default function ConfiguracoesScreen() {
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [seedando, setSeedando] = useState(false);

  const isEmailUser = user?.providerData.some((p) => p.providerId === 'password') ?? false;
  const isDev = user?.uid === 'YqtgWYsO56R78dAdTcFzyIzSxgr1';

  async function handleSeedDados() {
    setSeedando(true);
    try {
      const { mesesInseridos, entradas } = await seedDadosHistoricos();
      Alert.alert(
        'Dados inseridos!',
        `${entradas} entradas históricas criadas para ${mesesInseridos} meses. Acesse a Lista de Necessidades para ver a sugestão do K-Means.`
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível inserir os dados de teste.');
    } finally {
      setSeedando(false);
    }
  }

  async function executarSaida() {
    try {
      await sairDaConta();
      router.replace('/login');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível sair da conta. Feche e reabra o app para tentar novamente.');
      } else {
        Alert.alert('Não foi possível sair', 'Feche e reabra o app para tentar novamente.');
      }
    }
  }

  function handleSair() {
    // Alert.alert com botões não funciona no web — usa window.confirm
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja mesmo sair da conta?')) {
        executarSaida();
      }
      return;
    }
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: executarSaida },
    ]);
  }

  // Notificações
  const [alertaEstoqueZerado, setAlertaEstoqueZerado] = useState(true);
  const [notifDiarias, setNotifDiarias] = useState(false);
  const [horaResumo, setHoraResumo] = useState(8);
  const [minutoResumo, setMinutoResumo] = useState(0);
  const [mostrarPicker, setMostrarPicker] = useState(false);

  useEffect(() => {
    carregarConfig().then((c) => {
      setAlertaEstoqueZerado(c.alertaEstoqueZerado);
      setNotifDiarias(c.resumoDiario);
      setHoraResumo(c.horaResumo);
      setMinutoResumo(c.minutoResumo);
    });
  }, []);

  async function handleNotifDiarias(ativar: boolean) {
    if (ativar) {
      const ok = await pedirPermissao();
      if (!ok) {
        Alert.alert(
          'Permissão negada',
          'Para receber notificações, acesse as Configurações do seu celular e habilite as notificações para este app.',
          [{ text: 'OK' }]
        );
        return;
      }
      await agendarResumoDiario(horaResumo, minutoResumo);
    } else {
      await cancelarResumoDiario();
    }
    setNotifDiarias(ativar);
    await salvarConfig({ resumoDiario: ativar, horaResumo, minutoResumo, alertaEstoqueZerado });
  }

  async function handleHorario(hora: number, minuto: number) {
    setHoraResumo(hora);
    setMinutoResumo(minuto);
    if (notifDiarias) await agendarResumoDiario(hora, minuto);
    await salvarConfig({ resumoDiario: notifDiarias, horaResumo: hora, minutoResumo: minuto, alertaEstoqueZerado });
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setMostrarPicker(false);
    if (event.type === 'dismissed' || !date) return;
    handleHorario(date.getHours(), date.getMinutes());
  }

  async function handleAlertaEstoqueZerado(ativar: boolean) {
    if (ativar) {
      const ok = await pedirPermissao();
      if (!ok) {
        Alert.alert(
          'Permissão negada',
          'Para receber alertas, acesse as Configurações do seu celular e habilite as notificações para este app.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setAlertaEstoqueZerado(ativar);
    await salvarConfig({ resumoDiario: notifDiarias, horaResumo, minutoResumo, alertaEstoqueZerado: ativar });
  }

  async function handleAlterarSenha() {
    const email = user?.email;
    if (!email) return;
    try {
      await redefinirSenha(email);
      Alert.alert(
        'E-mail enviado',
        `Um link para redefinir sua senha foi enviado para ${email}. Verifique sua caixa de entrada.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Tente novamente.', [{ text: 'OK' }]);
    }
  }

  function avisoEmBreve(funcionalidade: string) {
    Alert.alert(funcionalidade, 'Esta funcionalidade estará disponível na próxima fase do app.', [{ text: 'OK' }]);
  }

  const temaOpcoes: { valor: ThemeMode; label: string; emoji: string }[] = [
    { valor: 'auto', label: 'Automático', emoji: '🔄' },
    { valor: 'light', label: 'Claro', emoji: '☀️' },
    { valor: 'dark', label: 'Escuro', emoji: '🌙' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Título */}
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Configurações</Text>

        {/* Card de perfil */}
        <View style={[styles.perfilCard, { backgroundColor: colors.primary }]}>
          <View style={styles.perfilAvatar}>
            <Text style={styles.perfilAvatarTexto}>👩</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.perfilNome}>Voluntária</Text>
            <Text style={styles.perfilCargo}>Casa da Criança · Itapira/SP</Text>
          </View>
          <TouchableOpacity
            style={[styles.perfilEditarBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => avisoEmBreve('Editar perfil')}
          >
            <Text style={styles.perfilEditarTexto}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Notificações ── */}
        <SecaoHeader titulo="NOTIFICAÇÕES" emoji="🔔" />
        <Cartao>
          <ItemToggle
            label="Alerta de estoque zerado"
            descricao="Avisa imediatamente quando um produto chega a zero"
            valor={alertaEstoqueZerado}
            onChange={handleAlertaEstoqueZerado}
          />
          <ItemToggle
            label="Resumo diário"
            descricao="Notificação toda manhã com o resumo do estoque"
            valor={notifDiarias}
            onChange={handleNotifDiarias}
          />
          {notifDiarias && Platform.OS === 'web' && (
            <View style={[styles.seletorWrap, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.itemLabel, { color: colors.textPrimary, marginBottom: 12 }]}>
                Horário do resumo diário
              </Text>
              <input
                type="time"
                value={formatarHora(horaResumo, minutoResumo)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  if (!Number.isNaN(h) && !Number.isNaN(m)) handleHorario(h, m);
                }}
                style={{
                  fontSize: 18,
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.surfaceSecondary,
                  color: colors.textPrimary,
                }}
              />
            </View>
          )}
          {notifDiarias && Platform.OS !== 'web' && (
            <ItemNavegacao
              label="Horário do resumo diário"
              descricao="Toque para escolher a hora"
              valorAtual={formatarHora(horaResumo, minutoResumo)}
              onPress={() => setMostrarPicker(true)}
            />
          )}
          {notifDiarias && mostrarPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={new Date(2000, 0, 1, horaResumo, minutoResumo)}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickerChange}
            />
          )}
          {notifDiarias && mostrarPicker && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.seletorWrap, { borderBottomColor: colors.divider, alignItems: 'flex-end' }]}
              onPress={() => setMostrarPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemLabel, { color: colors.primary }]}>Pronto</Text>
            </TouchableOpacity>
          )}
        </Cartao>

        {/* ── Estoque ── */}
        <SecaoHeader titulo="ESTOQUE" emoji="📦" />
        <Cartao>
          <ItemNavegacao
            label="Categorias de produtos"
            descricao="Adicionar ou renomear categorias"
            onPress={() => router.push('/categorias')}
          />
        </Cartao>

        {/* ── Aparência ── */}
        <SecaoHeader titulo="APARÊNCIA" emoji="🎨" />
        <Cartao>
          <View style={[styles.seletorWrap, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.itemLabel, { color: colors.textPrimary, marginBottom: 12 }]}>
              Tema do app
            </Text>
            <View style={styles.temaOpcoes}>
              {temaOpcoes.map((op) => {
                const ativo = mode === op.valor;
                return (
                  <TouchableOpacity
                    key={op.valor}
                    style={[
                      styles.temaChip,
                      {
                        backgroundColor: ativo ? colors.primary : colors.surfaceSecondary,
                        borderColor: ativo ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setMode(op.valor)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.temaEmoji}>{op.emoji}</Text>
                    <Text style={[styles.temaLabel, { color: ativo ? '#FFF' : colors.textSecondary }]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Cartao>

        {/* ── Conta e segurança ── */}
        <SecaoHeader titulo="CONTA E SEGURANÇA" emoji="🔒" />
        <Cartao>
          {isEmailUser && (
            <ItemNavegacao
              label="Alterar senha"
              descricao="Enviaremos um link de redefinição por e-mail"
              onPress={handleAlterarSenha}
            />
          )}
          <ItemNavegacao
            label="Sair da conta"
            danger
            onPress={handleSair}
          />
        </Cartao>

        {/* ── Sobre ── */}
        <SecaoHeader titulo="SOBRE" emoji="ℹ️" />
        <Cartao>
          <ItemNavegacao
            label="Versão do app"
            valorAtual="1.0.0 (beta)"
            onPress={() => {}}
          />
          <ItemNavegacao
            label="Casa da Criança"
            descricao="Itapira/SP · desde 1985"
            onPress={() =>
              Alert.alert('Casa da Criança', 'Instituição sem fins lucrativos que acolhe crianças em Itapira/SP e vive de doações da comunidade.')
            }
          />
          <ItemNavegacao
            label="Reportar um problema"
            onPress={() => avisoEmBreve('Reportar problema')}
          />
          <ItemNavegacao
            label="Política de privacidade"
            onPress={() => avisoEmBreve('Política de privacidade')}
          />
        </Cartao>

        {/* ── Desenvolvimento (visível apenas para dev@dev.com) ── */}
        {isDev && (
          <>
            <SecaoHeader titulo="DESENVOLVIMENTO" emoji="🧪" />
            <Cartao>
              <ItemNavegacao
                label={seedando ? 'Inserindo dados…' : 'Gerar histórico para K-Means'}
                descricao="Insere 18 meses de entradas fictícias para testar a sugestão de doação"
                onPress={handleSeedDados}
              />
            </Cartao>
          </>
        )}

        {/* Rodapé */}
        <View style={styles.rodape}>
          <Text style={styles.rodapeEmoji}>🏠</Text>
          <Text style={[styles.rodapeTexto, { color: colors.textDisabled }]}>
            Casa da Criança · Controle de Estoque
          </Text>
          <Text style={[styles.rodapeTexto, { color: colors.textDisabled }]}>
            Feito com carinho para quem cuida ❤️
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  titulo: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 20,
    marginBottom: 28,
  },
  perfilAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilAvatarTexto: { fontSize: 30 },
  perfilNome: { fontSize: 19, fontWeight: '800', color: '#FFF' },
  perfilCargo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  perfilEditarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  perfilEditarTexto: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  secaoHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  secaoEmoji: { fontSize: 14 },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },

  cartao: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },

  itemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  itemTextos: { flex: 1, gap: 3 },
  itemLabel: { fontSize: 16, fontWeight: '600' },
  itemDesc: { fontSize: 13, lineHeight: 18 },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemValor: { fontSize: 15 },
  itemSeta: { fontSize: 22, fontWeight: '300' },

  seletorWrap: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  temaOpcoes: { flexDirection: 'row', gap: 10 },
  temaChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  temaEmoji: { fontSize: 22 },
  temaLabel: { fontSize: 13, fontWeight: '700' },

  rodape: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 24,
  },
  rodapeEmoji: { fontSize: 28, marginBottom: 4 },
  rodapeTexto: { fontSize: 13 },
});
