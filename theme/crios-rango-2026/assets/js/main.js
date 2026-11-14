(() => {
  'use strict';

  const toggleFacetSelection = (selected, termIds) => {
    const ids = termIds.map(String);
    return ids.some(id => selected.includes(id))
      ? selected.filter(id => !ids.includes(id))
      : selected.concat(ids.filter(id => !selected.includes(id)));
  };
  const sameOrderedIds = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((id, index) => String(id) === String(right[index]));
  const CATALOG_SESSION_CACHE_VERSION = 1;
  const CATALOG_SESSION_CACHE_TTL_MS = 300000;
  const normalizeCatalogCacheState = state => {
    const normalized = { ...state };
    if (normalized.filters && typeof normalized.filters === 'object') {
      normalized.filters = Object.fromEntries(Object.keys(normalized.filters).sort().map(key => [key, Array.from(new Set((normalized.filters[key] || []).map(String).filter(Boolean))).sort((a,b) => a.localeCompare(b,'en',{numeric:true}))]));
    }
    if (Array.isArray(normalized.outletOriginIds)) normalized.outletOriginIds = Array.from(new Set(normalized.outletOriginIds.map(Number).filter(Number.isInteger))).sort((a,b) => a-b);
    return normalized;
  };
  const catalogCacheKey = state => 'cr2026_catalog_v1:' + encodeURIComponent(JSON.stringify(normalizeCatalogCacheState(state)));
  const isValidCatalogCacheEntry = (entry, key, now = Date.now()) => Boolean(
    entry && entry.version === CATALOG_SESSION_CACHE_VERSION && entry.key === key &&
    Number.isFinite(Number(entry.timestamp)) && Number(entry.timestamp) > 0 &&
    now - Number(entry.timestamp) >= 0 && now - Number(entry.timestamp) < CATALOG_SESSION_CACHE_TTL_MS &&
    Number.isInteger(entry.page) && entry.page >= 1 && Array.isArray(entry.pages) &&
    entry.pages.length === entry.page && entry.payload && typeof entry.payload.html === 'string'
  );
  window.CR2026CatalogState = { toggleFacetSelection, sameOrderedIds, catalogCacheKey, isValidCatalogCacheEntry, CATALOG_SESSION_CACHE_VERSION, CATALOG_SESSION_CACHE_TTL_MS };

  const menuButton = document.querySelector('[data-cr-menu-toggle]');
  const mobileMenu = document.querySelector('[data-cr-mobile-menu]');

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      mobileMenu.hidden = open;
      document.documentElement.classList.toggle('cr-menu-open', !open);
    });
  }

  // Global product search panel: keep the existing WooCommerce searchform contract.
  const headerSearchToggle = document.querySelector('[data-cr-header-search-toggle]');
  const headerSearchPanel = document.querySelector('[data-cr-header-search-panel]');
  const headerSearchInput = headerSearchPanel ? headerSearchPanel.querySelector('#cr-search-field') : null;
  const headerSearchForm = headerSearchPanel ? headerSearchPanel.querySelector('form.cr-search-form') : null;
  const headerSearchClose = headerSearchPanel ? headerSearchPanel.querySelector('[data-cr-header-search-close]') : null;

  const closeHeaderSearch = (returnFocus = true) => {
    if (!headerSearchToggle || !headerSearchPanel) return;
    headerSearchPanel.hidden = true;
    headerSearchToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) headerSearchToggle.focus({ preventScroll: true });
  };
  const openHeaderSearch = () => {
    if (!headerSearchToggle || !headerSearchPanel || !headerSearchInput) return;
    headerSearchPanel.hidden = false;
    headerSearchToggle.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(() => headerSearchInput.focus({ preventScroll: true }));
  };
  const toggleHeaderSearch = () => {
    if (!headerSearchPanel) return;
    if (headerSearchPanel.hidden) openHeaderSearch();
    else closeHeaderSearch(false);
  };
  if (headerSearchToggle && headerSearchPanel && headerSearchInput && headerSearchForm) {
    headerSearchToggle.addEventListener('click', toggleHeaderSearch);
    if (headerSearchClose) headerSearchClose.addEventListener('click', () => closeHeaderSearch(true));
    headerSearchForm.addEventListener('submit', (event) => {
      if (headerSearchInput.value.trim() === '') {
        event.preventDefault();
        headerSearchInput.focus({ preventScroll: true });
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !headerSearchPanel.hidden) closeHeaderSearch(true);
    });
  }

  // Search field clear control: clear the current query without submitting an empty search.
  document.querySelectorAll('form.cr-search-form [data-cr-search-clear]').forEach((clearButton) => {
    const form = clearButton.closest('form');
    const input = form ? form.querySelector('input[type="search"][name="s"]') : null;
    if (!input) return;
    const syncClearState = () => clearButton.hidden = input.value.length === 0;
    syncClearState();
    input.addEventListener('input', syncClearState);
    clearButton.addEventListener('click', () => {
      input.value = '';
      syncClearState();
      input.focus({ preventScroll: true });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });



  // Search submits keep native navigation but expose immediate, duplicate-submit-safe feedback.
  const searchSubmitForms = Array.from(document.querySelectorAll('body.search form.cr-search-form'));
  const resetSearchSubmitStates = () => {
    searchSubmitForms.forEach((form) => {
      const button = form.querySelector('button[type="submit"]');
      if (!button) return;
      button.textContent = button.dataset.crOriginalSubmitLabel || 'Buscar';
      button.disabled = false;
      button.classList.remove('is-loading');
      button.setAttribute('aria-busy', 'false');
      form.setAttribute('aria-busy', 'false');
      delete form.dataset.crSearchSubmitting;
    });
  };
  searchSubmitForms.forEach((form) => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.dataset.crOriginalSubmitLabel = button.textContent.trim() || 'Buscar';
    form.addEventListener('submit', (event) => {
      if (event.defaultPrevented) return;
      if (form.dataset.crSearchSubmitting === 'true') {
        event.preventDefault();
        return;
      }
      form.dataset.crSearchSubmitting = 'true';
      form.setAttribute('aria-busy', 'true');
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Buscando…';
    });
  });
  window.addEventListener('pageshow', resetSearchSubmitStates);

  // Native WooCommerce logout URL/nonce remains the navigation target; only its immediate presentation changes.
  const logoutLinks = Array.from(document.querySelectorAll('.cr-account-profile-home__action--logout'));
  const resetLogoutStates = () => {
    logoutLinks.forEach((link) => {
      const icon = link.querySelector('.cr-account-profile-home__action-icon');
      const label = link.querySelector(':scope > span:nth-child(2)');
      if (icon && typeof link.dataset.crOriginalLogoutIcon === 'string') icon.innerHTML = link.dataset.crOriginalLogoutIcon;
      if (label && link.dataset.crOriginalLogoutLabel) label.textContent = link.dataset.crOriginalLogoutLabel;
      link.classList.remove('is-loading');
      link.setAttribute('aria-busy', 'false');
      link.removeAttribute('aria-disabled');
      delete link.dataset.crLogoutLoading;
    });
  };
  logoutLinks.forEach((link) => {
    const icon = link.querySelector('.cr-account-profile-home__action-icon');
    const label = link.querySelector(':scope > span:nth-child(2)');
    if (icon) link.dataset.crOriginalLogoutIcon = icon.innerHTML;
    if (label) link.dataset.crOriginalLogoutLabel = label.textContent.trim();
    link.addEventListener('click', (event) => {
      if (link.dataset.crLogoutLoading === 'true') {
        event.preventDefault();
        return;
      }
      link.dataset.crLogoutLoading = 'true';
      link.classList.add('is-loading');
      link.setAttribute('aria-busy', 'true');
      link.setAttribute('aria-disabled', 'true');
      if (label) label.textContent = 'Cerrando sesión…';
      if (icon) icon.innerHTML = '<span class="cr-account-logout-spinner" aria-hidden="true"></span>';
    });
  });
  window.addEventListener('pageshow', resetLogoutStates);

  const slides = Array.from(document.querySelectorAll('[data-cr-hero-slide]'));
  if (slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let index = 0;
    window.setInterval(() => {
      slides[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
    }, 3500);
  }


  // Remove the Home logo's circular surface once the Hero leaves the viewport.
  const homeHero = document.querySelector('.cr-app-hero');
  if (homeHero && document.body.classList.contains('home')) {
    if ('IntersectionObserver' in window) {
      const homeHeroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          document.body.classList.toggle('cr-home-hero-out', !entry.isIntersecting);
        });
      }, { rootMargin: '0px 0px -90% 0px', threshold: 0 });
      homeHeroObserver.observe(homeHero);
    }
  }

  const brandPager = document.querySelector('[data-cr-brand-pager]');
  const brandPages = brandPager ? Array.from(brandPager.querySelectorAll('[data-cr-brand-page]')) : [];
  const brandDots = Array.from(document.querySelectorAll('[data-cr-brand-dot]'));

  if (brandPager && brandPages.length > 1 && brandDots.length === brandPages.length) {
    const setActiveBrandPage = (index) => {
      brandDots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };

    brandDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.getAttribute('data-cr-brand-dot'));
        const page = brandPages[index];
        if (page) brandPager.scrollTo({ left: page.offsetLeft - brandPager.offsetLeft, behavior: 'smooth' });
      });
    });

    if ('IntersectionObserver' in window) {
      const pageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = brandPages.indexOf(entry.target);
            if (index >= 0) setActiveBrandPage(index);
          }
        });
      }, { root: brandPager, threshold: 0.6 });
      brandPages.forEach((page) => pageObserver.observe(page));
    } else {
      brandPager.addEventListener('scroll', () => {
        const pageWidth = brandPager.clientWidth || 1;
        setActiveBrandPage(Math.min(brandPages.length - 1, Math.round(brandPager.scrollLeft / pageWidth)));
      }, { passive: true });
    }
  }


  // Dependent facets: one parallel base prefetch and contextual, cached recalculations.
  const filterSheet = document.querySelector('[data-cr-filter-sheet]');
  if (filterSheet) {
    const categoryId = String(filterSheet.dataset.categoryId || 'root');
    const brandContext = filterSheet.dataset.context === 'brand';
    const catalogBrandId = String(filterSheet.dataset.catalogBrandId || '');
    if (brandContext && !/^[1-9][0-9]*$/.test(catalogBrandId)) throw new Error('Brand filter context has no valid product_brand term ID.');
    const apiUrl = filterSheet.dataset.apiUrl;
    let termLabels = {};
    try { termLabels = JSON.parse(filterSheet.dataset.termLabels || '{}'); } catch (error) {}
    const dimensions = brandContext ? ['sizes', 'colors'] : ['sizes', 'colors', 'brands'];
    const apiKeys = {sizes:'size_ids',colors:'color_ids',brands:'brand_ids'};
    const taxonomies = {sizes:'pa_tallas',colors:'pa_color',brands:'product_tag'};
    const initialKeys = {sizes:'initialSizes',colors:'initialColors',brands:'initialBrands'};
    const ttl = 300000, storageKey = brandContext ? 'cr2026_filters_v2_brand_' + catalogBrandId : 'cr2026_filters_v2_category_' + categoryId;
    try { sessionStorage.removeItem('cr2026_filters_v1_category_' + categoryId); } catch (error) {}
    const memoryCache = window.categoryFacetCacheV2 || (window.categoryFacetCacheV2 = Object.create(null));
    const collator = new Intl.Collator('es',{sensitivity:'base'});
    const normalize = value => String(value||'').trim().normalize('NFC').toLocaleLowerCase('es');
    const sortIds = values => Array.from(new Set((values||[]).map(String).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const outletScope=filterSheet.dataset.scope==='outlet';
    const outletContext=()=>window.CR2026CatalogListing&&window.CR2026CatalogListing.getOutletContext?window.CR2026CatalogListing.getOutletContext():{categoryId:Number(filterSheet.dataset.outletCategoryId||0),originCategoryIds:[]};
    const cacheKey=(facet,state)=>{const context=outletScope?outletContext():null;return [brandContext?'brand:'+catalogBrandId:categoryId,filterSheet.dataset.scope||'catalog',context?context.categoryId:0,context?context.originCategoryIds.join(','):'',facet,...dimensions.filter(d=>d!==facet).map(d=>d+':'+sortIds(state[d]).join(','))].join('|');};
    const isValid = value => value && Number(value.timestamp)>0 && Date.now()-Number(value.timestamp)<ttl;
    const readStore = key => {try{const value=JSON.parse(sessionStorage.getItem(key)||'null');return isValid(value)?value:null;}catch(error){return null;}};
    const writeStore = (key,value) => {memoryCache[key]=value;try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}};
    const draft = {sizes:[],colors:[],brands:[]};
    let baseFacets=null, activeDimension='sizes', rowsByDimension={sizes:[],colors:[],brands:[]}, facetAvailability={sizes:null,colors:null,brands:null}, savedScrollY=0;
    let generation=0, debounceTimer=null, activeControllers=[];
    let prefetchControllers=[], prefetchIdleHandle=null, prefetchTimer=null, prefetchStarted=false;
    const optionsNode=filterSheet.querySelector('[data-cr-filter-options]');
    const dialog=filterSheet.querySelector('.cr-category-filter-sheet__dialog');
    const openButtons=Array.from(document.querySelectorAll('[data-cr-filter-open]'));
    window.CR2026CatalogFacetContextChanged=()=>{if((outletScope||brandContext)&&!filterSheet.hidden)scheduleDependentRefresh(null);};
    const facetEndpoint = async (facet,state,signal) => {
      const key=cacheKey(facet,state), cached=memoryCache[key]||readStore(storageKey+'|'+key);
      if(cached){memoryCache[key]=cached;return cached.rows;}
      const params=new URLSearchParams({scope:filterSheet.dataset.scope||'catalog',facet,page:'1',per_page:'1'});
      if(outletScope){const context=outletContext();if(!context.categoryId)throw new Error('Outlet facet context has no active branch.');params.set('outlet_category_id',String(context.categoryId));if(context.originCategoryIds.length)params.set('origin_category_ids',context.originCategoryIds.join(','));}
      else if(brandContext)params.set('catalog_brand_id',catalogBrandId);
      else if(categoryId!=='root')params.set('catalog_category_id',categoryId);
      dimensions.forEach(d=>{if(d!==facet&&state[d].length)params.set(apiKeys[d],sortIds(state[d]).join(','));});
      
      const response=await fetch(apiUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'},signal});
      if(!response.ok)throw new Error('Filter API HTTP '+response.status);
      const payload=await response.json(), facets=payload&&payload.facets||{};
      const raw=Array.isArray(facets[facet])?facets[facet]:(Array.isArray(facets[facet==='colors'?'colors':facet])?facets[facet]:[]);
      const rows=rowsFor(raw,facet);
      
      writeStore(storageKey+'|'+key,{timestamp:Date.now(),rows});
      return rows;
    };
    const rowsFor = (facet,dimension) => {
      const grouped=new Map(),taxonomy=taxonomies[dimension];
      (Array.isArray(facet)?facet:[]).forEach(item=>{
        const id=String(item&&item.term_id||'');if(!id)return;
        const meta=termLabels[taxonomy]&&termLabels[taxonomy][id];
        let label=meta&&meta.label?String(meta.label).trim():'';
        if(!label){label=String(item.label||item.name||item.slug||('Opción '+id)).trim();console.warn('[Críos&Rango filtros] Term ID sin metadata resoluble; fallback label:',{dimension,term_id:id,label});}
        if(!label)label='Opción '+id;
        const key=normalize(label);
        if(!grouped.has(key))grouped.set(key,{label,slug:(meta&&meta.slug)||item.slug||'',term_ids:[],count:0});
        const row=grouped.get(key);row.term_ids.push(id);row.count+=Number(item.count)||0;
      });
      const rows=Array.from(grouped.values()).map(row=>({...row,term_ids:sortIds(row.term_ids)}));
      if(dimension==='sizes'){
        const order=['XXS','2XS','XS','S','SM','M','ML','L','XL','XXL','2XL','XXXL','3XL','4XL','5XL','UNICA','ÚNICA','TU'];
        const key=label=>{const s=label.trim().toLocaleUpperCase('es'),n=s.match(/^([0-9]+(?:[.,][0-9]+)?)$/);return n?[0,Number(n[1].replace(',','.')),s]:[1,order.indexOf(s)<0?order.length:order.indexOf(s),s];};
        rows.sort((a,b)=>{const x=key(a.label),y=key(b.label);return x[0]-y[0]||x[1]-y[1]||collator.compare(x[2],y[2]);});
      }else rows.sort((a,b)=>collator.compare(a.label,b.label));
      return rows;
    };
    const updateFilterCounters = () => {
      filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>{
        const dimension=button.dataset.crFilterTab;
        const count=draft[dimension] ? draft[dimension].length : 0;
        const label=dimension==='sizes'?'Talla':dimension==='colors'?'Color':'Marca';
        button.textContent=count?label+' ('+count+')':label;
      });
    };
    const publishLiveFilters = () => {
      updateFilterCounters();
      if(window.CR2026CatalogListing)window.CR2026CatalogListing.applyFilters({size_ids:draft.sizes.slice(),color_ids:draft.colors.slice(),brand_ids:draft.brands.slice()});
    };
    const render = dimension => {
      updateFilterCounters();
      const rows=rowsByDimension[dimension]||[];optionsNode.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.className='cr-category-filter-sheet__empty';empty.textContent='No hay opciones disponibles.';optionsNode.appendChild(empty);return;}
      rows.forEach(row=>{
        const selected=row.term_ids.some(id=>draft[dimension].includes(id));
        const available=facetAvailability[dimension];
        const enabled=!available||row.term_ids.some(id=>available.has(id))||selected;
        const chip=document.createElement('button');chip.type='button';chip.disabled=!enabled;chip.className='cr-category-filter-sheet__option'+(selected?' is-selected':'');chip.setAttribute('aria-pressed',String(selected));chip.setAttribute('aria-label',row.label);
        if(dimension==='colors'){
          const swatch=document.createElement('span');swatch.className='cr-category-filter-sheet__swatch';swatch.setAttribute('aria-hidden','true');
          const swatches={azul:'#4B78B8','azul claro':'#91BDE8','azul marino':'#203B68','azul turquesa':'#48B8B1',beige:'#D8C6A5',berenjena:'#65345C',blanco:'#FFFFFF',caldero:'#B86B3C',negro:'#222222',rojo:'#C74A45',verde:'#56856A',gris:'#929292',rosa:'#D88FA8',amarillo:'#E5C84D',marron:'#806044','marrón':'#806044'};
          swatch.style.backgroundColor=swatches[normalize(row.label)]||'#B8B8B2';chip.appendChild(swatch);
        }
        const label=document.createElement('span');label.textContent=row.label;chip.appendChild(label);
        chip.addEventListener('click',()=>{
          const before=draft[dimension].slice();
          draft[dimension]=toggleFacetSelection(draft[dimension],row.term_ids);
          
          render(dimension);publishLiveFilters();scheduleDependentRefresh(dimension);
        });
        optionsNode.appendChild(chip);
      });
    };
    const scheduleDependentRefresh = changedDimension => {
      generation++;const token=generation;
      activeControllers.forEach(controller=>controller.abort());activeControllers=[];
      if(debounceTimer)window.clearTimeout(debounceTimer);
      debounceTimer=window.setTimeout(async()=>{
        const state={sizes:draft.sizes.slice(),colors:draft.colors.slice(),brands:draft.brands.slice()};
        const affected=changedDimension ? dimensions.filter(d=>d!==changedDimension) : dimensions.slice();
        // Keep existing availability/options rendered until a current response is accepted.
        const controllers=affected.map(()=>new AbortController());activeControllers=controllers;
        try{
          const results=await Promise.all(affected.map((facet,index)=>facetEndpoint(facet,state,controllers[index].signal)));
          if(token!==generation)return;
          results.forEach((rows,index)=>{facetAvailability[affected[index]]=new Set(rows.flatMap(row=>row.term_ids));});
          render(activeDimension);
        }catch(error){
          if(error&&error.name==='AbortError')return;
          if(token===generation){console.error('[Críos&Rango filtros] Error recalculando facetas dependientes',error);render(activeDimension);}
        }
      },120);
    };
    const fetchBase = async (force, isPrefetch=false) => {
      if(!force&&baseFacets){dimensions.forEach(d=>{rowsByDimension[d]=baseFacets[d]||[];facetAvailability[d]=new Set(rowsByDimension[d].flatMap(row=>row.term_ids));});return baseFacets;}
      const cache=memoryCache[storageKey]||readStore(storageKey);
      if(!force&&cache&&dimensions.every(d=>Array.isArray(cache[d]))){baseFacets=cache;dimensions.forEach(d=>{rowsByDimension[d]=cache[d];facetAvailability[d]=new Set(cache[d].flatMap(row=>row.term_ids));});return cache;}
      const state={sizes:[],colors:[],brands:[]};
      const controllers=dimensions.map(()=>new AbortController());
      if(isPrefetch)prefetchControllers=controllers;
      const results=await Promise.all(dimensions.map((facet,index)=>facetEndpoint(facet,state,controllers[index].signal)));
      if(isPrefetch)prefetchControllers=[];
      const value={timestamp:Date.now()};
      dimensions.forEach((dimension,index)=>{value[dimension]=results[index];});
      baseFacets=value;writeStore(storageKey,value);dimensions.forEach(d=>{rowsByDimension[d]=value[d];facetAvailability[d]=new Set(value[d].flatMap(row=>row.term_ids));});return value;
    };
    const setDimension = dimension => {
      if(!dimensions.includes(dimension))return;activeDimension=dimension;
      filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>{const active=button.dataset.crFilterTab===dimension;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
      render(dimension);
    };
    const closeSheet=()=>{filterSheet.hidden=true;document.body.classList.remove('cr-category-filter-open');document.body.style.removeProperty('overflow');window.scrollTo(0,savedScrollY);};
    const cancelDeferredPrefetch = abortRequests => {
      if(prefetchTimer!==null){window.clearTimeout(prefetchTimer);prefetchTimer=null;}
      if(prefetchIdleHandle!==null&&typeof window.cancelIdleCallback==='function'){window.cancelIdleCallback(prefetchIdleHandle);prefetchIdleHandle=null;}
      if(abortRequests){prefetchControllers.forEach(controller=>controller.abort());prefetchControllers=[];}
    };
    const openSheet=()=>{
      cancelDeferredPrefetch(true);
      savedScrollY=window.scrollY;
      const liveState=window.CR2026CatalogListing&&window.CR2026CatalogListing.getFilters?window.CR2026CatalogListing.getFilters():null;
      dimensions.forEach(d=>draft[d]=liveState?liveState[apiKeys[d]].slice():(filterSheet.dataset[initialKeys[d]]||'').split(',').filter(Boolean));
      filterSheet.hidden=false;document.body.classList.add('cr-category-filter-open');document.body.style.overflow='hidden';
      if(baseFacets){dimensions.forEach(d=>{rowsByDimension[d]=baseFacets[d];facetAvailability[d]=new Set(baseFacets[d].flatMap(row=>row.term_ids));});setDimension('sizes');}
      else {optionsNode.textContent='Cargando opciones…';fetchBase(false).then(()=>setDimension('sizes')).catch(error=>{optionsNode.textContent='No se han podido cargar los filtros.';console.error(error);});}
      scheduleDependentRefresh(null);
      window.requestAnimationFrame(()=>dialog.focus());
    };
    openButtons.forEach(button=>button.addEventListener('click',openSheet));
    filterSheet.querySelectorAll('[data-cr-filter-close]').forEach(button=>button.addEventListener('click',closeSheet));
    filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>button.addEventListener('click',()=>setDimension(button.dataset.crFilterTab)));
    filterSheet.querySelector('[data-cr-filter-clear]').addEventListener('click',()=>{
      dimensions.forEach(d=>draft[d]=[]);
      if(baseFacets)dimensions.forEach(d=>{rowsByDimension[d]=baseFacets[d];facetAvailability[d]=new Set(baseFacets[d].flatMap(row=>row.term_ids));});
      generation++;activeControllers.forEach(c=>c.abort());activeControllers=[];
      render(activeDimension);publishLiveFilters();
    });
    filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click',closeSheet);
    document.addEventListener('keydown',event=>{if(!filterSheet.hidden&&event.key==='Escape')closeSheet();});
    window.CR2026CatalogFilterState={
      remove:(key,id)=>{const dimension=key==='size_ids'?'sizes':key==='color_ids'?'colors':'brands';draft[dimension]=draft[dimension].filter(value=>value!==String(id));render(activeDimension);publishLiveFilters();scheduleDependentRefresh(dimension);},
      clear:()=>{dimensions.forEach(d=>draft[d]=[]);if(baseFacets)dimensions.forEach(d=>{rowsByDimension[d]=baseFacets[d];facetAvailability[d]=new Set(baseFacets[d].flatMap(row=>row.term_ids));});render(activeDimension);publishLiveFilters();generation++;activeControllers.forEach(controller=>controller.abort());activeControllers=[];}
    };
    const prefetch=()=>{
      prefetchIdleHandle=null;
      if(prefetchStarted||filterSheet.hidden===false)return;
      prefetchStarted=true;
      fetchBase(false,true).catch(error=>{
        prefetchControllers=[];
        if(error&&error.name==='AbortError')return;
        console.error('[Críos&Rango filtros] Prefetch base fallido',error);
      });
    };
    const scheduleDeferredPrefetch=()=>{
      if(prefetchStarted)return;
      prefetchTimer=window.setTimeout(()=>{
        prefetchTimer=null;
        if(typeof window.requestIdleCallback==='function'){
          prefetchIdleHandle=window.requestIdleCallback(prefetch,{timeout:2500});
        }else{
          prefetchTimer=window.setTimeout(prefetch,500);
        }
      },1500);
    };
    const startAfterInteractive=()=>{
      if(document.readyState==='complete')scheduleDeferredPrefetch();
      else window.addEventListener('load',scheduleDeferredPrefetch,{once:true});
    };
    startAfterInteractive();
    window.addEventListener('pagehide',()=>cancelDeferredPrefetch(true),{once:true});
  }

  // Category catalog: app-contract page size, live filter state, and automatic prefetch.
  const productListing = document.querySelector('[data-cr-product-list]');
  if (productListing) {
    const grid = productListing.querySelector('[data-cr-product-grid]');
    const emptyState = productListing.querySelector('[data-cr-product-empty]');
    const orderControl = productListing.querySelector('[data-cr-product-order]');
    const loadMoreButton = productListing.querySelector('[data-cr-product-load-more]');
    const filterSheetNode = document.querySelector('[data-cr-filter-sheet]');
    const categoryId = String(productListing.dataset.categoryId || '0');
    const brandTermId = Number(productListing.dataset.brandTermId || 0);
    const brandContext = productListing.dataset.context === 'brand' || brandTermId > 0;
    if (brandContext && (!Number.isInteger(brandTermId) || brandTermId < 1)) throw new Error('Brand listing has no valid product_brand term ID.');
    const outletCategoryId = Number(productListing.dataset.outletCategoryId || 0);
    if (brandContext && outletCategoryId) throw new Error('Brand listing cannot use Outlet context.');
    const outletNode = productListing.querySelector('[data-cr-outlet-bubbles]');
    const productsUrl = productListing.dataset.productsUrl;
    const pageSize = Number(productListing.dataset.pageSize || 0);
    if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid app catalog page size: '+productListing.dataset.pageSize);
    const currentUrl = new URL(window.location.href);
    let orderby = ['date','price','price-desc','title'].includes(currentUrl.searchParams.get('orderby')) ? currentUrl.searchParams.get('orderby') : 'date';
    const sortMap = {date:'newest',price:'price_asc','price-desc':'price_desc',title:'title_asc'};
    const filterKeys = brandContext ? ['size_ids','color_ids'] : ['size_ids','color_ids','brand_ids'];
    const taxonomyByKey = {size_ids:'pa_tallas',color_ids:'pa_color',brand_ids:'product_tag'};
    const labelByKey = {size_ids:'Talla',color_ids:'',brand_ids:''};
    let currentPage = 0, hasMore = false, loading = false, requestGeneration = 0, activeRequest = null;
    let totalProducts = null, selectedOutletBubbleKey = null, activeOutletOriginIds = [], outletContextInitialized = !outletCategoryId;
    const getOutletContext=()=>({categoryId:outletCategoryId,originCategoryIds:activeOutletOriginIds.slice(),selectedBubbleKey:selectedOutletBubbleKey});
    const normalizeIds = values => Array.from(new Set((values||[]).map(String).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const getFilters = () => Object.fromEntries(filterKeys.map(key=>[key,(currentUrl.searchParams.get(key)||'').split(',').filter(Boolean)]));
    const filterCount = filters => filterKeys.reduce((sum,key)=>sum+(filters[key]||[]).length,0);
    const getTermLabels = () => {
      try { return JSON.parse(filterSheetNode&&filterSheetNode.dataset.termLabels||'{}'); } catch(error) { return {}; }
    };
    const renderActiveFilterChips = () => {
      const node=productListing.querySelector('[data-cr-active-filter-chips]');
      if(!node)return;
      const filters=getFilters(), labels=getTermLabels(), count=filterCount(filters);
      node.replaceChildren();node.hidden=count===0;
      const trigger=document.querySelector('[data-cr-filter-open]');
      if(trigger)trigger.textContent=count?'Filtros ('+count+')':'Filtros';
      filterKeys.forEach(key=>{
        const taxonomy=taxonomyByKey[key], prefix=labelByKey[key];
        (filters[key]||[]).forEach(id=>{
          const metadata=labels[taxonomy]&&labels[taxonomy][String(id)];
          const value=metadata&&metadata.label?String(metadata.label):'Opción '+id;
          const chipLabel=prefix?prefix+' '+value:value;
          const chip=document.createElement('button');chip.type='button';chip.className='cr-product-listing__active-filter-chip';
          chip.setAttribute('aria-label','Eliminar filtro '+chipLabel);chip.title='Eliminar '+chipLabel;
          const textNode=document.createElement('span');textNode.textContent=chipLabel;chip.appendChild(textNode);
          const cross=document.createElement('span');cross.className='cr-filter-remove';cross.setAttribute('aria-hidden','true');cross.textContent='×';chip.appendChild(cross);
          chip.addEventListener('click',()=>{
            if(window.CR2026CatalogFilterState&&typeof window.CR2026CatalogFilterState.remove==='function')window.CR2026CatalogFilterState.remove(key,id);
            else {const next=getFilters();next[key]=next[key].filter(valueId=>valueId!==String(id));applyFilters(next);}
          });
          node.appendChild(chip);
        });
      });
      if(count){
        const clear=document.createElement('button');clear.type='button';clear.className='cr-product-listing__clear-filters';clear.textContent='Borrar filtros';
        clear.addEventListener('click',()=>{
          if(window.CR2026CatalogFilterState&&typeof window.CR2026CatalogFilterState.clear==='function')window.CR2026CatalogFilterState.clear();
          else applyFilters({size_ids:[],color_ids:[],brand_ids:[]});
        });
        node.appendChild(clear);
      }
    };
    const showEmpty = () => { grid.replaceChildren(); emptyState.hidden = false; };
    let cachedCatalogPages = [];
    const cacheState = () => {
      const query = Object.fromEntries(Array.from(currentUrl.searchParams.keys()).sort().map(key => {
        const values = currentUrl.searchParams.getAll(key);
        return [key, ['size_ids','color_ids','brand_ids'].includes(key) ? normalizeIds(values.join(',').split(',')) : values.slice().sort()];
      }));
      return normalizeCatalogCacheState({
        pathname: currentUrl.pathname,
        query,
        scope: outletCategoryId ? 'outlet' : 'catalog',
        categoryId: !brandContext && !outletCategoryId ? categoryId : '0',
        brandTermId: brandContext ? String(brandTermId) : '',
        outletCategoryId,
        outletBubbleKey: selectedOutletBubbleKey || '',
        outletOriginIds: activeOutletOriginIds.slice(),
        sort: sortMap[orderby],
        filters: getFilters(),
        pageSize
      });
    };
    const cacheBaseState = state => ({ ...state, outletBubbleKey: '', outletOriginIds: [] });
    const cacheStorageKey = () => catalogCacheKey(cacheBaseState(cacheState()));
    const cacheFullKey = state => catalogCacheKey(state);
    const readCatalogCache = () => {
      try {
        const entry = JSON.parse(sessionStorage.getItem(cacheStorageKey()) || 'null');
        if (!entry || entry.baseKey !== cacheStorageKey() || entry.key !== cacheFullKey(entry.state) ||
            !isValidCatalogCacheEntry(entry, entry.key)) {
          try { sessionStorage.removeItem(cacheStorageKey()); } catch (error) {}
          return null;
        }
        if (outletCategoryId && !outletContextInitialized) return entry;
        return entry.key === cacheFullKey(cacheState()) ? entry : null;
      } catch (error) { return null; }
    };
    const writeCatalogCache = (scrollY = window.scrollY) => {
      if (!cachedCatalogPages.length || cachedCatalogPages.some(page => !page || typeof page.html !== 'string')) return;
      const state = cacheState(), key = cacheFullKey(state), baseKey = cacheStorageKey();
      const last = cachedCatalogPages[cachedCatalogPages.length - 1];
      const entry = {
        version: CATALOG_SESSION_CACHE_VERSION,
        timestamp: Date.now(),
        key,
        baseKey,
        state,
        page: cachedCatalogPages.length,
        hasMore: Boolean(last.has_more),
        total: last.total === null || last.total === undefined ? null : Number(last.total),
        scrollY: Math.max(0, Number(scrollY) || 0),
        payload: { html: cachedCatalogPages.map(page => page.html || '').join('') },
        pages: cachedCatalogPages.slice()
      };
      try { sessionStorage.setItem(baseKey, JSON.stringify(entry)); } catch (error) {}
    };
    const validateCachedPages = pages => {
      if (!Array.isArray(pages) || !pages.length) return false;
      const allIds = [];
      for (let index = 0; index < pages.length; index++) {
        const data = pages[index], page = index + 1;
        if (!data || Number(data.page) !== page || Number(data.per_page) !== pageSize || typeof data.html !== 'string') return false;
        const returned = Array.isArray(data.product_ids) ? data.product_ids.map(String) : [];
        const endpoint = Array.isArray(data.rendered_product_ids) ? data.rendered_product_ids.map(String) : [];
        const template = document.createElement('template');
        template.innerHTML = data.html;
        const rendered = Array.from(template.content.querySelectorAll('[data-product-id]')).map(node => String(node.getAttribute('data-product-id')));
        if (!sameOrderedIds(returned, endpoint) || !sameOrderedIds(endpoint, rendered)) return false;
        if (data.source === 'filter_api' && !sameOrderedIds(Array.isArray(data.filter_api_product_ids) ? data.filter_api_product_ids.map(String) : [], endpoint)) return false;
        allIds.push(...rendered);
      }
      return new Set(allIds).size === allIds.length;
    };
    const restoreCatalogCache = () => {
      const entry = readCatalogCache();
      if (!entry) return false;
      if (outletCategoryId) {
        selectedOutletBubbleKey = entry.state.outletBubbleKey || null;
        activeOutletOriginIds = Array.isArray(entry.state.outletOriginIds) ? entry.state.outletOriginIds.slice() : [];
        outletContextInitialized = true;
      }
      if (!validateCachedPages(entry.pages)) {
        try { sessionStorage.removeItem(entry.baseKey); } catch (error) {}
        return false;
      }
      const template = document.createElement('template');
      template.innerHTML = entry.payload.html;
      grid.replaceChildren(template.content);
      emptyState.hidden = entry.pages.some(page => Array.isArray(page.product_ids) && page.product_ids.length > 0);
      currentPage = entry.page;
      hasMore = Boolean(entry.hasMore);
      totalProducts = entry.total;
      cachedCatalogPages = entry.pages.slice();
      updateLoadMoreButton(false);
      if (outletNode) renderOutletBubbleSelection();
      window.requestAnimationFrame(() => window.scrollTo(0, Math.max(0, Number(entry.scrollY) || 0)));
      revalidateCatalogCache(entry).catch(error => {
      });
      return true;
    };
    const buildCatalogPageUrl = page => {
      const params = new URLSearchParams({page:String(page),per_page:String(pageSize),scope:outletCategoryId?'outlet':'catalog',facet:'none',sort:sortMap[orderby]});
      if(brandContext)params.set('catalog_brand_id',String(brandTermId));
      else if(outletCategoryId){params.set('outlet_category_id',String(outletCategoryId));if(activeOutletOriginIds.length)params.set('origin_category_ids',activeOutletOriginIds.join(','));}
      else if(categoryId!=='0')params.set('catalog_category_id',categoryId);
      filterKeys.forEach(key=>{const value=currentUrl.searchParams.get(key);if(value)params.set(key,value);});
      return productsUrl+'?'+params.toString();
    };
    const revalidateCatalogCache = async entry => {
      const token = requestGeneration;
      const controller = new AbortController();
      const responses = [];
      for (let page = 1; page <= entry.page; page++) {
        const response = await fetch(buildCatalogPageUrl(page), {credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
        if (token !== requestGeneration) return;
        if (!response.ok) throw new Error('Catalog background revalidation HTTP '+response.status);
        const data = await response.json();
        if (token !== requestGeneration) return;
        if (!data || Number(data.page) !== page || Number(data.per_page) !== pageSize || typeof data.html !== 'string') throw new Error('Invalid catalog background response for page '+page);
        if (!(Array.isArray(data.product_ids) && data.product_ids.length) && Number(data.total) !== 0) throw new Error('Empty non-zero catalog response during background revalidation.');
        responses.push(data);
        if (!data.has_more) break;
      }
      if (token !== requestGeneration) return;
      if (!validateCachedPages(responses)) throw new Error('Invalid catalog background product/card contract.');
      const unchanged = responses.length === entry.pages.length && responses.every((data,index) => {
        const old = entry.pages[index];
        return old && data.html === old.html && sameOrderedIds(data.product_ids || [], old.product_ids || []) &&
          sameOrderedIds(data.rendered_product_ids || [], old.rendered_product_ids || []) &&
          Boolean(data.has_more) === Boolean(old.has_more) && Number(data.total) === Number(old.total);
      });
      if (token !== requestGeneration) return;
      if (unchanged) {
        entry.timestamp = Date.now();
        writeCatalogCache(entry.scrollY);
        return;
      }
      if (activeRequest) activeRequest.abort();
      activeRequest = null;
      loading = false;
      for (let index = 0; index < responses.length; index++) {
        if (token !== requestGeneration) return;
        await loadPage(index + 1, index > 0, token, responses[index], true);
      }
    };
    const updateLoadMoreButton = (isLoading = false) => { if(!loadMoreButton)return;loadMoreButton.disabled=isLoading;loadMoreButton.textContent=isLoading?'Cargando…':'Cargar más';loadMoreButton.hidden=!hasMore; };
    const loadPage = async (page, append, token=requestGeneration, preloadedData=null, background=false) => {
      if (append && loading) return;
      const controller=new AbortController();
      activeRequest=controller;loading=true;
      try {
        let responseData = preloadedData;
        if (!responseData) {
          const response = await fetch(buildCatalogPageUrl(page),{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
          if (!response.ok) throw new Error('Catalog page HTTP '+response.status);
          responseData = await response.json();
        }
        if(token!==requestGeneration)return;
        if (!responseData || Number(responseData.page) !== page) throw new Error('Catalog page mismatch: requested '+page+', received '+(responseData&&responseData.page));
        if(Number(responseData.per_page)!==pageSize)throw new Error('Catalog page size mismatch: app='+pageSize+', endpoint='+responseData.per_page);
        const template=document.createElement('template');template.innerHTML=responseData.html||'';
        const returnedIds=Array.isArray(responseData.product_ids)?responseData.product_ids.map(String):[];
        const endpointIds=Array.isArray(responseData.rendered_product_ids)?responseData.rendered_product_ids.map(String):[];
        const filterApiIds=Array.isArray(responseData.filter_api_product_ids)?responseData.filter_api_product_ids.map(String):[];
        const renderedIds=Array.from(template.content.querySelectorAll('[data-product-id]')).map(node=>String(node.getAttribute('data-product-id')));
        if(!sameOrderedIds(returnedIds,endpointIds))throw new Error('Catalog endpoint ID/order mismatch: response='+JSON.stringify(returnedIds)+' cards='+JSON.stringify(endpointIds));
        if(!sameOrderedIds(endpointIds,renderedIds))throw new Error('Catalog DOM ID/order mismatch: cards='+JSON.stringify(endpointIds)+' DOM='+JSON.stringify(renderedIds));
        if(responseData.source==='filter_api'&&!sameOrderedIds(filterApiIds,endpointIds))throw new Error('Filter API ID/order mismatch: API='+JSON.stringify(filterApiIds)+' cards='+JSON.stringify(endpointIds));

        const previousIds=append?Array.from(grid.querySelectorAll('[data-product-id]')).map(node=>String(node.getAttribute('data-product-id'))):[];
        const completeIds=previousIds.concat(renderedIds);
        const seenIds=new Set(),duplicates=[];
        completeIds.forEach(id=>{if(seenIds.has(id))duplicates.push(id);else seenIds.add(id);});
        if(duplicates.length)throw new Error('Catalog duplicate product IDs across pages: '+JSON.stringify(duplicates));
        const priceNodes=append?Array.from(grid.querySelectorAll('[data-product-id]')).concat(Array.from(template.content.querySelectorAll('[data-product-id]'))):Array.from(template.content.querySelectorAll('[data-product-id]'));
        const prices=priceNodes.map(node=>{
          const priceContainer=node.querySelector('.cr-product-card__price');
          const saleAmount=priceContainer?.querySelector('ins .amount, ins bdi');
          const amountNode=saleAmount||priceContainer?.querySelector('.amount, bdi');
          const text=amountNode?amountNode.textContent:(priceContainer?.textContent||'');
          const normalized=String(text).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:,|$))/g,'').replace(',','.');
          return Number(normalized);
        });
        
        if(orderby==='price'&&prices.some(price=>!Number.isFinite(price)))throw new Error('PRICE_ASC=FAIL nonnumeric price in concatenated sequence: '+JSON.stringify(prices));
        if(orderby==='price'&&prices.some((price,index)=>index>0&&prices[index-1]>price))throw new Error('PRICE_ASC=FAIL within concatenated page sequence: '+JSON.stringify(prices));
        if(orderby==='price-desc'&&prices.some(price=>!Number.isFinite(price)))throw new Error('PRICE_DESC=FAIL nonnumeric price in concatenated sequence: '+JSON.stringify(prices));
        if(orderby==='price-desc'&&prices.some((price,index)=>index>0&&prices[index-1]<price))throw new Error('PRICE_DESC=FAIL within concatenated page sequence: '+JSON.stringify(prices));
        if (!returnedIds.length) {
          if (!append) showEmpty();
          hasMore = false;
          currentPage = page;
          totalProducts = responseData.total === null || responseData.total === undefined ? null : Number(responseData.total);
          if (responseData.total !== null && responseData.total !== undefined && Number(responseData.total) !== completeIds.length) throw new Error('Catalog total mismatch: loaded='+completeIds.length+' total='+responseData.total);
          if (Number(responseData.total) === 0) { cachedCatalogPages = [responseData]; writeCatalogCache(); }
          
          return;
        }
        if (append) grid.appendChild(template.content);
        else grid.replaceChildren(template.content);
        emptyState.hidden = true;
        if (append) cachedCatalogPages[page - 1] = responseData;
        else cachedCatalogPages = [responseData];
        currentPage = page;
        hasMore = Boolean(responseData.has_more);
        totalProducts=responseData.total===null||responseData.total===undefined?null:Number(responseData.total);
        if(!hasMore&&totalProducts!==null&&totalProducts!==completeIds.length)throw new Error('Catalog total mismatch: loaded='+completeIds.length+' total='+totalProducts);
        writeCatalogCache();
        
      } catch (error) {
        if(token!==requestGeneration||(error&&error.name==='AbortError'))return;
        console.error('[Críos&Rango productos] No se pudo cargar la página del catálogo',error);
        if (!append && !background) { showEmpty(); hasMore = false; }
      } finally {
        if(token===requestGeneration){
          loading=false;if(activeRequest===controller)activeRequest=null;updateLoadMoreButton(false);
        }
      }
    };
    const resetAndLoad = () => {
      requestGeneration++;
      if(activeRequest)activeRequest.abort();
      activeRequest=null;loading=false;currentPage=0;hasMore=false;totalProducts=null;cachedCatalogPages=[];updateLoadMoreButton(false);
      if (restoreCatalogCache()) return;
      loadPage(1,false,requestGeneration);
    };
    const applyFilters = filters => {
      filterKeys.forEach(key=>{
        const values=normalizeIds(filters&&filters[key]||[]);
        if(values.length)currentUrl.searchParams.set(key,values.join(','));
        else currentUrl.searchParams.delete(key);
      });
      window.history.replaceState({},'',currentUrl.toString());
      if(filterSheetNode){
        filterSheetNode.dataset.initialSizes=(currentUrl.searchParams.get('size_ids')||'');
        filterSheetNode.dataset.initialColors=(currentUrl.searchParams.get('color_ids')||'');
        filterSheetNode.dataset.initialBrands=(currentUrl.searchParams.get('brand_ids')||'');
      }
      renderActiveFilterChips();
      resetAndLoad();
    };
    window.CR2026CatalogListing={applyFilters,getFilters,renderActiveFilterChips,pageSize,getOutletContext};
    const renderOutletBubbleSelection=()=>{if(!outletNode)return;outletNode.querySelectorAll('[data-outlet-bubble-key]').forEach(button=>{const selected=button.dataset.outletBubbleKey===(selectedOutletBubbleKey||'');button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));});};
    const failClosedOutletBubbles=()=>{if(outletNode){outletNode.replaceChildren();outletNode.hidden=true;}};
    const initializeOutletBubbles=async()=>{
      if(!outletNode||!outletCategoryId)return;
      try{
        const candidates=JSON.parse(outletNode.dataset.candidates||'null');
        if(!Array.isArray(candidates)||!candidates.length||candidates.some(item=>!item||typeof item.key!=='string'||typeof item.label!=='string'||!Array.isArray(item.category_ids)||!item.category_ids.length||item.category_ids.some(id=>!Number.isInteger(Number(id))||Number(id)<1)))throw new Error('Invalid Outlet candidate schema.');
        const response=await fetch(outletNode.dataset.availabilityUrl,{credentials:'same-origin',headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('Outlet availability HTTP '+response.status);
        const payload=await response.json();
        if(!payload||payload.schema_version!==1||!Array.isArray(payload.outlets))throw new Error('Unsupported Outlet availability schema.');
        if(payload.version!==undefined&&(!Number.isInteger(payload.version)||payload.version<0))throw new Error('Invalid Outlet availability version.');
        const seenBranches=new Set();
        payload.outlets.forEach(bucket=>{
          if(!bucket||!Number.isInteger(bucket.outlet_category_id)||!Array.isArray(bucket.counts)||seenBranches.has(bucket.outlet_category_id))throw new Error('Invalid Outlet availability branch payload.');
          seenBranches.add(bucket.outlet_category_id);const seenCategories=new Set();
          bucket.counts.forEach(row=>{
            if(!row||!Number.isInteger(row.category_id)||row.category_id<1||!Number.isInteger(row.count)||row.count<0||seenCategories.has(row.category_id))throw new Error('Invalid Outlet availability count payload.');
            seenCategories.add(row.category_id);
          });
        });
        const branches=payload.outlets.filter(bucket=>bucket.outlet_category_id===outletCategoryId);
        if(branches.length!==1)throw new Error('Outlet availability missing active branch '+outletCategoryId+'.');
        const countByCategory=new Map(branches[0].counts.map(row=>[row.category_id,row.count]));
        const visible=candidates.filter(candidate=>candidate.category_ids.some(id=>(countByCategory.get(Number(id))||0)>0));
        const labels={'Abrigos y cazadoras':'Abrigos','Camisas y camisetas':'Camisas','Chaquetas y chalecos':'Chaquetas','Jerséis':'Jerséis','Pantalones y faldas':'Pantalones','Ropa de fiesta':'Fiesta','Vestidos, conjuntos y monos casual':'Vestidos y conjuntos','Americanas y trajes':'Americanas','Camisetas y polos':'Camisetas','Complementos y baño':'Complementos','Jerseis y Chaquetas':'Jerséis','Pantalones y bermudas':'Pantalones','Ropa de baño':'Baño','Ropa de sport':'Sport','Ropa de vestir':'Vestir'};
        const addBubble=(key,label,originIds)=>{
          const button=document.createElement('button');button.type='button';button.className='cr-outlet-bubbles__pill';button.textContent=label;
          button.dataset.outletBubbleKey=key===null?'':key;button.setAttribute('aria-pressed',String(selectedOutletBubbleKey===key));
          if(selectedOutletBubbleKey===key)button.classList.add('is-selected');
          button.addEventListener('click',()=>{
            if(selectedOutletBubbleKey===key)return;
            selectedOutletBubbleKey=key;activeOutletOriginIds=originIds.slice().sort((left,right)=>left-right);
            renderOutletBubbleSelection();
            if(window.CR2026CatalogFacetContextChanged)window.CR2026CatalogFacetContextChanged();
            resetAndLoad();
          });
          outletNode.appendChild(button);
        };
        outletNode.replaceChildren();addBubble(null,'Todas',[]);
        visible.forEach(candidate=>addBubble(candidate.key,labels[candidate.label]||candidate.label,Array.from(new Set(candidate.category_ids.map(Number)))));
        outletContextInitialized = true;
        outletNode.hidden=false;
        renderOutletBubbleSelection();
        
      }catch(error){failClosedOutletBubbles();}
    };
    renderActiveFilterChips();
    if(outletCategoryId)initializeOutletBubbles();
    resetAndLoad();
    window.addEventListener('pagehide', () => writeCatalogCache(window.scrollY), {once:true});
    if(loadMoreButton){
      loadMoreButton.addEventListener('click',()=>{
        if(!hasMore||loading||currentPage<1)return;
        updateLoadMoreButton(true);
        loadPage(currentPage+1,true,requestGeneration);
      });
    }
    if (orderControl) {
      const fitOrderControl = () => {
        const selectedText = (orderControl.selectedOptions[0]?.textContent || orderControl.value || '').trim();
        const computed = window.getComputedStyle(orderControl);
        let textWidth = selectedText.length * 7;
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) { context.font = computed.font; textWidth = context.measureText(selectedText).width; }
        } catch (error) {}
        const paddingLeft = parseFloat(computed.paddingLeft) || 2;
        const paddingRight = parseFloat(computed.paddingRight) || 22;
        orderControl.style.width = Math.ceil(textWidth + paddingLeft + paddingRight) + 'px';
      };
      fitOrderControl();
      orderControl.addEventListener('change',()=>{
        orderby=['date','price','price-desc','title'].includes(orderControl.value)?orderControl.value:'date';
        fitOrderControl();
        if(orderby==='date')currentUrl.searchParams.delete('orderby');else currentUrl.searchParams.set('orderby',orderby);
        window.history.replaceState({},'',currentUrl.toString());
        resetAndLoad();
      });
    }
  }

  // Size the native brand select to its selected label so the custom chevron stays adjacent.
  const brandOrderControl = document.querySelector('[data-cr-brand-order]');
  if (brandOrderControl) {
    const fitBrandOrderControl = () => {
      const selectedOption = brandOrderControl.selectedOptions && brandOrderControl.selectedOptions[0];
      const selectedText = (selectedOption ? selectedOption.textContent : brandOrderControl.value || '').trim();
      const computed = window.getComputedStyle(brandOrderControl);
      let textWidth = selectedText.length * 7;
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          context.font = computed.font;
          textWidth = context.measureText(selectedText).width;
        }
      } catch (error) {}
      const paddingLeft = parseFloat(computed.paddingLeft) || 2;
      const paddingRight = parseFloat(computed.paddingRight) || 14;
      brandOrderControl.style.width = Math.ceil(textWidth + paddingLeft + paddingRight) + 'px';
    };
    fitBrandOrderControl();
    brandOrderControl.addEventListener('change', () => {
      fitBrandOrderControl();
      const form = brandOrderControl.closest('[data-cr-brand-order-form]');
      if (form) form.requestSubmit();
    });
  }

  // Brand and product-search archives use WordPress's real next-page URL and server-rendered cards.
  const htmlListingPaginators=document.querySelectorAll('[data-cr-html-pagination]');
  htmlListingPaginators.forEach(container=>{
    const button=container.querySelector('[data-cr-html-load-more]');
    const grid=document.querySelector('[data-cr-brand-product-grid], [data-cr-search-product-grid]');
    if(!button||!grid||!button.dataset.nextUrl)return;
    const pagination=container.querySelector('.navigation.pagination');
    if(pagination)pagination.hidden=true;
    button.hidden=false;
    let nextUrl=button.dataset.nextUrl,loading=false;
    button.addEventListener('click',async()=>{
      if(loading||!nextUrl)return;
      loading=true;button.disabled=true;button.textContent='Cargando…';
      try{
        const response=await fetch(nextUrl,{credentials:'same-origin',headers:{Accept:'text/html'}});
        if(!response.ok)throw new Error('Listing page HTTP '+response.status);
        const html=await response.text();
        const nextDocument=new DOMParser().parseFromString(html,'text/html');
        const selector=grid.matches('[data-cr-brand-product-grid]')?'[data-cr-brand-product-grid]':'[data-cr-search-product-grid]';
        const nextGrid=nextDocument.querySelector(selector);
        if(!nextGrid)throw new Error('Next listing page has no matching product grid');
        const cards=Array.from(nextGrid.querySelectorAll('.cr-product-card[data-product-id]'));
        const existing=new Set(Array.from(grid.querySelectorAll('.cr-product-card[data-product-id]')).map(card=>String(card.dataset.productId||'')));
        const incoming=cards.map(card=>String(card.dataset.productId||''));
        if(incoming.some(id=>!id)||new Set(incoming).size!==incoming.length||incoming.some(id=>existing.has(id)))throw new Error('Next listing page contains invalid or duplicate product IDs');
        const fragment=document.createDocumentFragment();
        cards.forEach(card=>fragment.appendChild(card.cloneNode(true)));
        grid.appendChild(fragment);
        const nextLink=nextDocument.querySelector('.navigation.pagination .page-numbers.next');
        nextUrl=nextLink?new URL(nextLink.href,nextDocument.baseURI).href:'';
        button.dataset.nextUrl=nextUrl;
        button.hidden=!nextUrl||cards.length===0;
      }catch(error){
        console.error('[Críos&Rango productos] No se pudo cargar la siguiente tanda',error);
      }finally{
        loading=false;button.disabled=false;
        if(!button.hidden)button.textContent='Cargar más';
      }
    });
  });

})();