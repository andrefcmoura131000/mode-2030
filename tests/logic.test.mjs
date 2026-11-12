// Testes das regras do plano:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { planWeek, phase, templateFor, targetSets, progression, prefill, lastPerformance, weeklyWeights, weightSuggestion, macrosFor, dayTotals, waterGoal, bestKg, exerciseHistory } from '../js/logic.js';
import { seedConfig } from '../js/seed.js';
import { fmt, num, addDays, weekday, mondayOf } from '../js/util.js';

const cfg = () => ({ ...seedConfig(), startDate: '2026-11-09' }); // segunda-feira

test('semana do plano a partir da data de início', () => {
  assert.equal(planWeek('2026-11-09', '2026-11-08'), 0);
  assert.equal(planWeek('2026-11-09', '2026-11-09'), 1);
  assert.equal(planWeek('2026-11-09', '2026-11-15'), 1);
  assert.equal(planWeek('2026-11-09', '2026-11-16'), 2);
  assert.equal(planWeek('2026-11-09', '2026-11-23'), 3);
  // atravessa a mudança de hora (29 mar 2026)
  assert.equal(planWeek('2026-03-23', '2026-03-30'), 2);
});

test('readaptação nas semanas 1–2: 2 séries e 3–4 RIR; semana 3 completa', () => {
  const c = cfg();
  assert.equal(phase(c, '2026-11-10').readapt, true);
  assert.equal(phase(c, '2026-11-10').rir, '3–4');
  assert.equal(targetSets(c, 3, '2026-11-20'), 2);
  assert.equal(phase(c, '2026-11-23').readapt, false);
  assert.equal(targetSets(c, 3, '2026-11-23'), 3);
  assert.equal(targetSets(c, 2, '2026-11-10'), 2);
});

test('calendário fixo: seg Push A … sáb Legs B, domingo descanso', () => {
  const c = cfg();
  const names = [0, 1, 2, 3, 4, 5, 6].map((i) => templateFor(c, addDays('2026-11-09', i))?.name || null);
  assert.deepEqual(names, ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', null]);
  assert.equal(weekday('2026-11-15'), 7);
  assert.equal(mondayOf('2026-11-15'), '2026-11-09');
});

const ex = (mode = 'load', inc = 2.5) => ({ id: 'e', mode, inc, kind: 'compound' });
const lastWith = (sets, target = { sets: 3, repMin: 6, repMax: 8 }) => ({ item: { target, log: sets } });

test('progressão dupla: sobe só quando todas as séries chegam ao topo', () => {
  assert.equal(progression(ex(), lastWith([{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }, { kg: 60, reps: 7 }])), null);
  const s = progression(ex(), lastWith([{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }, { kg: 60, reps: 9 }]));
  assert.equal(s.kg, 62.5);
  assert.equal(s.reps, 6, 'volta ao fundo da gama');
  // aquecimentos não contam
  assert.equal(progression(ex(), lastWith([{ kg: 40, reps: 3, w: true }, { kg: 60, reps: 8 }, { kg: 60, reps: 8 }])), null);
  // séries a menos do que o planeado não contam
  assert.equal(progression(ex(), lastWith([{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }])), null);
  // readaptação: 2 séries planeadas chegam
  assert.equal(progression(ex(), lastWith([{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }], { sets: 2, repMin: 6, repMax: 8 })).kg, 62.5);
});

test('progressão: halteres +2, assistido reduz, peso corporal acrescenta, tempo sobe segundos', () => {
  const top = (kg, reps) => lastWith([{ kg, reps }, { kg, reps }, { kg, reps }], { sets: 3, repMin: 8, repMax: 10 });
  assert.equal(progression(ex('load', 2), top(22, 10)).kg, 24);
  assert.equal(progression(ex('assisted', 5), top(25, 10)).kg, 20);
  assert.equal(progression(ex('assisted', 5), top(5, 10)).kg, 0);
  const bw = progression(ex('bodyweight', 2.5), top(0, 10));
  assert.equal(bw.kg, 2.5);
  const t = progression(ex('time', 5), lastWith([{ kg: 0, reps: 45 }, { kg: 0, reps: 45 }, { kg: 0, reps: 46 }], { sets: 3, repMin: 30, repMax: 45 }));
  assert.equal(t.reps, 50);
});

test('pré-preenchimento: última sessão, sugestão e série anterior', () => {
  const item = { target: { sets: 3, repMin: 6, repMax: 8 }, log: [] };
  const last = lastWith([{ kg: 60, reps: 8 }, { kg: 60, reps: 7 }, { kg: 60, reps: 6 }]);
  assert.deepEqual(prefill(item, null, null, 0), { kg: '', reps: 6 });
  assert.deepEqual(prefill(item, last, null, 1), { kg: 60, reps: 7 });
  assert.deepEqual(prefill(item, last, { kg: 62.5, reps: 6 }, 0), { kg: 62.5, reps: 6 });
  item.log.push({ kg: 57.5, reps: 8 });
  assert.deepEqual(prefill(item, last, null, 1), { kg: 57.5, reps: 7 }, 'mantém a carga usada na série anterior de hoje');
});

test('última sessão e recordes ignoram a sessão em curso e as não terminadas', () => {
  const s1 = { id: 'a', endedAt: 1, startedAt: 1, date: '2026-11-09', items: [{ exerciseId: 'e', log: [{ kg: 60, reps: 8 }] }] };
  const s2 = { id: 'b', endedAt: null, startedAt: 2, date: '2026-11-16', items: [{ exerciseId: 'e', log: [{ kg: 70, reps: 8 }] }] };
  assert.equal(lastPerformance([s2, s1], 'e').session.id, 'a');
  assert.equal(bestKg([s2, s1], 'e'), 60);
  assert.equal(exerciseHistory([s2, s1], 'e').length, 1);
});

test('médias semanais e regra de ajuste de calorias', () => {
  const days = {};
  const w = (d, kg) => { days[d] = { weight: kg }; };
  // semana 1 (09/11): 75,0 ; semana 4 (30/11): 75,0 → não subiu em 3 semanas
  w('2026-11-09', 75.2); w('2026-11-11', 74.8);
  w('2026-11-30', 75.0); w('2026-12-02', 75.0);
  let weeks = weeklyWeights(days);
  assert.equal(weeks.length, 2);
  assert.equal(weightSuggestion(weeks).kind, 'up');
  // subiu 0,8 kg num mês → −200
  w('2026-12-07', 75.9); w('2026-12-09', 76.1);
  weeks = weeklyWeights(days);
  assert.equal(weightSuggestion(weeks).kind, 'down');
  // poucas pesagens
  assert.equal(weightSuggestion(weeklyWeights({ '2026-11-09': { weight: 75 } })).kind, 'none');
});

test('macros por quantidade e totais do dia', () => {
  const c = cfg();
  const m = macrosFor(c.foods.aveia, 80);
  assert.equal(Math.round(m.kcal), 300);
  assert.equal(Math.round(macrosFor(c.foods.ovo, 2).p), 13);
  assert.equal(Math.round(macrosFor(c.foods.leite, 300).kcal), 138);
  const t = dayTotals({ food: [{ m }, { m: macrosFor(c.foods.whey, 1) }] });
  assert.equal(Math.round(t.p), 34);
});

test('plano alimentar soma ~3000 kcal', () => {
  const c = cfg();
  let kcal = 0;
  for (const meal of c.meals) for (const i of meal.items) kcal += macrosFor(c.foods[i.foodId], i.qty).kcal;
  assert.ok(kcal > 2900 && kcal < 3100, `total ${kcal}`);
});

test('meta de água: treino 3,5 L, descanso 3 L, domingo com treino extra 3,5 L', () => {
  const c = cfg();
  assert.equal(waterGoal(c, '2026-11-09', []), 3500);
  assert.equal(waterGoal(c, '2026-11-15', []), 3000);
  assert.equal(waterGoal(c, '2026-11-15', [{ date: '2026-11-15', endedAt: 1 }]), 3500);
});

test('formatação e leitura de números em PT', () => {
  assert.equal(fmt(62.5, 2), '62,5');
  assert.equal(fmt(60, 2), '60');
  assert.equal(fmt(3000), '3.000');
  assert.equal(num('62,5'), 62.5);
  assert.ok(Number.isNaN(num('')));
});

test('todas as fotos dos exercícios existem', async () => {
  const { existsSync } = await import('node:fs');
  const c = cfg();
  for (const e of Object.values(c.exercises)) {
    for (const f of [0, 1]) assert.ok(existsSync(new URL(`../img/ex/${e.img}/${f}.jpg`, import.meta.url)), `${e.name} ${f}`);
  }
  for (const t of c.templates) for (const i of t.items) assert.ok(c.exercises[i.exerciseId], i.exerciseId);
});

/* ---------- v2: base de alimentos, migração, aquecimento e alongamentos ---------- */
import { FOOD_DB, FOOD_CATS } from '../js/foods-db.js';
import { migrateConfig, defaultRoutine, SCHEMA_VERSION } from '../js/seed.js';
import { guideStart, guideAdvance, guidePause, guideResume, guideSteps, doseText, routineMinutes, normText, recentFoods, GUIDE_PREP } from '../js/logic.js';

test('base de alimentos: ids únicos, categorias válidas, porções e calorias coerentes com as macros', () => {
  const ids = new Set();
  const cats = new Set(FOOD_CATS.map(([k]) => k));
  assert.ok(FOOD_DB.length >= 150, `só ${FOOD_DB.length} alimentos`);
  for (const f of FOOD_DB) {
    assert.ok(!ids.has(f.id), `id repetido ${f.id}`);
    ids.add(f.id);
    assert.ok(cats.has(f.cat), `${f.id}: categoria ${f.cat}`);
    assert.ok(['g', 'ml', 'un'].includes(f.basis), f.id);
    for (const p of f.portions || []) assert.ok(p.qty > 0 && p.label, `${f.id}: porção`);
    // Atwater (4/4/9, álcool 7): tolerância de 15% ou 12 kcal (fibra e arredondamentos)
    const atw = 4 * f.p + 4 * f.c + 9 * f.f + 7 * (f.al || 0);
    assert.ok(Math.abs(atw - f.kcal) <= Math.max(12, 0.15 * f.kcal), `${f.name}: ${f.kcal} kcal vs ${atw.toFixed(0)} pelas macros`);
  }
});

test('migração v1 → v2: acrescenta alimentos e rotinas sem estragar o que o utilizador mudou', () => {
  const old = {
    version: 1, startDate: '2026-11-09',
    foods: {
      aveia: { id: 'aveia', name: 'Aveia (minha)', basis: 'g', kcal: 370, p: 14, c: 58, f: 7 },
      ovo: { id: 'ovo', name: 'Ovo', basis: 'un', kcal: 75, p: 6.5, c: 0.5, f: 5 },
      c_x: { id: 'c_x', name: 'Iogurte da marca', basis: 'g', kcal: 60, p: 10, c: 4, f: 0, custom: true },
    },
    templates: [{ id: 'pushA', name: 'Push A', weekday: 1, items: [] }, { id: 't1', name: 'Pernas extra', weekday: 0, items: [] }],
    meals: [], supplements: [],
  };
  const c = migrateConfig(old);
  assert.equal(c.version, SCHEMA_VERSION);
  assert.equal(c.foods.aveia.name, 'Aveia (minha)', 'não apaga edições');
  assert.equal(c.foods.aveia.kcal, 370);
  assert.equal(c.foods.aveia.cat, 'amido');
  assert.ok(c.foods.aveia.portions.length, 'ganha porções');
  assert.equal(c.foods.c_x.cat, 'outros');
  assert.ok(c.foods.pao_mistura, 'alimentos novos');
  assert.ok(Object.keys(c.foods).length >= 150);
  assert.ok(c.mobility.chest_door);
  assert.deepEqual(c.templates[0].warmup, defaultRoutine('Push A').warmup);
  assert.deepEqual(c.templates[1].cooldown, defaultRoutine('legs').cooldown, 'treino próprio com "pernas" leva alongamentos de pernas');
  // correr outra vez não muda nada
  const snap = JSON.stringify(c);
  assert.equal(JSON.stringify(migrateConfig(c)), snap);
});

test('todos os treinos do plano têm aquecimento e alongamentos que existem', () => {
  const c = cfg();
  for (const t of c.templates) {
    assert.ok(t.warmup.length >= 5 && t.cooldown.length >= 5, t.name);
    for (const id of [...t.warmup, ...t.cooldown]) assert.ok(c.mobility[id], `${t.name}: ${id}`);
    for (const id of t.warmup) assert.equal(c.mobility[id].kind, 'warm', id);
    for (const id of t.cooldown) assert.equal(c.mobility[id].kind, 'stretch', id);
  }
  const legs = c.templates.find((t) => t.id === 'legsA');
  const min = routineMinutes(legs.cooldown.map((id) => c.mobility[id]));
  assert.ok(min >= 6 && min <= 15, `alongamentos de pernas ~${min} min`);
});

test('texto da dose', () => {
  assert.equal(doseText({ unit: 's', val: 300, side: false }), '5 min');
  assert.equal(doseText({ unit: 's', val: 30, side: true }), '30 s por lado');
  assert.equal(doseText({ unit: 'reps', val: 10, side: true }), '10 reps por lado');
});

test('modo guiado: preparação, tempo, troca de lado, reps à espera e fim', () => {
  const moves = [
    { id: 'a', unit: 's', val: 30, side: true },
    { id: 'b', unit: 'reps', val: 10, side: false },
    { id: 'c', unit: 's', val: 40, side: false },
  ];
  assert.equal(guideSteps(moves).length, 4);
  assert.equal(guideSteps(moves, { a: 1 }).length, 2, 'salta os já feitos');
  let g = guideStart('cool', moves, {}, 0);
  assert.equal(g.phase, 'prep');
  assert.equal(g.end, GUIDE_PREP * 1000);
  let r = guideAdvance(g, 5000); // fim da preparação
  assert.equal(r.g.phase, 'go'); assert.equal(r.g.end, 35000); assert.equal(r.done, null);
  r = guideAdvance(r.g, 35000); // lado esquerdo feito → troca de lado (3 s)
  assert.equal(r.done, null); assert.equal(r.g.phase, 'prep'); assert.equal(r.g.total, 3);
  r = guideAdvance(r.g, 38000);
  r = guideAdvance(r.g, 68000); // lado direito feito
  assert.equal(r.done, 'a');
  assert.equal(r.g.phase, 'go'); assert.equal(r.g.end, null, 'reps: sem contagem, espera pelo Feito');
  r = guideAdvance(r.g, 90000);
  assert.equal(r.done, 'b'); assert.equal(r.g.phase, 'prep');
  r = guideAdvance(r.g, 95000);
  const paused = guidePause(r.g, 100000);
  assert.equal(paused.end, null); assert.equal(paused.left, 35000);
  const resumed = guideResume(paused, 200000);
  assert.equal(resumed.end, 235000);
  r = guideAdvance(resumed, 235000);
  assert.equal(r.done, 'c'); assert.equal(r.g, null, 'fim');
  assert.equal(guideStart('warm', moves, { a: 1, b: 1, c: 1 }, 0), null);
});

test('pesquisa sem acentos e alimentos recentes', () => {
  assert.equal(normText('Pão de Mistura'), 'pao de mistura');
  const foods = { a: {}, b: {}, c: {} };
  const days = {
    '2026-11-10': { food: [{ foodId: 'a', qty: 100 }, { foodId: 'b', qty: 2 }] },
    '2026-11-11': { food: [{ foodId: 'a', qty: 150 }, { foodId: null, qty: 1 }, { foodId: 'zz', qty: 1 }] },
  };
  assert.deepEqual(recentFoods(days, foods), [{ foodId: 'a', qty: 150 }, { foodId: 'b', qty: 2 }]);
});
