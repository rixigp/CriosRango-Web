'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const theme=path.resolve(__dirname,'../theme/crios-rango-2026'),read=p=>fs.readFileSync(path.join(theme,p),'utf8');
const controls=read('assets/css/controls.css'),assets=read('inc/assets.php'),wpLogin=read('assets/js/form-controls.js'),accountCss=read('assets/css/account.css'),checkoutCss=read('assets/css/checkout.css');
test('WALLET_ICON_BADGE_SINGLE_SOURCE=YES',()=>{const cart=read('assets/js/cart-ui.js'),loyalty=read('assets/js/account-loyalty.js');assert.match(cart,/cr-wallet-icon-badge cr-cart-wallet__icon/);assert.match(loyalty,/cr-wallet-icon-badge cr-account-loyalty__wallet-icon/);assert.match(controls,/\.cr-wallet-icon-badge\s*\{/);assert.match(controls,/--cr-wallet-badge-size:\s*38px/);});
test('CR_CONTROL_SHELL=YES; NATIVE_FIELDSET_LEGEND_NOTCH=YES; MATERIAL3_TRANSPARENT_SURFACE=YES',()=>{
  assert.match(controls,/\.cr-control-shell\s*\{[^}]*background:\s*transparent/s);
  assert.match(controls,/\.cr-control-shell\s*>\s*legend\s*\{[^}]*background:\s*var\(--cr-app-canvas/s);
  assert.match(controls,/\.cr-control-shell\s*>\s*legend\s*\{[^}]*font-size:\s*13px/s);
  assert.match(controls,/:root\s*\{[^}]*--cr-control-height:\s*58px;[^}]*--cr-control-radius:\s*4px;[^}]*--cr-control-select-radius:\s*3px/s);
  assert.match(controls,/:root\s*\{[^}]*--cr-control-background:\s*transparent/s);
  assert.match(wpLogin,/createElement\('fieldset'\)/); assert.match(wpLogin,/createElement\('legend'\)/); assert.match(wpLogin,/cr-control-shell/);
  assert.doesNotMatch(controls,/cr-control__box|cr-control__label/);
  assert.match(accountCss,/body\.woocommerce-account \.woocommerce-EditAccountForm > fieldset\s*\{/);
  assert.match(accountCss,/body\.woocommerce-account \.woocommerce-EditAccountForm > fieldset > legend\s*\{/);
});test('ALL_FORMS_CONSUME_ONE_CANONICAL_COMPONENT_AND_NATIVE_SELECT2',()=>{
  assert.match(assets,/wp_enqueue_script\(\s*'cr2026-form-controls'[\s\S]*?assets\/js\/form-controls\.js/);
  assert.match(wpLogin,/#loginform[\s\S]*#lostpasswordform[\s\S]*#resetpassform[\s\S]*#registerform/);
  assert.match(controls,/\.select2-selection--single/);
  assert.match(controls,/padding:\s*8px 16px\s*!important/);
  assert.match(controls,/padding:\s*8px 48px 8px 16px\s*!important/);
  assert.doesNotMatch(controls,/padding-block:\s*0\s*!important/);
  assert.match(controls,/form label :is\(\.required,span\.required/);
  assert.match(controls,/\.woocommerce-LostPassword a/);
  assert.match(controls,/--cr-brand-green,\s*var\(--cr-green-dark\)/);
  assert.match(controls,/\.cr-control-shell \.select2-selection__arrow/);
  assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row > label\s*\{/);
  assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row input\.input-text/);
  assert.doesNotMatch(accountCss,/woocommerce-EditAccountForm label/);
});test('GLOBAL_FORM_GEOMETRY_AND_REQUIRED_MARKERS_USE_ONE_CANONICAL_SOURCE',()=>{
  assert.match(controls,/\.cr-control-shell\s*\{[^}]*background:\s*transparent/s);
  assert.match(controls,/\.cr-control-shell input\[type="password"\][\s\S]*?padding:\s*8px 48px 8px 16px/s);
  assert.match(controls,/\.cr-control-shell \.show-password-input,[\s\S]*?top:\s*50%[\s\S]*?right:\s*16px[\s\S]*?transform:\s*translateY\(-50%\)/s);
  assert.match(controls,/\.cr-control-shell textarea\s*\{[^}]*padding:\s*8px 16px/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection--single\s*\{[^}]*align-items:\s*center/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__rendered\s*\{[^}]*padding:\s*8px 48px 8px 16px/s);
  assert.match(controls,/\.woocommerce form label > \.required[\s\S]*?display:\s*none/s);
  assert.doesNotMatch(wpLogin,/removeAttribute\(['"]required['"]\)|removeAttribute\(['"]aria-required['"]\)/);
  assert.doesNotMatch(wpLogin,/setAttribute\(['"]required['"]|setAttribute\(['"]aria-required['"]/);
  assert.match(controls,/.cr-control-shell__content select.select2-hidden-accessible\s*\{[^}]*overflow:\s*hidden\s*!important[^}]*clip:\s*rect\(0 0 0 0\)\s*!important[^}]*clip-path:\s*inset\(50%\)\s*!important/s);
});test('MATERIAL3_1_4_0_EFFECTIVE_WEB_GEOMETRY',()=>{
  assert.match(controls,/--cr-control-height:\s*58px/); assert.match(controls,/--cr-control-radius:\s*4px/);
  assert.match(controls,/--cr-control-select-radius:\s*3px/); assert.match(controls,/--cr-control-border:\s*#8A858A/);
  assert.match(controls,/--cr-control-border-focus:\s*#183B35/);
  assert.match(controls,/font-size:\s*16px\s*!important[\s\S]*?font-weight:\s*400\s*!important[\s\S]*?line-height:\s*24px\s*!important[\s\S]*?letter-spacing:\s*0\.5px\s*!important/s);
  assert.match(controls,/font-size:\s*13px/); assert.match(controls,/padding:\s*8px 16px\s*!important/);
  assert.match(controls,/padding:\s*8px 48px 8px 16px\s*!important/);
  assert.doesNotMatch(controls,/font:\s*400 15px\/48px|font:\s*300 11px\/16px|--cr-control-height:\s*48px|--cr-control-radius:\s*9px/);
});test('SELECTS_AND_SELECT2_SHARE_THE_16PX_INLINE_AXIS',()=>{
  assert.match(controls,/\.cr-control-shell select\s*\{[^}]*padding:\s*8px 48px 8px 16px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__rendered\s*\{[^}]*padding:\s*8px 48px 8px 16px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__arrow\s*\{[^}]*right:\s*16px\s*!important[^}]*width:\s*24px\s*!important/s);
  assert.match(controls,/billing_state_field[\s\S]*?border-radius:\s*var\(--cr-control-select-radius\)/);
  assert.match(controls,/billing_country_field[\s\S]*?border-radius:\s*var\(--cr-control-select-radius\)/);
});
test('PERSONAL_ACCOUNT_SHELL_EXCLUSION_AND_CONTENT_LAYER_IDEMPOTENCE_CONTRACT',()=>{
  const presentation=read('inc/account-presentation.php');
  assert.match(accountCss,/\.woocommerce-EditAccountForm > fieldset:not\(\.cr-control-shell\)\s*\{\s*display:\s*none\s*!important/s);
  assert.match(accountCss,/\.woocommerce-EditAccountForm fieldset:not\(\.cr-control-shell\)\s*\{\s*display:\s*none\s*!important/s);
  assert.doesNotMatch(accountCss,/\.woocommerce-EditAccountForm(?:\s*>|\s+)fieldset\s*\{\s*display:\s*none\s*!important/s);
  assert.match(presentation,/class="cr-account-birth-date__value"/);
  assert.match(presentation,/data-birth-date-source="wordpress-user-meta"/);
  assert.match(wpLogin,/row\.dataset\.crControl === 'true'/);
  assert.match(wpLogin,/alreadyCanonical\(row\)/);
  assert.match(wpLogin,/alreadyCanonical\(original\)/);
  assert.match(wpLogin,/content\.className = 'cr-control-shell__content'/);
  assert.match(wpLogin,/content\.appendChild\(original\)/);
  assert.match(wpLogin,/window\.cr2026EnhanceFormControls = enhance/);
  assert.match(controls,/\.cr-control-shell__content\s*\{[^}]*inset:\s*0;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*height:\s*100%/s);
  assert.match(controls,/\.cr-control-shell__content input[^{}]*\{[^}]*height:\s*24px\s*!important/s);
  assert.match(controls,/.cr-control-shell__content select:not\(.select2-hidden-accessible\)\s*\{[^}]*padding:\s*0 48px 0 16px\s*!important/s);
  assert.match(controls,/.cr-control-shell__content select.select2-hidden-accessible\s*\{[^}]*position:\s*absolute\s*!important[^}]*width:\s*1px\s*!important[^}]*height:\s*1px\s*!important/s);
  assert.match(controls,/\.cr-control-shell__content \.select2-selection__rendered\s*\{[^}]*height:\s*24px\s*!important/);
  assert.match(controls,/\.cr-control-shell__content input\[type="password"\][\s\S]*?padding:\s*0 48px 0 16px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.show-password-input\s*\{[^}]*top:\s*50%[^}]*right:\s*16px[^}]*translateY\(-50%\)/s);
});

test('PERSONAL_ENHANCER_THREE_PASSES_PRESERVE_ONE_NATIVE_NODE_PER_FIELD',()=>{
  const vm=require('node:vm');
  const makeNode=(tag,classes='')=>{
    const node={tagName:tag.toUpperCase(),className:classes,dataset:{},children:[],childNodes:[],parentNode:null,style:{},value:'',id:'',name:'',type:'',
      get firstChild(){return this.childNodes[0]||null;},
      get classList(){return {add:(name)=>{if(!this.className.split(/\s+/).includes(name))this.className=(this.className+' '+name).trim();}};},
      matches(selector){
        if(selector.includes('.woocommerce-input-wrapper'))return this.className.split(/\s+/).includes('woocommerce-input-wrapper');
        if(selector.includes('.password-input'))return this.className.split(/\s+/).includes('password-input');
        if(selector.includes('.wp-pwd'))return this.className.split(/\s+/).includes('wp-pwd');
        if(selector.includes('input:not')||selector==='input')return this.tagName==='INPUT';
        if(selector==='select')return this.tagName==='SELECT';
        if(selector==='textarea')return this.tagName==='TEXTAREA';
        if(selector.includes('.cr-control-shell__content'))return this.className.split(/\s+/).includes('cr-control-shell__content');
        if(selector.includes('.cr-control-shell'))return this.className.split(/\s+/).includes('cr-control-shell');
        if(selector.includes('.cr-account-birth-date'))return this.className.split(/\s+/).includes('cr-account-birth-date');
        if(selector.includes('description')||selector.includes('select2-container'))return false;
        if(selector.includes('woocommerce-form__label-for-checkbox')||selector.includes('woocommerce-form-login__rememberme')||selector.includes('[for='))return false;
        return false;
      },
      appendChild(child){if(child.parentNode){const p=child.parentNode;const i=p.childNodes.indexOf(child);if(i>=0)p.childNodes.splice(i,1);const j=p.children.indexOf(child);if(j>=0)p.children.splice(j,1);}child.parentNode=this;this.childNodes.push(child);if(child.tagName)this.children.push(child);return child;},
      append(...nodes){nodes.forEach(n=>this.appendChild(n));},
      insertBefore(child,before){if(child.parentNode){const p=child.parentNode;const i=p.childNodes.indexOf(child);if(i>=0)p.childNodes.splice(i,1);const j=p.children.indexOf(child);if(j>=0)p.children.splice(j,1);}child.parentNode=this;let i=this.childNodes.indexOf(before);if(i<0)i=this.childNodes.length;this.childNodes.splice(i,0,child);if(child.tagName){let k=this.children.indexOf(before);if(k<0)k=this.children.length;this.children.splice(k,0,child);}return child;},
      remove(){if(this.parentNode){const p=this.parentNode;p.childNodes=p.childNodes.filter(n=>n!==this);p.children=p.children.filter(n=>n!==this);this.parentNode=null;}},
      contains(target){return this===target||this.children.some(c=>c.contains(target));},
      closest(){return null;},
      querySelector(selector){const all=this.querySelectorAll(selector);return all[0]||null;},
      querySelectorAll(selector){const out=[];const visit=n=>n.children.forEach(c=>{if((selector===':scope > label'&&c.tagName==='LABEL')||(selector===':scope > .cr-account-birth-date__value'&&c.className.split(/\s+/).includes('cr-account-birth-date__value'))||c.matches(selector))out.push(c);visit(c);});visit(this);return out;}
    };return node;
  };
  const rows=[];
  const nativeInputs=[];
  for(const [id,name] of [['account_first_name','first_name'],['account_last_name','last_name'],['account_email','email']]){
    const row=makeNode('p','form-row');
    const label=makeNode('label');label.htmlFor=id;label.textContent=name;
    const wrapper=makeNode('span','woocommerce-input-wrapper');
    const input=makeNode('input');input.id=id;input.name=name;input.value='preserved-'+name;input.type='text';
    wrapper.appendChild(input);row.append(label,wrapper);rows.push(row);nativeInputs.push(input);
  }
  const birth=makeNode('p','form-row cr-account-birth-date');
  const birthLabel=makeNode('label');birthLabel.textContent='Fecha de nacimiento';
  const birthValue=makeNode('span','cr-account-birth-date__value');birthValue.textContent='03/02/1988';
  birth.append(birthLabel,birthValue);
  const document={
    readyState:'complete',body:makeNode('body'),
    createElement:tag=>makeNode(tag),
    querySelectorAll:selector=>selector==='#loginform, #lostpasswordform, #resetpassform, #registerform'?[]:[],
  };
  document.querySelectorAll=(selector)=>selector==='.cr-account-birth-date'?[birth]:selector.startsWith('form .form-row')?rows:[];
  const window={addEventListener(){},jQuery:null};
  const context={document,window,Node:{ELEMENT_NODE:1}};
  vm.runInNewContext(wpLogin,context);
  const count=(root,id)=>{let n=0;const visit=x=>{if(x.tagName==='INPUT'&&x.id===id)n++;x.children.forEach(visit);};visit(root);return n;};
  const shellCount=root=>{let n=0;const visit=x=>{if(x.className.split(/\s+/).includes('cr-control-shell'))n++;x.children.forEach(visit);};visit(root);return n;};
  for(let pass=1;pass<=3;pass++){
    if(pass>1)window.cr2026EnhanceFormControls();
    for(const id of ['account_first_name','account_last_name','account_email'])assert.equal(count(rows.find(r=>r.children.some(c=>c.querySelector&&c.querySelector('input')?.id===id)),id),1,'one native input after pass '+pass+': '+id);
    assert.equal(shellCount(birth),1,'one birthday shell after pass '+pass);
  }
  nativeInputs.forEach(input=>{assert.equal(input.value,'preserved-'+input.name);assert.equal(input.parentNode.parentNode.className,'cr-control-shell__content');});
  assert.equal(birthValue.parentNode.className,'cr-control-shell__content');
});
