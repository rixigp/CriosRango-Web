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


  // Contextual filters: prefetch one category-wide facet snapshot and reuse it.
  const filterSheet = document.querySelector('[data-cr-filter-sheet]');
  if (filterSheet) {
    const categoryId = String(filterSheet.dataset.categoryId || '');
    const apiUrl = filterSheet.dataset.apiUrl;
    let termLabels = {};
    try { termLabels = JSON.parse(filterSheet.dataset.termLabels || '{}'); } catch (error) {}
    const dimensions = ['sizes', 'colors', 'brands'];
    const apiKeys = {sizes:'size_ids',colors:'color_ids',brands:'brand_ids'};
    const taxonomies = {sizes:'pa_tallas',colors:'pa_color',brands:'product_tag'};
    const initialKeys = {sizes:'initialSizes',colors:'initialColors',brands:'initialBrands'};
    const ttl = 300000, storageKey = 'cr2026_filters_v1_category_' + categoryId;
    const memoryCache = window.categoryFacetCache || (window.categoryFacetCache = Object.create(null));
    const inflight = window.cr2026FacetRequests || (window.cr2026FacetRequests = Object.create(null));
    const collator = new Intl.Collator('es',{sensitivity:'base',numeric:true});
    let snapshot = null, activeDimension = 'sizes', currentRows = [], savedScrollY = 0;
    const draft = {sizes:[],colors:[],brands:[]};
    const optionsNode = filterSheet.querySelector('[data-cr-filter-options]');
    const dialog = filterSheet.querySelector('.cr-category-filter-sheet__dialog');
    const openButtons = Array.from(document.querySelectorAll('[data-cr-filter-open]'));
    const normalize = value => String(value||'').trim().normalize('NFC').toLocaleLowerCase('es');
    const isValid = value => value && Number(value.timestamp)>0 && Date.now()-Number(value.timestamp)<ttl && dimensions.every(d=>Array.isArray(value[d]));
    const readSession = () => {try{const value=JSON.parse(sessionStorage.getItem(storageKey)||'null');return isValid(value)?value:null;}catch(error){return null;}};
    const storeSnapshot = value => {snapshot=value;memoryCache[categoryId]=value;try{sessionStorage.setItem(storageKey,JSON.stringify(value));}catch(error){}};
    const rowsFor = (facet,dimension) => {
      const grouped=new Map(),taxonomy=taxonomies[dimension];
      (Array.isArray(facet)?facet:[]).forEach(item=>{
        const id=String(item&&item.term_id||''),meta=termLabels[taxonomy]&&termLabels[taxonomy][id];
        if(!id||!meta||!meta.label)return;
        const label=String(meta.label).trim(),key=normalize(label);
        if(!grouped.has(key))grouped.set(key,{label,slug:meta.slug||'',term_ids:[],count:0});
        const row=grouped.get(key);row.term_ids.push(id);row.count+=Number(item.count)||0;
      });
      const rows=Array.from(grouped.values()).map(row=>({...row,term_ids:Array.from(new Set(row.term_ids))}));
      if(dimension==='sizes'){
        const order=['XXS','2XS','XS','S','SM','M','ML','L','XL','XXL','2XL','XXXL','3XL','4XL','5XL','UNICA','ÚNICA','TU'];
        const key=label=>{const s=label.trim().toLocaleUpperCase('es'),n=s.match(/^([0-9]+(?:[.,][0-9]+)?)$/);return n?[0,Number(n[1].replace(',','.')),s]:[1,order.indexOf(s)<0?order.length:order.indexOf(s),s];};
        rows.sort((a,b)=>{const x=key(a.label),y=key(b.label);return x[0]-y[0]||x[1]-y[1]||collator.compare(x[2],y[2]);});
      }else rows.sort((a,b)=>collator.compare(a.label,b.label));
      return rows;
    };
    const render = (dimension,rows) => {
      currentRows=rows;optionsNode.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.className='cr-category-filter-sheet__empty';empty.textContent='No hay opciones disponibles.';optionsNode.appendChild(empty);return;}
      rows.forEach(row=>{
        const selected=row.term_ids.every(id=>draft[dimension].includes(id));
        const chip=document.createElement('button');chip.type='button';chip.className='cr-category-filter-sheet__option'+(selected?' is-selected':'');chip.setAttribute('aria-pressed',String(selected));chip.setAttribute('aria-label',row.label);
        if(dimension==='colors'){
          const swatch=document.createElement('span');swatch.className='cr-category-filter-sheet__swatch';swatch.setAttribute('aria-hidden','true');
          const swatches={azul:'#4B78B8','azul claro':'#91BDE8','azul marino':'#203B68','azul turquesa':'#48B8B1',beige:'#D8C6A5',berenjena:'#65345C',blanco:'#FFFFFF',caldero:'#B86B3C',negro:'#222222',rojo:'#C74A45',verde:'#56856A',gris:'#929292',rosa:'#D88FA8',amarillo:'#E5C84D',marron:'#806044','marrón':'#806044'};
          swatch.style.backgroundColor=swatches[normalize(row.label)]||'#B8B8B2';chip.appendChild(swatch);
        }
        const label=document.createElement('span');label.textContent=row.label;chip.appendChild(label);
        chip.addEventListener('click',()=>{const all=row.term_ids.every(id=>draft[dimension].includes(id));if(all)draft[dimension]=draft[dimension].filter(id=>!row.term_ids.includes(id));else row.term_ids.forEach(id=>{if(!draft[dimension].includes(id))draft[dimension].push(id);});render(dimension,currentRows);});
        optionsNode.appendChild(chip);
      });
    };
    let errorPanelShown=false;
    const showError = () => {
      if(errorPanelShown)return;errorPanelShown=true;optionsNode.replaceChildren();
      const message=document.createElement('p');message.className='cr-category-filter-sheet__empty';message.textContent='No se han podido cargar los filtros.';
      const retry=document.createElement('button');retry.type='button';retry.className='cr-category-filter-sheet__retry';retry.textContent='Reintentar';
      retry.addEventListener('click',()=>{errorPanelShown=false;retry.disabled=true;getSnapshot(true).then(value=>render(activeDimension,value[activeDimension])).catch(showError);});
      optionsNode.append(message,retry);
    };
    const getSnapshot = (retry=false) => {
      const cached=memoryCache[categoryId]||readSession();
      if(!retry&&isValid(cached)){snapshot=cached;memoryCache[categoryId]=cached;return Promise.resolve(cached);}
      if(!retry&&inflight[categoryId])return inflight[categoryId];
      const params=new URLSearchParams({scope:'catalog',catalog_category_id:categoryId,facet:'all',page:'1',per_page:'1'});
      inflight[categoryId]=fetch(apiUrl+'?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}}).then(async response=>{
        if(!response.ok)throw new Error('Filter API HTTP '+response.status);
        const payload=await response.json(),facets=payload&&payload.facets||{};
        const value={timestamp:Date.now(),sizes:rowsFor(facets.sizes,'sizes'),colors:rowsFor(facets.colors,'colors'),brands:rowsFor(facets.brands,'brands')};
        storeSnapshot(value);errorPanelShown=false;return value;
      }).finally(()=>{delete inflight[categoryId];});
      return inflight[categoryId];
    };
    const setDimension = dimension => {
      if(!dimensions.includes(dimension))return;activeDimension=dimension;
      filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>{const active=button.dataset.crFilterTab===dimension;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
      if(snapshot)render(dimension,snapshot[dimension]);else if(errorPanelShown){return;}else{optionsNode.textContent='Cargando opciones…';getSnapshot().then(value=>render(dimension,value[dimension])).catch(showError);}
    };
    const closeSheet = () => {filterSheet.hidden=true;document.body.classList.remove('cr-category-filter-open');document.body.style.removeProperty('overflow');window.scrollTo(0,savedScrollY);};
    const openSheet = () => {
      savedScrollY=window.scrollY;dimensions.forEach(d=>draft[d]=(filterSheet.dataset[initialKeys[d]]||'').split(',').filter(Boolean));
      filterSheet.hidden=false;document.body.classList.add('cr-category-filter-open');document.body.style.overflow='hidden';
      snapshot=memoryCache[categoryId]||readSession();if(isValid(snapshot))memoryCache[categoryId]=snapshot;else snapshot=null;
      setDimension('sizes');window.requestAnimationFrame(()=>dialog.focus());
    };
    openButtons.forEach(button=>button.addEventListener('click',openSheet));
    filterSheet.querySelectorAll('[data-cr-filter-close]').forEach(button=>button.addEventListener('click',closeSheet));
    filterSheet.querySelectorAll('[data-cr-filter-tab]').forEach(button=>button.addEventListener('click',()=>setDimension(button.dataset.crFilterTab)));
    filterSheet.querySelector('[data-cr-filter-clear]').addEventListener('click',()=>{dimensions.forEach(d=>draft[d]=[]);if(snapshot)render(activeDimension,snapshot[activeDimension]);});
    filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click',()=>{
      const url=new URL(window.location.href);dimensions.forEach(d=>{url.searchParams.delete(apiKeys[d]);if(draft[d].length)url.searchParams.set(apiKeys[d],Array.from(new Set(draft[d])).sort((a,b)=>Number(a)-Number(b)).join(','));});
      window.location.assign(url.toString());
    });
    document.addEventListener('keydown',event=>{if(!filterSheet.hidden&&event.key==='Escape')closeSheet();});
    const prefetch=()=>getSnapshot().catch(showError);
    if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(prefetch,{timeout:1800});else window.setTimeout(prefetch,350);
  }
})();
