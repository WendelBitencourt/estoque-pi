# -*- coding: utf-8 -*-
"""Gera a documentação técnica completa em ODT (OpenDocument Text)."""
import os
from odf.opendocument import OpenDocumentText
from odf.style import (Style, TextProperties, ParagraphProperties,
                       TableProperties, TableColumnProperties, TableCellProperties,
                       GraphicProperties, PageLayout, PageLayoutProperties, MasterPage)
from odf.text import P, Span, H
from odf.table import Table, TableColumn, TableRow, TableCell
from odf.draw import Frame, Image

ASSETS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ASSETS)
PNG = os.path.join(ASSETS, "diagrama_arquitetura.png")
OUT = os.path.join(ROOT, "Documentacao_Casa_da_Crianca.odt")

doc = OpenDocumentText()

# ───────────────────────── Paleta ─────────────────────────
CYAN = "#0e7490"; CYAN_D = "#155e75"; CYAN_L = "#0891b2"
INK = "#1f2937"; SLATE = "#475569"; GRAY = "#64748b"
BOX_BG = "#ecfeff"; CODE_BG = "#f1f5f9"; ALT_BG = "#f1f5f9"
AMBER = "#f59e0b"; AMBER_BG = "#fffbeb"; BORDER = "#cbd5e1"

FS = "Liberation Sans"; FM = "Liberation Mono"

def addstyle(s): doc.automaticstyles.addElement(s)

# ───────────────────────── Estilos de parágrafo ─────────────────────────
title = Style(name="Title1", family="paragraph")
title.addElement(TextProperties(fontsize="26pt", fontweight="bold", color=CYAN, fontfamily=FS))
title.addElement(ParagraphProperties(marginbottom="0.1cm", margintop="0.2cm"))
addstyle(title)

subtitle = Style(name="Subtitle1", family="paragraph")
subtitle.addElement(TextProperties(fontsize="11pt", color=SLATE, fontfamily=FS))
subtitle.addElement(ParagraphProperties(marginbottom="0.05cm"))
addstyle(subtitle)

h2 = Style(name="H2", family="paragraph")
h2.addElement(TextProperties(fontsize="17pt", fontweight="bold", color=CYAN, fontfamily=FS))
h2.addElement(ParagraphProperties(breakbefore="page", margintop="0.3cm", marginbottom="0.25cm",
              borderbottom="0.06cm solid " + CYAN, paddingbottom="0.08cm"))
addstyle(h2)

h2first = Style(name="H2first", family="paragraph")
h2first.addElement(TextProperties(fontsize="17pt", fontweight="bold", color=CYAN, fontfamily=FS))
h2first.addElement(ParagraphProperties(margintop="0.3cm", marginbottom="0.25cm",
                   borderbottom="0.06cm solid " + CYAN, paddingbottom="0.08cm"))
addstyle(h2first)

h3 = Style(name="H3", family="paragraph")
h3.addElement(TextProperties(fontsize="13.5pt", fontweight="bold", color=CYAN_D, fontfamily=FS))
h3.addElement(ParagraphProperties(margintop="0.35cm", marginbottom="0.12cm"))
addstyle(h3)

h4 = Style(name="H4", family="paragraph")
h4.addElement(TextProperties(fontsize="11.5pt", fontweight="bold", color=CYAN_L, fontfamily=FS))
h4.addElement(ParagraphProperties(margintop="0.25cm", marginbottom="0.05cm"))
addstyle(h4)

body = Style(name="Body", family="paragraph")
body.addElement(TextProperties(fontsize="11pt", color=INK, fontfamily=FS))
body.addElement(ParagraphProperties(margintop="0.1cm", marginbottom="0.1cm", lineheight="135%"))
addstyle(body)

lead = Style(name="Lead", family="paragraph")
lead.addElement(TextProperties(fontsize="11.5pt", color="#334155", fontfamily=FS))
lead.addElement(ParagraphProperties(margintop="0.1cm", marginbottom="0.1cm", lineheight="140%"))
addstyle(lead)

meta = Style(name="Meta", family="paragraph")
meta.addElement(TextProperties(fontsize="11pt", color=SLATE, fontfamily=FS))
meta.addElement(ParagraphProperties(marginbottom="0.05cm"))
addstyle(meta)

small = Style(name="Small", family="paragraph")
small.addElement(TextProperties(fontsize="9.5pt", color=GRAY, fontfamily=FS))
small.addElement(ParagraphProperties(margintop="0.05cm", marginbottom="0.15cm"))
addstyle(small)

bullet = Style(name="Bullet", family="paragraph")
bullet.addElement(TextProperties(fontsize="11pt", color=INK, fontfamily=FS))
bullet.addElement(ParagraphProperties(marginleft="0.7cm", textindent="-0.4cm",
                  margintop="0.04cm", marginbottom="0.04cm", lineheight="132%"))
addstyle(bullet)

pre = Style(name="Pre", family="paragraph")
pre.addElement(TextProperties(fontsize="9pt", fontfamily=FM, color="#0f172a"))
pre.addElement(ParagraphProperties(backgroundcolor=CODE_BG, border="0.02cm solid " + BORDER,
               padding="0.18cm", margintop="0.15cm", marginbottom="0.15cm"))
addstyle(pre)

box = Style(name="Box", family="paragraph")
box.addElement(TextProperties(fontsize="11pt", color=INK, fontfamily=FS))
box.addElement(ParagraphProperties(backgroundcolor=BOX_BG, border="0.02cm solid " + CYAN,
               padding="0.22cm", margintop="0.2cm", marginbottom="0.2cm", lineheight="135%"))
addstyle(box)

boxw = Style(name="BoxW", family="paragraph")
boxw.addElement(TextProperties(fontsize="11pt", color=INK, fontfamily=FS))
boxw.addElement(ParagraphProperties(backgroundcolor=AMBER_BG, border="0.02cm solid " + AMBER,
                padding="0.22cm", margintop="0.2cm", marginbottom="0.2cm", lineheight="135%"))
addstyle(boxw)

caption = Style(name="Caption", family="paragraph")
caption.addElement(TextProperties(fontsize="9.5pt", color=GRAY, fontstyle="italic", fontfamily=FS))
caption.addElement(ParagraphProperties(textalign="center", margintop="0.1cm", marginbottom="0.2cm"))
addstyle(caption)

imgpar = Style(name="ImgPar", family="paragraph")
imgpar.addElement(ParagraphProperties(textalign="center", margintop="0.2cm", marginbottom="0.1cm"))
addstyle(imgpar)

# ───────────────────────── Estilos de texto (inline) ─────────────────────────
b_style = Style(name="B", family="text")
b_style.addElement(TextProperties(fontweight="bold"))
addstyle(b_style)

field_style = Style(name="Field", family="text")
field_style.addElement(TextProperties(fontweight="bold", color=CYAN))
addstyle(field_style)

code_inline = Style(name="CodeInline", family="text")
code_inline.addElement(TextProperties(fontfamily=FM, fontsize="9.5pt", backgroundcolor=CODE_BG))
addstyle(code_inline)

# ───────────────────────── Estilos de imagem ─────────────────────────
imgframe = Style(name="ImgFrame", family="graphic")
imgframe.addElement(GraphicProperties(border="0.02cm solid " + BORDER))
addstyle(imgframe)

# ───────────────────────── Estilos de tabela ─────────────────────────
def cell_style(name, bg=None, border=True):
    s = Style(name=name, family="table-cell")
    props = {"padding": "0.12cm"}
    if border:
        props["border"] = "0.02cm solid " + BORDER
    if bg:
        props["backgroundcolor"] = bg
    s.addElement(TableCellProperties(**props))
    addstyle(s)
    return name

C_HEAD = cell_style("CHead", bg=CYAN)
C_NORM = cell_style("CNorm")
C_ALT  = cell_style("CAlt", bg=ALT_BG)

th_text = Style(name="THText", family="paragraph")
th_text.addElement(TextProperties(fontsize="10pt", fontweight="bold", color="#ffffff", fontfamily=FS))
th_text.addElement(ParagraphProperties(margintop="0.02cm", marginbottom="0.02cm"))
addstyle(th_text)

td_text = Style(name="TDText", family="paragraph")
td_text.addElement(TextProperties(fontsize="10pt", color=INK, fontfamily=FS))
td_text.addElement(ParagraphProperties(margintop="0.02cm", marginbottom="0.02cm", lineheight="128%"))
addstyle(td_text)

# ───────────────────────── Helpers de conteúdo ─────────────────────────
def emit(parts, target):
    """Adiciona segmentos a um elemento. parts: str ou lista de str/('b'|'code'|'field', txt)."""
    if isinstance(parts, str):
        parts = [parts]
    for part in parts:
        if isinstance(part, tuple):
            kind, txt = part
            st = {"b": b_style, "code": code_inline, "field": field_style}[kind]
            target.addElement(Span(stylename=st, text=txt))
        else:
            target.addText(part)

def para(style, parts):
    p = P(stylename=style)
    emit(parts, p)
    doc.text.addElement(p)
    return p

def bullets(items):
    for it in items:
        p = P(stylename=bullet)
        p.addText("•  ")
        emit(it, p)
        doc.text.addElement(p)

def numbered(items):
    for i, it in enumerate(items, 1):
        p = P(stylename=bullet)
        p.addText(f"{i}.  ")
        emit(it, p)
        doc.text.addElement(p)

def pre_block(text):
    p = P(stylename=pre)
    lines = text.split("\n")
    for i, ln in enumerate(lines):
        if i: p.addElement(__import__("odf.text", fromlist=["LineBreak"]).LineBreak())
        p.addText(ln)
    doc.text.addElement(p)

def table(name, widths_cm, header, rows):
    t = Table(name=name)
    # column styles
    for i, w in enumerate(widths_cm):
        cs = Style(name=f"{name}.col{i}", family="table-column")
        cs.addElement(TableColumnProperties(columnwidth=f"{w}cm"))
        addstyle(cs)
        t.addElement(TableColumn(stylename=cs))
    # header
    hr = TableRow()
    for cell in header:
        tc = TableCell(stylename=C_HEAD, valuetype="string")
        p = P(stylename=th_text); emit(cell, p); tc.addElement(p)
        hr.addElement(tc)
    t.addElement(hr)
    # body
    for r, row in enumerate(rows):
        tr = TableRow()
        cstyle = C_ALT if r % 2 == 1 else C_NORM
        for cell in row:
            tc = TableCell(stylename=cstyle, valuetype="string")
            p = P(stylename=td_text); emit(cell, p); tc.addElement(p)
            tr.addElement(tc)
        t.addElement(tr)
    doc.text.addElement(t)

def image(w_cm):
    href = doc.addPicture(PNG)
    from PIL import Image as PILImage  # may not exist; fallback below
    p = P(stylename=imgpar)
    h_cm = round(w_cm * 1948.0 / 2048.0, 2)
    frame = Frame(stylename=imgframe, width=f"{w_cm}cm", height=f"{h_cm}cm",
                  anchortype="paragraph")
    frame.addElement(Image(href=href, type="simple", show="embed", actuate="onLoad"))
    p.addElement(frame)
    doc.text.addElement(p)

def image_simple(w_cm):
    href = doc.addPicture(PNG)
    p = P(stylename=imgpar)
    h_cm = round(w_cm * 1948.0 / 2048.0, 2)
    frame = Frame(stylename=imgframe, width=f"{w_cm}cm", height=f"{h_cm}cm",
                  anchortype="paragraph")
    frame.addElement(Image(href=href, type="simple", show="embed", actuate="onLoad"))
    p.addElement(frame)
    doc.text.addElement(p)

# ═════════════════════════ CONTEÚDO ═════════════════════════
B = lambda t: ("b", t)
CD = lambda t: ("code", t)
FD = lambda t: ("field", t)

# Capa
para(title, "Controle de Estoque — Casa da Criança")
para(meta, [B("Documentação Técnica Completa"), " · Projeto Integrador (PI) — Análise e Desenvolvimento de Sistemas"])
para(meta, "Aplicativo mobile de gerenciamento de estoque de doações · ONG Casa da Criança — Itapira/SP")
para(meta, "App versão 1.0.0 · React Native 0.81 + Expo SDK 54 + TypeScript 5.9")
para(box, [
    "Este documento foi escrito para que ", B("toda a equipe do projeto"),
    " entenda, com profundidade, tudo o que foi utilizado no aplicativo: as plataformas, os serviços de nuvem, as APIs e os algoritmos de Machine Learning. Para cada item explicamos ",
    B("o que é"), ", ", B("para que serve"), ", ", B("como está implementado no nosso projeto"),
    " e, no caso da IA, ", B("como foi treinado"), ". É um material de apoio para o dia da apresentação."])

para(h3, "O que o aplicativo faz, em uma frase")
para(lead, "A voluntária registra as doações que chegam (escaneando o código de barras); o app classifica automaticamente o risco de cada lote vencer, prevê quando o estoque vai acabar, sugere o que pedir aos doadores e gera uma lista de necessidades pronta para enviar no WhatsApp — tudo com a inteligência escondida atrás de uma interface simples, pensada para uma usuária sem conhecimento técnico.")

para(h3, "Sumário")
numbered([
    "Visão geral e fluxo do sistema",
    "Diagrama detalhado da arquitetura",
    "Plataformas e tecnologias base",
    "Serviços de nuvem",
    "APIs (externas e nativas)",
    "Algoritmos de Machine Learning",
    "Estrutura de dados (Firestore)",
    "Resumo rápido para a apresentação",
])

# 1. Visão geral
para(h2, "1. Visão geral e fluxo do sistema")
para(body, "O sistema é dividido em três grandes blocos que conversam entre si pela internet:")
bullets([
    [B("O aplicativo (cliente)"), " — roda no celular da voluntária. É onde toda a interface acontece. Construído em React Native com Expo."],
    [B("Os serviços de nuvem"), " — guardam os dados (Firebase Firestore), as fotos (Cloudinary), cuidam do login (Firebase Authentication) e hospedam a inteligência artificial (Hugging Face)."],
    [B("As APIs externas"), " — bancos de dados de produtos por código de barras (Cosmos e Open Food Facts) que preenchem o cadastro automaticamente."],
])
para(body, ["O princípio de design central é: ", B("a complexidade fica invisível"), ". A usuária nunca vê termos como \"árvore de decisão\", \"cluster\" ou \"regressão\" — ela vê apenas alertas coloridos e frases em linguagem natural."])
para(h3, "Fluxo resumido de uma doação")
pre_block(
"""Doação recebida
  -> Registrar entrada (scanner de código de barras)
  -> Busca automática dos dados do produto (Cosmos / Open Food Facts)
  -> Gravação no banco (Firestore) e foto (Cloudinary)
  -> Classificação automática do risco de validade (IA - Árvore de Decisão)
  -> Alerta colorido na tela inicial e no estoque
  -> Previsão de quando vai acabar (IA - Regressão Linear)
  -> Sugestão de doações por sazonalidade (IA - K-Means)
  -> Lista de necessidades pronta para o WhatsApp""")

# 2. Diagrama
para(h2, "2. Diagrama detalhado da arquitetura")
para(body, "O diagrama abaixo mostra todas as ferramentas usadas, como elas se conectam e o fluxo principal de uma entrada de doação. As cores separam as quatro famílias: aplicativo (azul-petróleo), Machine Learning (roxo), serviços de nuvem (laranja) e APIs externas/nativas (verde).")
image_simple(16.5)
para(caption, "Figura 1 — Arquitetura completa e fluxo \"Registrar entrada de doação\". O app é o único ponto que o usuário toca; tudo o mais acontece em segundo plano.")

# 3. Plataformas
para(h2, "3. Plataformas e tecnologias base")
para(body, "Aqui estão as plataformas e frameworks que formam a base do aplicativo — a fundação sobre a qual tudo é construído.")
table("t_stack", [4.0, 2.0, 10.5],
    ["Tecnologia", "Versão", "O que é e para que serve"],
    [
      [[B("React Native")], "0.81.5", "Framework que permite escrever um único código em JavaScript/TypeScript e gerar apps nativos para Android e iOS. É a base do projeto."],
      [[B("Expo (SDK)")], "54", "Plataforma construída sobre o React Native. Dá acesso pronto a recursos do celular (câmera, notificações, impressão, arquivos) sem configurar código nativo no Android Studio/Xcode. Acelera muito o desenvolvimento."],
      [[B("Expo Router")], "6.0", "Navegação baseada em arquivos: cada arquivo dentro da pasta app/ vira automaticamente uma tela/rota (parecido com o Next.js, mas para mobile)."],
      [[B("TypeScript")], "5.9", "Linguagem que adiciona tipagem ao JavaScript, evitando uma classe inteira de erros ainda durante a escrita. Todo o projeto é tipado."],
    ])

para(h3, "Plataformas de execução (onde o app roda)")
para(body, ["Como o app é feito em React Native + Expo, ", B("o mesmo código roda em três plataformas"), ":"])
table("t_exec", [4.0, 12.5],
    ["Plataforma", "Como funciona no projeto"],
    [
      [[B("Android")], [CD("com.casadacrianca.estoque"), ". Plataforma principal de uso. Roda via Expo Go (testes) ou APK/dev build (produção, com todos os recursos nativos)."]],
      [[B("iOS")], "Suportado pelo mesmo código (inclusive tablets). Requer macOS para gerar o build final."],
      [[B("Web")], [CD("react-native-web"), ": o app também abre no navegador, útil para demonstração rápida sem celular."]],
    ])

para(h3, "Expo Go × Dev Build — diferença importante para a apresentação")
para(body, "O app pode rodar em dois ambientes, e isso muda o que está disponível:")
table("t_env", [5.5, 5.5, 5.5],
    ["Recurso", "Expo Go (teste rápido)", "Dev Build / APK (produção)"],
    [
      ["Login com Google", "Desativado (mostra aviso)", "Ativo"],
      ["Notificações push", "Desativadas (stub silencioso)", "Ativas"],
      ["Animações (Reanimated)", "Versão simplificada", "Completas"],
      ["Câmera, Firebase, APIs, IA", "Funcionam", "Funcionam"],
    ])
para(small, ["A detecção é feita no código por ", CD("Constants.executionEnvironment"), "; módulos nativos incompatíveis com o Expo Go são carregados de forma condicional para o app não quebrar."])

para(h3, "Bibliotecas de apoio")
table("t_libs", [6.0, 10.5],
    ["Biblioteca", "Para que serve no app"],
    [
      [[CD("react-native-safe-area-context")], "Impede que o conteúdo fique atrás da barra de status ou dos gestos do Android."],
      [[CD("react-native-reanimated")], "Animações fluidas (cards, badges de risco, telas de sucesso)."],
      [[CD("react-native-screens")], "Otimização de desempenho na troca de telas."],
      [[CD("async-storage")], "Guarda configurações locais (horário do resumo, toggles). Funciona sem internet."],
      [[CD("netinfo")], "Detecta se há internet e mostra a barra de \"modo offline\"."],
    ])

# 4. Nuvem
para(h2, "4. Serviços de nuvem")
para(body, "Serviços de nuvem são sistemas que rodam em servidores na internet (não no celular). O app se conecta a eles para guardar dados, hospedar arquivos e rodar a inteligência artificial. Usamos três, todos em planos gratuitos.")

para(h3, "4.1 Firebase (Google) — plano Spark (gratuito)")
para(body, [FD("O que é: "), "plataforma de backend da Google, a \"espinha dorsal\" do app. Projeto: ", CD("casa-da-crianca-estoque"), "."])
para(body, [FD("Para que serve: "), "usamos dois serviços do Firebase — autenticação de usuários e banco de dados."])
para(h4, "Firebase Authentication")
para(body, [B("O que faz: "), "gerencia o login e o cadastro dos usuários e mantém a sessão aberta entre reinicializações do app."])
para(body, B("Como está implementado:"))
bullets([
    ["Quatro formas de entrar: ", B("Google"), ", ", B("e-mail e senha"), ", ", B("criação de conta"), " com recuperação de senha por e-mail, e ", B("modo visitante"), " (login anônimo, para demonstração)."],
    ["O arquivo ", CD("services/authService.ts"), " concentra todas as funções (login, logout, criar conta, redefinir senha)."],
    ["O ", CD("AuthContext"), " disponibiliza o usuário logado para todas as telas; o ", CD("AuthGate"), " redireciona para o login quando não há sessão."],
    "A sessão persiste via AsyncStorage (no celular) ou localStorage (na web).",
])
para(h4, "Cloud Firestore")
para(body, [B("O que faz: "), "banco de dados NoSQL em tempo real, com sincronização automática e suporte a uso offline."])
para(body, B("Como está implementado:"))
bullets([
    ["Todas as informações vivem aqui: ", CD("produtos"), ", ", CD("lotes"), ", ", CD("movimentacoes"), " e ", CD("categorias"), "."],
    ["As telas \"escutam\" o banco com ", CD("onSnapshot"), " (listeners em tempo real): qualquer mudança aparece na hora, sem recarregar."],
    ["O modo offline (", CD("experimentalAutoDetectLongPolling"), ") enfileira operações sem internet e sincroniza ao reconectar."],
    "Regra de segurança: apenas usuários autenticados leem e escrevem.",
])
para(h4, "Notificações (locais)")
para(body, ["As notificações push são ", B("locais"), ", agendadas no próprio aparelho via ", CD("expo-notifications"), " — não há servidor de push. Há dois tipos: o ", B("resumo diário"), " (no horário escolhido) e o ", B("alerta imediato"), " quando uma saída zera o estoque de um item."])

para(h3, "4.2 Cloudinary — plano Free")
para(body, [FD("O que é: "), "serviço de hospedagem e transformação de imagens na nuvem. Cloud name ", CD("dffc6u8z0"), ", upload preset ", CD("casa-da-crianca"), " (unsigned)."])
para(body, [FD("Para que serve: "), "guardar as fotos dos produtos sem ocupar espaço no Firebase."])
para(body, [FD("Como está implementado: "), "quando a usuária tira ou escolhe uma foto, o app envia o arquivo via ", CD("expo-file-system"), " para o Cloudinary (", CD("services/storageService.ts"), "). O Cloudinary devolve uma URL pública (", CD("secure_url"), ") salva no campo ", CD("fotoUrl"), " do produto no Firestore. Assim a imagem fica acessível de qualquer dispositivo."])

para(h3, "4.3 Hugging Face Spaces — gratuito")
para(body, [FD("O que é: "), "plataforma que hospeda aplicações de Machine Learning. É onde roda o servidor Python com toda a inteligência artificial do app."])
para(body, [FD("Endereço: "), CD("https://minduim-casadacrianca-validade.hf.space"), " — tecnologia ", B("FastAPI (Python) + scikit-learn"), ", código em ", CD("ml/space/app.py"), "."])
para(body, [FD("Como está implementado: "), "o app faz chamadas HTTP POST aos três endpoints sempre que precisa classificar um lote, agrupar doações ou prever o fim do estoque. O Space \"hiberna\" após inatividade, então a primeira chamada pode demorar ~10 segundos para \"acordar\". Detalhes de cada algoritmo na seção 6."])

# 5. APIs
para(h2, "5. APIs (externas e nativas)")
para(body, "API (\"Interface de Programação de Aplicações\") é um modo padronizado de um programa pedir dados ou serviços a outro. O app usa APIs externas (de outras empresas, pela internet) e nativas (recursos do próprio celular, fornecidos pelo Expo).")

para(h3, "5.1 Cosmos API — externa (Bluesoft)")
para(body, [B("O que é / para que serve: "), "banco de dados de produtos ", B("brasileiros"), " indexados por código de barras (EAN/GTIN). Devolve nome, foto, categoria e conteúdo da embalagem."])
para(body, [B("Como está implementada: "), "ao escanear um código na tela de Registrar Entrada, o app consulta a Cosmos (header ", CD("X-Cosmos-Token"), "). O token vai na variável ", CD("EXPO_PUBLIC_COSMOS_TOKEN"), ". Se o limite diário do plano gratuito for atingido (resposta ", CD("429"), "), o app cai automaticamente para o Open Food Facts. Lógica em ", CD("services/barcode.ts"), "."])

para(h3, "5.2 Open Food Facts — externa, gratuita e aberta")
para(body, [B("O que é / para que serve: "), "banco de dados global, colaborativo e 100% gratuito de produtos alimentícios (mais de 150 países). Não exige autenticação."])
para(body, [B("Como está implementada: "), "funciona como ", B("fallback"), " da Cosmos. Consulta a URL pública ", CD("world.openfoodfacts.org/api/v0/product/{ean}.json"), ", priorizando o nome em português. As categorias retornadas são mapeadas para as categorias do app (alimentos, higiene, limpeza)."])
para(box, [B("Ordem de consulta ao escanear um código de barras: "), "1) cache no Firestore (grátis, offline); 2) Cosmos API (produtos do Brasil); 3) Open Food Facts (fallback global). Se nenhuma encontrar, abre o formulário manual."])

para(h3, "5.3 API de Machine Learning (Hugging Face) — nossa própria")
para(body, [B("O que é / para que serve: "), "a API Python que escrevemos e hospedamos. Expõe três endpoints, um por algoritmo de IA (detalhes na seção 6)."])
table("t_ml_ep", [5.5, 11.0],
    ["Endpoint", "Função"],
    [
      [[CD("POST /classificar")], "Classifica o risco de validade de um lote (Árvore de Decisão)."],
      [[CD("POST /agrupar-doacoes")], "Descobre padrões sazonais de doação (K-Means)."],
      [[CD("POST /prever-fim-estoque")], "Prevê em quantos dias o estoque vai zerar (Regressão Linear)."],
    ])
para(small, ["No app, a comunicação fica em ", CD("services/mlService.ts"), "."])

para(h3, "5.4 Google Sign-In — externa (Google Identity)")
para(body, [B("O que é / para que serve: "), "permite entrar no app com a conta Google, sem criar senha nova."])
para(body, [B("Como está implementada: "), "biblioteca ", CD("@react-native-google-signin/google-signin"), " (módulo nativo, só funciona em APK/dev build). O token do Google é convertido em credencial do Firebase Auth (", CD("signInWithCredential"), "). No Expo Go, o botão exibe um aviso e oferece login por e-mail ou modo visitante."])

para(h3, "5.5 APIs nativas do dispositivo (via Expo)")
table("t_native", [4.5, 12.0],
    ["API / Biblioteca", "O que faz no app"],
    [
      [[CD("expo-camera")], [B("Scanner de código de barras. "), "Acessa a câmera e lê EAN-13, EAN-8 e QR Code em tempo real na tela de Registrar Entrada."]],
      [[CD("expo-image-picker")], "Permite escolher uma foto da galeria ou tirar na hora ao cadastrar um produto."],
      [[CD("expo-file-system")], "Envia o arquivo da foto para o Cloudinary."],
      [[CD("expo-notifications")], "Agenda e dispara as notificações locais (resumo diário e alerta de estoque zerado)."],
      [[CD("expo-print + expo-sharing")], "Gera o relatório do histórico em PDF e abre o menu de compartilhamento."],
      [[CD("expo-linking")], "Abre o WhatsApp já com a lista de necessidades formatada."],
    ])

# 6. ML
para(h2, "6. Algoritmos de Machine Learning")
para(body, ["Machine Learning (aprendizado de máquina) é o ramo da IA em que o computador ", B("aprende padrões a partir de dados"), ", em vez de seguir regras fixas escritas à mão. O projeto usa três algoritmos clássicos da biblioteca ", B("scikit-learn"), ", todos rodando na API Python no Hugging Face. ", B("Nenhum modelo roda no celular"), " — o app envia os dados, a API processa e devolve o resultado."])
para(box, [B("Decisão de arquitetura importante: "), "só a Árvore de Decisão é treinada uma vez e salva em arquivo. O K-Means e a Regressão Linear são ", B("treinados sob demanda"), ", a cada chamada, com os dados mais recentes enviados pelo app. Como são leves (treinam em menos de 100 ms), isso garante resultados sempre atualizados sem precisar retreinar e republicar o servidor."])

para(h3, "6.1 Árvore de Decisão — classificação de risco de validade")
para(body, [FD("O que é: "), "algoritmo de ", B("classificação supervisionada"), ". Funciona como um fluxograma de perguntas \"sim/não\" (ex.: \"faltam menos de 3 dias para vencer?\") que, ao final, chega a uma resposta. É fácil de interpretar e explicar."])
para(body, [FD("Para que serve no app: "), "classifica cada lote de doação em três níveis de risco de vencer antes de ser consumido:"])
table("t_risco", [4.5, 5.0, 7.0],
    ["Classe da IA", "Exibido no app", "Significado"],
    [
      [[CD("consumo_imediato")], "Consumo Imediato (vermelho)", "O lote pode vencer antes de ser usado."],
      [[CD("risco_vencimento")], "Risco de Vencimento (amarelo)", "Monitorar de perto."],
      [[CD("seguro")], "Seguro (verde)", "Validade confortável diante do ritmo de consumo."],
    ])
para(body, [FD("Como está implementada: "), "endpoint ", CD("POST /classificar"), ". O modelo treinado é salvo em ", CD("classificador.joblib"), " e carregado ", B("uma única vez"), " quando a API inicia. Recebe três features (variáveis de entrada):"])
bullets([
    [CD("dias_ate_vencer"), " — quantos dias faltam para o produto vencer;"],
    [CD("media_consumo_dias"), " — ritmo médio de consumo do produto (calculado pelo histórico de saídas);"],
    [CD("quantidade"), " — número de unidades no lote."],
])
para(body, "No app, o badge colorido aparece na tela de Estoque, na tela inicial (\"Requer Atenção\") e nos detalhes do produto. A cada nova entrada ou baixa, o risco dos lotes afetados é recalculado.")
para(h4, "Como foi treinado")
numbered([
    [B("Geração do dataset"), " (", CD("ml/gerar_dataset.py"), "): como ainda não há histórico real suficiente, foram criados ", B("800 exemplos sintéticos"), ". Cada um recebe valores variados de dias até vencer, ritmo de consumo e quantidade, e é rotulado por uma regra lógica baseada na razão dias÷consumo (quantos \"ciclos de consumo\" cabem antes de vencer). Os exemplos concentram-se nos casos extremos. Semente fixa (seed=42) garante reprodutibilidade."],
    [B("Treino"), " (", CD("ml/treinar_modelo.py"), "): o dataset é dividido em ", B("80% treino e 20% teste"), " (com stratify, mantendo a proporção das classes). Treina-se um ", CD("DecisionTreeClassifier"), " com critério ", B("Gini"), " e ", B("profundidade máxima 5"), " (limite que evita overfitting e mantém a árvore explicável)."],
    [B("Avaliação"), ": o script imprime acurácia, relatório por classe (precisão, recall, F1) e matriz de confusão. Por fim, salva o modelo em ", CD(".joblib"), ", enviado para o Hugging Face."],
])
para(small, "Por que Árvore de Decisão? É interpretável, funciona bem com poucos dados e variáveis numéricas simples, não exige normalização — e é o algoritmo pedido pelo professor.")

para(h3, "6.2 K-Means — agrupamento de padrões de doação")
para(body, [FD("O que é: "), "algoritmo de ", B("clusterização não supervisionada"), ". Agrupa dados parecidos em \"clusters\" (grupos) ", B("sem que ninguém diga de antemão"), " quais são os grupos — o próprio algoritmo descobre os padrões."])
para(body, [FD("Para que serve no app: "), "a partir do histórico mensal de doações (unidades de alimentos, higiene e limpeza por mês), agrupa os meses em perfis parecidos — por exemplo \"meses de campanha de alimentos\", \"meses equilibrados\", \"meses de baixa doação\" — e o app sugere, em linguagem natural, o que pedir aos doadores."])
para(body, [FD("Como está implementada: "), "endpoint ", CD("POST /agrupar-doacoes"), ". O app envia o histórico mensal por categoria e a API:"])
numbered([
    "Agrega os dados por mês-calendário (uma linha por mês: alimentos, higiene, limpeza);",
    ["Normaliza com ", CD("StandardScaler"), " — passo obrigatório, pois as categorias têm escalas diferentes (alimentos ~90/mês, higiene ~53, limpeza ~30); sem normalizar, alimentos dominariam o agrupamento;"],
    ["Treina o ", CD("KMeans"), " (n_init=10, random_state=42);"],
    "Identifica a qual cluster o mês atual pertence e devolve uma descrição legível.",
])
para(body, ["Requisito mínimo: ", B("6 meses"), " de histórico. Com menos, a API responde ", CD("suficiente: false"), " e o app não exibe sugestão. O resultado aparece como card azul na Lista de Necessidades e na mensagem do WhatsApp — ", B("nunca"), " menciona \"K-Means\" ou \"cluster\"."])
para(h4, "Como foi treinado")
para(body, ["O K-Means é ", B("treinado sob demanda"), " a cada chamada (não há arquivo de modelo salvo). O script ", CD("ml/treinar_kmeans.py"), " demonstra e valida o fluxo que a API replica:"])
numbered([
    "Carrega o dataset de doações mensais e o \"pivota\" para uma linha por mês;",
    ["Normaliza com ", CD("StandardScaler"), ";"],
    [B("Escolhe o melhor número de grupos (k)"), " testando de 2 a 6 clusters e comparando duas métricas: ", B("inércia"), " (método do cotovelo) e ", B("silhouette"), " (quão bem separados estão os grupos — quanto mais perto de 1, melhor). Escolhe o k de maior silhouette;"],
    "Treina o modelo final e interpreta cada cluster automaticamente, em linguagem simples.",
])
para(small, "Na prática, a API recebe os dados atuais do Firestore como entrada e treina na hora — por isso os agrupamentos refletem sempre o histórico mais recente.")

para(h3, "6.3 Regressão Linear — previsão de fim de estoque")
para(body, [FD("O que é: "), "algoritmo que ajusta uma ", B("reta"), " a um conjunto de pontos para descrever uma tendência. A inclinação da reta indica a velocidade com que algo cresce ou diminui."])
para(body, [FD("Para que serve no app: "), "dado o histórico de saídas de um produto, estima a ", B("taxa de consumo diária"), " e calcula em quantos dias o estoque vai acabar."])
para(body, [FD("Como está implementada: "), "endpoint ", CD("POST /prever-fim-estoque"), ". A API ordena as saídas por data, monta o ", B("consumo acumulado"), " ao longo do tempo e ajusta uma ", CD("LinearRegression"), ":"])
pre_block(
"""consumo_acumulado  ~  taxa_diaria x dias + intercepto
dias_restantes     =  estoque_atual / taxa_diaria""")
para(body, ["O coeficiente ", B("R²"), " (de 0 a 1) mede a qualidade do ajuste — quão bem a reta representa o consumo real. Requisito mínimo: ", B("3 eventos de saída"), "; com menos, responde ", CD("suficiente: false"), ". A previsão aparece nos detalhes do produto como \"Deve acabar em ~X dias\", sempre em linguagem natural."])
para(h4, "Como foi treinado")
para(body, ["Também é ", B("treinada sob demanda"), " a cada chamada. O script ", CD("ml/treinar_regressao.py"), " demonstra o método: para cada produto, converte as datas em índices de dia (X) e calcula o consumo acumulado (y); ajusta a reta; o coeficiente angular vira a taxa de consumo. Usar o consumo ", B("acumulado"), " (em vez de eventos isolados) torna a estimativa mais estável, suavizando saídas irregulares."])

para(h3, "Resumo dos três algoritmos")
table("t_ml_resumo", [3.5, 4.0, 5.0, 4.0],
    ["Algoritmo", "Tipo", "Para que serve", "Treino"],
    [
      [[B("Árvore de Decisão")], "Classificação supervisionada", "Risco de validade do lote", [CD(".joblib"), " offline, 800 exemplos"]],
      [[B("K-Means")], "Clusterização não supervisionada", "Padrões sazonais de doação", "Sob demanda, a cada chamada"],
      [[B("Regressão Linear")], "Regressão supervisionada", "Dias até o estoque zerar", "Sob demanda, a cada chamada"],
    ])

# 7. Dados
para(h2, "7. Estrutura de dados (Firestore)")
para(body, "O banco tem quatro coleções principais:")
table("t_dados", [3.5, 13.0],
    ["Coleção", "Principais campos"],
    [
      [[B("produtos")], [CD("nome"), ", ", CD("emoji"), ", ", CD("fotoUrl"), ", ", CD("categoria"), ", ", CD("ean"), ", ", CD("conteudo"), ", ", CD("mediaConsumoDias"), " (calculado), ", CD("ocultarNecessidades"), ", ", CD("criadoEm")]],
      [[B("lotes")], [CD("produtoId"), ", ", CD("codigo"), ", ", CD("validade"), ", ", CD("quantidade"), ", ", CD("quantidadeInicial"), ", ", CD("risco"), " (resultado da IA, nulo offline), ", CD("criadoEm")]],
      [[B("movimentacoes")], [CD("tipo"), " (entrada/saida/descarte), ", CD("produtoId"), ", ", CD("loteId"), ", ", CD("quantidade"), ", ", CD("data"), ", ", CD("observacao"), ", ", CD("criadoEm")]],
      [[B("categorias")], [CD("nome"), ", ", CD("palavrasChave"), " (mapeiam categorias das APIs externas), ", CD("ordem")]],
    ])
para(h3, "Resiliência offline")
para(body, ["Sem internet: o Firestore salva localmente e sincroniza ao reconectar; o lote é gravado com ", CD("risco: null"), " e o componente ", B("ReclassificadorOffline"), " reenvia automaticamente os lotes pendentes para a IA classificar assim que a conexão volta. A barra \"modo offline\" avisa a usuária."])

# 8. Resumo
para(h2, "8. Resumo rápido para a apresentação")
table("t_faq", [5.0, 11.5],
    ["Pergunta provável", "Resposta curta"],
    [
      ["Qual a stack do app?", "React Native 0.81 + Expo SDK 54 + Expo Router + TypeScript. Roda em Android, iOS e Web com o mesmo código."],
      ["Onde ficam os dados?", "No Cloud Firestore (Firebase), banco NoSQL em tempo real com suporte offline."],
      ["Como é o login?", "Firebase Authentication: Google, e-mail/senha, recuperação de senha e modo visitante."],
      ["Onde ficam as fotos?", "No Cloudinary; o Firestore guarda só a URL."],
      ["Onde roda a IA?", "Numa API Python (FastAPI + scikit-learn) hospedada no Hugging Face Spaces."],
      ["Quais algoritmos de ML?", "Árvore de Decisão (risco de validade), K-Means (padrões de doação) e Regressão Linear (previsão de fim de estoque)."],
      ["Como o scanner preenche o produto?", "Lê o código de barras com a câmera e busca em cache, depois Cosmos (Brasil) e Open Food Facts (global)."],
      ["Funciona sem internet?", "Sim. Os dados sincronizam depois e os lotes são reclassificados pela IA ao reconectar."],
    ])
para(small, "Documento gerado para a equipe do Projeto Integrador · App Casa da Criança v1.0.0. As variáveis sensíveis (token da Cosmos) ficam no arquivo .env.local, fora do controle de versão.")

doc.save(OUT)
print("OK:", OUT)
