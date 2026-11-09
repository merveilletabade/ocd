/**
 * Faux backend pour la démo (Vercel) : reproduit l'API FastAPI dans le navigateur.
 * Les données sont gardées dans le localStorage de chaque visiteur.
 */
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { API_URL, DEMO } from './environment';
import { PACKAGES, PAYMENTS, SLOT_STARTS, timeRange } from './data';

const KEY = 'ocd_demo_db_v1';
const TOKEN = 'demo-token';
const ADMIN_EMAIL = 'ocd@gmail.com';
const ADMIN_PWD = 'ocd@2026';
const WEEKDAYS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const SLOTS = SLOT_STARTS.length;

type Status = 'Payé' | 'En attente' | 'Annulé';
interface Pkg {
  id: string; name: string; price: number; tagline: string; features: string[]; badge: boolean; active: boolean;
  slots: number; vip: boolean; promo_percent: number; promo_until: string | null;
}
interface Res {
  id: number; ref: string; mode: 'presentiel' | 'distance'; country: string; live_date: string; slot_index: number;
  slot_count: number; package_id: string; base_amount: number; discount: number; total: number; name: string;
  business: string; product: string; phone: string; email: string; method: string; status: Status;
  created_at: string; hold: boolean;
}
interface Block { date: string; slot: number; note: string | null }
interface Db {
  pkgs: Pkg[]; res: Res[]; blocks: Block[]; seq: number; pwd: string;
  settings: { live_start_date: string; hold_minutes: number; contact_whatsapp: string; contact_email: string; cancel_hours: number };
}

// ---------- Outils ----------
const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(new Date());
const nowLocal = () => { const n = new Date(); return `${isoDate(n)}T${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; };
const parse = (s: string) => new Date(s + 'T00:00:00');
const money = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F CFA';
const methodLabel = (id: string) => PAYMENTS.find((m) => m.id === id)?.label ?? id;

function whenLabel(date: string, slot: number, blocks: number): string {
  const d = parse(date);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${timeRange(slot, blocks).replace(' – ', '–')}`;
}
const placeLabel = (r: Res) => (r.mode === 'presentiel' ? 'Présentiel · Lomé' : `Distance · ${r.country}`);
const token = (ref: string) => {
  let h = 5381;
  for (const c of 'ocd-demo|' + ref) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0') + 'a1b2c3d4e5f6';
};
const promoPct = (p: Pkg) => (p.promo_percent > 0 && (!p.promo_until || p.promo_until >= today()) ? p.promo_percent : 0);

// ---------- Données de départ ----------
function seed(): Db {
  const pkgs: Pkg[] = PACKAGES.map((p) => ({
    id: p.id, name: p.name, price: p.price, tagline: p.tagline, features: [...p.features], badge: !!p.badge,
    active: true, slots: p.slots, vip: p.vip, promo_percent: 0, promo_until: null,
  }));
  const mk = (
    id: number, mode: Res['mode'], country: string, date: string, slot: number, pkg: string,
    name: string, business: string, product: string, phone: string, email: string, method: string, status: Status,
  ): Res => {
    const p = pkgs.find((x) => x.id === pkg)!;
    return {
      id, ref: `OCD-${date.slice(8, 10)}${date.slice(5, 7)}-${String(id).padStart(4, '0')}`, mode, country, live_date: date,
      slot_index: slot, slot_count: p.slots, package_id: pkg, base_amount: p.price, discount: 0, total: p.price, name,
      business, product, phone, email, method, status, created_at: `2026-11-0${(id % 7) + 1}T10:${pad(id * 7 % 60)}:00`, hold: false,
    };
  };
  const res = [
    mk(1, 'distance', 'Bénin', '2026-12-01', 0, 'standard', 'Ama Koffi', 'Boutique Ama', 'Robes en wax', '+22997112233', 'ama@exemple.com', 'mixx', 'Payé'),
    mk(2, 'presentiel', 'Togo', '2026-12-01', 2, 'boost', 'Yao Mensah', 'Yao Cosmétiques', 'Beurre de karité', '+22891223344', 'yao@exemple.com', 'moov', 'Payé'),
    mk(3, 'distance', "Côte d'Ivoire", '2026-12-02', 0, 'vip', 'Awa Traoré', 'Awa Gourmet', 'Jus naturels', '+22507112233', 'awa@exemple.com', 'wave', 'Payé'),
    mk(4, 'presentiel', 'Togo', '2026-12-03', 4, 'premium', 'Kossi Agbo', 'Agbo Tech', 'Écouteurs sans fil', '+22892334455', 'kossi@exemple.com', 'mtn', 'En attente'),
    mk(5, 'distance', 'Sénégal', '2026-12-04', 1, 'standard', 'Fatou Ndiaye', 'Fatou Mode', 'Bijoux artisanaux', '+221771122334', 'ama@exemple.com', 'orange', 'Payé'),
    mk(6, 'distance', 'Ghana', '2026-12-05', 2, 'vip-prestige', 'Kwame Asante', 'Asante Coffee', 'Café du Ghana', '+233201234567', 'kwame@exemple.com', 'visa', 'Payé'),
  ];
  return {
    pkgs, res, seq: 7, pwd: ADMIN_PWD,
    blocks: [{ date: '2026-12-02', slot: 4, note: 'Déplacement' }],
    settings: { live_start_date: '2026-12-01', hold_minutes: 30, contact_whatsapp: '', contact_email: '', cancel_hours: 48 },
  };
}

let db: Db | null = null;
function load(): Db {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (db = JSON.parse(raw) as Db);
  } catch { /* stockage indisponible */ }
  return (db = seed());
}
function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignoré */ }
}

/** Les réservations non payées depuis trop longtemps sont annulées (le créneau se libère). */
function releaseStale(): void {
  const d = load();
  const limit = Date.now() - d.settings.hold_minutes * 60_000;
  let changed = false;
  for (const r of d.res) {
    if (r.status === 'En attente' && r.hold && new Date(r.created_at).getTime() < limit) { r.status = 'Annulé'; changed = true; }
  }
  if (changed) save();
}

function takenOn(date: string): Set<number> {
  const d = load();
  const s = new Set<number>();
  for (const r of d.res) if (r.status !== 'Annulé' && r.live_date === date) for (let i = 0; i < r.slot_count; i++) s.add(r.slot_index + i);
  for (const b of d.blocks) if (b.date === date) s.add(b.slot);
  return s;
}
const freeStarts = (taken: Set<number>, blocks: number) => {
  const out: number[] = [];
  for (let s = 0; s + blocks <= SLOTS; s++) if (Array.from({ length: blocks }, (_, i) => s + i).every((i) => !taken.has(i))) out.push(s);
  return out;
};
const firstBookable = () => { const s = load().settings.live_start_date; return s > today() ? s : today(); };

// ---------- Formats de réponse ----------
class ApiError extends Error { constructor(public status: number, public detail: string) { super(detail); } }
const fail = (status: number, detail: string): never => { throw new ApiError(status, detail); };

function adminRow(r: Res) {
  const p = load().pkgs.find((x) => x.id === r.package_id)!;
  const c = new Date(r.created_at);
  return {
    id: r.id, ref: r.ref, biz: r.business, person: r.name, remote: r.mode === 'distance', country: r.country,
    place: placeLabel(r), when: whenLabel(r.live_date, r.slot_index, r.slot_count), date: r.live_date,
    time: timeRange(r.slot_index, r.slot_count), pkg: p.name, vip: p.vip, amount: r.total, base_amount: r.base_amount,
    discount: r.discount, method: methodLabel(r.method), method_id: r.method, status: r.status, phone: r.phone,
    email: r.email, product: r.product, created: `${pad(c.getDate())}/${pad(c.getMonth() + 1)}/${c.getFullYear()} ${pad(c.getHours())}:${pad(c.getMinutes())}`,
  };
}
function publicOut(r: Res) {
  const p = load().pkgs.find((x) => x.id === r.package_id)!;
  return {
    ref: r.ref, status: r.status, live_date: r.live_date, slot_index: r.slot_index, time: timeRange(r.slot_index, r.slot_count),
    package: p.name, base_amount: r.base_amount, discount: r.discount, total: r.total, receipt_token: token(r.ref),
  };
}
function adminPkg(p: Pkg) {
  const n = load().res.filter((r) => r.package_id === p.id && r.status !== 'Annulé').length;
  return { ...p, promo_live: promoPct(p) > 0, reservations: n };
}
const publicPkg = (p: Pkg) => ({ id: p.id, name: p.name, price: p.price, tagline: p.tagline, features: p.features, badge: p.badge, slots: p.slots, vip: p.vip, promo_percent: promoPct(p), promo_until: promoPct(p) ? p.promo_until : null });

// ---------- Reçu PDF minimal ----------
function makePdf(lines: { t: string; size?: number; bold?: boolean; color?: string; y: number; x?: number; right?: boolean }[], bar: { y: number; h: number; color: string }[]): Blob {
  const enc = (s: string) => s.replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/ | /g, ' ').replace(/[\\()]/g, '\\$&');
  const rgb = (hex: string) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  let c = '1 0.973 0.945 rg 0 0 595 842 re f\n';
  for (const b of bar) c += `${rgb(b.color)} rg 48 ${b.y} 499 ${b.h} re f\n`;
  for (const l of lines) {
    const size = l.size ?? 11;
    const w = enc(l.t).length * size * 0.5;
    const x = l.right ? 547 - w : (l.x ?? 48);
    c += `BT /${l.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(l.color ?? '#1B120A')} rg ${x.toFixed(1)} ${l.y} Td (${enc(l.t)}) Tj ET\n`;
  }
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${c.length} >>\nstream\n${c}endstream`,
  ];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

function receipt(r: Res): Blob {
  const p = load().pkgs.find((x) => x.id === r.package_id)!;
  const d = new Date(r.created_at);
  const L: Parameters<typeof makePdf>[0] = [];
  const row = (label: string, value: string, y: number) => { L.push({ t: label, y, color: '#5E4E41' }); L.push({ t: value, y, right: true, bold: true }); };
  L.push({ t: 'OCD Live', size: 22, bold: true, y: 780, color: '#F06A0A' });
  L.push({ t: 'Lomé, Togo - Une initiative House of Challenge', size: 10, y: 764, color: '#5E4E41' });
  L.push({ t: 'Reçu de réservation', size: 26, bold: true, y: 710 });
  L.push({ t: `Référence  ${r.ref}`, y: 684, color: '#5E4E41' });
  L.push({ t: `Réservé le ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, y: 684, right: true, color: '#5E4E41' });
  L.push({ t: 'TON LIVE', size: 10, bold: true, y: 640, color: '#B8460A' });
  row('Date et heure', whenLabel(r.live_date, r.slot_index, r.slot_count), 616);
  row('Lieu', placeLabel(r), 592);
  row('Offre', p.name, 568);
  row('Produit présenté', r.product, 544);
  L.push({ t: 'CLIENT', size: 10, bold: true, y: 504, color: '#B8460A' });
  row('Business', r.business, 480);
  row('Contact', r.name, 456);
  row('Téléphone', r.phone, 432);
  row('Email', r.email, 408);
  L.push({ t: 'PAIEMENT', size: 10, bold: true, y: 368, color: '#B8460A' });
  row('Moyen de paiement', methodLabel(r.method), 344);
  row("Prix de l'offre", money(r.base_amount), 320);
  if (r.discount) row('Réduction', '- ' + money(r.discount), 296);
  L.push({ t: 'TOTAL PAYÉ', size: 12, bold: true, y: 252 });
  L.push({ t: money(r.total), size: 20, bold: true, y: 248, right: true });
  L.push({ t: 'Démonstration : paiement simulé, aucun montant débité.', size: 9, y: 190, color: '#5E4E41' });
  return makePdf(L, [{ y: 232, h: 52, color: '#FDE7D3' }]);
}

// ---------- Routage ----------
function route(req: HttpRequest<unknown>): unknown {
  const d = load();
  const url = req.url.slice(API_URL.length).split('?')[0];
  const m = req.method;
  const q = (k: string) => req.params.get(k) ?? '';
  const body = (req.body ?? {}) as any;
  const blob = (b: Blob) => new HttpResponse({ status: 200, body: b });

  // ----- Public -----
  if (m === 'GET' && url === '/config') return { live_start_date: d.settings.live_start_date, contact_whatsapp: d.settings.contact_whatsapp, contact_email: d.settings.contact_email, cancel_hours: d.settings.cancel_hours };
  if (m === 'GET' && url === '/packages') return d.pkgs.filter((p) => p.active).sort((a, b) => Number(a.vip) - Number(b.vip) || a.price - b.price).map(publicPkg);

  if (m === 'GET' && url === '/availability') {
    releaseStale();
    const date = q('date'), slots = Number(q('slots') || 1);
    const free = new Set(date >= firstBookable() ? freeStarts(takenOn(date), slots) : []);
    return Array.from({ length: SLOTS - slots + 1 }, (_, i) => ({ index: i, time: timeRange(i, slots), available: free.has(i) }));
  }
  if (m === 'GET' && url === '/availability/month') {
    releaseStale();
    const y = Number(q('year')), mo = Number(q('month')), slots = Number(q('slots') || 1);
    const n = new Date(y, mo, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const date = `${y}-${pad(mo)}-${pad(i + 1)}`;
      const open = date >= firstBookable();
      return { day: i + 1, free: open ? freeStarts(takenOn(date), slots).length : 0, open };
    });
  }

  if (m === 'POST' && url === '/reservations') {
    const start = d.settings.live_start_date;
    if (body.live_date < start) fail(400, `Les lives commencent le ${start.split('-').reverse().join('/')}`);
    if (body.live_date < today()) fail(400, 'Cette date est passée');
    const p = d.pkgs.find((x) => x.id === body.package_id);
    if (!p || !p.active) fail(404, 'Offre introuvable');
    if (body.slot_index + p!.slots > SLOTS) fail(400, 'Ce live est trop long pour cette heure de début');
    releaseStale();
    const taken = takenOn(body.live_date);
    for (let i = 0; i < p!.slots; i++) if (taken.has(body.slot_index + i)) fail(409, "Cette heure vient d'être réservée. Choisis-en une autre.");
    const discount = Math.round((p!.price * promoPct(p!)) / 100);
    const id = d.seq++;
    const r: Res = {
      id, ref: `OCD-${body.live_date.slice(8, 10)}${body.live_date.slice(5, 7)}-${String(id).padStart(4, '0')}`,
      mode: body.mode, country: body.mode === 'presentiel' ? 'Togo' : body.country, live_date: body.live_date, slot_index: body.slot_index,
      slot_count: p!.slots, package_id: p!.id, base_amount: p!.price, discount, total: p!.price - discount, name: String(body.name).trim(),
      business: String(body.business).trim(), product: String(body.product).trim(), phone: String(body.phone).trim(),
      email: String(body.email).toLowerCase(), method: body.payment_method, status: 'En attente', created_at: nowLocal(), hold: true,
    };
    d.res.push(r); save();
    return publicOut(r);
  }
  let mm = url.match(/^\/reservations\/([^/]+)\/pay$/);
  if (m === 'POST' && mm) {
    releaseStale();
    const r = d.res.find((x) => x.ref === mm![1]);
    if (!r) fail(404, 'Réservation introuvable');
    if (r!.status === 'Annulé') fail(409, 'Cette réservation a expiré. Recommence ta réservation.');
    r!.status = 'Payé'; save();
    return publicOut(r!);
  }
  mm = url.match(/^\/reservations\/([^/]+)\/receipt$/);
  if (m === 'GET' && mm) {
    const r = d.res.find((x) => x.ref === mm![1]);
    if (!r || q('t') !== token(r.ref)) fail(404, 'Reçu introuvable');
    if (r!.status !== 'Payé') fail(409, 'Le reçu est disponible une fois le paiement confirmé');
    return blob(receipt(r!));
  }

  // ----- Connexion -----
  if (m === 'POST' && url === '/auth/login') {
    if (String(body.email).trim().toLowerCase() !== ADMIN_EMAIL || body.password !== d.pwd) fail(401, 'Email ou mot de passe incorrect');
    return { access_token: TOKEN, token_type: 'bearer', email: ADMIN_EMAIL };
  }

  // ----- Admin (jeton requis) -----
  if (!url.startsWith('/admin') && url !== '/auth/me') fail(404, 'Introuvable');
  if (req.headers.get('Authorization') !== `Bearer ${TOKEN}`) fail(401, 'Connexion requise');
  releaseStale();
  const rows = () => d.res.slice().sort((a, b) => b.live_date.localeCompare(a.live_date) || b.slot_index - a.slot_index);
  const active = () => d.res.filter((r) => r.status !== 'Annulé');
  const getRes = (id: string) => d.res.find((r) => r.id === Number(id)) ?? fail(404, 'Réservation introuvable');

  if (m === 'GET' && url === '/admin/reservations') return rows().map(adminRow);
  mm = url.match(/^\/admin\/reservations\/(\d+)\/status$/);
  if (m === 'PATCH' && mm) {
    const r = getRes(mm[1]);
    if (body.status !== r.status) {
      if (r.status === 'Annulé') {
        const t = takenOn(r.live_date);
        for (let i = 0; i < r.slot_count; i++) if (t.has(r.slot_index + i)) fail(409, 'Ce créneau est déjà pris par une autre réservation ou bloqué');
      }
      r.status = body.status; r.hold = false; save();
    }
    return adminRow(r);
  }
  mm = url.match(/^\/admin\/reservations\/(\d+)\/receipt$/);
  if (m === 'GET' && mm) {
    const r = getRes(mm[1]);
    if (r.status !== 'Payé') fail(409, "Le reçu n'existe que pour une réservation payée");
    return blob(receipt(r));
  }
  if (m === 'GET' && url === '/admin/stats') {
    const a = active();
    return {
      count: a.length, paid: d.res.filter((r) => r.status === 'Payé').reduce((s, r) => s + r.total, 0),
      pending: d.res.filter((r) => r.status === 'En attente').reduce((s, r) => s + r.total, 0),
      remote_share: a.length ? Math.round((a.filter((r) => r.mode === 'distance').length * 100) / a.length) : 0,
      upcoming: a.filter((r) => r.live_date >= today()).length,
    };
  }
  if (m === 'GET' && url === '/admin/week') {
    const start = parse(firstBookable());
    const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const counts = days.map((x) => active().filter((r) => r.live_date === isoDate(x)).length);
    const top = Math.max(0, ...counts);
    return days.map((x, i) => ({ label: `${WEEKDAYS[(x.getDay() + 6) % 7].replace('.', '')} ${x.getDate()}`, count: counts[i], pct: top ? Math.round((counts[i] * 100) / top) : 0 }));
  }

  // Calendrier
  if (m === 'GET' && url === '/admin/calendar/month') {
    const y = Number(q('year')), mo = Number(q('month'));
    return Array.from({ length: new Date(y, mo, 0).getDate() }, (_, i) => {
      const date = `${y}-${pad(mo)}-${pad(i + 1)}`;
      const lives = active().filter((r) => r.live_date === date);
      return { day: i + 1, lives: lives.length, taken: lives.reduce((s, r) => s + r.slot_count, 0), blocked: d.blocks.filter((b) => b.date === date).length };
    });
  }
  if (m === 'GET' && url === '/admin/calendar/day') {
    const date = q('date');
    return Array.from({ length: SLOTS }, (_, i) => {
      const r = active().find((x) => x.live_date === date && i >= x.slot_index && i < x.slot_index + x.slot_count);
      const b = d.blocks.find((x) => x.date === date && x.slot === i);
      if (r) return { index: i, time: timeRange(i, 1), state: 'booked', note: null, reservation: adminRow(r) };
      if (b) return { index: i, time: timeRange(i, 1), state: 'blocked', note: b.note, reservation: null };
      return { index: i, time: timeRange(i, 1), state: 'free', note: null, reservation: null };
    });
  }
  if (m === 'POST' && url === '/admin/calendar/block') {
    if (takenOn(body.date).has(body.slot_index)) fail(409, 'Ce créneau est déjà occupé');
    d.blocks.push({ date: body.date, slot: body.slot_index, note: body.note || null }); save();
    return { ok: true };
  }
  if (m === 'DELETE' && url === '/admin/calendar/block') {
    d.blocks = d.blocks.filter((b) => !(b.date === q('date') && b.slot === Number(q('slot_index')))); save();
    return { ok: true };
  }
  if (m === 'POST' && url === '/admin/calendar/block-day') {
    const t = takenOn(body.date);
    for (let i = 0; i < SLOTS; i++) if (!t.has(i)) d.blocks.push({ date: body.date, slot: i, note: body.note || null });
    save();
    return { ok: true };
  }
  if (m === 'DELETE' && url === '/admin/calendar/block-day') {
    d.blocks = d.blocks.filter((b) => b.date !== q('date')); save();
    return { ok: true };
  }

  // Offres
  const apply = (p: Pkg, b: any) => {
    p.name = String(b.name).trim(); p.price = Number(b.price) || 0; p.tagline = String(b.tagline ?? '').trim();
    p.features = (b.features ?? []).map((f: string) => f.trim()).filter(Boolean); p.badge = !!b.badge; p.active = !!b.active;
    p.slots = Number(b.slots) || 1; p.vip = !!b.vip || p.slots > 1; p.promo_percent = Number(b.promo_percent) || 0;
    p.promo_until = p.promo_percent ? b.promo_until || null : null;
  };
  if (m === 'GET' && url === '/admin/packages') return d.pkgs.slice().sort((a, b) => Number(a.vip) - Number(b.vip) || a.price - b.price).map(adminPkg);
  if (m === 'POST' && url === '/admin/packages') {
    if (!body.name || String(body.name).trim().length < 2) fail(422, 'Donne un nom à l\'offre');
    const base = String(body.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'offre';
    let id = base, n = 2;
    while (d.pkgs.some((p) => p.id === id)) id = `${base}-${n++}`;
    const p = { id } as Pkg; apply(p, body); d.pkgs.push(p); save();
    return adminPkg(p);
  }
  mm = url.match(/^\/admin\/packages\/([^/]+)$/);
  if (mm) {
    const p = d.pkgs.find((x) => x.id === mm![1]);
    if (!p) fail(404, 'Offre introuvable');
    if (m === 'PUT') { apply(p!, body); save(); return adminPkg(p!); }
    if (m === 'DELETE') {
      if (d.res.some((r) => r.package_id === p!.id)) fail(409, 'Cette offre a des réservations : désactive-la plutôt que de la supprimer');
      d.pkgs = d.pkgs.filter((x) => x !== p); save();
      return { ok: true };
    }
  }

  // Paiements
  if (m === 'GET' && url === '/admin/payments') {
    const paid = d.res.filter((r) => r.status === 'Payé'), pend = d.res.filter((r) => r.status === 'En attente');
    const by = new Map<string, number[]>();
    paid.forEach((r) => by.set(r.method, [...(by.get(r.method) ?? []), r.total]));
    const total = paid.reduce((s, r) => s + r.total, 0);
    return {
      paid: total, paid_count: paid.length, pending: pend.reduce((s, r) => s + r.total, 0), pending_count: pend.length,
      cancelled_count: d.res.filter((r) => r.status === 'Annulé').length, average: paid.length ? Math.round(total / paid.length) : 0,
      by_method: [...by].map(([id, v]) => ({ id, label: methodLabel(id), count: v.length, amount: v.reduce((a, b) => a + b, 0) })).sort((a, b) => b.amount - a.amount),
    };
  }

  // Clients
  if (m === 'GET' && url === '/admin/clients') {
    const groups = new Map<string, Res[]>();
    rows().forEach((r) => groups.set(r.email, [...(groups.get(r.email) ?? []), r]));
    return [...groups].map(([email, rs]) => ({
      email, name: rs[0].name, business: rs[0].business, phone: rs[0].phone,
      count: rs.filter((r) => r.status !== 'Annulé').length, spent: rs.filter((r) => r.status === 'Payé').reduce((s, r) => s + r.total, 0),
      last: rs[0].live_date,
      reservations: rs.map((r) => ({ id: r.id, ref: r.ref, when: whenLabel(r.live_date, r.slot_index, r.slot_count), pkg: d.pkgs.find((p) => p.id === r.package_id)!.name, amount: r.total, status: r.status })),
    })).sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
  }

  // Paramètres
  const settingsOut = () => ({ ...d.settings, payment_simulation: true, admin_email: ADMIN_EMAIL });
  if (m === 'GET' && url === '/admin/settings') return settingsOut();
  if (m === 'PUT' && url === '/admin/settings') {
    if (!body.live_start_date) fail(422, 'Date de début invalide');
    d.settings = { live_start_date: body.live_start_date, hold_minutes: Number(body.hold_minutes) || 30, contact_whatsapp: body.contact_whatsapp ?? '', contact_email: body.contact_email ?? '', cancel_hours: Number(body.cancel_hours) || 0 };
    save();
    return settingsOut();
  }
  if (m === 'POST' && url === '/admin/password') {
    if (body.current !== d.pwd) fail(400, 'Mot de passe actuel incorrect');
    if (String(body.new).length < 8) fail(422, 'Le mot de passe doit faire au moins 8 caractères');
    d.pwd = body.new; save();
    return { ok: true };
  }
  if (m === 'GET' && url === '/admin/export.csv') {
    const head = ['Réf', 'Date', 'Heure', 'Business', 'Contact', 'Email', 'Téléphone', 'Lieu', 'Offre', 'Montant', 'Paiement', 'Statut'];
    const lines = rows().reverse().map((r) => [r.ref, r.live_date, timeRange(r.slot_index, r.slot_count), r.business, r.name, r.email, r.phone, placeLabel(r), d.pkgs.find((p) => p.id === r.package_id)!.name, r.total, methodLabel(r.method), r.status].join(';'));
    return blob(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
  }
  return fail(404, 'Introuvable');
}

export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!DEMO || !req.url.startsWith(API_URL)) return next(req);
  try {
    const out = route(req);
    return of(out instanceof HttpResponse ? out : new HttpResponse({ status: 200, body: out })).pipe(delay(180));
  } catch (e) {
    if (e instanceof ApiError) {
      return throwError(() => new HttpErrorResponse({ status: e.status, error: { detail: e.detail }, url: req.url })).pipe(delay(120));
    }
    throw e;
  }
};
