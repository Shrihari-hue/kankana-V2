/* ============================================================
   KANKANA — admin dashboard
   Reads/writes the same store as the booking engine (booking.js).
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG, K = window.KNK;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { inr, esc, nice, niceLong, addDays, ymd, parse, hh, dt } = K;
  const today = () => ymd(new Date());
  const SER = { celebration: 'var(--s1)', stay: 'var(--s2)', unwind: 'var(--s3)' };
  const KIND = { celebration: 'Celebration', stay: 'Stay', unwind: 'Unwind' };
  const STATUS = { held: 'On hold', confirmed: 'Confirmed', paid: 'Paid', expired: 'Expired', cancelled: 'Cancelled' };

  /* ---------- login gate (demo only) ---------- */
  const enter = () => { $('#login').hidden = true; $('#app').hidden = false; boot(); };
  $('#loginForm').onsubmit = e => {
    e.preventDefault();
    if (e.target.code.value === C.admin.demoPasscode) { try { sessionStorage.setItem('knk_admin', '1'); } catch {} enter(); }
    else { K.toast('Incorrect passcode.'); e.target.code.select(); }
  };

  /* ---------- helpers ---------- */
  const startOf = b => b.kind === 'celebration' ? b.draft.start : b.kind === 'stay' ? b.draft.checkIn : b.draft.date;
  const daysOf = b => b.kind === 'celebration' ? b.draft.days : b.kind === 'stay' ? b.draft.nights : 1;
  const endOf = b => addDays(startOf(b), Math.max(1, daysOf(b)) - 1);
  const isActive = b => b.status === 'held' || b.status === 'confirmed' || b.status === 'paid';
  const what = b => b.kind === 'celebration' ? b.draft.venues.map(v => K.items[v].name).join(' + ') : b.kind === 'stay' ? `${K.items[b.draft.stay].name} × ${b.draft.units}` : K.items[b.draft.item].name;
  const when = b => {
    const d = b.draft;
    if (b.kind === 'unwind') { const u = K.items[d.item]; return `${nice(d.date)} · ${hh(d.hour)}–${hh(d.hour + (u.mode === 'hourly' ? d.hours : u.sittingHours))}`; }
    if (b.kind === 'stay') return `${nice(d.checkIn)} → ${nice(addDays(d.checkIn, d.nights))}`;
    return d.days > 1 ? `${nice(d.start)} → ${nice(addDays(d.start, d.days - 1))}` : nice(d.start);
  };
  const guests = b => b.kind === 'unwind' ? (b.draft.players || b.draft.guests) : b.draft.guests;
  const all = () => K.listBookings();
  const ago = ts => { const m = Math.round((Date.now() - ts) / 6e4); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  const left = ts => { const m = Math.round((ts - Date.now()) / 6e4); return m <= 0 ? 'expired' : m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h ${m % 60}m left`; };
  const short = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + ' L' : n >= 1e3 ? '₹' + Math.round(n / 1e3) + 'k' : inr(n);
  const stPill = s => `<span class="st ${s}">${STATUS[s]}</span>`;
  const kindTag = k => `<span class="kind"><i style="background:${SER[k]}"></i>${KIND[k]}</span>`;

  /* ---------- tooltip ---------- */
  const tip = $('#tip');
  const showTip = (html, e) => { tip.innerHTML = html; tip.classList.add('on'); moveTip(e); };
  const moveTip = e => { const r = tip.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
  const hideTip = () => tip.classList.remove('on');

  /* ============================================================ */
  let view = 'overview', q = '', filt = { status: 'all', kind: 'all' }, calMonth = new Date(); calMonth.setDate(1);
  let schedDate = today();

  function boot() {
    $('#today').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.v));
    $('#search').oninput = e => { q = e.target.value.trim().toLowerCase(); if (view !== 'bookings') go('bookings'); else render(); };
    $('#newBtn').onclick = () => { const m = $('#newMenu'); m.hidden = !m.hidden; $('#newBtn').setAttribute('aria-expanded', String(!m.hidden)); };
    document.addEventListener('click', e => { if (!e.target.closest('.ad-new')) { $('#newMenu').hidden = true; } });
    $('#seedBtn').onclick = () => { K.seedDemo(); K.toast('Sample bookings and enquiries loaded.'); render(); };
    $('#resetBtn').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Click again to erase all'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Reset demo data'; }, 3000); return; }
      K.clearAll(); delete b.dataset.arm; b.textContent = 'Reset demo data'; K.toast('Demo data cleared.'); render();
    };
    $('#logout').onclick = () => { try { sessionStorage.removeItem('knk_admin'); } catch {} location.reload(); };
    document.addEventListener('knk:closed', () => render());
    $('.ad-panel-scrim').onclick = closePanel;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => view === 'overview' && render(), 200); });
    setInterval(() => { if (view === 'overview') render(); }, 60000);
    const h = location.hash.slice(1); if (h) go(h); else render();
  }
  function go(v) {
    view = v; location.hash = v;
    $$('#nav button').forEach(b => b.classList.toggle('is-on', b.dataset.v === v));
    $('#title').textContent = { overview: 'Overview', bookings: 'Bookings', calendar: 'Calendar', enquiries: 'Enquiries', blocks: 'Blocked dates', pricing: 'Pricing & policies', quote: 'Quotation generator', customers: 'Customers', catalog: 'Venues & pricing', discounts: 'Discounts & promo codes', payments: 'Payments', outbox: 'Automated emails', settings: 'Settings' }[v] || '';
    render(); window.scrollTo(0, 0);
  }
  function render() {
    const n = K.enquiries.list().filter(e => (e.status || 'new') === 'new').length;
    $('#enqBadge').textContent = n || '';
    $('#demoNote').innerHTML = (C.payments.demoMode || !C.api.saveBooking)
      ? (all().length ? 'Demo mode: bookings, enquiries and blocks are stored in this browser only. Connect the server (see README) to share them across devices and staff.' : 'Demo mode: no bookings yet. <button id="seedInline">Load sample data</button> to explore the dashboard.')
      : '';
    $('#seedInline') && ($('#seedInline').onclick = () => $('#seedBtn').click());
    const V = { overview, bookings, calendar, enquiries, blocks, pricing, ...(window.KNKA?.views || {}) };
    (V[view] || overview)($('#view'), window.KNKA.ctx);
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function overview(el) {
    const list = all(), now = new Date();
    const pays = list.filter(b => b.status !== 'cancelled').flatMap(b => b.payments.map(p => ({ ...p, kind: b.kind })));
    const monthKey = d => `${d.getFullYear()}-${d.getMonth()}`;
    const thisM = monthKey(now), lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1), lastM = monthKey(lastD);
    const sumM = k => pays.filter(p => monthKey(new Date(p.at)) === k).reduce((s, p) => s + p.amount, 0);
    const cThis = sumM(thisM), cLast = sumM(lastM);
    const delta = cLast ? Math.round((cThis - cLast) / cLast * 100) : null;
    const outstanding = list.filter(b => b.status === 'confirmed').reduce((s, b) => s + K.balance(b), 0);
    const in30 = list.filter(b => isActive(b) && startOf(b) >= today() && startOf(b) <= addDays(today(), 30));
    const held = list.filter(b => b.status === 'held');
    const soon = held.filter(b => b.holdUntil - Date.now() < 24 * 3600e3);
    const awaiting = held.reduce((s, b) => s + b.quote.advance, 0);

    el.innerHTML = `
      <div class="ad-grid k4">
        <div class="box kpi"><p class="kl">Collected this month</p><p class="kv">${inr(cThis)}</p><p class="ks">${delta == null ? 'No payments last month' : `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span> vs ${lastD.toLocaleDateString('en-IN', { month: 'long' })}`}</p></div>
        <div class="box kpi"><p class="kl">Balance outstanding</p><p class="kv">${inr(outstanding)}</p><p class="ks">${list.filter(b => b.status === 'confirmed').length} confirmed bookings with a balance</p></div>
        <div class="box kpi"><p class="kl">Next 30 days</p><p class="kv">${in30.length} bookings</p><p class="ks">${inr(in30.reduce((s, b) => s + b.quote.total, 0))} booked value</p></div>
        <div class="box kpi"><p class="kl">On hold</p><p class="kv">${held.length}</p><p class="ks">${inr(awaiting)} in advances pending · ${soon.length} expire within 24h</p></div>
      </div>
      <div class="ad-grid two" style="margin-top:14px">
        <div class="box"><div class="box-h"><h2>Payments collected · last 6 months</h2><button class="tbl-toggle" id="tblT">View as table</button></div>
          <div class="legend">${Object.keys(KIND).map(k => `<span><i style="background:${SER[k]}"></i>${KIND[k]}s</span>`).join('')}</div>
          <div class="chart chart-wrap" id="revChart" style="margin-top:12px"></div></div>
        <div class="box"><div class="box-h"><h2>Today</h2><span class="row-s">${nice(today())}</span></div><div class="rows" id="todayRows"></div></div>
      </div>
      <div class="ad-grid two" style="margin-top:14px">
        <div class="box"><div class="box-h"><h2>Occupancy · next 14 days</h2></div><div id="heat"></div></div>
        <div class="box"><div class="box-h"><h2>Holds expiring</h2><button class="lnk" data-go="bookings" data-st="held">All holds →</button></div><div class="rows" id="holdRows"></div>
          <div class="box-h" style="margin-top:20px"><h2>New enquiries</h2><button class="lnk" data-go="enquiries">Inbox →</button></div><div class="rows" id="enqRows"></div></div>
      </div>`;
    $$('[data-go]', el).forEach(b => b.onclick = () => { if (b.dataset.st) filt.status = b.dataset.st; go(b.dataset.go); });

    // --- revenue chart (stacked bars by kind) ---
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    const data = months.map(m => { const k = monthKey(m); const r = { label: m.toLocaleDateString('en-IN', { month: 'short' }), full: m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }; Object.keys(KIND).forEach(kd => r[kd] = pays.filter(p => p.kind === kd && monthKey(new Date(p.at)) === k).reduce((s, p) => s + p.amount, 0)); r.total = r.celebration + r.stay + r.unwind; return r; });
    drawStack($('#revChart'), data);
    let tbl = false;
    $('#tblT').onclick = () => {
      tbl = !tbl; $('#tblT').textContent = tbl ? 'View as chart' : 'View as table';
      if (!tbl) return drawStack($('#revChart'), data);
      $('#revChart').innerHTML = `<div class="tbl-wrap"><table class="t" style="min-width:0"><thead><tr><th>Month</th>${Object.keys(KIND).map(k => `<th class="num">${KIND[k]}s</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>${data.map(r => `<tr><td>${r.full}</td>${Object.keys(KIND).map(k => `<td class="num">${inr(r[k])}</td>`).join('')}<td class="num">${inr(r.total)}</td></tr>`).join('')}</tbody></table></div>`;
    };

    // --- today ---
    const t = today();
    const todays = list.filter(b => isActive(b) && (b.kind === 'unwind' ? b.draft.date === t : startOf(b) <= t && endOf(b) >= t)).sort((a, b) => (a.draft.hour || 0) - (b.draft.hour || 0));
    const outs = list.filter(b => isActive(b) && b.kind === 'stay' && addDays(b.draft.checkIn, b.draft.nights) === t);
    $('#todayRows').innerHTML = todays.length + outs.length ? [
      ...todays.map(b => row(b, b.kind === 'unwind' ? `${hh(b.draft.hour)} · ${guests(b)} ${b.draft.players ? 'players' : 'guests'}` : b.kind === 'stay' ? (b.draft.checkIn === t ? 'Check-in today' : 'In house') : `Day ${Math.round((parse(t) - parse(b.draft.start)) / 864e5) + 1} of ${b.draft.days} · ${b.draft.guests} guests`)),
      ...outs.map(b => row(b, 'Check-out today'))].join('') : '<p class="empty-s">Nothing booked today.</p>';

    // --- holds ---
    $('#holdRows').innerHTML = held.length ? held.sort((a, b) => a.holdUntil - b.holdUntil).slice(0, 5).map(b => row(b, left(b.holdUntil), inr(b.quote.advance) + ' due')).join('') : '<p class="empty-s">No bookings on hold.</p>';
    // --- enquiries ---
    const enq = K.enquiries.list().filter(e => (e.status || 'new') === 'new').sort((a, b) => b.at - a.at).slice(0, 4);
    $('#enqRows').innerHTML = enq.length ? enq.map(e => `<div class="row" data-enq><span class="row-dot" style="background:var(--gold)"></span><div><p class="row-t">${esc(e.name)}</p><p class="row-s">${esc(e.occasion)}${e.guests ? ' · ' + esc(e.guests) + ' guests' : ''}</p></div><span class="row-r">${ago(e.at)}</span></div>`).join('') : '<p class="empty-s">No new enquiries.</p>';
    $$('[data-enq]', el).forEach(r => r.onclick = () => go('enquiries'));
    $$('.row[data-id]', el).forEach(r => r.onclick = () => openPanel(r.dataset.id));

    // --- occupancy heat strip ---
    heat($('#heat'));
  }
  const row = (b, sub, right) => `<div class="row" data-id="${b.id}"><span class="row-dot" style="background:${SER[b.kind]}"></span><div><p class="row-t">${esc(what(b))}</p><p class="row-s">${esc(b.customer.name)} · ${esc(sub)}</p></div><span class="row-r">${right || b.id}</span></div>`;

  function drawStack(host, data) {
    const W = Math.max(320, host.clientWidth || 600), H = 240, pl = 56, pr = 8, pt = 22, pb = 26;
    const max = Math.max(1, ...data.map(d => d.total));
    const step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step;
    const ticks = [0, nice / 2, nice];
    const bw = Math.min(56, (W - pl - pr) / data.length * 0.5);
    const x = i => pl + (W - pl - pr) / data.length * (i + 0.5);
    const y = v => pt + (H - pt - pb) * (1 - v / nice);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Payments collected per month, by category">`;
    ticks.forEach(t => { s += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${pl - 10}" y="${y(t) + 4}" text-anchor="end">${short(t)}</text>`; });
    data.forEach((d, i) => {
      let acc = 0;
      const segs = Object.keys(KIND).filter(k => d[k] > 0);
      segs.forEach((k, j) => {
        const y0 = y(acc), y1 = y(acc + d[k]); acc += d[k];
        const h = Math.max(0, y0 - y1 - (j < segs.length - 1 ? 2 : 0)); // 2px surface gap between stacked segments
        const top = j === segs.length - 1;
        const r = top ? Math.min(4, h) : 0;
        const X = x(i) - bw / 2, Y = y0 - h - (j > 0 ? 0 : 0);
        s += top
          ? `<path d="M${X},${Y + h} V${Y + r} Q${X},${Y} ${X + r},${Y} H${X + bw - r} Q${X + bw},${Y} ${X + bw},${Y + r} V${Y + h} Z" fill="${SER[k]}"/>`
          : `<rect x="${X}" y="${Y}" width="${bw}" height="${h}" fill="${SER[k]}"/>`;
      });
      if (d.total) s += `<text class="tot" x="${x(i)}" y="${y(d.total) - 7}" text-anchor="middle">${short(d.total)}</text>`;
      s += `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
      s += `<rect class="hit" data-i="${i}" x="${x(i) - (W - pl - pr) / data.length / 2}" y="${pt}" width="${(W - pl - pr) / data.length}" height="${H - pt - pb}"/>`;
    });
    s += '</svg>';
    host.innerHTML = s;
    $$('.hit', host).forEach(r => {
      const d = data[+r.dataset.i];
      const html = `<b>${d.full}</b>${Object.keys(KIND).map(k => `<div class="tr"><span><i style="background:${SER[k]}"></i>${KIND[k]}s</span><span>${inr(d[k])}</span></div>`).join('')}<div class="tr" style="border-top:1px solid rgba(255,255,255,.12);margin-top:4px;padding-top:4px"><span>Total</span><b>${inr(d.total)}</b></div>`;
      r.onmouseenter = e => showTip(html, e); r.onmousemove = moveTip; r.onmouseleave = hideTip;
    });
  }

  function heat(host) {
    const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
    const ramp = ['#1d1d1f', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
    const shade = f => ramp[f <= 0 ? 0 : Math.min(5, 1 + Math.floor(f * 4.999))];
    const ink = f => f > 0.6 ? '#0b0b0c' : 'var(--ink)';
    const used = (id, d) => K.items[id].units - K.unitsFree(id, d);
    const venuesUsed = d => C.venues.filter(v => K.venueBooked(v.id, d)).length;
    const rowsDef = [
      ['Venues', d => venuesUsed(d), C.venues.length],
      ['Villas', d => used('villa', d), K.items.villa.units],
      ['Guest rooms', d => used('room', d), K.items.room.units]
    ];
    let h = `<div class="heat" style="grid-template-columns:90px repeat(14,minmax(0,1fr))"><span></span>${days.map(d => `<span class="hd">${parse(d).toLocaleDateString('en-IN', { weekday: 'narrow' })}<br>${parse(d).getDate()}</span>`).join('')}`;
    rowsDef.forEach(([label, fn, cap]) => {
      h += `<span class="hl">${label}</span>`;
      days.forEach(d => { const n = fn(d), f = n / cap; h += `<span class="hc" style="background:${shade(f)};color:${ink(f)}" data-tip="${label} · ${nice(d)}: ${n} of ${cap} booked (${Math.round(f * 100)}%)">${n}</span>`; });
    });
    h += `</div><p class="note-s">Booked units per day (e.g. villas taken out of ${K.items.villa.units}). Darker = quieter, brighter = busier.</p>`;
    host.innerHTML = h;
    $$('.hc', host).forEach(c => { c.onmouseenter = e => showTip(esc(c.dataset.tip), e); c.onmousemove = moveTip; c.onmouseleave = hideTip; });
  }

  /* ============================================================
     BOOKINGS
     ============================================================ */
  function bookings(el) {
    const list = all();
    const counts = s => s === 'all' ? list.length : list.filter(b => b.status === s).length;
    let rows = list.filter(b => (filt.status === 'all' || b.status === filt.status) && (filt.kind === 'all' || b.kind === filt.kind));
    if (q) rows = rows.filter(b => [b.id, b.customer.name, b.customer.email, b.customer.phone, what(b)].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => startOf(b).localeCompare(startOf(a)));
    el.innerHTML = `
      <div class="tools">
        <div class="chips">${['all', 'held', 'confirmed', 'paid', 'expired', 'cancelled'].map(s => `<button class="chip ${filt.status === s ? 'is-on' : ''}" data-s="${s}">${s === 'all' ? 'All' : STATUS[s]}<b>${counts(s)}</b></button>`).join('')}</div>
        <div style="display:flex;gap:8px"><select class="sel" id="kindSel"><option value="all">All types</option>${Object.keys(KIND).map(k => `<option value="${k}" ${filt.kind === k ? 'selected' : ''}>${KIND[k]}s</option>`).join('')}</select><button class="chip" id="csv">Export CSV</button></div>
      </div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Reference</th><th>Guest</th><th>Booking</th><th>Dates</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th></tr></thead>
      <tbody>${rows.length ? rows.map(b => `<tr class="click" data-id="${b.id}"><td><span class="ref">${b.id}</span><small>${kindTag(b.kind)}</small></td><td>${esc(b.customer.name)}<small>${esc(b.customer.phone)}</small></td><td>${esc(what(b))}<small>${guests(b)} ${b.kind === 'unwind' && b.draft.players ? 'players' : 'guests'}</small></td><td>${esc(when(b))}${b.status === 'held' ? `<small>${left(b.holdUntil)}</small>` : ''}</td><td class="num">${inr(b.quote.total)}</td><td class="num">${inr(K.paidSum(b))}</td><td class="num">${b.status === 'cancelled' ? '—' : inr(K.balance(b))}</td><td>${stPill(b.status)}</td></tr>`).join('') : `<tr><td colspan="8"><p class="empty-s">No bookings match.</p></td></tr>`}</tbody></table></div>`;
    $$('.chip[data-s]', el).forEach(c => c.onclick = () => { filt.status = c.dataset.s; render(); });
    $('#kindSel').onchange = e => { filt.kind = e.target.value; render(); };
    $$('tr[data-id]', el).forEach(r => r.onclick = () => openPanel(r.dataset.id));
    $('#csv').onclick = () => {
      const head = ['Reference', 'Type', 'Status', 'Customer', 'Email', 'Phone', 'Booking', 'Start', 'End', 'Guests', 'Taxable', 'GST', 'Total', 'Paid', 'Balance', 'Created'];
      const lines = rows.map(b => [b.id, KIND[b.kind], STATUS[b.status], b.customer.name, b.customer.email, b.customer.phone, what(b), startOf(b), endOf(b), guests(b), b.quote.subtotal, b.quote.gst, b.quote.total, K.paidSum(b), K.balance(b), new Date(b.createdAt).toISOString()]);
      const csv = [head, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `kankana-bookings-${today()}.csv`; a.click();
    };
  }

  /* ============================================================
     CALENDAR
     ============================================================ */
  function calendar(el) {
    const y = calMonth.getFullYear(), m = calMonth.getMonth(), n = new Date(y, m + 1, 0).getDate();
    const days = Array.from({ length: n }, (_, i) => ymd(new Date(y, m, i + 1)));
    const list = all().filter(isActive);
    const cols = `150px repeat(${n},minmax(26px,1fr))`;
    let h = `<div class="tl" style="grid-template-columns:${cols}"><span></span>${days.map(d => { const dd = parse(d), we = dd.getDay() % 6 === 0; return `<span class="h ${we ? 'we' : ''} ${d === today() ? 'td' : ''}">${dd.toLocaleDateString('en-IN', { weekday: 'narrow' })}<br>${dd.getDate()}</span>`; }).join('')}`;
    C.venues.forEach(v => {
      h += `<span class="r">${v.name}</span>`;
      days.forEach(d => {
        const b = list.find(x => x.kind === 'celebration' && x.draft.venues.includes(v.id) && d >= x.draft.start && d <= endOf(x));
        const bl = K.blocks.on(v.id, d);
        if (b) h += `<span class="c hasb ${b.status}" data-id="${b.id}" data-tip="${esc(b.id)} · ${esc(b.customer.name)}<br>${esc(b.draft.eventType || '')} · ${b.draft.guests} guests · ${STATUS[b.status]}"></span>`;
        else if (bl) h += `<span class="c block act" data-unblock="${bl.id}" data-tip="Blocked: ${esc(bl.reason || 'no reason given')}<br>Click to unblock"></span>`;
        else h += d >= today() ? `<span class="c act" data-block="${v.id}" data-d="${d}" data-tip="${esc(v.name)} · ${nice(d)}<br>Free · click to block"></span>` : '<span class="c"></span>';
      });
    });
    h += '<span class="sep"></span>';
    ['villa', 'room', ...C.unwind.filter(u => u.mode === 'hourly').map(u => u.id)].forEach(id => {
      const it = K.items[id];
      h += `<span class="r">${it.name}</span>`;
      days.forEach(d => {
        if (it.kind === 'stay') {
          const u = it.units - K.unitsFree(id, d), f = u / it.units;
          const bs = list.filter(x => (x.kind === 'stay' && x.draft.stay === id && d >= x.draft.checkIn && d < addDays(x.draft.checkIn, x.draft.nights)) || (x.kind === 'celebration' && (id === 'villa' ? x.draft.villas : x.draft.rooms) && d >= x.draft.start && d <= endOf(x)));
          h += `<span class="c ${bs.length ? 'hasb' : ''}" ${bs[0] ? `data-id="${bs[0].id}"` : ''} style="${u ? `background:rgba(217,89,38,${0.25 + f * 0.75});color:${f > 0.5 ? '#0b0b0c' : 'var(--ink)'}` : ''}" data-tip="${it.name} · ${nice(d)}: ${u}/${it.units} booked${bs.length ? '<br>' + bs.map(x => esc(x.id + ' · ' + x.customer.name)).join('<br>') : ''}">${u || ''}</span>`;
        } else {
          const bs = list.filter(x => x.kind === 'unwind' && x.draft.item === id && x.draft.date === d);
          const hrs = bs.reduce((s, x) => s + x.draft.hours, 0);
          h += `<span class="c ${bs.length ? 'hasb' : ''}" ${bs[0] ? `data-id="${bs[0].id}"` : ''} style="${hrs ? `background:rgba(25,158,112,${0.3 + Math.min(1, hrs / 8) * 0.7});color:#0b0b0c` : ''}" data-tip="${it.name} · ${nice(d)}: ${hrs} hour${hrs === 1 ? '' : 's'} booked">${hrs || ''}</span>`;
        }
      });
    });
    h += '</div>';

    // day schedule for hourly spaces + café
    const sched = () => {
      const d = schedDate, hours = []; for (let t = 6; t < 23; t++) hours.push(t);
      let s = `<div class="tl" style="grid-template-columns:150px repeat(${hours.length},minmax(44px,1fr));min-width:900px"><span></span>${hours.map(t => `<span class="h">${hh(t)}</span>`).join('')}`;
      C.unwind.filter(u => u.mode === 'hourly').forEach(u => {
        s += `<span class="r">${u.name}</span>`;
        hours.forEach(t => {
          if (t < u.open || t >= u.close) return (s += '<span class="c" style="opacity:.25"></span>');
          const b = all().filter(isActive).find(x => x.kind === 'unwind' && x.draft.item === u.id && x.draft.date === d && t >= x.draft.hour && t < x.draft.hour + x.draft.hours);
          const bl = K.blocks.on(u.id, d);
          s += b ? `<span class="c hasb paid" style="background:var(--s3)" data-id="${b.id}" data-tip="${esc(b.id)} · ${esc(b.customer.name)} · ${b.draft.players} players"></span>` : bl ? `<span class="c block" data-tip="Blocked"></span>` : '<span class="c"></span>';
        });
      });
      const cafe = K.items.cafe;
      s += `<span class="r">${cafe.name} (seats)</span>`;
      hours.forEach(t => {
        const sit = K.cafeSittings().find(x => t >= x && t < x + cafe.sittingHours);
        if (sit == null) return (s += '<span class="c" style="opacity:.25"></span>');
        const taken = all().filter(isActive).filter(x => x.kind === 'unwind' && x.draft.item === 'cafe' && x.draft.date === d && x.draft.hour === sit).reduce((a, x) => a + x.draft.guests, 0);
        s += `<span class="c" style="${taken ? `background:rgba(25,158,112,${0.3 + taken / cafe.seats * 0.7});color:#0b0b0c` : ''}" data-tip="${hh(sit)}–${hh(sit + 2)} sitting: ${taken}/${cafe.seats} seats">${t === sit && taken ? taken : ''}</span>`;
      });
      return s + '</div>';
    };

    el.innerHTML = `
      <div class="tools"><div class="monthnav"><button id="pm" aria-label="Previous month">‹</button><span>${calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span><button id="nm" aria-label="Next month">›</button></div><button class="chip" id="tm">Today</button></div>
      <div class="tl-wrap">${h}
        <div class="tl-key"><span><i style="background:var(--s1)"></i>Venue confirmed / paid</span><span><i style="background:repeating-linear-gradient(135deg,rgba(57,135,229,.55) 0 3px,rgba(57,135,229,.25) 3px 6px);outline:1px solid var(--s1)"></i>Venue on hold</span><span><i style="background:repeating-linear-gradient(135deg,rgba(255,255,255,.3) 0 2px,transparent 2px 5px)"></i>Blocked</span><span style="color:var(--ink-3)">Click a free venue day to block it · click a blocked day to unblock</span><span><i style="background:var(--s2)"></i>Villas / rooms booked (number)</span><span><i style="background:var(--s3)"></i>Hours booked (number)</span></div>
      </div>
      <div class="box-h" style="margin-top:28px"><h2>Day schedule · turf, court &amp; café</h2><label class="fld" style="margin:0;flex-direction:row;align-items:center;gap:10px"><span>Date</span><input type="date" id="sd" value="${schedDate}" style="width:auto;padding:8px 12px"></label></div>
      <div class="tl-wrap" id="sched">${sched()}</div>`;
    $('#pm').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); render(); };
    $('#nm').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); render(); };
    $('#tm').onclick = () => { calMonth = new Date(); calMonth.setDate(1); schedDate = today(); render(); };
    $('#sd').onchange = e => { schedDate = e.target.value || today(); $('#sched').innerHTML = sched(); bindCells(); };
    const bindCells = () => {
      $$('[data-block]', el).forEach(c => c.onclick = () => { hideTip(); K.blocks.add({ res: c.dataset.block, from: c.dataset.d, to: c.dataset.d, units: 0, reason: 'Blocked from calendar' }); K.toast(`${K.items[c.dataset.block].name} blocked on ${nice(c.dataset.d)}.`); render(); });
      $$('[data-unblock]', el).forEach(c => c.onclick = () => { hideTip(); K.blocks.remove(c.dataset.unblock); K.toast('Date unblocked.'); render(); });
      $$('[data-tip]', el).forEach(c => { c.onmouseenter = e => showTip(c.dataset.tip, e); c.onmousemove = moveTip; c.onmouseleave = hideTip; });
      $$('.c.hasb[data-id]', el).forEach(c => c.onclick = () => { hideTip(); openPanel(c.dataset.id); });
    };
    bindCells();
  }

  /* ============================================================
     ENQUIRIES
     ============================================================ */
  function enquiries(el) {
    const list = K.enquiries.list();
    const ord = list.map((e, i) => ({ ...e, i })).sort((a, b) => b.at - a.at);
    el.innerHTML = ord.length ? `<div class="enq">${ord.map(e => `
      <article class="box eqc" data-i="${e.i}">
        <div class="eqc-top"><div><h3>${esc(e.name)}</h3><p class="meta">${esc(e.occasion)}${e.guests ? ' · ' + esc(e.guests) + ' guests' : ''}${e.date ? ' · ' + niceLong(e.date) : ''}</p></div>
          <select class="est" aria-label="Status">${['new', 'contacted', 'converted', 'closed'].map(s => `<option value="${s}" ${(e.status || 'new') === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <p class="msg">${esc(e.message || '—')}</p>
        <p class="meta">${esc(e.phone)} · ${esc(e.email)} · received ${ago(e.at)}</p>
        <input class="note" placeholder="Add a note for the team…" value="${esc(e.note || '')}">
        <div class="acts"><a href="tel:${esc(e.phone.replace(/\s/g, ''))}">Call</a><a href="mailto:${esc(e.email)}?subject=${encodeURIComponent('Your enquiry at Kankana')}">Email</a><a href="https://wa.me/${esc(e.phone.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a><button data-start>Start a booking</button></div>
      </article>`).join('')}</div>` : '<div class="mb-empty">No enquiries yet. They arrive here from the form on the website.</div>';
    $$('.eqc', el).forEach(c => {
      const i = +c.dataset.i;
      const upd = patch => { const l = K.enquiries.list(); Object.assign(l[i], patch); K.enquiries.save(l); };
      $('.est', c).onchange = e => { upd({ status: e.target.value }); $('#enqBadge').textContent = K.enquiries.list().filter(x => (x.status || 'new') === 'new').length || ''; };
      $('.note', c).onchange = e => { upd({ note: e.target.value }); K.toast('Note saved.'); };
      $('[data-start]', c).onclick = () => {
        const e = list[i];
        upd({ status: 'converted' });
        K.open(e.occasion === 'Stay' ? 'villa' : '', 'celebration');
        setTimeout(() => { /* prefill customer for the drawer */ }, 0);
      };
    });
  }

  /* ============================================================
     BLOCKED DATES
     ============================================================ */
  function blocks(el) {
    const res = [...C.venues.map(v => [v.id, v.name]), ...C.stays.map(s => [s.id, s.name]), ...C.unwind.map(u => [u.id, u.name])];
    const name = id => (res.find(r => r[0] === id) || [, id])[1];
    const list = K.blocks.list().sort((a, b) => a.from.localeCompare(b.from));
    el.innerHTML = `
      <div class="box"><div class="box-h"><h2>Close a space for maintenance, private use or offline bookings</h2></div>
        <form class="frm" id="blkForm">
          <label class="fld s2"><span>Space</span><select name="res">${res.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select></label>
          <label class="fld"><span>From</span><input type="date" name="from" required value="${today()}"></label>
          <label class="fld"><span>To</span><input type="date" name="to" required value="${today()}"></label>
          <label class="fld"><span>Units <small>(villas/rooms)</small></span><input type="number" name="units" min="1" placeholder="All"></label>
          <label class="fld"><span>Reason</span><input name="reason" placeholder="e.g. Maintenance"></label>
          <div class="s6"><button class="btn-gold btn-sm" type="submit">Block dates</button></div>
        </form>
        <p class="note-s">Blocked dates disappear from the booking calendar on the website straight away.</p></div>
      <div class="tbl-wrap" style="margin-top:14px"><table class="t" style="min-width:640px"><thead><tr><th>Space</th><th>From</th><th>To</th><th>Units</th><th>Reason</th><th></th></tr></thead>
      <tbody>${list.length ? list.map(b => `<tr><td>${esc(name(b.res))}</td><td>${niceLong(b.from)}</td><td>${niceLong(b.to)}</td><td>${b.units || 'All'}</td><td>${esc(b.reason || '—')}</td><td class="num"><button class="chip" data-rm="${b.id}">Remove</button></td></tr>`).join('') : '<tr><td colspan="6"><p class="empty-s">No blocked dates.</p></td></tr>'}</tbody></table></div>`;
    $('#blkForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (f.to < f.from) return K.toast('"To" must be on or after "From".');
      const units = +f.units || 0;
      K.blocks.add({ res: f.res, from: f.from, to: f.to, units: K.items[f.res].kind === 'stay' && units ? Math.min(units, K.items[f.res].units) : 0, reason: f.reason });
      K.toast(`${name(f.res)} blocked.`); render();
    };
    $$('[data-rm]', el).forEach(b => b.onclick = () => { K.blocks.remove(b.dataset.rm); render(); });
  }

  /* ============================================================
     PRICING (read from config.js)
     ============================================================ */
  function pricing(el) {
    const g = C.gst, p = C.policy;
    const tbl = (head, rows) => `<div class="tbl-wrap"><table class="t price-t" style="min-width:520px"><thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    el.innerHTML = `
      <div class="ad-grid two">
        <div class="box"><div class="box-h"><h2>Celebrations · per day</h2></div>${tbl(['Space', 'Type', 'Capacity', 'Price / day', 'GST'], C.venues.map(v => [v.name, v.type, v.capacity, inr(v.pricePerDay), g.venue + '%']))}</div>
        <div class="box"><div class="box-h"><h2>Policies</h2></div>${tbl(['Booking type', 'Advance', 'Hold', 'Limit'], [['Celebrations', p.celebration.advancePct + '%', p.celebration.holdHours + ' hours', `${p.celebration.minDays}–${p.celebration.maxDays} days`], ['Stays', p.stay.advancePct + '%', p.stay.holdHours + ' hours', `Up to ${p.stay.maxNights} nights`], ['Turf, court, café', 'Full', '—', 'Hourly / sitting']])}</div>
      </div>
      <div class="ad-grid two" style="margin-top:14px">
        <div class="box"><div class="box-h"><h2>Stays &amp; unwind</h2></div>${tbl(['Item', 'Units / limit', 'Price', 'GST'], [...C.stays.map(s => [s.name, `${s.units} · sleeps ${s.sleeps}`, inr(s.pricePerNight) + ' / night', (s.pricePerNight <= g.accommodationThreshold ? g.accommodationLow : g.accommodationHigh) + '%']), ...C.unwind.map(u => [u.name, u.mode === 'hourly' ? `${u.maxPlayers} players · ${hh(u.open)}–${hh(u.close)}` : `${u.seats} seats · ${u.sittingHours}h sitting`, u.mode === 'hourly' ? inr(u.pricePerHour) + ' / hour' : inr(u.pricePerGuest) + ' / guest', g[u.gstKey] + '%'])])}</div>
        <div class="box"><div class="box-h"><h2>Wedding extras</h2></div>${tbl(['Item', 'Price', 'GST'], [...C.foodPackages.map(f => [f.name + ' package', inr(f.perGuestPerDay) + ' / guest / day', g.catering + '%']), ...C.addons.map(a => [a.name, inr(a.price) + (a.per === 'guest' ? ' / guest' : ''), g.services + '%'])])}</div>
      </div>
      <p class="note-s">Prices, capacities, GST and policies are set in <b>config.js</b>. Change them there and the website, booking flow, PDFs and this dashboard all update together.</p>`;
  }

  /* ============================================================
     BOOKING DETAIL PANEL
     ============================================================ */
  function openPanel(id) {
    const b = K.getBooking(id); if (!b) return;
    const p = $('#panel'), card = $('.ad-panel-card', p), q2 = b.quote, bal = K.balance(b), d = K.describe(b);
    const link = new URL(`mybooking.html?id=${b.id}&email=${encodeURIComponent(b.customer.email)}`, location.href).href;
    card.innerHTML = `
      <div class="dp-top"><div><p class="kick" style="margin-bottom:6px">${KIND[b.kind]}</p><p class="dp-id">${b.id}</p></div><div style="display:flex;gap:10px;align-items:center">${stPill(b.status)}<button class="bk-x" id="dpX" aria-label="Close">×</button></div></div>
      ${b.status === 'held' ? `<p class="note-s" style="margin:0 0 6px;color:var(--warn)">Hold ${left(b.holdUntil)} · ${inr(q2.advance)} advance due</p>` : ''}
      <div class="rv-head"><p class="rv-t">${esc(d.title)}</p><p>${esc(d.when)}</p><p>${esc(d.who)}</p></div>
      <div class="dp-sec dp-cust"><h3>Customer</h3><p>${esc(b.customer.name)}<br><a href="tel:${esc(b.customer.phone.replace(/\s/g, ''))}">${esc(b.customer.phone)}</a> · <a href="mailto:${esc(b.customer.email)}">${esc(b.customer.email)}</a></p>${b.customer.notes ? `<p class="note-s">"${esc(b.customer.notes)}"</p>` : ''}</div>
      <div class="dp-sec"><h3>Price</h3><div class="rv-lines">${q2.lines.map(l => `<div class="rv-l"><div><p>${esc(l.label)}</p><small>${esc(l.detail)} · GST ${l.gst}%</small></div><b>${inr(l.amount)}</b></div>`).join('')}</div>
        <div class="rv-sum">${q2.discount ? `<div><span>Before discount</span><b>${inr(q2.gross)}</b></div><div class="rv-disc"><span>${esc(q2.discountLabel)}</span><b>− ${inr(q2.discount)}</b></div>` : ''}<div><span>Taxable</span><b>${inr(q2.subtotal)}</b></div><div><span>GST</span><b>${inr(q2.gst)}</b></div><div class="rv-total"><span>Total</span><b>${inr(q2.total)}</b></div><div><span>Paid</span><b>${inr(K.paidSum(b))}</b></div><div class="rv-adv"><span>Balance</span><b>${inr(bal)}</b></div></div></div>
      <div class="dp-sec"><h3>Payments</h3>${b.payments.length ? `<table class="mb-payments">${b.payments.map(x => `<tr><td>${dt(x.at)}<br><small>${esc(x.method)} · ${esc(x.id)}</small></td><td>${inr(x.amount)}</td></tr>`).join('')}</table>` : '<p class="empty-s">No payments yet.</p>'}</div>
      ${(b.status === 'held' || b.status === 'confirmed') && bal > 0 ? `
      <div class="dp-sec"><h3>Record an offline payment</h3>
        <form class="pay-frm" id="payFrm">
          <label class="fld"><span>Amount (₹)</span><input name="amt" type="number" min="1" max="${bal}" value="${b.status === 'held' ? q2.advance : bal}"></label>
          <label class="fld"><span>Method</span><select name="m"><option>Bank transfer</option><option>UPI (offline)</option><option>Cash</option><option>Cheque</option><option>Card machine</option></select></label>
          <label class="fld full"><span>Reference</span><input name="ref" placeholder="UTR / cheque no. / receipt no."></label>
          <div class="full"><button class="btn-gold btn-sm" type="submit">Record payment</button></div>
        </form></div>` : ''}
      ${b.status !== 'cancelled' && b.status !== 'paid' ? `
      <div class="dp-sec"><h3>Discount</h3>
        <form class="pay-frm" id="discFrm">
          <label class="fld"><span>Type</span><select name="type"><option value="pct" ${q2.discountSpec?.type === 'pct' ? 'selected' : ''}>Percent (%)</option><option value="flat" ${q2.discountSpec?.type === 'flat' ? 'selected' : ''}>Amount (₹)</option></select></label>
          <label class="fld"><span>Value</span><input name="value" type="number" min="0" step="any" value="${q2.discountSpec?.value || ''}" placeholder="e.g. 10"></label>
          <label class="fld full"><span>Label on quotation</span><input name="label" value="${esc(q2.discountSpec?.label || '')}" placeholder="e.g. Early-bird offer"></label>
          <div class="full dp-acts"><button class="btn-gold btn-sm" type="submit" style="border:0">Apply &amp; revise quotation</button>${q2.discount ? '<button type="button" id="discRm">Remove discount</button>' : ''}</div>
        </form>
        <p class="note-s">Applied before GST. Prices already quoted stay the same; the client gets a revised quotation.</p></div>` : ''}
      <div class="dp-sec"><h3>Documents</h3><div class="dp-acts"><button data-doc="quotation">Quotation</button>${b.invoiceNo ? '<button data-doc="invoice">Tax invoice</button>' : ''}${b.payments.map((x, i) => `<button data-doc="receipt" data-p="${i}">Receipt ${i + 1}</button>`).join('')}</div></div>
      <div class="dp-sec"><h3>Actions</h3><div class="dp-acts">
        ${b.status === 'held' || b.status === 'expired' ? '<button id="ext">Extend hold +24h</button>' : ''}
        ${b.status === 'held' || (b.status === 'confirmed' && bal > 0) ? '<button id="remind">Send payment reminder</button>' : ''}
        <button id="copy">Copy customer link</button>
        <a href="mailto:${esc(b.customer.email)}?subject=${encodeURIComponent('Your Kankana booking ' + b.id)}&body=${encodeURIComponent('Manage your booking here: ' + link)}">Email customer</a>
        <a href="https://wa.me/${esc(b.customer.phone.replace(/\D/g, ''))}?text=${encodeURIComponent(`Hi ${b.customer.name.split(' ')[0]}, here is your Kankana booking ${b.id}: ${link}`)}" target="_blank" rel="noopener">WhatsApp</a>
        ${b.status !== 'cancelled' && b.status !== 'expired' ? '<button class="danger" id="cancel">Cancel booking</button>' : ''}
      </div></div>
      <div class="dp-sec"><h3>Internal notes</h3><textarea class="dp-notes" id="notes" placeholder="Visible to staff only">${esc(b.adminNotes || '')}</textarea></div>
      <p class="note-s">Created ${dt(b.createdAt)} · Quotation ${b.quotationNo}${b.invoiceNo ? ' · Invoice ' + b.invoiceNo : ''}${b.cancelledAt ? ' · Cancelled ' + dt(b.cancelledAt) : ''}</p>`;
    p.hidden = false; requestAnimationFrame(() => p.classList.add('on'));
    $('#dpX').onclick = closePanel;
    $$('[data-doc]', card).forEach(x => x.onclick = () => K.pdf(x.dataset.doc, b, b.payments[+x.dataset.p || b.payments.length - 1]));
    $('#payFrm') && ($('#payFrm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)); const amt = Math.round(+f.amt);
      if (!(amt > 0) || amt > bal) return K.toast(`Enter an amount between ₹1 and ${inr(bal)}.`);
      K.recordPayment(b, amt, { id: f.ref || 'offline_' + Date.now().toString(36), method: f.m });
      K.toast(`${inr(amt)} recorded against ${b.id}.`); openPanel(b.id); render();
    });
    $('#ext') && ($('#ext').onclick = () => { K.extendHold(b.id, 24); K.toast('Hold extended by 24 hours.'); openPanel(b.id); render(); });
    $('#copy').onclick = () => { navigator.clipboard?.writeText(link).then(() => K.toast('Customer link copied.'), () => K.toast(link)); };
    $('#cancel') && ($('#cancel').onclick = e => {
      const btn = e.currentTarget;
      if (!btn.classList.contains('arm')) { btn.classList.add('arm'); btn.textContent = 'Click again to cancel'; setTimeout(() => { btn.classList.remove('arm'); btn.textContent = 'Cancel booking'; }, 3000); return; }
      K.cancelBooking(b.id); K.toast(`${b.id} cancelled. Dates released.`); openPanel(b.id); render();
    });
    $('#discFrm') && ($('#discFrm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (!(+f.value > 0)) return K.toast('Enter a discount value.');
      if (f.type === 'pct' && +f.value > 100) return K.toast('A percentage can\'t be over 100.');
      K.applyDiscount(K.getBooking(b.id), { type: f.type, value: +f.value, label: f.label.trim() || '' });
      K.toast('Discount applied. Revised quotation logged for the client.'); openPanel(b.id); render();
    });
    $('#discRm') && ($('#discRm').onclick = () => { K.applyDiscount(K.getBooking(b.id), null); K.toast('Discount removed.'); openPanel(b.id); render(); });
    $('#remind') && ($('#remind').onclick = () => { K.logEmail(K.getBooking(b.id), 'reminder', `Reminder: ${b.status === 'held' ? 'your dates are on hold' : 'balance due'} for ${b.id}`); K.toast(`Reminder logged for ${b.customer.email}.`); });
    $('#notes').onchange = e => { const x = K.getBooking(b.id); x.adminNotes = e.target.value; K.saveBooking(x); K.toast('Note saved.'); };
  }
  function closePanel() { const p = $('#panel'); if (p.hidden) return; p.classList.remove('on'); setTimeout(() => (p.hidden = true), 400); }

  /* shared helpers for the extra views in admin-more.js */
  window.KNKA = window.KNKA || { views: {} };
  Object.assign(window.KNKA, {
    ctx: { go, render: () => render(), openPanel, closePanel, showTip, moveTip, hideTip, what, when, startOf, endOf, guests, isActive, stPill, kindTag, KIND, STATUS, SER, short, ago, left, all,
      searchFor: term => { q = term.toLowerCase(); $('#search').value = term; filt.status = 'all'; go('bookings'); } }
  });
  try { if (sessionStorage.getItem('knk_admin') === '1') enter(); } catch {}
})();
