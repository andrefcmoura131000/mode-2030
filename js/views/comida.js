// Separador Alimentação: totais do dia, refeições do plano, alimentos, favoritas, água e histórico.
import { S, day, saveDay, saveCfg } from '../store.js';
import { macrosFor, sumMacros } from '../logic.js';
import { SLOTS } from '../seed.js';
import { dateKey, addDays, longDate, esc, fmt, num, uid, round } from '../util.js';
import { icon, openSheet, closeSheet, updateSheet, topSheet, toast, vibrate, field, numInput, textInput, selectInput, confirmDialog, render } from '../ui.js';
import { nutritionCard, waterCard } from '../widgets.js';

let viewDate = null; // null = hoje
const curDate = () => viewDate || dateKey();
const SLOT_L = Object.fromEntries(SLOTS);

export function defaultSlot() {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'pa';
  if (h < 15) return 'almoco';
  if (h < 18.5) return 'lanche';
  if (h < 22.5) return 'jantar';
  return 'outros';
}
const unitOf = (f) => (f.basis === 'un' ? 'un' : f.basis);
const qtyStr = (f, q) => (f?.basis === 'un' ? `${fmt(q, 2)} un` : `${fmt(q)} ${f ? f.basis : 'g'}`);
const macroLine = (m) => `<span class="tnum">${fmt(m.kcal)} kcal</span> · P ${fmt(m.p)} · H ${fmt(m.c)} · G ${fmt(m.f)}`;

/* ---------- Ecrã ---------- */
export function render_() {
  const date = curDate();
  const isToday = date === dateKey();
  const d = S.days[date];
  const entries = d?.food || [];
  const slots = SLOTS.map(([k, label]) => {
    const list = entries.filter((e) => e.slot === k);
    if (!list.length && k === 'outros') return '';
    const tot = sumMacros(list.map((e) => e.m));
    return `<section class="card slot">
      <div class="row-sb"><span class="slot-t">${label}</span>
        <span class="row-g">${list.length ? `<span class="mut small tnum">${fmt(tot.kcal)} kcal · P ${fmt(tot.p)}</span>` : ''}
        ${list.length ? `<button class="icon-btn sm" data-act="f-slot-menu" data-slot="${k}" aria-label="Opções">${icon('dots')}</button>` : ''}
        <button class="icon-btn sm gold-b" data-act="f-add" data-slot="${k}" aria-label="Adicionar a ${label}">${icon('plus')}</button></span></div>
      ${list.map((e) => {
        const f = S.cfg.foods[e.foodId];
        return `<button class="food-row" data-act="f-edit" data-id="${e.id}">
          <span class="food-n">${esc(e.name)}<span class="mut small block">${qtyStr(f, e.qty)}</span></span>
          <span class="food-m tnum">${fmt(e.m.kcal)}<span class="mut small"> kcal</span><span class="mut small block">P ${fmt(e.m.p)} g</span></span></button>`;
      }).join('')}
    </section>`;
  }).join('');

  return `<header class="top"><h1 class="title">Alimentação</h1>
      <div class="date-nav">
        <button class="icon-btn" data-act="f-day" data-d="-1" aria-label="Dia anterior">${icon('left')}</button>
        <button class="date-lbl" data-act="f-today">${isToday ? 'Hoje' : longDate(date)}</button>
        <button class="icon-btn" data-act="f-day" data-d="1" aria-label="Dia seguinte" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
      </div></header>
    ${nutritionCard(date, { title: isToday ? 'Totais de hoje' : 'Totais do dia' })}
    <div class="grid3 quick">
      <button class="btn btn-gold quick-b" data-act="f-plan">${icon('list')}<span>Refeição do plano</span></button>
      <button class="btn quick-b" data-act="f-add">${icon('search')}<span>Alimento</span></button>
      <button class="btn quick-b" data-act="f-favs">${icon('heart')}<span>Favoritas</span></button>
    </div>
    ${slots}
    ${waterCard(date)}
    <p class="mut small center">Valores nutricionais aproximados: confirmar com o rótulo. <a class="link" href="#definicoes/alimentos">Base de alimentos</a></p>`;
}
export { render_ as render };

/* ---------- Adicionar alimento ---------- */
function pickerHTML(slot, q = '') {
  const foods = Object.values(S.cfg.foods).sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="sheet-title">Adicionar alimento</div>
    <div class="search">${icon('search')}<input class="input" id="f-q" placeholder="Procurar" value="${esc(q)}" autocomplete="off"></div>
    <div class="list food-pick" id="f-list">${foods.map((f) => `<button class="list-row" data-food="${f.id}" data-name="${esc(f.name.toLowerCase())}">
      <span class="list-main">${esc(f.name)}<span class="mut small block">${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} / ${f.basis === 'un' ? 'unidade' : '100 ' + f.basis}</span></span>${icon('right', 'ic-mut')}</button>`).join('')}</div>
    <button class="btn btn-block mt-s" data-x="new">${icon('plus')} Criar alimento</button>`;
}

function openPicker(slot) {
  const body = openSheet(pickerHTML(slot), { cls: 'sheet-tall' });
  wirePicker(body, slot);
}
function wirePicker(body, slot) {
  const q = body.querySelector('#f-q');
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    body.querySelectorAll('[data-food]').forEach((b) => { b.style.display = b.dataset.name.includes(v) ? '' : 'none'; });
  });
  body.querySelectorAll('[data-food]').forEach((b) => (b.onclick = () => qtyForm(S.cfg.foods[b.dataset.food], { slot })));
  body.querySelector('[data-x=new]').onclick = () => foodEditor(null, (f) => { closeSheet(); qtyForm(f, { slot }); });
}

/** Formulário de quantidade: para adicionar (sem entry) ou editar (com entry). */
function qtyForm(food, { slot, entry } = {}) {
  const date = curDate();
  const startQty = entry ? entry.qty : food.basis === 'un' ? 1 : 100;
  const chips = food.portions?.length
    ? food.portions.map((p) => [p.qty, p.label])
    : food.basis === 'un' ? [[1, '1'], [2, '2'], [3, '3'], [0.5, '½']] : [[50, '50'], [100, '100'], [150, '150'], [200, '200']];
  const html = `<div class="sheet-title">${esc(food.name)}</div>
    <div class="grid2">${field(`Quantidade (${unitOf(food)})`, numInput('qty', startQty, 'autofocus'))}
      ${field('Refeição', selectInput('slot', SLOTS, entry ? entry.slot : slot || defaultSlot()))}</div>
    <div class="chips mt-s">${chips.map(([v, l]) => `<button class="chip" data-v="${v}">${esc(l)}${food.portions ? ` · ${v} g` : ''}</button>`).join('')}</div>
    <div class="preview mt" id="f-prev"></div>
    ${entry ? `<div class="grid2 mt"><button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button><button class="btn btn-gold" data-x="ok">Guardar</button></div>`
            : `<button class="btn btn-gold btn-xl btn-block mt" data-x="ok">Adicionar</button>`}`;
  const body = entry ? openSheet(html) : updateSheet(html) || openSheet(html);
  const inp = body.querySelector('[name=qty]');
  const prev = body.querySelector('#f-prev');
  const upd = () => { const q = num(inp.value); prev.innerHTML = q > 0 ? macroLine(macrosFor(food, q)) : '<span class="mut">Indicar a quantidade</span>'; };
  inp.addEventListener('input', upd);
  body.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { inp.value = String(b.dataset.v).replace('.', ','); upd(); }));
  upd();
  body.querySelector('[data-x=ok]').onclick = () => {
    const q = num(inp.value);
    if (!(q > 0)) { toast('Indicar uma quantidade válida'); return; }
    const sl = body.querySelector('[name=slot]').value;
    const dd = day(date);
    if (entry) {
      Object.assign(entry, { qty: q, slot: sl, m: macrosFor(food, q), name: food.name });
    } else {
      dd.food.push({ id: uid(), slot: sl, foodId: food.id, name: food.name, qty: q, m: macrosFor(food, q), t: Date.now() });
      vibrate(15);
      toast(`${food.name} adicionado`);
    }
    saveDay(date);
    closeSheet();
    render();
  };
  body.querySelector('[data-x=del]')?.addEventListener('click', () => removeEntry(date, entry.id));
}

function removeEntry(date, id) {
  const dd = day(date);
  const idx = dd.food.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const [e] = dd.food.splice(idx, 1);
  saveDay(date);
  closeSheet();
  render();
  toast(`${e.name} apagado`, { action: { label: 'Desfazer', fn: () => { dd.food.splice(idx, 0, e); saveDay(date); render(); } } });
}

/* ---------- Refeições (plano e favoritas) ---------- */
function mealEditor(meal) {
  const date = curDate();
  const items = meal.items.filter((i) => S.cfg.foods[i.foodId]).map((i) => ({
    opts: [{ foodId: i.foodId, qty: i.qty }, ...(i.alts || []).filter((a) => S.cfg.foods[a.foodId]).map((a) => ({ ...a }))],
    sel: 0, on: true,
  }));
  let slot = meal.slot || defaultSlot();
  const totals = () => sumMacros(items.filter((i) => i.on).map((i) => { const o = i.opts[i.sel]; return macrosFor(S.cfg.foods[o.foodId], o.qty || 0); }));
  const readInputs = (body) => {
    body.querySelectorAll('[data-qi]').forEach((inp) => { const it = items[+inp.dataset.qi]; const q = num(inp.value); it.opts[it.sel].qty = q > 0 ? q : 0; });
    slot = body.querySelector('[name=slot]').value;
  };
  const html = () => `<div class="sheet-title">${esc(meal.name)}</div>
    <p class="mut small">Ajustar antes de adicionar. Quantidades em cru.</p>
    <div class="meal-items">${items.map((it, i) => {
      const o = it.opts[it.sel];
      const f = S.cfg.foods[o.foodId];
      return `<div class="meal-item ${it.on ? '' : 'off'}">
        <div class="row-sb"><span class="meal-n">${esc(f.name)}</span>
          <button class="icon-btn sm" data-tog="${i}" aria-label="${it.on ? 'Retirar' : 'Repor'}">${icon(it.on ? 'x' : 'plus')}</button></div>
        ${it.opts.length > 1 ? `<div class="chips">${it.opts.map((op, j) => `<button class="chip ${j === it.sel ? 'on' : ''}" data-sw="${i}:${j}">${esc(S.cfg.foods[op.foodId].name.split(' (')[0])}</button>`).join('')}</div>` : ''}
        ${it.on ? `<div class="meal-q"><input class="input input-sm tnum" data-qi="${i}" inputmode="decimal" value="${String(o.qty).replace('.', ',')}"><span class="mut small">${unitOf(f)}</span>
          <span class="mut small tnum meal-k" data-k="${i}">${fmt(macrosFor(f, o.qty || 0).kcal)} kcal</span></div>` : ''}
      </div>`;
    }).join('')}</div>
    ${field('Refeição', selectInput('slot', SLOTS, slot))}
    <div class="preview mt" id="m-prev">${macroLine(totals())}</div>
    <button class="btn btn-gold btn-xl btn-block mt" data-x="ok">Adicionar refeição</button>`;
  const body = openSheet(html(), { cls: 'sheet-tall' });
  const wire = () => {
    body.querySelectorAll('[data-qi]').forEach((inp) => inp.addEventListener('input', () => {
      readInputs(body);
      const it = items[+inp.dataset.qi]; const o = it.opts[it.sel];
      body.querySelector(`[data-k="${inp.dataset.qi}"]`).textContent = `${fmt(macrosFor(S.cfg.foods[o.foodId], o.qty).kcal)} kcal`;
      body.querySelector('#m-prev').innerHTML = macroLine(totals());
    }));
    body.querySelectorAll('[data-tog]').forEach((b) => (b.onclick = () => { readInputs(body); const it = items[+b.dataset.tog]; it.on = !it.on; body.innerHTML = html(); wire(); }));
    body.querySelectorAll('[data-sw]').forEach((b) => (b.onclick = () => { readInputs(body); const [i, j] = b.dataset.sw.split(':').map(Number); items[i].sel = j; body.innerHTML = html(); wire(); }));
    body.querySelector('[data-x=ok]').onclick = () => {
      readInputs(body);
      const chosen = items.filter((i) => i.on && i.opts[i.sel].qty > 0);
      if (!chosen.length) { toast('Não há alimentos para adicionar'); return; }
      const dd = day(date);
      const now = Date.now();
      for (const it of chosen) {
        const o = it.opts[it.sel]; const f = S.cfg.foods[o.foodId];
        dd.food.push({ id: uid(), slot, foodId: f.id, name: f.name, qty: o.qty, m: macrosFor(f, o.qty), t: now });
      }
      saveDay(date);
      closeAllButBase();
      vibrate([20, 40, 20]);
      toast(`${meal.name} adicionado`, { gold: true });
      render();
    };
  };
  wire();
}
function closeAllButBase() { while (topSheet()) closeSheet(); }

function mealListHTML(kind) {
  const meals = S.cfg.meals.filter((m) => m.kind === kind);
  if (!meals.length) return `<p class="mut">${kind === 'fav' ? 'Ainda não há favoritas. Numa refeição registada, usar ⋯ → "Guardar como favorita".' : 'Sem refeições no plano.'}</p>`;
  return `<div class="list">${meals.map((m) => {
    const t = sumMacros(m.items.filter((i) => S.cfg.foods[i.foodId]).map((i) => macrosFor(S.cfg.foods[i.foodId], i.qty)));
    return `<div class="list-row"><button class="list-main btn-plain" data-meal="${m.id}">${esc(m.name)}<span class="mut small block tnum">${fmt(t.kcal)} kcal · P ${fmt(t.p)} · ${m.items.length} alimentos</span></button>
      ${kind === 'fav' ? `<button class="icon-btn sm" data-delfav="${m.id}" aria-label="Apagar favorita">${icon('trash')}</button>` : icon('right', 'ic-mut')}</div>`;
  }).join('')}</div>`;
}

/* ---------- Editor de alimentos (partilhado com Definições) ---------- */
export function foodEditor(food, onSave) {
  const f = food || { id: '', name: '', basis: 'g', kcal: '', p: '', c: '', f: '' };
  const body = openSheet(`<div class="sheet-title">${food ? 'Editar alimento' : 'Novo alimento'}</div>
    ${field('Nome', textInput('name', f.name, 'autofocus placeholder="Iogurte grego"'))}
    ${field('Valores por', selectInput('basis', [['g', '100 g'], ['ml', '100 ml'], ['un', '1 unidade']], f.basis))}
    <div class="grid2">${field('kcal', numInput('kcal', f.kcal))}${field('Proteína (g)', numInput('p', f.p))}
      ${field('Hidratos (g)', numInput('c', f.c))}${field('Gordura (g)', numInput('f', f.f))}</div>
    <p class="mut small">Valores aproximados: confirmar com o rótulo da embalagem.</p>
    <div class="${food ? 'grid2' : ''} mt">${food ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button>` : ''}<button class="btn btn-gold ${food ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`);
  body.querySelector('[data-x=ok]').onclick = async () => {
    const v = (n) => num(body.querySelector(`[name=${n}]`).value);
    const name = body.querySelector('[name=name]').value.trim();
    const vals = { kcal: v('kcal'), p: v('p'), c: v('c'), f: v('f') };
    if (!name) { toast('Indicar o nome'); return; }
    if (Object.values(vals).some((x) => Number.isNaN(x) || x < 0)) { toast('Preencher kcal e macros (0 se não tiver)'); return; }
    const id = food?.id || 'c_' + uid();
    const nf = { ...(food || {}), id, name, basis: body.querySelector('[name=basis]').value, ...vals, custom: food ? !!food.custom : true };
    S.cfg.foods[id] = nf;
    await saveCfg();
    closeSheet();
    toast('Alimento guardado');
    onSave?.(nf);
    render();
  };
  body.querySelector('[data-x=del]')?.addEventListener('click', async () => {
    const usedInMeals = S.cfg.meals.some((m) => m.items.some((i) => i.foodId === food.id || i.alts?.some((a) => a.foodId === food.id)));
    if (!(await confirmDialog(`Apagar "${food.name}"?`, { ok: 'Apagar', danger: true, detail: usedInMeals ? 'Este alimento sai também das refeições onde aparece. Os registos antigos mantêm-se.' : 'Os registos antigos mantêm-se.' }))) return;
    delete S.cfg.foods[food.id];
    for (const m of S.cfg.meals) {
      m.items = m.items.filter((i) => i.foodId !== food.id);
      for (const i of m.items) if (i.alts) i.alts = i.alts.filter((a) => a.foodId !== food.id);
    }
    await saveCfg();
    closeSheet();
    render();
  });
}

/* ---------- Ações ---------- */
export const actions = {
  'f-day'(d) {
    const nd = addDays(curDate(), +d.d);
    viewDate = nd >= dateKey() ? null : nd;
    render();
  },
  'f-today'() { viewDate = null; render(); },
  'f-add'(d) { openPicker(d.slot); },
  'f-edit'(d) {
    const date = curDate();
    const e = S.days[date]?.food.find((x) => x.id === d.id);
    if (!e) return;
    const food = S.cfg.foods[e.foodId];
    if (food) { qtyForm(food, { entry: e }); return; }
    // alimento já apagado da base: só permite apagar o registo
    openSheet(`<div class="sheet-title">${esc(e.name)}</div><p class="mut">Este alimento já não está na base. ${macroLine(e.m)}</p>
      <button class="btn btn-danger btn-block mt" data-x="del">${icon('trash')} Apagar registo</button>`).querySelector('[data-x=del]').onclick = () => removeEntry(date, e.id);
  },
  'f-plan'() {
    const body = openSheet(`<div class="sheet-title">Refeição do plano</div>${mealListHTML('plan')}`);
    body.querySelectorAll('[data-meal]').forEach((b) => (b.onclick = () => mealEditor(S.cfg.meals.find((m) => m.id === b.dataset.meal))));
  },
  'f-favs'() {
    const show = () => {
      const body = topSheet();
      body.innerHTML = `<div class="sheet-title">Favoritas</div>${mealListHTML('fav')}`;
      body.querySelectorAll('[data-meal]').forEach((b) => (b.onclick = () => mealEditor(S.cfg.meals.find((m) => m.id === b.dataset.meal))));
      body.querySelectorAll('[data-delfav]').forEach((b) => (b.onclick = async () => {
        S.cfg.meals = S.cfg.meals.filter((m) => m.id !== b.dataset.delfav);
        await saveCfg();
        show();
      }));
    };
    openSheet('');
    show();
  },
  'f-slot-menu'(d) {
    const date = curDate();
    const list = (S.days[date]?.food || []).filter((e) => e.slot === d.slot);
    const body = openSheet(`<div class="sheet-title">${SLOT_L[d.slot]}</div>
      <div class="list"><button class="list-row" data-x="fav">${icon('heart')}<span class="list-main">Guardar como favorita</span></button>
      <button class="list-row danger" data-x="clear">${icon('trash')}<span class="list-main">Apagar os ${list.length} registos</span></button></div>`);
    body.querySelector('[data-x=fav]').onclick = () => {
      const b2 = updateSheet(`<div class="sheet-title">Nova favorita</div>${field('Nome', textInput('name', `${SLOT_L[d.slot]} (${list.length} alimentos)`, 'autofocus'))}
        <button class="btn btn-gold btn-block mt" data-x="ok">Guardar</button>`);
      b2.querySelector('[data-x=ok]').onclick = async () => {
        const name = b2.querySelector('[name=name]').value.trim() || SLOT_L[d.slot];
        S.cfg.meals.push({ id: 'fav_' + uid(), name, slot: d.slot, kind: 'fav', items: list.filter((e) => S.cfg.foods[e.foodId]).map((e) => ({ foodId: e.foodId, qty: round(e.qty), alts: [] })) });
        await saveCfg();
        closeSheet();
        toast('Favorita guardada', { gold: true });
      };
    };
    body.querySelector('[data-x=clear]').onclick = async () => {
      closeSheet();
      if (!(await confirmDialog(`Apagar os registos de ${SLOT_L[d.slot].toLowerCase()}?`, { ok: 'Apagar', danger: true }))) return;
      const dd = day(date);
      dd.food = dd.food.filter((e) => e.slot !== d.slot);
      saveDay(date);
      render();
    };
  },
};
