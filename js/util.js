// Utilitários puros (sem DOM no carregamento), usados pela app e pelos testes.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // meio-dia evita problemas com a mudança de hora
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}
/** 1 = segunda … 7 = domingo */
export function weekday(k) {
  const w = parseKey(k).getDay();
  return w === 0 ? 7 : w;
}
export const mondayOf = (k) => addDays(k, 1 - weekday(k));

/** Lê números escritos com vírgula ou ponto. Devolve NaN se vazio. */
export function num(v) {
  if (v === '' || v == null) return NaN;
  return parseFloat(String(v).trim().replace(',', '.'));
}
export const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Formato PT: 1.250,5 */
export function fmt(n, dec = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const [i, f] = Math.abs(n).toFixed(dec).split('.');
  const ii = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ff = f ? f.replace(/0+$/, '') : '';
  return (neg ? '−' : '') + ii + (ff ? ',' + ff : '');
}
export const fmtKg = (n) => fmt(n, 2);

export function mmss(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function longDate(k) {
  const d = parseKey(k);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}
export function shortDate(k) {
  const d = parseKey(k);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
export function timeOf(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
