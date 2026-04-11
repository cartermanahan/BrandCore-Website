// scripts/home.js — BrandFounder Hero Particles

(function () {
  'use strict';

  function initHeroScrollScrub() {
    const section = document.querySelector('[data-scroll-scrub-section]');
    const canvas = section?.querySelector('[data-scroll-scrub-canvas]');
    const progressFill = section?.querySelector('[data-scroll-scrub-progress]');

    if (!section || !canvas) return;

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      section.classList.remove('has-scroll-scrub');
      section.style.setProperty('--hero-scrub-progress', '1');
      return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const frameCount = Number(canvas.dataset.frameCount || '1');
    const framePrefix = canvas.dataset.framePrefix || '';
    const frameExtension = canvas.dataset.frameExtension || '.jpg';
    let rafId = 0;
    let renderedProgress = 0;
    let targetProgress = 0;
    let currentFrameIndex = 0;
    let desiredFrameIndex = 0;
    let touchY = null;
    const frameUrls = Array.from({ length: frameCount }, (_, index) => {
      return `${framePrefix}${String(index + 1).padStart(3, '0')}${frameExtension}`;
    });
    const preloadedFrames = new Map();
    const loadedFrames = new Set();

    function setProgress(progress) {
      const safeProgress = clamp(progress, 0, 1);
      renderedProgress = safeProgress;
      section.style.setProperty('--hero-scrub-progress', safeProgress.toFixed(4));
      if (progressFill) {
        progressFill.style.transform = `scaleX(${Math.max(safeProgress, 0.02)})`;
      }
      return safeProgress;
    }

    function scrubTravel() {
      const viewportHeight = Math.max(window.innerHeight || 0, 1);
      return Math.max(viewportHeight * (window.innerWidth < 700 ? 3.2 : 3.9), 2100);
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(rect.width * ratio));
      const nextHeight = Math.max(1, Math.round(rect.height * ratio));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    }

    function drawCover(image) {
      resizeCanvas();
      const targetWidth = canvas.width;
      const targetHeight = canvas.height;
      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;

      if (!imageWidth || !imageHeight) return;

      const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
      const drawWidth = imageWidth * scale;
      const drawHeight = imageHeight * scale;
      const offsetX = (targetWidth - drawWidth) / 2;
      const offsetY = (targetHeight - drawHeight) / 2;

      context.clearRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    }

    function preloadFrames() {
      frameUrls.forEach((url, index) => {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.addEventListener('load', () => {
          loadedFrames.add(url);
          if (index === 0 && currentFrameIndex === 0) {
            drawCover(img);
          }
          if (desiredFrameIndex === index && currentFrameIndex !== desiredFrameIndex) {
            renderFrame(renderedProgress);
          }
        });
        img.src = url;
        if (img.complete) {
          loadedFrames.add(url);
        }
        preloadedFrames.set(url, img);
      });
    }

    function renderFrame(progress) {
      const frameIndex = Math.min(frameCount - 1, Math.round(progress * (frameCount - 1)));
      desiredFrameIndex = frameIndex;
      if (frameIndex === currentFrameIndex) return;

      const nextUrl = frameUrls[frameIndex];
      const nextImage = preloadedFrames.get(nextUrl);
      if (!loadedFrames.has(nextUrl) && !nextImage?.complete) return;

      currentFrameIndex = frameIndex;
      if (nextImage) {
        drawCover(nextImage);
      }
    }

    function animateTowardsTarget() {
      rafId = 0;

      const distance = targetProgress - renderedProgress;
      if (Math.abs(distance) < 0.0008) {
        const settled = setProgress(targetProgress);
        renderFrame(settled);
        return;
      }

      const nextProgress = renderedProgress + (distance * 0.12);
      const safeProgress = setProgress(nextProgress);
      renderFrame(safeProgress);
      rafId = window.requestAnimationFrame(animateTowardsTarget);
    }

    function requestRender() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(animateTowardsTarget);
    }

    function queueProgress(nextProgress) {
      targetProgress = clamp(nextProgress, 0, 1);
      requestRender();
    }

    function pageIsAtHeroTop() {
      return window.scrollY <= 6;
    }

    function shouldCapture(direction) {
      if (!pageIsAtHeroTop()) return false;
      if (direction > 0) return targetProgress < 0.999;
      if (direction < 0) return targetProgress > 0.001;
      return false;
    }

    function primeFrames() {
      resizeCanvas();
      currentFrameIndex = 0;
      desiredFrameIndex = 0;
      loadedFrames.add(frameUrls[0]);
      preloadFrames();
      queueProgress(targetProgress);
    }

    section.classList.add('has-scroll-scrub');
    setProgress(0);
    primeFrames();

    window.addEventListener('wheel', (event) => {
      const direction = event.deltaY > 0 ? 1 : -1;
      if (!shouldCapture(direction)) return;

      event.preventDefault();
      queueProgress(targetProgress + (event.deltaY / scrubTravel()));
    }, { passive: false });

    window.addEventListener('touchstart', (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    }, { passive: true });

    window.addEventListener('touchmove', (event) => {
      const currentY = event.touches[0]?.clientY;
      if (touchY == null || currentY == null) return;

      const deltaY = touchY - currentY;
      const direction = deltaY > 0 ? 1 : -1;
      if (!shouldCapture(direction)) {
        touchY = currentY;
        return;
      }

      event.preventDefault();
      queueProgress(targetProgress + (deltaY / scrubTravel()));
      touchY = currentY;
    }, { passive: false });

    window.addEventListener('touchend', () => {
      touchY = null;
    }, { passive: true });

    window.addEventListener('keydown', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') {
          return;
        }
      }

      let deltaY = 0;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ' || event.key === 'Spacebar') {
        deltaY = 120;
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        deltaY = -120;
      }

      if (!deltaY) return;

      const direction = deltaY > 0 ? 1 : -1;
      if (!shouldCapture(direction)) return;

      event.preventDefault();
      queueProgress(targetProgress + (deltaY / scrubTravel()));
    });

    window.addEventListener('resize', () => {
      resizeCanvas();
      const currentImage = preloadedFrames.get(frameUrls[currentFrameIndex]);
      if (currentImage?.complete) {
        drawCover(currentImage);
      }
      requestRender();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        requestRender();
      }
    });

    const handleReduceMotionChange = (event) => {
      if (event.matches) {
        section.classList.remove('has-scroll-scrub');
        section.style.setProperty('--hero-scrub-progress', '1');
      } else {
        section.classList.add('has-scroll-scrub');
        requestRender();
      }
    };

    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(handleReduceMotionChange);
    }
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHeroScrollScrub();
      initParticles();
    });
  } else {
    initHeroScrollScrub();
    initParticles();
  }

})();
