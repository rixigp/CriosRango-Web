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
  // Defaults and automatic deploys must never select FULL.
  assert.match(deployWorkflow,/workflow_dispatch:[\\s\\S]*?default: INCREMENTAL[\\s\\S]*?options:[\\s\\S]*?- INCREMENTAL[\\s\\S]*?- FULL/);
  assert.match(deployWorkflow,/DEPLOY_MODE="INCREMENTAL"/);
  assert.match(deployWorkflow,/echo "DEFAULT_DEPLOY_MODE=INCREMENTAL"/);
  assert.match(deployWorkflow,/echo "FULL_DEPLOY_AUTOMATIC=NO"/);
  assert.match(deployWorkflow,/MANUAL_DEPLOY_MODE: \\$\\{\\{ github\\.event_name == 'workflow_dispatch' && inputs\\.deploy_mode \\|\\| 'INCREMENTAL' \\}\\}/);

  // FULL is an explicit workflow_dispatch choice, or the narrowly verified first deployment.
  assert.match(deployWorkflow,/if \\[ "\\$EVENT_NAME" = "workflow_dispatch" \\] && \\[ "\\$MANUAL_DEPLOY_MODE" = "FULL" \\]/);
  assert.match(deployWorkflow,/MANUAL_FULL_DEPLOY=YES/);
  assert.match(deployWorkflow,/FULL deploy selected: explicit manual FULL or confirmed first deployment only/);
  assert.match(deployWorkflow,/ROOT_LIST_EXIT=\\$\\?[\\s\\S]*?if \\[ "\\$ROOT_LIST_EXIT" -eq 0 \\] && \\[ ! -s "\\$REMOTE_LIST_FILE" \\]; then[\\s\\S]*?FIRST_DEPLOY_CONFIRMED=YES[\\s\\S]*?else[\\s\\S]*?BASELINE_STATUS="UNAVAILABLE"/);

  // Missing or invalid build.json, and an unavailable or divergent SHA, fail closed.
  assert.match(deployWorkflow,/REMOTE_SHA_MISSING_FORCES_FULL=NO/);
  assert.match(deployWorkflow,/REMOTE_SHA_MISSING_ABORTS_DEPLOY=YES/);
  assert.match(deployWorkflow,/if \\[ -z "\\$REMOTE_SHA" \\]; then[\\s\\S]*?BASELINE_STATUS="UNAVAILABLE"[\\s\\S]*?BASELINE_ERROR="invalid_or_unparseable_manifest"/);
  assert.match(deployWorkflow,/git merge-base --is-ancestor "\\$REMOTE_SHA" "\\$HEAD_SHA"/);
  assert.match(deployWorkflow,/REMOTE_SHA_IS_ANCESTOR=NO[\\s\\S]*?DEPLOY_ABORTED=YES[\\s\\S]*?FULL_DEPLOY=NO[\\s\\S]*?BASELINE_STATUS="UNAVAILABLE"/);
  assert.match(deployWorkflow,/if \\[ "\\$BASELINE_STATUS" = "UNAVAILABLE" \\]; then[\\s\\S]*?FAIL_CLOSED=YES[\\s\\S]*?DEPLOY_ABORTED=YES[\\s\\S]*?DEPLOY_MODE="ABORTED"[\\s\\S]*?UPLOAD_COUNT=0[\\s\\S]*?DELETE_COUNT=0[\\s\\S]*?exit 1/);
  assert.doesNotMatch(deployWorkflow,/remote_sha_not_ancestor_of_head[\\s\\S]{0,500}DEPLOY_MODE="FULL"/);

  // Incremental selection is based on the remote-SHA -> HEAD diff and runtime paths only.
  assert.match(deployWorkflow,/git diff --name-status -z --find-renames --find-copies \\\\[\\s\\S]*?"\\$REMOTE_SHA" "\\$HEAD_SHA" -- "\\$THEME_ROOT"/);
  assert.match(deployWorkflow,/if \\[ "\\$DEPLOY_MODE" = "INCREMENTAL" \\]; then[\\s\\S]*?done < "\\$DIFF_FILE"/);
  assert.match(deployWorkflow,/runtime_file\(\)[\\s\\S]*?build\\.json\\|README\\.md[\\s\\S]*?docs\/\\*[\\s\\S]*?tests\/\\*[\\s\\S]*?scripts\/\\*/);
  assert.match(deployWorkflow,/echo "UNCHANGED_FILES_UPLOADED=NO"/);
  assert.match(deployWorkflow,/echo "UNCHANGED_THEME_FILES_UPLOADED=NO"/);

  // Runtime transfers and verification must complete before build.json is written.
  const uploadAt=deployWorkflow.indexOf('echo "Uploading: $REL"');
  const deleteAt=deployWorkflow.indexOf('echo "Deleting remote: $REL"',uploadAt);
  const verifyAt=deployWorkflow.indexOf('# Verify every selected runtime upload');
  const transferVerifiedAt=deployWorkflow.indexOf('echo "RUNTIME_TRANSFER_VERIFICATION=PASS"');
  const manifestAt=deployWorkflow.indexOf('Uploading build.json last with HEAD_SHA=$HEAD_SHA');
  const verifyManifestAt=deployWorkflow.indexOf('REMOTE_BUILD_SHA_VERIFIED=');
  assert.ok(uploadAt>=0 && uploadAt<deleteAt && deleteAt<verifyAt && verifyAt<transferVerifiedAt &&
    transferVerifiedAt<manifestAt && manifestAt<verifyManifestAt,
    'required order: runtime uploads -> deletions -> runtime verification -> transfer verification -> build.json upload -> build.json verification');

  // CI validation is a read-only preview and exits before FTP transfer loops.
  assert.match(deployWorkflow,/CI_SCOPE: \\$\\{\\{ steps\\.impact\\.outputs\\.scope \\}\\}/);
  const previewAt=deployWorkflow.indexOf('if [ "$CI_SCOPE" = "CI_VALIDATION" ]; then');
  const ftpUploadAt=deployWorkflow.indexOf('for FILE in "${UPLOAD_FILES[@]}"; do',previewAt);
  assert.ok(previewAt>=0 && ftpUploadAt>previewAt);
  const preview=deployWorkflow.slice(previewAt,ftpUploadAt);
  assert.match(preview,/DEPLOY_MODE" != "INCREMENTAL"/);
  assert.match(preview,/REMOTE_SHA_IS_ANCESTOR" != "YES"/);
  assert.match(preview,/DEPLOY_STATUS=PREVIEW_ONLY/);
  assert.match(preview,/REMOTE_BUILD_JSON_UPDATED=NO/);
  assert.match(preview,/CI_DEPLOY_PREVIEW=PASS/);
  assert.match(preview,/exit 0/);
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
