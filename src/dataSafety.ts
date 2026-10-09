// ─────────────────────────────────────────────────────────────────────────────
// Filets de sécurité des données OrderTrack
//
//  • diffSummary / mergePayloads : comparer et FUSIONNER deux jeux de données
//    sans jamais écraser l'existant (ajoute seulement ce qui manque).
//  • Snapshots locaux (IndexedDB) : copies de sécurité automatiques, et prises
//    systématiquement juste AVANT toute opération qui remplace des données.
//  • Suivi de santé : dernière synchro réussie, dernière sauvegarde JSON,
//    sauvegarde automatique hebdomadaire.
//
// Fichier volontairement indépendant de React et de App.tsx : la logique de
// fusion est ainsi testable seule (voir scripts/test-merge.mjs).
// ─────────────────────────────────────────────────────────────────────────────

const clone = (x: any) => JSON.parse(JSON.stringify(x));
const keyOf = (r: any) => String(r?.id ?? JSON.stringify(r));

export type Counts = { orders: number; invoices: number; payments: number; total: number };

export const countPayload = (p: any): Counts => {
  let orders = 0, invoices = 0, payments = 0;
  Object.values(p?.orders || {}).forEach((arr: any) => {
    (Array.isArray(arr) ? arr : []).forEach((o: any) => {
      orders++;
      (o?.invoices || []).forEach((i: any) => {
        invoices++;
        payments += (i?.payments || []).length;
      });
    });
  });
  return { orders, invoices, payments, total: orders + invoices + payments };
};

// Identifiants uniques de chaque commande / facture / paiement d'un jeu de données.
const idSets = (p: any) => {
  const o = new Set<string>(), i = new Set<string>(), pay = new Set<string>();
  Object.values(p?.orders || {}).forEach((arr: any) => {
    (Array.isArray(arr) ? arr : []).forEach((ord: any) => {
      o.add(keyOf(ord));
      (ord?.invoices || []).forEach((inv: any) => {
        i.add(ord?.id + "/" + keyOf(inv));
        (inv?.payments || []).forEach((py: any) => pay.add(ord?.id + "/" + inv?.id + "/" + keyOf(py)));
      });
    });
  });
  return { o, i, pay };
};

const minus = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  a.forEach(x => { if (!b.has(x)) n++; });
  return n;
};

// Ce qui n'existe que dans A, et ce qui n'existe que dans B.
export const diffSummary = (a: any, b: any) => {
  const A = idSets(a), B = idSets(b);
  const mk = (x: Set<string>[], y: Set<string>[]) => {
    const orders = minus(x[0], y[0]), invoices = minus(x[1], y[1]), payments = minus(x[2], y[2]);
    return { orders, invoices, payments, total: orders + invoices + payments };
  };
  return { onlyA: mk([A.o, A.i, A.pay], [B.o, B.i, B.pay]), onlyB: mk([B.o, B.i, B.pay], [A.o, A.i, A.pay]) };
};

// Fusionne `incoming` DANS `base` : base ne perd rien et reste prioritaire sur
// toute commande/facture/paiement déjà présent (même identifiant) ; seuls les
// éléments absents de base sont ajoutés. Sert aussi bien à importer un vieux
// fichier JSON qu'à réconcilier deux appareils qui ont divergé.
export const mergePayloads = (base: any, incoming: any) => {
  const out: any = clone(base || {});
  out.clients = Array.isArray(out.clients) ? out.clients : [];
  out.orders = out.orders || {};
  out.configs = out.configs || {};
  const added = { clients: 0, orders: 0, invoices: 0, payments: 0 };

  (incoming?.clients || []).forEach((c: string) => {
    if (!out.clients.includes(c)) { out.clients.push(c); added.clients++; }
  });

  const orderIdx = new Map<string, any>();
  Object.keys(out.orders).forEach(c => (out.orders[c] || []).forEach((o: any) => orderIdx.set(keyOf(o), o)));

  Object.keys(incoming?.orders || {}).forEach(client => {
    const arr = Array.isArray(incoming.orders[client]) ? incoming.orders[client] : [];
    if (!out.orders[client]) out.orders[client] = [];
    if (arr.length && !out.clients.includes(client)) { out.clients.push(client); added.clients++; }
    arr.forEach((io: any) => {
      const eo = orderIdx.get(keyOf(io));
      if (!eo) {
        const copy = clone(io);
        out.orders[client].push(copy);
        orderIdx.set(keyOf(copy), copy);
        added.orders++;
        (io.invoices || []).forEach((i: any) => { added.invoices++; added.payments += (i.payments || []).length; });
        return;
      }
      // Commande déjà connue : on complète seulement ses factures / paiements manquants.
      eo.invoices = eo.invoices || [];
      const invIdx = new Map<string, any>(eo.invoices.map((i: any) => [keyOf(i), i]));
      (io.invoices || []).forEach((ii: any) => {
        const ei = invIdx.get(keyOf(ii));
        if (!ei) {
          eo.invoices.push(clone(ii));
          added.invoices++;
          added.payments += (ii.payments || []).length;
        } else {
          ei.payments = ei.payments || [];
          const have = new Set(ei.payments.map((p: any) => keyOf(p)));
          (ii.payments || []).forEach((ip: any) => {
            if (!have.has(keyOf(ip))) { ei.payments.push(clone(ip)); added.payments++; }
          });
        }
      });
    });
  });

  Object.keys(incoming?.configs || {}).forEach(k => {
    if (!(k in out.configs)) out.configs[k] = clone(incoming.configs[k]);
  });

  return { merged: out, added, addedTotal: added.orders + added.invoices + added.payments };
};

// ── Snapshots locaux (IndexedDB) ─────────────────────────────────────────────
const DB_NAME = "ordertrack_safety";
const STORE = "snapshots";
const MAX_SNAPSHOTS = 25;
const AUTO_THROTTLE_MS = 30 * 60 * 1000;

export type SnapshotMeta = { id: string; at: string; reason: string; counts: Counts; hash: string };

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    try {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) { reject(e); }
  });

const reqP = <T,>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16) + "-" + s.length;
};

const readAll = async (): Promise<any[]> => {
  const db = await openDb();
  try { return await reqP(db.transaction(STORE, "readonly").objectStore(STORE).getAll()); }
  finally { db.close(); }
};

// reason "auto" = copie périodique (limitée à 1 / 30 min, ignorée si identique
// à la précédente). Toute autre raison = copie « avant remplacement » : toujours
// conservée. Un jeu de données vide n'est jamais sauvegardé.
export const saveSnapshot = async (payload: any, reason: string): Promise<boolean> => {
  try {
    const counts = countPayload(payload);
    if (counts.orders === 0) return false;
    const json = JSON.stringify(payload);
    const hash = hashStr(json);
    const all = (await readAll()).sort((a, b) => b.at.localeCompare(a.at));
    if (all[0] && all[0].hash === hash) return false;
    if (reason === "auto" && all[0] && Date.now() - new Date(all[0].at).getTime() < AUTO_THROTTLE_MS) return false;
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      st.put({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), reason, counts, hash, json });
      // Élagage : on garde les MAX_SNAPSHOTS plus récentes.
      const keep = [{ at: "z" }, ...all].slice(0, MAX_SNAPSHOTS);
      const keepIds = new Set(keep.map((k: any) => k.id));
      all.forEach(s => { if (!keepIds.has(s.id)) st.delete(s.id); });
      await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    } finally { db.close(); }
    return true;
  } catch (e) { console.warn("[Snapshot] échec", e); return false; }
};

export const listSnapshots = async (): Promise<SnapshotMeta[]> => {
  try {
    return (await readAll())
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(({ id, at, reason, counts, hash }) => ({ id, at, reason, counts, hash }));
  } catch { return []; }
};

export const getSnapshot = async (id: string): Promise<any | null> => {
  try {
    const db = await openDb();
    try {
      const rec: any = await reqP(db.transaction(STORE, "readonly").objectStore(STORE).get(id));
      return rec ? JSON.parse(rec.json) : null;
    } finally { db.close(); }
  } catch { return null; }
};

// ── Suivi : synchro cloud, sauvegardes JSON ──────────────────────────────────
const LS_SYNC_OK = "ordertrack_last_sync_ok";
const LS_BACKUP = "ordertrack_last_backup";
const LS_AUTOBACKUP = "ordertrack_autobackup";
const LS_SNOOZE = "ordertrack_backup_snooze";
const LS_FIRST_SEEN = "ordertrack_first_seen";

const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

export const markSyncOk = () => lsSet(LS_SYNC_OK, new Date().toISOString());

// Heures écoulées depuis la dernière synchro réussie. Si l'appareil n'en a
// encore jamais enregistré (première ouverture après cette mise à jour), le
// compteur démarre à maintenant plutôt que d'afficher une fausse alerte.
export const hoursSinceSyncOk = (): number => {
  let v = lsGet(LS_SYNC_OK);
  if (!v) { v = new Date().toISOString(); lsSet(LS_SYNC_OK, v); }
  return (Date.now() - new Date(v).getTime()) / 3600000;
};

export const markBackupDone = () => lsSet(LS_BACKUP, new Date().toISOString());

// Jours depuis la dernière sauvegarde JSON ; null = jamais faite sur cet appareil.
export const daysSinceBackup = (): number | null => {
  const v = lsGet(LS_BACKUP);
  if (!v) return null;
  return (Date.now() - new Date(v).getTime()) / 86400000;
};

// Pour ne pas harceler dès la première ouverture : l'absence de sauvegarde
// n'est signalée qu'après 3 jours d'utilisation de cette version.
export const daysSinceFirstSeen = (): number => {
  let v = lsGet(LS_FIRST_SEEN);
  if (!v) { v = new Date().toISOString(); lsSet(LS_FIRST_SEEN, v); }
  return (Date.now() - new Date(v).getTime()) / 86400000;
};

export const snoozeBackupReminder = () => lsSet(LS_SNOOZE, new Date(Date.now() + 24 * 3600000).toISOString());
export const isBackupReminderSnoozed = () => {
  const v = lsGet(LS_SNOOZE);
  return !!v && new Date(v).getTime() > Date.now();
};

export const getAutoBackup = () => lsGet(LS_AUTOBACKUP) === "1";
export const setAutoBackup = (on: boolean) => lsSet(LS_AUTOBACKUP, on ? "1" : "0");

// Télécharge le jeu de données au format JSON (même format que la
// sauvegarde manuelle) et enregistre la date.
export const downloadBackupFile = (payload: any) => {
  const full = { ...payload, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ordertrack-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  markBackupDone();
};

export const fmtCounts = (c: { orders: number; invoices: number; payments: number }) =>
  `${c.orders} commande(s), ${c.invoices} facture(s), ${c.payments} paiement(s)`;
