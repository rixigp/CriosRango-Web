const assert=require('node:assert/strict');const fs=require('node:fs');const{spawnSync}=require('node:child_process');const path=require('node:path');const test=require('node:test');const script=path.join(__dirname,'..','scripts','detect-impact.sh');function classify(files){const r=spawnSync('bash',[script,...files],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);return Object.fromEntries(r.stdout.trim().split(/\r?\n/).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));}
test('CASE_TEST_ONLY_TOOLBAR_FILES=TEST_ONLY',()=>{const r=classify(['tests/canonical-page-toolbar-contract.test.cjs','tests/global-mobile-shell-contract.test.cjs','tests/catalog-contract.test.cjs']);assert.equal(r.RUNTIME_FILE_COUNT,'0');assert.equal(r.TEST_FILE_COUNT,'3');assert.equal(r.WORKFLOW_FILE_COUNT,'0');for(const k of ['DO_SHARED','DO_CATALOG','DO_CATEGORY','DO_PRODUCT'])assert.equal(r[k],'false');assert.equal(r.FULL,'false');assert.equal(r.CI_SCOPE,'TEST_ONLY');console.log('CI_SCOPE_FOR_TEST_ONLY=TEST_ONLY');console.log('FULL=false');});
test('CASE_GLOBAL_MAIN_CSS=FULL_REGRESSION',()=>{const r=classify(['theme/crios-rango-2026/assets/css/main.css']);assert.equal(r.CI_SCOPE,'FULL');assert.equal(r.FULL,'true');for(const k of ['DO_SHARED','DO_ACCOUNT','DO_HOME','DO_CATEGORY','DO_PRODUCT','DO_CHECKOUT','DO_PHP'])assert.equal(r[k],'true',k);});
test('CASE_SHARED_RUNTIME_MAIN_CSS=FULL_OR_SHARED',()=>{const r=classify(['theme/crios-rango-2026/assets/css/main.css']);assert.ok(['FULL','SHARED'].includes(r.CI_SCOPE));assert.equal(r.DO_SHARED,'true');});
test('CASE_HELPERS_SHARED_RUNTIME=FULL_OR_SHARED',()=>{const r=classify(['theme/crios-rango-2026/inc/navigation.php']);assert.ok(['FULL','SHARED'].includes(r.CI_SCOPE));assert.equal(r.DO_SHARED,'true');});
test('CASE_PRODUCT_DETAIL_RUNTIME=PRODUCT_DETAIL',()=>{const r=classify(['theme/crios-rango-2026/assets/css/product-detail.css']);assert.equal(r.CI_SCOPE,'PRODUCT_DETAIL');assert.equal(r.DO_PRODUCT,'true');});
test('CASE_ACCOUNT_RUNTIME=ACCOUNT',()=>{const r=classify(['theme/crios-rango-2026/assets/css/account.css']);assert.equal(r.CI_SCOPE,'ACCOUNT');assert.equal(r.DO_ACCOUNT,'true');});
test('CASE_WORKFLOW_CHANGE=CI_VALIDATION',()=>{const r=classify(['.github/workflows/deploy.yml']);assert.equal(r.CI_SCOPE,'CI_VALIDATION');assert.equal(r.FULL,'false');});
test('TEST_FILE_NEVER_ACTIVATES_RUNTIME_DOMAIN=PASS',()=>{const r=classify(['tests/account-password-contract.test.cjs']);for(const k of ['DO_ACCOUNT','DO_HOME','DO_CATEGORY','DO_PRODUCT','DO_CHECKOUT','DO_SHARED','DO_CATALOG'])assert.equal(r[k],'false',k);});
test('TEST_ONLY_DOMAIN_COUNT_DOES_NOT_FORCE_FULL=PASS',()=>{const r=classify(['tests/canonical-page-toolbar-contract.test.cjs','tests/global-mobile-shell-contract.test.cjs','tests/catalog-contract.test.cjs']);assert.equal(r.DOMAIN_COUNT,'0');assert.equal(r.FULL,'false');});
test('impact-selector tests select the six toolbar contracts',()=>{const r=classify(['tests/impact-selector-contract.test.cjs']);for(const p of ['tests/canonical-page-toolbar-contract.test.cjs','tests/global-mobile-shell-contract.test.cjs','tests/catalog-contract.test.cjs'])assert.ok(r.SELECTED_TEST_FILES.includes(p),p);});

const deployWorkflow=fs.readFileSync(path.join(__dirname,'..','.github','workflows','deploy.yml'),'utf8');
test('DEPLOY_DEFAULTS_INCREMENTAL_FAIL_CLOSED_AND_MANUAL_FULL_ONLY=PASS',()=>{
  const has = value => assert.ok(deployWorkflow.includes(value), `missing workflow contract: ${value}`);
  const between = (from, to) => {
    const a=deployWorkflow.indexOf(from), b=deployWorkflow.indexOf(to,a);
    assert.ok(a>=0 && b>a, `missing ordered workflow section: ${from}`);
    return deployWorkflow.slice(a,b);
  };

  // Default mode and FULL selection.
  has('default: INCREMENTAL');
  has('          - INCREMENTAL');
  has('          - FULL');
  has('DEPLOY_MODE="INCREMENTAL"');
  has('echo "DEFAULT_DEPLOY_MODE=INCREMENTAL"');
  has('echo "FULL_DEPLOY_AUTOMATIC=NO"');
  has("MANUAL_DEPLOY_MODE: ${{ github.event_name == 'workflow_dispatch' && inputs.deploy_mode || 'INCREMENTAL' }}");
  has('if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ "$MANUAL_DEPLOY_MODE" = "FULL" ]; then');
  has('echo "MANUAL_FULL_DEPLOY=YES"');

  // Missing manifest: FULL only after a successful listing proves the remote theme is empty.
  has('REMOTE_SHA_MISSING_FORCES_FULL=NO');
  has('REMOTE_SHA_MISSING_ABORTS_DEPLOY=YES');
  const firstDeploy=between('ROOT_LIST_EXIT=$?', 'rm -f "$REMOTE_LIST_FILE"');
  assert.ok(firstDeploy.includes('if [ "$ROOT_LIST_EXIT" -eq 0 ] && [ ! -s "$REMOTE_LIST_FILE" ]; then'));
  assert.ok(firstDeploy.includes('DEPLOY_MODE="FULL"'));
  assert.ok(firstDeploy.includes('echo "FIRST_DEPLOY_CONFIRMED=YES"'));
  assert.ok(firstDeploy.includes('else'));
  assert.ok(firstDeploy.includes('BASELINE_STATUS="UNAVAILABLE"'));

  // Invalid manifest and divergent/unavailable remote SHAs fail closed.
  const invalidSha=between('if [ -z "$REMOTE_SHA" ]; then','else\n                BASELINE_STATUS="VALID"');
  assert.ok(invalidSha.includes('BASELINE_STATUS="UNAVAILABLE"'));
  assert.ok(invalidSha.includes('BASELINE_ERROR="invalid_or_unparseable_manifest"'));
  has('elif ! git merge-base --is-ancestor "$REMOTE_SHA" "$HEAD_SHA"; then');
  const divergent=between('elif ! git merge-base --is-ancestor "$REMOTE_SHA" "$HEAD_SHA"; then','elif ! git diff --name-status');
  assert.ok(divergent.includes('REMOTE_SHA_IS_ANCESTOR=NO'));
  assert.ok(divergent.includes('DEPLOY_ABORTED=YES'));
  assert.ok(divergent.includes('FULL_DEPLOY=NO'));
  assert.ok(divergent.includes('BASELINE_STATUS="UNAVAILABLE"'));
  const failClosed=between('if [ "$BASELINE_STATUS" = "UNAVAILABLE" ]; then','if [ "$DEPLOY_MODE" = "INCREMENTAL" ]; then');
  for (const value of ['FAIL_CLOSED=YES','DEPLOY_ABORTED=YES','DEPLOY_MODE="ABORTED"','UPLOAD_COUNT=0','DELETE_COUNT=0','exit 1']) assert.ok(failClosed.includes(value),value);

  // Incremental mode considers only changed paths and filters non-runtime files.
  has('git diff --name-status -z --find-renames --find-copies');
  has('"$REMOTE_SHA" "$HEAD_SHA" -- "$THEME_ROOT"');
  const runtimeFilter=between('runtime_file() {','  UPLOAD_FILES=()');
  for (const value of ['build.json|README.md','docs/*','tests/*','scripts/*']) assert.ok(runtimeFilter.includes(value),value);
  const incremental=between('if [ "$DEPLOY_MODE" = "INCREMENTAL" ]; then','else\n            echo "FULL deploy selected:');
  assert.ok(incremental.includes('done < "$DIFF_FILE"'));
  has('echo "UNCHANGED_FILES_UPLOADED=NO"');
  has('echo "UNCHANGED_THEME_FILES_UPLOADED=NO"');

  // Runtime uploads/deletions and their verification precede build.json.
  const uploadAt=deployWorkflow.indexOf('echo "Uploading: $REL"');
  const deleteAt=deployWorkflow.indexOf('echo "Deleting remote: $REL"',uploadAt);
  const verifyAt=deployWorkflow.indexOf('# Verify every selected runtime upload');
  const transferVerifiedAt=deployWorkflow.indexOf('echo "RUNTIME_TRANSFER_VERIFICATION=PASS"');
  const manifestAt=deployWorkflow.indexOf('Uploading build.json last with HEAD_SHA=$HEAD_SHA');
  const verifyManifestAt=deployWorkflow.indexOf('REMOTE_BUILD_SHA_VERIFIED=');
  assert.ok(uploadAt>=0 && uploadAt<deleteAt && deleteAt<verifyAt && verifyAt<transferVerifiedAt &&
    transferVerifiedAt<manifestAt && manifestAt<verifyManifestAt,
    'required order: runtime uploads -> deletions -> runtime verification -> transfer verification -> build.json upload -> build.json verification');

  // CI validation is read-only and exits before the FTP upload loop.
  has('CI_SCOPE: ${{ steps.impact.outputs.scope }}');
  const previewAt=deployWorkflow.indexOf('if [ "$CI_SCOPE" = "CI_VALIDATION" ]; then');
  const ftpUploadAt=deployWorkflow.indexOf('for FILE in "${UPLOAD_FILES[@]}"; do',previewAt);
  assert.ok(previewAt>=0 && ftpUploadAt>previewAt);
  const preview=deployWorkflow.slice(previewAt,ftpUploadAt);
  for (const value of ['DEPLOY_MODE" != "INCREMENTAL"','REMOTE_SHA_IS_ANCESTOR" != "YES"',
    'DEPLOY_STATUS=PREVIEW_ONLY','REMOTE_BUILD_JSON_UPDATED=NO','CI_DEPLOY_PREVIEW=PASS','exit 0']) assert.ok(preview.includes(value),value);

  console.log('DEFAULT_DEPLOY_MODE=INCREMENTAL');
  console.log('AUTOMATIC_FULL=NO');
  console.log('REMOTE_SHA_MISSING_WITH_REMOTE_FILES=ABORT');
  console.log('REMOTE_SHA_INVALID=ABORT');
  console.log('REMOTE_SHA_DIVERGENT=ABORT');
  console.log('MANUAL_FULL_ONLY=YES');
  console.log('FIRST_DEPLOY_FULL_ONLY_IF_REMOTE_THEME_EMPTY=YES');
  console.log('UNCHANGED_RUNTIME_FILES_UPLOADED=NO');
  console.log('BUILD_JSON_AFTER_RUNTIME_TRANSFER=YES');
});
