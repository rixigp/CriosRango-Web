(() => {
  'use strict';

  const root = document.querySelector('.cr-account-orders');
  if (!root) return;

  const filters = Array.from(root.querySelectorAll('[data-cr-order-filter]'));
  const cards = Array.from(root.querySelectorAll('[data-cr-order-card]'));
  const empty = root.querySelector('[data-cr-orders-filter-empty]');

  // Hide failed remote images to prevent the browser's native broken-image icon.
  // A placeholder is rendered server-side only when WooCommerce has no valid image.
  root.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches('.cr-account-order__thumbnail img')) return;
    image.hidden = true;
    image.style.display = 'none';
  }, true);

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
