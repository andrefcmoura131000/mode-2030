// Separador Progresso: peso, médias semanais, sugestão de ajuste calórico e resumos semanais.
import { S, day, saveDay } from '../store.js';
import { weeklyWeights, weightSuggestion, weekSummary } from '../logic.js';
import { dateKey, addDays, mondayOf, shortDate, longDate, fmt, num, esc } from '../util.js';
import { icon, lineChart, tsOf, openSheet, closeSheet, field, numInput, toast, vibrate, render } from '../ui.js';

function weights() {
  return Object.entries(S.days).filter(([, d]) => d && d.weight).map(([k, d]) => ({ date: k, kg: d.weight })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function render_() {
  const today = dateKey();
  const ws = weights();
  const weeks = weeklyWeights(S.days);
  const sug = weightSuggestion(weeks);
  const todayW = S.days[today]?.weight;
  const recent = ws.filter((w) => w.date >= addDays(today, -120));
  const chart = lineChart([
    { points: recent.map((w) => ({ x: tsOf(w.date), y: w.kg })), cls: 'dim', dots: true, line: false },
    { points: weeks.filter((w) => w.week >= addDays(today, -120)).map((w) => ({ x: tsOf(addDays(w.week, 3) > today ? today : addDays(w.week, 3)), y: w.avg })), cls: 'gold', dots: true },
  ], { yFmt: (v) => fmt(v, 1) });

  const sugCls = { up: 'sugg', down: 'sugg', ok: 'sugg sugg-ok', wait: 'sugg sugg-mut', none: 'sugg sugg-mut' }[sug.kind];
  const wkRows = [...weeks].reverse().slice(0, 8).map((w, i, arr) => {
    const prev = arr[i + 1];
    const diff = prev ? w.avg - prev.avg : null;
    return `<div class="row-sb wk-row"><span>Semana de ${shortDate(w.week)}<span class="mut small"> · ${w.n} ${w.n === 1 ? 'pesagem' : 'pesagens'}</span></span>
      <span class="tnum">${fmt(w.avg, 1)} kg ${diff == null ? '' : `<span class="small ${diff > 0 ? 'gold' : 'mut'}">${diff > 0 ? '+' : ''}${fmt(diff, 1)}</span>`}</span></div>`;
  }).join('');

  const thisMon = mondayOf(today);
  const sums = [0, 1, 2, 3, 4, 5].map((i) => weekSummary(S, addDays(thisMon, -7 * i))).filter((s, i) => i === 0 || s.sessions || s.foodDays || s.water);
  const sumRows = sums.map((s, i) => `<div class="sum-wk">
      <div class="row-sb"><span class="slot-t">${i === 0 ? 'Esta semana' : 'Semana de ' + shortDate(s.monday)}</span><span class="tnum ${s.sessions >= s.planned ? 'gold' : ''}">${s.sessions}/${s.planned} treinos</span></div>
      <div class="grid3 small mt-s">
        <div><div class="tnum">${Number.isNaN(s.kcal) ? '—' : fmt(s.kcal)}</div><div class="mut">kcal/dia</div></div>
        <div><div class="tnum">${Number.isNaN(s.p) ? '—' : fmt(s.p) + ' g'}</div><div class="mut">proteína/dia</div></div>
        <div><div class="tnum">${Number.isNaN(s.water) ? '—' : fmt(s.water / 1000, 1) + ' L'}</div><div class="mut">água/dia</div></div>
      </div></div>`).join('');

  return `<header class="top"><h1 class="title">Progresso</h1></header>
    <section class="card">
      <div class="row-sb"><span class="lbl">${icon('scale', 'ic-sm')} Peso em jejum</span>
        ${ws.length ? `<span class="tnum"><span class="big-num">${fmt(ws[ws.length - 1].kg, 1)}</span><span class="mut"> kg</span></span>` : ''}</div>
      <button class="btn ${todayW ? '' : 'btn-gold'} btn-block mt-s" data-act="w-add">${todayW ? `Hoje: ${fmt(todayW, 1)} kg · editar` : 'Registar peso de hoje'}</button>
      <p class="mut small mt-s">2–3 vezes por semana, de manhã, em jejum e depois da casa de banho.</p>
    </section>
    <section class="card"><div class="row-sb"><span class="lbl">Evolução</span><span class="legend small"><i class="lg-dim"></i>diário <i class="lg-gold"></i>média semanal</span></div>${chart}</section>
    <section class="card"><div class="lbl">Ajuste calórico</div>
      <div class="${sugCls}">${icon(sug.kind === 'ok' ? 'checkCircle' : sug.kind === 'down' || sug.kind === 'up' ? 'trend' : 'info')}<span>${esc(sug.text)}</span></div>
      ${sug.kind === 'up' || sug.kind === 'down' ? `<p class="mut small">É só uma sugestão: as metas não mudam sozinhas.</p><a class="btn btn-block mt-s" href="#definicoes/metas">Rever metas</a>` : ''}
    </section>
    ${wkRows ? `<section class="card"><div class="lbl">Médias semanais</div>${wkRows}</section>` : ''}
    <section class="card"><div class="lbl">Resumos semanais</div>${sumRows}</section>
    ${ws.length ? `<section class="card"><div class="lbl">Registos</div><div class="list">${[...ws].reverse().slice(0, 20).map((w) =>
      `<button class="list-row" data-act="w-add" data-date="${w.date}"><span class="list-main">${longDate(w.date)}</span><span class="tnum">${fmt(w.kg, 1)} kg</span></button>`).join('')}</div></section>` : ''}`;
}
export { render_ as render };

export const actions = {
  'w-add'(d) {
    const today = dateKey();
    const date0 = d.date || today;
    const cur = S.days[date0]?.weight;
    const last = weights().pop();
    const body = openSheet(`<div class="sheet-title">Peso</div>
      <div class="grid2">${field('kg', numInput('kg', cur ?? '', `autofocus placeholder="${last ? fmt(last.kg, 1) : '75,0'}"`))}
      ${field('Data', `<input class="input" type="date" name="date" value="${date0}" max="${today}">`)}</div>
      <div class="${cur ? 'grid2' : ''} mt">${cur ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button>` : ''}<button class="btn btn-gold ${cur ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`);
    body.querySelector('[data-x=ok]').onclick = () => {
      const kg = num(body.querySelector('[name=kg]').value);
      const date = body.querySelector('[name=date]').value || today;
      if (!(kg > 25 && kg < 300)) { toast('Indicar um peso válido em kg'); return; }
      if (date > today) { toast('A data não pode ser no futuro'); return; }
      if (date !== date0 && S.days[date0]?.weight === cur && cur) { S.days[date0].weight = null; saveDay(date0); }
      day(date).weight = Math.round(kg * 10) / 10;
      saveDay(date);
      vibrate(20);
      closeSheet();
      toast('Peso registado');
      render();
    };
    body.querySelector('[data-x=del]')?.addEventListener('click', () => {
      S.days[date0].weight = null;
      saveDay(date0);
      closeSheet();
      render();
    });
  },
};

