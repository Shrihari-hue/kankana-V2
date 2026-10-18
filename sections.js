/* ============================================================
   KANKANA — new homepage sections (rendered from config.js)
   Explore venues · Celebrations · The wedding day · On the estate · Enquiry
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG, K = window.KNK;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const inr = K.inr;
  const mobile = () => window.matchMedia('(max-width:900px)').matches;

  /* ---------- Explore venues ---------- */
  $('#vxTrack').innerHTML = C.venues.map((v, i) => `
    <article class="vc">
      <img src="${v.img}" alt="${v.name}" loading="lazy">
      <span class="vc-tag">${v.type}</span><span class="vc-num">${String(i + 1).padStart(2, '0')} / ${String(C.venues.length).padStart(2, '0')}</span>
      <div class="vc-b">
        <h3>${v.name}</h3>
        <p>${v.blurb}</p>
        <div class="vc-row">
          <dl class="vc-stats"><div><dt>Capacity</dt><dd>${v.capacity}</dd></div><div><dt>Per day</dt><dd>${inr(v.pricePerDay)}</dd></div></dl>
          <button type="button" class="btn-gold btn-sm" data-book="${v.id}">Book</button>
        </div>
      </div>
    </article>`).join('');

  /* ---------- Celebrations: packages ---------- */
  const egGuests = 300, egDays = 2;
  $('#pk3').innerHTML = C.foodPackages.map((p, i) => `
    <article class="pkc reveal ${i === 1 ? 'feature' : ''}">
      <span class="pk-n">0${i + 1}</span>
      <h3>${p.name}</h3>
      <p class="pk-b">${p.blurb}</p>
      <p class="pk-price">${inr(p.perGuestPerDay)}<small>per guest, per day</small></p>
      <p class="pk-eg">${egGuests} guests × ${egDays} days = ${inr(p.perGuestPerDay * egGuests * egDays)} + GST</p>
    </article>`).join('');

  /* ---------- The wedding day ---------- */
  const flow = [
    { id: 'transfer', time: 'Arrivals', text: 'We meet your guests at the airport and bring them straight to Kankana.' },
    { id: 'kits', time: 'Check-in', text: 'A welcome kit waiting in every room, so guests feel looked after from the first minute.' },
    { id: 'sangeet', time: 'The night before', text: 'Mehndi in the afternoon, then music and dancing late into the night.' },
    { id: 'baraat', time: 'The morning', text: 'The groom arrives with music, dancing and the whole family.' },
    { id: 'mandap', time: 'The ceremony', text: 'A mandap and ceremony décor built for your rituals and your colours.' },
    { id: 'photo', time: 'Every moment', text: 'Photographers and filmmakers there from the first ritual to the farewell.' }
  ];
  for (let i = flow.length - 1; i >= 0; i--) if (!C.addons.find(x => x.id === flow[i].id)) flow.splice(i, 1);
  const media = $('#wdMedia');
  media.insertAdjacentHTML('afterbegin', flow.map((f, i) => { const a = C.addons.find(x => x.id === f.id); return `<div class="wm ${i ? '' : 'is-on'}"><img src="${a.img}" alt="${a.name}" loading="lazy"></div>`; }).join(''));
  $('#wdList').innerHTML = flow.map((f, i) => {
    const a = C.addons.find(x => x.id === f.id);
    return `<div class="wi ${i ? '' : 'is-on'}" data-i="${i}">
      <div class="wi-img"><img src="${a.img}" alt="" loading="lazy"></div>
      <p class="kick">${String(i + 1).padStart(2, '0')} · ${f.time}</p>
      <h3>${a.name}</h3>
      <p>${f.text}</p>
      <p class="wi-price">${inr(a.price)} <small>${a.per === 'guest' ? 'per guest' : 'per event'} + GST</small></p>
    </div>`;
  }).join('');
  $('#wdTime').textContent = flow[0].time;

  /* ---------- On the estate ---------- */
  const cards = [
    ...C.venues.map(v => ({ id: v.id, kind: 'celebration', tag: v.type, name: v.name, img: v.img, blurb: v.blurb, meta: `Up to ${v.capacity} guests · 1–5 days`, price: v.pricePerDay, unit: '/ day' })),
    ...C.stays.map(s => ({ id: s.id, kind: 'stay', tag: 'Stay', name: s.name, img: s.img, blurb: s.blurb, meta: `${s.units} ${s.unitName}s · sleeps ${s.sleeps} · up to ${C.policy.stay.maxNights} nights`, price: s.pricePerNight, unit: '/ night' })),
    ...C.unwind.map(u => ({ id: u.id, kind: 'unwind', tag: 'Unwind', name: u.name, img: u.img, blurb: u.blurb,
      meta: u.mode === 'hourly' ? `Up to ${u.maxPlayers} players · ${K.hh(u.open)} – ${K.hh(u.close)}` : `${u.seats} seats · ${u.sittingHours}-hour sitting · ${K.hh(u.open)} – ${K.hh(u.close)}`,
      price: u.mode === 'hourly' ? u.pricePerHour : u.pricePerGuest, unit: u.mode === 'hourly' ? '/ hour' : '/ guest' }))
  ];
  $('#esGrid').innerHTML = cards.map(c => `
    <article class="ec" data-k="${c.kind}">
      <div class="ec-img"><img src="${c.img}" alt="${c.name}" loading="lazy"><span class="ec-tag">${c.tag}</span></div>
      <div class="ec-b">
        <h3>${c.name}</h3>
        <p class="ec-meta">${c.meta}</p>
        <p>${c.blurb}</p>
        <div class="ec-foot"><span class="ec-price">${inr(c.price)}<small>${c.unit}</small></span><button type="button" class="btn-gold btn-sm" data-book="${c.id}">Book</button></div>
      </div>
    </article>`).join('');
  $$('.es-tabs button').forEach(b => b.onclick = () => {
    $$('.es-tabs button').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.f;
    const show = $$('.ec').filter(c => f === 'all' || c.dataset.k === f);
    $$('.ec').forEach(c => c.classList.toggle('hide', !show.includes(c)));
    gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' });
    ScrollTrigger.refresh();
  });

  /* ---------- Enquiry ---------- */
  $('#eqContact').innerHTML = `
    <div><span>Call</span>${C.business.phone}</div>
    <div><span>Email</span>${C.business.email}</div>
    <div><span>Visit</span>${C.business.address}</div>`;
  const form = $('#eqForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let bad = false;
    $$('.fld', form).forEach(f => f.classList.remove('err'));
    const mark = n => { form.elements[n].closest('.fld').classList.add('err'); bad = true; };
    if (!data.name.trim()) mark('name');
    if (data.phone.replace(/\D/g, '').length < 10) mark('phone');
    if (!/^\S+@\S+\.\S+$/.test(data.email)) mark('email');
    if (bad) return K.toast('Please fill in your name, phone and a valid email.');
    const btn = $('button[type=submit]', form);
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      if (C.api.enquiry) await fetch(C.api.enquiry, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, at: new Date().toISOString() }) });
      else { try { const k = 'knk_enquiries'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.push({ ...data, at: Date.now(), status: 'new' }); localStorage.setItem(k, JSON.stringify(l)); } catch {} }
      form.innerHTML = `<div class="eq-ok"><span class="tick"></span><h3>Thank you, ${K.esc(data.name.split(' ')[0])}.</h3><p>We've got your enquiry and will be in touch shortly${C.api.enquiry ? '' : ' (demo: connect api.enquiry to receive these by email)'}.</p></div>`;
      ScrollTrigger.refresh();
    } catch (err) { btn.disabled = false; btn.textContent = 'Send enquiry'; K.toast('Could not send. Please try again or call us.'); }
  });

  /* ============================================================
     Motion
     ============================================================ */
  const init = () => {
    // horizontal venue scroll (sticky, no pin → plays nicely with the pinned film above)
    ScrollTrigger.matchMedia({
      '(min-width: 901px)': () => {
        const track = $('#vxTrack');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tl = gsap.timeline({ scrollTrigger: { trigger: '#venues', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } });
        tl.to(track, { x: () => -dist(), ease: 'none' }, 0).to('#vxProg', { scaleX: 1, ease: 'none' }, 0);
        $$('.vc img').forEach(img => tl.fromTo(img, { xPercent: -6, scale: 1.14 }, { xPercent: 6, scale: 1.14, ease: 'none' }, 0));
        gsap.from('.vx-head > *', { y: 50, opacity: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '#venues', start: 'top 70%' } });
        gsap.from('.vc', { x: 120, opacity: 0, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '#venues', start: 'top 55%' } });
      }
    });

    // generic reveals
    $$('.reveal').forEach(el => gsap.to(el, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
    gsap.from('.ec', { y: 50, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '#esGrid', start: 'top 80%' } });
    gsap.from('.eq-form .fld, .eq-form .full', { y: 30, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: '#eqForm', start: 'top 80%' } });

    // wedding day: active item drives the sticky image
    const ims = $$('.wm'), its = $$('.wi');
    its.forEach((it, i) => ScrollTrigger.create({
      trigger: it, start: 'top 60%', end: 'bottom 60%',
      onToggle: self => {
        if (!self.isActive) return;
        its.forEach((x, k) => x.classList.toggle('is-on', k === i));
        ims.forEach((x, k) => x.classList.toggle('is-on', k === i));
        $('#wdTime').textContent = flow[i].time;
      }
    }));
  };
  // main.js registers ScrollTrigger; wait a tick so its pins exist first
  window.addEventListener('load', () => { init(); ScrollTrigger.refresh(); });
})();
