// scripts/experience.js — BrandFounder below-the-hero scroll experience
// Curtain reveals, word-by-word manifesto, counters, phone fans, gallery scrub.

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px)');

  /* ============================================================
     Hero aura (mouse-follow glow, preserved from previous build)
     ============================================================ */
  function initHeroAura() {
    const hero = document.querySelector('.hero-section');
    if (!hero || reduceMotion.matches) return;

    const aura = document.createElement('div');
    aura.className = 'hero-aura';
    hero.prepend(aura);

    let raf = null;
    window.addEventListener('mousemove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        aura.style.transform = `translate3d(${x * 18}px, ${y * 14}px, 0)`;
        raf = null;
      });
    }, { passive: true });
  }

  /* ============================================================
     Navbar active-section highlight
     ============================================================ */
  function initNavSpy() {
    const navAnchors = document.querySelectorAll('.navbar .nav-links li a[href^="#"]');
    const navSections = Array.from(navAnchors)
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    if (!('IntersectionObserver' in window) || !navSections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navAnchors.forEach((a) => {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.25, rootMargin: '-60px 0px -55% 0px' });

    navSections.forEach((s) => observer.observe(s));
  }

  /* ============================================================
     Squiggle underlines — draw when they enter the viewport
     ============================================================ */
  function initSquiggles() {
    const squiggles = document.querySelectorAll('.bf-squiggle');
    if (!squiggles.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      squiggles.forEach((s) => s.classList.add('is-drawn'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    squiggles.forEach((s) => {
      // Manifesto squiggles are synchronized with their word reveal below.
      if (!s.closest('[data-bf-manifesto]')) observer.observe(s);
    });
  }

  /* ============================================================
     Word splitting for the manifesto
     ============================================================ */
  function splitWords(container) {
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text.trim()) return;

        const fragment = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((piece) => {
          if (!piece) return;
          if (/^\s+$/.test(piece)) {
            fragment.appendChild(document.createTextNode(' '));
            return;
          }
          const span = document.createElement('span');
          span.className = 'bf-w';
          span.textContent = piece;
          fragment.appendChild(span);
        });
        node.replaceWith(fragment);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SVG' && node.tagName !== 'svg') {
        Array.from(node.childNodes).forEach(walk);
      }
    };

    Array.from(container.childNodes).forEach(walk);
    return Array.from(container.querySelectorAll('.bf-w'));
  }

  /* ============================================================
     01 · Manifesto — pinned word-by-word illumination
     ============================================================ */
  function initManifesto(gsapRef, ST) {
    const section = document.querySelector('[data-bf-manifesto]');
    if (!section) return;

    const lines = Array.from(section.querySelectorAll('[data-bf-words]'));
    const cards = Array.from(section.querySelectorAll('[data-bf-mcard]'));
    const squigglePath = section.querySelector('.bf-squiggle path');

    if (!gsapRef || !ST || reduceMotion.matches) return;

    const words = lines.flatMap((line) => splitWords(line));
    if (!words.length) return;

    gsapRef.set(words, { opacity: 0.13 });
    cards.forEach((card) => {
      const direction = card.dataset.side === 'right' ? 1 : -1;
      gsapRef.set(card, { x: direction * 110, y: 28, rotation: direction * 2.5, opacity: 0 });
    });
    if (squigglePath) gsapRef.set(squigglePath, { strokeDashoffset: 260 });

    const timeline = gsapRef.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=170%',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    timeline.to(words, {
      opacity: 1,
      stagger: { each: 0.6, ease: 'none' },
      duration: 8,
      ease: 'none',
    });

    if (squigglePath) {
      const squiggleWord = section.querySelector('.bf-squig-host .bf-w');
      const wordIndex = Math.max(0, words.indexOf(squiggleWord));
      timeline.to(squigglePath, {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: 'power2.out',
      }, wordIndex * 0.6);
    }

    timeline.to(cards, {
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      stagger: 0.65,
      duration: 4.2,
      ease: 'power3.out',
    }, '>-1');
  }

  /* ============================================================
     02 · Belief — curtain reveal
     ============================================================ */
  function initCurtain(gsapRef, ST) {
    const section = document.querySelector('[data-bf-curtain]');
    if (!section) return;

    const panel = section.querySelector('.bf-belief-panel');
    const items = Array.from(section.querySelectorAll('[data-bf-curtain-item]'));
    const giant = section.querySelector('.bf-serif-giant');

    if (!panel || !gsapRef || !ST || reduceMotion.matches) return;

    // Animate only numeric custom properties. Interpolating the complete
    // `inset(... round ...)` string makes Chromium briefly treat the radius as
    // a discrete value, which causes a visible rounded-to-square snap.
    gsapRef.set(panel, { '--bf-curtain-y': '32%', '--bf-curtain-x': '28%' });
    gsapRef.set(items, { opacity: 0, y: 34 });
    if (giant) gsapRef.set(giant, { scale: 0.86, opacity: 0.001 });

    const timeline = gsapRef.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=160%',
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
      },
    });

    timeline.to(panel, {
      '--bf-curtain-y': '0%',
      '--bf-curtain-x': '0%',
      duration: 6,
      ease: 'power2.inOut',
    });

    if (giant) {
      timeline.to(giant, { scale: 1, opacity: 1, duration: 4, ease: 'power2.out' }, 2.4);
    }

    timeline.to(items, {
      opacity: 1,
      y: 0,
      stagger: 1.1,
      duration: 3.2,
      ease: 'power2.out',
    }, 3.4);
  }

  /* ============================================================
     03 · Simple rise reveals (desires + generic)
     ============================================================ */
  function initRises(gsapRef, ST) {
    const risers = Array.from(document.querySelectorAll('[data-bf-rise]'));
    if (!risers.length) return;

    if (!gsapRef || !ST || reduceMotion.matches) return;

    risers.forEach((el, index) => {
      gsapRef.from(el, {
        y: 54,
        opacity: 0,
        duration: 0.9,
        delay: (index % 4) * 0.09,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          once: true,
        },
      });
    });
  }

  /* ============================================================
     03b · Desires — alternating particle assembly
     ============================================================ */
  function initDesires(gsapRef, ST) {
    const desires = Array.from(document.querySelectorAll('[data-bf-desire]'));
    if (!desires.length || !gsapRef || !ST || reduceMotion.matches) return;

    desires.forEach((item, itemIndex) => {
      const direction = item.dataset.side === 'right' ? 1 : -1;
      const word = item.querySelector('.bf-desire-word');
      const copy = item.querySelector('.bf-desire-copy p');
      const index = item.querySelector('.bf-desire-index');
      const field = item.querySelector('.bf-desire-particles');
      if (!word || !copy || !index || !field) return;

      const particles = Array.from({ length: 22 }, (_, particleIndex) => {
        const particle = document.createElement('i');
        const size = 2 + ((particleIndex * 7 + itemIndex * 3) % 6);
        particle.style.setProperty('--particle-size', `${size}px`);
        field.appendChild(particle);
        return particle;
      });

      gsapRef.set(item, { x: direction * 90, opacity: 0 });
      gsapRef.set([copy, index], { opacity: 0, y: 22 });
      gsapRef.set(word, {
        opacity: 0,
        filter: 'blur(12px)',
        clipPath: direction > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)',
      });
      particles.forEach((particle, particleIndex) => {
        const spread = 170 + ((particleIndex * 29) % 230);
        const vertical = ((particleIndex * 47) % 150) - 75;
        gsapRef.set(particle, {
          x: direction * spread,
          y: vertical,
          opacity: 0,
          scale: 0.4 + ((particleIndex % 5) * 0.18),
        });
      });

      const timeline = gsapRef.timeline({
        scrollTrigger: {
          trigger: item,
          start: 'top 78%',
          once: true,
        },
      });

      timeline.to(item, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
      timeline.to(particles, {
        x: () => gsapRef.utils.random(-30, 30),
        y: () => gsapRef.utils.random(-25, 25),
        opacity: () => gsapRef.utils.random(0.35, 0.9),
        scale: 1,
        duration: 1.05,
        stagger: { each: 0.018, from: direction > 0 ? 'end' : 'start' },
        ease: 'power3.out',
      }, 0.05);
      timeline.to(word, {
        opacity: 1,
        filter: 'blur(0px)',
        clipPath: 'inset(0 0% 0 0%)',
        duration: 0.9,
        ease: 'power2.out',
      }, 0.48);
      timeline.to([index, copy], {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power2.out',
      }, 0.62);
      timeline.to(particles, {
        x: direction * -45,
        opacity: 0,
        scale: 0.15,
        duration: 0.65,
        stagger: 0.012,
        ease: 'power2.in',
      }, 0.95);
    });
  }

  /* ============================================================
     04 · How it works — step sync + shot crossfade
     ============================================================ */
  function initHow(gsapRef, ST) {
    const section = document.querySelector('[data-bf-how]');
    if (!section) return;

    const steps = Array.from(section.querySelectorAll('[data-bf-step]'));
    const shots = Array.from(section.querySelectorAll('[data-bf-shot]'));
    const dots = Array.from(section.querySelectorAll('.bf-how-progress span'));

    const setStep = (step) => {
      steps.forEach((item) => {
        item.classList.toggle('is-active', Number(item.dataset.bfStep) === step);
      });
      shots.forEach((shot) => {
        shot.classList.toggle('is-active', Number(shot.dataset.bfShot) === step);
      });
      dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index + 1 === step);
      });
    };

    setStep(1);

    if (ST && !reduceMotion.matches) {
      steps.forEach((item) => {
        const step = Number(item.dataset.bfStep);
        ST.create({
          trigger: item,
          start: 'top 62%',
          end: 'bottom 40%',
          onEnter: () => setStep(step),
          onEnterBack: () => setStep(step),
        });
      });
      return;
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setStep(Number(entry.target.dataset.bfStep));
        });
      }, { rootMargin: '-40% 0px -40% 0px' });
      steps.forEach((item) => observer.observe(item));
    }
  }

  /* ============================================================
     05 · Showcase — phones fan open on scroll
     ============================================================ */
  function initShowcase(gsapRef, ST) {
    const section = document.querySelector('[data-bf-showcase]');
    if (!section || !gsapRef || !ST || reduceMotion.matches) return;

    const stage = section.querySelector('.bf-showcase-stage');
    const left = section.querySelector('.bf-phone--left');
    const centre = section.querySelector('.bf-phone--centre');
    const right = section.querySelector('.bf-phone--right');
    if (!stage || !left || !centre || !right) return;

    ST.matchMedia({
      '(min-width: 721px)': () => {
        gsapRef.set(left, { x: '46%', y: 56, rotate: 0, opacity: 0.4 });
        gsapRef.set(right, { x: '-46%', y: 56, rotate: 0, opacity: 0.4 });
        gsapRef.set(centre, { y: 90, scale: 0.94, opacity: 0.55 });

        const timeline = gsapRef.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 82%',
            end: 'center 46%',
            scrub: 0.7,
          },
        });

        timeline
          .to(centre, { y: 0, scale: 1, opacity: 1, ease: 'power2.out' }, 0)
          .to(left, { x: '0%', y: 26, rotate: -6.5, opacity: 1, ease: 'power2.out' }, 0.06)
          .to(right, { x: '0%', y: 26, rotate: 6.5, opacity: 1, ease: 'power2.out' }, 0.06);

        // gentle parallax drift after the fan settles
        gsapRef.to([left, right], {
          y: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'center 46%',
            end: 'bottom top',
            scrub: 1,
          },
        });
      },
      '(max-width: 720px)': () => {
        gsapRef.set([left, centre, right], { clearProps: 'all' });
      },
    });
  }

  /* ============================================================
     06 · Time rails — lines draw at two very different speeds
     ============================================================ */
  function initTimeRails(gsapRef, ST) {
    const section = document.querySelector('[data-bf-time]');
    if (!section) return;

    const rails = Array.from(section.querySelectorAll('[data-bf-rail]'));
    if (!rails.length) return;

    if (!gsapRef || !ST || reduceMotion.matches) {
      rails.forEach((rail) => {
        const line = rail.querySelector('.bf-rail-line span');
        if (line) line.style.transform = 'scaleX(1)';
      });
      return;
    }

    rails.forEach((rail) => {
      const line = rail.querySelector('.bf-rail-line span');
      const items = Array.from(rail.querySelectorAll('[data-bf-rail-item]'));
      const isSlow = rail.classList.contains('bf-rail--slow');

      gsapRef.set(items, { opacity: 0, y: 18 });

      const timeline = gsapRef.timeline({
        scrollTrigger: {
          trigger: rail,
          start: 'top 78%',
          once: true,
        },
      });

      if (line) {
        timeline.to(line, {
          scaleX: 1,
          duration: isSlow ? 3.2 : 1.05,
          ease: isSlow ? 'power1.inOut' : 'power3.out',
        }, 0);
      }

      timeline.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: isSlow ? 0.72 : 0.2,
        ease: 'power2.out',
      }, isSlow ? 0.4 : 0.12);
    });
  }

  /* ============================================================
     07 · Receipt — counting prices
     ============================================================ */
  function initReceipt(gsapRef, ST) {
    const receipt = document.querySelector('[data-bf-receipt]');
    if (!receipt) return;

    const counters = Array.from(receipt.querySelectorAll('[data-bf-count]'));
    const rows = Array.from(receipt.querySelectorAll('[data-bf-receipt-row]'));

    const finish = () => {
      counters.forEach((el) => {
        el.textContent = Number(el.dataset.bfCount).toLocaleString('en-GB');
      });
    };

    if (!gsapRef || !ST || reduceMotion.matches) {
      finish();
      return;
    }

    gsapRef.set(rows, { opacity: 0, y: 16 });

    const timeline = gsapRef.timeline({
      scrollTrigger: {
        trigger: receipt,
        start: 'top 74%',
        once: true,
      },
    });

    timeline.to(rows, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.16,
      ease: 'power2.out',
    }, 0);

    counters.forEach((el, index) => {
      const target = Number(el.dataset.bfCount);
      const proxy = { value: 0 };
      timeline.to(proxy, {
        value: target,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(proxy.value).toLocaleString('en-GB');
        },
      }, 0.18 + (index * 0.16));
    });
  }

  /* ============================================================
     10 · Gallery — pinned horizontal scrub on desktop
     ============================================================ */
  function initGallery(gsapRef, ST) {
    const section = document.querySelector('[data-bf-gallery]');
    if (!section || !gsapRef || !ST || reduceMotion.matches) return;

    const track = section.querySelector('.bf-gallery-track');
    if (!track) return;

    ST.matchMedia({
      '(min-width: 901px)': () => {
        section.classList.add('bf-gallery--pinned');

        const getDistance = () => Math.max(track.scrollWidth - window.innerWidth + 96, 0);

        const tween = gsapRef.to(track, {
          x: () => -getDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => '+=' + (getDistance() + window.innerHeight * 0.35),
            pin: true,
            scrub: 0.7,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        return () => {
          section.classList.remove('bf-gallery--pinned');
          tween.scrollTrigger?.kill();
          tween.kill();
          gsapRef.set(track, { clearProps: 'x' });
        };
      },
    });
  }

  /* ============================================================
     11 · Package tabs
     ============================================================ */
  function initPackTabs() {
    const tabs = Array.from(document.querySelectorAll('.bf-pack-tab'));
    const panels = Array.from(document.querySelectorAll('.bf-pack-panel'));
    if (!tabs.length || !panels.length) return;

    const gsapRef = window.gsap;

    const switchTab = (target) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.bfTab === target;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        const active = panel.id === 'bf-panel-' + target;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;

        if (active && gsapRef && !reduceMotion.matches) {
          gsapRef.fromTo(
            panel.querySelectorAll('.bf-pack-card, .bf-pack-desc'),
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', overwrite: true }
          );
        }
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.bfTab));
    });
  }

  /* ============================================================
     13 · FAQ — one open at a time
     ============================================================ */
  function initFaq() {
    const cards = Array.from(document.querySelectorAll('.bf-faq-card'));
    if (!cards.length) return;

    cards.forEach((card) => {
      card.addEventListener('toggle', () => {
        if (!card.open) return;
        cards.forEach((other) => {
          if (other !== card && other.open) other.open = false;
        });
      });
    });
  }

  /* ============================================================
     Boot
     ============================================================ */
  function init() {
    const gsapRef = window.gsap;
    const ST = window.ScrollTrigger;

    if (gsapRef && ST) {
      gsapRef.registerPlugin(ST);
    }

    initHeroAura();
    initNavSpy();
    initSquiggles();
    initManifesto(gsapRef, ST);
    initCurtain(gsapRef, ST);
    initDesires(gsapRef, ST);
    initRises(gsapRef, ST);
    initHow(gsapRef, ST);
    initShowcase(gsapRef, ST);
    initTimeRails(gsapRef, ST);
    initReceipt(gsapRef, ST);
    initGallery(gsapRef, ST);
    initPackTabs();
    initFaq();

    if (ST) {
      window.setTimeout(() => ST.refresh(), 240);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
