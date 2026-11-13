// Dados iniciais. Tudo é editável nas Definições.
import { dateKey } from './util.js';
import { FOOD_DB } from './foods-db.js';
import { MOBILITY_DB, EX_MUSCLES, OLD_MOBILITY_IDS } from './mobility-db.js';

export const SCHEMA_VERSION = 3;

// kind: compound | isolation · mode: load | assisted | bodyweight | time
// inc: menor subida disponível no material (kg; segundos no modo time)
const EX = [
  // Push A
  ['bench_bb', 'Bench Press (Barbell)', 'compound', 'load', 2.5, 'Barbell_Bench_Press_-_Medium_Grip'],
  ['incline_db', 'Incline Bench Press (Dumbbell)', 'compound', 'load', 2, 'Incline_Dumbbell_Press'],
  ['ohp_db', 'Seated Overhead Press (Dumbbell)', 'compound', 'load', 2, 'Dumbbell_Shoulder_Press'],
  ['lat_raise_db', 'Lateral Raise (Dumbbell)', 'isolation', 'load', 2, 'Side_Lateral_Raise'],
  ['pushdown', 'Triceps Pushdown (Cable)', 'isolation', 'load', 5, 'Triceps_Pushdown'],
  // Pull A
  ['lat_pulldown', 'Lat Pulldown (Cable)', 'compound', 'load', 5, 'Wide-Grip_Lat_Pulldown'],
  ['row_bb', 'Bent Over Row (Barbell)', 'compound', 'load', 2.5, 'Bent_Over_Barbell_Row'],
  ['seated_row', 'Seated Row (Cable)', 'compound', 'load', 5, 'Seated_Cable_Rows'],
  ['face_pull', 'Face Pull (Cable)', 'isolation', 'load', 5, 'Face_Pull'],
  ['curl_db', 'Bicep Curl (Dumbbell)', 'isolation', 'load', 2, 'Dumbbell_Bicep_Curl'],
  // Legs A
  ['squat_bb', 'Squat (Barbell)', 'compound', 'load', 2.5, 'Barbell_Squat'],
  ['rdl_bb', 'Romanian Deadlift (Barbell)', 'compound', 'load', 2.5, 'Romanian_Deadlift'],
  ['leg_press', 'Leg Press', 'compound', 'load', 5, 'Leg_Press'],
  ['lying_leg_curl', 'Lying Leg Curl (Machine)', 'isolation', 'load', 5, 'Lying_Leg_Curls'],
  ['standing_calf', 'Standing Calf Raise', 'isolation', 'load', 5, 'Standing_Calf_Raises'],
  ['plank', 'Plank', 'isolation', 'time', 5, 'Plank'],
  // Push B
  ['incline_bb', 'Incline Bench Press (Barbell)', 'compound', 'load', 2.5, 'Barbell_Incline_Bench_Press_-_Medium_Grip'],
  ['shoulder_press_m', 'Shoulder Press (Machine)', 'compound', 'load', 5, 'Machine_Shoulder_Military_Press'],
  ['chest_dip', 'Chest Dip', 'compound', 'bodyweight', 2.5, 'Dips_-_Chest_Version'],
  ['cable_crossover', 'Cable Crossover', 'isolation', 'load', 5, 'Cable_Crossover'],
  ['lat_raise_cable', 'Lateral Raise (Cable)', 'isolation', 'load', 2.5, 'Cable_Seated_Lateral_Raise'],
  ['oh_triceps_cable', 'Overhead Triceps Extension (Cable)', 'isolation', 'load', 5, 'Cable_Rope_Overhead_Triceps_Extension'],
  // Pull B
  ['pullup_assisted', 'Pull Up (Assisted)', 'compound', 'assisted', 5, 'Band_Assisted_Pull-Up'],
  ['one_arm_row_db', 'Bent Over One Arm Row (Dumbbell)', 'compound', 'load', 2, 'One-Arm_Dumbbell_Row'],
  ['reverse_fly_m', 'Reverse Fly (Machine)', 'isolation', 'load', 5, 'Reverse_Machine_Flyes'],
  ['preacher_curl', 'Preacher Curl', 'isolation', 'load', 2.5, 'Preacher_Curl'],
  ['hammer_curl_db', 'Hammer Curl (Dumbbell)', 'isolation', 'load', 2, 'Hammer_Curls'],
  ['hanging_knee_raise', 'Hanging Knee Raise', 'isolation', 'bodyweight', 2.5, 'Hanging_Leg_Raise'],
  // Legs B
  ['bulgarian_db', 'Bulgarian Split Squat (Dumbbell)', 'compound', 'load', 2, 'Split_Squat_with_Dumbbells', true],
  ['hip_thrust_bb', 'Hip Thrust (Barbell)', 'compound', 'load', 2.5, 'Barbell_Hip_Thrust'],
  ['leg_ext', 'Leg Extension (Machine)', 'isolation', 'load', 5, 'Leg_Extensions'],
  ['seated_leg_curl', 'Seated Leg Curl (Machine)', 'isolation', 'load', 5, 'Seated_Leg_Curl'],
  ['seated_calf', 'Seated Calf Raise', 'isolation', 'load', 5, 'Seated_Calf_Raise'],
  ['cable_crunch', 'Cable Crunch', 'isolation', 'load', 5, 'Cable_Crunch'],
];

const T = (id, name, weekday, items) => ({
  id, name, weekday,
  items: items.map(([exerciseId, sets, repMin, repMax]) => ({ exerciseId, sets, repMin, repMax })),
});

const TEMPLATES = [
  T('pushA', 'Push A', 1, [['bench_bb', 3, 6, 8], ['incline_db', 3, 8, 10], ['ohp_db', 3, 8, 10], ['lat_raise_db', 3, 12, 15], ['pushdown', 3, 10, 12]]),
  T('pullA', 'Pull A', 2, [['lat_pulldown', 3, 8, 10], ['row_bb', 3, 6, 8], ['seated_row', 3, 10, 12], ['face_pull', 3, 12, 15], ['curl_db', 3, 10, 12]]),
  T('legsA', 'Legs A', 3, [['squat_bb', 3, 6, 8], ['rdl_bb', 3, 8, 10], ['leg_press', 3, 10, 12], ['lying_leg_curl', 3, 10, 12], ['standing_calf', 3, 12, 15], ['plank', 3, 30, 45]]),
  T('pushB', 'Push B', 4, [['incline_bb', 3, 6, 8], ['shoulder_press_m', 3, 8, 10], ['chest_dip', 3, 8, 12], ['cable_crossover', 3, 12, 15], ['lat_raise_cable', 3, 12, 15], ['oh_triceps_cable', 2, 10, 12]]),
  T('pullB', 'Pull B', 5, [['pullup_assisted', 3, 6, 10], ['one_arm_row_db', 3, 8, 10], ['reverse_fly_m', 3, 12, 15], ['preacher_curl', 3, 10, 12], ['hammer_curl_db', 2, 10, 12], ['hanging_knee_raise', 3, 10, 15]]),
  T('legsB', 'Legs B', 6, [['bulgarian_db', 3, 8, 10], ['hip_thrust_bb', 3, 8, 10], ['leg_ext', 3, 12, 15], ['seated_leg_curl', 3, 10, 12], ['seated_calf', 3, 15, 15], ['cable_crunch', 3, 12, 15]]),
];

// Base de alimentos com valores médios de referência: js/foods-db.js
const FOODS = FOOD_DB;

/* ---------- Aquecimento e alongamentos: js/mobility-db.js (escolha automática em logic.js) ---------- */

export const SLOTS = [
  ['pre', 'Pré-treino'],
  ['pa', 'Pequeno-almoço'],
  ['almoco', 'Almoço'],
  ['lanche', 'Lanche'],
  ['jantar', 'Jantar'],
  ['outros', 'Outros'],
];
export const SUPP_MOMENTS = [...SLOTS.filter(([k]) => k !== 'outros'), ['deitar', 'Antes de dormir'], ['qualquer', 'Qualquer altura']];

// Itens: [foodId, qty, alternativas [[foodId, qty], …]]
const M = (id, name, slot, items) => ({
  id, name, slot, kind: 'plan',
  items: items.map(([foodId, qty, alts = []]) => ({ foodId, qty, alts: alts.map(([a, q]) => ({ foodId: a, qty: q })) })),
});
const MEALS = [
  M('m_pre', 'Pré-treino', 'pre', [['banana', 1]]),
  M('m_pa', 'Pequeno-almoço', 'pa', [['aveia', 80], ['leite', 300], ['whey', 1], ['ovo', 2], ['pao', 1]]),
  M('m_almoco', 'Almoço', 'almoco', [['frango', 150, [['peru', 150]]], ['arroz', 120, [['massa', 120]]], ['legumes', 150], ['azeite', 13]]),
  M('m_lanche', 'Lanche', 'lanche', [['pao', 2], ['ovo', 3, [['sardinha', 85], ['atum', 80]]], ['maca', 1, [['banana', 1]]], ['manteiga_amendoim', 30]]),
  M('m_jantar', 'Jantar', 'jantar', [['porco', 180, [['frango', 180], ['ovo', 3], ['carapau', 180], ['cavala', 180]]], ['batata', 300], ['legumes', 150], ['azeite', 7]]),
];

const SUPPS = [
  { id: 'creatina', name: 'Creatina', dose: '3–5 g', moment: 'pa' },
  { id: 'vitd', name: 'Vitamina D', dose: '', moment: 'almoco' },
  { id: 'omega3', name: 'Ómega 3', dose: '', moment: 'almoco' },
  { id: 'b12', name: 'B12', dose: '', moment: 'qualquer' },
];

export function seedConfig() {
  const exercises = {};
  for (const [id, name, kind, mode, inc, img, perSide = false] of EX) exercises[id] = { id, name, kind, mode, inc, img, perSide, muscles: { ...(EX_MUSCLES[id] || {}) } };
  const foods = {};
  for (const f of FOODS) foods[f.id] = JSON.parse(JSON.stringify(f));
  const mobility = {};
  for (const m of MOBILITY_DB) mobility[m.id] = { ...m, muscles: [...m.muscles] };
  return {
    version: SCHEMA_VERSION,
    createdAt: Date.now(),
    startDate: dateKey(),
    goals: { kcal: 3000, p: 180, c: 380, f: 85 },
    water: { training: 3500, rest: 3000 },
    rest: { compound: 150, isolation: 75 },
    readapt: { weeks: 2, sets: 2, suggest: false },
    sound: true,
    schedule: 'weekday', // 'weekday': treino pelo dia da semana · 'sequence': o próximo da ordem, seja qual for o dia
    bar: 20, // kg da barra olímpica (calculadora de discos)
    exercises,
    templates: TEMPLATES.map((t) => ({ ...JSON.parse(JSON.stringify(t)), ...NEW_ROUTINE() })),
    mobility,
    foods,
    meals: JSON.parse(JSON.stringify(MEALS)),
    supplements: JSON.parse(JSON.stringify(SUPPS)),
    lastExportAt: null,
  };
}

/**
 * Atualiza uma configuração antiga para a versão atual, sem apagar nada do que o utilizador mudou.
 * v2: base de alimentos alargada (com categorias e porções), aquecimento e alongamentos por treino.
 */
/** Aquecimento e alongamentos de um treino: automáticos (pelos músculos de hoje e de ontem) ou listas fixas. */
export const NEW_ROUTINE = () => ({ routine: 'auto', warmup: [], cooldown: [] });

export function migrateConfig(cfg) {
  const base = seedConfig();
  for (const k of Object.keys(base)) if (cfg[k] === undefined) cfg[k] = base[k];
  const from = cfg.version || 1;
  if (from < 2) {
    for (const [id, f] of Object.entries(base.foods)) {
      const mine = cfg.foods[id];
      if (!mine) { cfg.foods[id] = f; continue; }
      if (!mine.cat) mine.cat = f.cat;
      if (!mine.portions?.length && f.portions && mine.basis === f.basis) mine.portions = f.portions;
    }
    for (const f of Object.values(cfg.foods)) if (!f.cat) f.cat = 'outros';
    for (const [id, m] of Object.entries(base.mobility)) if (!cfg.mobility[id]) cfg.mobility[id] = m;
  }
  if (from < 3) {
    // biblioteca nova com fotos e músculos; movimentos criados pelo utilizador (m_…) ficam
    for (const id of OLD_MOBILITY_IDS) delete cfg.mobility[id];
    for (const [id, m] of Object.entries(base.mobility)) cfg.mobility[id] = m;
    for (const t of cfg.templates) {
      t.routine = 'auto';
      t.warmup = (t.warmup || []).filter((id) => cfg.mobility[id]);
      t.cooldown = (t.cooldown || []).filter((id) => cfg.mobility[id]);
    }
  }
  for (const [id, ex] of Object.entries(cfg.exercises)) if (!ex.muscles) ex.muscles = { ...(EX_MUSCLES[id] || {}) };
  for (const t of cfg.templates) {
    if (!t.routine) t.routine = 'auto';
    if (!Array.isArray(t.warmup)) t.warmup = [];
    if (!Array.isArray(t.cooldown)) t.cooldown = [];
  }
  cfg.version = SCHEMA_VERSION;
  return cfg;
}
