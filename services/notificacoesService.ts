import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function pedirPermissao(): Promise<boolean> {
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
  await Notifications.cancelScheduledNotificationAsync(ID_RESUMO).catch(() => {});
}

export async function notificarEstoqueZerado(nomeProduto: string): Promise<void> {
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
