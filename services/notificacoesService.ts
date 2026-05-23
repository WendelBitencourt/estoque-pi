import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface ConfigNotificacoes {
  resumoDiario: boolean;
  horaResumo: number; // 0-23
  alertaEstoqueZerado: boolean;
}

const DEFAULTS: ConfigNotificacoes = {
  resumoDiario: false,
  horaResumo: 8,
  alertaEstoqueZerado: true,
};

const STORAGE_KEY = '@notif_config_v1';
const ID_RESUMO = 'resumo-diario';

// Notificações não funcionam no Expo Go — retorna stubs silenciosos
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

async function getNotifications() {
  if (isExpoGo) return null;
  return import('expo-notifications');
}

export async function pedirPermissao(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('estoque', {
      name: 'Estoque Casa da Criança',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function carregarConfig(): Promise<ConfigNotificacoes> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function salvarConfig(config: ConfigNotificacoes): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function agendarResumoDiario(hora: number): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(ID_RESUMO).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_RESUMO,
    content: {
      title: 'Bom dia! Resumo do Estoque',
      body: 'Toque para ver o estado atual do estoque da Casa da Criança.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hora,
      minute: 0,
    },
  });
}

export async function cancelarResumoDiario(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(ID_RESUMO).catch(() => {});
}

export async function notificarEstoqueZerado(nomeProduto: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const config = await carregarConfig();
  if (!config.alertaEstoqueZerado) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Estoque zerado',
      body: `${nomeProduto} chegou a zero unidades. Adicione à lista de necessidades.`,
      sound: true,
    },
    trigger: null,
  });
}
