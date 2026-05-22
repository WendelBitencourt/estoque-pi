import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme';
import { Movimentacao, Produto, Lote, TipoMovimentacao } from '../../services/tipos';
import { subscribeToMovimentacoes } from '../../services/movimentacoesService';
import { subscribeToProdutos } from '../../services/produtosService';
import { subscribeAllLotesRaw } from '../../services/lotesService';

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Filtro  = 'todos' | TipoMovimentacao;
type Periodo = 'mes_atual' | 'mes_passado' | 'tres_meses';

const FILTROS: { valor: Filtro; label: string; emoji: string }[] = [
  { valor: 'todos',    label: 'Todos',     emoji: '📋' },
  { valor: 'entrada',  label: 'Entradas',  emoji: '📥' },
  { valor: 'saida',    label: 'Saídas',    emoji: '📤' },
  { valor: 'descarte', label: 'Descartes', emoji: '🗑️' },
];

const CONFIG_TIPO: Record<
  TipoMovimentacao,
  { emoji: string; label: string; cor: (c: any) => string; bgCor: (c: any) => string }
> = {
  entrada:  { emoji: '📥', label: 'Entrada',  cor: (c) => c.riscoSeguroDark, bgCor: (c) => c.riscoSeguroLight },
  saida:    { emoji: '📤', label: 'Saída',    cor: (c) => c.primaryDark,     bgCor: (c) => c.primaryLight },
  descarte: { emoji: '🗑️', label: 'Descarte', cor: (c) => c.riscoAltoDark,   bgCor: (c) => c.riscoAltoLight },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelMes(chave: string) {
  const [year, month] = chave.split('-');
  return `${MESES_PT[Number(month) - 1]} ${year}`;
}

function formatarData(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function formatarDataCompleta(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function periodoParaDatas(p: Periodo): { inicio: string; fim: string; label: string } {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();

  if (p === 'mes_atual') {
    const ini = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
    const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-31`;
    return { inicio: ini, fim, label: `${MESES_PT[mes]} ${ano}` };
  }
  if (p === 'mes_passado') {
    const d = new Date(ano, mes - 1, 1);
    const y2 = d.getFullYear(), m2 = d.getMonth();
    const ini = `${y2}-${String(m2 + 1).padStart(2, '0')}-01`;
    const fim = `${y2}-${String(m2 + 1).padStart(2, '0')}-31`;
    return { inicio: ini, fim, label: `${MESES_PT[m2]} ${y2}` };
  }
  // tres_meses
  const d3 = new Date(ano, mes - 2, 1);
  const ini = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-01`;
  const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-31`;
  return { inicio: ini, fim, label: `Últimos 3 meses` };
}

// ── Gerador de HTML para PDF ──────────────────────────────────────────────────

function gerarHTML(
  movs: Movimentacao[],
  produtoMap: Map<string, Produto>,
  loteMap: Map<string, Lote>,
  periodoLabel: string,
  tipoLabel: string
): string {
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const totEntradas  = movs.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0);
  const totSaidas    = movs.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0);
  const totDescartes = movs.filter((m) => m.tipo === 'descarte').reduce((s, m) => s + m.quantidade, 0);

  const corTipo = (tipo: TipoMovimentacao) =>
    tipo === 'entrada' ? '#15803d' : tipo === 'saida' ? '#0e7490' : '#b91c1c';
  const bgTipo = (tipo: TipoMovimentacao) =>
    tipo === 'entrada' ? '#dcfce7' : tipo === 'saida' ? '#cffafe' : '#fee2e2';
  const labelTipo = (tipo: TipoMovimentacao) =>
    tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saida' : 'Descarte';

  const linhasTabela = movs
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((m, i) => {
      const prod = produtoMap.get(m.produtoId);
      const lote = loteMap.get(m.loteId);
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `
        <tr style="background:${bg}">
          <td>${formatarDataCompleta(m.data)}</td>
          <td>${prod?.nome ?? '—'}</td>
          <td>${lote?.codigo ?? '—'}</td>
          <td>
            <span style="background:${bgTipo(m.tipo)};color:${corTipo(m.tipo)};
              padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">
              ${labelTipo(m.tipo)}
            </span>
          </td>
          <td style="text-align:right;font-weight:700">${m.quantidade}</td>
          <td>${m.observacao ?? ''}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; }
  .cabecalho { background: #0e7490; color: #ffffff; padding: 28px 36px; }
  .cabecalho h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 6px; }
  .cabecalho p  { font-size: 12px; opacity: 0.85; }
  .corpo { padding: 28px 36px; }
  .subtitulo { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
  .resumo { display: flex; gap: 12px; margin-bottom: 28px; }
  .resumo-card { flex: 1; border-radius: 10px; padding: 16px; text-align: center; }
  .resumo-card .valor { font-size: 28px; font-weight: 800; display: block; }
  .resumo-card .label { font-size: 11px; font-weight: 700; display: block; margin-top: 2px; }
  .tabela { width: 100%; border-collapse: collapse; }
  .tabela th {
    background: #f1f5f9; padding: 10px 12px; text-align: left;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0; color: #475569;
  }
  .tabela th:last-child, .tabela td:last-child { text-align: right; }
  .tabela td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .rodape { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0;
    font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>

<div class="cabecalho">
  <h1>Casa da Crianca - Relatorio de Estoque</h1>
  <p>${periodoLabel} &nbsp;|&nbsp; ${tipoLabel} &nbsp;|&nbsp; Gerado em ${dataGeracao}</p>
</div>

<div class="corpo">

  <p class="subtitulo">RESUMO DO PERIODO</p>
  <div class="resumo">
    <div class="resumo-card" style="background:#dcfce7">
      <span class="valor" style="color:#15803d">${totEntradas}</span>
      <span class="label" style="color:#15803d">Unidades recebidas</span>
    </div>
    <div class="resumo-card" style="background:#cffafe">
      <span class="valor" style="color:#0e7490">${totSaidas}</span>
      <span class="label" style="color:#0e7490">Unidades distribuidas</span>
    </div>
    <div class="resumo-card" style="background:#fee2e2">
      <span class="valor" style="color:#b91c1c">${totDescartes}</span>
      <span class="label" style="color:#b91c1c">Unidades descartadas</span>
    </div>
    <div class="resumo-card" style="background:#f1f5f9">
      <span class="valor" style="color:#1e293b">${movs.length}</span>
      <span class="label" style="color:#64748b">Movimentacoes</span>
    </div>
  </div>

  <p class="subtitulo">DETALHAMENTO</p>
  ${movs.length === 0
    ? '<p style="color:#94a3b8;text-align:center;padding:32px">Nenhuma movimentacao no periodo selecionado.</p>'
    : `<table class="tabela">
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Lote</th>
            <th>Tipo</th>
            <th style="text-align:right">Qtd.</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>${linhasTabela}</tbody>
       </table>`
  }

  <div class="rodape">Relatorio gerado pelo app de Estoque da Casa da Crianca</div>

</div>
</body>
</html>`;
}

// ── Modal de Exportação ───────────────────────────────────────────────────────

function ModalExportacao({
  visivel,
  onFechar,
  movimentacoes,
  produtoMap,
  loteMap,
}: {
  visivel: boolean;
  onFechar: () => void;
  movimentacoes: Movimentacao[];
  produtoMap: Map<string, Produto>;
  loteMap: Map<string, Lote>;
}) {
  const { colors } = useTheme();
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [tipo, setTipo]       = useState<Filtro>('todos');
  const [gerando, setGerando] = useState(false);

  async function handleGerar() {
    setGerando(true);
    try {
      const { inicio, fim, label: periodoLabel } = periodoParaDatas(periodo);
      const tipoLabel = FILTROS.find((f) => f.valor === tipo)?.label ?? 'Todos';

      const filtradas = movimentacoes.filter((m) => {
        const dentroDoTipo    = tipo === 'todos' || m.tipo === tipo;
        const dentroDoPeriodo = m.data >= inicio && m.data <= fim;
        return dentroDoTipo && dentroDoPeriodo;
      });

      const html = gerarHTML(filtradas, produtoMap, loteMap, periodoLabel, tipoLabel);
      let uri: string;
      try {
        ({ uri } = await Print.printToFileAsync({ html, base64: false }));
      } catch {
        Alert.alert('Relatório não gerado', 'Não foi possível criar o arquivo. Verifique se há espaço disponível no dispositivo.');
        return;
      }
      // shareAsync lança ao cancelar em alguns sistemas — silencia
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Salvar ou compartilhar relatório',
        UTI: 'com.adobe.pdf',
      }).catch(() => {});
      onFechar();
    } catch {
      // fallback silencioso para casos não previstos
    } finally {
      setGerando(false);
    }
  }

  const opcoesPeriodo: { valor: Periodo; label: string; sub: string }[] = [
    { valor: 'mes_atual',   label: 'Este mês',       sub: MESES_PT[new Date().getMonth()] },
    { valor: 'mes_passado', label: 'Mês passado',    sub: MESES_PT[(new Date().getMonth() + 11) % 12] },
    { valor: 'tres_meses',  label: 'Últimos 3 meses', sub: 'Histórico recente' },
  ];

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>Exportar relatório</Text>
          <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
            Escolha o período e o tipo de movimentação
          </Text>

          {/* Período */}
          <Text style={[styles.modalSecao, { color: colors.textSecondary }]}>PERÍODO</Text>
          <View style={styles.opcoesList}>
            {opcoesPeriodo.map((op) => {
              const ativo = periodo === op.valor;
              return (
                <TouchableOpacity
                  key={op.valor}
                  style={[
                    styles.opcaoBtn,
                    { borderColor: ativo ? colors.primary : colors.border,
                      backgroundColor: ativo ? colors.primaryLight : colors.surfaceSecondary },
                  ]}
                  onPress={() => setPeriodo(op.valor)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.opcaoBtnLabel, { color: ativo ? colors.primaryDark : colors.textPrimary }]}>
                    {op.label}
                  </Text>
                  <Text style={[styles.opcaoBtnSub, { color: ativo ? colors.primaryDark : colors.textSecondary }]}>
                    {op.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tipo */}
          <Text style={[styles.modalSecao, { color: colors.textSecondary }]}>TIPO</Text>
          <View style={styles.tiposRow}>
            {FILTROS.map((f) => {
              const ativo = tipo === f.valor;
              return (
                <TouchableOpacity
                  key={f.valor}
                  style={[
                    styles.tipoChip,
                    { borderColor: ativo ? colors.primary : colors.border,
                      backgroundColor: ativo ? colors.primary : colors.surfaceSecondary },
                  ]}
                  onPress={() => setTipo(f.valor)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tipoChipEmoji}>{f.emoji}</Text>
                  <Text style={[styles.tipoChipLabel, { color: ativo ? '#fff' : colors.textSecondary }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Botões */}
          <TouchableOpacity
            style={[styles.gerarBtn, { backgroundColor: colors.primary, opacity: gerando ? 0.7 : 1 }]}
            onPress={handleGerar}
            disabled={gerando}
            activeOpacity={0.85}
            accessibilityLabel="Gerar e compartilhar relatório em PDF"
          >
            {gerando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.gerarBtnTexto}>📄  Gerar e compartilhar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onFechar} style={styles.cancelarBtn} activeOpacity={0.7}>
            <Text style={[styles.cancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Componentes de item ───────────────────────────────────────────────────────

function MovItem({
  mov,
  produtoMap,
  loteMap,
}: {
  mov: Movimentacao;
  produtoMap: Map<string, Produto>;
  loteMap: Map<string, Lote>;
}) {
  const { colors } = useTheme();
  const produto = produtoMap.get(mov.produtoId);
  const lote    = loteMap.get(mov.loteId);
  const cfg     = CONFIG_TIPO[mov.tipo];
  if (!produto) return null;

  return (
    <TouchableOpacity
      style={[styles.movCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/produto/${produto.id}`)}
      activeOpacity={0.75}
      accessibilityLabel={`${cfg.label} de ${produto.nome}, ${mov.quantidade} unidades`}
    >
      <View style={[styles.movIconWrap, { backgroundColor: cfg.bgCor(colors) }]}>
        <Text style={styles.movIconEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={styles.movInfo}>
        <View style={styles.movNomeRow}>
          <Text style={styles.movProdEmoji}>{produto.emoji}</Text>
          <Text style={[styles.movNome, { color: colors.textPrimary }]} numberOfLines={1}>
            {produto.nome}
          </Text>
        </View>
        <Text style={[styles.movSub, { color: colors.textSecondary }]}>
          Lote {lote?.codigo ?? '—'}{mov.observacao ? ` · ${mov.observacao}` : ''}
        </Text>
      </View>
      <View style={styles.movDireita}>
        <Text style={[styles.movQtd, { color: cfg.cor(colors) }]}>
          {mov.tipo === 'entrada' ? '+' : '−'}{mov.quantidade}
        </Text>
        <Text style={[styles.movData, { color: colors.textDisabled }]}>
          {formatarData(mov.data)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ResumoCard({ emoji, label, valor, bg, cor }: {
  emoji: string; label: string; valor: number; bg: string; cor: string;
}) {
  return (
    <View style={[styles.resumoCard, { backgroundColor: bg }]}>
      <Text style={styles.resumoEmoji}>{emoji}</Text>
      <Text style={[styles.resumoValor, { color: cor }]}>{valor}</Text>
      <Text style={[styles.resumoLabel, { color: cor }]}>{label}</Text>
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function HistoricoScreen() {
  const { colors } = useTheme();
  const [filtro, setFiltro]           = useState<Filtro>('todos');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [produtos, setProdutos]           = useState<Produto[]>([]);
  const [lotes, setLotes]                 = useState<Lote[]>([]);

  useEffect(() => {
    const u1 = subscribeToMovimentacoes(setMovimentacoes);
    const u2 = subscribeToProdutos(setProdutos);
    const u3 = subscribeAllLotesRaw(setLotes);
    return () => { u1(); u2(); u3(); };
  }, []);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const loteMap    = useMemo(() => new Map(lotes.map((l)  => [l.id, l])), [lotes]);

  const totaisGerais = useMemo(() => ({
    entradas:  movimentacoes.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0),
    saidas:    movimentacoes.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0),
    descartes: movimentacoes.filter((m) => m.tipo === 'descarte').reduce((s, m) => s + m.quantidade, 0),
  }), [movimentacoes]);

  const secoes = useMemo(() => {
    const filtradas = filtro === 'todos' ? movimentacoes : movimentacoes.filter((m) => m.tipo === filtro);
    const grupos: Record<string, Movimentacao[]> = {};
    for (const mov of filtradas) {
      const chave = mov.data.slice(0, 7);
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(mov);
    }
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([chave, data]) => ({
        title: chave,
        data: data.sort((a, b) => b.data.localeCompare(a.data)),
      }));
  }, [filtro, movimentacoes]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]}>Histórico</Text>
          <TouchableOpacity
            style={[styles.exportarBtn, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
            onPress={() => setModalVisivel(true)}
            activeOpacity={0.8}
            accessibilityLabel="Exportar relatório em PDF"
          >
            <Text style={styles.exportarEmoji}>📄</Text>
            <Text style={[styles.exportarTexto, { color: colors.accent }]}>Exportar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resumoRow}>
          <ResumoCard emoji="📥" label="Entradas"  valor={totaisGerais.entradas}  bg={colors.riscoSeguroLight} cor={colors.riscoSeguroDark} />
          <ResumoCard emoji="📤" label="Saídas"    valor={totaisGerais.saidas}    bg={colors.primaryLight}     cor={colors.primaryDark} />
          <ResumoCard emoji="🗑️" label="Descartes" valor={totaisGerais.descartes} bg={colors.riscoAltoLight}   cor={colors.riscoAltoDark} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.valor;
            const bgAtiva = f.valor === 'entrada'
              ? colors.riscoSeguro : f.valor === 'saida'
              ? colors.primary : f.valor === 'descarte'
              ? colors.riscoAlto : colors.primary;
            return (
              <TouchableOpacity
                key={f.valor}
                style={[styles.chip, { backgroundColor: ativo ? bgAtiva : colors.surface, borderColor: ativo ? bgAtiva : colors.border }]}
                onPress={() => setFiltro(f.valor)}
                accessibilityLabel={`Filtrar por ${f.label}`}
              >
                <Text style={styles.chipEmoji}>{f.emoji}</Text>
                <Text style={[styles.chipLabel, { color: ativo ? '#FFF' : colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {secoes.length === 0 ? (
        <View style={styles.vazioWrap}>
          <Text style={styles.vazioEmoji}>📭</Text>
          <Text style={[styles.vazioTexto, { color: colors.textSecondary }]}>Nenhuma movimentação encontrada.</Text>
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MovItem mov={item} produtoMap={produtoMap} loteMap={loteMap} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.secaoHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.secaoTitulo, { color: colors.textSecondary }]}>
                {labelMes(section.title).toUpperCase()}
              </Text>
              <View style={[styles.secaoLinha, { backgroundColor: colors.divider }]} />
              <Text style={[styles.secaoCount, { color: colors.textDisabled }]}>
                {section.data.length} mov.
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listaContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}

      <ModalExportacao
        visivel={modalVisivel}
        onFechar={() => setModalVisivel(false)}
        movimentacoes={movimentacoes}
        produtoMap={produtoMap}
        loteMap={loteMap}
      />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 16 },

  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo:       { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  exportarBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  exportarEmoji:{ fontSize: 16 },
  exportarTexto:{ fontSize: 14, fontWeight: '700' },

  resumoRow:   { flexDirection: 'row', gap: 10 },
  resumoCard:  { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 2 },
  resumoEmoji: { fontSize: 20 },
  resumoValor: { fontSize: 26, fontWeight: '800' },
  resumoLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  chipsRow:  { gap: 8, paddingBottom: 4 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 14, fontWeight: '600' },

  listaContent: { paddingHorizontal: 20, paddingBottom: 32 },
  secaoHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  secaoTitulo:  { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 },
  secaoLinha:   { flex: 1, height: 1 },
  secaoCount:   { fontSize: 12, fontWeight: '600' },

  movCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  movIconWrap:  { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  movIconEmoji: { fontSize: 22 },
  movInfo:      { flex: 1, gap: 3 },
  movNomeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movProdEmoji: { fontSize: 16 },
  movNome:      { fontSize: 16, fontWeight: '700', flex: 1 },
  movSub:       { fontSize: 13, lineHeight: 17 },
  movDireita:   { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  movQtd:       { fontSize: 16, fontWeight: '800' },
  movData:      { fontSize: 12 },

  vazioWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  vazioEmoji: { fontSize: 40 },
  vazioTexto: { fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 16 },
    }),
  },
  modalTitulo: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSub:    { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  modalSecao:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },

  opcoesList: { gap: 8, marginBottom: 20 },
  opcaoBtn:   { borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opcaoBtnLabel: { fontSize: 15, fontWeight: '700' },
  opcaoBtnSub:   { fontSize: 13 },

  tiposRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  tipoChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tipoChipEmoji:{ fontSize: 14 },
  tipoChipLabel:{ fontSize: 14, fontWeight: '600' },

  gerarBtn:     { borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gerarBtnTexto:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  cancelarBtn:  { alignItems: 'center', paddingVertical: 10 },
  cancelarTexto:{ fontSize: 15, fontWeight: '600' },
});
