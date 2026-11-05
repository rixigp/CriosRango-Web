(() => {
  'use strict';

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
    const cacheKey = (facet,state) => [categoryId,facet,sortIds(state.sizes).join(','),sortIds(state.colors).join(','),sortIds(state.brands).join(',')].join('|');
    const isValid = value => value && Number(value.timestamp)>0 && Date.now()-Number(value.timestamp)<ttl;
    const readStore = key => {try{const value=JSON.parse(sessionStorage.getItem(key)||'null');return isValid(value)?value:null;}catch(error){return null;}};
    const writeStore = (key,value) => {memoryCache[key]=value;try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}};
    const draft = {sizes:[],colors:[],brands:[]};
    let baseFacets=null, activeDimension='sizes', rowsByDimension={sizes:[],colors:[],brands:[]}, savedScrollY=0;
    let generation=0, debounceTimer=null, activeControllers=[];
    let prefetchControllers=[], prefetchIdleHandle=null, prefetchTimer=null, prefetchStarted=false;
    const optionsNode=filterSheet.querySelector('[data-cr-filter-options]');
    const dialog=filterSheet.querySelector('.cr-category-filter-sheet__dialog');
    const openButtons=Array.from(document.querySelectorAll('[data-cr-filter-open]'));
    const facetEndpoint = async (facet,state,signal) => {
      const key=cacheKey(facet,state), cached=memoryCache[key]||readStore(storageKey+'|'+key);
      if(cached){memoryCache[key]=cached;return cached.rows;}
      const params=new URLSearchParams({scope:'catalog',facet,page:'1',per_page:'1'});if(categoryId!=='root')params.set('catalog_category_id',categoryId);
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
    const render = dimension => {
      const rows=rowsByDimension[dimension]||[];optionsNode.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.className='cr-category-filter-sheet__empty';empty.textContent='No hay opciones disponibles.';optionsNode.appendChild(empty);return;}
      rows.forEach(row=>{
        const selected=row.term_ids.some(id=>draft[dimension].includes(id));
        const chip=document.createElement('button');chip.type='button';chip.className='cr-category-filter-sheet__option'+(selected?' is-selected':'');chip.setAttribute('aria-pressed',String(selected));chip.setAttribute('aria-label',row.label);
        if(dimension==='colors'){
          const swatch=document.createElement('span');swatch.className='cr-category-filter-sheet__swatch';swatch.setAttribute('aria-hidden','true');
          const swatches={azul:'#4B78B8','azul claro':'#91BDE8','azul marino':'#203B68','azul turquesa':'#48B8B1',beige:'#D8C6A5',berenjena:'#65345C',blanco:'#FFFFFF',caldero:'#B86B3C',negro:'#222222',rojo:'#C74A45',verde:'#56856A',gris:'#929292',rosa:'#D88FA8',amarillo:'#E5C84D',marron:'#806044','marrón':'#806044'};
          swatch.style.backgroundColor=swatches[normalize(row.label)]||'#B8B8B2';chip.appendChild(swatch);
        }
        const label=document.createElement('span');label.textContent=row.label;chip.appendChild(label);
        chip.addEventListener('click',()=>{
          const all=row.term_ids.some(id=>draft[dimension].includes(id));
          if(all)draft[dimension]=draft[dimension].filter(id=>!row.term_ids.includes(id));
          else row.term_ids.forEach(id=>{if(!draft[dimension].includes(id))draft[dimension].push(id);});
          rowsByDimension[dimension]=rowsByDimension[dimension].filter(existing=>existing!==row);
          if(!all)rowsByDimension[dimension].push(row);
          render(dimension);scheduleDependentRefresh(dimension);
        });
        optionsNode.appendChild(chip);
      });
      if(dimensions.some(d=>d!==dimension&&refreshing.has(d))){
        const status=document.createElement('span');status.className='cr-category-filter-sheet__refreshing';status.textContent='Actualizando…';status.setAttribute('aria-live','polite');optionsNode.appendChild(status);
      }
    };
    const refreshing=new Set();
    const sanitizeSelected = (dimension,rows) => {
      const available=new Set(rows.flatMap(row=>row.term_ids));
      const before=draft[dimension].length;
      draft[dimension]=draft[dimension].filter(id=>available.has(id));
      return before!==draft[dimension].length;
    };
    const scheduleDependentRefresh = changedDimension => {
      generation++;const token=generation;
      refreshing.clear();
      activeControllers.forEach(controller=>controller.abort());activeControllers=[];
      if(debounceTimer)window.clearTimeout(debounceTimer);
      debounceTimer=window.setTimeout(async()=>{
        const state={sizes:draft.sizes.slice(),colors:draft.colors.slice(),brands:draft.brands.slice()};
        const affected=dimensions.filter(d=>d!==changedDimension);
        affected.forEach(d=>refreshing.add(d));if(affected.includes(activeDimension))render(activeDimension);
        const controllers=affected.map(()=>new AbortController());activeControllers=controllers;
        try{
          const results=await Promise.all(affected.map((facet,index)=>facetEndpoint(facet,state,controllers[index].signal)));
          if(token!==generation)return;
          results.forEach((rows,index)=>{rowsByDimension[affected[index]]=rows;sanitizeSelected(affected[index],rows);});
          affected.forEach(d=>refreshing.delete(d));
          render(activeDimension);
        }catch(error){
          if(error&&error.name==='AbortError')return;
          if(token===generation){affected.forEach(d=>refreshing.delete(d));console.error('[Críos&Rango filtros] Error recalculando facetas dependientes',error);render(activeDimension);}
        }
      },120);
    };
    const fetchBase = async (force, isPrefetch=false) => {
      if(!force&&baseFacets)return baseFacets;
      const cache=memoryCache[storageKey]||readStore(storageKey);
      if(!force&&cache&&dimensions.every(d=>Array.isArray(cache[d]))){baseFacets=cache;return cache;}
      const state={sizes:[],colors:[],brands:[]};
      const controllers=dimensions.map(()=>new AbortController());
      if(isPrefetch)prefetchControllers=controllers;
      const results=await Promise.all(dimensions.map((facet,index)=>facetEndpoint(facet,state,controllers[index].signal)));
      if(isPrefetch)prefetchControllers=[];
      const value={timestamp:Date.now(),sizes:results[0],colors:results[1],brands:results[2]};
      baseFacets=value;writeStore(storageKey,value);dimensions.forEach(d=>rowsByDimension[d]=value[d]);return value;
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
      savedScrollY=window.scrollY;dimensions.forEach(d=>draft[d]=(filterSheet.dataset[initialKeys[d]]||'').split(',').filter(Boolean));
      filterSheet.hidden=false;document.body.classList.add('cr-category-filter-open');document.body.style.overflow='hidden';
      if(baseFacets){dimensions.forEach(d=>rowsByDimension[d]=baseFacets[d]);setDimension('sizes');}
      else {optionsNode.textContent='Cargando opciones…';fetchBase(false).then(()=>setDimension('sizes')).catch(error=>{optionsNode.textContent='No se han podido cargar los filtros.';console.error(error);});}
      window.requestAnimationFrame(()=>dialog.focus());
    };
    openButtons.forEach(button=>button.addEventListener('click',openSheet));
    filterSheet.querySelectorAll('[data-cr-filter-close]').forEach(button=>button.addEventListener('click',closeSheet));
    filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>button.addEventListener('click',()=>setDimension(button.dataset.crFilterTab)));
    filterSheet.querySelector('[data-cr-filter-clear]').addEventListener('click',()=>{dimensions.forEach(d=>draft[d]=[]);if(baseFacets)dimensions.forEach(d=>rowsByDimension[d]=baseFacets[d]);render(activeDimension);generation++;activeControllers.forEach(c=>c.abort());activeControllers=[];});
    filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click',()=>{
      const url=new URL(window.location.href);dimensions.forEach(d=>{url.searchParams.delete(apiKeys[d]);if(draft[d].length)url.searchParams.set(apiKeys[d],sortIds(draft[d]).join(','));});
      window.location.assign(url.toString());
    });
    document.addEventListener('keydown',event=>{if(!filterSheet.hidden&&event.key==='Escape')closeSheet();});
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

  // App-like product listing. Filter API is requested only in the browser;
  // unfiltered category archives use their native WooCommerce main query.
  const productListing = document.querySelector('[data-cr-product-list]');
  if (productListing) {
    const grid = productListing.querySelector('[data-cr-product-grid]');
    const loadMoreButton = productListing.querySelector('[data-cr-product-load-more]');
    const emptyState = productListing.querySelector('[data-cr-product-empty]');
    const orderControl = productListing.querySelector('[data-cr-product-order]');
    const categoryId = String(productListing.dataset.categoryId || '0');
    const filtered = productListing.dataset.filtered === '1';
    const filterApiUrl = productListing.dataset.filterApiUrl;
    const productsUrl = productListing.dataset.productsUrl;
    const currentUrl = new URL(window.location.href);
    const orderby = ['date','price','price-desc'].includes(currentUrl.searchParams.get('orderby')) ? currentUrl.searchParams.get('orderby') : 'date';
    const filterKeys = ['size_ids','color_ids','brand_ids'];
    let currentPage = 1, hasMore = !filtered && loadMoreButton && !loadMoreButton.hidden, loading = false;
    const showEmpty = () => { grid.replaceChildren(); emptyState.hidden = false; if (loadMoreButton) loadMoreButton.hidden = true; };
    const productEndpoint = async (page, productIds) => {
      const params = new URLSearchParams({page:String(page),orderby});
      if (productIds && productIds.length) params.set('product_ids',productIds.join(','));
      else params.set('category_id',categoryId);
      const response = await fetch(productsUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Product list HTTP '+response.status);
      return response.json();
    };
    const loadPage = async (page, append) => {
      if (loading) return;
      loading = true;
      if (loadMoreButton) { loadMoreButton.disabled = true; loadMoreButton.setAttribute('aria-busy','true'); }
      try {
        let productIds = null, responseData;
        if (filtered) {
          const params = new URLSearchParams({scope:'catalog',facet:'none',page:String(page),per_page:'12'});
          if (categoryId !== '0') params.set('catalog_category_id',categoryId);
          filterKeys.forEach(key=>{const value=currentUrl.searchParams.get(key);if(value)params.set(key,value);});
          const filterResponse = await fetch(filterApiUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}});
          if (!filterResponse.ok) throw new Error('Filter API HTTP '+filterResponse.status);
          const payload = await filterResponse.json();
          productIds = Array.isArray(payload.product_ids) ? payload.product_ids.map(Number).filter(id=>Number.isInteger(id)&&id>0) : [];
          hasMore = Boolean(payload.has_more);
          if (!productIds.length) { if (!append) showEmpty(); hasMore = false; return; }
          responseData = await productEndpoint(page,productIds);
        } else {
          responseData = await productEndpoint(page,null);
          hasMore = Boolean(responseData.has_more);
        }
        if (!responseData || !responseData.html) { if (!append) showEmpty(); hasMore = false; return; }
        if (append) grid.insertAdjacentHTML('beforeend',responseData.html);
        else grid.innerHTML = responseData.html;
        emptyState.hidden = true;
        currentPage = page;
        if (loadMoreButton) loadMoreButton.hidden = !hasMore;
      } catch (error) {
        console.error('[Críos&Rango productos] No se pudo cargar la página del catálogo',error);
        if (!append) showEmpty();
        hasMore = false;
      } finally {
        loading = false;
        if (loadMoreButton) { loadMoreButton.disabled = false; loadMoreButton.removeAttribute('aria-busy'); }
      }
    };
    if (filtered) loadPage(1,false);
    if (loadMoreButton) loadMoreButton.addEventListener('click',()=>{if(hasMore)loadPage(currentPage+1,true);});
    if (orderControl) orderControl.addEventListener('change',()=>{
      const nextUrl = new URL(window.location.href);
      if (orderControl.value === 'date') nextUrl.searchParams.delete('orderby');
      else nextUrl.searchParams.set('orderby',orderControl.value);
      window.location.assign(nextUrl.toString());
    });
  }

})();