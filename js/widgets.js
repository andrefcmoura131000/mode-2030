// Cartões partilhados entre o Hoje e a Alimentação: macros, água e suplementos.
import { S, day, saveDay } from './store.js';
import { dayTotals, waterGoal, waterTotal } from './logic.js';
import { ring, macroRow, bar, icon, openSheet, closeSheet, numInput, field, toast, vibrate, render } from './ui.js';
import { fmt, num, esc, timeOf } from './util.js';
import { SUPP_MOMENTS } from './seed.js';

export function nutritionCard(date, { title = 'Alimentação', link = false } = {}) {
  const t = dayTotals(S.days[date]);
  const g = S.cfg.goals;
  const left = Math.round(g.kcal) - Math.round(t.kcal);
  return `<section class="card">
    <div class="row-sb"><span class="lbl">${title}</span>${link ? `<a class="link" href="#comida">Registar ${icon('right')}</a>` : ''}</div>
    <div class="nutri">
      <div class="nutri-ring">${ring(t.kcal, g.kcal, { size: 118, big: fmt(t.kcal), small: `de ${fmt(g.kcal)} kcal` })}
        <div class="ring-note ${left < 0 ? 'over' : ''}">${left >= 0 ? `faltam ${fmt(left)}` : `+${fmt(-left)} acima`}</div></div>
      <div class="nutri-bars">
        ${macroRow('Proteína', t.p, g.p)}
        ${macroRow('Hidratos', t.c, g.c)}
        ${macroRow('Gordura', t.f, g.f)}
      </div>
    </div></section>`;
}

export function waterCard(date) {
  const d = S.days[date];
  const total = waterTotal(d);
  const goal = waterGoal(S.cfg, date, S.sessions);
  const n = d?.water?.length || 0;
  return `<section class="card">
    <div class="row-sb"><span class="lbl">${icon('drop', 'ic-sm')} Água</span>
      <span class="tnum"><span class="big-num">${fmt(total / 1000, 2)}</span><span class="mut"> / ${fmt(goal / 1000, 1)} L</span></span></div>
    ${bar(total, goal, 'bar-lg mt-s')}
    <div class="grid4 mt">
      <button class="btn" data-act="water-add" data-ml="250" data-date="${date}">+250</button>
      <button class="btn" data-act="water-add" data-ml="500" data-date="${date}">+500</button>
      <button class="btn" data-act="water-custom" data-date="${date}" aria-label="Outro valor">${icon('plus')}</button>
      <button class="btn" data-act="water-undo" data-date="${date}" aria-label="Desfazer último registo" ${n ? '' : 'disabled'}>${icon('undo')}</button>
    </div>
    ${n ? `<div class="mut small mt-s">Último: ${fmt(d.water[n - 1].ml)} ml às ${timeOf(d.water[n - 1].t)}</div>` : ''}
  </section>`;
}

export function suppCard(date) {
  const list = S.cfg.supplements;
  if (!list.length) return '';
  const taken = S.days[date]?.supps || {};
  const nTaken = list.filter((s) => taken[s.id]).length;
  const label = Object.fromEntries(SUPP_MOMENTS);
  const order = SUPP_MOMENTS.map(([k]) => k);
  const sorted = [...list].sort((a, b) => order.indexOf(a.moment) - order.indexOf(b.moment));
  return `<section class="card">
    <div class="row-sb"><span class="lbl">${icon('pill', 'ic-sm')} Suplementos</span><span class="mut small">${nTaken}/${list.length}</span></div>
    <div class="checklist">
    ${sorted.map((s) => `<button class="check-row ${taken[s.id] ? 'on' : ''}" data-act="supp-toggle" data-id="${s.id}" data-date="${date}">
        <span class="check-box">${icon(taken[s.id] ? 'checkCircle' : 'circle')}</span>
        <span class="check-txt">${esc(s.name)}${s.dose ? ` <span class="mut">${esc(s.dose)}</span>` : ''}</span>
        <span class="mut small">${esc(label[s.moment] || '')}</span></button>`).join('')}
    </div></section>`;
}

export const actions = {
  'water-add'(d) {
    const dd = day(d.date);
    dd.water.push({ ml: +d.ml, t: Date.now() });
    saveDay(d.date);
    vibrate(15);
    const total = waterTotal(dd), goal = waterGoal(S.cfg, d.date, S.sessions);
    if (total >= goal && total - +d.ml < goal) toast('Meta de água atingida', { gold: true });
    render();
  },
  'water-undo'(d) {
    const dd = day(d.date);
    const w = dd.water.pop();
    if (!w) return;
    saveDay(d.date);
    toast(`Removidos ${fmt(w.ml)} ml`);
    render();
  },
  'water-custom'(d) {
    const body = openSheet(`<div class="sheet-title">Água</div>
      ${field('Quantidade (ml)', numInput('ml', '', 'autofocus placeholder="330"'))}
      <div class="chips mt-s">${[150, 330, 750, 1000].map((v) => `<button class="chip" data-v="${v}">${fmt(v)} ml</button>`).join('')}</div>
      <button class="btn btn-gold btn-block mt" data-x="ok">Adicionar</button>`);
    const inp = body.querySelector('[name=ml]');
    body.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { inp.value = b.dataset.v; }));
    body.querySelector('[data-x=ok]').onclick = () => {
      const ml = Math.round(num(inp.value));
      if (!(ml > 0 && ml < 5000)) { toast('Indicar um valor entre 1 e 5000 ml'); return; }
      closeSheet();
      actions['water-add']({ date: d.date, ml });
    };
  },
  'supp-toggle'(d) {
    const dd = day(d.date);
    if (dd.supps[d.id]) delete dd.supps[d.id];
    else { dd.supps[d.id] = Date.now(); vibrate(15); }
    saveDay(d.date);
    render();
  },
};
