// navbar.js

document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.querySelector('.nav-links ul');
    const navLinks = document.querySelectorAll('.nav-links a');
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleIcon = themeToggle?.querySelector('.theme-toggle-icon');
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const themeKey = 'brandfounder-theme';
    const darkSourceMedia = '(prefers-color-scheme: dark)';

    const moonIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 15.2A8.6 8.6 0 1 1 12.8 4a6.9 6.9 0 0 0 7.2 11.2Z"></path>
        </svg>
    `;

    const sunIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4.2"></circle>
            <path d="M12 2.5v2.2"></path>
            <path d="M12 19.3v2.2"></path>
            <path d="m4.9 4.9 1.6 1.6"></path>
            <path d="m17.5 17.5 1.6 1.6"></path>
            <path d="M2.5 12h2.2"></path>
            <path d="M19.3 12h2.2"></path>
            <path d="m4.9 19.1 1.6-1.6"></path>
            <path d="m17.5 6.5 1.6-1.6"></path>
        </svg>
    `;

    function getStoredTheme() {
        try {
            const storedTheme = window.localStorage.getItem(themeKey);
            return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
        } catch (error) {
            console.warn('Theme preference unavailable.', error);
            return null;
        }
    }

    function setStoredTheme(theme) {
        try {
            if (theme === 'light' || theme === 'dark') {
                window.localStorage.setItem(themeKey, theme);
            } else {
                window.localStorage.removeItem(themeKey);
            }
        } catch (error) {
            console.warn('Theme preference unavailable.', error);
        }
    }

    function getActiveTheme() {
        return getStoredTheme() || (darkModeMedia.matches ? 'dark' : 'light');
    }

    function syncThemeMedia(activeTheme, hasManualOverride) {
        document.querySelectorAll('source[data-theme-dark-source]').forEach(source => {
            source.media = hasManualOverride
                ? activeTheme === 'dark' ? 'all' : 'not all'
                : darkSourceMedia;
        });
    }

    function syncThemeToggle(activeTheme, hasManualOverride) {
        if (!themeToggle || !themeToggleIcon) return;

        const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';

        themeToggle.dataset.theme = activeTheme;
        themeToggle.dataset.mode = hasManualOverride ? 'manual' : 'system';
        themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
        themeToggle.setAttribute('title', `Switch to ${nextTheme} mode`);
        themeToggle.setAttribute('aria-pressed', hasManualOverride ? 'true' : 'false');
        themeToggleIcon.innerHTML = activeTheme === 'dark' ? moonIcon : sunIcon;
    }

    function applyTheme() {
        const storedTheme = getStoredTheme();
        const activeTheme = storedTheme || (darkModeMedia.matches ? 'dark' : 'light');

        if (storedTheme) {
            root.dataset.theme = storedTheme;
        } else {
            delete root.dataset.theme;
        }

        syncThemeMedia(activeTheme, Boolean(storedTheme));
        syncThemeToggle(activeTheme, Boolean(storedTheme));
    }

    function closeMenu() {
        if (!navList || !navList.classList.contains('show')) return;

        navList.classList.remove('show');
        navList.classList.add('closing');

        setTimeout(() => {
            navList.classList.remove('closing');
        }, 220);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }

            closeMenu();
            menuToggle?.classList.remove('open');
            menuToggle?.setAttribute('aria-expanded', 'false');
        });
    });

    const handleScroll = () => {
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
            navbar.classList.add('is-scrolled');
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.remove('is-scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    if (menuToggle && navList) {
        menuToggle.addEventListener('click', e => {
            e.stopPropagation();

            if (!navList.classList.contains('show')) {
                navList.classList.remove('closing');
                navList.classList.add('show');
                menuToggle.classList.add('open');
                menuToggle.setAttribute('aria-expanded', 'true');
            } else {
                closeMenu();
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('click', e => {
            const clickInsideMenu = navList.contains(e.target);
            const clickOnToggle = menuToggle.contains(e.target);

            if (!clickInsideMenu && !clickOnToggle) {
                closeMenu();
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextTheme = getActiveTheme() === 'dark' ? 'light' : 'dark';
            setStoredTheme(nextTheme);
            applyTheme();
        });
    }

    if (typeof darkModeMedia.addEventListener === 'function') {
        darkModeMedia.addEventListener('change', () => {
            if (!getStoredTheme()) {
                applyTheme();
            }
        });
    }

    applyTheme();
});
