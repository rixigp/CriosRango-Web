(() => {
  'use strict';

  const root = document.querySelector('.cr-account-orders');
  if (!root) return;

  const filters = Array.from(root.querySelectorAll('[data-cr-order-filter]'));
  const cards = Array.from(root.querySelectorAll('[data-cr-order-card]'));
  const empty = root.querySelector('[data-cr-orders-filter-empty]');
  const filterTrack = root.querySelector('.cr-account-orders__filters');

  root.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches('.cr-account-order__thumbnail img')) return;
    image.hidden = true;
    image.style.display = 'none';
    const placeholder = image.previousElementSibling;
    if (placeholder) {
      placeholder.hidden = false;
      placeholder.style.display = 'grid';
    }
  }, true);

  if (filterTrack) {
    const controls = document.createElement('div');
    controls.className = 'cr-account-orders__filter-controls';

    const createScrollButton = (direction) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cr-account-orders__filter-scroll cr-account-orders__filter-scroll--' + direction;
      button.setAttribute('aria-label', direction === 'left' ? 'Ver estados anteriores' : 'Ver más estados');
      button.textContent = direction === 'left' ? '‹' : '›';
      button.hidden = true;
      button.addEventListener('click', () => {
        const distance = Math.max(160, filterTrack.clientWidth * 0.7);
        filterTrack.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
      });
      return button;
    };

    const leftControl = createScrollButton('left');
    const rightControl = createScrollButton('right');
    filterTrack.parentNode.insertBefore(controls, filterTrack);
    controls.append(leftControl, filterTrack, rightControl);

    const updateScrollControls = () => {
      const maxScrollLeft = Math.max(0, filterTrack.scrollWidth - filterTrack.clientWidth);
      const scrollLeft = filterTrack.scrollLeft;
      const hasOverflow = maxScrollLeft > 1;
      leftControl.hidden = !hasOverflow || scrollLeft <= 1;
      rightControl.hidden = !hasOverflow || scrollLeft >= maxScrollLeft - 1;
      controls.dataset.overflow = hasOverflow ? 'true' : 'false';
    };

    filterTrack.addEventListener('scroll', updateScrollControls, { passive: true });
    window.addEventListener('resize', updateScrollControls, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateScrollControls);
      resizeObserver.observe(filterTrack);
      filters.forEach((button) => resizeObserver.observe(button));
    }
    requestAnimationFrame(updateScrollControls);
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.crOrderFilter || 'all';
      let visible = 0;

      filters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      cards.forEach((card) => {
        const show = selected === 'all' || card.dataset.status === selected;
        card.hidden = !show;
        if (show) visible += 1;
      });

      if (empty) empty.hidden = visible !== 0;
    });
  });
})();
