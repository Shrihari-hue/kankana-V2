/* ============================================================
   KANKANA — booking page (book.html)
   Celebrations · Villas & Rooms · Turf & Pickleball · Café
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG, K = window.KNK;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { inr, esc, nice, niceLong, addDays, ymd, parse, hh } = K;
  const today = () => ymd(new Date());
  const params = new URLSearchParams(location.search);

  const TABS = {
    event: { kind: 'celebration', kick: 'Plan your celebration', title: 'Check availability & reserve your dates', p: () => `Choose a venue and date, shape your celebration, and get an instant quotation. A ${C.policy.celebration.advancePct}% advance confirms your booking.` },
    stay: { kind: 'stay', kick: 'Stay on the estate', title: 'Book a villa or guest room', p: () => `Up to ${C.policy.stay.maxNights} nights. A ${C.policy.stay.advancePct}% advance confirms your stay, or hold it for ${C.policy.stay.holdHours} hours.` },
    sport: { kind: 'unwind', kick: 'Play', title: 'Book the turf or pickleball court', p: () => 'Pick a date and time. Paid in full when you book.' },
    cafe: { kind: 'unwind', kick: 'The Café', title: 'Reserve a table', p: () => `${K.items.cafe ? K.items.cafe.sittingHours + '-hour sittings, ' + inr(K.items.cafe.pricePerGuest) + ' a guest' : ''}. Paid in full when you book.` }
  };
  const firstLive = arr => (arr.find(x => x.live !== false) || arr[0] || {}).id;
  const D = {
    event: { kind: 'celebration', venues: [firstLive(C.venues)].filter(Boolean), start: null, days: 1, guests: 150, food: C.foodPackages[1]?.id || C.foodPackages[0]?.id || null, addons: [], villas: 0, rooms: 0, eventType: 'Wedding' },
    stay: { kind: 'stay', stay: firstLive(C.stays), checkIn: null, nights: 0, units: 1, guests: 2 },
    sport: { kind: 'unwind', item: C.unwind.find(u => u.mode === 'hourly')?.id, date: null, hour: null, hours: 1, players: 10 },
    cafe: { kind: 'unwind', item: 'cafe', date: null, hour: null, guests: 2 }
  };
  const cust = { name: '', email: '', phone: '', city: '', state: '', gstin: '', notes: '' };
  let tab = TABS[params.get('type')] ? params.get('type') : 'event';
  const it = params.get('item');
  if (it && K.items[it]) {
    const k = K.items[it].kind;
    if (k === 'celebration') { tab = 'event'; D.event.venues = [it]; }
    else if (k === 'stay') { tab = 'stay'; D.stay.stay = it; }
    else if (it === 'cafe') tab = 'cafe';
    else { tab = 'sport'; D.sport.item = it; }
  }

  /* ---------------- helpers ---------------- */
  const step = (n, title, body) => `<section class="bp-step"><h2><span>${String(n).padStart(2, '0')}</span>${title}</h2>${body}</section>`;
  const span = (s, n) => Array.from({ length: n }, (_, i) => addDays(s, i));
  const legend = `<div class="bp-legend"><span><i class="l-free"></i>Available</span><span><i class="l-mine"></i>Your dates</span><span><i class="l-held"></i>On hold</span><span><i class="l-booked"></i>Booked</span><span><i class="l-na"></i>Unavailable</span></div>`;
  const detailsStep = n => step(n, 'Your details', `
    <div class="bp-form">
      <label class="fld"><span>Full name(s)</span><input data-c="name" autocomplete="name" placeholder="e.g. Ananya &amp; Rohan" value="${esc(cust.name)}"></label>
      <label class="fld"><span>Email</span><input data-c="email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(cust.email)}"></label>
      <label class="fld"><span>Phone</span><input data-c="phone" type="tel" autocomplete="tel" placeholder="+91 98xxx xxxxx" value="${esc(cust.phone)}"></label>
      <label class="fld"><span>City</span><input data-c="city" autocomplete="address-level2" placeholder="Where are you based?" value="${esc(cust.city)}"></label>
      <label class="fld"><span>State</span><input data-c="state" autocomplete="address-level1" placeholder="e.g. Karnataka" value="${esc(cust.state)}"></label>
      <label class="fld"><span>GSTIN <small>(optional, for business invoices)</small></span><input data-c="gstin" placeholder="29ABCDE1234F1Z5" style="text-transform:uppercase" value="${esc(cust.gstin)}"></label>
      <label class="fld full"><span>Anything we should know?</span><textarea data-c="notes" rows="3" placeholder="Rituals, themes, dietary needs, arrival time…">${esc(cust.notes)}</textarea></label>
    </div>`);

  /* ---------------- render ---------------- */
  function render() {
    const T = TABS[tab];
    $('#heroKick').textContent = T.kick; $('#heroTitle').textContent = T.title; $('#heroP').textContent = T.p();
    document.title = `${T.title} — Kankana`;
    $$('.bp-tabs button').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    history.replaceState(null, '', `?type=${tab}`);
    ({ event: renderEvent, stay: renderStay, sport: renderSport, cafe: renderCafe })[tab]($('#steps'));
    $$('[data-c]').forEach(i => i.oninput = () => { cust[i.dataset.c] = i.value; quote(); });
    quote();
  }

  /* ----- celebrations ----- */
  function renderEvent(el) {
    const x = D.event;
    const venue = () => K.items[x.venues[0]];
    el.innerHTML =
      step(1, 'Choose a venue', `<div class="bp-cards">${C.venues.map(v => `
        <button type="button" class="bp-card ${x.venues[0] === v.id ? 'on' : ''}" data-v="${v.id}" aria-pressed="${x.venues[0] === v.id}">
          <span class="bp-card-k">${esc(v.type === 'Venue' ? 'Event venue' : v.type)}</span><span class="bp-card-t">${esc(v.name)}</span><span class="bp-card-d">${esc(v.blurb)}</span>
          <span class="bp-card-f"><span>Up to ${v.capacity} guests</span><span>${inr(v.pricePerDay)} / day</span></span></button>`).join('')}</div>`) +
      step(2, 'Pick your dates', `<div class="cal" id="cal"></div>${legend}
        <div class="bp-form two"><label class="fld"><span>Start date</span><input type="date" id="startIn" min="${today()}" value="${x.start || ''}"></label>
        <label class="fld"><span>Celebration length</span><select id="lenIn">${Array.from({ length: C.policy.celebration.maxDays }, (_, i) => `<option value="${i + 1}" ${x.days === i + 1 ? 'selected' : ''}>${i + 1} day${i ? 's' : ''}</option>`).join('')}</select></label></div>
        <p class="bp-note" id="dateNote"></p>`) +
      step(3, 'Shape the celebration', `
        <div class="bp-form two"><label class="fld"><span>Guests</span><input type="number" id="guestsIn" min="1" value="${x.guests}"></label>
        <label class="fld"><span>Occasion</span><select id="occIn">${['Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Corporate event', 'Party', 'Other'].map(o => `<option ${o === x.eventType ? 'selected' : ''}>${o}</option>`).join('')}</select></label></div>
        <div class="bp-pkgs">${C.foodPackages.map(p => `<button type="button" class="bp-pkg ${x.food === p.id ? 'on' : ''}" data-p="${p.id}" aria-pressed="${x.food === p.id}"><b>${esc(p.name)}</b><span>${inr(p.perGuestPerDay)} per guest / day</span><small>${esc(p.blurb)}</small></button>`).join('')}
          <button type="button" class="bp-pkg slim ${!x.food ? 'on' : ''}" data-p="" aria-pressed="${!x.food}"><b>No package</b><small>Arrange catering later</small></button></div>
        <div class="bp-checks">${C.addons.map(a => `<label class="bp-check ${x.addons.includes(a.id) ? 'on' : ''}"><input type="checkbox" data-a="${a.id}" ${x.addons.includes(a.id) ? 'checked' : ''}><span><b>${esc(a.name)}</b><small>${inr(a.price)}${a.per === 'guest' ? ' per guest' : ''}</small></span></label>`).join('')}</div>
        <p class="bp-sub">Stay on the estate <small>optional · per night of your celebration</small></p>
        <div class="bp-checks" id="stayPick"></div>`) +
      detailsStep(4);

    const isFree = d => !!venue() && K.dayState(venue().id, d) === 'free';
    const note = () => {
      const n = $('#dateNote');
      if (!x.start) return (n.textContent = 'Tap a date on the calendar or pick a start date.');
      const bad = span(x.start, x.days).filter(d => !isFree(d));
      n.innerHTML = bad.length ? `<span class="bad">${venue().name} isn't free on ${bad.map(d => nice(d)).join(', ')}. Choose other dates or a shorter celebration.</span>` : `<b>${niceLong(x.start)}${x.days > 1 ? ' → ' + niceLong(addDays(x.start, x.days - 1)) : ''}</b> · ${x.days} day${x.days > 1 ? 's' : ''}`;
    };
    const stayPick = () => {
      const box = $('#stayPick');
      const vf = x.start ? K.minFree('villa', x.start, x.days) : K.items.villa?.units || 0, rf = x.start ? K.minFree('room', x.start, x.days) : K.items.room?.units || 0;
      x.villas = Math.min(x.villas, vf); x.rooms = Math.min(x.rooms, rf);
      box.innerHTML = [['villa', 'villas', vf], ['room', 'rooms', rf]].filter(([id]) => K.items[id]).map(([id, key, max]) => `
        <div class="bp-check sel"><span><b>${esc(K.items[id].name)}</b><small>${inr(K.items[id].pricePerNight)} / night · sleeps ${K.items[id].sleeps}${x.start ? ` · ${max} free` : ''}</small></span>
        <select data-stay="${key}" aria-label="${esc(K.items[id].name)}">${Array.from({ length: max + 1 }, (_, i) => `<option ${x[key] === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>`).join('');
      $$('[data-stay]', box).forEach(s => s.onchange = () => { x[s.dataset.stay] = +s.value; quote(); });
    };
    const cal = K.Calendar($('#cal'), {
      mode: 'days', max: C.policy.celebration.maxDays, isFree, stateOf: d => venue() ? K.dayState(venue().id, d) : 'free',
      value: { start: x.start, end: x.start ? addDays(x.start, x.days - 1) : null }, onWarn: msg => { $('#dateNote').innerHTML = `<span class="bad">${msg}</span>`; },
      onChange: ({ start, end }) => { x.start = start; x.days = start ? Math.round((parse(end) - parse(start)) / 864e5) + 1 : 1; $('#startIn').value = start || ''; $('#lenIn').value = x.days; note(); stayPick(); quote(); }
    });
    $$('[data-v]', el).forEach(b => b.onclick = () => {
      x.venues = [b.dataset.v];
      $$('[data-v]', el).forEach(o => { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', o === b); });
      cal.rerender(); note(); quote();
    });
    $('#startIn').onchange = e => { x.start = e.target.value || null; cal.set({ start: x.start, end: x.start ? addDays(x.start, x.days - 1) : null }); note(); stayPick(); quote(); };
    $('#lenIn').onchange = e => { x.days = +e.target.value; if (x.start) cal.set({ start: x.start, end: addDays(x.start, x.days - 1) }); note(); stayPick(); quote(); };
    $('#guestsIn').oninput = e => { x.guests = Math.max(0, +e.target.value || 0); quote(); };
    $('#occIn').onchange = e => (x.eventType = e.target.value);
    $$('[data-p]', el).forEach(b => b.onclick = () => { x.food = b.dataset.p || null; $$('[data-p]', el).forEach(o => { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', o === b); }); quote(); });
    $$('[data-a]', el).forEach(c => c.onchange = () => { x.addons = $$('[data-a]:checked', el).map(i => i.dataset.a); c.closest('.bp-check').classList.toggle('on', c.checked); quote(); });
    note(); stayPick();
  }

  /* ----- villas & rooms ----- */
  function renderStay(el) {
    const x = D.stay, s = () => K.items[x.stay];
    el.innerHTML =
      step(1, 'Choose your stay', `<div class="bp-cards">${C.stays.map(v => `
        <button type="button" class="bp-card img ${x.stay === v.id ? 'on' : ''}" data-s="${v.id}" aria-pressed="${x.stay === v.id}"><img src="${v.img.replace('/img/', '/img/t/')}" alt="">
          <span class="bp-card-k">${v.units} ${esc(v.unitName)}s · sleeps ${v.sleeps}</span><span class="bp-card-t">${esc(v.name)}</span><span class="bp-card-d">${esc(v.blurb)}</span>
          <span class="bp-card-f"><span>Up to ${C.policy.stay.maxNights} nights</span><span>${inr(v.pricePerNight)} / night</span></span></button>`).join('')}</div>`) +
      step(2, 'Rooms & guests', `<div class="bp-form two">
        <label class="fld"><span id="unitLbl">${esc(s().unitName[0].toUpperCase() + s().unitName.slice(1))}s</span><select id="unitsIn">${Array.from({ length: s().units }, (_, i) => `<option ${x.units === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
        <label class="fld"><span>Guests</span><input type="number" id="gIn" min="1" value="${x.guests}"></label></div>`) +
      step(3, 'Pick your dates', `<div class="cal" id="cal"></div>${legend}<p class="bp-note" id="dateNote"></p>`) +
      detailsStep(4);
    const note = () => { $('#dateNote').innerHTML = x.checkIn ? (x.nights ? `<b>${niceLong(x.checkIn)} → ${niceLong(addDays(x.checkIn, x.nights))}</b> · ${x.nights} night${x.nights > 1 ? 's' : ''}` : `Check-in <b>${niceLong(x.checkIn)}</b>. Now tap your check-out date.`) : 'Tap your check-in date, then your check-out date.'; };
    const cal = K.Calendar($('#cal'), {
      mode: 'nights', max: C.policy.stay.maxNights, isFree: d => K.unitsFree(x.stay, d) >= x.units,
      value: { start: x.checkIn, end: x.nights ? addDays(x.checkIn, x.nights) : null }, onWarn: msg => { $('#dateNote').innerHTML = `<span class="bad">${msg}</span>`; },
      onChange: ({ start, end }) => { x.checkIn = start; x.nights = end ? Math.round((parse(end) - parse(start)) / 864e5) : 0; note(); quote(); }
    });
    $$('[data-s]', el).forEach(b => b.onclick = () => { x.stay = b.dataset.s; x.units = Math.min(x.units, s().units); x.checkIn = null; x.nights = 0; renderStay(el); bindDetails(); quote(); });
    $('#unitsIn').onchange = e => { x.units = +e.target.value; cal.rerender(); quote(); };
    $('#gIn').oninput = e => { x.guests = Math.max(0, +e.target.value || 0); quote(); };
    note();
  }

  /* ----- turf & pickleball ----- */
  function renderSport(el) {
    const x = D.sport, u = () => K.items[x.item];
    const hourly = C.unwind.filter(v => v.mode === 'hourly');
    el.innerHTML =
      step(1, 'Choose', `<div class="bp-cards">${hourly.map(v => `
        <button type="button" class="bp-card img ${x.item === v.id ? 'on' : ''}" data-u="${v.id}" aria-pressed="${x.item === v.id}"><img src="${v.img.replace('/img/', '/img/t/')}" alt="">
          <span class="bp-card-k">Up to ${v.maxPlayers} players · ${hh(v.open)}–${hh(v.close)}</span><span class="bp-card-t">${esc(v.name)}</span><span class="bp-card-d">${esc(v.blurb)}</span>
          <span class="bp-card-f"><span>Up to ${v.maxHours} hours</span><span>${inr(v.pricePerHour)} / hour</span></span></button>`).join('')}</div>`) +
      step(2, 'Pick a date', `<div class="cal" id="cal"></div>`) +
      step(3, 'Time & players', `<div class="slots" id="slots"></div><p class="bp-note" id="slotNote"></p>
        <div class="bp-form two"><label class="fld"><span>Players</span><input type="number" id="pIn" min="1" max="${u().maxPlayers}" value="${Math.min(x.players, u().maxPlayers)}"></label></div>`) +
      detailsStep(4);
    const slots = () => {
      const box = $('#slots'), it = u();
      if (!x.date) { box.innerHTML = '<p class="muted-s">Pick a date to see free times.</p>'; $('#slotNote').textContent = ''; return; }
      let h = ''; for (let t = it.open; t < it.close; t++) { const b = K.hourBooked(it.id, x.date, t), on = x.hour != null && t >= x.hour && t < x.hour + x.hours; h += `<button type="button" class="sl ${b ? 'booked' : ''} ${on ? 'is-on' : ''}" data-h="${t}" ${b ? 'disabled' : ''}>${hh(t)}</button>`; }
      box.innerHTML = h;
      $('#slotNote').innerHTML = x.hour != null ? `<b>${hh(x.hour)} – ${hh(x.hour + x.hours)}</b> · ${x.hours} hour${x.hours > 1 ? 's' : ''}. Tap a later slot to extend (up to ${it.maxHours}).` : 'Tap a start time. Tap a later slot to book more hours.';
      $$('.sl:not([disabled])', box).forEach(b => b.onclick = () => {
        const t = +b.dataset.h;
        if (x.hour != null && t > x.hour && t <= x.hour + it.maxHours - 1 && Array.from({ length: t - x.hour + 1 }, (_, k) => x.hour + k).every(hr => !K.hourBooked(it.id, x.date, hr))) x.hours = t - x.hour + 1;
        else { x.hour = t; x.hours = 1; }
        slots(); quote();
      });
    };
    K.Calendar($('#cal'), { mode: 'single', max: 1, isFree: () => true, value: { start: x.date, end: x.date }, onChange: ({ start }) => { x.date = start; x.hour = null; x.hours = 1; slots(); quote(); } });
    $$('[data-u]', el).forEach(b => b.onclick = () => { x.item = b.dataset.u; x.hour = null; x.hours = 1; renderSport(el); bindDetails(); quote(); });
    $('#pIn').oninput = e => { x.players = Math.max(0, +e.target.value || 0); quote(); };
    slots();
  }

  /* ----- café ----- */
  function renderCafe(el) {
    const x = D.cafe, it = K.items.cafe;
    el.innerHTML =
      step(1, 'Pick a date', `<div class="cal" id="cal"></div>`) +
      step(2, 'Choose a sitting', `<div class="slots" id="slots"></div>
        <div class="bp-form two"><label class="fld"><span>Guests</span><input type="number" id="cgIn" min="1" value="${x.guests}"></label></div><p class="bp-note" id="slotNote"></p>`) +
      detailsStep(3);
    const slots = () => {
      const box = $('#slots');
      if (!x.date) { box.innerHTML = '<p class="muted-s">Pick a date to see sittings.</p>'; return; }
      box.innerHTML = K.cafeSittings().map(t => { const left = it.seats - K.seatsTaken(x.date, t), past = x.date === today() && t <= new Date().getHours(), dis = left <= 0 || past; return `<button type="button" class="sl wide ${dis ? 'booked' : ''} ${x.hour === t ? 'is-on' : ''}" data-h="${t}" ${dis ? 'disabled' : ''}>${hh(t)} – ${hh(t + it.sittingHours)}<small>${past ? 'Passed' : left > 0 ? left + ' seats left' : 'Full'}</small></button>`; }).join('');
      $$('.sl:not([disabled])', box).forEach(b => b.onclick = () => { x.hour = +b.dataset.h; slots(); quote(); });
    };
    K.Calendar($('#cal'), { mode: 'single', max: 1, isFree: () => true, value: { start: x.date, end: x.date }, onChange: ({ start }) => { x.date = start; x.hour = null; slots(); quote(); } });
    $('#cgIn').oninput = e => { x.guests = Math.max(0, +e.target.value || 0); quote(); };
    slots();
  }
  const bindDetails = () => $$('[data-c]').forEach(i => i.oninput = () => { cust[i.dataset.c] = i.value; quote(); });

  /* ---------------- validation ---------------- */
  function problems() {
    const x = D[tab], out = [];
    if (tab === 'event') {
      const v = K.items[x.venues[0]];
      if (!v) out.push('Choose a venue.');
      if (!x.start) out.push('Pick your dates.');
      else if (v && span(x.start, x.days).some(d => K.dayState(v.id, d) !== 'free')) out.push('Those dates aren\'t free for this venue.');
      if (!(x.guests > 0)) out.push('Enter your number of guests.');
      else if (v && x.guests > v.capacity) out.push(`${v.name} holds up to ${v.capacity} guests.`);
    } else if (tab === 'stay') {
      const s = K.items[x.stay];
      if (!x.checkIn || !x.nights) out.push('Pick check-in and check-out dates.');
      else if (x.units > K.minFree(x.stay, x.checkIn, x.nights)) out.push(`Only ${K.minFree(x.stay, x.checkIn, x.nights)} ${s.unitName}s free for those nights.`);
      if (!(x.guests > 0)) out.push('Enter the number of guests.');
      else if (x.guests > x.units * s.sleeps) out.push(`${x.units} ${s.unitName}${x.units > 1 ? 's sleep' : ' sleeps'} up to ${x.units * s.sleeps}.`);
    } else if (tab === 'sport') {
      const u = K.items[x.item];
      if (!x.date) out.push('Pick a date.'); else if (x.hour == null) out.push('Pick a time.');
      if (!(x.players > 0) || x.players > u.maxPlayers) out.push(`Players: 1 to ${u.maxPlayers}.`);
    } else {
      if (!x.date) out.push('Pick a date.'); else if (x.hour == null) out.push('Choose a sitting.');
      else { const left = K.items.cafe.seats - K.seatsTaken(x.date, x.hour); if (!(x.guests > 0) || x.guests > left) out.push(`${left} seats left in that sitting.`); }
    }
    if (!cust.name.trim()) out.push('Add your name.');
    if (!/^\S+@\S+\.\S+$/.test(cust.email)) out.push('Add a valid email.');
    if (cust.phone.replace(/\D/g, '').length < 10) out.push('Add a valid phone number.');
    if (cust.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/i.test(cust.gstin.trim())) out.push('GSTIN should be 15 characters.');
    return out;
  }

  /* ---------------- quotation sidebar ---------------- */
  function quote() {
    const x = D[tab], q = K.quote(x), box = $('#quote');
    const hasDate = tab === 'event' ? x.start : tab === 'stay' ? x.checkIn && x.nights : x.date && x.hour != null;
    const titleOf = () => tab === 'event' ? x.venues.map(v => K.items[v]?.name).filter(Boolean).join(' + ') : tab === 'stay' ? K.items[x.stay]?.name : K.items[x.item]?.name;
    const desc = hasDate ? K.describe({ kind: x.kind, draft: x }) : { title: titleOf(), when: '', who: tab === 'stay' ? `${x.units} ${K.items[x.stay]?.unitName}${x.units > 1 ? 's' : ''} · ${x.guests} guests` : tab === 'sport' ? `${x.players} players` : `${x.guests} guests` };
    const sub = tab === 'event' ? `${x.guests} guests${x.food ? ' · ' + (C.foodPackages.find(p => p.id === x.food)?.name || '') + ' package' : ''}` : desc.who;
    const full = q.advancePct >= 100, probs = problems(), canHold = !full;
    box.innerHTML = `
      <p class="kick">Instant quotation</p>
      <p class="bq-t">${esc(desc.title || 'Choose what to book')}</p>
      <p class="bq-s">${hasDate ? esc(desc.when) : 'Choose a date'}</p>
      <p class="bq-s2">${esc(sub)}</p>
      <div class="bq-lines">${q.lines.map(l => `<div><span>${esc(l.label)}${l.qty && l.unit !== 'lot' ? ` <small>× ${+(+l.qty).toFixed(2)}${l.unit === 'guest-day' ? '' : ''}</small>` : ''}</span><b>${inr(l.amount)}</b></div>`).join('') || '<p class="muted-s">Your quotation builds here as you choose.</p>'}</div>
      <div class="bq-sum">
        ${q.discount ? `<div><span>Before discount</span><b>${inr(q.gross)}</b></div><div class="rv-disc"><span>${esc(q.discountLabel)}</span><b>− ${inr(q.discount)}</b></div>` : ''}
        <div class="bq-total"><span>Total (excl. GST)</span><b>${inr(q.subtotal)}</b></div>
        <p class="bq-gst">GST at the applicable rates is added on the tax invoice.</p>
      </div>
      <div class="bq-adv"><span>${full ? 'Payable now (incl. GST)' : `Advance due now (${q.advancePct}%)`}</span><b>${inr(full ? q.total : q.advance)}</b></div>
      <div class="promo">${x.discount?.code ? `<span>Code <b>${esc(x.discount.code)}</b> applied</span><button type="button" id="promoRm">Remove</button>` : `<input id="promoIn" placeholder="Promo code" autocomplete="off" aria-label="Promo code"><button type="button" id="promoGo">Apply</button>`}</div>
      <p class="bq-err" id="bqErr">${probs.length && (cust.name || cust.email) ? esc(probs[0]) : ''}</p>
      <div class="bq-acts">
        <button type="button" class="btn-gold" id="payBtn">${full ? `Pay ${inr(q.total)} & book` : `Pay ${q.advancePct}% advance · ${inr(q.advance)}`}</button>
        ${canHold ? `<button type="button" class="btn-line" id="holdBtn">Save quotation · Pay later</button>` : ''}
      </div>
      <p class="bq-note">${canHold ? `Dates are held for ${q.holdHours} hours on a saved quotation. ` : ''}Payments are processed securely by Razorpay (UPI, cards, netbanking).${tab === 'event' && C.policy.celebration.balanceDueDays ? ` Balance is due ${C.policy.celebration.balanceDueDays} days before your celebration.` : ''}</p>`;
    $('#promoGo') && ($('#promoGo').onclick = () => { const r = K.promos.check($('#promoIn').value, x); if (!r.ok) { $('#bqErr').textContent = r.msg; return; } x.discount = r.discount; quote(); });
    $('#promoIn') && ($('#promoIn').onkeydown = e => { if (e.key === 'Enter') $('#promoGo').click(); });
    $('#promoRm') && ($('#promoRm').onclick = () => { x.discount = null; quote(); });
    $('#payBtn').onclick = () => submit(true);
    $('#holdBtn') && ($('#holdBtn').onclick = () => submit(false));
  }

  /* ---------------- submit ---------------- */
  let busy = false;
  async function submit(pay) {
    if (busy) return;
    const probs = problems();
    if (probs.length) {
      $('#bqErr').textContent = probs[0];
      const firstEmpty = $$('[data-c]').find(i => ['name', 'email', 'phone'].includes(i.dataset.c) && !i.value.trim());
      if (/name|email|phone|GSTIN/i.test(probs[0]) && firstEmpty) { firstEmpty.focus(); firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }
    busy = true;
    const x = D[tab];
    const b = K.createBooking(x, { ...cust, gstin: cust.gstin.trim().toUpperCase() });
    if (pay) {
      const amt = b.quote.advancePct >= 100 ? b.quote.total : b.quote.advance;
      try {
        const p = await K.checkout({ amount: amt, booking: b, title: `${K.describe(b).title} · ${b.quote.advancePct >= 100 ? 'payment' : b.quote.advancePct + '% advance'}` });
        K.recordPayment(b, amt, p);
      } catch (e) { if (e.message !== 'dismissed') K.toast(e.message); else K.toast('Payment cancelled. Your quotation is saved — pay any time from My Booking.'); }
    }
    busy = false;
    done(K.getBooking(b.id));
  }

  function done(b) {
    const held = b.status === 'held', paid = b.status === 'paid';
    $('#heroKick').textContent = TABS[tab].kick;
    $('#heroTitle').textContent = held ? 'Your quotation is ready' : 'You\'re booked';
    $('#heroP').textContent = '';
    $('#bp').innerHTML = `
      <div class="bp-done">
        <span class="bp-star">✦</span>
        <p class="kick">${held ? 'Quotation saved' : paid ? 'Paid in full' : 'Booking confirmed'}</p>
        <h2>${held ? `Held for ${b.quote.holdHours} hours` : paid ? 'See you soon' : 'Advance received'}</h2>
        <p class="bp-done-p">${held
          ? `We've ${C.api.saveBooking ? 'emailed' : 'prepared'} quotation ${esc(b.quotationNo)} ${C.api.saveBooking ? 'to' : 'for'} ${esc(b.customer.email)}. Pay the ${inr(b.quote.advance)} advance any time before ${K.dt(b.holdUntil)} from “My Booking” to confirm.`
          : `${esc(K.describe(b).title)} · ${esc(K.describe(b).when)}. Your tax invoice and receipt are ready below${paid ? '' : `; the balance of ${inr(K.balance(b))} can be paid from “My Booking”`}.`}</p>
        <p class="bp-id">${b.id}</p>
        <p class="bp-id-s">Keep this booking ID. You'll need it with your email to track your booking.</p>
        <div class="bp-done-acts">
          <button type="button" class="btn-line btn-sm" data-doc="quotation">Quotation (PDF)</button>
          ${b.payments.length ? '<button type="button" class="btn-line btn-sm" data-doc="invoice">Tax invoice (PDF)</button><button type="button" class="btn-line btn-sm" data-doc="receipt">Receipt (PDF)</button>' : ''}
          <a class="btn-gold btn-sm" href="mybooking.html?id=${b.id}&email=${encodeURIComponent(b.customer.email)}">Track booking</a>
        </div>
        <a class="bp-again" href="book.html?type=${tab}">Book something else</a>
      </div>`;
    $$('[data-doc]').forEach(x => x.onclick = () => K.pdf(x.dataset.doc, b, b.payments[b.payments.length - 1]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('.bp-tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  render();
})();
