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

export const templateFor = (cfg, date) => cfg.templates.find((t) => t.weekday === weekday(date)) || null;

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
  return !!templateFor(cfg, date) || sessions.some((s) => s.date === date && s.endedAt);
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
  const sessions = state.sessions.filter((s) => s.endedAt && inWeek.has(s.date));
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
