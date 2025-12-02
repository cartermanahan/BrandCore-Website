// navbar.js

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.querySelector('.nav-links ul');
    const navLinks = document.querySelectorAll('.nav-links a');

    /*-----------------------------
      Helper: Smooth Closing Animation
    -----------------------------*/
    function closeMenu() {
        if (!navList.classList.contains('show')) return; // already closed

        navList.classList.remove('show');   // remove open state
        navList.classList.add('closing');   // trigger closing animation

        // After animation ends, remove "closing"
        setTimeout(() => {
            navList.classList.remove('closing');
        }, 220); // matches CSS animation duration
    }

    /*-----------------------------
      Smooth Scroll for Nav Links
    -----------------------------*/
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');

            // Only handle internal anchors
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Close menu on link click
            closeMenu();
            menuToggle.classList.remove('open');
        });
    });

    /*-----------------------------
      Sticky Navbar on Scroll
    -----------------------------*/
    const handleScroll = () => {
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // run once on load

    /*-----------------------------
      Mobile Menu Toggle
    -----------------------------*/
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', e => {
            e.stopPropagation();

            // Opening
            if (!navList.classList.contains('show')) {
                navList.classList.remove('closing');
                navList.classList.add('show');
                menuToggle.classList.add('open');
            }
            // Closing
            else {
                closeMenu();
                menuToggle.classList.remove('open');
            }
        });

        // Click outside closes the menu
        document.addEventListener('click', e => {
            const clickInsideMenu = navList.contains(e.target);
            const clickOnToggle = menuToggle.contains(e.target);

            if (!clickInsideMenu && !clickOnToggle) {
                closeMenu();
                menuToggle.classList.remove('open');
            }
        });
    }
});