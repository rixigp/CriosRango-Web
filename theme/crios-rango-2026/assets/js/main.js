(() => {
  'use strict';

  const menuButton = document.querySelector('[data-cr-menu-toggle]');
  const mobileMenu = document.querySelector('[data-cr-mobile-menu]');

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      mobileMenu.hidden = open;
      document.documentElement.classList.toggle('cr-menu-open', !open);
    });
  }

  const slides = Array.from(document.querySelectorAll('[data-cr-hero-slide]'));
  if (slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let index = 0;
    window.setInterval(() => {
      slides[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
    }, 3500);
  }


  // Remove the Home logo's circular surface once the Hero leaves the viewport.
  const homeHero = document.querySelector('.cr-app-hero');
  if (homeHero && document.body.classList.contains('home')) {
    if ('IntersectionObserver' in window) {
      const homeHeroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          document.body.classList.toggle('cr-home-hero-out', !entry.isIntersecting);
        });
      }, { threshold: 0 });
      homeHeroObserver.observe(homeHero);
    }
  }

  const brandPager = document.querySelector('[data-cr-brand-pager]');
  const brandPages = brandPager ? Array.from(brandPager.querySelectorAll('[data-cr-brand-page]')) : [];
  const brandDots = Array.from(document.querySelectorAll('[data-cr-brand-dot]'));

  if (brandPager && brandPages.length > 1 && brandDots.length === brandPages.length) {
    const setActiveBrandPage = (index) => {
      brandDots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };

    brandDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.getAttribute('data-cr-brand-dot'));
        const page = brandPages[index];
        if (page) brandPager.scrollTo({ left: page.offsetLeft - brandPager.offsetLeft, behavior: 'smooth' });
      });
    });

    if ('IntersectionObserver' in window) {
      const pageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = brandPages.indexOf(entry.target);
            if (index >= 0) setActiveBrandPage(index);
          }
        });
      }, { root: brandPager, threshold: 0.6 });
      brandPages.forEach((page) => pageObserver.observe(page));
    } else {
      brandPager.addEventListener('scroll', () => {
        const pageWidth = brandPager.clientWidth || 1;
        setActiveBrandPage(Math.min(brandPages.length - 1, Math.round(brandPager.scrollLeft / pageWidth)));
      }, { passive: true });
    }
  }

})();