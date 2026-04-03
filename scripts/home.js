// scripts/home.js — BrandFounder Hero Particles

(function () {
  'use strict';

  function initParticles() {
    if (typeof THREE === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'hero-canvas';
    hero.prepend(canvas);

    const getSize = () => ({ w: hero.offsetWidth, h: hero.offsetHeight });
    let { w, h } = getSize();

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 100);
    camera.position.z = 6;

    const COUNT = window.innerWidth < 768 ? 320 : 720;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    const palette = [
      [0.388, 0.400, 0.945],
      [0.647, 0.706, 0.988],
      [0.753, 0.518, 0.988],
      [0.980, 0.980, 1.000],
      [0.388, 0.400, 0.945],
      [0.388, 0.400, 0.945],
    ];

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3]     = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const sprite = new THREE.TextureLoader().load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/sprites/disc.png'
    );

    const mat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      map: sprite,
      alphaTest: 0.2,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let mx = 0, my = 0, tx = 0, ty = 0;

    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    window.addEventListener('resize', () => {
      const s = getSize();
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h);
    });

    (function tick() {
      requestAnimationFrame(tick);
      tx += (mx - tx) * 0.032;
      ty += (my - ty) * 0.032;
      points.rotation.y  =  tx * 0.2;
      points.rotation.x  =  ty * 0.13;
      points.rotation.z += 0.0004;
      renderer.render(scene, camera);
    })();
  }

  // ── Logo stage: floating cards + ambient canvas glow ──────────────────
  function initLogoStage() {
    const stage = document.querySelector('.logos-stage');
    if (!stage) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cards = Array.from(stage.querySelectorAll('[data-lc]'));
    const W = () => stage.offsetWidth;
    const H = () => stage.offsetHeight;
    const CARD_W = 136, CARD_H = 152; // approx card size incl name

    // Spread cards evenly across stage with safe margins
    // Each card gets an independent Lissajous-style orbit
    // Scatter base positions with minimum distance enforcement
    const margin = 12;
    const minDist = CARD_W * 1.1;
    const placed = [];
    const agents = cards.map((card, i) => {
      let bx, by;
      let attempts = 0;
      do {
        bx = margin / W() + Math.random() * (1 - (margin * 2 + CARD_W) / W());
        by = margin / H() + Math.random() * (1 - (margin * 2 + CARD_H) / H());
        attempts++;
      } while (
        attempts < 200 &&
        placed.some(p => {
          const dx = (bx - p.bx) * W(), dy = (by - p.by) * H();
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        })
      );
      placed.push({ bx, by });
      // unique orbit params — different freq ratio = Lissajous figure
      const ax = 18 + Math.random() * 14;   // x amplitude px
      const ay = 12 + Math.random() * 10;   // y amplitude px
      const fx = 0.00028 + i * 0.000031;    // x freq
      const fy = 0.00021 + i * 0.000027;    // y freq
      const px = Math.random() * Math.PI * 2; // phase x
      const py = Math.random() * Math.PI * 2; // phase y
      return { card, bx, by, ax, ay, fx, fy, px, py };
    });

    // Canvas ambient orbs
    const canvas = stage.querySelector('.logos-stage-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width  = stage.offsetWidth;
      canvas.height = stage.offsetHeight;
    }
    resizeCanvas();

    // Orb data — big slow moving glows
    const orbs = [
      { x: 0.25, y: 0.4, r: 0.38, hue: 240 },
      { x: 0.72, y: 0.55, r: 0.32, hue: 270 },
      { x: 0.5,  y: 0.2,  r: 0.26, hue: 220 },
    ];

    function drawOrbs(t) {
      if (!ctx) return;
      const cw = canvas.width, ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      orbs.forEach((o, i) => {
        const drift = Math.sin(t * 0.00018 + i * 1.3) * 0.07;
        const cx = (o.x + drift) * cw;
        const cy = (o.y + Math.cos(t * 0.00014 + i) * 0.05) * ch;
        const r  = o.r * Math.min(cw, ch);
        const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0,   `hsla(${o.hue},80%,62%,0.13)`);
        g.addColorStop(0.5, `hsla(${o.hue},70%,52%,0.06)`);
        g.addColorStop(1,   `hsla(${o.hue},60%,40%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function tick(t) {
      requestAnimationFrame(tick);
      const stageW = W(), stageH = H();

      agents.forEach(({ card, bx, by, ax, ay, fx, fy, px, py }) => {
        const ox = Math.sin(t * fx + px) * ax;
        const oy = Math.sin(t * fy + py) * ay;

        let x = bx * stageW + ox - CARD_W / 2;
        let y = by * stageH + oy - CARD_H / 2;

        // clamp to stage bounds
        x = Math.max(margin, Math.min(stageW - CARD_W - margin, x));
        y = Math.max(margin, Math.min(stageH - CARD_H - margin, y));

        card.style.transform = `translate(${x}px,${y}px)`;
      });

      drawOrbs(t);
    }

    if (reduced) {
      // Just place statically
      agents.forEach(({ card, bx, by }) => {
        const x = bx * W() - CARD_W / 2;
        const y = by * H() - CARD_H / 2;
        card.style.transform = `translate(${x}px,${y}px)`;
      });
    } else {
      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initParticles(); initLogoStage(); });
  } else {
    initParticles();
    initLogoStage();
  }

})();