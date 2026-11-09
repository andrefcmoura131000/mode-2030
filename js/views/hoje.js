// Ecrã "Hoje": treino do dia, macros, água, suplementos e lembrete de backup.
import { S } from '../store.js';
import { phase, templateFor, sessionStats } from '../logic.js';
import { dateKey, longDate, esc, mmss, daysBetween } from '../util.js';
import { icon, exThumb } from '../ui.js';
import { nutritionCard, waterCard, suppCard } from '../widgets.js';
import { startSession } from './sessao.js';

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

function workoutCard(date) {
  const ph = phase(S.cfg, date);
  const tpl = templateFor(S.cfg, date);
  const doneToday = S.sessions.filter((s) => s.date === date && s.endedAt);
  if (!tpl) {
    return `<section class="card card-hero"><div class="lbl">Treino de hoje</div><div class="hero-title">Descanso</div>
      <p class="mut">Dia de recuperação. Água: meta de ${(S.cfg.water.rest / 1000).toString().replace('.', ',')} L.</p>
      ${doneToday.length ? `<p class="gold small">${icon('check', 'ic-xs')} Treino extra registado hoje</p>` : ''}
      <a class="btn btn-block mt-s" href="#treino">Escolher outro treino</a></section>`;
  }
  const done = doneToday.find((s) => s.templateId === tpl.id);
  const n = tpl.items.length;
  const thumbs = tpl.items.slice(0, 6).map((i) => S.cfg.exercises[i.exerciseId]).filter(Boolean).map(exThumb).join('');
  if (done) {
    const st = sessionStats(done);
    return `<section class="card card-hero"><div class="lbl">Treino de hoje</div><div class="hero-title">${esc(tpl.name)} ${icon('checkCircle', 'ic-gold')}</div>
      <p class="mut">Concluído em ${mmss(st.duration)} · ${st.sets} séries</p>
      <a class="btn btn-block mt-s" href="#treino/s/${done.id}">Ver resumo</a></section>`;
  }
  return `<section class="card card-hero">
    <div class="row-sb"><span class="lbl">Treino de hoje</span><span class="tag ${ph.readapt ? 'tag-gold' : ''}">${ph.week ? `Semana ${ph.week}` : 'Antes do início'}${ph.readapt ? ' · readaptação' : ''}</span></div>
    <div class="hero-title">${esc(tpl.name)}</div>
    <div class="mut">${n} exercícios · ~60 min · ${ph.rir} reps em reserva${ph.readapt ? ` · ${S.cfg.readapt.sets} séries` : ''}</div>
    <div class="thumbs">${thumbs}</div>
    ${S.active ? `<a class="btn btn-gold btn-xl btn-block" href="#sessao">${icon('play')} Continuar treino</a>`
               : `<button class="btn btn-gold btn-xl btn-block" data-act="start" data-id="${tpl.id}">${icon('play')} Começar treino</button>`}
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
};
