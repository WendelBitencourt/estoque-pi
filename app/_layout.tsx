import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { ThemeProvider, useTheme } from '../theme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OfflineBar } from '../components/OfflineBar';
import { getLotesSemRisco, atualizarRiscoLote } from '../services/lotesService';
import { getProdutoById } from '../services/produtosService';
import { classificarRiscoML } from '../services/mlService';
import { diasParaVencer } from '../services/risco';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

if (!isExpoGo) {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Roda em background e reclassifica lotes que foram salvos sem `risco`
 * (criados enquanto o app estava sem internet).
 * Dispara ao montar (se já online) e toda vez que a conexão for restaurada.
 */
function ReclassificadorOffline() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let emExecucao = false;

    async function reclassificar() {
      if (emExecucao) return;
      emExecucao = true;
      try {
        const estado = await NetInfo.fetch();
        if (!estado.isConnected || !estado.isInternetReachable) return;

        const pendentes = await getLotesSemRisco();
        for (const lote of pendentes) {
          try {
            const produto = await getProdutoById(lote.produtoId);
            if (!produto) continue;
            const dias = diasParaVencer(lote.validade);
            const risco = await classificarRiscoML(dias, produto.mediaConsumoDias, lote.quantidade);
            await atualizarRiscoLote(lote.id, risco);
          } catch {
            // Ignora erros individuais — tenta de novo na próxima chamada
          }
        }
      } finally {
        emExecucao = false;
      }
    }

    // Tenta ao montar (cobre lotes pendentes de sessões anteriores offline)
    reclassificar();

    // Re-tenta sempre que a conectividade for restaurada
    const unsubNetInfo = NetInfo.addEventListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable) reclassificar();
    });

    return () => unsubNetInfo();
  }, [user]);

  return null;
}

function AuthGate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) router.replace('/login');
    else if (user && inLogin) router.replace('/');
  }, [user, loading, segments]);

  return null;
}

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGate />
      <ReclassificadorOffline />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="produto/[id]"
          options={{
            headerShown: true,
            title: 'Detalhes do Produto',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="entrada/index"
          options={{
            headerShown: true,
            title: 'Registrar Entrada',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="cadastro/index"
          options={{
            headerShown: true,
            title: 'Novo Produto',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="baixa/index"
          options={{
            headerShown: true,
            title: 'Registrar Saída',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="necessidades/index"
          options={{
            headerShown: true,
            title: 'Lista de Necessidades',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
          }}
        />
      </Stack>
      <OfflineBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
