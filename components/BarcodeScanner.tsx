import { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme';

interface Props {
  visivel: boolean;
  onScan: (ean: string) => void;
  onFechar: () => void;
}

const SCAN_W = 300;
const SCAN_H = 160;
const CORNER = 28;
const BORDA = 3;

export function BarcodeScanner({ visivel, onScan, onFechar }: Props) {
  const { colors } = useTheme();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const escaneado = useRef(false);

  function aoAbrir() {
    escaneado.current = false;
  }

  function aoScanear({ data }: { data: string }) {
    if (escaneado.current) return;
    if (!/^\d{8}$|^\d{13}$/.test(data)) return;
    escaneado.current = true;
    onScan(data);
  }

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      statusBarTranslucent
      onShow={aoAbrir}
      onRequestClose={onFechar}
    >
      {!permissao?.granted ? (
        <View style={[s.permWrap, { backgroundColor: colors.background }]}>
          <Text style={s.permEmoji}>📷</Text>
          <Text style={[s.permTitulo, { color: colors.textPrimary }]}>
            Câmera necessária
          </Text>
          <Text style={[s.permSub, { color: colors.textSecondary }]}>
            Precisamos da câmera para ler o código de barras do produto.
          </Text>
          <TouchableOpacity
            style={[s.permBtn, { backgroundColor: colors.primary }]}
            onPress={pedirPermissao}
          >
            <Text style={s.permBtnTexto}>Permitir câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFechar} style={{ marginTop: 16 }}>
            <Text style={[s.cancelar, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
            onBarcodeScanned={aoScanear}
          />

          {/* Overlay escuro com abertura */}
          <View style={s.overlayTop} />
          <View style={s.overlayMeio}>
            <View style={s.overlayLado} />

            {/* Área de leitura */}
            <View style={s.areaLeitura}>
              {/* Cantos */}
              <View style={[s.canto, s.cantoSuperiorEsq, { borderColor: '#FFF' }]} />
              <View style={[s.canto, s.cantoSuperiorDir, { borderColor: '#FFF' }]} />
              <View style={[s.canto, s.cantoInferiorEsq, { borderColor: '#FFF' }]} />
              <View style={[s.canto, s.cantoInferiorDir, { borderColor: '#FFF' }]} />
            </View>

            <View style={s.overlayLado} />
          </View>
          <View style={s.overlayBottom}>
            <Text style={s.instrucao}>Aponte para o código de barras do produto</Text>
          </View>

          {/* Botão fechar */}
          <TouchableOpacity style={s.fecharBtn} onPress={onFechar}>
            <Text style={s.fecharTexto}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.60)';

const s = StyleSheet.create({
  // Permissão
  permWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  permEmoji: { fontSize: 48 },
  permTitulo: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  permSub: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  permBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permBtnTexto: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cancelar: { fontSize: 16 },

  // Overlay
  overlayTop: {
    width: '100%',
    backgroundColor: OVERLAY_COLOR,
    flex: 1,
  },
  overlayMeio: {
    flexDirection: 'row',
    height: SCAN_H,
  },
  overlayLado: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayBottom: {
    width: '100%',
    backgroundColor: OVERLAY_COLOR,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
  },

  // Área de leitura
  areaLeitura: {
    width: SCAN_W,
    height: SCAN_H,
  },

  // Cantos
  canto: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderWidth: BORDA,
  },
  cantoSuperiorEsq: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cantoSuperiorDir: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cantoInferiorEsq: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cantoInferiorDir: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },

  instrucao: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Fechar
  fecharBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fecharTexto: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
