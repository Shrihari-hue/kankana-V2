/* ============================================================
   KANKANA — intro
   Three styles (switch with ?intro=doors, ?intro=thread or ?intro=mandap, or set DEFAULT_MODE):
   · doors  : rose petals gather into the logo, the velvet becomes carved temple
              doors that swing open in 3D onto the homepage
   · thread : a gold kankana thread draws itself, loops into a bangle and ties a
              knot; the logo forms inside; the ring opens like a camera iris
              and reveals the homepage through it
   · mandap : the camera dives through the mandap in the logo into the real
              amphitheatre mandap
   Files: assets/brand/kankana-logo.png, intro-bg-1.jpg, intro-bg-2.jpg
   ============================================================ */
(() => {
  const DEFAULT_MODE = 'doors';
  const $$q = s => [...document.querySelectorAll(s)];
  const loader = document.getElementById('loader');
  if (!loader || !window.gsap) { window.__introReady = Promise.resolve(); return; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false;
  try { seen = sessionStorage.getItem('knk_intro_seen') === '1'; sessionStorage.setItem('knk_intro_seen', '1'); } catch {}
  const asked = new URLSearchParams(location.search).get('intro');
  const MODE = ['mandap', 'thread', 'doors'].includes(asked) ? asked : DEFAULT_MODE;
  loader.dataset.mode = MODE;

  /* ---------- your logo, with the shine masked to its shape ---------- */
  const LOGO = 'assets/brand/kankana-logo.png';
  $$q('.mark-png-shine, .mark-png-glint').forEach(sh => { sh.style.webkitMaskImage = sh.style.maskImage = `url(${LOGO})`; });
  const markEl = document.getElementById('introMark');

  const tl = gsap.timeline({ paused: true });
  tl.add(() => loader.classList.add('ready'), 0)
    // the rose velvet slowly comes up, the second layer breathes over it
    .fromTo('.intro-bg', { scale: 1.12 }, { scale: 1, duration: 4, ease: 'power2.out' }, 0)
    .fromTo('.ib2', { opacity: 0 }, { opacity: 0.85, duration: 2.2, ease: 'sine.inOut' }, 0.4);

  if (MODE === 'mandap') {
    /* ================= THROUGH THE MANDAP ================= */
    const MX = 0.475, MY = 0.38; // the mandap opening inside the logo
    const dive = () => {
      const r = markEl.getBoundingClientRect();
      const px = r.left + r.width * MX, py = r.top + r.height * MY;
      return { x: innerWidth / 2 - px, y: innerHeight / 2 - py };
    };
    const diveEl = document.querySelector('.intro-dive'), ap = { r: 0 };
    const clipDive = () => { diveEl.style.clipPath = `circle(${ap.r}% at 50% 50%)`; };
    clipDive();
    tl.to('.intro-glow', { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' }, 0.2)
      .fromTo('#introMark', { opacity: 0, y: 26, scale: 0.94, filter: 'blur(12px) brightness(.4)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px) brightness(1)', duration: 1.9, ease: 'expo.out' }, 0.35)
      .to('.intro-foot', { opacity: 1, duration: 1.2 }, 1.5)
      .fromTo('.mark-png-shine', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.9, ease: 'power1.inOut' }, 1.2)
      .fromTo('.mark-png-glint', { opacity: 0 }, { opacity: 1, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.75)
      .to('.intro-glow', { scale: 1.12, opacity: 1, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.4)
      .fromTo('.intro-mark', { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,210,140,0))' }, { filter: 'brightness(1.22) drop-shadow(0 0 22px rgba(255,205,130,.5))', duration: 0.55, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.6)
      .to(['.intro-foot', '.loader-bar', '.intro-skip'], { opacity: 0, duration: 0.4 }, 2.8)
      .set('#introMark', { filter: 'none' }, 2.95)
      .to('#introMark', { x: () => dive().x, y: () => dive().y, scale: 18, transformOrigin: `${MX * 100}% ${MY * 100}%`, duration: 1.7, ease: 'power3.in' }, 3.0)
      .to('.intro-bg', { scale: 1.7, opacity: 0.15, duration: 1.6, ease: 'power2.in' }, 3.0)
      .to('.intro-glow', { opacity: 0, duration: 0.8 }, 3.0)
      .fromTo(ap, { r: 0 }, { r: 80, duration: 1.1, ease: 'power2.inOut', onUpdate: clipDive }, 3.95)
      .fromTo('.intro-dive img', { scale: 2.8 }, { scale: 1.08, duration: 1.9, ease: 'power3.out' }, 3.95)
      .to('#introMark', { opacity: 0, duration: 0.45 }, 4.35)
      .fromTo('.intro-welcome', { opacity: 0, y: 14, letterSpacing: '0.6em' }, { opacity: 1, y: 0, letterSpacing: '0.42em', duration: 1, ease: 'expo.out' }, 4.9)
      .to({}, { duration: 0.5 }, 5.9);
  } else if (MODE === 'doors') {
    /* ================= ROSE PETALS → THE WEDDING DOORS =================
       petals drift down and gather into the logo; the gold appears; the velvet
       becomes a real carved doorway at dusk, and the doors wait.
       A tap knocks, a bell rings, and the doors
       swing open in 3D with light pouring through, onto the homepage. */
    const KIT = window.KNKIntroKit, Sound = null; // sound switched off
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const small = W < 700;
    // ---- real rose petals (see intro-petals.js) ----
    const rnd = (a, b) => a + Math.random() * (b - a);
    const img = markEl.querySelector('img');
    const PET = window.KNKPetals ? window.KNKPetals.create({ loader, before: markEl, markEl, imgEl: img, small }) : null;
    const st = PET ? PET.state : { g: 0, gold: 0, a: 0, blow: 0 };
    const draw = () => PET && PET.draw();

    // ---- the doorway: a real photograph (the Rose Gate, City Palace, Jaipur) ----
    // The two door leaves are cut out of the photo along the real cusped arch, so
    // they are what swing open, while the carved archway around them stays put.
    const GATE = { src: 'assets/img/rosegate.jpg', w: 2000, h: 2704, d: { x: 700, y: 1386, w: 604, h: 1120 } };
    // the arch top of the doorway, as fractions of the door (left half; mirrored for the right)
    const ARCH = [[0, 0.146], [0.033, 0.089], [0.099, 0.057], [0.159, 0.043], [0.225, 0.018], [0.33, 0.004], [0.5, 0]];
    const s = Math.max(W / GATE.w, H / GATE.h, (small ? 0.8 : 0.84) * H / GATE.d.h);
    const IW = GATE.w * s, IH = GATE.h * s;
    const gx = Math.min(0, Math.max(W - IW, W / 2 - (GATE.d.x + GATE.d.w / 2) * s));
    const gy = Math.min(0, Math.max(H - IH, H * 0.5 - (GATE.d.y + GATE.d.h / 2) * s));
    const D = { x: gx + GATE.d.x * s, y: gy + GATE.d.y * s, w: GATE.d.w * s, h: GATE.d.h * s };
    const archPts = () => {
      const left = ARCH.map(([fx, fy]) => [D.x + fx * D.w, D.y + fy * D.h]);
      const right = ARCH.slice(0, -1).reverse().map(([fx, fy]) => [D.x + (1 - fx) * D.w, D.y + fy * D.h]);
      return [[D.x, D.y + D.h], ...left, ...right, [D.x + D.w, D.y + D.h]];
    };
    const px = p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`;
    const hole = archPts();
    // the wall with a doorway-shaped hole (even-odd), so the homepage shows through once the doors move
    const wallClip = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${hole.map(px).join(', ')}, ${px(hole[0])})`;
    const leafClip = side => {
      // each leaf, in its own box: half the arch
      const half = side === 'l'
        ? [[0, D.h], ...ARCH.map(([fx, fy]) => [fx * D.w, (fy - 0.012) * D.h]), [D.w / 2, D.h]]
        : [[0, D.h], ...ARCH.slice().reverse().map(([fx, fy]) => [(0.5 - fx) * D.w, (fy - 0.012) * D.h]), [D.w / 2, D.h]];
      return `polygon(${half.map(px).join(', ')})`;
    };
    const bg = (offX, offY) => `background:url(${GATE.src}) ${offX}px ${offY}px / ${IW}px ${IH}px no-repeat`;
    const leafHTML = side => {
      const lx = side === 'l' ? D.x : D.x + D.w / 2 - 1;
      return `<div class="leaf ${side}" style="left:${lx}px;top:${D.y}px;width:${D.w / 2 + 1}px;height:${D.h}px">
        <div class="leaf-face" style="${bg(gx - lx, gy - D.y)};clip-path:${leafClip(side)}"><i class="door-sheen"></i><i class="door-shade"></i></div>
        <div class="leaf-back" style="clip-path:${leafClip(side)}"></div><i class="door-edge"></i></div>`;
    };
    const doors = document.createElement('div');
    doors.className = 'intro-doors';
    // ring handles in the photo: a soft glow invites the knock
    const rings = [[0.331, 0.307], [0.659, 0.307]].map(([fx, fy]) => `<i class="ring-glow" style="left:${D.x + fx * D.w}px;top:${D.y + fy * D.h}px"></i>`).join('');
    doors.innerHTML = `
      <div class="door-rig">
        <div class="door-light" style="left:${D.x + D.w / 2}px;top:${D.y + D.h * 0.55}px"></div>
        <div class="door-rays" style="left:${D.x + D.w / 2}px;top:${D.y + D.h * 0.55}px"></div>
        <div class="gate-wall" style="${bg(gx, gy)};clip-path:${wallClip}"></div>
        <div class="gate-dusk" style="clip-path:${wallClip}"></div>
        <div class="gate-leaves">${leafHTML('l')}${leafHTML('r')}</div>
        ${rings}
        <div class="door-deco"></div>
      </div>
      <div class="door-bloom"></div>
      <p class="intro-enter" role="button" tabindex="0" style="top:${Math.min(H - 34, D.y + D.h + (small ? 34 : 46))}px">${matchMedia('(hover:hover)').matches ? 'Click' : 'Tap'} to enter</p>`;
    loader.appendChild(doors);
    doors.style.setProperty('--dw', D.w + 'px'); doors.style.setProperty('--dh', D.h + 'px');
    const rig = doors.querySelector('.door-rig'), deco = doors.querySelector('.door-deco');
    gsap.set(rig, { transformOrigin: `${D.x + D.w / 2}px ${D.y + D.h * 0.55}px` });
    let dust = null;
    if (KIT) {
      dust = KIT.dust(W, H);
      doors.insertBefore(dust.el, doors.querySelector('.door-bloom'));
    }
    // sound on/off
    const sb = document.createElement('button');
    sb.type = 'button'; sb.className = 'intro-sound';
    const label = () => { sb.textContent = Sound && Sound.on ? 'Sound on' : 'Sound off'; sb.setAttribute('aria-pressed', Sound && Sound.on ? 'true' : 'false'); };
    if (Sound) { label(); loader.appendChild(sb); sb.onclick = e => { e.stopPropagation(); Sound.toggle(); label(); }; }
    const fallOver = () => PET && window.KNKPetals.scatter(PET.variants(), small);

    const ensure = () => PET && PET.start();
    if (img.complete && img.naturalWidth) ensure(); else img.addEventListener('load', ensure, { once: true });

    const diyaEls = [];
    const pendants = [];
    tl.add(ensure, 0.05)
      // a gentle shower of real petals over the velvet, for the whole scene
      .fromTo(st, { g: 0 }, { g: 7, duration: 7, ease: 'none', onUpdate: draw }, 0.1)
      .to('.intro-glow', { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 0.6)
      // the gold logo glows in through the falling petals
      .fromTo('#introMark', { opacity: 0, scale: 0.96, filter: 'blur(12px) brightness(.4)' }, { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', duration: 2, ease: 'expo.out' }, 1.0)
      .fromTo('.mark-png-shine', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.6, ease: 'power1.inOut' }, 2.6)
      .fromTo('.mark-png-glint', { opacity: 0 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 3.1)
      .fromTo('.intro-mark', { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,210,140,0))' }, { filter: 'brightness(1.18) drop-shadow(0 0 22px rgba(255,205,130,.45))', duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 3.0)
      .to('.intro-foot', { opacity: 1, duration: 1 }, 3.0)
      .to(['.intro-foot', '.loader-bar'], { opacity: 0, duration: 0.4 }, 4.9)
      // a gust: the petals are swept away, the logo fades, and the doorway comes up behind
      .to('#introMark', { opacity: 0, scale: 1.04, filter: 'blur(6px)', duration: 0.9, ease: 'power2.in' }, 5.0)
      .to('.intro-glow', { opacity: 0, duration: 0.8 }, 5.0)
      .fromTo(st, { blow: 0 }, { blow: 1, duration: 1.7, ease: 'power1.in', onUpdate: draw }, 5.0)
      // the doorway comes up out of the dusk behind them
      .set(doors, { visibility: 'visible' }, 5.25)
      .fromTo(doors, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 5.25)
      .fromTo(rig, { scale: 1.12, filter: 'blur(8px)' }, { scale: 1, filter: 'blur(0px)', duration: 1.7, ease: 'power3.out' }, 5.25)
      .set('.intro-bg', { opacity: 0 }, 6.5)
      .add(() => loader.classList.add('doors-on'), 6.5)
      .add(() => PET && PET.destroy(), 6.8);
    // the diyas light one by one, left to right
    diyaEls.forEach((d, i) => {
      const at = 5.6 + i * 0.22;
      // each one is lit: it flares up, then settles into a steady flicker
      tl.add(() => d.classList.add('lit'), at + 0.6)
        .fromTo(d, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, at)
        .fromTo(d.querySelector('img'), { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: 0.6, ease: 'power2.out' }, at)
        .fromTo(d.querySelector('.d-pool'), { opacity: 0 }, { opacity: 1, duration: 0.7 }, at);
    });
    const WAIT = 6.9;
    tl.fromTo('.intro-enter', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, WAIT - 0.35);

    /* ---- wait at the closed doors until the visitor knocks ---- */
    let waiting = false, opened = false, heard = false, autoT;
    const open = withSound => {
      if (opened) return;
      opened = true; waiting = false; clearTimeout(autoT);
      loader.classList.remove('waiting');
      if (withSound && Sound && Sound.on) { heard = true; Sound.unlock(); Sound.knock(0); }
      gsap.to('.intro-enter', { opacity: 0, duration: 0.3 });
      // two knocks: the leaves jolt on their hinges
      gsap.to('.gate-leaves', { keyframes: [{ x: 1.5, duration: 0.04 }, { x: 0, duration: 0.08 }, { x: 0, duration: 0.12 }, { x: 1.5, duration: 0.04 }, { x: 0, duration: 0.08 }] });
      gsap.fromTo('.ring-glow', { scale: 1 }, { scale: 1.6, duration: 0.12, yoyo: true, repeat: 3 });
      gsap.delayedCall(0.6, () => tl.play());
    };
    if (!seen && !reduce) {
      tl.addPause(WAIT, () => {
        waiting = true; loader.classList.add('waiting');
        if (window.__introPrep && document.documentElement.classList.contains('is-loading')) window.__introPrep();
        // if nobody taps, open on our own after a while (no sound without a tap)
        autoT = setTimeout(() => open(false), 9000);
      });
    } else opened = true;
    loader.addEventListener('click', e => { if (waiting && !e.target.closest('.intro-skip, .intro-sound')) open(true); });
    addEventListener('keydown', e => { if (waiting && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(true); } });
    addEventListener('wheel', () => { if (waiting) open(false); }, { passive: true });

    /* ---- the doors open ---- */
    const A = WAIT + 0.05;
    tl.add(() => { if (heard && Sound) { Sound.bell(0.05, 392, 0.3, 6); Sound.drone(0.15); Sound.tinkle(0.45); } }, A)
      .to('.intro-skip', { opacity: 0, duration: 0.3 }, A)
      .to('.intro-enter', { opacity: 0, duration: 0.3 }, A)
      .to('.intro-sound', { opacity: 0, duration: 0.6 }, A + 1.6)
      .to('.ring-glow', { opacity: 0, duration: 0.3 }, A)
      .to('.leaf.l', { rotationY: 104, duration: 2.0, ease: 'power2.inOut' }, A + 0.1)
      .to('.leaf.r', { rotationY: -104, duration: 2.0, ease: 'power2.inOut' }, A + 0.1)
      .to('.gate-dusk', { opacity: 0.35, duration: 1.4, ease: 'power1.inOut' }, A + 0.3)
      .to(['.gate-wall', '.leaf-face'], { filter: 'brightness(.75) sepia(.35) saturate(1.3)', duration: 1.4 }, A + 0.3)
      .fromTo('.door-light', { opacity: 0 }, { opacity: 0.6, duration: 0.9, ease: 'power1.out' }, A + 0.12)
      .to('.door-light', { opacity: 0.25, duration: 1.2, ease: 'power1.inOut' }, A + 1.0)
      .fromTo('.door-rays', { opacity: 0, rotation: -4 }, { opacity: 0.25, rotation: 4, duration: 2.4, ease: 'sine.inOut' }, A + 0.12)
      .add(() => dust && dust.start(), A + 0.1)
      .fromTo('.door-dust', { opacity: 0 }, { opacity: 1, duration: 0.8 }, A + 0.2)
      .fromTo('.door-sheen', { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power1.inOut' }, A + 0.15)
      .fromTo('.door-shade', { opacity: 0 }, { opacity: 0.6, duration: 1.4, ease: 'power1.inOut' }, A + 0.3)
      .add(fallOver, A + 0.9)
      // the camera walks forward through the doorway
      .to(rig, { scale: () => Math.max(W / D.w, H / D.h) * 1.35, duration: 2.1, ease: 'power3.in' }, A + 0.6)
      .to(rig, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, A + 2.0)
      .to('.gate-dusk', { opacity: 0, duration: 0.6 }, A + 1.8)
      .to(['.door-light', '.door-rays', '.door-dust'], { opacity: 0, duration: 0.7 }, A + 2.2)
      .add(() => dust && dust.stop(), A + 3.0)
      .to({}, { duration: 0.1 }, A + 3.0);
    // the bells and leaves of the toran swing as the doors part
    pendants.forEach((p, i) => {
      const amp = rnd(10, 16) * (i % 2 ? 1 : -1);
      tl.to(p, { keyframes: [{ rotation: amp, duration: 0.35 }, { rotation: -amp * 0.6, duration: 0.45 }, { rotation: amp * 0.3, duration: 0.5 }, { rotation: 0, duration: 0.6 }], ease: 'sine.inOut', svgOrigin: `${p.dataset.x} 0` }, A + 0.15 + i * 0.03);
    });
    // doors mode reports "done" when the doors have actually opened
    // hand over to the homepage the moment we pass through the doorway (not after the tail of the timeline)
    tl.add(() => window.__introDone && window.__introDone(), A + 2.25);
    tl.eventCallback('onComplete', () => window.__introDone && window.__introDone());
    window.__introSkip = () => { clearTimeout(autoT); opened = true; waiting = false; loader.classList.remove('waiting'); if (dust) dust.stop(); };
  } else {
    /* ================= THE KANKANA THREAD ================= */
    const NS = 'http://www.w3.org/2000/svg';
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * (W < 700 ? 0.4 : 0.34);
    const k = R * 0.075; // knot size
    loader.style.setProperty('--ring', R + 'px');
    loader.style.setProperty('--cy', cy + 'px');

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'intro-thread');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <linearGradient id="thGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f7e3ad"/><stop offset=".4" stop-color="#d9ab5c"/><stop offset=".7" stop-color="#b07a34"/><stop offset="1" stop-color="#f1d08e"/>
        </linearGradient>
        <filter id="thGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="thSpark"><stop offset="0" stop-color="#fffdf4"/><stop offset=".35" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
      </defs>
      <g class="th-all">
        <g class="th-ring-g"><path class="th-path th-ring"/><path class="th-twist th-ring-twist"/></g>
        <g class="th-extra"><path class="th-path th-lead"/><path class="th-path th-knot"/><path class="th-path th-tail2"/>
          <circle class="th-bead b1" r="${k * 0.42}"/><circle class="th-bead b2" r="${k * 0.42}"/></g>
        <circle class="th-head" r="${k * 1.6}" fill="url(#thSpark)"/>
        <g class="th-glint-pos"><g class="th-glint"><circle r="${k * 2.2}" fill="url(#thSpark)"/><path d="M0 ${-k * 2.4} L${k * 0.22} 0 L0 ${k * 2.4} L${-k * 0.22} 0Z M${-k * 2.4} 0 L0 ${k * 0.22} L${k * 2.4} 0 L0 ${-k * 0.22}Z" fill="#fffaf0" opacity=".9"/></g></g>
      </g>`;
    loader.insertBefore(svg, markEl);
    const $s = sel => svg.querySelector(sel);
    const bx = cx, by = cy + R; // the knot sits at the bottom of the ring
    // the thread: drifts in from the left, loops once around (anticlockwise) back to the bottom…
    const leadD = `M ${-60} ${by + R * 0.42} C ${W * 0.16} ${by + R * 0.55}, ${cx - R * 1.25} ${by + R * 0.05}, ${bx} ${by}`;
    const ringD = `M ${bx} ${by} A ${R} ${R} 0 0 0 ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx} ${cy - R} A ${R} ${R} 0 0 0 ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${bx} ${by}`;
    // …ties a small knot, and two short ends hang down with a bead each
    const knotD = `M ${bx} ${by} c ${k * 1.3} ${k * 0.1}, ${k * 1.7} ${k * 1.7}, ${k * 0.3} ${k * 1.9} c ${-k * 1.5} ${k * 0.2}, ${-k * 1.6} ${-k * 1.6}, ${k * 0.1} ${-k * 1.3} c ${k * 1.1} ${k * 0.6}, ${k * 0.5} ${k * 2.2}, ${k * 1.2} ${k * 4.6}`;
    const tail2D = `M ${bx + k * 0.2} ${by + k * 1.4} c ${-k * 0.4} ${k * 1.2}, ${-k * 1.6} ${k * 1.8}, ${-k * 1.3} ${k * 3.9}`;
    $s('.th-lead').setAttribute('d', leadD);
    $s('.th-ring').setAttribute('d', ringD);
    $s('.th-ring-twist').setAttribute('d', ringD);
    $s('.th-knot').setAttribute('d', knotD);
    $s('.th-tail2').setAttribute('d', tail2D);
    const knotEnd = (() => { const p = $s('.th-knot'); const L = p.getTotalLength(); return p.getPointAtLength(L); })();
    const tailEnd = (() => { const p = $s('.th-tail2'); const L = p.getTotalLength(); return p.getPointAtLength(L); })();
    gsap.set('.th-bead.b1', { attr: { cx: knotEnd.x, cy: knotEnd.y + k * 0.35 } });
    gsap.set('.th-bead.b2', { attr: { cx: tailEnd.x, cy: tailEnd.y + k * 0.35 } });
    $s('.th-glint-pos').setAttribute('transform', `translate(${bx + k * 0.6} ${by + k * 0.9})`);
    gsap.set('.th-glint', { scale: 0, opacity: 0, svgOrigin: '0 0' });

    // draw one path after another, a bright spark riding the tip of the thread
    const head = $s('.th-head');
    const drawSeq = ['.th-lead', '.th-ring', '.th-knot', '.th-tail2'].map(sel => {
      const p = $s(sel), L = p.getTotalLength();
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = L;
      return { p, L };
    });
    const ride = (seg, prog) => { const pt = seg.p.getPointAtLength(seg.L * prog); head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y); };
    const times = [[0.3, 0.7, 'power1.in'], [1.0, 1.35, 'power1.inOut'], [2.35, 0.45, 'power2.out'], [2.6, 0.35, 'power2.out']];
    drawSeq.forEach((seg, i) => {
      const [at, dur, ease] = times[i], o = { v: 0 };
      tl.to(o, { v: 1, duration: dur, ease, onUpdate: () => { seg.p.style.strokeDashoffset = seg.L * (1 - o.v); if (i < 3) ride(seg, o.v); } }, at);
    });
    tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.3)
      .to(head, { opacity: 0, duration: 0.3 }, 2.7)
      .fromTo('.th-ring-twist', { opacity: 0 }, { opacity: 0.85, duration: 0.6 }, 2.2)
      .fromTo('.th-bead', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(3)' }, 2.85)
      // the knot pulls tight, then a glint flashes on it
      .fromTo('.th-knot', { scale: 1.25, svgOrigin: `${bx} ${by}` }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 2.75)
      .to('.th-glint', { scale: 1, opacity: 1, rotation: 45, duration: 0.35, ease: 'power2.out' }, 3.0)
      .to('.th-glint', { scale: 0, opacity: 0, rotation: 90, duration: 0.5, ease: 'power2.in' }, 3.35)
      // the logo forms inside the bangle
      .to('.intro-glow', { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' }, 2.2)
      .fromTo('#introMark', { opacity: 0, scale: 0.9, filter: 'blur(14px) brightness(.4)' }, { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', duration: 1.6, ease: 'expo.out' }, 2.6)
      .fromTo('.mark-png-shine', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.6, ease: 'power1.inOut' }, 3.4)
      .fromTo('.mark-png-glint', { opacity: 0 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 3.9)
      .to('.intro-foot', { opacity: 1, duration: 1 }, 3.4)
      // the ring becomes a camera iris: the logo lets go, the homepage shows through the bangle…
      .to(['.intro-foot', '.loader-bar', '.intro-skip'], { opacity: 0, duration: 0.4 }, 5.0)
      .to('#introMark', { opacity: 0, scale: 0.94, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in' }, 5.1)
      .to('.th-extra', { opacity: 0, duration: 0.45 }, 5.1)
      .to('.intro-glow', { opacity: 0, duration: 0.5 }, 5.1);
    const iris = { r: 0 };
    const ringG = $s('.th-ring-g');
    const setIris = () => {
      const m = iris.r <= 0 ? 'none' : `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.max(0, iris.r - 2)}px, #000 ${iris.r}px)`;
      loader.style.webkitMaskImage = loader.style.maskImage = m;
      const s = Math.max(1, iris.r / R);
      ringG.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
    };
    const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 40;
    tl.to(iris, { r: R, duration: 0.6, ease: 'power2.out', onUpdate: setIris }, 5.5)
      // …and the bangle widens until the whole homepage is in view
      .to(iris, { r: far, duration: 1.2, ease: 'power3.in', onUpdate: setIris }, 6.15)
      .to('.th-ring-g', { opacity: 0, duration: 0.45 }, 6.9)
      .to('.intro-bg', { scale: 1.08, duration: 1.2, ease: 'power2.in' }, 6.15)
      .to({}, { duration: 0.2 }, 7.35);
  }

  // keep shimmering gently if images are still loading
  const idle = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 })
    .fromTo('.mark-png-shine', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.6, ease: 'power2.inOut' })
    .fromTo('.ib2', { opacity: 0.85 }, { opacity: 0.35, duration: 1.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);

  window.__introTl = tl;
  if (reduce) tl.progress(1, true);
  else { tl.timeScale(seen ? 1.9 : 1.15).play(0); }
  let finish;
  window.__introReady = new Promise(res => {
    finish = res;
    if (MODE === 'doors' && !reduce) {
      // the doors wait for a tap, so finish when the timeline actually completes
      window.__introDone = res;
      setTimeout(res, 40000); // safety net
    } else {
      const dur = reduce ? 0.3 : tl.duration() / tl.timeScale() + 0.15;
      setTimeout(res, dur * 1000);
    }
  }).then(() => { if (!reduce && !loader.classList.contains('done') && MODE === 'mandap') idle.play(); });

  // skip straight to the end
  const skip = document.getElementById('introSkip');
  if (skip) skip.onclick = e => { e.stopPropagation(); if (window.__introSkip) window.__introSkip(); tl.progress(1, true); finish(); };

  // stop everything once the intro has faded out
  new MutationObserver((_, obs) => {
    if (loader.classList.contains('done')) { obs.disconnect(); setTimeout(() => { idle.kill(); tl.kill(); }, 1300); }
  }).observe(loader, { attributes: true, attributeFilter: ['class'] });
})();
