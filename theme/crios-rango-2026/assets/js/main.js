(() => {
  'use strict';

  const toggleFacetSelection = (selected, termIds) => {
    const ids = termIds.map(String);
    return ids.some(id => selected.includes(id))
      ? selected.filter(id => !ids.includes(id))
      : selected.concat(ids.filter(id => !selected.includes(id)));
  };
  const sameOrderedIds = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((id, index) => String(id) === String(right[index]));
  window.CR2026CatalogState = { toggleFacetSelection, sameOrderedIds };

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
    const apiUrl = filterSheet.dataset.apiUrl;
    const debug = filterSheet.dataset.debug === '1';
    let termLabels = {};
    try { termLabels = JSON.parse(filterSheet.dataset.termLabels || '{}'); } catch (error) {}
    const dimensions = ['sizes', 'colors', 'brands'];
    const apiKeys = {sizes:'size_ids',colors:'color_ids',brands:'brand_ids'};
    const taxonomies = {sizes:'pa_tallas',colors:'pa_color',brands:'product_tag'};
    const initialKeys = {sizes:'initialSizes',colors:'initialColors',brands:'initialBrands'};
    const ttl = 300000, storageKey = 'cr2026_filters_v2_category_' + categoryId;
    try { sessionStorage.removeItem('cr2026_filters_v1_category_' + categoryId); } catch (error) {}
    const memoryCache = window.categoryFacetCacheV2 || (window.categoryFacetCacheV2 = Object.create(null));
    const collator = new Intl.Collator('es',{sensitivity:'base'});
    const normalize = value => String(value||'').trim().normalize('NFC').toLocaleLowerCase('es');
    const sortIds = values => Array.from(new Set((values||[]).map(String).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const cacheKey = (facet,state) => [categoryId,facet,...dimensions.filter(d=>d!==facet).map(d=>d+':'+sortIds(state[d]).join(','))].join('|');
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
    const facetEndpoint = async (facet,state,signal) => {
      const key=cacheKey(facet,state), cached=memoryCache[key]||readStore(storageKey+'|'+key);
      if(cached){memoryCache[key]=cached;if(debug)console.debug('[CR2026 facets] cache-hit',{facet,selectedState:state,responseTermIds:cached.rows.flatMap(row=>row.term_ids)});return cached.rows;}
      const params=new URLSearchParams({scope:'catalog',facet,page:'1',per_page:'1'});if(categoryId!=='root')params.set('catalog_category_id',categoryId);
      dimensions.forEach(d=>{if(d!==facet&&state[d].length)params.set(apiKeys[d],sortIds(state[d]).join(','));});
      if(debug)console.debug('[CR2026 facets] request',{facet,selectedState:state,params:Object.fromEntries(params.entries())});
      const response=await fetch(apiUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'},signal});
      if(!response.ok)throw new Error('Filter API HTTP '+response.status);
      const payload=await response.json(), facets=payload&&payload.facets||{};
      const raw=Array.isArray(facets[facet])?facets[facet]:(Array.isArray(facets[facet==='colors'?'colors':facet])?facets[facet]:[]);
      const rows=rowsFor(raw,facet);
      if(debug)console.debug('[CR2026 facets] response',{facet,responseTermIds:rows.flatMap(row=>row.term_ids)});
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
          if(debug)console.debug('[CR2026 facets] selection',{facet:dimension,selectedBefore:before,termIds:row.term_ids,selectedAfter:draft[dimension].slice()});
          render(dimension);publishLiveFilters();scheduleDependentRefresh(dimension);
        });
        optionsNode.appendChild(chip);
      });
      if(dimensions.some(d=>d!==dimension&&refreshing.has(d))){
        const status=document.createElement('span');status.className='cr-category-filter-sheet__refreshing';status.textContent='Actualizando…';status.setAttribute('aria-live','polite');optionsNode.appendChild(status);
      }
    };
    const refreshing=new Set();
    const scheduleDependentRefresh = changedDimension => {
      generation++;const token=generation;
      refreshing.clear();
      activeControllers.forEach(controller=>controller.abort());activeControllers=[];
      if(debounceTimer)window.clearTimeout(debounceTimer);
      debounceTimer=window.setTimeout(async()=>{
        const state={sizes:draft.sizes.slice(),colors:draft.colors.slice(),brands:draft.brands.slice()};
        const affected=changedDimension ? dimensions.filter(d=>d!==changedDimension) : dimensions.slice();
        affected.forEach(d=>{refreshing.add(d);facetAvailability[d]=null;});if(affected.includes(activeDimension))render(activeDimension);
        const controllers=affected.map(()=>new AbortController());activeControllers=controllers;
        try{
          const results=await Promise.all(affected.map((facet,index)=>facetEndpoint(facet,state,controllers[index].signal)));
          if(token!==generation)return;
          results.forEach((rows,index)=>{facetAvailability[affected[index]]=new Set(rows.flatMap(row=>row.term_ids));});
          affected.forEach(d=>refreshing.delete(d));
          render(activeDimension);
        }catch(error){
          if(error&&error.name==='AbortError')return;
          if(token===generation){affected.forEach(d=>refreshing.delete(d));console.error('[Críos&Rango filtros] Error recalculando facetas dependientes',error);render(activeDimension);}
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
      const value={timestamp:Date.now(),sizes:results[0],colors:results[1],brands:results[2]};
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
    const sentinel = productListing.querySelector('[data-cr-product-sentinel]');
    const filterSheetNode = document.querySelector('[data-cr-filter-sheet]');
    const categoryId = String(productListing.dataset.categoryId || '0');
    const debug = productListing.dataset.debug === '1';
    const productsUrl = productListing.dataset.productsUrl;
    const pageSize = Number(productListing.dataset.pageSize || 0);
    if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid app catalog page size: '+productListing.dataset.pageSize);
    const currentUrl = new URL(window.location.href);
    let orderby = ['date','price','price-desc'].includes(currentUrl.searchParams.get('orderby')) ? currentUrl.searchParams.get('orderby') : 'date';
    const sortMap = {date:'newest',price:'price_asc','price-desc':'price_desc'};
    const filterKeys = ['size_ids','color_ids','brand_ids'];
    const taxonomyByKey = {size_ids:'pa_tallas',color_ids:'pa_color',brand_ids:'product_tag'};
    const labelByKey = {size_ids:'Talla',color_ids:'',brand_ids:''};
    let currentPage = 0, hasMore = false, loading = false, requestGeneration = 0, activeRequest = null;
    let totalProducts = null;
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
    const loadPage = async (page, append, token=requestGeneration) => {
      if (append && loading) return;
      const controller=new AbortController();
      activeRequest=controller;loading=true;
      try {
        const params = new URLSearchParams({page:String(page),per_page:String(pageSize),scope:'catalog',facet:'none',sort:sortMap[orderby]});
        if (categoryId !== '0') params.set('catalog_category_id',categoryId);
        filterKeys.forEach(key=>{const value=currentUrl.searchParams.get(key);if(value)params.set(key,value);});
        const response = await fetch(productsUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
        if (!response.ok) throw new Error('Catalog page HTTP '+response.status);
        const responseData = await response.json();
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
        if(debug)console.debug('[CR2026 catalog] page',{page,sort:sortMap[orderby],page_size:pageSize,api_product_ids:returnedIds,filter_api_product_ids:filterApiIds,hydrated_product_ids:endpointIds,dom_product_ids:renderedIds,prices,total:responseData.total,has_more:responseData.has_more});
        const previousIds=append?Array.from(grid.querySelectorAll('[data-product-id]')).map(node=>String(node.getAttribute('data-product-id'))):[];
        const completeIds=previousIds.concat(renderedIds);
        const seenIds=new Set(),duplicates=[];
        completeIds.forEach(id=>{if(seenIds.has(id))duplicates.push(id);else seenIds.add(id);});
        if(duplicates.length)throw new Error('Catalog duplicate product IDs across pages: '+JSON.stringify(duplicates));
        const priceNodes=append?Array.from(grid.querySelectorAll('[data-product-id]')).concat(Array.from(template.content.querySelectorAll('[data-product-id]'))):Array.from(template.content.querySelectorAll('[data-product-id]'));
        const prices=priceNodes.map(node=>{
          const amountNode=node.querySelector('.cr-product-card__price ins .amount, .cr-product-card__price ins bdi, .cr-product-card__price .amount, .cr-product-card__price bdi');
          const text=amountNode?amountNode.textContent:(node.querySelector('.cr-product-card__price')?.textContent||'');
          const normalized=String(text).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:,|$))/g,'').replace(',','.');
          return Number(normalized);
        });
        if(orderby==='price'&&prices.some((price,index)=>index>0&&Number.isFinite(price)&&Number.isFinite(prices[index-1])&&prices[index-1]>price))throw new Error('PRICE_ASC=FAIL within rendered page sequence: '+JSON.stringify(prices));
        if(orderby==='price-desc'&&prices.some((price,index)=>index>0&&Number.isFinite(price)&&Number.isFinite(prices[index-1])&&prices[index-1]<price))throw new Error('PRICE_DESC=FAIL within rendered page sequence: '+JSON.stringify(prices));
        if (!returnedIds.length) {
          if (!append) showEmpty();
          hasMore = false;
          if (responseData.total !== null && responseData.total !== undefined && Number(responseData.total) !== completeIds.length) throw new Error('Catalog total mismatch: loaded='+completeIds.length+' total='+responseData.total);
          if(debug)console.debug('[CR2026 catalog] complete',{sort:sortMap[orderby],loaded_ids:completeIds,total:responseData.total,duplicates});
          return;
        }
        if (append) grid.appendChild(template.content);
        else grid.replaceChildren(template.content);
        emptyState.hidden = true;
        currentPage = page;
        hasMore = Boolean(responseData.has_more);
        totalProducts=responseData.total===null||responseData.total===undefined?null:Number(responseData.total);
        if(!hasMore&&totalProducts!==null&&totalProducts!==completeIds.length)throw new Error('Catalog total mismatch: loaded='+completeIds.length+' total='+totalProducts);
        if(debug&&!hasMore)console.debug('[CR2026 catalog] complete',{sort:sortMap[orderby],loaded_ids:completeIds,total:totalProducts,duplicates,missing:totalProducts===null?null:totalProducts-completeIds.length});
      } catch (error) {
        if(token!==requestGeneration||(error&&error.name==='AbortError'))return;
        console.error('[Críos&Rango productos] No se pudo cargar la página del catálogo',error);
        if (!append) showEmpty();
        hasMore = false;
      } finally {
        if(token===requestGeneration){
          loading=false;if(activeRequest===controller)activeRequest=null;
        }
      }
    };
    const resetAndLoad = () => {
      requestGeneration++;
      if(activeRequest)activeRequest.abort();
      activeRequest=null;loading=false;currentPage=0;hasMore=false;totalProducts=null;
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
    window.CR2026CatalogListing={applyFilters,getFilters,renderActiveFilterChips,pageSize};
    renderActiveFilterChips();
    resetAndLoad();
    if (sentinel && 'IntersectionObserver' in window) {
      const catalogObserver=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)&&hasMore&&!loading&&currentPage>0)loadPage(currentPage+1,true,requestGeneration);
      },{root:null,rootMargin:'0px 0px 900px 0px',threshold:0});
      catalogObserver.observe(sentinel);
      window.addEventListener('pagehide',()=>catalogObserver.disconnect(),{once:true});
    }
    if (orderControl) orderControl.addEventListener('change',()=>{
      orderby=['date','price','price-desc'].includes(orderControl.value)?orderControl.value:'date';
      if(orderby==='date')currentUrl.searchParams.delete('orderby');else currentUrl.searchParams.set('orderby',orderby);
      window.history.replaceState({},'',currentUrl.toString());
      resetAndLoad();
    });
  }

})();