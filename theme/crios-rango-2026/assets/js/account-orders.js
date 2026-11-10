(() => {
  'use strict';

  const root = document.querySelector('.cr-account-orders');
  if (!root) return;

  const filters = Array.from(root.querySelectorAll('[data-cr-order-filter]'));
  const cards = Array.from(root.querySelectorAll('[data-cr-order-card]'));
  const empty = root.querySelector('[data-cr-orders-filter-empty]');

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
