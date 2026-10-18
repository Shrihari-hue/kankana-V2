/* ============================================================
   KANKANA admin — extra views
   Quotation generator · Customers · Venues & pricing · Discounts
   Payments · Automated emails · Settings
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG, K = window.KNK;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { inr, esc, nice, niceLong, addDays, ymd, dt } = K;
  const today = () => ymd(new Date());
  const A = C.all || C;
  const IMGS = ['villa-pool', 'venue-reception', 'amphi-aerial', 'amphi-mandap', 'aisle', 'amphi', 'balcony', 'balivilla', 'balloons', 'ballroom', 'banquet', 'bedwarm', 'cafe', 'cafewindow', 'cake', 'coffee', 'conference', 'confetti', 'couplepalms', 'dj', 'gardenarch', 'holi', 'palmpool', 'pickleball', 'pooldeck', 'poolpalms', 'poolsunset', 'presenting', 'reception', 'resort', 'stage', 'tentdinner', 'terraces', 'toast', 'turf', 'turfnight'];
  const slug = s => (s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 5);
  const csvDownload = (name, rows) => {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
  };
  const views = (window.KNKA = window.KNKA || { views: {} }).views;

  /* ============================================================
     QUOTATION GENERATOR
     ============================================================ */
  let Q = null;
  const freshQ = () => ({
    client: { name: '', email: '', phone: '', city: '', state: '', gstin: '', notes: '' },
    draft: { kind: 'celebration', venues: [A.venues.find(v => v.live !== false)?.id].filter(Boolean), start: '', days: 1, guests: 150, food: A.foodPackages[0]?.id || null, addons: [], villas: 0, rooms: 0, eventType: 'Wedding', custom: [], discount: null }
  });

  views.quote = (el, ctx) => {
    Q = Q || freshQ();
    const d = Q.draft, c = Q.client;
    el.innerHTML = `
      <div class="qg">
        <div class="qg-form">
          <div class="box"><div class="box-h"><h2>Client</h2></div>
            <div class="frm">
              <label class="fld s3"><span>Name</span><input data-c="name" value="${esc(c.name)}" autocomplete="off"></label>
              <label class="fld s3"><span>Email</span><input data-c="email" type="email" value="${esc(c.email)}"></label>
              <label class="fld s2"><span>Phone</span><input data-c="phone" value="${esc(c.phone)}" placeholder="+91"></label>
              <label class="fld s2"><span>City</span><input data-c="city" value="${esc(c.city)}"></label>
              <label class="fld s2"><span>State</span><input data-c="state" value="${esc(c.state)}"></label>
              <label class="fld s3"><span>GSTIN <small>(optional, for business clients)</small></span><input data-c="gstin" value="${esc(c.gstin)}" style="text-transform:uppercase"></label>
              <label class="fld s3"><span>Occasion</span><select data-d="eventType">${['Wedding', 'Engagement', 'Birthday', 'Anniversary', 'Corporate event', 'Party', 'Other'].map(o => `<option ${o === d.eventType ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
            </div></div>

          <div class="box"><div class="box-h"><h2>Event</h2></div>
            <p class="qg-k">Venues</p>
            <div class="qg-chk">${A.venues.map(v => `<label class="${d.venues.includes(v.id) ? 'on' : ''}"><input type="checkbox" data-venue="${v.id}" ${d.venues.includes(v.id) ? 'checked' : ''}><span>${esc(v.name)}${v.live === false ? ' <em>(hidden)</em>' : ''}</span><small>${v.capacity} · ${inr(v.pricePerDay)}/day</small></label>`).join('')}</div>
            <div class="frm" style="margin-top:14px">
              <label class="fld s2"><span>Start date</span><input type="date" data-d="start" value="${d.start}" min="${today()}"></label>
              <label class="fld"><span>Days</span><select data-d="days">${[1, 2, 3, 4, 5].map(n => `<option ${n === d.days ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
              <label class="fld"><span>Guests</span><input type="number" min="1" data-d="guests" value="${d.guests}"></label>
              <label class="fld s2"><span>Food &amp; hospitality</span><select data-d="food"><option value="">No package</option>${A.foodPackages.map(p => `<option value="${p.id}" ${d.food === p.id ? 'selected' : ''}>${esc(p.name)} — ${inr(p.perGuestPerDay)}/guest/day</option>`).join('')}</select></label>
              <label class="fld"><span>Villas / night</span><input type="number" min="0" max="${K.items.villa?.units || 0}" data-d="villas" value="${d.villas}"></label>
              <label class="fld"><span>Rooms / night</span><input type="number" min="0" max="${K.items.room?.units || 0}" data-d="rooms" value="${d.rooms}"></label>
            </div>
            <p class="qg-k" style="margin-top:16px">Services</p>
            <div class="qg-chk two">${A.addons.map(a => `<label class="${d.addons.includes(a.id) ? 'on' : ''}"><input type="checkbox" data-addon="${a.id}" ${d.addons.includes(a.id) ? 'checked' : ''}><span>${esc(a.name)}</span><small>${inr(a.price)}${a.per === 'guest' ? '/guest' : ''}</small></label>`).join('')}</div>
            <p class="qg-warn" id="qgWarn"></p>
          </div>

          <div class="box"><div class="box-h"><h2>Custom line items</h2><button class="lnk" id="addLine">+ Add line</button></div>
            <div id="lines">${d.custom.length ? d.custom.map((l, i) => `
              <div class="qg-line" data-i="${i}">
                <input data-l="label" placeholder="Description" value="${esc(l.label)}">
                <input data-l="qty" type="number" min="0" step="any" value="${l.qty}" aria-label="Quantity">
                <input data-l="rate" type="number" min="0" step="any" value="${l.rate}" aria-label="Rate (₹)">
                <select data-l="gst" aria-label="GST rate">${[0, 5, 12, 18, 28].map(g => `<option value="${g}" ${+l.gst === g ? 'selected' : ''}>${g}% GST</option>`).join('')}</select>
                <button class="x" data-rm="${i}" aria-label="Remove line">×</button>
              </div>`).join('') : '<p class="empty-s">Add décor, entertainment, extra hours or anything not in the catalogue.</p>'}</div>
          </div>

          <div class="box"><div class="box-h"><h2>Discount &amp; notes</h2></div>
            <div class="frm">
              <label class="fld"><span>Type</span><select data-disc="type"><option value="flat" ${d.discount?.type !== 'pct' ? 'selected' : ''}>₹ amount</option><option value="pct" ${d.discount?.type === 'pct' ? 'selected' : ''}>% percent</option></select></label>
              <label class="fld"><span>Value</span><input type="number" min="0" step="any" data-disc="value" value="${d.discount?.value || ''}" placeholder="0"></label>
              <label class="fld s2"><span>Label</span><input data-disc="label" value="${esc(d.discount?.label || '')}" placeholder="e.g. Off-season offer"></label>
              <label class="fld s6"><span>Notes on quotation</span><textarea data-c="notes" rows="3">${esc(c.notes)}</textarea></label>
            </div></div>
        </div>

        <aside class="qg-prev box"><div id="qgPrev"></div>
          <div class="rv-actions">
            <button class="btn-gold" id="qSave">Save &amp; email quotation</button>
            <button class="btn-line" id="qEnq">Save as enquiry (no email)</button>
            <div class="dp-acts" style="justify-content:space-between"><button id="qPdf">Preview PDF</button><button id="qFresh">Start fresh</button></div>
          </div>
          <p class="note-s">Saving creates a numbered quotation, holds the dates for ${C.policy.celebration.holdHours} hours and emails the client a link to pay the advance online. The tax invoice and receipts are generated when they pay.</p>
        </aside>
      </div>`;

    const calc = () => {
      const q = K.quote(d);
      const v = d.venues.map(id => K.items[id]?.name).filter(Boolean).join(' + ') || 'No venue selected';
      const clash = d.start ? d.venues.filter(id => Array.from({ length: d.days }, (_, i) => addDays(d.start, i)).some(x => K.venueBooked(id, x))) : [];
      return { q, v, clash };
    };
    const preview = () => {
      const { q, v } = calc();
      const clash = d.start ? d.venues.filter(id => Array.from({ length: d.days }, (_, i) => addDays(d.start, i)).some(x => K.venueBooked(id, x))) : [];
      const cap = Math.max(0, ...d.venues.map(id => K.items[id]?.capacity || 0));
      $('#qgWarn').innerHTML = [clash.length ? `⚠ ${clash.map(id => K.items[id].name).join(', ')} ${clash.length > 1 ? 'are' : 'is'} already booked or blocked on those dates.` : '', d.venues.length && d.guests > cap ? `⚠ ${d.guests} guests is more than the largest selected venue holds (${cap}).` : ''].filter(Boolean).join('<br>');
      $('#qgPrev').innerHTML = `
        <p class="kick">Live preview</p>
        <p class="rv-t">${esc(c.name || 'Client name')}</p>
        <p class="note-s" style="margin:2px 0 14px">${esc(v)} · ${d.start ? niceLong(d.start) + (d.days > 1 ? ` → ${niceLong(addDays(d.start, d.days - 1))}` : '') : 'date TBC'} · ${d.guests} guests</p>
        <div class="rv-lines">${q.lines.length ? q.lines.map(l => `<div class="rv-l"><div><p>${esc(l.label)}</p><small>${esc(l.detail)}</small></div><b>${inr(l.amount)}</b></div>`).join('') : '<p class="empty-s">Choose a venue to start.</p>'}</div>
        <div class="rv-sum">
          ${q.discount ? `<div><span>Before discount</span><b>${inr(q.gross)}</b></div><div class="rv-disc"><span>${esc(q.discountLabel)}</span><b>− ${inr(q.discount)}</b></div>` : ''}
          <div class="rv-total"><span>Total (excl. GST)</span><b>${inr(q.subtotal)}</b></div>
          <p class="rv-gst">GST is added on the tax invoice (est. ${inr(q.gst)} at current rates).</p>
        </div>
        <div class="qg-adv"><span>Advance (${q.advancePct}%)</span><b>${inr(q.advance)}</b></div>`;
    };
    // action buttons are bound once (re-rendering them mid-click would swallow the click)
    {
      $('#qSave').onclick = () => {
        const { clash } = calc();
        if (!d.venues.length) return K.toast('Choose at least one venue.');
        if (!d.start) return K.toast('Pick a start date.');
        if (!c.name.trim() || !/^\S+@\S+\.\S+$/.test(c.email) || c.phone.replace(/\D/g, '').length < 10) return K.toast('Add the client\'s name, a valid email and phone.');
        if (clash.length) return K.toast('Those dates aren\'t free for every venue. Change the dates or venues first.');
        const b = K.createBooking(d, { ...c, gstin: c.gstin.toUpperCase() });
        K.toast(`Quotation ${b.quotationNo} saved for ${c.name}. Dates held for ${C.policy.celebration.holdHours}h.`);
        Q = null; ctx.openPanel(b.id); ctx.render();
      };
      $('#qEnq').onclick = () => {
        if (!c.name.trim()) return K.toast('Add at least the client\'s name.');
        const l = K.enquiries.list();
        const { q, v } = calc();
        l.push({ name: c.name, phone: c.phone, email: c.email, occasion: d.eventType, guests: String(d.guests), date: d.start, message: `Draft quotation: ${v}, ${d.days} day(s), ${d.guests} guests. Estimated total ${inr(q.total)}.${c.notes ? ' ' + c.notes : ''}`, at: Date.now(), status: 'contacted', note: 'Saved from quotation generator' });
        K.enquiries.save(l); K.toast('Saved to Enquiries.'); Q = null; ctx.go('enquiries');
      };
      $('#qPdf').onclick = () => { const { q } = calc(); K.pdf('quotation', { id: 'DRAFT', kind: 'celebration', draft: d, customer: { ...c, name: c.name || 'Client', email: c.email || '-', phone: c.phone || '-' }, quote: q, createdAt: Date.now(), quotationNo: 'QT/DRAFT', payments: [] }); };
      $('#qFresh').onclick = () => { Q = freshQ(); views.quote(el, ctx); };
    }

    $$('[data-c]', el).forEach(i => i.oninput = () => { c[i.dataset.c] = i.value; preview(); });
    $$('[data-d]', el).forEach(i => i.oninput = i.onchange = () => { const k = i.dataset.d; d[k] = ['days', 'guests', 'villas', 'rooms'].includes(k) ? Math.max(0, +i.value || 0) : (k === 'food' ? i.value || null : i.value); preview(); });
    $$('[data-venue]', el).forEach(i => i.onchange = () => { d.venues = $$('[data-venue]:checked', el).map(x => x.dataset.venue); i.closest('label').classList.toggle('on', i.checked); preview(); });
    $$('[data-addon]', el).forEach(i => i.onchange = () => { d.addons = $$('[data-addon]:checked', el).map(x => x.dataset.addon); i.closest('label').classList.toggle('on', i.checked); preview(); });
    $$('[data-disc]', el).forEach(i => i.oninput = i.onchange = () => {
      const t = $('[data-disc=type]', el).value, v = +$('[data-disc=value]', el).value, lb = $('[data-disc=label]', el).value.trim();
      d.discount = v > 0 ? { type: t, value: t === 'pct' ? Math.min(100, v) : v, label: lb } : null; preview();
    });
    $('#addLine').onclick = () => { d.custom.push({ label: '', qty: 1, rate: 0, gst: C.gst.services }); views.quote(el, ctx); $$('.qg-line [data-l=label]', el).pop()?.focus(); };
    $$('.qg-line', el).forEach(row => {
      const l = d.custom[+row.dataset.i];
      $$('[data-l]', row).forEach(i => i.oninput = i.onchange = () => { const k = i.dataset.l; l[k] = k === 'label' ? i.value : +i.value || 0; preview(); });
    });
    $$('[data-rm]', el).forEach(b => b.onclick = () => { d.custom.splice(+b.dataset.rm, 1); views.quote(el, ctx); });
    preview();
  };

  /* ============================================================
     CUSTOMERS
     ============================================================ */
  let custQ = '';
  views.customers = (el, ctx) => {
    const map = {};
    ctx.all().forEach(b => {
      const k = b.customer.email.toLowerCase();
      const m = map[k] = map[k] || { name: b.customer.name, email: b.customer.email, phone: b.customer.phone, city: b.customer.city || '', bookings: 0, value: 0, paid: 0, balance: 0, latest: 0, kinds: new Set() };
      m.bookings++; m.kinds.add(b.kind);
      if (b.status !== 'cancelled' && b.status !== 'expired') { m.value += b.quote.total; m.balance += K.balance(b); }
      m.paid += K.paidSum(b);
      if (b.createdAt > m.latest) { m.latest = b.createdAt; m.name = b.customer.name; m.phone = b.customer.phone; m.city = b.customer.city || m.city; }
    });
    let rows = Object.values(map).sort((a, b) => b.latest - a.latest);
    const draw = () => {
      const r = custQ ? rows.filter(m => [m.name, m.email, m.phone, m.city].join(' ').toLowerCase().includes(custQ)) : rows;
      $('#custBody').innerHTML = r.length ? r.map(m => `<tr class="click" data-email="${esc(m.email)}"><td>${esc(m.name)}<small>${[...m.kinds].map(k => ctx.KIND[k]).join(' · ')}</small></td><td>${esc(m.phone)}<small>${esc(m.email)}</small></td><td>${esc(m.city || '—')}</td><td class="num">${m.bookings}</td><td class="num">${inr(m.value)}</td><td class="num">${inr(m.paid)}</td><td class="num">${inr(m.balance)}</td><td>${dt(m.latest)}</td></tr>`).join('') : '<tr><td colspan="8"><p class="empty-s">No customers yet.</p></td></tr>';
      $$('tr[data-email]', el).forEach(t => t.onclick = () => ctx.searchFor(t.dataset.email));
    };
    el.innerHTML = `
      <div class="tools"><p class="note-s" style="margin:0">${rows.length} customers · ${inr(rows.reduce((s, m) => s + m.value, 0))} booked · click a customer to see their bookings</p>
        <div style="display:flex;gap:8px"><input class="sel" id="custQ" placeholder="Search customers" value="${esc(custQ)}" style="width:240px;padding:0 14px"><button class="chip" id="custCsv">Export CSV</button></div></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Customer</th><th>Contact</th><th>City</th><th class="num">Bookings</th><th class="num">Value</th><th class="num">Paid</th><th class="num">Balance</th><th>Latest</th></tr></thead><tbody id="custBody"></tbody></table></div>`;
    $('#custQ').oninput = e => { custQ = e.target.value.trim().toLowerCase(); draw(); };
    $('#custCsv').onclick = () => csvDownload(`kankana-customers-${today()}.csv`, [['Name', 'Email', 'Phone', 'City', 'Bookings', 'Value', 'Paid', 'Balance', 'Latest'], ...rows.map(m => [m.name, m.email, m.phone, m.city, m.bookings, m.value, m.paid, m.balance, new Date(m.latest).toISOString()])]);
    draw();
  };

  /* ============================================================
     VENUES & PRICING (editable catalogue)
     ============================================================ */
  views.catalog = el => {
    const W = JSON.parse(JSON.stringify(A)); // working copy
    const imgSel = (val, attr) => `<select ${attr}>${IMGS.map(n => `<option value="assets/img/${n}.jpg" ${val === `assets/img/${n}.jpg` ? 'selected' : ''}>${n}</option>`).join('')}${val && !IMGS.some(n => val === `assets/img/${n}.jpg`) ? `<option value="${esc(val)}" selected>custom</option>` : ''}</select>`;
    const live = (on, attr) => `<label class="sw"><input type="checkbox" ${attr} ${on !== false ? 'checked' : ''}><span></span></label>`;
    const draw = () => {
      el.innerHTML = `
        <div class="tools"><p class="note-s" style="margin:0;max-width:680px">Changes apply to new bookings and quotations straight away. Existing quotations keep their prices. Untick <b>Live</b> to hide an item from the website without deleting it.</p>
          <div style="display:flex;gap:8px"><button class="chip" id="catReset">Reset to defaults</button><button class="btn-gold btn-sm" id="catSave">Save changes</button></div></div>

        <div class="box"><div class="box-h"><h2>Celebration venues · per day</h2><button class="lnk" data-add="venues">+ Add venue</button></div>
          <div class="tbl-wrap ed"><table class="t"><thead><tr><th>Name</th><th>Type</th><th class="num">Capacity</th><th class="num">₹ / day</th><th>Short description</th><th>Photo</th><th>Live</th><th></th></tr></thead><tbody>
          ${W.venues.map((v, i) => `<tr data-g="venues" data-i="${i}"><td><input data-k="name" value="${esc(v.name)}"></td><td><select data-k="type">${['Venue', 'Hall', 'Open-air', 'Lawn', 'Terrace'].map(t => `<option ${t === v.type ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td><input data-k="capacity" type="number" min="1" value="${v.capacity}" class="n"></td><td><input data-k="pricePerDay" type="number" min="0" value="${v.pricePerDay}" class="n"></td><td><input data-k="blurb" value="${esc(v.blurb)}" class="w"></td><td>${imgSel(v.img, 'data-k="img"')}</td><td>${live(v.live, 'data-k="live"')}</td><td><button class="x" data-del="venues:${i}" aria-label="Delete">×</button></td></tr>`).join('')}
          </tbody></table></div></div>

        <div class="box"><div class="box-h"><h2>Stays · per night</h2></div>
          <div class="tbl-wrap ed"><table class="t"><thead><tr><th>Name</th><th class="num">Units</th><th class="num">Sleeps</th><th class="num">₹ / night</th><th>Short description</th><th>Photo</th><th>Live</th></tr></thead><tbody>
          ${W.stays.map((s, i) => `<tr data-g="stays" data-i="${i}"><td><input data-k="name" value="${esc(s.name)}"></td><td><input data-k="units" type="number" min="1" value="${s.units}" class="n"></td><td><input data-k="sleeps" type="number" min="1" value="${s.sleeps}" class="n"></td><td><input data-k="pricePerNight" type="number" min="0" value="${s.pricePerNight}" class="n"></td><td><input data-k="blurb" value="${esc(s.blurb)}" class="w"></td><td>${imgSel(s.img, 'data-k="img"')}</td><td>${live(s.live, 'data-k="live"')}</td></tr>`).join('')}
          </tbody></table></div><p class="note-s">GST on stays follows the tariff: ${C.gst.accommodationLow}% up to ${inr(C.gst.accommodationThreshold)} a night, ${C.gst.accommodationHigh}% above.</p></div>

        <div class="box"><div class="box-h"><h2>Unwind · turf, court &amp; café</h2></div>
          <div class="tbl-wrap ed"><table class="t"><thead><tr><th>Name</th><th class="num">Price</th><th class="num">Capacity</th><th class="num">Opens</th><th class="num">Closes</th><th>Short description</th><th>Live</th></tr></thead><tbody>
          ${W.unwind.map((u, i) => `<tr data-g="unwind" data-i="${i}"><td><input data-k="name" value="${esc(u.name)}"></td><td><input data-k="${u.mode === 'hourly' ? 'pricePerHour' : 'pricePerGuest'}" type="number" min="0" value="${u.mode === 'hourly' ? u.pricePerHour : u.pricePerGuest}" class="n" title="${u.mode === 'hourly' ? 'per hour' : 'per guest'}"><small>${u.mode === 'hourly' ? '/ hour' : '/ guest'}</small></td><td><input data-k="${u.mode === 'hourly' ? 'maxPlayers' : 'seats'}" type="number" min="1" value="${u.mode === 'hourly' ? u.maxPlayers : u.seats}" class="n"><small>${u.mode === 'hourly' ? 'players' : 'seats'}</small></td><td><input data-k="open" type="number" min="0" max="23" value="${u.open}" class="n s"></td><td><input data-k="close" type="number" min="1" max="24" value="${u.close}" class="n s"></td><td><input data-k="blurb" value="${esc(u.blurb)}" class="w"></td><td>${live(u.live, 'data-k="live"')}</td></tr>`).join('')}
          </tbody></table></div></div>

        <div class="box"><div class="box-h"><h2>Food &amp; hospitality packages · per guest, per day</h2><button class="lnk" data-add="foodPackages">+ Add package</button></div>
          <div class="tbl-wrap ed"><table class="t"><thead><tr><th>Name</th><th class="num">₹ / guest / day</th><th>What's included</th><th>Live</th><th></th></tr></thead><tbody>
          ${W.foodPackages.map((p, i) => `<tr data-g="foodPackages" data-i="${i}"><td><input data-k="name" value="${esc(p.name)}"></td><td><input data-k="perGuestPerDay" type="number" min="0" value="${p.perGuestPerDay}" class="n"></td><td><input data-k="blurb" value="${esc(p.blurb)}" class="w" style="min-width:420px"></td><td>${live(p.live, 'data-k="live"')}</td><td><button class="x" data-del="foodPackages:${i}" aria-label="Delete">×</button></td></tr>`).join('')}
          </tbody></table></div></div>

        <div class="box"><div class="box-h"><h2>Services &amp; add-ons</h2><button class="lnk" data-add="addons">+ Add service</button></div>
          <div class="tbl-wrap ed"><table class="t"><thead><tr><th>Name</th><th class="num">Price ₹</th><th>Charged</th><th>Photo</th><th>Live</th><th></th></tr></thead><tbody>
          ${W.addons.map((a, i) => `<tr data-g="addons" data-i="${i}"><td><input data-k="name" value="${esc(a.name)}" style="min-width:240px"></td><td><input data-k="price" type="number" min="0" value="${a.price}" class="n"></td><td><select data-k="per"><option value="event" ${a.per === 'event' ? 'selected' : ''}>Flat (per event)</option><option value="guest" ${a.per === 'guest' ? 'selected' : ''}>Per guest</option></select></td><td>${imgSel(a.img, 'data-k="img"')}</td><td>${live(a.live, 'data-k="live"')}</td><td><button class="x" data-del="addons:${i}" aria-label="Delete">×</button></td></tr>`).join('')}
          </tbody></table></div></div>`;

      $$('tr[data-g]', el).forEach(tr => {
        const item = W[tr.dataset.g][+tr.dataset.i];
        $$('[data-k]', tr).forEach(i => i.oninput = i.onchange = () => {
          const k = i.dataset.k;
          item[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (+i.value || 0) : i.value;
        });
      });
      $$('[data-add]', el).forEach(b => b.onclick = () => {
        const g = b.dataset.add;
        if (g === 'venues') W.venues.push({ id: slug('venue'), name: 'New venue', type: 'Venue', capacity: 100, pricePerDay: 100000, img: 'assets/img/gardenarch.jpg', blurb: 'Describe this space.', live: true });
        if (g === 'foodPackages') W.foodPackages.push({ id: slug('pkg'), name: 'New package', perGuestPerDay: 3000, blurb: 'What is included.', live: true });
        if (g === 'addons') W.addons.push({ id: slug('svc'), name: 'New service', price: 50000, per: 'event', img: 'assets/img/reception.jpg', live: true });
        draw();
      });
      $$('[data-del]', el).forEach(b => b.onclick = () => {
        const [g, i] = b.dataset.del.split(':');
        if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Delete?'; setTimeout(() => { b.classList.remove('arm'); b.textContent = '×'; }, 2500); return; }
        W[g].splice(+i, 1); draw();
      });
      $('#catSave').onclick = () => {
        const bad = [...W.venues, ...W.stays, ...W.unwind, ...W.foodPackages, ...W.addons].find(x => !String(x.name).trim());
        if (bad) return K.toast('Every item needs a name.');
        if (W.unwind.some(u => u.close <= u.open)) return K.toast('Closing time must be after opening time.');
        W.venues.forEach(v => v.id = v.id || slug(v.name));
        C.saveOverrides({ venues: W.venues, stays: W.stays, unwind: W.unwind, foodPackages: W.foodPackages, addons: W.addons });
        K.toast('Saved. Reloading prices…'); setTimeout(() => location.reload(), 700);
      };
      $('#catReset').onclick = e => {
        const b = e.currentTarget;
        if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Click again to reset'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Reset to defaults'; }, 3000); return; }
        const d = C.defaults; C.saveOverrides({ venues: d.venues, stays: d.stays, unwind: d.unwind, foodPackages: d.foodPackages, addons: d.addons });
        K.toast('Catalogue reset.'); setTimeout(() => location.reload(), 600);
      };
    };
    draw();
  };

  /* ============================================================
     DISCOUNTS & PROMO CODES
     ============================================================ */
  views.discounts = el => {
    const list = K.promos.list();
    const scope = { all: 'Everything', celebration: 'Celebrations', stay: 'Stays', unwind: 'Turf, court & café' };
    el.innerHTML = `
      <div class="box"><div class="box-h"><h2>Create a promo code</h2></div>
        <form class="frm" id="promoForm">
          <label class="fld"><span>Code</span><input name="code" required placeholder="MONSOON10" style="text-transform:uppercase" autocomplete="off"></label>
          <label class="fld"><span>Type</span><select name="type"><option value="pct">% off</option><option value="flat">₹ off</option></select></label>
          <label class="fld"><span>Value</span><input name="value" type="number" min="1" step="any" required placeholder="10"></label>
          <label class="fld s3"><span>Applies to</span><select name="appliesTo">${Object.entries(scope).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="fld"><span>Min spend ₹ <small>(before GST)</small></span><input name="minSpend" type="number" min="0" placeholder="0"></label>
          <label class="fld"><span>Valid from</span><input name="from" type="date" value="${today()}"></label>
          <label class="fld"><span>Valid until</span><input name="to" type="date"></label>
          <label class="fld"><span>Max uses <small>(blank = unlimited)</small></span><input name="maxUses" type="number" min="1"></label>
          <div class="s2"><button class="btn-gold btn-sm" type="submit">Create code</button></div>
        </form>
        <p class="note-s">Guests enter codes at the review step of the booking flow on the website. Discounts are taken off before GST. For a one-off discount, open a booking and use <b>Discount</b>, or add one in the <b>Quotation generator</b>.</p></div>
      <div class="tbl-wrap" style="margin-top:14px"><table class="t"><thead><tr><th>Code</th><th>Discount</th><th>Applies to</th><th class="num">Min spend</th><th>Valid</th><th class="num">Used</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.length ? list.map((p, i) => {
          const expired = p.to && today() > p.to, full = p.maxUses && (p.uses || 0) >= p.maxUses;
          const st = p.active === false ? 'Paused' : expired ? 'Expired' : full ? 'Used up' : 'Active';
          return `<tr><td><span class="ref">${esc(p.code)}</span></td><td>${p.type === 'pct' ? p.value + '% off' : inr(p.value) + ' off'}</td><td>${scope[p.appliesTo || 'all']}</td><td class="num">${p.minSpend ? inr(p.minSpend) : '—'}</td><td>${p.from ? nice(p.from) : 'Now'} → ${p.to ? nice(p.to) : 'no end'}</td><td class="num">${p.uses || 0}${p.maxUses ? ' / ' + p.maxUses : ''}</td><td><span class="st ${st === 'Active' ? 'paid' : st === 'Paused' ? 'held' : 'expired'}">${st}</span></td><td class="num"><button class="chip" data-tog="${i}">${p.active === false ? 'Resume' : 'Pause'}</button> <button class="chip" data-del="${i}">Delete</button></td></tr>`;
        }).join('') : '<tr><td colspan="8"><p class="empty-s">No promo codes yet.</p></td></tr>'}
      </tbody></table></div>`;
    $('#promoForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const code = f.code.trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return K.toast('Codes are 3–20 letters or numbers.');
      if (list.some(p => p.code.toUpperCase() === code)) return K.toast('That code already exists.');
      if (f.type === 'pct' && +f.value > 100) return K.toast('A percentage can\'t be over 100.');
      list.push({ code, type: f.type, value: +f.value, appliesTo: f.appliesTo, minSpend: +f.minSpend || 0, from: f.from, to: f.to, maxUses: +f.maxUses || 0, uses: 0, active: true, createdAt: Date.now() });
      K.promos.save(list); K.toast(`${code} created.`); views.discounts(el);
    };
    $$('[data-tog]', el).forEach(b => b.onclick = () => { const p = list[+b.dataset.tog]; p.active = p.active === false; K.promos.save(list); views.discounts(el); });
    $$('[data-del]', el).forEach(b => b.onclick = () => {
      if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Confirm'; setTimeout(() => { b.classList.remove('arm'); b.textContent = 'Delete'; }, 2500); return; }
      list.splice(+b.dataset.del, 1); K.promos.save(list); views.discounts(el);
    });
  };

  /* ============================================================
     PAYMENTS
     ============================================================ */
  let payMonth = 'all', payMethod = 'all';
  views.payments = (el, ctx) => {
    const pays = ctx.all().flatMap(b => b.payments.map((p, i) => ({ ...p, i, b }))).sort((a, b) => b.at - a.at);
    const months = [...new Set(pays.map(p => new Date(p.at).toISOString().slice(0, 7)))];
    const methods = [...new Set(pays.map(p => p.method.replace(' (demo)', '')))];
    const rows = pays.filter(p => (payMonth === 'all' || new Date(p.at).toISOString().slice(0, 7) === payMonth) && (payMethod === 'all' || p.method.replace(' (demo)', '') === payMethod));
    const sum = rows.reduce((s, p) => s + p.amount, 0);
    const online = rows.filter(p => /demo|Razorpay/i.test(p.method)).reduce((s, p) => s + p.amount, 0);
    el.innerHTML = `
      <div class="ad-grid k4" style="margin-bottom:14px">
        <div class="box kpi"><p class="kl">Received</p><p class="kv">${inr(sum)}</p><p class="ks">${rows.length} payments</p></div>
        <div class="box kpi"><p class="kl">Online (Razorpay)</p><p class="kv">${inr(online)}</p><p class="ks">UPI, cards, netbanking</p></div>
        <div class="box kpi"><p class="kl">Offline</p><p class="kv">${inr(sum - online)}</p><p class="ks">Bank transfer, cash, cheque</p></div>
        <div class="box kpi"><p class="kl">Still to collect</p><p class="kv">${inr(ctx.all().filter(b => b.status === 'confirmed').reduce((s, b) => s + K.balance(b), 0))}</p><p class="ks">Balances on confirmed bookings</p></div>
      </div>
      <div class="tools"><div style="display:flex;gap:8px">
          <select class="sel" id="pm"><option value="all">All months</option>${months.map(m => `<option value="${m}" ${m === payMonth ? 'selected' : ''}>${new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>`).join('')}</select>
          <select class="sel" id="pmeth"><option value="all">All methods</option>${methods.map(m => `<option ${m === payMethod ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <button class="chip" id="payCsv">Export CSV</button></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Date</th><th>Booking</th><th>Customer</th><th>Method</th><th>Reference</th><th>Receipt</th><th class="num">Amount</th><th></th></tr></thead><tbody>
        ${rows.length ? rows.map(p => `<tr class="click" data-id="${p.b.id}"><td>${dt(p.at)}</td><td><span class="ref">${p.b.id}</span><small>${esc(ctx.what(p.b))}</small></td><td>${esc(p.b.customer.name)}</td><td>${esc(p.method)}</td><td><small style="margin:0">${esc(p.id)}</small></td><td><small style="margin:0">${esc(p.receiptNo)}</small></td><td class="num">${inr(p.amount)}</td><td class="num"><button class="chip" data-rc="${p.b.id}:${p.i}">Receipt PDF</button></td></tr>`).join('') : '<tr><td colspan="8"><p class="empty-s">No payments yet.</p></td></tr>'}
      </tbody></table></div>`;
    $('#pm').onchange = e => { payMonth = e.target.value; views.payments(el, ctx); };
    $('#pmeth').onchange = e => { payMethod = e.target.value; views.payments(el, ctx); };
    $$('tr[data-id]', el).forEach(r => r.onclick = e => { if (e.target.closest('[data-rc]')) return; ctx.openPanel(r.dataset.id); });
    $$('[data-rc]', el).forEach(b => b.onclick = () => { const [id, i] = b.dataset.rc.split(':'); const bk = K.getBooking(id); K.pdf('receipt', bk, bk.payments[+i]); });
    $('#payCsv').onclick = () => csvDownload(`kankana-payments-${today()}.csv`, [['Date', 'Booking', 'Customer', 'Email', 'Method', 'Reference', 'Receipt', 'Amount'], ...rows.map(p => [new Date(p.at).toISOString(), p.b.id, p.b.customer.name, p.b.customer.email, p.method, p.id, p.receiptNo, p.amount])]);
  };

  /* ============================================================
     AUTOMATED EMAILS (outbox)
     ============================================================ */
  const TPL = {
    created: 'Quotation sent', 'quotation-revised': 'Revised quotation', payment: 'Payment receipt', cancelled: 'Cancellation', 'hold-extended': 'Hold extended', reminder: 'Payment reminder'
  };
  const bodyFor = (m, b) => {
    const link = new URL(`mybooking.html?id=${m.bookingId}&email=${encodeURIComponent(m.to)}`, location.href).href;
    const first = (m.name || '').split(' ')[0] || 'there';
    const tot = b ? inr(b.quote.total) : '';
    return {
      created: `Hi ${first},\n\nThank you for choosing Kankana. Your quotation is attached (total ${tot} incl. GST).\n${b?.holdUntil ? `We're holding your dates until ${dt(b.holdUntil)}.` : ''}\nPay the advance or view your booking here: ${link}\n\nWarm regards,\nKankana Venue & Resorts`,
      'quotation-revised': `Hi ${first},\n\nWe've revised your quotation — the new total is ${tot} incl. GST. The updated PDF is attached.\nView your booking: ${link}\n\nKankana Venue & Resorts`,
      payment: `Hi ${first},\n\n${m.subject}. Your tax invoice and receipt are attached.\nBalance remaining: ${b ? inr(K.balance(b)) : '-'}.\nManage your booking: ${link}\n\nKankana Venue & Resorts`,
      cancelled: `Hi ${first},\n\nYour booking ${m.bookingId} has been cancelled and the dates released. If this was a mistake, reply to this email.\n\nKankana Venue & Resorts`,
      'hold-extended': `Hi ${first},\n\n${m.subject}. Pay the advance any time before then to confirm: ${link}\n\nKankana Venue & Resorts`,
      reminder: `Hi ${first},\n\nA friendly reminder about your Kankana booking ${m.bookingId}. ${b?.status === 'held' ? `Your dates are held until ${dt(b.holdUntil)} — pay the advance to confirm.` : `Your balance of ${b ? inr(K.balance(b)) : ''} is due.`}\nPay here: ${link}\n\nKankana Venue & Resorts`
    }[m.type] || m.subject;
  };
  let obType = 'all';
  views.outbox = (el, ctx) => {
    const list = K.outbox.list().slice().reverse();
    const rows = list.filter(m => obType === 'all' || m.type === obType);
    const configured = !!C.api.saveBooking;
    el.innerHTML = `
      <div class="ad-demo" style="margin-bottom:14px">${configured ? 'Emails are sent by your server with the PDFs attached.' : 'Email isn\'t connected yet, so these are logged but <b>not sent</b>. Connect <b>api.saveBooking</b> (see README) and every quotation, payment and status change emails the client automatically with the PDF attached.'}</div>
      <div class="tools"><div class="chips">${['all', ...Object.keys(TPL)].map(t => `<button class="chip ${obType === t ? 'is-on' : ''}" data-t="${t}">${t === 'all' ? 'All' : TPL[t]}<b>${t === 'all' ? list.length : list.filter(m => m.type === t).length}</b></button>`).join('')}</div></div>
      <div class="ob">${rows.length ? rows.map(m => `
        <details class="box ob-i"><summary><span class="ob-t">${esc(m.subject)}</span><span class="ob-m">${esc(m.name)} &lt;${esc(m.to)}&gt; · ${dt(m.at)}</span><span class="st ${m.status === 'queued' ? 'paid' : 'held'}">${m.status === 'queued' ? 'Queued' : 'Not sent (demo)'}</span></summary>
          <pre class="ob-body">${esc(bodyFor(m, K.getBooking(m.bookingId)))}</pre>
          <div class="dp-acts">${m.attach.map(a => `<span class="chip" style="cursor:default">📎 ${a}.pdf</span>`).join('')}<button data-open="${m.bookingId}">Open booking</button><button data-resend="${m.id}">Resend</button></div>
        </details>`).join('') : '<div class="mb-empty">No emails yet. They appear here whenever a quotation, payment, hold or cancellation happens.</div>'}</div>`;
    $$('[data-t]', el).forEach(b => b.onclick = () => { obType = b.dataset.t; views.outbox(el, ctx); });
    $$('[data-open]', el).forEach(b => b.onclick = () => ctx.openPanel(b.dataset.open));
    $$('[data-resend]', el).forEach(b => b.onclick = () => { const m = list.find(x => x.id === b.dataset.resend); const bk = K.getBooking(m.bookingId); if (bk) { K.logEmail(bk, m.type, m.subject); K.toast('Logged again.'); views.outbox(el, ctx); } });
  };

  /* ============================================================
     SETTINGS
     ============================================================ */
  views.settings = (el, ctx) => {
    const p = C.policy, g = C.gst, b = C.business;
    const dot = ok => `<i class="dot ${ok ? 'ok' : 'warn'}"></i>`;
    el.innerHTML = `
      <div class="box"><div class="box-h"><h2>System status</h2></div>
        <div class="sys">
          <p>${dot(!C.payments.demoMode && C.payments.razorpayKeyId)}<b>Payments</b> ${!C.payments.demoMode && C.payments.razorpayKeyId ? 'Razorpay live' : 'Demo checkout — add your Razorpay Key ID in config.js and a server for orders'}</p>
          <p>${dot(C.api.saveBooking)}<b>Email &amp; shared bookings</b> ${C.api.saveBooking ? 'Connected' : 'Not connected — bookings stay in this browser and emails are only logged'}</p>
          <p>${dot(C.api.availability)}<b>Live availability</b> ${C.api.availability ? 'Connected' : 'Using this browser\'s bookings and blocks'}</p>
          <p>${dot(true)}<b>Site</b> ${esc(location.origin)}</p>
        </div>
        <p class="note-s">Payment keys and email passwords belong on the server, never in the website files.</p></div>

      <div class="ad-grid two" style="margin-top:14px">
        <div class="box"><div class="box-h"><h2>Booking rules</h2></div>
          <p class="qg-k">Celebrations</p>
          <div class="frm">
            <label class="fld"><span>Advance %</span><input type="number" min="0" max="100" data-s="policy.celebration.advancePct" value="${p.celebration.advancePct}"></label>
            <label class="fld"><span>Hold (hours)</span><input type="number" min="0" data-s="policy.celebration.holdHours" value="${p.celebration.holdHours}"></label>
            <label class="fld"><span>Max days</span><input type="number" min="1" max="14" data-s="policy.celebration.maxDays" value="${p.celebration.maxDays}"></label>
            <label class="fld s3"><span>Balance due (days before event)</span><input type="number" min="0" data-s="policy.celebration.balanceDueDays" value="${p.celebration.balanceDueDays}"></label>
          </div>
          <p class="qg-k" style="margin-top:16px">Stays</p>
          <div class="frm">
            <label class="fld s2"><span>Advance %</span><input type="number" min="0" max="100" data-s="policy.stay.advancePct" value="${p.stay.advancePct}"></label>
            <label class="fld s2"><span>Hold (hours)</span><input type="number" min="0" data-s="policy.stay.holdHours" value="${p.stay.holdHours}"></label>
            <label class="fld s2"><span>Max nights</span><input type="number" min="1" data-s="policy.stay.maxNights" value="${p.stay.maxNights}"></label>
          </div>
          <p class="qg-k" style="margin-top:16px">GST rates (%)</p>
          <div class="frm">
            <label class="fld s2"><span>Venues</span><input type="number" min="0" step="any" data-s="gst.venue" value="${g.venue}"></label>
            <label class="fld s2"><span>Catering</span><input type="number" min="0" step="any" data-s="gst.catering" value="${g.catering}"></label>
            <label class="fld s2"><span>Services</span><input type="number" min="0" step="any" data-s="gst.services" value="${g.services}"></label>
            <label class="fld s2"><span>Rooms ≤ threshold</span><input type="number" min="0" step="any" data-s="gst.accommodationLow" value="${g.accommodationLow}"></label>
            <label class="fld s2"><span>Rooms above</span><input type="number" min="0" step="any" data-s="gst.accommodationHigh" value="${g.accommodationHigh}"></label>
            <label class="fld s2"><span>Threshold ₹/night</span><input type="number" min="0" data-s="gst.accommodationThreshold" value="${g.accommodationThreshold}"></label>
            <label class="fld s2"><span>Sports</span><input type="number" min="0" step="any" data-s="gst.sports" value="${g.sports}"></label>
            <label class="fld s2"><span>Café</span><input type="number" min="0" step="any" data-s="gst.cafe" value="${g.cafe}"></label>
            <label class="fld s2"><span>Supply</span><select data-s="gst.intraState"><option value="true" ${g.intraState ? 'selected' : ''}>Same state (CGST+SGST)</option><option value="false" ${!g.intraState ? 'selected' : ''}>Other state (IGST)</option></select></label>
          </div></div>

        <div class="box"><div class="box-h"><h2>Company details on documents</h2></div>
          <div class="frm">
            <label class="fld s6"><span>Brand name</span><input data-s="business.name" value="${esc(b.name)}"></label>
            <label class="fld s6"><span>Legal name</span><input data-s="business.legalName" value="${esc(b.legalName)}"></label>
            <label class="fld s3"><span>GSTIN</span><input data-s="business.gstin" value="${esc(b.gstin)}" style="text-transform:uppercase"></label>
            <label class="fld s3"><span>State code</span><input data-s="business.stateCode" value="${esc(b.stateCode)}"></label>
            <label class="fld s3"><span>Email</span><input data-s="business.email" value="${esc(b.email)}"></label>
            <label class="fld s3"><span>Phone</span><input data-s="business.phone" value="${esc(b.phone)}"></label>
            <label class="fld s6"><span>Address</span><input data-s="business.address" value="${esc(b.address)}"></label>
          </div></div>
      </div>

      <div class="ad-grid two" style="margin-top:14px">
        <div class="box"><div class="box-h"><h2>Quotation terms</h2></div>
          <label class="fld"><span>One term per line · printed on every quotation</span><textarea id="terms" rows="7">${esc((C.terms || []).join('\n'))}</textarea></label></div>
        <div class="box"><div class="box-h"><h2>Your account &amp; data</h2></div>
          <div class="frm">
            <label class="fld s3"><span>Current passcode</span><input type="password" id="pc0" autocomplete="current-password"></label>
            <label class="fld s3"><span>New passcode (6+ chars)</span><input type="password" id="pc1" autocomplete="new-password"></label>
          </div>
          <div class="dp-acts" style="margin-top:12px"><button id="pcBtn">Change passcode</button><button id="csvAll">Export bookings (CSV)</button><button id="backup">Download full backup</button><label class="chip" style="cursor:pointer">Restore backup<input type="file" id="restore" accept="application/json" hidden></label></div>
          <p class="note-s">The backup includes bookings, enquiries, blocked dates, promo codes, emails and your pricing &amp; settings.</p></div>
      </div>
      <div class="tools" style="margin-top:18px;justify-content:flex-end"><button class="chip" id="setReset">Reset settings to defaults</button><button class="btn-gold btn-sm" id="setSave">Save settings</button></div>`;

    $('#setSave').onclick = () => {
      const patch = { policy: JSON.parse(JSON.stringify(C.policy)), gst: { ...C.gst }, business: { ...C.business } };
      for (const i of $$('[data-s]', el)) {
        const [grp, ...path] = i.dataset.s.split('.');
        let o = patch[grp]; path.slice(0, -1).forEach(k => (o = o[k]));
        const k = path[path.length - 1];
        o[k] = i.type === 'number' ? +i.value : i.tagName === 'SELECT' && (i.value === 'true' || i.value === 'false') ? i.value === 'true' : i.value.trim();
      }
      if (patch.policy.celebration.advancePct > 100 || patch.policy.stay.advancePct > 100) return K.toast('Advance can\'t be over 100%.');
      patch.business.gstin = String(patch.business.gstin).toUpperCase();
      const terms = $('#terms').value.split('\n').map(s => s.trim()).filter(Boolean);
      C.saveOverrides({ ...patch, terms });
      K.toast('Settings saved. Reloading…'); setTimeout(() => location.reload(), 700);
    };
    $('#setReset').onclick = e => {
      const btn = e.currentTarget;
      if (!btn.dataset.arm) { btn.dataset.arm = 1; btn.textContent = 'Click again to reset'; setTimeout(() => { delete btn.dataset.arm; btn.textContent = 'Reset settings to defaults'; }, 3000); return; }
      const d = C.defaults; C.saveOverrides({ policy: d.policy, gst: d.gst, business: d.business, terms: d.terms });
      K.toast('Settings reset.'); setTimeout(() => location.reload(), 600);
    };
    $('#pcBtn').onclick = () => {
      if ($('#pc0').value !== C.admin.demoPasscode) return K.toast('Current passcode is wrong.');
      if ($('#pc1').value.length < 6) return K.toast('Use at least 6 characters.');
      C.saveOverrides({ admin: { demoPasscode: $('#pc1').value } }); C.admin.demoPasscode = $('#pc1').value;
      $('#pc0').value = $('#pc1').value = ''; K.toast('Passcode changed for this browser.');
    };
    $('#csvAll').onclick = () => {
      const rows = ctx.all();
      csvDownload(`kankana-bookings-${today()}.csv`, [['Reference', 'Type', 'Status', 'Customer', 'Email', 'Phone', 'GSTIN', 'Booking', 'Start', 'End', 'Gross', 'Discount', 'Taxable', 'GST', 'Total', 'Paid', 'Balance', 'Created'],
        ...rows.map(b => [b.id, ctx.KIND[b.kind], ctx.STATUS[b.status], b.customer.name, b.customer.email, b.customer.phone, b.customer.gstin || '', ctx.what(b), ctx.startOf(b), ctx.endOf(b), b.quote.gross ?? b.quote.subtotal, b.quote.discount || 0, b.quote.subtotal, b.quote.gst, b.quote.total, K.paidSum(b), K.balance(b), new Date(b.createdAt).toISOString()])]);
    };
    const KEYS = ['knk_bookings_v1', 'knk_blocks_v1', 'knk_enquiries', 'knk_promos_v1', 'knk_outbox_v1', 'knk_overrides_v1', 'knk_seeded'];
    $('#backup').onclick = () => {
      const data = { app: 'kankana', version: 1, exportedAt: new Date().toISOString(), data: {} };
      KEYS.forEach(k => { try { data.data[k] = localStorage.getItem(k); } catch {} });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `kankana-backup-${today()}.json`; a.click();
    };
    $('#restore').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (j.app !== 'kankana' || !j.data) throw new Error('Not a Kankana backup file.');
        KEYS.forEach(k => { if (j.data[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, j.data[k]); });
        K.toast('Backup restored. Reloading…'); setTimeout(() => location.reload(), 700);
      } catch (err) { K.toast(err.message || 'Could not read that file.'); }
    };
  };
})();
