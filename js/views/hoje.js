// Ecrã "Hoje": treino do dia, macros, água, suplementos e lembrete de backup.
import { S } from '../store.js';
import { phase, templateFor, sessionStats, routineMinutes, routinesFor, resolveMoves, missedThisWeek, flexRoutine } from '../logic.js';
import { dateKey, longDate, esc, mmss, daysBetween } from '../util.js';
import { icon, exThumb } from '../ui.js';
import { nutritionCard, waterCard, suppCard } from '../widgets.js';
import { startSession, startFlex } from './sessao.js';

function backupBanner() {
  const last = S.cfg.lastExportAt;
  const since = last ? (Date.now() - last) / 86400000 : (Date.now() - S.cfg.createdAt) / 86400000;
  if (since < 7) return '';
  return `<a class="banner" href="#definicoes/backup">${icon('download')}<span>${last ? `Último backup há ${Math.floor(since)} dias.` : 'Ainda não há nenhum backup.'} Exportar agora</span>${icon('right')}</a>`;
}

function activeBanner() {
  const A = S.active;
  if (!A) return '';
  return `<a class="banner banner-live" href="#sessao"><span class="live-dot"></span><span><b>${esc(A.name)}</b> em curso · <span class="tnum" id="s-clock">${mmss((Date.now() - A.startedAt) / 1000)}</span></span><span class="gold">Voltar ${icon('right')}</span></a>`;
}

/** Sessão de flexibilidade (dias de descanso): botão ou "feita hoje". */
function flexBlock(date, primary) {
  const done = S.sessions.find((s) => s.date === date && s.endedAt && s.kind === 'flex');
  if (done) return `<p class="gold small mt-s">${icon('check', 'ic-xs')} Flexibilidade feita hoje</p>`;
  const R = flexRoutine(S.cfg, S.sessions, date);
  const min = routineMinutes(resolveMoves(S.cfg, [...R.warmup, ...R.cooldown]));
  if (S.active) return '';
  return `<button class="btn ${primary ? 'btn-gold btn-xl' : ''} btn-block mt-s" data-act="flex">${icon('stretch')} Flexibilidade · ~${min} min</button>`;
}

/** Treinos desta semana que ficaram por fazer (modo por dia da semana). */
function missedBlock(date, excludeId) {
  const miss = missedThisWeek(S.cfg, S.sessions, date).filter((t) => t.id !== excludeId);
  if (!miss.length || S.active) return '';
  return `<div class="missed mt-s"><span class="mut small">Ficou por fazer esta semana:</span>
    <div class="chips">${miss.map((t) => `<button class="chip" data-act="start" data-id="${t.id}">${icon('play', 'ic-xs')} ${esc(t.name)}</button>`).join('')}</div></div>`;
}

function workoutCard(date) {
  const ph = phase(S.cfg, date);
  const tpl = templateFor(S.cfg, date, S.sessions);
  const doneToday = S.sessions.filter((s) => s.date === date && s.endedAt && s.kind !== 'flex');
  if (!tpl) {
    return `<section class="card card-hero"><div class="lbl">Treino de hoje</div><div class="hero-title">Descanso</div>
      <p class="mut">Dia de recuperação. Água: meta de ${(S.cfg.water.rest / 1000).toString().replace('.', ',')} L. Uma sessão curta de alongamentos ajuda a chegar aos ~10 min por semana por músculo que dão flexibilidade.</p>
      ${doneToday.length ? `<p class="gold small">${icon('check', 'ic-xs')} Treino extra registado hoje</p>` : ''}
      ${flexBlock(date, true)}
      ${missedBlock(date)}
      <a class="btn btn-ghost btn-block mt-s" href="#treino">Escolher outro treino</a></section>`;
  }
  const done = doneToday.find((s) => s.templateId === tpl.id);
  const n = tpl.items.length;
  const R = routinesFor(S.cfg, tpl, date, S.sessions);
  const wMin = R.warmup.length ? routineMinutes(resolveMoves(S.cfg, R.warmup)) : 0;
  const cMin = R.cooldown.length ? routineMinutes(resolveMoves(S.cfg, R.cooldown)) : 0;
  const thumbs = tpl.items.slice(0, 6).map((i) => S.cfg.exercises[i.exerciseId]).filter(Boolean).map(exThumb).join('');
  if (done) {
    const st = sessionStats(done);
    return `<section class="card card-hero"><div class="lbl">Treino de hoje</div><div class="hero-title">${esc(tpl.name)} ${icon('checkCircle', 'ic-gold')}</div>
      <p class="mut">Concluído em ${mmss(st.duration)} · ${st.sets} séries</p>
      <a class="btn btn-block mt-s" href="#treino/s/${done.id}">Ver resumo</a>
      ${missedBlock(date, tpl.id)}</section>`;
  }
  return `<section class="card card-hero">
    <div class="row-sb"><span class="lbl">${S.cfg.schedule === 'sequence' ? 'Próximo treino' : 'Treino de hoje'}</span><span class="tag ${ph.readapt ? 'tag-gold' : ''}">${ph.week ? `Semana ${ph.week}` : 'Antes do início'}${ph.readapt ? ' · readaptação' : ''}</span></div>
    <div class="hero-title">${esc(tpl.name)}</div>
    <div class="mut">${n} exercícios · ~${60 + wMin + cMin} min · ${ph.rir} reps em reserva${ph.readapt ? ` · ${S.cfg.readapt.sets} séries` : ''}</div>
    ${wMin || cMin ? `<div class="mut small">${[wMin ? `aquecimento ~${wMin} min` : '', cMin ? `alongamentos ~${cMin} min` : ''].filter(Boolean).join(' · ')} incluídos</div>` : ''}
    <div class="thumbs">${thumbs}</div>
    ${S.active ? `<a class="btn btn-gold btn-xl btn-block" href="#sessao">${icon('play')} Continuar treino</a>`
               : `<button class="btn btn-gold btn-xl btn-block" data-act="start" data-id="${tpl.id}">${icon('play')} Começar treino</button>`}
    ${S.cfg.schedule === 'sequence' ? `<p class="mut small mt-s">Em sequência: se hoje for dia de descanso, este treino fica para o próximo dia.</p>${flexBlock(date, false)}` : missedBlock(date, tpl.id)}
  </section>`;
}

export function render() {
  const date = dateKey();
  const days = daysBetween(S.cfg.startDate, date);
  return `<header class="top">
      <div class="brand">MODE 2030</div>
      <div class="mut small">${longDate(date)}</div>
    </header>
    ${activeBanner()}
    ${backupBanner()}
    ${days < 0 ? `<div class="banner banner-info">${icon('info')}<span>O plano começa a ${longDate(S.cfg.startDate)}.</span></div>` : ''}
    ${workoutCard(date)}
    ${nutritionCard(date, { title: 'Hoje', link: true })}
    ${waterCard(date)}
    ${suppCard(date)}`;
}

export const actions = {
  start(d) { startSession(d.id); },
  flex() { startFlex(); },
};
