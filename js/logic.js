// Regras do plano: semanas, progressão, nutrição, peso. Funções puras (testadas em tests/).
import { daysBetween, weekday, mondayOf, addDays, fmtKg, fmt, mean, round } from './util.js';

/* ---------- Semanas e treino do dia ---------- */

/** Semana do plano (1, 2, …). 0 = antes da data de início. */
export function planWeek(startDate, date) {
  if (!startDate) return 1;
  const d = daysBetween(startDate, date);
  return d < 0 ? 0 : Math.floor(d / 7) + 1;
}

export function phase(cfg, date) {
  const week = planWeek(cfg.startDate, date);
  if (week === 0) return { week, readapt: false, rir: '1–2', label: 'Antes do início' };
  const readapt = week <= cfg.readapt.weeks;
  return { week, readapt, rir: readapt ? '3–4' : '1–2', label: readapt ? 'Readaptação' : 'Fase normal' };
}

/** Treinos pela ordem do plano (os de dia fixo primeiro, de segunda a domingo). */
export const tplOrder = (cfg) => cfg.templates.map((t, i) => [t, i]).sort((a, b) => (a[0].weekday || 9) - (b[0].weekday || 9) || a[1] - b[1]).map(([t]) => t);

const isWorkout = (s) => s.endedAt && s.kind !== 'flex';

/**
 * Modo sequência: o treino a seguir ao último feito, seja qual for o dia da semana.
 * Se o treino de hoje já foi feito, devolve esse (para o ecrã mostrar "concluído").
 * sessions: mais recente primeiro.
 */
export function nextInSequence(cfg, sessions, date) {
  const order = tplOrder(cfg);
  if (!order.length) return null;
  const last = (sessions || []).find((s) => isWorkout(s) && s.date <= date && order.some((t) => t.id === s.templateId));
  if (!last) return order[0];
  const i = order.findIndex((t) => t.id === last.templateId);
  return last.date === date ? order[i] : order[(i + 1) % order.length];
}

/** Treino do dia: pelo dia da semana (por defeito) ou o próximo da sequência (cfg.schedule = 'sequence'). */
export function templateFor(cfg, date, sessions = []) {
  if (cfg.schedule === 'sequence') return nextInSequence(cfg, sessions, date);
  return cfg.templates.find((t) => t.weekday === weekday(date)) || null;
}

/** Modo por dia da semana: treinos de dias anteriores desta semana que ficaram por fazer. */
export function missedThisWeek(cfg, sessions, date) {
  if (cfg.schedule === 'sequence') return [];
  const mon = mondayOf(date);
  const wd = weekday(date);
  const done = new Set((sessions || []).filter((s) => isWorkout(s) && s.date >= mon && s.date <= date).map((s) => s.templateId));
  return tplOrder(cfg).filter((t) => t.weekday >= 1 && t.weekday < wd && !done.has(t.id));
}

export function targetSets(cfg, sets, date) {
  return phase(cfg, date).readapt ? Math.min(sets, cfg.readapt.sets) : sets;
}

/* ---------- Séries e histórico ---------- */

export const workSets = (log) => (log || []).filter((s) => !s.w);

/** Última sessão terminada com séries normais deste exercício. sessions: mais recente primeiro. */
export function lastPerformance(sessions, exerciseId, excludeId) {
  for (const s of sessions) {
    if (s.id === excludeId || !s.endedAt) continue;
    const item = s.items.find((i) => i.exerciseId === exerciseId);
    if (item && workSets(item.log).length) return { session: s, item };
  }
  return null;
}

/**
 * Progressão dupla: se na última sessão todas as séries normais (pelo menos as planeadas)
 * chegaram ao topo da gama, sugere subir a carga e voltar ao fundo da gama.
 */
export function progression(ex, last) {
  if (!last) return null;
  const sets = workSets(last.item.log);
  const t = last.item.target;
  if (sets.length < t.sets || !sets.every((s) => s.reps >= t.repMax)) return null;
  const kg = Math.max(...sets.map((s) => s.kg || 0));
  const inc = ex.inc;
  switch (ex.mode) {
    case 'assisted': {
      const nk = Math.max(0, round(kg - inc));
      return {
        kg: nk, reps: t.repMin,
        text: nk === 0 ? 'Topo da gama atingido. Experimentar sem assistência.' : `Topo da gama atingido. Reduzir a assistência para ${fmtKg(nk)} kg.`,
      };
    }
    case 'time':
      return { kg, reps: t.repMax + inc, text: `Topo da gama atingido. Subir para ${t.repMax + inc} s ou usar uma variação mais difícil.` };
    case 'bodyweight': {
      const nk = round(kg + inc);
      return { kg: nk, reps: t.repMin, text: kg === 0 ? `Topo da gama atingido. Acrescentar ${fmtKg(inc)} kg (cinto ou haltere).` : `Topo da gama atingido. Subir para +${fmtKg(nk)} kg.` };
    }
    default: {
      const nk = round(kg + inc);
      return { kg: nk, reps: t.repMin, text: `Topo da gama atingido. Subir para ${fmtKg(nk)} kg.` };
    }
  }
}

/** Valores pré-preenchidos para a série k (0-based) do item atual. */
export function prefill(item, last, sugg, k) {
  const done = workSets(item.log);
  const prevHere = done[done.length - 1];
  const lastSets = last ? workSets(last.item.log) : [];
  const ref = lastSets[k] || lastSets[lastSets.length - 1];
  if (sugg) return { kg: prevHere ? prevHere.kg : sugg.kg, reps: sugg.reps };
  if (prevHere) return { kg: prevHere.kg, reps: ref ? ref.reps : prevHere.reps };
  if (ref) return { kg: ref.kg, reps: ref.reps };
  return { kg: '', reps: item.target.repMin };
}

export function exerciseHistory(sessions, exId) {
  const out = [];
  for (const s of sessions) {
    if (!s.endedAt) continue;
    const it = s.items.find((i) => i.exerciseId === exId);
    const ws = it ? workSets(it.log) : [];
    if (!ws.length) continue;
    out.push({
      date: s.date, sessionId: s.id, ts: s.startedAt,
      maxKg: Math.max(...ws.map((x) => x.kg || 0)),
      volume: ws.reduce((a, x) => a + (x.kg || 0) * (x.reps || 0), 0),
      sets: ws,
    });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/** Maior carga de sempre (séries normais) antes desta sessão. */
export function bestKg(sessions, exId, excludeId) {
  let best = -Infinity;
  for (const s of sessions) {
    if (s.id === excludeId || !s.endedAt) continue;
    const it = s.items.find((i) => i.exerciseId === exId);
    for (const x of workSets(it?.log)) best = Math.max(best, x.kg || 0);
  }
  return best;
}

export function sessionStats(s) {
  let sets = 0, volume = 0;
  for (const it of s.items) for (const x of workSets(it.log)) { sets++; volume += (x.kg || 0) * (x.reps || 0); }
  return { sets, volume, duration: ((s.endedAt || Date.now()) - s.startedAt) / 1000 };
}

/* ---------- Aquecimento e alongamentos ---------- */

export const GUIDE_PREP = 5;  // segundos para entrar na posição seguinte
export const GUIDE_SWITCH = 3; // segundos para trocar de lado

/** "10 por lado", "30 s", "5 min" */
export function doseText(m) {
  if (!m) return '';
  const v = m.unit === 's' ? (m.val >= 60 && m.val % 60 === 0 ? `${m.val / 60} min` : `${m.val} s`) : `${m.val} reps`;
  return m.side ? `${v} por lado` : v;
}

/** Duração estimada em minutos (reps a ~3 s cada, mais transições). */
export function routineMinutes(moves) {
  let s = 0;
  for (const m of moves) {
    if (!m) continue;
    const one = m.unit === 's' ? m.val : m.val * 3;
    s += one * (m.side ? 2 : 1) + (m.side ? GUIDE_SWITCH : 0) + GUIDE_PREP;
  }
  return Math.max(1, Math.round(s / 60));
}

/** Passos do modo guiado: movimentos com tempo e por lado dão dois passos (esquerdo, direito). */
export function guideSteps(moves, done = {}) {
  const steps = [];
  for (const m of moves) {
    if (!m || done[m.id]) continue;
    const secs = m.unit === 's' ? m.val : null;
    if (secs && m.side) steps.push({ id: m.id, side: 0, secs }, { id: m.id, side: 1, secs });
    else steps.push({ id: m.id, side: null, secs, reps: secs ? null : m.val });
  }
  return steps;
}

const enter = (g, s, now) => {
  const st = g.steps[s];
  if (!st.secs) return { ...g, s, phase: 'go', total: 0, end: null, left: null }; // reps: espera pelo "Feito"
  const prev = g.steps[s - 1];
  const prep = prev && prev.id === st.id ? GUIDE_SWITCH : GUIDE_PREP;
  return { ...g, s, phase: 'prep', total: prep, end: now + prep * 1000, left: null };
};

export function guideStart(k, moves, done, now) {
  const steps = guideSteps(moves, done);
  if (!steps.length) return null;
  return enter({ k, steps }, 0, now);
}

/** Avança um passo. Devolve { g: estado seguinte ou null no fim, done: id do movimento concluído ou null }. */
export function guideAdvance(g, now) {
  const st = g.steps[g.s];
  if (g.phase === 'prep') return { g: { ...g, phase: 'go', total: st.secs, end: now + st.secs * 1000, left: null }, done: null };
  const done = st.side === 0 ? null : st.id;
  if (g.s + 1 >= g.steps.length) return { g: null, done };
  return { g: enter(g, g.s + 1, now), done };
}

export function guidePause(g, now) { return g.end ? { ...g, left: Math.max(0, g.end - now), end: null } : g; }
export function guideResume(g, now) { return g.left != null ? { ...g, end: now + g.left, left: null } : g; }

/* ---------- Escolha automática do aquecimento e dos alongamentos ---------- */

/** Carga por músculo: soma de (peso do músculo no exercício × séries). items: [{ exerciseId, sets }] */
export function muscleLoad(cfg, items) {
  const load = {};
  for (const it of items || []) {
    const ms = cfg.exercises[it.exerciseId]?.muscles || {};
    for (const [m, w] of Object.entries(ms)) load[m] = (load[m] || 0) + w * (it.sets || 0);
  }
  return load;
}

/** Exercícios feitos ontem (só séries normais), no formato { exerciseId, sets }. */
export function yesterdayItems(sessions, date) {
  const y = addDays(date, -1);
  return sessions.filter((s) => s.date === y && s.endedAt).flatMap((s) => s.items.map((i) => ({ exerciseId: i.exerciseId, sets: workSets(i.log).length })).filter((i) => i.sets));
}

const MAIN = 3;   // carga a partir da qual o músculo é "principal" no dia (≈ 3 séries diretas)
const WORKED = 1.5; // carga mínima para contar como trabalhado

/**
 * Escolhe o aquecimento e os alongamentos (regras em mobility-db.js):
 *  - aquecimento: 1 cardio leve adequado + movimentos dinâmicos que cubram os músculos de hoje
 *    (até 5) + 1 para a rigidez dos músculos fortes de ontem que hoje não trabalham;
 *  - alongamentos: 1 por músculo trabalhado hoje, 60 s nos principais e 40 s nos restantes (até 6),
 *    + até 2 suaves (30 s) para os músculos principais de ontem que ficaram de fora.
 * Devolve listas de { id, val, why: 'hoje' | 'ontem' } e as cargas usadas.
 */
export function buildRoutines(cfg, todayItems, yItems = []) {
  const moves = Object.values(cfg.mobility || {}).filter((m) => m.muscles?.length);
  const today = muscleLoad(cfg, todayItems);
  const yest = muscleLoad(cfg, yItems);
  const worked = Object.keys(today).filter((m) => today[m] >= WORKED);
  const yOnly = Object.keys(yest).filter((m) => yest[m] >= MAIN && !(today[m] >= WORKED)).sort((a, b) => yest[b] - yest[a]);

  // pontuação: músculos ainda por cobrir valem tudo, os já cobertos valem pouco; o principal do movimento vale mais
  const score = (m, load, covered) => m.muscles.reduce((s, k, i) => s + (load[k] || 0) * (covered.has(k) ? 0.25 : 1) * (i === 0 ? 1.5 : 1), 0);
  const best = (pool, load, covered) => {
    let b = null, bs = 0;
    for (const m of pool) { const x = score(m, load, covered); if (x > bs) { b = m; bs = x; } }
    return b;
  };
  const wLoad = Object.fromEntries(worked.map((m) => [m, today[m]]));

  // Aquecimento: cardio leve + até 5 movimentos dinâmicos para os músculos de hoje + 1 para os de ontem
  const warmup = [];
  const raise = best(moves.filter((m) => m.kind === 'raise'), today, new Set());
  if (raise) warmup.push({ id: raise.id, val: raise.val, why: 'hoje' });
  let pool = moves.filter((m) => m.kind === 'warm');
  const covered = new Set();
  for (let n = 0; n < 5; n++) {
    const m = best(pool, wLoad, covered);
    if (!m) break;
    warmup.push({ id: m.id, val: m.val, why: 'hoje' });
    m.muscles.forEach((k) => covered.add(k));
    pool = pool.filter((x) => x !== m);
  }
  if (yOnly.length) {
    const m = best(pool, Object.fromEntries(yOnly.map((k) => [k, yest[k]])), new Set());
    if (m) warmup.push({ id: m.id, val: m.val, why: 'ontem' });
  }

  // Alongamentos: um por músculo (como músculo principal do alongamento), dos mais trabalhados para os menos
  const cooldown = [];
  pool = moves.filter((m) => m.kind === 'stretch');
  const done = new Set();
  const stretchFor = (k, load) => {
    const own = pool.filter((m) => m.muscles[0] === k);
    return best(own.length ? own : pool.filter((m) => m.muscles.includes(k)), load, done);
  };
  const add = (k, val, why, load) => {
    const m = stretchFor(k, load);
    if (!m) return;
    cooldown.push({ id: m.id, val, why });
    done.add(m.muscles[0]);
    pool = pool.filter((x) => x !== m);
  };
  for (const k of [...worked].sort((a, b) => today[b] - today[a])) {
    if (cooldown.length >= 6) break;
    if (!done.has(k)) add(k, today[k] >= MAIN ? 60 : 40, 'hoje', wLoad);
  }
  const yLoad = Object.fromEntries(yOnly.map((k) => [k, yest[k]]));
  for (const k of yOnly.slice(0, 2)) if (!done.has(k)) add(k, 30, 'ontem', yLoad);
  return { warmup, cooldown, today, yesterday: yest };
}

/** Rotina de um treino para uma data: automática, ou as listas fixas do treino. */
export function routinesFor(cfg, tpl, date, sessions) {
  if (tpl.routine === 'manual') {
    const map = (ids) => (ids || []).filter((id) => cfg.mobility?.[id]).map((id) => ({ id, val: cfg.mobility[id].val, why: 'hoje' }));
    return { warmup: map(tpl.warmup), cooldown: map(tpl.cooldown), today: {}, yesterday: {}, manual: true };
  }
  const items = tpl.items.map((i) => ({ exerciseId: i.exerciseId, sets: targetSets(cfg, i.sets, date) }));
  return buildRoutines(cfg, items, yesterdayItems(sessions, date));
}

/**
 * Sessão de flexibilidade para um dia de descanso: 1 alongamento de 60 s por músculo, pelos músculos
 * mais trabalhados nos últimos 7 dias (ou um conjunto base, sem treinos). Até ~15 min.
 * Serve para chegar aos ~10 min por semana por músculo (Ingram 2024), que os fins de treino não atingem.
 */
export function flexRoutine(cfg, sessions, date) {
  const from = addDays(date, -7);
  const items = (sessions || []).filter((s) => isWorkout(s) && s.date >= from && s.date < date)
    .flatMap((s) => s.items.map((i) => ({ exerciseId: i.exerciseId, sets: workSets(i.log).length })));
  const load = muscleLoad(cfg, items);
  const BASE = ['hamstrings', 'hip_flexors', 'chest', 'quads', 'glutes', 'lats', 'calves', 'upper_back'];
  BASE.forEach((m, i) => { load[m] = (load[m] || 0) + 0.1 * (BASE.length - i); }); // desempate e base sem treinos
  const moves = Object.values(cfg.mobility || {}).filter((m) => m.muscles?.length);
  const warm = ['cat_cow', 'worlds_greatest'].filter((id) => cfg.mobility?.[id]).map((id) => ({ id, val: cfg.mobility[id].val, why: 'hoje' }));
  let pool = moves.filter((m) => m.kind === 'stretch');
  const cooldown = [];
  const done = new Set();
  for (const k of Object.keys(load).sort((a, b) => load[b] - load[a])) {
    if (done.has(k)) continue;
    const own = pool.filter((m) => m.muscles[0] === k);
    const m = (own.length ? own : pool.filter((x) => x.muscles.includes(k)))[0];
    if (!m) continue;
    const next = [...cooldown, { id: m.id, val: 60, why: 'hoje' }];
    if (routineMinutes(resolveMoves(cfg, next)) > 15) break;
    cooldown.push({ id: m.id, val: 60, why: 'hoje' });
    m.muscles.slice(0, 1).forEach((x) => done.add(x));
    pool = pool.filter((x) => x !== m);
  }
  return { warmup: warm, cooldown, today: load, yesterday: {} };
}

/* ---------- Trocar exercício ---------- */

/** Exercícios parecidos (mesmos músculos), do mais para o menos parecido. Semelhança de cosseno entre os pesos. */
export function similarExercises(cfg, exId, exclude = [], limit = 8) {
  const a = cfg.exercises[exId]?.muscles || {};
  const na = Math.hypot(...Object.values(a));
  if (!na) return [];
  const skip = new Set([exId, ...exclude]);
  return Object.values(cfg.exercises)
    .filter((e) => !skip.has(e.id))
    .map((e) => {
      const b = e.muscles || {};
      const nb = Math.hypot(...Object.values(b));
      const dot = Object.keys(a).reduce((s, k) => s + a[k] * (b[k] || 0), 0);
      return { ex: e, sim: nb ? dot / (na * nb) : 0 };
    })
    .filter((x) => x.sim >= 0.5)
    .sort((x, y) => y.sim - x.sim)
    .slice(0, limit);
}

/* ---------- Séries por músculo ---------- */

/**
 * Séries por músculo numa semana: conta 1 série para os músculos com peso 1 no exercício
 * e a fração correspondente para os secundários (ex.: tríceps no supino = 0,5).
 */
export function weeklyMuscleSets(cfg, sessions, monday) {
  const end = addDays(monday, 6);
  const items = (sessions || []).filter((s) => isWorkout(s) && s.date >= monday && s.date <= end)
    .flatMap((s) => s.items.map((i) => ({ exerciseId: i.exerciseId, sets: workSets(i.log).length })));
  return muscleLoad(cfg, items);
}

/* ---------- Discos ---------- */

/** Discos de cada lado para chegar a total kg com uma barra de bar kg. Devolve { side: [kg…], rest } (rest = kg que faltam). */
export function platesFor(total, bar = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  let per = round((total - bar) / 2);
  if (!(per > 0)) return { side: [], rest: per < 0 ? round(per * 2) : 0 };
  const side = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (per + 1e-9 >= p) { side.push(p); per = round(per - p); }
  }
  return { side, rest: round(per * 2) };
}

/** Músculos principais por ordem de carga (para mostrar "Hoje: peito, ombros…"). */
export const topMuscles = (load, min = MAIN) => Object.keys(load).filter((m) => load[m] >= min).sort((a, b) => load[b] - load[a]);

/* ---------- Nutrição ---------- */

/** Texto para pesquisa: minúsculas e sem acentos. */
export const normText = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Alimentos usados recentemente (mais recentes primeiro), com a última quantidade.
 * days: { 'AAAA-MM-DD': { food: [...] } }
 */
export function recentFoods(days, foods, limit = 15) {
  const out = new Map();
  for (const k of Object.keys(days).sort().reverse()) {
    const list = days[k]?.food || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.foodId || !foods[e.foodId] || out.has(e.foodId)) continue;
      out.set(e.foodId, { foodId: e.foodId, qty: e.qty });
      if (out.size >= limit) return [...out.values()];
    }
  }
  return [...out.values()];
}

/**
 * Ideias para fechar a proteína que falta: alimentos com pelo menos 55% das calorias em proteína,
 * os usados recentemente primeiro. Devolve [{ foodId, qty, label, p }], 1–3 porções cada.
 */
export function proteinIdeas(foods, recent, gap, limit = 3) {
  if (!(gap >= 15)) return [];
  const rich = (f) => f && f.kcal > 0 && (f.p * 4) / f.kcal >= 0.55;
  const ids = [...new Set([...(recent || []).map((r) => r.foodId), ...Object.values(foods).sort((a, b) => b.p / b.kcal - a.p / a.kcal).map((f) => f.id)])];
  const out = [];
  const seen = new Set();
  for (const id of ids) {
    const f = foods[id];
    if (!rich(f)) continue;
    const key = normText(f.name).split(/[\s(/]/)[0]; // não repetir "Atum", "Atum em azeite"…
    if (seen.has(key)) continue;
    const unit = f.basis === 'un' ? { label: 'un', qty: 1 } : f.portions?.[0] || { label: `100 ${f.basis}`, qty: 100 };
    const p1 = macrosFor(f, unit.qty).p;
    if (!(p1 > 0)) continue;
    const n = Math.min(3, Math.max(1, Math.round(gap / p1)));
    out.push({ foodId: f.id, qty: unit.qty * n, label: f.basis === 'un' ? `${n} un` : `${n > 1 ? n + ' × ' : ''}${unit.label}`, p: p1 * n });
    seen.add(key);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Produto do Open Food Facts → alimento da app (valores por 100 g/ml). Devolve null sem calorias nem macros.
 * product: resposta de /api/v2/product/<código>.json → .product
 */
export function offToFood(code, product) {
  if (!product) return null;
  const n = product.nutriments || {};
  const g = (k) => { const v = parseFloat(n[k + '_100g']); return Number.isFinite(v) && v >= 0 ? round(v, 1) : null; };
  const p = g('proteins'), c = g('carbohydrates'), f = g('fat');
  let kcal = g('energy-kcal');
  if (kcal == null && g('energy') != null) kcal = Math.round(g('energy') / 4.184); // kJ → kcal
  if (kcal == null && p != null && c != null && f != null) kcal = Math.round(p * 4 + c * 4 + f * 9);
  if (kcal == null) return null;
  const qty = String(product.quantity || '');
  const basis = /\d\s*(ml|cl|l)\b/i.test(qty) && !/\d\s*k?g\b/i.test(qty) ? 'ml' : 'g';
  const name = [product.product_name_pt || product.product_name || product.generic_name || 'Produto ' + code, product.brands?.split(',')[0]?.trim()].filter(Boolean).join(' · ');
  const serving = parseFloat(product.serving_quantity);
  return {
    id: 'bc_' + code, name: name.slice(0, 80), basis, kcal: Math.round(kcal), p: p ?? 0, c: c ?? 0, f: f ?? 0,
    cat: 'outros', barcode: code, custom: true,
    ...(serving > 0 && serving < 2000 ? { portions: [{ label: '1 dose', qty: round(serving) }] } : {}),
  };
}

export function macrosFor(food, qty) {
  const k = food.basis === 'un' ? qty : qty / 100;
  return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k };
}
export const sumMacros = (list) =>
  list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });

export const dayTotals = (day) => sumMacros((day?.food || []).map((e) => e.m));

export function unitLabel(food) {
  return food.basis === 'un' ? 'un' : food.basis;
}

export function isTrainingDay(cfg, date, sessions) {
  const trained = sessions.some((s) => s.date === date && isWorkout(s));
  return trained || (cfg.schedule !== 'sequence' && !!templateFor(cfg, date));
}
export const waterGoal = (cfg, date, sessions) => (isTrainingDay(cfg, date, sessions) ? cfg.water.training : cfg.water.rest);
export const waterTotal = (day) => (day?.water || []).reduce((a, w) => a + w.ml, 0);

/* ---------- Peso ---------- */

export function weeklyWeights(days) {
  const map = {};
  for (const [k, d] of Object.entries(days)) {
    if (d && d.weight) (map[mondayOf(k)] ||= []).push(d.weight);
  }
  return Object.keys(map).sort().map((week) => ({ week, avg: mean(map[week]), n: map[week].length }));
}

/**
 * Regra de ajuste (só sugestão):
 *  - média semanal não subiu face a 3 semanas antes → +200 kcal
 *  - subiu mais de 0,5 kg face a 4 semanas antes (~1 mês) → −200 kcal
 * Só conta semanas com pelo menos 2 pesagens.
 */
export function weightSuggestion(weeks) {
  const valid = weeks.filter((w) => w.n >= 2);
  if (!valid.length) return { kind: 'none', text: 'Registar pelo menos 2 pesagens por semana, em jejum, para avaliar a tendência.' };
  const cur = valid[valid.length - 1];
  const find = (off) => valid.find((w) => w.week === addDays(cur.week, -7 * off));
  const w4 = find(4);
  if (w4 && cur.avg - w4.avg > 0.5) {
    return { kind: 'down', diff: cur.avg - w4.avg, text: `Subida de ${fmt(cur.avg - w4.avg, 1)} kg num mês, acima de 0,5 kg. Sugestão: −200 kcal por dia (ex.: −50 g de arroz ou −40 g de aveia).` };
  }
  const w3 = find(3);
  if (!w3) return { kind: 'wait', text: 'São precisas pesagens de há 3 semanas para comparar. Continuar a registar 2–3 vezes por semana.' };
  if (cur.avg <= w3.avg) {
    return { kind: 'up', diff: cur.avg - w3.avg, text: `A média não subiu em 3 semanas (${fmt(w3.avg, 1)} → ${fmt(cur.avg, 1)} kg). Sugestão: +200 kcal por dia (ex.: +50 g de arroz ou +40 g de aveia).` };
  }
  return { kind: 'ok', diff: cur.avg - w3.avg, text: `A subir ao ritmo previsto (+${fmt(cur.avg - w3.avg, 1)} kg em 3 semanas). Manter as metas.` };
}

/* ---------- Resumo semanal ---------- */

export function weekSummary(state, monday) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const inWeek = new Set(dates);
  const sessions = state.sessions.filter((s) => isWorkout(s) && inWeek.has(s.date));
  const planned = state.cfg.templates.length;
  const foodDays = dates.map((d) => state.days[d]).filter((d) => d && d.food && d.food.length);
  const tot = foodDays.map(dayTotals);
  const waterDays = dates.map((d) => waterTotal(state.days[d])).filter((x) => x > 0);
  return {
    monday, sessions: new Set(sessions.map((s) => s.date)).size, planned, // dias com treino
    kcal: mean(tot.map((t) => t.kcal)), p: mean(tot.map((t) => t.p)),
    water: mean(waterDays), foodDays: foodDays.length,
  };
}

/** [{ id, val, why }] → movimentos completos com a duração do dia. */
export const resolveMoves = (cfg, list) => (list || []).filter((x) => cfg.mobility?.[x.id]).map((x) => ({ ...cfg.mobility[x.id], val: x.val, why: x.why }));
