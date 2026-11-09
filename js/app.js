// Arranque: carrega os dados, encaminha os separadores, liga eventos e o service worker.
import { S, load, saveActive } from './store.js';
import { setRenderer, animate, closeAllSheets, toast, keepAwake } from './ui.js';
import { dateKey } from './util.js';
import * as widgets from './widgets.js';
import * as hoje from './views/hoje.js';
import * as treino from './views/treino.js';
import * as sessao from './views/sessao.js';
import * as comida from './views/comida.js';
import * as progresso from './views/progresso.js';
import * as definicoes from './views/definicoes.js';

const VIEWS = { hoje, treino, sessao, comida, progresso, definicoes };
const ACTIONS = Object.assign({}, widgets.actions, ...Object.values(VIEWS).map((v) => v.actions || {}));
const view = document.getElementById('view');
let lastRoute = '';
let lastHash = null;

function parse() {
  const [r, ...args] = (location.hash.replace(/^#/, '') || 'hoje').split('/');
  return { route: VIEWS[r] ? r : 'hoje', args };
}

function render() {
  const { route, args } = parse();
  if (lastRoute === 'sessao' && route !== 'sessao') sessao.onLeave();
  const y = window.scrollY;
  const enter = location.hash !== lastHash;
  lastHash = location.hash;
  view.classList.remove('enter');
  view.innerHTML = VIEWS[route].render(args);
  if (enter) { void view.offsetWidth; view.classList.add('enter'); }
  document.body.dataset.route = route;
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === route));
  animate(view, enter);
  window.scrollTo(0, y); // re-render na mesma página mantém a posição; mudar de página volta ao topo (hashchange)
  lastRoute = route;
}
setRenderer(render);

window.addEventListener('hashchange', () => {
  closeAllSheets();
  render();
  window.scrollTo(0, 0);
});

/* Ações por delegação: data-act="nome" + data-* */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  ev.preventDefault();
  Promise.resolve(fn({ ...el.dataset }, el, ev)).catch((e) => { console.error(e); toast('Algo correu mal: ' + (e?.message || e)); });
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.change];
  if (fn) Promise.resolve(fn({ ...el.dataset }, el, ev)).catch((e) => { console.error(e); toast('Algo correu mal'); });
});
/* Rascunho da série guardado ao escrever */
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset?.draft && S.active) {
    const v = el.value.trim();
    S.active.draft[el.dataset.draft] = v === '' ? '' : el.dataset.draft === 'kg' ? parseFloat(v.replace(',', '.')) : parseInt(v, 10);
  }
});
/* Enter no teclado numérico confirma a série */
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.dataset?.draft) { ev.preventDefault(); ev.target.blur(); }
});

/* Temporizadores, mudança de dia e ecrã ligado */
let today = dateKey();
setInterval(() => {
  sessao.tick();
  const t = dateKey();
  if (t !== today) { today = t; if (!document.querySelector('.sheet-wrap') && parse().route !== 'sessao') render(); }
}, 250);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (S.active) keepAwake(true);
    sessao.tick();
    if (dateKey() !== today) { today = dateKey(); render(); }
  } else if (S.active) saveActive();
});

/* Service worker e atualizações */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const ask = (w) => toast('Nova versão disponível', { action: { label: 'Atualizar', fn: () => w.postMessage('skip') }, ms: 15000 });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch((e) => console.warn('SW', e));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

(async () => {
  try {
    await load();
    navigator.storage?.persist?.().catch(() => {});
    if (S.active) keepAwake(true);
    render();
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><p>Não foi possível abrir os dados deste telemóvel.</p><p class="mut small">${String(e?.message || e)}</p></div>`;
  }
})();
