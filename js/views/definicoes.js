// Definições: plano, metas, treino, exercícios, alimentos, refeições, suplementos, backup e dados.
import { S, saveCfg, allEntries, replaceAll, reload, setPhoto } from '../store.js';
import { phase, doseText, routineMinutes, normText, routinesFor, resolveMoves } from '../logic.js';
import { MUSCLES } from '../mobility-db.js';
import { SLOTS, SUPP_MOMENTS, seedConfig, NEW_ROUTINE } from '../seed.js';
import { FOOD_CATS } from '../foods-db.js';
import { dateKey, longDate, esc, fmt, fmtKg, num, uid, DIAS } from '../util.js';
import { icon, openSheet, closeSheet, field, numInput, textInput, selectInput, toast, confirmDialog, go, render, exThumb, resizeImage } from '../ui.js';
import { foodEditor } from './comida.js';
import { macrosFor, sumMacros } from '../logic.js';

const WEEKDAYS = [[0, 'Sem dia fixo'], ...[1, 2, 3, 4, 5, 6, 7].map((d) => [d, DIAS[d % 7][0].toUpperCase() + DIAS[d % 7].slice(1)])];
const KIND = [['compound', 'Composto'], ['isolation', 'Isolado']];
const MODE = [['load', 'Carga (kg)'], ['assisted', 'Assistido (kg de assistência)'], ['bodyweight', 'Peso do corpo (+kg extra)'], ['time', 'Tempo (segundos)']];
const back = (to = '#definicoes', title = '') => `<header class="top"><a class="icon-btn" href="${to}" aria-label="Voltar">${icon('left')}</a><h1 class="title title-sm">${title}</h1><span></span></header>`;
const toggle = (name, checked, label) => `<label class="toggle"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

/* ---------- Páginas ---------- */
function home() {
  const ph = phase(S.cfg, dateKey());
  const last = S.cfg.lastExportAt;
  const item = (href, ic, t, sub) => `<a class="list-row" href="${href}">${icon(ic)}<span class="list-main">${t}<span class="mut small block">${sub}</span></span>${icon('right', 'ic-mut')}</a>`;
  return `<header class="top"><h1 class="title">Definições</h1></header>
    <section class="card"><div class="list">
      ${item('#definicoes/plano', 'flag', 'Plano e descanso', `Início ${longDate(S.cfg.startDate)} · semana ${ph.week} · ${S.cfg.schedule === 'sequence' ? 'em sequência' : 'por dia da semana'}`)}
      ${item('#definicoes/metas', 'food', 'Metas diárias', `${fmt(S.cfg.goals.kcal)} kcal · P ${S.cfg.goals.p} · H ${S.cfg.goals.c} · G ${S.cfg.goals.f} · água`)}
      ${item('#definicoes/treino', 'barbell', 'Plano de treino', `${S.cfg.templates.length} treinos · séries e gamas`)}
      ${item('#definicoes/exercicios', 'camera', 'Exercícios', 'Tipo, incremento, foto')}
      ${item('#definicoes/mobilidade', 'stretch', 'Aquecimento e alongamentos', `${Object.keys(S.cfg.mobility || {}).length} movimentos · tempo, reps, indicações`)}
      ${item('#definicoes/alimentos', 'search', 'Base de alimentos', `${Object.keys(S.cfg.foods).length} alimentos`)}
      ${item('#definicoes/refeicoes', 'list', 'Refeições do plano', 'Quantidades de cada refeição')}
      ${item('#definicoes/suplementos', 'pill', 'Suplementos', `${S.cfg.supplements.length} na lista diária`)}
    </div></section>
    <section class="card"><div class="list">
      ${item('#definicoes/backup', 'download', 'Backup', last ? `Último: ${longDate(dateKey(new Date(last)))}` : 'Ainda sem backup')}
      ${item('#definicoes/dados', 'trash', 'Apagar dados', 'Recomeçar do zero')}
    </div></section>
    <p class="mut small center">MODE 2030 · os dados ficam só neste telemóvel</p>`;
}

function plano() {
  const c = S.cfg;
  return `${back('#definicoes', 'Plano e descanso')}
    <section class="card" data-form="plano">
      ${field('Data de início do plano', `<input class="input" type="date" name="startDate" value="${c.startDate}">`, 'A semana do plano conta a partir daqui (blocos de 7 dias).')}
      ${field('Ordem dos treinos', selectInput('schedule', [['weekday', 'Pelo dia da semana'], ['sequence', 'Em sequência (o próximo que falta)']], c.schedule || 'weekday'),
        'Em sequência, faltar a um dia não salta o treino: a app propõe sempre o seguinte ao último feito (Push A → Pull A → Legs A → …).')}
      <div class="grid2">${field('Semanas de readaptação', numInput('rw', c.readapt.weeks, 'inputmode="numeric"'))}${field('Séries na readaptação', numInput('rs', c.readapt.sets, 'inputmode="numeric"'))}</div>
      ${toggle('suggest', c.readapt.suggest, 'Sugerir subida de carga durante a readaptação')}
      <div class="lbl mt">Descanso</div>
      <div class="grid2">${field('Compostos (s)', numInput('rc', c.rest.compound, 'inputmode="numeric"'), '2–3 min')}${field('Isolados (s)', numInput('ri', c.rest.isolation, 'inputmode="numeric"'), '60–90 s')}</div>
      ${toggle('sound', c.sound, 'Som no fim do descanso (além da vibração)')}
      <button class="btn btn-gold btn-block mt" data-act="d-save-plano">Guardar</button>
    </section>`;
}

function metas() {
  const g = S.cfg.goals;
  const fromMacros = g.p * 4 + g.c * 4 + g.f * 9;
  return `${back('#definicoes', 'Metas diárias')}
    <section class="card" data-form="metas">
      ${field('Calorias (kcal)', numInput('kcal', g.kcal))}
      <div class="grid3">${field('Proteína (g)', numInput('p', g.p))}${field('Hidratos (g)', numInput('c', g.c))}${field('Gordura (g)', numInput('f', g.f))}</div>
      <p class="mut small">Pelas macros: ${fmt(fromMacros)} kcal (P×4 + H×4 + G×9).</p>
      <div class="lbl mt">Água</div>
      <div class="grid2">${field('Dia de treino (L)', numInput('wt', S.cfg.water.training / 1000))}${field('Dia de descanso (L)', numInput('wr', S.cfg.water.rest / 1000))}</div>
      <button class="btn btn-gold btn-block mt" data-act="d-save-metas">Guardar</button>
    </section>`;
}

function treinoList() {
  const rows = [...S.cfg.templates].sort((a, b) => (a.weekday || 9) - (b.weekday || 9)).map((t) =>
    `<a class="list-row" href="#definicoes/treino/${t.id}"><span class="list-main">${esc(t.name)}<span class="mut small block">${WEEKDAYS.find((w) => w[0] === t.weekday)?.[1] || ''} · ${t.items.length} exercícios</span></span>${icon('right', 'ic-mut')}</a>`).join('');
  return `${back('#definicoes', 'Plano de treino')}
    <section class="card"><div class="list">${rows}</div>
      <button class="btn btn-block mt" data-act="d-tpl-new">${icon('plus')} Novo treino</button></section>
    <p class="mut small center">As alterações valem para os próximos treinos. O histórico não muda.</p>`;
}

let tplDraft = null;
function treinoEdit(id) {
  const t = S.cfg.templates.find((x) => x.id === id);
  if (!t) return `${back('#definicoes/treino', 'Treino')}<p class="mut">Treino não encontrado.</p>`;
  if (!tplDraft || tplDraft.id !== id) tplDraft = JSON.parse(JSON.stringify(t));
  const exOpts = Object.values(S.cfg.exercises).sort((a, b) => a.name.localeCompare(b.name)).map((e) => [e.id, e.name]);
  const rows = tplDraft.items.map((it, i) => `<div class="tpl-item">
      <div class="row-g">${exThumb(S.cfg.exercises[it.exerciseId] || {})}${selectInput(`ex_${i}`, exOpts, it.exerciseId)}</div>
      <div class="grid3 mt-s">${field('Séries', numInput(`s_${i}`, it.sets, 'inputmode="numeric"'))}${field('Mín.', numInput(`a_${i}`, it.repMin, 'inputmode="numeric"'))}${field('Máx.', numInput(`b_${i}`, it.repMax, 'inputmode="numeric"'))}</div>
      <div class="row-g tpl-tools">
        <button class="icon-btn sm" data-act="d-tpl-mv" data-i="${i}" data-d="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button class="icon-btn sm" data-act="d-tpl-mv" data-i="${i}" data-d="1" aria-label="Descer" ${i === tplDraft.items.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
        <button class="icon-btn sm danger" data-act="d-tpl-rm" data-i="${i}" aria-label="Retirar">${icon('trash')}</button></div>
    </div>`).join('');
  return `${back('#definicoes/treino', esc(t.name))}
    <section class="card" data-form="tpl">
      <div class="grid2">${field('Nome', textInput('name', tplDraft.name))}${field('Dia', selectInput('weekday', WEEKDAYS, tplDraft.weekday))}</div>
      <p class="mut small">Mín./Máx. = gama de repetições (no Plank, segundos).</p>
      ${rows}
      <button class="btn btn-block mt-s" data-act="d-tpl-add">${icon('plus')} Adicionar exercício</button>
      <div class="lbl mt">Aquecimento e alongamentos</div>
      <label class="toggle"><input type="checkbox" name="routineAuto" data-change="d-tpl-routine" ${tplDraft.routine !== 'manual' ? 'checked' : ''}><span>Automático: escolhidos pelos músculos deste treino e do treino de ontem (recomendado)</span></label>
      ${tplDraft.routine === 'manual' ? mobSection('warmup', 'Aquecimento (antes)', 'warm') + mobSection('cooldown', 'Alongamentos (no fim)', 'stretch') : autoPreview()}
      <button class="btn btn-gold btn-block mt" data-act="d-tpl-save">Guardar treino</button>
      <button class="btn btn-ghost btn-block mt-s danger" data-act="d-tpl-del">${icon('trash')} Apagar treino</button>
    </section>`;
}

function mobSection(key, title, kind) {
  const ids = tplDraft[key] || [];
  const moves = ids.map((id) => S.cfg.mobility[id]).filter(Boolean);
  const opts = Object.values(S.cfg.mobility).filter((m) => m.kind === kind && !ids.includes(m.id)).sort((a, b) => a.name.localeCompare(b.name)).map((m) => [m.id, m.name]);
  return `<div class="lbl mt">${title} · ~${moves.length ? routineMinutes(moves) : 0} min</div>
    <div class="list">${ids.map((id, i) => {
      const m = S.cfg.mobility[id];
      return m ? `<div class="list-row mob-ed"><span class="list-main">${esc(m.name)}<span class="mut small block">${doseText(m)}</span></span>
        <button class="icon-btn sm" data-act="d-tpl-mob-mv" data-k="${key}" data-i="${i}" data-d="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button class="icon-btn sm danger" data-act="d-tpl-mob-rm" data-k="${key}" data-i="${i}" aria-label="Retirar">${icon('x')}</button></div>` : '';
    }).join('')}</div>
    ${opts.length ? `<div class="row-g mt-s">${selectInput('mob_' + key, opts, '')}<button class="btn btn-sm" data-act="d-tpl-mob-add" data-k="${key}" aria-label="Acrescentar">${icon('plus')}</button></div>` : ''}`;
}

function autoPreview() {
  const R = routinesFor(S.cfg, { ...tplDraft, routine: 'auto' }, dateKey(), []);
  const line = (l) => resolveMoves(S.cfg, l).map((m) => esc(m.name.split(' (')[0])).join(' · ');
  return `<p class="mut small">Sem treino na véspera ficaria assim (no dia, junta-se o que foi treinado ontem):</p>
    <p class="small"><span class="gold">Aquecimento:</span> ${line(R.warmup) || '—'}</p>
    <p class="small"><span class="gold">Alongamentos:</span> ${line(R.cooldown) || '—'}</p>`;
}

/** Músculos do exercício: os escolhidos ficam principais (1); os secundários antigos mantêm-se se não forem desmarcados. */
function musclesFrom(old, primary) {
  const out = {};
  for (const [k, w] of Object.entries(old)) if (w < 1) out[k] = w;
  for (const k of primary) out[k] = 1;
  return out;
}

/** Botões para escolher músculos; a ordem dos escolhidos conta (o 1.º é o principal). */
const muscleChips = (sel) => `<div class="chips" data-muscles>${MUSCLES.map(([k, l]) => `<button type="button" class="chip ${sel.includes(k) ? 'on' : ''}" data-mus="${k}">${l}</button>`).join('')}</div>`;
function wireMuscles(body, sel) {
  const order = [...sel];
  body.querySelectorAll('[data-mus]').forEach((b) => (b.onclick = (ev) => {
    ev.preventDefault();
    const k = b.dataset.mus;
    const i = order.indexOf(k);
    if (i >= 0) order.splice(i, 1); else order.push(k);
    b.classList.toggle('on', i < 0);
  }));
  return () => [...order];
}

function mobilidade() {
  const all = Object.values(S.cfg.mobility || {});
  const group = (kind, title) => {
    const rows = all.filter((m) => m.kind === kind).sort((a, b) => a.name.localeCompare(b.name)).map((m) =>
      `<button class="list-row" data-act="d-mob" data-id="${m.id}">${exThumb(m)}<span class="list-main">${esc(m.name)}<span class="mut small block">${doseText(m)}${m.cue ? ' · ' + esc(m.cue) : ''}</span></span>${icon('edit', 'ic-mut')}</button>`).join('');
    return `<section class="card"><div class="lbl">${title}</div><div class="list">${rows || '<p class="mut">Nenhum.</p>'}</div>
      <button class="btn btn-block mt" data-act="d-mob" data-id="" data-kind="${kind}">${icon('plus')} Novo</button></section>`;
  };
  return `${back('#definicoes', 'Aquecimento e alongamentos')}
    <p class="mut small">Aquecimento: mobilidade dinâmica antes dos exercícios. Alongamentos: estáticos no fim, 30–60 s por posição. Por defeito a app escolhe-os sozinha, pelos músculos do treino de hoje e de ontem. Os músculos de cada movimento servem para essa escolha.</p>
    ${group('raise', 'Cardio leve (início do aquecimento)')}${group('warm', 'Aquecimento dinâmico')}${group('stretch', 'Alongamentos')}`;
}

function exercicios() {
  const rows = Object.values(S.cfg.exercises).sort((a, b) => a.name.localeCompare(b.name)).map((e) =>
    `<button class="list-row" data-act="d-ex" data-id="${e.id}">${exThumb(e)}<span class="list-main">${esc(e.name)}<span class="mut small block">${e.kind === 'compound' ? 'Composto' : 'Isolado'} · +${fmtKg(e.inc)} ${e.mode === 'time' ? 's' : 'kg'}${S.photos[e.id] ? ' · foto própria' : ''}</span></span>${icon('right', 'ic-mut')}</button>`).join('');
  return `${back('#definicoes', 'Exercícios')}
    <p class="mut small">O incremento é a menor subida possível no material do ginásio. Barra: 2,5 kg (discos de 1,25 por lado). Halteres: 2 kg. Polias e máquinas: 5 kg.</p>
    <section class="card"><div class="list">${rows}</div><button class="btn btn-block mt" data-act="d-ex" data-id="">${icon('plus')} Novo exercício</button></section>`;
}

function alimentos() {
  const foods = Object.values(S.cfg.foods);
  const row = (f) => `<button class="list-row" data-act="d-food" data-id="${f.id}" data-fname="${esc(normText(f.name))}"><span class="list-main">${esc(f.name)}${f.custom ? ' <span class="tag tag-xs">meu</span>' : ''}<span class="mut small block tnum">${f.basis === 'un' ? 'por unidade' : 'por 100 ' + f.basis}: ${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} · H ${fmt(f.c, 1)} · G ${fmt(f.f, 1)}${f.portions?.length ? ` · ${f.portions.map((p) => esc(p.label)).join(', ')}` : ''}</span></span>${icon('edit', 'ic-mut')}</button>`;
  const groups = FOOD_CATS.map(([k, label]) => {
    const list = foods.filter((f) => (f.cat || 'outros') === k).sort((a, b) => a.name.localeCompare(b.name));
    return list.length ? `<section class="card" data-grp><div class="lbl">${label} · ${list.length}</div><div class="list">${list.map(row).join('')}</div></section>` : '';
  }).join('');
  return `${back('#definicoes', 'Base de alimentos')}
    <div class="banner banner-info">${icon('info')}<span>Valores médios de referência, aproximados: por 100 g de parte comestível, em cru salvo indicação. Quando houver rótulo, corrigir aqui.</span></div>
    <div class="search">${icon('search')}<input class="input" placeholder="Procurar em ${foods.length} alimentos" data-filter autocomplete="off"></div>
    <button class="btn btn-gold btn-block mb" data-act="d-food" data-id="">${icon('plus')} Novo alimento</button>
    ${groups}`;
}

function refeicoes() {
  const SL = Object.fromEntries(SLOTS);
  const rows = S.cfg.meals.filter((m) => m.kind === 'plan').map((m) => {
    const t = sumMacros(m.items.filter((i) => S.cfg.foods[i.foodId]).map((i) => macrosFor(S.cfg.foods[i.foodId], i.qty)));
    return `<button class="list-row" data-act="d-meal" data-id="${m.id}"><span class="list-main">${esc(m.name)}<span class="mut small block tnum">${SL[m.slot]} · ${fmt(t.kcal)} kcal · P ${fmt(t.p)}</span></span>${icon('edit', 'ic-mut')}</button>`;
  }).join('');
  const all = sumMacros(S.cfg.meals.filter((m) => m.kind === 'plan').flatMap((m) => m.items.filter((i) => S.cfg.foods[i.foodId]).map((i) => macrosFor(S.cfg.foods[i.foodId], i.qty))));
  const g = S.cfg.goals;
  return `${back('#definicoes', 'Refeições do plano')}
    <section class="card"><div class="list">${rows}</div></section>
    <section class="card"><div class="lbl">Total do plano vs metas</div>
      <div class="grid4 small center tnum">
        <div><div>${fmt(all.kcal)}</div><div class="mut">/ ${fmt(g.kcal)} kcal</div></div>
        <div><div>${fmt(all.p)}</div><div class="mut">/ ${g.p} P</div></div>
        <div><div>${fmt(all.c)}</div><div class="mut">/ ${g.c} H</div></div>
        <div><div>${fmt(all.f)}</div><div class="mut">/ ${g.f} G</div></div></div>
      <p class="mut small mt-s">Com a primeira opção de cada alimento.</p></section>`;
}

function suplementos() {
  const ML = Object.fromEntries(SUPP_MOMENTS);
  const rows = S.cfg.supplements.map((s) => `<button class="list-row" data-act="d-supp" data-id="${s.id}"><span class="list-main">${esc(s.name)}<span class="mut small block">${esc(s.dose || '')}${s.dose ? ' · ' : ''}${ML[s.moment] || ''}</span></span>${icon('edit', 'ic-mut')}</button>`).join('');
  return `${back('#definicoes', 'Suplementos')}
    <section class="card">${rows ? `<div class="list">${rows}</div>` : '<p class="mut">Sem suplementos.</p>'}
      <button class="btn btn-block mt" data-act="d-supp" data-id="">${icon('plus')} Adicionar suplemento</button></section>`;
}

function backup() {
  const last = S.cfg.lastExportAt;
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] }));
  return `${back('#definicoes', 'Backup')}
    <section class="card">
      <p>Os dados ficam só neste telemóvel. Exportar um backup todas as semanas e guardá-lo fora do telemóvel (Google Drive, e-mail).</p>
      <p class="mut small">${last ? `Último backup: ${longDate(dateKey(new Date(last)))}.` : 'Ainda não foi feito nenhum backup.'}</p>
      ${canShare ? `<button class="btn btn-gold btn-block mt" data-act="d-export" data-share="1">${icon('upload')} Exportar e guardar no Drive…</button>` : ''}
      <button class="btn ${canShare ? '' : 'btn-gold'} btn-block mt-s" data-act="d-export">${icon('download')} Descarregar ficheiro JSON</button>
    </section>
    <section class="card"><div class="lbl">Importar</div>
      <p class="mut small">Substitui todos os dados atuais pelos do ficheiro.</p>
      <label class="btn btn-block mt-s">${icon('upload')} Escolher ficheiro de backup<input type="file" accept="application/json,.json" data-change="d-import" hidden></label>
    </section>`;
}

function dados() {
  return `${back('#definicoes', 'Apagar dados')}
    <section class="card">
      <p>Apaga treinos, alimentação, água, peso, suplementos, fotos e definições deste telemóvel.</p>
      <p class="mut small">Antes disso convém exportar um backup.</p>
      ${field('Escrever APAGAR para confirmar', textInput('confirm', '', 'autocapitalize="characters"'))}
      <button class="btn btn-danger btn-block mt" data-act="d-wipe">${icon('trash')} Apagar tudo</button>
    </section>`;
}

export function render_(args = []) {
  const [p, q] = args;
  if (p !== 'treino' || !q) tplDraft = null;
  switch (p) {
    case 'plano': return plano();
    case 'metas': return metas();
    case 'treino': return q ? treinoEdit(q) : treinoList();
    case 'exercicios': return exercicios();
    case 'mobilidade': return mobilidade();
    case 'alimentos': return alimentos();
    case 'refeicoes': return refeicoes();
    case 'suplementos': return suplementos();
    case 'backup': return backup();
    case 'dados': return dados();
    default: return home();
  }
}
export { render_ as render };

/* ---------- Auxiliares ---------- */
const form = (name) => document.querySelector(`[data-form="${name}"]`);
const val = (root, n) => root.querySelector(`[name="${n}"]`)?.value ?? '';
function readTpl() {
  const root = form('tpl');
  if (!root || !tplDraft) return;
  tplDraft.name = val(root, 'name').trim() || tplDraft.name;
  tplDraft.weekday = +val(root, 'weekday');
  const auto = root.querySelector('[name=routineAuto]');
  if (auto) tplDraft.routine = auto.checked ? 'auto' : 'manual';
  tplDraft.items.forEach((it, i) => {
    it.exerciseId = val(root, `ex_${i}`) || it.exerciseId;
    it.sets = parseInt(val(root, `s_${i}`), 10);
    it.repMin = parseInt(val(root, `a_${i}`), 10);
    it.repMax = parseInt(val(root, `b_${i}`), 10);
  });
}
function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Ações ---------- */
export const actions = {
  async 'd-save-plano'() {
    const r = form('plano');
    const sd = val(r, 'startDate');
    const rw = parseInt(val(r, 'rw'), 10), rs = parseInt(val(r, 'rs'), 10), rc = parseInt(val(r, 'rc'), 10), ri = parseInt(val(r, 'ri'), 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sd)) return toast('Indicar a data de início');
    if (!(rw >= 0 && rw <= 12) || !(rs >= 1 && rs <= 10)) return toast('Readaptação: semanas 0–12, séries 1–10');
    if (!(rc >= 15 && rc <= 600) || !(ri >= 15 && ri <= 600)) return toast('Descanso entre 15 e 600 s');
    Object.assign(S.cfg, { startDate: sd, sound: r.querySelector('[name=sound]').checked, schedule: val(r, 'schedule') === 'sequence' ? 'sequence' : 'weekday' });
    S.cfg.readapt = { weeks: rw, sets: rs, suggest: r.querySelector('[name=suggest]').checked };
    S.cfg.rest = { compound: rc, isolation: ri };
    await saveCfg();
    toast('Guardado');
    go('#definicoes');
  },
  async 'd-save-metas'() {
    const r = form('metas');
    const v = (n) => num(val(r, n));
    const g = { kcal: v('kcal'), p: v('p'), c: v('c'), f: v('f') };
    const wt = v('wt'), wr = v('wr');
    if (Object.values(g).some((x) => !(x > 0)) || !(wt > 0 && wt < 10) || !(wr > 0 && wr < 10)) return toast('Preencher todos os valores');
    S.cfg.goals = { kcal: Math.round(g.kcal), p: Math.round(g.p), c: Math.round(g.c), f: Math.round(g.f) };
    S.cfg.water = { training: Math.round(wt * 1000), rest: Math.round(wr * 1000) };
    await saveCfg();
    toast('Metas guardadas');
    go('#definicoes');
  },
  'd-tpl-new'() {
    const id = 't_' + uid();
    S.cfg.templates.push({ id, name: 'Novo treino', weekday: 0, items: [], ...NEW_ROUTINE() });
    saveCfg();
    go('#definicoes/treino/' + id);
  },
  'd-tpl-mv'(d) {
    readTpl();
    const i = +d.i, j = i + +d.d;
    const a = tplDraft.items;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    render();
  },
  'd-tpl-rm'(d) { readTpl(); tplDraft.items.splice(+d.i, 1); render(); },
  'd-tpl-mob-add'(d) {
    readTpl();
    const id = val(form('tpl'), 'mob_' + d.k);
    if (!id || !S.cfg.mobility[id]) return;
    (tplDraft[d.k] ||= []).push(id);
    render();
  },
  'd-tpl-routine'() {
    readTpl();
    if (tplDraft.routine === 'manual' && !tplDraft.warmup.length && !tplDraft.cooldown.length) {
      // ponto de partida: a escolha automática de hoje, para depois ajustar à mão
      const R = routinesFor(S.cfg, { ...tplDraft, routine: 'auto' }, dateKey(), S.sessions);
      tplDraft.warmup = R.warmup.map((x) => x.id);
      tplDraft.cooldown = R.cooldown.map((x) => x.id);
    }
    render();
  },
  'd-tpl-mob-rm'(d) { readTpl(); tplDraft[d.k].splice(+d.i, 1); render(); },
  'd-tpl-mob-mv'(d) {
    readTpl();
    const a = tplDraft[d.k], i = +d.i, j = i + +d.d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    render();
  },
  'd-mob'(d) {
    const m = d.id ? S.cfg.mobility[d.id] : null;
    const e = m || { name: '', kind: d.kind || 'stretch', unit: 's', val: 30, side: false, cue: '', muscles: [] };
    const body = openSheet(`<div class="sheet-title">${m ? 'Editar movimento' : 'Novo movimento'}</div>
      ${field('Nome', textInput('name', e.name, m ? '' : 'autofocus placeholder="Alongamento de peitoral"'))}
      <div class="grid2">${field('Quando', selectInput('kind', [['raise', 'Cardio leve'], ['warm', 'Aquecimento'], ['stretch', 'Alongamento']], e.kind))}${field('Medida', selectInput('unit', [['s', 'Segundos'], ['reps', 'Repetições']], e.unit))}</div>
      ${field('Valor', numInput('val', e.val, 'inputmode="numeric"'), 'Segundos a manter, ou repetições. 300 s = 5 min.')}
      ${toggle('side', e.side, 'Faz-se de cada lado')}
      <div class="field-l mt-s">Músculos (o primeiro tocado é o principal)</div>${muscleChips(e.muscles || [])}
      ${field('Indicação', textInput('cue', e.cue, 'placeholder="Como fazer, em poucas palavras"'))}
      <div class="${m ? 'grid2' : ''} mt">${m ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button>` : ''}<button class="btn btn-gold ${m ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`);
    const getMus = wireMuscles(body, e.muscles || []);
    body.querySelector('[data-x=ok]').onclick = async () => {
      const name = val(body, 'name').trim();
      const v = parseInt(val(body, 'val'), 10);
      if (!name) return toast('Indicar o nome');
      if (!(v > 0 && v <= 1800)) return toast('Valor entre 1 e 1800');
      const id = m?.id || 'm_' + uid();
      S.cfg.mobility[id] = { id, name, kind: val(body, 'kind'), unit: val(body, 'unit'), val: v, side: body.querySelector('[name=side]').checked, cue: val(body, 'cue').trim(), img: m?.img || '', muscles: getMus() };
      await saveCfg();
      closeSheet();
      toast('Guardado');
      render();
    };
    body.querySelector('[data-x=del]')?.addEventListener('click', async () => {
      const inTpl = S.cfg.templates.filter((t) => [...(t.warmup || []), ...(t.cooldown || [])].includes(m.id));
      if (!(await confirmDialog(`Apagar ${m.name}?`, { ok: 'Apagar', danger: true, detail: inTpl.length ? `Sai também de: ${inTpl.map((t) => t.name).join(', ')}.` : '' }))) return;
      for (const t of S.cfg.templates) { t.warmup = (t.warmup || []).filter((x) => x !== m.id); t.cooldown = (t.cooldown || []).filter((x) => x !== m.id); }
      delete S.cfg.mobility[m.id];
      await saveCfg();
      closeSheet();
      render();
    });
  },

  'd-tpl-add'() {
    readTpl();
    const first = Object.keys(S.cfg.exercises)[0];
    tplDraft.items.push({ exerciseId: first, sets: 3, repMin: 8, repMax: 12 });
    render();
  },
  async 'd-tpl-save'() {
    readTpl();
    const bad = tplDraft.items.find((it) => !(it.sets >= 1 && it.sets <= 10) || !(it.repMin >= 1) || !(it.repMax >= it.repMin));
    if (bad) return toast('Verificar séries (1–10) e gamas (mín. ≤ máx.)');
    const other = tplDraft.weekday && S.cfg.templates.find((t) => t.id !== tplDraft.id && t.weekday === tplDraft.weekday);
    if (other) {
      if (!(await confirmDialog(`${other.name} já está a ${WEEKDAYS[tplDraft.weekday][1].toLowerCase()}.`, { ok: 'Trocar', detail: `${other.name} fica sem dia fixo.` }))) return;
      other.weekday = 0;
    }
    const idx = S.cfg.templates.findIndex((t) => t.id === tplDraft.id);
    S.cfg.templates[idx] = tplDraft;
    tplDraft = null;
    await saveCfg();
    toast('Treino guardado');
    go('#definicoes/treino');
  },
  async 'd-tpl-del'() {
    if (!(await confirmDialog(`Apagar o treino ${tplDraft.name}?`, { ok: 'Apagar', danger: true, detail: 'Os treinos já feitos ficam no histórico.' }))) return;
    S.cfg.templates = S.cfg.templates.filter((t) => t.id !== tplDraft.id);
    tplDraft = null;
    await saveCfg();
    go('#definicoes/treino');
  },
  'd-ex'(d) {
    const ex = d.id ? S.cfg.exercises[d.id] : null;
    const e = ex || { name: '', kind: 'isolation', mode: 'load', inc: 2.5, perSide: false };
    const body = openSheet(`<div class="sheet-title">${ex ? 'Editar exercício' : 'Novo exercício'}</div>
      ${field('Nome', textInput('name', e.name, ex ? '' : 'autofocus'))}
      <div class="grid2">${field('Tipo', selectInput('kind', KIND, e.kind), 'Define o descanso')}${field('Incremento', numInput('inc', e.inc), 'kg (ou s no modo tempo)')}</div>
      ${field('Registo', selectInput('mode', MODE, e.mode))}
      ${toggle('perSide', e.perSide, 'Reps contadas por perna/braço')}
      <div class="field-l mt-s">Músculos trabalhados (escolhe o aquecimento e os alongamentos)</div>${muscleChips(Object.keys(e.muscles || {}).filter((k) => e.muscles[k] >= 1))}
      ${ex ? `<div class="lbl mt">Foto</div><div class="row-g">${exThumb(ex)}
        <label class="btn btn-sm">${icon('camera')} Trocar foto<input type="file" accept="image/*" data-x="photo" hidden></label>
        ${S.photos[ex.id] ? '<button class="btn btn-sm" data-x="reset">Repor original</button>' : ''}</div>` : ''}
      <div class="${ex ? 'grid2' : ''} mt">${ex ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button>` : ''}<button class="btn btn-gold ${ex ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`);
    const getExMus = wireMuscles(body, Object.keys(e.muscles || {}).filter((k) => e.muscles[k] >= 1));
    body.querySelector('[data-x=ok]').onclick = async () => {
      const name = val(body, 'name').trim();
      const inc = num(val(body, 'inc'));
      if (!name) return toast('Indicar o nome');
      if (!(inc > 0 && inc <= 50)) return toast('Incremento entre 0,5 e 50');
      const id = ex?.id || 'x_' + uid();
      S.cfg.exercises[id] = { ...(ex || { img: '' }), id, name, kind: val(body, 'kind'), mode: val(body, 'mode'), inc, perSide: body.querySelector('[name=perSide]').checked, muscles: musclesFrom(ex?.muscles || {}, getExMus()) };
      await saveCfg();
      closeSheet();
      toast('Exercício guardado');
      render();
    };
    body.querySelector('[data-x=photo]')?.addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      try { await setPhoto(ex.id, await resizeImage(f)); closeSheet(); toast('Foto atualizada'); render(); }
      catch { toast('Não foi possível ler a imagem'); }
    });
    body.querySelector('[data-x=reset]')?.addEventListener('click', async () => { await setPhoto(ex.id, null); closeSheet(); render(); });
    body.querySelector('[data-x=del]')?.addEventListener('click', async () => {
      const inTpl = S.cfg.templates.filter((t) => t.items.some((i) => i.exerciseId === ex.id));
      if (!(await confirmDialog(`Apagar ${ex.name}?`, { ok: 'Apagar', danger: true, detail: inTpl.length ? `Sai também de: ${inTpl.map((t) => t.name).join(', ')}. O histórico mantém-se.` : 'O histórico mantém-se.' }))) return;
      for (const t of S.cfg.templates) t.items = t.items.filter((i) => i.exerciseId !== ex.id);
      delete S.cfg.exercises[ex.id];
      await saveCfg();
      await setPhoto(ex.id, null);
      closeSheet();
      render();
    });
  },
  'd-food'(d) { foodEditor(d.id ? S.cfg.foods[d.id] : null); },
  'd-meal'(d) {
    const m = S.cfg.meals.find((x) => x.id === d.id);
    if (!m) return;
    const draft = JSON.parse(JSON.stringify(m));
    const foodOpts = Object.values(S.cfg.foods).sort((a, b) => a.name.localeCompare(b.name)).map((f) => [f.id, f.name]);
    const body = openSheet('', { cls: 'sheet-tall' });
    const readIn = () => {
      draft.name = val(body, 'name').trim() || draft.name;
      draft.slot = val(body, 'slot');
      draft.items.forEach((it, i) => { const q = num(val(body, `q_${i}`)); if (q > 0) it.qty = q; });
    };
    const paint = () => {
      body.innerHTML = `<div class="sheet-title">Editar refeição</div>
        <div class="grid2">${field('Nome', textInput('name', draft.name))}${field('Momento', selectInput('slot', SLOTS, draft.slot))}</div>
        ${draft.items.map((it, i) => { const f = S.cfg.foods[it.foodId]; return f ? `<div class="row-g meal-ed"><span class="list-main">${esc(f.name)}${it.alts?.length ? `<span class="mut small block">ou ${it.alts.map((a) => esc(S.cfg.foods[a.foodId]?.name || '')).join(', ')}</span>` : ''}</span>
          <input class="input input-sm tnum" name="q_${i}" inputmode="decimal" value="${String(it.qty).replace('.', ',')}"><span class="mut small">${f.basis}</span>
          <button class="icon-btn sm danger" data-rm="${i}" aria-label="Retirar">${icon('x')}</button></div>` : ''; }).join('')}
        <div class="row-g mt-s">${selectInput('newFood', foodOpts, '')}<button class="btn btn-sm" data-x="add">${icon('plus')}</button></div>
        <button class="btn btn-gold btn-block mt" data-x="ok">Guardar refeição</button>`;
      body.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { readIn(); draft.items.splice(+b.dataset.rm, 1); paint(); }));
      body.querySelector('[data-x=add]').onclick = () => {
        readIn();
        const fid = val(body, 'newFood');
        const f = S.cfg.foods[fid];
        draft.items.push({ foodId: fid, qty: f.basis === 'un' ? 1 : 100, alts: [] });
        paint();
      };
      body.querySelector('[data-x=ok]').onclick = async () => {
        readIn();
        const idx = S.cfg.meals.findIndex((x) => x.id === m.id);
        S.cfg.meals[idx] = draft;
        await saveCfg();
        closeSheet();
        toast('Refeição guardada');
        render();
      };
    };
    paint();
  },
  'd-supp'(d) {
    const s = d.id ? S.cfg.supplements.find((x) => x.id === d.id) : null;
    const e = s || { name: '', dose: '', moment: 'pa' };
    const body = openSheet(`<div class="sheet-title">${s ? 'Editar suplemento' : 'Novo suplemento'}</div>
      ${field('Nome', textInput('name', e.name, s ? '' : 'autofocus placeholder="Magnésio"'))}
      <div class="grid2">${field('Dose', textInput('dose', e.dose, 'placeholder="1 cápsula"'))}${field('Momento', selectInput('moment', SUPP_MOMENTS, e.moment))}</div>
      <div class="${s ? 'grid2' : ''} mt">${s ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Retirar</button>` : ''}<button class="btn btn-gold ${s ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`);
    body.querySelector('[data-x=ok]').onclick = async () => {
      const name = val(body, 'name').trim();
      if (!name) return toast('Indicar o nome');
      const n = { id: s?.id || 's_' + uid(), name, dose: val(body, 'dose').trim(), moment: val(body, 'moment') };
      if (s) Object.assign(s, n); else S.cfg.supplements.push(n);
      await saveCfg();
      closeSheet();
      render();
    };
    body.querySelector('[data-x=del]')?.addEventListener('click', async () => {
      S.cfg.supplements = S.cfg.supplements.filter((x) => x.id !== s.id);
      await saveCfg();
      closeSheet();
      render();
    });
  },
  async 'd-export'(d) {
    S.cfg.lastExportAt = Date.now();
    await saveCfg();
    const entries = await allEntries();
    const json = JSON.stringify({ app: 'MODE 2030', format: 1, exportedAt: new Date().toISOString(), entries });
    const name = `mode2030-backup-${dateKey()}.json`;
    if (d.share) {
      try {
        await navigator.share({ files: [new File([json], name, { type: 'application/json' })], title: 'Backup MODE 2030' });
        toast('Backup exportado', { gold: true });
      } catch (e) {
        if (e?.name !== 'AbortError') { download(name, json); toast('Backup descarregado'); }
      }
    } else {
      download(name, json);
      toast('Backup descarregado', { gold: true });
    }
    render();
  },
  async 'd-import'(d, el) {
    const file = el.files[0];
    el.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { return toast('Ficheiro inválido'); }
    if (data?.app !== 'MODE 2030' || !Array.isArray(data.entries) || !data.entries.some(([k]) => k === 'config')) return toast('Este ficheiro não é um backup do MODE 2030');
    const n = data.entries.filter(([k]) => k.startsWith('session:')).length;
    if (!(await confirmDialog('Substituir todos os dados?', { ok: 'Importar', danger: true, detail: `Backup de ${String(data.exportedAt).slice(0, 10)} com ${n} treinos. Os dados atuais deste telemóvel são apagados.` }))) return;
    await replaceAll(data.entries);
    await reload();
    toast('Backup importado', { gold: true });
    go('#hoje');
  },
  async 'd-wipe'() {
    const r = document.querySelector('[name=confirm]');
    if ((r?.value || '').trim().toUpperCase() !== 'APAGAR') return toast('Escrever APAGAR para confirmar');
    if (!(await confirmDialog('Apagar mesmo tudo?', { ok: 'Apagar tudo', danger: true, detail: 'Não é possível desfazer.' }))) return;
    await replaceAll([['config', seedConfig()]]);
    await reload();
    toast('Dados apagados');
    go('#hoje');
  },
};
