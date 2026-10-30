// ============================================
//  ENXAME - sobrevivência em ondas (p5.js)
//  Arraste o dedo (ou mouse / WASD / setas) para mover.
//  A arma atira sozinha. Use pedras e caixotes como proteção,
//  atire nos barris vermelhos para explodir os bichos,
//  colete cristais, suba de nível e derrote a Rainha!
// ============================================

// ---------- CONFIGURAÇÃO (edite aqui) ----------
const CONFIG = {
  chavePix: "ba4f78da-dd87-44c5-a166-a3dd3cae71f5", // o botão "Apoiar" copia essa chave
  linkApoio: "https://SEU-LINK-DE-APOIO-AQUI",      // usado só se a chavePix estiver vazia ou começar com "SUA-"
  mostrarApoio: true,         // coloque false na versão para portais de jogos (Poki, CrazyGames...)
  anuncioACada: 3,            // anúncio de tela cheia a cada X partidas
  segundosParaContinuar: 20,  // tempo mínimo de partida para oferecer "continuar vendo anúncio"
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

// ---------- Estado ----------
let estado = "menu"; // menu | jogando | upgrade | fim
let jogador, st;
let inimigos = [], tiros = [], gemas = [], particulas = [], textos = [], manchas = [], efeitos = [], menuBichos = [];
let cam = { x: 0, y: 0 };
let tempo = 0, abates = 0, nivel = 1, xp = 0, xpProx = 5, pendentes = 0;
let pegos = {}, opcoes = [];
let onda = 0, ondaFase = "pausa", pausaT = 2.5, aSpawnar = 0, spawnT = 0, nChefes = 0, restoT = 0, furia = false, furia2 = false;
let chunks = new Map(), destruidos = new Set(), podaT = 0;
let tileImg = null;
let tremor = 0, flashDano = 0;
let aviso = { txt: "", ate: 0 };
let dicaFim = DICAS[0];
let recorde = 0, novoRecorde = false, partidas = 0, usouContinuar = false;
let zoom = 1, ui = 1;
let joy = { ativo: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let toqueConhecido = {};
let ultimoClique = 0;
let avisoPix = 0;
let usouTeclado = false;
let somLigado = true, audioCtx = null, ultimoSom = 0;

// ---------- Setup ----------
function setup() {
  pixelDensity(Math.min(1.5, window.devicePixelRatio || 1));
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 1);
  textFont("Trebuchet MS");
  try {
    recorde = parseInt(localStorage.getItem("enxameRecorde2")) || 0;
    somLigado = localStorage.getItem("enxameSom") !== "0";
  } catch (e) {}
  ajustar();
  tileImg = criarTile();
  resetarMundo();
  iniciarMenuBichos();
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
  return { hpMax: 100, hp: 100, vel: 150, dano: 12, cadencia: 2.4, multi: 1, perfura: 0, alcance: 340, ima: 80, laminas: 0, regen: 0 };
}

function resetarMundo() {
  jogador = { x: 0, y: 0, r: 14, dir: 0, mira: 0, cd: 0, inv: 0, ang: 0, passo: 0, flash: 0 };
  st = statsIniciais();
  inimigos = []; tiros = []; gemas = []; particulas = []; textos = []; manchas = []; efeitos = []; menuBichos = [];
  chunks = new Map(); destruidos = new Set();
  cam.x = 0; cam.y = 0;
  tempo = 0; abates = 0; nivel = 1; xp = 0; xpProx = 5; pendentes = 0;
  pegos = {}; opcoes = [];
  onda = 0; ondaFase = "pausa"; pausaT = 3; aSpawnar = 0; spawnT = 0; nChefes = 0;
  tremor = 0; flashDano = 0;
  joy.ativo = false;
}

function novaPartida() {
  resetarMundo();
  jogador.inv = 1;
  usouContinuar = false;
  novoRecorde = false;
  estado = "jogando";
  mostrarAviso("PREPARE-SE...", 2500);
}

// ---------- Chão (textura gerada por código) ----------
function criarTile() {
  const pg = createGraphics(TILE, TILE);
  pg.pixelDensity(1);
  pg.colorMode(RGB, 255, 255, 255, 1);
  pg.noStroke();
  pg.background(100, 122, 62);
  let seed = 20261029;
  const R = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const emb = (fn) => { for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) fn(ox, oy); };

  const paleta = [[106, 128, 64], [80, 100, 50], [114, 126, 66], [90, 110, 54], [126, 114, 72], [72, 92, 52]];
  for (let i = 0; i < 240; i++) {
    const x = R() * TILE, y = R() * TILE;
    const w = (26 + R() * 70) * (1 + R() * 0.4), h = (26 + R() * 70) * (0.7 + R() * 0.4);
    const c = paleta[Math.floor(R() * paleta.length)];
    const a = 0.14 + R() * 0.14;
    pg.fill(c[0], c[1], c[2], a);
    emb((ox, oy) => pg.ellipse(x + ox, y + oy, w, h));
  }
  for (let i = 0; i < 14; i++) { // manchas de terra
    const x = R() * TILE, y = R() * TILE, w = 50 + R() * 80, h = 30 + R() * 50;
    pg.fill(132, 108, 74, 0.2 + R() * 0.1);
    emb((ox, oy) => pg.ellipse(x + ox, y + oy, w, h));
  }
  pg.strokeWeight(1.3);
  for (let i = 0; i < 2600; i++) { // folhas de grama
    const x = R() * TILE, y = R() * TILE, len = 4 + R() * 6, k = R();
    if (k < 0.5) pg.stroke(62 + R() * 30, 92 + R() * 40, 40 + R() * 20, 0.55);
    else if (k < 0.85) pg.stroke(118 + R() * 30, 140 + R() * 30, 70 + R() * 20, 0.5);
    else pg.stroke(150 + R() * 30, 130 + R() * 20, 70, 0.45);
    pg.line(x, y, x + (R() - 0.5) * 4, y - len);
  }
  pg.noStroke();
  for (let i = 0; i < 44; i++) { // pedrinhas
    const x = R() * TILE, y = R() * TILE, s = 3 + R() * 4;
    pg.fill(40, 36, 26, 0.25); pg.ellipse(x + 1.5, y + 2, s * 1.6, s * 1.1);
    pg.fill(138, 130, 116, 0.95); pg.ellipse(x, y, s * 1.5, s * 1.1);
    pg.fill(178, 170, 154, 0.8); pg.ellipse(x - s * 0.2, y - s * 0.2, s * 0.8, s * 0.5);
  }
  pg.fill(255, 196, 120, 0.05); // luz quente de fim de tarde
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
  const n = roll < 0.3 ? 0 : roll < 0.7 ? 1 : roll < 0.93 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const x = cx * CH + 30 + R() * (CH - 60), y = cy * CH + 30 + R() * (CH - 60);
    const t = R();
    const tipo = t < 0.36 ? "arvore" : t < 0.66 ? "pedra" : t < 0.84 ? "caixote" : "barril";
    const id = k + ":" + i;
    const o = criarObstaculo(R, tipo, x, y, id);
    if (Math.hypot(x, y) < 170 + o.r) continue;              // área segura no início
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
    const blobs = [];
    for (let i = 0; i < 5; i++) {
      const a = R() * TWO_PI, d = R() * 20;
      blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 24 + R() * 14, outono: R() < 0.28 });
    }
    return { tipo, x, y, r: 21, id, blobs };
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

  if (estado === "jogando") atualizar(dt);
  else if (estado === "menu") atualizarMenu(dt);
  else if (estado === "fim") atualizarEfeitos(dt);
  tremor *= Math.exp(-12 * dt);

  background(70, 88, 46);
  desenharMundo();
  desenharAtmosfera();
  desenharHUD();
  desenharTelas();
  desenharBotaoSom();
  desenharAvisoPix();
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

  // movimento do jogador
  const [dx, dy] = direcaoMov();
  jogador.x += dx * st.vel * dt;
  jogador.y += dy * st.vel * dt;
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
  moverTiros(dt);
  moverInimigos(dt);
  atualizarLaminas(dt);
  colisoesTiros();
  atualizarGemas(dt);
  atualizarEfeitos(dt);

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
  const cap = Math.min(14 + onda * 2, 40); // limite de bichos na tela ao mesmo tempo
  if (aSpawnar > 0 && spawnT <= 0 && inimigos.length < cap) {
    const grupo = 1 + (onda >= 6 ? 1 : 0) + (onda >= 11 ? 1 : 0);
    for (let i = 0; i < grupo && aSpawnar > 0 && inimigos.length < cap; i++) {
      criarInimigo(sortearTipo());
      aSpawnar--;
    }
    spawnT = Math.max(0.6, 1.2 - onda * 0.04);
  }
  if (aSpawnar <= 0 && inimigos.length === 0) terminarOnda();
  else if (aSpawnar <= 0) {
    restoT += dt;
    if (restoT > 18 && !furia) {
      furia = true; // os últimos bichos correm atrás de você
      for (const e of inimigos) if (e.tipo !== "rainha") e.vel *= 1.7;
    }
    if (restoT > 40 && !furia2) {
      furia2 = true; // quem só foge é alcançado
      for (const e of inimigos) if (e.tipo !== "rainha") e.vel *= 1.5;
    }
  }
}

function iniciarOnda() {
  onda++;
  ondaFase = "ativa";
  const chefe = onda % 5 === 0;
  aSpawnar = chefe ? 4 + onda * 2 : Math.round(6 + onda * 3.5);
  restoT = 0;
  furia = false;
  furia2 = false;
  spawnT = 0.6;
  mostrarAviso("ONDA " + onda, 2200);
  if (chefe) {
    criarInimigo("rainha");
    nChefes++;
    mostrarAviso("A RAINHA CHEGOU!", 2600);
    tremor = Math.max(tremor, 8);
    tocar("chefe");
  }
}

function terminarOnda() {
  ondaFase = "pausa";
  pausaT = 4.5;
  st.hp = Math.min(st.hpMax, st.hp + st.hpMax * 0.15);
  for (const g of gemas) g.puxar = true; // todos os cristais voam até você
  mostrarAviso("ONDA " + onda + " COMPLETA!", 2400);
  tocar("onda");
}

function sortearTipo() {
  const r = Math.random();
  const pB = onda >= 4 ? 0.18 : 0, pA = onda >= 2 ? 0.25 : 0;
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
  const mult = (1 + (onda - 1) * 0.22) * (tipo === "rainha" ? 1 + nChefes * 0.6 : 1);
  inimigos.push({
    tipo, x: p.x, y: p.y, r: T.r,
    hp: T.hp * mult, hpMax: T.hp * mult,
    vel: T.vel * (1 + Math.min((onda - 1) * 0.025, 0.4)) * random(0.92, 1.08),
    dano: Math.round(T.dano * (1 + (onda - 1) * 0.05)), xp: T.xp,
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

  for (let i = 0; i < st.multi; i++) {
    const ang = base + (i - (st.multi - 1) / 2) * 0.17;
    tiros.push({
      x: jogador.x + Math.cos(ang) * 30, y: jogador.y + Math.sin(ang) * 30,
      vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
      vida: 0.8, perf: st.perfura, hits: [], dano: st.dano,
    });
  }
  jogador.flash = 0.06;
  jogador.cd = 1 / st.cadencia;
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

function explosaoGrande(x, y) {
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
    if (d < 115 + e.r) causarDano(e, 90, dx || 1, dy || 0);
  }
  if (Math.hypot(jogador.x - x, jogador.y - y) < 95 && jogador.inv <= 0) ferir(18);
  obstaculosPerto(x, y, 130, (o) => { // reação em cadeia
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
  partidas++;
  tremor = 14;
  joy.ativo = false;
  dicaFim = DICAS[Math.floor(Math.random() * DICAS.length)];
  aviso.ate = 0;
  explosaoCor(jogador.x, jogador.y, [214, 168, 128], 30);
  tocar("morte");
  const pts = pontuacao();
  if (pts > recorde) {
    recorde = pts;
    novoRecorde = true;
    try { localStorage.setItem("enxameRecorde2", recorde); } catch (e) {}
  }
}

function continuarPartida() {
  usouContinuar = true;
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
  for (const b of menuBichos) desenharBicho(b, 1);
  for (const e of inimigos) desenharBicho(e, Math.min(1, e.idade / 0.4));
  for (const e of inimigos) desenharBarraVida(e);
  if (estado !== "menu") {
    desenharLaminas();
    desenharJogador();
  }
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
  for (const d of c.decor) {
    if (d.t === 0) { // tufo de grama
      stroke(58, 86, 40, 0.8); strokeWeight(1.6);
      line(d.x, d.y, d.x - 4, d.y - 8); line(d.x, d.y, d.x, d.y - 10); line(d.x, d.y, d.x + 4, d.y - 8);
    } else if (d.t === 1) { // florzinha
      noStroke();
      const cores = [[236, 224, 190], [226, 170, 70], [200, 110, 120]];
      const cc = cores[Math.floor(d.c * 3)];
      fill(cc[0], cc[1], cc[2], 0.95); circle(d.x, d.y, 5);
      fill(250, 210, 90); circle(d.x, d.y, 2);
    } else if (d.t === 2) { // pedrinha
      noStroke();
      fill(40, 36, 26, 0.22); ellipse(d.x + 1, d.y + 2, 9, 5);
      fill(136, 128, 114); ellipse(d.x, d.y, 8, 5.5);
    } else { // folha seca
      noStroke();
      fill(176, 108, 48, 0.85); ellipse(d.x, d.y, 8, 4);
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
  if (o.tipo === "arvore") {
    fill(10, 20, 8, 0.28);
    for (const b of o.blobs) ellipse(o.x + b.dx + 16, o.y + b.dy + 20, b.r * 2, b.r * 1.5);
    for (const b of o.blobs) { fill(32, 58, 36); circle(o.x + b.dx, o.y + b.dy, b.r * 2); }
    for (const b of o.blobs) { if (b.outono) fill(150, 92, 40); else fill(48, 88, 46); circle(o.x + b.dx - 2, o.y + b.dy - 3, b.r * 1.7); }
    for (const b of o.blobs) { if (b.outono) fill(198, 138, 62, 0.85); else fill(88, 132, 64, 0.85); circle(o.x + b.dx - b.r * 0.28, o.y + b.dy - b.r * 0.3, b.r * 0.9); }
  } else if (o.tipo === "pedra") {
    fill(20, 18, 10, 0.3);
    ellipse(o.x + 8, o.y + o.r * 0.55, o.r * 2.2, o.r * 1.3);
    fill(102, 96, 88); stroke(56, 50, 44); strokeWeight(2);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x, o.y + p.y); endShape(CLOSE);
    noStroke();
    fill(150, 144, 132, 0.85);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x * 0.62 - o.r * 0.12, o.y + p.y * 0.62 - o.r * 0.14); endShape(CLOSE);
    fill(66, 62, 56, 0.45);
    beginShape(); for (const p of o.pts) vertex(o.x + p.x * 0.5 + o.r * 0.28, o.y + p.y * 0.5 + o.r * 0.3); endShape(CLOSE);
    stroke(60, 54, 48, 0.7); strokeWeight(1.5);
    line(o.x - o.r * 0.1, o.y - o.r * 0.1, o.x + o.r * 0.25, o.y + o.r * 0.25);
    noStroke();
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
    pop();
  } else { // barril
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
  const piscar = jogador.inv > 0 && Math.floor(millis() / 90) % 2 === 0;
  const a = piscar ? 0.45 : 1;
  push();
  translate(jogador.x, jogador.y);
  noStroke();
  fill(10, 14, 6, 0.3); ellipse(4, 8, 38, 24);
  rotate(jogador.mira);
  const bob = Math.sin(jogador.passo) * 1.4;
  fill(92, 70, 44, a); ellipse(-9, 0, 13, 20);                       // mochila
  fill(66, 88, 60, a); ellipse(-1, bob * 0.3, 20, 32);               // jaqueta
  fill(88, 114, 78, a); ellipse(-3, -4 + bob * 0.3, 11, 12);         // brilho no ombro
  fill(48, 50, 54, a); rect(10, -3, 24, 6, 2);                       // arma
  fill(34, 36, 40, a); rect(30, -2, 9, 4, 1);                        // cano
  fill(214, 168, 128, a); circle(13, -8 + bob * 0.4, 7); circle(23, 6, 7); // mãos
  fill(112, 76, 46, a); circle(1, 0, 16);                            // chapéu
  fill(134, 94, 58, a); circle(0, -1, 11);
  fill(92, 60, 36, a); ellipse(7, 0, 8, 15);                         // aba
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
  g.addColorStop(0, "rgba(255,200,120,0.09)");
  g.addColorStop(0.55, "rgba(30,20,28,0.08)");
  g.addColorStop(1, "rgba(14,8,12,0.5)");
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

  // barra de XP
  fill(20, 14, 10, 0.55);
  rect(0, 0, width, 9 * ui);
  fill(230, 178, 60);
  rect(0, 0, width * constrain(xp / xpProx, 0, 1), 9 * ui);
  fill(255, 236, 170, 0.5);
  rect(0, 0, width * constrain(xp / xpProx, 0, 1), 3 * ui);

  // vida
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

  // onda (centro)
  const pw = Math.min(130 * ui, width * 0.28), px = width / 2 - pw / 2;
  painel(px, 20 * ui, pw, 42 * ui, 12 * ui);
  fill(255, 240, 208);
  textAlign(CENTER, CENTER);
  textSize(18 * ui);
  text(onda > 0 ? "ONDA " + onda : "ONDA 1", px + pw / 2, 20 * ui + 16 * ui);
  textSize(11 * ui);
  fill(214, 190, 150);
  const restam = inimigos.length + aSpawnar;
  text(ondaFase === "pausa" ? "descanse" : "restam " + restam, px + pw / 2, 20 * ui + 32 * ui);

  // abates
  textAlign(RIGHT, TOP);
  textSize(15 * ui);
  fill(240, 226, 196);
  text("Abates: " + abates, width - 12 * ui, 24 * ui);

  // aviso
  if (millis() < aviso.ate) {
    const p = 1 + Math.sin(millis() * 0.02) * 0.05;
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textoContorno(aviso.txt, width / 2, height * 0.24, 34 * ui * p, [255, 238, 200], [40, 24, 14], 6 * ui);
  }

  // joystick
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
  }

  // dicas no começo
  if (estado === "jogando" && !joy.ativo) {
    let dica = "";
    if (tempo < 6 && !usouTeclado) dica = "Arraste o dedo para mover.\nA arma atira sozinha!";
    else if (onda === 1 && ondaFase === "ativa" && tempo < 22) dica = "Atire nos barris vermelhos\npara explodir os bichos!";
    if (dica) {
      const al = 0.7 + Math.sin(millis() * 0.006) * 0.25;
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      push();
      textSize(19 * ui);
      stroke(30, 18, 10, al);
      strokeWeight(5 * ui);
      strokeJoin(ROUND);
      fill(255, 240, 206, al);
      text(dica, width / 2, height * 0.8);
      pop();
    }
  }
}

function desenharTelas() {
  noStroke();
  rectMode(CORNER);
  if (estado === "menu") desenharMenu();
  else if (estado === "upgrade") desenharUpgrade();
  else if (estado === "fim") desenharFim();
}

function desenharMenu() {
  fill(18, 12, 8, 0.38);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  push();
  textFont("Georgia, serif");
  textoContorno("ENXAME", width / 2 + 3 * ui, height * 0.22 + 4 * ui, 66 * ui, [20, 10, 6], [20, 10, 6], 8 * ui);
  textoContorno("ENXAME", width / 2, height * 0.22, 66 * ui, [250, 236, 200], [70, 38, 18], 8 * ui);
  pop();
  noStroke();
  fill(226, 176, 60);
  rect(width / 2 - 60 * ui, height * 0.22 + 44 * ui, 120 * ui, 3 * ui, 2);
  fill(240, 220, 180);
  textStyle(NORMAL);
  textSize(17 * ui);
  text("SOBREVIVA ÀS ONDAS", width / 2, height * 0.22 + 64 * ui);
  fill(255, 246, 224, 0.92);
  textSize(16 * ui);
  text("Arraste o dedo para mover. A arma atira sozinha.\nUse pedras como proteção e atire\nnos barris vermelhos para explodir os bichos!", width / 2, height * 0.5 + 12 * ui);
  botaoPulsante("TOQUE PARA JOGAR", height * 0.72, [150, 176, 80]);
  fill(240, 214, 140);
  textStyle(BOLD);
  textSize(17 * ui);
  text("Recorde: " + recorde + " pontos", width / 2, height * 0.835);
  if (CONFIG.mostrarApoio) {
    fill(240, 150, 150);
    textSize(15 * ui);
    text("♥ Apoie o criador", width / 2, height * 0.925);
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

function botoesFim() {
  const l = [];
  if (!usouContinuar && tempo >= CONFIG.segundosParaContinuar) {
    l.push({ id: "continuar", txt: "▶ CONTINUAR (ver anúncio)", cor: [232, 168, 60] });
  }
  l.push({ id: "novo", txt: "JOGAR DE NOVO", cor: [150, 176, 80] });
  if (CONFIG.mostrarApoio) l.push({ id: "apoio", txt: "♥ APOIAR O CRIADOR", cor: [214, 128, 130] });
  const comp = height < 560;
  l.forEach((b, i) => (b.y = height * (comp ? 0.5 : 0.6) + i * (comp ? 56 : 62) * ui));
  return l;
}

function desenharFim() {
  fill(14, 8, 6, 0.7);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  push();
  textFont("Georgia, serif");
  const comp = height < 560;
  textoContorno("VOCÊ CAIU", width / 2, height * (comp ? 0.12 : 0.16), 48 * ui, [236, 110, 90], [60, 14, 10], 7 * ui);
  pop();
  fill(255, 244, 218);
  textSize(21 * ui);
  text("Chegou até a onda " + Math.max(1, onda) + "   |   Abates: " + abates, width / 2, height * (comp ? 0.23 : 0.26));
  textSize(30 * ui);
  fill(250, 220, 130);
  text(pontuacao() + " pontos", width / 2, height * (comp ? 0.31 : 0.33));
  fill(novoRecorde ? 150 : 232, novoRecorde ? 206 : 214, novoRecorde ? 90 : 170);
  textSize(19 * ui);
  text(novoRecorde ? "NOVO RECORDE!" : "Recorde: " + recorde, width / 2, height * (comp ? 0.385 : 0.4));
  for (const b of botoesFim()) botaoPulsante(b.txt, b.y, b.cor);
  const bts = botoesFim();
  const ultimo = bts[bts.length - 1].y;
  fill(226, 210, 180, 0.92);
  textStyle(NORMAL);
  textSize(14 * ui);
  textAlign(CENTER, TOP);
  const dw = Math.min(width * 0.86, 400 * ui);
  text("Dica: " + dicaFim, width / 2 - dw / 2, ultimo + (comp ? 36 : 46) * ui, dw, 60 * ui);
}

function botaoPulsante(txt, y, cor) {
  const s = 1 + Math.sin(frameCount * 0.08) * 0.03;
  push();
  translate(width / 2, y);
  scale(s);
  rectMode(CENTER);
  noStroke();
  fill(20, 12, 6, 0.4);
  rect(2 * ui, 5 * ui, btnLargura(), 52 * ui, 16 * ui);
  fill(cor[0], cor[1], cor[2]);
  stroke(cor[0] * 0.55, cor[1] * 0.55, cor[2] * 0.55);
  strokeWeight(3 * ui);
  rect(0, 0, btnLargura(), 52 * ui, 16 * ui);
  noStroke();
  fill(255, 255, 255, 0.18);
  rect(0, -13 * ui, btnLargura() - 12 * ui, 16 * ui, 8 * ui);
  fill(44, 26, 12);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(18 * ui);
  text(txt, 0, 2);
  pop();
}

function btnSom() {
  return { x: width - 40 * ui, y: estado === "menu" ? 30 * ui : 70 * ui, w: 64 * ui, h: 26 * ui };
}

function desenharBotaoSom() {
  const b = btnSom();
  push();
  rectMode(CENTER);
  noStroke();
  fill(22, 16, 12, 0.6);
  rect(b.x, b.y, b.w, b.h, b.h / 2);
  fill(255, 244, 218, somLigado ? 0.95 : 0.5);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(12 * ui);
  text(somLigado ? "SOM: ON" : "SOM: OFF", b.x, b.y + 1);
  pop();
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
  const sb = btnSom();

  if (estado === "jogando") {
    if (acertou(x, y, sb.x, sb.y, sb.w + 12, sb.h + 12)) {
      if (millis() - ultimoClique > 200) { ultimoClique = millis(); alternarSom(); }
      return;
    }
    if (!joy.ativo) joy = { ativo: true, id, ox: x, oy: y, x, y };
    return;
  }

  if (millis() - ultimoClique < 200) return;
  ultimoClique = millis();

  if (acertou(x, y, sb.x, sb.y, sb.w + 12, sb.h + 12)) { alternarSom(); return; }

  if (estado === "menu") {
    if (CONFIG.mostrarApoio && acertou(x, y, width / 2, height * 0.925, 240 * ui, 44 * ui)) abrirApoio();
    else novaPartida();
  } else if (estado === "upgrade") {
    const L = layoutCartas();
    for (let i = 0; i < L.length; i++) {
      if (acertou(x, y, L[i].x, L[i].y, L[i].w, L[i].h)) { escolher(i); return; }
    }
  } else if (estado === "fim") {
    for (const b of botoesFim()) {
      if (acertou(x, y, width / 2, b.y, btnLargura(), 52 * ui)) {
        if (b.id === "continuar") mostrarAnuncio("recompensado", continuarPartida);
        else if (b.id === "novo") jogarDeNovo();
        else abrirApoio();
        return;
      }
    }
  }
}

function moveu(x, y, id) {
  if (!joy.ativo || joy.id !== id) return;
  joy.x = x;
  joy.y = y;
  // joystick "flutuante": a base acompanha o dedo se ele se afastar demais
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
  if (estado === "menu" && (key === " " || keyCode === ENTER)) { novaPartida(); return false; }
  if (estado === "fim" && keyCode === ENTER) { jogarDeNovo(); return false; }
  if (key === " ") return false; // evita rolar a página
}
