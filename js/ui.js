// Componentes de interface partilhados: ícones, painéis, avisos, anéis, gráficos, som e vibração.
import { esc, fmt, shortDate, parseKey, dateKey } from './util.js';
import { S } from './store.js';

/* ---------- Render e navegação ---------- */
let renderFn = () => {};
export const setRenderer = (fn) => { renderFn = fn; };
export const render = () => renderFn();
export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
/** Navega e só depois corre fn (ex.: abrir um painel que a mudança de página fecharia). */
export function goThen(hash, fn) {
  if (location.hash === hash) { render(); fn(); return; }
  window.addEventListener('hashchange', () => setTimeout(fn, 0), { once: true });
  location.hash = hash;
}

/* ---------- Ícones (traço fino, herdam a cor) ---------- */
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  barbell: '<path d="M2 12h2M20 12h2M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8"/>',
  food: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M12 7c0-2 1-3 3-4M8 7c0-1.5.5-2.5 2-3"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  play: '<path d="M7 4v16l13-8Z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9Z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="m9.5 8.5 5 7"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9a4 4 0 0 1 6 0l-2 3"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

/* ---------- Painel inferior (bottom sheet) ---------- */
let sheetStack = [];
export function openSheet(html, { onClose, cls = '' } = {}) {
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="backdrop" data-sheet-close></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const entry = { wrap, onClose };
  sheetStack.push(entry);
  wrap.querySelector('[data-sheet-close]').addEventListener('click', () => closeSheet());
  const first = wrap.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 250);
  return wrap.querySelector('.sheet-body');
}
export function closeSheet() {
  const e = sheetStack.pop();
  if (!e) return;
  e.wrap.classList.remove('open');
  setTimeout(() => e.wrap.remove(), 220);
  e.onClose?.();
}
export const closeAllSheets = () => { while (sheetStack.length) closeSheet(); };
export const topSheet = () => sheetStack[sheetStack.length - 1]?.wrap.querySelector('.sheet-body');
export function updateSheet(html) { const b = topSheet(); if (b) b.innerHTML = html; return b; }

export function confirmDialog(text, { ok = 'Confirmar', danger = false, detail = '' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); };
    const body = openSheet(
      `<div class="sheet-title">${esc(text)}</div>${detail ? `<p class="mut">${esc(detail)}</p>` : ''}
       <div class="grid2 mt"><button class="btn" data-x="no">Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-gold'}" data-x="yes">${esc(ok)}</button></div>`,
      { onClose: () => finish(false) });
    body.querySelector('[data-x=yes]').onclick = () => { finish(true); closeSheet(); };
    body.querySelector('[data-x=no]').onclick = () => closeSheet();
  });
}

/* ---------- Avisos ---------- */
let toastTimer;
export function toast(msg, { gold = false, action, ms = 2600 } = {}) {
  const el = document.getElementById('toast');
  el.className = 'toast show' + (gold ? ' gold' : '');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-act">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('.toast-act').onclick = () => { el.className = 'toast'; action.fn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, action ? Math.max(ms, 5000) : ms);
}

/* ---------- Vibração e som ---------- */
export const vibrate = (p) => { try { navigator.vibrate?.(p); } catch { /* sem suporte */ } };
let actx;
export function unlockAudio() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* sem áudio */ }
}
export function beep() {
  if (!S.cfg?.sound || !actx) return;
  const t = actx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
    o.connect(g).connect(actx.destination);
    o.start(t + d);
    o.stop(t + d + 0.2);
  });
}

/* ---------- Ecrã sempre ligado durante o treino ---------- */
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* o sistema pode recusar (bateria fraca) */ }
}

/* ---------- Anéis e barras ---------- */
export function ring(value, goal, { size = 112, stroke = 6, big = '', small = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const over = goal > 0 && value > goal * 1.05;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg ${over ? 'over' : ''}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-to="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="${size / 2 + 2}" text-anchor="middle" class="ring-big">${big}</text>
    <text x="50%" y="${size / 2 + 20}" text-anchor="middle" class="ring-small">${small}</text></svg>`;
}
export function bar(value, goal, cls = '') {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return `<div class="bar ${cls}"><i style="--w:${pct.toFixed(1)}%"></i></div>`;
}
/** Linha de macro: rótulo, consumido/meta, falta. */
export function macroRow(label, value, goal, unit = 'g') {
  const left = Math.round(goal) - Math.round(value); // a partir dos valores arredondados, para a conta bater certo no ecrã
  const note = left >= 0 ? `faltam ${fmt(left)} ${unit}` : `+${fmt(-left)} ${unit} acima`;
  return `<div class="macro"><div class="row-sb"><span>${label}</span><span class="mut tnum">${fmt(value)} / ${fmt(goal)} ${unit}</span></div>
    ${bar(value, goal)}<div class="macro-left ${left < 0 ? 'over' : ''}">${note}</div></div>`;
}
/** Anima anéis e barras depois de inseridos no DOM. */
export function animate(root = document, enter = true) {
  const apply = () => {
    root.querySelectorAll('.ring-fg[data-to]').forEach((c) => c.setAttribute('stroke-dashoffset', c.dataset.to));
    root.querySelectorAll('.bar i').forEach((b) => b.classList.add('go'));
  };
  if (enter) { requestAnimationFrame(apply); return; }
  // Atualização na mesma página: valores finais de imediato, sem voltar a encher desde zero.
  root.classList.add('no-anim');
  apply();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-anim')));
}

/* ---------- Gráfico de linhas em SVG ---------- */
/**
 * series: [{ points:[{x:ts, y}], cls:'gold'|'white'|'dim', dots:bool, label }]
 */
export function lineChart(series, { height = 180, yFmt = (v) => fmt(v, 1), xFmt = (ts) => shortDate(dateKey(new Date(ts))) } = {}) {
  const pts = series.flatMap((s) => s.points);
  if (pts.length < 2) return `<div class="chart-empty mut">Ainda há poucos registos para mostrar um gráfico.</div>`;
  const W = 340, H = height, L = 38, R = 10, T = 12, B = 24;
  let minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  let minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  if (maxX === minX) { minX -= 86400000; maxX += 86400000; } // um só dia: centrar
  const pad = (maxY - minY) * 0.12 || Math.max(1, Math.abs(maxY) * 0.05);
  minY -= pad; maxY += pad;
  const sx = (x) => L + ((x - minX) / (maxX - minX)) * (W - L - R);
  const sy = (y) => T + (1 - (y - minY) / (maxY - minY)) * (H - T - B);
  const grid = [0, 0.5, 1].map((f) => {
    const v = minY + f * (maxY - minY);
    return `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" class="axis">${yFmt(v)}</text>`;
  }).join('');
  const xl = [minX, maxX].map((x, i) => `<text x="${i ? W - R : L}" y="${H - 6}" text-anchor="${i ? 'end' : 'start'}" class="axis">${xFmt(x)}</text>`).join('');
  const lines = series.map((s) => {
    const p = [...s.points].sort((a, b) => a.x - b.x);
    if (!p.length) return '';
    const d = p.map((q, i) => `${i ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ');
    const dots = s.dots ? p.map((q) => `<circle cx="${sx(q.x).toFixed(1)}" cy="${sy(q.y).toFixed(1)}" r="2.6" class="dot ${s.cls}"/>`).join('') : '';
    return `${s.line === false ? '' : `<path d="${d}" class="line ${s.cls}"/>`}${dots}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${grid}${xl}${lines}</svg>`;
}
export const tsOf = (k) => parseKey(k).getTime();

/* ---------- Fotos dos exercícios ---------- */
export function exPhoto(ex) {
  const custom = S.photos[ex.id];
  if (custom) return `<img class="ex-img" src="${custom}" alt="${esc(ex.name)}">`;
  if (!ex.img) return `<div class="ex-img ex-noimg">${icon('barbell')}</div>`;
  const a = `img/ex/${ex.img}/0.jpg`, b = `img/ex/${ex.img}/1.jpg`;
  return `<img class="ex-img anim" src="${a}" data-a="${a}" data-b="${b}" alt="${esc(ex.name)}" loading="lazy">`;
}
export const exThumb = (ex) => {
  const src = S.photos[ex.id] || (ex.img ? `img/ex/${ex.img}/0.jpg` : '');
  return src ? `<img class="thumb" src="${src}" alt="" loading="lazy">` : `<span class="thumb thumb-empty">${icon('barbell')}</span>`;
};

/** Reduz uma fotografia para guardar no telemóvel. */
export function resizeImage(file, max = 800) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Campos de formulário ---------- */
export const field = (label, inner, hint = '') =>
  `<label class="field"><span class="field-l">${label}</span>${inner}${hint ? `<span class="field-h">${hint}</span>` : ''}</label>`;
export const numInput = (name, value, attrs = '') =>
  `<input class="input tnum" name="${name}" inputmode="decimal" autocomplete="off" value="${value === '' || value == null ? '' : esc(String(value).replace('.', ','))}" ${attrs}>`;
export const textInput = (name, value, attrs = '') => `<input class="input" name="${name}" value="${esc(value ?? '')}" autocomplete="off" ${attrs}>`;
export function selectInput(name, options, value, attrs = '') {
  return `<select class="input" name="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}
export function formData(root) {
  const o = {};
  root.querySelectorAll('[name]').forEach((el) => { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
  return o;
}
