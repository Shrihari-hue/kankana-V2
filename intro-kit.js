/* ============================================================
   KANKANA — intro kit: sound (Web Audio, no files) and the doorway
   decorations (toran with bells, diyas, rangoli, dust in the light).
   Used by intro.js for the "doors" intro.
   ============================================================ */
window.KNKIntroKit = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------------- sound ----------------
     Everything is synthesised, so there are no audio files to load.
     Browsers only allow sound after a tap/click, so nothing plays until then. */
  const Sound = (() => {
    let ac, master, wet;
    let on = true;
    try { on = localStorage.getItem('knk_sound') !== '0'; } catch {}
    const ensure = () => {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.85; master.connect(ac.destination);
        // a soft hall reverb from a decaying noise impulse
        const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        const conv = ac.createConvolver(); conv.buffer = ir;
        wet = ac.createGain(); wet.gain.value = 0.35;
        wet.connect(conv).connect(master);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    };
    const out = (node, reverb = 0.5) => { node.connect(master); if (reverb) { const s = ac.createGain(); s.gain.value = reverb; node.connect(s).connect(wet); } };
    const knock = (delay = 0) => {
      if (!on || !ensure()) return;
      [0, 0.24].forEach(dt => {
        const t = ac.currentTime + delay + dt;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.13);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); out(g, 0.25); o.start(t); o.stop(t + 0.22);
        const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        n.buffer = b;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 1.4;
        const ng = ac.createGain(); ng.gain.value = 0.7;
        n.connect(f).connect(ng); out(ng, 0.2); n.start(t);
      });
    };
    // a temple bell: inharmonic partials, each with a slight beating pair
    const bell = (delay = 0, base = 392, vol = 0.32, dur = 5.5) => {
      if (!on || !ensure()) return;
      const t = ac.currentTime + delay;
      [[1, 1], [2.0, 0.55], [2.76, 0.42], [4.07, 0.28], [5.43, 0.18], [6.8, 0.1]].forEach(([m, a], i) => {
        [0, 1.8].forEach(det => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'sine'; o.frequency.value = base * m + det;
          const d = dur / Math.sqrt(i + 1);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a * 0.5, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g); out(g, 0.6); o.start(t); o.stop(t + d + 0.05);
        });
      });
    };
    const tinkle = (delay = 0) => { for (let i = 0; i < 7; i++) bell(delay + i * 0.11 + rnd(0, 0.08), rnd(1500, 2600), 0.05, 1.3); };
    // a warm drone (Sa–Pa–Sa) that swells as the doors open
    const drone = (delay = 0) => {
      if (!on || !ensure()) return;
      const t = ac.currentTime + delay;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.085, t + 1.6); g.gain.setValueAtTime(0.085, t + 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
      lp.connect(g); out(g, 0.7);
      [130.81, 196.0, 261.63, 261.63 * 1.003].forEach(fq => {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq;
        const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = rnd(4.5, 5.5); vg.gain.value = fq * 0.004; v.connect(vg).connect(o.frequency);
        o.connect(lp); o.start(t); v.start(t); o.stop(t + 6.2); v.stop(t + 6.2);
      });
    };
    // water lapping: soft filtered noise in slow, uneven swells (only after the visitor has tapped once)
    const water = () => {
      if (!on || !ac || ac.state !== 'running') return;
      const t = ac.currentTime, dur = 5;
      const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
      let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
      const n = ac.createBufferSource(); n.buffer = b;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const bp = ac.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 420; bp.gain.value = 6;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
      [[0.4, 0.09], [1.1, 0.03], [1.8, 0.11], [2.6, 0.04], [3.3, 0.08], [4.2, 0.02], [4.9, 0.0001]].forEach(([dt, v]) => g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + dt));
      n.connect(lp).connect(bp).connect(g); out(g, 0.5); n.start(t); n.stop(t + dur);
    };
    return {
      water,
      get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem('knk_sound', on ? '1' : '0'); } catch {} if (on) ensure(); return on; },
      unlock: ensure, knock, bell, tinkle, drone
    };
  })();

  /* ---------------- toran: marigold swags, mango leaves and brass bells ---------------- */
  const toran = (W, H) => {
    const small = W < 700;
    const N = small ? 4 : 8, top = 0, depth = Math.min(H * 0.085, small ? 46 : 70), fr = small ? 7 : 9.5;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'toran'); svg.setAttribute('viewBox', `0 0 ${W} ${depth + fr * 18}`);
    svg.setAttribute('aria-hidden', 'true');
    let html = `<defs>
      <radialGradient id="mgY" cx=".4" cy=".35"><stop offset="0" stop-color="#ffe680"/><stop offset=".55" stop-color="#f7b500"/><stop offset="1" stop-color="#c77400"/></radialGradient>
      <radialGradient id="mgO" cx=".4" cy=".35"><stop offset="0" stop-color="#ffc06b"/><stop offset=".55" stop-color="#f07d0e"/><stop offset="1" stop-color="#a84300"/></radialGradient>
      <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f9a2c"/><stop offset="1" stop-color="#244f12"/></linearGradient>
      <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e4614"/><stop offset=".35" stop-color="#f3d38c"/><stop offset=".6" stop-color="#c08a3c"/><stop offset="1" stop-color="#5a3810"/></linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${fr * 0.9}" fill="#3b0a12"/><rect x="0" y="${fr * 0.9}" width="${W}" height="1.2" fill="#c99a4e" opacity=".7"/>`;
    const flower = (x, y, k) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fr}" fill="url(#${k % 3 ? 'mgO' : 'mgY'})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fr * 0.32}" fill="#7a3a00" opacity=".55"/>`;
    // swags
    let k = 0;
    for (let i = 0; i < N; i++) {
      const x0 = (i / N) * W, x1 = ((i + 1) / N) * W, cxp = (x0 + x1) / 2, cyp = top + depth * 2;
      const steps = Math.ceil((x1 - x0) / (fr * 1.45));
      for (let s = 0; s <= steps; s++) {
        const u = s / steps, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cxp + u * u * x1, y = (1 - u) * (1 - u) * (fr) + 2 * (1 - u) * u * cyp + u * u * fr;
        html += flower(x, y, k++);
      }
    }
    // pendants at each joint: a short string of flowers, mango leaves, and a bell on every other one
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const hasBell = i % 2 === 1;
      let p = `<g class="pend" data-x="${x}"><g class="pend-in" style="transform-origin:${x}px ${fr}px">`;
      for (let s = 1; s <= 3; s++) p += flower(x, fr + s * fr * 1.7, k++);
      const ly = fr + 4 * fr * 1.7;
      [-0.5, 0, 0.5].forEach(a => { p += `<path d="M ${x} ${ly} q ${fr * 0.9} ${fr * 1.6} 0 ${fr * 4.2} q ${-fr * 0.9} ${-fr * 2.6} 0 ${-fr * 4.2}Z" fill="url(#lf)" transform="rotate(${a * 32} ${x} ${ly})"/>`; });
      if (hasBell) {
        const by = ly + fr * 4.6;
        p += `<line x1="${x}" y1="${ly}" x2="${x}" y2="${by}" stroke="#c99a4e" stroke-width="1"/>
          <path class="bell" d="M ${x - fr * 1.05} ${by + fr * 2} q 0 ${-fr * 2.2} ${fr * 1.05} ${-fr * 2.2} q ${fr * 1.05} 0 ${fr * 1.05} ${fr * 2.2} l ${fr * 0.25} ${fr * 0.35} h ${-fr * 2.6}Z" fill="url(#brass)"/>
          <circle cx="${x}" cy="${by + fr * 2.65}" r="${fr * 0.32}" fill="#8a5a1c"/>`;
      }
      p += '</g></g>';
      html += p;
    }
    svg.innerHTML = html;
    return svg;
  };

  /* ---------------- diyas along the threshold ---------------- */
  const diyas = (W) => {
    const small = W < 700, n = small ? 5 : 9;
    const wrap = document.createElement('div'); wrap.className = 'diyas';
    for (let i = 0; i < n; i++) {
      wrap.insertAdjacentHTML('beforeend', `<div class="diya"><i class="d-glow"></i><svg viewBox="0 0 60 50" aria-hidden="true">
        <defs><radialGradient id="fl${i}" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffd36a"/><stop offset=".75" stop-color="#ff8a1c"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
        <linearGradient id="cl${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8582c"/><stop offset="1" stop-color="#5c2210"/></linearGradient></defs>
        <path class="flame" d="M30 6 C 35 16 38 22 34 29 C 32 32 28 32 26 29 C 22 22 25 16 30 6Z" fill="url(#fl${i})"/>
        <path d="M4 30 Q 30 54 56 30 Q 44 34 30 34 Q 16 34 4 30Z" fill="url(#cl${i})"/>
        <path d="M4 30 Q 30 36 56 30" fill="none" stroke="#e8b56a" stroke-width="1.6" opacity=".9"/>
      </svg></div>`);
    }
    return wrap;
  };

  /* ---------------- rangoli on the floor ---------------- */
  const rangoli = () => {
    const cols = ['#e2275a', '#f39c12', '#fdfcf8', '#2bb673', '#3b6fe0', '#f7d148'];
    let g = '';
    const ring = (n, r, len, w, col, rot = 0) => { for (let i = 0; i < n; i++) { const a = (i / n) * 360 + rot; g += `<ellipse cx="0" cy="${-r}" rx="${w}" ry="${len}" fill="${col}" transform="rotate(${a})"/>`; } };
    g += `<circle r="98" fill="none" stroke="${cols[2]}" stroke-width="3" stroke-dasharray="2 6"/>`;
    ring(24, 82, 13, 6, cols[0]); ring(24, 82, 8, 3.5, cols[5], 7.5);
    ring(16, 60, 14, 7, cols[1]); ring(16, 60, 8, 3, cols[2], 11.25);
    ring(12, 38, 12, 6, cols[3]); ring(8, 20, 10, 5, cols[4], 22.5);
    g += `<circle r="8" fill="${cols[5]}"/><circle r="3.5" fill="${cols[0]}"/>`;
    const el = document.createElement('div'); el.className = 'rangoli';
    el.innerHTML = `<svg viewBox="-104 -104 208 208" aria-hidden="true"><g>${g}</g></svg>`;
    return el;
  };

  /* ---------------- dust specks drifting in the beam ---------------- */
  const dust = (W, H) => {
    const cv = document.createElement('canvas'); cv.className = 'door-dust';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const P = Array.from({ length: W < 700 ? 70 : 140 }, () => ({ x: W / 2 + rnd(-0.22, 0.22) * W, y: rnd(0, H), r: rnd(0.6, 2.1), vx: rnd(-0.12, 0.12), vy: rnd(-0.25, -0.05), a: rnd(0.25, 0.9), ph: rnd(0, 6.28) }));
    let run = false, raf;
    const step = t => {
      g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.x += p.vx + Math.sin(t / 900 + p.ph) * 0.15; p.y += p.vy; if (p.y < -5) { p.y = H + 5; p.x = W / 2 + rnd(-0.22, 0.22) * W; }
        g.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 500 + p.ph));
        g.fillStyle = '#fff1cf'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      if (run) raf = requestAnimationFrame(step);
    };
    return { el: cv, start() { if (!run) { run = true; raf = requestAnimationFrame(step); } }, stop() { run = false; cancelAnimationFrame(raf); } };
  };

  return { Sound, toran, diyas, rangoli, dust };
})();
