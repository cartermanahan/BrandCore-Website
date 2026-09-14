/* =====================================================================
   site.js — BrandFounder
   One rAF-gated scroll pass. Everything else is IntersectionObserver.
   No third-party libraries.
   ===================================================================== */
(() => {
    'use strict';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const viewportH = () => document.documentElement.clientHeight || window.innerHeight;

    /* Callbacks that want a slot in the single scroll pass. */
    const scrollJobs = [];
    let ticking = false;

    function runJobs() {
        ticking = false;
        for (let i = 0; i < scrollJobs.length; i++) scrollJobs[i]();
    }
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(runJobs);
    }

    /* -----------------------------------------------------------
       Reveal on appear
       ----------------------------------------------------------- */
    function initReveals() {
        const items = document.querySelectorAll('[data-r], [data-r-group]');
        if (!items.length) return;

        if (reduced.matches || !('IntersectionObserver' in window)) {
            items.forEach(el => el.classList.add('is-in'));
            return;
        }

        const io = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        items.forEach(el => {
            const d = el.getAttribute('data-r-d');
            if (d) el.style.setProperty('--rd', d);
            io.observe(el);
        });

        // The hero is above the fold by definition — play it on load.
        window.requestAnimationFrame(() => {
            document.querySelectorAll('.hero [data-r]').forEach(el => {
                el.classList.add('is-in');
                io.unobserve(el);
            });
        });
    }

    /* -----------------------------------------------------------
       Ambient light + looping icon cycles: idle while off-screen
       ----------------------------------------------------------- */
    function initAmbient() {
        const hosts = document.querySelectorAll('[data-bloom], [data-manifesto], [data-marquee]');
        if (!hosts.length || !('IntersectionObserver' in window)) return;

        const io = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
            }
        }, { rootMargin: '120px 0px' });

        hosts.forEach(el => io.observe(el));
    }

    /* -----------------------------------------------------------
       Logo marquee
       ----------------------------------------------------------- */
    function initMarquee() {
        const marquee = document.querySelector('[data-marquee]');
        if (!marquee) return;

        // Each row animates by -50%, so the row must be exactly two identical
        // halves and each half must be at least as wide as the track. Rows with
        // fewer logos need the set repeated more than once to cover that width,
        // otherwise the loop leaves a visible gap on wide screens.
        const buildRow = row => {
            const set = row.querySelector('.marquee-set');
            if (!set) return;

            row.querySelectorAll('.marquee-set').forEach((el, i) => { if (i) el.remove(); });

            const setWidth = set.getBoundingClientRect().width;
            const trackWidth = marquee.getBoundingClientRect().width;
            if (!setWidth) return;

            const perHalf = Math.max(1, Math.ceil(trackWidth / setWidth));
            const total = perHalf * 2;

            for (let i = 1; i < total; i += 1) {
                const clone = set.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.querySelectorAll('img').forEach(img => { img.alt = ''; });
                row.appendChild(clone);
            }
            // Keep a constant scroll speed: the row travels one half-width per
            // cycle, and that half grows with the number of repeats.
            const halfWidth = perHalf * setWidth;
            row.style.animationDuration = `${(halfWidth / 26).toFixed(1)}s`;

            if (!reduced.matches) row.setAttribute('data-run', '');
        };

        const rows = [...marquee.querySelectorAll('[data-marquee-row]')];
        const build = () => rows.forEach(buildRow);
        build();

        // Widths change with the viewport (and once the logo images decode).
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 200);
        });
        window.addEventListener('load', build);
    }

    /* -----------------------------------------------------------
       Manifesto — words light up as you scroll through them
       ----------------------------------------------------------- */
    function initManifesto() {
        const block = document.querySelector('[data-mani-text]');
        if (!block) return;

        // Wrap bare words, leaving element children (the icon stack) alone.
        const nodes = [...block.childNodes];
        nodes.forEach(node => {
            if (node.nodeType !== Node.TEXT_NODE) return;
            const parts = node.textContent.split(/(\s+)/);
            const frag = document.createDocumentFragment();
            parts.forEach(part => {
                if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
                const span = document.createElement('span');
                span.className = 'mani-w';
                span.textContent = part;
                frag.appendChild(span);
            });
            block.replaceChild(frag, node);
        });

        const words = [...block.querySelectorAll('.mani-w')];
        if (!words.length) return;

        if (reduced.matches) {
            words.forEach(w => w.classList.add('lit'));
            return;
        }

        let lit = 0;
        scrollJobs.push(() => {
            const rect = block.getBoundingClientRect();
            const vh = viewportH();
            if (rect.bottom < -200 || rect.top > vh + 200) return;

            // Runs from the block entering the lower third to clearing the upper third.
            const span = rect.height + vh * 0.42;
            const p = clamp((vh * 0.78 - rect.top) / span, 0, 1);
            const next = Math.round(p * words.length);
            if (next === lit) return;

            if (next > lit) { for (let i = lit; i < next; i++) words[i].classList.add('lit'); }
            else { for (let i = lit - 1; i >= next; i--) words[i].classList.remove('lit'); }
            lit = next;
        });
    }

    /* -----------------------------------------------------------
       Idea text fields — types the active one in, untypes the rest.
       Time-based off rAF so it finishes in the same wall-clock span
       at any frame rate and suspends cleanly in a hidden tab.
       ----------------------------------------------------------- */
    const Typer = (() => {
        const boxes = [];
        let raf = null;
        let last = 0;
        const CPS_IN = 62;
        const CPS_OUT = 150;

        function register(el) {
            const field = el.querySelector('.tbox-text');
            const source = el.querySelector('.sr-only');
            if (!field || !source) return;
            boxes.push({ el, field, full: source.textContent.trim(), n: 0, target: 0 });
        }

        function step(now) {
            const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
            last = now;
            let busy = false;

            for (const b of boxes) {
                if (b.n === b.target) continue;
                busy = true;
                const rate = b.target > b.n ? CPS_IN : -CPS_OUT;
                b.n = clamp(b.n + rate * dt, 0, b.full.length);
                if (Math.abs(b.n - b.target) < 0.6) b.n = b.target;
                b.field.textContent = b.full.slice(0, Math.round(b.n));
                b.el.classList.toggle('is-typing', b.n !== b.target);
            }

            raf = busy ? window.requestAnimationFrame(step) : (last = 0, null);
        }

        function setActive(index) {
            let changed = false;
            boxes.forEach((b, i) => {
                const target = i === index ? b.full.length : 0;
                if (b.target !== target) { b.target = target; changed = true; }
                b.el.classList.toggle('is-live', i === index);
            });
            if (!changed || raf) return;
            last = 0;
            raf = window.requestAnimationFrame(step);
        }

        function settle(index) {
            boxes.forEach((b, i) => {
                b.target = b.n = i === index ? b.full.length : 0;
                b.field.textContent = b.full.slice(0, b.n);
                b.el.classList.toggle('is-live', i === index);
                b.el.classList.remove('is-typing');
            });
        }

        return { register, setActive, settle, count: () => boxes.length };
    })();

    /* -----------------------------------------------------------
       "How it works" — sticky stage driven by scroll position
       ----------------------------------------------------------- */
    function initStages() {
        const track = document.querySelector('.how-track');
        const stage = track && track.querySelector('.how-stage');
        if (!track || !stage) return;

        stage.querySelectorAll('.tbox').forEach(el => Typer.register(el));

        const wires = [...stage.querySelectorAll('.wire')];
        const sets = [...stage.querySelectorAll('.phoneset')];
        const outs = [...stage.querySelectorAll('.outset')];
        const count = Math.max(1, parseInt(track.dataset.stages || '3', 10));

        let current = -1;

        function apply(next) {
            if (next === current) return;
            current = next;
            stage.dataset.stage = String(next);

            // stage 0 primes the first field; 1 and 2 hand off between brands
            Typer.setActive(next === 0 ? 0 : next - 1);

            wires.forEach((el, i) => el.classList.toggle('is-drawn', next >= i + 1));
            sets.forEach((el, i) => el.classList.toggle('is-on', next === i + 1));
            outs.forEach((el, i) => el.classList.toggle('is-on', next === i + 1));
        }

        if (reduced.matches) {
            track.style.height = 'auto';
            stage.style.position = 'static';
            stage.style.height = 'auto';
            stage.dataset.stage = '1';
            Typer.settle(0);
            wires.forEach(el => el.classList.add('is-drawn'));
            sets.forEach((el, i) => el.classList.toggle('is-on', i === 0));
            outs.forEach((el, i) => el.classList.toggle('is-on', i === 0));
            return;
        }

        scrollJobs.push(() => {
            const rect = track.getBoundingClientRect();
            const vh = viewportH();

            if (rect.bottom <= 0) { apply(count - 1); return; }
            if (rect.top >= vh) { apply(0); return; }

            const runway = Math.max(1, rect.height - vh);
            const p = clamp(-rect.top / runway, 0, 1);
            const next = p < 0.26 ? 0
                : Math.min(count - 1, 1 + Math.floor(((p - 0.26) / 0.74) * (count - 1)));
            apply(next);
        });
    }

    /* -----------------------------------------------------------
       FAQ — <details> that animates open and closed
       ----------------------------------------------------------- */
    function initFaq() {
        document.querySelectorAll('.q').forEach(details => {
            const summary = details.querySelector('summary');
            const wrap = details.querySelector('.q-wrap');
            if (!summary || !wrap) return;

            let animating = false;

            summary.addEventListener('click', (event) => {
                if (reduced.matches) return;         // let the browser do it plainly
                event.preventDefault();
                if (animating) return;
                animating = true;

                const done = () => { animating = false; };

                if (!details.open) {
                    wrap.setAttribute('data-collapsed', '');
                    details.open = true;
                    window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => wrap.removeAttribute('data-collapsed'));
                    });
                    window.setTimeout(done, 460);
                } else {
                    wrap.setAttribute('data-collapsed', '');
                    window.setTimeout(() => {
                        details.open = false;
                        wrap.removeAttribute('data-collapsed');
                        done();
                    }, 420);
                }
            });
        });
    }

    /* -----------------------------------------------------------
       Anchors — navbar.js calls this if it exists
       ----------------------------------------------------------- */
    window.BrandFounderScrollToTarget = function (target, hash, behavior) {
        if (!target) return;
        target.scrollIntoView({
            behavior: reduced.matches ? 'auto' : (behavior || 'smooth'),
            block: 'start'
        });
        if (hash) {
            try { history.replaceState(null, '', hash); } catch (e) { /* ignore */ }
        }
    };

    function initAnchors() {
        document.querySelectorAll('.foot a[href^="#"]').forEach(link => {
            link.addEventListener('click', (event) => {
                const hash = link.getAttribute('href');
                const target = hash && hash.length > 1 && document.querySelector(hash);
                if (!target) return;
                event.preventDefault();
                window.BrandFounderScrollToTarget(target, hash, 'smooth');
            });
        });
    }

    /* -----------------------------------------------------------
       Boot
       ----------------------------------------------------------- */
    function boot() {
        const year = document.getElementById('year');
        if (year) year.textContent = String(new Date().getFullYear());

        initReveals();
        initAmbient();
        initMarquee();
        initManifesto();
        initStages();
        initFaq();
        initAnchors();

        if (scrollJobs.length) {
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });
            window.addEventListener('orientationchange', onScroll, { passive: true });
            runJobs();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
