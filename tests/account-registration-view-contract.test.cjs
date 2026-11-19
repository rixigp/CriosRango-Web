const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const template = read('theme/crios-rango-2026/woocommerce/myaccount/form-login.php');
const woocommerce = read('theme/crios-rango-2026/inc/woocommerce.php');

test('ACCOUNT_LOGIN_VIEW_CONTAINS_LOGIN_ONLY_AND_SEPARATE_CREATE_ACCOUNT_CTA', () => {
  const registerBranch = template.indexOf('<?php if ( $is_register_view ) : ?>');
  const registerForm = template.indexOf('<form method="post" class="woocommerce-form woocommerce-form-register register cr-account-register"');
  const loginBranch = template.lastIndexOf('<?php else : ?>');
  const loginForm = template.indexOf('<form class="woocommerce-form woocommerce-form-login login"');

  assert.ok(registerBranch >= 0 && registerForm > registerBranch, 'native registration form is inside the registration-view branch');
  assert.ok(loginBranch > registerForm && loginForm > loginBranch, 'login form is rendered only by the alternate branch');
  assert.doesNotMatch(template, /id="customer_login"|u-columns col2-set|u-column1 col-1/, 'legacy combined login/register wrapper is absent');
  assert.match(template, /cr-account-register-cta__button/);
  assert.match(template, /add_query_arg\( 'cr-account-view', 'register', wc_get_page_permalink\( 'myaccount' \) \)/);
});

test('ACCOUNT_REGISTRATION_VIEW_RETAINS_ALL_REQUESTED_FIELDS', () => {
  for (const field of ['first_name', 'last_name', 'email', 'phone', 'birthday', 'password', 'password_confirmation']) {
    assert.match(template, new RegExp('name="' + field + '"'), field);
  }
  assert.match(template, /type="tel"[^>]*name="phone"|name="phone"[^>]*type="tel"/);
  assert.match(template, /name="register"/);
  assert.match(template, /woocommerce-register-nonce/);
});

test('WOOCOMMERCE_NATIVE_REGISTRATION_IS_ENABLED_ONLY_ON_THE_REGISTER_VIEW_OR_POST', () => {
  const start = woocommerce.indexOf('function cr2026_account_is_registration_request');
  const end = woocommerce.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start);
  const request = woocommerce.slice(start, end);
  assert.match(request, /cr2026_account_guest_register_view\(\)/);
  assert.match(request, /isset\( \$_POST\['register'\], \$_POST\['woocommerce-register-nonce'\] \)/);

  const optionStart = woocommerce.indexOf('function cr2026_account_registration_native_options');
  const optionEnd = woocommerce.indexOf('\n}', optionStart) + 2;
  assert.ok(optionStart >= 0 && optionEnd > optionStart);
  const option = woocommerce.slice(optionStart, optionEnd);
  assert.match(option, /return cr2026_account_is_registration_request\(\) \? 'yes' : 'no';/);
  assert.match(woocommerce, /add_filter\( 'pre_option_woocommerce_enable_myaccount_registration', 'cr2026_account_registration_native_options', 1 \)/);
});

test('ACCOUNT_REGISTRATION_ONLY_IMPACT_SELECTS_TARGETED_VALIDATION', () => {
  const detector = path.join(root, 'scripts/detect-impact.sh');
  const changed = [
    'theme/crios-rango-2026/inc/woocommerce.php',
    'theme/crios-rango-2026/woocommerce/myaccount/form-login.php',
  ];
  const result = spawnSync('bash', [detector, ...changed], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const values = Object.fromEntries(result.stdout.trim().split(/\r?\n/).map((line) => {
    const at = line.indexOf('=');
    return [line.slice(0, at), line.slice(at + 1)];
  }));
  assert.equal(values.ACCOUNT_REGISTRATION_ONLY, 'true');
  assert.equal(values.CI_SCOPE, 'ACCOUNT');
  assert.equal(values.DO_ACCOUNT, 'true');
  assert.equal(values.DO_SHARED, 'false');
  assert.equal(values.DO_PHP, 'true');
});
