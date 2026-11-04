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
      }, { rootMargin: '0px 0px -90% 0px', threshold: 0 });
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


  // Contextual category filters: draft selections stay local until Apply.
  const filterSheet = document.querySelector('[data-cr-filter-sheet]');
  if (filterSheet) {
    const categoryId = filterSheet.dataset.categoryId;
    const apiUrl = filterSheet.dataset.apiUrl;
    let termLabels = {};
    try { termLabels = JSON.parse(filterSheet.dataset.termLabels || '{}'); } catch (error) { termLabels = {}; }
    const dimensions = ['sizes', 'colors', 'brands'];
    const apiKeys = { sizes: 'size_ids', colors: 'color_ids', brands: 'brand_ids' };
    const facetKeys = { sizes: 'sizes', colors: 'colors', brands: 'brands' };
    const initialKeys = { sizes: 'initialSizes', colors: 'initialColors', brands: 'initialBrands' };
    const draft = {
      sizes: (filterSheet.dataset.initialSizes || '').split(',').filter(Boolean),
      colors: (filterSheet.dataset.initialColors || '').split(',').filter(Boolean),
      brands: (filterSheet.dataset.initialBrands || '').split(',').filter(Boolean)
    };
    let activeDimension = 'sizes';
    let savedScrollY = 0;
    let requestSequence = 0;
    let currentFacetRows = [];
    const optionsNode = filterSheet.querySelector('[data-cr-filter-options]');
    const searchWrap = filterSheet.querySelector('[data-cr-brand-search]');
    const searchInput = filterSheet.querySelector('[data-cr-brand-query]');
    const dialog = filterSheet.querySelector('.cr-category-filter-sheet__dialog');
    const openButtons = Array.from(document.querySelectorAll('[data-cr-filter-open]'));
    const apiParams = () => {
      const params = new URLSearchParams({scope:'catalog',catalog_category_id:categoryId,facet:facetKeys[activeDimension],page:'1',per_page:'12'});
      dimensions.forEach((dimension) => {
        if (dimension !== activeDimension && draft[dimension].length) params.set(apiKeys[dimension], draft[dimension].join(','));
      });
      return params;
    };
    const renderOptions = (dimension, rows) => {
      const needle = dimension === 'brands' && searchInput ? searchInput.value.trim().toLocaleLowerCase() : '';
      const visibleRows = needle ? rows.filter((row) => row.label.toLocaleLowerCase().includes(needle)) : rows;
      optionsNode.replaceChildren();
      if (!visibleRows.length) {
        const empty = document.createElement('p'); empty.className = 'cr-category-filter-sheet__empty';
        empty.textContent = 'No hay opciones disponibles.'; optionsNode.appendChild(empty); return;
      }
      visibleRows.forEach((row) => {
        const label = document.createElement('label'); label.className = 'cr-category-filter-sheet__option';
        const input = document.createElement('input'); input.type = 'checkbox'; input.value = String(row.term_id);
        input.checked = draft[dimension].includes(String(row.term_id));
        input.addEventListener('change', () => {
          const id = String(row.term_id);
          if (input.checked && !draft[dimension].includes(id)) draft[dimension].push(id);
          if (!input.checked) draft[dimension] = draft[dimension].filter((value) => value !== id);
        });
        const text = document.createElement('span'); text.textContent = row.label;
        label.append(input, text); optionsNode.appendChild(label);
      });
    };
    const loadFacet = async () => {
      const sequence = ++requestSequence; optionsNode.textContent = 'Cargando opciones…';
      try {
        const response = await fetch(apiUrl + '?' + apiParams().toString(), {credentials:'same-origin',headers:{Accept:'application/json'}});
        if (!response.ok) throw new Error('Filter API HTTP ' + response.status);
        const payload = await response.json(); if (sequence !== requestSequence) return;
        const rows = payload && payload.facets && Array.isArray(payload.facets[facetKeys[activeDimension]]) ? payload.facets[facetKeys[activeDimension]] : [];
        const taxonomy = {sizes:'pa_tallas',colors:'pa_color',brands:'product_tag'}[activeDimension];
        currentFacetRows = rows.map((item) => {
          const meta = termLabels[taxonomy] && termLabels[taxonomy][String(item.term_id)];
          return meta ? {term_id:Number(item.term_id),count:Number(item.count)||0,label:meta.label,slug:meta.slug} : null;
        }).filter(Boolean);
        renderOptions(activeDimension, currentFacetRows);
      } catch (error) {
        if (sequence !== requestSequence) return;
        currentFacetRows = []; optionsNode.textContent = 'No se han podido cargar las opciones. Inténtalo de nuevo.';
      }
    };
    const setDimension = (dimension) => {
      if (!dimensions.includes(dimension)) return;
      activeDimension = dimension;
      filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach((button) => {
        const active = button.dataset.crFilterTab === dimension;
        button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active));
      });
      searchWrap.hidden = dimension !== 'brands'; if (searchInput) searchInput.value = ''; loadFacet();
    };
    const closeSheet = () => {
      ++requestSequence; filterSheet.hidden = true; document.body.classList.remove('cr-category-filter-open');
      document.body.style.removeProperty('overflow'); window.scrollTo(0, savedScrollY);
    };
    const openSheet = () => {
      savedScrollY = window.scrollY;
      dimensions.forEach((dimension) => { draft[dimension] = (filterSheet.dataset[initialKeys[dimension]] || '').split(',').filter(Boolean); });
      filterSheet.hidden = false; document.body.classList.add('cr-category-filter-open'); document.body.style.overflow = 'hidden';
      setDimension('sizes'); window.requestAnimationFrame(() => dialog.focus());
    };
    openButtons.forEach((button) => button.addEventListener('click', openSheet));
    filterSheet.querySelectorAll('[data-cr-filter-close]').forEach((button) => button.addEventListener('click', closeSheet));
    filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach((button) => button.addEventListener('click', () => setDimension(button.dataset.crFilterTab)));
    if (searchInput) searchInput.addEventListener('input', () => renderOptions('brands', currentFacetRows));
    filterSheet.querySelector('[data-cr-filter-clear]').addEventListener('click', () => { dimensions.forEach((dimension) => {draft[dimension]=[];}); loadFacet(); });
    filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click', () => {
      const url = new URL(window.location.href);
      dimensions.forEach((dimension) => {
        url.searchParams.delete(apiKeys[dimension]);
        if (draft[dimension].length) url.searchParams.set(apiKeys[dimension], draft[dimension].join(','));
      });
      window.location.assign(url.toString());
    });
    document.addEventListener('keydown', (event) => { if (!filterSheet.hidden && event.key === 'Escape') closeSheet(); });
  }
})();
