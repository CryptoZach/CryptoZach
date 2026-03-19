(function(){
  // Theme toggle (default = light)
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  const saved = localStorage.getItem('theme');
  if(saved === 'dark'){
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
})();
