(() => {
    'use strict';

    if (window.__CR_RAIL_DEBUG_ACTIVE__) return;
    window.__CR_RAIL_DEBUG_ACTIVE__ = true;

    const page = document.body.classList.contains('woocommerce-cart') ? 'CART' : 'CHECKOUT';
    const variableNames = [
        '--cr-card-inline-inset',
        '--cr-cart-card-inline-gutter',
        '--cr-checkout-visible-field-inset',
        '--cr-card-radius',
        '--cr-card-border-width'
    ];
    const propertyNames = [
        'display', 'position', 'width', 'maxWidth', 'minWidth',
        'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight',
        'borderLeftWidth', 'borderRightWidth', 'boxSizing',
        'borderCollapse', 'borderSpacing', 'tableLayout'
    ];
    let latestSnapshot = null;
    let panel = null;
    let output = null;
    let primaryRect = null;
    let resizeObserver = null;
    let scheduled = false;

    const selectorName = (element) => {
        if (!element || element.nodeType !== 1) return null;
        if (element.id) return '#' + element.id;
        const tag = element.tagName.toLowerCase();
        const classes = Array.from(element.classList || []).slice(0, 4);
        let name = tag + classes.map((item) => '.' + item).join('');
        const siblings = element.parentElement
            ? Array.from(element.parentElement.children).filter((item) => item.tagName === element.tagName)
            : [];
        if (siblings.length > 1) name += ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')';
        return name;
    };

    const rectData = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            right: rect.right,
            width: rect.width,
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height
        };
    };

    const measureElement = (element) => {
        if (!element) return null;
        const style = window.getComputedStyle(element);
        const computed = {};
        propertyNames.forEach((property) => { computed[property] = style[property]; });
        return {
            selector: selectorName(element),
            parentSelector: selectorName(element.parentElement),
            rect: rectData(element),
            computed
        };
    };

    const ancestryFor = (target) => {
        const result = [];
        let current = target;
        while (current && current.nodeType === 1) {
            result.push(measureElement(current));
            if (current === document.body) break;
            current = current.parentElement;
        }
        return result;
    };

    const variablesFor = (ancestries) => {
        const result = {};
        const seen = new Set();
        Object.keys(ancestries).forEach((key) => {
            (ancestries[key] || []).forEach((entry) => {
                const element = findElementBySelectorInChain(key, entry.selector);
                if (!element || seen.has(element)) return;
                seen.add(element);
                const style = window.getComputedStyle(element);
                const values = {};
                variableNames.forEach((name) => { values[name] = style.getPropertyValue(name).trim(); });
                result[entry.selector] = values;
            });
        });
        return result;
    };

    const findElementBySelectorInChain = (key, selector) => {
        const targetSelector = key === 'cartProductCard'
            ? '.cr-cart-item__card'
            : key === 'additionalInfo'
                ? '.cr-checkout-additional-info'
                : '#shipping_method.woocommerce-shipping-methods';
        const target = document.querySelector(targetSelector);
        let current = target;
        while (current && current.nodeType === 1) {
            if (selectorName(current) === selector) return current;
            current = current.parentElement;
        }
        return null;
    };

    const makeSnapshot = () => {
        const viewport = {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            documentClientWidth: document.documentElement.clientWidth
        };
        const ancestry = {};
        const target = {};

        if (page === 'CART') {
            const card = document.querySelector('.cr-cart-item__card');
            target.cartProductCard = rectData(card);
            ancestry.cartProductCard = ancestryFor(card);
        } else {
            const additional = document.querySelector('.cr-checkout-additional-info');
            const shipping = document.querySelector('#shipping_method.woocommerce-shipping-methods');
            target.additionalInfo = rectData(additional);
            target.shipping = rectData(shipping);
            ancestry.additionalInfo = ancestryFor(additional);
            ancestry.shipping = ancestryFor(shipping);
        }

        return {
            page,
            capturedAt: new Date().toISOString(),
            viewport,
            target,
            ancestry,
            cssVariables: variablesFor(ancestry)
        };
    };

    const primaryTargetRect = (snapshot) => page === 'CART'
        ? snapshot.target.cartProductCard
        : snapshot.target.additionalInfo;

    const createPanel = () => {
        panel = document.createElement('section');
        panel.id = 'cr-rail-debug-panel';
        panel.setAttribute('aria-label', 'CR RAIL DEBUG');
        panel.style.cssText = [
            'position:fixed',
            'left:8px',
            'right:8px',
            'bottom:8px',
            'z-index:2147483647',
            'max-height:66vh',
            'display:flex',
            'flex-direction:column',
            'gap:7px',
            'box-sizing:border-box',
            'padding:10px',
            'border:1px solid #777',
            'border-radius:10px',
            'background:#111',
            'color:#fff',
            'font:12px/1.35 monospace',
            'box-shadow:0 2px 18px rgba(0,0,0,.45)'
        ].join(';');

        const heading = document.createElement('div');
        heading.textContent = 'CR RAIL DEBUG · ' + page;
        heading.style.cssText = 'font-weight:700;font-size:14px';

        const viewport = document.createElement('div');
        viewport.id = 'cr-rail-debug-viewport';

        primaryRect = document.createElement('div');
        primaryRect.id = 'cr-rail-debug-target';
        primaryRect.style.cssText = 'font-weight:700;overflow-wrap:anywhere';

        output = document.createElement('textarea');
        output.id = 'cr-rail-debug-json';
        output.readOnly = true;
        output.setAttribute('aria-label', 'JSON completo del diagnóstico');
        output.style.cssText = [
            'display:block',
            'width:100%',
            'min-height:100px',
            'max-height:38vh',
            'flex:1 1 auto',
            'box-sizing:border-box',
            'resize:vertical',
            'background:#fff',
            'color:#111',
            'font:10px/1.3 monospace',
            'padding:6px',
            'border:1px solid #aaa'
        ].join(';');

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copiar diagnóstico';
        copy.style.cssText = 'padding:8px 10px;font-weight:700';
        copy.addEventListener('click', async () => {
            output.focus();
            output.select();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(output.value);
                } else if (!document.execCommand('copy')) {
                    throw new Error('clipboard fallback unavailable');
                }
                copy.textContent = 'Copiado';
            } catch (_) {
                copy.textContent = 'Seleccionado: copiar manualmente';
            }
        });

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Cerrar panel';
        close.style.cssText = 'padding:8px 10px';
        close.addEventListener('click', () => { panel.hidden = true; });

        actions.append(copy, close);
        panel.append(heading, viewport, primaryRect, output, actions);
        document.body.appendChild(panel);
    };

    const render = () => {
        if (!latestSnapshot || !panel || !output) return;
        const viewport = latestSnapshot.viewport;
        const viewportNode = panel.querySelector('#cr-rail-debug-viewport');
        viewportNode.textContent = 'Viewport: ' + viewport.innerWidth + '×' + viewport.innerHeight
            + ' CSS px · DPR ' + viewport.devicePixelRatio
            + ' · clientWidth ' + viewport.documentClientWidth;
        const rect = primaryTargetRect(latestSnapshot);
        primaryRect.textContent = 'TARGET RECT: ' + (rect
            ? 'left ' + rect.left.toFixed(2) + ' · right ' + rect.right.toFixed(2) + ' · width ' + rect.width.toFixed(2)
            : 'target no encontrado');
        output.value = JSON.stringify(latestSnapshot, null, 2);
    };

    const measure = () => {
        scheduled = false;
        latestSnapshot = makeSnapshot();
        render();
        if (resizeObserver) resizeObserver.disconnect();
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(scheduleMeasure);
            Object.keys(latestSnapshot.ancestry).forEach((key) => {
                const targetSelector = key === 'cartProductCard'
                    ? '.cr-cart-item__card'
                    : key === 'additionalInfo'
                        ? '.cr-checkout-additional-info'
                        : '#shipping_method.woocommerce-shipping-methods';
                const target = document.querySelector(targetSelector);
                let current = target;
                while (current && current.nodeType === 1) {
                    resizeObserver.observe(current);
                    if (current === document.body) break;
                    current = current.parentElement;
                }
            });
        }
    };

    function scheduleMeasure() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(measure);
    }

    const isPanelOnlyMutation = (mutation) => {
        if (panel && (mutation.target === panel || panel.contains(mutation.target))) return true;
        const changed = Array.from(mutation.addedNodes || []).concat(Array.from(mutation.removedNodes || []));
        return changed.length > 0 && changed.every((node) => node === panel || (node.nodeType === 1 && node.id === 'cr-rail-debug-panel'));
    };

    const start = () => {
        if (!document.body) return;
        createPanel();
        measure();
        window.addEventListener('resize', scheduleMeasure, { passive: true });
        window.addEventListener('orientationchange', scheduleMeasure, { passive: true });

        if (page === 'CHECKOUT') {
            document.body.addEventListener('updated_checkout', scheduleMeasure);
            if (window.jQuery) {
                window.jQuery(document.body).on('updated_checkout.crRailDebug', scheduleMeasure);
            }
        }

        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                if (mutations.some((mutation) => !isPanelOnlyMutation(mutation))) scheduleMeasure();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
