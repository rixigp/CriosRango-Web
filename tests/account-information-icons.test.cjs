const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const dashboard = fs.readFileSync(path.join(__dirname, '../theme/crios-rango-2026/woocommerce/myaccount/dashboard.php'), 'utf8');
const rows = [
  { label: 'Cambios y devoluciones', icon: 'history', required: ['M3 12a9 9 0 1 0 9-9', 'M3 3v5h5', 'M12 7v5l4 2'] },
  { label: 'Condiciones de contratación', icon: 'file-text', required: ['M14 2H6a2 2 0 0 0-2 2v16', 'M14 2v6h6', 'M8 13h8M8 17h8'] },
  { label: 'Política de privacidad', icon: 'shield-info', required: ['M12 22s8-4 8-11V5l-8-3', 'circle cx="12" cy="11" r="3"', 'M12 10.5v3'] },
  { label: 'Aviso legal', icon: 'file-text', required: ['M14 2H6a2 2 0 0 0-2 2v16', 'M14 2v6h6', 'M8 13h8M8 17h8'] },
  { label: 'Política de cookies', icon: 'cookie', required: ['M20.5 12a8.5 8.5 0 1 1-8.5-8.5', 'a3 3 0 0 0 3 3h.5', 'circle cx="8.5" cy="11"', 'circle cx="11" cy="16"'] },
];
test('ACCOUNT_INFORMATION_ICONS_USE_REQUESTED_SVG_GEOMETRY', () => {
  for (const row of rows) {
    const labelAt = dashboard.indexOf("__( '" + row.label + "'");
    assert.notEqual(labelAt, -1, row.label + ' row exists');
    const start = dashboard.lastIndexOf("'icon_svg' => '", labelAt);
    const end = dashboard.indexOf("', 'slugs'", start);
    assert.ok(start >= 0 && end > start, row.label + ' SVG attached to row');
    const svg = dashboard.slice(start, end);
    assert.ok(svg.includes('data-icon="' + row.icon + '"'), row.label + ' icon name');
    assert.ok(svg.includes('fill="none"') && svg.includes('stroke="currentColor"'), row.label + ' outline');
    assert.ok(svg.includes('stroke-linecap="round"') && svg.includes('stroke-linejoin="round"'), row.label + ' shared stroke');
    for (const geometry of row.required) assert.ok(svg.includes(geometry), row.label + ' geometry: ' + geometry);
  }
});
test('ACCOUNT_INFORMATION_COOKIE_IS_NOT_THE_PREVIOUS_MOON_SVG', () => {
  const labelAt = dashboard.indexOf("__( 'Política de cookies'");
  const start = dashboard.lastIndexOf("'icon_svg' => '", labelAt);
  const end = dashboard.indexOf("', 'slugs'", start);
  const svg = dashboard.slice(start, end);
  assert.ok(svg.includes('data-icon="cookie"'));
  assert.ok(svg.includes('M20.5 12a8.5 8.5 0 1 1-8.5-8.5'));
  assert.ok(svg.includes('circle cx="8.5" cy="11"'));
  assert.ok(svg.includes('circle cx="11" cy="16"'));
  assert.ok(!svg.includes('M20 12.2A8.2 8.2 0 1 1 11.8 4a3.2 3.2'));
});
