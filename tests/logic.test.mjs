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
