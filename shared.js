/* sexí v9.1 — shared JS
   - Mobile nav burger
   - Mark active nav link
   - Events filter (Próximas / Archivo / Todas)
   - Galería filter chips (Todo / Historias / Spotlights / Video)
   - Hero video autoplay handling
   - Reveal on scroll
   - Article modal — click-to-expand cards with body, meta, thumb, video embed, gallery strip
   - Cart (localStorage)
   - Favorites (localStorage)
   - Drawer open/close + cart badge + toast
*/
(function () {
  'use strict';

  /* ===== PREVIEW MODE (STANDALONE FORK) =====
     This is the v9-preview build. body.preview-mode is hardcoded in the
     HTML and never removed by JS, so every page loads blurred and stays
     blurred. The old top banner is gone — instead we render a small
     "preview" status pill in the bottom-right floating button stack
     (matches the look of .theme-toggle / .variant-toggle). */
  (function initPreviewModeStandalone() {
    const ensure = () => {
      document.body.classList.add('preview-mode');

      // Tear down legacy/banner UI — pre-v9.55 builds may have these lingering.
      const legacyBanner = document.querySelector('.preview-banner');
      if (legacyBanner) legacyBanner.remove();
      const legacyToggle = document.querySelector('.preview-toggle');
      if (legacyToggle) legacyToggle.remove();

      // Inject the preview pill (status indicator only — non-interactive).
      let pill = document.querySelector('.preview-pill');
      if (!pill) {
        pill = document.createElement('div');
        pill.className = 'preview-pill';
        pill.setAttribute('aria-label', 'Preview mode');
        pill.innerHTML = '<span class="preview-pill__dot" aria-hidden="true"></span><span class="preview-pill__label">preview</span>';
        document.body.appendChild(pill);
      }
    };

    if (document.body) {
      ensure();
    } else {
      document.addEventListener('DOMContentLoaded', ensure, { once: true });
    }
  })();


  /* ===== THEME TOGGLE (light/dark, persisted) =====
     Reads localStorage and applies body.theme-light if user picked light.
     Toggle button is rendered on home/home-locked next to the variant-toggle.
     Theme persists across every page (tienda, cart, etc).
     Also keeps <meta name="theme-color"> in sync so the iOS Safari status
     bar at the very top of the screen matches the page (white in light
     mode, black in dark mode). */
  (function initTheme() {
    var KEY = 'sexi_theme';
    function syncStatusBar(theme) {
      var color = theme === 'light' ? '#ffffff' : '#000000';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metas.length === 0) {
        var m = document.createElement('meta');
        m.name = 'theme-color';
        m.content = color;
        document.head.appendChild(m);
      } else {
        metas.forEach(function (m) { m.setAttribute('content', color); });
      }
    }
    function apply(theme) {
      if (theme === 'light') document.body.classList.add('theme-light');
      else document.body.classList.remove('theme-light');
      syncStatusBar(theme);
    }
    function read() {
      try { return localStorage.getItem(KEY) || 'dark'; } catch (_) { return 'dark'; }
    }
    function write(t) {
      try { localStorage.setItem(KEY, t); } catch (_) {}
    }
    function setLabel(btn, theme) {
      btn.textContent = theme === 'light' ? 'modo oscuro' : 'modo claro';
    }
    function ensureButton() {
      // Only render the toggle on pages that have a variant-toggle (home + home-locked)
      var anchor = document.querySelector('.variant-toggle');
      if (!anchor) return;
      if (document.querySelector('.theme-toggle')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-toggle';
      var current = read();
      setLabel(btn, current);
      btn.addEventListener('click', function () {
        var next = read() === 'light' ? 'dark' : 'light';
        write(next);
        apply(next);
        setLabel(btn, next);
      });
      anchor.parentNode.insertBefore(btn, anchor);
    }
    apply(read());
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
    } else {
      ensureButton();
    }
  })();

  /* ===== MOBILE NAV ===== */
  document.addEventListener('click', (e) => {
    const burger = e.target.closest('[data-nav-burger]');
    if (burger) {
      const menu = document.querySelector('[data-nav-menu]');
      const header = document.querySelector('header.nav');
      if (!menu) return;
      const open = menu.classList.toggle('open');
      // Also toggle a class on the header so CSS can target reliably
      // without depending on :has() (some mobile renderers are flaky on it).
      if (header) header.classList.toggle('nav--menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    // Tap a nav menu link -> close the menu (mobile UX)
    const navLink = e.target.closest('[data-nav-menu] a');
    if (navLink) {
      const menu = document.querySelector('[data-nav-menu]');
      const header = document.querySelector('header.nav');
      const burger = document.querySelector('[data-nav-burger]');
      if (menu) menu.classList.remove('open');
      if (header) header.classList.remove('nav--menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ===== MARK ACTIVE NAV LINK ===== */
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('[data-nav-menu] a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === current || (current === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ===== EVENTS FILTER ===== */
  const evFilter = document.querySelector('[data-events-filter]');
  if (evFilter) {
    const sections = document.querySelectorAll('.rs-section');
    const setFilter = (filter) => {
      // Heuristic: first rs-section after filter = upcoming, second = past archive
      let upcoming = null, past = null;
      sections.forEach(s => {
        const title = (s.querySelector('.rs-section__label') || {}).textContent || '';
        if (/próximas/i.test(title)) upcoming = s;
        if (/archivo/i.test(title)) past = s;
      });
      if (filter === 'all') {
        if (upcoming) upcoming.style.display = '';
        if (past) past.style.display = '';
      } else if (filter === 'upcoming') {
        if (upcoming) upcoming.style.display = '';
        if (past) past.style.display = 'none';
      } else if (filter === 'past') {
        if (upcoming) upcoming.style.display = 'none';
        if (past) past.style.display = '';
      }
    };
    evFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.events-filter__btn');
      if (!btn) return;
      evFilter.querySelectorAll('.events-filter__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      setFilter(btn.dataset.filter);
    });
    // apply default pressed filter on load
    const pressed = evFilter.querySelector('[aria-pressed="true"]');
    if (pressed) setFilter(pressed.dataset.filter);
  }

  /* ===== GALERÍA FILTER CHIPS ===== */
  const galFilter = document.querySelector('[data-gal-filter]');
  if (galFilter) {
    galFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.gal-filter__btn');
      if (!btn) return;
      galFilter.querySelectorAll('.gal-filter__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const filter = btn.dataset.filter;
      // Include both grid cards and the lead story (outside the grid)
      const targets = document.querySelectorAll('[data-gal-grid] [data-type], .rs-lead[data-type]');
      targets.forEach(card => {
        const type = card.dataset.type;
        if (filter === 'all' || filter === type) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  /* ===== TIENDA: RENDER PRODUCTS FROM SHOPIFY STOREFRONT API =====
     Shopify is the single source of truth for products. Photos uploaded
     in Shopify, prices, sizes, inventory all flow through automatically.
     No more products.json, no more committing image files for each
     product update. */
  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  // Wrap "sexí" in pink + x-mark accent and wrap heart emoji in pink so the
  // brand styling carries through regardless of what's typed in Shopify.
  function brandNameHtml(title) {
    if (!title) return '';
    var s = escapeAttr(title);
    s = s.replace(/sex[íÍi]/gi, '<span class="pink">se<span class="x-mark">x</span>í</span>');
    s = s.replace(/❤/g, '<span class="pink">❤</span>');
    return s;
  }
  // Convert Shopify Storefront API product node to the legacy product shape
  // that renderShopCard + the modal already understand.
  function shopifyNodeToProduct(node) {
    var handle = node.handle || '';
    var title = node.title || '';
    var variantEdges = (node.variants && node.variants.edges) || [];
    var variants = variantEdges.map(function (e) { return e.node; });
    function numericVariantId(gid) {
      return String(gid || '').split('/').pop();
    }
    // Build size -> variantId map
    var variantMap = {};
    var sizes = [];
    variants.forEach(function (v) {
      var opts = v.selectedOptions || [];
      var sizeOpt = opts.find(function (o) { return /talla|size/i.test(o.name); });
      var sizeName = sizeOpt ? sizeOpt.value : 'única';
      if (sizeName === 'Default Title') {
        variantMap['única'] = numericVariantId(v.id);
        if (sizes.indexOf('única') === -1) sizes.push('única');
      } else {
        variantMap[sizeName] = numericVariantId(v.id);
        sizes.push(sizeName);
      }
    });
    var sortOrder = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, 'única': 99 };
    sizes.sort(function (a, b) {
      var oa = sortOrder[a] != null ? sortOrder[a] : 50;
      var ob = sortOrder[b] != null ? sortOrder[b] : 50;
      return oa - ob;
    });
    // Images
    var imageEdges = (node.images && node.images.edges) || [];
    var images = imageEdges.map(function (e) { return e.node.url; }).filter(Boolean);
    var featured = (node.featuredImage && node.featuredImage.url) || images[0] || 'assets/01-brand/logo-01.png';
    // Tags-derived flags
    var tags = node.tags || [];
    var headliner = tags.indexOf('headliner') !== -1 || tags.indexOf('featured') !== -1;
    var soldOut = node.availableForSale === false;
    // Category from Shopify product type
    var pt = (node.productType || '').toLowerCase();
    var category = (pt.indexOf('hat') !== -1 || pt.indexOf('cap') !== -1 || pt.indexOf('gorra') !== -1) ? 'gorra'
      : (pt.indexOf('shirt') !== -1 || pt.indexOf('tee') !== -1 || pt.indexOf('camis') !== -1) ? 'tee'
      : 'item';
    // Price (min variant price)
    var price = parseFloat(
      (node.priceRange && node.priceRange.minVariantPrice && node.priceRange.minVariantPrice.amount)
      || (variants[0] && variants[0].price && variants[0].price.amount)
      || 0
    );
    // Description: Shopify gives HTML. Strip tags for safe display in cards;
    // pass full HTML to the modal via descriptionHtml. Keep both flavors.
    var descHtml = node.descriptionHtml || '';
    var descText = descHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return {
      id: handle,
      name: title,
      name_html: brandNameHtml(title),
      price: price,
      thumbnail: featured,
      gallery: images.length ? images : [featured],
      sizes: sizes.length ? sizes : ['única'],
      category: category,
      headliner: headliner,
      sold_out: soldOut,
      visible: true,
      description: descText,
      shopify_handle: handle,
      shopify_variants: variantMap
    };
  }
  function fetchShopifyProducts() {
    var cfg = window.__sexiShopConfig || {};
    var shop = cfg.shopify_shop || 'sexipr.myshopify.com';
    var token = cfg.shopify_storefront_token;
    var apiVersion = cfg.shopify_api_version || '2024-10';
    if (!token) {
      console.error('[sexi] Storefront token missing — set window.__sexiShopConfig in the page <head>');
      return Promise.resolve([]);
    }
    var query = '{ products(first: 50) { edges { node { id handle title descriptionHtml availableForSale productType tags priceRange { minVariantPrice { amount currencyCode } } featuredImage { url altText } images(first: 8) { edges { node { url altText } } } variants(first: 20) { edges { node { id title availableForSale selectedOptions { name value } price { amount } } } } } } } }';
    return fetch('https://' + shop + '/api/' + apiVersion + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (data) {
        if (data.errors) {
          console.error('[sexi] Shopify Storefront API errors:', data.errors);
          return [];
        }
        var edges = (data.data && data.data.products && data.data.products.edges) || [];
        return edges.map(function (e) { return shopifyNodeToProduct(e.node); });
      });
  }
  function renderShopCard(p) {
    var wide = p.headliner ? ' shop-card--wide' : '';
    var soldOutCls = p.sold_out ? ' shop-card--sold-out' : '';
    var soldOutAttr = p.sold_out ? ' data-sold-out="1"' : '';
    var isPlaceholder = !p.thumbnail || /logo-01\.png$/i.test(p.thumbnail);
    var thumbModifier = isPlaceholder ? ' shop-card__thumb--placeholder' : '';
    var sizes = (p.sizes || []).join(',');
    var galleryArr = (p.gallery && p.gallery.length ? p.gallery : [p.thumbnail]).filter(Boolean);
    var gallery = galleryArr.join(',');
    var titleHtml = p.name_html || escapeAttr(p.name);
    var priceStr = (Number(p.price) || 0).toFixed(2);
    var bodyAttr = p.description ? ' data-article-body="' + escapeAttr(p.description) + '"' : '';
    return '<a href="#" class="shop-card' + wide + soldOutCls + '" data-shop-type="' + escapeAttr(p.category || 'tee') + '"'
      + ' data-product-id="' + escapeAttr(p.id) + '"'
      + ' data-product-name="' + escapeAttr(p.name) + '"'
      + ' data-product-price="' + priceStr + '"'
      + ' data-product-thumb="' + escapeAttr(p.thumbnail || '') + '"'
      + ' data-product-sizes="' + escapeAttr(sizes) + '"'
      + ' data-article-title="' + escapeAttr(titleHtml) + '"'
      + ' data-article-thumb="' + escapeAttr(p.thumbnail || '') + '"'
      + ' data-article-gallery="' + escapeAttr(gallery) + '"'
      + bodyAttr + soldOutAttr + '>'
      + '<div class="shop-card__thumb' + thumbModifier + '">'
      + '<img src="' + escapeAttr(p.thumbnail || '') + '" alt="' + escapeAttr(p.name) + '" loading="lazy">'
      + '</div>'
      + '<div class="shop-card__body">'
      + (p.sold_out ? '<span class="shop-card__sold-badge">agotado</span>' : '')
      + '<h3 class="shop-card__title">' + titleHtml + '</h3>'
      + '<div class="shop-card__meta">'
      + '<span class="shop-card__price">$' + priceStr + '</span>'
      + '</div></div></a>';
  }
  window.__sexiProductSlugs = window.__sexiProductSlugs || {};
  function loadAndRenderProducts() {
    var grid = document.querySelector('[data-shop-grid]');
    fetchShopifyProducts()
      .then(function (products) {
        // Filter visible + sort: headliners first, then API order
        products = products.filter(function (p) { return p && p.id && p.visible !== false; });
        products.sort(function (a, b) {
          var ha = a.headliner ? 1 : 0, hb = b.headliner ? 1 : 0;
          return hb - ha;
        });
        // Cache for cart drawer / variant resolution (works on any page)
        products.forEach(function (p) {
          window.__sexiProductSlugs[p.id] = {
            handle: p.shopify_handle,
            variants: p.shopify_variants
          };
        });
        // Render the grid only if this page has one (tienda)
        if (grid) {
          if (products.length) {
            grid.innerHTML = products.map(renderShopCard).join('');
          } else {
            grid.innerHTML = '<p class="shop-empty-msg">No hay productos disponibles ahora mismo. Vuelve pronto.</p>';
          }
        }
      })
      .catch(function (err) {
        console.error('[sexi] could not load products from Shopify:', err);
        var empty = document.querySelector('[data-shop-empty]');
        if (empty) {
          empty.hidden = false;
          empty.textContent = 'No pudimos cargar los productos. Intenta refrescar.';
        }
      });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndRenderProducts, { once: true });
  } else {
    loadAndRenderProducts();
  }

  /* ===== TIENDA FILTER CHIPS ===== */
  const shopFilter = document.querySelector('[data-shop-filter]');
  if (shopFilter) {
    const grid = document.querySelector('[data-shop-grid]');
    const countEl = document.querySelector('[data-shop-count]');
    const emptyEl = document.querySelector('[data-shop-empty]');

    const applyShopFilter = (filter) => {
      if (!grid) return;
      const cards = grid.querySelectorAll('.shop-card');
      let visible = 0;
      cards.forEach(card => {
        const type = card.dataset.shopType;
        const match = (filter === 'all' || filter === type);
        card.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      if (countEl) {
        countEl.textContent = visible + (visible === 1 ? ' pieza' : ' piezas');
      }
      if (emptyEl) {
        emptyEl.hidden = visible !== 0;
      }
    };

    shopFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.shop-filter__btn');
      if (!btn) return;
      shopFilter.querySelectorAll('.shop-filter__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      applyShopFilter(btn.dataset.filter);
    });

    // Apply default filter on load (the pressed chip)
    const pressed = shopFilter.querySelector('[aria-pressed="true"]');
    applyShopFilter(pressed ? pressed.dataset.filter : 'all');
  }

  /* ===== HERO VIDEO AUTOPLAY + LOOP WATCHDOG ===== */
  const heroVideo = document.querySelector('.hero__video');
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroVideo.loop = true;
    heroVideo.setAttribute('webkit-playsinline', '');
    heroVideo.setAttribute('x5-playsinline', '');
    const play = () => heroVideo.play().catch(() => {});
    play();
    // 1) Re-loop on 'ended' (some browsers drop the loop attribute when MediaSource is recycled).
    heroVideo.addEventListener('ended', () => { heroVideo.currentTime = 0; play(); });
    // 2) Tab visibility — pause when hidden, resume when shown.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) heroVideo.pause(); else play();
    });
    // 3) Watchdog — every 3 seconds, if page is visible but video is paused or hasn't advanced,
    //    force playback. Catches iOS Low Power Mode pauses and Safari's silent buffering stalls.
    let lastTime = 0;
    setInterval(() => {
      if (document.hidden) return;
      if (heroVideo.paused) { play(); return; }
      // If currentTime hasn't advanced for 3s, the video stalled — kick it
      if (heroVideo.currentTime === lastTime && heroVideo.readyState >= 3) {
        try { heroVideo.currentTime = Math.max(0, heroVideo.currentTime + 0.05); } catch (_) {}
        play();
      }
      lastTime = heroVideo.currentTime;
    }, 3000);
    // 4) Resume on user interaction (iOS sometimes blocks autoplay until first tap).
    ['touchstart', 'click', 'pointerdown'].forEach(ev =>
      document.addEventListener(ev, play, { once: true, passive: true })
    );
  }

  /* ===== REVEAL ON SCROLL ===== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  /* ===== ARTICLE MODAL ===== */
  function ensureModal() {
    let modal = document.querySelector('.article-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'article-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = [
      '<article class="article-modal__inner" role="document">',
      '  <button class="article-modal__close" type="button" aria-label="Cerrar">×</button>',
      '  <p class="article-modal__eyebrow"></p>',
      '  <h2 class="article-modal__title"></h2>',
      '  <div class="article-modal__video"></div>',
      '  <div class="article-modal__thumb"><img alt=""></div>',
      '  <p class="article-modal__deck"></p>',
      '  <div class="article-modal__meta"></div>',
      '  <div class="article-modal__body"></div>',
      '  <div class="article-modal__gallery"></div>',
      '</article>'
    ].join('\n');
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.article-modal__close')) closeModal();
    });
    return modal;
  }

  function openModal(card) {
    const modal = ensureModal();
    const inner = modal.querySelector('.article-modal__inner');
    const title    = card.getAttribute('data-article-title')    || card.querySelector('.rs-card__title,.rs-lead__title')?.textContent || '';
    const eyebrow  = card.getAttribute('data-article-eyebrow')  || card.querySelector('.rs-card__eyebrow,.rs-lead__eyebrow')?.textContent || '';
    const deck     = card.getAttribute('data-article-deck')     || card.querySelector('.rs-card__deck,.rs-lead__deck')?.textContent || '';
    const img      = card.getAttribute('data-article-thumb')    || card.getAttribute('data-article-img') || card.querySelector('img')?.getAttribute('src') || '';
    const meta     = card.getAttribute('data-article-meta')     || '';
    const body     = card.getAttribute('data-article-body')     || '';
    const video    = card.getAttribute('data-article-video')    || '';
    const gallery  = card.getAttribute('data-article-gallery')  || '';

    const eyebrowEl = modal.querySelector('.article-modal__eyebrow');
    eyebrowEl.textContent = eyebrow;
    eyebrowEl.style.display = eyebrow ? '' : 'none';
    modal.querySelector('.article-modal__title').innerHTML = title;
    const deckEl = modal.querySelector('.article-modal__deck');
    deckEl.textContent = deck;
    deckEl.style.display = deck ? '' : 'none';

    // Video embed OR thumb (video takes priority) — articles only.
    const videoEl = modal.querySelector('.article-modal__video');
    const thumbEl = modal.querySelector('.article-modal__thumb');
    const isProduct = !!card.getAttribute('data-product-id');
    modal.classList.toggle('is-product', isProduct);

    if (isProduct) {
      // Product — render a swipeable carousel of [thumb, ...gallery] images.
      videoEl.innerHTML = '';
      videoEl.style.display = 'none';
      const allImgs = [img].concat(
        (gallery || '').split(',').map(s => s.trim()).filter(Boolean)
      ).filter(Boolean);
      if (allImgs.length) {
        thumbEl.innerHTML = [
          '<div class="product-strip">',
          allImgs.map(src => '<div class="product-slide"><img src="' + src + '" alt="" loading="lazy"></div>').join(''),
          '</div>',
          allImgs.length > 1 ? [
            '<div class="product-dots">',
            allImgs.map((_, i) => '<span class="product-dot' + (i === 0 ? ' is-active' : '') + '"></span>').join(''),
            '</div>'
          ].join('') : ''
        ].join('');
        thumbEl.style.display = '';
        // Wire up dots → strip scroll position
        const strip = thumbEl.querySelector('.product-strip');
        const dots = thumbEl.querySelectorAll('.product-dot');
        if (strip && dots.length) {
          strip.addEventListener('scroll', () => {
            const i = Math.round(strip.scrollLeft / strip.clientWidth);
            dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
          });
        }
      } else {
        thumbEl.style.display = 'none';
      }
    } else if (video) {
      videoEl.innerHTML = '<iframe src="' + video + '" title="' + title.replace(/"/g, '') + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
      videoEl.style.display = '';
      thumbEl.style.display = 'none';
    } else {
      videoEl.innerHTML = '';
      videoEl.style.display = 'none';
      if (img) {
        // Reset any leftover product-strip markup from a previous open
        if (thumbEl.querySelector('.product-strip')) {
          thumbEl.innerHTML = '<img alt="">';
        }
        thumbEl.querySelector('img').src = img;
        thumbEl.querySelector('img').alt = title.replace(/<[^>]+>/g, '');
        thumbEl.style.display = '';
      } else {
        thumbEl.style.display = 'none';
      }
    }

    const metaEl = modal.querySelector('.article-modal__meta');
    if (meta) {
      const parts = meta.split('·').map(s => s.trim()).filter(Boolean);
      metaEl.innerHTML = parts.map((p, i) =>
        (i === 0 ? '' : '<span class="dot">·</span>') + '<span>' + p + '</span>'
      ).join('');
      metaEl.style.display = '';
    } else {
      metaEl.style.display = 'none';
    }

    const bodyEl = modal.querySelector('.article-modal__body');
    if (body) {
      const paragraphs = body.split(/\n\n+|\|\|/).map(s => s.trim()).filter(Boolean);
      bodyEl.innerHTML = paragraphs.map(p => '<p>' + p + '</p>').join('');
      bodyEl.style.display = '';
    } else {
      bodyEl.style.display = 'none';
    }

    // Product buy block (when card has data-product-id)
    const productId = card.getAttribute('data-product-id');
    let buyEl = modal.querySelector('.article-modal__buy');
    if (productId) {
      if (!buyEl) {
        buyEl = document.createElement('div');
        buyEl.className = 'article-modal__buy';
        bodyEl.parentNode.insertBefore(buyEl, bodyEl.nextSibling);
      }
      const pname = card.getAttribute('data-product-name') || title.replace(/<[^>]+>/g, '');
      const pprice = card.getAttribute('data-product-price') || '0';
      const pthumb = card.getAttribute('data-product-thumb') || img;
      const sizes = (card.getAttribute('data-product-sizes') || 'única').split(',').map(s => s.trim()).filter(Boolean);
      buyEl.innerHTML = [
        '<p class="article-modal__price">$' + parseFloat(pprice).toFixed(2) + '</p>',
        sizes.length > 1 ? [
          '<fieldset class="article-modal__sizes">',
          '<legend>talla</legend>',
          sizes.map((s, i) => '<label><input type="radio" name="modal-size" value="' + s + '"' + (i === 0 ? ' checked' : '') + '><span>' + s + '</span></label>').join(''),
          '</fieldset>'
        ].join('') : '<input type="hidden" name="modal-size" value="' + sizes[0] + '">',
        '<button type="button" class="article-modal__buy-btn" data-modal-add',
        ' data-id="' + productId + '"',
        ' data-name="' + pname.replace(/"/g, '&quot;') + '"',
        ' data-price="' + pprice + '"',
        ' data-thumb="' + pthumb + '">añadir al carrito</button>'
      ].join('');
      buyEl.style.display = '';
    } else if (buyEl) {
      buyEl.style.display = 'none';
    }

    // Gallery strip
    const galEl = modal.querySelector('.article-modal__gallery');
    if (gallery) {
      const imgs = gallery.split(',').map(s => s.trim()).filter(Boolean);
      galEl.innerHTML = imgs.map(src =>
        '<figure class="article-modal__gallery-item"><img src="' + src + '" alt="" loading="lazy"></figure>'
      ).join('');
      galEl.style.display = '';
    } else {
      galEl.innerHTML = '';
      galEl.style.display = 'none';
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    inner.scrollTop = 0;
  }

  function closeModal() {
    const modal = document.querySelector('.article-modal');
    if (!modal) return;
    // stop any video playing
    const videoEl = modal.querySelector('.article-modal__video');
    if (videoEl) videoEl.innerHTML = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // Click handler — trigger modal for any card/lead that has data-article-title
  // or the legacy data-article attribute
  document.addEventListener('click', (e) => {
    // Favorite heart or add-to-cart clicks shouldn't open the modal
    if (e.target.closest('.rs-card__fav, .rs-card__add, .nav__cart, .cart-drawer, .shop-preview__card')) return;
    const card = e.target.closest('[data-article-title], [data-article]');
    if (card) {
      e.preventDefault();
      openModal(card);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
    }
  });

  /* ===== FAVORITES (localStorage) ===== */
  const FAV_KEY = 'sexi_favs_v1';
  function readFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (_) { return []; }
  }
  function writeFavs(favs) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (_) {}
  }
  function isFav(id) { return readFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    let favs = readFavs();
    const i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    writeFavs(favs);
    syncFavButtons();
  }
  function syncFavButtons() {
    document.querySelectorAll('[data-fav]').forEach(btn => {
      const id = btn.getAttribute('data-fav');
      btn.classList.toggle('is-active', isFav(id));
      btn.setAttribute('aria-pressed', isFav(id) ? 'true' : 'false');
    });
  }

  /* ===== SHOPIFY INTEGRATION =====
     Migrated from Fourthwall on 2026-04-26 for faster payouts (2-3 day rolling)
     and easier client self-service. Shop URL + per-product variant IDs come
     from products.json (config + per-product fields). Cart permalink format
     supports multi-item pre-filled carts — better UX than the prior single-
     item Fourthwall redirect. */
  // Defaults if products.json hasn't loaded yet (e.g. cart drawer used from home page)
  const SHOPIFY_SHOP_FALLBACK = 'https://sexi-studios.myshopify.com'; // placeholder until Shopify account exists
  function shopifyShopUrl() {
    var cfg = (window.__sexiShopConfig && window.__sexiShopConfig.shopify_shop) || null;
    if (!cfg) return SHOPIFY_SHOP_FALLBACK;
    return cfg.indexOf('http') === 0 ? cfg : ('https://' + cfg);
  }
  // Build the legacy /cart/<vid>:<qty> permalink. Used as fallback only —
  // some Shopify storefronts route /cart/* through the password page on
  // unlaunched/trial stores, blocking the customer. cartCreate() below
  // bypasses that gate by returning a checkout-domain URL directly.
  function shopifyCheckoutPermalink(cart) {
    var base = shopifyShopUrl();
    if (!cart || cart.length === 0) return base;
    var parts = [];
    cart.forEach(function (item) {
      var meta = (window.__sexiProductSlugs && window.__sexiProductSlugs[item.id]) || null;
      if (meta && typeof meta === 'object' && meta.variants) {
        var size = item.size || 'única';
        var vid = meta.variants[size] || meta.variants['default'] || Object.values(meta.variants)[0];
        if (vid) parts.push(vid + ':' + (item.qty || 1));
      }
    });
    if (parts.length > 0) return base + '/cart/' + parts.join(',');
    if (cart.length === 1) {
      var m = (window.__sexiProductSlugs && window.__sexiProductSlugs[cart[0].id]) || null;
      var h = (m && (m.handle || (typeof m === 'string' ? m : null))) || cart[0].id;
      return base + '/products/' + h;
    }
    return base;
  }

  // === Storefront API cartCreate ===
  // Builds a fresh Shopify cart via the Storefront GraphQL API and returns
  // its checkoutUrl. This URL skips the storefront's password page, since
  // checkout is served from a separate domain on the Shopify edge.
  // Also more robust: each call is a fresh cart, so we never get stuck on
  // expired or stale permalinks.
  function shopifyCheckoutUrlAsync(cart) {
    var cfg = window.__sexiShopConfig || {};
    var shop = cfg.shopify_shop || '';
    var token = cfg.shopify_storefront_token || '';
    var apiVersion = cfg.shopify_api_version || '2024-10';
    if (!shop || !token || !cart || cart.length === 0) {
      return Promise.resolve(shopifyCheckoutPermalink(cart));
    }
    var endpoint = (shop.indexOf('http') === 0 ? shop : 'https://' + shop)
                 + '/api/' + apiVersion + '/graphql.json';
    // Build merchandiseId list from cart variant IDs
    var lines = [];
    cart.forEach(function (item) {
      var meta = (window.__sexiProductSlugs && window.__sexiProductSlugs[item.id]) || null;
      if (meta && typeof meta === 'object' && meta.variants) {
        var size = item.size || 'única';
        var vid = meta.variants[size] || meta.variants['default'] || Object.values(meta.variants)[0];
        if (vid) lines.push({
          merchandiseId: 'gid://shopify/ProductVariant/' + vid,
          quantity: item.qty || 1,
        });
      }
    });
    if (lines.length === 0) return Promise.resolve(shopifyCheckoutPermalink(cart));

    var body = JSON.stringify({
      query: 'mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { field message } } }',
      variables: { input: { lines: lines } },
    });

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: body,
    })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
    .then(function (data) {
      var url = data && data.data && data.data.cartCreate && data.data.cartCreate.cart
              && data.data.cartCreate.cart.checkoutUrl;
      if (url) return url;
      var errs = data && data.data && data.data.cartCreate && data.data.cartCreate.userErrors;
      console.warn('[sexi] cartCreate userErrors:', errs);
      return shopifyCheckoutPermalink(cart);
    })
    .catch(function (err) {
      console.warn('[sexi] cartCreate failed, falling back to permalink:', err);
      return shopifyCheckoutPermalink(cart);
    });
  }

  // Back-compat alias for any place still using the sync name.
  function shopifyCheckoutUrl(cart) { return shopifyCheckoutPermalink(cart); }

  /* ===== CART (localStorage) ===== */
  const CART_KEY = 'sexi_cart_v1';
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (_) { return []; }
  }
  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {}
    syncCartUI();
  }
  function cartCount() {
    return readCart().reduce((sum, it) => sum + (it.qty || 1), 0);
  }
  function cartSubtotal() {
    return readCart().reduce((sum, it) => sum + ((it.price || 0) * (it.qty || 1)), 0);
  }
  function addToCart(item) {
    const cart = readCart();
    const existing = cart.find(c => c.id === item.id && c.size === item.size);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, thumb: item.thumb, size: item.size || 'única', qty: 1 });
    writeCart(cart);
    showToast('Añadido — ' + item.name);
  }
  function removeFromCart(id, size) {
    const cart = readCart().filter(c => !(c.id === id && c.size === size));
    writeCart(cart);
  }
  function setQty(id, size, qty) {
    const cart = readCart();
    const item = cart.find(c => c.id === id && c.size === size);
    if (!item) return;
    item.qty = Math.max(1, qty);
    writeCart(cart);
  }
  function syncCartUI() {
    const navCarts = document.querySelectorAll('.nav__cart');
    const count = cartCount();
    navCarts.forEach(btn => {
      btn.setAttribute('data-count', String(count));
      const label = btn.querySelector('.nav__cart-count, .count');
      if (label) label.textContent = String(count);
    });
    // Render drawer items
    const body = document.querySelector('.cart-drawer__body');
    const foot = document.querySelector('.cart-drawer__foot');
    if (!body) return;
    const cart = readCart();
    // Update count badge in title
    const titleCount = document.querySelector('[data-cart-count]');
    const totalQty = cart.reduce((n, c) => n + (c.qty || 1), 0);
    if (titleCount) {
      titleCount.textContent = totalQty > 0 ? String(totalQty) : '';
      titleCount.style.display = totalQty > 0 ? '' : 'none';
    }
    if (cart.length === 0) {
      body.innerHTML = [
        '<div class="cart-drawer__empty">',
        '  <div class="cart-drawer__empty-mark" aria-hidden="true">se<span class="x-mark">x</span>i</div>',
        '  <strong>tu bolsa está vacía</strong>',
        '  <p>date una vuelta por la tienda y llévate algo <span class="pink">se<span class="x-mark">x</span>i</span>.</p>',
        '  <a href="tienda.html" class="cart-drawer__keep">seguir comprando</a>',
        '</div>'
      ].join('');
      if (foot) foot.style.display = 'none';
    } else {
      body.innerHTML = cart.map(it => [
        '<div class="cart-item">',
        '  <div class="cart-item__thumb">' + (it.thumb ? '<img src="' + it.thumb + '" alt="">' : '<span class="cart-item__thumb-mark" aria-hidden="true">se<span class="x-mark">x</span>i</span>') + '</div>',
        '  <div class="cart-item__body">',
        '    <div class="cart-item__row">',
        '      <p class="cart-item__name">' + wordmarkify(it.name) + '</p>',
        '      <p class="cart-item__price">$' + (it.price * it.qty).toFixed(2) + '</p>',
        '    </div>',
        '    <p class="cart-item__meta">talla · ' + escapeHtml(it.size) + '</p>',
        '    <div class="cart-item__actions">',
        '      <div class="cart-item__qty" data-id="' + it.id + '" data-size="' + it.size + '">',
        '        <button type="button" data-qty="dec" aria-label="Menos">−</button>',
        '        <span>' + it.qty + '</span>',
        '        <button type="button" data-qty="inc" aria-label="Más">+</button>',
        '      </div>',
        '      <button type="button" class="cart-item__remove" data-remove="' + it.id + '|' + it.size + '">quitar</button>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('')).join('');
      if (foot) {
        foot.style.display = '';
        const tot = foot.querySelector('.cart-drawer__summary .amt');
        if (tot) tot.textContent = '$' + cartSubtotal().toFixed(2);
      }
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  // Replace any "sexí" / "sexi" token with the branded wordmark (whole word pink, accent on x)
  function wordmarkify(s) {
    const re = /sex[ií]/gi;
    const str = String(s);
    let out = '', last = 0, m;
    while ((m = re.exec(str)) !== null) {
      out += escapeHtml(str.slice(last, m.index));
      out += '<span class="pink">se<span class="x-mark">x</span>i</span>';
      last = m.index + m[0].length;
    }
    out += escapeHtml(str.slice(last));
    return out;
  }

  /* ===== CART DRAWER ===== */
  function ensureCartDrawer() {
    if (document.querySelector('.cart-drawer')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="cart-backdrop" data-cart-backdrop></div>',
      '<aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Carrito">',
      '  <header class="cart-drawer__head">',
      '    <div class="cart-drawer__head-text">',
      '      <p class="cart-drawer__kicker">se<span class="x-mark">x</span>i shop</p>',
      '      <h3 class="cart-drawer__title">tu carrito <span class="cart-drawer__count" data-cart-count></span></h3>',
      '    </div>',
      '    <button type="button" class="cart-drawer__close" data-cart-close aria-label="Cerrar">×</button>',
      '  </header>',
      '  <div class="cart-drawer__body"></div>',
      '  <footer class="cart-drawer__foot" style="display:none">',
      '    <div class="cart-drawer__summary">',
      '      <div class="cart-drawer__line"><span class="lab">subtotal</span><strong class="amt">$0.00</strong></div>',
      '      <div class="cart-drawer__line cart-drawer__line--muted"><span class="lab">envío</span><span class="val">calculado al pagar</span></div>',
      '    </div>',
      '    <a href="#" class="cart-drawer__checkout" data-cart-checkout><span>pagar</span><span class="cart-drawer__checkout-arrow" aria-hidden="true">→</span></a>',
      '    <a href="tienda.html" class="cart-drawer__keep">seguir comprando</a>',
      '    <p class="cart-drawer__note">al pagar abrimos checkout seguro · envíos a PR &amp; USA</p>',
      '  </footer>',
      '</aside>'
    ].join('');
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }
  function openCart() {
    ensureCartDrawer();
    document.querySelector('.cart-drawer').classList.add('is-open');
    document.querySelector('.cart-backdrop').classList.add('is-open');
    document.body.classList.add('cart-open');
    syncCartUI();
  }
  function closeCart() {
    const drawer = document.querySelector('.cart-drawer');
    const backdrop = document.querySelector('.cart-backdrop');
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('cart-open');
  }

  /* ===== TOAST ===== */
  function showToast(msg) {
    let toast = document.querySelector('.cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('is-show'), 2200);
  }

  /* ===== CLICK WIRING FOR CART/FAV ===== */
  document.addEventListener('click', (e) => {
    // Open cart
    if (e.target.closest('.nav__cart')) {
      e.preventDefault();
      openCart();
      return;
    }
    // Close cart
    if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-backdrop]')) {
      e.preventDefault();
      closeCart();
      return;
    }
    // Checkout — redirect to Fourthwall
    if (e.target.closest('[data-cart-checkout]')) {
      e.preventDefault();
      const cart = readCart();
      if (cart.length === 0) return;
      showToast('abriendo checkout…');
      // Use Storefront API cartCreate when possible (bypasses storefront
      // password page on trial stores, gives a guaranteed-fresh cart).
      // Falls back to /cart/<vid>:<qty> permalink if API call fails.
      // Same-tab navigation: window.open() inside an async .then() is blocked
      // by iOS Safari's popup blocker because it's no longer in the user-tap
      // call stack. location.href works on every browser.
      shopifyCheckoutUrlAsync(cart).then(function (url) {
        window.location.href = url;
      }).catch(function () {
        window.location.href = shopifyCheckoutPermalink(cart);
      });
      return;
    }
    // Qty +/-
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      e.preventDefault();
      const parent = qtyBtn.closest('[data-id]');
      if (!parent) return;
      const id = parent.dataset.id, size = parent.dataset.size;
      const cart = readCart();
      const item = cart.find(c => c.id === id && c.size === size);
      if (!item) return;
      const next = (item.qty || 1) + (qtyBtn.dataset.qty === 'inc' ? 1 : -1);
      if (next < 1) removeFromCart(id, size);
      else setQty(id, size, next);
      return;
    }
    // Remove
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      e.preventDefault();
      const [id, size] = rm.getAttribute('data-remove').split('|');
      removeFromCart(id, size);
      return;
    }
    // Add to cart quick button (from product grid)
    const addBtn = e.target.closest('.rs-card__add');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = addBtn.closest('[data-product-id]');
      if (!card) return;
      addToCart({
        id: card.dataset.productId,
        name: card.dataset.productName,
        price: parseFloat(card.dataset.productPrice),
        thumb: card.dataset.productThumb,
        size: card.dataset.productSize || 'única'
      });
      return;
    }
    // Favorite heart
    const favBtn = e.target.closest('.rs-card__fav');
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleFav(favBtn.getAttribute('data-fav'));
      return;
    }
    // Add-to-cart from inside product modal
    const modalAdd = e.target.closest('[data-modal-add]');
    if (modalAdd) {
      e.preventDefault();
      const id = modalAdd.getAttribute('data-id');
      const name = modalAdd.getAttribute('data-name');
      const price = parseFloat(modalAdd.getAttribute('data-price'));
      const thumb = modalAdd.getAttribute('data-thumb');
      const sizeEl = document.querySelector('[name="modal-size"]:checked');
      const size = sizeEl ? sizeEl.value : 'única';
      addToCart({ id, name, price, thumb, size });
      return;
    }
  });

  /* ===== INIT ===== */
  document.addEventListener('DOMContentLoaded', () => {
    ensureCartDrawer();
    syncCartUI();
    syncFavButtons();
  });
  // Also run immediately in case DOMContentLoaded already fired
  ensureCartDrawer();
  syncCartUI();
  syncFavButtons();

  // Expose minimal API for page scripts (e.g., tienda.html)
  window.sexi = window.sexi || {};
  window.sexi.addToCart = addToCart;
  window.sexi.openCart = openCart;
  window.sexi.toggleFav = toggleFav;
  window.sexi.isFav = isFav;
})();
