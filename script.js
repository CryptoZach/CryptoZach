(function(){
  // Theme toggle (default = dark for new visitors; light only when explicitly saved)
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  const saved = localStorage.getItem('theme');
  if(saved === 'light'){
    root.removeAttribute('data-theme');
    if(toggle) toggle.setAttribute('aria-pressed','false');
  } else {
    root.setAttribute('data-theme','dark');
    if(toggle) toggle.setAttribute('aria-pressed','true');
  }

  if(toggle){
    toggle.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      if(isDark){
        root.removeAttribute('data-theme');
        localStorage.setItem('theme','light');
        toggle.setAttribute('aria-pressed','false');
      } else {
        root.setAttribute('data-theme','dark');
        localStorage.setItem('theme','dark');
        toggle.setAttribute('aria-pressed','true');
      }
    });
  }

  // Scroll progress bar (hidden at top; avoids scaleX(0) subpixel glitches in some engines)
  const scrollProgress = document.querySelector('.scroll-progress');
  if(scrollProgress){
    const updateScrollProgress = () => {
      const el = document.documentElement;
      const st = el.scrollTop;
      const sh = el.scrollHeight - el.clientHeight;
      const p = sh <= 0 ? 0 : st / sh;
      const clamped = Math.max(0, Math.min(1, p));
      scrollProgress.style.transform = 'scaleX(' + clamped + ')';
      scrollProgress.style.opacity = clamped > 0.002 ? '1' : '0';
    };
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    updateScrollProgress();
  }

  // Scroll reveal: add .visible when .reveal / .stagger-item enter viewport
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!prefersReducedMotion){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.01 });
    document.querySelectorAll('.reveal, .stagger-item').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal, .stagger-item').forEach(el => el.classList.add('visible'));
  }

  // Mobile menu
  const menuToggle = document.getElementById('menuToggle');
  const navMobile = document.getElementById('nav-mobile');
  if(menuToggle && navMobile){
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      const nextOpen = !open;
      menuToggle.setAttribute('aria-expanded', String(nextOpen));
      navMobile.hidden = open;
      navMobile.inert = open;
      navMobile.setAttribute('aria-hidden', String(open));
      navMobile.classList.toggle('open', nextOpen);
    });
  }

  // Back to top
  const backToTop = document.getElementById('backToTop');
  if(backToTop){
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Copy email
  const copy = document.getElementById('copyEmail');
  const email = document.getElementById('emailAddr');
  if(copy && email){
    copy.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(email.textContent.trim());
        const prev = copy.textContent;
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = prev), 1200);
      } catch(e){
        window.location.href = 'mailto:' + encodeURIComponent(email.textContent.trim());
      }
    });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Homepage hero eyebrow: green glow follows pointer + dollar splash around cursor
  const heroEyebrow = document.querySelector('#hero.hero--homepage .hero-eyebrow');
  if(heroEyebrow && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const setEyebrowSpot = (clientX, clientY) => {
      const r = heroEyebrow.getBoundingClientRect();
      heroEyebrow.style.setProperty('--hero-eyebrow-x', (clientX - r.left) + 'px');
      heroEyebrow.style.setProperty('--hero-eyebrow-y', (clientY - r.top) + 'px');
    };

    var dollarLastSpawn = 0;
    var dollarThrottleMs = 140;
    var dollarMaxLive = 12;

    function spawnEyebrowDollars(clientX, clientY){
      var now = performance.now();
      if(now - dollarLastSpawn < dollarThrottleMs){
        return;
      }
      dollarLastSpawn = now;
      var r = heroEyebrow.getBoundingClientRect();
      var lx = clientX - r.left;
      var ly = clientY - r.top;
      var burst = Math.random() < 0.22 ? 2 : 1;
      for(var b = 0; b < burst; b++){
        var el = document.createElement('span');
        el.className = 'hero-eyebrow-dollar';
        el.setAttribute('aria-hidden', 'true');
        var jitterX = (Math.random() - 0.5) * 34;
        var jitterY = (Math.random() - 0.5) * 18;
        var driftX = (Math.random() - 0.5) * 36;
        var driftY = -8 - Math.random() * 26;
        el.style.left = lx + jitterX + 'px';
        el.style.top = ly + jitterY + 'px';
        el.style.setProperty('--dollar-dx', driftX + 'px');
        el.style.setProperty('--dollar-dy', driftY + 'px');
        el.textContent = '$';
        heroEyebrow.appendChild(el);
        var live = heroEyebrow.querySelectorAll('.hero-eyebrow-dollar');
        if(live.length > dollarMaxLive){
          live[0].remove();
        }
        window.setTimeout(function(node){
          if(node.parentNode === heroEyebrow){
            node.remove();
          }
        }, 1450, el);
      }
    }

    heroEyebrow.addEventListener('pointermove', (e) => {
      setEyebrowSpot(e.clientX, e.clientY);
      spawnEyebrowDollars(e.clientX, e.clientY);
    });
    heroEyebrow.addEventListener('pointerenter', (e) => {
      setEyebrowSpot(e.clientX, e.clientY);
      spawnEyebrowDollars(e.clientX, e.clientY);
    });
    heroEyebrow.addEventListener('pointerleave', () => {
      heroEyebrow.style.removeProperty('--hero-eyebrow-x');
      heroEyebrow.style.removeProperty('--hero-eyebrow-y');
    });
  }

  // Homepage hero: full-hero matrix (fiat, tickers, optional PNG icons) on eyebrow hover
  const matrixEyebrow = document.querySelector('#hero.hero--homepage .hero-eyebrow');
  const matrixContainer = document.querySelector('#hero.hero--homepage .matrix-container');
  const matrixCanvas = document.querySelector('#hero.hero--homepage .matrix-canvas');
  if(matrixEyebrow && matrixContainer && matrixCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const mtxCtx = matrixCanvas.getContext('2d');
    const textChars = [
      '$', '$', '$', '$', '$', '$',
      '€', '£', '¥', '₩', '₹', '₣', '₴', '₱', '\uFDFC',
      '₿', '\u039E',
      'XAU', 'XAG', 'WTI', 'NG', 'CL',
      'SOFR', 'FFR', 'DXY', 'VIX', 'SPX', 'NDX'
    ];

    var mtxFiatNonUsd = { '€': 1, '£': 1, '¥': 1, '₩': 1, '₹': 1, '₣': 1, '₴': 1, '₱': 1, '\uFDFC': 1 };

    var iconDefs = [
      { src: './icons/matrix/btc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/eth.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sol.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/dai.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hnt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/fil.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/uni.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/aave.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xrp.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ada.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/avax.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/dot.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/atom.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ltc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/link.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xlm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/doge.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/trx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/bnb.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/op.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/arb.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/near.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/apt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sui.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/inj.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tia.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xmr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/zec.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/crv.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ldo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/stx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/mkr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xtz.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/algo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hbar.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ton.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sei.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wld.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/fet.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/rndr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tao.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/msft.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/gs.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/blk.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/coin.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sq.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/visa.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ma.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/googl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/amzn.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/meta.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nvda.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tsla.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/amd.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nflx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/bac.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wfc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ms.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/schw.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/pypl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/intc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/csco.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/orcl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/dis.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/mstr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hood.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ibm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xom.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/citi.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/brkb.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ko.png', loaded: false, img: null, tinted: null }
    ];

    var mtxCryptoTextList = [];
    var mtxLegacyCryptoMarks = { '₿': 1, '\u039E': 1 };
    var mtxTradTextChars = textChars.filter(function(v){
      return mtxCryptoTextList.indexOf(v) === -1 && !mtxLegacyCryptoMarks[v];
    });

    var mtxStockIconIdx = iconDefs.findIndex(function(d){
      return /\/aapl\.png$/.test(d.src) || d.src.indexOf('aapl.png') >= 0;
    });
    if(mtxStockIconIdx < 0){
      mtxStockIconIdx = iconDefs.length;
    }
    var mtxCryptoIconDefs = iconDefs.slice(0, mtxStockIconIdx);
    var mtxStockIconDefs = iconDefs.slice(mtxStockIconIdx);

    var mtxCryptoPool = mtxCryptoTextList.map(function(v){ return { type: 'text', value: v }; });
    mtxCryptoIconDefs.forEach(function(def){
      mtxCryptoPool.push({ type: 'icon', def: def });
    });

    var mtxTradPool = mtxTradTextChars.map(function(v){ return { type: 'text', value: v }; });
    mtxStockIconDefs.forEach(function(def){
      mtxTradPool.push({ type: 'icon', def: def });
    });

    /* ~35% of glyphs from crypto icons only (no crypto ASCII tickers); rest from fiat, commodities, macro, stock icons */
    var mtxCryptoPickRate = 0.35;
    /* ₿ and Ξ only via this branch so they are not diluted by pools */
    var mtxLegacyMarkRate = 0.15;

    iconDefs.forEach(function(def){
      var img = new Image();
      img.onload = function(){
        def.loaded = true;
        def.img = img;
      };
      img.onerror = function(){
        def.loaded = false;
        def.img = null;
      };
      img.src = def.src;
    });

    var mtxRaf = null;
    var mtxDrops = [];
    var mtxColWidth = 18;
    var mtxFontSize = 10;
    var mtxDollarFontSize = 15;
    var mtxLineStep = 18;
    var mtxDropSkip = 0.133;
    var mtxDropStepMin = 0.133;
    var mtxDropStepRand = 0.08;

    function mtxTrailFill(){
      var cs = getComputedStyle(matrixContainer);
      var raw = cs.getPropertyValue('--matrix-trail-rgb').trim();
      var fadeAlpha = parseFloat(cs.getPropertyValue('--matrix-trail-fade-alpha').trim());
      if(Number.isNaN(fadeAlpha) || fadeAlpha <= 0){
        fadeAlpha = 0.13;
      }
      if(fadeAlpha > 1){
        fadeAlpha = 1;
      }
      var parts = raw.split(/\s+/).map(Number);
      if(parts.length >= 3 && parts.every(function(n){ return !Number.isNaN(n); })){
        return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + fadeAlpha + ')';
      }
      return 'rgba(255, 255, 255, ' + fadeAlpha + ')';
    }

    function buildTinted(def){
      if(def.tinted){
        return def.tinted;
      }
      if(!def.img || !def.loaded){
        return null;
      }
      var tmp = document.createElement('canvas');
      var tw = 32;
      var th = 32;
      tmp.width = tw;
      tmp.height = th;
      var tctx = tmp.getContext('2d');
      tctx.drawImage(def.img, 0, 0, tw, th);
      tctx.globalCompositeOperation = 'source-atop';
      tctx.fillStyle = 'rgba(74, 222, 128, 1)';
      tctx.fillRect(0, 0, tw, th);
      tctx.globalCompositeOperation = 'source-over';
      def.tinted = tmp;
      return tmp;
    }

    function pickItem(){
      if(Math.random() < mtxLegacyMarkRate){
        return { type: 'text', value: Math.random() < 0.5 ? '₿' : '\u039E' };
      }
      var useCrypto = Math.random() < mtxCryptoPickRate;
      var source = useCrypto ? mtxCryptoPool : mtxTradPool;
      if(!source.length){
        source = mtxTradPool.length ? mtxTradPool : mtxCryptoPool;
      }
      var item = source[Math.floor(Math.random() * source.length)];
      if(item.type === 'icon'){
        if(item.def.loaded && item.def.img){
          return item;
        }
        var fb = useCrypto ? mtxCryptoTextList : mtxTradTextChars;
        if(!fb.length && useCrypto){
          fb = ['₿', '\u039E'];
        }
        if(!fb.length){
          fb = mtxTradTextChars;
        }
        return { type: 'text', value: fb[Math.floor(Math.random() * fb.length)] };
      }
      return item;
    }

    function mtxInitCanvas(){
      var rect = matrixContainer.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      matrixCanvas.width = Math.floor(w * dpr);
      matrixCanvas.height = Math.floor(h * dpr);
      matrixCanvas.style.width = w + 'px';
      matrixCanvas.style.height = h + 'px';
      mtxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var colCount = Math.max(1, Math.floor(w / mtxColWidth));
      mtxDrops = new Array(colCount).fill(0).map(function(){
        return Math.random() * -20;
      });
    }

    function mtxDraw(){
      if(!matrixContainer.classList.contains('active')){
        mtxRaf = null;
        return;
      }
      var rect = matrixContainer.getBoundingClientRect();
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      mtxCtx.fillStyle = mtxTrailFill();
      mtxCtx.fillRect(0, 0, w, h);
      var mtxFontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      mtxCtx.textBaseline = 'top';

      var n = mtxDrops.length;
      var i;
      for(i = 0; i < n; i++){
        if(Math.random() > 0.3){
          mtxDrops[i] += mtxDropSkip;
          continue;
        }
        var item = pickItem();
        var x = i * mtxColWidth + 1;
        var y = mtxDrops[i] * mtxLineStep;
        var opacity = 0.1 + Math.random() * 0.25;

        if(item.type === 'text'){
          var op = opacity;
          if(item.value === '$'){
            mtxCtx.font = '600 ' + mtxDollarFontSize + 'px ' + mtxFontFamily;
          } else {
            mtxCtx.font = '600 ' + mtxFontSize + 'px ' + mtxFontFamily;
          }
          if(item.value === '₿'){
            mtxCtx.fillStyle = 'rgba(247, 147, 26, ' + Math.min(1, op + 0.2) + ')';
          } else if(item.value === '$'){
            mtxCtx.fillStyle = 'rgba(204, 251, 229, ' + Math.min(0.99, op + 0.22) + ')';
          } else if(mtxFiatNonUsd[item.value]){
            mtxCtx.fillStyle = 'rgba(118, 224, 159, ' + Math.min(0.94, op + 0.1) + ')';
          } else {
            mtxCtx.fillStyle = 'rgba(74, 222, 128, ' + op + ')';
          }
          mtxCtx.fillText(item.value, x, y);
        } else if(item.type === 'icon' && item.def.loaded && item.def.img){
          var tint = buildTinted(item.def);
          if(tint){
            var iconSize = 14;
            mtxCtx.save();
            mtxCtx.globalAlpha = opacity;
            mtxCtx.drawImage(tint, x, y, iconSize, iconSize);
            mtxCtx.restore();
          }
        }

        if(y > h){
          mtxDrops[i] = Math.random() * -5;
        }
        mtxDrops[i] += mtxDropStepMin + Math.random() * mtxDropStepRand;
      }
      mtxRaf = requestAnimationFrame(mtxDraw);
    }

    function mtxStart(){
      mtxInitCanvas();
      matrixContainer.classList.add('active');
      if(!mtxRaf){
        mtxRaf = requestAnimationFrame(mtxDraw);
      }
    }

    function mtxStop(){
      matrixContainer.classList.remove('active');
      if(mtxRaf){
        cancelAnimationFrame(mtxRaf);
        mtxRaf = null;
      }
      window.setTimeout(function(){
        if(matrixContainer.classList.contains('active')){
          return;
        }
        mtxCtx.setTransform(1, 0, 0, 1, 0, 0);
        mtxCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      }, 500);
    }

    matrixEyebrow.addEventListener('pointerenter', mtxStart);
    matrixEyebrow.addEventListener('pointerleave', mtxStop);

    var mtxResizeTimer;
    window.addEventListener('resize', function(){
      clearTimeout(mtxResizeTimer);
      mtxResizeTimer = window.setTimeout(function(){
        if(matrixContainer.classList.contains('active')){
          mtxInitCanvas();
        }
      }, 200);
    });
  }

  // Sticky section rail: Operating-Model.html (Structure), 2026-frameworks.html, speaker.html
  (function(){
    var nav = document.getElementById('structureNav');
    if(!nav){
      return;
    }

    var isSpeakerPage = nav.getAttribute('data-page-nav') === 'speaker';
    var isFrameworks2026 = !!document.getElementById('navDefGroup');
    var speakerLegacyByOld = {
      'speaker-overview': 'in-the-room',
      'speaker-in-room': 'in-the-room',
      'speaker-formats': 'talk-formats',
      'speaker-featured': 'featured-talk',
      'speaker-experience': 'experience',
      'speaker-boundaries': 'boundaries',
      'speaker-advisory': 'advisory',
      'speaker-press': 'press-kit',
      'speaker-booking': 'booking'
    };
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var jumpTo = document.getElementById('jumpTo') || document.querySelector('.structure-jump-to');
    var hideTimer = null;

    function headerOffset(){
      var header = document.querySelector('header');
      return header ? header.offsetHeight : 0;
    }

    function scrollOffsetForTarget(){
      return headerOffset() + (nav.offsetHeight || 48) + 16;
    }

    function showStructureNav(){
      window.clearTimeout(hideTimer);
      nav.removeAttribute('hidden');
      requestAnimationFrame(function(){
        nav.classList.add('visible');
      });
    }

    function hideStructureNav(){
      nav.classList.remove('visible');
      if(reducedMotion){
        nav.setAttribute('hidden', '');
        return;
      }
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function(){
        if(!nav.classList.contains('visible')){
          nav.setAttribute('hidden', '');
        }
      }, 280);
    }

    if(jumpTo){
      var jumpObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            hideStructureNav();
          } else {
            showStructureNav();
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
      jumpObserver.observe(jumpTo);
    } else {
      window.addEventListener('scroll', function(){
        var show = window.scrollY > 300;
        if(show){
          showStructureNav();
        } else {
          hideStructureNav();
        }
      }, { passive: true });
    }

    var sections;
    var bottomSectionId;
    if(isFrameworks2026){
      sections = [
        'definitions',
        'what-stablecoin',
        'what-tokenization',
        'what-deposit',
        'why-care',
        'dollar-objects',
        'five-questions',
        'q1',
        'q2',
        'q3',
        'q4',
        'q5',
        'entry-points',
        'where-to-go'
      ];
      bottomSectionId = 'where-to-go';
    } else if(isSpeakerPage){
      sections = [
        'in-the-room',
        'talk-formats',
        'talk-policy',
        'talk-diligence',
        'talk-builder',
        'featured-talk',
        'experience',
        'boundaries',
        'advisory',
        'adv-diligence',
        'adv-token',
        'adv-policy',
        'press-kit',
        'booking',
        'about-zach',
        'about-this-site'
      ];
      bottomSectionId = 'about-this-site';
    } else {
      sections = [
        'three-dollar-objects',
        'core-frameworks',
        'clii',
        'mvep',
        'credit-migration-model',
        'regime-dashboard',
        'current-agenda',
        'how-the-work-runs',
        'go-deeper'
      ];
      bottomSectionId = 'go-deeper';
    }

    var sectionEls = {};
    sections.forEach(function(id){
      var el = document.getElementById(id);
      if(el){
        sectionEls[id] = el;
      }
    });

    var allLinks = nav.querySelectorAll('[data-section]');
    var structureFrameworkGroup = isFrameworks2026 || isSpeakerPage ? null : nav.querySelector('.structure-nav__group');
    var structureFrameworkIds = ['clii', 'mvep', 'credit-migration-model', 'regime-dashboard'];
    var defGroup = document.getElementById('navDefGroup');
    var qGroup = document.getElementById('navQGroup');
    var defSubIds = ['what-stablecoin', 'what-tokenization', 'what-deposit', 'why-care'];
    var qSubIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
    var navTalkGroup = isSpeakerPage ? document.getElementById('navTalkGroup') : null;
    var navAdvGroup = isSpeakerPage ? document.getElementById('navAdvGroup') : null;
    var speakerTalkSubIds = ['talk-policy', 'talk-diligence', 'talk-builder'];
    var speakerAdvSubIds = ['adv-diligence', 'adv-token', 'adv-policy'];
    function setActive(activeId){
      allLinks.forEach(function(link){
        link.classList.toggle('active', link.getAttribute('data-section') === activeId);
      });

      if(isFrameworks2026){
        var inDef = defSubIds.indexOf(activeId) !== -1 || activeId === 'definitions';
        var inQ = qSubIds.indexOf(activeId) !== -1 || activeId === 'five-questions';
        if(defGroup){
          defGroup.classList.toggle('expanded', inDef);
        }
        if(qGroup){
          qGroup.classList.toggle('expanded', inQ);
        }
      } else if(isSpeakerPage){
        var inTalk = speakerTalkSubIds.indexOf(activeId) !== -1 || activeId === 'talk-formats';
        var inAdv = speakerAdvSubIds.indexOf(activeId) !== -1 || activeId === 'advisory';
        if(navTalkGroup){
          navTalkGroup.classList.toggle('expanded', inTalk);
        }
        if(navAdvGroup){
          navAdvGroup.classList.toggle('expanded', inAdv);
        }
      } else if(structureFrameworkGroup){
        var inFrameworks = structureFrameworkIds.indexOf(activeId) !== -1 || activeId === 'core-frameworks';
        structureFrameworkGroup.classList.toggle('expanded', inFrameworks);
      }

      var activeLink = nav.querySelector('[data-section="' + activeId + '"]');
      if(activeLink){
        var container = nav.querySelector('.structure-nav__links') || nav.querySelector('.structure-nav__inner');
        if(container){
          var linkRect = activeLink.getBoundingClientRect();
          var containerRect = container.getBoundingClientRect();
          if(linkRect.left < containerRect.left || linkRect.right > containerRect.right){
            activeLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
          }
        }
      }
    }

    var activeSection = null;
    var sectionIdsOrdered = sections.filter(function(id){
      return sectionEls[id];
    });

    function pickActiveSectionId(){
      var markerY = window.innerHeight * 0.28;
      var docEl = document.documentElement;
      var maxScroll = Math.max(0, (docEl.scrollHeight || 0) - window.innerHeight);
      var nearBottom = window.scrollY >= maxScroll - 48;
      if(nearBottom && sectionEls[bottomSectionId]){
        return bottomSectionId;
      }
      var bestId = sectionIdsOrdered[0] || null;
      var bestTop = -Infinity;
      sectionIdsOrdered.forEach(function(id){
        var el = sectionEls[id];
        var r = el.getBoundingClientRect();
        if(r.top <= markerY && r.top >= bestTop){
          bestTop = r.top;
          bestId = id;
        }
      });
      return bestId;
    }

    function syncActiveSection(){
      var next = pickActiveSectionId();
      if(next && next !== activeSection){
        activeSection = next;
        setActive(next);
      }
    }

    var sectionObserver = new IntersectionObserver(function(){
      syncActiveSection();
    }, { rootMargin: '-35% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.5, 1] });

    Object.keys(sectionEls).forEach(function(id){
      sectionObserver.observe(sectionEls[id]);
    });

    window.addEventListener('scroll', syncActiveSection, { passive: true });
    window.addEventListener('resize', syncActiveSection, { passive: true });
    syncActiveSection();

    allLinks.forEach(function(link){
      link.addEventListener('click', function(e){
        var targetId = link.getAttribute('data-section');
        var target = document.getElementById(targetId);
        if(!target){
          return;
        }
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - scrollOffsetForTarget();
        window.scrollTo({
          top: Math.max(0, top),
          behavior: reducedMotion ? 'auto' : 'smooth'
        });
        if(history.replaceState){
          history.replaceState(null, '', '#' + targetId);
        }
      });
    });

    if(window.location.hash){
      var hashId = window.location.hash.slice(1);
      var legacyMap = {
        'what-tokenized-deposit': 'what-deposit',
        'why-institutions-care': 'why-care',
        'three-objects-title': 'dollar-objects',
        'entry-points-audience': 'entry-points',
        'where-next': 'where-to-go',
        'five-questions-title': 'five-questions'
      };
      if(legacyMap[hashId]){
        hashId = legacyMap[hashId];
      }
      if(isSpeakerPage && speakerLegacyByOld[hashId]){
        hashId = speakerLegacyByOld[hashId];
      }
      if(sectionEls[hashId]){
        requestAnimationFrame(function(){
          var top = sectionEls[hashId].getBoundingClientRect().top + window.scrollY - scrollOffsetForTarget();
          window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        if(history.replaceState){
          history.replaceState(null, '', '#' + hashId);
        }
        });
      }
    }

    if(jumpTo){
      jumpTo.querySelectorAll('a[href^="#"]').forEach(function(jumpLink){
        jumpLink.addEventListener('click', function(e){
          var href = jumpLink.getAttribute('href');
          if(!href || href.charAt(0) !== '#'){
            return;
          }
          var jumpId = href.slice(1);
          if(isSpeakerPage && speakerLegacyByOld[jumpId]){
            jumpId = speakerLegacyByOld[jumpId];
          }
          var jumpTarget = document.getElementById(jumpId);
          if(!jumpTarget){
            return;
          }
          e.preventDefault();
          var jumpTop = jumpTarget.getBoundingClientRect().top + window.scrollY - scrollOffsetForTarget();
          window.scrollTo({
            top: Math.max(0, jumpTop),
            behavior: reducedMotion ? 'auto' : 'smooth'
          });
          if(history.replaceState){
            history.replaceState(null, '', '#' + jumpId);
          }
        });
      });
    }
  })();
})();
