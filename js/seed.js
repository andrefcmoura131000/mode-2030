// Dados iniciais. Tudo é editável nas Definições.
import { dateKey } from './util.js';
import { FOOD_DB } from './foods-db.js';

export const SCHEMA_VERSION = 2;

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

/* ---------- Aquecimento e alongamentos ---------- */
// kind: warm (mobilidade dinâmica, antes) | stretch (alongamento estático, no fim)
// unit: s (segundos) | reps · side: conta por lado (faz-se dos dois lados)
const MB = (id, name, kind, unit, val, side, cue) => ({ id, name, kind, unit, val, side, cue });
const MOBILITY = [
  // Aquecimento
  MB('cardio', 'Cardio leve (bicicleta, passadeira ou elíptica)', 'warm', 's', 300, false, 'Ritmo em que ainda se consegue falar. Só para aquecer.'),
  MB('arm_circles', 'Círculos de braços', 'warm', 'reps', 10, false, '10 para a frente e 10 para trás, a crescer a amplitude.'),
  MB('band_pull_apart', 'Abertura com elástico (band pull-apart)', 'warm', 'reps', 15, false, 'Braços esticados à altura do peito, juntar as omoplatas.'),
  MB('scap_pushup', 'Flexões escapulares', 'warm', 'reps', 10, false, 'Em prancha alta, braços esticados: afastar e juntar as omoplatas.'),
  MB('wall_slide', 'Deslizes na parede (wall slides)', 'warm', 'reps', 10, false, 'Costas e antebraços na parede, subir os braços sem arquear a lombar.'),
  MB('thoracic_rot', 'Rotação torácica em quatro apoios', 'warm', 'reps', 8, true, 'Mão na nuca, abrir o cotovelo para o teto e seguir com o olhar.'),
  MB('cat_cow', 'Gato-camelo', 'warm', 'reps', 10, false, 'Em quatro apoios, arredondar e arquear as costas devagar.'),
  MB('dead_hang', 'Suspensão na barra', 'warm', 's', 20, false, 'Pendurado, ombros relaxados. Se for difícil, pés apoiados.'),
  MB('leg_swing_fb', 'Balanço de perna frente-trás', 'warm', 'reps', 10, true, 'Apoiado numa parede, tronco direito, amplitude a crescer.'),
  MB('leg_swing_side', 'Balanço de perna lateral', 'warm', 'reps', 10, true, 'De frente para a parede, perna a cruzar à frente do corpo.'),
  MB('hip_9090', 'Rotação de anca 90/90', 'warm', 'reps', 6, true, 'Sentado, joelhos a 90°, rodar as pernas de um lado para o outro.'),
  MB('ankle_mob', 'Mobilidade do tornozelo (joelho à parede)', 'warm', 'reps', 10, true, 'Levar o joelho à parede sem levantar o calcanhar.'),
  MB('glute_bridge', 'Ponte de glúteos', 'warm', 'reps', 12, false, 'Subir a anca a apertar os glúteos, 1 s em cima.'),
  MB('bw_squat', 'Agachamento sem peso com pausa', 'warm', 'reps', 10, false, '2 s em baixo, peito aberto, joelhos na linha dos pés.'),
  MB('lunge_rot', 'Afundo com rotação e alcance', 'warm', 'reps', 5, true, 'Afundo largo, mão no chão, rodar e levar o outro braço ao teto.'),
  // Alongamentos (no fim)
  MB('chest_door', 'Peitoral na ombreira da porta', 'stretch', 's', 40, true, 'Antebraço apoiado à altura do ombro, avançar o corpo devagar.'),
  MB('front_delt', 'Ombro anterior (mãos atrás das costas)', 'stretch', 's', 30, false, 'Entrelaçar as mãos atrás, braços esticados, abrir o peito.'),
  MB('cross_body', 'Ombro posterior (braço cruzado)', 'stretch', 's', 30, true, 'Puxar o braço pelo cotovelo para junto do peito.'),
  MB('triceps_oh', 'Tríceps acima da cabeça', 'stretch', 's', 30, true, 'Mão nas costas, a outra mão empurra o cotovelo para trás.'),
  MB('lat_stretch', 'Grande dorsal (agarrado a um poste)', 'stretch', 's', 40, true, 'Agarrar à altura da anca, sentar para trás e rodar o tronco.'),
  MB('child_pose', 'Postura da criança', 'stretch', 's', 45, false, 'Joelhos afastados, braços esticados à frente, respirar para as costas.'),
  MB('biceps_wall', 'Bíceps e antebraço na parede', 'stretch', 's', 30, true, 'Palma na parede atrás de si, braço esticado, rodar o tronco para fora.'),
  MB('neck_side', 'Pescoço (inclinação lateral)', 'stretch', 's', 30, true, 'Orelha ao ombro, ombro oposto descontraído para baixo.'),
  MB('quad_stand', 'Quadríceps em pé', 'stretch', 's', 40, true, 'Calcanhar ao glúteo, joelhos juntos, anca ligeiramente para a frente.'),
  MB('hamstring', 'Isquiotibiais sentado (uma perna)', 'stretch', 's', 45, true, 'Perna esticada, costas direitas, inclinar a partir da anca.'),
  MB('hip_flexor', 'Flexores da anca (afundo ajoelhado)', 'stretch', 's', 45, true, 'Joelho de trás no chão, apertar o glúteo e avançar a anca.'),
  MB('figure4', 'Glúteo (figura 4 deitado)', 'stretch', 's', 45, true, 'Tornozelo sobre o joelho oposto, puxar a perna de apoio ao peito.'),
  MB('butterfly', 'Adutores (borboleta)', 'stretch', 's', 45, false, 'Sentado, plantas dos pés juntas, cotovelos empurram os joelhos.'),
  MB('calf_wall', 'Gémeos na parede', 'stretch', 's', 40, true, 'Perna de trás esticada, calcanhar no chão, inclinar para a parede.'),
  MB('cobra', 'Abdominais (cobra)', 'stretch', 's', 30, false, 'Deitado de barriga para baixo, esticar os braços e abrir o peito.'),
];

const ROUTINES = {
  push: {
    warmup: ['cardio', 'arm_circles', 'band_pull_apart', 'scap_pushup', 'wall_slide', 'thoracic_rot'],
    cooldown: ['chest_door', 'front_delt', 'cross_body', 'triceps_oh', 'child_pose'],
  },
  pull: {
    warmup: ['cardio', 'arm_circles', 'cat_cow', 'band_pull_apart', 'thoracic_rot', 'dead_hang'],
    cooldown: ['lat_stretch', 'child_pose', 'biceps_wall', 'cross_body', 'neck_side'],
  },
  legs: {
    warmup: ['cardio', 'leg_swing_fb', 'leg_swing_side', 'hip_9090', 'ankle_mob', 'glute_bridge', 'bw_squat'],
    cooldown: ['quad_stand', 'hamstring', 'hip_flexor', 'figure4', 'butterfly', 'calf_wall', 'cobra'],
  },
  full: {
    warmup: ['cardio', 'arm_circles', 'cat_cow', 'lunge_rot', 'leg_swing_fb', 'bw_squat'],
    cooldown: ['chest_door', 'lat_stretch', 'quad_stand', 'hamstring', 'hip_flexor', 'child_pose'],
  },
};

/** Aquecimento e alongamentos sugeridos a partir do nome do treino (Push / Pull / Legs / outro). */
export function defaultRoutine(name = '') {
  const n = name.toLowerCase();
  const k = /push|peito|ombro|empurr/.test(n) ? 'push' : /pull|costas|puxar|dorsal/.test(n) ? 'pull' : /leg|perna|inferior|glúteo|gluteo/.test(n) ? 'legs' : 'full';
  return { warmup: [...ROUTINES[k].warmup], cooldown: [...ROUTINES[k].cooldown] };
}

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
  for (const [id, name, kind, mode, inc, img, perSide = false] of EX) exercises[id] = { id, name, kind, mode, inc, img, perSide };
  const foods = {};
  for (const f of FOODS) foods[f.id] = JSON.parse(JSON.stringify(f));
  const mobility = {};
  for (const m of MOBILITY) mobility[m.id] = { ...m };
  return {
    version: SCHEMA_VERSION,
    createdAt: Date.now(),
    startDate: dateKey(),
    goals: { kcal: 3000, p: 180, c: 380, f: 85 },
    water: { training: 3500, rest: 3000 },
    rest: { compound: 150, isolation: 75 },
    readapt: { weeks: 2, sets: 2, suggest: false },
    sound: true,
    exercises,
    templates: TEMPLATES.map((t) => ({ ...JSON.parse(JSON.stringify(t)), ...defaultRoutine(t.name) })),
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
  for (const t of cfg.templates) {
    const d = defaultRoutine(t.name);
    if (!Array.isArray(t.warmup)) t.warmup = d.warmup;
    if (!Array.isArray(t.cooldown)) t.cooldown = d.cooldown;
  }
  cfg.version = SCHEMA_VERSION;
  return cfg;
}
