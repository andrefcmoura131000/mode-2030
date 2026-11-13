// Aquecimento e alongamentos: biblioteca de movimentos, músculos de cada exercício.
// Fotos: free-exercise-db (domínio público), em img/ex/<pasta>/0.jpg e 1.jpg.
//
// Base científica das regras (ver logic.js → buildRoutines):
//  - Aquecimento RAMP (Jeffreys 2007): Raise (3–5 min de cardio leve) → Activate/Mobilise (movimentos
//    dinâmicos para os músculos e articulações do dia) → Potentiate (séries de aproximação no 1.º exercício).
//  - Alongamento estático antes de treinar só prejudica a força acima de ~60 s por músculo
//    (Simic 2013; Kay & Blazevich 2012; Behm 2016) → no aquecimento só movimentos dinâmicos.
//  - Flexibilidade: o que conta é o tempo acumulado por músculo, com ganhos até ~4 min por sessão
//    e ~10 min por semana (Ingram et al., Sports Med 2024); ACSM: ~60 s por músculo, ≥2 dias/semana.
//  - Alongar não reduz as dores musculares do dia seguinte (Herbert, Cochrane 2011): alongar os
//    músculos de ontem serve para somar volume semanal de flexibilidade, de forma suave.

export const MUSCLES = [
  ['chest', 'Peito'], ['shoulders', 'Ombros'], ['upper_back', 'Parte alta das costas'], ['lats', 'Dorsais'],
  ['biceps', 'Bíceps'], ['triceps', 'Tríceps'], ['forearms', 'Antebraços'], ['abs', 'Abdominais'],
  ['lower_back', 'Lombar'], ['glutes', 'Glúteos'], ['quads', 'Quadríceps'], ['hamstrings', 'Isquiotibiais'],
  ['adductors', 'Adutores'], ['calves', 'Gémeos'], ['hip_flexors', 'Flexores da anca'],
];

/** Músculos de cada exercício do plano: 1 = principal, 0,5 = secundário. */
export const EX_MUSCLES = {
  bench_bb: { chest: 1, triceps: 0.5, shoulders: 0.5 },
  incline_db: { chest: 1, shoulders: 0.7, triceps: 0.5 },
  ohp_db: { shoulders: 1, triceps: 0.5 },
  lat_raise_db: { shoulders: 1 },
  pushdown: { triceps: 1 },
  lat_pulldown: { lats: 1, biceps: 0.5, upper_back: 0.5 },
  row_bb: { upper_back: 1, lats: 1, biceps: 0.5, lower_back: 0.5, hamstrings: 0.3 },
  seated_row: { upper_back: 1, lats: 0.7, biceps: 0.5 },
  face_pull: { upper_back: 1, shoulders: 0.5 },
  curl_db: { biceps: 1, forearms: 0.5 },
  squat_bb: { quads: 1, glutes: 1, adductors: 0.5, lower_back: 0.5 },
  rdl_bb: { hamstrings: 1, glutes: 1, lower_back: 0.7 },
  leg_press: { quads: 1, glutes: 0.7 },
  lying_leg_curl: { hamstrings: 1, calves: 0.3 },
  standing_calf: { calves: 1 },
  plank: { abs: 1 },
  incline_bb: { chest: 1, shoulders: 0.7, triceps: 0.5 },
  shoulder_press_m: { shoulders: 1, triceps: 0.5 },
  chest_dip: { chest: 1, triceps: 1, shoulders: 0.5 },
  cable_crossover: { chest: 1 },
  lat_raise_cable: { shoulders: 1 },
  oh_triceps_cable: { triceps: 1 },
  pullup_assisted: { lats: 1, biceps: 0.5, upper_back: 0.5 },
  one_arm_row_db: { lats: 1, upper_back: 0.7, biceps: 0.5 },
  reverse_fly_m: { upper_back: 1, shoulders: 0.5 },
  preacher_curl: { biceps: 1 },
  hammer_curl_db: { biceps: 1, forearms: 1 },
  hanging_knee_raise: { abs: 1, hip_flexors: 0.7 },
  bulgarian_db: { quads: 1, glutes: 1, hip_flexors: 0.5, adductors: 0.3 },
  hip_thrust_bb: { glutes: 1, hamstrings: 0.5 },
  leg_ext: { quads: 1 },
  seated_leg_curl: { hamstrings: 1 },
  seated_calf: { calves: 1 },
  cable_crunch: { abs: 1 },
};

// [id, nome, tipo, medida, valor, por lado, pasta da foto, músculos (o 1.º é o principal), indicação]
// tipo: raise (cardio leve) | warm (dinâmico, antes) | stretch (estático, no fim)
const R = [
  ['cardio_bike', 'Bicicleta estática leve', 'raise', 's', 300, false, 'Bicycling_Stationary', ['quads', 'glutes', 'calves', 'hamstrings'], 'Ritmo em que ainda se consegue falar. Sobe a temperatura e o ritmo cardíaco.'],
  ['cardio_row', 'Remo ergómetro leve', 'raise', 's', 300, false, 'Rowing_Stationary', ['lats', 'upper_back', 'biceps', 'quads'], 'Ritmo leve e técnica limpa: pernas, depois tronco, depois braços.'],
  ['cardio_ellip', 'Elíptica leve', 'raise', 's', 300, false, 'Elliptical_Trainer', ['shoulders', 'chest', 'triceps', 'quads'], 'Ritmo leve, a usar também os braços.'],

  ['arm_circles', 'Círculos de braços', 'warm', 'reps', 10, false, 'Arm_Circles', ['shoulders', 'chest'], '10 para a frente e 10 para trás, a crescer a amplitude.'],
  ['shoulder_pass', 'Passagens de ombro com bastão', 'warm', 'reps', 10, false, 'Round_The_World_Shoulder_Stretch', ['shoulders', 'chest', 'lats'], 'Pega larga, levar o bastão da frente para trás das costas sem dobrar os braços.'],
  ['dyn_chest', 'Abertura dinâmica de peito', 'warm', 'reps', 10, false, 'Dynamic_Chest_Stretch', ['chest', 'shoulders', 'biceps'], 'Braços à frente, abrir para trás até sentir o peito, voltar. Ritmo controlado.'],
  ['band_pull_apart', 'Abertura com elástico (band pull-apart)', 'warm', 'reps', 15, false, 'Band_Pull_Apart', ['upper_back', 'shoulders'], 'Braços esticados à altura do peito, juntar as omoplatas.'],
  ['ext_rot_band', 'Rotação externa com elástico', 'warm', 'reps', 12, true, 'External_Rotation_with_Band', ['shoulders', 'upper_back'], 'Cotovelo colado ao corpo a 90°, rodar o antebraço para fora. Prepara a coifa dos rotadores.'],
  ['pushup_side', 'Flexão com rotação para prancha lateral', 'warm', 'reps', 5, true, 'Push_Up_to_Side_Plank', ['chest', 'triceps', 'shoulders', 'abs'], 'Uma flexão lenta e rodar para prancha lateral, braço ao teto.'],
  ['scap_pullup', 'Elevações escapulares', 'warm', 'reps', 8, false, 'Scapular_Pull-Up', ['lats', 'upper_back'], 'Pendurado com braços esticados: baixar e subir só as omoplatas.'],
  ['dyn_back', 'Abraços dinâmicos (costas)', 'warm', 'reps', 10, false, 'Dynamic_Back_Stretch', ['lats', 'upper_back', 'chest'], 'Abrir os braços e depois abraçar o tronco, alternando o braço de cima.'],
  ['cat_cow', 'Gato-camelo', 'warm', 'reps', 10, false, 'Cat_Stretch', ['lower_back', 'upper_back', 'abs'], 'Em quatro apoios, arredondar e arquear as costas devagar.'],
  ['torso_rot', 'Rotação de tronco', 'warm', 'reps', 10, true, 'Torso_Rotation', ['abs', 'lower_back', 'upper_back'], 'Anca parada, rodar o tronco de um lado para o outro.'],
  ['wrist_circles', 'Círculos de pulsos', 'warm', 'reps', 10, false, 'Wrist_Circles', ['forearms', 'biceps'], 'Mãos entrelaçadas, rodar os pulsos nos dois sentidos.'],
  ['leg_swing_fb', 'Balanço de perna frente-trás', 'warm', 'reps', 10, true, 'Front_Leg_Raises', ['hamstrings', 'hip_flexors', 'glutes'], 'Apoiado numa parede, tronco direito, amplitude a crescer.'],
  ['leg_swing_side', 'Balanço de perna lateral', 'warm', 'reps', 10, true, 'Side_Leg_Raises', ['adductors', 'glutes'], 'Apoiado, levar a perna para o lado e cruzar à frente.'],
  ['hip_circles', 'Círculos de anca', 'warm', 'reps', 8, true, 'Standing_Hip_Circles', ['glutes', 'hip_flexors', 'adductors'], 'Apoiado numa perna, desenhar círculos largos com o joelho.'],
  ['groiners', 'Groiners (mobilidade da anca)', 'warm', 'reps', 6, true, 'Groiners', ['adductors', 'hip_flexors', 'hamstrings'], 'Em prancha alta, levar o pé ao lado da mão e voltar.'],
  ['worlds_greatest', 'Afundo com rotação e alcance', 'warm', 'reps', 5, true, 'Worlds_Greatest_Stretch', ['hip_flexors', 'hamstrings', 'glutes', 'upper_back'], 'Afundo largo, mão no chão, rodar e levar o outro braço ao teto.'],
  ['ankle_circles', 'Círculos de tornozelo', 'warm', 'reps', 10, true, 'Ankle_Circles', ['calves'], 'Apoiado, ponta do pé no chão, rodar o tornozelo nos dois sentidos.'],
  ['glute_bridge', 'Ponte de glúteos', 'warm', 'reps', 12, false, 'Butt_Lift_Bridge', ['glutes', 'hamstrings', 'lower_back'], 'Subir a anca a apertar os glúteos, 1 s em cima.'],
  ['monster_walk', 'Passos laterais com elástico', 'warm', 'reps', 10, true, 'Monster_Walk', ['glutes', 'adductors'], 'Elástico nos joelhos, meio agachado, passos laterais curtos.'],
  ['bw_squat', 'Agachamento sem peso', 'warm', 'reps', 10, false, 'Bodyweight_Squat', ['quads', 'glutes', 'adductors'], '2 s em baixo, peito aberto, joelhos na linha dos pés.'],
  ['walking_lunge', 'Afundos a andar', 'warm', 'reps', 6, true, 'Bodyweight_Walking_Lunge', ['quads', 'glutes', 'hip_flexors'], 'Passo largo, joelho de trás perto do chão, tronco direito.'],
  ['plank_act', 'Prancha (ativação)', 'warm', 's', 30, false, 'Plank', ['abs', 'lower_back'], 'Apertar abdominais e glúteos, corpo em linha.'],

  ['chest_stick', 'Peitoral e ombro anterior com bastão', 'stretch', 's', 45, false, 'Chest_And_Front_Of_Shoulder_Stretch', ['chest', 'shoulders', 'biceps'], 'Bastão atrás das costas, braços esticados, subir devagar até sentir o peito.'],
  ['elbows_back', 'Peitoral: cotovelos atrás', 'stretch', 's', 45, false, 'Elbows_Back', ['chest', 'shoulders'], 'Mãos na lombar, levar os cotovelos um para o outro e abrir o peito.'],
  ['cross_body', 'Ombro posterior (braço cruzado)', 'stretch', 's', 40, true, 'Shoulder_Stretch', ['shoulders', 'upper_back'], 'Puxar o braço esticado para junto do peito, ombro em baixo.'],
  ['triceps_oh', 'Tríceps acima da cabeça', 'stretch', 's', 40, true, 'Triceps_Stretch', ['triceps', 'lats'], 'Mão nas costas, a outra mão puxa o cotovelo para trás.'],
  ['lat_wall', 'Grande dorsal e tríceps na parede', 'stretch', 's', 40, true, 'One_Arm_Against_Wall', ['lats', 'triceps'], 'Antebraço na parede acima da cabeça, afundar o peito e a anca para o lado.'],
  ['side_lying_lat', 'Lateral do tronco deitado', 'stretch', 's', 40, true, 'Side-Lying_Floor_Stretch', ['lats', 'abs'], 'Deitado de lado, braços esticados acima da cabeça, alongar de lado a lado.'],
  ['upper_back', 'Parte alta das costas (abraço à frente)', 'stretch', 's', 40, false, 'Upper_Back_Stretch', ['upper_back', 'shoulders'], 'Mãos entrelaçadas à frente, arredondar as costas e afastar as omoplatas.'],
  ['child_pose', 'Postura da criança', 'stretch', 's', 60, false, 'Childs_Pose', ['lats', 'lower_back', 'upper_back'], 'Joelhos afastados, braços esticados à frente, respirar para as costas.'],
  ['biceps_stand', 'Bíceps em pé (mãos atrás)', 'stretch', 's', 40, false, 'Standing_Biceps_Stretch', ['biceps', 'chest', 'shoulders'], 'Mãos entrelaçadas atrás, palmas para baixo, subir os braços devagar.'],
  ['forearm_kneel', 'Antebraços ajoelhado', 'stretch', 's', 40, false, 'Kneeling_Forearm_Stretch', ['forearms', 'biceps'], 'Palmas no chão com os dedos para os joelhos, levar a anca para trás.'],
  ['neck_side', 'Pescoço (inclinação lateral)', 'stretch', 's', 30, true, 'Side_Neck_Stretch', ['upper_back'], 'Orelha ao ombro, ombro oposto descontraído para baixo.'],
  ['quad_side', 'Quadríceps deitado de lado', 'stretch', 's', 45, true, 'On_Your_Side_Quad_Stretch', ['quads', 'hip_flexors'], 'Calcanhar ao glúteo, joelho para trás, anca para a frente.'],
  ['hip_flexor', 'Flexores da anca (afundo ajoelhado)', 'stretch', 's', 45, true, 'Kneeling_Hip_Flexor', ['hip_flexors', 'quads'], 'Joelho de trás no chão, apertar o glúteo e avançar a anca.'],
  ['ham_seated', 'Isquiotibiais sentado (uma perna)', 'stretch', 's', 45, true, 'Seated_Floor_Hamstring_Stretch', ['hamstrings', 'calves', 'lower_back'], 'Perna esticada, costas direitas, inclinar a partir da anca.'],
  ['ham_lying', 'Isquiotibiais deitado (perna ao alto)', 'stretch', 's', 45, true, 'Hamstring_Stretch', ['hamstrings', 'calves'], 'Deitado, puxar a perna esticada para cima; a outra fica no chão.'],
  ['figure4', 'Glúteo (figura 4 deitado)', 'stretch', 's', 45, true, 'Ankle_On_The_Knee', ['glutes', 'hip_flexors'], 'Tornozelo sobre o joelho oposto, puxar a perna de apoio ao peito.'],
  ['knee_across', 'Glúteo e lombar (joelho cruzado)', 'stretch', 's', 40, true, 'Knee_Across_The_Body', ['glutes', 'lower_back', 'abs'], 'Deitado, levar o joelho por cima do corpo; ombros no chão.'],
  ['butterfly', 'Adutores (borboleta)', 'stretch', 's', 45, false, 'Groin_and_Back_Stretch', ['adductors', 'lower_back'], 'Sentado, plantas dos pés juntas, inclinar o tronco à frente.'],
  ['calf_wall', 'Gémeos na parede', 'stretch', 's', 40, true, 'Calf_Stretch_Hands_Against_Wall', ['calves', 'hamstrings'], 'Perna de trás esticada, calcanhar no chão, inclinar para a parede.'],
  ['soleus', 'Sóleo e tendão de Aquiles', 'stretch', 's', 40, true, 'Standing_Soleus_And_Achilles_Stretch', ['calves'], 'Como na parede, mas com o joelho de trás dobrado.'],
  ['overhead_abs', 'Abdominais (braços acima da cabeça)', 'stretch', 's', 30, false, 'Overhead_Stretch', ['abs', 'lats'], 'Dedos entrelaçados, palmas para o teto, crescer e inclinar para trás.'],
  ['hug_knees', 'Joelhos ao peito', 'stretch', 's', 40, false, 'Hug_Knees_To_Chest', ['lower_back', 'glutes'], 'Deitado de costas, abraçar os joelhos e descontrair a lombar.'],
  ['spinal_twist', 'Rotação da coluna sentado', 'stretch', 's', 30, true, 'Spinal_Stretch', ['upper_back', 'lower_back', 'abs'], 'Sentado direito, rodar o tronco para trás com a ajuda das mãos.'],
];

export const MOBILITY_DB = R.map(([id, name, kind, unit, val, side, img, muscles, cue]) => ({ id, name, kind, unit, val, side, img, muscles, cue }));

/** Ids da versão anterior (v2) que deixam de existir. */
export const OLD_MOBILITY_IDS = ['cardio', 'scap_pushup', 'wall_slide', 'thoracic_rot', 'dead_hang', 'hip_9090', 'ankle_mob', 'lunge_rot', 'chest_door', 'front_delt', 'lat_stretch', 'biceps_wall', 'quad_stand', 'hamstring', 'cobra'];
