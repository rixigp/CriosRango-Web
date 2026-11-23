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
  assert.match(deployWorkflow,/workflow_dispatch:[\s\S]*?default: INCREMENTAL[\s\S]*?options:[\s\S]*?- INCREMENTAL[\s\S]*?- FULL/);
  assert.match(deployWorkflow,/DEPLOY_MODE="INCREMENTAL"/);
  assert.match(deployWorkflow,/MANUAL_DEPLOY_MODE: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.deploy_mode \|\| 'INCREMENTAL' \}\}/);
  assert.match(deployWorkflow,/if \[ "\$EVENT_NAME" = "workflow_dispatch" \] && \[ "\$MANUAL_DEPLOY_MODE" = "FULL" \]/);
  assert.match(deployWorkflow,/MANUAL_FULL_DEPLOY=YES/);
  assert.match(deployWorkflow,/BASELINE_STATUS="UNAVAILABLE"[\s\S]*?FAIL_CLOSED=YES[\s\S]*?DEPLOY_ABORTED=YES[\s\S]*?DEPLOY_MODE="ABORTED"[\s\S]*?exit 1/);
  assert.match(deployWorkflow,/remote_sha_not_ancestor_of_head/);
  assert.doesNotMatch(deployWorkflow,/remote_sha_not_ancestor_of_head[\s\S]{0,500}DEPLOY_MODE="FULL"/);
  assert.match(deployWorkflow,/git diff --name-status -z --find-renames --find-copies[\s\S]*?"\$REMOTE_SHA" "\$HEAD_SHA" -- "\$THEME_ROOT"/);
  assert.match(deployWorkflow,/if \[ "\$DEPLOY_MODE" = "INCREMENTAL" \]; then[\s\S]*?done < "\$DIFF_FILE"/);
  assert.match(deployWorkflow,/FIRST_DEPLOY_CONFIRMED=YES/);
  assert.match(deployWorkflow,/ROOT_LIST_EXIT=\$\?[\s\S]*?\[ ! -s "\$REMOTE_LIST_FILE" \]/);
  assert.match(deployWorkflow,/FULL deploy selected: explicit manual FULL or confirmed first deployment only/);
  assert.match(deployWorkflow,/git merge-base --is-ancestor "\\$REMOTE_SHA" "\\$HEAD_SHA"/);
  assert.match(deployWorkflow,/REMOTE_SHA_IS_ANCESTOR=NO[\\s\\S]*?DEPLOY_ABORTED=YES[\\s\\S]*?FULL_DEPLOY=NO/);
  assert.match(deployWorkflow,/FULL_DEPLOY=NO/);
  assert.match(deployWorkflow,/REMOTE_BUILD_JSON_UPDATED=NO/);
  assert.match(deployWorkflow,/DEPLOY_STATUS=FAILED/);
  assert.match(deployWorkflow,/build.json\\|README\\.md/);
  const uploadAt=deployWorkflow.indexOf('for FILE in "${UPLOAD_FILES[@]}"; do');
  const deleteAt=deployWorkflow.indexOf('for FILE in "${DELETE_FILES[@]}"; do',uploadAt);
  const verifyAt=deployWorkflow.indexOf('# Verify every selected runtime upload');
  const manifestAt=deployWorkflow.indexOf('Uploading build.json last with HEAD_SHA=$HEAD_SHA');
  const verifyManifestAt=deployWorkflow.indexOf('REMOTE_BUILD_SHA_VERIFIED=');
  assert.ok(uploadAt>=0 && uploadAt<deleteAt && deleteAt<verifyAt && verifyAt<manifestAt && manifestAt<verifyManifestAt,
    'required order: runtime uploads -> deletions -> runtime verification -> build.json upload -> build.json verification');
  assert.doesNotMatch(deployWorkflow,/Production deploys retain the explicitly documented full-deploy policy/);
  console.log('PUSH_DEFAULTS_TO_INCREMENTAL=YES');
  console.log('REMOTE_SHA_MISSING_FORCES_FULL=NO');
  console.log('REMOTE_SHA_MISSING_ABORTS_DEPLOY=YES');
  console.log('UNCHANGED_THEME_FILES_UPLOADED=NO');
  console.log('MANUAL_FULL_DEPLOY_AVAILABLE=YES');
});
