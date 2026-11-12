// Modo treino: aquecimento, um exercício de cada vez (registo da série, descanso automático), alongamentos no fim.
import { S, saveActive, saveSession, sortSessions } from '../store.js';
import { phase, targetSets, lastPerformance, progression, prefill, workSets, bestKg, sessionStats, doseText, routineMinutes, guideStart, guideAdvance, guidePause, guideResume } from '../logic.js';
import { esc, fmt, fmtKg, num, mmss, uid, dateKey, round } from '../util.js';
import { icon, exPhoto, go, goThen, render, toast, vibrate, beep, unlockAudio, keepAwake, confirmDialog, openSheet, closeSheet, numInput, field } from '../ui.js';

export function startSession(templateId) {
  if (S.active) { go('#sessao'); return; }
  const tpl = S.cfg.templates.find((t) => t.id === templateId);
  if (!tpl) return;
  const date = dateKey();
  const ph = phase(S.cfg, date);
  const routine = (ids) => ({ ids: (ids || []).filter((id) => S.cfg.mobility?.[id]), done: {} });
  S.active = {
    id: uid(), date, templateId: tpl.id, name: tpl.name, week: ph.week, readapt: ph.readapt,
    startedAt: Date.now(), endedAt: null, cur: 0, restEnd: null, restTotal: 0, extra: false,
    items: tpl.items.filter((i) => S.cfg.exercises[i.exerciseId]).map((i) => ({
      exerciseId: i.exerciseId,
      target: { sets: targetSets(S.cfg, i.sets, date), repMin: i.repMin, repMax: i.repMax },
      log: [],
    })),
    warm: routine(tpl.warmup),
    cool: routine(tpl.cooldown),
    guide: null,
  };
  S.active.stage = S.active.warm.ids.length ? 'warm' : 'main';
  S.active.draft = makeDraft();
  saveActive();
  unlockAudio();
  keepAwake(true);
  go('#sessao');
}

/* ---------- Auxiliares ---------- */
const curItem = () => S.active.items[S.active.cur];
const exOf = (it) => S.cfg.exercises[it.exerciseId] || { id: it.exerciseId, name: '(exercício apagado)', kind: 'isolation', mode: 'load', inc: 2.5 };
const lastOf = (it) => lastPerformance(S.sessions, it.exerciseId, S.active.id);
function suggOf(it) {
  const s = progression(exOf(it), lastOf(it));
  if (!s) return null;
  if (S.active.readapt && !S.cfg.readapt.suggest) return null;
  return s;
}
function makeDraft() {
  const it = curItem();
  if (!it) return { kg: '', reps: '', w: false };
  const k = workSets(it.log).length;
  const p = prefill(it, lastOf(it), suggOf(it), k);
  return { kg: p.kg, reps: p.reps, w: false };
}
const isDone = (it) => workSets(it.log).length >= it.target.sets;
const restFor = (ex) => (ex.kind === 'compound' ? S.cfg.rest.compound : S.cfg.rest.isolation);
const restLabel = (ex) => (ex.kind === 'compound' ? 'descanso 2–3 min' : 'descanso 60–90 s');
const setStr = (ex, s) => (ex.mode === 'time' ? `${s.reps} s${s.kg ? ` · ${fmtKg(s.kg)} kg` : ''}` : `${fmtKg(s.kg || 0)} ${ex.mode === 'assisted' ? 'kg assist.' : ex.mode === 'bodyweight' ? (s.kg ? 'kg extra' : 'PC') : 'kg'} × ${s.reps}`);

/** "Aquecimento 6/6 · Alongamentos 4/5" (para resumos e histórico) */
export function routineSummary(s) {
  const part = (k, label) => (s[k]?.ids?.length ? `${label} ${s[k].ids.filter((id) => s[k].done[id]).length}/${s[k].ids.length}` : '');
  return [part('warm', 'Aquecimento'), part('cool', 'Alongamentos')].filter(Boolean).join(' · ');
}

/* ---------- Etapas: aquecimento (-1), exercícios (0…n-1), alongamentos (n) ---------- */
const hasR = (k) => !!S.active[k]?.ids?.length;
const movesOf = (k) => (S.active[k]?.ids || []).map((id) => S.cfg.mobility?.[id]).filter(Boolean);
const rDone = (k) => { const R = S.active[k]; return R ? R.ids.filter((id) => R.done[id]).length : 0; };
const stageOf = () => S.active.stage || 'main';
const pos = () => (stageOf() === 'warm' ? -1 : stageOf() === 'cool' ? S.active.items.length : S.active.cur);
const minPos = () => (hasR('warm') ? -1 : 0);
const maxPos = () => (hasR('cool') ? S.active.items.length : S.active.items.length - 1);

function header(A) {
  return `<header class="focus-top">
      <button class="icon-btn" data-act="s-menu" aria-label="Opções do treino">${icon('down')}</button>
      <div class="center"><div class="lbl lbl-tx">${esc(A.name)}</div><div class="mut small">Semana ${A.week}${A.readapt ? ' · readaptação' : ''}</div></div>
      <span class="clock tnum" id="s-clock">${mmss((Date.now() - A.startedAt) / 1000)}</span>
    </header>`;
}
function segs(A) {
  const p = pos();
  const rSeg = (k, i) => hasR(k) ? `<button class="seg seg-r ${rDone(k) === A[k].ids.length ? 'done' : rDone(k) ? 'part' : ''} ${p === i ? 'cur' : ''}" data-act="s-goto" data-i="${i}" aria-label="${k === 'warm' ? 'Aquecimento' : 'Alongamentos'}"></button>` : '';
  const ex = A.items.map((x, i) => {
    const st = isDone(x) ? 'done' : workSets(x.log).length ? 'part' : '';
    return `<button class="seg ${st} ${i === p ? 'cur' : ''}" data-act="s-goto" data-i="${i}" aria-label="Exercício ${i + 1}"></button>`;
  }).join('');
  return `<div class="segs">${rSeg('warm', -1)}${ex}${rSeg('cool', A.items.length)}</div>`;
}
function nav() {
  const p = pos();
  return `<div class="focus-nav">
      <button class="btn btn-ghost" data-act="s-goto" data-i="${p - 1}" ${p <= minPos() ? 'disabled' : ''}>${icon('left')} Anterior</button>
      <button class="btn btn-ghost" data-act="s-list">${icon('list')} Lista</button>
      <button class="btn btn-ghost" data-act="s-goto" data-i="${p + 1}" ${p >= maxPos() ? 'disabled' : ''}>Seguinte ${icon('right')}</button>
    </div>`;
}

const RC = 2 * Math.PI * 76;
const ringSvg = (idT, idC, left, total, cls = '') => `<svg class="rest-ring ${cls}" viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="85" r="76" class="ring-bg" stroke-width="4"/>
    <circle id="${idC}" cx="85" cy="85" r="76" class="ring-fg" stroke-width="4" stroke-linecap="round" stroke-dasharray="${RC.toFixed(1)}"
      stroke-dashoffset="${(RC * (1 - Math.max(0, total ? left / total : 0))).toFixed(1)}" transform="rotate(-90 85 85)"/>
    <text id="${idT}" x="85" y="97" text-anchor="middle" class="rest-time">${mmss(left)}</text></svg>`;

function guidePanel(g) {
  const st = g.steps[g.s];
  const m = S.cfg.mobility[st.id];
  if (!m) return '';
  const ids = [...new Set(g.steps.map((x) => x.id))];
  const n = ids.indexOf(st.id) + 1;
  const left = g.end ? (g.end - Date.now()) / 1000 : (g.left || 0) / 1000;
  const prev = g.steps[g.s - 1];
  const side = st.side === 0 ? 'Lado esquerdo' : st.side === 1 ? 'Lado direito' : '';
  const paused = g.left != null && !g.end;
  const top = g.phase === 'prep' ? (prev && prev.id === st.id ? 'Trocar de lado' : 'A seguir') : `${n} de ${ids.length}`;
  const body = g.phase === 'go' && !st.secs
    ? `<div class="guide-reps tnum">${m.val}<span class="mut"> reps${m.side ? ' por lado' : ''}</span></div>
       <button class="btn btn-gold btn-xl btn-block" data-act="g-next">${icon('check')} Feito</button>`
    : `${ringSvg('g-t', 'g-c', left, g.total, g.phase === 'prep' ? 'prep' : '')}
       <div class="grid3">${g.phase === 'prep'
          ? `<button class="btn" data-act="g-stop">Parar</button><button class="btn btn-gold" data-act="g-next" style="grid-column: span 2">Começar já</button>`
          : `<button class="btn" data-act="g-pause">${paused ? 'Retomar' : 'Pausa'}</button><button class="btn" data-act="g-next">Seguinte</button><button class="btn" data-act="g-stop">Parar</button>`}</div>`;
  return `<div class="guide">
      <div class="lbl">${top}</div>
      <div class="guide-name">${esc(m.name)}</div>
      <div class="mut small">${side ? `<b class="gold">${side}</b> · ` : ''}${esc(m.cue || doseText(m))}</div>
      ${body}
      ${g.phase === 'go' && !st.secs ? `<button class="btn btn-ghost btn-block mt-s" data-act="g-stop">Parar o guiado</button>` : ''}
    </div>`;
}

function routineView(k) {
  const A = S.active;
  const R = A[k];
  const moves = movesOf(k);
  const all = moves.every((m) => R.done[m.id]);
  const g = A.guide && A.guide.k === k ? A.guide : null;
  const isWarm = k === 'warm';
  const curId = g ? g.steps[g.s]?.id : null;
  const tip = isWarm
    ? 'Movimentos controlados, a aumentar a amplitude aos poucos. Depois, no primeiro exercício de cada grupo muscular, fazer 1–2 séries de aproximação (botão W) com ~50% e ~75% da carga.'
    : 'Manter cada posição sem balanços, a expirar devagar: tensão ligeira, nunca dor. Para ganhar flexibilidade conta o total por músculo (~60 s): quando houver tempo, repetir a sequência.';
  return `<div class="focus">
    ${header(A)}${segs(A)}
    <div class="stage-hero">
      <div class="lbl">${isWarm ? 'Antes dos exercícios' : 'Depois dos exercícios'}</div>
      <h1 class="ex-name">${isWarm ? 'Aquecimento' : 'Alongamentos'}</h1>
      <div class="mut ex-target">${moves.length} movimentos · ~${routineMinutes(moves)} min · ${isWarm ? 'mobilidade dinâmica' : 'estáticos, para a flexibilidade'}</div>
    </div>
    ${g ? guidePanel(g) : !all ? `<button class="btn btn-gold btn-xl btn-block mt" data-act="g-start" data-k="${k}">${icon('play')} ${rDone(k) ? 'Continuar guiado' : 'Iniciar guiado'}</button>` : ''}
    <div class="checklist mob-list">${moves.map((m) => `<button class="check-row ${R.done[m.id] ? 'on' : ''} ${m.id === curId ? 'cur' : ''}" data-act="r-toggle" data-k="${k}" data-id="${m.id}">
        <span class="check-box">${icon(R.done[m.id] ? 'checkCircle' : 'circle')}</span>
        <span class="check-txt">${esc(m.name)}<span class="mut small block">${esc(m.cue || '')}</span></span>
        <span class="mut small tnum dose">${doseText(m)}</span></button>`).join('')}</div>
    <p class="mut small mt-s">${tip}</p>
    ${isWarm
      ? `<button class="btn ${all ? 'btn-gold' : ''} btn-xl btn-block mt" data-act="s-goto" data-i="0">${all ? 'Começar os exercícios' : 'Passar aos exercícios'} ${icon('right')}</button>`
      : `<button class="btn ${all ? 'btn-gold' : ''} btn-xl btn-block mt" data-act="s-finish">${icon('flag')} Terminar treino</button>`}
    ${nav()}
  </div>`;
}

/* ---------- Render ---------- */
export function render_() {
  const A = S.active;
  if (!A) return `<div class="focus empty"><p class="mut">Não há treino em curso.</p><a class="btn btn-gold" href="#treino">Ver treinos</a></div>`;
  if (stageOf() === 'warm' && hasR('warm')) return routineView('warm');
  if (stageOf() === 'cool' && hasR('cool')) return routineView('cool');
  const it = curItem();
  const ex = exOf(it);
  const last = lastOf(it);
  const sugg = suggOf(it);
  const ws = workSets(it.log);
  const lastSets = last ? workSets(last.item.log) : [];
  const resting = A.restEnd && A.restEnd > Date.now();
  const done = isDone(it) && !A.extra;
  const isLast = A.cur === A.items.length - 1;
  const unit = ex.mode === 'time' ? 's' : 'reps';
  const cool = hasR('cool');

  let k = 0;
  const logRows = it.log.map((s, idx) => {
    const label = s.w ? 'W' : `Série ${++k}`;
    const ref = !s.w ? lastSets[k - 1] : null;
    return `<button class="set-row ${s.w ? 'warm' : ''}" data-act="s-edit" data-idx="${idx}">
      <span class="set-l">${label}</span><span class="set-v tnum">${setStr(ex, s)}${s.pr ? ` <span class="pr">${icon('star', 'ic-xs')} recorde</span>` : ''}</span>
      <span class="set-ref mut tnum">${ref ? 'antes ' + setStr(ex, ref) : ''}</span>${icon('check', 'ic-gold')}</button>`;
  }).join('');

  const nextIdx = ws.length;
  const refNext = lastSets[nextIdx] || null;
  const kgLabel = ex.mode === 'assisted' ? 'kg assistência' : ex.mode === 'bodyweight' ? 'kg extra' : ex.mode === 'time' ? 'kg (opcional)' : 'kg';

  const entry = `<div class="entry">
      <div class="row-sb entry-h"><span>${A.draft.w ? 'Aquecimento' : A.extra || ws.length >= it.target.sets ? `Série extra (${ws.length + 1})` : `Série ${ws.length + 1} de ${it.target.sets}`}</span>
        <span class="mut tnum">${!A.draft.w && refNext ? 'Última: ' + setStr(ex, refNext) : !A.draft.w && !last ? 'Primeira vez' : ''}</span></div>
      <div class="grid2">
        <div class="stepper"><button data-act="s-step" data-f="kg" data-d="-1" aria-label="Menos">${icon('minus')}</button>
          <div class="stepper-v"><input class="step-in tnum" id="d-kg" inputmode="decimal" value="${A.draft.kg === '' ? '' : String(A.draft.kg).replace('.', ',')}" placeholder="0" data-draft="kg"><span class="mut small">${kgLabel}</span></div>
          <button data-act="s-step" data-f="kg" data-d="1" aria-label="Mais">${icon('plus')}</button></div>
        <div class="stepper"><button data-act="s-step" data-f="reps" data-d="-1" aria-label="Menos">${icon('minus')}</button>
          <div class="stepper-v"><input class="step-in tnum" id="d-reps" inputmode="numeric" value="${A.draft.reps}" placeholder="0" data-draft="reps"><span class="mut small">${unit}</span></div>
          <button data-act="s-step" data-f="reps" data-d="1" aria-label="Mais">${icon('plus')}</button></div>
      </div>
      <div class="entry-actions"><button class="btn btn-w ${A.draft.w ? 'on' : ''}" data-act="s-warm" aria-pressed="${A.draft.w}">W</button>
        <button class="btn btn-gold btn-xl" data-act="s-log">Série feita</button></div>
    </div>`;

  const restPanel = () => {
    const left = (A.restEnd - Date.now()) / 1000;
    return `<div class="rest">
      <div class="lbl">Descanso</div>
      ${ringSvg('rest-t', 'rest-c', left, A.restTotal)}
      <div class="grid3"><button class="btn" data-act="s-rest" data-d="-15">−15 s</button><button class="btn" data-act="s-rest" data-d="15">+15 s</button><button class="btn" data-act="s-skip">Saltar</button></div>
      <div class="mut small center mt-s">A seguir: ${done ? (isLast ? (cool ? 'alongamentos' : 'terminar o treino') : esc(exOf(A.items[A.cur + 1]).name)) : `série ${ws.length + 1} de ${it.target.sets}`}</div>
    </div>`;
  };

  const donePanel = `<div class="done-panel">
      <div class="done-badge">${icon('checkCircle')} Exercício concluído</div>
      ${!isLast ? `<button class="btn btn-gold btn-xl btn-block" data-act="s-next">Próximo exercício ${icon('right')}</button>`
        : cool ? `<button class="btn btn-gold btn-xl btn-block" data-act="s-next">Alongamentos ${icon('right')}</button>`
        : `<button class="btn btn-gold btn-xl btn-block" data-act="s-finish">Terminar treino</button>`}
      <button class="btn btn-ghost btn-block mt-s" data-act="s-extra">${icon('plus')} Série extra</button>
    </div>`;

  return `<div class="focus">
    ${header(A)}
    ${segs(A)}
    <div class="photo">${exPhoto(ex)}<span class="photo-tag">${A.cur + 1}/${A.items.length}</span></div>
    <h1 class="ex-name">${esc(ex.name)}</h1>
    <div class="mut ex-target">${it.target.sets} × ${it.target.repMin}${it.target.repMax !== it.target.repMin ? '–' + it.target.repMax : ''} ${unit}${ex.perSide ? ' por perna' : ''} · ${A.readapt ? '3–4' : '1–2'} reps em reserva · ${restLabel(ex)}</div>
    ${sugg && !ws.length ? `<div class="sugg">${icon('trend')} <span>${esc(sugg.text)}</span></div>` : ''}
    <div class="sets">${logRows}</div>
    ${resting ? restPanel() : done ? donePanel : entry}
    ${nav()}
  </div>`;
}
export { render_ as render };

/* ---------- Temporizador (chamado pela app a cada 250 ms) ---------- */
let frame = 0;
export function tick() {
  const A = S.active;
  if (!A) return;
  const c = document.getElementById('s-clock');
  if (c) c.textContent = mmss((Date.now() - A.startedAt) / 1000);
  if (A.restEnd) {
    const left = (A.restEnd - Date.now()) / 1000;
    const t = document.getElementById('rest-t');
    const r = document.getElementById('rest-c');
    if (t) t.textContent = mmss(left);
    if (r) r.setAttribute('stroke-dashoffset', (RC * (1 - Math.max(0, left / A.restTotal))).toFixed(1));
    if (left <= 0) {
      A.restEnd = null;
      saveActive();
      vibrate([400, 150, 400, 150, 400]);
      beep();
      if (location.hash.startsWith('#sessao')) render();
      else toast('Descanso terminado', { gold: true, action: { label: 'Voltar ao treino', fn: () => go('#sessao') } });
    }
  }
  if (A.guide?.end) {
    const g = A.guide;
    const left = (g.end - Date.now()) / 1000;
    const t = document.getElementById('g-t');
    const r = document.getElementById('g-c');
    if (t) t.textContent = mmss(left);
    if (r) r.setAttribute('stroke-dashoffset', (RC * (1 - Math.max(0, g.total ? left / g.total : 0))).toFixed(1));
    if (left <= 0) guideStep(false);
  }
  if (++frame % 4 === 0) {
    document.querySelectorAll('.ex-img.anim').forEach((img) => { img.src = img.src.endsWith(img.dataset.a) ? img.dataset.b : img.dataset.a; });
  }
}

/* ---------- Ações ---------- */
function readDraftInputs() {
  const A = S.active;
  const kg = document.getElementById('d-kg');
  const reps = document.getElementById('d-reps');
  if (kg) A.draft.kg = kg.value.trim() === '' ? '' : num(kg.value);
  if (reps) A.draft.reps = reps.value.trim() === '' ? '' : parseInt(reps.value, 10);
}

/** p: -1 aquecimento · 0…n-1 exercícios · n alongamentos */
function moveTo(p) {
  const A = S.active;
  if (p < minPos() || p > maxPos()) return;
  const stage = p < 0 ? 'warm' : p >= A.items.length ? 'cool' : 'main';
  if (A.guide && A.guide.k !== stage) A.guide = null;
  A.stage = stage;
  if (stage === 'main') A.cur = p;
  A.extra = false;
  A.draft = makeDraft();
  saveActive();
  render();
  window.scrollTo(0, 0);
}

/** Avança o modo guiado (fim do tempo ou toque). */
function guideStep(manual) {
  const A = S.active;
  const g = A.guide;
  if (!g) return;
  const wasPrep = g.phase === 'prep';
  const r = guideAdvance(g, Date.now());
  if (r.done) A[g.k].done[r.done] = Date.now();
  A.guide = r.g;
  // o próximo passo já foi marcado à mão: recomeça a partir dos que faltam
  if (r.g && A[g.k].done[r.g.steps[r.g.s].id]) A.guide = guideStart(g.k, movesOf(g.k), A[g.k].done, Date.now());
  if (!r.g) {
    vibrate([60, 80, 60]);
    beep('end');
    toast(g.k === 'warm' ? 'Aquecimento concluído' : 'Alongamentos concluídos', { gold: true });
  } else if (!manual) {
    if (wasPrep) { vibrate(150); beep('go'); } else { vibrate([80, 60, 80]); beep('tick'); }
  }
  saveActive();
  if (location.hash.startsWith('#sessao')) render();
}

export const actions = {
  's-goto'(d) { readDraftInputs(); moveTo(+d.i); },
  's-next'() { moveTo(pos() + 1); },
  'r-toggle'(d) {
    const R = S.active[d.k];
    if (!R) return;
    if (R.done[d.id]) delete R.done[d.id];
    else { R.done[d.id] = Date.now(); vibrate(15); }
    // marcado à mão o movimento em que o guiado está: segue para o próximo por fazer
    const g = S.active.guide;
    if (g && g.k === d.k && R.done[d.id] && g.steps[g.s].id === d.id) S.active.guide = guideStart(d.k, movesOf(d.k), R.done, Date.now());
    saveActive();
    render();
  },
  'g-start'(d) {
    unlockAudio();
    S.active.guide = guideStart(d.k, movesOf(d.k), S.active[d.k].done, Date.now());
    saveActive();
    render();
  },
  'g-next'() { guideStep(true); },
  'g-pause'() {
    const A = S.active;
    if (!A.guide) return;
    A.guide = A.guide.end ? guidePause(A.guide, Date.now()) : guideResume(A.guide, Date.now());
    saveActive();
    render();
  },
  'g-stop'() { S.active.guide = null; saveActive(); render(); },
  's-step'(d) {
    readDraftInputs();
    const A = S.active;
    const ex = exOf(curItem());
    if (d.f === 'kg') {
      const base = A.draft.kg === '' || Number.isNaN(A.draft.kg) ? 0 : A.draft.kg;
      A.draft.kg = Math.max(0, round(base + +d.d * ex.inc));
    } else {
      const step = ex.mode === 'time' ? 5 : 1;
      const base = A.draft.reps === '' || Number.isNaN(A.draft.reps) ? 0 : A.draft.reps;
      A.draft.reps = Math.max(0, base + +d.d * step);
    }
    vibrate(8);
    saveActive();
    // atualiza só o campo (sem redesenhar o ecrã) para os toques rápidos serem instantâneos
    const el = document.getElementById(d.f === 'kg' ? 'd-kg' : 'd-reps');
    if (el) el.value = String(A.draft[d.f]).replace('.', ',');
    else render();
  },
  's-warm'() { readDraftInputs(); S.active.draft.w = !S.active.draft.w; saveActive(); render(); },
  's-log'() {
    readDraftInputs();
    unlockAudio();
    const A = S.active;
    const it = curItem();
    const ex = exOf(it);
    const reps = A.draft.reps;
    let kg = A.draft.kg;
    if (!(reps > 0)) { toast(ex.mode === 'time' ? 'Indicar os segundos' : 'Indicar as repetições'); return; }
    if (kg === '' || Number.isNaN(kg)) {
      if (ex.mode === 'load') { toast('Indicar a carga em kg'); document.getElementById('d-kg')?.focus(); return; }
      kg = 0;
    }
    const set = { kg, reps, w: !!A.draft.w, t: Date.now() };
    if (!set.w && kg > 0 && (ex.mode === 'load' || ex.mode === 'bodyweight')) {
      const best = bestKg(S.sessions, ex.id, A.id);
      const bestHere = Math.max(-Infinity, ...workSets(it.log).map((s) => s.kg || 0));
      if (best > -Infinity && kg > best && kg > bestHere) {
        set.pr = true;
        toast(`Novo recorde: ${fmtKg(kg)} kg`, { gold: true });
        vibrate([30, 60, 30, 60, 120]);
      }
    }
    it.log.push(set);
    if (!set.pr) vibrate(25);
    if (!set.w) {
      A.restTotal = restFor(ex);
      A.restEnd = Date.now() + A.restTotal * 1000;
      if (A.extra) A.extra = false;
    }
    A.draft = makeDraft();
    saveActive();
    render();
  },
  's-rest'(d) {
    const A = S.active;
    A.restEnd += +d.d * 1000;
    A.restTotal = Math.max(1, A.restTotal + +d.d);
    if (A.restEnd <= Date.now()) A.restEnd = Date.now() + 1000;
    saveActive();
  },
  's-skip'() { S.active.restEnd = null; saveActive(); render(); },
  's-extra'() { S.active.extra = true; S.active.draft = makeDraft(); saveActive(); render(); },
  's-edit'(d) {
    const A = S.active;
    const it = curItem();
    const ex = exOf(it);
    const s = it.log[+d.idx];
    if (!s) return;
    const body = openSheet(`<div class="sheet-title">Editar série</div>
      <div class="grid2">${field(ex.mode === 'assisted' ? 'kg assistência' : ex.mode === 'bodyweight' ? 'kg extra' : 'kg', numInput('kg', s.kg))}
      ${field(ex.mode === 'time' ? 'segundos' : 'reps', numInput('reps', s.reps, 'inputmode="numeric"'))}</div>
      <label class="toggle mt-s"><input type="checkbox" name="w" ${s.w ? 'checked' : ''}><span>Série de aquecimento (W)</span></label>
      <div class="grid2 mt"><button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button><button class="btn btn-gold" data-x="ok">Guardar</button></div>`);
    body.querySelector('[data-x=ok]').onclick = () => {
      const kg = num(body.querySelector('[name=kg]').value);
      const reps = parseInt(body.querySelector('[name=reps]').value, 10);
      if (!(reps > 0)) { toast('Indicar as repetições'); return; }
      s.kg = Number.isNaN(kg) ? 0 : kg;
      s.reps = reps;
      s.w = body.querySelector('[name=w]').checked;
      if (s.w) delete s.pr;
      A.draft = makeDraft();
      saveActive(); closeSheet(); render();
    };
    body.querySelector('[data-x=del]').onclick = () => {
      it.log.splice(+d.idx, 1);
      A.draft = makeDraft();
      saveActive(); closeSheet(); render();
    };
  },
  's-list'() {
    readDraftInputs();
    const A = S.active;
    const p = pos();
    const rRow = (k, i) => {
      if (!hasR(k)) return '';
      const n = rDone(k), tot = A[k].ids.length;
      return `<button class="list-row ${p === i ? 'cur' : ''}" data-i="${i}">
          <span class="list-main">${k === 'warm' ? 'Aquecimento' : 'Alongamentos'}</span>
          <span class="mut small tnum">${n}/${tot}</span>${n === tot ? icon('check', 'ic-gold') : ''}</button>`;
    };
    const body = openSheet(`<div class="sheet-title">${esc(A.name)}</div>
      <div class="list">${rRow('warm', -1)}${A.items.map((it, i) => {
        const ex = exOf(it); const n = workSets(it.log).length;
        return `<button class="list-row ${i === p ? 'cur' : ''}" data-i="${i}">
          <span class="list-main">${esc(ex.name)}</span>
          <span class="mut small tnum">${n}/${it.target.sets}</span>${isDone(it) ? icon('check', 'ic-gold') : ''}</button>`;
      }).join('')}${rRow('cool', A.items.length)}</div>
      <button class="btn btn-gold btn-block mt" data-x="finish">Terminar treino</button>`);
    body.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { closeSheet(); moveTo(+b.dataset.i); }));
    body.querySelector('[data-x=finish]').onclick = () => { closeSheet(); actions['s-finish'](); };
  },
  's-menu'() {
    readDraftInputs();
    const body = openSheet(`<div class="sheet-title">Treino em curso</div>
      <div class="list">
        <button class="list-row" data-x="min">${icon('down')}<span class="list-main">Minimizar e continuar depois</span></button>
        <button class="list-row" data-x="finish">${icon('flag')}<span class="list-main">Terminar e guardar</span></button>
        <button class="list-row danger" data-x="cancel">${icon('trash')}<span class="list-main">Cancelar treino sem guardar</span></button>
      </div>`);
    body.querySelector('[data-x=min]').onclick = () => { closeSheet(); go('#hoje'); };
    body.querySelector('[data-x=finish]').onclick = () => { closeSheet(); actions['s-finish'](); };
    body.querySelector('[data-x=cancel]').onclick = async () => {
      closeSheet();
      if (await confirmDialog('Cancelar este treino?', { ok: 'Cancelar treino', danger: true, detail: 'As séries registadas hoje serão perdidas.' })) {
        S.active = null; saveActive(); keepAwake(false); go('#treino');
      }
    };
  },
  async 's-finish'() {
    const A = S.active;
    const missing = A.items.reduce((n, it) => n + Math.max(0, it.target.sets - workSets(it.log).length), 0);
    const total = A.items.reduce((n, it) => n + workSets(it.log).length, 0);
    if (!total) {
      if (await confirmDialog('Ainda não há séries registadas.', { ok: 'Cancelar treino', danger: true, detail: 'Um treino sem séries não é guardado.' })) {
        S.active = null; saveActive(); keepAwake(false); go('#treino');
      }
      return;
    }
    if (missing && !(await confirmDialog(`Faltam ${missing} séries. Terminar mesmo assim?`, { ok: 'Terminar' }))) return;
    A.endedAt = Date.now();
    A.restEnd = null;
    delete A.draft; delete A.extra; delete A.guide; delete A.stage;
    const session = A;
    S.sessions.push(session);
    sortSessions();
    await saveSession(session);
    S.active = null;
    await saveActive();
    keepAwake(false);
    const st = sessionStats(session);
    const prs = session.items.flatMap((it) => it.log.filter((s) => s.pr).map((s) => ({ ex: exOf(it), s })));
    goThen('#hoje', () => openSheet(`<div class="summary">
      <div class="summary-mark">${icon('checkCircle')}</div>
      <div class="sheet-title center">${esc(session.name)} concluído</div>
      <div class="grid3 stats">
        <div><div class="stat-v tnum">${mmss(st.duration)}</div><div class="mut small">duração</div></div>
        <div><div class="stat-v tnum">${st.sets}</div><div class="mut small">séries</div></div>
        <div><div class="stat-v tnum">${fmt(st.volume)}</div><div class="mut small">kg de volume</div></div>
      </div>
      ${routineSummary(session) ? `<p class="mut small mt-s">${routineSummary(session)}</p>` : ''}
      ${prs.length ? `<div class="lbl mt">Recordes</div>${prs.map((p) => `<div class="row-sb pr-row"><span>${esc(p.ex.name)}</span><span class="gold tnum">${fmtKg(p.s.kg)} kg × ${p.s.reps}</span></div>`).join('')}` : ''}
      <button class="btn btn-gold btn-block mt" data-sheet-done>Fechar</button></div>`).querySelector('[data-sheet-done]').onclick = () => closeSheet());
    vibrate([60, 80, 60]);
  },
};

/** Guarda o que está escrito nos campos antes de sair do ecrã. */
export function onLeave() { if (S.active && document.getElementById('d-kg')) { readDraftInputs(); saveActive(); } }
