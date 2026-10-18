/* ============================================================
   KANKANA — scroll choreography
   GSAP + ScrollTrigger + Lenis
   ============================================================ */
(() => {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const isMobile = () => window.matchMedia('(max-width:900px)').matches;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    window.__lenis = lenis;
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('[data-scroll-to]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const target = $(a.dataset.scrollTo);
    if (!target) return;
    const st = ScrollTrigger.getAll().find(t => t.trigger === target && t.pin);
    const y = st ? st.start : target.getBoundingClientRect().top + window.scrollY;
    lenis ? lenis.scrollTo(y, { duration: 2.2 }) : window.scrollTo({ top: y, behavior: 'smooth' });
  }));

  /* ---------- swap helper: hide every item except the target ---------- */
  const others = (list, i) => list.filter((_, k) => k !== i);
  const hideOthers = (list, i, vars) => {
    gsap.killTweensOf(list);
    gsap.to(others(list, i), Object.assign({ opacity: 0, duration: 0.35, ease: 'power2.in', overwrite: true }, vars));
  };

  /* ---------- split text into chars ---------- */
  $$('.split-chars').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.style.display = 'inline-block';
      w.style.whiteSpace = 'nowrap';
      [...word].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ============================================================
     LOADER
     ============================================================ */
  document.documentElement.classList.add('is-loading', 'pre-home');
  const loader = $('#loader'), fill = $('#loaderFill'), count = $('#loaderCount');
  const critical = $$('#film img').slice(0, 2); // just the hero; everything else loads while the intro plays
  let loaded = 0;
  const bump = () => {
    loaded++;
    const p = loaded / critical.length;
    fill.style.transform = `scaleX(${p})`;
    count.textContent = String(Math.round(p * 100)).padStart(3, '0');
  };
  const waits = critical.map(img => (img.complete && img.naturalWidth)
    ? (bump(), Promise.resolve())
    : new Promise(r => { img.addEventListener('load', () => { bump(); r(); }, { once: true }); img.addEventListener('error', () => { bump(); r(); }, { once: true }); }));
  // measure every scroll section while the intro still covers the page, so nothing
  // jumps at the moment the homepage is revealed
  const prep = () => { document.documentElement.classList.remove('is-loading'); ScrollTrigger.refresh(); window.scrollTo(0, 0); };
  window.__introPrep = prep;
  // while the intro is on screen, swallow scroll input (without switching how the page scrolls,
  // which would force the whole page to re-draw at the moment of the handover)
  const hold = e => { if (document.documentElement.classList.contains('pre-home')) { e.preventDefault(); e.stopPropagation(); } };
  document.addEventListener('wheel', hold, { passive: false });
  document.addEventListener('touchmove', hold, { passive: false });
  document.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key) && document.documentElement.classList.contains('pre-home') && !e.target.closest('input,textarea')) e.preventDefault(); });
  Promise.race([Promise.all(waits), new Promise(r => setTimeout(r, 3500))]).then(() => {
    (window.__introReady || Promise.resolve()).then(() => {
      if (document.documentElement.classList.contains('is-loading')) prep();
      document.documentElement.classList.remove('pre-home');
      loader.classList.add('done');
      intro();
    });
  });

  function intro() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    // the intro ends on this same mandap photo, so the hero image simply carries on (no zoom)
    tl.from('.hero-title .ch', { yPercent: 110, opacity: 0, filter: 'blur(10px)', duration: 1.6, stagger: 0.06 }, 0.3)
      .to('.eyebrow', { opacity: 1, duration: 1.2 }, 0.9)
      .to('.hero-sub', { opacity: 1, duration: 1.2 }, 1.1)
      .fromTo('.hdr', { y: 0, yPercent: -100, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 1.2, clearProps: 'transform' }, 0.8)
      .from('.scroll-hint', { opacity: 0, duration: 1 }, 1.4);
  }

  /* ============================================================
     MIST (canvas fog)
     ============================================================ */
  const mist = (() => {
    const cv = $('#mist'), ctx = cv.getContext('2d');
    let W, H, dpr, parts = [], sprite, active = false, push = 0;
    const makeSprite = () => {
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = 256;
      const g = sprite.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(232,234,236,.55)');
      grd.addColorStop(0.45, 'rgba(220,223,226,.28)');
      grd.addColorStop(1, 'rgba(210,214,218,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = cv.width = Math.round(vw() * dpr * 0.6);
      H = cv.height = Math.round(vh() * dpr * 0.6);
      parts = Array.from({ length: 46 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: (0.35 + Math.random() * 0.75) * Math.max(W, H) * 0.5,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.12,
        z: Math.random()
      }));
    };
    const draw = () => {
      if (!active) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx + (p.x - W / 2) * 0.0015 * push;
        p.y += p.vy + (p.y - H / 2) * 0.0015 * push;
        p.z += 0.0012 + push * 0.004;
        if (p.z > 1) { p.z = 0; p.x = W * (0.3 + Math.random() * 0.4); p.y = H * (0.3 + Math.random() * 0.4); }
        const s = p.r * (0.6 + p.z * 1.4);
        ctx.globalAlpha = Math.sin(p.z * Math.PI) * 0.9;
        ctx.drawImage(sprite, p.x - s, p.y - s, s * 2, s * 2);
      }
      requestAnimationFrame(draw);
    };
    makeSprite(); resize();
    window.addEventListener('resize', resize);
    return {
      set(on) { if (on && !active) { active = true; draw(); } else if (!on) active = false; },
      push(v) { push = v; }
    };
  })();

  /* ============================================================
     01 FILM
     ============================================================ */
  {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#film', start: 'top top', end: () => '+=' + vh() * 7.5,
        pin: true, scrub: 1, anticipatePin: 1,
        onUpdate: self => {
          const p = self.progress;
          mist.set(p > 0.06 && p < 0.48);
          mist.push(gsap.utils.clamp(0, 1, (p - 0.15) * 4));
          $('.ghost-btn').classList.toggle('live', p > 0.92);
        }
      }
    });
    tl.to('.scroll-hint', { opacity: 0, duration: 0.3 }, 0)
      .to('.l-hero img', { scale: 1.55, duration: 3.4 }, 0)
      .to('.hero-title', { xPercent: -45, opacity: 0, filter: 'blur(10px)', duration: 1.1 }, 0)
      .to('.eyebrow, .hero-sub', { opacity: 0, y: -20, duration: 0.5 }, 0)
      // drifting tagline (enters right, exits left)
      .fromTo('.hero-drift .d1', { x: () => vw() * 0.45, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9 }, 0.25)
      .fromTo('.hero-drift .d2', { x: () => vw() * 0.6, opacity: 0 }, { x: () => vw() * 0.06, opacity: 1, duration: 1 }, 0.35)
      .to('.hero-drift .d1', { x: () => -vw() * 0.4, opacity: 0, filter: 'blur(6px)', duration: 0.9 }, 1.3)
      .to('.hero-drift .d2', { x: () => -vw() * 0.3, opacity: 0, filter: 'blur(6px)', duration: 0.9 }, 1.4)
      // into the cloud
      .to('.mist', { opacity: 1, duration: 1.2 }, 0.8)
      .to('.fogwash', { opacity: 0.86, duration: 1.1 }, 1.3)
      .fromTo('.fog-line .ch', { opacity: 0, y: 24, filter: 'blur(14px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.035 }, 2.0)
      .to('.fog-line', { scale: 1.15, opacity: 0, filter: 'blur(12px)', duration: 0.7 }, 3.25)
      // out of the cloud: aerial descent
      .to('.l-valley', { opacity: 1, duration: 0.3 }, 3.2)
      .fromTo('.l-valley img', { scale: 1.05 }, { scale: 1.9, duration: 2.1 }, 3.2)
      .to('.fogwash', { opacity: 0, duration: 0.9 }, 3.5)
      .to('.mist', { opacity: 0, duration: 1.1 }, 3.7)
      // arrive at the house
      .to('.l-house', { opacity: 1, duration: 0.5 }, 4.7)
      .fromTo('.l-house img', { scale: 1.45 }, { scale: 1.04, duration: 1.5 }, 4.7)
      // living
      .to('.l-living', { opacity: 1, duration: 0.5 }, 6.1)
      .fromTo('.l-living img', { scale: 1.25 }, { scale: 1, duration: 1.4 }, 6.1)
      .fromTo('.cap-living', { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45 }, 6.35)
      .to('.cap-living', { x: 60, opacity: 0, filter: 'blur(6px)', duration: 0.35 }, 7.25)
      // bedroom
      .to('.l-bed', { opacity: 1, duration: 0.5 }, 7.6)
      .fromTo('.l-bed img', { scale: 1.22 }, { scale: 1, duration: 1.4 }, 7.6)
      .fromTo('.cap-bed', { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45 }, 7.85)
      .to('.cap-bed', { x: 60, opacity: 0, filter: 'blur(6px)', duration: 0.35 }, 8.7)
      // night
      .to('.l-night', { opacity: 1, duration: 0.6 }, 9.05)
      .fromTo('.l-night img', { scale: 1.25 }, { scale: 1, duration: 1.6 }, 9.05)
      .fromTo('.cap-night', { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 9.45)
      .fromTo('.ghost-btn', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, 9.9)
      .to({}, { duration: 0.5 }, 10.3);
  }

  /* ============================================================
     02 INSIDE — 3D cylinder gallery
     ============================================================ */
  const tileImgs = ['aisle', 'balivilla', 'dj', 'cafe', 'conference', 'couplepalms', 'turfnight', 'cake', 'stage', 'villa-pool',
    'reception', 'pickleball', 'toast', 'balcony', 'venue-reception', 'holi', 'pooldeck', 'cafewindow', 'confetti', 'presenting',
    'balloons', 'arch-garden', 'turf', 'tentdinner', 'villa-poolside', 'banquet', 'villa-firepit', 'amphi-aerial', 'amphi-mandap', 'parking', 'amphi-steps'];
  const cyl = $('#cyl');
  function buildCylinder() {
    cyl.innerHTML = '';
    const mobile = isMobile();
    const N = mobile ? 12 : 16;
    const ROWS = 5;
    const tw = Math.round(gsap.utils.clamp(150, 330, vw() * (mobile ? 0.42 : 0.2)));
    const th = Math.round(tw * 0.68);
    const gap = Math.round(tw * 0.05);
    const R = (tw + gap) / (2 * Math.tan(Math.PI / N));
    const vStep = 2 * Math.atan((th + gap) / 2 / R) * 180 / Math.PI;
    const persp = Math.round(R * 1.08);
    cyl.parentElement.style.setProperty('--persp', persp + 'px');
    cyl.style.setProperty('--tw', tw + 'px');
    cyl.style.setProperty('--th', th + 'px');
    cyl.dataset.persp = persp;
    let k = 0;
    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < N; c++) {
        const t = document.createElement('div');
        t.className = 'tile';
        const a = c * (360 / N) + (r % 2 ? 180 / N : 0);
        const rx = (r - (ROWS - 1) / 2) * vStep;
        t.style.transform = `rotateY(${a}deg) rotateX(${-rx}deg) translateZ(${-R}px)`;
        const img = document.createElement('img');
        img.src = `assets/img/t/${tileImgs[(k * 7 + r * 3) % tileImgs.length]}.jpg`;
        t.dataset.a = a;
        img.alt = '';
        img.decoding = 'async';
        t.appendChild(img);
        frag.appendChild(t);
        k++;
      }
    }
    cyl.appendChild(frag);
    gsap.set(cyl, { z: persp });
  }
  buildCylinder();

  {
    const cards = $$('.gc-item');
    let cur = 0;
    const setCard = i => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const old = cards[cur], nu = cards[i];
      cards.forEach(c => c.classList.remove('is-active'));
      hideOthers(cards, i, { y: -18 * dir, filter: 'blur(6px)' });
      nu.classList.add('is-active');
      gsap.fromTo(nu, { opacity: 0, y: 22 * dir, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.25, ease: 'expo.out' });
      gsap.to('#gcRule', { scaleX: (i + 1) / cards.length, duration: 0.8, ease: 'expo.out' });
      $('#gcNum').textContent = String(i + 1).padStart(2, '0');
      cur = i;
    };
    gsap.set(cards.slice(1), { opacity: 0 });
    gsap.set(cards[0], { opacity: 1 }); // the first card starts visible

    // only draw tiles facing the viewer: tiles behind the camera waste GPU memory and can flash
    const cull = ry => {
      $$('.tile', cyl).forEach(t => {
        const ang = ((+t.dataset.a + ry) % 360 + 540) % 360 - 180; // -180..180, 0 = straight ahead
        const show = Math.abs(ang) < 105;
        if (t._vis !== show) { t.style.visibility = show ? 'visible' : 'hidden'; t._vis = show; }
      });
    };

    const rot = { y: 0 };
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#inside', start: 'top top', end: () => '+=' + vh() * 5.5,
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          const p = self.progress;
          const idx = gsap.utils.clamp(0, cards.length - 1, Math.floor((p - 0.24) / 0.165));
          setCard(p < 0.24 ? 0 : idx);
        }
      }
    });
    tl.fromTo(rot, { y: 30 }, { y: -230, duration: 10, onUpdate: () => { gsap.set(cyl, { rotationY: rot.y }); cull(rot.y); } }, 0)
      .fromTo('.cyl-persp', { scale: 0.72, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' }, 0)
      .fromTo('.inside-title .ch', { opacity: 0, y: 30, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.04, duration: 0.6 }, 0.1)
      .fromTo('.inside-title .kicker', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3)
      .to('.inside-title', { opacity: 0, scale: 1.12, filter: 'blur(14px)', duration: 0.7 }, 1.6)
      .fromTo('.glass-card', { opacity: 0, yPercent: -40, scale: 0.94 }, { opacity: 1, yPercent: -50, scale: 1, duration: 0.6, ease: 'power2.out' }, 2.1)
      .to('.glass-card', { opacity: 0, yPercent: -60, filter: 'blur(10px)', duration: 0.6 }, 9.1)
      .to('.cyl-persp', { scale: 0.7, opacity: 0.35, duration: 1, ease: 'power2.in' }, 9.0);
  }

  /* ============================================================
     CONTINUOUS HAND-OFFS
     Sections from Unwind to Facilities overlap by one screen (.chain,
     margin-top:-100vh) so each pinned scene ends exactly where the next
     begins, the way one continuous shot flows. Each next scene is shown
     only once its own pin starts.
     ============================================================ */
  const rel = (el, stage) => {
    let x = 0, y = 0, e = el;
    while (e && e !== stage) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  const chainCb = sel => {
    const sec = $(sel);
    return {
      onEnter: () => sec.classList.add('live'),
      onLeaveBack: () => sec.classList.remove('live'),
      onRefresh: self => sec.classList.toggle('live', self.progress > 0)
    };
  };

  /* ============================================================
     03 REST — gallery grid → dots → line → panorama → becomes the Morning card
     ============================================================ */
  {
    const sc = $('#scatter');
    const imgs = ['aisle', 'dj', 'cafe', 'balivilla', 'cake', 'conference', 'pickleball', 'toast', 'villa-poolside', 'stage', 'reception',
      'turfnight', 'couplepalms', 'balloons', 'holi', 'pooldeck', 'banquet', 'balcony', 'presenting', 'confetti', 'coffee', 'villa-firepit', 'amphi-steps', 'arch-garden'];
    const m = isMobile();
    const cols = m ? 4 : 7, rows = m ? 5 : 4;
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const centre = m ? (r >= 1 && r <= 3 && (c === 1 || c === 2)) : ((r === 1 || r === 2) && c >= 2 && c <= 4);
      if (centre) continue; // keep centre clear for the word
      const d = document.createElement('div');
      d.className = 'sc';
      d.style.left = `${(c + 0.5) / cols * 100}%`;
      d.style.top = `${(r + 0.5) / rows * 100}%`;
      d.innerHTML = `<img src="assets/img/t/${imgs[n % imgs.length]}.jpg" alt="" decoding="async">`;
      sc.appendChild(d);
      n++;
    }
    const tiles = $$('.sc');
    const tileW = () => Math.min(vw() / cols * 0.74, vh() / rows * 0.74 * 4 / 3);
    const sizeTiles = () => tiles.forEach(t => { t.style.width = tileW() + 'px'; t.style.height = tileW() * 0.75 + 'px'; });
    sizeTiles();
    window.addEventListener('resize', sizeTiles);

    const card = () => rel($('#day .day-main'), $('#day .stage'));
    const panoEl = $('.pano'), pv = { v: 50 };
    const clipPano = () => { panoEl.style.clipPath = `inset(${pv.v}% 0% ${pv.v}% 0%)`; };
    clipPano();

    /* night over the water: while the panorama is still a thin strip, a rippling
       reflection opens below it, a dusk sky above it, and lantern light (soft
       bokeh) drifts up out of it. All drawn from the real pool photo. */
    const fx = (() => {
      const stage = $('#rest .stage'), img = $('.pano img');
      const cv = document.createElement('canvas'); cv.className = 'rest-fx';
      stage.insertBefore(cv, panoEl);
      const g = cv.getContext('2d');
      let W = 0, H = 0, dpr = 1, raf = 0, on = false, t0 = performance.now();
      const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
      size(); addEventListener('resize', size);
      // soft out-of-focus lights
      const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,226,170,.95)'); gr.addColorStop(0.45, 'rgba(255,190,110,.55)'); gr.addColorStop(0.75, 'rgba(255,160,80,.12)'); gr.addColorStop(1, 'rgba(255,150,70,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; })();
      const B = Array.from({ length: isMobile() ? 18 : 34 }, () => ({ x: Math.random(), y: Math.random(), s: 6 + Math.random() * 26, v: 0.012 + Math.random() * 0.03, a: 0.25 + Math.random() * 0.6, ph: Math.random() * 6.28, dr: (Math.random() - 0.5) * 0.01 }));
      let wet = false;
      const frame = now => {
        const t = (now - t0) / 1000;
        g.clearRect(0, 0, W, H);
        const v = pv.v, top = H * v / 100, bot = H * (1 - v / 100), sh = bot - top;
        const thin = v >= 49.9 ? 0 : Math.min(1, Math.max(0, (v - 3) / 22));   // 1 while it is a strip, 0 once open
        if (thin > 0 && sh > 1 && img.naturalWidth) {
          // dusk sky above the strip
          const sky = g.createLinearGradient(0, top - H * 0.42, 0, top);
          sky.addColorStop(0, 'rgba(10,12,24,0)'); sky.addColorStop(0.6, `rgba(28,34,62,${0.55 * thin})`); sky.addColorStop(1, `rgba(120,74,40,${0.45 * thin})`);
          g.fillStyle = sky; g.fillRect(0, top - H * 0.42, W, H * 0.42);
          // the reflection: the strip mirrored about its lower edge, rippling, fading with depth
          const nw = img.naturalWidth, nh = img.naturalHeight, c = Math.max(W / nw, H / nh);
          const dw = nw * c, dh = nh * c, dx = (W - dw) * 0.5, dy = (H - dh) * 0.62;
          const s = gsap.getProperty(img, 'scale') || 1;
          const R = Math.min(H - bot, sh * 1.6, H * 0.4), step = 2;
          for (let d = 0; d < R; d += step) {
            const ys = bot - d * 0.85;                                    // the row being mirrored
            const iy = ((ys - H / 2) / s + H / 2 - dy) / c;
            if (iy < 0 || iy >= nh) continue;
            const k = 1 - d / R;
            const off = Math.sin(d * 0.11 + t * 2.1) * (1 + d * 0.035) + Math.sin(d * 0.037 - t * 1.3) * 2;
            g.globalAlpha = 0.5 * k * k * thin;
            g.drawImage(img, 0, iy, nw, Math.max(1, step / c / s), W / 2 + (dx - W / 2) * s + off, bot + d, dw * s, step + 0.6);
          }
          g.globalAlpha = 1;
          // a thin bright waterline where strip and reflection meet
          const wl = g.createLinearGradient(0, 0, W, 0); wl.addColorStop(0, 'rgba(255,214,150,0)'); wl.addColorStop(0.5, `rgba(255,224,170,${0.35 * thin})`); wl.addColorStop(1, 'rgba(255,214,150,0)');
          g.fillStyle = wl; g.fillRect(0, bot - 0.5, W, 1);
          // lantern light drifting up out of the strip
          g.globalCompositeOperation = 'lighter';
          for (const b of B) {
            const life = (b.y + t * b.v) % 1;                            // 0 at the strip, 1 high above
            const x = (b.x + Math.sin(t * 0.4 + b.ph) * 0.01 + life * b.dr) * W;
            const y = top + sh * 0.3 - life * H * 0.42;
            const a = b.a * Math.sin(life * Math.PI) * thin * (0.75 + 0.25 * Math.sin(t * 2 + b.ph));
            if (a <= 0.01) continue;
            g.globalAlpha = a; g.drawImage(dot, x - b.s / 2, y - b.s / 2, b.s, b.s);
          }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          // the sound of water, once, if sound is on and the visitor has already tapped
          if (!wet && thin > 0.5) wet = true;
        } else if (v >= 49.9) wet = false;
        if (on) raf = requestAnimationFrame(frame);
      };
      return { run(a) { if (a && !on) { on = true; raf = requestAnimationFrame(frame); } else if (!a && on) { on = false; cancelAnimationFrame(raf); g.clearRect(0, 0, W, H); } } };
    })();

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#rest', start: 'top top', end: () => '+=' + vh() * 5.9, pin: true, scrub: 0.8, invalidateOnRefresh: true, onToggle: self => fx.run(self.isActive) }
    });
    gsap.fromTo(tiles, { scale: 2.2, opacity: 0 },
      { scale: 1, opacity: 1, stagger: { each: 0.03, from: 'random' }, ease: 'power2.out',
        scrollTrigger: { trigger: '#rest', start: 'top 95%', end: 'top 10%', scrub: 1 } });
    tl.to({}, { duration: 0.6 }, 0)
      .to('.rest-word .ch', { opacity: 1, duration: 0.5, stagger: 0.08 }, 0.6)
      .fromTo('.rest-word .ch', { y: 30, filter: 'blur(10px)' }, { y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.08 }, 0.6)
      .to('.rest-word small', { opacity: 1, duration: 0.5 }, 1.1)
      // tiles shrink in place into points of light
      .to(tiles, {
        width: 7, height: 7, borderRadius: '50%', '--glow': 1,
        boxShadow: '0 0 14px 4px rgba(255,200,120,.65), 0 0 40px 10px rgba(255,170,80,.18)',
        duration: 1, stagger: { each: 0.02, from: 'center' }, ease: 'power2.inOut'
      }, 1.7)
      // the word dissolves letter by letter
      .to('.rest-word .ch', { opacity: 0, y: -14, filter: 'blur(8px)', duration: 0.4, stagger: { each: 0.05, from: 'random' } }, 2.9)
      .to('.rest-word small', { opacity: 0, duration: 0.4 }, 2.9)
      // points slide to the horizon
      .to(tiles, { top: '50%', duration: 0.9, stagger: { each: 0.015, from: 'edges' }, ease: 'power2.inOut' }, 3.3)
      .to('.beamline', { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.out' }, 3.9)
      .to('.beamring', { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 4.0)
      .to('#scatter', { autoAlpha: 0, duration: 0.4 }, 4.3)
      .to('.beamring', { scale: 2.4, opacity: 0, duration: 0.5 }, 4.6)
      // line opens into a panorama
      .fromTo(pv, { v: 50 }, { v: 43, duration: 0.8, ease: 'power2.out', onUpdate: clipPano }, 4.6)
      .to('.beamline', { opacity: 0, duration: 0.6 }, 5.2)
      .to(pv, { v: 0, duration: 1.4, ease: 'power2.inOut', onUpdate: clipPano }, 6.1)
      .to('.pano img', { scale: 1, duration: 2.9 }, 4.6)
      .fromTo('.pano-cap', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.5 }, 7.2)
      // …then the panorama folds itself into the Morning card of the next scene
      .to('.pano-cap', { opacity: 0, x: -30, duration: 0.4 }, 8.1)
      .fromTo('.pano', { left: 0, top: 0, width: () => vw(), height: () => vh(), borderRadius: 0 },
        { left: () => card().x, top: () => card().y, width: () => card().w, height: () => card().h, borderRadius: 18, duration: 1.2, ease: 'power3.inOut' }, 8.4)
      .to('.pano .pano-b', { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 8.6)
      .to({}, { duration: 0.7 }, 9.6);
  }

  /* ============================================================
     04 A DAY — cards build around the Morning card, then drop into the spaces row
     ============================================================ */
  {
    const phases = [
      { num: 'I', name: 'Morning', time: '07:30' },
      { num: 'II', name: 'Afternoon', time: '15:00' },
      { num: 'III', name: 'Evening', time: '19:30' }
    ];
    const groups = {
      main: $$('.dm-img'), a: $$('.ds-a .ds-img'), b: $$('.ds-b .ds-img'), orb: $$('.orb-img'),
      heads: $$('.dc-heads h3'), notes: $$('.dc-notes p')
    };
    let cur = 0, z = 5;
    const wipe = (list, i, dir, delay = 0) => {
      const el = list[i];
      el.style.zIndex = ++z;
      gsap.fromTo(el, { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, delay, ease: 'expo.inOut' });
      gsap.fromTo(el.querySelector('img'), { scale: 1.3 }, { scale: 1, duration: 1.6, delay, ease: 'expo.out' });
    };
    const setPhase = i => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      wipe(groups.main, i, dir, 0);
      wipe(groups.a, i, dir, 0.08);
      wipe(groups.b, i, dir, 0.16);
      wipe(groups.orb, i, dir, 0.1);
      hideOthers(groups.heads, i, { y: -24 * dir });
      gsap.fromTo(groups.heads[i], { opacity: 0, y: 34 * dir }, { opacity: 1, y: 0, duration: 0.9, delay: 0.3, ease: 'expo.out' });
      hideOthers(groups.notes, i, {});
      gsap.fromTo(groups.notes[i], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.45, ease: 'power2.out' });
      $$('.tab-roll b').forEach(b => b.style.transform = `translateY(${-i * 100}%)`);
      $('#dayNum').textContent = phases[i].num;
      $('#dayName').textContent = phases[i].name;
      $('#dayTime').textContent = phases[i].time;
      cur = i;
    };
    const ring = $('#dayRing');
    const dstage = $('#day .stage'), rstage = $('#rooms .stage');
    const fly = (sel, k) => {
      const a = rel($(sel), dstage), f = $$('#roomsRow figure')[k], b = rel(f, rstage);
      return { x: b.x - a.x, y: b.y - a.y, s: b.w / a.w };
    };
    const T0 = 1, PH = 6;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#day', start: 'top top', end: () => '+=' + vh() * 4.6, pin: true, scrub: 0.6, invalidateOnRefresh: true,
        ...chainCb('#day'),
        onUpdate: self => {
          const t = self.progress * tl.duration();
          const p = gsap.utils.clamp(0, 2.999, (t - T0) / PH * 3);
          const i = Math.floor(p);
          setPhase(i);
          ring.style.strokeDashoffset = 169.6 * (1 - Math.min(1, p - i));
        }
      }
    });
    tl.fromTo('.day-tab', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.15)
      .fromTo(['.ds-a', '.ds-b'], { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.55, stagger: 0.12, ease: 'power2.out' }, 0.1)
      .fromTo('.day-card', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.35)
      .to({}, { duration: PH }, T0)
      .to('.day-card', { opacity: 0, y: 60, duration: 0.5 }, T0 + PH + 0.1)
      .to('.day-tab', { opacity: 0, duration: 0.3 }, T0 + PH + 0.1);
    [['.day-main', 0], ['.ds-a', 1], ['.ds-b', 2]].forEach(([sel, k], n) => {
      tl.to(sel, { x: () => fly(sel, k).x, y: () => fly(sel, k).y, scale: () => fly(sel, k).s, transformOrigin: '0% 0%', duration: 1.2, ease: 'power3.inOut' }, T0 + PH + 0.2 + n * 0.08)
        .to(sel, { opacity: 0, duration: 0.35 }, T0 + PH + 1.15 + n * 0.05);
    });
    tl.to({}, { duration: 0.5 }, T0 + PH + 1.6);
  }

  /* ============================================================
     05 ROOMS — row → one space opens full screen → photo card + glass card + list
     ============================================================ */
  {
    const specs = [
      { area: 'Weddings, receptions', out: 'Day & night' },
      { area: 'Sangeet, shows, keynotes', out: 'Evenings' },
      { area: 'Breakfast, coffee, bites', out: 'All day' },
      { area: 'Football, cricket, teams', out: 'Day & night' },
      { area: 'Friends, families, teams', out: 'Morning & evening' },
      { area: 'Guests, wedding families', out: 'Overnight' },
      { area: 'Pool parties, downtime', out: 'All day' }
    ];
    const viewer = $('#viewer'), media = $('.v-media'), vcard = $('.v-card');
    // photo card: a copy of every space, in front of the full-bleed scene
    const photo = document.createElement('div');
    photo.className = 'v-photo';
    $$('.v-img', media).forEach(v => {
      const d = document.createElement('div');
      d.className = 'vf-img';
      const im = v.querySelector('img').cloneNode();
      im.alt = '';
      d.appendChild(im);
      photo.appendChild(d);
    });
    viewer.insertBefore(photo, $('.v-panel', viewer));
    viewer.insertBefore(vcard, $('.v-panel', viewer));
    // the turning page: photo on the front, the dark page on the back
    const leaf = document.createElement('div');
    leaf.className = 'v-leaf';
    leaf.innerHTML = '<div class="lf-face lf-front"><img alt=""><i class="lf-shade"></i></div><div class="lf-face lf-back"></div>';
    viewer.insertBefore(leaf, $('.v-panel', viewer));
    const OPEN = 12; // how far each page tilts back from the spine
    gsap.set(photo, { rotationY: OPEN, transformOrigin: '100% 50%' });
    gsap.set(leaf, { rotationY: OPEN, transformOrigin: '100% 50%', autoAlpha: 0 });
    gsap.set(vcard, { rotationY: -OPEN, transformOrigin: '0% 50%' });

    const imgs = $$('.v-img'), fimgs = $$('.vf-img'), titles = $$('.v-titles h3'), descs = $$('.v-descs p'), items = $$('#vpList li');
    let cur = 0, z = 5, turnTl;
    const showPhoto = i => fimgs.forEach((f, k) => { f.style.visibility = k === i ? 'visible' : 'hidden'; });
    showPhoto(0);
    const lfImg = leaf.querySelector('.lf-front img'), shade = leaf.querySelector('.lf-shade');
    // turn a page: forward, the next page swings over the spine from the right onto the left page;
    // backward, the current page lifts off to the right and reveals the one underneath
    const turn = (i, prev, dir) => {
      if (turnTl) turnTl.progress(1);
      const src = fimgs[dir > 0 ? i : prev].querySelector('img');
      lfImg.src = src.src;
      lfImg.style.objectPosition = src.style.objectPosition;
      if (dir > 0) {
        turnTl = gsap.timeline({ onComplete: () => { showPhoto(i); gsap.set(leaf, { autoAlpha: 0 }); } })
          .set(leaf, { autoAlpha: 1, rotationY: 180 - OPEN })
          .to(leaf, { rotationY: OPEN, duration: 1.15, ease: 'power2.inOut' }, 0)
          .fromTo(shade, { opacity: 0.75 }, { opacity: 0, duration: 1.15, ease: 'power2.in' }, 0);
      } else {
        showPhoto(i);
        turnTl = gsap.timeline({ onComplete: () => gsap.set(leaf, { autoAlpha: 0 }) })
          .set(leaf, { autoAlpha: 1, rotationY: OPEN })
          .to(leaf, { rotationY: 180 - OPEN, duration: 1.15, ease: 'power2.inOut' }, 0)
          .fromTo(shade, { opacity: 0 }, { opacity: 0.75, duration: 1.15, ease: 'power2.out' }, 0);
      }
    };
    const setRoom = i => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const el = imgs[i];
      el.style.zIndex = ++z;
      gsap.fromTo(el, { opacity: 0, clipPath: 'inset(0% 0% 0% 0%)' }, { opacity: 1, duration: 1.2, delay: 0.2, ease: 'power2.inOut' });
      gsap.fromTo(el.querySelector('img'), { scale: 1.18 }, { scale: 1.08, duration: 1.8, delay: 0.2, ease: 'expo.out' });
      turn(i, cur, dir);
      hideOthers(titles, i, { y: -16 * dir, duration: 0.25 });
      hideOthers(descs, i, { y: -16 * dir, duration: 0.25 });
      gsap.fromTo(titles[i], { opacity: 0, y: 26 * dir }, { opacity: 1, y: 0, duration: 0.8, delay: 0.62, ease: 'expo.out' });
      gsap.fromTo(descs[i], { opacity: 0, y: 14 * dir }, { opacity: 1, y: 0, duration: 0.8, delay: 0.72, ease: 'expo.out' });
      items.forEach((li, k) => li.classList.toggle('is-on', k === i));
      $('#vNum').textContent = String(i + 1).padStart(2, '0');
      $('#vArea').textContent = specs[i].area;
      $('#vOut').textContent = specs[i].out;
      cur = i;
    };
    $('#vArea').textContent = specs[0].area;
    $('#vOut').textContent = specs[0].out;
    gsap.set(imgs[0], { zIndex: 5 });
    gsap.set(imgs[0].querySelector('img'), { scale: 1.08 });

    const rstage = $('#rooms .stage'), row = $('#roomsRow'), rz = $('.r-zoom');
    const fig0 = row.querySelector('figure');
    const rowShift = () => Math.max(0, row.scrollWidth - (vw() - rel(row, rstage).x - 16));
    const f0 = () => { const r = rel(fig0, rstage); return { ...r, x: r.x - rowShift() }; };
    // where the photo card and glass card meet in the middle on the way out
    const outP = () => { const r = rel(photo, rstage); return { x: vw() / 2 - r.w - 4 - r.x }; };
    const outC = () => { const p = rel(photo, rstage), c = rel(vcard, rstage); return { x: vw() / 2 - c.x, y: p.y + (p.h - c.h) / 2 - c.y }; };
    const pr = () => rel(photo, rstage);
    const CYC = 4.4, SPAN = 6, OUT = CYC + SPAN;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#rooms', start: 'top top', end: () => '+=' + vh() * 9, pin: true, scrub: 0.8, invalidateOnRefresh: true,
        ...chainCb('#rooms'),
        onUpdate: self => {
          const t = self.progress * tl.duration();
          const n = imgs.length;
          setRoom(t < CYC ? 0 : Math.min(n - 1, Math.floor((t - CYC) / (SPAN / n))));
        }
      }
    });
    tl.fromTo('#roomsRow figure', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0)
      .fromTo('.rooms-head .ln > span', { yPercent: 110 }, { yPercent: 0, stagger: 0.15, duration: 0.7, ease: 'power3.out' }, 0.1)
      .fromTo('.rooms-sub', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4)
      .to(row, { x: () => -rowShift(), duration: 1 }, 0.8)
      .to('#roomsRow figure:not(:first-child)', { opacity: 0, y: 40, duration: 0.5, stagger: 0.04 }, 1.6)
      .to(['.rooms-head', '.rooms-sub'], { x: -80, opacity: 0, filter: 'blur(10px)', duration: 0.7 }, 1.8)
      .set(rz, { visibility: 'visible' }, 1.8)
      .set(fig0, { opacity: 0 }, 1.81)
      // the first space opens to fill the screen…
      .fromTo(rz, { left: () => f0().x, top: () => f0().y, width: () => f0().w, height: () => f0().h, borderRadius: 14 },
        { left: 0, top: 0, width: () => vw(), height: () => vh(), borderRadius: 0, duration: 1, ease: 'power3.inOut' }, 1.8)
      // …the scene stays behind, and a copy folds down into the left page of an open book
      .set('.viewer', { autoAlpha: 1 }, 2.9)
      .set(photo, { autoAlpha: 0 }, 2.9)
      .to(rz, { left: () => pr().x, top: () => pr().y, width: () => pr().w, height: () => pr().h, borderRadius: 16, rotationY: OPEN, transformOrigin: '100% 50%', duration: 0.9, ease: 'power3.inOut' }, 2.9)
      .set(photo, { autoAlpha: 1 }, 3.8)
      .set(rz, { visibility: 'hidden' }, 3.81)
      // the right page opens out from the spine
      .fromTo(vcard, { rotationY: -115, opacity: 0 }, { rotationY: -OPEN, opacity: 1, duration: 0.8, ease: 'power3.out' }, 3.6)
      .fromTo('.v-panel', { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 3.8)
      .to({}, { duration: SPAN }, CYC)
      // out: the scene and list fall away, the two cards meet in the middle
      .to('.v-panel', { x: 60, opacity: 0, duration: 0.5 }, OUT + 0.1)
      .to(media, { opacity: 0, duration: 0.7 }, OUT + 0.1)
      .to(photo, { x: () => outP().x, rotationY: 0, duration: 0.9, ease: 'power3.inOut' }, OUT + 0.3)
      .to(vcard, { x: () => outC().x, y: () => outC().y, rotationY: 0, duration: 0.9, ease: 'power3.inOut' }, OUT + 0.3)
      .fromTo('.r-out-l', { opacity: 0, x: -50, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.6 }, OUT + 1.0)
      .fromTo('.r-out-r', { opacity: 0, x: 50, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.6 }, OUT + 1.15)
      .to('.r-out', { opacity: 0, filter: 'blur(8px)', duration: 0.45 }, OUT + 2.0)
      // the book closes: the right page folds over onto the photo
      .to(vcard, { rotationY: -180, duration: 0.8, ease: 'power2.inOut' }, OUT + 2.1)
      .to({}, { duration: 0.5 }, OUT + 2.9);
  }

  /* ============================================================
     06 MOMENTS — Kankana's own photos in gold-lined strips, the words cut into
     them; at the end the strips are shuffled slices of the amphitheatre that
     click into place, then the lights go down for Showtime
     ============================================================ */
  {
    const scenes = [
      { img: 'amphi-mandap', pos: '60% 46%', word: 'Celebrate', sub: 'Weddings, birthdays, anniversaries: the days you\'ll talk about for years.' },
      { img: 'venue-reception', pos: '50% 50%', word: 'Meet', sub: 'Conferences, offsites and award nights, with room to breathe.' },
      { img: 'villa-poolside', pos: '50% 60%', word: 'Play', sub: 'Turf, pickleball and the pool, for when the agenda is fun.' },
      { img: 'villa-firepit', pos: '50% 55%', word: 'Stay', sub: 'Six Bali-themed villas, so nobody has to leave early.' },
      { img: 'amphi-aerial', pos: '50% 50%', word: '', sub: '' }            // the puzzle that solves itself
    ];
    const R = isMobile() ? 8 : 10, RH = 100 / R;
    const holder = $('#slats');
    const rand = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    const sets = scenes.map((sc, si) => {
      const set = document.createElement('div');
      set.className = 'slat-set' + (si === scenes.length - 1 ? ' puzzle' : '');
      set.style.zIndex = si + 1;
      const list = [];
      for (let j = 0; j < R; j++) {
        const s = document.createElement('div');
        s.className = 'slat';
        Object.assign(s.style, { left: 0, width: '100%', top: (j * RH) + '%', height: (RH + 0.02) + '%' });
        const inner = document.createElement('div');
        inner.className = 'slat-in';
        Object.assign(inner.style, { left: 0, width: '100%', top: (-j * 100) + '%', height: (R * 100) + '%', backgroundImage: `url(assets/img/${sc.img}.jpg)`, backgroundPosition: sc.pos });
        // the words are printed on the scene itself, so they travel with every strip
        if (sc.word) inner.insertAdjacentHTML('beforeend', `<span class="sw-idx">${String(si + 1).padStart(2, '0')} / 04</span><span class="sw-word">${sc.word}</span><span class="sw-sub">${sc.sub}</span>`);
        s.appendChild(inner);
        set.appendChild(s);
        list.push(s);
      }
      holder.appendChild(set);
      return list;
    });
    // screen-reader text for the four words (the visual copies are decorative)
    holder.setAttribute('aria-hidden', 'true');

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#moments', start: 'top top', end: () => '+=' + vh() * 7.4, pin: true, scrub: 0.8, ...chainCb('#moments') }
    });
    // strips wait off to alternating sides
    sets.forEach((list, k) => list.forEach((s, j) => gsap.set(s, { xPercent: (j % 2 ? 1 : -1) * 104, filter: 'brightness(1)' })));
    const drift = (k, j) => (rand(j, k + 31) - 0.5) * 4;
    tl.to({}, { duration: 0.15 }, 0)
      .to('.m-seed', { scale: 1.25, opacity: 0, duration: 0.9, ease: 'power2.in' }, 0.25);
    const STEP = 2.0;
    for (let k = 0; k < 4; k++) {
      const at = k === 0 ? 0.15 : 0.15 + k * STEP;
      sets[k].forEach((s, j) => {
        const d = rand(j, k + 51) * 0.4;
        tl.to(s, { xPercent: 0, duration: 1.0, ease: 'power3.out' }, at + d);                     // every row locks exactly into line
      });
      if (k) sets[k - 1].forEach(s => tl.to(s, { filter: 'brightness(.5)', duration: 1.0, ease: 'power2.inOut' }, at + 0.1));
      // a slow push-in while the scene holds
      tl.fromTo(sets[k][0].parentElement, { scale: 1.04 }, { scale: 1, duration: STEP + 0.6, ease: 'none' }, at);
      // a band of light sweeps across as each scene lands
      tl.fromTo('.m-sweep', { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 1, duration: 1.2, ease: 'power1.inOut' }, at + 0.55)
        .to('.m-sweep', { opacity: 0, duration: 0.3 }, at + 1.5);
    }
    /* the puzzle: shuffled slices of the amphitheatre fly in, then click into place row by row */
    const P = sets[4], PZ = 0.15 + 4 * STEP;
    const order = Array.from({ length: R }, (_, i) => i).sort((a, b) => rand(a, 91) - rand(b, 91));
    P.forEach((s, j) => gsap.set(s, { yPercent: (order[j] - j) * 100 }));
    P.forEach((s, j) => {
      const off = (j % 2 ? 1 : -1) * (18 + rand(j, 7) * 34);
      tl.to(s, { xPercent: off, duration: 0.9, ease: 'power3.out' }, PZ + rand(j, 3) * 0.35);
    });
    sets[3].forEach(s => tl.to(s, { filter: 'brightness(.35)', duration: 0.9 }, PZ + 0.2));
    // each strip slides to its true row and lines up, top to bottom
    const byRow = P.map((s, j) => ({ s, row: j })).sort((a, b) => a.row - b.row);
    byRow.forEach(({ s }, n) => {
      const at = PZ + 1.2 + n * 0.12;
      tl.to(s, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' }, at)
        .to(s, { xPercent: 0, duration: 0.6, ease: 'back.out(1.6)' }, at + 0.35);
    });
    const DONE = PZ + 1.2 + R * 0.12 + 1.0;
    tl.to('.slat-set.puzzle .slat', { '--line': 0, duration: 0.5 }, DONE)                 // the gold seams melt away
      .fromTo('.m-sweep', { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 1, duration: 1.1, ease: 'power1.inOut' }, DONE + 0.1)
      .to('.m-sweep', { opacity: 0, duration: 0.3 }, DONE + 1.0)
      .fromTo('.puzzle', { scale: 1 }, { scale: 1.06, duration: 2.2, ease: 'none' }, DONE)
      // the lights go down for the show
      .to('#slats', { filter: 'brightness(0)', duration: 1.0, ease: 'power2.in' }, DONE + 1.3)
      .to({}, { duration: 0.3 }, DONE + 2.3);
  }

  /* ============================================================
     07 CLIMB — falling light → a column opens into a ridge with a gold edge
     ============================================================ */
  {
    const elev = { v: 17 * 60 };
    const beam = $('.beam'), path = $('#ridgePath');
    const RO = x => 5.5 * Math.sin(x / 100 * Math.PI * 2 * 1.2 + 0.6) + 3 * Math.sin(x / 100 * Math.PI * 2 * 3.1 + 1.7) + 1.4 * Math.sin(x / 100 * Math.PI * 2 * 7.3);
    const st = { w: 0, b: 30 };
    const draw = () => {
      const L = 50 - st.w / 2, Rr = 50 + st.w / 2, N = 40;
      const pts = Array.from({ length: N + 1 }, (_, i) => { const x = Rr - (Rr - L) * i / N; return [x, st.b + RO(x)]; });
      beam.style.clipPath = st.w <= 0 ? 'polygon(50% 100%, 50% 100%, 50% 100%)'
        : `polygon(${L}% 100%, ${Rr}% 100%, ${pts.map(p => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(', ')})`;
      path.setAttribute('d', st.w <= 0 ? '' : 'M' + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L'));
    };
    draw();
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#climb', start: 'top top', end: () => '+=' + vh() * 5, pin: true, scrub: 0.8, ...chainCb('#climb') }
    });
    tl.to('.drop-line', { scaleY: 1, duration: 1.3, ease: 'power1.inOut' }, 0)
      .fromTo('.drop-dot', { top: '0%' }, { top: '30%', duration: 1.3, ease: 'power1.inOut' }, 0)
      .to('.elev', { opacity: 1, duration: 0.3 }, 0.2)
      .to(elev, { v: 19 * 60 + 30, duration: 1.3, ease: 'power1.inOut', onUpdate: () => { const m = Math.round(elev.v); $('#elev').textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); } }, 0)
      .fromTo('.drop-dot', { '--ring': 0, '--ringo': 1 }, { '--ring': 3, '--ringo': 0, duration: 0.6 }, 1.3)
      .to('.drop-line', { opacity: 0, duration: 0.5 }, 1.5)
      // a narrow column drops open below the light…
      .fromTo(st, { w: 0 }, { w: 9, duration: 0.6, ease: 'power2.out', onUpdate: draw }, 1.3)
      // …then widens across the whole ridge
      .to(st, { w: 100, duration: 1.1, ease: 'power3.inOut', onUpdate: draw }, 1.9)
      .to('.beam img', { scale: 1, duration: 2.2 }, 1.3)
      .to('.drop-dot, .elev', { opacity: 0, duration: 0.4 }, 2.3)
      .fromTo('.climb-text .w', { opacity: 0, y: 24, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.14 }, 2.9)
      .to('.climb-foot', { opacity: 1, duration: 0.5 }, 3.9)
      .to(['.climb-text', '.climb-foot'], { opacity: 0, filter: 'blur(10px)', duration: 0.5 }, 4.9)
      .to(st, { b: -22, duration: 0.9, ease: 'power2.inOut', onUpdate: draw }, 5.0)
      .to('.ridge-line', { opacity: 0, duration: 0.5 }, 5.4)
      .to({}, { duration: 0.4 }, 5.9);
  }

  /* ============================================================
     08 BUILT — the same view splits into three panels → outlines of the cells → bento
     ============================================================ */
  {
    const bentos = $$('.bento');
    const bstage = $('#built .stage'), outBox = $('#bpOut');
    const cells = bentos.flatMap(b => [...b.querySelectorAll('.b')]);
    const outlines = cells.map(() => { const d = document.createElement('div'); d.className = 'bo'; outBox.appendChild(d); return d; });
    const placeOutlines = () => cells.forEach((c, i) => {
      const r = rel(c, bstage);
      Object.assign(outlines[i].style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', display: r.x > vw() ? 'none' : '' });
    });
    placeOutlines();
    window.addEventListener('resize', () => setTimeout(placeOutlines, 300));
    const trackShift = () => {
      const w = bentos[0].getBoundingClientRect().width + 14;
      return -w * (bentos.length - 1);
    };
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#built', start: 'top top', end: () => '+=' + vh() * 7.8, pin: true, scrub: 0.8, invalidateOnRefresh: true, ...chainCb('#built') }
    });
    const pis = $$('.pi'), pjs = $$('.pj');
    const o = 0.6;
    gsap.set(pjs, { visibility: 'visible', yPercent: i => (i % 2 ? -101 : 101) });
    gsap.set(outlines, { clipPath: 'inset(0% 100% 100% 0%)' });
    tl.to('.panel', { borderRightColor: 'rgba(5,5,6,.9)', duration: 0.4 }, 0.15)
      .to(pjs, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power3.inOut' }, 0.5)
      .fromTo($$('.pj img'), { scale: 1.3 }, { scale: 1, duration: 1.6, stagger: 0.1, ease: 'power2.out' }, 0.5)
      .to(pis, { yPercent: i => [-8, 6, -5][i], duration: 1.1, ease: 'power2.inOut' }, 0.5)
      .fromTo('.built-title .ch', { opacity: 0, x: () => gsap.utils.random(-60, 60), filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.5, stagger: { each: 0.04, from: 'random' } }, 1.1)
      .to('.built-title', { opacity: 0, filter: 'blur(12px)', duration: 0.5 }, 2.1 + o)
      .to([...pis, ...pjs], { opacity: 0, duration: 0.7 }, 2.3 + o)
      .to('.panel', { opacity: 0, duration: 0.4 }, 3.0 + o)
      // outlines of the real cells draw in, then the cells fill them
      .to(outlines, { clipPath: 'inset(-2% -2% -2% -2%)', duration: 0.9, stagger: 0.07, ease: 'power2.inOut' }, 2.6 + o)
      .to('.bp-title .ch', { opacity: 1, duration: 0.3, stagger: 0.03 }, 3.4 + o)
      .to('.bp-title', { opacity: 0, filter: 'blur(10px)', duration: 0.5 }, 4.6 + o)
      .fromTo(bentos[0].querySelectorAll('.b'), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, 4.9 + o)
      .fromTo(bentos.slice(1).flatMap(b => [...b.querySelectorAll('.b')]), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.05 }, 5.3 + o)
      .to(outBox, { opacity: 0, duration: 0.5 }, 6.0 + o)
      .to('#bentoTrack', { x: trackShift, duration: 3.6, ease: 'power1.inOut' }, 6.0 + o)
      .to({}, { duration: 0.6 }, 9.6 + o);
    $$('.bento .b img').forEach(img => {
      tl.fromTo(img, { xPercent: 6, scale: 1.12 }, { xPercent: -6, scale: 1.12, duration: 3.6, ease: 'none' }, 6.0 + o);
    });
  }

  /* ============================================================
     09 FINALE — push in through the lights → inside → back out to the wordmark
     ============================================================ */
  {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#finale', start: 'top top', end: () => '+=' + vh() * 5.5, pin: true, scrub: 1 }
    });
    tl.fromTo('.f-a img', { scale: 1.08 }, { scale: 2.8, transformOrigin: '50% 58%', duration: 2.4, ease: 'power2.in' }, 0)
      .fromTo('.f-l1', { x: () => -vw() * 0.12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.3)
      .fromTo('.f-l2', { x: () => vw() * 0.12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.55)
      .to('.f-l1', { x: () => -vw() * 0.1, opacity: 0, filter: 'blur(8px)', duration: 0.5 }, 1.6)
      .to('.f-l2', { x: () => vw() * 0.1, opacity: 0, filter: 'blur(8px)', duration: 0.5 }, 1.65)
      .to('.f-b', { opacity: 1, duration: 0.5 }, 1.95)
      .fromTo('.f-b img', { scale: 2 }, { scale: 1.05, duration: 1.6, ease: 'power3.out' }, 1.95)
      .to('.f-b img', { scale: 1.7, duration: 1.2, ease: 'power2.in' }, 3.55)
      .to('.f-c', { opacity: 1, duration: 0.6 }, 4.3)
      .fromTo('.f-c img', { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 4.3)
      .fromTo('.wordmark span', { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 4.9)
      .to('.f-meta', { opacity: 1, duration: 0.5 }, 5.6)
      .fromTo('.f-cta', { opacity: 0, y: 14, xPercent: -50 }, { opacity: 1, y: 0, xPercent: -50, duration: 0.5 }, 5.8)
      .to({}, { duration: 0.6 }, 6.3);
  }

  /* ============================================================
     HEADER — section label + progress
     ============================================================ */
  {
    const num = $('#hdrNum'), name = $('#hdrName');
    let curLabel = '';
    const setLabel = (n, t) => {
      if (t === curLabel) return;
      curLabel = t;
      gsap.to([num, name], { yPercent: -110, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
        num.textContent = n; name.textContent = t;
        gsap.fromTo([num, name], { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
      } });
    };
    $$('section[data-sec]').forEach(sec => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: self => { if (self.isActive) setLabel(sec.dataset.sec, sec.dataset.name); }
      });
    });
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => { $('#hdrProgress').style.transform = `scaleX(${self.progress})`; }
    });
  }

  /* ---------- resize ---------- */
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { buildCylinder(); ScrollTrigger.refresh(); }, 250);
  });
})();
