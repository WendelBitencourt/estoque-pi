import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../theme';

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
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
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
