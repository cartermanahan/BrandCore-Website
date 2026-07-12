// scripts/home.js — BrandFounder home motion

(function () {
  'use strict';

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopStoryQuery = window.matchMedia('(min-width: 981px)');
  const defaultScrollOffset = 96;

  function getScrollOffsetForTarget(target) {
    if (!(target instanceof HTMLElement)) return defaultScrollOffset;

    const computedOffset = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop || '');
    if (Number.isFinite(computedOffset) && computedOffset > 0) {
      return computedOffset;
    }

    return defaultScrollOffset;
  }

  function scrollTargetIntoView(target, behavior = 'smooth') {
    if (!(target instanceof HTMLElement)) return;

    const offset = getScrollOffsetForTarget(target);
    const top = window.scrollY + target.getBoundingClientRect().top - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior,
    });
  }

  window.BrandFounderScrollToTarget = (target, href, behavior = 'smooth') => {
    scrollTargetIntoView(target, behavior);

    if (href && window.history?.replaceState) {
      window.history.replaceState(null, '', href);
    }
  };

  function initHeroScrollScrub() {
    const section = document.querySelector('[data-scroll-scrub-section]');
    const canvas = section?.querySelector('[data-scroll-scrub-canvas]');
    const progressFill = section?.querySelector('[data-scroll-scrub-progress]');

    if (!section || !canvas) return;

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const frameCount = Number(canvas.dataset.frameCount || '1');
    const framePrefix = canvas.dataset.framePrefix || '';
    const frameExtension = canvas.dataset.frameExtension || '.jpg';
    const mobileLoopQuery = window.matchMedia('(max-width: 700px)');
    let rafId = 0;
    let loopRafId = 0;
    let renderedProgress = 0;
    let targetProgress = 0;
    let currentFrameIndex = 0;
    let desiredFrameIndex = 0;
    let touchY = null;
    let isScrollScrubMode = false;
    let loopDirection = 1;
    let lastLoopTime = 0;
    const loopDurationMs = 4800;
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

    function drawStaticFrame(frameIndex) {
      const safeIndex = clamp(frameIndex, 0, frameCount - 1);
      const url = frameUrls[safeIndex];
      const existing = preloadedFrames.get(url);

      if (existing?.complete) {
        drawCover(existing);
        currentFrameIndex = safeIndex;
        desiredFrameIndex = safeIndex;
        return;
      }

      const img = existing || new Image();
      img.decoding = 'async';
      img.addEventListener('load', () => {
        drawCover(img);
        currentFrameIndex = safeIndex;
        desiredFrameIndex = safeIndex;
      }, { once: true });
      img.src = url;
      preloadedFrames.set(url, img);
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
      if (!isScrollScrubMode) return;
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

    function stopLoop() {
      if (!loopRafId) return;
      window.cancelAnimationFrame(loopRafId);
      loopRafId = 0;
      lastLoopTime = 0;
    }

    function animateLoop(timestamp) {
      loopRafId = 0;
      if (isScrollScrubMode || document.hidden) return;

      if (!lastLoopTime) {
        lastLoopTime = timestamp;
      }

      const delta = timestamp - lastLoopTime;
      lastLoopTime = timestamp;
      const step = delta / loopDurationMs;

      let nextProgress = renderedProgress + (loopDirection * step);
      if (nextProgress >= 1) {
        nextProgress = 1;
        loopDirection = -1;
      } else if (nextProgress <= 0) {
        nextProgress = 0;
        loopDirection = 1;
      }

      const safeProgress = setProgress(nextProgress);
      targetProgress = safeProgress;
      renderFrame(safeProgress);
      loopRafId = window.requestAnimationFrame(animateLoop);
    }

    function startLoop() {
      if (loopRafId || document.hidden) return;
      if (renderedProgress <= 0.001) {
        loopDirection = 1;
      } else if (renderedProgress >= 0.999) {
        loopDirection = -1;
      }
      lastLoopTime = 0;
      loopRafId = window.requestAnimationFrame(animateLoop);
    }

    function syncInteractionMode() {
      stopLoop();

      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (reduceMotionQuery.matches) {
        isScrollScrubMode = false;
        section.classList.remove('has-scroll-scrub');
        targetProgress = 0;
        setProgress(0);
        drawStaticFrame(0);
        return;
      }

      if (mobileLoopQuery.matches) {
        isScrollScrubMode = false;
        section.classList.remove('has-scroll-scrub');

        if (renderedProgress <= 0.001 || renderedProgress >= 0.999) {
          targetProgress = 0;
          setProgress(0);
          renderFrame(0);
          loopDirection = 1;
        }

        startLoop();
        return;
      }

      isScrollScrubMode = true;
      section.classList.add('has-scroll-scrub');
      targetProgress = renderedProgress;
      requestRender();
    }

    function primeFrames() {
      resizeCanvas();
      currentFrameIndex = 0;
      desiredFrameIndex = 0;
      loadedFrames.add(frameUrls[0]);
      preloadFrames();
      queueProgress(targetProgress);
    }

    if (reduceMotionQuery.matches) {
      setProgress(0);
      drawStaticFrame(0);
      syncInteractionMode();
      return;
    }

    setProgress(0);
    primeFrames();
    syncInteractionMode();

    window.addEventListener('wheel', (event) => {
      if (!isScrollScrubMode) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      if (!shouldCapture(direction)) return;

      event.preventDefault();
      queueProgress(targetProgress + (event.deltaY / scrubTravel()));
    }, { passive: false });

    window.addEventListener('touchstart', (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    }, { passive: true });

    window.addEventListener('touchmove', (event) => {
      if (!isScrollScrubMode) return;
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
      if (!isScrollScrubMode) return;
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
      syncInteractionMode();
      if (isScrollScrubMode) {
        requestRender();
      } else {
        startLoop();
      }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (isScrollScrubMode) {
          requestRender();
        } else {
          startLoop();
        }
      } else {
        stopLoop();
      }
    });

    const handleReduceMotionChange = (event) => {
      if (event.matches) {
        stopLoop();
      }
      syncInteractionMode();
    };

    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(handleReduceMotionChange);
    }

    if (typeof mobileLoopQuery.addEventListener === 'function') {
      mobileLoopQuery.addEventListener('change', syncInteractionMode);
    } else if (typeof mobileLoopQuery.addListener === 'function') {
      mobileLoopQuery.addListener(syncInteractionMode);
    }
  }

  function initAnchorScrolling(lenis) {
    const links = Array.from(document.querySelectorAll('a[href^="#"]')).filter((link) => {
      return !link.closest('.navbar');
    });

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();

        if (lenis) {
          lenis.scrollTo(target, {
            offset: -24,
            duration: 1.15,
          });
        } else {
          scrollTargetIntoView(target, 'smooth');
        }

        if (window.history?.replaceState) {
          window.history.replaceState(null, '', href);
        }
      });
    });
  }

  function initRevealSystem(gsapRef, ScrollTriggerRef) {
    const revealElements = Array.from(document.querySelectorAll('.reveal'));
    if (!revealElements.length) return;

    if (reduceMotionQuery.matches) {
      revealElements.forEach((element) => element.classList.add('visible'));
      return;
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

      revealElements.forEach((element) => observer.observe(element));
      return;
    }

    revealElements.forEach((element) => element.classList.add('visible'));
  }

  function initHowFlowStory(gsapRef, ScrollTriggerRef) {
    const section = document.getElementById('how-it-works');
    const items = Array.from(document.querySelectorAll('.how-flow-item'));
    const cards = Array.from(document.querySelectorAll('.how-flow-preview-card'));
    const progressDots = Array.from(document.querySelectorAll('.how-flow-preview-progress span'));
    const previewShell = document.querySelector('.how-flow-preview-shell');

    if (!section || !items.length) return;

    const setActiveStep = (step) => {
      items.forEach((item, index) => {
        const itemStep = Number(item.dataset.howStep || String(index + 1));
        item.classList.toggle('is-active', itemStep === step);
      });

      cards.forEach((card, index) => {
        const cardStep = Number(card.dataset.previewStep || String(index + 1));
        card.classList.toggle('is-active', cardStep === step);
      });

      progressDots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index + 1 === step);
      });
    };

    window.BrandFounderSetHowStep = setActiveStep;

    setActiveStep(1);

    if (!ScrollTriggerRef) return;

    items.forEach((item, index) => {
      const step = Number(item.dataset.howStep || String(index + 1));
      ScrollTriggerRef.create({
        trigger: item,
        start: 'top 58%',
        end: 'bottom 46%',
        onEnter: () => setActiveStep(step),
        onEnterBack: () => setActiveStep(step),
      });
    });

    if (reduceMotionQuery.matches || !gsapRef || !previewShell || !desktopStoryQuery.matches) {
      return;
    }

    gsapRef.fromTo(previewShell,
      { autoAlpha: 0, y: 40, rotateX: 10 },
      {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: 1.05,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          once: true,
        },
      }
    );

    gsapRef.to(previewShell, {
      y: -26,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.15,
      },
    });
  }

  function initScreenshotSpotlight(gsapRef, ScrollTriggerRef) {
    const shell = document.querySelector('.screenshots-rail-shell');
    const rail = shell?.querySelector('.screenshots-rail');
    const cards = rail ? Array.from(rail.querySelectorAll('.screenshot-card')) : [];
    let railScrollTrigger = null;

    if (!shell || !rail || !cards.length) return;

    const setActiveCard = (activeIndex) => {
      cards.forEach((card, index) => {
        card.classList.toggle('is-active', index === activeIndex);
      });
    };

    const updateActiveCard = () => {
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.left + (railRect.width / 2);
      let activeIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(cardCenter - railCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          activeIndex = index;
        }
      });

      setActiveCard(activeIndex);
    };

    let updateQueued = false;
    const requestActiveUpdate = () => {
      if (updateQueued) return;
      updateQueued = true;
      window.requestAnimationFrame(() => {
        updateQueued = false;
        updateActiveCard();
      });
    };

    setActiveCard(0);
    rail.addEventListener('scroll', requestActiveUpdate, { passive: true });
    window.addEventListener('resize', requestActiveUpdate, { passive: true });

    if (gsapRef && ScrollTriggerRef && !reduceMotionQuery.matches) {
      const syncRailToScroll = () => {
        if (railScrollTrigger) {
          railScrollTrigger.kill();
          railScrollTrigger = null;
        }

        if (!desktopStoryQuery.matches) {
          rail.scrollLeft = 0;
          requestActiveUpdate();
          return;
        }

        railScrollTrigger = ScrollTriggerRef.create({
          trigger: shell,
          start: 'top 72%',
          end: 'bottom top+=8%',
          scrub: 1.1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
            rail.scrollLeft = maxScroll * self.progress;
            requestActiveUpdate();
          },
        });
      };

      syncRailToScroll();

      const handleDesktopStoryChange = () => {
        syncRailToScroll();
        requestActiveUpdate();
      };

      if (typeof desktopStoryQuery.addEventListener === 'function') {
        desktopStoryQuery.addEventListener('change', handleDesktopStoryChange);
      } else if (typeof desktopStoryQuery.addListener === 'function') {
        desktopStoryQuery.addListener(handleDesktopStoryChange);
      }
    }

    requestActiveUpdate();
  }

  function initPackShowcaseMotion(gsapRef, ScrollTriggerRef) {
    const shell = document.querySelector('.pack-shell');
    const showcaseBg = shell?.querySelector('.pack-showcase-bg');
    const showcaseCopy = shell?.querySelector('.pack-showcase-copy');
    const tabs = shell?.querySelector('.pack-tabs');
    const panelWrap = shell?.querySelector('.pack-panel-wrap');

    if (!shell || !ScrollTriggerRef) return;

    ScrollTriggerRef.create({
      trigger: shell,
      start: 'top 68%',
      end: 'bottom 32%',
      onToggle: (self) => {
        shell.classList.toggle('is-immersed', self.isActive);
      },
    });

    if (reduceMotionQuery.matches || !gsapRef) return;

    if (showcaseBg) {
      gsapRef.to(showcaseBg, {
        yPercent: -10,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: shell,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
        },
      });
    }

    if (showcaseCopy) {
      gsapRef.from(Array.from(showcaseCopy.children), {
        y: 28,
        autoAlpha: 0,
        duration: 0.95,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: shell,
          start: 'top 80%',
          once: true,
        },
      });
    }

    if (tabs) {
      gsapRef.from(tabs, {
        y: 18,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: tabs,
          start: 'top 88%',
          once: true,
        },
      });
    }

    if (panelWrap) {
      gsapRef.to(panelWrap, {
        y: -14,
        ease: 'none',
        scrollTrigger: {
          trigger: shell,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }
  }

  function initSmoothMotion() {
    const gsapRef = window.gsap;
    const ScrollTriggerRef = window.ScrollTrigger;

    if (gsapRef && ScrollTriggerRef) {
      gsapRef.registerPlugin(ScrollTriggerRef);
    }

    initAnchorScrolling(null);
    initRevealSystem(gsapRef, ScrollTriggerRef);
    initHowFlowStory(gsapRef, ScrollTriggerRef);
    initScreenshotSpotlight(gsapRef, ScrollTriggerRef);
    initPackShowcaseMotion(gsapRef, ScrollTriggerRef);

    if (ScrollTriggerRef) {
      window.setTimeout(() => ScrollTriggerRef.refresh(), 180);
    }
  }

  function initInitialHashLanding() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const target = document.querySelector(hash);
    if (!(target instanceof HTMLElement)) return;

    const correctHashLanding = () => {
      scrollTargetIntoView(target, 'auto');

      if (hash === '#how-it-works' && typeof window.BrandFounderSetHowStep === 'function') {
        window.BrandFounderSetHowStep(1);
      }
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(correctHashLanding);
    });

    window.addEventListener('load', correctHashLanding, { once: true });
  }

  function initHashLifecycle() {
    if (!window.history?.replaceState) return;

    let settleTimer = 0;

    const clearStaleHash = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') return;

      const target = document.querySelector(hash);
      if (!(target instanceof HTMLElement)) return;

      const bounds = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const targetIsCurrent = bounds.top <= viewportHeight * 0.55
        && bounds.bottom >= viewportHeight * 0.2;

      if (!targetIsCurrent) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        );
      }
    };

    const scheduleHashCheck = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(clearStaleHash, 180);
    };

    window.addEventListener('scroll', scheduleHashCheck, { passive: true });
    window.addEventListener('resize', scheduleHashCheck, { passive: true });
  }

  function init() {
    initHeroScrollScrub();
    initSmoothMotion();
    initInitialHashLanding();
    initHashLifecycle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
