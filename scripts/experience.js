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
      gsapRef.set(card, { x: direction * 170, y: 42, rotation: direction * 2.5, opacity: 0 });
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
        invalidateOnRefresh: true,
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
        invalidateOnRefresh: true,
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

    risers.forEach((el) => {
      gsapRef.fromTo(el,
        { y: 54, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'top 70%',
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
        }
      );
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
          end: 'center 42%',
          scrub: 0.5,
          invalidateOnRefresh: true,
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
     04 · How it works — illuminated journey
     ============================================================ */
  function initHow(gsapRef, ST) {
    const section = document.querySelector('[data-bf-how]');
    if (!section) return;

    const steps = Array.from(section.querySelectorAll('[data-bf-step]'));
    const journey = section.querySelector('.bf-how-journey');
    const line = section.querySelector('[data-bf-how-line]');
    const handoffPath = section.querySelector('[data-bf-handoff-path]');
    const handoffCore = section.querySelector('[data-bf-handoff-core]');

    const setStep = (step) => {
      steps.forEach((item) => {
        const itemStep = Number(item.dataset.bfStep);
        item.classList.toggle('is-active', itemStep === step);
        item.classList.toggle('is-complete', itemStep < step);
      });
    };

    window.BrandFounderSetHowStep = setStep;

    if (gsapRef && ST && !reduceMotion.matches) {
      setStep(0);

      if (journey && line && handoffPath && handoffCore) {
        const handoffLength = handoffPath.getTotalLength();
        gsapRef.set(line, { scaleY: 0 });
        gsapRef.set(handoffPath, { strokeDasharray: handoffLength, strokeDashoffset: handoffLength });
        gsapRef.set(handoffCore, { opacity: 0, scale: 0.35 });

        const unifiedLine = gsapRef.timeline({
          scrollTrigger: {
            trigger: journey,
            start: 'top 62%',
            end: 'bottom 54%',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });

        unifiedLine.to(line, { scaleY: 1, duration: 0.8, ease: 'none' });
        unifiedLine.to(handoffPath, { strokeDashoffset: 0, duration: 0.2, ease: 'none' });
        unifiedLine.to(handoffCore, { opacity: 1, scale: 1, duration: 0.05, ease: 'power2.out' }, 0.95);
      }

      steps.forEach((item) => {
        const step = Number(item.dataset.bfStep);
        ST.create({
          trigger: item,
          start: 'center 60%',
          end: 'center 38%',
          onEnter: () => setStep(step),
          onEnterBack: () => setStep(step),
          onLeaveBack: () => setStep(Math.max(0, step - 1)),
        });
      });
      return;
    }

    setStep(1);

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
    const satellites = Array.from(section.querySelectorAll('[data-bf-showcase-satellite]'));
    if (!stage || !left || !centre || !right) return;

    ST.matchMedia({
      '(min-width: 721px)': () => {
        gsapRef.set(left, { x: '46%', y: 56, rotate: 0, opacity: 0.4 });
        gsapRef.set(right, { x: '-46%', y: 56, rotate: 0, opacity: 0.4 });
        gsapRef.set(centre, { y: 90, scale: 0.94, opacity: 0.55 });
        if (satellites.length) {
          gsapRef.set(satellites, { y: 54, scale: 0.78, opacity: 0 });
        }

        const timeline = gsapRef.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 82%',
            end: 'bottom top',
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(centre, { y: 0, scale: 1, opacity: 1, duration: 0.42, ease: 'power2.out' }, 0)
          .to(left, { x: '0%', y: 26, rotate: -6.5, opacity: 1, duration: 0.42, ease: 'power2.out' }, 0.04)
          .to(right, { x: '0%', y: 26, rotate: 6.5, opacity: 1, duration: 0.42, ease: 'power2.out' }, 0.04)
          .to(satellites, { y: 0, scale: 1, opacity: 1, stagger: 0.06, duration: 0.38, ease: 'back.out(1.45)' }, 0.12)
          .to([left, right], { y: -8, duration: 0.58, ease: 'none' }, 0.42)
          .to(centre, { y: -14, duration: 0.58, ease: 'none' }, 0.42);
      },
      '(max-width: 720px)': () => {
        gsapRef.set([left, centre, right], { clearProps: 'all' });
        if (satellites.length) gsapRef.set(satellites, { clearProps: 'all' });
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
          end: 'bottom 48%',
          scrub: 0.45,
          invalidateOnRefresh: true,
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
        end: 'bottom 48%',
        scrub: 0.45,
        invalidateOnRefresh: true,
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
     08 · Fit — pinned horizontal possibility spectrum
     ============================================================ */
  function initFit(gsapRef, ST) {
    const section = document.querySelector('[data-bf-fit]');
    const stage = section?.querySelector('.bf-fit-stage');
    const track = section?.querySelector('[data-bf-fit-track]');
    const words = track ? Array.from(track.querySelectorAll('span')) : [];
    if (!section || !stage || !track || !words.length) return;

    let focusedIndex = -1;

    const setFocusedWord = (index) => {
      if (index === focusedIndex) return;
      focusedIndex = index;
      words.forEach((word, wordIndex) => {
        word.classList.toggle('is-focused', wordIndex === index);
      });
    };

    setFocusedWord(0);

    if (!gsapRef || !ST || reduceMotion.matches) return;

    ST.matchMedia({
      '(min-width: 721px)': () => {
        const centredX = (word) => (
          (window.innerWidth / 2) - word.offsetLeft - (word.offsetWidth / 2)
        );

        const tween = gsapRef.fromTo(track,
          { x: () => centredX(words[0]) },
          {
            x: () => centredX(words[words.length - 1]),
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=150%',
              pin: true,
              scrub: 0.18,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const index = Math.round(self.progress * (words.length - 1));
                setFocusedWord(index);
              },
            },
          }
        );

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsapRef.set(track, { clearProps: 'transform' });
          setFocusedWord(0);
        };
      },
    });
  }

  /* ============================================================
     10 · Real brands — alternating campaign wall
     ============================================================ */
  function initBrandWall(gsapRef, ST) {
    const section = document.querySelector('[data-bf-brand-wall]');
    if (!section || !gsapRef || !ST || reduceMotion.matches) return;

    const heading = section.querySelector('.bf-brand-wall-head');
    const shots = Array.from(section.querySelectorAll('[data-bf-brand-shot]'));
    if (!heading || !shots.length) return;

    gsapRef.fromTo(heading,
      { opacity: 0, y: 34 },
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top 88%', end: 'top 62%', scrub: .45 },
      });

    shots.forEach((shot, index) => {
      gsapRef.fromTo(shot,
        { opacity: .12, x: index % 2 ? 72 : -72, y: index % 2 ? 70 : 26, rotate: index % 2 ? 2.5 : -2.5, scale: .94 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: shot,
            start: 'top 94%',
            end: 'top 60%',
            scrub: .55,
            invalidateOnRefresh: true,
          },
        });
    });
  }

  /* ============================================================
     11 · Gallery — pinned horizontal scrub on desktop
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
    const shell = document.querySelector('[data-bf-pack]');
    if (!tabs.length || !panels.length) return;

    const gsapRef = window.gsap;

    const switchTab = (target) => {
      if (shell) shell.dataset.packActive = target;

      tabs.forEach((tab) => {
        const active = tab.dataset.bfTab === target;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;

        if (active && gsapRef && !reduceMotion.matches) {
          gsapRef.fromTo(tab, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', overwrite: true });
        }
      });

      panels.forEach((panel) => {
        const active = panel.id === 'bf-panel-' + target;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;

        if (active && gsapRef && !reduceMotion.matches) {
          const visual = panel.querySelector('.bf-pack-visual');
          if (visual) {
            gsapRef.fromTo(
              visual,
              { opacity: 0, scale: 0.94 },
              { opacity: 0.34, scale: 1, duration: 0.65, ease: 'power2.out', overwrite: true }
            );
          }

          gsapRef.fromTo(
            panel.querySelectorAll('.bf-pack-desc, .bf-pack-card'),
            { opacity: 0, y: 18, scale: 0.985 },
            { opacity: 1, y: 0, scale: 1, duration: 0.52, stagger: 0.045, ease: 'power3.out', overwrite: true }
          );
        }
      });
    };

    const initialTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
    switchTab(initialTab.dataset.bfTab);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.bfTab));
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const currentIndex = tabs.indexOf(tab);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
        switchTab(nextTab.dataset.bfTab);
        nextTab.focus();
      });
    });
  }

  /* ============================================================
     Final CTA — centred screen wipe
     ============================================================ */
  function initFinalCta(gsapRef, ST) {
    const block = document.querySelector('[data-bf-final-cta]');
    if (!block || !gsapRef || !ST || reduceMotion.matches) return;

    const kicker = block.querySelector('.footer-cta-kicker');
    const heading = block.querySelector('.footer-cta-heading');
    const button = block.querySelector('.footer-cta-btn');
    const rings = block.querySelectorAll('.footer-cta-fx span');
    const wipePanels = block.querySelectorAll('.footer-cta-wipe span');

    gsapRef.set([kicker, heading, button], { opacity: 0, y: 28 });
    gsapRef.set(rings, { scale: 0.72, opacity: 0 });
    gsapRef.set(wipePanels, { clearProps: 'transform' });
    gsapRef.set(wipePanels, { xPercent: 0 });

    const timeline = gsapRef.timeline({
      scrollTrigger: {
        trigger: block,
        start: 'top 88%',
        end: 'center 58%',
        scrub: 0.55,
      },
    });

    timeline.to(wipePanels, {
      xPercent: (index) => index === 0 ? -102 : 102,
      duration: 1.35,
      ease: 'power3.inOut',
    });
    timeline.to([kicker, heading, button], { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out' }, 0.48);
    timeline.to(rings, { scale: 1, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power2.out' }, 0.3);
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

  function initPositionDrivenScroll(ST) {
    if (!ST) return;

    let refreshFrame = 0;
    const syncToCurrentScroll = () => {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          ST.sort();
          ST.refresh();
          ST.update();
        });
      });
    };

    // pageshow runs after native scroll restoration. Rebuilding here makes
    // every scrubbed timeline derive its progress from the restored position.
    window.addEventListener('pageshow', syncToCurrentScroll);
    window.addEventListener('load', syncToCurrentScroll, { once: true });
    document.fonts?.ready?.then(syncToCurrentScroll);
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

    initPositionDrivenScroll(ST);


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
    initFit(gsapRef, ST);
    initBrandWall(gsapRef, ST);
    initGallery(gsapRef, ST);
    initPackTabs();
    initFinalCta(gsapRef, ST);
    initFaq();

    if (ST) window.setTimeout(() => ST.refresh(), 240);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
