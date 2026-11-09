// Separador Treino: semana, pré-visualização, histórico de sessões e histórico por exercício.
import { S, removeSession } from '../store.js';
import { phase, templateFor, sessionStats, exerciseHistory, workSets, targetSets } from '../logic.js';
import { dateKey, mondayOf, addDays, DIAS_CURTOS, shortDate, longDate, esc, fmt, fmtKg, mmss, weekday } from '../util.js';
import { icon, exThumb, exPhoto, openSheet, closeSheet, lineChart, confirmDialog, render as rerender } from '../ui.js';
import { startSession } from './sessao.js';

const exName = (id) => S.cfg.exercises[id]?.name || '(exercício apagado)';

function setText(ex, s) {
  if (!ex) return `${fmtKg(s.kg)} × ${s.reps}`;
  if (ex.mode === 'time') return `${s.reps} s`;
  if (ex.mode === 'assisted') return `${fmtKg(s.kg)} kg assist. × ${s.reps}`;
  if (ex.mode === 'bodyweight') return `${s.kg ? '+' + fmtKg(s.kg) + ' kg' : 'PC'} × ${s.reps}`;
  return `${fmtKg(s.kg)} kg × ${s.reps}`;
}

function mainView() {
  const today = dateKey();
  const ph = phase(S.cfg, today);
  const mon = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const rows = week.map((d) => {
    const wd = weekday(d);
    const tpl = S.cfg.templates.find((t) => t.weekday === wd);
    const done = S.sessions.some((s) => s.date === d && s.endedAt && (!tpl || s.templateId === tpl.id));
    const isToday = d === today;
    return `<button class="week-row ${isToday ? 'today' : ''} ${done ? 'done' : ''}" ${tpl ? `data-act="t-preview" data-id="${tpl.id}"` : 'disabled'}>
      <span class="week-d">${DIAS_CURTOS[wd % 7]}</span>
      <span class="week-n">${tpl ? esc(tpl.name) : '<span class="mut">Descanso</span>'}</span>
      <span class="week-s">${done ? icon('checkCircle', 'ic-gold') : isToday && tpl ? '<span class="tag tag-gold">hoje</span>' : ''}</span></button>`;
  }).join('');

  const hist = S.sessions.filter((s) => s.endedAt).slice(0, 12).map((s) => {
    const st = sessionStats(s);
    return `<button class="list-row" data-act="t-session" data-id="${s.id}">
      <span class="list-main">${esc(s.name)}<span class="mut small block">${longDate(s.date)}</span></span>
      <span class="mut small tnum">${mmss(st.duration)} · ${st.sets} séries</span>${icon('right', 'ic-mut')}</button>`;
  }).join('');

  const used = new Set(S.sessions.flatMap((s) => s.items.filter((i) => workSets(i.log).length).map((i) => i.exerciseId)));
  const exList = Object.values(S.cfg.exercises).sort((a, b) => a.name.localeCompare(b.name)).map((ex) =>
    `<a class="list-row" href="#treino/ex/${ex.id}">${exThumb(ex)}<span class="list-main">${esc(ex.name)}</span>${used.has(ex.id) ? '' : '<span class="mut small">sem registos</span>'}${icon('right', 'ic-mut')}</a>`).join('');

  return `<header class="top"><h1 class="title">Treino</h1>
      <span class="tag ${ph.readapt ? 'tag-gold' : ''}">${ph.week ? `Semana ${ph.week} · ${ph.label.toLowerCase()}` : 'Antes do início'}</span></header>
    ${S.active ? `<a class="banner banner-live" href="#sessao"><span class="live-dot"></span><span><b>${esc(S.active.name)}</b> em curso</span><span class="gold">Voltar ${icon('right')}</span></a>` : ''}
    <section class="card">
      <div class="lbl">Esta semana</div>
      <div class="week">${rows}</div>
      <p class="mut small mt-s">${ph.readapt ? `Readaptação: ${S.cfg.readapt.sets} séries por exercício, parar com 3–4 reps em reserva.` : 'Séries completas, parar com 1–2 reps em reserva. Progressão dupla ativa.'}</p>
    </section>
    <section class="card"><div class="lbl">Histórico</div>
      ${hist ? `<div class="list">${hist}</div>` : '<p class="mut">Os treinos terminados aparecem aqui.</p>'}</section>
    <section class="card"><div class="lbl">Exercícios</div><div class="list">${exList}</div></section>`;
}

function exerciseView(id) {
  const ex = S.cfg.exercises[id];
  if (!ex) return `<p class="mut">Exercício não encontrado.</p>`;
  const h = exerciseHistory(S.sessions, id);
  const best = h.length ? Math.max(...h.map((x) => x.maxKg)) : null;
  const lastH = h[h.length - 1];
  const kgLabel = ex.mode === 'assisted' ? 'Assistência (kg)' : ex.mode === 'time' ? 'Tempo máximo (s)' : 'Carga máxima (kg)';
  const pts = ex.mode === 'time'
    ? h.map((x) => ({ x: x.ts, y: Math.max(...x.sets.map((s) => s.reps)) }))
    : h.map((x) => ({ x: x.ts, y: x.maxKg }));
  const vol = h.map((x) => ({ x: x.ts, y: x.volume }));
  const kindL = ex.kind === 'compound' ? 'Composto' : 'Isolado';
  return `<header class="top"><a class="icon-btn" href="#treino" aria-label="Voltar">${icon('left')}</a><h1 class="title title-sm">${esc(ex.name)}</h1><span></span></header>
    <div class="photo">${exPhoto(ex)}</div>
    <div class="chips mt-s"><span class="tag">${kindL}</span><span class="tag">+${fmtKg(ex.inc)} ${ex.mode === 'time' ? 's' : 'kg'} por subida</span>${ex.perSide ? '<span class="tag">por perna</span>' : ''}</div>
    <div class="grid3 stats card">
      <div><div class="stat-v tnum">${h.length}</div><div class="mut small">sessões</div></div>
      <div><div class="stat-v tnum">${best == null ? '—' : ex.mode === 'time' ? Math.max(...pts.map((p) => p.y)) + ' s' : fmtKg(best)}</div><div class="mut small">${ex.mode === 'assisted' ? 'assist. máx.' : 'melhor'}</div></div>
      <div><div class="stat-v tnum">${lastH ? shortDate(lastH.date) : '—'}</div><div class="mut small">última vez</div></div>
    </div>
    <section class="card"><div class="lbl">${kgLabel}</div>${lineChart([{ points: pts, cls: 'gold', dots: true }], { yFmt: (v) => fmt(v, 1) })}</section>
    ${ex.mode === 'load' ? `<section class="card"><div class="lbl">Volume (kg × reps)</div>${lineChart([{ points: vol, cls: 'white', dots: true }], { yFmt: (v) => fmt(v) })}</section>` : ''}
    <section class="card"><div class="lbl">Sessões</div>
      ${h.length ? `<div class="list">${[...h].reverse().slice(0, 15).map((x) => `<button class="list-row" data-act="t-session" data-id="${x.sessionId}">
        <span class="list-main">${shortDate(x.date)}</span><span class="mut small tnum">${x.sets.map((s) => setText(ex, s)).join(' · ')}</span></button>`).join('')}</div>` : '<p class="mut">Ainda sem registos.</p>'}
    </section>`;
}

function sessionSheet(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  const st = sessionStats(s);
  const body = openSheet(`<div class="sheet-title">${esc(s.name)}</div><div class="mut">${longDate(s.date)} · semana ${s.week}${s.readapt ? ' · readaptação' : ''}</div>
    <div class="grid3 stats mt-s">
      <div><div class="stat-v tnum">${mmss(st.duration)}</div><div class="mut small">duração</div></div>
      <div><div class="stat-v tnum">${st.sets}</div><div class="mut small">séries</div></div>
      <div><div class="stat-v tnum">${fmt(st.volume)}</div><div class="mut small">kg volume</div></div></div>
    ${s.items.map((it) => {
      const ex = S.cfg.exercises[it.exerciseId];
      if (!it.log.length) return `<div class="sess-ex"><div class="mut">${esc(exName(it.exerciseId))} · não feito</div></div>`;
      let k = 0;
      return `<div class="sess-ex"><div>${esc(exName(it.exerciseId))}</div>${it.log.map((x) => `<div class="row-sb small"><span class="mut">${x.w ? 'W' : 'Série ' + ++k}</span><span class="tnum">${setText(ex, x)}${x.pr ? ' <span class="gold">recorde</span>' : ''}</span></div>`).join('')}</div>`;
    }).join('')}
    <button class="btn btn-danger btn-block mt" data-x="del">${icon('trash')} Apagar este treino</button>`);
  body.querySelector('[data-x=del]').onclick = async () => {
    if (await confirmDialog('Apagar este treino?', { ok: 'Apagar', danger: true, detail: 'Esta ação não pode ser desfeita.' })) {
      await removeSession(id);
      closeSheet();
      rerender();
    }
  };
}

export function render(args = []) {
  if (args[0] === 'ex') return exerciseView(args[1]);
  if (args[0] === 's') { setTimeout(() => { sessionSheet(args[1]); history.replaceState(null, '', '#treino'); }, 0); }
  return mainView();
}

export const actions = {
  't-preview'(d) {
    const tpl = S.cfg.templates.find((t) => t.id === d.id);
    if (!tpl) return;
    const date = dateKey();
    const isToday = templateFor(S.cfg, date)?.id === tpl.id;
    const body = openSheet(`<div class="sheet-title">${esc(tpl.name)}</div>
      <div class="list">${tpl.items.map((i) => {
        const ex = S.cfg.exercises[i.exerciseId];
        if (!ex) return '';
        const sets = targetSets(S.cfg, i.sets, date);
        return `<div class="list-row">${exThumb(ex)}<span class="list-main">${esc(ex.name)}</span><span class="mut small tnum">${sets} × ${i.repMin}${i.repMax !== i.repMin ? '–' + i.repMax : ''}${ex.mode === 'time' ? ' s' : ''}</span></div>`;
      }).join('')}</div>
      ${S.active ? `<p class="mut small mt">Já há um treino em curso (${esc(S.active.name)}).</p><a class="btn btn-gold btn-block mt-s" href="#sessao" data-x="go">Voltar ao treino</a>`
                 : `<button class="btn btn-gold btn-xl btn-block mt" data-x="start">${icon('play')} Começar ${isToday ? '' : 'hoje '}${esc(tpl.name)}</button>`}`);
    body.querySelector('[data-x=start]')?.addEventListener('click', () => { closeSheet(); startSession(tpl.id); });
    body.querySelector('[data-x=go]')?.addEventListener('click', () => closeSheet());
  },
  't-session'(d) { sessionSheet(d.id); },
};
