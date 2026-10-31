// ============================================
//  ENXAME v3 - sobrevivência em ondas (p5.js)
//  Jogue com a tela DEITADA: analógico à esquerda, habilidade à direita.
//  Escolha personagem, nível (estilo Geometry Dash) e bioma no menu.
// ============================================

// ---------- CONFIGURAÇÃO (edite aqui) ----------
const CONFIG = {
  chavePix: "ba4f78da-dd87-44c5-a166-a3dd3cae71f5", // o botão "Apoiar" copia essa chave
  linkApoio: "https://SEU-LINK-DE-APOIO-AQUI",      // usado só se a chavePix estiver vazia ou começar com "SUA-"
  mostrarApoio: true,         // coloque false na versão para portais de jogos (Poki, CrazyGames...)
  anuncioACada: 3,            // anúncio de tela cheia a cada X partidas
  segundosParaContinuar: 20,  // tempo mínimo de partida para oferecer "continuar vendo anúncio"
  moedasIniciais: 40,         // moedas que o jogador ganha na primeira vez
  desbloquearTudo: false,     // true = libera todos os personagens e níveis (para testar)
};

// Gancho de anúncios: defina window.chamarAnuncio no index.html com o SDK que usar.
// tipo: "intersticial" ou "recompensado". Chame aoTerminar() quando o anúncio acabar.
function mostrarAnuncio(tipo, aoTerminar) {
  if (window.chamarAnuncio) window.chamarAnuncio(tipo, aoTerminar);
  else aoTerminar(); // sem SDK ainda: segue o jogo normalmente
}

// ---------- Dados do jogo ----------
const CH = 380;    // tamanho de cada "pedaço" do mapa (obstáculos são gerados por pedaço)
const TILE = 512;  // tamanho da textura do chão

const TIPOS = {
  besouro:  { r: 13, hp: 26,   vel: 60,  dano: 8,  xp: 1,  corpo: [128, 66, 40],  brilho: [196, 124, 84],  pata: [52, 32, 24],  sangue: [150, 172, 62] },
  aranha:   { r: 10, hp: 14,   vel: 108, dano: 6,  xp: 1,  corpo: [58, 48, 62],   brilho: [112, 98, 120],  pata: [30, 26, 34],  sangue: [128, 64, 64] },
  blindado: { r: 22, hp: 100,  vel: 40,  dano: 14, xp: 3,  corpo: [72, 108, 112], brilho: [140, 176, 172],  pata: [38, 54, 56],  sangue: [96, 154, 122] },
  rainha:   { r: 50, hp: 1500, vel: 46,  dano: 24, xp: 25, corpo: [134, 46, 46],  brilho: [196, 106, 86],  pata: [64, 22, 22],  sangue: [176, 124, 44] },
};

const MELHORIAS = [
  { id: "cad", nome: "Disparo Rápido",     desc: "+25% de velocidade de tiro",        cor: [226, 176, 60],  max: 8,  aplicar: () => { st.cadencia *= 1.25; } },
  { id: "dan", nome: "Mais Dano",          desc: "+30% de dano nos tiros",            cor: [206, 78, 62],   max: 10, aplicar: () => { st.dano *= 1.3; } },
  { id: "mul", nome: "Tiro Múltiplo",      desc: "+1 projétil a cada disparo",        cor: [92, 156, 190],  max: 4,  aplicar: () => { st.multi += 1; } },
  { id: "per", nome: "Perfuração",         desc: "Tiros atravessam +1 inimigo",       cor: [154, 118, 190], max: 4,  aplicar: () => { st.perfura += 1; } },
  { id: "vel", nome: "Botas Velozes",      desc: "+12% de velocidade de movimento",   cor: [110, 176, 100], max: 5,  aplicar: () => { st.vel *= 1.12; } },
  { id: "ima", nome: "Ímã de Cristais",    desc: "Atrai cristais de mais longe",      cor: [90, 178, 168],  max: 4,  aplicar: () => { st.ima *= 1.5; } },
  { id: "vid", nome: "Vida Extra",         desc: "+30 de vida máxima e cura 50",      cor: [214, 90, 98],   max: 6,  aplicar: () => { st.hpMax += 30; st.hp = Math.min(st.hpMax, st.hp + 50); } },
  { id: "lam", nome: "Lâminas Giratórias", desc: "Lâminas orbitam e cortam inimigos", cor: [214, 140, 60],  max: 6,  aplicar: () => { st.laminas += 1; } },
  { id: "reg", nome: "Regeneração",        desc: "Recupera vida aos poucos",          cor: [132, 190, 120], max: 5,  aplicar: () => { st.regen += 0.7; } },
];
const CURA = { id: "cura", nome: "Cura Total", desc: "Recupera toda a sua vida", cor: [132, 190, 120], max: 999, aplicar: () => { st.hp = st.hpMax; } };

const DICAS = [
  "Atire nos barris vermelhos: a explosão derrota vários bichos de uma vez!",
  "Pedras e caixotes bloqueiam os tiros, mas também seguram os bichos. Use-os como proteção.",
  "Entre as ondas, todos os cristais voam até você. Fique perto para não perder nada.",
  "Cercado? Lâminas Giratórias protegem você dos lados.",
  "A Rainha aparece a cada 5 ondas. Mantenha-se em movimento e atire de longe.",
  "Cuidado com a explosão dos barris: ela também machuca você se estiver perto.",
];

// ---------- Seleções do menu ----------
const BIOMAS = [
  { id: "floresta", nome: "Floresta", desc: "Muitas árvores e pedras.\nÓtima para se proteger.",
    base: [100, 122, 62], fundo: [70, 88, 46], atrito: 16, velInim: 1,
    dens: [0.3, 0.7, 0.93], pesos: [0.36, 0.30, 0.18, 0.16],
    paleta: [[106, 128, 64], [80, 100, 50], [114, 126, 66], [90, 110, 54], [126, 114, 72], [72, 92, 52]],
    terra: [132, 108, 74], lam: [[62, 92, 40], [118, 140, 70], [150, 130, 70]], pedra: [138, 130, 116], poeira: [196, 178, 138],
    rocha: { f: [102, 96, 88], s: [56, 50, 44], h: [150, 144, 132] },
    luz: "rgba(255,200,120,0.09)", meio: "rgba(30,20,28,0.08)", borda: "rgba(14,8,12,0.5)" },
  { id: "savana", nome: "Savana", desc: "Campo aberto, poucas árvores.\nBichos 10% mais rápidos.",
    base: [196, 164, 86], fundo: [160, 128, 62], atrito: 16, velInim: 1.1,
    dens: [0.46, 0.8, 0.96], pesos: [0.28, 0.28, 0.12, 0.32],
    paleta: [[204, 172, 92], [182, 150, 76], [212, 182, 104], [170, 138, 66], [188, 120, 70], [150, 126, 62]],
    terra: [166, 104, 62], lam: [[150, 120, 50], [222, 192, 104], [124, 102, 42]], pedra: [150, 130, 104], poeira: [214, 180, 120],
    rocha: { f: [150, 124, 92], s: [84, 62, 40], h: [196, 170, 130] },
    luz: "rgba(255,170,70,0.14)", meio: "rgba(60,24,10,0.06)", borda: "rgba(46,16,8,0.5)" },
  { id: "deserto", nome: "Deserto", desc: "Cactos e muitos barris.\nUse as explosões!",
    base: [224, 192, 124], fundo: [190, 160, 96], atrito: 12, velInim: 1,
    dens: [0.44, 0.8, 0.95], pesos: [0.28, 0.2, 0.1, 0.42],
    paleta: [[232, 202, 138], [212, 178, 108], [238, 212, 150], [200, 166, 96], [220, 170, 100], [226, 196, 130]],
    terra: [190, 140, 86], lam: [[190, 150, 90], [240, 214, 150], [170, 130, 76]], pedra: [170, 140, 100], poeira: [232, 204, 150],
    rocha: { f: [196, 140, 92], s: [120, 78, 44], h: [232, 184, 130] },
    luz: "rgba(255,226,140,0.16)", meio: "rgba(90,50,10,0.05)", borda: "rgba(70,30,6,0.42)" },
  { id: "neve", nome: "Montanha Gelada", desc: "Chão escorregadio.\nBichos 10% mais lentos.",
    base: [214, 226, 238], fundo: [170, 190, 210], atrito: 3.2, velInim: 0.9,
    dens: [0.3, 0.68, 0.93], pesos: [0.38, 0.3, 0.14, 0.18],
    paleta: [[226, 236, 246], [196, 212, 230], [236, 242, 250], [186, 204, 226], [208, 222, 240], [176, 196, 220]],
    terra: [168, 182, 200], lam: [[110, 100, 90], [150, 140, 120], [90, 90, 96]], pedra: [140, 150, 166], poeira: [230, 240, 250],
    rocha: { f: [120, 130, 146], s: [60, 68, 84], h: [176, 188, 206] },
    luz: "rgba(210,232,255,0.10)", meio: "rgba(20,30,60,0.03)", borda: "rgba(10,20,48,0.32)" },
];

const PERSONAGENS = [
  { id: "soldado", nome: "Soldado", preco: 0, hab: null, cd: 0,
    desc: "Equilibrado e confiável.\nNão tem habilidade especial.",
    cor: { jaq: [66, 88, 60], br: [88, 114, 78], cha: [112, 76, 46], cha2: [134, 94, 58], aba: [92, 60, 36], moc: [92, 70, 44] }, bonus: () => {} },
  { id: "cacador", nome: "Caçador", preco: 120, hab: "dash", habNome: "Rolamento", cd: 4,
    desc: "Rola para a frente e fica\ninvencível por um instante.\n+10% de velocidade.",
    cor: { jaq: [128, 52, 44], br: [170, 84, 70], cha: [60, 46, 36], cha2: [86, 66, 50], aba: [44, 32, 26], moc: [70, 50, 36] }, bonus: (s) => { s.vel *= 1.1; } },
  { id: "bombardeira", nome: "Bombardeira", preco: 250, hab: "granada", habNome: "Granada", cd: 7,
    desc: "Lança uma granada que\nexplode e atinge vários\nbichos de uma vez.",
    cor: { jaq: [60, 62, 74], br: [90, 94, 110], cha: [214, 112, 40], cha2: [240, 146, 60], aba: [150, 70, 24], moc: [50, 50, 58] }, bonus: (s) => { s.hpMax = 105; } },
  { id: "medica", nome: "Médica", preco: 400, hab: "cura", habNome: "Curativo", cd: 18,
    desc: "Cura 45% da vida e fica\nprotegida por 1 segundo.\n+15% de vida máxima.",
    cor: { jaq: [226, 228, 226], br: [250, 250, 248], cha: [200, 70, 74], cha2: [226, 100, 104], aba: [150, 40, 46], moc: [120, 150, 130] }, marca: "cruz", bonus: (s) => { s.hpMax = 115; s.regen = 0.4; } },
  { id: "engenheiro", nome: "Engenheiro", preco: 600, hab: "torreta", habNome: "Torreta", cd: 14,
    desc: "Instala uma torreta que\natira sozinha por 10 s.",
    cor: { jaq: [196, 140, 40], br: [234, 180, 70], cha: [230, 200, 50], cha2: [250, 226, 90], aba: [176, 140, 24], moc: [90, 76, 56] }, bonus: (s) => { s.hpMax = 110; } },
  { id: "atirador", nome: "Atirador", preco: 850, hab: "rajada", habNome: "Rajada", cd: 16,
    desc: "Rajada: atira muito mais\nrápido por 4 segundos.\n+Alcance e dano.",
    cor: { jaq: [74, 80, 58], br: [104, 112, 80], cha: [58, 66, 46], cha2: [80, 90, 64], aba: [40, 46, 32], moc: [60, 60, 44] }, bonus: (s) => { s.alcance = 400; s.dano *= 1.15; s.cadencia *= 0.92; } },
];

// Níveis estilo Geometry Dash: cada um tem ondas, dificuldade e recompensa
const NIVEIS = [
  { nome: "Primeiros Passos", dif: "FÁCIL", tier: 0, ondas: 3, q: 0.7, v: 0.9, h: 0.75, d: 0.7, rampa: 1, bonus: 30, cor: [110, 190, 230] },
  { nome: "Trilha do Besouro", dif: "NORMAL", tier: 1, ondas: 5, q: 0.9, v: 1, h: 1, d: 0.9, rampa: 1, bonus: 50, cor: [120, 200, 100] },
  { nome: "Ninho Escuro", dif: "DIFÍCIL", tier: 2, ondas: 6, q: 1.05, v: 1.05, h: 1.2, d: 1.05, rampa: 1, bonus: 80, cor: [232, 200, 70] },
  { nome: "Fúria da Colmeia", dif: "MUITO DIFÍCIL", tier: 3, ondas: 8, q: 1.25, v: 1.12, h: 1.5, d: 1.25, rampa: 1, bonus: 120, cor: [240, 150, 60] },
  { nome: "Pesadelo", dif: "INSANO", tier: 4, ondas: 10, q: 1.45, v: 1.18, h: 1.9, d: 1.4, rampa: 0.95, bonus: 180, cor: [240, 90, 130] },
  { nome: "Rainha Suprema", dif: "DEMÔNIO", tier: 5, ondas: 12, q: 1.7, v: 1.25, h: 2.5, d: 1.6, rampa: 0.95, bonus: 300, cor: [170, 80, 220] },
  { nome: "Modo Infinito", dif: "SEM FIM", tier: -1, inf: true, ondas: 0, q: 1, v: 1, h: 1, d: 1, rampa: 1, bonus: 0, cor: [230, 180, 60] },
];

// ---------- Estado ----------
let estado = "menu"; // menu | jogando | upgrade | pausa | fim | vitoria
let jogador, st;
let inimigos = [], tiros = [], gemas = [], particulas = [], textos = [], manchas = [], efeitos = [], menuBichos = [];
let torretas = [], granadas = [], flocos = [];
let cam = { x: 0, y: 0 };
let tempo = 0, abates = 0, nivel = 1, xp = 0, xpProx = 5, pendentes = 0;
let pegos = {}, opcoes = [];
let onda = 0, ondaFase = "pausa", pausaT = 2.5, aSpawnar = 0, spawnT = 0, nChefes = 0, restoT = 0, furia = false, furia2 = false, furia3 = false, ondaTotalInim = 1;
let chunks = new Map(), destruidos = new Set(), podaT = 0;
let tileImg = null;
let tremor = 0, flashDano = 0;
let aviso = { txt: "", ate: 0 };
let dicaFim = DICAS[0];
let novoRecorde = false, partidas = 0, usouContinuar = false;
let zoom = 1, ui = 1;
let joy = { ativo: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let toqueConhecido = {};
let ultimoClique = 0;
let avisoPix = 0;
let usouTeclado = false;
let somLigado = true, audioCtx = null, ultimoSom = 0;
let save = { moedas: 0, donos: ["soldado"], niveis: {}, p: 0, n: 0, b: 0, recorde: 0 };
let PA = PERSONAGENS[0], NA = NIVEIS[0], BA = BIOMAS[0];
let habCd = 0, habMax = 1, rajadaT = 0;
let ganho = 0, dobrou = false, estrelasGanhas = 0, pctFinal = 0, primeiraVez = false, tempoFim = 0;
let colMenu = 0, tentouTela = false;
const tiles = {};

// ---------- Setup ----------
function setup() {
  pixelDensity(Math.min(1.5, window.devicePixelRatio || 1));
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 1);
  textFont("Trebuchet MS");
  carregar();
  ajustar();
  aplicarSelecao();
  resetarMundo();
  iniciarMenuBichos();
  try {
    document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });
  } catch (e) {}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  ajustar();
}

function ajustar() {
  const m = Math.min(width, height);
  zoom = constrain(m / 460, 0.7, 1.6);
  ui = constrain(m / 450, 0.7, 1.8);
}

function statsIniciais() {
  const s = { hpMax: 100, hp: 100, vel: 150, dano: 12, cadencia: 2.4, multi: 1, perfura: 0, alcance: 340, ima: 80, laminas: 0, regen: 0 };
  if (PA && PA.bonus) PA.bonus(s);
  s.hp = s.hpMax;
  return s;
}

function resetarMundo() {
  jogador = { x: 0, y: 0, r: 14, dir: 0, mira: 0, cd: 0, inv: 0, ang: 0, passo: 0, flash: 0, vx: 0, vy: 0, dashT: 0, dashDir: 0 };
  st = statsIniciais();
  inimigos = []; tiros = []; gemas = []; particulas = []; textos = []; manchas = []; efeitos = []; menuBichos = [];
  torretas = []; granadas = [];
  chunks = new Map(); destruidos = new Set();
  cam.x = 0; cam.y = 0;
  tempo = 0; abates = 0; nivel = 1; xp = 0; xpProx = 5; pendentes = 0;
  pegos = {}; opcoes = [];
  onda = 0; ondaFase = "pausa"; pausaT = 3; aSpawnar = 0; spawnT = 0; nChefes = 0; restoT = 0; furia = false; furia2 = false; furia3 = false;
  tremor = 0; flashDano = 0;
  habCd = 0; rajadaT = 0;
  joy.ativo = false;
}

function novaPartida() {
  if (!podeJogar()) return;
  aplicarSelecao();
  resetarMundo();
  jogador.inv = 1;
  usouContinuar = false;
  novoRecorde = false;
  ganho = 0; dobrou = false; estrelasGanhas = 0; pctFinal = 0;
  estado = "jogando";
  mostrarAviso(NA.inf ? "PREPARE-SE..." : "NÍVEL " + (save.n + 1) + ": " + NA.nome.toUpperCase(), 2600);
}

// ---------- Chão (textura gerada por código) ----------
function criarTile(bio) {
  const pg = createGraphics(TILE, TILE);
  pg.pixelDensity(1);
  pg.colorMode(RGB, 255, 255, 255, 1);
  pg.noStroke();
  pg.background(bio.base[0], bio.base[1], bio.base[2]);
  let seed = 20261029 + bio.id.length * 977;
  const R = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const emb = (fn) => { for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) fn(ox, oy); };

  for (let i = 0; i < 240; i++) {
    const x = R() * TILE, y = R() * TILE;
    const w = (26 + R() * 70) * (1 + R() * 0.4), h = (26 + R() * 70) * (0.7 + R() * 0.4);
    const c = bio.paleta[Math.floor(R() * bio.paleta.length)];
    pg.fill(c[0], c[1], c[2], 0.14 + R() * 0.14);
    emb((ox, oy) => pg.ellipse(x + ox, y + oy, w, h));
  }
  for (let i = 0; i < 14; i++) {
    const x = R() * TILE, y = R() * TILE, w = 50 + R() * 80, h = 30 + R() * 50;
    pg.fill(bio.terra[0], bio.terra[1], bio.terra[2], 0.2 + R() * 0.1);
    emb((ox, oy) => pg.ellipse(x + ox, y + oy, w, h));
  }

  if (bio.id === "floresta" || bio.id === "savana") {
    pg.strokeWeight(1.3);
    const n = bio.id === "savana" ? 2200 : 2600;
    for (let i = 0; i < n; i++) {
      const x = R() * TILE, y = R() * TILE, len = (bio.id === "savana" ? 6 : 4) + R() * 6, k = R();
      const c = bio.lam[k < 0.5 ? 0 : k < 0.85 ? 1 : 2];
      pg.stroke(c[0] + (R() - 0.3) * 30, c[1] + (R() - 0.3) * 36, c[2] + (R() - 0.3) * 20, 0.5);
      pg.line(x, y, x + (R() - 0.5) * 4, y - len);
    }
  } else if (bio.id === "deserto") {
    pg.noFill();
    pg.strokeWeight(1.6);
    for (let i = 0; i < 110; i++) { // ondulações de areia
      const x = R() * TILE, y = R() * TILE, len = 30 + R() * 50, claro = R() < 0.5;
      pg.stroke(claro ? 248 : 176, claro ? 226 : 134, claro ? 170 : 80, 0.3);
      for (const oy of [-TILE, 0, TILE]) {
        pg.beginShape();
        for (let k = 0; k <= 4; k++) pg.vertex(x + (k / 4) * len, y + oy + Math.sin(k * 1.3 + x) * 3);
        pg.endShape();
      }
    }
    pg.strokeWeight(1);
    for (let i = 0; i < 700; i++) { // grãos
      const x = R() * TILE, y = R() * TILE;
      pg.stroke(R() < 0.5 ? 190 : 250, R() < 0.5 ? 150 : 230, 100, 0.35);
      pg.point(x, y);
    }
  } else {
    pg.strokeWeight(1.2);
    for (let i = 0; i < 34; i++) { // rachaduras no gelo
      let x = R() * TILE, y = R() * TILE, a = R() * TWO_PI;
      pg.stroke(130, 160, 196, 0.32);
      for (let k = 0; k < 4; k++) {
        const nx = x + Math.cos(a) * (10 + R() * 14), ny = y + Math.sin(a) * (10 + R() * 14);
        pg.line(x, y, nx, ny);
        x = nx; y = ny; a += (R() - 0.5) * 1.2;
      }
    }
    pg.noStroke();
    for (let i = 0; i < 260; i++) { // brilhos de neve
      pg.fill(255, 255, 255, 0.5 + R() * 0.4);
      pg.circle(R() * TILE, R() * TILE, 1 + R() * 2);
    }
    pg.strokeWeight(1.2);
    for (let i = 0; i < 36; i++) { // gravetos
      const x = R() * TILE, y = R() * TILE, c = bio.lam[Math.floor(R() * 3)];
      pg.stroke(c[0], c[1], c[2], 0.55);
      pg.line(x, y, x + (R() - 0.5) * 6, y - 5 - R() * 5);
    }
  }
  pg.noStroke();
  for (let i = 0; i < 44; i++) {
    const x = R() * TILE, y = R() * TILE, s = 3 + R() * 4, p = bio.pedra;
    pg.fill(40, 36, 26, 0.22); pg.ellipse(x + 1.5, y + 2, s * 1.6, s * 1.1);
    pg.fill(p[0], p[1], p[2], 0.95); pg.ellipse(x, y, s * 1.5, s * 1.1);
    pg.fill(Math.min(255, p[0] + 40), Math.min(255, p[1] + 40), Math.min(255, p[2] + 40), 0.8); pg.ellipse(x - s * 0.2, y - s * 0.2, s * 0.8, s * 0.5);
  }
  pg.fill(255, 196, 120, 0.05);
  pg.rect(0, 0, TILE, TILE);
  return pg;
}

// ---------- Mapa infinito: obstáculos por pedaço ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chunk(cx, cy) {
  const k = cx + "," + cy;
  let c = chunks.get(k);
  if (c) return c;
  const R = mulberry32((Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263) ^ 0x5bd1e995) >>> 0);
  c = { obs: [], decor: [] };
  const roll = R();
  const n = roll < BA.dens[0] ? 0 : roll < BA.dens[1] ? 1 : roll < BA.dens[2] ? 2 : 3;
  const p = BA.pesos;
  for (let i = 0; i < n; i++) {
    const x = cx * CH + 30 + R() * (CH - 60), y = cy * CH + 30 + R() * (CH - 60);
    const t = R();
    const tipo = t < p[0] ? "arvore" : t < p[0] + p[1] ? "pedra" : t < p[0] + p[1] + p[2] ? "caixote" : "barril";
    const id = k + ":" + i;
    const o = criarObstaculo(R, tipo, x, y, id);
    if (Math.hypot(x, y) < 170 + o.r) continue;
    if (tipo === "barril" && destruidos.has(id)) continue;
    if (c.obs.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + o.r + 28)) continue;
    c.obs.push(o);
  }
  for (let i = 0; i < 16; i++) c.decor.push({ x: cx * CH + R() * CH, y: cy * CH + R() * CH, t: Math.floor(R() * 4), c: R() });
  chunks.set(k, c);
  return c;
}

function criarObstaculo(R, tipo, x, y, id) {
  if (tipo === "arvore") {
    const v = BA.id;
    if (v === "floresta") {
      const blobs = [];
      for (let i = 0; i < 5; i++) {
        const a = R() * TWO_PI, d = R() * 20;
        blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 24 + R() * 14, outono: R() < 0.28 });
      }
      return { tipo, x, y, r: 21, id, blobs, v };
    }
    if (v === "savana") {
      const blobs = [];
      for (let i = 0; i < 4; i++) blobs.push({ dx: (i - 1.5) * 15 + R() * 6, dy: (R() - 0.5) * 12, rx: 20 + R() * 8, ry: 12 + R() * 6 });
      return { tipo, x, y, r: 19, id, blobs, v };
    }
    if (v === "deserto") return { tipo, x, y, r: 16, id, v, bracos: [R() * TWO_PI, R() * TWO_PI + Math.PI] };
    return { tipo, x, y, r: 20, id, v, rot: R() * TWO_PI };
  }
  if (tipo === "pedra") {
    const r = 22 + R() * 16, pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i * TWO_PI) / 9, rr = r * (0.82 + R() * 0.26);
      pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    }
    return { tipo, x, y, r, id, pts };
  }
  if (tipo === "caixote") return { tipo, x, y, r: 18, id, rot: R() * 0.6 - 0.3 };
  return { tipo: "barril", x, y, r: 13, id, hp: 30, hpMax: 30 };
}

function obstaculosPerto(x, y, raio, fn) {
  const c0 = Math.floor((x - raio) / CH), c1 = Math.floor((x + raio) / CH);
  const r0 = Math.floor((y - raio) / CH), r1 = Math.floor((y + raio) / CH);
  for (let cx = c0; cx <= c1; cx++) {
    for (let cy = r0; cy <= r1; cy++) {
      for (const o of chunk(cx, cy).obs) if (!o.morto) fn(o);
    }
  }
}

function dentroDeObstaculo(x, y, r) {
  let achou = false;
  obstaculosPerto(x, y, r + 60, (o) => { if (Math.hypot(x - o.x, y - o.y) < r + o.r) achou = true; });
  return achou;
}

function empurrar(ent) {
  obstaculosPerto(ent.x, ent.y, ent.r + 60, (o) => {
    const dx = ent.x - o.x, dy = ent.y - o.y;
    const d = Math.hypot(dx, dy) || 0.001, m = ent.r + o.r;
    if (d < m) { ent.x += (dx / d) * (m - d); ent.y += (dy / d) * (m - d); }
  });
}

// Bichos que batem num obstáculo deslizam para o lado até contorná-lo
function empurrarInimigo(e, dt) {
  obstaculosPerto(e.x, e.y, e.r + 60, (o) => {
    const dx = e.x - o.x, dy = e.y - o.y;
    const d = Math.hypot(dx, dy) || 0.001, m = e.r + o.r + 1;
    if (d < m) {
      const nx = dx / d, ny = dy / d, lado = e.desvio >= 0 ? 1 : -1;
      e.x += nx * (m - d) - ny * lado * e.vel * 0.8 * dt;
      e.y += ny * (m - d) + nx * lado * e.vel * 0.8 * dt;
    }
  });
}

function podarMapa() {
  for (const [k, c] of chunks) {
    const [cx, cy] = k.split(",").map(Number);
    if (Math.hypot((cx + 0.5) * CH - cam.x, (cy + 0.5) * CH - cam.y) > 2600) chunks.delete(k);
  }
}

// ---------- Loop principal ----------
function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);
  if (precisaGirar() && estado === "jogando") pausar();

  if (estado === "jogando") atualizar(dt);
  else if (estado === "menu") atualizarMenu(dt);
  else if (estado === "fim" || estado === "vitoria") { tempoFim += dt; atualizarEfeitos(dt); }
  atualizarFlocos(dt);
  tremor *= Math.exp(-12 * dt);

  background(BA.fundo[0], BA.fundo[1], BA.fundo[2]);
  desenharMundo();
  desenharAtmosfera();
  desenharFlocos();
  desenharHUD();
  desenharTelas();
  desenharBotoesTopo();
  desenharAvisoPix();
  if (precisaGirar()) desenharGire();
}

// ---------- Menu ----------
function iniciarMenuBichos() {
  menuBichos = [];
  const tipos = ["besouro", "besouro", "aranha", "blindado", "besouro", "aranha", "besouro"];
  for (const tipo of tipos) {
    const b = { tipo, r: TIPOS[tipo].r, vel: TIPOS[tipo].vel * 0.8, flash: 0, anim: random(10), dir: 0, x: 0, y: 0 };
    reposicionarBicho(b, true);
    menuBichos.push(b);
  }
}

function reposicionarBicho(b, dentro) {
  const a = random(TWO_PI), d = dentro ? random(60, 420) : 460;
  b.x = cam.x + Math.cos(a) * d;
  b.y = cam.y + Math.sin(a) * d;
  b.dir = a + Math.PI + random(-0.6, 0.6);
}

function atualizarMenu(dt) {
  cam.x += 22 * dt;
  cam.y += 8 * dt;
  for (const b of menuBichos) {
    b.x += Math.cos(b.dir) * b.vel * dt;
    b.y += Math.sin(b.dir) * b.vel * dt;
    b.anim += dt * b.vel * 0.09;
    if (Math.hypot(b.x - cam.x, b.y - cam.y) > 520) reposicionarBicho(b, false);
  }
  atualizarEfeitos(dt);
}

// ---------- Atualização do jogo ----------
function atualizar(dt) {
  tempo += dt;
  habCd = Math.max(0, habCd - dt);
  rajadaT = Math.max(0, rajadaT - dt);

  const [dx, dy] = direcaoMov();
  const k0 = 1 - Math.exp(-BA.atrito * dt);
  jogador.vx += (dx * st.vel - jogador.vx) * k0;
  jogador.vy += (dy * st.vel - jogador.vy) * k0;
  if (jogador.dashT > 0) {
    jogador.dashT -= dt;
    jogador.x += Math.cos(jogador.dashDir) * 700 * dt;
    jogador.y += Math.sin(jogador.dashDir) * 700 * dt;
    poeira(jogador.x, jogador.y, BA.poeira, 1);
  } else {
    jogador.x += jogador.vx * dt;
    jogador.y += jogador.vy * dt;
  }
  if (dx || dy) { jogador.dir = Math.atan2(dy, dx); jogador.passo += dt * 11; }
  empurrar(jogador);
  jogador.inv = Math.max(0, jogador.inv - dt);
  jogador.flash = Math.max(0, jogador.flash - dt);
  st.hp = Math.min(st.hpMax, st.hp + st.regen * dt);
  const k = 1 - Math.exp(-8 * dt);
  cam.x += (jogador.x - cam.x) * k;
  cam.y += (jogador.y - cam.y) * k;

  atualizarOndas(dt);
  atirar(dt);
  atualizarTorretas(dt);
  atualizarGranadas(dt);
  moverTiros(dt);
  moverInimigos(dt);
  atualizarLaminas(dt);
  colisoesTiros();
  atualizarGemas(dt);
  atualizarEfeitos(dt);
  if (estado !== "jogando") return;

  inimigos = inimigos.filter((e) => !e.morto);
  tiros = tiros.filter((b) => b.vida > 0);
  gemas = gemas.filter((g) => !g.morta);

  podaT += dt;
  if (podaT > 6) { podaT = 0; podarMapa(); }
}

function direcaoMov() {
  let dx = 0, dy = 0;
  if (joy.ativo) {
    const vx = joy.x - joy.ox, vy = joy.y - joy.oy;
    const R = 70 * ui;
    const d = Math.hypot(vx, vy);
    if (d > 6) {
      const m = Math.min(d, R) / R;
      dx = (vx / d) * m;
      dy = (vy / d) * m;
    }
  } else {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) dx -= 1;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) dy -= 1;
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) dy += 1;
    if (dx || dy) {
      usouTeclado = true;
      const m = Math.hypot(dx, dy);
      dx /= m; dy /= m;
    }
  }
  return [dx, dy];
}

// ---------- Ondas ----------
function atualizarOndas(dt) {
  if (ondaFase === "pausa") {
    pausaT -= dt;
    if (pausaT <= 0) iniciarOnda();
    return;
  }
  spawnT -= dt;
  const ef = ondaEf();
  const cap = Math.round(Math.min(14 + ef * 2, 40) * Math.sqrt(NA.q));
  if (aSpawnar > 0 && spawnT <= 0 && inimigos.length < cap) {
    const grupo = 1 + (ef >= 6 ? 1 : 0) + (ef >= 11 ? 1 : 0);
    for (let i = 0; i < grupo && aSpawnar > 0 && inimigos.length < cap; i++) {
      criarInimigo(sortearTipo());
      aSpawnar--;
    }
    spawnT = Math.max(0.6, 1.2 - ef * 0.04);
  }
  if (aSpawnar <= 0 && inimigos.length === 0) terminarOnda();
  else if (aSpawnar <= 0) {
    restoT += dt;
    if (restoT > 18 && !furia) {
      furia = true;
      for (const e of inimigos) if (e.tipo !== "rainha") e.vel *= 1.7;
    }
    if (restoT > 40 && !furia2) {
      furia2 = true;
      for (const e of inimigos) if (e.tipo !== "rainha") e.vel *= 1.5;
    }
    if (restoT > 60 && !furia3) {
      furia3 = true; // a Rainha também vem atrás de você
      for (const e of inimigos) e.vel *= 1.5;
    }
  }
}

function iniciarOnda() {
  onda++;
  ondaFase = "ativa";
  const ef = ondaEf();
  const chefe = ondaDeChefe(onda);
  aSpawnar = Math.max(3, Math.round((chefe ? 4 + ef * 2 : 6 + ef * 3.5) * NA.q));
  ondaTotalInim = aSpawnar + (chefe ? 1 : 0);
  restoT = 0;
  furia = false;
  furia2 = false;
  furia3 = false;
  spawnT = 0.6;
  const final = !NA.inf && onda === NA.ondas;
  mostrarAviso(final ? "ONDA FINAL!" : "ONDA " + onda, 2200);
  if (chefe) {
    criarInimigo("rainha");
    nChefes++;
    mostrarAviso(final ? "A RAINHA SUPREMA!" : "A RAINHA CHEGOU!", 2600);
    tremor = Math.max(tremor, 8);
    tocar("chefe");
  }
}

function terminarOnda() {
  if (!NA.inf && onda >= NA.ondas) { vitoria(); return; }
  ondaFase = "pausa";
  pausaT = 4.5;
  st.hp = Math.min(st.hpMax, st.hp + st.hpMax * 0.15);
  for (const g of gemas) g.puxar = true;
  mostrarAviso("ONDA " + onda + " COMPLETA!", 2400);
  tocar("onda");
}

function sortearTipo() {
  const ef = ondaEf();
  const r = Math.random();
  const pB = ef >= 4 ? 0.18 : 0, pA = ef >= 2 ? 0.25 : 0;
  if (r < pB) return "blindado";
  if (r < pB + pA) return "aranha";
  return "besouro";
}

// ---------- Inimigos ----------
function posBorda() {
  const a = random(TWO_PI);
  const hw = width / 2 / zoom + 50, hh = height / 2 / zoom + 50;
  const t = 1 / Math.max(Math.abs(Math.cos(a)) / hw, Math.abs(Math.sin(a)) / hh);
  let ox = Math.cos(a) * t, oy = Math.sin(a) * t;
  const d = Math.hypot(ox, oy);
  if (d > 520) { ox *= 520 / d; oy *= 520 / d; }
  return { x: jogador.x + ox, y: jogador.y + oy };
}

function criarInimigo(tipo) {
  const T = TIPOS[tipo];
  let p = posBorda();
  for (let i = 0; i < 6 && dentroDeObstaculo(p.x, p.y, T.r); i++) p = posBorda();
  const ef = ondaEf();
  let mult = (1 + (ef - 1) * 0.22) * NA.h * (tipo === "rainha" ? 1 + nChefes * 0.6 : 1);
  if (tipo === "rainha" && !NA.inf) mult = (1 + (ef - 1) * 0.12) * NA.h * (1 + nChefes * 0.4);
  inimigos.push({
    tipo, x: p.x, y: p.y, r: T.r,
    hp: T.hp * mult, hpMax: T.hp * mult,
    vel: T.vel * (1 + Math.min((ef - 1) * 0.025, 0.4)) * NA.v * BA.velInim * random(0.92, 1.08),
    dano: Math.max(1, Math.round(T.dano * (1 + (ef - 1) * 0.05) * NA.d)), xp: T.xp,
    desvio: random(-0.5, 0.5), dir: 0, anim: random(10),
    flash: 0, idade: 0, lamCd: 0, kx: 0, ky: 0, morto: false,
  });
}

function girar(a, b, t) {
  const d = ((((b - a + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
  return a + d * Math.min(1, t);
}

function moverInimigos(dt) {
  for (const e of inimigos) {
    e.idade += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.lamCd -= dt;
    const dx = jogador.x - e.x, dy = jogador.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    if (d > 800) { // ficou longe demais: reaparece na borda
      const p = posBorda();
      e.x = p.x; e.y = p.y;
      continue;
    }

    const ang = Math.atan2(dy, dx) + e.desvio * Math.min(1, d / 220);
    const vx = Math.cos(ang) * e.vel + e.kx;
    const vy = Math.sin(ang) * e.vel + e.ky;
    e.x += vx * dt;
    e.y += vy * dt;
    const f = Math.exp(-8 * dt);
    e.kx *= f; e.ky *= f;
    e.dir = girar(e.dir, Math.atan2(vy, vx), 10 * dt);
    e.anim += dt * e.vel * 0.09;
    empurrarInimigo(e, dt);

    if (e.idade > 0.4 && jogador.inv <= 0 && d < e.r + jogador.r) ferir(e.dano);
  }
  // separação: bichos não se empilham
  for (let i = 0; i < inimigos.length; i++) {
    const a = inimigos[i];
    for (let j = i + 1; j < inimigos.length; j++) {
      const b = inimigos[j];
      const dx = b.x - a.x, dy = b.y - a.y, m = (a.r + b.r) * 0.9;
      if (Math.abs(dx) > m || Math.abs(dy) > m) continue;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < m) {
        const p = (m - d) / 2;
        a.x -= (dx / d) * p; a.y -= (dy / d) * p;
        b.x += (dx / d) * p; b.y += (dy / d) * p;
      }
    }
  }
}

// ---------- Tiros ----------
function atirar(dt) {
  jogador.cd = Math.max(0, jogador.cd - dt);

  let alvo = null, melhor = st.alcance * st.alcance;
  for (const e of inimigos) {
    if (e.morto || e.idade < 0.2) continue;
    const d2 = (e.x - jogador.x) ** 2 + (e.y - jogador.y) ** 2;
    if (d2 < melhor) { melhor = d2; alvo = e; }
  }
  if (!alvo) { jogador.mira = girar(jogador.mira, jogador.dir, 8 * dt); return; }

  const base = Math.atan2(alvo.y - jogador.y, alvo.x - jogador.x);
  jogador.mira = girar(jogador.mira, base, 18 * dt);
  if (jogador.cd > 0) return;

  const raj = rajadaT > 0;
  const multi = st.multi + (raj ? 2 : 0);
  for (let i = 0; i < multi; i++) {
    const ang = base + (i - (multi - 1) / 2) * 0.17;
    tiros.push({
      x: jogador.x + Math.cos(ang) * 30, y: jogador.y + Math.sin(ang) * 30,
      vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
      vida: 0.8, perf: st.perfura, hits: [], dano: st.dano,
    });
  }
  jogador.flash = 0.06;
  jogador.cd = 1 / (st.cadencia * (raj ? 2.4 : 1));
}

function moverTiros(dt) {
  for (const b of tiros) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vida -= dt;
    // obstáculos bloqueiam os tiros
    obstaculosPerto(b.x, b.y, 40, (o) => {
      if (b.vida <= 0) return;
      if (Math.hypot(b.x - o.x, b.y - o.y) < o.r + 3) {
        b.vida = 0;
        poeira(b.x, b.y, o.tipo === "barril" ? [200, 90, 60] : [196, 178, 138], 4);
        if (o.tipo === "barril") danoBarril(o, b.dano);
      }
    });
  }
}

function colisoesTiros() {
  for (const b of tiros) {
    if (b.vida <= 0) continue;
    for (const e of inimigos) {
      if (e.morto || b.hits.includes(e)) continue;
      const rr = e.r + 4;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy < rr * rr) {
        causarDano(e, b.dano, b.vx, b.vy);
        b.hits.push(e);
        if (b.perf > 0) b.perf--;
        else { b.vida = 0; break; }
      }
    }
  }
}

function atualizarLaminas(dt) {
  if (!st.laminas) return;
  jogador.ang += 3.2 * dt;
  for (let i = 0; i < st.laminas; i++) {
    const a = jogador.ang + (i * TWO_PI) / st.laminas;
    const bx = jogador.x + Math.cos(a) * 62;
    const by = jogador.y + Math.sin(a) * 62;
    for (const e of inimigos) {
      if (e.morto || e.lamCd > 0) continue;
      const rr = e.r + 9;
      const dx = e.x - bx, dy = e.y - by;
      if (dx * dx + dy * dy < rr * rr) {
        e.lamCd = 0.35;
        causarDano(e, st.dano * 0.7, Math.cos(a + HALF_PI), Math.sin(a + HALF_PI));
      }
    }
  }
}

function causarDano(e, d, vx, vy) {
  e.hp -= d;
  e.flash = 0.08;
  const m = Math.hypot(vx, vy) || 1;
  const kb = e.tipo === "rainha" ? 30 : e.tipo === "blindado" ? 90 : 160;
  e.kx += (vx / m) * kb;
  e.ky += (vy / m) * kb;
  if (textos.length < 25) textos.push({ x: e.x + random(-6, 6), y: e.y - e.r, txt: Math.round(d), vida: 0.5 });
  if (e.hp <= 0 && !e.morto) matar(e);
}

function matar(e) {
  e.morto = true;
  abates++;
  const T = TIPOS[e.tipo];
  explosaoCor(e.x, e.y, T.sangue, e.tipo === "rainha" ? 40 : 8);
  if (manchas.length < 70) {
    manchas.push({
      x: e.x, y: e.y, cor: T.sangue, vida: 9, max: 9,
      bl: [0, 1, 2].map(() => ({ dx: random(-0.6, 0.6) * e.r, dy: random(-0.6, 0.6) * e.r, r: e.r * random(0.5, 1.0) })),
    });
  }
  if (e.tipo === "rainha") {
    for (let i = 0; i < 10; i++) gemas.push({ x: e.x + random(-30, 30), y: e.y + random(-30, 30), v: 3, tipo: "xp", vel: 200 });
    gemas.push({ x: e.x, y: e.y, v: 60, tipo: "vida", vel: 200 });
    tremor = Math.max(tremor, 10);
    mostrarAviso("RAINHA DERROTADA!", 2400);
  } else {
    if (gemas.length > 150) ganharXP(e.xp);
    else gemas.push({ x: e.x, y: e.y, v: e.xp, tipo: "xp", vel: 200 });
    if (Math.random() < 0.02 && gemas.length < 150) gemas.push({ x: e.x + 8, y: e.y, v: 20, tipo: "vida", vel: 200 });
  }
  tocar("abate");
}

// ---------- Barris explosivos ----------
function danoBarril(o, d) {
  if (o.morto) return;
  o.hp -= d;
  if (o.hp <= 0) explodirBarril(o);
}

function explodirBarril(o) {
  if (o.morto) return;
  o.morto = true;
  destruidos.add(o.id);
  explosaoGrande(o.x, o.y);
}

function explosaoGrande(x, y, amiga, dano) {
  const raio = amiga ? 125 : 115;
  efeitos.push({ x, y, t: 0, dur: 0.5 });
  tremor = Math.max(tremor, 9);
  tocar("explosao");
  for (let i = 0; i < 26; i++) {
    const a = random(TWO_PI), v = random(40, 300), vida = random(0.4, 0.9);
    const quente = Math.random() < 0.55;
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, max: vida, cor: quente ? [255, 150 + random(0, 70), 50] : [70, 64, 58], t: random(5, 11) });
  }
  for (const e of inimigos) {
    if (e.morto) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
    if (d < raio + e.r) causarDano(e, dano || 90, dx || 1, dy || 0);
  }
  if (!amiga && Math.hypot(jogador.x - x, jogador.y - y) < 95 && jogador.inv <= 0) ferir(18);
  obstaculosPerto(x, y, 130, (o) => {
    if (o.tipo === "barril" && Math.hypot(o.x - x, o.y - y) < 120) setTimeout(() => danoBarril(o, 60), 120);
  });
}

// ---------- Dano no jogador ----------
function ferir(d) {
  if (estado !== "jogando") return;
  st.hp -= d;
  jogador.inv = 0.6;
  tremor = Math.max(tremor, 6);
  flashDano = 0.25;
  poeira(jogador.x, jogador.y, [196, 60, 52], 8);
  tocar("dano");
  if (st.hp <= 0) morrer();
}

function pontuacao() {
  return abates * 10 + Math.max(0, onda - 1) * 100;
}

function morrer() {
  st.hp = 0;
  estado = "fim";
  tempoFim = 0;
  partidas++;
  tremor = 14;
  joy.ativo = false;
  dicaFim = DICAS[Math.floor(Math.random() * DICAS.length)];
  aviso.ate = 0;
  explosaoCor(jogador.x, jogador.y, [214, 168, 128], 30);
  tocar("morte");
  ganho = moedasDaPartida();
  save.moedas += ganho;
  if (NA.inf) {
    const pts = pontuacao();
    if (pts > save.recorde) { save.recorde = pts; novoRecorde = true; }
  } else {
    pctFinal = pctNivel();
    const r = save.niveis[save.n] || (save.niveis[save.n] = { pct: 0, completo: false, estrelas: 0 });
    r.pct = Math.max(r.pct || 0, pctFinal);
  }
  salvar();
}

function continuarPartida() {
  usouContinuar = true;
  save.moedas = Math.max(0, save.moedas - ganho);
  ganho = 0;
  salvar();
  st.hp = st.hpMax * 0.6;
  jogador.inv = 2.5;
  for (const e of inimigos) {
    if (e.morto) continue;
    const d = Math.hypot(e.x - jogador.x, e.y - jogador.y);
    if (d < 320) {
      if (e.tipo === "rainha") {
        e.kx += ((e.x - jogador.x) / (d || 1)) * 600;
        e.ky += ((e.y - jogador.y) / (d || 1)) * 600;
      } else {
        e.morto = true;
        explosaoCor(e.x, e.y, TIPOS[e.tipo].sangue, 4);
      }
    }
  }
  inimigos = inimigos.filter((e) => !e.morto);
  estado = "jogando";
  tocar("nivel");
}

// ---------- Cristais, XP e melhorias ----------
function atualizarGemas(dt) {
  for (const g of gemas) {
    const dx = jogador.x - g.x, dy = jogador.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < st.ima) g.puxar = true;
    if (g.puxar) {
      g.vel += 700 * dt;
      g.x += (dx / d) * g.vel * dt;
      g.y += (dy / d) * g.vel * dt;
    }
    if (d < jogador.r + 8) coletar(g);
  }
}

function coletar(g) {
  if (g.morta) return;
  g.morta = true;
  if (g.tipo === "xp") ganharXP(g.v);
  else {
    st.hp = Math.min(st.hpMax, st.hp + g.v);
    textos.push({ x: jogador.x, y: jogador.y - 20, txt: "+" + g.v + " vida", vida: 0.9 });
  }
}

function ganharXP(v) {
  xp += v;
  while (xp >= xpProx) {
    xp -= xpProx;
    nivel++;
    xpProx = Math.round(4 + nivel * 2.5);
    pendentes++;
  }
  if (pendentes > 0 && estado === "jogando") abrirMelhorias();
}

function abrirMelhorias() {
  pendentes--;
  let pool = MELHORIAS.filter((m) => (pegos[m.id] || 0) < m.max);
  pool.sort(() => Math.random() - 0.5);
  opcoes = pool.slice(0, 3);
  while (opcoes.length < 3) opcoes.push(CURA);
  estado = "upgrade";
  joy.ativo = false;
  tocar("nivel");
}

function escolher(i) {
  const m = opcoes[i];
  if (!m) return;
  m.aplicar();
  pegos[m.id] = (pegos[m.id] || 0) + 1;
  jogador.inv = Math.max(jogador.inv, 1);
  estado = "jogando";
  if (pendentes > 0) abrirMelhorias();
}

// ---------- Efeitos ----------
function explosaoCor(x, y, cor, qtd) {
  for (let i = 0; i < qtd && particulas.length < 350; i++) {
    const a = random(TWO_PI), v = random(40, 240), vida = random(0.3, 0.7);
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, max: vida, cor, t: random(3, 7) });
  }
}

function poeira(x, y, cor, qtd) {
  for (let i = 0; i < qtd && particulas.length < 350; i++) {
    const a = random(TWO_PI), v = random(20, 110), vida = random(0.25, 0.5);
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, max: vida, cor, t: random(2, 5) });
  }
}

function atualizarEfeitos(dt) {
  for (const p of particulas) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-3 * dt);
    p.vy *= Math.exp(-3 * dt);
    p.vida -= dt;
  }
  particulas = particulas.filter((p) => p.vida > 0);
  for (const t of textos) { t.y -= 30 * dt; t.vida -= dt; }
  textos = textos.filter((t) => t.vida > 0);
  for (const m of manchas) m.vida -= dt;
  manchas = manchas.filter((m) => m.vida > 0);
  for (const f of efeitos) f.t += dt;
  efeitos = efeitos.filter((f) => f.t < f.dur);
  flashDano = Math.max(0, flashDano - dt);
}

function mostrarAviso(txt, dur) {
  aviso = { txt, ate: millis() + (dur || 2200) };
}

// ---------- Som (WebAudio simples, sem arquivos) ----------
function iniciarAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
}

function bip(freq, dur, tipo, vol, ate) {
  if (!somLigado || !audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(Math.max(30, ate), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch (e) {}
}

function tocar(nome) {
  const t = millis();
  if (nome === "abate") {
    if (t - ultimoSom < 70) return;
    ultimoSom = t;
    bip(260 + random(0, 120), 0.09, "triangle", 0.05, 90);
  } else if (nome === "dano") bip(150, 0.2, "sawtooth", 0.05, 60);
  else if (nome === "nivel") {
    bip(440, 0.12, "triangle", 0.06);
    setTimeout(() => bip(660, 0.12, "triangle", 0.06), 110);
    setTimeout(() => bip(880, 0.18, "triangle", 0.06), 220);
  } else if (nome === "onda") {
    bip(392, 0.14, "triangle", 0.05);
    setTimeout(() => bip(523, 0.2, "triangle", 0.05), 130);
  } else if (nome === "explosao") bip(130, 0.4, "sawtooth", 0.08, 35);
  else if (nome === "chefe") bip(90, 0.5, "sawtooth", 0.07, 40);
  else if (nome === "morte") bip(300, 0.7, "sawtooth", 0.07, 40);
  else if (nome === "dash") bip(220, 0.18, "sine", 0.07, 700);
  else if (nome === "granada") bip(500, 0.25, "square", 0.04, 180);
  else if (nome === "cura") { bip(520, 0.15, "sine", 0.06); setTimeout(() => bip(780, 0.25, "sine", 0.06), 120); }
  else if (nome === "torreta") bip(180, 0.2, "square", 0.05, 360);
  else if (nome === "rajada") bip(300, 0.3, "sawtooth", 0.05, 900);
}

function alternarSom() {
  somLigado = !somLigado;
  try { localStorage.setItem("enxameSom", somLigado ? "1" : "0"); } catch (e) {}
}

// ---------- Desenho do mundo ----------
function desenharMundo() {
  push();
  translate(width / 2, height / 2);
  scale(zoom);
  const sx = tremor > 0.3 ? random(-tremor, tremor) : 0;
  const sy = tremor > 0.3 ? random(-tremor, tremor) : 0;
  translate(-cam.x + sx, -cam.y + sy);
  rectMode(CORNER);

  const hw = width / 2 / zoom + 80, hh = height / 2 / zoom + 80;
  const vis = { x0: cam.x - hw, x1: cam.x + hw, y0: cam.y - hh, y1: cam.y + hh };

  desenharChao(vis);
  const cs = visiveis(vis);
  for (const c of cs) desenharDecor(c);
  desenharManchas();
  for (const c of cs) for (const o of c.obs) if (!o.morto) desenharObstaculo(o);
  desenharGemas();
  desenharTorretas();
  for (const b of menuBichos) desenharBicho(b, 1);
  for (const e of inimigos) desenharBicho(e, Math.min(1, e.idade / 0.4));
  for (const e of inimigos) desenharBarraVida(e);
  if (estado !== "menu") {
    desenharLaminas();
    desenharJogador();
  }
  desenharGranadas();
  desenharTiros();
  desenharEfeitos();
  desenharParticulas();
  desenharTextos();
  pop();

  if (flashDano > 0) {
    noStroke();
    fill(190, 30, 24, flashDano * 0.9);
    rect(0, 0, width, height);
  }
}

function visiveis(v) {
  const out = [];
  for (let cx = Math.floor(v.x0 / CH); cx <= Math.floor(v.x1 / CH); cx++) {
    for (let cy = Math.floor(v.y0 / CH); cy <= Math.floor(v.y1 / CH); cy++) out.push(chunk(cx, cy));
  }
  return out;
}

function desenharChao(v) {
  const x0 = Math.floor(v.x0 / TILE) * TILE, y0 = Math.floor(v.y0 / TILE) * TILE;
  for (let x = x0; x < v.x1; x += TILE) for (let y = y0; y < v.y1; y += TILE) image(tileImg, x, y, TILE + 1, TILE + 1);
}

function desenharDecor(c) {
  const v = BA.id;
  for (const d of c.decor) {
    noStroke();
    if (v === "floresta") {
      if (d.t === 0) {
        stroke(58, 86, 40, 0.8); strokeWeight(1.6);
        line(d.x, d.y, d.x - 4, d.y - 8); line(d.x, d.y, d.x, d.y - 10); line(d.x, d.y, d.x + 4, d.y - 8);
      } else if (d.t === 1) {
        const cores = [[236, 224, 190], [226, 170, 70], [200, 110, 120]];
        const cc = cores[Math.floor(d.c * 3)];
        fill(cc[0], cc[1], cc[2], 0.95); circle(d.x, d.y, 5);
        fill(250, 210, 90); circle(d.x, d.y, 2);
      } else if (d.t === 2) {
        fill(40, 36, 26, 0.22); ellipse(d.x + 1, d.y + 2, 9, 5);
        fill(136, 128, 114); ellipse(d.x, d.y, 8, 5.5);
      } else { fill(176, 108, 48, 0.85); ellipse(d.x, d.y, 8, 4); }
    } else if (v === "savana") {
      if (d.t === 0) {
        stroke(138, 106, 40, 0.9); strokeWeight(1.6);
        line(d.x, d.y, d.x - 5, d.y - 12); line(d.x, d.y, d.x - 1, d.y - 15); line(d.x, d.y, d.x + 5, d.y - 11);
      } else if (d.t === 1) {
        stroke(226, 196, 110, 0.9); strokeWeight(1.4);
        line(d.x, d.y, d.x + 2, d.y - 10); line(d.x + 4, d.y, d.x + 6, d.y - 8);
      } else if (d.t === 2) {
        fill(60, 36, 20, 0.22); ellipse(d.x + 1, d.y + 2, 9, 5);
        fill(156, 130, 100); ellipse(d.x, d.y, 8, 5.5);
      } else { fill(120, 84, 44, 0.7); ellipse(d.x, d.y, 10, 4); }
    } else if (v === "deserto") {
      if (d.t === 0) {
        noFill(); stroke(196, 150, 90, 0.5); strokeWeight(1.5);
        line(d.x - 8, d.y, d.x - 3, d.y - 2); line(d.x - 3, d.y - 2, d.x + 3, d.y); line(d.x + 3, d.y, d.x + 8, d.y - 2);
      } else if (d.t === 1) {
        fill(80, 50, 20, 0.2); ellipse(d.x + 1, d.y + 2, 9, 5);
        fill(176, 146, 106); ellipse(d.x, d.y, 8, 5.5);
      } else if (d.t === 2) {
        stroke(248, 244, 230, 0.95); strokeWeight(2.4);
        line(d.x - 6, d.y, d.x + 6, d.y);
        noStroke(); fill(248, 244, 230);
        circle(d.x - 6, d.y - 1.5, 3); circle(d.x - 6, d.y + 1.5, 3); circle(d.x + 6, d.y - 1.5, 3); circle(d.x + 6, d.y + 1.5, 3);
      } else {
        stroke(120, 80, 40, 0.5); strokeWeight(1.2);
        line(d.x - 6, d.y, d.x - 2, d.y - 3); line(d.x - 2, d.y - 3, d.x + 2, d.y + 1); line(d.x + 2, d.y + 1, d.x + 7, d.y - 2);
      }
    } else {
      if (d.t === 0) {
        fill(176, 214, 244, 0.9); stroke(120, 166, 210); strokeWeight(1);
        quad(d.x, d.y - 7, d.x + 4, d.y, d.x, d.y + 7, d.x - 4, d.y);
      } else if (d.t === 1) {
        stroke(96, 86, 76, 0.9); strokeWeight(1.4);
        line(d.x, d.y, d.x - 4, d.y - 8); line(d.x, d.y, d.x + 4, d.y - 7);
        noStroke(); fill(255, 255, 255, 0.95); ellipse(d.x, d.y + 1, 10, 4);
      } else if (d.t === 2) {
        fill(60, 70, 96, 0.2); ellipse(d.x + 1, d.y + 2, 9, 5);
        fill(150, 160, 176); ellipse(d.x, d.y, 8, 5.5);
        fill(255, 255, 255, 0.95); ellipse(d.x - 1, d.y - 1.5, 6, 2.6);
      } else {
        fill(130, 156, 190, 0.5); ellipse(d.x, d.y, 5, 3); ellipse(d.x + 7, d.y - 3, 5, 3);
      }
    }
  }
  noStroke();
}

function desenharManchas() {
  noStroke();
  for (const m of manchas) {
    const a = Math.min(1, m.vida / 3) * 0.55;
    fill(m.cor[0] * 0.7, m.cor[1] * 0.7, m.cor[2] * 0.7, a);
    for (const b of m.bl) ellipse(m.x + b.dx, m.y + b.dy, b.r * 2, b.r * 1.5);
  }
}

function desenharObstaculo(o) {
  noStroke();
  const R = BA.rocha;
  if (o.tipo === "arvore") {
    if (o.v === "floresta") {
      fill(10, 20, 8, 0.28);
      for (const b of o.blobs) ellipse(o.x + b.dx + 16, o.y + b.dy + 20, b.r * 2, b.r * 1.5);
      for (const b of o.blobs) { fill(32, 58, 36); circle(o.x + b.dx, o.y + b.dy, b.r * 2); }
      for (const b of o.blobs) { if (b.outono) fill(150, 92, 40); else fill(48, 88, 46); circle(o.x + b.dx - 2, o.y + b.dy - 3, b.r * 1.7); }
      for (const b of o.blobs) { if (b.outono) fill(198, 138, 62, 0.85); else fill(88, 132, 64, 0.85); circle(o.x + b.dx - b.r * 0.28, o.y + b.dy - b.r * 0.3, b.r * 0.9); }
    } else if (o.v === "savana") { // acácia: copa achatada
      fill(40, 24, 10, 0.26);
      for (const b of o.blobs) ellipse(o.x + b.dx + 12, o.y + b.dy + 18, b.rx * 2, b.ry * 2);
      stroke(74, 52, 30); strokeWeight(4);
      line(o.x, o.y + 6, o.x - 2, o.y - 4);
      noStroke();
      for (const b of o.blobs) { fill(70, 84, 38); ellipse(o.x + b.dx, o.y + b.dy, b.rx * 2, b.ry * 2); }
      for (const b of o.blobs) { fill(104, 122, 52); ellipse(o.x + b.dx - 2, o.y + b.dy - 2, b.rx * 1.6, b.ry * 1.5); }
      for (const b of o.blobs) { fill(150, 160, 78, 0.8); ellipse(o.x + b.dx - 4, o.y + b.dy - 4, b.rx * 0.9, b.ry * 0.7); }
    } else if (o.v === "deserto") { // cacto visto de cima
      fill(40, 24, 8, 0.26); ellipse(o.x + 6, o.y + 11, 46, 22);
      for (const a of o.bracos) {
        const bx = o.x + Math.cos(a) * 17, by = o.y + Math.sin(a) * 17;
        fill(40, 96, 52); circle(bx, by, 17);
        fill(70, 140, 80); circle(bx - 1, by - 1, 12);
      }
      fill(40, 96, 52); stroke(24, 64, 34); strokeWeight(2); circle(o.x, o.y, 34);
      noStroke(); fill(66, 134, 76); circle(o.x - 1, o.y - 1, 28);
      stroke(40, 100, 54, 0.9); strokeWeight(1.5);
      for (let i = 0; i < 8; i++) { const a = (i * TWO_PI) / 8; line(o.x + Math.cos(a) * 5, o.y + Math.sin(a) * 5, o.x + Math.cos(a) * 14, o.y + Math.sin(a) * 14); }
      noStroke(); fill(230, 226, 190);
      for (let i = 0; i < 8; i++) { const a = (i * TWO_PI) / 8 + 0.4; circle(o.x + Math.cos(a) * 13, o.y + Math.sin(a) * 13, 2); }
      fill(232, 110, 150); circle(o.x, o.y, 8);
      fill(250, 206, 110); circle(o.x, o.y, 3.5);
    } else { // pinheiro nevado visto de cima
      fill(10, 24, 50, 0.26); ellipse(o.x + 10, o.y + 16, 54, 24);
      const camadas = [[27, [22, 56, 50]], [20, [36, 84, 66]], [13, [58, 112, 84]]];
      for (const [rad, cor] of camadas) {
        fill(cor[0], cor[1], cor[2]);
        beginShape();
        for (let i = 0; i < 12; i++) { const a = o.rot + (i * TWO_PI) / 12, rr = i % 2 === 0 ? rad : rad * 0.58; vertex(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); }
        endShape(CLOSE);
      }
      fill(255, 255, 255, 0.9);
      for (let i = 0; i < 5; i++) { const a = o.rot + i * 1.26; ellipse(o.x + Math.cos(a) * 15, o.y + Math.sin(a) * 15, 10, 6); }
      circle(o.x, o.y, 8);
    }
  } else if (o.tipo === "pedra") {
    fill(20, 18, 10, 0.3);
    ellipse(o.x + 8, o.y + o.r * 0.55, o.r * 2.2, o.r * 1.3);
    fill(R.f[0], R.f[1], R.f[2]); stroke(R.s[0], R.s[1], R.s[2]); strokeWeight(2);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x, o.y + p.y); endShape(CLOSE);
    noStroke();
    fill(R.h[0], R.h[1], R.h[2], 0.85);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x * 0.62 - o.r * 0.12, o.y + p.y * 0.62 - o.r * 0.14); endShape(CLOSE);
    fill(R.s[0], R.s[1], R.s[2], 0.4);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x * 0.5 + o.r * 0.28, o.y + p.y * 0.5 + o.r * 0.3); endShape(CLOSE);
    stroke(R.s[0], R.s[1], R.s[2], 0.7); strokeWeight(1.5);
    line(o.x - o.r * 0.1, o.y - o.r * 0.1, o.x + o.r * 0.25, o.y + o.r * 0.25);
    noStroke();
    if (BA.id === "neve") { fill(255, 255, 255, 0.92); ellipse(o.x - o.r * 0.18, o.y - o.r * 0.3, o.r * 1.15, o.r * 0.7); }
  } else if (o.tipo === "caixote") {
    push();
    translate(o.x, o.y);
    rotate(o.rot);
    const s = o.r * 2;
    fill(14, 12, 6, 0.3); rect(-s / 2 + 5, -s / 2 + 7, s, s, 3);
    fill(172, 122, 64); stroke(86, 58, 30); strokeWeight(3);
    rect(-s / 2, -s / 2, s, s, 3);
    stroke(120, 82, 42); strokeWeight(2);
    line(-s / 2, 0, s / 2, 0); line(0, -s / 2, 0, s / 2);
    stroke(206, 160, 98, 0.8); strokeWeight(1.5);
    line(-s / 2 + 3, -s / 2 + 3, s / 2 - 3, -s / 2 + 3);
    noStroke(); fill(70, 50, 28);
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) circle(px * (s / 2 - 5), py * (s / 2 - 5), 3);
    if (BA.id === "neve") { fill(255, 255, 255, 0.92); rect(-s / 2 - 1, -s / 2 - 2, s + 2, 7, 3); }
    pop();
  } else {
    fill(14, 12, 6, 0.3); ellipse(o.x + 4, o.y + 7, o.r * 2.4, o.r * 1.7);
    const dano = o.hp < o.hpMax;
    fill(dano ? 190 : 168, 52, 40); stroke(72, 24, 18); strokeWeight(2.5);
    circle(o.x, o.y, o.r * 2);
    noFill(); stroke(112, 36, 28); strokeWeight(2);
    circle(o.x, o.y, o.r * 1.5);
    noStroke(); fill(204, 74, 54);
    circle(o.x, o.y, o.r * 1.1);
    fill(244, 200, 72);
    triangle(o.x, o.y - o.r * 0.45, o.x - o.r * 0.42, o.y + o.r * 0.32, o.x + o.r * 0.42, o.y + o.r * 0.32);
    fill(80, 24, 18);
    rect(o.x - 0.8, o.y - o.r * 0.12, 1.6, o.r * 0.28);
    circle(o.x, o.y + o.r * 0.2, 1.8);
  }
  noStroke();
}

function desenharGemas() {
  noStroke();
  for (const g of gemas) {
    if (g.tipo === "xp") {
      push();
      translate(g.x, g.y);
      fill(14, 12, 6, 0.25); ellipse(2, 5, 11, 6);
      rotate(Math.sin(frameCount * 0.06 + g.x) * 0.3);
      fill(226, 164, 48); stroke(142, 92, 22); strokeWeight(1.5);
      quad(0, -8, 6, 0, 0, 8, -6, 0);
      noStroke(); fill(252, 224, 130);
      triangle(0, -8, 6, 0, 0, 0);
      fill(255, 246, 200, 0.9); circle(-1.5, -2.5, 2.5);
      pop();
    } else {
      fill(14, 12, 6, 0.25); ellipse(g.x + 2, g.y + 6, 14, 6);
      fill(212, 64, 64); stroke(120, 28, 30); strokeWeight(1.5);
      circle(g.x - 3.5, g.y - 2, 9); circle(g.x + 3.5, g.y - 2, 9);
      triangle(g.x - 7.5, g.y, g.x + 7.5, g.y, g.x, g.y + 9);
      noStroke(); fill(255, 190, 190, 0.8); circle(g.x - 4.5, g.y - 3.5, 3);
    }
  }
  noStroke();
}

function desenharBicho(e, alfa) {
  const T = TIPOS[e.tipo], r = e.r;
  const a = alfa;
  const flash = e.flash > 0;
  push();
  translate(e.x, e.y);
  noStroke();
  fill(10, 14, 6, 0.28 * a);
  ellipse(4, 7, r * 2.3, r * 1.6);
  rotate(e.dir);

  // patas
  stroke(T.pata[0], T.pata[1], T.pata[2], a);
  strokeWeight(Math.max(1.5, r * 0.12));
  const pares = e.tipo === "aranha" ? 4 : 3;
  const comp = e.tipo === "aranha" ? 1.5 : 1.08;
  for (let i = 0; i < pares; i++) {
    const bx = (i - (pares - 1) / 2) * r * 0.55;
    const sw = Math.sin(e.anim + i * 1.7) * r * 0.32;
    line(bx, -r * 0.4, bx + sw, -r * comp);
    line(bx, r * 0.4, bx - sw, r * comp);
  }
  // antenas
  line(r * 1.15, -r * 0.15, r * 1.7, -r * 0.55);
  line(r * 1.15, r * 0.15, r * 1.7, r * 0.55);
  noStroke();

  const cor = flash ? [255, 255, 255] : T.corpo;
  const cor2 = flash ? [255, 255, 255] : T.brilho;
  const esc = [Math.max(0, cor[0] - 40), Math.max(0, cor[1] - 40), Math.max(0, cor[2] - 40)];

  if (e.tipo === "aranha") {
    fill(cor[0], cor[1], cor[2], a); ellipse(-r * 0.55, 0, r * 1.3, r * 1.1);
    fill(esc[0], esc[1], esc[2], a); ellipse(r * 0.45, 0, r * 0.95, r * 0.85);
    fill(cor2[0], cor2[1], cor2[2], 0.55 * a); ellipse(-r * 0.7, -r * 0.2, r * 0.7, r * 0.4);
    fill(196, 70, 54, a); circle(-r * 0.55, 0, r * 0.3); // marca no abdômen
  } else if (e.tipo === "rainha") {
    fill(cor[0], cor[1], cor[2], a); ellipse(-r * 0.4, 0, r * 1.7, r * 1.45);
    fill(cor2[0], cor2[1], cor2[2], 0.5 * a); ellipse(-r * 0.55, -r * 0.25, r * 1.1, r * 0.55);
    fill(226, 176, 60, a);
    circle(-r * 0.85, -r * 0.3, r * 0.22); circle(-r * 0.85, r * 0.3, r * 0.22); circle(-r * 0.45, 0, r * 0.26);
    fill(esc[0], esc[1], esc[2], a); ellipse(r * 0.6, 0, r * 1.0, r * 1.0);
    fill(226, 176, 60, a); // coroa
    triangle(r * 0.55, -r * 0.5, r * 0.75, -r * 0.2, r * 0.4, -r * 0.25);
    triangle(r * 0.55, r * 0.5, r * 0.75, r * 0.2, r * 0.4, r * 0.25);
    triangle(r * 0.95, -r * 0.1, r * 1.15, 0, r * 0.95, r * 0.1);
  } else {
    const k = e.tipo === "blindado" ? 1.05 : 1;
    fill(cor[0], cor[1], cor[2], a); ellipse(-r * 0.1, 0, r * 2 * k, r * 1.65 * k);
    fill(cor2[0], cor2[1], cor2[2], 0.5 * a); ellipse(-r * 0.25, -r * 0.3, r * 1.2, r * 0.5);
    stroke(esc[0], esc[1], esc[2], a); strokeWeight(Math.max(1.2, r * 0.08));
    line(-r * 0.95, 0, r * 0.5, 0);
    if (e.tipo === "blindado") { line(-r * 0.5, -r * 0.7, -r * 0.5, r * 0.7); line(r * 0.1, -r * 0.7, r * 0.1, r * 0.7); }
    noStroke();
    fill(esc[0], esc[1], esc[2], a); ellipse(r * 0.95, 0, r * 0.78, r * 0.72);
    if (e.tipo === "blindado") { // mandíbulas
      fill(206, 196, 168, a);
      triangle(r * 1.25, -r * 0.1, r * 1.65, -r * 0.4, r * 1.3, -r * 0.4);
      triangle(r * 1.25, r * 0.1, r * 1.65, r * 0.4, r * 1.3, r * 0.4);
    }
  }
  // olhos
  fill(250, 240, 200, a); circle(r * 1.05, -r * 0.2, r * 0.26); circle(r * 1.05, r * 0.2, r * 0.26);
  fill(30, 20, 16, a); circle(r * 1.1, -r * 0.2, r * 0.12); circle(r * 1.1, r * 0.2, r * 0.12);
  pop();
}

function desenharBarraVida(e) {
  if ((e.tipo !== "rainha" && e.tipo !== "blindado") || e.hp >= e.hpMax) return;
  const w = e.r * 2, k = Math.max(0, e.hp / e.hpMax);
  noStroke();
  fill(20, 14, 10, 0.7); rect(e.x - w / 2, e.y - e.r - 12, w, 5, 2);
  fill(210, 70, 56); rect(e.x - w / 2, e.y - e.r - 12, w * k, 5, 2);
}

function desenharTiros() {
  strokeCap(ROUND);
  for (const b of tiros) {
    stroke(255, 214, 120, 0.9);
    strokeWeight(3);
    line(b.x, b.y, b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    noStroke();
    fill(255, 244, 206);
    circle(b.x, b.y, 5);
  }
  noStroke();
}

function desenharLaminas() {
  if (!st.laminas) return;
  noFill();
  stroke(220, 190, 130, 0.14);
  strokeWeight(2);
  circle(jogador.x, jogador.y, 124);
  noStroke();
  for (let i = 0; i < st.laminas; i++) {
    const a = jogador.ang + (i * TWO_PI) / st.laminas;
    const bx = jogador.x + Math.cos(a) * 62, by = jogador.y + Math.sin(a) * 62;
    fill(10, 8, 4, 0.25); circle(bx + 3, by + 5, 18);
    fill(196, 200, 206); stroke(100, 104, 112); strokeWeight(2);
    push(); translate(bx, by); rotate(a * 3);
    beginShape();
    for (let k = 0; k < 8; k++) { const rr = k % 2 === 0 ? 11 : 5; vertex(Math.cos((k * TWO_PI) / 8) * rr, Math.sin((k * TWO_PI) / 8) * rr); }
    endShape(CLOSE);
    noStroke(); fill(120, 124, 132); circle(0, 0, 4);
    pop();
  }
  noStroke();
}

function desenharJogador() {
  if (estado === "fim") return;
  const piscar = jogador.inv > 0 && jogador.dashT <= 0 && Math.floor(millis() / 90) % 2 === 0;
  const a = piscar ? 0.45 : jogador.dashT > 0 ? 0.6 : 1;
  push();
  translate(jogador.x, jogador.y);
  noStroke();
  fill(10, 14, 6, 0.3); ellipse(4, 8, 38, 24);
  if (rajadaT > 0) { fill(255, 190, 70, 0.18 + Math.sin(millis() * 0.03) * 0.06); circle(0, 0, 66); }
  rotate(jogador.mira);
  desenharCorpo(PA, a, Math.sin(jogador.passo) * 1.4);
  if (jogador.flash > 0) {
    fill(255, 226, 140, 0.95); triangle(39, 0, 52, -6, 52, 6);
    fill(255, 252, 226); circle(41, 0, 6);
  }
  pop();
}

function desenharEfeitos() {
  for (const f of efeitos) {
    const k = f.t / f.dur;
    noStroke();
    fill(255, 170, 60, (1 - k) * 0.45);
    circle(f.x, f.y, 40 + k * 230);
    noFill();
    stroke(255, 220, 150, (1 - k) * 0.9);
    strokeWeight(5 * (1 - k) + 1);
    circle(f.x, f.y, 40 + k * 240);
  }
  noStroke();
}

function desenharParticulas() {
  noStroke();
  for (const p of particulas) {
    const k = p.vida / p.max;
    fill(p.cor[0], p.cor[1], p.cor[2], k);
    circle(p.x, p.y, p.t * k + 1);
  }
}

function desenharTextos() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(13);
  noStroke();
  for (const t of textos) {
    const al = constrain(t.vida * 2, 0, 1);
    fill(30, 20, 12, al * 0.8); text(t.txt, t.x + 1, t.y + 1);
    fill(255, 244, 214, al); text(t.txt, t.x, t.y);
  }
}

// Luz de fim de tarde: escurece as bordas e esquenta o centro
function desenharAtmosfera() {
  const ctx = drawingContext;
  ctx.save();
  const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.22, width / 2, height / 2, Math.hypot(width, height) * 0.62);
  g.addColorStop(0, BA.luz);
  g.addColorStop(0.55, BA.meio);
  g.addColorStop(1, BA.borda);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------- HUD e telas ----------
function fmtTempo(s) {
  const m = Math.floor(s / 60), c = Math.floor(s % 60);
  return m + ":" + (c < 10 ? "0" : "") + c;
}

function btnLargura() {
  return Math.min(320 * ui, width * 0.92);
}

function painel(x, y, w, h, raio) {
  noStroke();
  fill(22, 16, 12, 0.72);
  rect(x, y, w, h, raio);
  noFill();
  stroke(206, 160, 86, 0.55);
  strokeWeight(1.5 * ui);
  rect(x, y, w, h, raio);
  noStroke();
}

function coracao(x, y, s) {
  fill(214, 66, 66); stroke(110, 26, 28); strokeWeight(1.5);
  circle(x - s * 0.25, y - s * 0.12, s * 0.58); circle(x + s * 0.25, y - s * 0.12, s * 0.58);
  triangle(x - s * 0.52, y, x + s * 0.52, y, x, y + s * 0.58);
  noStroke(); fill(255, 196, 196, 0.8); circle(x - s * 0.3, y - s * 0.24, s * 0.16);
}

function textoContorno(txt, x, y, tam, cor, contorno, esp) {
  push();
  textSize(tam);
  stroke(contorno[0], contorno[1], contorno[2]);
  strokeWeight(esp);
  strokeJoin(ROUND);
  fill(cor[0], cor[1], cor[2]);
  text(txt, x, y);
  pop();
}

function desenharHUD() {
  if (estado === "menu") return;
  noStroke();
  rectMode(CORNER);

  fill(20, 14, 10, 0.55);
  rect(0, 0, width, 9 * ui);
  fill(230, 178, 60);
  rect(0, 0, width * constrain(xp / xpProx, 0, 1), 9 * ui);
  fill(255, 236, 170, 0.5);
  rect(0, 0, width * constrain(xp / xpProx, 0, 1), 3 * ui);

  const bx = 10 * ui, by = 20 * ui, bw = Math.min(150 * ui, width * 0.27), bh = 20 * ui;
  painel(bx, by, bw + 26 * ui, bh + 10 * ui, 10 * ui);
  coracao(bx + 15 * ui, by + 12 * ui, 13 * ui);
  const r = constrain(st.hp / st.hpMax, 0, 1);
  fill(0, 0, 0, 0.4);
  rect(bx + 30 * ui, by + 5 * ui, bw - 6 * ui, bh, 6 * ui);
  if (r > 0) {
    fill(r > 0.5 ? 118 : r > 0.25 ? 220 : 206, r > 0.5 ? 172 : r > 0.25 ? 170 : 70, r > 0.5 ? 74 : 54);
    rect(bx + 30 * ui, by + 5 * ui, Math.max(8 * ui, (bw - 6 * ui) * r), bh, 6 * ui);
  }
  fill(255, 246, 224);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(12 * ui);
  text(Math.ceil(st.hp) + " / " + st.hpMax, bx + 30 * ui + (bw - 6 * ui) / 2, by + 5 * ui + bh / 2 + 1);
  textAlign(LEFT, TOP);
  textSize(14 * ui);
  fill(240, 226, 196);
  text("Nível " + nivel, bx + 4 * ui, by + bh + 16 * ui);

  // onda + progresso do nível
  const pw = Math.min(150 * ui, width * 0.3), px = width / 2 - pw / 2;
  const alto = NA.inf ? 42 * ui : 58 * ui;
  painel(px, 20 * ui, pw, alto, 12 * ui);
  fill(255, 240, 208);
  textAlign(CENTER, CENTER);
  textSize(18 * ui);
  text(NA.inf ? "ONDA " + Math.max(1, onda) : "ONDA " + Math.max(1, onda) + "/" + NA.ondas, px + pw / 2, 20 * ui + 16 * ui);
  textSize(11 * ui);
  fill(214, 190, 150);
  const restam = inimigos.length + aSpawnar;
  text(ondaFase === "pausa" ? "descanse" : "restam " + restam, px + pw / 2, 20 * ui + 32 * ui);
  if (!NA.inf) {
    const p = pctNivel(), barW = pw - 20 * ui;
    fill(0, 0, 0, 0.45); rect(px + 10 * ui, 20 * ui + 41 * ui, barW, 8 * ui, 4 * ui);
    fill(NA.cor[0], NA.cor[1], NA.cor[2]); if (p > 0) rect(px + 10 * ui, 20 * ui + 41 * ui, Math.max(6 * ui, (barW * p) / 100), 8 * ui, 4 * ui);
    fill(255, 244, 218);
    textSize(10 * ui);
    textAlign(LEFT, CENTER);
    text(p + "%", px + pw + 6 * ui, 20 * ui + 45 * ui);
  }

  textAlign(RIGHT, TOP);
  textSize(15 * ui);
  fill(240, 226, 196);
  text("Abates: " + abates, width - 12 * ui, 24 * ui);

  if (millis() < aviso.ate) {
    const p = 1 + Math.sin(millis() * 0.02) * 0.05;
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textoContorno(aviso.txt, width / 2, height * 0.3, 32 * ui * p, [255, 238, 200], [40, 24, 14], 6 * ui);
  }

  if (estado === "jogando" && joy.ativo) {
    const R = 70 * ui;
    const vx = joy.x - joy.ox, vy = joy.y - joy.oy;
    const d = Math.hypot(vx, vy);
    const m = d > R ? R / d : 1;
    noFill();
    stroke(255, 240, 210, 0.28);
    strokeWeight(3 * ui);
    circle(joy.ox, joy.oy, R * 2);
    noStroke();
    fill(255, 240, 210, 0.38);
    circle(joy.ox + vx * m, joy.oy + vy * m, 56 * ui);
  } else if ((estado === "jogando" || estado === "pausa") && tempo < 20) { // guia do analógico
    noFill();
    stroke(255, 240, 210, 0.16);
    strokeWeight(3 * ui);
    circle(width * 0.17, height * 0.7, 140 * ui);
    noStroke();
    fill(255, 240, 210, 0.14);
    circle(width * 0.17, height * 0.7, 56 * ui);
  }

  desenharBotaoHab();

  if (estado === "jogando" && !joy.ativo) {
    let dica = "";
    if (tempo < 7 && !usouTeclado) dica = "Arraste o dedo no lado ESQUERDO para mover.\nA arma atira sozinha!";
    else if (PA.hab && tempo >= 7 && tempo < 16) dica = "Toque no botão da direita\npara usar: " + PA.habNome;
    else if (onda === 1 && ondaFase === "ativa" && tempo < 28) dica = "Atire nos barris vermelhos\npara explodir os bichos!";
    if (dica) {
      const al = 0.7 + Math.sin(millis() * 0.006) * 0.25;
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      push();
      textSize(17 * ui);
      stroke(30, 18, 10, al);
      strokeWeight(5 * ui);
      strokeJoin(ROUND);
      fill(255, 240, 206, al);
      text(dica, width / 2, height * 0.82);
      pop();
    }
  }
}

function desenharTelas() {
  noStroke();
  rectMode(CORNER);
  if (estado === "menu") desenharMenu();
  else if (estado === "upgrade") desenharUpgrade();
  else if (estado === "pausa") desenharPausa();
  else if (estado === "fim") desenharFim();
  else if (estado === "vitoria") desenharVitoria();
}

function desenharMenu() {
  noStroke();
  rectMode(CORNER);
  fill(18, 12, 8, 0.4);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  push();
  textFont("Georgia, serif");
  const ty = height * 0.1, ts = Math.min(46 * ui, height * 0.12);
  textoContorno("ENXAME", width / 2 + 2 * ui, ty + 3 * ui, ts, [20, 10, 6], [20, 10, 6], 7 * ui);
  textoContorno("ENXAME", width / 2, ty, ts, [250, 236, 200], [70, 38, 18], 7 * ui);
  pop();
  moeda(24 * ui, 28 * ui, 11 * ui);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(19 * ui);
  fill(250, 220, 130);
  text(save.moedas, 40 * ui, 29 * ui);

  const C = cartasMenu();
  desenharCartaPersonagem(C[0]);
  desenharCartaNivel(C[1]);
  desenharCartaBioma(C[2]);

  const j = rectJogar(), ok = podeJogar();
  botao(ok ? "JOGAR" : !possui(save.p) ? "COMPRE O PERSONAGEM" : "NÍVEL BLOQUEADO", j.x, j.y, j.w, j.h, ok ? [150, 176, 80] : [120, 108, 96], ok);
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(13 * ui);
  fill(240, 214, 140);
  text("Recorde ∞: " + save.recorde, 14 * ui, height * 0.9);
  if (CONFIG.mostrarApoio) {
    const a = rectApoio();
    fill(240, 150, 150);
    textAlign(CENTER, CENTER);
    textSize(14 * ui);
    text("♥ Apoie o criador", a.x, a.y);
  }
}

function layoutCartas() {
  const n = opcoes.length, r = [];
  if (width > height * 1.2) {
    const w = Math.min(width * 0.3, 260 * ui), h = 170 * ui, gap = 14 * ui;
    const total = n * w + (n - 1) * gap;
    for (let i = 0; i < n; i++) r.push({ x: width / 2 - total / 2 + w / 2 + i * (w + gap), y: height * 0.56, w, h });
  } else {
    const w = Math.min(width * 0.9, 440 * ui), h = 96 * ui, gap = 14 * ui;
    const total = n * h + (n - 1) * gap;
    const y0 = height * 0.58 - total / 2 + h / 2;
    for (let i = 0; i < n; i++) r.push({ x: width / 2, y: y0 + i * (h + gap), w, h });
  }
  return r;
}

function desenharUpgrade() {
  fill(12, 8, 6, 0.7);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textoContorno("NÍVEL " + nivel + "!", width / 2, height * 0.14, 44 * ui, [255, 220, 120], [70, 40, 14], 7 * ui);
  fill(240, 226, 196);
  textStyle(NORMAL);
  textSize(18 * ui);
  text("Escolha uma melhoria", width / 2, height * 0.14 + 38 * ui);

  const L = layoutCartas();
  for (let i = 0; i < opcoes.length; i++) {
    const m = opcoes[i], c = L[i];
    const x0 = c.x - c.w / 2, y0 = c.y - c.h / 2;
    fill(14, 8, 4, 0.4);
    rect(x0 + 4 * ui, y0 + 6 * ui, c.w, c.h, 14 * ui);
    fill(62, 48, 36, 0.98);
    stroke(m.cor[0], m.cor[1], m.cor[2]);
    strokeWeight(2.5 * ui);
    rect(x0, y0, c.w, c.h, 14 * ui);
    noStroke();
    fill(m.cor[0], m.cor[1], m.cor[2]);
    rect(x0 + 8 * ui, y0 + 12 * ui, 6 * ui, c.h - 24 * ui, 3 * ui);
    fill(255, 244, 218);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(21 * ui);
    text(m.nome, x0 + 26 * ui, y0 + 12 * ui, c.w - 40 * ui, 30 * ui);
    textStyle(NORMAL);
    textSize(15 * ui);
    fill(226, 210, 180);
    text(m.desc, x0 + 26 * ui, y0 + 42 * ui, c.w - 40 * ui, c.h - 50 * ui);
    if (m.max < 999) {
      fill(m.cor[0], m.cor[1], m.cor[2]);
      textSize(13 * ui);
      textAlign(RIGHT, TOP);
      text((pegos[m.id] || 0) + "/" + m.max, x0 + c.w - 12 * ui, y0 + 12 * ui);
    }
  }
}


function desenharFim() {
  fill(14, 8, 6, 0.7);
  rect(0, 0, width, height);
  const comp = height < 560;
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  push();
  textFont("Georgia, serif");
  textoContorno("VOCÊ CAIU", width / 2, height * 0.13, 44 * ui, [236, 110, 90], [60, 14, 10], 7 * ui);
  pop();
  fill(255, 244, 218);
  textSize(19 * ui);
  text("Onda " + Math.max(1, onda) + "   |   Abates: " + abates, width / 2, height * 0.25);
  if (NA.inf) {
    textSize(28 * ui); fill(250, 220, 130);
    text(pontuacao() + " pontos", width / 2, height * 0.34);
    fill(novoRecorde ? 150 : 232, novoRecorde ? 206 : 214, novoRecorde ? 90 : 170);
    textSize(17 * ui);
    text(novoRecorde ? "NOVO RECORDE!" : "Recorde: " + save.recorde, width / 2, height * 0.42);
  } else {
    textSize(26 * ui); fill(NA.cor[0], NA.cor[1], NA.cor[2]);
    text("Progresso: " + pctFinal + "%", width / 2, height * 0.34);
    const bw = Math.min(300 * ui, width * 0.5), by = height * 0.405;
    fill(0, 0, 0, 0.5); rect(width / 2 - bw / 2, by, bw, 10 * ui, 5 * ui);
    if (pctFinal > 0) { fill(NA.cor[0], NA.cor[1], NA.cor[2]); rect(width / 2 - bw / 2, by, Math.max(8 * ui, (bw * pctFinal) / 100), 10 * ui, 5 * ui); }
  }
  if (ganho > 0) desenharMoedasGanhas(height * 0.47);
  for (const b of botoesTela()) botao(b.txt, b.x, b.y, b.w, b.h, b.cor, b.id === "novo");
  if (!comp) {
    const bs = botoesTela(), ult = bs[bs.length - 1].y;
    fill(226, 210, 180, 0.92); textStyle(NORMAL); textSize(14 * ui); textAlign(CENTER, TOP);
    const dw = Math.min(width * 0.86, 440 * ui);
    text("Dica: " + dicaFim, width / 2 - dw / 2, ult + 44 * ui, dw, 50 * ui);
  }
  textAlign(CENTER, CENTER);
  desenharApoioLink();
}

function botaoPulsante(txt, y, cor) {
  botao(txt, width / 2, y, btnLargura(), 52 * ui, cor, true);
}



function desenharAvisoPix() {
  if (millis() > avisoPix) return;
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  noStroke();
  fill(18, 12, 8, 0.92);
  rect(width / 2, height * 0.5, Math.min(width * 0.92, 480 * ui), 120 * ui, 16 * ui);
  fill(150, 200, 100);
  textStyle(BOLD);
  textSize(22 * ui);
  text("Chave Pix copiada! ♥", width / 2, height * 0.5 - 28 * ui);
  fill(255, 244, 218);
  textSize(Math.min(17 * ui, (width * 0.9) / 24));
  text(CONFIG.chavePix, width / 2, height * 0.5 + 8 * ui);
  textStyle(NORMAL);
  textSize(14 * ui);
  fill(226, 210, 180);
  text("Cole no app do seu banco. Obrigado!", width / 2, height * 0.5 + 38 * ui);
  pop();
}

// ---------- Entrada (toque, mouse e teclado) ----------
function abrirApoio() {
  const chave = CONFIG.chavePix;
  if (chave && !chave.startsWith("SUA-")) {
    try { navigator.clipboard.writeText(chave); } catch (e) {}
    avisoPix = millis() + 4000;
  } else {
    window.open(CONFIG.linkApoio, "_blank");
  }
}

function jogarDeNovo() {
  if (partidas % CONFIG.anuncioACada === 0) mostrarAnuncio("intersticial", novaPartida);
  else novaPartida();
}

function acertou(x, y, cx, cy, w, h) {
  return Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
}

function apertou(x, y, id) {
  iniciarAudio();
  if (precisaGirar()) return;
  const agora = millis();

  for (const b of botoesTopo()) {
    if (acertou(x, y, b.x, b.y, b.w + 8, b.h + 10)) {
      if (agora - ultimoClique > 200) { ultimoClique = agora; acaoTopo(b.id); }
      return;
    }
  }

  if (estado === "jogando") {
    const h = btnHab();
    if (PA.hab && Math.hypot(x - h.x, y - h.y) < h.r * 1.35) { usarHabilidade(); return; }
    if (!joy.ativo && (id === "mouse" || x < width * 0.58)) joy = { ativo: true, id, ox: x, oy: y, x, y };
    return;
  }

  if (agora - ultimoClique < 200) return;
  ultimoClique = agora;

  if (estado === "menu") cliqueMenu(x, y);
  else if (estado === "upgrade") {
    const L = layoutCartas();
    for (let i = 0; i < L.length; i++) {
      if (acertou(x, y, L[i].x, L[i].y, L[i].w, L[i].h)) { escolher(i); return; }
    }
  } else if (estado === "pausa" || estado === "fim" || estado === "vitoria") {
    for (const b of botoesTela()) {
      if (acertou(x, y, b.x, b.y, b.w, b.h)) { acaoBotao(b.id); return; }
    }
    if (CONFIG.mostrarApoio && acertou(x, y, width / 2, height * 0.93, 240 * ui, 36 * ui)) abrirApoio();
  }
}

function moveu(x, y, id) {
  if (!joy.ativo || joy.id !== id) return;
  joy.x = x;
  joy.y = y;
  const R = 70 * ui;
  const vx = x - joy.ox, vy = y - joy.oy;
  const d = Math.hypot(vx, vy);
  if (d > R * 1.5) {
    const k = (d - R * 1.5) / d;
    joy.ox += vx * k;
    joy.oy += vy * k;
  }
}

function soltou(id) {
  if (joy.id === id) joy.ativo = false;
}

function touchStarted() {
  for (const t of touches) {
    if (!toqueConhecido[t.id]) {
      toqueConhecido[t.id] = true;
      apertou(t.x, t.y, t.id);
    }
  }
  return false;
}

function touchMoved() {
  for (const t of touches) moveu(t.x, t.y, t.id);
  return false;
}

function touchEnded() {
  const ids = new Set(touches.map((t) => t.id));
  for (const id in toqueConhecido) {
    if (!ids.has(Number(id))) {
      delete toqueConhecido[id];
      soltou(Number(id));
    }
  }
  tentarTelaCheia();
  return false;
}

function mousePressed() { apertou(mouseX, mouseY, "mouse"); return false; }
function mouseDragged() { moveu(mouseX, mouseY, "mouse"); return false; }
function mouseReleased() { soltou("mouse"); return false; }

function keyPressed() {
  iniciarAudio();
  if (estado === "upgrade") {
    const i = parseInt(key) - 1;
    if (i >= 0 && i < opcoes.length) escolher(i);
    return false;
  }
  if (estado === "jogando") {
    if (key === " " || key === "e" || key === "E" || keyCode === SHIFT) { usarHabilidade(); return false; }
    if (key === "p" || key === "P" || keyCode === ESCAPE) { pausar(); return false; }
  } else if (estado === "pausa") {
    if (key === "p" || key === "P" || keyCode === ESCAPE || keyCode === ENTER) { estado = "jogando"; return false; }
  } else if (estado === "menu") {
    if (keyCode === LEFT_ARROW) { trocar(colMenu, -1); return false; }
    if (keyCode === RIGHT_ARROW) { trocar(colMenu, 1); return false; }
    if (keyCode === UP_ARROW) { colMenu = (colMenu + 2) % 3; return false; }
    if (keyCode === DOWN_ARROW) { colMenu = (colMenu + 1) % 3; return false; }
    if (key === " " || keyCode === ENTER) { novaPartida(); return false; }
  } else if ((estado === "fim" || estado === "vitoria") && keyCode === ENTER) {
    if (estado === "vitoria") acaoBotao("proximo"); else jogarDeNovo();
    return false;
  }
  if (key === " ") return false;
}

function carregar() {
  let raw = null;
  try {
    raw = localStorage.getItem("enxameSave3");
    somLigado = localStorage.getItem("enxameSom") !== "0";
  } catch (e) {}
  if (raw) {
    try { const s = JSON.parse(raw); if (s && typeof s === "object") Object.assign(save, s); } catch (e) {}
  } else {
    save.moedas = CONFIG.moedasIniciais;
    try { save.recorde = parseInt(localStorage.getItem("enxameRecorde2")) || 0; } catch (e) {}
  }
  if (!Array.isArray(save.donos)) save.donos = ["soldado"];
  if (!save.niveis || typeof save.niveis !== "object") save.niveis = {};
  save.p = constrain(save.p | 0, 0, PERSONAGENS.length - 1);
  save.n = constrain(save.n | 0, 0, NIVEIS.length - 1);
  save.b = constrain(save.b | 0, 0, BIOMAS.length - 1);
  save.moedas = Math.max(0, save.moedas | 0);
  save.recorde = Math.max(0, save.recorde | 0);
  if (!possui(save.p)) save.p = 0;
  if (!nivelLiberado(save.n)) save.n = 0;
}

function salvar() {
  try { localStorage.setItem("enxameSave3", JSON.stringify(save)); } catch (e) {}
}

function possui(i) {
  return CONFIG.desbloquearTudo || save.donos.includes(PERSONAGENS[i].id);
}

function nivelLiberado(i) {
  return CONFIG.desbloquearTudo || !!NIVEIS[i].inf || i === 0 || !!(save.niveis[i - 1] && save.niveis[i - 1].completo);
}

function podeJogar() {
  return possui(save.p) && nivelLiberado(save.n);
}

function aplicarSelecao() {
  PA = PERSONAGENS[save.p];
  NA = NIVEIS[save.n];
  BA = BIOMAS[save.b];
  tileImg = tileDe(BA);
  habMax = PA.cd || 1;
}

function trocar(col, dir) {
  const tam = [PERSONAGENS.length, NIVEIS.length, BIOMAS.length][col];
  const k = ["p", "n", "b"][col];
  save[k] = (save[k] + dir + tam) % tam;
  aplicarSelecao();
  if (col === 2) { resetarMundo(); iniciarMenuBichos(); }
  salvar();
}

function comprar() {
  const P = PERSONAGENS[save.p];
  if (possui(save.p) || save.moedas < P.preco) return;
  save.moedas -= P.preco;
  save.donos.push(P.id);
  salvar();
  tocar("nivel");
}

function irParaMenu() {
  estado = "menu";
  joy.ativo = false;
  resetarMundo();
  iniciarMenuBichos();
}

function pausar() {
  if (estado === "jogando") { estado = "pausa"; joy.ativo = false; }
}

function tileDe(bio) {
  if (!tiles[bio.id]) tiles[bio.id] = criarTile(bio);
  return tiles[bio.id];
}

function ehToque() {
  try { return "ontouchstart" in window || navigator.maxTouchPoints > 0; } catch (e) { return false; }
}

function precisaGirar() {
  return ehToque() && height > width * 1.05;
}

function atualizarFlocos(dt) {
  if (BA.id !== "neve") return;
  if (!flocos.length) for (let i = 0; i < 70; i++) flocos.push({ x: random(), y: random(), v: 30 + random(40), s: 1.5 + random(2.5), f: random(6) });
  for (const f of flocos) {
    f.y += (f.v * dt) / Math.max(200, height);
    f.f += dt;
    f.x += (Math.sin(f.f) * 12 * dt) / Math.max(300, width);
    if (f.y > 1) { f.y = -0.02; f.x = random(); }
  }
}

function usarHabilidade() {
  if (estado !== "jogando" || !PA.hab || habCd > 0) return;
  habCd = habMax = PA.cd;
  const h = PA.hab;
  if (h === "dash") {
    const [dx, dy] = direcaoMov();
    jogador.dashDir = dx || dy ? Math.atan2(dy, dx) : jogador.dir;
    jogador.dashT = 0.2;
    jogador.inv = Math.max(jogador.inv, 0.5);
    tocar("dash");
  } else if (h === "granada") {
    let alvo = null, melhor = 420 * 420;
    for (const e of inimigos) {
      if (e.morto) continue;
      const d2 = (e.x - jogador.x) ** 2 + (e.y - jogador.y) ** 2;
      if (d2 < melhor) { melhor = d2; alvo = e; }
    }
    const tx = alvo ? alvo.x : jogador.x + Math.cos(jogador.mira) * 220;
    const ty = alvo ? alvo.y : jogador.y + Math.sin(jogador.mira) * 220;
    granadas.push({ sx: jogador.x, sy: jogador.y, tx, ty, x: jogador.x, y: jogador.y, t: 0, dur: 0.6 });
    tocar("granada");
  } else if (h === "cura") {
    const q = st.hpMax * 0.45;
    st.hp = Math.min(st.hpMax, st.hp + q);
    jogador.inv = Math.max(jogador.inv, 1);
    textos.push({ x: jogador.x, y: jogador.y - 24, txt: "+" + Math.round(q) + " vida", vida: 1 });
    explosaoCor(jogador.x, jogador.y, [140, 220, 140], 22);
    tocar("cura");
  } else if (h === "torreta") {
    torretas = [{ x: jogador.x + Math.cos(jogador.dir) * 34, y: jogador.y + Math.sin(jogador.dir) * 34, vida: 10, cd: 0.3, ang: jogador.dir }];
    poeira(torretas[0].x, torretas[0].y, [210, 190, 90], 10);
    tocar("torreta");
  } else if (h === "rajada") {
    rajadaT = 4;
    tocar("rajada");
  }
}

function atualizarTorretas(dt) {
  for (const t of torretas) {
    t.vida -= dt;
    t.cd -= dt;
    let alvo = null, melhor = 330 * 330;
    for (const e of inimigos) {
      if (e.morto || e.idade < 0.2) continue;
      const d2 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
      if (d2 < melhor) { melhor = d2; alvo = e; }
    }
    if (!alvo) continue;
    t.ang = girar(t.ang, Math.atan2(alvo.y - t.y, alvo.x - t.x), 14 * dt);
    if (t.cd <= 0) {
      t.cd = 0.32;
      tiros.push({ x: t.x + Math.cos(t.ang) * 22, y: t.y + Math.sin(t.ang) * 22, vx: Math.cos(t.ang) * 560, vy: Math.sin(t.ang) * 560, vida: 0.7, perf: 0, hits: [], dano: st.dano * 0.8 });
    }
  }
  torretas = torretas.filter((t) => t.vida > 0);
}

function atualizarGranadas(dt) {
  for (const g of granadas) {
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = g.sx + (g.tx - g.sx) * k;
    g.y = g.sy + (g.ty - g.sy) * k;
    g.h = Math.sin(Math.PI * k) * 46;
    if (g.t >= g.dur) { g.fim = true; explosaoGrande(g.tx, g.ty, true, 150); }
  }
  granadas = granadas.filter((g) => !g.fim);
}

function ondaEf() {
  return 1 + (onda - 1) * NA.rampa;
}

function ondaDeChefe(n) {
  return n % 5 === 0 || (!NA.inf && n === NA.ondas);
}

function pctNivel() {
  if (NA.inf) return 0;
  const feitas = ondaFase === "ativa" ? onda - 1 : onda;
  const resta = aSpawnar + inimigos.length;
  const frac = ondaFase === "ativa" ? Math.max(0, 1 - resta / Math.max(1, ondaTotalInim)) : 0;
  return Math.min(100, Math.floor((100 * (feitas + frac)) / NA.ondas));
}

function moedasDaPartida() {
  return Math.floor(abates / 6) + Math.max(0, onda - (estado === "vitoria" ? 0 : 1)) * 4;
}

function vitoria() {
  estado = "vitoria";
  tempoFim = 0;
  partidas++;
  joy.ativo = false;
  aviso.ate = 0;
  const f = st.hp / st.hpMax;
  estrelasGanhas = f >= 0.6 ? 3 : f >= 0.3 ? 2 : 1;
  const r = save.niveis[save.n] || (save.niveis[save.n] = { pct: 0, completo: false, estrelas: 0 });
  primeiraVez = !r.completo;
  ganho = moedasDaPartida() + Math.round(NA.bonus * (primeiraVez ? 1 : 0.5));
  save.moedas += ganho;
  r.completo = true;
  r.pct = 100;
  r.estrelas = Math.max(r.estrelas || 0, estrelasGanhas);
  salvar();
  explosaoCor(jogador.x, jogador.y, [250, 220, 120], 40);
  tocar("nivel");
}

function dobrarMoedas() {
  if (dobrou || ganho <= 0) return;
  dobrou = true;
  save.moedas += ganho;
  ganho *= 2;
  salvar();
  tocar("nivel");
}

function desenharTorretas() {
  for (const t of torretas) {
    push();
    translate(t.x, t.y);
    noStroke();
    fill(10, 8, 4, 0.3); ellipse(4, 7, 34, 20);
    fill(92, 96, 104); stroke(44, 48, 56); strokeWeight(2.5); circle(0, 0, 26);
    noStroke(); fill(130, 136, 146); circle(-2, -2, 18);
    rotate(t.ang);
    fill(54, 58, 66); rect(4, -4, 22, 8, 2);
    fill(30, 32, 38); rect(22, -3, 7, 6, 1);
    rotate(-t.ang);
    noFill(); stroke(255, 220, 120, 0.8); strokeWeight(2.5);
    arc(0, 0, 36, 36, -HALF_PI, -HALF_PI + TWO_PI * Math.max(0, t.vida / 10));
    pop();
  }
}

function desenharGranadas() {
  for (const g of granadas) {
    noStroke();
    fill(10, 8, 4, 0.3); ellipse(g.x + 2, g.y + 4, 14, 7);
    fill(52, 56, 48); stroke(24, 26, 22); strokeWeight(1.5);
    circle(g.x, g.y - g.h, 13);
    noStroke(); fill(230, 150, 50); circle(g.x + 1, g.y - g.h - 7, 4);
    fill(255, 255, 255, 0.4); circle(g.x - 2, g.y - g.h - 2, 4);
  }
}

function desenharCorpo(P, a, bob) {
  const c = P.cor;
  noStroke();
  fill(c.moc[0], c.moc[1], c.moc[2], a); ellipse(-9, 0, 13, 20);
  fill(c.jaq[0], c.jaq[1], c.jaq[2], a); ellipse(-1, bob * 0.3, 20, 32);
  fill(c.br[0], c.br[1], c.br[2], a); ellipse(-3, -4 + bob * 0.3, 11, 12);
  if (P.marca === "cruz") { fill(214, 60, 64, a); rect(-6, -1.5, 8, 3); rect(-3.5, -4, 3, 8); }
  fill(48, 50, 54, a); rect(10, -3, 24, 6, 2);
  fill(34, 36, 40, a); rect(30, -2, 9, 4, 1);
  fill(214, 168, 128, a); circle(13, -8 + bob * 0.4, 7); circle(23, 6, 7);
  fill(c.cha[0], c.cha[1], c.cha[2], a); circle(1, 0, 16);
  fill(c.cha2[0], c.cha2[1], c.cha2[2], a); circle(0, -1, 11);
  fill(c.aba[0], c.aba[1], c.aba[2], a); ellipse(7, 0, 8, 15);
}

function desenharFlocos() {
  if (BA.id !== "neve") return;
  noStroke();
  fill(255, 255, 255, 0.8);
  for (const f of flocos) circle(f.x * width, f.y * height, f.s * ui);
}

function estrela(x, y, s, cheia) {
  push();
  if (cheia) { fill(252, 206, 62); stroke(150, 96, 20); } else { fill(60, 50, 44, 0.9); stroke(110, 98, 86); }
  strokeWeight(Math.max(1.5, s * 0.1));
  strokeJoin(ROUND);
  beginShape();
  for (let i = 0; i < 10; i++) {
    const a = -HALF_PI + (i * Math.PI) / 5, r = i % 2 === 0 ? s : s * 0.45;
    vertex(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  endShape(CLOSE);
  if (cheia) { noStroke(); fill(255, 244, 180, 0.8); circle(x - s * 0.2, y - s * 0.25, s * 0.35); }
  pop();
}

function moeda(x, y, s) {
  push();
  fill(244, 192, 52); stroke(150, 98, 20); strokeWeight(Math.max(1.5, s * 0.16));
  circle(x, y, s * 2);
  noFill(); stroke(255, 226, 120, 0.9); strokeWeight(Math.max(1, s * 0.12));
  circle(x, y, s * 1.2);
  noStroke(); fill(255, 246, 190, 0.8); circle(x - s * 0.35, y - s * 0.4, s * 0.4);
  pop();
}

function cadeado(x, y, s) {
  push();
  noFill(); stroke(214, 206, 190); strokeWeight(s * 0.2);
  arc(x, y - s * 0.15, s * 0.9, s * 1.1, Math.PI, TWO_PI);
  line(x - s * 0.45, y - s * 0.15, x - s * 0.45, y + s * 0.1);
  line(x + s * 0.45, y - s * 0.15, x + s * 0.45, y + s * 0.1);
  noStroke(); fill(236, 196, 70); rect(x - s * 0.7, y + s * 0.05, s * 1.4, s * 1.0, s * 0.18);
  fill(80, 56, 20); circle(x, y + s * 0.45, s * 0.28); rect(x - s * 0.06, y + s * 0.45, s * 0.12, s * 0.3);
  pop();
}

function desenharRosto(x, y, s, tier, cor) {
  push();
  noStroke();
  if (tier === 5) { // chifres
    fill(cor[0] * 0.6, cor[1] * 0.5, cor[2] * 0.7);
    triangle(x - s * 0.8, y - s * 0.35, x - s * 0.5, y - s * 1.25, x - s * 0.15, y - s * 0.8);
    triangle(x + s * 0.8, y - s * 0.35, x + s * 0.5, y - s * 1.25, x + s * 0.15, y - s * 0.8);
  }
  fill(cor[0], cor[1], cor[2]); stroke(cor[0] * 0.5, cor[1] * 0.5, cor[2] * 0.5); strokeWeight(Math.max(2, s * 0.1));
  circle(x, y, s * 2);
  noStroke(); fill(255, 255, 255, 0.28); ellipse(x - s * 0.3, y - s * 0.5, s * 0.8, s * 0.4);
  fill(255); circle(x - s * 0.35, y - s * 0.18, s * 0.5); circle(x + s * 0.35, y - s * 0.18, s * 0.5);
  fill(30, 20, 20);
  const dy = tier >= 3 ? s * 0.04 : 0;
  circle(x - s * 0.35, y - s * 0.16 + dy, s * 0.24); circle(x + s * 0.35, y - s * 0.16 + dy, s * 0.24);
  stroke(30, 20, 20); strokeWeight(Math.max(2, s * 0.11)); noFill();
  if (tier <= 1) arc(x, y + s * 0.2, s * 0.9, s * 0.65, 0.25, Math.PI - 0.25);
  else if (tier === 2) line(x - s * 0.35, y + s * 0.5, x + s * 0.35, y + s * 0.5);
  else arc(x, y + s * 0.75, s * 0.9, s * 0.6, Math.PI + 0.3, TWO_PI - 0.3);
  if (tier >= 3) { // sobrancelhas bravas
    line(x - s * 0.62, y - s * 0.62, x - s * 0.1, y - s * 0.4);
    line(x + s * 0.62, y - s * 0.62, x + s * 0.1, y - s * 0.4);
  }
  pop();
}

function iconeHab(id, x, y, s) {
  push();
  noStroke();
  fill(255, 248, 226);
  stroke(255, 248, 226); strokeWeight(s * 0.13); strokeCap(ROUND); strokeJoin(ROUND);
  if (id === "dash") {
    noFill();
    for (let i = 0; i < 2; i++) { const ox = (i - 0.5) * s * 0.7; line(x + ox - s * 0.2, y - s * 0.4, x + ox + s * 0.2, y); line(x + ox + s * 0.2, y, x + ox - s * 0.2, y + s * 0.4); }
  } else if (id === "granada") {
    noStroke(); circle(x, y + s * 0.12, s * 0.85);
    fill(255, 190, 70); rect(x - s * 0.1, y - s * 0.52, s * 0.2, s * 0.22, 2);
  } else if (id === "cura") {
    noStroke(); fill(120, 230, 130);
    rect(x - s * 0.16, y - s * 0.46, s * 0.32, s * 0.92, 2); rect(x - s * 0.46, y - s * 0.16, s * 0.92, s * 0.32, 2);
  } else if (id === "torreta") {
    noFill(); circle(x - s * 0.08, y + s * 0.05, s * 0.8);
    line(x + s * 0.2, y - s * 0.12, x + s * 0.6, y - s * 0.32);
  } else {
    noFill();
    for (let i = -1; i <= 1; i++) line(x - s * 0.5, y + i * s * 0.3, x + s * 0.5, y + i * s * 0.3 - s * 0.12);
  }
  pop();
}

function btnHab() {
  return { x: width - 76 * ui, y: height - 76 * ui, r: 44 * ui };
}

function desenharBotaoHab() {
  if (!PA.hab || estado === "fim" || estado === "vitoria") return;
  const b = btnHab(), pronto = habCd <= 0;
  const cor = PA.cor.jaq.map((v, i) => Math.min(255, v * 0.6 + [60, 70, 40][i]));
  push();
  noStroke();
  fill(10, 6, 4, 0.4); circle(b.x + 3 * ui, b.y + 5 * ui, b.r * 2);
  if (pronto) { fill(255, 230, 140, 0.2 + Math.sin(millis() * 0.006) * 0.1); circle(b.x, b.y, b.r * 2 + 14 * ui); }
  fill(34, 26, 20, 0.85); stroke(pronto ? 240 : 150, pronto ? 200 : 130, pronto ? 100 : 100); strokeWeight(3.5 * ui);
  circle(b.x, b.y, b.r * 2);
  noStroke();
  fill(cor[0], cor[1], cor[2], pronto ? 0.95 : 0.4);
  circle(b.x, b.y, b.r * 1.6);
  if (!pronto) {
    fill(10, 6, 4, 0.6);
    arc(b.x, b.y, b.r * 1.7, b.r * 1.7, -HALF_PI, -HALF_PI + TWO_PI * (habCd / habMax), PIE);
  }
  iconeHab(PA.hab, b.x, b.y, b.r * 0.9);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  if (!pronto) {
    textoContorno(Math.ceil(habCd) + "", b.x, b.y, 22 * ui, [255, 244, 218], [30, 18, 10], 4 * ui);
  }
  textoContorno(PA.habNome, b.x, b.y - b.r - 10 * ui, 12 * ui, [255, 240, 206], [30, 18, 10], 3.5 * ui);
  pop();
}

function desenharGire() {
  push();
  rectMode(CORNER);
  noStroke();
  fill(14, 10, 8, 0.94);
  rect(0, 0, width, height);
  const t = (millis() % 2400) / 2400;
  const ang = (t < 0.5 ? 0 : t < 0.7 ? ((t - 0.5) / 0.2) * HALF_PI : HALF_PI);
  translate(width / 2, height * 0.4);
  rotate(ang);
  const s = Math.min(width, height) * 0.22;
  fill(40, 34, 30); stroke(240, 214, 150); strokeWeight(4);
  rect(-s * 0.5, -s * 0.9, s, s * 1.8, s * 0.14);
  noStroke(); fill(70, 90, 56);
  rect(-s * 0.4, -s * 0.74, s * 0.8, s * 1.44, s * 0.06);
  pop();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textoContorno("Gire o celular", width / 2, height * 0.7, Math.min(width * 0.09, 40), [255, 238, 200], [40, 24, 14], 6);
  fill(226, 210, 180);
  textStyle(NORMAL);
  textSize(Math.min(width * 0.05, 20));
  text("Este jogo é jogado deitado", width / 2, height * 0.7 + Math.min(width * 0.09, 40) * 1.1);
}

function telaCheiaDisponivel() {
  try { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); } catch (e) { return false; }
}

function botoesTopo() {
  const w = 96 * ui, h = 28 * ui, x = width - w / 2 - 10 * ui;
  const hud = estado === "jogando" || estado === "pausa" || estado === "upgrade";
  const y0 = hud ? 66 * ui : 26 * ui;
  const l = [{ id: "som", x, y: y0, w, h, txt: somLigado ? "SOM: ON" : "SOM: OFF", off: !somLigado }];
  if (estado === "jogando") l.push({ id: "pausa", x, y: y0 + 34 * ui, w, h, txt: "PAUSA" });
  if ((estado === "menu" || estado === "pausa") && telaCheiaDisponivel()) l.push({ id: "tela", x, y: y0 + 34 * ui, w, h, txt: "TELA CHEIA" });
  return l;
}

function desenharBotoesTopo() {
  push();
  rectMode(CENTER);
  for (const b of botoesTopo()) {
    noStroke();
    fill(22, 16, 12, 0.62);
    rect(b.x, b.y, b.w, b.h, b.h / 2);
    fill(255, 244, 218, b.off ? 0.5 : 0.95);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(12 * ui);
    text(b.txt, b.x, b.y + 1);
  }
  pop();
}

function acaoTopo(id) {
  if (id === "som") alternarSom();
  else if (id === "pausa") pausar();
  else if (id === "tela") alternarTelaCheia();
}

function alternarTelaCheia() {
  try {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const f = el.requestFullscreen || el.webkitRequestFullscreen;
      const p = f.call(el);
      const travar = () => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(travar).catch(() => {}); else travar();
    }
  } catch (e) {}
}

function tentarTelaCheia() {
  if (tentouTela || !ehToque() || !telaCheiaDisponivel()) return;
  tentouTela = true;
  alternarTelaCheia();
}

function cartasMenu() {
  const h = height * 0.58, w = Math.min(width * 0.31, 330 * ui), gap = Math.min(14 * ui, width * 0.015);
  const x0 = width / 2 - (3 * w + 2 * gap) / 2, y0 = height * 0.2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: y0, w, h }));
}

function unidade(c) {
  return Math.min(c.w / 270, c.h / 226);
}

function rectJogar() {
  return { x: width / 2, y: height * 0.9, w: Math.min(300 * ui, width * 0.45), h: 48 * ui };
}

function rectApoio() {
  return { x: width - 95 * ui, y: height * 0.9, w: 170 * ui, h: 40 * ui };
}

function botaoComprar(c) {
  const u = unidade(c);
  return { x: c.x + c.w / 2, y: c.y + c.h - 24 * u, w: 160 * u, h: 30 * u };
}

function cartaBase(c, rotulo, cor, ativa) {
  const u = unidade(c);
  noStroke();
  fill(14, 8, 4, 0.4);
  rect(c.x + 4 * u, c.y + 6 * u, c.w, c.h, 16 * u);
  fill(40, 30, 22, 0.94);
  stroke(cor[0], cor[1], cor[2], ativa ? 1 : 0.7);
  strokeWeight((ativa ? 3.5 : 2.5) * u);
  rect(c.x, c.y, c.w, c.h, 16 * u);
  noStroke();
  fill(cor[0], cor[1], cor[2]);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(12 * u);
  text(rotulo, c.x + c.w / 2, c.y + 16 * u);
  fill(255, 240, 210, 0.9);
  const ay = c.y + c.h * 0.4;
  triangle(c.x + 9 * u, ay, c.x + 23 * u, ay - 12 * u, c.x + 23 * u, ay + 12 * u);
  triangle(c.x + c.w - 9 * u, ay, c.x + c.w - 23 * u, ay - 12 * u, c.x + c.w - 23 * u, ay + 12 * u);
  return u;
}

function desenharCartaPersonagem(c) {
  const P = PERSONAGENS[save.p], dono = possui(save.p), cx = c.x + c.w / 2;
  const u = cartaBase(c, "PERSONAGEM", [226, 176, 60], colMenu === 0);
  push();
  translate(cx - 6 * u, c.y + 62 * u);
  scale(1.7 * u);
  rotate(-0.35);
  desenharCorpo(P, dono ? 1 : 0.4, 0);
  pop();
  if (!dono) cadeado(cx, c.y + 62 * u, 13 * u);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 244, 218);
  textSize(18 * u);
  text(P.nome, cx, c.y + 110 * u);
  textStyle(NORMAL);
  if (P.hab) {
    fill(240, 200, 100); textStyle(BOLD); textSize(12 * u);
    text("Habilidade: " + P.habNome, cx, c.y + 130 * u);
  }
  textStyle(NORMAL);
  fill(226, 210, 180);
  textSize(11 * u);
  textLeading(13 * u);
  text(P.desc, cx, c.y + (P.hab ? 158 : 146) * u);
  if (!dono) {
    const b = botaoComprar(c), ok = save.moedas >= P.preco;
    rectMode(CENTER);
    fill(ok ? 150 : 90, ok ? 176 : 84, ok ? 80 : 76); stroke(40, 30, 20); strokeWeight(2 * u);
    rect(b.x, b.y, b.w, b.h, 10 * u);
    rectMode(CORNER);
    noStroke();
    moeda(b.x - 42 * u, b.y, 8 * u);
    fill(ok ? 40 : 200, ok ? 26 : 190, ok ? 12 : 180);
    textStyle(BOLD); textSize(14 * u); textAlign(LEFT, CENTER);
    text("COMPRAR  " + P.preco, b.x - 28 * u, b.y + 1);
  } else if (P.hab) {
    fill(150, 200, 110); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(11 * u);
    text("✔ DESBLOQUEADO", cx, c.y + c.h - 16 * u);
  }
}

function desenharCartaNivel(c) {
  const N = NIVEIS[save.n], lib = nivelLiberado(save.n), cx = c.x + c.w / 2;
  const u = cartaBase(c, N.inf ? "MODO" : "NÍVEL " + (save.n + 1), N.cor, colMenu === 1);
  const r = save.niveis[save.n] || { pct: 0, estrelas: 0, completo: false };
  if (N.inf) {
    textAlign(CENTER, CENTER); textStyle(BOLD);
    textoContorno("∞", cx, c.y + 60 * u, 62 * u, [250, 220, 130], [90, 56, 18], 5 * u);
  } else desenharRosto(cx, c.y + 58 * u, 26 * u, N.tier, lib ? N.cor : [110, 104, 100]);
  if (!lib) cadeado(cx, c.y + 58 * u, 13 * u);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 244, 218);
  textSize(16 * u);
  text(N.nome, cx, c.y + 104 * u);
  fill(N.cor[0], N.cor[1], N.cor[2]);
  textSize(13 * u);
  text(N.dif, cx, c.y + 124 * u);
  if (N.inf) {
    fill(240, 214, 140); textSize(14 * u);
    text("Recorde: " + save.recorde, cx, c.y + 156 * u);
    fill(226, 210, 180); textStyle(NORMAL); textSize(11 * u);
    text("Sobreviva o máximo que puder", cx, c.y + 182 * u);
  } else if (!lib) {
    fill(226, 210, 180); textStyle(NORMAL); textSize(12 * u);
    text("Complete o nível " + save.n + "\npara desbloquear", cx, c.y + 168 * u);
  } else {
    for (let i = 0; i < 3; i++) estrela(cx + (i - 1) * 30 * u, c.y + 148 * u, 11 * u, i < (r.estrelas || 0));
    const bw = c.w * 0.62, by = c.y + 184 * u;
    fill(0, 0, 0, 0.45); rect(cx - bw / 2, by, bw, 10 * u, 5 * u);
    if (r.pct > 0) { fill(N.cor[0], N.cor[1], N.cor[2]); rect(cx - bw / 2, by, Math.max(8 * u, (bw * r.pct) / 100), 10 * u, 5 * u); }
    fill(226, 210, 180); textStyle(NORMAL); textSize(11 * u);
    text("Melhor: " + (r.pct || 0) + "%    ·    " + N.ondas + " ondas", cx, by + 20 * u);
  }
}

function desenharCartaBioma(c) {
  const B = BIOMAS[save.b], cx = c.x + c.w / 2;
  const u = cartaBase(c, "BIOMA", [110, 190, 130], colMenu === 2);
  const pw = c.w - 76 * u, ph = 74 * u, px = cx - pw / 2, py = c.y + 28 * u;
  const img = tileDe(B);
  image(img, px, py, pw, ph, 40, 40, 300, 300 * (ph / pw));
  noFill(); stroke(20, 12, 6, 0.8); strokeWeight(2 * u); rect(px, py, pw, ph, 6 * u);
  noStroke();
  const ac = B.id === "floresta" ? [48, 88, 46] : B.id === "savana" ? [104, 122, 52] : B.id === "deserto" ? [66, 134, 76] : [36, 84, 66];
  fill(ac[0], ac[1], ac[2]); circle(px + pw * 0.28, py + ph * 0.55, 20 * u);
  fill(B.rocha.f[0], B.rocha.f[1], B.rocha.f[2]); ellipse(px + pw * 0.7, py + ph * 0.5, 22 * u, 16 * u);
  fill(168, 52, 40); circle(px + pw * 0.5, py + ph * 0.75, 11 * u);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 244, 218);
  textSize(18 * u);
  text(B.nome, cx, c.y + 122 * u);
  textStyle(NORMAL);
  fill(226, 210, 180);
  textSize(11.5 * u);
  textLeading(14 * u);
  text(B.desc, cx, c.y + 156 * u);
}

function botao(txt, x, y, w, h, cor, pulsa) {
  const s = pulsa ? 1 + Math.sin(frameCount * 0.08) * 0.03 : 1;
  push();
  translate(x, y);
  scale(s);
  rectMode(CENTER);
  noStroke();
  fill(20, 12, 6, 0.4);
  rect(2 * ui, 5 * ui, w, h, 16 * ui);
  fill(cor[0], cor[1], cor[2]);
  stroke(cor[0] * 0.55, cor[1] * 0.55, cor[2] * 0.55);
  strokeWeight(3 * ui);
  rect(0, 0, w, h, 16 * ui);
  noStroke();
  fill(255, 255, 255, 0.18);
  rect(0, -h * 0.25, w - 12 * ui, h * 0.3, 8 * ui);
  fill(44, 26, 12);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(Math.min(18 * ui, (w - 16 * ui) / (txt.length * 0.6)));
  text(txt, 0, 2);
  pop();
}

function botoesTela() {
  const l = [];
  if (estado === "pausa") {
    l.push({ id: "retomar", txt: "▶ CONTINUAR", cor: [150, 176, 80] });
    l.push({ id: "reiniciar", txt: "REINICIAR", cor: [232, 168, 60] });
    l.push({ id: "menu", txt: "MENU INICIAL", cor: [120, 150, 190] });
  } else if (estado === "fim") {
    if (!usouContinuar && tempo >= CONFIG.segundosParaContinuar) l.push({ id: "continuar", txt: "▶ CONTINUAR (anúncio)", cor: [232, 168, 60] });
    if (ganho > 0 && !dobrou) l.push({ id: "dobrar", txt: "★ DOBRAR MOEDAS (anúncio)", cor: [236, 196, 70] });
    l.push({ id: "novo", txt: "JOGAR DE NOVO", cor: [150, 176, 80] });
    l.push({ id: "menu", txt: "MENU INICIAL", cor: [120, 150, 190] });
  } else if (estado === "vitoria") {
    if (save.n < NIVEIS.length - 1) l.push({ id: "proximo", txt: "PRÓXIMO NÍVEL ▶", cor: [150, 176, 80] });
    if (ganho > 0 && !dobrou) l.push({ id: "dobrar", txt: "★ DOBRAR MOEDAS (anúncio)", cor: [236, 196, 70] });
    l.push({ id: "novo", txt: "JOGAR DE NOVO", cor: [232, 168, 60] });
    l.push({ id: "menu", txt: "MENU INICIAL", cor: [120, 150, 190] });
  }
  const dois = estado !== "pausa";
  const comp = height < 560;
  const y0 = estado === "pausa" ? height * 0.42 : height * 0.6;
  const bw = dois ? Math.min(280 * ui, width * 0.44) : btnLargura(), h = 52 * ui, esp = (comp ? 56 : 62) * ui;
  l.forEach((b, i) => {
    b.w = bw; b.h = h;
    if (dois) {
      const linha = Math.floor(i / 2), ultimoSozinho = i === l.length - 1 && l.length % 2 === 1;
      b.x = ultimoSozinho ? width / 2 : width / 2 + (i % 2 === 0 ? -1 : 1) * (bw / 2 + 8 * ui);
      b.y = y0 + linha * esp;
    } else { b.x = width / 2; b.y = y0 + i * esp * 0.95; }
  });
  return l;
}

function desenharApoioLink() {
  if (!CONFIG.mostrarApoio) return;
  fill(240, 150, 150);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(14 * ui);
  text("♥ Apoie o criador", width / 2, height * 0.93);
}

function desenharPausa() {
  fill(14, 8, 6, 0.65);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textoContorno("PAUSADO", width / 2, height * 0.16, 46 * ui, [255, 238, 200], [60, 34, 16], 7 * ui);
  fill(226, 210, 180);
  textStyle(NORMAL);
  textSize(15 * ui);
  text(NA.nome + "  ·  " + BA.nome + "  ·  " + PA.nome, width / 2, height * 0.27);
  for (const b of botoesTela()) botao(b.txt, b.x, b.y, b.w, b.h, b.cor, false);
  desenharApoioLink();
}

function desenharMoedasGanhas(y) {
  moeda(width / 2 - 60 * ui, y, 10 * ui);
  fill(250, 220, 130);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(19 * ui);
  text("+" + ganho + " moedas" + (dobrou ? " (x2)" : ""), width / 2 - 44 * ui, y + 1);
}

function desenharVitoria() {
  fill(14, 10, 4, 0.7);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  push();
  textFont("Georgia, serif");
  textoContorno("NÍVEL COMPLETO!", width / 2, height * 0.13, 44 * ui, [255, 226, 120], [80, 48, 12], 7 * ui);
  pop();
  for (let i = 0; i < 3; i++) {
    const k = constrain((tempoFim - 0.3 - i * 0.35) * 4, 0, 1);
    const s = 26 * ui * (0.4 + 0.6 * k) * (i === 1 ? 1.2 : 1);
    estrela(width / 2 + (i - 1) * 74 * ui, height * 0.3 - (i === 1 ? 8 * ui : 0), s, i < estrelasGanhas && k > 0);
  }
  fill(255, 244, 218);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  textSize(16 * ui);
  text(NA.nome + " (" + NA.dif + ")   |   Abates: " + abates + "   |   Tempo: " + fmtTempo(tempo), width / 2, height * 0.42);
  desenharMoedasGanhas(height * 0.5);
  for (const b of botoesTela()) botao(b.txt, b.x, b.y, b.w, b.h, b.cor, b.id === "proximo");
  textAlign(CENTER, CENTER);
  desenharApoioLink();
}

function acaoBotao(id) {
  if (id === "retomar") estado = "jogando";
  else if (id === "reiniciar") novaPartida();
  else if (id === "menu") irParaMenu();
  else if (id === "continuar") mostrarAnuncio("recompensado", continuarPartida);
  else if (id === "dobrar") mostrarAnuncio("recompensado", dobrarMoedas);
  else if (id === "novo") jogarDeNovo();
  else if (id === "proximo") { save.n = Math.min(NIVEIS.length - 1, save.n + 1); salvar(); aplicarSelecao(); novaPartida(); }
}

function cliqueMenu(x, y) {
  const C = cartasMenu();
  for (let i = 0; i < 3; i++) {
    const c = C[i];
    if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) {
      colMenu = i;
      if (i === 0 && !possui(save.p)) {
        const b = botaoComprar(c);
        if (acertou(x, y, b.x, b.y, b.w, b.h + 8)) { comprar(); return; }
      }
      if (x < c.x + c.w * 0.3) trocar(i, -1);
      else if (x > c.x + c.w * 0.7) trocar(i, 1);
      return;
    }
  }
  const j = rectJogar();
  if (acertou(x, y, j.x, j.y, j.w, j.h)) { if (podeJogar()) novaPartida(); return; }
  const a = rectApoio();
  if (CONFIG.mostrarApoio && acertou(x, y, a.x, a.y, a.w, a.h)) abrirApoio();
}
