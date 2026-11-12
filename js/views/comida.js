// Separador Alimentação: totais do dia, registo livre a partir da base de alimentos (categorias, porções,
// recentes), entrada rápida, refeições do plano e favoritas, água e histórico.
import { S, day, saveDay, saveCfg } from '../store.js';
import { macrosFor, sumMacros, normText, recentFoods } from '../logic.js';
import { SLOTS } from '../seed.js';
import { FOOD_CATS } from '../foods-db.js';
import { dateKey, addDays, longDate, esc, fmt, num, uid, round } from '../util.js';
import { icon, openSheet, closeSheet, updateSheet, topSheet, toast, vibrate, field, numInput, textInput, selectInput, confirmDialog, render } from '../ui.js';
import { nutritionCard, waterCard } from '../widgets.js';

let viewDate = null; // null = hoje
const curDate = () => viewDate || dateKey();
const SLOT_L = Object.fromEntries(SLOTS);
const CAT_L = Object.fromEntries(FOOD_CATS);

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
/** "265 kcal · P 8,5 / 100 g · 1 fatia 66 kcal" */
function perLine(f) {
  if (f.basis === 'un') return `${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} por unidade`;
  const p = f.portions?.[0];
  return `${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} / 100 ${f.basis}${p ? ` · ${esc(p.label)} ${fmt(macrosFor(f, p.qty).kcal)} kcal` : ''}`;
}
const entryQty = (e, f) => (e.quick ? 'entrada rápida' : qtyStr(f, e.qty));

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
        <button class="icon-btn sm" data-act="f-slot-menu" data-slot="${k}" aria-label="Opções de ${label}">${icon('dots')}</button>
        <button class="icon-btn sm gold-b" data-act="f-add" data-slot="${k}" aria-label="Adicionar a ${label}">${icon('plus')}</button></span></div>
      ${list.map((e) => {
        const f = S.cfg.foods[e.foodId];
        return `<button class="food-row" data-act="f-edit" data-id="${e.id}">
          <span class="food-n">${esc(e.name)}<span class="mut small block">${entryQty(e, f)}</span></span>
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
      <button class="btn btn-gold quick-b" data-act="f-add">${icon('search')}<span>Alimento</span></button>
      <button class="btn quick-b" data-act="f-meals">${icon('list')}<span>Refeições</span></button>
      <button class="btn quick-b" data-act="f-quick">${icon('bolt')}<span>Entrada rápida</span></button>
    </div>
    ${slots}
    ${waterCard(date)}
    <p class="mut small center">Valores médios de referência, aproximados. Com rótulo, confirmar e corrigir na <a class="link" href="#definicoes/alimentos">base de alimentos</a>.</p>`;
}
export { render_ as render };

/* ---------- Escolher alimento (pesquisa, categorias, recentes) ---------- */
let pk = null; // { slot, q, cat, added }

function pickList() {
  const foods = S.cfg.foods;
  const recents = recentFoods(S.days, foods, 25);
  const lastQ = Object.fromEntries(recents.map((r) => [r.foodId, r.qty]));
  const q = normText(pk.q.trim());
  let list;
  if (q) {
    const words = q.split(/\s+/);
    list = Object.values(foods).filter((f) => { const n = normText(f.name); return words.every((w) => n.includes(w)); });
    list.sort((a, b) => (normText(a.name).startsWith(q) ? 0 : 1) - (normText(b.name).startsWith(q) ? 0 : 1) || (lastQ[b.id] ? 1 : 0) - (lastQ[a.id] ? 1 : 0) || a.name.localeCompare(b.name));
  } else if (pk.cat === 'rec') list = recents.map((r) => foods[r.foodId]);
  else if (pk.cat === 'all') list = Object.values(foods).sort((a, b) => a.name.localeCompare(b.name));
  else list = Object.values(foods).filter((f) => (f.cat || 'outros') === pk.cat).sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) {
    return q ? `<p class="mut center">Nada encontrado para "${esc(pk.q.trim())}".</p><button class="btn btn-block" data-x="new">${icon('plus')} Criar "${esc(pk.q.trim())}"</button>`
      : `<p class="mut center">${pk.cat === 'rec' ? 'Os alimentos registados aparecem aqui, com a última quantidade.' : 'Sem alimentos nesta categoria.'}</p>`;
  }
  return list.map((f) => `<div class="pick-row">
      <button class="pick-main" data-food="${f.id}">${esc(f.name)}<span class="mut small block">${perLine(f)}</span></button>
      ${lastQ[f.id] ? `<button class="chip chip-add tnum" data-quick="${f.id}" aria-label="Adicionar ${esc(qtyStr(f, lastQ[f.id]))}">+ ${qtyStr(f, lastQ[f.id])}</button>` : ''}
    </div>`).join('');
}

function pickerHTML() {
  const hasRec = recentFoods(S.days, S.cfg.foods, 1).length > 0;
  const cats = [...(hasRec ? [['rec', 'Recentes']] : []), ['all', 'Todos'], ...FOOD_CATS.filter(([k]) => Object.values(S.cfg.foods).some((f) => (f.cat || 'outros') === k))];
  return `<div class="row-sb pick-head"><div class="sheet-title">Adicionar a</div>${selectInput('pk-slot', SLOTS, pk.slot, 'aria-label="Refeição"')}</div>
    <div class="search">${icon('search')}<input class="input" id="f-q" placeholder="Procurar (ex.: frango, iogurte, pão)" value="${esc(pk.q)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="chips cat-chips" id="f-cats">${cats.map(([k, l]) => `<button class="chip ${pk.cat === k && !pk.q.trim() ? 'on' : ''}" data-cat="${k}">${esc(l.split(',')[0])}</button>`).join('')}</div>
    <div class="list food-pick" id="f-list">${pickList()}</div>
    <div class="grid2 mt-s"><button class="btn btn-sm" data-x="quick">${icon('bolt')} Entrada rápida</button><button class="btn btn-sm" data-x="new">${icon('plus')} Criar alimento</button></div>
    ${pk.added ? `<button class="btn btn-gold btn-block mt-s" data-x="done">Concluído · ${pk.added} adicionado${pk.added > 1 ? 's' : ''}</button>` : ''}`;
}

function openPicker(slot) {
  const recent = recentFoods(S.days, S.cfg.foods, 1).length > 0;
  pk = { slot: slot || defaultSlot(), q: '', cat: recent ? 'rec' : 'all', added: 0 };
  const body = openSheet(pickerHTML(), { cls: 'sheet-tall' });
  wirePicker(body);
}
function showPicker() {
  const body = updateSheet(pickerHTML());
  if (body) wirePicker(body);
}
function wirePicker(body) {
  const q = body.querySelector('#f-q');
  const listEl = body.querySelector('#f-list');
  const wireList = () => {
    listEl.querySelectorAll('[data-food]').forEach((b) => (b.onclick = () => qtyForm(S.cfg.foods[b.dataset.food], { fromPicker: true })));
    listEl.querySelectorAll('[data-quick]').forEach((b) => (b.onclick = () => {
      const f = S.cfg.foods[b.dataset.quick];
      const last = recentFoods(S.days, S.cfg.foods, 50).find((r) => r.foodId === f.id);
      addEntry(f, last ? last.qty : 100, pk.slot);
      b.classList.add('done');
      b.innerHTML = icon('check');
    }));
    listEl.querySelector('[data-x=new]')?.addEventListener('click', newFood);
  };
  const paintList = () => {
    listEl.innerHTML = pickList();
    body.querySelectorAll('[data-cat]').forEach((c) => c.classList.toggle('on', !pk.q.trim() && c.dataset.cat === pk.cat));
    wireList();
  };
  q.addEventListener('input', () => { pk.q = q.value; paintList(); });
  body.querySelectorAll('[data-cat]').forEach((c) => (c.onclick = () => { pk.cat = c.dataset.cat; pk.q = ''; q.value = ''; paintList(); listEl.scrollTop = 0; }));
  body.querySelector('[name=pk-slot]').onchange = (ev) => { pk.slot = ev.target.value; };
  body.querySelector('[data-x=quick]').onclick = () => quickForm(null, { fromPicker: true });
  body.querySelector('.grid2 [data-x=new]').onclick = newFood;
  body.querySelector('[data-x=done]')?.addEventListener('click', () => closeSheet());
  wireList();
}
function newFood() {
  foodEditor(null, (f) => qtyForm(f, { fromPicker: true }), { name: pk?.q.trim() || '' });
}

function addEntry(food, q, slot) {
  const date = curDate();
  const id = uid();
  day(date).food.push({ id, slot, foodId: food.id, name: food.name, qty: q, m: macrosFor(food, q), t: Date.now() });
  saveDay(date);
  vibrate(15);
  if (pk) pk.added++;
  const undo = () => { const dd = day(date); dd.food = dd.food.filter((e) => e.id !== id); if (pk) pk.added = Math.max(0, pk.added - 1); saveDay(date); render(); };
  toast(`${food.name}: ${qtyStr(food, q)} em ${SLOT_L[slot].toLowerCase()}`, { action: { label: 'Desfazer', fn: undo } });
  render();
}

/* ---------- Quantidade: gramas ou porções ---------- */
function qtyForm(food, { entry, fromPicker } = {}) {
  const date = curDate();
  const last = recentFoods(S.days, S.cfg.foods, 200).find((r) => r.foodId === food.id);
  const portions = food.basis === 'un' ? [] : food.portions || [];
  let qty = entry ? entry.qty : last ? last.qty : portions[0] ? portions[0].qty : food.basis === 'un' ? 1 : 100;
  // porção selecionada: { i, n } se a quantidade for um múltiplo (½, 1, 1½…) de uma porção
  let sel = null;
  portions.forEach((p, i) => { const n = qty / p.qty; if (!sel && n >= 0.5 && Math.abs(n * 2 - Math.round(n * 2)) < 1e-6) sel = { i, n: Math.round(n * 2) / 2 }; });
  const chips = portions.length ? [] : food.basis === 'un' ? [[1, '1'], [2, '2'], [3, '3'], [0.5, '½']] : [[50, '50 ' + food.basis], [100, '100 ' + food.basis], [150, '150 ' + food.basis], [200, '200 ' + food.basis]];
  const html = `${fromPicker ? `<button class="btn btn-ghost btn-sm back-b" data-x="back">${icon('left')} Lista</button>` : ''}
    <div class="sheet-title">${esc(food.name)}</div>
    <p class="mut small">${perLine(food)}${food.cat ? ` · ${esc(CAT_L[food.cat] || '')}` : ''}</p>
    ${portions.length ? `<div class="chips">${portions.map((p, i) => `<button class="chip" data-p="${i}">${esc(p.label)} · ${fmt(p.qty)} ${food.basis}</button>`).join('')}</div>
      <div class="portion-step mt-s" id="f-ps"><button class="icon-btn sm" data-pn="-0.5" aria-label="Menos meia porção">${icon('minus')}</button>
        <span class="tnum" id="f-pl"></span><button class="icon-btn sm" data-pn="0.5" aria-label="Mais meia porção">${icon('plus')}</button></div>` : ''}
    <div class="${entry ? 'grid2' : ''} mt-s">${field(`Quantidade (${unitOf(food)})`, numInput('qty', qty, entry || fromPicker ? '' : 'autofocus'))}
      ${entry ? field('Refeição', selectInput('slot', SLOTS, entry.slot)) : ''}</div>
    ${chips.length ? `<div class="chips">${chips.map(([v, l]) => `<button class="chip" data-v="${v}">${esc(l)}</button>`).join('')}</div>` : ''}
    ${last && !entry ? `<p class="mut small">Última vez: ${qtyStr(food, last.qty)}</p>` : ''}
    <div class="preview mt" id="f-prev"></div>
    ${entry ? `<div class="grid2 mt"><button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button><button class="btn btn-gold" data-x="ok">Guardar</button></div>`
            : `<button class="btn btn-gold btn-xl btn-block mt" data-x="ok">Adicionar a ${esc(SLOT_L[pk?.slot || defaultSlot()].toLowerCase())}</button>`}`;
  const body = fromPicker ? updateSheet(html) : openSheet(html);
  const inp = body.querySelector('[name=qty]');
  const prev = body.querySelector('#f-prev');
  const ps = body.querySelector('#f-ps');
  const paint = () => {
    const q = num(inp.value);
    prev.innerHTML = q > 0 ? macroLine(macrosFor(food, q)) : '<span class="mut">Indicar a quantidade</span>';
    body.querySelectorAll('[data-p]').forEach((c) => c.classList.toggle('on', !!sel && +c.dataset.p === sel.i));
    if (ps) {
      ps.style.display = sel ? '' : 'none';
      if (sel) body.querySelector('#f-pl').textContent = `${fmt(sel.n, 1)} × ${portions[sel.i].label}`;
    }
  };
  const setQty = (v) => { inp.value = String(round(v)).replace('.', ','); paint(); };
  inp.addEventListener('input', () => {
    const q = num(inp.value);
    if (sel && !(Math.abs(q - sel.n * portions[sel.i].qty) < 1e-6)) sel = null;
    paint();
  });
  body.querySelectorAll('[data-p]').forEach((c) => (c.onclick = () => { sel = { i: +c.dataset.p, n: 1 }; setQty(portions[sel.i].qty); }));
  body.querySelectorAll('[data-pn]').forEach((b) => (b.onclick = () => { if (!sel) return; sel.n = Math.max(0.5, sel.n + +b.dataset.pn); setQty(sel.n * portions[sel.i].qty); }));
  body.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { sel = null; setQty(+b.dataset.v); }));
  body.querySelector('[data-x=back]')?.addEventListener('click', showPicker);
  paint();
  body.querySelector('[data-x=ok]').onclick = () => {
    const q = num(inp.value);
    if (!(q > 0)) { toast('Indicar uma quantidade válida'); return; }
    if (entry) {
      Object.assign(entry, { qty: q, slot: body.querySelector('[name=slot]').value, m: macrosFor(food, q), name: food.name });
      saveDay(date);
      closeSheet();
      render();
      return;
    }
    addEntry(food, q, pk?.slot || defaultSlot());
    if (fromPicker) showPicker(); else closeSheet();
  };
  body.querySelector('[data-x=del]')?.addEventListener('click', () => removeEntry(date, entry.id));
}

/* ---------- Entrada rápida: só calorias e macros (refeição fora, rótulo à mão) ---------- */
function quickForm(entry, { fromPicker } = {}) {
  const date = curDate();
  const m = entry?.m || {};
  const v0 = (x) => (x ? round(x, 1) : '');
  const html = `${fromPicker ? `<button class="btn btn-ghost btn-sm back-b" data-x="back">${icon('left')} Lista</button>` : ''}
    <div class="sheet-title">Entrada rápida</div>
    <p class="mut small">Para quando não há alimento na base: uma refeição fora, um rótulo. Só as calorias chegam; se faltarem as calorias, são calculadas pelas macros.</p>
    ${field('Descrição', textInput('name', entry?.name || '', 'placeholder="Jantar fora, sobremesa…"'))}
    <div class="grid2">${field('kcal', numInput('kcal', v0(m.kcal), entry ? '' : 'autofocus'))}${field('Proteína (g)', numInput('p', v0(m.p)))}
      ${field('Hidratos (g)', numInput('c', v0(m.c)))}${field('Gordura (g)', numInput('f', v0(m.f)))}</div>
    ${field('Refeição', selectInput('slot', SLOTS, entry?.slot || pk?.slot || defaultSlot()))}
    ${entry ? `<div class="grid2 mt"><button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button><button class="btn btn-gold" data-x="ok">Guardar</button></div>`
            : `<button class="btn btn-gold btn-xl btn-block mt" data-x="ok">Adicionar</button>`}`;
  const body = fromPicker ? updateSheet(html) : openSheet(html);
  body.querySelector('[data-x=back]')?.addEventListener('click', showPicker);
  body.querySelector('[data-x=ok]').onclick = () => {
    const g = (n) => { const x = num(body.querySelector(`[name=${n}]`).value); return x > 0 ? x : 0; };
    const p = g('p'), c = g('c'), f = g('f');
    const kcal = g('kcal') || p * 4 + c * 4 + f * 9;
    if (!(kcal > 0)) { toast('Indicar as calorias (ou as macros)'); return; }
    const name = body.querySelector('[name=name]').value.trim() || 'Entrada rápida';
    const slot = body.querySelector('[name=slot]').value;
    const mm = { kcal, p, c, f };
    if (entry) Object.assign(entry, { name, slot, m: mm });
    else {
      day(date).food.push({ id: uid(), slot, foodId: null, quick: true, name, qty: 1, m: mm, t: Date.now() });
      vibrate(15);
      toast(`${name} adicionado`);
      if (pk && fromPicker) pk.added++;
    }
    saveDay(date);
    render();
    if (fromPicker && !entry) showPicker(); else closeSheet();
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
    <p class="mut small">Ajustar antes de adicionar: trocar, retirar ou mudar quantidades. Depois podem juntar-se outros alimentos com +.</p>
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
  if (!meals.length) return `<p class="mut small">${kind === 'fav' ? 'Ainda não há favoritas. Numa refeição registada, usar ⋯ → "Guardar como favorita".' : 'Sem refeições no plano.'}</p>`;
  return `<div class="list">${meals.map((m) => {
    const t = sumMacros(m.items.filter((i) => S.cfg.foods[i.foodId]).map((i) => macrosFor(S.cfg.foods[i.foodId], i.qty)));
    return `<div class="list-row"><button class="list-main btn-plain" data-meal="${m.id}">${esc(m.name)}<span class="mut small block tnum">${fmt(t.kcal)} kcal · P ${fmt(t.p)} · ${m.items.length} alimentos</span></button>
      ${kind === 'fav' ? `<button class="icon-btn sm" data-delfav="${m.id}" aria-label="Apagar favorita">${icon('trash')}</button>` : icon('right', 'ic-mut')}</div>`;
  }).join('')}</div>`;
}

/* ---------- Editor de alimentos (partilhado com Definições) ---------- */
export function foodEditor(food, onSave, { name = '' } = {}) {
  const f = food || { id: '', name, basis: 'g', kcal: '', p: '', c: '', f: '', cat: 'outros' };
  let portions = (f.portions || []).map((p) => ({ ...p }));
  const body = openSheet('');
  const read = () => {
    body.querySelectorAll('[data-pl]').forEach((el) => { portions[+el.dataset.pl].label = el.value; });
    body.querySelectorAll('[data-pq]').forEach((el) => { portions[+el.dataset.pq].qty = num(el.value); });
    const v = (n) => body.querySelector(`[name=${n}]`)?.value ?? '';
    Object.assign(f, { name: v('name'), basis: v('basis') || f.basis, cat: v('cat') || f.cat, kcal: v('kcal'), p: v('p'), c: v('c'), f: v('f') });
  };
  const paint = () => {
    body.innerHTML = `<div class="sheet-title">${food ? 'Editar alimento' : 'Novo alimento'}</div>
      ${field('Nome', textInput('name', f.name, food ? '' : 'autofocus placeholder="Iogurte grego da marca X"'))}
      <div class="grid2">${field('Valores por', selectInput('basis', [['g', '100 g'], ['ml', '100 ml'], ['un', '1 unidade']], f.basis))}${field('Categoria', selectInput('cat', FOOD_CATS, f.cat || 'outros'))}</div>
      <div class="grid2">${field('kcal', numInput('kcal', f.kcal))}${field('Proteína (g)', numInput('p', f.p))}
        ${field('Hidratos (g)', numInput('c', f.c))}${field('Gordura (g)', numInput('f', f.f))}</div>
      ${f.basis === 'un' ? '' : `<div class="lbl mt-s">Porções (opcional)</div>
        ${portions.map((p, i) => `<div class="row-g portion-ed"><input class="input" data-pl="${i}" value="${esc(p.label)}" placeholder="1 fatia" autocomplete="off">
          <input class="input input-sm tnum" data-pq="${i}" inputmode="decimal" value="${p.qty ? String(p.qty).replace('.', ',') : ''}" placeholder="30"><span class="mut small">${f.basis}</span>
          <button class="icon-btn sm danger" data-prm="${i}" aria-label="Retirar porção">${icon('x')}</button></div>`).join('')}
        <button class="btn btn-sm mt-s" data-x="padd">${icon('plus')} Porção</button>`}
      <p class="mut small">Valores do rótulo (por 100 g/ml) ou valores médios de referência.</p>
      <div class="${food ? 'grid2' : ''} mt">${food ? `<button class="btn btn-danger" data-x="del">${icon('trash')} Apagar</button>` : ''}<button class="btn btn-gold ${food ? '' : 'btn-block'}" data-x="ok">Guardar</button></div>`;
    body.querySelector('[name=basis]').onchange = () => { read(); paint(); };
    body.querySelector('[data-x=padd]')?.addEventListener('click', () => { read(); portions.push({ label: '', qty: '' }); paint(); body.querySelector(`[data-pl="${portions.length - 1}"]`)?.focus(); });
    body.querySelectorAll('[data-prm]').forEach((b) => (b.onclick = () => { read(); portions.splice(+b.dataset.prm, 1); paint(); }));
    body.querySelector('[data-x=ok]').onclick = save;
    body.querySelector('[data-x=del]')?.addEventListener('click', del);
  };
  const save = async () => {
    read();
    const vals = { kcal: num(f.kcal), p: num(f.p), c: num(f.c), f: num(f.f) };
    if (!f.name.trim()) { toast('Indicar o nome'); return; }
    if (Object.values(vals).some((x) => Number.isNaN(x) || x < 0)) { toast('Preencher kcal e macros (0 se não tiver)'); return; }
    const ports = f.basis === 'un' ? [] : portions.filter((p) => p.label.trim() && p.qty > 0).map((p) => ({ label: p.label.trim(), qty: p.qty }));
    const id = food?.id || 'c_' + uid();
    const nf = { ...(food || {}), id, name: f.name.trim(), basis: f.basis, cat: f.cat || 'outros', ...vals, custom: food ? !!food.custom : true };
    if (ports.length) nf.portions = ports; else delete nf.portions;
    S.cfg.foods[id] = nf;
    await saveCfg();
    closeSheet();
    toast('Alimento guardado');
    onSave?.(nf);
    render();
  };
  const del = async () => {
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
  };
  paint();
  const first = body.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 250);
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
  'f-quick'() { pk = null; quickForm(null); },
  'f-edit'(d) {
    const date = curDate();
    const e = S.days[date]?.food.find((x) => x.id === d.id);
    if (!e) return;
    if (e.quick) { quickForm(e); return; }
    const food = S.cfg.foods[e.foodId];
    if (food) { pk = null; qtyForm(food, { entry: e }); return; }
    // alimento já apagado da base: só permite apagar o registo
    openSheet(`<div class="sheet-title">${esc(e.name)}</div><p class="mut">Este alimento já não está na base. ${macroLine(e.m)}</p>
      <button class="btn btn-danger btn-block mt" data-x="del">${icon('trash')} Apagar registo</button>`).querySelector('[data-x=del]').onclick = () => removeEntry(date, e.id);
  },
  'f-meals'() {
    const show = () => {
      const body = topSheet();
      body.innerHTML = `<div class="sheet-title">Refeições</div>
        <div class="lbl">Do plano</div>${mealListHTML('plan')}
        <div class="lbl mt">Favoritas</div>${mealListHTML('fav')}`;
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
    const prevDate = addDays(date, -1);
    const prevList = (S.days[prevDate]?.food || []).filter((e) => e.slot === d.slot);
    const prevKcal = sumMacros(prevList.map((e) => e.m)).kcal;
    const body = openSheet(`<div class="sheet-title">${SLOT_L[d.slot]}</div>
      <div class="list">
      ${prevList.length ? `<button class="list-row" data-x="copy">${icon('undo')}<span class="list-main">Repetir o de ontem<span class="mut small block">${prevList.map((e) => esc(e.name.split(' (')[0])).join(', ')} · ${fmt(prevKcal)} kcal</span></span></button>` : ''}
      ${list.length ? `<button class="list-row" data-x="fav">${icon('heart')}<span class="list-main">Guardar como favorita</span></button>
      <button class="list-row danger" data-x="clear">${icon('trash')}<span class="list-main">Apagar os ${list.length} registos</span></button>` : ''}
      ${!prevList.length && !list.length ? '<p class="mut">Sem registos nesta refeição, nem ontem.</p>' : ''}</div>`);
    body.querySelector('[data-x=copy]')?.addEventListener('click', () => {
      const dd = day(date);
      const now = Date.now();
      for (const e of prevList) {
        const f = S.cfg.foods[e.foodId];
        dd.food.push({ ...e, id: uid(), t: now, ...(f && !e.quick ? { name: f.name, m: macrosFor(f, e.qty) } : { m: { ...e.m } }) });
      }
      saveDay(date);
      closeSheet();
      vibrate(15);
      toast(`${SLOT_L[d.slot]} de ontem repetido`, { gold: true });
      render();
    });
    body.querySelector('[data-x=fav]')?.addEventListener('click', () => {
      const b2 = updateSheet(`<div class="sheet-title">Nova favorita</div>${field('Nome', textInput('name', `${SLOT_L[d.slot]} (${list.length} alimentos)`, 'autofocus'))}
        <button class="btn btn-gold btn-block mt" data-x="ok">Guardar</button>`);
      b2.querySelector('[data-x=ok]').onclick = async () => {
        const name = b2.querySelector('[name=name]').value.trim() || SLOT_L[d.slot];
        S.cfg.meals.push({ id: 'fav_' + uid(), name, slot: d.slot, kind: 'fav', items: list.filter((e) => S.cfg.foods[e.foodId]).map((e) => ({ foodId: e.foodId, qty: round(e.qty), alts: [] })) });
        await saveCfg();
        closeSheet();
        toast('Favorita guardada', { gold: true });
      };
    });
    body.querySelector('[data-x=clear]')?.addEventListener('click', async () => {
      closeSheet();
      if (!(await confirmDialog(`Apagar os registos de ${SLOT_L[d.slot].toLowerCase()}?`, { ok: 'Apagar', danger: true }))) return;
      const dd = day(date);
      dd.food = dd.food.filter((e) => e.slot !== d.slot);
      saveDay(date);
      render();
    });
  },
};
