/* ============================================================
   KANKANA — real rose petals for the intro
   Photographed petals (assets/img/petals/) tumble in 3D, land on the K with
   a shadow on the velvet, turn to gold from the bottom up, and later break
   away in a gust of wind. Drawn on one canvas, driven by the intro timeline.
   ============================================================ */
window.KNKPetals = (() => {
  const SRC = ['assets/img/petals/petal0.png', 'assets/img/petals/petal1.png', 'assets/img/petals/petal2.png', 'assets/img/petals/petal3.png'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease3 = u => 1 - Math.pow(1 - u, 3);

  const load = () => Promise.all(SRC.map(src => new Promise(res => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  }))).then(list => list.filter(Boolean));

  // pre-rendered variants of each photo: shaded (petal turned away from the light),
  // normal, lit, gold, and a soft blurred copy for the out-of-focus foreground
  const variants = im => {
    const S = 96, w = S, h = Math.round(S * im.height / im.width);
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const base = mk(); base.getContext('2d').drawImage(im, 0, 0, w, h);
    const tone = (k, gold) => {
      const c = mk(), g = c.getContext('2d'); g.drawImage(base, 0, 0);
      const d = g.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (gold) {
          const l = (p[i] * 0.6 + p[i + 1] * 0.3 + p[i + 2] * 0.1) / 255;
          const t = clamp(l * 1.9);
          p[i] = 105 + 125 * t; p[i + 1] = 62 + 112 * t; p[i + 2] = 22 + 52 * t * t;
        } else { p[i] = Math.min(255, p[i] * k); p[i + 1] = Math.min(255, p[i + 1] * k); p[i + 2] = Math.min(255, p[i + 2] * k); }
      }
      g.putImageData(d, 0, 0); return c;
    };
    const blur = (() => { // downscale then upscale: a soft focus that works in every browser
      const t = document.createElement('canvas'); t.width = 14; t.height = Math.max(4, Math.round(14 * h / w));
      const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(base, 0, 0, t.width, t.height);
      const c = mk(), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.globalAlpha = 0.9; g.drawImage(t, 0, 0, w, h); return c;
    })();
    return { dark: tone(0.55), mid: base, lit: tone(1.22), gold: tone(0, true), blur, ar: h / w };
  };

  /* targets along the three strokes of the K (the upright, the arm and the leg),
     measured from the logo, so the petals spell a K you can read */
  const STROKES = [
    // [x1, y1, x2, y2, thickness] as fractions of the logo box
    [0.215, 0.05, 0.215, 0.715, 0.105],   // upright
    [0.10, 0.045, 0.30, 0.045, 0.05],     // top serif of the upright
    [0.14, 0.715, 0.30, 0.715, 0.05],     // foot of the upright
    [0.82, 0.14, 0.50, 0.44, 0.07],       // arm
    [0.70, 0.13, 0.88, 0.13, 0.045],      // arm serif
    [0.52, 0.45, 0.90, 0.70, 0.075]       // leg
  ];
  const targets = (markEl, imgEl, count) => {
    const r = markEl.getBoundingClientRect();
    const lens = STROKES.map(([x1, y1, x2, y2]) => Math.hypot((x2 - x1) * r.width, (y2 - y1) * r.height));
    const tot = lens.reduce((a, b) => a + b, 0);
    const out = [];
    for (let i = 0; i < count; i++) {
      // pick a stroke in proportion to its length, then a point inside it
      let k = Math.random() * tot, j = 0; while (k > lens[j] && j < lens.length - 1) k -= lens[j++];
      const [x1, y1, x2, y2, th] = STROKES[j], t = Math.random();
      const px = (x1 + (x2 - x1) * t) * r.width, py = (y1 + (y2 - y1) * t) * r.height;
      const nx = -(y2 - y1) * r.height, ny = (x2 - x1) * r.width, nl = Math.hypot(nx, ny) || 1;
      const off = (Math.random() - 0.5) * th * r.width;
      const x = r.left + px + nx / nl * off, y = r.top + py + ny / nl * off;
      out.push({ x, y, ny: clamp((y - r.top) / (r.height * 0.75)) });
    }
    return out;
  };

  function create({ loader, before, markEl, imgEl, small }) {
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas'); cv.className = 'intro-petals';
    cv.width = W * dpr; cv.height = H * dpr; loader.insertBefore(cv, before);
    const fg = document.createElement('canvas'); fg.className = 'intro-petals intro-petals-fg';
    fg.width = W * dpr; fg.height = H * dpr; loader.appendChild(fg);
    const ctx = cv.getContext('2d'), fctx = fg.getContext('2d');
    ctx.scale(dpr, dpr); fctx.scale(dpr, dpr);

    const state = { g: 0, gold: 0, a: 1, blow: 0, fgA: 1 };
    let V = [], P = [], F = [], ready = false;

    // the wind from the pointer stirs petals that are still falling
    const wind = { x: -1e4, y: -1e4, vx: 0, vy: 0 };
    const onMove = e => { const t = e.touches ? e.touches[0] : e; wind.vx = t.clientX - (wind.x < -1e3 ? t.clientX : wind.x); wind.vy = t.clientY - (wind.y < -1e3 ? t.clientY : wind.y); wind.x = t.clientX; wind.y = t.clientY; };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('touchmove', onMove, { passive: true });

    /* a gentle shower: a few dozen large petals drifting down and tumbling, the way
       they do over the homepage; state.g is the time in seconds */
    const build = () => {
      const N = small ? 24 : 42;
      P = Array.from({ length: N }, (_, i) => ({
        v: V[i % V.length], x0: rnd(-0.05, 1.05) * W, y0: rnd(-0.2, 1.0) * H,
        vy: rnd(0.11, 0.2) * H, drift: rnd(-14, 22), amp: rnd(14, 46), fr: rnd(0.5, 1.2), ph: rnd(0, 6.28),
        s: (small ? 22 : 30) * rnd(0.85, 1.6), rz: rnd(0, 6.28), vr: rnd(-0.9, 0.9), wa: rnd(1.2, 3.2), wb: rnd(0.8, 2.4),
        delay: rnd(0, 1.6), ox: 0, oy: 0, bx: rnd(0.7, 1.5), by: rnd(-0.7, 0.15), bspin: rnd(-8, 8)
      }));
      // big, close, out-of-focus petals that drift past the camera
      F = Array.from({ length: small ? 3 : 5 }, (_, i) => ({
        v: V[i % V.length], x0: rnd(0, 1) * W, d: rnd(0, 3.5), dur: rnd(3.2, 4.4), dx: rnd(-0.2, 0.2) * W,
        s: (small ? 70 : 110) * rnd(0.8, 1.3), rz: rnd(0, 6.28), sp: rnd(-2, 2), ax: rnd(3, 6), ay: rnd(2, 5)
      }));
      ready = true;
    };

    const drawPetal = (g, p, x, y, rz, cx, cy, alpha) => {
      const sx = Math.abs(cx) < 0.07 ? 0.07 : cx, sy = Math.abs(cy) < 0.07 ? 0.07 : cy;
      const face = Math.abs(cx * cy);
      const spr = face > 0.7 ? p.v.lit : face > 0.35 ? p.v.mid : p.v.dark;
      const w = p.s, h = p.s * p.v.ar;
      g.save(); g.translate(x, y); g.rotate(rz); g.scale(sx, sy);
      g.globalAlpha = alpha; g.drawImage(spr, -w / 2, -h / 2, w, h); g.restore();
    };

    const draw = () => {
      if (!ready) return;
      ctx.clearRect(0, 0, W, H); fctx.clearRect(0, 0, W, H);
      const t = state.g, A = state.a, span = H * 1.3;
      if (A > 0) {
        const wv = Math.min(60, Math.hypot(wind.vx, wind.vy));
        for (const p of P) {
          const tt = Math.max(0, t - p.delay);
          let y = ((p.y0 + tt * p.vy + H * 0.15) % span) - H * 0.15;
          let x = p.x0 + Math.sin(tt * p.fr + p.ph) * p.amp + tt * p.drift;
          // the pointer stirs them like a breeze
          if (wv > 1) { const d = Math.hypot(x + p.ox - wind.x, y + p.oy - wind.y); if (d < 150) { const f = (1 - d / 150) * 0.45; p.ox += wind.vx * f; p.oy += wind.vy * f; } }
          p.ox *= 0.95; p.oy *= 0.95; x += p.ox; y += p.oy;
          let rz = p.rz + tt * p.vr, rx = tt * p.wa + p.ph, ry = tt * p.wb;
          let alpha = clamp(t / 0.8);                     // fade in at the very start
          if (state.blow > 0) {                          // the gust carries them off
            const b = clamp((state.blow - (1 - y / H) * 0.25) / 0.75), bb = b * b;
            x += bb * W * 1.0 * p.bx; y += bb * H * 0.6 * p.by; rz += bb * p.bspin; rx += b * 8; ry += b * 5;
            alpha *= 1 - clamp((b - 0.6) / 0.4);
          }
          drawPetal(ctx, p, x, y, rz, Math.cos(rx), Math.cos(ry), alpha * A);
        }
        wind.vx *= 0.8; wind.vy *= 0.8;
      }
      if (state.fgA > 0) for (const f of F) {
        const u = clamp((t - f.d) / f.dur); if (u <= 0 || u >= 1) continue;
        const x = f.x0 + f.dx * u + Math.sin(u * 5 + f.rz) * 40, y = -0.2 * H + 1.45 * H * u;
        const cx = Math.cos(u * f.ax), cy = Math.cos(u * f.ay), w = f.s, h = f.s * f.v.ar;
        fctx.save(); fctx.translate(x, y); fctx.rotate(f.rz + u * f.sp); fctx.scale(Math.abs(cx) < 0.1 ? 0.1 : cx, Math.abs(cy) < 0.1 ? 0.1 : cy);
        fctx.globalAlpha = 0.75 * state.fgA * Math.sin(u * Math.PI) * (1 - state.blow); fctx.drawImage(f.v.blur, -w / 2, -h / 2, w, h); fctx.restore();
      }
    };

    const ready$ = load().then(ims => { V = ims.map(variants); });
    return {
      state, draw, canvas: cv,
      start() { return ready$.then(() => { if (!ready) build(); draw(); }); },
      variants: () => V,
      destroy() { removeEventListener('pointermove', onMove); removeEventListener('touchmove', onMove); cv.remove(); fg.remove(); }
    };
  }

  /* a few real petals scatter over the homepage after the doors open */
  function scatter(V, small) {
    if (!V || !V.length) return;
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const c = document.createElement('canvas'); c.className = 'petal-fall';
    c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const list = Array.from({ length: small ? 22 : 38 }, (_, i) => {
      const a = rnd(0, Math.PI * 2), sp = rnd(4, 13);
      return { v: V[i % V.length], x: W / 2 + rnd(-40, 40), y: H * 0.45 + rnd(-60, 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, s: rnd(small ? 18 : 24, small ? 30 : 40), r: rnd(0, 6), vr: rnd(-0.1, 0.1), ax: rnd(2, 5), ay: rnd(1.5, 4) };
    });
    const t0 = performance.now();
    const step = now => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, W, H);
      const fade = clamp(4.4 - t);
      for (const p of list) {
        p.vx *= 0.965; p.vy = p.vy * 0.965 + 0.16; p.x += p.vx + Math.sin(t * 2 + p.r) * 0.6; p.y += p.vy; p.r += p.vr;
        const cx = Math.cos(t * p.ax + p.r), cy = Math.cos(t * p.ay), face = Math.abs(cx * cy);
        const spr = face > 0.7 ? p.v.lit : face > 0.35 ? p.v.mid : p.v.dark, w = p.s, h = p.s * p.v.ar;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(Math.abs(cx) < 0.08 ? 0.08 : cx, Math.abs(cy) < 0.08 ? 0.08 : cy);
        g.globalAlpha = fade; g.drawImage(spr, -w / 2, -h / 2, w, h); g.restore();
      }
      if (t < 4.5) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
  }

  return { create, scatter };
})();
