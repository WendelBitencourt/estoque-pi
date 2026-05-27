import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface ConfigNotificacoes {
  resumoDiario: boolean;
  horaResumo: number; // 0-23
  minutoResumo: number; // 0-59
  alertaEstoqueZerado: boolean;
}

const DEFAULTS: ConfigNotificacoes = {
  resumoDiario: false,
  horaResumo: 8,
  minutoResumo: 0,
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

export async function agendarResumoDiario(hora: number, minuto: number = 0): Promise<void> {
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
      minute: minuto,
    },
  });
}

export async function cancelarResumoDiario(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(ID_RESUMO).catch(() => {});
}

export async function notificarEstoqueZerado(
  nomeProduto: string,
  produtoEsgotado: boolean,
  codigoLote?: string
): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const config = await carregarConfig();
  if (!config.alertaEstoqueZerado) return;
  const content = produtoEsgotado
    ? {
        title: 'Produto esgotado',
        body: `${nomeProduto} chegou a zero unidades no estoque. Adicione à lista de necessidades.`,
      }
    : {
        title: 'Lote esgotado',
        body: codigoLote
          ? `O lote ${codigoLote} de ${nomeProduto} chegou a zero. Ainda há estoque em outros lotes.`
          : `Um lote de ${nomeProduto} chegou a zero. Ainda há estoque em outros lotes.`,
      };
  await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: true },
    trigger: null,
  });
}
