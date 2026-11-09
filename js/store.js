// Armazenamento local em IndexedDB (uma tabela chave → valor) e estado em memória.
// Chaves: config · active · day:AAAA-MM-DD · session:<id> · photo:<exerciseId>
import { seedConfig, SCHEMA_VERSION } from './seed.js';

const DB_NAME = 'mode2030';
const STORE = 'kv';
let db;

export const S = { cfg: null, days: {}, sessions: [], active: null, photos: {} };

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const store = (mode) => db.transaction(STORE, mode).objectStore(STORE);

export async function allEntries() {
  const st = store('readonly');
  const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
  return keys.map((k, i) => [k, vals[i]]);
}
export const put = (k, v) => req(store('readwrite').put(v, k));
export const del = (k) => req(store('readwrite').delete(k));

export function replaceAll(entries) {
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readwrite');
    const st = t.objectStore(STORE);
    st.clear();
    for (const [k, v] of entries) st.put(v, k);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

function ingest(entries) {
  S.cfg = null; S.days = {}; S.sessions = []; S.active = null; S.photos = {};
  for (const [k, v] of entries) {
    if (k === 'config') S.cfg = v;
    else if (k === 'active') S.active = v;
    else if (k.startsWith('day:')) S.days[k.slice(4)] = v;
    else if (k.startsWith('session:')) S.sessions.push(v);
    else if (k.startsWith('photo:')) S.photos[k.slice(6)] = v;
  }
  sortSessions();
}

export async function load() {
  db = await openDB();
  ingest(await allEntries());
  if (!S.cfg) {
    S.cfg = seedConfig();
    await put('config', S.cfg);
  } else migrate(S.cfg);
}

export async function reload() { ingest(await allEntries()); if (!S.cfg) { S.cfg = seedConfig(); await put('config', S.cfg); } }

function migrate(cfg) {
  // Garante campos novos em configurações antigas (versões futuras acrescentam aqui).
  const base = seedConfig();
  for (const k of Object.keys(base)) if (cfg[k] === undefined) cfg[k] = base[k];
  cfg.version = SCHEMA_VERSION;
}

export const sortSessions = () => S.sessions.sort((a, b) => b.startedAt - a.startedAt);
export const day = (k) => (S.days[k] ||= { food: [], water: [], supps: {}, weight: null });

export const saveCfg = () => put('config', S.cfg);
export const saveDay = (k) => put('day:' + k, S.days[k]);
export const saveActive = () => (S.active ? put('active', S.active) : del('active'));
export const saveSession = (s) => put('session:' + s.id, s);
export async function removeSession(id) {
  S.sessions = S.sessions.filter((s) => s.id !== id);
  await del('session:' + id);
}
export async function setPhoto(exId, dataUrl) {
  if (dataUrl) { S.photos[exId] = dataUrl; await put('photo:' + exId, dataUrl); }
  else { delete S.photos[exId]; await del('photo:' + exId); }
}
