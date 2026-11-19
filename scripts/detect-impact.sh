#!/usr/bin/env bash
set -euo pipefail
CHANGED=("$@"); [ "${#CHANGED[@]}" -gt 0 ] || exit 2
RUNTIME_FILES=(); TEST_FILES=(); WORKFLOW_FILES=(); OTHER_FILES=()
for p in "${CHANGED[@]}"; do case "$p" in tests/*) TEST_FILES+=("$p");; .github/workflows/*|scripts/*) WORKFLOW_FILES+=("$p");; theme/*) RUNTIME_FILES+=("$p");; *) OTHER_FILES+=("$p");; esac; done
RUNTIME_FILE_COUNT=${#RUNTIME_FILES[@]}; TEST_FILE_COUNT=${#TEST_FILES[@]}; WORKFLOW_FILE_COUNT=${#WORKFLOW_FILES[@]}; OTHER_FILE_COUNT=${#OTHER_FILES[@]}
DO_ACCOUNT=false; DO_HOME=false; DO_CATEGORY=false; DO_PRODUCT=false; DO_CHECKOUT=false; DO_SHARED=false; DO_CATALOG=false; DO_PHP=false
for p in "${RUNTIME_FILES[@]}"; do case "$p" in
theme/crios-rango-2026/assets/css/main.css|theme/crios-rango-2026/assets/css/visual-system.css|theme/crios-rango-2026/assets/css/controls.css|theme/crios-rango-2026/functions.php|theme/crios-rango-2026/inc/assets.php|theme/crios-rango-2026/inc/navigation.php|theme/crios-rango-2026/inc/*shell*|theme/crios-rango-2026/inc/*header*|theme/crios-rango-2026/inc/*sidebar*|theme/crios-rango-2026/inc/*navigation*|theme/crios-rango-2026/header.php|theme/crios-rango-2026/sidebar.php|theme/crios-rango-2026/navigation.php|theme/crios-rango-2026/template-parts/*header*|theme/crios-rango-2026/template-parts/*sidebar*|theme/crios-rango-2026/template-parts/*shell*|theme/crios-rango-2026/assets/css/*header*.css|theme/crios-rango-2026/assets/css/*sidebar*.css|theme/crios-rango-2026/assets/css/*shell*.css) DO_SHARED=true;;
theme/crios-rango-2026/woocommerce/myaccount/*|theme/crios-rango-2026/inc/account-*.php|theme/crios-rango-2026/assets/css/account.css|theme/crios-rango-2026/assets/js/account-*.js) DO_ACCOUNT=true;;
theme/crios-rango-2026/front-page.php|theme/crios-rango-2026/assets/css/home*.css|theme/crios-rango-2026/assets/js/home*.js) DO_HOME=true;;
theme/crios-rango-2026/woocommerce/single-product/*|theme/crios-rango-2026/woocommerce/content-single-product.php|theme/crios-rango-2026/assets/css/product-detail*.css|theme/crios-rango-2026/assets/js/product-*.js) DO_PRODUCT=true;;
theme/crios-rango-2026/woocommerce/archive-product.php|theme/crios-rango-2026/woocommerce/taxonomy-product_cat.php|theme/crios-rango-2026/woocommerce/content-product.php|theme/crios-rango-2026/inc/catalog-*|theme/crios-rango-2026/inc/product-query*|theme/crios-rango-2026/inc/*catalog*|theme/crios-rango-2026/assets/js/catalog*.js|theme/crios-rango-2026/assets/css/catalog*.css|theme/crios-rango-2026/woocommerce/loop/*) DO_CATALOG=true; DO_CATEGORY=true; DO_PRODUCT=true;;
theme/crios-rango-2026/assets/css/category*.css|theme/crios-rango-2026/assets/js/category*.js) DO_CATEGORY=true;;
theme/crios-rango-2026/woocommerce/cart/*|theme/crios-rango-2026/woocommerce/checkout/*|theme/crios-rango-2026/assets/css/checkout*.css|theme/crios-rango-2026/assets/js/checkout*.js) DO_CHECKOUT=true;;
*.php) DO_PHP=true; DO_SHARED=true;; *) DO_SHARED=true;; esac; done
DOMAIN_COUNT=0; for f in "$DO_ACCOUNT" "$DO_HOME" "$DO_CATEGORY" "$DO_PRODUCT" "$DO_CHECKOUT"; do [ "$f" = true ] && DOMAIN_COUNT=$((DOMAIN_COUNT+1)); done
FULL=false
if [ "$RUNTIME_FILE_COUNT" -eq 0 ] && [ "$WORKFLOW_FILE_COUNT" -eq 0 ] && [ "$TEST_FILE_COUNT" -gt 0 ] && [ "$OTHER_FILE_COUNT" -eq 0 ]; then SCOPE=TEST_ONLY
elif [ "$WORKFLOW_FILE_COUNT" -gt 0 ] && [ "$RUNTIME_FILE_COUNT" -eq 0 ] && [ "$OTHER_FILE_COUNT" -eq 0 ]; then SCOPE=CI_VALIDATION
elif [ "$OTHER_FILE_COUNT" -gt 0 ] || [ "$DOMAIN_COUNT" -gt 1 ]; then FULL=true; SCOPE=FULL
elif [ "$DO_SHARED" = true ]; then SCOPE=SHARED
elif [ "$DO_ACCOUNT" = true ]; then SCOPE=ACCOUNT
elif [ "$DO_HOME" = true ]; then SCOPE=HOME_ONLY
elif [ "$DO_CATEGORY" = true ]; then SCOPE=CATEGORY_ONLY
elif [ "$DO_PRODUCT" = true ]; then SCOPE=PRODUCT_DETAIL
elif [ "$DO_CHECKOUT" = true ]; then SCOPE=CHECKOUT_ONLY
else FULL=true; SCOPE=FULL; fi
if [ "$FULL" = true ]; then DO_ACCOUNT=true; DO_HOME=true; DO_CATEGORY=true; DO_PRODUCT=true; DO_CHECKOUT=true; DO_SHARED=true; DO_PHP=true; fi
RUN_CATALOG_BENCHMARK=false; if [ "$DO_CATALOG" = true ] || [ "$FULL" = true ]; then RUN_CATALOG_BENCHMARK=true; fi
RUN_GLOBAL_SHELL="$DO_SHARED"; if [ "$DO_ACCOUNT" = true ] || [ "$DO_CHECKOUT" = true ] || [ "$DO_PHP" = true ] || [ "$FULL" = true ]; then DO_PHP=true; fi
SELECTED_TESTS=(); if [ "$FULL" = false ]; then if [ "$SCOPE" = CI_VALIDATION ] && [ "$WORKFLOW_FILE_COUNT" -gt 0 ]; then SELECTED_TESTS+=(tests/impact-selector-contract.test.cjs); else for p in "${TEST_FILES[@]}"; do SELECTED_TESTS+=("$p"); done; case " ${SELECTED_TESTS[*]} " in *" tests/impact-selector-contract.test.cjs "*) SELECTED_TESTS+=(tests/canonical-page-toolbar-contract.test.cjs tests/global-mobile-shell-contract.test.cjs tests/catalog-contract.test.cjs);; esac; fi; fi
{
echo "base_sha=${BASE_SHA:-UNKNOWN}"; echo "head_sha=${HEAD_SHA:-UNKNOWN}"; echo "scope=$SCOPE"; echo "run_account=$DO_ACCOUNT"; echo "run_home=$DO_HOME"; echo "run_category=$DO_CATEGORY"; echo "run_product=$DO_PRODUCT"; echo "run_checkout=$DO_CHECKOUT"; echo "run_global_shell=$RUN_GLOBAL_SHELL"; echo "run_php=$DO_PHP"; echo "run_catalog_benchmark=$RUN_CATALOG_BENCHMARK"; echo "full_regression=$FULL"; echo "workflow_changed=$([ "$WORKFLOW_FILE_COUNT" -gt 0 ] && echo true || echo false)"; echo "run_account_browser=$DO_ACCOUNT"; echo "run_home_browser=$DO_HOME"; echo "run_category_browser=$DO_CATEGORY"; echo "run_product_browser=$DO_PRODUCT"; echo "run_checkout_browser=$DO_CHECKOUT"; echo "runtime_file_count=$RUNTIME_FILE_COUNT"; echo "test_file_count=$TEST_FILE_COUNT"; echo "workflow_file_count=$WORKFLOW_FILE_COUNT"; echo "other_file_count=$OTHER_FILE_COUNT"; echo "selected_test_files<<CRIOS_SELECTED_TESTS"; printf '%s\n' "${SELECTED_TESTS[@]}"; echo "CRIOS_SELECTED_TESTS"
} >> "${GITHUB_OUTPUT:-/dev/null}"
echo "RUNTIME_FILE_COUNT=$RUNTIME_FILE_COUNT"; echo "TEST_FILE_COUNT=$TEST_FILE_COUNT"; echo "WORKFLOW_FILE_COUNT=$WORKFLOW_FILE_COUNT"; echo "OTHER_FILE_COUNT=$OTHER_FILE_COUNT"; echo "DO_SHARED=$DO_SHARED"; echo "DO_CATALOG=$DO_CATALOG"; echo "DO_CATEGORY=$DO_CATEGORY"; echo "DO_PRODUCT=$DO_PRODUCT"; echo "DO_ACCOUNT=$DO_ACCOUNT"; echo "DO_HOME=$DO_HOME"; echo "DO_CHECKOUT=$DO_CHECKOUT"; echo "DOMAIN_COUNT=$DOMAIN_COUNT"; echo "FULL=$FULL"; echo "CI_SCOPE=$SCOPE"; echo "SELECTED_TEST_FILES=${SELECTED_TESTS[*]:-}"
