/* ============================================================
   KANKANA — booking engine + booking flow UI
   Availability · quotes with GST · holds · Razorpay · PDFs
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG;
  const KNK = (window.KNK = {});
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  /* ---------------- formatting & dates ---------------- */
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const rs = n => 'Rs. ' + Math.round(n).toLocaleString('en-IN');
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const span = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i));
  const nice = (s, opt = { weekday: 'short', day: 'numeric', month: 'short' }) => parse(s).toLocaleDateString('en-IN', opt);
  const niceLong = s => nice(s, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const hh = h => { const ap = h >= 12 ? 'PM' : 'AM'; const x = h % 12 || 12; return `${x}${h % 1 ? ':30' : ''} ${ap}`; };
  const dt = ts => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  Object.assign(KNK, { inr, ymd, parse, addDays, nice, niceLong, hh, dt, esc });

  /* ---------------- catalog ---------------- */
  const items = {};
  const A = C.all || C;
  A.venues.forEach(v => (items[v.id] = { ...v, kind: 'celebration' }));
  A.stays.forEach(s => (items[s.id] = { ...s, kind: 'stay' }));
  A.unwind.forEach(u => (items[u.id] = { ...u, kind: 'unwind' }));
  const pkg = id => A.foodPackages.find(p => p.id === id);
  const addon = id => A.addons.find(a => a.id === id);
  KNK.items = items;

  /* ---------------- storage ---------------- */
  const KEY = 'knk_bookings_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  const allBookings = () => {
    const list = load();
    let dirty = false;
    list.forEach(b => { if (b.status === 'held' && b.holdUntil && Date.now() > b.holdUntil) { b.status = 'expired'; dirty = true; } });
    if (dirty) save(list);
    return list;
  };
  const upsert = b => { const list = load(); const i = list.findIndex(x => x.id === b.id); i >= 0 ? (list[i] = b) : list.push(b); save(list); };
  KNK.getBooking = id => allBookings().find(b => b.id === id);
  KNK.listBookings = allBookings;
  const active = b => b.status !== 'expired' && b.status !== 'cancelled';

  /* ---------------- availability ----------------
     Demo: a deterministic sprinkle of existing bookings so the calendar
     looks real, plus every booking made on this device.
     Live: set C.api.availability and merge server data into `remote`. */
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
  const demo = !C.api.availability;
  const sprinkle = () => { try { return demo && !localStorage.getItem('knk_seeded'); } catch { return demo; } };

  /* ---------------- blocks (admin-closed dates) ---------------- */
  const BKEY = 'knk_blocks_v1';
  const loadBlocks = () => { try { return JSON.parse(localStorage.getItem(BKEY)) || []; } catch { return []; } };
  const saveBlocks = l => { try { localStorage.setItem(BKEY, JSON.stringify(l)); } catch {} };
  const blockOn = (res, d) => loadBlocks().find(b => b.res === res && d >= b.from && d <= b.to);
  KNK.blocks = {
    list: loadBlocks,
    add: b => { const l = loadBlocks(); l.push({ id: 'BL-' + Math.random().toString(36).slice(2, 7).toUpperCase(), ...b }); saveBlocks(l); },
    remove: id => saveBlocks(loadBlocks().filter(b => b.id !== id)),
    on: blockOn
  };
  const remote = { days: {}, units: {}, hours: {}, seats: {} };
  KNK.fetchAvailability = async (id, from, to) => {
    if (demo) return;
    try {
      const r = await fetch(`${C.api.availability}?space=${id}&from=${from}&to=${to}`);
      const j = await r.json();
      (j.dates || []).forEach(d => (remote.days[id + d] = true));
      Object.entries(j.units || {}).forEach(([d, n]) => (remote.units[id + d] = n));
      Object.entries(j.hours || {}).forEach(([d, hs]) => hs.forEach(h => (remote.hours[id + d + h] = true)));
      Object.entries(j.seats || {}).forEach(([k, n]) => (remote.seats[id + k] = n));
    } catch (e) { console.warn('availability fetch failed', e); }
  };

  const venueBooked = (id, d) => {
    if (remote.days[id + d]) return true;
    if (blockOn(id, d)) return true;
    if (sprinkle() && d > today() && hash(id + d) < 0.2) return true;
    return allBookings().some(b => active(b) && b.kind === 'celebration' && b.draft.venues.includes(id) && span(b.draft.start, b.draft.days).includes(d));
  };
  KNK.dayState = (id, d) => {
    if (blockOn(id, d)) return 'blocked';
    if (remote.days[id + d]) return 'booked';
    const b = allBookings().find(b => active(b) && b.kind === 'celebration' && b.draft.venues.includes(id) && span(b.draft.start, b.draft.days).includes(d));
    if (b) return b.status === 'held' ? 'held' : 'booked';
    if (sprinkle() && d > today() && hash(id + d) < 0.2) return hash(id + d + 'h') < 0.3 ? 'held' : 'booked';
    return 'free';
  };
  const unitsTaken = (id, d) => {
    let n = remote.units[id + d] || 0;
    const bl = blockOn(id, d); if (bl) n += bl.units || items[id].units;
    if (sprinkle() && d > today()) n += Math.floor(hash(id + d) * items[id].units * 0.6);
    allBookings().forEach(b => {
      if (!active(b)) return;
      if (b.kind === 'stay' && b.draft.stay === id && span(b.draft.checkIn, b.draft.nights).includes(d)) n += b.draft.units;
      if (b.kind === 'celebration' && span(b.draft.start, b.draft.days).includes(d)) n += (id === 'villa' ? b.draft.villas : b.draft.rooms) || 0;
    });
    return Math.min(n, items[id].units);
  };
  const unitsFree = (id, d) => items[id].units - unitsTaken(id, d);
  const minFree = (id, start, n) => Math.min(...span(start, n).map(d => unitsFree(id, d)));
  const hourBooked = (id, d, h) => {
    if (remote.hours[id + d + h]) return true;
    const now = new Date();
    if (d === today() && h <= now.getHours()) return true;
    if (blockOn(id, d)) return true;
    if (sprinkle() && hash(id + d + 'h' + h) < 0.26) return true;
    return allBookings().some(b => active(b) && b.kind === 'unwind' && b.draft.item === id && b.draft.date === d && h >= b.draft.hour && h < b.draft.hour + b.draft.hours);
  };
  const seatsTaken = (d, h) => {
    let n = remote.seats['cafe' + d + '|' + h] || 0;
    if (blockOn('cafe', d)) return items.cafe.seats;
    if (sprinkle()) n += Math.floor(hash('cafe' + d + h) * 34);
    allBookings().forEach(b => { if (active(b) && b.kind === 'unwind' && b.draft.item === 'cafe' && b.draft.date === d && b.draft.hour === h) n += b.draft.guests; });
    return Math.min(n, items.cafe.seats);
  };
  const cafeSittings = () => { const c = items.cafe, out = []; for (let h = c.open; h + c.sittingHours <= c.close; h += c.sittingHours) out.push(h); return out; };
  Object.assign(KNK, { venueBooked, unitsFree, minFree, hourBooked, seatsTaken, cafeSittings });

  /* ---------------- pricing ---------------- */
  const accRate = price => (price <= C.gst.accommodationThreshold ? C.gst.accommodationLow : C.gst.accommodationHigh);
  KNK.quote = draft => {
    const L = [];
    const add = (label, detail, amount, gst, qty, unit, rate) => amount > 0 && L.push({ label, detail, amount: Math.round(amount), gst, qty, unit, rate });
    if (draft.kind === 'celebration') {
      const days = draft.days || 0, g = draft.guests || 0;
      draft.venues.forEach(id => { const v = items[id]; if (!v) return; add(`Venue — ${v.name}`, `${days} day${days > 1 ? 's' : ''} × ${inr(v.pricePerDay)}`, v.pricePerDay * days, C.gst.venue, days, 'day', v.pricePerDay); });
      if (draft.food && pkg(draft.food)) { const p = pkg(draft.food); add(`${p.name} hospitality package${p.blurb ? ` (${p.blurb.replace(/\.$/, '').toLowerCase()})` : ''}`, `${g} guests × ${days} day${days > 1 ? 's' : ''} × ${inr(p.perGuestPerDay)}`, p.perGuestPerDay * g * days, C.gst.catering, g * days, 'guest-day', p.perGuestPerDay); }
      (draft.addons || []).forEach(id => { const a = addon(id); if (!a) return; a.per === 'guest' ? add(a.name, `${g} guests × ${inr(a.price)}`, a.price * g, C.gst.services, g, 'guest', a.price) : add(a.name, 'Per event', a.price, C.gst.services, 1, 'lot', a.price); });
      if (draft.villas) { const s = items.villa; add(`Guest stays — ${s.name.replace(/s$/, '')}`, `${draft.villas} × ${days} night${days > 1 ? 's' : ''} × ${inr(s.pricePerNight)}`, s.pricePerNight * draft.villas * days, accRate(s.pricePerNight), draft.villas * days, 'night', s.pricePerNight); }
      if (draft.rooms) { const s = items.room; add(`Guest stays — ${s.name.replace(/s$/, '')}`, `${draft.rooms} × ${days} night${days > 1 ? 's' : ''} × ${inr(s.pricePerNight)}`, s.pricePerNight * draft.rooms * days, accRate(s.pricePerNight), draft.rooms * days, 'night', s.pricePerNight); }
    } else if (draft.kind === 'stay') {
      const s = items[draft.stay];
      add(s.name, `${draft.units} ${s.unitName}${draft.units > 1 ? 's' : ''} × ${draft.nights} night${draft.nights > 1 ? 's' : ''} × ${inr(s.pricePerNight)}`, s.pricePerNight * draft.units * draft.nights, accRate(s.pricePerNight), draft.units * draft.nights, 'night', s.pricePerNight);
    } else if (draft.kind === 'unwind') {
      const u = items[draft.item];
      if (u.mode === 'hourly') add(u.name, `${draft.hours} hour${draft.hours > 1 ? 's' : ''} × ${inr(u.pricePerHour)}`, u.pricePerHour * draft.hours, C.gst[u.gstKey], draft.hours, 'hour', u.pricePerHour);
      else add(`${u.name} table`, `${draft.guests} guest${draft.guests > 1 ? 's' : ''} × ${inr(u.pricePerGuest)}`, u.pricePerGuest * draft.guests, C.gst[u.gstKey], draft.guests, 'guest', u.pricePerGuest);
    }
    (draft.custom || []).forEach(c => add(c.label || 'Custom item', `${c.qty} × ${inr(c.rate)}`, (+c.qty || 0) * (+c.rate || 0), c.gst ?? C.gst.services, +c.qty || 0, 'unit', +c.rate || 0));
    return KNK.totals(L, draft.discount, draft.kind);
  };

  /* totals from priced lines + optional discount (applied before GST, pro rata across tax rates) */
  KNK.totals = (L, discount, kind) => {
    const gross = L.reduce((s, l) => s + l.amount, 0);
    let disc = 0, dLabel = '';
    if (discount && +discount.value > 0 && gross > 0) {
      disc = discount.type === 'pct' ? Math.round(gross * Math.min(100, +discount.value) / 100) : Math.min(gross, Math.round(+discount.value));
      dLabel = discount.label || (discount.code ? `Promo ${discount.code}` : 'Discount') + (discount.type === 'pct' ? ` (${+discount.value}%)` : '');
    }
    const f = gross ? (gross - disc) / gross : 1;
    const byRate = {};
    L.forEach(l => { byRate[l.gst] = byRate[l.gst] || { rate: l.gst, taxable: 0, tax: 0 }; byRate[l.gst].taxable += l.amount; });
    const taxes = Object.values(byRate).sort((a, b) => a.rate - b.rate).map(t => ({ ...t, taxable: Math.round(t.taxable * f) }));
    const subtotal = gross - disc;
    if (taxes.length) taxes[taxes.length - 1].taxable += subtotal - taxes.reduce((s, t) => s + t.taxable, 0); // rounding fix
    taxes.forEach(t => (t.tax = Math.round(t.taxable * t.rate / 100)));
    const gst = taxes.reduce((s, t) => s + t.tax, 0);
    const total = subtotal + gst;
    const pol = C.policy[kind];
    return { lines: L, gross, discount: disc, discountLabel: dLabel, discountSpec: disc ? { ...discount } : null, taxes, subtotal, gst, total, advancePct: pol.advancePct, advance: Math.round((pol.advancePct >= 100 ? total : subtotal) * pol.advancePct / 100), holdHours: pol.holdHours };
    // quotations are shown excluding GST, so the advance is a share of the quoted (pre-GST) amount; GST is charged on the tax invoice
  };
  /* re-price an existing booking with a new discount, keeping its original prices */
  KNK.applyDiscount = (b, discount) => {
    const q = KNK.totals(b.quote.lines, discount, b.kind);
    b.quote = { ...q, holdHours: b.quote.holdHours };
    b.draft.discount = discount || null;
    if (b.payments.length) b.status = paidSum(b) >= b.quote.total ? 'paid' : 'confirmed';
    upsert(b); remoteSave(b, 'discount');
    KNK.logEmail(b, 'quotation-revised', `Revised quotation for ${b.id}`);
    return b;
  };

  /* ---------------- promo codes ---------------- */
  const PKEY = 'knk_promos_v1';
  KNK.promos = {
    list: () => { try { return JSON.parse(localStorage.getItem(PKEY)) || []; } catch { return []; } },
    save: l => { try { localStorage.setItem(PKEY, JSON.stringify(l)); } catch {} },
    check(code, draft) {
      const p = this.list().find(x => x.code.toUpperCase() === String(code || '').trim().toUpperCase());
      if (!p || p.active === false) return { ok: false, msg: 'That code isn\'t valid.' };
      const t = today();
      if (p.from && t < p.from) return { ok: false, msg: 'That code isn\'t active yet.' };
      if (p.to && t > p.to) return { ok: false, msg: 'That code has expired.' };
      if (p.appliesTo && p.appliesTo !== 'all' && p.appliesTo !== draft.kind) return { ok: false, msg: `That code is only for ${p.appliesTo === 'celebration' ? 'celebrations' : p.appliesTo === 'stay' ? 'stays' : 'turf, court & café'}.` };
      if (p.maxUses && (p.uses || 0) >= p.maxUses) return { ok: false, msg: 'That code has been fully used.' };
      const gross = KNK.quote({ ...draft, discount: null }).gross;
      if (p.minSpend && gross < p.minSpend) return { ok: false, msg: `Spend at least ${inr(p.minSpend)} (before GST) to use this code.` };
      return { ok: true, discount: { type: p.type, value: p.value, code: p.code.toUpperCase() } };
    },
    use(code) { const l = this.list(); const p = l.find(x => x.code.toUpperCase() === code.toUpperCase()); if (p) { p.uses = (p.uses || 0) + 1; this.save(l); } }
  };

  /* ---------------- automated email log (outbox) ---------------- */
  const OKEY = 'knk_outbox_v1';
  KNK.outbox = { list: () => { try { return JSON.parse(localStorage.getItem(OKEY)) || []; } catch { return []; } } };
  KNK.logEmail = (b, type, subject) => {
    const l = KNK.outbox.list();
    const attach = { created: ['Quotation'], 'quotation-revised': ['Revised quotation'], payment: ['Tax invoice', 'Receipt'], cancelled: [], 'hold-extended': [], reminder: ['Quotation'] }[type] || [];
    l.push({ id: rid(8), at: Date.now(), type, to: b.customer.email, name: b.customer.name, bookingId: b.id, subject, attach, status: C.api.saveBooking ? 'queued' : 'not-sent' });
    try { localStorage.setItem(OKEY, JSON.stringify(l.slice(-500))); } catch {}
  };

  /* ---------------- bookings & payments ---------------- */
  const rid = (n = 6) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  /* sequential numbers (GST invoices must be numbered in sequence within a financial year) */
  const fy = (d = new Date()) => { const y = d.getFullYear() % 100, m = d.getMonth(); return m >= 3 ? `${pad(y)}-${pad(y + 1)}` : `${pad(y - 1)}-${pad(y)}`; };
  const CKEY = 'knk_counters_v1';
  const nextNo = key => { let c = {}; try { c = JSON.parse(localStorage.getItem(CKEY)) || {}; } catch {} c[key] = (c[key] || 0) + 1; try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch {} return c[key]; };
  const docNo = prefix => { const k = { QT: 'Q', INV: 'INV', RC: 'RC' }[prefix] || prefix; const f = fy(); return `KNK/${k}/${f}/${String(nextNo(k + f)).padStart(4, '0')}`; };
  const newId = () => 'KNK-' + (1000 + nextNo('booking'));
  KNK.fy = fy;
  const paidSum = b => b.payments.reduce((s, p) => s + p.amount, 0);
  KNK.paidSum = paidSum;
  KNK.balance = b => Math.max(0, b.quote.total - paidSum(b));

  KNK.createBooking = (draft, customer) => {
    const quote = KNK.quote(draft);
    const b = {
      id: newId(), kind: draft.kind, draft: JSON.parse(JSON.stringify(draft)), customer, quote,
      createdAt: Date.now(), status: 'held', quotationNo: docNo('QT'), invoiceNo: null, payments: [],
      holdUntil: quote.holdHours ? Date.now() + quote.holdHours * 3600e3 : null
    };
    upsert(b);
    remoteSave(b, 'created');
    if (draft.discount?.code) KNK.promos.use(draft.discount.code);
    KNK.logEmail(b, 'created', `Your Kankana quotation ${b.quotationNo}`);
    return b;
  };
  KNK.recordPayment = (b, amount, pay) => {
    if (!b.invoiceNo) b.invoiceNo = docNo('INV');
    b.payments.push({ id: pay.id, amount, method: pay.method, at: Date.now(), receiptNo: docNo('RC') });
    b.status = paidSum(b) >= b.quote.total ? 'paid' : 'confirmed';
    b.holdUntil = null;
    upsert(b);
    remoteSave(b, 'payment');
    KNK.logEmail(b, 'payment', `Payment received: ${inr(amount)} for ${b.id}`);
    return b;
  };
  async function remoteSave(b, event) {
    if (!C.api.saveBooking) return;
    try { await fetch(C.api.saveBooking, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, booking: b }) }); } catch (e) { console.warn(e); }
  }
  KNK.saveBooking = b => { upsert(b); remoteSave(b, 'admin-update'); };
  KNK.cancelBooking = (id, reason) => { const b = KNK.getBooking(id); if (!b) return; b.status = 'cancelled'; b.cancelledAt = Date.now(); b.cancelReason = reason || ''; b.holdUntil = null; upsert(b); remoteSave(b, 'cancelled'); KNK.logEmail(b, 'cancelled', `Booking ${b.id} cancelled`); return b; };
  KNK.extendHold = (id, hours) => { const b = KNK.getBooking(id); if (!b) return; b.holdUntil = Math.max(Date.now(), b.holdUntil || 0) + hours * 3600e3; b.status = 'held'; upsert(b); remoteSave(b, 'hold-extended'); KNK.logEmail(b, 'hold-extended', `Your dates are held until ${dt(b.holdUntil)}`); return b; };

  /* ---------------- enquiries ---------------- */
  const EKEY = 'knk_enquiries';
  KNK.enquiries = {
    list: () => { try { return JSON.parse(localStorage.getItem(EKEY)) || []; } catch { return []; } },
    save: l => { try { localStorage.setItem(EKEY, JSON.stringify(l)); } catch {} }
  };

  /* ---------------- sample data for the admin demo ---------------- */
  KNK.seedDemo = () => {
    const names = [['Aarav Mehta', 'aarav.mehta'], ['Ishita Rao', 'ishita.rao'], ['Rohan Kapoor', 'rohan.k'], ['Meera Iyer', 'meera.iyer'], ['Kabir Singh', 'kabir.s'], ['Ananya Desai', 'ananya.d'], ['Vikram Nair', 'vikram.nair'], ['Sneha Kulkarni', 'sneha.k'], ['Arjun Reddy', 'arjun.r'], ['Pooja Bhatt', 'pooja.b'], ['Nikhil Joshi', 'nikhil.j'], ['Tara Menon', 'tara.m'], ['Infosys Pune Team', 'events.team'], ['Zoya Khan', 'zoya.k']];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pickN = a => a[Math.floor(rnd() * a.length)];
    const list = [];
    const mk = (kind, draft, dayOffset, createdOffset, payPlan) => {
      const [nm, em] = pickN(names);
      const quote = KNK.quote({ kind, ...draft });
      const created = Date.now() + createdOffset * 864e5;
      const b = { id: newId(), kind, draft: { kind, ...draft }, customer: { name: nm, email: em + '@example.com', phone: '+91 98' + Math.floor(10000000 + rnd() * 89999999), notes: '' }, quote, createdAt: created, status: 'held', quotationNo: docNo('QT'), invoiceNo: null, payments: [], holdUntil: null };
      const pays = payPlan === 'full' ? [quote.total] : payPlan === 'adv' ? [quote.advance] : payPlan === 'advbal' ? [quote.advance, quote.total - quote.advance] : [];
      pays.forEach((amt, i) => { if (!b.invoiceNo) b.invoiceNo = docNo('INV'); b.payments.push({ id: 'pay_demo_' + rid(10), amount: amt, method: pickN(['UPI (demo)', 'Card (demo)', 'Netbanking (demo)', 'Bank transfer']), at: Math.min(Date.now(), created + i * 20 * 864e5 + 3600e3), receiptNo: docNo('RC') }); });
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      b.status = !pays.length ? (payPlan === 'expired' ? 'expired' : 'held') : paid >= quote.total ? 'paid' : 'confirmed';
      if (b.status === 'held') b.holdUntil = Date.now() + (kind === 'celebration' ? 30 + rnd() * 40 : 4 + rnd() * 18) * 3600e3;
      list.push(b);
    };
    const dOff = n => addDays(today(), n);
    const V = C.venues.map(v => v.id);
    // celebrations across the last 5 months and next 3
    [[-140, -200, 'advbal'], [-118, -170, 'advbal'], [-95, -150, 'advbal'], [-74, -120, 'advbal'], [-52, -100, 'advbal'], [-30, -80, 'advbal'], [-12, -60, 'advbal'], [6, -45, 'adv'], [19, -38, 'adv'], [33, -25, 'adv'], [47, -14, 'adv'], [61, -2, 'hold'], [75, -1, 'hold'], [88, -6, 'expired']].forEach(([day, made, plan], i) => {
      const venues = i % 3 === 0 ? [V[i % 6], 'amphi'] : [V[(i * 2) % 6]];
      const uniq = [...new Set(venues)];
      const cap = Math.max(...uniq.map(v => items[v].capacity));
      mk('celebration', { venues: uniq, start: dOff(day), days: 1 + (i % 3), guests: Math.round(cap * (0.5 + rnd() * 0.45)), food: pickN(['essential', 'signature', 'royal', null]), addons: ['photo', 'mandap', 'sangeet', 'kits'].filter(() => rnd() > 0.45), villas: Math.floor(rnd() * 4), rooms: Math.floor(rnd() * 8), eventType: pickN(['Wedding', 'Wedding', 'Engagement', 'Corporate event', 'Birthday', 'Anniversary']) }, day, made, plan);
    });
    // stays
    for (let i = 0; i < 16; i++) {
      const day = -120 + i * 12 + Math.floor(rnd() * 6);
      const stay = i % 3 ? 'room' : 'villa';
      const units = stay === 'villa' ? 1 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
      mk('stay', { stay, checkIn: dOff(day), nights: 1 + Math.floor(rnd() * 4), units, guests: units * (stay === 'villa' ? 4 : 2) }, day, day - 10, day < 0 ? 'advbal' : (i % 4 === 0 ? 'hold' : 'adv'));
    }
    // unwind sessions
    for (let i = 0; i < 28; i++) {
      const day = -100 + i * 4;
      const item = pickN(['turf', 'turf', 'pickleball', 'cafe']);
      const u = items[item];
      const draft = u.mode === 'hourly' ? { item, date: dOff(day), hour: u.open + 1 + Math.floor(rnd() * (u.close - u.open - 4)), hours: 1 + Math.floor(rnd() * 2), players: Math.min(u.maxPlayers, 2 + Math.floor(rnd() * u.maxPlayers)) }
        : { item, date: dOff(day), hour: pickN(cafeSittings()), guests: 2 + Math.floor(rnd() * 6) };
      mk('unwind', draft, day, day - 2, 'full');
    }
    // a few for today so the "Today" panel has content
    mk('unwind', { item: 'turf', date: today(), hour: 18, hours: 2, players: 14 }, 0, -1, 'full');
    mk('unwind', { item: 'pickleball', date: today(), hour: 19, hours: 1, players: 4 }, 0, -1, 'full');
    mk('unwind', { item: 'cafe', date: today(), hour: 20, guests: 6 }, 0, -1, 'full');
    mk('stay', { stay: 'villa', checkIn: today(), nights: 2, units: 2, guests: 7 }, 0, -6, 'adv');
    save([...load(), ...list]);
    KNK.enquiries.save([...KNK.enquiries.list(),
      { name: 'Riya Malhotra', phone: '+91 99200 11223', email: 'riya.m@example.com', occasion: 'Wedding', guests: '450', date: dOff(150), message: 'Looking at a 3-day wedding in February. Need the Colonnade and Reception Hall plus ~10 villas.', at: Date.now() - 3600e3 * 5, status: 'new' },
      { name: 'Sahil Verma', phone: '+91 98111 22334', email: 'sahil@example.com', occasion: 'Corporate event', guests: '120', date: dOff(40), message: 'Offsite for our sales team, 2 days, need a stage and the turf for team games.', at: Date.now() - 3600e3 * 26, status: 'new' },
      { name: 'Neha Gupta', phone: '+91 97000 44556', email: 'neha.g@example.com', occasion: 'Birthday', guests: '60', date: dOff(18), message: 'Surprise 40th for my husband at the Sunset Terrace?', at: Date.now() - 3600e3 * 50, status: 'contacted', note: 'Called, sending quote.' },
      { name: 'Farhan Ali', phone: '+91 96000 77889', email: 'farhan.a@example.com', occasion: 'Anniversary', guests: '25', date: '', message: 'Do you do private dinners by the pool?', at: Date.now() - 3600e3 * 98, status: 'converted' }
    ]);
    if (!KNK.promos.list().length) KNK.promos.save([
      { code: 'MONSOON10', type: 'pct', value: 10, appliesTo: 'stay', minSpend: 0, from: today(), to: addDays(today(), 60), maxUses: 0, uses: 3, active: true, createdAt: Date.now() },
      { code: 'WEDDING50K', type: 'flat', value: 50000, appliesTo: 'celebration', minSpend: 1000000, from: today(), to: '', maxUses: 20, uses: 1, active: true, createdAt: Date.now() }
    ]);
    try { localStorage.setItem('knk_seeded', '1'); } catch {}
  };
  KNK.clearAll = () => { try { ['knk_bookings_v1', 'knk_blocks_v1', 'knk_enquiries', 'knk_seeded', 'knk_counters_v1', 'knk_outbox_v1', 'knk_promos_v1'].forEach(k => localStorage.removeItem(k)); } catch {} };

  KNK.statusInfo = b => ({
    held: { label: 'On hold', tone: 'hold', note: b.holdUntil ? `Dates held until ${dt(b.holdUntil)}. Pay the ${b.quote.advancePct}% advance to confirm.` : '' },
    confirmed: { label: 'Confirmed', tone: 'ok', note: `Advance received. Balance due: ${inr(KNK.balance(b))}.` },
    paid: { label: 'Paid in full', tone: 'ok', note: 'Thank you. Everything is settled.' },
    expired: { label: 'Hold expired', tone: 'bad', note: 'The hold ran out before payment. Start a new booking to check the dates again.' },
    cancelled: { label: 'Cancelled', tone: 'bad', note: '' }
  }[b.status]);

  KNK.describe = b => {
    const d = b.draft;
    if (b.kind === 'celebration') return { title: d.venues.map(v => items[v].name).join(' + '), when: d.days > 1 ? `${niceLong(d.start)} → ${niceLong(addDays(d.start, d.days - 1))} · ${d.days} days` : `${niceLong(d.start)} · 1 day`, who: `${d.guests} guests${d.eventType ? ' · ' + d.eventType : ''}` };
    if (b.kind === 'stay') { const s = items[d.stay]; return { title: s.name, when: `${niceLong(d.checkIn)} → ${niceLong(addDays(d.checkIn, d.nights))} · ${d.nights} night${d.nights > 1 ? 's' : ''}`, who: `${d.units} ${s.unitName}${d.units > 1 ? 's' : ''} · ${d.guests} guests` }; }
    const u = items[d.item];
    return u.mode === 'hourly'
      ? { title: u.name, when: `${niceLong(d.date)} · ${hh(d.hour)} – ${hh(d.hour + d.hours)}`, who: `${d.players} players` }
      : { title: u.name, when: `${niceLong(d.date)} · ${hh(d.hour)} – ${hh(d.hour + u.sittingHours)}`, who: `${d.guests} guests` };
  };

  /* ---------------- checkout (Razorpay or demo) ---------------- */
  const loadScript = src => new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });

  KNK.checkout = async ({ amount, booking, title }) => {
    const live = !C.payments.demoMode && C.payments.razorpayKeyId;
    if (!live) return demoCheckout({ amount, booking, title });
    await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    let order = null;
    if (C.api.createOrder) {
      const r = await fetch(C.api.createOrder, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, amount: Math.round(amount * 100) }) });
      order = await r.json();
    }
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: C.payments.razorpayKeyId, amount: Math.round(amount * 100), currency: 'INR',
        name: C.business.name, description: title, order_id: order?.id,
        prefill: { name: booking.customer.name, email: booking.customer.email, contact: booking.customer.phone },
        notes: { booking_id: booking.id }, theme: { color: C.payments.themeColor },
        handler: async resp => {
          if (C.api.verifyPayment) {
            const v = await fetch(C.api.verifyPayment, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...resp, bookingId: booking.id }) });
            if (!v.ok) return reject(new Error('Payment verification failed'));
          }
          resolve({ id: resp.razorpay_payment_id, method: 'Razorpay' });
        },
        modal: { ondismiss: () => reject(new Error('dismissed')) }
      });
      rzp.open();
    });
  };

  function demoCheckout({ amount, booking, title }) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('div');
      el.className = 'pay';
      el.innerHTML = `
        <div class="pay-card" role="dialog" aria-modal="true" aria-label="Payment">
          <div class="pay-head"><div><p class="pay-k">${esc(C.business.name)}</p><p class="pay-t">${esc(title)}</p></div><button class="pay-x" aria-label="Close">×</button></div>
          <p class="pay-amt">${inr(amount)}</p>
          <div class="pay-tabs" role="tablist">
            <button class="is-on" data-m="UPI">UPI</button><button data-m="Card">Card</button><button data-m="Netbanking">Netbanking</button>
          </div>
          <div class="pay-body">
            <div data-p="UPI"><label>UPI ID<input value="name@okbank" inputmode="email"></label></div>
            <div data-p="Card" hidden><label>Card number<input value="4111 1111 1111 1111" inputmode="numeric"></label><div class="pay-row"><label>Expiry<input value="12/30"></label><label>CVV<input value="123" inputmode="numeric"></label></div></div>
            <div data-p="Netbanking" hidden><label>Bank<select><option>HDFC Bank</option><option>ICICI Bank</option><option>State Bank of India</option><option>Axis Bank</option><option>Kotak Mahindra Bank</option></select></label></div>
          </div>
          <button class="pay-go">Pay ${inr(amount)}</button>
          <p class="pay-note">Demo checkout: no money is taken. Add your Razorpay key in <b>config.js</b> to take real payments.</p>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      let method = 'UPI';
      $$('.pay-tabs button', el).forEach(b => b.onclick = () => {
        method = b.dataset.m;
        $$('.pay-tabs button', el).forEach(x => x.classList.toggle('is-on', x === b));
        $$('[data-p]', el).forEach(p => (p.hidden = p.dataset.p !== method));
      });
      const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
      $('.pay-x', el).onclick = () => { close(); reject(new Error('dismissed')); };
      $('.pay-go', el).onclick = () => {
        const btn = $('.pay-go', el);
        btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Processing…';
        setTimeout(() => {
          $('.pay-card', el).innerHTML = `<div class="pay-done"><span class="tick"></span><p class="pay-t">Payment successful</p><p class="pay-k">${inr(amount)} · ${method}</p></div>`;
          setTimeout(() => { close(); resolve({ id: 'pay_demo_' + rid(10), method: method + ' (demo)' }); }, 1100);
        }, 1300);
      };
    });
  }

  /* ---------------- toasts ---------------- */
  KNK.toast = msg => {
    let wrap = $('.toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg; wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 500); }, 4200);
  };
  KNK.emailNote = (b, what) => KNK.toast(C.api.saveBooking ? `${what} emailed to ${b.customer.email}` : `${what} would be emailed to ${b.customer.email} (demo: connect api.saveBooking to send emails)`);

  /* ---------------- PDF documents ---------------- */
  /* logo for documents: your PNG if present, else a drawn monogram */
  let logoData;
  const loadLogo = () => logoData !== undefined ? Promise.resolve(logoData) : new Promise(res => {
    const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); const sc = Math.min(1, 320 / im.naturalWidth); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); logoData = { url: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }; } catch { logoData = null; } res(logoData); };
    im.onerror = () => { logoData = null; res(null); };
    im.src = 'assets/brand/kankana-logo.png';
  });

  KNK.pdf = async (type, b, payment) => {
    if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const logo = await loadLogo();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595, H = 842, M = 46, R = W - M;
    const clean = t => String(t ?? '').replace(/→/g, 'to').replace(/₹/g, 'Rs. ').replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, '');
    const rsn = n => 'Rs. ' + Math.round(n).toLocaleString('en-IN');
    const gold = [178, 132, 74], ink = [26, 22, 22], mute = [112, 106, 104], line = [222, 214, 204], maroon = [52, 14, 22], cream = [248, 242, 232];
    const BZ = C.business, q = b.quote, d = KNK.describe(b);
    const titles = { quotation: 'QUOTATION', invoice: 'TAX INVOICE', receipt: 'PAYMENT RECEIPT' };
    const no = type === 'quotation' ? b.quotationNo : type === 'invoice' ? b.invoiceNo : payment.receiptNo;
    const when = type === 'receipt' ? payment.at : type === 'invoice' ? (b.payments[0]?.at || Date.now()) : b.createdAt;
    const dshort = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const label = (t, x, y) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gold); doc.text(t.split('').join(' ').replace(/ {3}/g, '   '), x, y, { charSpace: 0.6 }); };
    const frame = () => { doc.setDrawColor(...line); doc.setLineWidth(0.6); doc.rect(16, 16, W - 32, H - 32); };
    frame();

    // ---- header ----
    let y = 46;
    if (logo) { const h = 62, w = logo.w / logo.h * h; doc.addImage(logo.url, 'PNG', M, y - 6, w, h); }
    else {
      doc.setDrawColor(...gold); doc.setLineWidth(0.9);
      doc.lines([[0, -26], [10, -12, 18, -14, 18, -18]], M + 4, y + 44, [1, 1], 'S', false); // simple arch
      doc.lines([[0, -26], [-10, -12, -18, -14, -18, -18]], M + 40, y + 44, [1, 1], 'S', false);
      doc.setFont('times', 'bold'); doc.setFontSize(30); doc.setTextColor(...gold); doc.text('K', M + 22, y + 40, { align: 'center' });
    }
    const lx = M + (logo ? 74 : 58);
    doc.setFont('times', 'normal'); doc.setFontSize(24); doc.setTextColor(...ink); doc.text('KANKANA', lx, y + 22, { charSpace: 7 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gold); doc.text('VENUE & RESORTS', lx, y + 38, { charSpace: 2.4 });
    doc.setFontSize(8.5); doc.setTextColor(...mute);
    doc.text([clean(BZ.legalName && !/^\[/.test(BZ.legalName) ? BZ.legalName : BZ.name), clean(BZ.address), clean(`${BZ.email} · ${BZ.phone}`), BZ.gstin && !/^\[/.test(BZ.gstin) ? `GSTIN ${clean(BZ.gstin)}` : ''].filter(Boolean), R, y + 2, { align: 'right', lineHeightFactor: 1.5 });
    y += 72;
    doc.setDrawColor(...line); doc.setLineWidth(0.8); doc.line(M, y, R, y);

    // ---- title row ----
    y += 34;
    doc.setFont('times', 'normal'); doc.setFontSize(24); doc.setTextColor(...ink); doc.text(titles[type], M, y, { charSpace: 4 });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(clean(no), R, y - 14, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...ink);
    const meta = [`Date ${dshort(when)}`];
    if (type === 'quotation') meta.push(`Valid until ${dshort(b.createdAt + (C.policy.quoteValidDays || 7) * 864e5)}`);
    else meta.push(`Booking ${b.id}`);
    doc.text(meta, R, y - 1, { align: 'right', lineHeightFactor: 1.45 });

    // ---- parties ----
    y += 30;
    const colX = M + (R - M) / 2 + 10;
    label('BILLED TO', M, y); label({ celebration: 'CELEBRATION', stay: 'STAY', unwind: 'BOOKING' }[b.kind], colX, y);
    y += 15;
    const c = b.customer;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...ink); doc.text(clean(c.name), M, y);
    doc.setFont('helvetica', 'normal');
    const billed = [c.email, c.phone, [c.city, c.state].filter(Boolean).join(', '), c.gstin ? `GSTIN ${c.gstin}` : ''].filter(Boolean).map(clean);
    doc.text(billed, M, y + 13, { lineHeightFactor: 1.45 });
    const vt = b.kind === 'celebration' ? (K_items(b.draft.venues[0])?.type || 'Venue') : '';
    const typeTag = vt ? ' · ' + (vt === 'Venue' ? 'Event venue' : vt) : '';
    doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize(clean(d.title + typeTag), R - colX), colX, y);
    doc.setFont('helvetica', 'normal');
    const extra = [];
    if (b.kind === 'celebration') {
      const x = b.draft, p = x.food && A.foodPackages.find(f => f.id === x.food);
      extra.push(clean(d.when.replace(/ \d{4}/g, m => m)));
      extra.push(clean([`${x.guests} guests`, p ? `${p.name} package` : '', x.villas ? `${x.villas} Private Villa${x.villas > 1 ? 's' : ''} per night` : '', x.rooms ? `${x.rooms} Guest Room${x.rooms > 1 ? 's' : ''} per night` : ''].filter(Boolean).join(' · ')));
    } else { extra.push(clean(d.when)); extra.push(clean(d.who)); }
    extra.push(`Booking ref ${b.id}`);
    const ex = doc.splitTextToSize(extra.join('\n'), R - colX);
    doc.text(ex, colX, y + 13, { lineHeightFactor: 1.45 });
    y += 13 + Math.max(billed.length, ex.length) * 12.5 + 14;

    const footer = () => {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...mute);
        doc.text(`Computer-generated document · ${clean(BZ.name)} · Page ${i} of ${n}`, W / 2, H - 30, { align: 'center' });
        if (C.payments.demoMode) { doc.setTextColor(190, 120, 110); doc.text('DEMO — not a valid tax document until live payments and your GSTIN are set up.', W / 2, H - 42, { align: 'center' }); }
      }
    };
    const need = h => { if (y + h > H - 70) { doc.addPage(); frame(); y = 56; } };

    if (type !== 'receipt') {
      // ---- line items ----
      const cx = { n: M + 8, d: M + 30, q: R - 170, r: R - 92, a: R - 8 };
      doc.setFillColor(...cream); doc.rect(M, y, R - M, 22, 'F');
      doc.setFontSize(7.5); doc.setTextColor(...mute);
      doc.text('#', cx.n, y + 14); doc.text('DESCRIPTION', cx.d, y + 14, { charSpace: 0.8 });
      doc.text('QTY', cx.q, y + 14, { align: 'right', charSpace: 0.8 }); doc.text('RATE', cx.r, y + 14, { align: 'right', charSpace: 0.8 }); doc.text('AMOUNT', cx.a, y + 14, { align: 'right', charSpace: 0.8 });
      y += 22;
      q.lines.forEach((l, i) => {
        doc.setFontSize(8.8);
        const desc = doc.splitTextToSize(clean(l.label), cx.q - cx.d - 70);
        const h = Math.max(1, desc.length) * 11.5 + 10;
        need(h + 4);
        doc.setTextColor(...mute); doc.text(String(i + 1), cx.n, y + 14);
        doc.setTextColor(...ink); doc.text(desc, cx.d, y + 14, { lineHeightFactor: 1.3 });
        doc.setTextColor(...mute); doc.setFontSize(8.2);
        doc.text(l.qty != null ? `${+(+l.qty).toFixed(2)} ${l.unit || ''}`.trim() : '-', cx.q, y + 14, { align: 'right' });
        doc.setTextColor(...ink); doc.setFontSize(8.8);
        doc.text(l.rate != null ? rsn(l.rate) : '-', cx.r, y + 14, { align: 'right' });
        doc.text(rsn(l.amount), cx.a, y + 14, { align: 'right' });
        y += h;
        doc.setDrawColor(...line); doc.setLineWidth(0.5); doc.line(M, y, R, y);
      });

      // ---- totals ----
      y += 10; need(150);
      const tx = R - 210;
      const row = (k, v, opt = {}) => { doc.setFont('helvetica', opt.bold ? 'bold' : 'normal'); doc.setFontSize(opt.size || 8.8); doc.setTextColor(...(opt.color || ink)); doc.text(k, tx, y); doc.text(v, R - 8, y, { align: 'right' }); y += opt.gap || 15; };
      if (q.discount) { row('Gross', rsn(q.gross)); row(clean(q.discountLabel), '- ' + rsn(q.discount), { color: [60, 130, 80] }); }
      if (type === 'quotation') {
        row('Total (excl. GST)', rsn(q.subtotal), { bold: true, size: 12, gap: 14 });
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7.8); doc.setTextColor(...mute);
        doc.text('GST at the applicable rates will be added on the tax invoice.', tx, y); y += 16;
      }
      if (type !== 'quotation') row('Taxable value', rsn(q.subtotal));
      if (type !== 'quotation') q.taxes.forEach(t => {
        if (type === 'invoice' && C.gst.intraState) { row(`CGST @ ${t.rate / 2}% on ${rsn(t.taxable)}`, rsn(t.tax / 2)); row(`SGST @ ${t.rate / 2}% on ${rsn(t.taxable)}`, rsn(t.tax / 2)); }
        else row(`${C.gst.intraState ? 'GST' : 'IGST'} @ ${t.rate}% on ${rsn(t.taxable)}`, rsn(t.tax));
      });
      if (type !== 'quotation') { y += 4; doc.setDrawColor(...ink); doc.setLineWidth(1); doc.line(tx - 6, y, R, y); y += 18; row('Total', rsn(q.total), { bold: true, size: 12, gap: 12 }); }
      const band = (k, v) => { doc.setFillColor(...maroon); doc.rect(tx - 6, y, R - tx + 6, 24, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); doc.text(k, tx + 2, y + 15.5); doc.setFont('helvetica', 'bold'); doc.text(v, R - 8, y + 15.5, { align: 'right' }); y += 34; };
      if (type === 'quotation') band(q.advancePct >= 100 ? 'Payable at booking' : `Advance to confirm (${q.advancePct}%)`, q.advancePct >= 100 ? rsn(q.subtotal) + ' + GST' : rsn(q.advance));
      else { row('Paid to date', rsn(paidSum(b))); band('Balance due', rsn(KNK.balance(b))); }
    } else {
      // ---- receipt body ----
      const rows = [['Amount received', rsn(payment.amount)], ['Payment method', clean(payment.method)], ['Payment reference', clean(payment.id)], ['Against invoice', clean(b.invoiceNo || '-')], ['Booking total', rsn(q.total)], ['Paid to date', rsn(paidSum(b))], ['Balance due', rsn(KNK.balance(b))]];
      doc.setFontSize(9.5);
      rows.forEach(([k, v], i) => { doc.setFillColor(...(i % 2 ? [255, 255, 255] : cream)); doc.rect(M, y, R - M, 24, 'F'); doc.setTextColor(...mute); doc.text(k, M + 10, y + 15.5); doc.setTextColor(...ink); doc.setFont('helvetica', i === 0 ? 'bold' : 'normal'); doc.text(v, R - 10, y + 15.5, { align: 'right' }); doc.setFont('helvetica', 'normal'); y += 24; });
      y += 16;
    }

    // ---- terms + how to pay ----
    y += 14; need(120);
    const colW = (R - M) / 2 - 16, y0 = y;
    label(type === 'receipt' ? 'NOTE' : 'TERMS', M, y);
    let ty = y + 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mute);
    const terms = type === 'receipt' ? ['Thank you for your payment. Keep this receipt for your records.'] : (C.terms || []).map((t, i) => `${i + 1}. ${t}`);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mute);
    terms.forEach(t => { const ln = doc.splitTextToSize(clean(t), colW); doc.text(ln, M, ty, { lineHeightFactor: 1.35 }); ty += ln.length * 10.8 + 1; });
    label(type === 'quotation' ? 'HOW TO PAY' : 'MANAGE YOUR BOOKING', colX, y);
    const link = new URL(`mybooking.html?id=${b.id}`, location.href).href.replace(/^https?:\/\//, '');
    const pay = [type === 'quotation' ? 'Pay securely online (UPI, cards, netbanking) at' : 'View documents and pay any balance at', link, `using booking ID ${b.id}.`];
    if (c.notes) pay.push(`Notes: ${c.notes}`);
    let py = y + 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mute);
    pay.forEach(t => { const ln = doc.splitTextToSize(clean(t), colW); doc.text(ln, colX, py, { lineHeightFactor: 1.35 }); py += ln.length * 10.8 + 1; });
    if (type === 'quotation' && b.kind === 'celebration' && C.policy.celebration.balanceDueDays) {
      const ln = doc.splitTextToSize(`Balance due by ${clean(niceLong(addDays(b.draft.start, -C.policy.celebration.balanceDueDays)))}.`, colW); doc.text(ln, colX, py); py += ln.length * 10.8;
    }
    y = Math.max(ty, py) + 26;

    // ---- signatory (kept on the same page when it fits) ----
    need(44);
    doc.setFont('times', 'italic'); doc.setFontSize(15); doc.setTextColor(...gold); doc.text(clean(BZ.legalName && !/^\[/.test(BZ.legalName) ? BZ.legalName : BZ.name), R, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...mute); doc.text('Authorised signatory', R, y + 12, { align: 'right' });
    footer();
    doc.setProperties({ title: `${titles[type][0] + titles[type].slice(1).toLowerCase()} ${no}`, creator: 'Kankana' });
    doc.save(`Kankana-${titles[type].split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join('-')}-${b.id}${type === 'receipt' ? '-' + no.split('/').pop() : ''}.pdf`);
  };
  const K_items = id => items[id];


  /* ============================================================
     CALENDAR
     ============================================================ */
  function Calendar(host, opt) {
    // opt: mode 'single'|'days'|'nights', max, isFree(d), value {start, end}, onChange
    let view = parse(opt.value?.start || today()); view.setDate(1);
    let start = opt.value?.start || null, end = opt.value?.end || null;
    const maxDate = addDays(today(), 540);
    const render = () => {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const canPrev = ymd(first) > today();
      let cells = '';
      for (let i = 0; i < offset; i++) cells += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const s = ymd(new Date(y, m, d));
        const past = s < today() || s > maxDate;
        const free = !past && opt.isFree(s);
        const inRange = start && end && s >= start && (opt.mode === 'nights' ? s <= end : s <= end);
        const st = !past && !free && opt.stateOf ? opt.stateOf(s) : '';
        const cls = ['cd', past ? 'past' : '', !free && !past ? 'booked' : '', st && st !== 'booked' ? 'st-' + st : '', s === start ? 'st' : '', s === end && end !== start ? 'en' : '', inRange ? 'in' : '', s === today() ? 'td' : ''].join(' ');
        cells += `<button type="button" class="${cls}" data-d="${s}" ${past ? 'disabled' : ''} aria-label="${nice(s, { weekday: 'long', day: 'numeric', month: 'long' })}${!free && !past ? ' (unavailable)' : ''}">${d}</button>`;
      }
      host.innerHTML = `
        <div class="cal-head"><button type="button" class="cal-nav" data-n="-1" ${canPrev ? '' : 'disabled'} aria-label="Previous month">‹</button><span>${label}</span><button type="button" class="cal-nav" data-n="1" aria-label="Next month">›</button></div>
        <div class="cal-dow"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-key"><i class="k-free"></i>Available <i class="k-booked"></i>Booked</div>`;
      $$('.cal-nav', host).forEach(b => b.onclick = () => { view.setMonth(view.getMonth() + +b.dataset.n); render(); });
      $$('.cd:not(.past)', host).forEach(b => b.onclick = () => pick(b.dataset.d));
    };
    const rangeOk = (a, b) => {
      if (opt.mode === 'nights') { const n = Math.round((parse(b) - parse(a)) / 864e5); return n >= 1 && n <= opt.max && span(a, n).every(opt.isFree); }
      const n = Math.round((parse(b) - parse(a)) / 864e5) + 1; return n >= 1 && n <= opt.max && span(a, n).every(opt.isFree);
    };
    const pick = d => {
      if (opt.mode === 'single') { if (!opt.isFree(d)) return opt.onWarn?.('That date is not available.'); start = end = d; }
      else if (opt.mode === 'days') {
        if (start && end === start && d > start && rangeOk(start, d)) end = d;
        else if (opt.isFree(d)) { start = end = d; }
        else return opt.onWarn?.('That date is already booked.');
        if (start && end && end !== start && !rangeOk(start, end)) { start = end = d; }
      } else { // nights
        if (start && !end && d > start) {
          if (rangeOk(start, d)) end = d; else return opt.onWarn?.(`Choose up to ${opt.max} nights with no booked nights in between.`);
        } else { if (!opt.isFree(d)) return opt.onWarn?.('That night is already booked.'); start = d; end = null; }
      }
      render();
      opt.onChange({ start, end });
    };
    render();
    return { set(v) { start = v.start; end = v.end; render(); }, rerender: render };
  }
  KNK.Calendar = Calendar;

  /* ============================================================
     BOOKING DRAWER
     ============================================================ */
  const steps = {
    celebration: ['Venue & dates', 'Extras', 'Your details', 'Review & pay'],
    stay: ['Stay & dates', 'Your details', 'Review & pay'],
    unwind: ['Date & time', 'Your details', 'Review & pay']
  };
  let S = null; // state
  const drawer = () => $('#bk');

  KNK.open = (id, kindHint) => {
    const it = items[id];
    const kind = it ? it.kind : kindHint || 'celebration';
    const draft = {
      celebration: { kind, venues: it && kind === 'celebration' ? [id] : [], start: null, days: 0, guests: 150, food: null, addons: [], villas: 0, rooms: 0, eventType: 'Wedding' },
      stay: { kind, stay: it && kind === 'stay' ? id : 'villa', checkIn: null, nights: 0, units: 1, guests: 2 },
      unwind: { kind, item: it && kind === 'unwind' ? id : 'turf', date: null, hour: null, hours: 1, players: 10, guests: 2 }
    }[kind];
    S = { kind, step: 0, draft, customer: S?.customer || { name: '', email: '', phone: '', notes: '' }, booking: null };
    const d = drawer();
    d.hidden = false;
    requestAnimationFrame(() => d.classList.add('on'));
    document.documentElement.classList.add('bk-open');
    window.__lenis?.stop();
    render();
  };
  KNK.close = () => {
    const d = drawer();
    d.classList.remove('on');
    document.documentElement.classList.remove('bk-open');
    window.__lenis?.start();
    setTimeout(() => (d.hidden = true), 450);
    document.dispatchEvent(new Event('knk:closed'));
  };

  const warn = msg => { const w = $('.bk-warn'); if (!w) return; w.textContent = msg; w.classList.add('on'); clearTimeout(warn.t); warn.t = setTimeout(() => w.classList.remove('on'), 3200); };

  function render() {
    const d = drawer(), st = steps[S.kind];
    const kindTitle = { celebration: 'Plan a celebration', stay: 'Book a stay', unwind: 'Book to unwind' }[S.kind];
    $('.bk-title', d).textContent = S.booking ? 'Booking confirmed' : kindTitle;
    $('.bk-steps', d).innerHTML = S.booking ? '' : st.map((t, i) => `<li class="${i === S.step ? 'is-on' : i < S.step ? 'is-done' : ''}"><span>${i + 1}</span>${t}</li>`).join('');
    const body = $('.bk-body', d);
    body.innerHTML = '';
    if (S.booking) return renderDone(body);
    const name = st[S.step];
    ({ 'Venue & dates': stepVenue, 'Extras': stepExtras, 'Your details': stepDetails, 'Review & pay': stepReview, 'Stay & dates': stepStay, 'Date & time': stepUnwind })[name](body);
    body.scrollTop = 0;
    foot();
  }

  function valid() {
    const x = S.draft, name = steps[S.kind][S.step];
    if (name === 'Venue & dates') {
      if (!x.venues.length) return 'Choose at least one venue.';
      if (!x.start) return 'Pick your dates.';
      const cap = Math.max(...x.venues.map(v => items[v].capacity));
      if (!(x.guests > 0)) return 'Enter your number of guests.';
      if (x.guests > cap) return `That's more than the largest selected venue holds (${cap}).`;
    }
    if (name === 'Extras') {
      if (x.villas > minFree('villa', x.start, x.days) || x.rooms > minFree('room', x.start, x.days)) return 'Not enough villas or rooms free on those nights.';
    }
    if (name === 'Stay & dates') {
      if (!x.checkIn || !x.nights) return 'Pick check-in and check-out dates.';
      const s = items[x.stay];
      if (x.units > minFree(x.stay, x.checkIn, x.nights)) return `Only ${minFree(x.stay, x.checkIn, x.nights)} ${s.unitName}s free for those nights.`;
      if (x.guests > x.units * s.sleeps) return `${x.units} ${s.unitName}${x.units > 1 ? 's' : ''} sleep${x.units > 1 ? '' : 's'} up to ${x.units * s.sleeps}. Add another ${s.unitName}.`;
      if (!(x.guests > 0)) return 'Enter the number of guests.';
    }
    if (name === 'Date & time') {
      const u = items[x.item];
      if (!x.date) return 'Pick a date.';
      if (x.hour == null) return 'Pick a time.';
      if (u.mode === 'hourly') { if (!(x.players > 0) || x.players > u.maxPlayers) return `Up to ${u.maxPlayers} players.`; }
      else { const left = u.seats - seatsTaken(x.date, x.hour); if (!(x.guests > 0) || x.guests > left) return `${left} seats left in that sitting.`; }
    }
    if (name === 'Your details') {
      const c = S.customer;
      if (!c.name.trim()) return 'Enter your name.';
      if (!/^\S+@\S+\.\S+$/.test(c.email)) return 'Enter a valid email.';
      if (c.phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    return '';
  }

  function foot() {
    const f = $('.bk-foot', drawer());
    const q = KNK.quote(S.draft);
    const last = S.step === steps[S.kind].length - 1;
    f.innerHTML = `
      <div class="bk-total"><span>Total (excl. GST)</span><strong>${q.subtotal ? inr(q.subtotal) : '—'}</strong>${q.subtotal ? '<small>+ GST on the tax invoice</small>' : ''}</div>
      <div class="bk-btns">${S.step ? '<button type="button" class="bk-back">Back</button>' : ''}${last ? '' : '<button type="button" class="bk-next">Continue</button>'}</div>`;
    $('.bk-back', f) && ($('.bk-back', f).onclick = () => { S.step--; render(); });
    $('.bk-next', f) && ($('.bk-next', f).onclick = () => { const v = valid(); if (v) return warn(v); S.step++; render(); });
  }
  const refreshFoot = () => foot();

  const stepper = (label, val, min, max, onSet, sub = '') => {
    const el = document.createElement('div');
    el.className = 'stp';
    el.innerHTML = `<div><p>${label}</p>${sub ? `<small>${sub}</small>` : ''}</div><div class="stp-c"><button type="button" aria-label="Fewer">−</button><input type="number" inputmode="numeric" min="${min}" max="${max}" value="${val}" aria-label="${label}"><button type="button" aria-label="More">+</button></div>`;
    const inp = $('input', el);
    const set = v => { v = Math.max(min, Math.min(max, Math.round(+v || 0))); inp.value = v; onSet(v); };
    const [minus, plus] = $$('button', el);
    minus.onclick = () => set(+inp.value - 1);
    plus.onclick = () => set(+inp.value + 1);
    inp.onchange = () => set(inp.value);
    return el;
  };

  /* ---------- step: celebration venue & dates ---------- */
  function stepVenue(body) {
    const x = S.draft;
    body.innerHTML = `
      <p class="bk-lead">Choose one or more spaces, then your dates (1–${C.policy.celebration.maxDays} days).</p>
      <div class="opt-grid">${C.venues.map(v => `
        <label class="opt ${x.venues.includes(v.id) ? 'is-on' : ''}"><input type="checkbox" value="${v.id}" ${x.venues.includes(v.id) ? 'checked' : ''}>
          <img src="${v.img.replace('/img/', '/img/t/')}" alt=""><span class="opt-t">${v.name}</span><span class="opt-m">${v.type} · up to ${v.capacity}</span><span class="opt-p">${inr(v.pricePerDay)}<small>/day</small></span></label>`).join('')}</div>
      <div class="bk-row"><div class="bk-guests"></div>
        <label class="fld"><span>Occasion</span><select class="evt">${['Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Corporate event', 'Party', 'Other'].map(o => `<option ${o === x.eventType ? 'selected' : ''}>${o}</option>`).join('')}</select></label></div>
      <div class="cal"></div>
      <p class="bk-sel"></p>`;
    $('.bk-guests', body).appendChild(stepper('Guests', x.guests, 1, 2000, v => { x.guests = v; refreshFoot(); }));
    $('.evt', body).onchange = e => (x.eventType = e.target.value);
    const sel = () => { $('.bk-sel', body).innerHTML = x.start ? `<b>${niceLong(x.start)}${x.days > 1 ? ' → ' + niceLong(addDays(x.start, x.days - 1)) : ''}</b> · ${x.days} day${x.days > 1 ? 's' : ''}. Tap a later date to extend.` : (x.venues.length ? 'Tap a date to start. Tap a later date to make it a multi-day booking.' : 'Choose a venue to see its free dates.'); };
    const isFree = d => x.venues.length > 0 && x.venues.every(v => !venueBooked(v, d));
    const cal = Calendar($('.cal', body), {
      mode: 'days', max: C.policy.celebration.maxDays, isFree, value: { start: x.start, end: x.start ? addDays(x.start, x.days - 1) : null },
      onWarn: warn,
      onChange: ({ start, end }) => { x.start = start; x.days = start ? Math.round((parse(end) - parse(start)) / 864e5) + 1 : 0; sel(); refreshFoot(); }
    });
    $$('.opt input', body).forEach(cb => cb.onchange = () => {
      x.venues = $$('.opt input:checked', body).map(c => c.value);
      cb.closest('.opt').classList.toggle('is-on', cb.checked);
      if (x.start && !span(x.start, x.days).every(isFree)) { x.start = null; x.days = 0; cal.set({ start: null, end: null }); warn('Those dates are not free for every selected venue. Pick again.'); }
      else cal.rerender();
      sel(); refreshFoot();
    });
    sel();
  }

  /* ---------- step: extras ---------- */
  function stepExtras(body) {
    const x = S.draft;
    const vf = minFree('villa', x.start, x.days), rf = minFree('room', x.start, x.days);
    body.innerHTML = `
      <h4 class="bk-h">Food &amp; hospitality <small>per guest, per day</small></h4>
      <div class="pk-grid">
        <label class="pk ${!x.food ? 'is-on' : ''}"><input type="radio" name="food" value="" ${!x.food ? 'checked' : ''}><span class="pk-t">No package</span><span class="pk-m">Decide later</span></label>
        ${C.foodPackages.map(p => `<label class="pk ${x.food === p.id ? 'is-on' : ''}"><input type="radio" name="food" value="${p.id}" ${x.food === p.id ? 'checked' : ''}><span class="pk-t">${p.name}</span><span class="pk-p">${inr(p.perGuestPerDay)}</span><span class="pk-m">${inr(p.perGuestPerDay * x.guests * x.days)} for ${x.guests} × ${x.days}d</span></label>`).join('')}
      </div>
      <h4 class="bk-h">Add-on services</h4>
      <div class="ad-list">${C.addons.map(a => `<label class="ad ${x.addons.includes(a.id) ? 'is-on' : ''}"><input type="checkbox" value="${a.id}" ${x.addons.includes(a.id) ? 'checked' : ''}><span class="ad-t">${a.name}</span><span class="ad-p">${inr(a.price)}${a.per === 'guest' ? '<small> / guest</small>' : ''}</span></label>`).join('')}</div>
      <h4 class="bk-h">Guest accommodation <small>same nights as your celebration (${x.days})</small></h4>
      <div class="acc"></div>`;
    const acc = $('.acc', body);
    acc.appendChild(stepper('Private villas', x.villas, 0, vf, v => { x.villas = v; refreshFoot(); }, `${inr(items.villa.pricePerNight)}/night · sleeps 4 · ${vf} free`));
    acc.appendChild(stepper('Guest rooms', x.rooms, 0, rf, v => { x.rooms = v; refreshFoot(); }, `${inr(items.room.pricePerNight)}/night · sleeps 2 · ${rf} free`));
    $$('input[name=food]', body).forEach(r => r.onchange = () => { x.food = r.value || null; $$('.pk', body).forEach(p => p.classList.toggle('is-on', $('input', p).checked)); refreshFoot(); });
    $$('.ad input', body).forEach(c => c.onchange = () => { x.addons = $$('.ad input:checked', body).map(i => i.value); c.closest('.ad').classList.toggle('is-on', c.checked); refreshFoot(); });
  }

  /* ---------- step: stay ---------- */
  function stepStay(body) {
    const x = S.draft;
    body.innerHTML = `
      <div class="opt-grid two">${C.stays.map(s => `
        <label class="opt ${x.stay === s.id ? 'is-on' : ''}"><input type="radio" name="stay" value="${s.id}" ${x.stay === s.id ? 'checked' : ''}>
          <img src="${s.img.replace('/img/', '/img/t/')}" alt=""><span class="opt-t">${s.name}</span><span class="opt-m">${s.units} ${s.unitName}s · sleeps ${s.sleeps}</span><span class="opt-p">${inr(s.pricePerNight)}<small>/night</small></span></label>`).join('')}</div>
      <div class="bk-row"><div class="u"></div><div class="g"></div></div>
      <div class="cal"></div><p class="bk-sel"></p>`;
    const s = () => items[x.stay];
    const units = stepper('', x.units, 1, s().units, v => { x.units = v; cal.rerender(); refreshFoot(); });
    const guests = stepper('Guests', x.guests, 1, 80, v => { x.guests = v; refreshFoot(); });
    const relabel = () => { $('p', units).textContent = s().unitName[0].toUpperCase() + s().unitName.slice(1) + 's'; $('input', units).max = s().units; };
    $('.u', body).appendChild(units); $('.g', body).appendChild(guests); relabel();
    const sel = () => { $('.bk-sel', body).innerHTML = x.checkIn ? (x.nights ? `<b>${niceLong(x.checkIn)} → ${niceLong(addDays(x.checkIn, x.nights))}</b> · ${x.nights} night${x.nights > 1 ? 's' : ''}` : `Check-in <b>${niceLong(x.checkIn)}</b>. Now tap your check-out date.`) : `Tap your check-in date (up to ${C.policy.stay.maxNights} nights).`; };
    const cal = Calendar($('.cal', body), {
      mode: 'nights', max: C.policy.stay.maxNights, isFree: d => unitsFree(x.stay, d) >= x.units,
      value: { start: x.checkIn, end: x.nights ? addDays(x.checkIn, x.nights) : null }, onWarn: warn,
      onChange: ({ start, end }) => { x.checkIn = start; x.nights = end ? Math.round((parse(end) - parse(start)) / 864e5) : 0; sel(); refreshFoot(); }
    });
    $$('input[name=stay]', body).forEach(r => r.onchange = () => {
      x.stay = r.value; x.units = Math.min(x.units, s().units); $('input', units).value = x.units; relabel();
      $$('.opt', body).forEach(o => o.classList.toggle('is-on', $('input', o).checked));
      x.checkIn = null; x.nights = 0; cal.set({ start: null, end: null }); sel(); refreshFoot();
    });
    sel();
  }

  /* ---------- step: unwind ---------- */
  function stepUnwind(body) {
    const x = S.draft;
    body.innerHTML = `
      <div class="seg">${C.unwind.map(u => `<button type="button" data-u="${u.id}" class="${x.item === u.id ? 'is-on' : ''}">${u.name}</button>`).join('')}</div>
      <p class="bk-lead u-info"></p>
      <div class="cal"></div>
      <h4 class="bk-h slot-h">Time</h4><div class="slots"></div>
      <div class="bk-row u-extra"></div>`;
    const u = () => items[x.item];
    const info = () => {
      const it = u();
      $('.u-info', body).innerHTML = it.mode === 'hourly'
        ? `${inr(it.pricePerHour)} an hour · up to ${it.maxPlayers} players · ${hh(it.open)} – ${hh(it.close)}. Paid in full at booking.`
        : `${inr(it.pricePerGuest)} a guest · ${it.seats} seats · ${it.sittingHours}-hour sitting · ${hh(it.open)} – ${hh(it.close)}. Paid in full at booking.`;
    };
    const slots = () => {
      const it = u(), box = $('.slots', body);
      if (!x.date) { box.innerHTML = '<p class="muted-s">Pick a date to see free times.</p>'; return; }
      if (it.mode === 'hourly') {
        let h = '';
        for (let t = it.open; t < it.close; t++) {
          const b = hourBooked(it.id, x.date, t);
          const on = x.hour != null && t >= x.hour && t < x.hour + x.hours;
          h += `<button type="button" class="sl ${b ? 'booked' : ''} ${on ? 'is-on' : ''}" data-h="${t}" ${b ? 'disabled' : ''}>${hh(t)}</button>`;
        }
        box.innerHTML = h;
      } else {
        box.innerHTML = cafeSittings().map(t => { const left = it.seats - seatsTaken(x.date, t); const past = x.date === today() && t <= new Date().getHours(); const dis = left <= 0 || past; return `<button type="button" class="sl wide ${dis ? 'booked' : ''} ${x.hour === t ? 'is-on' : ''}" data-h="${t}" ${dis ? 'disabled' : ''}>${hh(t)} – ${hh(t + it.sittingHours)}<small>${past ? 'Passed' : left > 0 ? left + ' seats left' : 'Full'}</small></button>`; }).join('');
      }
      $$('.sl:not([disabled])', box).forEach(b => b.onclick = () => {
        const t = +b.dataset.h;
        if (it.mode === 'hourly') {
          if (x.hour != null && t >= x.hour + 1 && t <= x.hour + it.maxHours - 1) {
            // extend to t, if every hour in between is free
            const ok = Array.from({ length: t - x.hour + 1 }, (_, k) => x.hour + k).every(hr => !hourBooked(it.id, x.date, hr));
            if (ok) x.hours = t - x.hour + 1; else { x.hour = t; x.hours = 1; }
          } else { x.hour = t; x.hours = 1; }
        } else x.hour = t;
        slots(); extra(); refreshFoot();
      });
    };
    const extra = () => {
      const it = u(), box = $('.u-extra', body);
      box.innerHTML = '';
      if (it.mode === 'hourly') {
        const p = document.createElement('p'); p.className = 'bk-sel';
        p.innerHTML = x.hour != null ? `<b>${hh(x.hour)} – ${hh(x.hour + x.hours)}</b> · ${x.hours} hour${x.hours > 1 ? 's' : ''}. Tap a later slot to extend (up to ${it.maxHours}).` : 'Tap a start time. Tap a later slot to book more hours.';
        box.appendChild(p);
        box.appendChild(stepper('Players', Math.min(x.players, it.maxPlayers), 1, it.maxPlayers, v => { x.players = v; }));
        x.players = Math.min(x.players, it.maxPlayers);
      } else {
        const left = x.date && x.hour != null ? it.seats - seatsTaken(x.date, x.hour) : it.seats;
        box.appendChild(stepper('Guests', Math.min(x.guests, left), 1, Math.max(1, left), v => { x.guests = v; refreshFoot(); }, `${it.sittingHours}-hour sitting`));
        x.guests = Math.min(x.guests, Math.max(1, left));
      }
    };
    Calendar($('.cal', body), {
      mode: 'single', max: 1, isFree: () => true, value: { start: x.date, end: x.date },
      onChange: ({ start }) => { x.date = start; x.hour = null; x.hours = 1; slots(); extra(); refreshFoot(); }
    });
    $$('.seg button', body).forEach(b => b.onclick = () => {
      x.item = b.dataset.u; x.hour = null; x.hours = 1;
      $$('.seg button', body).forEach(o => o.classList.toggle('is-on', o === b));
      info(); slots(); extra(); refreshFoot();
    });
    info(); slots(); extra();
  }

  /* ---------- step: details ---------- */
  function stepDetails(body) {
    const c = S.customer;
    body.innerHTML = `
      <p class="bk-lead">We'll send your quotation, invoice and receipts here.</p>
      <label class="fld"><span>Full name</span><input name="name" autocomplete="name" value="${esc(c.name)}"></label>
      <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" value="${esc(c.email)}"></label>
      <label class="fld"><span>Phone</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+91" value="${esc(c.phone)}"></label>
      <label class="fld"><span>Anything we should know? <small>(optional)</small></span><textarea name="notes" rows="3">${esc(c.notes)}</textarea></label>`;
    $$('input,textarea', body).forEach(i => i.oninput = () => (c[i.name] = i.value));
  }

  /* ---------- step: review ---------- */
  function stepReview(body) {
    const q = KNK.quote(S.draft);
    const fake = { kind: S.kind, draft: S.draft };
    const d = KNK.describe(fake);
    const full = q.advancePct >= 100;
    body.innerHTML = `
      <div class="rv-head"><p class="rv-t">${esc(d.title)}</p><p>${esc(d.when)}</p><p>${esc(d.who)}</p></div>
      <div class="rv-lines">${q.lines.map(l => `<div class="rv-l"><div><p>${esc(l.label)}</p><small>${esc(l.detail)}</small></div><b>${inr(l.amount)}</b></div>`).join('')}</div>
      <div class="rv-sum">
        ${q.discount ? `<div><span>Before discount</span><b>${inr(q.gross)}</b></div><div class="rv-disc"><span>${esc(q.discountLabel)}</span><b>− ${inr(q.discount)}</b></div>` : ''}
        <div class="rv-total"><span>Total (excl. GST)</span><b>${inr(q.subtotal)}</b></div>
        <p class="rv-gst">GST at the applicable rates is added on the tax invoice.</p>
        ${full ? `<div class="rv-adv"><span>Payable now (incl. GST)</span><b>${inr(q.total)}</b></div>` : `<div class="rv-adv"><span>Advance due now (${q.advancePct}%)</span><b>${inr(q.advance)}</b></div><div><span>Balance later</span><b>${inr(q.subtotal - q.advance)} + GST</b></div>`}
      </div>
      <div class="promo">${S.draft.discount?.code
        ? `<span>Code <b>${esc(S.draft.discount.code)}</b> applied</span><button type="button" class="promo-rm">Remove</button>`
        : `<input class="promo-in" placeholder="Promo code" autocomplete="off" aria-label="Promo code"><button type="button" class="promo-go">Apply</button>`}</div>
      <div class="rv-actions">
        <button type="button" class="btn-gold pay-now">${full ? `Pay ${inr(q.total)}` : `Pay ${q.advancePct}% advance · ${inr(q.advance)}`}</button>
        ${full ? '' : `<button type="button" class="btn-line hold-now">Hold my dates for ${q.holdHours} hours</button>`}
      </div>
      <p class="rv-note">${full ? 'Paid in full at booking. You\'ll get a tax invoice and a receipt by email.' : `Pay the advance to confirm now, or hold your dates for ${q.holdHours} hours while you decide. We'll email your quotation either way.`} UPI, cards and netbanking via Razorpay.</p>`;
    $('.promo-go', body) && ($('.promo-go', body).onclick = () => {
      const r = KNK.promos.check($('.promo-in', body).value, S.draft);
      if (!r.ok) return warn(r.msg);
      S.draft.discount = r.discount; S.pendingBooking = null; render();
    });
    $('.promo-in', body) && ($('.promo-in', body).onkeydown = e => { if (e.key === 'Enter') $('.promo-go', body).click(); });
    $('.promo-rm', body) && ($('.promo-rm', body).onclick = () => { S.draft.discount = null; S.pendingBooking = null; render(); });
    $('.pay-now', body).onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true;
      const b = S.pendingBooking || (S.pendingBooking = KNK.createBooking(S.draft, { ...S.customer }));
      const amount = full ? q.total : q.advance;
      try {
        const pay = await KNK.checkout({ amount, booking: b, title: full ? `${d.title} · full payment` : `${d.title} · ${q.advancePct}% advance` });
        KNK.recordPayment(b, amount, pay);
        S.booking = b; S.pendingBooking = null;
        KNK.emailNote(b, 'Quotation, tax invoice and receipt');
        render();
      } catch (err) { btn.disabled = false; if (err.message !== 'dismissed') warn(err.message); else warn('Payment cancelled. Your details are saved — try again when ready.'); }
    };
    $('.hold-now', body) && ($('.hold-now', body).onclick = () => {
      const b = S.pendingBooking || KNK.createBooking(S.draft, { ...S.customer });
      S.booking = b; S.pendingBooking = null;
      KNK.emailNote(b, 'Quotation');
      render();
    });
  }

  function renderDone(body) {
    const b = S.booking, si = KNK.statusInfo(b), d = KNK.describe(b);
    $('.bk-foot', drawer()).innerHTML = '<div class="bk-btns" style="margin-left:auto"><button type="button" class="bk-next bk-close2">Done</button></div>';
    $('.bk-close2').onclick = KNK.close;
    body.innerHTML = `
      <div class="done">
        <span class="tick big"></span>
        <p class="done-k">Booking reference</p>
        <p class="done-id">${b.id}</p>
        <span class="pill-st ${si.tone}">${si.label}</span>
        <p class="done-note">${esc(si.note)}</p>
        <div class="rv-head"><p class="rv-t">${esc(d.title)}</p><p>${esc(d.when)}</p><p>${esc(d.who)}</p></div>
        <div class="done-docs">
          <button type="button" data-doc="quotation">Quotation PDF</button>
          ${b.payments.length ? '<button type="button" data-doc="invoice">Tax invoice PDF</button><button type="button" data-doc="receipt">Receipt PDF</button>' : ''}
        </div>
        <a class="btn-gold" href="mybooking.html?id=${b.id}&email=${encodeURIComponent(b.customer.email)}">Go to My Booking</a>
      </div>`;
    $$('[data-doc]', body).forEach(x => x.onclick = () => KNK.pdf(x.dataset.doc, b, b.payments[b.payments.length - 1]));
  }

  /* ---------- drawer markup + global hooks ---------- */
  function mount() {
    if (!$('#bk') && !document.body.dataset.noDrawer) {
      const el = document.createElement('div');
      el.id = 'bk'; el.className = 'bk'; el.hidden = true;
      el.innerHTML = `
        <div class="bk-scrim"></div>
        <aside class="bk-panel" role="dialog" aria-modal="true" aria-labelledby="bkTitle" data-lenis-prevent>
          <header class="bk-top"><h2 class="bk-title" id="bkTitle">Book</h2><button type="button" class="bk-x" aria-label="Close">×</button></header>
          <ol class="bk-steps"></ol>
          <div class="bk-body"></div>
          <p class="bk-warn" role="alert"></p>
          <footer class="bk-foot"></footer>
        </aside>`;
      document.body.appendChild(el);
      $('.bk-scrim', el).onclick = KNK.close;
      $('.bk-x', el).onclick = KNK.close;
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) KNK.close(); });
    }
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-book]');
      if (!t) return;
      e.preventDefault();
      KNK.open(t.dataset.book, t.dataset.kind);
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
