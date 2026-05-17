import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../theme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OfflineBar } from '../components/OfflineBar';

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
