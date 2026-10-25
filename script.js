(function(){
  // Theme toggle: explicit saved choice wins; first visit respects OS
  // prefers-color-scheme. Toggle definitively switches light <-> dark.
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  // Reading storage throws where site data is blocked or the page is sandboxed;
  // unguarded, that throw ends this whole script and every .reveal section stays hidden.
  let saved = null;
  try { saved = window.localStorage.getItem('theme'); } catch(e){ /* storage unavailable */ }
  let isDark;
  if(saved === 'dark'){
    isDark = true;
  } else if(saved === 'light'){
    isDark = false;
  } else {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if(isDark){
    root.setAttribute('data-theme','dark');
    if(toggle) toggle.setAttribute('aria-pressed','true');
  } else {
    root.setAttribute('data-theme','light');
    if(toggle) toggle.setAttribute('aria-pressed','false');
  }

  if(toggle){
    toggle.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      if(isDark){
        root.setAttribute('data-theme','light');
        try { window.localStorage.setItem('theme','light'); } catch(e){ /* storage unavailable */ }
        toggle.setAttribute('aria-pressed','false');
      } else {
        root.setAttribute('data-theme','dark');
        try { window.localStorage.setItem('theme','dark'); } catch(e){ /* storage unavailable */ }
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

  // Scroll reveal: add .visible when .reveal elements enter viewport
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!prefersReducedMotion){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.01 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  // Set by homepage matrix init so hero-wide touch release can call mtxStop (capture target is #hero).
  var homeHeroMtxStop = null;
  var homeHeroReefStop = null;
  var homeHeroReefHardClear = null;
  /* Long-press flagship CTA on coarse pointers: keep matrix running until outside tap or Escape. */
  var mtxHeroLongPressPin = false;

  // Mobile menu (toggle, Escape to close, close when viewport is desktop width)
  const menuToggle = document.getElementById('menuToggle');
  const navMobile = document.getElementById('nav-mobile');
  // Must match the CSS nav-collapse breakpoint (styles.css @media max-width: 900px),
  // otherwise the focus trap is inert in the 769-900px band where the hamburger shows.
  const MOBILE_NAV_MQ = window.matchMedia('(max-width: 900px)');
  function setMobileNavOpen(isOpen){
    if(!menuToggle || !navMobile) return;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    navMobile.hidden = !isOpen;
    navMobile.inert = !isOpen;
    navMobile.setAttribute('aria-hidden', String(!isOpen));
    navMobile.classList.toggle('open', isOpen);
    document.documentElement.classList.toggle('nav-mobile-open', isOpen);
    if(isOpen){
      window.requestAnimationFrame(function(){
        var firstLink = navMobile.querySelector('.mobile-nav-linkset a.navlink');
        if(firstLink){
          firstLink.focus();
        }
      });
    }
  }
  function closeMobileNavIfNeeded(){
    if(menuToggle && menuToggle.getAttribute('aria-expanded') === 'true'){
      setMobileNavOpen(false);
    }
  }
  if(menuToggle && navMobile){
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      setMobileNavOpen(!open);
    });
    document.addEventListener('keydown', (e) => {
      if(e.key !== 'Escape') return;
      if(menuToggle.getAttribute('aria-expanded') === 'true'){
        setMobileNavOpen(false);
        menuToggle.focus();
      }
    });
    window.addEventListener('resize', () => {
      if(!MOBILE_NAV_MQ.matches) closeMobileNavIfNeeded();
    });
    if(typeof MOBILE_NAV_MQ.addEventListener === 'function'){
      MOBILE_NAV_MQ.addEventListener('change', (e) => {
        if(!e.matches) closeMobileNavIfNeeded();
      });
    } else if(typeof MOBILE_NAV_MQ.addListener === 'function'){
      MOBILE_NAV_MQ.addListener((e) => {
        if(!e.matches) closeMobileNavIfNeeded();
      });
    }
    navMobile.addEventListener('keydown', (e) => {
      if(e.key !== 'Tab' || !MOBILE_NAV_MQ.matches) return;
      if(menuToggle.getAttribute('aria-expanded') !== 'true') return;
      var focusables = navMobile.querySelectorAll(
        '.mobile-nav-linkset a.navlink, .nav-mobile-social a.header-social-link'
      );
      if(!focusables.length) return;
      var list = Array.prototype.slice.call(focusables);
      var first = list[0];
      var last = list[list.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Back to top
  const backToTop = document.getElementById('backToTop');
  if(backToTop){
    let footerVisible = false;
    const updateVisibility = () => {
      const shouldShow = window.scrollY > 400 && !footerVisible;
      backToTop.classList.toggle('visible', shouldShow);
    };
    window.addEventListener('scroll', updateVisibility, { passive: true });
    backToTop.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    // Hide the button when the footer enters the viewport so it does not
    // visually overlap with the footer copyright (bottom-left) or socials
    // (bottom-right). Without this guard, the fixed-position button
    // occupies the same screen coordinates as footer content at scroll-end.
    const footer = document.querySelector('footer.site-footer');
    if(footer && 'IntersectionObserver' in window){
      const observer = new IntersectionObserver((entries) => {
        footerVisible = entries[0].isIntersecting;
        updateVisibility();
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
      observer.observe(footer);
    }
  }

  // Homepage hero: secondary CTA smooth-scroll to role paths + one-time accent (skipped under reduced motion).
  (function setupHeroRolePathsScroll(){
    var hero = document.querySelector('#hero.hero--homepage');
    if(!hero){
      return;
    }
    var link = hero.querySelector('a.hero-scroll-role-paths');
    if(!link){
      return;
    }
    var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function pulseRolePathsOnce(){
      if(reducedMotionMq.matches){
        return;
      }
      var el = document.getElementById('role-paths');
      if(!el){
        return;
      }
      el.classList.remove('role-paths-flash');
      void el.offsetWidth;
      el.classList.add('role-paths-flash');
      window.setTimeout(function(){
        el.classList.remove('role-paths-flash');
      }, 450);
    }
    link.addEventListener('click', function(e){
      e.preventDefault();
      var target = document.getElementById('role-paths');
      if(!target){
        return;
      }
      var header = document.querySelector('header');
      var offset = header ? header.offsetHeight : 0;
      var y = target.getBoundingClientRect().top + window.scrollY - offset - 12;
      var behavior = reducedMotionMq.matches ? 'auto' : 'smooth';
      window.scrollTo({ top: Math.max(0, y), behavior: behavior });
      if(reducedMotionMq.matches){
        return;
      }
      window.setTimeout(pulseRolePathsOnce, 700);
    });
  })();

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

  /* Homepage hero overflow tracking. Used only to toggle data-hero-overflows for CSS; touch
   * scrolling is no longer blocked regardless of overflow state (see touchmove handler below). */
  var heroHomepageOverflowLatched = false;
  function heroHomepageResetOverflowLatch(){
    heroHomepageOverflowLatched = false;
  }
  function heroHomepageExceedsViewport(){
    var el = document.querySelector('#hero.hero--homepage');
    if(!el) return false;
    if(heroHomepageOverflowLatched){
      return true;
    }
    var vh = window.innerHeight;
    try{
      if(window.visualViewport && typeof window.visualViewport.height === 'number' && window.visualViewport.height > 0){
        vh = Math.min(vh, window.visualViewport.height);
      }
    } catch(_){}
    var exceeds = el.scrollHeight > vh * 0.95;
    if(exceeds){
      heroHomepageOverflowLatched = true;
    }
    return exceeds;
  }

  // Homepage hero: eyebrow spotlight, coral reef on full #hero, matrix on eyebrow (see below)
  const heroHome = document.querySelector('#hero.hero--homepage');
  const heroEyebrow = heroHome && heroHome.querySelector('.hero-eyebrow');
  var mtxReefMagnetBridge = { fade: 0, heroW: 0, heroH: 0, nodes: [] };
  var mtxReefIconBridge = { points: [] };
  var mtxReefCoralNeighborHero = {};
  function mtxReefIconHeroKey(ix, iy){
    return (Math.round(ix / 10) * 10) + ',' + (Math.round(iy / 10) * 10);
  }

  function refreshHeroHomepageOverflowDataAttr(){
    if(!heroHome) return;
    if(heroHomepageExceedsViewport()){
      heroHome.setAttribute('data-hero-overflows', 'true');
    } else {
      heroHome.removeAttribute('data-hero-overflows');
    }
  }
  /* Set by coral-reef init when present; clears reef touch lock when overflow flips on resize. */
  var heroReefScrollLockRelease = null;
  if(heroHome){
    function onHeroHomepageViewportChange(){
      refreshHeroHomepageOverflowDataAttr();
      if(typeof heroReefScrollLockRelease === 'function'){
        heroReefScrollLockRelease();
      }
    }
    function onHeroHomepageViewportChangeResetLatch(){
      heroHomepageResetOverflowLatch();
      onHeroHomepageViewportChange();
    }
    window.addEventListener('resize', onHeroHomepageViewportChangeResetLatch, { passive: true });
    window.addEventListener('orientationchange', onHeroHomepageViewportChangeResetLatch, { passive: true });
    if(window.visualViewport){
      try{
        window.visualViewport.addEventListener('resize', onHeroHomepageViewportChange, { passive: true });
      } catch(_){}
    }
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        requestAnimationFrame(onHeroHomepageViewportChange);
      });
    }
    requestAnimationFrame(function(){
      requestAnimationFrame(onHeroHomepageViewportChange);
    });
  }

  if(heroHome && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const isFinePointer = (e) => e.pointerType === 'mouse';
    const setEyebrowSpot = (clientX, clientY) => {
      if(!heroEyebrow) return;
      const r = heroEyebrow.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(heroEyebrow).fontSize) || 16;
      const insetX = 0.75 * em;
      const insetY = 0.4 * em;
      heroEyebrow.style.setProperty('--hero-eyebrow-x', (clientX - r.left + insetX) + 'px');
      heroEyebrow.style.setProperty('--hero-eyebrow-y', (clientY - r.top + insetY) + 'px');
    };

    (function(){
      /* Flying $ symbols and pile canvas on the homepage hero (disabled). */
      var enableHeroDollarFlight = false;
      function flagshipCtaEl(){
        return heroHome.querySelector('a.cta-primary[href*="routing-the-dollar"]')
          || heroHome.querySelector('a.cta-primary')
          || heroHome.querySelector('a.action.primary.cta-primary');
      }

      var ctaBtn = flagshipCtaEl();
      if(!enableHeroDollarFlight || !ctaBtn) return;

      var activeDollars = 0;
      var dollarSpawnIntervalId = null;
      var dollarLoopActive = false;
      var resizeTimer = null;
      var dollarArrivalCooldown = false;
      var dollarArrivalCooldownTimer = null;
      var dollarBounceClass = 'cta-dollar-bounce';
      var dollarDisrupted = false;
      var dollarDisruptTimer = null;
      var dollarDisruptProximity = 80; /* px from CTA center to trigger */

      /* Piled dollars that have landed on the CTA */
      var piledDollars = [];
      var maxPiled = getDollarConfig().isMobile ? 8 : 15;
      var pileGravity = 0.15;
      var pileCursorRadius = 80;
      var pileCursorStrength = 5;
      var pileDamping = 0.3;
      var pileFriction = 0.4;
      var pileRadius = 7;
      var pileRaf = null;

      function getDollarConfig(){
        var mobile = window.innerWidth <= 768;
        return {
          isMobile: mobile,
          maxDollars: mobile ? 6 : 14,
          spawnInterval: mobile ? 600 : 350
        };
      }

      var targetX = 0;
      var targetY = 0;
      function updateTarget(){
        var ctaRect = ctaBtn.getBoundingClientRect();
        var heroRect = heroHome.getBoundingClientRect();
        targetX = (ctaRect.left + ctaRect.width / 2) - heroRect.left;
        targetY = (ctaRect.top + ctaRect.height / 2) - heroRect.top;
      }
      updateTarget();

      var lastBounceTs = 0;
      var bounceCooldownMs = 800; /* minimum ms between bounces */

      function triggerArrivalBounce() {
        var now = Date.now();
        if (now - lastBounceTs < bounceCooldownMs) return;
        lastBounceTs = now;

        /* Bounce the CTA button */
        if (ctaBtn && !ctaBtn.classList.contains(dollarBounceClass)) {
          ctaBtn.classList.add(dollarBounceClass);
          setTimeout(function() {
            ctaBtn.classList.remove(dollarBounceClass);
          }, 300);
        }

        /* Start attraction cooldown */
        dollarArrivalCooldown = true;
        if (dollarArrivalCooldownTimer) {
          clearTimeout(dollarArrivalCooldownTimer);
        }
        dollarArrivalCooldownTimer = setTimeout(function() {
          dollarArrivalCooldown = false;
          dollarArrivalCooldownTimer = null;
        }, 250);
      }

      function disruptDollars() {
        /* Clear any pending recovery so the timer resets on repeated calls */
        if (dollarDisruptTimer) {
          clearTimeout(dollarDisruptTimer);
        }

        if (!dollarDisrupted) {
          dollarDisrupted = true;

          /* Pause and fade all active dollar spans */
          var spans = heroHome.querySelectorAll('.hero-dollar-flight');
          for (var s = 0; s < spans.length; s++) {
            spans[s].style.animationPlayState = 'paused';
            spans[s].style.transition = 'opacity 0.15s ease';
            spans[s].style.opacity = '0';
          }
        }

        /* Schedule recovery after 500ms */
        dollarDisruptTimer = setTimeout(function() {
          recoverDollars();
        }, 500);
      }

      function recoverDollars() {
        dollarDisrupted = false;
        dollarDisruptTimer = null;

        /* Resume all active dollar spans */
        var spans = heroHome.querySelectorAll('.hero-dollar-flight');
        for (var s = 0; s < spans.length; s++) {
          spans[s].style.animationPlayState = 'running';
          spans[s].style.transition = 'opacity 0.3s ease';
          spans[s].style.opacity = '';  /* restore to animation-controlled value */
        }
      }

      window.addEventListener('resize', function(){
        if(resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function(){
          resizeTimer = null;
          updateTarget();
          if(dollarLoopActive && dollarSpawnIntervalId){
            clearInterval(dollarSpawnIntervalId);
            var config = getDollarConfig();
            dollarSpawnIntervalId = setInterval(spawnDollar, config.spawnInterval);
          }
        }, 200);
      }, { passive: true });

      function spawnDollar(){
        if(!dollarLoopActive || (typeof document.hidden === 'boolean' && document.hidden)) return;
        if(dollarDisrupted) return;

        var config = getDollarConfig();
        if(activeDollars >= config.maxDollars) return;

        var heroRect = heroHome.getBoundingClientRect();
        var w = heroRect.width;
        var h = heroRect.height;
        if(w <= 0 || h <= 0) return;

        var perimeter = 2 * (w + h);
        var p = Math.random() * perimeter;
        var startX, startY;

        if(p < w){
          startX = p;
          startY = -10;
        } else if(p < w + h){
          startX = w + 10;
          startY = p - w;
        } else if(p < 2 * w + h){
          startX = 2 * w + h - p;
          startY = h + 10;
        } else {
          startX = -10;
          startY = perimeter - p;
        }

        var dx, dy;
        if (dollarArrivalCooldown) {
          /* During cooldown: drift in a random direction instead of toward CTA */
          var driftAngle = Math.random() * Math.PI * 2;
          var driftDist = 160 + Math.random() * 240;
          dx = Math.cos(driftAngle) * driftDist;
          dy = Math.sin(driftAngle) * driftDist;
        } else {
          dx = targetX - startX;
          dy = targetY - startY;
        }
        var curveOffset = (Math.random() - 0.5) * 100;

        var isHovering = heroHome.classList.contains('hero-home--flagship-hover');
        var baseDuration = config.isMobile ? 3.5 : 2.5;
        var variance = 0.8 + Math.random() * 0.8;
        var duration = baseDuration * variance;
        if(isHovering) duration *= 0.6;

        var maxOpacity = config.isMobile
          ? (0.1 + Math.random() * 0.15)
          : (0.15 + Math.random() * 0.25);
        if(isHovering) maxOpacity = Math.min(maxOpacity + 0.15, 0.55);

        var el = document.createElement('span');
        el.className = 'hero-dollar-flight';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = '$';
        el.style.left = startX + 'px';
        el.style.top = startY + 'px';
        el.style.animationDuration = duration + 's';
        el.style.setProperty('--dollar-dx', dx + 'px');
        el.style.setProperty('--dollar-dy', dy + 'px');
        el.style.setProperty('--dollar-curve', curveOffset + 'px');
        el.style.setProperty('--dollar-opacity', String(maxOpacity));

        heroHome.appendChild(el);
        activeDollars++;

        el.addEventListener('animationend', function(){
          /* Trigger CTA bounce on arrival */
          triggerArrivalBounce();
          if(el.parentNode === heroHome) el.remove();
          activeDollars--;

          /* Add to pile — spawn above hero and let it rain down onto CTA */
          if(piledDollars.length < maxPiled){
            updateTarget();
            var cr2 = ctaBtn.getBoundingClientRect();
            var hr2 = heroHome.getBoundingClientRect();
            var pl2 = cr2.left - hr2.left + pileRadius + 4;
            var pr2 = cr2.right - hr2.left - pileRadius - 4;
            var pw2 = Math.max(1, pr2 - pl2);
            piledDollars.push({
              x: pl2 + Math.random() * pw2,
              y: -10 - Math.random() * 30,
              vx: 0,
              vy: 1 + Math.random() * 1.5,
              settled: false
            });
            if(!pileRaf) pileRaf = requestAnimationFrame(pileStep);
          }
        });

        /* BTC orbit particles now self-spawn in Track B section */
      }

      function startDollarFlightLoop(){
        if(dollarLoopActive) return;
        dollarLoopActive = true;
        spawnDollar();
        var config = getDollarConfig();
        dollarSpawnIntervalId = setInterval(spawnDollar, config.spawnInterval);

        /* Pre-spawn all piled dollars in a tight cluster above the hero
           so they all land within ~1 second */
        if(piledDollars.length === 0){
          updateTarget();
          var ctaR = ctaBtn.getBoundingClientRect();
          var heroR = heroHome.getBoundingClientRect();
          var pileLeft = ctaR.left - heroR.left + pileRadius + 4;
          var pileRight = ctaR.right - heroR.left - pileRadius - 4;
          var pileW = Math.max(1, pileRight - pileLeft);
          /* Ground is ~70% down the hero; all must arrive within 60 frames */
          var heroH = heroR.height || 700;
          var groundApprox = heroH * 0.72;
          for(var ps = 0; ps < maxPiled; ps++){
            /* Stagger spawn over first ~15 frames worth of y offset */
            var startY = -8 - Math.random() * 12;
            /* Calculate velocity needed to reach ground in ~45-60 frames:
               y = startY + vy*t + 0.5*g*t^2  =>  vy = (ground - startY - 0.5*g*t^2) / t */
            var tFrames = 40 + Math.random() * 18;
            var needVy = (groundApprox - startY - 0.5 * pileGravity * tFrames * tFrames) / tFrames;
            piledDollars.push({
              x: pileLeft + Math.random() * pileW,
              y: startY,
              vx: 0,
              vy: Math.max(3, needVy),
              settled: false
            });
          }
          if(!pileRaf) pileRaf = requestAnimationFrame(pileStep);
        }
      }

      function stopDollarFlightLoop(){
        dollarLoopActive = false;
        if(dollarSpawnIntervalId){
          clearInterval(dollarSpawnIntervalId);
          dollarSpawnIntervalId = null;
        }
        /* BTC flight now managed by its own IntersectionObserver */
      }

      /* ══════════════════════════════════════════════
         Dollar pile — canvas overlay on hero for
         $ signs that have arrived at the CTA
         ══════════════════════════════════════════════ */

      var pileCanvas = document.createElement('canvas');
      pileCanvas.className = 'hero-dollar-pile';
      pileCanvas.setAttribute('aria-hidden', 'true');
      pileCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
      heroHome.appendChild(pileCanvas);
      var pileCtx = pileCanvas.getContext('2d');
      var pileCursorX = -1, pileCursorY = -1;

      heroHome.addEventListener('pointermove', function(e){
        var r = heroHome.getBoundingClientRect();
        pileCursorX = e.clientX - r.left;
        pileCursorY = e.clientY - r.top;
      }, { passive: true });
      heroHome.addEventListener('pointerleave', function(){
        pileCursorX = -1;
        pileCursorY = -1;
      }, { passive: true });

      /* Click on CTA: explode all piled dollars outward */
      ctaBtn.addEventListener('click', function pileFlyoff(){
        for(var i = 0; i < piledDollars.length; i++){
          var p = piledDollars[i];
          p.vx = (Math.random() - 0.5) * 12;
          p.vy = -(4 + Math.random() * 8);
          p.settled = false;
        }
        if(piledDollars.length > 0 && !pileRaf){
          pileRaf = requestAnimationFrame(pileStep);
        }
      });

      function pileResize(){
        var r = heroHome.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 3);
        pileCanvas.width = Math.floor(r.width * dpr);
        pileCanvas.height = Math.floor(r.height * dpr);
        pileCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      pileResize();
      window.addEventListener('resize', function(){ setTimeout(pileResize, 220); }, { passive: true });

      function pileStep(){
        pileRaf = null;
        if(piledDollars.length === 0) return;
        pileRaf = requestAnimationFrame(pileStep);

        var r = heroHome.getBoundingClientRect();
        var w = r.width, h = r.height;
        pileCtx.clearRect(0, 0, w, h);

        updateTarget();
        /* Ground = top edge of CTA button */
        var ctaRect = ctaBtn.getBoundingClientRect();
        var heroRect = heroHome.getBoundingClientRect();
        var ground = (ctaRect.top - heroRect.top) - 2;
        var ctaLeft = ctaRect.left - heroRect.left;
        var ctaRight = ctaLeft + ctaRect.width;
        var rad = pileRadius;

        /* Sort by y descending so lower particles process first */
        piledDollars.sort(function(a, b){ return b.y - a.y; });

        for(var i = 0; i < piledDollars.length; i++){
          var p = piledDollars[i];

          /* Gravity */
          p.vy += pileGravity;

          /* Cursor anti-magnet — push piled dollars away */
          var cursorPushing = false;
          if(pileCursorX >= 0 && pileCursorY >= 0){
            var dxM = p.x - pileCursorX;
            var dyM = p.y - pileCursorY;
            var distM = Math.sqrt(dxM * dxM + dyM * dyM) || 1;
            if(distM < pileCursorRadius){
              var force = pileCursorStrength * (1 - distM / pileCursorRadius);
              p.vx += (dxM / distM) * force;
              p.vy += (dyM / distM) * force;
              p.settled = false;
              cursorPushing = true;
            }
          }

          /* No centering force — cursor-pushed dollars fly free and fall */

          /* Move */
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.98;

          /* Ground collision — only within CTA button bounds */
          var effectiveGround = ground - rad;
          var onPlatform = p.x >= ctaLeft && p.x <= ctaRight;
          if(onPlatform && p.y >= effectiveGround){
            p.y = effectiveGround;
            if(Math.abs(p.vy) < 0.5){
              p.vy = 0;
              p.settled = true;
            } else {
              p.vy *= -pileDamping;
            }
            p.vx *= pileFriction;
          }

          /* Particle collision — only when one is moving fast (cursor-kicked).
             Settled dollars don't disturb each other. */
          for(var j = i + 1; j < piledDollars.length; j++){
            var o = piledDollars[j];
            var pSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            var oSpeed = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
            if(pSpeed < 1.0 && oSpeed < 1.0) continue; /* both idle, skip */

            var dx = p.x - o.x;
            var dy = p.y - o.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            var minDist = rad * 2;
            if(dist < minDist){
              var overlap = (minDist - dist) * 0.5;
              var nx = dx / dist, ny = dy / dist;
              p.x += nx * overlap;
              p.y += ny * overlap;
              o.x -= nx * overlap;
              o.y -= ny * overlap;
              var relDot = (p.vx - o.vx) * nx + (p.vy - o.vy) * ny;
              if(relDot > 0){
                p.vx -= nx * relDot * 0.5;
                p.vy -= ny * relDot * 0.5;
                o.vx += nx * relDot * 0.5;
                o.vy += ny * relDot * 0.5;
              }
              p.settled = false;
              o.settled = false;
            }
          }

          /* Re-clamp after collisions — only if still on the button */
          onPlatform = p.x >= ctaLeft && p.x <= ctaRight;
          if(onPlatform && p.y > effectiveGround) p.y = effectiveGround;

          /* Remove if fell below hero */
          if(p.y > h + 30){
            piledDollars.splice(i, 1);
            i--;
            continue;
          }

          /* Render */
          pileCtx.save();
          pileCtx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          pileCtx.textAlign = 'center';
          pileCtx.textBaseline = 'middle';
          pileCtx.fillStyle = 'rgba(96, 108, 62, 0.7)';
          pileCtx.shadowColor = 'rgba(96, 108, 62, 0.3)';
          pileCtx.shadowBlur = 4;
          pileCtx.fillText('$', p.x, p.y);
          pileCtx.restore();
        }
      }

      /* ══════════════════════════════════════════════
         Bitcoin ₿ rain — particles fall, pile on top
         of Track B card, and respond to cursor magnet
         ══════════════════════════════════════════════ */

      var btcContainer = document.querySelector('.track-b-frameworks');
      var btcCanvas = document.getElementById('heroBtcFlight');
      var btcCtx = btcCanvas ? btcCanvas.getContext('2d') : null;
      var btcParticles = [];
      var btcFlightActive = false;
      var btcRaf = null;
      var btcSpawnInterval = null;
      var btcCursorX = -1, btcCursorY = -1;

      var btcConfig = {
        maxParticles: getDollarConfig().isMobile ? 25 : 60,
        gravity: 0.12,
        friction: 0.4,
        bounceDamping: 0.3,
        xDamping: 0.98,
        cursorRadius: 120,
        cursorStrength: 8,
        particleRadius: 10,
        fadeInFrames: 15,
        spawnMs: getDollarConfig().isMobile ? 300 : 150,
        fontSize: 16
      };

      /* Ground line = top edge of the .track-b-card element */
      var btcCardEl = btcContainer ? btcContainer.querySelector('.track-b-card') : null;

      function btcGetGround(){
        if(!btcContainer || !btcCardEl) return 9999;
        var cr = btcContainer.getBoundingClientRect();
        var cardR = btcCardEl.getBoundingClientRect();
        return cardR.top - cr.top - 2; /* pile sits just above the card */
      }

      function btcResize(){
        if(!btcCanvas || !btcContainer) return;
        var r = btcContainer.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 3);
        btcCanvas.width = Math.floor(r.width * dpr);
        btcCanvas.height = Math.floor(r.height * dpr);
        btcCanvas.style.width = r.width + 'px';
        btcCanvas.style.height = r.height + 'px';
        btcCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      if(btcCanvas && btcContainer){
        btcResize();
        window.addEventListener('resize', function(){ setTimeout(btcResize, 220); }, { passive: true });

        /* Track cursor relative to container */
        btcContainer.addEventListener('pointermove', function(e){
          var r = btcContainer.getBoundingClientRect();
          btcCursorX = e.clientX - r.left;
          btcCursorY = e.clientY - r.top;
        }, { passive: true });

        btcContainer.addEventListener('pointerleave', function(){
          btcCursorX = -1;
          btcCursorY = -1;
        }, { passive: true });

        /* Start/stop when Track B scrolls into view */
        var btcObserver = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(entry.isIntersecting) startBtcFlight();
            else stopBtcFlight();
          });
        }, { threshold: 0.05 });
        btcObserver.observe(btcContainer);
      }

      function spawnBtcParticle(){
        if(!btcCanvas || !btcContainer || btcParticles.length >= btcConfig.maxParticles) return;
        var cr = btcContainer.getBoundingClientRect();
        var w = cr.width;
        if(w <= 0) return;

        var rad = btcConfig.particleRadius;
        btcParticles.push({
          x: rad + Math.random() * (w - rad * 2),
          y: -20 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0.5 + Math.random() * 1.0,
          radius: rad,
          life: 0,
          settled: false
        });
      }

      function btcDraw(){
        if(!btcFlightActive){ btcRaf = null; return; }
        btcRaf = requestAnimationFrame(btcDraw);

        var cr = btcContainer.getBoundingClientRect();
        var w = cr.width, h = cr.height;
        btcCtx.clearRect(0, 0, w, h);
        if(btcParticles.length === 0) return;

        var ground = btcGetGround();
        var rad = btcConfig.particleRadius;
        var curActive = btcCursorX >= 0 && btcCursorY >= 0;

        /* Sort by y so lower particles are processed first (stable pile) */
        btcParticles.sort(function(a, b){ return b.y - a.y; });

        for(var i = 0; i < btcParticles.length; i++){
          var bp = btcParticles[i];
          bp.life++;

          /* Gravity */
          bp.vy += btcConfig.gravity;

          /* Cursor magnet — pushes particles away */
          if(curActive){
            var dxM = bp.x - btcCursorX;
            var dyM = bp.y - btcCursorY;
            var distM = Math.sqrt(dxM * dxM + dyM * dyM) || 1;
            if(distM < btcConfig.cursorRadius){
              var force = btcConfig.cursorStrength * (1 - distM / btcConfig.cursorRadius);
              bp.vx += (dxM / distM) * force;
              bp.vy += (dyM / distM) * force;
              bp.settled = false;
            }
          }

          /* Move */
          bp.x += bp.vx;
          bp.y += bp.vy;

          /* X damping (air friction) */
          bp.vx *= btcConfig.xDamping;

          /* Ground collision — pile on top of the card */
          var effectiveGround = ground - rad;
          if(bp.y >= effectiveGround){
            bp.y = effectiveGround;
            if(Math.abs(bp.vy) < 0.5){
              bp.vy = 0;
              bp.settled = true;
            } else {
              bp.vy *= -btcConfig.bounceDamping;
            }
            bp.vx *= btcConfig.friction;
          }

          /* Particle-particle collision (simple push apart) */
          for(var j = i + 1; j < btcParticles.length; j++){
            var other = btcParticles[j];
            var dx = bp.x - other.x;
            var dy = bp.y - other.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            var minDist = rad * 2;
            if(dist < minDist){
              var overlap = (minDist - dist) * 0.5;
              var nx = dx / dist, ny = dy / dist;
              bp.x += nx * overlap;
              bp.y += ny * overlap;
              other.x -= nx * overlap;
              other.y -= ny * overlap;
              /* Transfer some velocity */
              var relVx = bp.vx - other.vx;
              var relVy = bp.vy - other.vy;
              var relDot = relVx * nx + relVy * ny;
              if(relDot > 0){
                bp.vx -= nx * relDot * 0.5;
                bp.vy -= ny * relDot * 0.5;
                other.vx += nx * relDot * 0.5;
                other.vy += ny * relDot * 0.5;
              }
              bp.settled = false;
              other.settled = false;
            }
          }

          /* Re-clamp to ground after collision pushes */
          if(bp.y > effectiveGround) bp.y = effectiveGround;

          /* Wall constraints */
          if(bp.x < rad){ bp.x = rad; bp.vx = Math.abs(bp.vx) * 0.3; }
          if(bp.x > w - rad){ bp.x = w - rad; bp.vx = -Math.abs(bp.vx) * 0.3; }

          /* Remove if way above screen (shouldn't happen, safety) */
          if(bp.y > h + 50){
            btcParticles.splice(i, 1);
            i--;
            continue;
          }

          /* Render */
          var fadeIn = Math.min(1, bp.life / btcConfig.fadeInFrames);
          var alpha = fadeIn * 0.9;

          btcCtx.save();
          btcCtx.font = '700 ' + btcConfig.fontSize + 'px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          btcCtx.textAlign = 'center';
          btcCtx.textBaseline = 'middle';
          btcCtx.fillStyle = 'rgba(247, 147, 26, ' + alpha + ')';
          btcCtx.shadowColor = 'rgba(251, 191, 36, ' + (alpha * 0.4) + ')';
          btcCtx.shadowBlur = 6;
          btcCtx.fillText('₿', bp.x, bp.y);
          btcCtx.restore();
        }
      }

      function startBtcFlight(){
        if(!btcCanvas) return;
        btcFlightActive = true;
        btcResize();
        if(!btcRaf) btcRaf = requestAnimationFrame(btcDraw);
        if(!btcSpawnInterval){
          btcSpawnInterval = setInterval(spawnBtcParticle, btcConfig.spawnMs);
        }
      }

      function stopBtcFlight(){
        btcFlightActive = false;
        btcParticles = [];
        if(btcSpawnInterval){ clearInterval(btcSpawnInterval); btcSpawnInterval = null; }
      }

      var flagshipDollarSpeed = flagshipCtaEl();
      if(flagshipDollarSpeed){
        flagshipDollarSpeed.addEventListener('pointerover', function(e){
          if(e.relatedTarget && flagshipDollarSpeed.contains(e.relatedTarget)) return;
          heroHome.classList.add('hero-home--flagship-hover');
        });
        flagshipDollarSpeed.addEventListener('pointerout', function(e){
          if(e.relatedTarget && flagshipDollarSpeed.contains(e.relatedTarget)) return;
          heroHome.classList.remove('hero-home--flagship-hover');
        });
      }

      /* Dollar cursor disruption removed — dollars always fly to CTA */

      if(typeof IntersectionObserver === 'function'){
        var obs = new IntersectionObserver(function(entries){
          var vis = entries.some(function(en){ return en.isIntersecting && en.intersectionRatio > 0.05; });
          if(vis) startDollarFlightLoop();
          else stopDollarFlightLoop();
        }, { threshold: [0, 0.08, 0.15] });
        obs.observe(heroHome);
      } else {
        startDollarFlightLoop();
      }
    })();

    heroHome.addEventListener('pointermove', (e) => {
      setEyebrowSpot(e.clientX, e.clientY);
      if(!isFinePointer(e) && heroEyebrow && typeof heroHome.hasPointerCapture === 'function' && heroHome.hasPointerCapture(e.pointerId)){
        heroEyebrow.classList.add('hero-eyebrow--pointer-active');
      }
    });
    heroHome.addEventListener('pointerenter', (e) => {
      setEyebrowSpot(e.clientX, e.clientY);
    });
    // Bubble phase: matrix eyebrow pointerdown can mtxStart first; then we capture on #hero for coral + spotlight drag.
    heroHome.addEventListener('pointerdown', (e) => {
      if(isFinePointer(e) && e.button !== 0) return;
      if(!isFinePointer(e)){
        try{
          heroHome.setPointerCapture(e.pointerId);
        } catch(_){}
        if(heroEyebrow) heroEyebrow.classList.add('hero-eyebrow--pointer-active');
      }
      setEyebrowSpot(e.clientX, e.clientY);
    });
    heroHome.addEventListener('pointerup', (e) => {
      if(isFinePointer(e)) return;
      if(heroEyebrow){
        heroEyebrow.classList.remove('hero-eyebrow--pointer-active');
        heroEyebrow.style.removeProperty('--hero-eyebrow-x');
        heroEyebrow.style.removeProperty('--hero-eyebrow-y');
      }
      try{
        heroHome.releasePointerCapture(e.pointerId);
      } catch(_){}
      if(!mtxMobileMatrixAlways && typeof homeHeroMtxStop === 'function' && !mtxHeroLongPressPin){
        homeHeroMtxStop();
      }
    });
    heroHome.addEventListener('pointercancel', (e) => {
      if(isFinePointer(e)) return;
      if(heroEyebrow){
        heroEyebrow.classList.remove('hero-eyebrow--pointer-active');
        heroEyebrow.style.removeProperty('--hero-eyebrow-x');
        heroEyebrow.style.removeProperty('--hero-eyebrow-y');
      }
      try{
        heroHome.releasePointerCapture(e.pointerId);
      } catch(_){}
      if(!mtxMobileMatrixAlways && typeof homeHeroMtxStop === 'function' && !mtxHeroLongPressPin){
        homeHeroMtxStop();
      }
    });
    heroHome.addEventListener('pointerleave', (e) => {
      if(typeof heroHome.hasPointerCapture === 'function' && heroHome.hasPointerCapture(e.pointerId)) return;
      if(!isFinePointer(e)) return;
      if(heroEyebrow){
        heroEyebrow.classList.remove('hero-eyebrow--pointer-active');
        heroEyebrow.style.removeProperty('--hero-eyebrow-x');
        heroEyebrow.style.removeProperty('--hero-eyebrow-y');
      }
    });

    // Coral reef branching animation (canvas fills whole hero; pointer tracked across full #hero)
    const heroContainer = heroHome;
    const reefCanvas = heroContainer.querySelector('.hero-reef');
    if (reefCanvas) {
      const rctx = reefCanvas.getContext('2d');
      var reefBranches = [];
      var reefNodes = [];
      var reefMaxBranches = 180;
      var reefMaxNodes = 200;
      var reefLastSpawn = 0;
      var reefRaf = null;
      var reefActive = false;
      var reefFade = 0;
      var reefMx = -1, reefMy = -1;
      var reefPrevMx = -1, reefPrevMy = -1;
      var reefVelocity = 0;
      var reefPrevMoveTs = 0;

      function reefResize() {
        var r = heroContainer.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 3);
        reefCanvas.width = Math.floor(r.width * dpr);
        reefCanvas.height = Math.floor(r.height * dpr);
        reefCanvas.style.width = r.width + 'px';
        reefCanvas.style.height = r.height + 'px';
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function reefRand(a, b) { return a + Math.random() * (b - a); }

      /* Dead zone: no reef growth within 100px of the CTA button center */
      var reefDeadZoneRadius = 100;
      function reefInDeadZone(px, py) {
        var btn = heroHome.querySelector('a.cta-primary');
        if (!btn) return false;
        var br = btn.getBoundingClientRect();
        var hr = heroHome.getBoundingClientRect();
        var cx = (br.left + br.width / 2) - hr.left;
        var cy = (br.top + br.height / 2) - hr.top;
        var rdx = px - cx;
        var rdy = py - cy;
        return (rdx * rdx + rdy * rdy) < (reefDeadZoneRadius * reefDeadZoneRadius);
      }

      function reefSpawnBranch(x, y, angle, gen, speed) {
        if (reefBranches.length > reefMaxBranches) return;
        reefBranches.push({
          x: x, y: y,
          angle: angle,
          speed: speed || reefRand(0.6, 1.6),
          curve: reefRand(-0.04, 0.04),
          life: 0,
          maxLife: reefRand(30, 90),
          gen: gen || 0,
          forked: false,
          thickness: Math.max(0.3, 1.8 - gen * 0.3),
          alpha: reefRand(0.35, 0.8)
        });
      }

      function reefAddNode(x, y, gen) {
        if (reefNodes.length > reefMaxNodes) reefNodes.shift();
        reefNodes.push({
          x: x, y: y,
          r: reefRand(1.2, 3.0 - gen * 0.3),
          alpha: reefRand(0.3, 0.8),
          born: performance.now(),
          maxAge: reefRand(3000, 8000),
          gen: gen,
          pulse: reefRand(0, Math.PI * 2)
        });
      }

      var reefCoralHoldMs = 25;
      var reefCoralAbsorbR = 12;
      var reefCoralTransitMs = 400;

      function reefBeginCoralTransit(nd, x0, y0, x1, y1, nowMs) {
        var mdx = x1 - x0;
        var mdy = y1 - y0;
        var len = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
        var perpX = -mdy / len;
        var perpY = mdx / len;
        var sway = len * (0.14 + Math.random() * 0.11);
        var flip = Math.random() > 0.5 ? 1 : -1;
        nd.coralPhase = 'transit';
        delete nd.coralAbsorbT;
        delete nd.coralIconK;
        nd.coralTr0 = nowMs;
        nd.coralTr1 = nowMs + reefCoralTransitMs + Math.random() * 140;
        nd.coralTx0 = x0;
        nd.coralTy0 = y0;
        nd.coralTx1 = x1;
        nd.coralTy1 = y1;
        nd.coralCpX = (x0 + x1) * 0.5 + perpX * sway * flip;
        nd.coralCpY = (y0 + y1) * 0.5 + perpY * sway * flip;
        nd.x = x0;
        nd.y = y0;
      }

      function reefSpawnCoralTraveler(x0, y0, x1, y1, nowMs, gen) {
        if (reefNodes.length >= reefMaxNodes) {
          return;
        }
        var ndNew = {
          x: x0,
          y: y0,
          r: reefRand(1.0, 2.4),
          alpha: reefRand(0.35, 0.72),
          born: nowMs,
          maxAge: reefRand(2800, 6200),
          gen: gen || 0,
          pulse: reefRand(0, Math.PI * 2)
        };
        reefBeginCoralTransit(ndNew, x0, y0, x1, y1, nowMs);
        reefNodes.push(ndNew);
      }

      function reefSpawnCluster(cx, cy, velocity) {
        var vel = velocity || 0;
        /* More branches at higher velocity */
        var baseCount = Math.random() < 0.3 ? 3 : 2;
        var bonusBranches = vel > 0.8 ? 1 : 0;
        var count = baseCount + bonusBranches;
        /* Faster pointer = longer, faster branches that spread wider */
        var speedMul = 1 + Math.min(0.6, vel * 0.3);
        var spreadMul = 1 + Math.min(0.8, vel * 0.4);

        for (var i = 0; i < count; i++) {
          var a = reefRand(0, Math.PI * 2);
          var d = reefRand(3, 18) * spreadMul;
          reefSpawnBranch(
            cx + Math.cos(a) * d,
            cy + Math.sin(a) * d,
            a + reefRand(-0.5, 0.5),
            0,
            reefRand(0.6, 1.6) * speedMul
          );
        }
        reefAddNode(cx, cy, 0);
      }

      function reefTrailFill() {
        var raw = getComputedStyle(heroContainer).getPropertyValue('--hero-eyebrow-bg-rgb');
        if (raw) {
          var parts = raw.trim().split(/\s+/).map(Number);
          if (parts.length >= 3 && parts.every(function(n) { return !Number.isNaN(n); })) {
            return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',0.06)';
          }
        }
        var bg = getComputedStyle(heroContainer).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          var m = bg.match(/[\d.]+/g);
          if (m && m.length >= 3) {
            return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',0.06)';
          }
        }
        bg = getComputedStyle(document.body).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          var m = bg.match(/[\d.]+/g);
          if (m && m.length >= 3) {
            return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',0.06)';
          }
        }
        return 'rgba(10, 12, 16, 0.06)';
      }

      function reefDraw() {
        reefRaf = requestAnimationFrame(reefDraw);

        var r = heroContainer.getBoundingClientRect();
        var W = r.width, H = r.height;

        if (reefActive && reefFade < 1) reefFade = Math.min(1, reefFade + 0.08);
        if (!reefActive && reefFade > 0) reefFade = Math.max(0, reefFade - 0.008);

        rctx.clearRect(0, 0, W, H);

        if (reefFade < 0.001 && reefBranches.length === 0 && reefNodes.length === 0) {
          mtxReefMagnetBridge.fade = 0;
          mtxReefMagnetBridge.nodes.length = 0;
          mtxReefMagnetBridge.heroW = 0;
          mtxReefMagnetBridge.heroH = 0;
          cancelAnimationFrame(reefRaf);
          reefRaf = null;
          rctx.setTransform(1, 0, 0, 1, 0, 0);
          rctx.clearRect(0, 0, reefCanvas.width, reefCanvas.height);
          reefResize();
          return;
        }

        var now = performance.now();

        /* Coral $: snap at icon, hold 25ms, then ride a tendril-like curve to neighbor icons. */
        var rcl;
        for (rcl = 0; rcl < reefNodes.length; rcl++) {
          var nhd = reefNodes[rcl];
          if (nhd.coralPhase !== 'held' || !nhd.coralIconK) continue;
          var bestSnap = 9999;
          var sxx = nhd.x;
          var syy = nhd.y;
          var pk;
          for (pk = 0; pk < mtxReefIconBridge.points.length; pk++) {
            var Pk = mtxReefIconBridge.points[pk];
            if (mtxReefIconHeroKey(Pk.x, Pk.y) !== nhd.coralIconK) continue;
            var sdk = Math.sqrt((Pk.x - nhd.x) * (Pk.x - nhd.x) + (Pk.y - nhd.y) * (Pk.y - nhd.y));
            if (sdk < bestSnap) {
              bestSnap = sdk;
              sxx = Pk.x;
              syy = Pk.y;
            }
          }
          if (bestSnap < 88) {
            nhd.x = sxx;
            nhd.y = syy;
          }
        }

        for (rcl = 0; rcl < reefNodes.length; rcl++) {
          var ntr = reefNodes[rcl];
          if (ntr.coralPhase !== 'transit') continue;
          var trT = (now - ntr.coralTr0) / (ntr.coralTr1 - ntr.coralTr0);
          if (trT >= 1) {
            ntr.x = ntr.coralTx1;
            ntr.y = ntr.coralTy1;
            ntr.coralPhase = 'free';
            delete ntr.coralTr0;
            delete ntr.coralTr1;
            delete ntr.coralTx0;
            delete ntr.coralTy0;
            delete ntr.coralTx1;
            delete ntr.coralTy1;
            delete ntr.coralCpX;
            delete ntr.coralCpY;
            continue;
          }
          var omt = 1 - trT;
          ntr.x = omt * omt * ntr.coralTx0 + 2 * omt * trT * ntr.coralCpX + trT * trT * ntr.coralTx1;
          ntr.y = omt * omt * ntr.coralTy0 + 2 * omt * trT * ntr.coralCpY + trT * trT * ntr.coralTy1;
        }

        for (rcl = 0; rcl < reefNodes.length; rcl++) {
          var nhl = reefNodes[rcl];
          if (nhl.coralPhase !== 'held') continue;
          if (now - nhl.coralAbsorbT < reefCoralHoldMs) continue;
          var neighL = mtxReefCoralNeighborHero[nhl.coralIconK];
          if (!neighL || !neighL.length) {
            nhl.coralPhase = 'free';
            delete nhl.coralAbsorbT;
            delete nhl.coralIconK;
            continue;
          }
          var tg = neighL.slice();
          var tj;
          for (tj = tg.length - 1; tj > 0; tj--) {
            var ri = Math.floor(Math.random() * (tj + 1));
            var tswap = tg[tj];
            tg[tj] = tg[ri];
            tg[ri] = tswap;
          }
          var capOut = Math.min(4, tg.length);
          var ox = nhl.x;
          var oy = nhl.y;
          reefBeginCoralTransit(nhl, ox, oy, tg[0].x, tg[0].y, now);
          var tk;
          for (tk = 1; tk < capOut; tk++) {
            reefSpawnCoralTraveler(ox, oy, tg[tk].x, tg[tk].y, now, nhl.gen);
          }
        }

        for (rcl = 0; rcl < reefNodes.length; rcl++) {
          var nab = reefNodes[rcl];
          if (nab.coralPhase && nab.coralPhase !== 'free') continue;
          if (!mtxReefIconBridge.points.length) continue;
          var ba = 9999;
          var bax = 0;
          var bay = 0;
          var pb;
          for (pb = 0; pb < mtxReefIconBridge.points.length; pb++) {
            var Pbz = mtxReefIconBridge.points[pb];
            var dbz = Math.sqrt((Pbz.x - nab.x) * (Pbz.x - nab.x) + (Pbz.y - nab.y) * (Pbz.y - nab.y));
            if (dbz < ba) {
              ba = dbz;
              bax = Pbz.x;
              bay = Pbz.y;
            }
          }
          if (ba <= reefCoralAbsorbR) {
            nab.coralPhase = 'held';
            nab.coralAbsorbT = now;
            nab.coralIconK = mtxReefIconHeroKey(bax, bay);
            nab.x = bax;
            nab.y = bay;
          }
        }

        var reefIconPullR = window.matchMedia('(max-width: 768px)').matches ? 175 : 240;
        var reefIconPullK = 0.22 * reefFade;
        if (mtxReefIconBridge.points.length > 0 && reefFade > 0.03 && reefIconPullK > 0) {
          for (var rai = 0; rai < reefNodes.length; rai++) {
            var ndPull = reefNodes[rai];
            if (ndPull.coralPhase === 'held' || ndPull.coralPhase === 'transit') continue;
            var agePull = now - ndPull.born;
            if (agePull > ndPull.maxAge) continue;
            var bestId = reefIconPullR;
            var bix = 0;
            var biy = 0;
            var pii;
            for (pii = 0; pii < mtxReefIconBridge.points.length; pii++) {
              var pip = mtxReefIconBridge.points[pii];
              var pdx = pip.x - ndPull.x;
              var pdy = pip.y - ndPull.y;
              var pd = Math.sqrt(pdx * pdx + pdy * pdy);
              if (pd < bestId) {
                bestId = pd;
                bix = pip.x;
                biy = pip.y;
              }
            }
            if (bestId < reefIconPullR && bestId > 0.6) {
              var fall = (1 - bestId / reefIconPullR) * reefIconPullK;
              ndPull.x += (bix - ndPull.x) * fall;
              ndPull.y += (biy - ndPull.y) * fall;
              ndPull.x = Math.max(-12, Math.min(W + 12, ndPull.x));
              ndPull.y = Math.max(-12, Math.min(H + 12, ndPull.y));
            }
          }
        }

        /* Horizontal gradient (inverse of icons): reef $ render BLUE on the left fading to
           MINT GREEN on the right. Mirrors the icon green→blue gradient so the two systems
           form a coordinated cross-fade (icons and reef $ are complementary colors at every
           x position). Blue end uses the dark-mode accent (91, 156, 245); green end uses the
           original mint (204, 251, 229). Shadow color interpolates the same way. */
        for (var n = 0; n < reefNodes.length; n++) {
          var nd = reefNodes[n];
          var age = now - nd.born;
          if (age > nd.maxAge) { reefNodes.splice(n, 1); n--; continue; }
          var nAlpha = nd.alpha * reefFade;
          var fadeOut = age > nd.maxAge * 0.7 ? 1 - (age - nd.maxAge * 0.7) / (nd.maxAge * 0.3) : 1;
          nAlpha *= fadeOut;
          var p = Math.sin(now * 0.003 + nd.pulse) * 0.3 + 0.7;
          var fontPx = Math.max(8, Math.min(15, nd.r * p * 3.8));
          var reefMix = Math.max(0, Math.min(1, nd.x / W));
          var reefR = Math.round(91 * (1 - reefMix) + 204 * reefMix);
          var reefG = Math.round(156 * (1 - reefMix) + 251 * reefMix);
          var reefB = Math.round(245 * (1 - reefMix) + 229 * reefMix);
          var reefSR = Math.round(91 * (1 - reefMix) + 52 * reefMix);
          var reefSG = Math.round(156 * (1 - reefMix) + 211 * reefMix);
          var reefSB = Math.round(245 * (1 - reefMix) + 153 * reefMix);
          rctx.save();
          rctx.font = '700 ' + fontPx + 'px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
          rctx.textAlign = 'center';
          rctx.textBaseline = 'middle';
          rctx.shadowColor = 'rgba(' + reefSR + ', ' + reefSG + ', ' + reefSB + ', ' + (nAlpha * 0.4) + ')';
          rctx.shadowBlur = Math.min(7, fontPx * 0.5);
          rctx.shadowOffsetX = 0;
          rctx.shadowOffsetY = 0;
          rctx.fillStyle = 'rgba(' + reefR + ', ' + reefG + ', ' + reefB + ', ' + Math.min(1, nAlpha * 0.72 + 0.1) + ')';
          rctx.fillText('$', nd.x, nd.y);
          rctx.restore();
        }

        /* Spatial grid for O(n) neighbor lookup instead of O(n²) */
        var reefGridCell = 55;
        var reefGrid = {};
        for (var gn = 0; gn < reefNodes.length; gn++) {
          var gx = Math.floor(reefNodes[gn].x / reefGridCell);
          var gy = Math.floor(reefNodes[gn].y / reefGridCell);
          var gk = gx + ',' + gy;
          if (!reefGrid[gk]) reefGrid[gk] = [];
          reefGrid[gk].push(gn);
        }

        var reefDrawnEdges = {};
        for (var nn = 0; nn < reefNodes.length; nn++) {
          var a2 = reefNodes[nn];
          var cgx = Math.floor(a2.x / reefGridCell);
          var cgy = Math.floor(a2.y / reefGridCell);
          for (var ox = -1; ox <= 1; ox++) {
            for (var oy = -1; oy <= 1; oy++) {
              var nk = (cgx + ox) + ',' + (cgy + oy);
              var cell = reefGrid[nk];
              if (!cell) continue;
              for (var ci = 0; ci < cell.length; ci++) {
                var mm = cell[ci];
                if (mm <= nn) continue;
                var edgeKey = nn + ':' + mm;
                if (reefDrawnEdges[edgeKey]) continue;
                reefDrawnEdges[edgeKey] = true;

                var b2 = reefNodes[mm];
                var dx = a2.x - b2.x, dy = a2.y - b2.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 55 && dist > 5) {
                  var la = Math.min(a2.alpha, b2.alpha) * reefFade * (1 - dist / 55) * 0.15;
                  var aAge = now - a2.born, bAge = now - b2.born;
                  var af = aAge > a2.maxAge * 0.7 ? 1 - (aAge - a2.maxAge * 0.7) / (a2.maxAge * 0.3) : 1;
                  var bf = bAge > b2.maxAge * 0.7 ? 1 - (bAge - b2.maxAge * 0.7) / (b2.maxAge * 0.3) : 1;
                  la *= Math.min(af, bf);
                  if (la > 0.005) {
                    rctx.beginPath();
                    rctx.moveTo(a2.x, a2.y);
                    rctx.lineTo(b2.x, b2.y);
                    rctx.strokeStyle = 'rgba(96, 108, 62, ' + la + ')';
                    rctx.lineWidth = 0.5;
                    rctx.stroke();
                  }
                }
              }
            }
          }
        }

        for (var i = 0; i < reefBranches.length; i++) {
          var br = reefBranches[i];
          br.life++;
          if (br.life > br.maxLife) { reefBranches.splice(i, 1); i--; continue; }

          br.angle += br.curve + reefRand(-0.02, 0.02);
          var prevX = br.x, prevY = br.y;
          br.x += Math.cos(br.angle) * br.speed;
          br.y += Math.sin(br.angle) * br.speed;

          var progress = br.life / br.maxLife;
          var bAlpha = br.alpha * (1 - progress * progress) * reefFade;

          rctx.beginPath();
          rctx.moveTo(prevX, prevY);
          rctx.lineTo(br.x, br.y);
          rctx.strokeStyle = 'rgba(96, 108, 62, ' + bAlpha + ')';
          rctx.lineWidth = br.thickness * (1 - progress * 0.6);
          rctx.stroke();

          if (!br.forked && br.life > 8 && br.gen < 5 && Math.random() < 0.07) {
            br.forked = true;
            reefAddNode(br.x, br.y, br.gen + 1);
            var forkCount = Math.random() < 0.35 ? 2 : 1;
            for (var f = 0; f < forkCount; f++) {
              var fa = br.angle + reefRand(-1.2, 1.2);
              reefSpawnBranch(br.x, br.y, fa, br.gen + 1, br.speed * reefRand(0.6, 0.9));
            }
          }

          if (br.life > 6 && br.gen < 4 && Math.random() < 0.014) {
            reefAddNode(br.x, br.y, br.gen);
          }

          if (br.x < -20 || br.x > W + 20 || br.y < -20 || br.y > H + 20) {
            reefBranches.splice(i, 1); i--;
          }
        }

        var reefMagCap = 48;
        var reefMagCandidates = [];
        var hRsnap = heroContainer.getBoundingClientRect();
        var mtxWrapSnap = heroHome.querySelector('.matrix-container');
        var mRsnap = mtxWrapSnap ? mtxWrapSnap.getBoundingClientRect() : hRsnap;
        var reefToMtxX = mRsnap.left - hRsnap.left;
        var reefToMtxY = mRsnap.top - hRsnap.top;
        for (var rmi = 0; rmi < reefNodes.length; rmi++) {
          var rnd = reefNodes[rmi];
          var rAge = now - rnd.born;
          if (rAge > rnd.maxAge) continue;
          var rAlpha = rnd.alpha * reefFade;
          var rFadeOut = rAge > rnd.maxAge * 0.7 ? 1 - (rAge - rnd.maxAge * 0.7) / (rnd.maxAge * 0.3) : 1;
          rAlpha *= rFadeOut;
          var rPulse = Math.sin(now * 0.003 + rnd.pulse) * 0.3 + 0.7;
          var rWeight = rAlpha * rnd.r * rPulse;
          if (rWeight < 0.008) continue;
          reefMagCandidates.push({
            x: rnd.x - reefToMtxX,
            y: rnd.y - reefToMtxY,
            weight: Math.min(1, rWeight * 0.35)
          });
        }
        /* Strong anchor at pointer so matrix tendrils meet the reef the user is drawing */
        if (reefActive && reefFade > 0.05 && reefMx >= 0 && reefMy >= 0) {
          reefMagCandidates.push({
            x: reefMx - reefToMtxX,
            y: reefMy - reefToMtxY,
            weight: 1
          });
        }
        reefMagCandidates.sort(function(a, b) { return b.weight - a.weight; });
        mtxReefMagnetBridge.fade = reefFade;
        mtxReefMagnetBridge.heroW = W;
        mtxReefMagnetBridge.heroH = H;
        mtxReefMagnetBridge.nodes.length = 0;
        for (var rmc = 0; rmc < reefMagCandidates.length && rmc < reefMagCap; rmc++) {
          mtxReefMagnetBridge.nodes.push(reefMagCandidates[rmc]);
        }
      }

      function reefStart() {
        reefResize();
        reefActive = true;
        if (!reefRaf) {
          reefRaf = requestAnimationFrame(reefDraw);
        }
      }

      function reefStop() {
        reefActive = false;
      }
      function reefHardClear() {
        if(reefRaf){
          cancelAnimationFrame(reefRaf);
          reefRaf = null;
        }
        reefBranches.length = 0;
        reefNodes.length = 0;
        reefFade = 0;
        reefActive = false;
        mtxReefMagnetBridge.fade = 0;
        mtxReefMagnetBridge.nodes.length = 0;
        mtxReefMagnetBridge.heroW = 0;
        mtxReefMagnetBridge.heroH = 0;
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        rctx.clearRect(0, 0, reefCanvas.width, reefCanvas.height);
        reefResize();
      }
      homeHeroReefStop = reefStop;
      homeHeroReefHardClear = reefHardClear;

      heroHome.addEventListener('pointermove', function(e) {
        var r = heroContainer.getBoundingClientRect();
        var mx = e.clientX - r.left;
        var my = e.clientY - r.top;
        var now = performance.now();

        /* Compute pointer velocity (px per ms) */
        if (reefPrevMx >= 0 && reefPrevMoveTs > 0) {
          var dt = now - reefPrevMoveTs;
          if (dt > 0 && dt < 200) {
            var dx = mx - reefPrevMx;
            var dy = my - reefPrevMy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            /* Smooth velocity to avoid jitter */
            reefVelocity = reefVelocity * 0.6 + (dist / dt) * 0.4;
          }
        }

        reefPrevMx = reefMx;
        reefPrevMy = reefMy;
        reefMx = mx;
        reefMy = my;
        reefPrevMoveTs = now;

        if (!reefActive) reefStart();

        /* Adaptive spawn interval: faster movement = more frequent clusters */
        var isTouch = e.pointerType === 'touch';
        var baseInterval = isTouch ? 35 : 55;
        var velocityBoost = Math.min(40, reefVelocity * (isTouch ? 35 : 25));
        var spawnInterval = Math.max(10, baseInterval - velocityBoost);

        if (now - reefLastSpawn > spawnInterval) {
          reefLastSpawn = now;

          /* Interpolate spawns along the movement vector for fast sweeps */
          var interpDist = 0;
          if (reefPrevMx >= 0) {
            var idx = mx - reefPrevMx;
            var idy = my - reefPrevMy;
            interpDist = Math.sqrt(idx * idx + idy * idy);
          }

          if (interpDist > 20 && reefPrevMx >= 0) {
            /* Fast movement: spawn intermediate clusters along the path */
            var maxSteps = isTouch ? 6 : 4;
            var stepSize = isTouch ? 18 : 25;
            var interpSteps = Math.min(maxSteps, Math.floor(interpDist / stepSize));
            for (var si = 0; si <= interpSteps; si++) {
              var t = si / (interpSteps + 1);
              var ix = reefPrevMx + (mx - reefPrevMx) * t;
              var iy = reefPrevMy + (my - reefPrevMy) * t;
              if (!reefInDeadZone(ix, iy)) reefSpawnCluster(ix, iy, reefVelocity);
            }
          } else {
            if (!reefInDeadZone(mx, my)) reefSpawnCluster(mx, my, reefVelocity);
          }
        }
      });

      /* Touch gestures on #hero always scroll the page. The coral reef still animates via
         pointerdown/pointermove, but the browser owns the vertical scroll. Previous versions
         called preventDefault() in touchmove to "capture" the gesture for the reef; on iPhone
         that trapped users at the top of the page when the hero happened to fit the viewport. */
      heroReefScrollLockRelease = function(){};

      heroHome.addEventListener('touchmove', function() {
        refreshHeroHomepageOverflowDataAttr();
      }, { passive: true });

      /* Spawn reef on tap/press for instant touch feedback */
      heroHome.addEventListener('pointerdown', function(e) {
        if (isFinePointer(e)) return;
        var r = heroContainer.getBoundingClientRect();
        var mx = e.clientX - r.left;
        var my = e.clientY - r.top;
        reefMx = mx;
        reefMy = my;
        reefPrevMx = mx;
        reefPrevMy = my;
        reefPrevMoveTs = performance.now();
        reefStart();
        if (!reefInDeadZone(mx, my)) {
          reefSpawnCluster(mx, my, 0.5);
          reefSpawnCluster(mx + reefRand(-15, 15), my + reefRand(-15, 15), 0.3);
        }
        reefLastSpawn = performance.now();
      });

      heroHome.addEventListener('pointerenter', function(e) {
        reefStart();
      });

      heroHome.addEventListener('pointerleave', function(e) {
        if(typeof heroHome.hasPointerCapture === 'function' && heroHome.hasPointerCapture(e.pointerId)) return;
        reefStop();
        reefMx = -1;
        reefMy = -1;
        reefPrevMx = -1;
        reefPrevMy = -1;
        reefVelocity = 0;
        reefPrevMoveTs = 0;
      });

      heroHome.addEventListener('pointerup', function(e) {
        if(isFinePointer(e)) return;
        reefStop();
        reefMx = -1;
        reefMy = -1;
        reefPrevMx = -1;
        reefPrevMy = -1;
        reefVelocity = 0;
        reefPrevMoveTs = 0;
      });
      heroHome.addEventListener('pointercancel', function(e) {
        if(isFinePointer(e)) return;
        reefStop();
        reefMx = -1;
        reefMy = -1;
        reefPrevMx = -1;
        reefPrevMy = -1;
        reefVelocity = 0;
        reefPrevMoveTs = 0;
      });

      var reefResizeTimer;
      window.addEventListener('resize', function() {
        clearTimeout(reefResizeTimer);
        reefResizeTimer = setTimeout(reefResize, 200);
      });
    }
  }

  // Homepage hero: full-hero matrix on hover activators; pointer position warps glyph placement
  const matrixContainer = document.querySelector('#hero.hero--homepage .matrix-container');
  const matrixCanvas = document.querySelector('#hero.hero--homepage .matrix-canvas');
  /* Activate matrix on hover anywhere in the hero container */
  var heroContainerMtx = document.querySelector('#hero.hero--homepage');
  var matrixActivatorList = heroContainerMtx ? [heroContainerMtx] : [];
  var heroEyebrowMtx = document.querySelector('#hero.hero--homepage .hero-eyebrow');
  var heroFlagshipMtx = document.querySelector('#hero.hero--homepage a.cta-primary[href*="routing-the-dollar"]')
    || document.querySelector('#hero.hero--homepage a.action.primary.cta-primary');
  if(matrixContainer && matrixCanvas && matrixActivatorList.length > 0){
    /* Control-layer canvas: full motion, or static faint mesh when prefers-reduced-motion. */
    var mtxReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Keep matrix rain running without requiring hero hover (desktop and mobile). */
    var mtxMobileMatrixAlways = true;
    const mtxCtx = matrixCanvas.getContext('2d');
    /* One USD glyph: USDC stablecoin read comes from usdc.png in the crypto pool (duplicated there). */
    const textChars = [
      '$',
      '€', '£', '¥', '₩', '₹', '₣', '₴', '\uFDFC',
      '₿', '\u039E',
      'XAU', 'XAG', 'WTI',
      'DXY', 'VIX'
    ];

    var mtxFiatNonUsd = { '€': 1, '£': 1, '¥': 1, '₩': 1, '₹': 1, '₣': 1, '₴': 1, '\uFDFC': 1 };

    var iconDefs = [
      { src: '/icons/matrix/btc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/eth.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sol.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt2.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt2.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dai.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/busd.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wlfi.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdp.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hnt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fil.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/uni.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/uni.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/build-sources/aave.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xrp.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xrp.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ada.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ada.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/avax.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dot.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/atom.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ltc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/link.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xlm.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/doge.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/trx.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bnb.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/op.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/arb.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/arweave.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/near.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/apt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sui.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/inj.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hyperliquid.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tia.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tia.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xmr.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/zec.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/crv.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/crv.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ldo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ldo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stx.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/mkr.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xtz.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/algo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hbar.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ton.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ton.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sei.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sei.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wld.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/rndr.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tao.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kraken.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/layerzero.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wormhole.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wormhole.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ondo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/zrx.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/base.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ink.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/arc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stripe.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/1inch.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/gemini.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bitgo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/compound.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/okx.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/chainalysis.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fireblocks.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wintermute.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/grayscale.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/binance.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/binance.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/paxos.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/paxos.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/msft.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpmorgan.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/citi.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/gs.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/coinbase.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/coinbase.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sq.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/visa.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fednow.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ma.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/googl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/amzn.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/meta.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/x.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/facebook.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wmt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nvda.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tsla.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/amd.webp', loaded: false, img: null, tinted: null },
      /* nflx removed: file not present */
      { src: '/icons/matrix/bac.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wordmark-option-1/wfc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wordmark-option-1/wfc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/schw.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/pypl.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/venmo.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/cashapp.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/clearstreet.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wu.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/moneygram.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wise.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wise.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/intc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/csco.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/orcl.webp', loaded: false, img: null, tinted: null },
      /* dis removed */
      { src: '/icons/matrix/mstr.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/mstr.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hood.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hood.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ibm.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nasdaq.webp', loaded: false, img: null, tinted: null },
      /* Second Nasdaq slot: former NDX text ticker (macro index) now uses Nasdaq logo PNG only. */
      { src: '/icons/matrix/nasdaq.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nyse.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ice.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/revolut.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/block.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/blk.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/blk.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/securitize.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bakkt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fidelity.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/broadridge.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wisdomtree.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ubs.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bnymellon.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dtcc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/pwc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hsbc.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/morgan-stanley.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/borderless.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stt.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/plaid.webp', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bybit.webp', loaded: false, img: null, tinted: null },
      /* Fed removed: seal reads as ambiguous blob at matrix size. */
    ];

    var mtxCryptoTextList = [];
    var mtxLegacyCryptoMarks = { '₿': 1, '\u039E': 1 };
    var mtxTradTextChars = textChars.filter(function(v){
      return mtxCryptoTextList.indexOf(v) === -1 && !mtxLegacyCryptoMarks[v];
    });

    var mtxStockIconIdx = iconDefs.findIndex(function(d){
      return /\/aapl\.webp$/.test(d.src) || d.src.indexOf('aapl.webp') >= 0;
    });
    if(mtxStockIconIdx < 0){
      mtxStockIconIdx = iconDefs.length;
    }
    var mtxCryptoIconDefs = iconDefs.slice(0, mtxStockIconIdx);
    var mtxStockIconDefs = iconDefs.slice(mtxStockIconIdx);

    var mtxCryptoPool = mtxCryptoTextList.map(function(v){ return { type: 'text', value: v }; });
    var mtxCoreStableSlugs = ['usdc.webp', 'usdt.webp', 'usdt2.webp', 'dai.webp'];
    var mtxStablecoinSlugs = ['usdc.webp', 'usdt.webp', 'usdt2.webp', 'dai.webp', 'mkr.webp', 'm0.webp', 'circle.webp'];
    var mtxTopL1Slugs = ['btc.webp', 'eth.webp', 'sol.webp'];
    var mtxMajorL1Slugs = ['xrp.webp', 'ada.webp', 'avax.webp', 'dot.webp', 'bnb.webp'];
    mtxCryptoIconDefs.forEach(function(def){
      var isCoreStable = mtxCoreStableSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isStable = mtxStablecoinSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isTopL1 = mtxTopL1Slugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isMajorL1 = mtxMajorL1Slugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var mtxInfraSlugs = ['chainalysis.webp', 'fireblocks.webp', 'wintermute.webp', 'bitgo.webp', 'compound.webp', 'gemini.webp', '1inch.webp', 'okx.webp', 'securitize.webp', 'layerzero.webp', 'coinbase.webp', 'kraken.webp', 'aave.webp', 'crv.webp', 'grayscale.webp', 'binance.webp', 'paxos.webp'];
      var isInfra = mtxInfraSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var n = isCoreStable ? 8 : (isStable ? 5 : (isTopL1 ? 5 : (isMajorL1 ? 4 : (isInfra ? 4 : 3))));
      for(var k = 0; k < n; k++){
        mtxCryptoPool.push({ type: 'icon', def: def });
      }
    });

    var mtxTradPool = mtxTradTextChars.map(function(v){ return { type: 'text', value: v }; });
    /* Weight company logos in the trad stream so they read alongside fiat and macro tickers */
    mtxStockIconDefs.forEach(function(def){
      var isAapl = def.src.indexOf('aapl.webp') >= 0;
      var n = (def.src.indexOf('visa.webp') >= 0 || def.src.indexOf('tsla.webp') >= 0) ? 7 : (isAapl ? 5 : 4);
      var k;
      for(k = 0; k < n; k++){
        mtxTradPool.push({ type: 'icon', def: def });
      }
    });
    /* Former WTI text ticker: show Wormhole mark in trad stream (same def as crypto pool). */
    var mtxWormholeTradDef = mtxCryptoIconDefs.find(function(d){ return d.src.indexOf('wormhole.webp') >= 0; });
    if(mtxWormholeTradDef){
      mtxTradPool.push({ type: 'icon', def: mtxWormholeTradDef });
    }

    /* ~35% of glyphs from crypto icons only (no crypto ASCII tickers); rest from fiat, commodities, macro, stock icons */
    var mtxCryptoPickRate = 0.35;
    /* ₿ and Ξ only via this branch so they are not diluted by pools */
    var mtxLegacyMarkRate = 0.07;

    /* Bust browser cache for matrix PNGs when assets change (avoids mixed old/new silhouettes after deploy). */
    var mtxIconAssetVer = '142';
    function mtxIconUrl(src){
      return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + mtxIconAssetVer;
    }

    iconDefs.forEach(function(def){
      var img = new Image();
      img.decoding = 'async';
      img.onload = function(){
        def.loaded = true;
        def.img = img;
      };
      img.onerror = function(){
        def.loaded = false;
        def.img = null;
      };
      img.src = mtxIconUrl(def.src);
    });

    var mtxRaf = null;
    var mtxWarpTx = null;
    var mtxWarpTy = null;
    var mtxWarpX = null;
    var mtxWarpY = null;
    var mtxLastPointerClientX = null;
    var mtxLastPointerClientY = null;

    /* CTA position in matrix-local coords for $ attraction */
    var mtxCtaX = null, mtxCtaY = null;
    function mtxUpdateCtaPos(){
      var btn = heroHome.querySelector('a.cta-primary[href*="routing-the-dollar"]')
        || heroHome.querySelector('a.cta-primary');
      if(!btn || !matrixCanvas) return;
      var br = btn.getBoundingClientRect();
      var c = matrixCanvas.getBoundingClientRect();
      var cw = Math.max(1, matrixCanvas.clientWidth);
      var ch = Math.max(1, matrixCanvas.clientHeight);
      var rw = Math.max(1, c.width);
      var rh = Math.max(1, c.height);
      var sx = Math.abs(cw - rw) > 0.75 ? cw / rw : 1;
      var sy = Math.abs(ch - rh) > 0.75 ? ch / rh : 1;
      mtxCtaX = (br.left + br.width * 0.5 - c.left) * sx;
      mtxCtaY = (br.top + br.height * 0.5 - c.top) * sy;
    }

    /* ── Diagnosis (hero matrix $ parallax): Floating $ are text columns in mtxDraw (item.value === '$').
       Input: mtxLastPointerClientX/Y, synced to mtxWarpX/Y in the draw loop (not a separate DOM parallax).
       Interactive pull is mtxDollarRawCursorDelta + per-column lerp, then mtxDollarApplyCtaAttract; idle column motion is unchanged.
       Tuning: raw cursor delta (depth-scaled, clamped to 4vw) is lerped per column; CTA attract applies after lerp.
       Touch-only 12px dead zone uses mtxHeroDollarTouchParallaxOrigin (hero pointerdown/up). */
    var mtxDollarParallaxLerpBase = 0.07;
    var mtxDollarParallaxMaxDispVw = 4;
    var mtxDollarParallaxTouchDeadPx = 12;

    function mtxParallaxTouchDevice(){
      return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    }

    function mtxHeroDollarParallaxAdjustClient(clientX, clientY){
      if(!mtxParallaxTouchDevice() || !mtxHeroDollarTouchParallaxOrigin){
        return { x: clientX, y: clientY };
      }
      var o = mtxHeroDollarTouchParallaxOrigin;
      var ddx = clientX - o.x;
      var ddy = clientY - o.y;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if(dist < mtxDollarParallaxTouchDeadPx){
        return { x: o.x, y: o.y };
      }
      var sc = (dist - mtxDollarParallaxTouchDeadPx) / dist;
      return { x: o.x + ddx * sc, y: o.y + ddy * sc };
    }

    /* Pointer-only displacement (viewport px) before per-column lerp and CTA pass. Large fonts get smaller depthMul. */
    function mtxDollarRawCursorDelta(px, py, cw, ch, fontSize, wpx, wpy){
      var dx = 0;
      var dy = 0;
      if(wpx == null || wpy == null){
        return { dx: dx, dy: dy };
      }
      var maxRCursor = Math.max(180, Math.min(cw, ch) * 0.65);
      var dollarWarpMob = mtxIsMobile ? 0.5 : 1;
      var dx0 = wpx - px;
      var dy0 = wpy - py;
      var dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
      var strengthCursor = Math.min(cw, ch) * 0.095 * dollarWarpMob;
      var fsUse = fontSize || mtxFontSize;
      var layerDepth = mtxFontSize / Math.max(fsUse, mtxFontSize);
      var clampedDepth = Math.pow(Math.min(1, layerDepth), 0.4);
      var depthMul = clampedDepth * 0.35;
      if(dist0 > 0.5 && dist0 < maxRCursor){
        var inv0 = 1 / dist0;
        var tc = 1 - dist0 / maxRCursor;
        var sc = tc * tc * strengthCursor * depthMul;
        dx = dx0 * inv0 * sc;
        dy = dy0 * inv0 * sc;
      }
      var maxParallaxPx = (typeof window !== 'undefined' ? window.innerWidth : cw) * mtxDollarParallaxMaxDispVw / 100;
      var dMag = Math.sqrt(dx * dx + dy * dy);
      if(dMag > maxParallaxPx && dMag > 0){
        dx = dx * maxParallaxPx / dMag;
        dy = dy * maxParallaxPx / dMag;
      }
      return { dx: dx, dy: dy };
    }

    /* CTA attract on positions already including smoothed cursor offset (base column px,py for near-pointer test). */
    function mtxDollarApplyCtaAttract(ox, oy, cw, ch, basePx, basePy){
      var maxRCursor = Math.max(180, Math.min(cw, ch) * 0.65);
      var dollarWarpMob = mtxIsMobile ? 0.5 : 1;
      if(mtxCtaX == null || mtxCtaY == null){
        return { x: ox, y: oy };
      }
      var dxC = ox - mtxCtaX;
      var dyC = oy - mtxCtaY;
      var distC = Math.sqrt(dxC * dxC + dyC * dyC);
      var maxR = Math.max(128, Math.min(cw, ch) * 0.5);
      var strength = Math.min(cw, ch) * 0.05 * dollarWarpMob;
      if(distC <= 0.5 || distC >= maxR){
        return { x: ox, y: oy };
      }
      var invd = 1 / distC;
      var t = 1 - distC / maxR;
      var s = t * t * strength;
      if(mtxWarpX != null && mtxWarpY != null){
        var dNear = Math.sqrt((mtxWarpX - basePx) * (mtxWarpX - basePx) + (mtxWarpY - basePy) * (mtxWarpY - basePy));
        if(dNear < maxRCursor * 0.9){
          s *= 0.32;
        }
      }
      return {
        x: ox - dxC * invd * s,
        y: oy - dyC * invd * s
      };
    }

    function mtxRebuildIconHitRects(queue){
      mtxLastIconHitRects.length = 0;
      if(!queue || !queue.length){
        return;
      }
      var ri, pad, q;
      for(ri = 0; ri < queue.length; ri++){
        q = queue[ri];
        pad = 8;
        mtxLastIconHitRects.push({
          left: q.ix - pad,
          right: q.ix + q.iw + pad,
          top: q.iy - pad,
          bottom: q.iy + q.ih + pad,
          colIdx: q.colIdx
        });
      }
    }

    function mtxDollarBBoxOverlapsIcon(tx, ty, gw, gh, colIdx, queue, padD, padI){
      if(!queue || !queue.length){
        return false;
      }
      var dl = tx - padD;
      var dr = tx + gw + padD;
      var dt = ty - padD;
      var db = ty + gh + padD;
      var qi, iq;
      for(qi = 0; qi < queue.length; qi++){
        iq = queue[qi];
        if(iq.colIdx === colIdx){
          continue;
        }
        var il = iq.ix - padI;
        var ir = iq.ix + iq.iw + padI;
        var itop = iq.iy - padI;
        var ib = iq.iy + iq.ih + padI;
        if(dl < ir && dr > il && dt < ib && db > itop){
          return true;
        }
      }
      return false;
    }

    function mtxTryDollarIconBurst(colIdx, tx, ty, gw, gh, nowMs){
      if(mtxWarpX == null || mtxWarpY == null || mtxLastIconHitRects.length === 0){
        return;
      }
      if(nowMs < mtxColDollarIconBurstCooldownUntil[colIdx]){
        return;
      }
      var padB = 5;
      var dl = tx - padB;
      var dr = tx + gw + padB;
      var dt = ty - padB;
      var db = ty + gh + padB;
      var dcx = tx + gw * 0.5;
      var dcy = ty + gh * 0.5;
      var hi, R;
      for(hi = 0; hi < mtxLastIconHitRects.length; hi++){
        R = mtxLastIconHitRects[hi];
        if(R.colIdx === colIdx){
          continue;
        }
        if(dl >= R.right || dr <= R.left || dt >= R.bottom || db <= R.top){
          continue;
        }
        var dx = mtxWarpX - dcx;
        var dy = mtxWarpY - dcy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 14){
          return;
        }
        var nx = dx / dist;
        var ny = dy / dist;
        var sh = mtxIsMobile ? 1.65 : 5.4;
        var sv = mtxIsMobile ? 0.045 : 0.14;
        mtxColDollarShotVx[colIdx] += nx * sh;
        mtxColDollarShotVDrop[colIdx] += ny * sv;
        mtxColDollarShotVx[colIdx] = Math.max(-12, Math.min(12, mtxColDollarShotVx[colIdx]));
        mtxColDollarShotVDrop[colIdx] = Math.max(-0.38, Math.min(0.38, mtxColDollarShotVDrop[colIdx]));
        mtxColDollarIconBurstCooldownUntil[colIdx] = nowMs + 270;
        break;
      }
    }

    var mtxDrops = [];
    var mtxColItem = [];
    var mtxColOpacity = [];
    var mtxColStep = [];
    var mtxColDriftX = [];
    var mtxColDriftRate = [];
    /* Large $: burst toward pointer when overlapping an icon column (rects from prior frame). */
    var mtxColDollarShotVx = [];
    var mtxColDollarShotVDrop = [];
    var mtxColDollarIconBurstCooldownUntil = [];
    /* Hero matrix $: pointer response only (lerp toward raw cursor pull; idle column motion unchanged). */
    var mtxColDollarSmoothedPullX = [];
    var mtxColDollarSmoothedPullY = [];
    var mtxHeroDollarTouchParallaxOrigin = null;
    var mtxLastIconHitRects = [];
    /* Pass 1 records $ draw state; pass 2b redraws on top of icons when bbox overlaps (avoids $ vanishing under sprites). */
    var mtxPass1DollarOverdraw = [];
    var mtxPrevDrawTs = 0;
    var mtxColWidth = 22;
    var mtxFontSize = 13;
    var mtxDollarFontSize = 20;
    /* € £ ¥ etc.: larger than commodity/macro tickers so fiat reads in the trail. */
    var mtxFiatNonUsdFontSize = 18;
    var mtxLineStep = 16;
    var mtxIconDrawSize = 24;
    var mtxIconDrawSizeMin = 18;
    var mtxIconDrawSizeMax = 34;
    /* LayerZero + Uniswap: thin marks read small at trail scale; wider range than global min/max. */
    var mtxIconLZUniDrawSizeMin = 26;
    var mtxIconLZUniDrawSizeMax = 42;
    /* LayerZero ZRO: extra-thin mark needs even more size boost. */
    var mtxIconLZDrawSizeMin = 34;
    var mtxIconLZDrawSizeMax = 42;
    var mtxTrailFillCache = '';
    var mtxTrailFillFrame = 0;

    /* ── Control-layer mesh state ── */
    var mtxIsMobile = window.matchMedia('(max-width: 768px)').matches;

    var mtxMeshNodes = [];
    var mtxMeshRipples = [];
    var mtxMeshEdgeFlashes = [];
    var mtxMeshReactCooldown = [];
    var mtxNextMeshNodeId = 1;

    var mtxMeshZoneTop = 0.82; /* bottom ~18%: persistent pad-mesh underlay */
    /* mtxSubmersionZoneTop was 0.76 (drew a blue control-layer band across
       the lower 24% of the hero). Per author 2026-04-26: that band created
       a visible "box cutting off hero animation" at the same horizontal
       axis as the hero subtitle ("Nine papers across two tracks..."). Set
       to 1.0 to push the submersion zone off-screen (the band is no longer
       drawn; mesh interactions that gate on this threshold continue to
       work below the visible hero). */
    var mtxSubmersionZoneTop = 1.0;
    var mtxMeshMaxNodes = mtxReducedMotion ? 12 : (mtxIsMobile ? 25 : 60);
    var mtxMeshConnectionDist = mtxReducedMotion ? 28 : (mtxIsMobile ? 35 : 50);
    var mtxMeshReactRadius = mtxReducedMotion ? 22 : (mtxIsMobile ? 36 : 52);
    var mtxMeshPulseSpeed = 0.00135; /* calmer than reef */
    var meshNodeLifeMin = 9000;
    var meshNodeLifeMax = 14000;
    var mtxMeshMaxLinksPerNode = 3;
    var mtxMeshRippleMaxAge = mtxReducedMotion ? 0 : 300;
    var mtxMeshDidBootstrap = false;

    var mtxHeroSafeZones = [];
    var mtxHeadWake = [];
    var mtxWakeMaxAgeMs = 280;
    var mtxWakePerfTier = 0;
    var mtxFpsSampleAcc = 0;
    var mtxFpsSampleN = 0;
    var mtxLastDrawT = 0;

    function mtxMeasureHeroSafeZones() {
      mtxHeroSafeZones = [];
      if (!heroContainerMtx || !matrixCanvas) {
        return;
      }
      var c = matrixCanvas.getBoundingClientRect();
      var cw = Math.max(1, matrixCanvas.clientWidth);
      var ch = Math.max(1, matrixCanvas.clientHeight);
      var rw = Math.max(1, c.width);
      var rh = Math.max(1, c.height);
      var sx = Math.abs(cw - rw) > 0.75 ? cw / rw : 1;
      var sy = Math.abs(ch - rh) > 0.75 ? ch / rh : 1;
      var nodes = heroContainerMtx.querySelectorAll('[data-hero-safe]');
      var pad = 12;
      var zi;
      for (zi = 0; zi < nodes.length; zi++) {
        var r = nodes[zi].getBoundingClientRect();
        mtxHeroSafeZones.push({
          left: (r.left - c.left) * sx - pad,
          top: (r.top - c.top) * sy - pad,
          right: (r.right - c.left) * sx + pad,
          bottom: (r.bottom - c.top) * sy + pad
        });
      }
    }

    function mtxDistToHeroSafeZones(px, py) {
      if (!mtxHeroSafeZones.length) {
        return 120;
      }
      var minD = 1e9;
      var i;
      for (i = 0; i < mtxHeroSafeZones.length; i++) {
        var z = mtxHeroSafeZones[i];
        if (px >= z.left && px <= z.right && py >= z.top && py <= z.bottom) {
          return 0;
        }
        var dx = 0;
        var dy = 0;
        if (px < z.left) {
          dx = z.left - px;
        } else if (px > z.right) {
          dx = px - z.right;
        }
        if (py < z.top) {
          dy = z.top - py;
        } else if (py > z.bottom) {
          dy = py - z.bottom;
        }
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) {
          minD = d;
        }
      }
      return minD;
    }

    function mtxGetCenterSafeAttenuation(px, py, layer) {
      var d = mtxDistToHeroSafeZones(px, py);
      var t = d < 0.5 ? 0 : Math.min(1, d / 110);
      var lo = 0.45;
      var hi = 0.7;
      if (layer === 'wake') {
        lo = 0.55;
        hi = 0.78;
      } else if (layer === 'haze') {
        lo = 0.65;
        hi = 0.85;
      } else if (layer === 'back') {
        lo = 0.75;
        hi = 0.92;
      } else if (layer === 'foreground') {
        lo = 0.45;
        hi = 0.7;
      }
      return lo + (hi - lo) * t;
    }

    function mtxEffectiveWakeCap() {
      var base = mtxIsMobile ? 4 : 7;
      if (mtxWakePerfTier >= 1) {
        base = Math.min(base, 4);
      }
      if (mtxWakePerfTier >= 2) {
        base = 2;
      }
      return Math.max(2, base);
    }

    function mtxPushHeadWakeSample(colIndex, wx, wy, now, op, isDollar, isIcon) {
      if (mtxReducedMotion) {
        return;
      }
      if (!mtxHeadWake[colIndex]) {
        mtxHeadWake[colIndex] = [];
      }
      var arr = mtxHeadWake[colIndex];
      arr.push({ x: wx, y: wy, t: now, op: op, isDollar: isDollar, isIcon: isIcon });
      var cap = mtxEffectiveWakeCap();
      while (arr.length && now - arr[0].t > mtxWakeMaxAgeMs) {
        arr.shift();
      }
      while (arr.length > cap) {
        arr.shift();
      }
    }

    /* ── Pre-rendered glow sprites (reuse via drawImage) ── */
    var trailGlowSprites = { def: [], mint: [] }; /* sizes 10,14,18,22 */
    var trailGlowSpriteSizes = [10, 14, 18, 22];

    function buildGlowSprite(size, r, g, b) {
      var c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      var cx = c.getContext('2d');
      var half = size / 2;
      var grad = cx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ', 1)');
      grad.addColorStop(0.55, 'rgba(' + r + ',' + g + ',' + b + ', 0.35)');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ', 0)');
      cx.fillStyle = grad;
      cx.fillRect(0, 0, size, size);
      return c;
    }

    function ensureGlowSprites() {
      if (trailGlowSprites.def.length) return;
      for (var gi = 0; gi < trailGlowSpriteSizes.length; gi++) {
        var sz = trailGlowSpriteSizes[gi];
        trailGlowSprites.def.push(buildGlowSprite(sz, 96, 108, 62));
        trailGlowSprites.mint.push(buildGlowSprite(sz, 204, 251, 229));
      }
    }

    function mtxGlowSpriteFor(isDollar, stepIndex, submerge) {
      ensureGlowSprites();
      var arr = isDollar ? trailGlowSprites.mint : trailGlowSprites.def;
      var idx = Math.min(arr.length - 1, Math.max(0, stepIndex + Math.round(submerge)));
      return arr[idx];
    }

    /* Find the k nearest mesh neighbors for a node (deduped edges upstream) */
    function mtxMeshNearestK(nodeIndex, k) {
      var nd = mtxMeshNodes[nodeIndex];
      var neighbors = [];
      for (var j = 0; j < mtxMeshNodes.length; j++) {
        if (j === nodeIndex) continue;
        var other = mtxMeshNodes[j];
        var dx = nd.x - other.x;
        var dy = nd.y - other.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mtxMeshConnectionDist && dist > 3) {
          neighbors.push({ idx: j, dist: dist });
        }
      }
      neighbors.sort(function(a, b) { return a.dist - b.dist; });
      return neighbors.slice(0, k);
    }

    /* ── Dollar magnet: canvas $ particles follow cursor, pile on flagship CTA, bounce on approach (desktop only) ── */
    var mtxDollarMag = [];
    var mtxDollarMagMax = 30;
    var mtxDollarMagPrevMx = null;
    var mtxDollarMagPrevMy = null;
    var mtxDollarMagIconPts = [];
    var mtxDollarMagLeavingHero = false;
    var mtxDollarMagLeaveFadeMs = 75;
    var mtxDollarMagLeaveStartedAt = 0;
    var mtxDollarMagHoldMs = 10;
    var mtxDollarMagIconRefractoryMs = 240;

    function mtxDollarMagIconKey(ix, iy){
      return (Math.round(ix / 10) * 10) + ',' + (Math.round(iy / 10) * 10);
    }

    function mtxIsFranklinMatrixIcon(item){
      var src = item && item.def && item.def.src;
      return !!(src && src.indexOf('franklin.webp') >= 0);
    }

    /* Drop head-wake samples and mesh ripples so glow trails do not outlive the fast trail purge. */
    function mtxClearMatrixTrailGhosts(){
      mtxMeshRipples.length = 0;
      var hw;
      for(hw = 0; hw < mtxHeadWake.length; hw++){
        if(mtxHeadWake[hw]){
          mtxHeadWake[hw].length = 0;
        }
      }
    }

    function mtxTrailFill(){
      mtxTrailFillFrame++;
      /* Normal trail uses low alpha (~0.16): ghosts linger for seconds. After hero leave, match the
         ~75ms dollar fade by nearly resetting the bitmap each frame so residue clears with it. */
      if(mtxDollarMagLeavingHero){
        var csP = getComputedStyle(matrixContainer);
        var rawP = csP.getPropertyValue('--matrix-trail-rgb').trim();
        var partsP = rawP.split(/\s+/).map(Number);
        var purgA = 0.92;
        if(partsP.length >= 3 && partsP.every(function(n){ return !Number.isNaN(n); })){
          return 'rgba(' + partsP[0] + ',' + partsP[1] + ',' + partsP[2] + ',' + purgA + ')';
        }
        return 'rgba(22, 32, 28, ' + purgA + ')';
      }
      if(mtxTrailFillCache && mtxTrailFillFrame % 40 !== 0){
        return mtxTrailFillCache;
      }
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
        mtxTrailFillCache = 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + fadeAlpha + ')';
      } else {
        mtxTrailFillCache = 'rgba(255, 255, 255, ' + fadeAlpha + ')';
      }
      return mtxTrailFillCache;
    }

    /* Opaque base color from --matrix-trail-rgb (same channel values as the fade layer, alpha 1). */
    function mtxPanelMatteRgb(){
      var cs = getComputedStyle(matrixContainer);
      var raw = cs.getPropertyValue('--matrix-trail-rgb').trim();
      var parts = raw.split(/\s+/).map(Number);
      if(parts.length >= 3 && parts.every(function(n){ return !Number.isNaN(n); })){
        return 'rgb(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ')';
      }
      return 'rgb(22,32,28)';
    }

    function buildTinted(def){
      if(def.tinted){
        return def.tinted;
      }
      if(!def.img || !def.loaded){
        return null;
      }
      /* Tint at native bitmap size, then scale once on the hero canvas (avoids upscaling 32px art to 48 then crushing to 16). */
      var nw = def.img.naturalWidth || 32;
      var nh = def.img.naturalHeight || 32;
      if(nw < 1){
        nw = 32;
      }
      if(nh < 1){
        nh = 32;
      }
      var tmp = document.createElement('canvas');
      tmp.width = nw;
      tmp.height = nh;
      var tctx = tmp.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(def.img, 0, 0, nw, nh);
      /* Hollow hex pre-processing removed: link/hnt now use clean SVG-rendered PNGs. */
      tctx.globalCompositeOperation = 'source-atop';
      tctx.fillStyle = 'rgba(94, 234, 168, 1)';
      tctx.fillRect(0, 0, nw, nh);
      tctx.globalCompositeOperation = 'source-over';
      def.tinted = tmp;
      return tmp;
    }

    /* Accent-tinted version of the icon for the horizontal x-position gradient. Pre-baked at
       native size and cached per def, mirroring buildTinted. The hero canvas cross-fades
       between this and the green tint based on each icon's x position so right-side icons
       shift toward the "Audit the operator" accent color. */
    function buildTintedAccent(def){
      if(def.tintedAccent){
        return def.tintedAccent;
      }
      if(!def.img || !def.loaded){
        return null;
      }
      var nw = def.img.naturalWidth || 32;
      var nh = def.img.naturalHeight || 32;
      if(nw < 1){
        nw = 32;
      }
      if(nh < 1){
        nh = 32;
      }
      var tmp = document.createElement('canvas');
      tmp.width = nw;
      tmp.height = nh;
      var tctx = tmp.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(def.img, 0, 0, nw, nh);
      tctx.globalCompositeOperation = 'source-atop';
      tctx.fillStyle = 'rgba(91, 156, 245, 1)';
      tctx.fillRect(0, 0, nw, nh);
      tctx.globalCompositeOperation = 'source-over';
      def.tintedAccent = tmp;
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

    var mtxIconCooldowns = {};
    var mtxIconCooldownMs = 1000;

    var mtxIconMinColDistance = 2;
    function mtxIconTooClose(colIndex, def){
      if(!def || !def.src || !mtxColItem){
        return false;
      }
      var n = mtxColItem.length;
      var lo = Math.max(0, colIndex - mtxIconMinColDistance);
      var hi = Math.min(n - 1, colIndex + mtxIconMinColDistance);
      for(var j = lo; j <= hi; j++){
        if(j === colIndex){
          continue;
        }
        var other = mtxColItem[j];
        if(other && other.type === 'icon' && other.def && other.def.src === def.src){
          return true;
        }
      }
      return false;
    }

    /* Viewport pointer to canvas logical space (same as mtxDraw w,h and icon ix,iy). clientX/Y and
       getBoundingClientRect share one CSS-pixel space; use offset-only mapping when rect size matches
       clientWidth within a pixel so browser zoom (subpixel rect vs integer clientWidth) does not bias X. */
    function mtxPointerToMatrixLocal(clientX, clientY, cwOpt, chOpt){
      if(!matrixCanvas){
        return { x: 0, y: 0 };
      }
      var cw = cwOpt != null ? cwOpt : Math.max(1, matrixCanvas.clientWidth);
      var ch = chOpt != null ? chOpt : Math.max(1, matrixCanvas.clientHeight);
      var r = matrixCanvas.getBoundingClientRect();
      var rw = Math.max(1, r.width);
      var rh = Math.max(1, r.height);
      var sx = Math.abs(cw - rw) > 0.75 ? cw / rw : 1;
      var sy = Math.abs(ch - rh) > 0.75 ? ch / rh : 1;
      var tx = (clientX - r.left) * sx;
      var ty = (clientY - r.top) * sy;
      var bleed = 6;
      return {
        x: Math.max(-bleed, Math.min(cw + bleed, tx)),
        y: Math.max(-bleed, Math.min(ch + bleed, ty))
      };
    }

    function mtxUpdateWarpFromEvent(e){
      /* Reef starts on any pointermove while inactive; matrix used to rely only on pointerover.
         After reload, if the cursor is already over the hero, the browser often skips pointerover
         until the pointer leaves and re-enters, so the first move only fired pointermove: coral ran, matrix did not. */
      if(!matrixContainer.classList.contains('active')){
        mtxStart();
      }
      var cx = e.clientX;
      var cy = e.clientY;
      if((typeof cx !== 'number' || typeof cy !== 'number') && e.changedTouches && e.changedTouches[0]){
        cx = e.changedTouches[0].clientX;
        cy = e.changedTouches[0].clientY;
      }
      if(typeof cx !== 'number' || typeof cy !== 'number'){
        return;
      }
      mtxLastPointerClientX = cx;
      mtxLastPointerClientY = cy;
      var loc = mtxPointerToMatrixLocal(cx, cy);
      mtxWarpTx = loc.x;
      mtxWarpTy = loc.y;
    }

    function mtxApplyWarp(px, py, cw, ch){
      if(mtxWarpX == null || mtxWarpY == null){
        return { x: px, y: py };
      }
      var dx = px - mtxWarpX;
      var dy = py - mtxWarpY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var maxR = Math.max(128, Math.min(cw, ch) * 0.44);
      var strength = Math.min(cw, ch) * 0.042;
      if(dist < 0.5 || dist >= maxR){
        return { x: px, y: py };
      }
      var invd = 1 / dist;
      var t = 1 - dist / maxR;
      var s = t * t * strength;
      return {
        x: px + dx * invd * s,
        y: py + dy * invd * s
      };
    }

    function mtxWarpPoint(px, py, cw, ch) {
      return mtxApplyWarp(px, py, cw, ch);
    }

    function mtxGetSubmerge(y, h) {
      return Math.max(0, Math.min(1, (y - h * mtxSubmersionZoneTop) / (h * (1 - mtxSubmersionZoneTop))));
    }

    function mtxInitCanvas(forceResetDrops){
      var rect = matrixContainer.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      var newW = Math.floor(w * dpr);
      var newH = Math.floor(h * dpr);
      /* Assigning width/height clears the bitmap; skip when unchanged to avoid one-frame flashes on pointerover. */
      var needBufferResize = matrixCanvas.width !== newW || matrixCanvas.height !== newH;
      if(needBufferResize){
        matrixCanvas.width = newW;
        matrixCanvas.height = newH;
      }
      matrixCanvas.style.width = w + 'px';
      matrixCanvas.style.height = h + 'px';
      mtxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mtxCtx.imageSmoothingEnabled = true;
      if('imageSmoothingQuality' in mtxCtx){
        mtxCtx.imageSmoothingQuality = 'high';
      }
      if('textRendering' in mtxCtx){
        mtxCtx.textRendering = 'geometricPrecision';
      }
      /* Match mtxDraw column math to integer layout width (avoids rect vs clientWidth mismatch). */
      var cw = Math.max(1, matrixCanvas.clientWidth || Math.floor(w));
      var colCount = Math.max(1, Math.floor(cw / mtxColWidth));
      var prevColCount = mtxDrops.length;
      var colLayoutChanged = colCount !== prevColCount;
      /* Only reset drop positions if column count changed or explicitly requested. */
      if(forceResetDrops || colLayoutChanged){
        mtxDrops = new Array(colCount).fill(0).map(function(){
          return -8 - Math.random() * 32;
        });
        mtxColItem = new Array(colCount).fill(null);
        mtxColOpacity = new Array(colCount).fill(null);
        mtxColStep = new Array(colCount).fill(0).map(function(){
          return 0.15 + Math.random() * 0.04;
        });
        mtxColDriftX = new Array(colCount).fill(0);
        mtxColDriftRate = new Array(colCount).fill(0);
        mtxColDollarShotVx = new Array(colCount).fill(0);
        mtxColDollarShotVDrop = new Array(colCount).fill(0);
        mtxColDollarIconBurstCooldownUntil = new Array(colCount).fill(0);
        mtxColDollarSmoothedPullX = new Array(colCount).fill(0);
        mtxColDollarSmoothedPullY = new Array(colCount).fill(0);
      }
      /* Reset mesh and head wake only when the buffer or columns changed, or a full reseed was requested. */
      var resetMesh = forceResetDrops || needBufferResize || colLayoutChanged;
      if(resetMesh){
        mtxPrevDrawTs = 0;
        mtxMeshNodes = [];
        mtxMeshRipples = [];
        mtxMeshEdgeFlashes = [];
        mtxMeshReactCooldown = new Array(Math.max(1, mtxDrops.length)).fill(0);
        mtxNextMeshNodeId = 1;
        mtxMeshDidBootstrap = false;
        var ncolWake = Math.max(1, mtxDrops.length);
        mtxHeadWake = new Array(ncolWake).fill(null).map(function(){
          return [];
        });
      } else {
        /* Cooldown array length must track column count after first init only when layout changed above. */
        if(mtxMeshReactCooldown.length !== Math.max(1, mtxDrops.length)){
          mtxMeshReactCooldown = new Array(Math.max(1, mtxDrops.length)).fill(0);
        }
        if(mtxHeadWake.length !== Math.max(1, mtxDrops.length)){
          var nWake = Math.max(1, mtxDrops.length);
          mtxHeadWake = new Array(nWake).fill(null).map(function(){
            return [];
          });
        }
        if(mtxColDollarShotVx.length !== mtxDrops.length){
          var nsShot = mtxDrops.length;
          mtxColDollarShotVx = new Array(nsShot).fill(0);
          mtxColDollarShotVDrop = new Array(nsShot).fill(0);
          mtxColDollarIconBurstCooldownUntil = new Array(nsShot).fill(0);
        }
        if(mtxColDollarSmoothedPullX.length !== mtxDrops.length){
          var nsPull = mtxDrops.length;
          mtxColDollarSmoothedPullX = new Array(nsPull).fill(0);
          mtxColDollarSmoothedPullY = new Array(nsPull).fill(0);
        }
      }
      mtxMeasureHeroSafeZones();
    }

    function mtxIsBitcoinItem(item) {
      if (item.type === 'icon' && item.def && item.def.src && item.def.src.indexOf('btc.webp') >= 0) return true;
      if (item.type === 'text' && item.value === '₿') return true;
      return false;
    }

    function mtxAssignColVisual(i){
      var item;
      var tries = 0;
      var maxTries = 20;
      var now = performance.now();
      do {
        item = pickItem();
        if(item.type !== 'icon'){
          break;
        }
        var srcKey = item.def && item.def.src ? item.def.src : '';
        var isStableSrc = mtxCoreStableSlugs.some(function(s){ return srcKey.indexOf(s) >= 0; });
        var onCooldown = !isStableSrc && srcKey && mtxIconCooldowns[srcKey] && (now - mtxIconCooldowns[srcKey]) < mtxIconCooldownMs;
        if(!onCooldown && !mtxIconTooClose(i, item.def)){
          break;
        }
        tries++;
      } while(tries < maxTries);

      var isBtc = mtxIsBitcoinItem(item);

      if(item.type === 'icon'){
        var srcKey2 = item.def && item.def.src ? item.def.src : '';
        if(srcKey2){ mtxIconCooldowns[srcKey2] = now; }
        var ds;
        if(isBtc){
          /* Bitcoin icon: max 1pt above normal max */
          var btcMax = mtxIconDrawSizeMax + 1;
          ds = mtxIconDrawSizeMin + Math.random() * (btcMax - mtxIconDrawSizeMin);
        } else {
          var dMin = mtxIconDrawSizeMin;
          var dMax = mtxIconDrawSizeMax;
          /* USDT + Coinbase: +2pt min/max so these marks read slightly larger in the trail */
          if(srcKey2.indexOf('usdt2.webp') >= 0 || srcKey2.indexOf('usdt.webp') >= 0 || srcKey2.indexOf('coinbase.webp') >= 0){
            dMin += 2;
            dMax += 2;
          }
          ds = dMin + Math.random() * (dMax - dMin);
        }
        if(item.def && item.def.src && item.def.src.indexOf('franklin.webp') >= 0){
          ds = 44 + Math.random() * 20;
        } else if(item.def && item.def.src && item.def.src.indexOf('blk.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('layerzero.webp') >= 0){
          ds = mtxIconLZDrawSizeMin + Math.random() * (mtxIconLZDrawSizeMax - mtxIconLZDrawSizeMin);
        } else if(item.def && item.def.src && item.def.src.indexOf('uni.webp') >= 0){
          ds = mtxIconLZUniDrawSizeMin + Math.random() * (mtxIconLZUniDrawSizeMax - mtxIconLZUniDrawSizeMin);
        } else if(item.def && item.def.src && item.def.src.indexOf('crv.webp') >= 0){
          ds = Math.min(ds + 6, 38);
        } else if(item.def && item.def.src && item.def.src.indexOf('hyperliquid.webp') >= 0){
          ds = Math.min(ds + 4, 34);
        } else if(item.def && item.def.src && item.def.src.indexOf('link.webp') >= 0){
          ds = Math.max(ds, 24);
        } else if(item.def && item.def.src && item.def.src.indexOf('wintermute.webp') >= 0){
          /* Wireframe mark: keep above default min so strokes stay visible in the trail */
          ds = Math.max(ds, 30);
        } else if(item.def && item.def.src && item.def.src.indexOf('okx.webp') >= 0){
          /* Wide thin-stroke wordmark: needs enough px when drawn square */
          ds = Math.max(ds, 32);
        } else if(item.def && item.def.src && item.def.src.indexOf('fidelity.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('mstr.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('kinexys.webp') >= 0 || item.def.src.indexOf('morgan-stanley.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('m0.webp') >= 0){
          ds = Math.min(ds + 6, 32);
        } else if(item.def && item.def.src && (item.def.src.indexOf('csco.webp') >= 0 || item.def.src.indexOf('amd.webp') >= 0 || item.def.src.indexOf('ink.webp') >= 0 || item.def.src.indexOf('mkr.webp') >= 0)){
          /* Thin-line marks: Maker, Cisco, AMD, Ink need more px or they wash out */
          ds = Math.max(ds, 34);
        } else if(item.def && item.def.src && item.def.src.indexOf('gs.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('wfc.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('jpmorgan.webp') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && (item.def.src.indexOf('visa.webp') >= 0 || item.def.src.indexOf('jpm.webp') >= 0 || item.def.src.indexOf('citi.webp') >= 0 || item.def.src.indexOf('bac.webp') >= 0 || item.def.src.indexOf('ma.webp') >= 0)){
          ds = 16 + Math.random() * 24;
        }
        /* Wide wordmarks (4:1 aspect ratio): explicit width + height */
        var isWideWordmark = item.def && item.def.src && (item.def.src.indexOf('fednow.webp') >= 0 || item.def.src.indexOf('kinexys.webp') >= 0 || item.def.src.indexOf('mstr.webp') >= 0 || item.def.src.indexOf('fidelity.webp') >= 0 || item.def.src.indexOf('gs.webp') >= 0 || item.def.src.indexOf('wfc.webp') >= 0 || item.def.src.indexOf('blk.webp') >= 0 || item.def.src.indexOf('jpmorgan.webp') >= 0 || item.def.src.indexOf('okx.webp') >= 0 || item.def.src.indexOf('wisdomtree.webp') >= 0 || item.def.src.indexOf('ubs.webp') >= 0 || item.def.src.indexOf('dtcc.webp') >= 0 || item.def.src.indexOf('pwc.webp') >= 0 || item.def.src.indexOf('bybit.webp') >= 0);
        var drawHeight = null;
        if(isWideWordmark){
          /* All wide wordmarks need a minimum ds so they're readable */
          if(ds < 44) ds = 44 + Math.random() * 16;
          drawHeight = Math.round(ds * 0.25);
        }
        item = {
          type: 'icon',
          def: item.def,
          drawSize: ds,
          drawHeight: drawHeight
        };
      }
      /* Randomize text font size at spawn (+/- 30% variation). */
      if(item.type === 'text'){
        var baseFs;
        if(item.value === '$'){
          baseFs = mtxDollarFontSize;
        } else if(item.value === '₿'){
          /* Bitcoin text: variable size up to 2x */
          baseFs = mtxFontSize;
          var fsVariation = 0.7 + Math.random() * 1.3;
          item = { type: 'text', value: '₿', fontSize: Math.round(baseFs * fsVariation), btcLarge: fsVariation > 1.0 };
        } else if(mtxFiatNonUsd[item.value]){
          baseFs = mtxFiatNonUsdFontSize;
        } else if(item.value.length > 2){
          /* Macro / commodity tickers (DXY, VIX, XAU): slightly larger than single glyphs */
          baseFs = Math.round(mtxFontSize * 1.22);
        } else {
          baseFs = mtxFontSize;
        }
        if(item.value !== '₿'){
          var fsVariation2 = item.value.length > 2 ? (0.85 + Math.random() * 0.35) : (0.7 + Math.random() * 0.6);
          item = { type: 'text', value: item.value, fontSize: Math.round(baseFs * fsVariation2) };
        }
      }
      mtxColItem[i] = item;

      /* Reset drift */
      mtxColDriftX[i] = 0;
      mtxColDriftRate[i] = 0;

      if(item.type === 'icon'){
        var effectiveMax = isBtc ? (mtxIconDrawSizeMax * 2) : mtxIconDrawSizeMax;
        var sizeRange = effectiveMax - mtxIconDrawSizeMin;
        var normalizedSize = Math.min(1, (item.drawSize - mtxIconDrawSizeMin) / sizeRange);
        mtxColOpacity[i] = 0.55 + Math.random() * 0.2 + normalizedSize * 0.18;
        if(isBtc && item.drawSize > mtxIconDrawSizeMax){
          mtxColOpacity[i] = Math.min(0.95, mtxColOpacity[i] + 0.12);
        }
        if(srcKey2 && /mkr\.webp|wintermute\.webp|okx\.webp|ink\.webp|csco\.webp|amd\.webp|blk\.webp|securitize\.webp|broadridge\.webp|plaid\.webp|chainalysis\.webp/i.test(srcKey2)){
          mtxColOpacity[i] = Math.min(0.93, mtxColOpacity[i] + 0.08);
        }
        var baseSpeed = 0.15 + Math.random() * 0.04;
        mtxColStep[i] = baseSpeed * (0.75 + normalizedSize * 0.25);
        if(isBtc && item.drawSize > mtxIconDrawSizeMax){
          mtxColStep[i] *= 0.75;
        }
      } else {
        mtxColOpacity[i] = 0.17 + Math.random() * 0.22;
        if(isBtc){
          mtxColOpacity[i] = Math.min(0.8, mtxColOpacity[i] + 0.15);
        } else if(item.value && item.value.length > 2){
          mtxColOpacity[i] = Math.min(0.78, mtxColOpacity[i] + 0.12);
        }
        var stepT = 0.15 + Math.random() * 0.04;
        if(item.type === 'text' && item.value === '$' && mtxIsMobile){
          stepT *= 0.52;
        }
        mtxColStep[i] = stepT;
      }

      /* Bitcoin: 50% chance of diagonal movement */
      if(isBtc){
        if(Math.random() < 0.5){
          var direction = Math.random() < 0.5 ? -1 : 1;
          var driftMagnitude = 0.3 + Math.random() * 0.4;
          mtxColDriftRate[i] = direction * driftMagnitude;
        }
      }
    }

    function mtxDollarMagBtnRect(){
      if(!heroFlagshipMtx || !matrixCanvas) return null;
      var b = heroFlagshipMtx.getBoundingClientRect();
      var c = matrixCanvas.getBoundingClientRect();
      var cw = Math.max(1, matrixCanvas.clientWidth);
      var ch = Math.max(1, matrixCanvas.clientHeight);
      var rw = Math.max(1, c.width);
      var rh = Math.max(1, c.height);
      var sx = Math.abs(cw - rw) > 0.75 ? cw / rw : 1;
      var sy = Math.abs(ch - rh) > 0.75 ? ch / rh : 1;
      return {
        x: (b.left - c.left) * sx,
        y: (b.top - c.top) * sy,
        w: b.width * sx,
        h: b.height * sy,
        cx: (b.left - c.left + b.width * 0.5) * sx,
        top: (b.top - c.top) * sy
      };
    }

    function mtxDollarMagSpawn(w, h){
      var br = mtxDollarMagBtnRect();
      var maxY = br ? br.top : h * 0.7;
      var x, y;
      var r = Math.random();
      if(r < 0.4){
        /* Left edge */
        x = -14;
        y = Math.random() * maxY;
      } else if(r < 0.8){
        /* Right edge */
        x = w + 14;
        y = Math.random() * maxY;
      } else {
        /* Top edge */
        x = Math.random() * w;
        y = -14;
      }
      var br = mtxDollarMagBtnRect();
      var tx = br ? br.x + Math.random() * br.w : w * 0.5;
      return { x: x, y: y, vx: 0, vy: 0, alpha: 0.35 + Math.random() * 0.3, settled: false, sz: 17 + Math.random() * 5, targetX: tx };
    }

    function mtxDollarMagUpdate(w, h, dtMul){
      var nowMs = performance.now();
      /* If the pointer is outside the hero in viewport space, start the dollar fade immediately.
         Pointerout can lag (scroll, capture, or missed events); warp can stay "live" for minutes. */
      if(!mtxMobileMatrixAlways && heroHome && mtxLastPointerClientX != null && mtxLastPointerClientY != null
          && matrixContainer.classList.contains('active')){
        var hrbOut = heroHome.getBoundingClientRect();
        var edgePad = 8;
        var outsideHero = mtxLastPointerClientX < hrbOut.left - edgePad || mtxLastPointerClientX > hrbOut.right + edgePad
            || mtxLastPointerClientY < hrbOut.top - edgePad || mtxLastPointerClientY > hrbOut.bottom + edgePad;
        if(outsideHero){
          mtxWarpTx = mtxWarpTy = mtxWarpX = mtxWarpY = null;
          if(mtxDollarMag.length > 0){
            mtxDollarMagLeavingHero = true;
            if(mtxDollarMagLeaveStartedAt === 0){
              mtxDollarMagLeaveStartedAt = nowMs;
              mtxClearMatrixTrailGhosts();
            }
          } else {
            mtxStop();
          }
        }
      }

      var br = mtxDollarMagBtnRect();
      if(!br) return;
      var hasCursor = mtxWarpX != null && mtxWarpY != null;

      if(mtxDollarMagLeavingHero){
        if(mtxDollarMagLeaveStartedAt === 0){
          mtxDollarMagLeaveStartedAt = nowMs;
        }
        var leaveElapsed = nowMs - mtxDollarMagLeaveStartedAt;
        var fadeLin = Math.max(0, 1 - leaveElapsed / mtxDollarMagLeaveFadeMs);
        for(var fi = mtxDollarMag.length - 1; fi >= 0; fi--){
          var pf = mtxDollarMag[fi];
          pf.iconHold = false;
          if(pf.leaveAlpha0 == null){
            pf.leaveAlpha0 = pf.alpha;
          }
          pf.alpha = pf.leaveAlpha0 * fadeLin;
          pf.vx *= Math.pow(0.9, dtMul);
          pf.vy *= Math.pow(0.9, dtMul);
          var spf = Math.sqrt(pf.vx * pf.vx + pf.vy * pf.vy);
          if(spf > 14){ pf.vx = (pf.vx / spf) * 14; pf.vy = (pf.vy / spf) * 14; }
          pf.x += pf.vx * dtMul;
          pf.y += pf.vy * dtMul;
          if(fadeLin <= 0 || pf.alpha < 0.02){
            mtxDollarMag.splice(fi, 1);
          } else if(pf.x < -90 || pf.x > w + 90 || pf.y < -90 || pf.y > h + 90){
            mtxDollarMag.splice(fi, 1);
          }
        }
        if(mtxDollarMag.length === 0){
          queueMicrotask(function(){
            mtxStop();
          });
        }
        return;
      }

      var spawnRate = hasCursor ? 0.06 : 0.02;
      if(mtxDollarMag.length < mtxDollarMagMax && Math.random() < spawnRate * dtMul){
        mtxDollarMag.push(mtxDollarMagSpawn(w, h));
      }
      var mx = hasCursor ? mtxWarpX : br.cx;
      var my = hasCursor ? mtxWarpY : br.top;
      var dmx = mtxDollarMagPrevMx != null ? mx - mtxDollarMagPrevMx : 0;
      var dmy = mtxDollarMagPrevMy != null ? my - mtxDollarMagPrevMy : 0;
      mtxDollarMagPrevMx = mx;
      mtxDollarMagPrevMy = my;
      var mbdx = mx - br.cx, mbdy = my - br.top;
      var mbDist = Math.sqrt(mbdx * mbdx + mbdy * mbdy);
      var mSpd = Math.sqrt(dmx * dmx + dmy * dmy);
      var towardBtn = 0;
      if(mSpd > 0.5 && mbDist > 5){
        towardBtn = (-mbdx * dmx + -mbdy * dmy) / (mbDist * mSpd);
      }
      var bounceF = 0;
      if(hasCursor && mbDist < 180 && towardBtn > 0.1){
        bounceF = (1 - mbDist / 180) * Math.min(mSpd, 14) * 0.8;
      }
      var btnCeil = br.top - 14;
      var btnFloor = br.top + br.h;
      var useIconMagnet = hasCursor && mtxDollarMagIconPts.length > 0;
      var iconAttractR = mtxIsMobile ? 260 : 248;
      var iconSnapR = 20;

      function mtxDollarMagPickIconIx(px, py, refractoryKey, refractoryUntil){
        var cand = [];
        var ikp;
        for(ikp = 0; ikp < mtxDollarMagIconPts.length; ikp++){
          var ipp = mtxDollarMagIconPts[ikp];
          var ikeyp = mtxDollarMagIconKey(ipp.x, ipp.y);
          if(refractoryKey === ikeyp && nowMs < refractoryUntil){
            continue;
          }
          var pdx = ipp.x - px;
          var pdy = ipp.y - py;
          var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if(pdist < iconAttractR){
            cand.push({ ix: ikp, dist: pdist });
          }
        }
        if(!cand.length){
          return -1;
        }
        cand.sort(function(a, b){ return a.dist - b.dist; });
        var kPick = Math.min(6, cand.length);
        var wsum = 0;
        var weights = [];
        var wi;
        for(wi = 0; wi < kPick; wi++){
          var dd = Math.max(14, cand[wi].dist);
          weights[wi] = (1 / dd) * (0.32 + Math.random() * 1.25);
          wsum += weights[wi];
        }
        var roul = Math.random() * wsum;
        var accw = 0;
        for(wi = 0; wi < kPick; wi++){
          accw += weights[wi];
          if(roul <= accw){
            return cand[wi].ix;
          }
        }
        return cand[kPick - 1].ix;
      }

      for(var i = mtxDollarMag.length - 1; i >= 0; i--){
        var p = mtxDollarMag[i];
        var skipIntegrate = false;

        if(p.iconHold){
          var trackX = p.holdIx;
          var trackY = p.holdIy;
          var hi;
          var bestTrack = 99999;
          for(hi = 0; hi < mtxDollarMagIconPts.length; hi++){
            var ipt = mtxDollarMagIconPts[hi];
            var tdx = ipt.x - p.holdIx;
            var tdy = ipt.y - p.holdIy;
            var td = Math.sqrt(tdx * tdx + tdy * tdy);
            if(td < bestTrack){
              bestTrack = td;
              trackX = ipt.x;
              trackY = ipt.y;
            }
          }
          if(bestTrack < 44){
            p.holdIx = trackX;
            p.holdIy = trackY;
          }
          p.x = trackX;
          p.y = trackY;
          p.vx = 0;
          p.vy = 0;
          if(nowMs >= p.holdEnd){
            p.iconHold = false;
            var burstAng = Math.random() * Math.PI * 2;
            var bsp = 6.6 + Math.random() * 8.2;
            p.vx += Math.cos(burstAng) * bsp;
            p.vy += Math.sin(burstAng) * bsp;
            var kickAng = burstAng + (Math.random() - 0.5) * Math.PI * 1.35;
            var kickSp = 1.1 + Math.random() * 3.1;
            p.vx += Math.cos(kickAng) * kickSp;
            p.vy += Math.sin(kickAng) * kickSp;
            p.refractoryKey = mtxDollarMagIconKey(p.holdIx, p.holdIy);
            p.refractoryUntil = nowMs + mtxDollarMagIconRefractoryMs;
          } else {
            skipIntegrate = true;
          }
        }

        if(!skipIntegrate){
          if(!p.settled){
            if(useIconMagnet){
              var bestIx = mtxDollarMagPickIconIx(p.x, p.y, p.refractoryKey, p.refractoryUntil);
              if(bestIx >= 0){
                var bp = mtxDollarMagIconPts[bestIx];
                var bdx = bp.x - p.x;
                var bdy = bp.y - p.y;
                var bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
                var perpX = -bdy / bd;
                var perpY = bdx / bd;
                var jit = (Math.random() - 0.5) * 0.14 * dtMul;
                p.vx += (bdx / bd) * 0.24 * dtMul + perpX * jit;
                p.vy += (bdy / bd) * 0.24 * dtMul + perpY * jit;
                if(bd < iconSnapR){
                  p.iconHold = true;
                  p.holdEnd = nowMs + mtxDollarMagHoldMs;
                  p.holdIx = bp.x;
                  p.holdIy = bp.y;
                  p.x = bp.x;
                  p.y = bp.y;
                  p.vx = 0;
                  p.vy = 0;
                  skipIntegrate = true;
                }
              } else {
                var dxF = mx - p.x, dyF = my - p.y;
                var dF = Math.sqrt(dxF * dxF + dyF * dyF);
                if(dF > 1){
                  p.vx += (dxF / dF) * 0.2 * dtMul;
                  p.vy += (dyF / dF) * 0.2 * dtMul;
                }
                if(dF < 50 && dF > 1 && mbDist < 200){
                  var repFf = (1 - dF / 50) * 1.2;
                  p.vx -= (dxF / dF) * repFf;
                  p.vy -= (dyF / dF) * repFf;
                }
              }
            } else if(hasCursor){
              var dx = mx - p.x, dy = my - p.y;
              var d = Math.sqrt(dx * dx + dy * dy);
              if(d > 1){
                p.vx += (dx / d) * 0.2 * dtMul;
                p.vy += (dy / d) * 0.2 * dtMul;
              }
              if(d < 50 && d > 1 && mbDist < 200){
                var repF = (1 - d / 50) * 1.2;
                p.vx -= (dx / d) * repF;
                p.vy -= (dy / d) * repF;
              }
            } else {
              var tx = p.targetX != null ? p.targetX : br.cx;
              var ty = btnCeil;
              var dx2 = tx - p.x, dy2 = ty - p.y;
              var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              if(d2 > 1){
                p.vx += (dx2 / d2) * 0.15 * dtMul;
                p.vy += (dy2 / d2) * 0.15 * dtMul;
              }
              if(p.y < btnCeil){
                p.vy += 0.04 * dtMul;
              }
            }
            if(!skipIntegrate){
              if(!(useIconMagnet && hasCursor)){
                var inBtnX = p.x > br.x - 20 && p.x < br.x + br.w + 20;
                var nearTop = p.y > btnCeil - 18 && p.y < btnCeil + 6;
                var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if(inBtnX && nearTop && spd < 1.8 && (!hasCursor || mbDist < 200)){
                  p.settled = true;
                  p.vx *= 0.3;
                  p.vy *= 0.3;
                }
              }
              p.vx *= 0.965;
              p.vy *= 0.965;
            }
          } else {
            var overBtn = p.x > br.x - 6 && p.x < br.x + br.w + 6;
            if(overBtn){
              p.vy += 0.025 * dtMul;
              if(p.y > btnCeil){ p.y = btnCeil; p.vy = 0; }
            } else {
              p.settled = false;
              p.vy += 0.15 * dtMul;
            }
            if(hasCursor){
              var rx = p.x - mx, ry = p.y - my;
              var rd = Math.sqrt(rx * rx + ry * ry);
              if(rd < 1) rd = 1;
              if(rd < 90){
                var proxF = (1 - rd / 90) * 1.6;
                var latBiasP = (p.x < br.cx) ? -1 : 1;
                p.vx += (rx / rd) * proxF * 2.0 + latBiasP * proxF * 1.0;
                p.vy += (ry / rd) * proxF * 0.8 - proxF * 0.6;
                p.settled = false;
              }
              if(bounceF > 0 && rd < 200){
                var f = bounceF * (1 - rd / 200);
                var lateralBias = (p.x < br.cx) ? -1 : 1;
                p.vx += (rx / rd) * f * 4.2 + lateralBias * f * 2.4;
                p.vy += (ry / rd) * f * 1.2 - f * 1.0;
                p.settled = false;
              }
            }
            p.vx *= 0.94;
            p.vy *= 0.94;
          }
        }

        if(!skipIntegrate){
          var insideX = p.x > br.x - 6 && p.x < br.x + br.w + 6;
          var insideY = p.y > btnCeil && p.y < btnFloor;
          if(insideX && insideY){
            p.y = btnCeil;
            if(p.vy > 0) p.vy = -p.vy * 0.5;
            var pushDir = (p.x < br.cx) ? -1 : 1;
            p.vx += pushDir * 1.5;
            p.settled = false;
          }
          var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if(sp > 23){ p.vx = (p.vx / sp) * 23; p.vy = (p.vy / sp) * 23; }
          p.x += p.vx * dtMul;
          p.y += p.vy * dtMul;
        }

        if(p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60){
          mtxDollarMag.splice(i, 1);
        }
      }
    }

    function mtxDollarMagBurst(){
      var br = mtxDollarMagBtnRect();
      if(!br) return;
      var count = 18 + Math.floor(Math.random() * 8);
      for(var k = 0; k < count; k++){
        var angle = (Math.PI * 2 * k / count) + (Math.random() - 0.5) * 0.4;
        var speed = 4 + Math.random() * 5;
        var p = {
          x: br.cx + (Math.random() - 0.5) * br.w * 0.6,
          y: br.top + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          alpha: 0.5 + Math.random() * 0.35,
          settled: false,
          sz: 18 + Math.random() * 7
        };
        mtxDollarMag.push(p);
      }
    }

    function mtxDollarMagDraw(ctx, fontFamily, w){
      if(!mtxDollarMag.length) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 7;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      var canvasW = w > 0 ? w : 1;
      /* Gradient endpoints flip by theme. Dark: light mint (left) to accent blue (right), tuned to glow on the dark hero. Light: saturated teal-green to brand blue, dark enough to read on the white panel; the dark-mode mint washes out to gray on white. */
      var mtxDmLight = document.documentElement.getAttribute('data-theme') !== 'dark';
      var dmGL = mtxDmLight ? [5, 200, 122] : [204, 251, 229];
      var dmGR = mtxDmLight ? [29, 102, 255] : [91, 156, 245];
      var dmShL = mtxDmLight ? [5, 200, 122] : [167, 243, 208];
      var dmShR = mtxDmLight ? [29, 102, 255] : [91, 156, 245];
      for(var i = 0; i < mtxDollarMag.length; i++){
        var p = mtxDollarMag[i];
        ctx.font = '700 ' + Math.round(p.sz) + 'px ' + fontFamily;
        ctx.globalAlpha = p.alpha;
        /* Horizontal gradient across the hero width: green (left) to blue (right). */
        var dmMix = Math.max(0, Math.min(1, p.x / canvasW));
        var dmInv = 1 - dmMix;
        var dmFR = Math.round(dmGL[0] * dmInv + dmGR[0] * dmMix);
        var dmFG = Math.round(dmGL[1] * dmInv + dmGR[1] * dmMix);
        var dmFB = Math.round(dmGL[2] * dmInv + dmGR[2] * dmMix);
        ctx.fillStyle = 'rgba(' + dmFR + ',' + dmFG + ',' + dmFB + ',' + Math.min(0.99, p.alpha + 0.1) + ')';
        var dmSR = Math.round(dmShL[0] * dmInv + dmShR[0] * dmMix);
        var dmSG = Math.round(dmShL[1] * dmInv + dmShR[1] * dmMix);
        var dmSB = Math.round(dmShL[2] * dmInv + dmShR[2] * dmMix);
        ctx.shadowColor = 'rgba(' + dmSR + ',' + dmSG + ',' + dmSB + ', 0.45)';
        ctx.fillText('$', Math.round(p.x), Math.round(p.y));
      }
      ctx.restore();
    }

    function mtxGetNearbyMeshNodes(px, py, radius) {
      var out = [];
      var r2 = radius * radius;
      for (var i = 0; i < mtxMeshNodes.length; i++) {
        var nd = mtxMeshNodes[i];
        var dx = nd.x - px;
        var dy = nd.y - py;
        if (dx * dx + dy * dy <= r2) {
          out.push(nd);
        }
      }
      return out;
    }

    function mtxMeshLaneAlpha(ax, w, ay, h) {
      var t = Math.abs((ax / w) - 0.5) * 2;
      var lane = 0.42 + 0.58 * Math.min(1, Math.pow(t, 1.1));
      /* Dim behind the headline block */
      if (ay < h * 0.72 && t < 0.38) {
        lane *= 0.68;
      }
      /* Also dim behind the CTA lane (lower center) */
      if (ay > h * 0.62 && ay < h * 0.88 && t < 0.32) {
        lane *= 0.72;
      }
      return lane;
    }

    function mtxPickMeshZLayer() {
      var r = Math.random();
      if (r < 0.68) {
        return 'back';
      }
      if (r < 0.93) {
        return 'mid';
      }
      return 'front';
    }

    function mtxBootstrapMeshIfEmpty(w, h, now) {
      if (mtxMeshNodes.length > 0 || mtxMeshDidBootstrap) {
        return;
      }
      mtxMeshDidBootstrap = true;
      var zoneY = h * mtxMeshZoneTop;
      var zoneH = h * (1 - mtxMeshZoneTop);
      var cols = mtxIsMobile ? 7 : 10;
      var rows = 2;
      var r;
      var c;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          var gx = ((c + 0.5) / cols) * w + (Math.random() - 0.5) * 32;
          var gy = zoneY + ((r + 0.5) / rows) * zoneH + (Math.random() - 0.5) * 14;
          gx = Math.max(6, Math.min(w - 6, gx));
          gy = Math.max(zoneY + 2, Math.min(h - 4, gy));
          mtxMeshNodes.push({
            id: mtxNextMeshNodeId++,
            x: gx,
            y: gy,
            targetX: gx,
            targetY: gy,
            born: now,
            lifeMs: meshNodeLifeMin + Math.random() * (meshNodeLifeMax - meshNodeLifeMin),
            r: 1.1 + Math.random() * 1.1,
            alpha: 0.16 + Math.random() * 0.18,
            pulse: Math.random() * Math.PI * 2,
            isDollar: false,
            settleStart: now,
            settleMs: 400,
            reactUntil: 0,
            padRx: (mtxIsMobile ? 5.2 : 7.5) + Math.random() * 4,
            padRy: (mtxIsMobile ? 1.9 : 2.8) + Math.random() * 1.6,
            padRotation: (Math.random() - 0.5) * 0.5,
            padPhase: Math.random() * Math.PI * 2,
            padDrift: mtxReducedMotion ? 0.12 : (0.5 + Math.random() * 0.75),
            pairOffsetX: (Math.random() - 0.5) * 8,
            pairOffsetY: (Math.random() - 0.5) * 5,
            settling: false,
            reactBright: 0,
            partOx: 0,
            partOy: 0,
            zLayer: mtxPickMeshZLayer()
          });
        }
      }
    }

    function mtxStepControlLayer(now, w, h, dtMul) {
      var mi;
      for (mi = mtxMeshNodes.length - 1; mi >= 0; mi--) {
        var nd0 = mtxMeshNodes[mi];
        var lifeMs0 = nd0.lifeMs != null ? nd0.lifeMs : nd0.life;
        if (now - nd0.born > lifeMs0) {
          mtxMeshNodes.splice(mi, 1);
        }
      }
      for (mi = mtxMeshRipples.length - 1; mi >= 0; mi--) {
        if (now - mtxMeshRipples[mi].born > mtxMeshRippleMaxAge) {
          mtxMeshRipples.splice(mi, 1);
        }
      }
      for (mi = mtxMeshEdgeFlashes.length - 1; mi >= 0; mi--) {
        if (now > mtxMeshEdgeFlashes[mi].until) {
          mtxMeshEdgeFlashes.splice(mi, 1);
        }
      }
      for (mi = 0; mi < mtxMeshNodes.length; mi++) {
        var nd = mtxMeshNodes[mi];
        if (nd.partOx) {
          nd.partOx *= 0.89;
          if (Math.abs(nd.partOx) < 0.04) {
            nd.partOx = 0;
          }
        }
        if (nd.partOy) {
          nd.partOy *= 0.89;
          if (Math.abs(nd.partOy) < 0.04) {
            nd.partOy = 0;
          }
        }
        if (nd.settling) {
          nd.x += (nd.targetX - nd.x) * (mtxReducedMotion ? 0.15 : 0.092) * dtMul;
          nd.y += (nd.targetY - nd.y) * (mtxReducedMotion ? 0.15 : 0.092) * dtMul;
          if (Math.abs(nd.x - nd.targetX) < 0.45 && Math.abs(nd.y - nd.targetY) < 0.45) {
            nd.x = nd.targetX;
            nd.y = nd.targetY;
            nd.settling = false;
          }
        }
        if (!mtxReducedMotion) {
          nd.padPhase += mtxMeshPulseSpeed * 38 * dtMul;
        }
        if (nd.reactBright > 0) {
          nd.reactBright *= 0.925;
          if (nd.reactBright < 0.008) {
            nd.reactBright = 0;
          }
        }
      }
    }

    function mtxDrawMeshUnderlay(now, w, h, layerFilter, withRipples) {
      var meshMaskTop = h * mtxMeshZoneTop;
      var meshMaskFadeH = h * 0.08;

      function allowLayer(z) {
        if (!layerFilter || !layerFilter.length) {
          return true;
        }
        var zz = z || 'mid';
        return layerFilter.indexOf(zz) >= 0;
      }

      function meshZoneAlpha(nodeY) {
        if (nodeY < meshMaskTop) {
          return 0;
        }
        if (nodeY < meshMaskTop + meshMaskFadeH) {
          return (nodeY - meshMaskTop) / meshMaskFadeH;
        }
        return 1;
      }

      function meshNodeFade(nd) {
        var lifeMs = nd.lifeMs != null ? nd.lifeMs : nd.life;
        var age = now - nd.born;
        var fadeIn = Math.min(1, age / 800);
        var fadeOut = age > lifeMs * 0.7 ? 1 - (age - lifeMs * 0.7) / (lifeMs * 0.3) : 1;
        return fadeIn * fadeOut * meshZoneAlpha(nd.y);
      }

      function drawPadShape(nd, ox, oy, nFade, drawAlpha, pulse, isDollarFamily, boost) {
        var px = nd.x + (nd.partOx || 0) + ox;
        var py = nd.y + (nd.partOy || 0) + oy;
        var prx = (nd.padRx != null ? nd.padRx : 10) * (mtxIsMobile ? 0.88 : 1.25);
        var pry = (nd.padRy != null ? nd.padRy : 4.0) * (mtxIsMobile ? 0.88 : 1.25);
        var rot = nd.padRotation || 0;
        var drift = mtxReducedMotion ? 0 : Math.sin(now * 0.00055 + nd.padPhase) * nd.padDrift * 0.45;
        var lane = mtxMeshLaneAlpha(px, w, py, h) * mtxGetCenterSafeAttenuation(px, py, nd.zLayer === 'front' ? 'foreground' : 'back');
        var a0 = drawAlpha * nFade * lane * (boost || 1);
        if (a0 < 0.002) {
          return;
        }
        var col = isDollarFamily ? (document.documentElement.getAttribute('data-theme') !== 'dark' ? '5, 200, 122' : '204, 251, 229') : '96, 108, 62';
        mtxCtx.save();
        mtxCtx.translate(px + drift, py);
        mtxCtx.rotate(rot + Math.sin(nd.padPhase * 0.7) * 0.04);
        mtxCtx.globalAlpha = Math.min(1, a0 * 0.55);
        mtxCtx.beginPath();
        mtxCtx.ellipse(0, 0, prx * pulse, pry * pulse, 0, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(' + col + ', ' + (0.10 + (boost ? 0.07 : 0)) + ')';
        mtxCtx.fill();
        mtxCtx.globalAlpha = Math.min(1, a0 * 0.70);
        mtxCtx.beginPath();
        mtxCtx.ellipse(0, 0, prx * pulse * 0.45, pry * pulse * 0.45, 0, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(' + col + ', ' + (0.14 + (boost ? 0.09 : 0)) + ')';
        mtxCtx.fill();
        mtxCtx.strokeStyle = 'rgba(' + col + ', ' + (a0 * 0.20) + ')';
        mtxCtx.lineWidth = 0.45;
        mtxCtx.beginPath();
        mtxCtx.moveTo(-prx * pulse * 0.65, 0);
        mtxCtx.lineTo(prx * pulse * 0.65, 0);
        mtxCtx.stroke();
        mtxCtx.restore();
      }

      /* Tendrils (mesh connection lines between the logos): greener and more opaque in light mode, where the dark-mode olive reads as faint gray on white. Unchanged in dark. */
      var mtxMeshLight = document.documentElement.getAttribute('data-theme') !== 'dark';
      var meshLineRGB = mtxMeshLight ? '5, 178, 116' : '96, 108, 62';
      var meshLineBoost = mtxMeshLight ? 2.6 : 1;
      var drawnEdges = {};
      var ma;
      for (ma = 0; ma < mtxMeshNodes.length; ma++) {
        var neighbors = mtxMeshNearestK(ma, mtxMeshMaxLinksPerNode);
        var ndA = mtxMeshNodes[ma];
        if (!allowLayer(ndA.zLayer)) {
          continue;
        }
        var fadeA = meshNodeFade(ndA);
        var nb;
        for (nb = 0; nb < neighbors.length; nb++) {
          var bi = neighbors[nb].idx;
          var ndB = mtxMeshNodes[bi];
          if (!allowLayer(ndB.zLayer)) {
            continue;
          }
          var edgeKey = ma < bi ? (ma + ':' + bi) : (bi + ':' + ma);
          if (drawnEdges[edgeKey]) {
            continue;
          }
          drawnEdges[edgeKey] = true;
          var fadeB = meshNodeFade(ndB);
          var dist = neighbors[nb].dist;
          var lineAlpha = Math.min(ndA.alpha, ndB.alpha) * Math.min(fadeA, fadeB) * (1 - dist / mtxMeshConnectionDist) * 0.35;
          var reactBoost = Math.max(ndA.reactBright || 0, ndB.reactBright || 0) * 0.55;
          lineAlpha += reactBoost;
          if (now < (ndA.reactUntil || 0) || now < (ndB.reactUntil || 0)) {
            lineAlpha += 0.1;
          }
          var laneAlpha = mtxMeshLaneAlpha((ndA.x + ndB.x) * 0.5, w, (ndA.y + ndB.y) * 0.5, h);
          lineAlpha *= Math.max(0.6, laneAlpha);
          if (lineAlpha > 0.003) {
            mtxCtx.beginPath();
            mtxCtx.moveTo(ndA.x + (ndA.partOx || 0), ndA.y + (ndA.partOy || 0));
            mtxCtx.lineTo(ndB.x + (ndB.partOx || 0), ndB.y + (ndB.partOy || 0));
            mtxCtx.strokeStyle = 'rgba(' + meshLineRGB + ', ' + Math.min(0.72, lineAlpha * meshLineBoost) + ')';
            mtxCtx.lineWidth = 1.0;
            mtxCtx.stroke();
          }
        }
      }

      for (ma = 0; ma < mtxMeshNodes.length; ma++) {
        var nd = mtxMeshNodes[ma];
        if (!allowLayer(nd.zLayer)) {
          continue;
        }
        var nFade = meshNodeFade(nd);
        if (nFade < 0.003) {
          continue;
        }
        var pulse = Math.sin(now * mtxMeshPulseSpeed + nd.pulse) * (mtxReducedMotion ? 0.08 : 0.22) + 0.78;
        /* T3.4 Per-node alpha variation for density pockets */
        var nodeVariation = 0.15 + (Math.sin(nd.x * 7.3 + nd.y * 11.1) * 0.5 + 0.5) * 0.25;
        var drawAlpha = nd.alpha * nFade * nodeVariation;
        var rBoost = nd.reactBright || 0;
        if (now < (nd.reactUntil || 0)) {
          drawAlpha += 0.12;
        }
        drawAlpha = Math.min(1, drawAlpha + rBoost * 0.38);
        var isDollarFamily = nd.isDollar;
        drawPadShape(nd, 0, 0, nFade, drawAlpha, pulse, isDollarFamily, false);
        var pox = nd.pairOffsetX != null ? nd.pairOffsetX : 0;
        var poy = nd.pairOffsetY != null ? nd.pairOffsetY : 0;
        drawPadShape(nd, pox, poy, nFade, drawAlpha * 0.55, pulse * 0.92, isDollarFamily, false);
        mtxCtx.beginPath();
        var cx = nd.x + (nd.partOx || 0);
        var cy = nd.y + (nd.partOy || 0);
        mtxCtx.arc(cx, cy, nd.r * pulse, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(96, 108, 62, ' + (drawAlpha * 0.3 * mtxMeshLaneAlpha(cx, w, cy, h)) + ')';
        mtxCtx.fill();
        mtxCtx.beginPath();
        mtxCtx.arc(cx, cy, nd.r * pulse * 1.75, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(96, 108, 62, ' + (drawAlpha * 0.048 * mtxMeshLaneAlpha(cx, w, cy, h)) + ')';
        mtxCtx.fill();
      }

      var ri;
      if (withRipples && mtxMeshRippleMaxAge > 0) {
        for (ri = 0; ri < mtxMeshRipples.length; ri++) {
          var rp = mtxMeshRipples[ri];
          var rAge = now - rp.born;
          var rProgress = rAge / mtxMeshRippleMaxAge;
          var rRadius = rp.maxR * rProgress;
          var rAlpha = rp.alpha * (1 - rProgress) * (1 - rProgress) * meshZoneAlpha(rp.y);
          rAlpha *= mtxMeshLaneAlpha(rp.x, w, rp.y, h);
          if (rAlpha > 0.003) {
            mtxCtx.beginPath();
            mtxCtx.arc(rp.x, rp.y, rRadius, 0, Math.PI * 2);
            var rc = rp.isDollar ? '204, 251, 229' : '96, 108, 62';
            mtxCtx.strokeStyle = 'rgba(' + rc + ', ' + rAlpha + ')';
            mtxCtx.lineWidth = 0.65;
            mtxCtx.stroke();
          }
        }
      }

      if (withRipples) {
        for (ri = 0; ri < mtxMeshEdgeFlashes.length; ri++) {
          var fl = mtxMeshEdgeFlashes[ri];
          var fp = Math.min(1, (now - fl.born) / Math.max(1, fl.until - fl.born));
          var fa = (1 - fp) * fl.strength;
          if (fa > 0.002) {
            mtxCtx.beginPath();
            mtxCtx.arc(fl.x, fl.y, 16 + fp * 22, 0, Math.PI * 2);
            mtxCtx.strokeStyle = 'rgba(96, 108, 62, ' + fa + ')';
            mtxCtx.lineWidth = 0.5;
            mtxCtx.stroke();
          }
        }
      }
    }

    function mtxDrawSubmersionBand(w, h, now) {
      /* Broad bottom blue control-layer band (floor glow) + pocket haze above it (~82% of prior green wash). */
      var zTop = h * mtxSubmersionZoneTop;
      var pulse = mtxReducedMotion ? 0.84 : (0.82 + Math.sin(now * mtxMeshPulseSpeed * 1.55) * 0.065);

      var grd = mtxCtx.createLinearGradient(0, zTop, 0, h);
      grd.addColorStop(0, 'rgba(59, 130, 246, 0)');
      grd.addColorStop(0.42, 'rgba(37, 99, 235, ' + (0.028 * pulse) + ')');
      grd.addColorStop(0.78, 'rgba(30, 64, 175, ' + (0.046 * pulse) + ')');
      grd.addColorStop(1, 'rgba(15, 23, 42, ' + (0.018 * pulse) + ')');
      mtxCtx.save();
      mtxCtx.fillStyle = grd;
      mtxCtx.fillRect(0, zTop, w, h - zTop);
      mtxCtx.restore();

      var tie = mtxCtx.createLinearGradient(0, zTop, 0, h);
      tie.addColorStop(0, 'rgba(96, 108, 62, 0)');
      tie.addColorStop(0.65, 'rgba(96, 108, 62, ' + (0.0016 * pulse) + ')');
      tie.addColorStop(1, 'rgba(96, 108, 62, ' + (0.0035 * pulse) + ')');
      mtxCtx.save();
      mtxCtx.globalAlpha = 0.82;
      mtxCtx.fillStyle = tie;
      mtxCtx.fillRect(0, zTop, w, h - zTop);
      mtxCtx.restore();

      if (!mtxReducedMotion && mtxMeshNodes.length > 4) {
        mtxCtx.save();
        mtxCtx.globalAlpha = 0.82;
        var pi;
        for (pi = 0; pi < mtxMeshNodes.length; pi += 3) {
          var nd = mtxMeshNodes[pi];
          if (!nd || nd.y < zTop) {
            continue;
          }
          var age = now - nd.born;
          var life = nd.lifeMs || nd.life || 10000;
          var fade = Math.min(1, age / 1200) * (age > life * 0.7 ? 1 - (age - life * 0.7) / (life * 0.3) : 1);
          var pocketAlpha = fade * 0.015 * mtxMeshLaneAlpha(nd.x, w, nd.y, h) * mtxGetCenterSafeAttenuation(nd.x, nd.y, 'haze');
          if (pocketAlpha < 0.002) {
            continue;
          }
          var pocketR = 22 + Math.sin(now * 0.0008 + nd.pulse) * 6;
          var grad = mtxCtx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, pocketR);
          grad.addColorStop(0, 'rgba(96, 165, 250, ' + pocketAlpha + ')');
          grad.addColorStop(0.55, 'rgba(96, 108, 62, ' + (pocketAlpha * 0.45) + ')');
          grad.addColorStop(1, 'rgba(96, 108, 62, 0)');
          mtxCtx.fillStyle = grad;
          mtxCtx.fillRect(nd.x - pocketR, nd.y - pocketR, pocketR * 2, pocketR * 2);
        }
        mtxCtx.restore();
      }
    }

    function mtxReactMeshNear(px, py, now, isDollar, colIndex, w, h) {
      if (py < h * mtxSubmersionZoneTop) {
        return;
      }
      var last = mtxMeshReactCooldown[colIndex] || 0;
      if (now - last < 120) {
        return;
      }
      mtxMeshReactCooldown[colIndex] = now;
      var r = mtxMeshReactRadius;
      var r2 = r * r;
      var boost = isDollar ? 1.22 : 1;
      var i;
      for (i = 0; i < mtxMeshNodes.length; i++) {
        var nd = mtxMeshNodes[i];
        var dx = nd.x - px;
        var dy = nd.y - py;
        if (dx * dx + dy * dy < r2) {
          nd.reactUntil = now + 160 + Math.random() * 140;
          nd.reactBright = Math.min(1, (nd.reactBright || 0) + 0.32 * boost);
          if (!mtxReducedMotion) {
            nd.partOx = (nd.partOx || 0) + (nd.x < px ? -2.1 : 2.1) * boost * 0.35;
            nd.partOy = (nd.partOy || 0) - 0.9 * boost * 0.25;
          }
        }
      }
      if (!mtxReducedMotion && Math.random() < 0.38) {
        mtxMeshEdgeFlashes.push({ x: px, y: py, born: now, until: now + 220, strength: 0.075 * boost });
      }
    }

    function mtxDepositMeshNode(colIndex, item, headBaseX, w, h, now) {
      var occupancy = mtxMeshNodes.length / mtxMeshMaxNodes;
      var depositChance = mtxReducedMotion ? 0.10 : (0.10 + 0.28 * (1 - occupancy * occupancy));
      if (mtxMeshNodes.length >= mtxMeshMaxNodes || Math.random() >= depositChance) {
        return;
      }
      var zoneY = h * mtxMeshZoneTop;
      var zoneHeight = h * (1 - mtxMeshZoneTop);
      var colX = colIndex * mtxColWidth + mtxColWidth * 0.5;
      var spawnX = colX + (Math.random() - 0.5) * 18;
      var targetX = spawnX + (Math.random() - 0.5) * 14;
      var targetY = zoneY + Math.random() * zoneHeight;
      spawnX = Math.max(4, Math.min(w - 4, spawnX));
      targetX = Math.max(4, Math.min(w - 4, targetX));
      var isDollarDeposit = item.type === 'text' && item.value === '$';
      mtxMeshNodes.push({
        id: mtxNextMeshNodeId++,
        x: spawnX,
        y: zoneY - 5 + Math.random() * 4,
        targetX: targetX,
        targetY: targetY,
        born: now,
        lifeMs: meshNodeLifeMin + Math.random() * (meshNodeLifeMax - meshNodeLifeMin),
        r: 1.0 + Math.random() * 1.35,
        alpha: isDollarDeposit ? (0.24 + Math.random() * 0.22) : (0.13 + Math.random() * 0.24),
        pulse: Math.random() * Math.PI * 2,
        isDollar: !!isDollarDeposit,
        settleStart: now,
        settleMs: 350 + Math.random() * 150,
        reactUntil: 0,
        padRx: (mtxIsMobile ? 4.5 : 6.8) + Math.random() * 4.5,
        padRy: (mtxIsMobile ? 1.7 : 2.5) + Math.random() * 1.7,
        padRotation: (Math.random() - 0.5) * 0.55,
        padPhase: Math.random() * Math.PI * 2,
        padDrift: mtxReducedMotion ? 0.12 : (0.52 + Math.random() * 0.88),
        pairOffsetX: (Math.random() - 0.5) * 9,
        pairOffsetY: (Math.random() - 0.5) * 5,
        settling: true,
        reactBright: 0,
        partOx: 0,
        partOy: 0,
        zLayer: mtxPickMeshZLayer()
      });
      if (mtxMeshRippleMaxAge > 0) {
        mtxMeshRipples.push({
          x: targetX,
          y: targetY,
          born: now,
          maxR: (mtxIsMobile ? 9 : 13) + Math.random() * 9,
          alpha: isDollarDeposit ? 0.088 : 0.062,
          isDollar: isDollarDeposit
        });
      }
    }

    /* Control-layer motion-history wake: head-attached ring buffer (no vertical column smear). */
    function mtxDrawHeadWake(item, warpedHead, headBaseY, op, now, w, h, colIndex) {
      if (mtxReducedMotion) {
        return;
      }
      ensureGlowSprites();
      var isDollar = item.type === 'text' && item.value === '$';
      var submerge = mtxGetSubmerge(headBaseY, h);
      var col = isDollar ? '204, 251, 229' : '96, 108, 62';
      var arr = mtxHeadWake[colIndex] || [];
      var wakeAtt = mtxGetCenterSafeAttenuation(warpedHead.x, warpedHead.y, 'wake');

      mtxCtx.save();
      mtxCtx.globalCompositeOperation = 'lighter';
      var sprH = mtxGlowSpriteFor(isDollar, 1, Math.min(2, Math.round(submerge * 2.5)));
      var bh = sprH.width * (0.5 + submerge * 0.14);
      mtxCtx.globalAlpha = Math.min(0.55, op * 0.42 * wakeAtt);
      mtxCtx.drawImage(sprH, warpedHead.x - bh * 0.5, warpedHead.y - bh * 0.5, bh, bh);

      var si;
      for (si = 0; si < arr.length - 1; si++) {
        var s = arr[si];
        var age = now - s.t;
        var ageF = 1 - age / mtxWakeMaxAgeMs;
        if (ageF < 0.03) {
          continue;
        }
        var widen = 1 + submerge * 0.28;
        var shimmer = Math.sin(now * 0.014 + s.x * 0.09) * submerge * 2.2;
        var spr = mtxGlowSpriteFor(!!s.isDollar, 2, 1);
        var sw = spr.width * (0.2 + ageF * 0.22) * widen;
        mtxCtx.globalAlpha = Math.min(0.48, s.op * ageF * ageF * 0.2 * (1 - submerge * 0.32) * mtxGetCenterSafeAttenuation(s.x + shimmer, s.y, 'wake'));
        mtxCtx.drawImage(spr, s.x + shimmer - sw * 0.5, s.y - sw * 0.42, sw, sw);
      }
      mtxCtx.restore();
      mtxCtx.globalCompositeOperation = 'source-over';

      if (arr.length < 2) {
        return;
      }
      mtxCtx.save();
      var filAlpha = op * 0.1 * (1 - submerge * 0.45) * wakeAtt;
      mtxCtx.strokeStyle = 'rgba(' + col + ', ' + filAlpha + ')';
      mtxCtx.lineWidth = submerge > 0.35 ? 0.32 : 0.42;
      mtxCtx.lineCap = 'round';
      mtxCtx.beginPath();
      mtxCtx.moveTo(warpedHead.x, warpedHead.y);
      var fi;
      for (fi = 0; fi < arr.length - 1; fi++) {
        var p0 = arr[fi];
        var p1 = arr[fi + 1];
        var mpx = (p0.x + p1.x) * 0.5 + Math.sin(now * 0.011 + fi + colIndex) * (2 + submerge * 4);
        var mpy = (p0.y + p1.y) * 0.5;
        mtxCtx.quadraticCurveTo(mpx, mpy, p1.x, p1.y);
      }
      mtxCtx.stroke();
      mtxCtx.restore();
    }

    /* Per-glyph wade overlay: redraw nearby mesh pads OVER the lower
       portion of submerged glyphs so they look like they're wading through
       the mesh, not floating above it. This is the key occlusion effect. */
    function mtxDrawGlyphWadeOverlay(cx, cy, glyphW, glyphH, submerge, now, w, h, isDollar) {
      if (mtxReducedMotion || submerge < 0.08 || mtxMeshNodes.length < 3) {
        return;
      }

      var clipY = cy + glyphH * 0.58;
      var clipH = glyphH * 0.48;
      var clipTop = clipY;
      var clipBot = Math.min(cy + glyphH + 6, clipY + clipH);
      var clipLeft = cx - 4;
      var clipRight = cx + glyphW + 4;
      var footCx = cx + glyphW * 0.5;
      var footCy = cy + glyphH * 0.7;
      var searchR = mtxIsMobile ? 40 : 60;
      var col = isDollar ? '204, 251, 229' : '96, 108, 62';

      /* Find nearby mesh nodes */
      var nearby = [];
      for (var ni = 0; ni < mtxMeshNodes.length; ni++) {
        var nd = mtxMeshNodes[ni];
        var dx = nd.x - footCx;
        var dy = nd.y - footCy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < searchR) {
          var zl = nd.zLayer || 'mid';
          if (zl === 'back') {
            continue;
          }
          nearby.push({ nd: nd, dist: dist });
        }
      }
      if (nearby.length === 0) {
        return;
      }

      mtxCtx.save();
      /* Clip to the lower wade band (control-layer submersion read). */
      mtxCtx.beginPath();
      mtxCtx.rect(clipLeft, clipTop, clipRight - clipLeft, clipBot - clipTop);
      mtxCtx.clip();

      var occAlpha = submerge * 0.45;

      /* Draw pad ellipses and filaments OVER the glyph bottom */
      for (var pi = 0; pi < nearby.length; pi++) {
        var nd = nearby[pi].nd;
        var dist = nearby[pi].dist;
        var proximity = 1 - dist / searchR;
        var padA = occAlpha * proximity * 0.55;
        if (padA < 0.005) continue;

        /* Push pad slightly away from glyph center (parting effect) */
        var pushDir = nd.x < footCx ? -1 : 1;
        var pushAmt = submerge * proximity * 3.5;
        var padX = nd.x + pushDir * pushAmt + (nd.partOx || 0);
        var padY = nd.y + (nd.partOy || 0);
        var prx = (nd.padRx || 7) * (mtxIsMobile ? 0.8 : 1);
        var pry = (nd.padRy || 2.8) * (mtxIsMobile ? 0.8 : 1);
        var rot = nd.padRotation || 0;
        var pulse = Math.sin(now * mtxMeshPulseSpeed + nd.pulse) * 0.15 + 0.85;

        /* Foreground pad: slightly brighter than underlay to create depth */
        mtxCtx.save();
        mtxCtx.translate(padX, padY);
        mtxCtx.rotate(rot);
        mtxCtx.globalAlpha = padA;
        mtxCtx.beginPath();
        mtxCtx.ellipse(0, 0, prx * pulse, pry * pulse, 0, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(' + col + ', 0.12)';
        mtxCtx.fill();
        /* Inner core */
        mtxCtx.beginPath();
        mtxCtx.ellipse(0, 0, prx * pulse * 0.4, pry * pulse * 0.4, 0, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(' + col + ', 0.18)';
        mtxCtx.fill();
        mtxCtx.restore();
      }

      /* Draw 1-2 filaments across the clipped zone for extra depth */
      if (nearby.length >= 2) {
        var a = nearby[0].nd;
        var b = nearby[Math.min(1, nearby.length - 1)].nd;
        mtxCtx.beginPath();
        mtxCtx.moveTo(a.x + (a.partOx || 0), a.y + (a.partOy || 0));
        mtxCtx.lineTo(b.x + (b.partOx || 0), b.y + (b.partOy || 0));
        mtxCtx.strokeStyle = 'rgba(' + col + ', ' + (occAlpha * 0.12) + ')';
        mtxCtx.lineWidth = 0.5;
        mtxCtx.stroke();
      }

      mtxCtx.restore();
    }

    /* Footline bow-wake: a subtle crescent/meniscus where the glyph
       contacts the mesh surface. Signals weight and displacement. */
    function mtxDrawFootlineWake(cx, cy, glyphW, glyphH, submerge, now, isDollar) {
      if (mtxReducedMotion || submerge < 0.12) {
        return;
      }
      var footX = cx + glyphW * 0.5;
      var footY = cy + glyphH * 0.75;
      var col = isDollar ? '204, 251, 229' : '96, 108, 62';
      var wakeAlpha = submerge * 0.08;
      var wakeW = glyphW * (0.6 + submerge * 0.4);
      var wobble = Math.sin(now * 0.004 + cx * 0.1) * 1.2;

      mtxCtx.save();
      mtxCtx.globalAlpha = wakeAlpha;
      /* Soft bow crescent */
      mtxCtx.beginPath();
      mtxCtx.ellipse(footX + wobble, footY, wakeW, 1.5 + submerge * 1.5, 0, 0, Math.PI);
      mtxCtx.strokeStyle = 'rgba(' + col + ', 0.3)';
      mtxCtx.lineWidth = 0.6;
      mtxCtx.stroke();
      /* Tiny lateral ripple */
      mtxCtx.beginPath();
      mtxCtx.ellipse(footX + wobble, footY + 2, wakeW * 1.3, 1.0, 0, 0, Math.PI);
      mtxCtx.strokeStyle = 'rgba(' + col + ', 0.12)';
      mtxCtx.lineWidth = 0.35;
      mtxCtx.stroke();
      mtxCtx.restore();
    }

    function mtxHardFinishHeroLeaveMatrix(){
      mtxCancelPointerLeaveStop();
      mtxDollarMag.length = 0;
      mtxDollarMagLeavingHero = false;
      mtxDollarMagLeaveStartedAt = 0;
      mtxClearMatrixTrailGhosts();
      mtxReefIconBridge.points.length = 0;
      mtxWarpTx = mtxWarpTy = mtxWarpX = mtxWarpY = null;
      mtxDollarMagPrevMx = mtxDollarMagPrevMy = null;
      mtxTrailFillCache = '';
      if(!mtxMobileMatrixAlways){
        matrixContainer.classList.remove('active');
      }
      if(mtxRaf){
        cancelAnimationFrame(mtxRaf);
        mtxRaf = null;
      }
      mtxCtx.setTransform(1, 0, 0, 1, 0, 0);
      mtxCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      mtxPrevDrawTs = 0;
      if(typeof homeHeroReefHardClear === 'function'){
        homeHeroReefHardClear();
      } else if(typeof homeHeroReefStop === 'function'){
        homeHeroReefStop();
      }
      window.setTimeout(function(){
        if(matrixContainer.classList.contains('active')){
          return;
        }
        mtxCtx.setTransform(1, 0, 0, 1, 0, 0);
        mtxCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      }, 50);
    }

    function mtxDraw(ts){
      var mtxIsActive = matrixContainer.classList.contains('active');
      if(!mtxIsActive && mtxDollarMag.length === 0){
        mtxReefIconBridge.points.length = 0;
        mtxRaf = null;
        mtxCtx.setTransform(1, 0, 0, 1, 0, 0);
        mtxCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        return;
      }
      var t = typeof ts === 'number' ? ts : 0;
      var dtMul = 1;
      if(mtxPrevDrawTs > 0 && t > 0){
        dtMul = (t - mtxPrevDrawTs) / (1000 / 60);
        if(dtMul < 0.35){
          dtMul = 0.35;
        }
        if(dtMul > 2.4){
          dtMul = 2.4;
        }
      }
      if(t > 0){
        mtxPrevDrawTs = t;
      }
      /* Logical size from the canvas box avoids a layout read on matrixContainer every rAF. */
      var w = Math.max(1, matrixCanvas.clientWidth);
      var h = Math.max(1, matrixCanvas.clientHeight);
      var needCols = Math.max(1, Math.floor(w / mtxColWidth));
      if(needCols !== mtxDrops.length){
        mtxInitCanvas();
        w = Math.max(1, matrixCanvas.clientWidth);
        h = Math.max(1, matrixCanvas.clientHeight);
      }
      var meshNow = performance.now();
      /* While leaving hero: do not redraw falling matrix $ / mesh (they re-smear trails for seconds).
         Opaque base + magnet dollars only; hard-clear at 75ms. */
      if(mtxDollarMagLeavingHero && !mtxReducedMotion && !mtxMobileMatrixAlways){
        var leaveElapsedDraw = mtxDollarMagLeaveStartedAt > 0 ? (meshNow - mtxDollarMagLeaveStartedAt) : 0;
        if(leaveElapsedDraw >= mtxDollarMagLeaveFadeMs){
          mtxHardFinishHeroLeaveMatrix();
          return;
        }
        mtxCtx.fillStyle = mtxPanelMatteRgb();
        mtxCtx.fillRect(0, 0, w, h);
        mtxDollarMagUpdate(w, h, dtMul);
        var mtxFontFamilyLeave = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        mtxDollarMagDraw(mtxCtx, mtxFontFamilyLeave, w);
        if(t > 0){
          if(mtxLastDrawT > 0){
            var frameDtL = t - mtxLastDrawT;
            if(frameDtL > 0 && frameDtL < 200){
              mtxFpsSampleAcc += frameDtL;
              mtxFpsSampleN++;
              if(mtxFpsSampleN >= 42){
                var avgFL = mtxFpsSampleAcc / mtxFpsSampleN;
                if(avgFL > 34 && mtxWakePerfTier < 2){
                  mtxWakePerfTier++;
                } else if(avgFL < 22 && mtxWakePerfTier > 0){
                  mtxWakePerfTier--;
                }
                mtxFpsSampleAcc = 0;
                mtxFpsSampleN = 0;
              }
            }
          }
          mtxLastDrawT = t;
        }
        mtxRaf = requestAnimationFrame(mtxDraw);
        return;
      }
      mtxCtx.fillStyle = mtxTrailFill();
      mtxCtx.fillRect(0, 0, w, h);
      mtxStepControlLayer(meshNow, w, h, dtMul);
      mtxBootstrapMeshIfEmpty(w, h, meshNow);
      if (mtxReducedMotion) {
        mtxReefIconBridge.points.length = 0;
        mtxDrawMeshUnderlay(meshNow, w, h, null, true);
        mtxDrawSubmersionBand(w, h, meshNow);
        mtxRaf = null;
        return;
      }
      mtxDrawMeshUnderlay(meshNow, w, h, ['back'], false);
      mtxDrawSubmersionBand(w, h, meshNow);
      mtxDrawMeshUnderlay(meshNow, w, h, ['mid'], true);

      var mtxFontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      mtxCtx.textBaseline = 'top';

      /* Keep warp target in matrix-local space every frame: clientX/Y are viewport-fixed but
         getBoundingClientRect moves on scroll, so mtxWarpTx/Ty go stale if we only set them on pointermove. */
      if(mtxLastPointerClientX != null && mtxLastPointerClientY != null && heroHome && matrixContainer){
        var hbSync = heroHome.getBoundingClientRect();
        var edgePadSync = 16;
        if(mtxLastPointerClientX >= hbSync.left - edgePadSync && mtxLastPointerClientX <= hbSync.right + edgePadSync
            && mtxLastPointerClientY >= hbSync.top - edgePadSync && mtxLastPointerClientY <= hbSync.bottom + edgePadSync){
          var locSync = mtxPointerToMatrixLocal(mtxLastPointerClientX, mtxLastPointerClientY, w, h);
          mtxWarpTx = locSync.x;
          mtxWarpTy = locSync.y;
        }
      }

      if(mtxWarpTx != null && mtxWarpTy != null){
        if(mtxWarpX == null){
          mtxWarpX = mtxWarpTx;
          mtxWarpY = mtxWarpTy;
        } else {
          var warpSmooth = 0.14;
          mtxWarpX += (mtxWarpTx - mtxWarpX) * warpSmooth;
          mtxWarpY += (mtxWarpTy - mtxWarpY) * warpSmooth;
        }
      }

      mtxUpdateCtaPos();

      var n = mtxDrops.length;
      var i;
      if(mtxColDollarSmoothedPullX.length !== n){
        mtxColDollarSmoothedPullX = new Array(n).fill(0);
        mtxColDollarSmoothedPullY = new Array(n).fill(0);
      }
      /* Two-pass rendering: pass 1 draws text glyphs and icon mattes (panel-base rectangles that
         prevent trail accumulation through transparent icon pixels). Pass 2 draws icon sprites on
         top of every matte. This prevents column i+1's matte from overwriting column i's icon
         when icons are wider than mtxColWidth. */
      var iconQueue = [];
      var coralNodes = []; /* collect glyph positions for inter-glyph coral web */
      mtxPass1DollarOverdraw.length = 0;
      for(i = 0; i < n; i++){
        var dShotDecay = Math.pow(0.88, dtMul);
        mtxColDollarShotVx[i] *= dShotDecay;
        mtxColDollarShotVDrop[i] *= dShotDecay;
      }
      for(i = 0; i < n; i++){
        var x0 = i * mtxColWidth + 1 + mtxColDriftX[i];
        var y0 = mtxDrops[i] * mtxLineStep;
        if(mtxColItem[i] == null){
          mtxAssignColVisual(i);
        }
        var item = mtxColItem[i];
        var op = mtxColOpacity[i];
        var itemIsDollar = item && item.type === 'text' && item.value === '$';
        var warped;
        if(itemIsDollar){
          var fsD = item.fontSize || mtxFontSize;
          var dWx = mtxWarpX;
          var dWy = mtxWarpY;
          if(mtxParallaxTouchDevice() && mtxHeroDollarTouchParallaxOrigin
              && mtxLastPointerClientX != null && mtxLastPointerClientY != null){
            var acPar = mtxHeroDollarParallaxAdjustClient(mtxLastPointerClientX, mtxLastPointerClientY);
            var locDw = mtxPointerToMatrixLocal(acPar.x, acPar.y, w, h);
            dWx = locDw.x;
            dWy = locDw.y;
          }
          var rawD = mtxDollarRawCursorDelta(x0, y0, w, h, fsD, dWx, dWy);
          var lerpK = 1 - Math.pow(1 - mtxDollarParallaxLerpBase, Math.min(2.4, dtMul));
          mtxColDollarSmoothedPullX[i] += (rawD.dx - mtxColDollarSmoothedPullX[i]) * lerpK;
          mtxColDollarSmoothedPullY[i] += (rawD.dy - mtxColDollarSmoothedPullY[i]) * lerpK;
          var oxD = x0 + mtxColDollarSmoothedPullX[i];
          var oyD = y0 + mtxColDollarSmoothedPullY[i];
          warped = mtxDollarApplyCtaAttract(oxD, oyD, w, h, x0, y0);
        } else {
          mtxColDollarSmoothedPullX[i] = 0;
          mtxColDollarSmoothedPullY[i] = 0;
          warped = mtxWarpPoint(x0, y0, w, h);
        }
        var x = warped.x;
        var y = warped.y;

        /* T3.3 Submersion fade: glyphs fade as they enter the lower 35% */
        var subStart = h * 0.65;
        var subEnd = h * 0.95;
        if (y > subStart) {
          var subProgress = Math.min((y - subStart) / (subEnd - subStart), 1.0);
          op *= (1.0 - subProgress * 0.85);
        }

        op *= mtxGetCenterSafeAttenuation(x, y, 'foreground');
        if(item.type === 'text' && item.value === '$'){
          var fsRead = item.fontSize || mtxFontSize;
          var szRatio = Math.min(1.48, Math.max(0.88, fsRead / mtxFontSize));
          var opDamp = 0.88 - (szRatio - 0.88) * 0.62;
          op *= Math.max(0.42, Math.min(1, opDamp));
        }

        var isDollarHead = item.type === 'text' && item.value === '$';
        if (mtxGetSubmerge(y0, h) > 0.04) {
          var colCenterX = i * mtxColWidth + mtxColWidth * 0.5 + mtxColDriftX[i];
          mtxReactMeshNear(colCenterX, y0, meshNow, isDollarHead, i, w, h);
        }

        /* Control-layer head-attached wake: text columns only. Icons use warped head at sprite
           top-left, which reads like a pre-attached mark; skip wake + clear stale column history. */
        if(item.type === 'icon'){
          mtxHeadWake[i] = [];
        } else {
          mtxDrawHeadWake(item, warped, y0, op, meshNow, w, h, i);
          mtxPushHeadWakeSample(i, warped.x, warped.y, meshNow, op, isDollarHead, false);
        }

        if(item.type === 'text'){
          mtxCtx.textAlign = 'left';
          var fs = item.fontSize || mtxFontSize;
          mtxCtx.font = '700 ' + fs + 'px ' + mtxFontFamily;
          /* Horizontal gradient: text logos shift from mint green (left) to accent blue (right),
             matching the icon gradient. ₿ keeps its Bitcoin orange brand color. */
          var txtMix = w > 0 ? Math.max(0, Math.min(1, x / w)) : 0;
          var txtInv = 1 - txtMix;
          if(item.value === '₿'){
            mtxCtx.fillStyle = 'rgba(247, 147, 26, ' + Math.min(1, op + 0.22) + ')';
            mtxCtx.shadowColor = 'rgba(251, 191, 36, 0.35)';
          } else if(item.value === '$'){
            var dollarAlpha = Math.min(0.99, op + 0.24);
            if(fs >= mtxFontSize * 1.06){
              dollarAlpha = Math.min(dollarAlpha, 0.19);
            }
            var dFR = Math.round(204 * txtInv + 91 * txtMix);
            var dFG = Math.round(251 * txtInv + 156 * txtMix);
            var dFB = Math.round(229 * txtInv + 245 * txtMix);
            mtxCtx.fillStyle = 'rgba(' + dFR + ',' + dFG + ',' + dFB + ',' + dollarAlpha + ')';
            var dSR = Math.round(167 * txtInv + 91 * txtMix);
            var dSG = Math.round(243 * txtInv + 156 * txtMix);
            var dSB = Math.round(208 * txtInv + 245 * txtMix);
            mtxCtx.shadowColor = 'rgba(' + dSR + ',' + dSG + ',' + dSB + ',' + Math.min(0.32, dollarAlpha * 0.85) + ')';
          } else if(mtxFiatNonUsd[item.value]){
            var fFR = Math.round(134 * txtInv + 91 * txtMix);
            var fFG = Math.round(239 * txtInv + 156 * txtMix);
            var fFB = Math.round(172 * txtInv + 245 * txtMix);
            mtxCtx.fillStyle = 'rgba(' + fFR + ',' + fFG + ',' + fFB + ',' + Math.min(0.96, op + 0.14) + ')';
            var fSR = Math.round(96 * txtInv + 91 * txtMix);
            var fSG = Math.round(108 * txtInv + 156 * txtMix);
            var fSB = Math.round(62 * txtInv + 245 * txtMix);
            mtxCtx.shadowColor = 'rgba(' + fSR + ',' + fSG + ',' + fSB + ', 0.22)';
          } else {
            var tFR = Math.round(96 * txtInv + 91 * txtMix);
            var tFG = Math.round(230 * txtInv + 156 * txtMix);
            var tFB = Math.round(156 * txtInv + 245 * txtMix);
            mtxCtx.fillStyle = 'rgba(' + tFR + ',' + tFG + ',' + tFB + ',' + Math.min(0.94, op + 0.12) + ')';
            var tSR = Math.round(52 * txtInv + 91 * txtMix);
            var tSG = Math.round(211 * txtInv + 156 * txtMix);
            var tSB = Math.round(153 * txtInv + 245 * txtMix);
            mtxCtx.shadowColor = 'rgba(' + tSR + ',' + tSG + ',' + tSB + ', 0.28)';
          }
          mtxCtx.save();
          var isLargeBtc = (item.value === '₿' && item.btcLarge && item.fontSize > mtxFontSize * 1.3);
          mtxCtx.shadowBlur = isLargeBtc ? 10 : (item.value.length > 2 ? 7 : 6);
          mtxCtx.shadowOffsetX = 0;
          mtxCtx.shadowOffsetY = 0;
          var tx = Math.round(x);
          var ty = Math.round(y);
          var twEst;
          if(item.value === '$'){
            twEst = 17;
          } else if(mtxFiatNonUsd[item.value]){
            twEst = 17;
          } else if(item.value.length > 2){
            twEst = mtxColWidth;
          } else {
            twEst = 13;
          }
          /* Clamp X only: warp can pull columns left; clamping Y to 0 stacked every glyph on one row at the top. */
          tx = Math.max(0, Math.min(tx, Math.max(0, w - twEst)));
          var twMeasured = mtxCtx.measureText(item.value).width;
          if(item.value === '$'){
            var ghBurst = fs * 1.18;
            var gwBurst = Math.max(8, twMeasured);
            mtxTryDollarIconBurst(i, tx, ty, gwBurst, ghBurst, meshNow);
            mtxPass1DollarOverdraw.push({
              tx: tx,
              ty: ty,
              tw: gwBurst,
              th: ghBurst,
              fs: fs,
              op: op,
              colIdx: i
            });
          }
          mtxCtx.fillText(item.value, tx, ty);
          mtxCtx.restore();
          /* Collect position for coral web (iy/y0 may be 0 at top row; do not exclude) */
          if (y0 >= 0 && y0 < h) {
            var glyphW = Math.max(6, twMeasured);
            var glyphH = fs * 1.18;
            coralNodes.push({
              cx: tx + glyphW * 0.5,
              cy: ty + glyphH * 0.5,
              footY: ty + glyphH * 0.85,
              bw: glyphW,
              bh: glyphH,
              op: op,
              isDollar: isDollarHead,
              colIdx: i,
              isIcon: false
            });
            /* Foreground wade overlay + footline for text glyphs in submersion zone */
            var textSubmerge = mtxGetSubmerge(y0, h);
            if (textSubmerge > 0.08) {
              mtxDrawGlyphWadeOverlay(tx, ty, glyphW, glyphH, textSubmerge, meshNow, w, h, isDollarHead);
              mtxDrawFootlineWake(tx, ty, glyphW, glyphH, textSubmerge, meshNow, isDollarHead);
            }
          }
        } else if(item.type === 'icon' && item.def.loaded && item.def.img){
          var tint = buildTinted(item.def);
          if(tint){
            var tintAccent = buildTintedAccent(item.def);
            var iw = item.drawSize != null ? item.drawSize : mtxIconDrawSize;
            var ih = item.drawHeight != null ? item.drawHeight : iw;
            /* Integer draw size for all icons: avoids subpixel drawImage scaling artifacts. */
            iw = Math.max(1, Math.round(iw));
            ih = Math.max(1, Math.round(ih));
            var ix = Math.round(x);
            var iy = Math.round(y);
            ix = Math.max(0, Math.min(ix, Math.max(0, w - iw)));
            /* Matte removed: destination-out caused visible dark rectangles. */
            /* Queue the sprite draw for pass 2. */
            var isHollowHex = item.def.src && /\/(link|hnt)\.webp(\?|$)/.test(item.def.src);
            var isCrispLine = item.def.src && /\/(franklin|mkr|ink|csco|amd)\.webp(\?|$)/.test(item.def.src);
            var isBtcGlow = item.def.src && item.def.src.indexOf('btc.webp') >= 0 && item.drawSize > mtxIconDrawSizeMax;
            var iconDollarTint = !!(item.def.src && /\/(usdc|usdt2?|dai|m0)\.webp/i.test(item.def.src));
            iconQueue.push({
              tint: tint,
              tintAccent: tintAccent,
              ix: ix,
              iy: iy,
              iw: iw,
              ih: ih,
              op: op,
              hollow: isHollowHex,
              noSmooth: isCrispLine,
              btcGlow: isBtcGlow,
              submerge: mtxGetSubmerge(y0, h),
              item: item,
              iconDollarTint: iconDollarTint,
              colIdx: i
            });
          }
        }

        if(y0 > h){
          mtxDepositMeshNode(i, item, x0, w, h, meshNow);

          mtxDrops[i] = Math.random() * -5;
          mtxColDriftX[i] = 0;
          mtxColDriftRate[i] = 0;
          mtxColDollarShotVx[i] = 0;
          mtxColDollarShotVDrop[i] = 0;
          mtxColDollarIconBurstCooldownUntil[i] = 0;
          mtxColDollarSmoothedPullX[i] = 0;
          mtxColDollarSmoothedPullY[i] = 0;
          mtxAssignColVisual(i);
          if(mtxColItem[i].type !== 'icon'){
            var stepR = 0.15 + Math.random() * 0.04;
            if(mtxColItem[i].type === 'text' && mtxColItem[i].value === '$' && mtxIsMobile){
              stepR *= 0.52;
            }
            mtxColStep[i] = stepR;
          }
        }
        mtxDrops[i] += mtxColStep[i] * dtMul + mtxColDollarShotVDrop[i] * dtMul;
        mtxColDriftX[i] += mtxColDriftRate[i] * dtMul + mtxColDollarShotVx[i] * dtMul;
      }
      mtxRebuildIconHitRects(iconQueue);
      /* Pass 2: draw all icon sprites on top of every matte. */
      for(i = 0; i < iconQueue.length; i++){
        var q = iconQueue[i];
        mtxCtx.save();
        mtxCtx.globalAlpha = q.op;
        if(q.btcGlow){
          mtxCtx.shadowBlur = 5;
          mtxCtx.shadowColor = 'rgba(247, 147, 26, 0.35)';
        } else {
          mtxCtx.shadowBlur = 0;
          mtxCtx.shadowColor = 'transparent';
        }
        mtxCtx.shadowOffsetX = 0;
        mtxCtx.shadowOffsetY = 0;
        mtxCtx.imageSmoothingEnabled = !(q.hollow || q.noSmooth);
        if('imageSmoothingQuality' in mtxCtx && !q.hollow && !q.noSmooth){
          mtxCtx.imageSmoothingQuality = 'high';
        }
        /* Horizontal gradient: cross-fade icon tint from green (left) to accent blue (right)
           based on icon's x position within the hero. Ties the matrix to the "Audit the
           operator" gradient on the hero h1. Pure green at x=0, pure accent at x=w, linear
           between. Uses two pre-tinted bitmaps so per-frame cost is just 2 drawImages. */
        if(q.tintAccent){
          var __gMix = Math.max(0, Math.min(1, (q.ix + q.iw * 0.5) / w));
          mtxCtx.globalAlpha = q.op * (1 - __gMix);
          mtxCtx.drawImage(q.tint, q.ix, q.iy, q.iw, q.ih);
          mtxCtx.globalAlpha = q.op * __gMix;
          mtxCtx.drawImage(q.tintAccent, q.ix, q.iy, q.iw, q.ih);
        } else {
          mtxCtx.drawImage(q.tint, q.ix, q.iy, q.iw, q.ih);
        }
        mtxCtx.restore();
        /* Collect position for coral web */
        if (q.iy >= 0 && q.iy < h) {
          coralNodes.push({
            cx: q.ix + q.iw * 0.5,
            cy: q.iy + q.ih * 0.5,
            footY: q.iy + q.ih * 0.85,
            bw: q.iw,
            bh: q.ih,
            op: q.op,
            isDollar: q.iconDollarTint,
            colIdx: q.colIdx,
            isIcon: true,
            skipDollarMagnet: mtxIsFranklinMatrixIcon(q.item)
          });
        }
        /* Foreground wade overlay + footline: redraw nearby pads OVER icon bottom */
        if (q.submerge > 0.08) {
          mtxDrawGlyphWadeOverlay(q.ix, q.iy, q.iw, q.ih, q.submerge, meshNow, w, h, q.iconDollarTint);
          mtxDrawFootlineWake(q.ix, q.iy, q.iw, q.ih, q.submerge, meshNow, q.iconDollarTint);
        }
      }

      /* Pass 2b: $ was drawn in pass 1 then covered by icon sprites; paint again on top when overlapping. */
      if(mtxPass1DollarOverdraw.length > 0 && iconQueue.length > 0){
        var oi, du;
        for(oi = 0; oi < mtxPass1DollarOverdraw.length; oi++){
          du = mtxPass1DollarOverdraw[oi];
          if(!mtxDollarBBoxOverlapsIcon(du.tx, du.ty, du.tw, du.th, du.colIdx, iconQueue, 3, 4)){
            continue;
          }
          mtxCtx.save();
          mtxCtx.textAlign = 'left';
          mtxCtx.textBaseline = 'top';
          mtxCtx.font = '700 ' + du.fs + 'px ' + mtxFontFamily;
          /* Match Pass-1 horizontal gradient: green (left) to accent blue (right). */
          var ovMix = w > 0 ? Math.max(0, Math.min(1, (du.tx + du.tw * 0.5) / w)) : 0;
          var ovInv = 1 - ovMix;
          var ovFR = Math.round(204 * ovInv + 91 * ovMix);
          var ovFG = Math.round(251 * ovInv + 156 * ovMix);
          var ovFB = Math.round(229 * ovInv + 245 * ovMix);
          mtxCtx.fillStyle = 'rgba(' + ovFR + ',' + ovFG + ',' + ovFB + ',' + Math.min(0.99, du.op + 0.24) + ')';
          var ovSR = Math.round(167 * ovInv + 91 * ovMix);
          var ovSG = Math.round(243 * ovInv + 156 * ovMix);
          var ovSB = Math.round(208 * ovInv + 245 * ovMix);
          mtxCtx.shadowColor = 'rgba(' + ovSR + ',' + ovSG + ',' + ovSB + ', 0.38)';
          mtxCtx.shadowBlur = 7;
          mtxCtx.shadowOffsetX = 0;
          mtxCtx.shadowOffsetY = 0;
          mtxCtx.globalAlpha = 1;
          mtxCtx.fillText('$', du.tx, du.ty);
          mtxCtx.restore();
        }
      }

      mtxReefIconBridge.points.length = 0;
      if (heroHome && mtxIsActive && coralNodes.length > 0) {
        var hRi = heroHome.getBoundingClientRect();
        var mRi = matrixContainer.getBoundingClientRect();
        var iconToHeroX = mRi.left - hRi.left;
        var iconToHeroY = mRi.top - hRi.top;
        /* Was 56; coralNodes is populated left-to-right by column iteration, so capping at 56
           when ~100 icons are visible meant the rightmost ~44% of icons (right 30%+ of screen)
           never made it into the reef bridge. Reef nodes spawned by the cursor in the right
           portion of the hero had no icons to route through. Raising to 200 covers any
           realistic icon count without measurable performance impact. */
        var iconCap = 200;
        var iib;
        for (iib = 0; iib < coralNodes.length && mtxReefIconBridge.points.length < iconCap; iib++) {
          var cni = coralNodes[iib];
          if (!cni.isIcon || cni.skipDollarMagnet) continue;
          mtxReefIconBridge.points.push({
            x: cni.cx + iconToHeroX,
            y: cni.cy + iconToHeroY
          });
        }
      }

      mtxDrawMeshUnderlay(meshNow, w, h, ['front'], false);

      /* ══════════════════════════════════════════════
         Coral web: tendrils ONLY between nearby icons.
         No constant tendrils — only when icons get close enough.
         Tendrils connect from all sides (nearest edge to nearest edge).
         Connected icons are magnetized toward each other.
         ══════════════════════════════════════════════ */
      mtxReefCoralNeighborHero = {};
      if (!mtxReducedMotion && coralNodes.length > 0) {
        /* Max center distance for icon pairs: tendrils + mutual pull (was 90 / 130). */
        var coralThreshold = mtxIsMobile ? 118 : 182;
        var coralMaxLinks = mtxWakePerfTier >= 1 ? (mtxIsMobile ? 3 : 4) : (mtxIsMobile ? 3 : 5);
        var coralAttractBase = mtxIsMobile ? 0.018 : 0.028;
        var coralLinkCount = {};
        var drawnCoralEdges = {};
        var reefAdjHx = 0;
        var reefAdjHy = 0;
        if (heroHome && matrixContainer) {
          var hRaf = heroHome.getBoundingClientRect();
          var mRaf = matrixContainer.getBoundingClientRect();
          reefAdjHx = mRaf.left - hRaf.left;
          reefAdjHy = mRaf.top - hRaf.top;
        }
        function mtxReefPushCoralAdj(k, px, py) {
          if (!mtxReefCoralNeighborHero[k]) mtxReefCoralNeighborHero[k] = [];
          var lst = mtxReefCoralNeighborHero[k];
          var zi;
          for (zi = 0; zi < lst.length; zi++) {
            if (Math.abs(lst[zi].x - px) < 3 && Math.abs(lst[zi].y - py) < 3) return;
          }
          lst.push({ x: px, y: py });
        }

        if (coralNodes.length > 1) {
        for (var ci = 0; ci < coralNodes.length; ci++) {
          var cn = coralNodes[ci];
          var neighbors = [];
          for (var cj = 0; cj < coralNodes.length; cj++) {
            if (cj === ci) continue;
            var cdx = cn.cx - coralNodes[cj].cx;
            var cdy = cn.cy - coralNodes[cj].cy;
            var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < coralThreshold && cdist > 6) {
              neighbors.push({ idx: cj, dist: cdist });
            }
          }
          neighbors.sort(function(a, b) { return a.dist - b.dist; });
          if (neighbors.length > coralMaxLinks) neighbors.length = coralMaxLinks;

          for (var ck = 0; ck < neighbors.length; ck++) {
            var nbIdx = neighbors[ck].idx;
            var nb = coralNodes[nbIdx];
            var dist = neighbors[ck].dist;
            /* Dedupe edges */
            var edgeKey = ci < nbIdx ? ci + ':' + nbIdx : nbIdx + ':' + ci;
            if (drawnCoralEdges[edgeKey]) continue;
            drawnCoralEdges[edgeKey] = true;

            if (cn.isIcon && nb.isIcon) {
              var rax = cn.cx + reefAdjHx;
              var ray = cn.cy + reefAdjHy;
              var rbx = nb.cx + reefAdjHx;
              var rby = nb.cy + reefAdjHy;
              var rka = mtxReefIconHeroKey(rax, ray);
              var rkb = mtxReefIconHeroKey(rbx, rby);
              mtxReefPushCoralAdj(rka, rbx, rby);
              mtxReefPushCoralAdj(rkb, rax, ray);
            }

            var closeness = 1 - dist / coralThreshold;

            /* ── Magnetism + Repulsion: attract at range, repel on overlap ── */
            var cnCol = cn.colIdx;
            var nbCol = nb.colIdx;
            if (cnCol != null && nbCol != null && cnCol !== nbCol) {
              coralLinkCount[cnCol] = (coralLinkCount[cnCol] || 0) + 1;
              coralLinkCount[nbCol] = (coralLinkCount[nbCol] || 0) + 1;

              /* Compute bounding overlap: icons should stay at least this far apart */
              var halfWa = (cn.bw || 14) * 0.5;
              var halfWb = (nb.bw || 14) * 0.5;
              var halfHa = (cn.bh || 18) * 0.5;
              var halfHb = (nb.bh || 18) * 0.5;
              var minSepX = halfWa + halfWb + 4; /* 4px buffer */
              var minSepY = halfHa + halfHb + 2;

              var absDx = Math.abs(cn.cx - nb.cx);
              var absDy = Math.abs(cn.cy - nb.cy);

              /* Check if bounding boxes overlap or are very close */
              var overlapX = absDx < minSepX;
              var overlapY = absDy < minSepY;
              var tooClose = overlapX && overlapY;

              if (tooClose) {
                /* REPULSION: push apart firmly */
                var repelStrength = mtxIsMobile ? 0.6 : 0.9;
                var hRepel = repelStrength * (1 - absDx / minSepX) * dtMul;
                var vRepel = repelStrength * 0.4 * (1 - absDy / minSepY) * dtMul;
                /* Push horizontally */
                if (cn.cx < nb.cx) {
                  mtxColDriftX[cnCol] -= hRepel;
                  mtxColDriftX[nbCol] += hRepel;
                } else {
                  mtxColDriftX[cnCol] += hRepel;
                  mtxColDriftX[nbCol] -= hRepel;
                }
                /* Push vertically — slow down the leading icon, speed up trailing */
                if (cn.cy < nb.cy) {
                  mtxDrops[cnCol] -= vRepel;
                  mtxDrops[nbCol] += vRepel * 0.5;
                } else {
                  mtxDrops[cnCol] += vRepel * 0.5;
                  mtxDrops[nbCol] -= vRepel;
                }
              } else {
                /* ATTRACTION: gentle pull when separated but within tendril range */
                var hPull = closeness * (mtxIsMobile ? 0.22 : 0.38) * dtMul;
                if (cn.cx < nb.cx) {
                  mtxColDriftX[cnCol] += hPull;
                  mtxColDriftX[nbCol] -= hPull;
                } else {
                  mtxColDriftX[cnCol] -= hPull;
                  mtxColDriftX[nbCol] += hPull;
                }
                var vPull = closeness * 0.011 * dtMul;
                if (cn.cy < nb.cy) {
                  mtxDrops[cnCol] += vPull;
                  mtxDrops[nbCol] -= vPull * 0.5;
                } else {
                  mtxDrops[cnCol] -= vPull * 0.5;
                  mtxDrops[nbCol] += vPull;
                }
              }
            }

            /* ── Tendril rendering ── */
            /* Use a high base alpha — op values are low (0.17-0.5) so we compensate */
            var brAlpha = Math.max(0.035, closeness * 0.34);

            var isMint = cn.isDollar || nb.isDollar;
            var brCol = isMint ? '204, 251, 229' : '96, 108, 62';

            /* Anchor points: connect center to center (simple, reliable) */
            var startX = cn.cx;
            var startY = cn.cy;
            var endX = nb.cx;
            var endY = nb.cy;

            /* Curved branch with gentle perpendicular sway */
            var angle = Math.atan2(endY - startY, endX - startX);
            var perpX = -Math.sin(angle);
            var perpY = Math.cos(angle);
            var sway = Math.sin(meshNow * 0.002 + ci * 1.3 + ck * 2.1) * dist * 0.21;
            var cpX = (startX + endX) * 0.5 + perpX * sway;
            var cpY = (startY + endY) * 0.5 + perpY * sway;

            /* Single quadratic bezier curve — simple and visible */
            mtxCtx.beginPath();
            mtxCtx.moveTo(startX, startY);
            mtxCtx.quadraticCurveTo(cpX, cpY, endX, endY);
            mtxCtx.strokeStyle = 'rgba(' + brCol + ', ' + brAlpha + ')';
            mtxCtx.lineWidth = 0.65 + closeness * 0.58;
            mtxCtx.lineCap = 'round';
            mtxCtx.stroke();

            /* Junction node at midpoint */
            var jPulse = Math.sin(meshNow * 0.003 + ci + ck) * 0.22 + 0.78;
            var jR = (0.7 + jPulse * 0.5) * closeness;
            var jAlpha = brAlpha * 0.6;
            if (jR > 0.3) {
              mtxCtx.beginPath();
              mtxCtx.arc(cpX, cpY, jR, 0, Math.PI * 2);
              mtxCtx.fillStyle = 'rgba(' + brCol + ', ' + jAlpha + ')';
              mtxCtx.fill();
              mtxCtx.beginPath();
              mtxCtx.arc(cpX, cpY, jR * 2.0, 0, Math.PI * 2);
              mtxCtx.fillStyle = 'rgba(' + brCol + ', ' + (jAlpha * 0.15) + ')';
              mtxCtx.fill();
            }

            /* Fork off midpoint on close connections */
            if (!mtxIsMobile && closeness > 0.32) {
              var forkAngle = angle + Math.PI * 0.5 * (Math.sin(ci + ck) > 0 ? 1 : -1);
              var forkLen = dist * 0.28;
              var forkX = cpX + Math.cos(forkAngle) * forkLen;
              var forkY = cpY + Math.sin(forkAngle) * forkLen;
              mtxCtx.beginPath();
              mtxCtx.moveTo(cpX, cpY);
              mtxCtx.lineTo(forkX, forkY);
              mtxCtx.strokeStyle = 'rgba(' + brCol + ', ' + (brAlpha * 0.35) + ')';
              mtxCtx.lineWidth = 0.35;
              mtxCtx.stroke();
              mtxCtx.beginPath();
              mtxCtx.arc(forkX, forkY, jR * 0.4, 0, Math.PI * 2);
              mtxCtx.fillStyle = 'rgba(' + brCol + ', ' + (brAlpha * 0.2) + ')';
              mtxCtx.fill();
            }
          }
        }
        }

        /* Bridge nodes are already in matrix-container space (reefDraw converts hero to matrix). */
        if (mtxReefMagnetBridge.fade > 0.04 && mtxReefMagnetBridge.nodes.length > 0) {
          var reefMagMaxR = Math.min(360, Math.max(130, Math.min(w, h) * 0.48));
          if (mtxIsMobile) {
            reefMagMaxR = Math.min(280, Math.max(110, Math.min(w, h) * 0.42));
          }
          var reefStrH = mtxIsMobile ? 0.085 : 0.14;
          var reefStrV = 0.006;
          var rni;
          for (var rgi = 0; rgi < coralNodes.length; rgi++) {
            var crn = coralNodes[rgi];
            if (crn.colIdx == null || !crn.isIcon || crn.skipDollarMagnet) continue;
            var bestRd = reefMagMaxR;
            var bestRx = 0;
            var bestRy = 0;
            var bestRw = 0;
            for (rni = 0; rni < mtxReefMagnetBridge.nodes.length; rni++) {
              var rnode = mtxReefMagnetBridge.nodes[rni];
              var rdx = crn.cx - rnode.x;
              var rdy = crn.cy - rnode.y;
              var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
              if (rdist < bestRd && rdist > 0.5) {
                bestRd = rdist;
                bestRx = rnode.x;
                bestRy = rnode.y;
                bestRw = rnode.weight;
              }
            }
            if (bestRd >= reefMagMaxR) continue;
            var closenessReef = (1 - bestRd / reefMagMaxR) * mtxReefMagnetBridge.fade * Math.max(0.25, bestRw);
            if (closenessReef < 0.006) continue;
            coralLinkCount[crn.colIdx] = (coralLinkCount[crn.colIdx] || 0) + 1;
            var hPullReef = closenessReef * reefStrH * dtMul;
            if (crn.cx < bestRx) {
              mtxColDriftX[crn.colIdx] += hPullReef;
            } else {
              mtxColDriftX[crn.colIdx] -= hPullReef;
            }
            var vPullReef = closenessReef * reefStrV * dtMul;
            if (crn.cy < bestRy) {
              mtxDrops[crn.colIdx] += vPullReef;
            } else {
              mtxDrops[crn.colIdx] -= vPullReef * 0.5;
            }

            var trAlpha = Math.min(0.52, 0.1 + closenessReef * 0.32);
            if (trAlpha >= 0.02) {
              var tdx = bestRx - crn.cx;
              var tdy = bestRy - crn.cy;
              var tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
              var endFx = bestRx;
              var endFy = bestRy;
              var trCol = crn.isDollar ? '204, 251, 229' : '96, 108, 62';
              var tangle = Math.atan2(endFy - crn.cy, endFx - crn.cx);
              var tperpX = -Math.sin(tangle);
              var tperpY = Math.cos(tangle);
              var tsway = Math.sin(meshNow * 0.002 + rgi * 1.7) * tdist * 0.13;
              var tcpX = (crn.cx + endFx) * 0.5 + tperpX * tsway;
              var tcpY = (crn.cy + endFy) * 0.5 + tperpY * tsway;
              mtxCtx.save();
              mtxCtx.globalAlpha = 1;
              mtxCtx.shadowBlur = 0;
              mtxCtx.shadowColor = 'transparent';
              mtxCtx.beginPath();
              mtxCtx.moveTo(crn.cx, crn.cy);
              mtxCtx.quadraticCurveTo(tcpX, tcpY, endFx, endFy);
              mtxCtx.strokeStyle = 'rgba(' + trCol + ', ' + trAlpha + ')';
              mtxCtx.lineWidth = 0.62 + closenessReef * 0.36;
              mtxCtx.lineCap = 'round';
              mtxCtx.lineJoin = 'round';
              mtxCtx.stroke();
              mtxCtx.restore();
            }
          }
        }

        /* Dampen driftX back toward 0 for unconnected columns */
        for (var di = 0; di < mtxColDriftX.length; di++) {
          if (!coralLinkCount[di]) {
            mtxColDriftX[di] *= 0.96;
            /* Zero out tiny residual drift */
            if (Math.abs(mtxColDriftX[di]) < 0.1) mtxColDriftX[di] = 0;
          }
          /* Cap max drift so columns don't wander too far */
          var maxDrift = mtxIsMobile ? 8 : 14;
          if (mtxColDriftX[di] > maxDrift) mtxColDriftX[di] = maxDrift;
          if (mtxColDriftX[di] < -maxDrift) mtxColDriftX[di] = -maxDrift;
        }
      }

      /* Pass 3: dollar magnet targets must match sprites actually drawn this frame.
         coralNodes can omit or desync from pass-2 icons; iconQueue is authoritative. */
      mtxDollarMagIconPts.length = 0;
      var iqMag;
      for(iqMag = 0; iqMag < iconQueue.length; iqMag++){
        var qqMag = iconQueue[iqMag];
        if(!qqMag.item || mtxIsFranklinMatrixIcon(qqMag.item)){
          continue;
        }
        mtxDollarMagIconPts.push({
          x: qqMag.ix + qqMag.iw * 0.5,
          y: qqMag.iy + qqMag.ih * 0.5
        });
      }
      mtxDollarMagUpdate(w, h, dtMul);
      mtxDollarMagDraw(mtxCtx, mtxFontFamily, w);


      if (t > 0) {
        if (mtxLastDrawT > 0) {
          var frameDt = t - mtxLastDrawT;
          if (frameDt > 0 && frameDt < 200) {
            mtxFpsSampleAcc += frameDt;
            mtxFpsSampleN++;
            if (mtxFpsSampleN >= 42) {
              var avgF = mtxFpsSampleAcc / mtxFpsSampleN;
              if (avgF > 34 && mtxWakePerfTier < 2) {
                mtxWakePerfTier++;
              } else if (avgF < 22 && mtxWakePerfTier > 0) {
                mtxWakePerfTier--;
              }
              mtxFpsSampleAcc = 0;
              mtxFpsSampleN = 0;
            }
          }
        }
        mtxLastDrawT = t;
      }

      mtxRaf = requestAnimationFrame(mtxDraw);
    }

    /* Coarse pointers: must exceed typical tap length (iOS ~80 to 200ms) or iOS treats every touch as navigation. */
    var mtxFlagshipCoarseHoldMs = 220;
    /* iOS WebKit often defers timers until after the synthetic click; touchend + wall clock below is the real guard. */
    var mtxFlagshipLpDeferTimer = null;
    var mtxFlagshipLpFireTimer = null;
    var mtxFlagshipCoarseDown = false;
    var mtxFlagshipDownTs = 0;
    var mtxFlagshipTouchWallMs = 0;
    var mtxFlagshipLastDownEv = null;
    var mtxFlagshipConsumeClick = false;

    function mtxIsFlagshipActivator(act){
      return heroFlagshipMtx && act === heroFlagshipMtx;
    }

    function mtxClearFlagshipLpTimer(){
      if(mtxFlagshipLpDeferTimer){
        window.clearTimeout(mtxFlagshipLpDeferTimer);
        mtxFlagshipLpDeferTimer = null;
      }
      if(mtxFlagshipLpFireTimer){
        window.clearTimeout(mtxFlagshipLpFireTimer);
        mtxFlagshipLpFireTimer = null;
      }
    }

    function mtxCompleteFlagshipLongPress(ev){
      if(mtxHeroLongPressPin){
        return;
      }
      mtxHeroLongPressPin = true;
      mtxFlagshipConsumeClick = true;
      mtxFlagshipCoarseDown = false;
      mtxFlagshipTouchWallMs = 0;
      if(heroFlagshipMtx && heroFlagshipMtx.classList){
        heroFlagshipMtx.classList.remove('mtx-flagship-lp-arming');
        heroFlagshipMtx.classList.add('mtx-flagship-lp-done');
        window.setTimeout(function(){
          if(heroFlagshipMtx && heroFlagshipMtx.classList){
            heroFlagshipMtx.classList.remove('mtx-flagship-lp-done');
          }
        }, 380);
      }
      mtxStart();
      mtxUpdateWarpFromEvent(ev);
      try{
        if(navigator.vibrate){
          navigator.vibrate(12);
        }
      } catch(_){}
    }

    function mtxFlagshipLpStripClasses(){
      if(heroFlagshipMtx && heroFlagshipMtx.classList){
        heroFlagshipMtx.classList.remove('mtx-flagship-lp-arming', 'mtx-flagship-lp-done');
      }
    }

    var mtxPointerLeaveTimer = null;
    var mtxPointerLeaveDelayMs = 0;

    function mtxCancelPointerLeaveStop(){
      if(mtxPointerLeaveTimer !== null){
        clearTimeout(mtxPointerLeaveTimer);
        mtxPointerLeaveTimer = null;
      }
    }

    function mtxSchedulePointerLeaveStop(){
      mtxCancelPointerLeaveStop();
      mtxPointerLeaveTimer = window.setTimeout(function(){
        mtxPointerLeaveTimer = null;
        mtxStop();
      }, mtxPointerLeaveDelayMs);
    }

    function mtxStart(opts){
      opts = opts || {};
      mtxCancelPointerLeaveStop();
      mtxTrailFillCache = '';
      mtxTrailFillFrame = 0;
      if(opts.forceReset === true){
        mtxInitCanvas(true);
      } else {
        var alreadyRunning = matrixContainer.classList.contains('active') && mtxRaf;
        if(alreadyRunning){
          /* Do not re-init: mtxInitCanvas would clear the bitmap (width/height) and wipe mesh, causing a visible flash. */
        } else {
          /* Fresh start: reset everything. */
          mtxInitCanvas(true);
        }
      }
      matrixContainer.classList.add('active');
      mtxDollarMagLeavingHero = false;
      mtxDollarMagLeaveStartedAt = 0;
      var la;
      for(la = 0; la < mtxDollarMag.length; la++){
        delete mtxDollarMag[la].leaveAlpha0;
      }
      if(!mtxRaf){
        mtxRaf = requestAnimationFrame(mtxDraw);
      }
    }

    function mtxStop(force){
      mtxCancelPointerLeaveStop();
      if(mtxHeroLongPressPin && force !== true){
        return;
      }
      mtxHeroLongPressPin = false;
      mtxFlagshipConsumeClick = false;
      mtxFlagshipCoarseDown = false;
      mtxFlagshipDownTs = 0;
      mtxFlagshipTouchWallMs = 0;
      mtxFlagshipLastDownEv = null;
      mtxClearFlagshipLpTimer();
      mtxFlagshipLpStripClasses();
      if(mtxMobileMatrixAlways){
        /* Rain stays on: do not clear warp; pointerout still calls mtxStop and would break $ cursor magnet. */
        return;
      }
      mtxWarpTx = mtxWarpTy = mtxWarpX = mtxWarpY = null;
      /* Let magnetized $ symbols fade out gracefully instead of vanishing */
      mtxDollarMagPrevMx = mtxDollarMagPrevMy = null;
      mtxDollarMagLeavingHero = true;
      /* Keep active + draw loop alive while $ particles remain visible */
      if(mtxDollarMag.length > 0){
        if(mtxDollarMagLeaveStartedAt === 0){
          mtxDollarMagLeaveStartedAt = performance.now();
          mtxClearMatrixTrailGhosts();
        }
        return;
      }
      mtxDollarMagLeavingHero = false;
      mtxDollarMagLeaveStartedAt = 0;
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
      }, 120);
    }

    homeHeroMtxStop = mtxStop;

    document.addEventListener('visibilitychange', function mtxTabVisibility(){
      if(document.hidden){
        if(mtxRaf){
          cancelAnimationFrame(mtxRaf);
          mtxRaf = null;
        }
        return;
      }
      if(!matrixContainer.classList.contains('active')){
        return;
      }
      if(mtxReducedMotion){
        return;
      }
      if(!mtxRaf){
        mtxRaf = requestAnimationFrame(mtxDraw);
      }
    });

    if(heroHome){
      function mtxFlagshipStripArmingOnly(){
        if(heroFlagshipMtx && heroFlagshipMtx.classList){
          heroFlagshipMtx.classList.remove('mtx-flagship-lp-arming');
        }
      }
      heroHome.addEventListener('pointerup', function mtxFlagshipCoarseUpCapture(e){
        if(mtxMobileMatrixAlways){
          return;
        }
        if(e.pointerType === 'mouse'){
          return;
        }
        if(!mtxFlagshipCoarseDown){
          return;
        }
        var wallElapsed = mtxFlagshipTouchWallMs ? (Date.now() - mtxFlagshipTouchWallMs) : 0;
        var elapsed = wallElapsed > 0 ? wallElapsed : (mtxFlagshipDownTs ? (e.timeStamp - mtxFlagshipDownTs) : 0);
        if(elapsed >= mtxFlagshipCoarseHoldMs && !mtxHeroLongPressPin){
          mtxClearFlagshipLpTimer();
          mtxFlagshipCoarseDown = false;
          mtxFlagshipDownTs = 0;
          mtxFlagshipTouchWallMs = 0;
          mtxFlagshipLastDownEv = null;
          mtxCompleteFlagshipLongPress(e);
          mtxFlagshipStripArmingOnly();
          return;
        }
        mtxFlagshipCoarseDown = false;
        mtxFlagshipDownTs = 0;
        mtxFlagshipTouchWallMs = 0;
        mtxFlagshipLastDownEv = null;
        mtxClearFlagshipLpTimer();
        mtxFlagshipStripArmingOnly();
      }, true);
      heroHome.addEventListener('pointercancel', function mtxFlagshipCoarseCancelCapture(e){
        if(mtxMobileMatrixAlways){
          return;
        }
        if(e.pointerType === 'mouse'){
          return;
        }
        if(!mtxFlagshipCoarseDown){
          return;
        }
        mtxFlagshipCoarseDown = false;
        mtxFlagshipDownTs = 0;
        mtxFlagshipTouchWallMs = 0;
        mtxFlagshipLastDownEv = null;
        mtxClearFlagshipLpTimer();
        mtxFlagshipStripArmingOnly();
      }, true);
    }

    if(heroFlagshipMtx){
      heroFlagshipMtx.addEventListener('touchstart', function(){
        if(mtxMobileMatrixAlways){
          return;
        }
        mtxFlagshipTouchWallMs = Date.now();
      }, { capture: true, passive: true });
      heroFlagshipMtx.addEventListener('touchcancel', function(){
        if(mtxMobileMatrixAlways){
          return;
        }
        mtxFlagshipTouchWallMs = 0;
      }, { capture: true, passive: true });
      heroFlagshipMtx.addEventListener('touchend', function(e){
        if(mtxMobileMatrixAlways){
          return;
        }
        var wallDt = mtxFlagshipTouchWallMs ? (Date.now() - mtxFlagshipTouchWallMs) : 0;
        if(mtxHeroLongPressPin || mtxFlagshipConsumeClick){
          e.preventDefault();
          if(typeof e.stopImmediatePropagation === 'function'){
            e.stopImmediatePropagation();
          } else {
            e.stopPropagation();
          }
          mtxFlagshipTouchWallMs = 0;
          return;
        }
        if(wallDt >= mtxFlagshipCoarseHoldMs){
          e.preventDefault();
          if(typeof e.stopImmediatePropagation === 'function'){
            e.stopImmediatePropagation();
          } else {
            e.stopPropagation();
          }
          mtxCompleteFlagshipLongPress(e);
          mtxFlagshipTouchWallMs = 0;
          return;
        }
        mtxFlagshipTouchWallMs = 0;
      }, { capture: true, passive: false });
    }

    function mtxIsInsideAnyActivator(node){
      if(!node || typeof Node === 'undefined' || !(node instanceof Node)){
        return false;
      }
      var k;
      for(k = 0; k < matrixActivatorList.length; k++){
        var act = matrixActivatorList[k];
        if(act === node || act.contains(node)){
          return true;
        }
      }
      return false;
    }

    function mtxPointerLeaveGuarded(e, fromEl){
      var rel = e.relatedTarget;
      if(mtxIsInsideAnyActivator(rel)){
        return;
      }
      if(typeof fromEl.hasPointerCapture === 'function' && fromEl.hasPointerCapture(e.pointerId)){
        return;
      }
      var hh = fromEl.closest('#hero.hero--homepage');
      if(hh && typeof hh.hasPointerCapture === 'function' && hh.hasPointerCapture(e.pointerId)){
        return;
      }
      mtxSchedulePointerLeaveStop();
    }

    /* pointerenter does not bubble: the h1 inside .hero-eyebrow gets the hit, so the parent never saw enter. */
    function mtxPointerOverActivator(e, act){
      var rel = e.relatedTarget;
      if(rel && act.contains(rel)){
        return;
      }
      if(mtxMobileMatrixAlways){
        mtxUpdateWarpFromEvent(e);
        return;
      }
      mtxStart();
      mtxUpdateWarpFromEvent(e);
    }

    function mtxPointerOutActivator(e, act){
      var rel = e.relatedTarget;
      if(rel && act.contains(rel)){
        return;
      }
      mtxPointerLeaveGuarded(e, act);
    }

    matrixActivatorList.forEach(function(act){
      act.addEventListener('pointerover', function(e){
        mtxPointerOverActivator(e, act);
      });
      act.addEventListener('pointerout', function(e){
        mtxPointerOutActivator(e, act);
      });
      act.addEventListener('pointermove', mtxUpdateWarpFromEvent);
      if(mtxIsFlagshipActivator(act)){
        act.addEventListener('click', function(e){
          if(mtxMobileMatrixAlways){
            return;
          }
          if(!mtxFlagshipConsumeClick){
            return;
          }
          mtxFlagshipConsumeClick = false;
          e.preventDefault();
          if(typeof e.stopImmediatePropagation === 'function'){
            e.stopImmediatePropagation();
          } else {
            e.stopPropagation();
          }
        }, true);
        act.addEventListener('click', function(){
          mtxDollarMagBurst();
        });
        act.addEventListener('pointerup', function(e){
          if(mtxMobileMatrixAlways){
            return;
          }
          if(e.pointerType === 'mouse'){
            return;
          }
          mtxClearFlagshipLpTimer();
          if(act.classList){
            act.classList.remove('mtx-flagship-lp-arming');
          }
        });
        act.addEventListener('pointercancel', function(){
          if(mtxMobileMatrixAlways){
            return;
          }
          mtxClearFlagshipLpTimer();
          if(act.classList){
            act.classList.remove('mtx-flagship-lp-arming');
          }
        });
      }
      act.addEventListener('pointerdown', function(e){
        if(e.pointerType === 'mouse'){
          mtxUpdateWarpFromEvent(e);
          return;
        }
        if(mtxIsFlagshipActivator(act)){
          if(mtxMobileMatrixAlways){
            mtxUpdateWarpFromEvent(e);
            return;
          }
          mtxClearFlagshipLpTimer();
          if(mtxHeroLongPressPin){
            mtxStop(true);
            return;
          }
          mtxFlagshipCoarseDown = true;
          mtxFlagshipDownTs = e.timeStamp;
          mtxFlagshipTouchWallMs = Date.now();
          mtxFlagshipLastDownEv = e;
          if(act.classList){
            act.classList.add('mtx-flagship-lp-arming');
          }
          mtxFlagshipLpDeferTimer = window.setTimeout(function(){
            mtxFlagshipLpDeferTimer = null;
            mtxFlagshipLpFireTimer = window.setTimeout(function(){
              mtxFlagshipLpFireTimer = null;
              if(mtxHeroLongPressPin){
                return;
              }
              if(!mtxFlagshipCoarseDown){
                return;
              }
              mtxCompleteFlagshipLongPress(mtxFlagshipLastDownEv || e);
            }, mtxFlagshipCoarseHoldMs);
          }, 0);
          return;
        }
        if(mtxMobileMatrixAlways){
          mtxUpdateWarpFromEvent(e);
          return;
        }
        mtxStart();
        mtxUpdateWarpFromEvent(e);
      });
    });

    /* Capture phase: pointermove on #hero can be missed when the hit target is awkward or
       events do not bubble as expected; matrix $ cursor pull uses mtxDollarRawCursorDelta + smoothed pull.
       If the pointer is already over the hero during the short window before mtxStart() runs,
       record client coords only (no mtxStart side effects) so the first active frame can sync warp. */
    document.addEventListener('pointermove', function mtxHeroMatrixPointerSync(e){
      if(!matrixContainer || !heroHome){
        return;
      }
      var hb = heroHome.getBoundingClientRect();
      var pad = 20;
      var cx = e.clientX;
      var cy = e.clientY;
      if(typeof cx !== 'number' || typeof cy !== 'number'){
        return;
      }
      if(cx < hb.left - pad || cx > hb.right + pad || cy < hb.top - pad || cy > hb.bottom + pad){
        return;
      }
      if(!matrixContainer.classList.contains('active')){
        mtxLastPointerClientX = cx;
        mtxLastPointerClientY = cy;
        return;
      }
      mtxUpdateWarpFromEvent(e);
    }, true);

    /* Touch-only parallax dead zone for matrix $ (see mtxDollarRawCursorDelta / mtxHeroDollarParallaxAdjustClient). */
    if(heroHome){
      heroHome.addEventListener('pointerdown', function mtxHeroDollarParallaxTouchDown(e){
        if(e.pointerType === 'touch'){
          mtxHeroDollarTouchParallaxOrigin = { x: e.clientX, y: e.clientY };
        }
      }, true);
      heroHome.addEventListener('pointerup', function mtxHeroDollarParallaxTouchUp(e){
        if(e.pointerType === 'touch'){
          mtxHeroDollarTouchParallaxOrigin = null;
        }
      }, true);
      heroHome.addEventListener('pointercancel', function mtxHeroDollarParallaxTouchCancel(e){
        if(e.pointerType === 'touch'){
          mtxHeroDollarTouchParallaxOrigin = null;
        }
      }, true);
      heroHome.addEventListener('pointerleave', function mtxHeroDollarParallaxTouchLeave(e){
        if(e.pointerType === 'touch'){
          mtxHeroDollarTouchParallaxOrigin = null;
        }
      }, true);
    }

    document.addEventListener('pointerdown', function mtxHeroMatrixUnpin(e){
      if(mtxMobileMatrixAlways){
        return;
      }
      if(!mtxHeroLongPressPin){
        return;
      }
      var n = e.target;
      if(typeof Node !== 'undefined' && n instanceof Node && mtxIsInsideAnyActivator(n)){
        return;
      }
      mtxStop(true);
    }, true);

    document.addEventListener('keydown', function mtxHeroMatrixEsc(e){
      if(mtxMobileMatrixAlways){
        return;
      }
      if(e.key !== 'Escape' || !mtxHeroLongPressPin){
        return;
      }
      mtxStop(true);
    });

    var mtxResizeTimer;
    window.addEventListener('resize', function(){
      clearTimeout(mtxResizeTimer);
      mtxResizeTimer = window.setTimeout(function(){
        mtxIsMobile = window.matchMedia('(max-width: 768px)').matches;
        mtxReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        mtxMeshMaxNodes = mtxReducedMotion ? 12 : (mtxIsMobile ? 25 : 60);
        mtxMeshConnectionDist = mtxReducedMotion ? 28 : (mtxIsMobile ? 35 : 50);
        mtxMeshReactRadius = mtxReducedMotion ? 22 : (mtxIsMobile ? 36 : 52);
        mtxMeshRippleMaxAge = mtxReducedMotion ? 0 : 300;
        if(matrixContainer.classList.contains('active')){
          mtxInitCanvas();
        }
        mtxMeasureHeroSafeZones();
      }, 200);
    });

    mtxMeasureHeroSafeZones();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function(){
        mtxMeasureHeroSafeZones();
      });
    }

    if(mtxMobileMatrixAlways || mtxReducedMotion){
      mtxStart();
      document.addEventListener('visibilitychange', function mtxHeroMatrixVis(){
        if(document.hidden || !mtxMobileMatrixAlways){
          return;
        }
        mtxPrevDrawTs = 0;
        mtxTrailFillCache = '';
        mtxTrailFillFrame = 0;
        if(!matrixContainer.classList.contains('active')){
          mtxStart({ forceReset: true });
          return;
        }
        if(mtxRaf){
          cancelAnimationFrame(mtxRaf);
          mtxRaf = null;
        }
        mtxPrevDrawTs = 0;
        mtxStart({ forceReset: true });
      });
      window.addEventListener('pageshow', function mtxHeroMatrixPageShow(e){
        if(!mtxMobileMatrixAlways || !e.persisted){
          return;
        }
        mtxPrevDrawTs = 0;
        mtxStart({ forceReset: true });
      });
    }
  }

  // Sticky section rail: /frameworks/ (Frameworks), /overview/ (Overview), /speaker-and-advisory/
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
        'what-gateway',
        'what-control-layer',
        'dollar-objects',
        'why-institutions-care',
        'five-questions',
        'q1',
        'q2',
        'q3',
        'q4',
        'q5',
        'start-by-context',
        'eight-papers',
        'what-tools',
        'overview-contact'
      ];
      bottomSectionId = 'overview-contact';
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
        'about'
      ];
      bottomSectionId = 'about';
    } else {
      sections = [
        'three-dollar-objects',
        'framework-stack',
        'core-frameworks',
        'clii',
        'mvep',
        'credit-migration-model',
        'regime-dashboard',
        'framework-lives',
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
    var defSubIds = ['what-stablecoin', 'what-tokenization', 'what-deposit', 'what-gateway', 'what-control-layer'];
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
            // Center the active link by adjusting the rail's own scrollLeft only.
            // scrollIntoView walked every scrollable ancestor and fought the page's
            // global smooth scroll, which left the link stuck clipped at the rail
            // edge; scrollBy keeps the motion contained inside the horizontal rail.
            var delta = (linkRect.left + linkRect.width / 2) - (containerRect.left + containerRect.width / 2);
            container.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
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
        'why-care': 'why-institutions-care',
        'three-objects-title': 'dollar-objects',
        'entry-points-audience': 'start-by-context',
        'entry-points': 'start-by-context',
        'where-next': 'start-by-context',
        'where-to-go': 'start-by-context',
        'five-questions-title': 'five-questions',
        'current-agenda': 'framework-lives'
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

/* ─────────────────────────────────────────────────────────────────────────────
   Editorial: program-identifier auto-wrapper
   Scans body prose on DOMContentLoaded and wraps known program identifiers
   in <span class="term"> for the small-caps + tracked + accent-tint
   treatment defined in styles.css. Skips text inside links, code blocks,
   headings, and existing .term spans to avoid double-wrap and inappropriate
   wrap contexts. Single pass; safe to extend the TERMS list.

   Build-time variant at scripts/wrap-terms-build.mjs runs the same logic
   on _site/*.html during postprocess (eliminates the post-FCP DOM mutation
   that delays LCP). When the build has wrapped, <html> carries the
   data-terms-wrapped="true" attribute and this runtime variant no-ops.
   This keeps local-dev (jekyll serve without postprocess) working while
   prod gets build-wrapped HTML.
   ───────────────────────────────────────────────────────────────────────────── */
(function(){
  if(typeof document === 'undefined') return;
  if(document.documentElement && document.documentElement.hasAttribute('data-terms-wrapped')) return;

  // Program-specific identifiers worth marking. Case-sensitive: ALL-CAPS
  // entries match only when fully capitalized (so "GENIUS" matches the Act
  // but not the lowercase word). Longer docket forms are listed before
  // their short variants so the regex matches the full form preferentially
  // (e.g., "RIN 3064-AG19" before "AG19").
  var TERMS = [
    'RIN 3064-AG19', 'RIN 3064-AG20',
    'OCC-2025-0372', 'FINCEN-2026-0034', 'FINCEN-2026-0100',
    'TREAS-DO-2026-0232', '91 FR 18304',
    'AG19', 'AG20',
    'CLII', 'MVEP', 'PPSI', 'FQPSI', 'NPRM', 'GENIUS', 'CLARITY'
  ];

  // Optional cross-reference URL per term. Matched terms with an entry here
  // get wrapped in <a class="term term-link" href="..." target="_blank"> so
  // the inline mark is also a link to the canonical reference. Terms not
  // listed get the default <span class="term"> treatment.
  // External URLs (http/https) open in a new tab; internal paths navigate
  // in place (see conditional below in wrapMatchesIn).
  var TERM_LINKS = {
    'CLII':                '/papers/routing-the-dollar/',
    'MVEP':                '/papers/mvep/',
    'AG19':                '/letters/fdic-ag19-ppsi-activities/',
    'AG20':                '/letters/fdic-ag20-ppsi-application/',
    'RIN 3064-AG19':       '/letters/fdic-ag19-ppsi-activities/',
    'RIN 3064-AG20':       '/letters/fdic-ag20-ppsi-application/',
    'FINCEN-2026-0034':    '/letters/fincen-aml-cft/',
    'FINCEN-2026-0100':    '/letters/fincen-ofac-ppsi-sanctions/',
    'OCC-2025-0372':       '/letters/occ-mvep-v4/',
    'TREAS-DO-2026-0232':  '/letters/treasury-genius-state-similarity/',
    '91 FR 18304':         '/letters/banking-agencies-joint-aml/',
    'GENIUS':              'https://medium.com/@CryptoZach/navigating-the-new-era-of-digital-assets-how-recent-u-s-64a29c4b061f',
    'CLARITY':             'https://medium.com/@CryptoZach/navigating-the-new-era-of-digital-assets-how-recent-u-s-64a29c4b061f'
  };

  var pattern = new RegExp('\\b(' + TERMS.join('|') + ')\\b', 'g');

  // Skip wrapping inside these elements (headings, code, links, buttons).
  var SKIP_TAGS = {
    A:1, CODE:1, PRE:1, KBD:1, SAMP:1, VAR:1,
    SCRIPT:1, STYLE:1, BUTTON:1, NAV:1,
    H1:1, H2:1, H3:1, H4:1, H5:1, H6:1
  };
  var SKIP_CLASS = 'term';

  // Only scan prose containers
  var SCAN_SELECTORS = 'main p, main li, main td, main blockquote, main figcaption, main dt, main dd';

  function shouldSkip(node){
    var p = node.parentNode;
    while(p && p.nodeType === 1){
      if(SKIP_TAGS[p.tagName]) return true;
      if(p.classList && p.classList.contains(SKIP_CLASS)) return true;
      p = p.parentNode;
    }
    return false;
  }

  function wrapMatchesIn(root){
    // Collect text nodes first; modifying DOM during walk invalidates the walker.
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var pending = [];
    var n;
    while((n = walker.nextNode())){
      if(shouldSkip(n)) continue;
      pattern.lastIndex = 0;
      if(pattern.test(n.nodeValue)) pending.push(n);
    }

    for(var i = 0; i < pending.length; i++){
      var textNode = pending[i];
      var text = textNode.nodeValue;
      var frag = document.createDocumentFragment();
      var last = 0;
      var m;
      pattern.lastIndex = 0;
      while((m = pattern.exec(text)) !== null){
        if(m.index > last){
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        }
        var matched = m[0];
        var url = TERM_LINKS[matched];
        var node;
        if(url){
          node = document.createElement('a');
          node.className = 'term term-link';
          node.href = url;
          // External URLs open in a new tab; internal (same-site) navigate in place.
          if(/^https?:\/\//i.test(url)){
            node.target = '_blank';
            node.rel = 'noopener noreferrer';
          }
        } else {
          node = document.createElement('span');
          node.className = 'term';
        }
        node.textContent = matched;
        frag.appendChild(node);
        last = m.index + matched.length;
      }
      if(last < text.length){
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function init(){
    try {
      var roots = document.querySelectorAll(SCAN_SELECTORS);
      for(var i = 0; i < roots.length; i++) wrapMatchesIn(roots[i]);
    } catch(e){
      /* fail-soft: term marks are decorative; never break the page */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─────────────────────────────────────────────────────────────────────────────
   Sticky bottom action bar for paper and letter pages.
   When the user scrolls past the .paper-access-block, slide a thin bar
   in from the bottom containing the page's primary action plus the
   first secondary action. Hides when the access block is back in view.
   ───────────────────────────────────────────────────────────────────────────── */
(function(){
  if(typeof document === 'undefined') return;
  if(typeof IntersectionObserver !== 'function') return;

  function init(){
    try {
      var main = document.querySelector('main.paper-detail-page');
      if(!main) return;
      var accessBlock = main.querySelector('.paper-access-block');
      if(!accessBlock) return;
      var primary = accessBlock.querySelector('.access-primary');
      if(!primary) return;
      var actions = primary.querySelectorAll('a.action');
      if(actions.length === 0) return;

      var bar = document.createElement('div');
      bar.className = 'paper-action-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Paper actions');
      var inner = document.createElement('div');
      inner.className = 'paper-action-bar-inner';
      for(var i = 0; i < Math.min(2, actions.length); i++){
        var clone = actions[i].cloneNode(true);
        clone.classList.add('paper-action-bar-btn');
        clone.classList.remove('cta-primary');
        inner.appendChild(clone);
      }
      bar.appendChild(inner);
      document.body.appendChild(bar);

      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            bar.classList.remove('visible');
          } else {
            var r = entry.boundingClientRect;
            if(r.top < 0){
              bar.classList.add('visible');
            } else {
              bar.classList.remove('visible');
            }
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
      io.observe(accessBlock);
    } catch(e){
      /* fail-soft */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─────────────────────────────────────────────────────────────────────────────
   Image fade-in for paper-page figures. Adds .is-visible to <img>
   elements inside .paper-page bodies as they scroll into view. The
   .paper-cover image is excluded (always visible). Honors
   prefers-reduced-motion: in that case the CSS uses opacity 1 directly,
   and we still mark images visible so any JS-dependent code stays
   consistent.
   ───────────────────────────────────────────────────────────────────────────── */
(function(){
  if(typeof document === 'undefined') return;

  function init(){
    try {
      var paperPage = document.querySelector('.paper-page');
      if(!paperPage) return;
      var imgs = paperPage.querySelectorAll('.paper-abstract img, figure img, .paper-figure img');
      if(!imgs.length) return;

      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduced || typeof IntersectionObserver !== 'function'){
        for(var k = 0; k < imgs.length; k++) imgs[k].classList.add('is-visible');
        return;
      }

      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

      for(var i = 0; i < imgs.length; i++){
        // Skip cover (always visible)
        if(imgs[i].closest('.paper-cover')) continue;
        // If already loaded and in viewport on initial paint, mark immediately
        var rect = imgs[i].getBoundingClientRect();
        if(rect.top < window.innerHeight && rect.bottom > 0){
          imgs[i].classList.add('is-visible');
          continue;
        }
        io.observe(imgs[i]);
      }
    } catch(e){
      /* fail-soft */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─────────────────────────────────────────────────────────────────────────────
   Sticky in-page TOC for paper and letter pages.
   Auto-scans .paper-page for <h2> elements, generates slug IDs where
   missing, and builds an aside with active-section highlighting via
   IntersectionObserver. Hidden below 1100px. Only runs when the page
   is a .paper-detail-page and has at least 3 h2 sections.
   ───────────────────────────────────────────────────────────────────────────── */
(function(){
  if(typeof document === 'undefined') return;

  function slugify(s){
    return s.toLowerCase()
      .replace(/[‘’“”]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || null;
  }

  function init(){
    try {
      var main = document.querySelector('main.paper-detail-page');
      if(!main) return;
      var article = main.querySelector('.paper-page');
      if(!article) return;

      // Collect h2 elements that live inside the article body. Skip h2s
      // inside .paper-takeaways, the cover image, the related rail, etc.
      var allH2 = article.querySelectorAll('h2');
      var headings = [];
      var skipParents = ['.paper-takeaways', '.paper-cover', '.paper-related',
                         '.companion-cards', '.paper-key-numbers'];
      for(var i = 0; i < allH2.length; i++){
        var h = allH2[i];
        var skip = false;
        for(var j = 0; j < skipParents.length; j++){
          if(h.closest(skipParents[j])){ skip = true; break; }
        }
        if(!skip) headings.push(h);
      }
      if(headings.length < 3) return;

      // Ensure each heading has an ID
      var usedIds = {};
      headings.forEach(function(h){
        if(!h.id){
          var base = slugify(h.textContent || '') || 'section';
          var id = base;
          var n = 2;
          while(document.getElementById(id) || usedIds[id]){
            id = base + '-' + (n++);
          }
          h.id = id;
        }
        usedIds[h.id] = true;
      });

      // Build the aside
      var aside = document.createElement('aside');
      aside.className = 'paper-toc';
      aside.setAttribute('aria-label', 'In-page contents');
      var nav = document.createElement('nav');
      nav.className = 'paper-toc-nav';
      nav.setAttribute('aria-label', 'On this page');
      var title = document.createElement('p');
      title.className = 'paper-toc-title';
      title.textContent = 'On this page';
      nav.appendChild(title);
      var list = document.createElement('ol');
      list.className = 'paper-toc-list';

      headings.forEach(function(h, idx){
        var item = document.createElement('li');
        item.className = 'paper-toc-item';
        var link = document.createElement('a');
        link.className = 'paper-toc-link';
        link.href = '#' + h.id;
        link.textContent = h.textContent.trim();
        link.setAttribute('data-toc-target', h.id);
        item.appendChild(link);
        list.appendChild(item);
      });
      nav.appendChild(list);
      aside.appendChild(nav);
      // Insert inside the article so it can position-absolute against
      // the article's empty right gutter (prose is constrained to 68ch
      // so there is plenty of room on the right).
      article.classList.add('has-paper-toc');
      article.insertBefore(aside, article.firstChild);

      // Active-section tracking
      var links = aside.querySelectorAll('.paper-toc-link');
      var byId = {};
      links.forEach(function(l){ byId[l.getAttribute('data-toc-target')] = l; });

      var visible = {};
      function setActive(){
        var bestId = null;
        var bestTop = -Infinity;
        // Pick the heading whose section is currently closest to the top
        // of the viewport (but still above the activation line).
        var markerY = window.innerHeight * 0.25;
        for(var i = 0; i < headings.length; i++){
          var r = headings[i].getBoundingClientRect();
          if(r.top <= markerY && r.top >= bestTop){
            bestTop = r.top;
            bestId = headings[i].id;
          }
        }
        if(!bestId) bestId = headings[0].id;
        links.forEach(function(l){
          l.classList.toggle('active', l.getAttribute('data-toc-target') === bestId);
        });
      }

      // Use IntersectionObserver to trigger updates without per-scroll work
      var io = new IntersectionObserver(function(){ setActive(); }, {
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0, 0.25, 0.5, 1]
      });
      headings.forEach(function(h){ io.observe(h); });

      // Also reset on resize and initial paint
      window.addEventListener('scroll', setActive, { passive: true });
      window.addEventListener('resize', setActive, { passive: true });
      setActive();

      // Smooth scroll on click
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var headerOffset = function(){
        var hdr = document.querySelector('header');
        return (hdr ? hdr.offsetHeight : 0) + 16;
      };
      links.forEach(function(l){
        l.addEventListener('click', function(e){
          var id = l.getAttribute('data-toc-target');
          var t = document.getElementById(id);
          if(!t) return;
          e.preventDefault();
          var top = t.getBoundingClientRect().top + window.scrollY - headerOffset();
          window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' });
          if(history.replaceState) history.replaceState(null, '', '#' + id);
        });
      });
    } catch(e){
      /* fail-soft: never break the page if TOC build fails */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Newsletter forms: subscribe via Buttondown's embed-subscribe endpoint,
   which publishes Access-Control-Allow-Origin: * so a cross-origin fetch
   from tokenization.systems works without a redirect. preventDefault on
   submit, POST email with fetch, swap the form for the inline green
   "Thanks for subscribing" confirmation. (Previously this site posted to
   Substack with target=_blank; Substack rejected cross-origin iframe POSTs
   with 403 + X-Frame-Options: SAMEORIGIN, so the no-new-tab UX was only
   reachable by switching providers.) */
(function(){
  if(typeof document === 'undefined') return;
  if(typeof window.fetch !== 'function') return;

  function init(){
    try {
      var forms = document.querySelectorAll('form[action*="buttondown.email"]');
      if(!forms.length) return;

      forms.forEach(function(form){
        form.addEventListener('submit', function(e){
          e.preventDefault();

          var emailInput = form.querySelector('input[type="email"]');
          var email = emailInput && emailInput.value ? emailInput.value.trim() : '';
          if(!email) return;

          var params = new URLSearchParams();
          params.append('email', email);
          /* Optional Buttondown tags carried by the form (the letters hub tags
             new-letter subscribers so they can be mailed on each filing). */
          Array.prototype.forEach.call(form.querySelectorAll('input[type="hidden"][name="tag"]'), function(t){
            if(t.value) params.append('tag', t.value);
          });

          try {
            fetch(form.action, {
              method: 'POST',
              mode: 'cors',
              body: params
            }).catch(function(){ /* network failure; thanks shown optimistically */ });
          } catch(_){ /* fail-soft */ }

          var thanks = document.createElement('div');
          thanks.className = 'newsletter-thanks';
          thanks.setAttribute('role', 'status');
          thanks.setAttribute('aria-live', 'polite');
          thanks.textContent = 'Thanks for subscribing';
          form.classList.add('newsletter-submitted');
          if(form.parentNode){
            form.parentNode.insertBefore(thanks, form);
          }
        });
      });
    } catch(e){
      /* fail-soft: never break the page on newsletter init */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ---------------------------------------------------------------------------
   Letters hub and recommendation index (2026-10-12): filter chips (AND across
   axes), order toggle, cards or list view with a per-viewer preference. The
   toolbar ships hidden and is revealed here, so without JS the page simply lists
   everything newest first. Markup is generated by scripts/render_letters.py.
   --------------------------------------------------------------------------- */
(function(){
  function init(){
    var narrow = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
    /* Long ledgers (the outcomes table) ship open and fold on phones. */
    if(narrow){
      Array.prototype.forEach.call(document.querySelectorAll('details.letters-fold'), function(d){ d.open = false; });
    }
    var bars = document.querySelectorAll('.letters-toolbar');
    if(!bars.length) return;
    var store = {
      get: function(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } },
      set: function(k, v){ try { window.localStorage.setItem(k, v); } catch(e){ /* private mode */ } }
    };
    Array.prototype.forEach.call(bars, function(bar){
      if(bar.id === 'genius-tracker-toolbar') return;
      var scope = bar.parentNode;
      var index = scope.querySelector('.letters-index');
      var table = scope.querySelector('table.rec-index');
      var items = index
        ? Array.prototype.slice.call(index.querySelectorAll('.letters-cards > .letter-card, .letters-list tbody > tr'))
        : (table ? Array.prototype.slice.call(table.querySelectorAll('tbody > tr')) : []);
      if(!items.length) return;
      var total = index ? index.querySelectorAll('.letters-cards > .letter-card').length : items.length;
      var countEl = bar.querySelector('.filter-count');
      var countWrap = bar.querySelector('.filter-count-wrap');
      var state = {};
      var query = '';

      /* Inject a live keyword search input at the top of .letters-toolbar if not already present */
      var searchInput = bar.querySelector('.letters-search-input');
      if(!searchInput){
        var searchRow = document.createElement('div');
        searchRow.className = 'letters-search-row';
        var searchId = index ? 'letters-hub-search' : 'recs-index-search';
        var placeholder = index
          ? 'Filter letters by keyword, docket, RIN, agency, or framework...'
          : 'Filter all ' + total + ' recommendations by keyword, letter, agency, or topic (e.g., MVEP, pass-through, custody)...';
        searchRow.innerHTML =
          '<label class="visually-hidden" for="' + searchId + '">Search</label>' +
          '<input id="' + searchId + '" class="letters-search-input" type="search" placeholder="' + placeholder + '" autocomplete="off" />';
        bar.insertBefore(searchRow, bar.firstChild);
        searchInput = searchRow.querySelector('input');
      }

      function matches(el){
        for(var axis in state){
          var v = state[axis];
          if(!v || v === 'all') continue;
          var have = el.getAttribute('data-' + (axis === 'framework' ? 'frameworks' : axis)) || '';
          if(axis === 'framework' || axis === 'topic'){
            if(have.split(/\s+/).indexOf(v) < 0) return false;
          } else if(have !== v){
            return false;
          }
        }
        if(query){
          var hay = (el.textContent || '').toLowerCase();
          if(hay.indexOf(query) < 0) return false;
        }
        return true;
      }
      function apply(){
        var shown = 0;
        items.forEach(function(el){
          var on = matches(el);
          el.classList.toggle('is-filtered-out', !on);
          if(on && (!index || el.tagName === 'A')) shown++;
        });
        var active = Boolean(query) || Object.keys(state).some(function(a){ return state[a] && state[a] !== 'all'; });
        if(countEl && countWrap){
          countEl.textContent = active ? (shown + ' of ' + total + (index ? ' letters' : ' recommendations')) : '';
          countWrap.hidden = !active;
        }
        Array.prototype.forEach.call(bar.querySelectorAll('.filter-btn[data-axis]'), function(b){
          var on = (state[b.getAttribute('data-axis')] || 'all') === b.getAttribute('data-value');
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      if(searchInput){
        searchInput.addEventListener('input', function(){
          query = (searchInput.value || '').trim().toLowerCase();
          apply();
        });
      }
      function key(el){
        return [el.getAttribute('data-filed') || '', +(el.getAttribute('data-number') || 0), +(el.getAttribute('data-n') || 0)];
      }
      function sortBy(mode){
        var dir = (mode === 'newest') ? -1 : 1;
        var groups = index
          ? [index.querySelector('.letters-cards'), index.querySelector('.letters-list tbody')]
          : [table.querySelector('tbody')];
        groups.forEach(function(g){
          if(!g) return;
          var kids = Array.prototype.slice.call(g.children);
          kids.sort(function(a, b){
            var ka = key(a), kb = key(b);
            if(ka[0] !== kb[0]) return ka[0] < kb[0] ? -dir : dir;
            if(ka[1] !== kb[1]) return (ka[1] - kb[1]) * dir;
            return ka[2] - kb[2];
          });
          kids.forEach(function(k){ g.appendChild(k); });
        });
        Array.prototype.forEach.call(bar.querySelectorAll('.filter-btn[data-sort]'), function(b){
          var on = b.getAttribute('data-sort') === mode;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      function setView(v){
        if(!index) return;
        index.classList.toggle('view-list', v === 'list');
        index.classList.toggle('view-cards', v !== 'list');
        Array.prototype.forEach.call(bar.querySelectorAll('.filter-btn[data-view]'), function(b){
          var on = b.getAttribute('data-view') === v;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      bar.addEventListener('click', function(e){
        var t = e.target;
        while(t && t !== bar && t.tagName !== 'BUTTON') t = t.parentNode;
        if(!t || t === bar) return;
        if(t.hasAttribute('data-axis')){
          state[t.getAttribute('data-axis')] = t.getAttribute('data-value');
          apply();
        } else if(t.hasAttribute('data-sort')){
          sortBy(t.getAttribute('data-sort'));
          if(index) store.set('letters-sort', t.getAttribute('data-sort'));
        } else if(t.hasAttribute('data-view')){
          setView(t.getAttribute('data-view'));
          store.set('letters-view', t.getAttribute('data-view'));
        } else if(t.classList.contains('filter-reset')){
          state = {};
          query = '';
          if(searchInput) searchInput.value = '';
          apply();
        }
      });
      bar.hidden = false;
      if(index){
        var storedView = store.get('letters-view');
        setView(storedView || (narrow ? 'list' : 'cards'));
        var storedSort = store.get('letters-sort');
        if(storedSort === 'filing') sortBy('filing');
      }
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ---------------------------------------------------------------------------
   MVEP scorecard (frameworks page, 2026-10-12). Carries the paper's Exhibit 1
   verdicts and Exhibit 3 ratings (the JSON block the renderer stamps into the
   page) and rates a visitor's own product with the paper's rule, ported from
   the replication script: tier = the weakest cell of a dimension on the ladder
   Pass 5, Partial 4, Ambiguous 3, Not disclosed 2, Fail 1; strength = the mean
   rung; headline = the weakest dimension. Read mode shows a paper column; own
   mode records verdicts, optionally beside a comparator. The share link carries
   the verdicts (#sc=, eleven letters), the product name (&p=) and the comparator
   (&c=); #mvep=USDC opens a paper column. Nothing is sent anywhere.
   --------------------------------------------------------------------------- */
(function(){
  var CODE = { P: 'PASS', T: 'PARTIAL', A: 'AMBIGUOUS', F: 'FAIL', N: 'NOT_DISCLOSED', U: 'UNASSESSED' };
  var CODE_OF = { PASS: 'P', PARTIAL: 'T', AMBIGUOUS: 'A', FAIL: 'F', NOT_DISCLOSED: 'N', UNASSESSED: 'U' };
  var CLS = { PASS: 'pass', PARTIAL: 'partial', AMBIGUOUS: 'ambiguous', FAIL: 'fail', NOT_DISCLOSED: 'nd', UNASSESSED: 'unassessed', NA: 'na' };
  var TIER_CLS = { 'Equivalent': 'pass', 'Substantially Eq.': 'partial', 'Indeterminate': 'ambiguous', 'Opaque': 'nd', 'Non-Equivalent': 'fail', 'Unrated': 'unassessed' };
  var SHORT = { '1': 'Rights Parity', '2': 'System of Record', '3': 'Records & Reconciliation', '4': 'Custody', '5': 'Insolvency Posture',
                '6': 'Settlement Finality', '7': 'Reorg & Exception Handling', '8': 'Governance & Change Control', '9': 'Disclosures',
                '10': 'Collateral Operability', 'CSA': 'Cash Settlement Asset' };
  var KEYS = ['1','2','3','4','5','6','7','8','9','10','CSA'];

  function round1(x){
    /* Python's round(x, 1): half to even, so the port matches the upstream CSV. */
    var y = x * 10, f = Math.floor(y), d = y - f;
    if(Math.abs(d - 0.5) < 1e-9) return ((f % 2 === 0) ? f : f + 1) / 10;
    return Math.round(y) / 10;
  }
  function rate(D, verdicts){
    var tierOf = D.tiers, ladder = D.ladder, inv = {};
    Object.keys(tierOf).forEach(function(k){ inv[tierOf[k]] = +k; });
    var dims = {}, strengths = {}, binds = {};
    Object.keys(D.dimensions).forEach(function(dname){
      var floor = null, bind = [null, null], levels = [];
      D.dimensions[dname].forEach(function(c){
        var v = verdicts[c] || 'UNASSESSED';
        if(!(v in ladder)) return;
        var lvl = ladder[v];
        levels.push(lvl);
        if(floor === null || lvl < floor){ floor = lvl; bind = [c, v]; }
      });
      if(floor === null){ dims[dname] = 'Unrated'; strengths[dname] = 0; binds[dname] = [null, null]; return; }
      dims[dname] = tierOf[String(floor)];
      strengths[dname] = round1(levels.reduce(function(a, b){ return a + b; }, 0) / levels.length);
      binds[dname] = bind;
    });
    var rated = Object.keys(dims).filter(function(d){ return dims[d] !== 'Unrated'; });
    var headline = 'Unrated', binding = 'no coverage';
    if(rated.length){
      var worst = rated[0];
      rated.forEach(function(d){
        var a = [inv[dims[d]], strengths[d]], b = [inv[dims[worst]], strengths[worst]];
        if(a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) worst = d;
      });
      headline = dims[worst];
      binding = worst + ' / ' + SHORT[binds[worst][0]] + ' ' + binds[worst][1];
    }
    var all = [];
    KEYS.forEach(function(k){ var v = verdicts[k] || 'UNASSESSED'; if(v in ladder) all.push(ladder[v]); });
    var overall = all.length ? round1(all.reduce(function(a, b){ return a + b; }, 0) / all.length) : 0;
    var disc = verdicts[D.disclosure_category] || 'UNASSESSED';
    var applicable = 0, assessed = 0;
    KEYS.forEach(function(k){ var v = verdicts[k] || 'UNASSESSED'; if(v === 'NA') return; applicable++; if(v in ladder) assessed++; });
    var frac = applicable ? assessed / applicable : 0;
    return { legal: dims.Legal, legal_strength: strengths.Legal, operational: dims.Operational, operational_strength: strengths.Operational,
             economic: dims.Economic, economic_strength: strengths.Economic, headline: headline, binding: binding,
             disclosure: D.disclosure_labels[disc] || disc, overall_strength: overall,
             coverage: assessed + '/' + applicable, confidence: frac >= 0.8 ? 'HIGH' : (frac >= 0.5 ? 'MEDIUM' : 'LOW') };
  }

  function init(){
    var form = document.getElementById('mvep-sc');
    var dataEl = document.getElementById('mvep-sc-data');
    if(!form || !dataEl) return;
    var D;
    try { D = JSON.parse(dataEl.textContent); } catch(e){ return; }
    var byKey = {};
    D.products.forEach(function(p){ byKey[p.key] = p; });
    var rows = Array.prototype.slice.call(form.querySelectorAll('.mvep-sc__row'));
    var rowOf = {};
    rows.forEach(function(r){ rowOf[r.getAttribute('data-cat')] = r; });
    var sel = form.querySelector('#mvep-sc-product');
    var cmp = form.querySelector('#mvep-sc-compare');
    var nameEl = form.querySelector('#mvep-sc-name');
    var reviewer = form.querySelector('#mvep-sc-reviewer');
    var statusEl = form.querySelector('[data-status]');
    var gateEl = form.querySelector('[data-gate]');
    var noteEl = form.querySelector('[data-ratenote]');
    var forEl = form.querySelector('[data-rating-for]');
    var sumEl = form.querySelector('[data-summary]');
    window.__mvepMismatch = 0;

    /* product lists */
    function label(p){ return p.key + ' (' + p.issuer + ')'; }
    function fillSelect(el, ownOption){
      el.innerHTML = '';
      var groups = [['Nine-product sample', 'sample'], ['Comparators', 'comparator']];
      if(!ownOption){ var none = document.createElement('option'); none.value = ''; none.textContent = 'No comparator'; el.appendChild(none); }
      groups.forEach(function(g){
        var og = document.createElement('optgroup'); og.label = g[0];
        D.products.filter(function(p){ return p.group === g[1]; }).forEach(function(p){
          var o = document.createElement('option'); o.value = p.key; o.textContent = label(p); og.appendChild(o);
        });
        el.appendChild(og);
      });
      if(ownOption){ var own = document.createElement('option'); own.value = '__own'; own.textContent = 'Your own product'; el.appendChild(own); }
    }
    fillSelect(sel, true);
    fillSelect(cmp, false);

    function chip(v, extra){
      var lab = (D.verdicts[v] && D.verdicts[v].label) || v;
      return '<span class="mvep-v mvep-v--' + (CLS[v] || 'unassessed') + '"' + (D.verdicts[v] ? ' title="' + D.verdicts[v].meaning.replace(/"/g, '&quot;') + '"' : '') + '>' + lab + '</span>' + (extra || '');
    }
    function tierChip(tier, strength){
      return '<span class="mvep-v mvep-v--' + (TIER_CLS[tier] || 'unassessed') + '">' + tier + '</span>' + (strength ? ' <span class="mvep-sc__strength">' + strength.toFixed(1) + '</span>' : '');
    }
    function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    /* The source tag is a control, not a tooltip: a button that opens, in the row, what each tag stands for
       and where the paper shows it. Which row is open survives a re-render (openSrc), so choosing a verdict
       or a product does not close what the visitor just opened on another row unless that row has no tags. */
    var TAG_HREF = {
      T2: '/papers/mvep/#mvep-treasuries',
      SUM: '/papers/mvep/#mvep-exhibit-1',
      F5: '/papers/mvep/#mvep-exhibit-1',
      F6: '/papers/mvep/#mvep-exhibit-1',
      WE: '/papers/mvep/#mvep-sample',
      NEW: '/papers/mvep/#mvep-treasuries',
      NEW2: '/papers/mvep/#mvep-comparators',
      NEW3: '/papers/mvep/#mvep-exhibit-1',
      NEW4: '/papers/mvep/#mvep-comparators',
      NEW5: '/papers/mvep/#mvep-comparators',
      JX: '/papers/mvep/#mvep-exhibit-2',
      CP: '/papers/mvep/#mvep-exhibit-1',
      RWA: '/papers/mvep/#mvep-comparators'
    };
    function tagLabel(t){ return (D.tag_labels && D.tag_labels[t]) || t; }
    var openSrc = null;
    function tagsText(tags, cat){
      if(!tags || !tags.length) return '';
      var open = (openSrc === cat), id = 'mvep-sc-src-' + cat;
      return ' <button type="button" class="mvep-sc__src" data-src="' + cat + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '">Source: ' + tags.map(function(t){ return esc(tagLabel(t)); }).join(', ') + '</button>' +
        '<span class="mvep-sc__srcnote" id="' + id + '"' + (open ? '' : ' hidden') + '>' +
        tags.map(function(t){
          var href = TAG_HREF[t] || '/papers/mvep/#mvep-exhibit-1';
          return '<span class="mvep-sc__srcline"><a class="mvep-sc__src-link" href="' + href + '"><strong>' + esc(tagLabel(t)) + '</strong></a> (' + esc(t) + '): ' + esc(D.tags[t] || 'see the paper') + '.</span>';
        }).join('') +
        '<a href="/papers/mvep/#mvep-exhibit-1">Open Exhibit 1 on the paper page</a></span>';
    }

    function mode(){ return sel.value === '__own' ? 'own' : 'read'; }
    function ownVerdict(k){
      var checked = rowOf[k].querySelector('input[type="radio"]:checked');
      return CODE[checked ? checked.value : 'U'];
    }
    function ownVerdicts(){ var out = {}; KEYS.forEach(function(k){ out[k] = ownVerdict(k); }); return out; }
    function noteOf(k){ var n = rowOf[k].querySelector('.mvep-sc__note input'); return n ? n.value.trim() : ''; }

    function renderRating(r, who, note, provisional){
      forEl.textContent = who;
      var set = function(name, htmlText){ form.querySelector('[data-dim="' + name + '"]').innerHTML = htmlText; };
      set('legal', tierChip(r.legal, r.legal_strength));
      set('operational', tierChip(r.operational, r.operational_strength));
      set('economic', tierChip(r.economic, r.economic_strength));
      set('headline', tierChip(r.headline) + (provisional ? ' <span class="mvep-sc__status">provisional, ' + esc(r.coverage) + ' assessed</span>' : ''));
      set('binding', esc(r.binding));
      set('disclosure', esc(r.disclosure));
      set('coverage', esc(r.coverage) + ' assessed, confidence ' + esc(String(r.confidence).toLowerCase()));
      set('overall', '<span class="mvep-sc__strength mvep-sc__strength--big">' + (r.overall_strength ? r.overall_strength.toFixed(1) : '0.0') + '</span> of 5.0');
      noteEl.textContent = note;
    }
    function gateLine(verdicts){
      var n = { PASS: 0, PARTIAL: 0, AMBIGUOUS: 0, FAIL: 0, NOT_DISCLOSED: 0, UNASSESSED: 0 };
      KEYS.slice(0, 10).forEach(function(k){ n[verdicts[k] || 'UNASSESSED']++; });
      var short = 10 - n.PASS;
      if(short === 0){
        /* The gate reads the ten categories; the companion test is the eleventh row. Say so when it is not a
           Pass, or the line reads "open" beside a headline the companion test has pulled down. */
        var csa = verdicts.CSA || 'UNASSESSED';
        return ['open', 'Committee gate: open. All ten categories pass.' + (csa === 'PASS' ? '' : ' The Cash Settlement Asset companion test is not one of the ten; here it reads ' + ((D.verdicts[csa] && D.verdicts[csa].label) || csa) + ', and the rating above counts it.')];
      }
      var parts = [];
      if(n.FAIL) parts.push(n.FAIL + ' fail');
      if(n.PARTIAL) parts.push(n.PARTIAL + ' partial');
      if(n.AMBIGUOUS) parts.push(n.AMBIGUOUS + ' ambiguous');
      if(n.NOT_DISCLOSED) parts.push(n.NOT_DISCLOSED + ' not disclosed');
      if(n.UNASSESSED) parts.push(n.UNASSESSED + ' unassessed');
      return [n.FAIL ? 'blocked' : 'incomplete', 'Committee gate: closed. The paper opens it only when every category passes; ' + short + ' of ten ' + (short === 1 ? 'does' : 'do') + ' not (' + parts.join(', ') + ').'];
    }

    function render(){
      var m = mode();
      form.setAttribute('data-mode', m);
      Array.prototype.forEach.call(form.querySelectorAll('[data-own]'), function(el){ el.hidden = (m !== 'own'); });
      Array.prototype.forEach.call(form.querySelectorAll('[data-read]'), function(el){ el.hidden = (m !== 'read'); });
      var verdicts, rating, who, note, comparator = null, provisional = false;
      if(m === 'read'){
        var p = byKey[sel.value] || D.products[0];
        verdicts = {};
        KEYS.forEach(function(k){ verdicts[k] = (p.verdicts[k] || {}).v || 'UNASSESSED'; });
        rows.forEach(function(row){
          var k = row.getAttribute('data-cat'), cell = p.verdicts[k] || { v: 'UNASSESSED', tags: [] };
          row.setAttribute('data-verdict', CODE_OF[cell.v] || 'U');
          var slot = row.querySelector('[data-paper]');
          slot.innerHTML = '<span class="mvep-sc__paper-label">' + esc(p.key) + '</span> ' + chip(cell.v) + tagsText(cell.tags, k);
          slot.hidden = false;
        });
        rating = p.rating;
        var recomputed = rate(D, verdicts);
        ['legal', 'operational', 'economic', 'headline', 'binding', 'disclosure', 'coverage', 'confidence'].forEach(function(f){
          if(String(recomputed[f]) !== String(rating[f])) window.__mvepMismatch++;
        });
        ['legal_strength', 'operational_strength', 'economic_strength', 'overall_strength'].forEach(function(f){
          if(Math.abs(recomputed[f] - rating[f]) > 0.051) window.__mvepMismatch++;
        });
        who = p.key + ' (' + p.issuer + '), as published';
        note = 'Exhibit 3 values for ' + p.key + '. The paper rates every product Non-Equivalent at the headline; the dimensions and the strength score are where products differ.';
      } else {
        verdicts = ownVerdicts();
        comparator = cmp.value ? byKey[cmp.value] : null;
        rows.forEach(function(row){
          var k = row.getAttribute('data-cat');
          row.setAttribute('data-verdict', CODE_OF[verdicts[k]] || 'U');
          var slot = row.querySelector('[data-paper]');
          if(comparator){
            var cell = comparator.verdicts[k] || { v: 'UNASSESSED', tags: [] };
            slot.innerHTML = '<span class="mvep-sc__paper-label">' + esc(comparator.key) + '</span> ' + chip(cell.v) + tagsText(cell.tags, k);
            slot.hidden = false;
          } else {
            slot.innerHTML = '';
            slot.hidden = true;
          }
        });
        rating = rate(D, verdicts);
        who = (nameEl.value.trim() || 'your product') + ', from your verdicts';
        note = 'Rated with the paper\'s Exhibit 3 rule from the verdicts you recorded' + (comparator ? ', shown beside ' + comparator.key + '\'s published verdicts' : '') + '. Unassessed categories do not count; a rating from a few cells is a sketch, not a finding.';
        /* A rating from part of the grid is labelled as one, and names what is still open. */
        var open = KEYS.filter(function(k){ return verdicts[k] === 'UNASSESSED'; }).map(function(k){ return SHORT[k]; });
        if(open.length === KEYS.length){
          note = 'No verdicts recorded yet. Choose a verdict for each category; the rating fills in as you go.';
        } else if(open.length){
          provisional = true;
          note = 'Provisional: ' + open.length + ' of ' + KEYS.length + ' still unassessed (' + open.join(', ') + '). ' + note;
        }
      }
      renderRating(rating, who, note, provisional);
      /* The rating panel sits below eleven rows, and many products share their first verdicts, so a change of
         product could leave nothing different in view. Say the chosen product's scores right under the control. */
      if(sumEl){
        var cnt = {}, fx = function(x){ return (typeof x === 'number' && x) ? x.toFixed(1) : '0.0'; };
        KEYS.forEach(function(k){ var v = verdicts[k] || 'UNASSESSED'; cnt[v] = (cnt[v] || 0) + 1; });
        var tallies = ['PASS', 'PARTIAL', 'AMBIGUOUS', 'NOT_DISCLOSED', 'FAIL', 'UNASSESSED'].filter(function(v){ return cnt[v]; })
          .map(function(v){ return cnt[v] + ' ' + ((D.verdicts[v] && D.verdicts[v].label) || v); });
        sumEl.innerHTML = '<strong>' + esc(who) + '</strong> ' + tierChip(rating.headline) + (provisional ? ' <span class="mvep-sc__status">provisional</span>' : '') +
          '<span class="mvep-sc__sumline">Overall strength <b>' + fx(rating.overall_strength) + '</b> of 5.0. Legal ' + esc(rating.legal) + ' ' + fx(rating.legal_strength) +
          ', operational ' + esc(rating.operational) + ' ' + fx(rating.operational_strength) + ', economic ' + esc(rating.economic) + ' ' + fx(rating.economic_strength) + '.</span>' +
          '<span class="mvep-sc__sumline">' + tallies.join(', ') + '. <a href="#mvep-sc-rating">Full rating below</a></span>';
        sumEl.classList.remove('is-fresh'); void sumEl.offsetWidth; sumEl.classList.add('is-fresh');
      }
      var g = gateLine(verdicts);
      gateEl.setAttribute('data-state', g[0]);
      gateEl.textContent = g[1];
      syncHash();
    }

    /* text, link, print, reset */
    function localDate(){
      /* The reviewer's own calendar date; toISOString() gives the UTC date, a day ahead in the evening west of Greenwich. */
      var d = new Date(), z = function(n){ return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }
    function summaryText(){
      var m = mode(), lines = [];
      if(m === 'read'){
        var p = byKey[sel.value] || D.products[0];
        lines.push('MVEP scorecard, ' + p.key + ' (' + p.issuer + '): the paper\'s verdicts (Exhibit 1) and rating (Exhibit 3)');
        KEYS.forEach(function(k){ var c = p.verdicts[k] || { v: 'UNASSESSED', tags: [] }; lines.push((k === 'CSA' ? '+' : k) + '. ' + SHORT[k] + ': ' + D.verdicts[c.v].label + (c.tags.length ? ' [' + c.tags.map(tagLabel).join('; ') + ']' : '')); });
        var r = p.rating;
        lines.push('Legal ' + r.legal + ' (' + r.legal_strength.toFixed(1) + '); Operational ' + r.operational + ' (' + r.operational_strength.toFixed(1) + '); Economic ' + r.economic + ' (' + r.economic_strength.toFixed(1) + '); headline ' + r.headline + '; binds on ' + r.binding + '; overall strength ' + r.overall_strength.toFixed(1));
      } else {
        var v = ownVerdicts(), rr = rate(D, v), comparator = cmp.value ? byKey[cmp.value] : null;
        lines.push('MVEP scorecard' + (nameEl.value.trim() ? ': ' + nameEl.value.trim() : '') + (reviewer.value.trim() ? ' (reviewed by ' + reviewer.value.trim() + ')' : '') + ', ' + localDate());
        KEYS.forEach(function(k){ lines.push((k === 'CSA' ? '+' : k) + '. ' + SHORT[k] + ': ' + D.verdicts[v[k]].label + (comparator ? ' (' + comparator.key + ': ' + D.verdicts[(comparator.verdicts[k] || {}).v || 'UNASSESSED'].label + ')' : '') + (noteOf(k) ? ' | ' + noteOf(k) : '')); });
        lines.push('Rated by the paper\'s rule: Legal ' + rr.legal + ' (' + rr.legal_strength.toFixed(1) + '); Operational ' + rr.operational + ' (' + rr.operational_strength.toFixed(1) + '); Economic ' + rr.economic + ' (' + rr.economic_strength.toFixed(1) + '); headline ' + rr.headline + '; binds on ' + rr.binding + '; coverage ' + rr.coverage + '; overall strength ' + rr.overall_strength.toFixed(1));
        lines.push(gateLine(v)[1]);
      }
      lines.push('https://tokenization.systems/frameworks/#mvep-scorecard (paper: https://tokenization.systems/papers/mvep/)');
      return lines.join('\n');
    }
    function shareLink(){
      var base = location.origin + location.pathname;
      if(mode() === 'read') return base + '#mvep=' + encodeURIComponent(sel.value);
      var hash = '#sc=' + KEYS.map(function(k){ return CODE_OF[ownVerdict(k)]; }).join('');
      if(nameEl.value.trim()) hash += '&p=' + encodeURIComponent(nameEl.value.trim().slice(0, 80));
      if(cmp.value) hash += '&c=' + encodeURIComponent(cmp.value);
      return base + hash;
    }
    /* One status line, one timer: a second message is never blanked by the first one's timer. ms = 0 keeps
       the message until the next message or the next change to the form. */
    var statusTimer = null;
    function setStatus(msg, ms){
      if(statusTimer){ clearTimeout(statusTimer); statusTimer = null; }
      statusEl.textContent = msg;
      if(ms) statusTimer = setTimeout(function(){ statusEl.textContent = ''; statusTimer = null; }, ms);
    }
    function copyText(text, okMsg){
      function done(ok){ setStatus(ok ? okMsg : 'Copy failed; select the text and copy it by hand.', 4000); }
      function fallback(){
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch(e){ ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ done(true); }, fallback);
      } else { fallback(); }
    }
    /* Deep links. Product keys match without regard to case; a key the exhibit does not carry, or a verdict
       code of the wrong shape, says so instead of silently showing the first product. */
    var keyByLower = {};
    D.products.forEach(function(p){ keyByLower[p.key.toLowerCase()] = p.key; });
    function isToolHash(h){ return /[#&](mvep|sc)=/.test(h || ''); }
    function applyHash(){
      var h = location.hash || '';
      var mm = /[#&]mvep=([^&]*)/.exec(h);
      if(mm){
        var asked = mm[1];
        try { asked = decodeURIComponent(asked); } catch(e){ /* malformed */ }
        var key = keyByLower[asked.toLowerCase()];
        if(key){ sel.value = key; return true; }
        sel.value = D.products[0].key;
        setStatus('This link names "' + asked.slice(0, 40) + '", which is not one of the fourteen products in Exhibit 1. Showing ' + D.products[0].key + '.', 0);
        return true;
      }
      var sc = /[#&]sc=([PTAFNU]{11})(?![A-Za-z])/i.exec(h);
      if(!sc){
        if(/[#&]sc=/.test(h)) setStatus('This link\'s verdict code is not eleven letters from P, T, A, F, N and U, so no verdicts were loaded.', 0);
        return false;
      }
      sel.value = '__own';
      var code = sc[1].toUpperCase();
      KEYS.forEach(function(k, i){
        var input = rowOf[k].querySelector('input[type="radio"][value="' + code.charAt(i) + '"]');
        if(input) input.checked = true;
      });
      var pm = /[#&]p=([^&]*)/.exec(h);
      if(pm){ try { nameEl.value = decodeURIComponent(pm[1]).slice(0, 80); } catch(e){ /* malformed */ } }
      var cm = /[#&]c=([A-Za-z0-9]+)/.exec(h);
      if(cm && keyByLower[cm[1].toLowerCase()]) cmp.value = keyByLower[cm[1].toLowerCase()];
      return true;
    }
    /* Keep a deep link in step with what is on screen, so the address bar can be copied, bookmarked or
       reloaded. Only a link the visitor already has is rewritten: a product link follows the product; a
       verdict link follows the verdicts; choosing "Your own product" from a product link drops the product
       from the address and puts no verdicts there (they go into a link only through "Copy link"). */
    function syncHash(){
      var h = location.hash || '';
      if(!isToolHash(h)) return;
      var target = (mode() === 'own' && !/[#&]sc=/.test(h)) ? (location.origin + location.pathname + '#mvep-scorecard') : shareLink();
      if(target !== location.href){ try { history.replaceState(null, '', target); } catch(err){ /* sandboxed */ } }
    }
    /* A deep link names no element, so the browser does not scroll to the tool by itself. */
    var section = document.getElementById('mvep-scorecard');
    var visitorMoved = false;
    function bringIntoView(){
      if(!section) return;
      /* Measured from the header as it is drawn (it is taller than --header-h on a phone), and instant,
         not the page's smooth scroll: a link that opens the tool should open on it. */
      var header = document.querySelector('header');
      var hb = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      var top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - hb - 16);
      try { window.scrollTo({ top: top, behavior: 'instant' }); } catch(e){ window.scrollTo(0, top); }
    }

    form.addEventListener('change', function(){ if(!statusTimer) setStatus('', 0); render(); });
    form.addEventListener('input', function(e){ if(e.target === nameEl) render(); });
    form.addEventListener('submit', function(e){ e.preventDefault(); });
    form.addEventListener('keydown', function(e){
      if(e.key !== 'Escape' || openSrc === null) return;
      var cat = openSrc; openSrc = null; render();
      var back = form.querySelector('button[data-src="' + cat + '"]');
      if(back) back.focus();
    });
    form.addEventListener('click', function(e){
      var src = e.target.closest('button[data-src]');
      if(src){
        var cat = src.getAttribute('data-src');
        openSrc = (openSrc === cat) ? null : cat;
        render();
        var again = form.querySelector('button[data-src="' + cat + '"]');
        if(again) again.focus();
        return;
      }
      var btn = e.target.closest('button[data-act]');
      if(!btn) return;
      var act = btn.getAttribute('data-act');
      if(act === 'copy') copyText(summaryText(), mode() === 'read' ? 'Column copied as text.' : 'Summary copied.');
      else if(act === 'link'){
        var link = shareLink();
        try { history.replaceState(null, '', link); } catch(err){ /* sandboxed */ }
        copyText(link, mode() === 'read' ? 'Link copied; it opens this product.' : 'Link copied; it carries your verdicts, the product name and the comparator.');
      }
      else if(act === 'print'){
        document.body.classList.add('mvep-printing');
        var off = function(){ document.body.classList.remove('mvep-printing'); window.removeEventListener('afterprint', off); };
        window.addEventListener('afterprint', off);
        window.print();
        setTimeout(off, 2000);
      }
      else if(act === 'reset'){
        rows.forEach(function(row){ row.querySelector('input[value="U"]').checked = true; var n = row.querySelector('.mvep-sc__note input'); if(n) n.value = ''; });
        nameEl.value = ''; reviewer.value = ''; cmp.value = '';
        try { history.replaceState(null, '', location.pathname + '#mvep-scorecard'); } catch(err){ /* sandboxed */ }
        render();
      }
    });
    window.addEventListener('hashchange', function(){ if(applyHash()){ render(); bringIntoView(); } });
    var deep = applyHash();
    render();
    if(deep){
      bringIntoView();
      /* Fonts and images above the tool can still move it after this point; align once more when the page
         has finished loading, unless the visitor has already started moving. */
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function(t){
        window.addEventListener(t, function(){ visitorMoved = true; }, { once: true, passive: true });
      });
      if(document.readyState !== 'complete') window.addEventListener('load', function(){ if(!visitorMoved) bringIntoView(); }, { once: true });
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Interactive fleet commit chart on /agent-infrastructure/ */
(function(){
  function initCommitChart(){
    var fig = document.getElementById('ai-commit-chart');
    var svg = document.getElementById('ai-cc-svg');
    var dataEl = document.getElementById('ai-commit-chart-data');
    if(!fig || !svg || !dataEl) return;

    var doc;
    try { doc = JSON.parse(dataEl.textContent); } catch(e){ return; }
    if(!doc || !Array.isArray(doc.series) || !doc.series.length) return;

    var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var X0 = 78.0, X1 = 928.0, Y0 = 352.0;
    var PX_PER_1000 = 66.5;
    var FONT = 'JetBrains Mono, ui-monospace, Menlo, monospace';
    var NS = 'http://www.w3.org/2000/svg';

    var readout = document.getElementById('ai-cc-readout');
    var stage = document.getElementById('ai-cc-stage');
    var gridEl = document.getElementById('ai-cc-grid');
    var monthsEl = document.getElementById('ai-cc-months');
    var areaEl = document.getElementById('ai-cc-area');
    var glowEl = document.getElementById('ai-cc-glow-line');
    var lineEl = document.getElementById('ai-cc-line');
    var peakEl = document.getElementById('ai-cc-peak');
    var titleRight = document.getElementById('ai-cc-title-right');
    var footerEl = document.getElementById('ai-cc-footer');
    var hoverG = document.getElementById('ai-cc-hover');
    var curLine = document.getElementById('ai-cc-cursor-line');
    var curHalo = document.getElementById('ai-cc-cursor-halo');
    var curDot = document.getElementById('ai-cc-cursor-dot');
    var tipG = document.getElementById('ai-cc-tooltip');
    var tipBg = document.getElementById('ai-cc-tip-bg');
    var tipDate = document.getElementById('ai-cc-tip-date');
    var tipVal = document.getElementById('ai-cc-tip-val');
    var tipSub = document.getElementById('ai-cc-tip-sub');
    var hitRect = document.getElementById('ai-cc-hit');

    var curMode = '3d';
    var curRange = 'all';
    var activeIdx = null;
    var points = [];

    function parseStart(iso){
      var p = (iso || '2026-03-02').split('-');
      return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    }
    function addDays(d, n){
      return new Date(d.getTime() + n * 86400000);
    }
    function fmtRange(a, b){
      var da = a.getUTCDate(), ma = a.getUTCMonth(), ya = a.getUTCFullYear();
      var db = b.getUTCDate(), mb = b.getUTCMonth(), yb = b.getUTCFullYear();
      if(da === db && ma === mb && ya === yb){
        return db + ' ' + MONTHS_SHORT[mb] + ' ' + yb;
      }
      if(ma === mb){
        return da + '-' + db + ' ' + MONTHS_SHORT[mb] + ' ' + yb;
      }
      return da + ' ' + MONTHS_SHORT[ma] + '-' + db + ' ' + MONTHS_SHORT[mb] + ' ' + yb;
    }
    function fmtShortSpan(a, b){
      var da = a.getUTCDate(), ma = a.getUTCMonth();
      var db = b.getUTCDate(), mb = b.getUTCMonth();
      if(da === db && ma === mb) return (MONTHS_SHORT[ma] + ' ' + da).toUpperCase();
      if(ma === mb) return (MONTHS_SHORT[ma] + ' ' + da + '-' + db).toUpperCase();
      return (MONTHS_SHORT[ma] + ' ' + da + '-' + MONTHS_SHORT[mb] + ' ' + db).toUpperCase();
    }

    function buildPoints(){
      var start = parseStart(doc.start_date);
      var s3 = doc.series || [];
      var s1 = Array.isArray(doc.series_1d) && doc.series_1d.length ? doc.series_1d : null;
      var raw = [];
      var cum = 0;

      if(curMode === '1d' && s1){
        for(var d = 0; d < s1.length; d++){
          var dt = addDays(start, d);
          cum += s1[d];
          raw.push({
            start: dt,
            end: dt,
            value: s1[d],
            rawCommits: s1[d],
            spanDays: 1,
            cum: cum
          });
        }
      } else {
        for(var i = 0; i < s3.length; i++){
          var a = addDays(start, i * 3);
          var b = addDays(start, i * 3 + 2);
          cum += s3[i];
          raw.push({
            start: a,
            end: b,
            value: curMode === 'cum' ? cum : s3[i],
            rawCommits: s3[i],
            spanDays: 3,
            cum: cum
          });
        }
      }

      if(curRange === '90' || curRange === '30'){
        var daysBack = curRange === '90' ? 90 : 30;
        var keep = curMode === '1d' && s1 ? daysBack : Math.ceil(daysBack / 3);
        if(raw.length > keep) raw = raw.slice(raw.length - keep);
      }

      var n = raw.length;
      var maxVal = 0;
      for(var j = 0; j < n; j++){
        if(raw[j].value > maxVal) maxVal = raw[j].value;
      }
      var stepUnit = curMode === 'cum' ? 15000 : (curMode === '1d' ? 500 : 1000);
      if(maxVal <= 2000 && curMode === '3d') stepUnit = 500;
      var top = Math.max(stepUnit * 4, Math.ceil(maxVal / stepUnit) * stepUnit);
      var plotH = PX_PER_1000 * 4;
      var perUnit = plotH / top;
      var xStep = n > 1 ? (X1 - X0) / n : 0;

      points = raw.map(function(item, idx){
        var x = X0 + idx * xStep;
        var y = Y0 - item.value * perUnit;
        return {
          idx: idx,
          x: x,
          y: y,
          start: item.start,
          end: item.end,
          value: item.value,
          rawCommits: item.rawCommits,
          spanDays: item.spanDays,
          cum: item.cum,
          top: top,
          stepUnit: stepUnit,
          perUnit: perUnit,
          xStep: xStep
        };
      });
    }

    function fmtRangeNoYear(a, b){
      var da = a.getUTCDate(), ma = a.getUTCMonth();
      var db = b.getUTCDate(), mb = b.getUTCMonth();
      if(da === db && ma === mb) return db + ' ' + MONTHS_SHORT[mb];
      if(ma === mb) return da + '-' + db + ' ' + MONTHS_SHORT[mb];
      return da + ' ' + MONTHS_SHORT[ma] + '-' + db + ' ' + MONTHS_SHORT[mb];
    }

    function defaultSummaryHtml(){
      if(!points.length) return '';
      var last = points[points.length - 1];
      var peak = points[0];
      var sumWindow = 0;
      points.forEach(function(p){
        sumWindow += p.rawCommits;
        if(p.value >= peak.value) peak = p;
      });
      if(curMode === 'cum'){
        return '<strong>' + last.cum.toLocaleString() + '</strong> cumulative commits through ' +
          fmtRangeNoYear(last.end, last.end) + ' · Latest 3-day bin <strong>' + last.rawCommits.toLocaleString() +
          '</strong> (' + fmtRangeNoYear(last.start, last.end) + ')';
      }
      var unitLabel = curMode === '1d' ? (points.length + ' days') : (points.length + ' three-day bins');
      return '<strong>' + sumWindow.toLocaleString() + '</strong> commits across ' + unitLabel +
        ' · Peak <strong>' + peak.value.toLocaleString() + '</strong> (' + fmtRangeNoYear(peak.start, peak.end) + ')' +
        ' · Latest <strong>' + last.value.toLocaleString() + '</strong> (' + fmtRangeNoYear(last.start, last.end) + ')';
    }

    function drawChart(){
      buildPoints();
      if(!points.length) return;
      var n = points.length;
      var top = points[0].top;
      var stepUnit = points[0].stepUnit;
      var perUnit = points[0].perUnit;

      if(titleRight){
        titleRight.textContent = curMode === '1d' ? 'PER DAY' : (curMode === 'cum' ? 'CUMULATIVE' : 'PER 3 DAYS');
      }

      if(gridEl){
        var gHtml = '';
        for(var v = 0; v <= top; v += stepUnit){
          var gy = Y0 - v * perUnit;
          gHtml += '<line x1="78" y1="' + gy.toFixed(1) + '" x2="928" y2="' + gy.toFixed(1) + '" stroke="#606c3e" stroke-opacity="0.45" stroke-width="1"/>';
          gHtml += '<text x="66" y="' + (gy + 4.0).toFixed(1) + '" text-anchor="end" fill="#9ca3af" font-size="11" font-family="' + FONT + '">' + v.toLocaleString() + '</text>';
        }
        gridEl.innerHTML = gHtml;
      }

      if(monthsEl){
        var mHtml = '';
        var seenMonths = {};
        for(var i = 0; i < n; i++){
          var p = points[i];
          var mKey = p.start.getUTCFullYear() + '-' + p.start.getUTCMonth();
          if(i === 0 || (!seenMonths[mKey] && p.start.getUTCDate() <= p.spanDays)){
            seenMonths[mKey] = true;
            mHtml += '<text x="' + p.x.toFixed(1) + '" y="380" text-anchor="middle" fill="#9ca3af" font-size="12" font-family="' + FONT + '">' + MONTHS_SHORT[p.start.getUTCMonth()] + '</text>';
          }
        }
        monthsEl.innerHTML = mHtml;
      }

      var ptsStr = points.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      var polyStr = X0.toFixed(1) + ',' + Y0.toFixed(1) + ' ' + ptsStr + ' ' + points[n - 1].x.toFixed(1) + ',' + Y0.toFixed(1);
      if(areaEl) areaEl.setAttribute('points', polyStr);
      if(glowEl) glowEl.setAttribute('points', ptsStr);
      if(lineEl) lineEl.setAttribute('points', ptsStr);

      if(peakEl){
        var pk = points[0];
        points.forEach(function(p){ if(p.value >= pk.value) pk = p; });
        var anchor = pk.x > 820 ? 'end' : (pk.x < 140 ? 'start' : 'end');
        var tx = anchor === 'start' ? (pk.x + 8) : (pk.x - 8);
        var ty1 = Math.max(76, pk.y - 14);
        var ty2 = ty1 + 13;
        peakEl.innerHTML =
          '<circle cx="' + pk.x.toFixed(1) + '" cy="' + pk.y.toFixed(1) + '" r="4.2" fill="#0a0c10" stroke="#ccfbe5" stroke-width="1.6"/>' +
          '<text x="' + tx.toFixed(1) + '" y="' + ty1.toFixed(1) + '" text-anchor="' + anchor + '" fill="#ccfbe5" font-size="12" font-family="' + FONT + '">' + pk.value.toLocaleString() + '</text>' +
          '<text x="' + tx.toFixed(1) + '" y="' + ty2.toFixed(1) + '" text-anchor="' + anchor + '" fill="#8fe6c4" font-size="10" font-family="' + FONT + '">' + fmtShortSpan(pk.start, pk.end) + '</text>';
      }

      if(footerEl){
        var fStart = points[0].start;
        var fEnd = points[n - 1].end;
        footerEl.textContent = (
          fStart.getUTCDate() + ' ' + MONTHS_FULL[fStart.getUTCMonth()] + ' THROUGH ' +
          fEnd.getUTCDate() + ' ' + MONTHS_FULL[fEnd.getUTCMonth()] + ' ' + fEnd.getUTCFullYear()
        ).toUpperCase();
      }

      if(activeIdx !== null && activeIdx < points.length){
        showPoint(activeIdx);
      } else {
        hideHover();
      }
    }

    function showPoint(idx){
      if(!points.length) return;
      idx = Math.max(0, Math.min(points.length - 1, idx));
      activeIdx = idx;
      var p = points[idx];

      if(hoverG) hoverG.setAttribute('opacity', '1');
      if(curLine){
        curLine.setAttribute('x1', p.x.toFixed(1));
        curLine.setAttribute('x2', p.x.toFixed(1));
      }
      if(curHalo){
        curHalo.setAttribute('cx', p.x.toFixed(1));
        curHalo.setAttribute('cy', p.y.toFixed(1));
      }
      if(curDot){
        curDot.setAttribute('cx', p.x.toFixed(1));
        curDot.setAttribute('cy', p.y.toFixed(1));
      }

      var dateLabel = fmtRange(p.start, p.end);
      var valLabel = curMode === 'cum'
        ? (p.cum.toLocaleString() + ' cumulative commits')
        : (p.value.toLocaleString() + (curMode === '1d' ? ' commits on day' : ' commits in 3d bin'));
      var avgDay = Math.round(p.rawCommits / p.spanDays);
      var subLabel = curMode === 'cum'
        ? ('+' + p.rawCommits.toLocaleString() + ' in bin (' + avgDay.toLocaleString() + '/day)')
        : (avgDay.toLocaleString() + '/day avg · ' + p.cum.toLocaleString() + ' cumulative');

      if(tipDate) tipDate.textContent = dateLabel.toUpperCase();
      if(tipVal) tipVal.textContent = valLabel;
      if(tipSub) tipSub.textContent = subLabel;

      if(tipG && tipBg){
        var boxW = 226;
        var tx = p.x + 14;
        if(tx + boxW > 930) tx = p.x - boxW - 14;
        var ty = Math.max(62, Math.min(280, p.y - 34));
        tipBg.setAttribute('width', String(boxW));
        tipG.setAttribute('transform', 'translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ')');
      }

      if(readout){
        readout.innerHTML =
          '<strong>' + dateLabel + '</strong>: <strong>' + valLabel + '</strong> · ' + subLabel;
      }
    }

    function hideHover(){
      activeIdx = null;
      if(hoverG) hoverG.setAttribute('opacity', '0');
      if(readout) readout.innerHTML = '<span class="ai-cc__summary">' + defaultSummaryHtml() + '</span>';
    }

    function clientXToIdx(clientX){
      if(!points.length) return 0;
      var r = svg.getBoundingClientRect();
      if(!r.width) return 0;
      var svgX = ((clientX - r.left) / r.width) * 960;
      var best = 0, bestDist = Infinity;
      for(var i = 0; i < points.length; i++){
        var d = Math.abs(points[i].x - svgX);
        if(d < bestDist){ bestDist = d; best = i; }
      }
      return best;
    }

    if(hitRect){
      hitRect.addEventListener('pointermove', function(e){
        showPoint(clientXToIdx(e.clientX));
      }, { passive: true });
      hitRect.addEventListener('pointerdown', function(e){
        showPoint(clientXToIdx(e.clientX));
      }, { passive: true });
      hitRect.addEventListener('pointerleave', function(){
        hideHover();
      }, { passive: true });
    }

    if(stage){
      stage.addEventListener('keydown', function(e){
        if(!points.length) return;
        if(e.key === 'ArrowLeft'){
          e.preventDefault();
          showPoint(activeIdx === null ? points.length - 1 : activeIdx - 1);
        } else if(e.key === 'ArrowRight'){
          e.preventDefault();
          showPoint(activeIdx === null ? 0 : activeIdx + 1);
        } else if(e.key === 'Home'){
          e.preventDefault();
          showPoint(0);
        } else if(e.key === 'End'){
          e.preventDefault();
          showPoint(points.length - 1);
        } else if(e.key === 'Escape'){
          hideHover();
        }
      });
      stage.addEventListener('blur', function(){ hideHover(); });
    }

    fig.addEventListener('click', function(e){
      var modeBtn = e.target.closest('button[data-cc-mode]');
      if(modeBtn){
        curMode = modeBtn.getAttribute('data-cc-mode') || '3d';
        fig.querySelectorAll('button[data-cc-mode]').forEach(function(b){
          var on = b === modeBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        activeIdx = null;
        drawChart();
        return;
      }
      var rangeBtn = e.target.closest('button[data-cc-range]');
      if(rangeBtn){
        curRange = rangeBtn.getAttribute('data-cc-range') || 'all';
        fig.querySelectorAll('button[data-cc-range]').forEach(function(b){
          var on = b === rangeBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        activeIdx = null;
        drawChart();
      }
    });

    drawChart();

    /* Fetch the latest JSON series so any data refresh updates the live chart and page commit floor automatically. */
    function syncLiveCommitFloor(commitsOnRef){
      if(typeof commitsOnRef !== 'number' || commitsOnRef < 1000) return;
      var floored = Math.floor(commitsOnRef / 1000) * 1000;
      var fmt = floored.toLocaleString();
      var stamp = document.getElementById('ai-scale-stamp');
      if(stamp) stamp.setAttribute('data-scale-commits-floored', String(floored));
      var sup = document.querySelector('.ai-hero-support');
      if(sup) sup.innerHTML = sup.innerHTML.replace(/more than [\d,]+ commits/i, 'more than ' + fmt + ' commits');
      document.querySelectorAll('.ai-proof-item strong').forEach(function(el){
        var next = el.nextElementSibling;
        if(next && /commits observed/i.test(next.textContent)) el.textContent = fmt + '+';
      });
      document.querySelectorAll('.ai-metric').forEach(function(card){
        var lbl = card.querySelector('.ai-metric-label');
        var val = card.querySelector('.ai-metric-value');
        if(lbl && val && /commits observed/i.test(lbl.textContent)) val.textContent = fmt + '+';
      });
      document.querySelectorAll('.ai-table--scale tbody tr').forEach(function(tr){
        var th = tr.querySelector('th');
        var td = tr.querySelector('td.ai-val');
        if(th && td && /^commits$/i.test(th.textContent.trim())) td.textContent = 'over ' + fmt;
      });
    }
    if(typeof fetch === 'function'){
      fetch('/agent-infrastructure/commits-per-3-days.json', { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(fresh){
          if(fresh && Array.isArray(fresh.series) && fresh.series.length){
            doc = fresh;
            drawChart();
            syncLiveCommitFloor(fresh.commits_on_ref);
          }
        })
        .catch(function(){ /* offline or local file; inline JSON already loaded */ });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initCommitChart);
  } else {
    initCommitChart();
  }
})();

/* ==========================================================================
   Patent Portfolio Interactive Explorer (/patents/#patents-explorer)
   ========================================================================== */
(function(){
  'use strict';

  function initPatentExplorer(){
    var section = document.getElementById('patents-explorer');
    if(!section) return;

    var searchInput = document.getElementById('patent-search');
    var clearBtn = document.getElementById('patent-search-clear');
    var resetBtn = document.getElementById('patent-reset');
    var statusEl = document.getElementById('patent-count-status');
    var cardsContainer = section.querySelector('.patent-areas') || document.getElementById('patent-areas-cards');
    var emptyEl = document.getElementById('patent-empty');
    var areaChips = section.querySelectorAll('button[data-patent-area]');

    var cards = Array.prototype.slice.call(section.querySelectorAll('.patent-area, .patent-area-card'));
    var allRows = [];
    var curArea = 'all';
    var curQuery = '';

    cards.forEach(function(card, areaIdx){
      card.setAttribute('data-area-index', String(areaIdx));
      var h3 = card.querySelector('h3, p > strong');
      var areaTitle = h3 ? h3.textContent.trim() : ('Area ' + (areaIdx + 1));
      var items = Array.prototype.slice.call(card.querySelectorAll('.patent-filings li, .patent-filing-list li'));
      items.forEach(function(li){
        var numEl = li.querySelector('.filing-no');
        var appNo = numEl ? numEl.textContent.trim() : '';
        var clone = li.cloneNode(true);
        var cNum = clone.querySelector('.filing-no');
        if(cNum) cNum.remove();
        var title = clone.textContent.replace(/\s+/g, ' ').trim();
        var searchBlob = (title + ' ' + appNo + ' ' + areaTitle).toLowerCase();
        li.setAttribute('data-search', searchBlob);
        if(numEl){
          numEl.setAttribute('role', 'button');
          numEl.setAttribute('tabindex', '0');
          numEl.setAttribute('title', 'Click to copy application number ' + appNo);
        }
        allRows.push({
          idx: allRows.length + 1,
          areaIdx: areaIdx,
          areaTitle: areaTitle,
          title: title,
          appNo: appNo,
          searchBlob: searchBlob,
          li: li
        });
      });
    });

    function copySerial(el, appNo){
      if(!appNo) return;
      function flash(){
        var orig = el.textContent;
        el.textContent = 'Copied ' + appNo;
        el.classList.add('is-copied');
        setTimeout(function(){
          el.textContent = orig;
          el.classList.remove('is-copied');
        }, 1200);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(appNo).then(flash).catch(function(){});
      } else {
        flash();
      }
    }

    section.addEventListener('click', function(e){
      var numEl = e.target.closest('.filing-no');
      if(numEl){
        var appNo = numEl.getAttribute('data-serial') || numEl.textContent.replace(/^Copied\s+/, '').trim();
        numEl.setAttribute('data-serial', appNo);
        copySerial(numEl, appNo);
      }
    });
    section.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        var numEl = e.target.closest('.filing-no');
        if(numEl){
          e.preventDefault();
          var appNo = numEl.getAttribute('data-serial') || numEl.textContent.replace(/^Copied\s+/, '').trim();
          numEl.setAttribute('data-serial', appNo);
          copySerial(numEl, appNo);
        }
      }
    });

    function applyFilters(){
      var q = curQuery.trim().toLowerCase();
      var matchedFilings = 0;
      var matchedAreasMap = {};

      allRows.forEach(function(r){
        var areaOk = (curArea === 'all') || (String(r.areaIdx) === curArea);
        var queryOk = !q || r.searchBlob.indexOf(q) !== -1;
        var show = areaOk && queryOk;
        r.li.hidden = !show;
        if(show){
          matchedFilings++;
          matchedAreasMap[r.areaIdx] = (matchedAreasMap[r.areaIdx] || 0) + 1;
        }
      });

      var visibleAreas = 0;
      cards.forEach(function(card, idx){
        var count = matchedAreasMap[idx] || 0;
        var showCard = count > 0;
        card.hidden = !showCard;
        if(showCard) visibleAreas++;
      });

      if(clearBtn) clearBtn.hidden = !q;
      var isFiltered = Boolean(q || curArea !== 'all');
      if(resetBtn) resetBtn.hidden = !isFiltered;

      if(statusEl){
        if(!isFiltered){
          statusEl.textContent = 'Showing all ' + allRows.length + ' applications across ' + cards.length + ' problem areas (click any serial number to copy)';
        } else {
          statusEl.textContent = 'Showing ' + matchedFilings + ' of ' + allRows.length + ' applications across ' + visibleAreas + (visibleAreas === 1 ? ' problem area' : ' problem areas');
        }
      }

      if(cardsContainer) cardsContainer.hidden = matchedFilings === 0;
      if(emptyEl) emptyEl.hidden = matchedFilings > 0;
    }

    if(searchInput){
      searchInput.addEventListener('input', function(){
        curQuery = searchInput.value || '';
        applyFilters();
      });
    }
    if(clearBtn){
      clearBtn.addEventListener('click', function(){
        curQuery = '';
        if(searchInput){ searchInput.value = ''; searchInput.focus(); }
        applyFilters();
      });
    }
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        curQuery = '';
        curArea = 'all';
        if(searchInput) searchInput.value = '';
        areaChips.forEach(function(c){
          var on = c.getAttribute('data-patent-area') === 'all';
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        applyFilters();
      });
    }

    areaChips.forEach(function(chip){
      chip.addEventListener('click', function(){
        curArea = chip.getAttribute('data-patent-area') || 'all';
        areaChips.forEach(function(c){
          var on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        applyFilters();
      });
    });

    applyFilters();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initPatentExplorer);
  } else {
    initPatentExplorer();
  }
})();

/* ==========================================================================
   Operational-Risk & Reputation Threshold Explorer (/papers/operational-risk/)
   ========================================================================== */
(function(){
  'use strict';

  /* Exact simulation series from gap2_reputation_sweep.csv & counterfactual_downtime_clearance.json */
  var TAU_STEPS = [
    { tau: 0.99, rep: 0.1753, active: 0.9271, clearCoded: 0.7243, clearDrawn: 0.6377, clearBinom: 0.6370 },
    { tau: 0.98, rep: 0.3712, active: 0.9585, clearCoded: 0.7243, clearDrawn: 0.6377, clearBinom: 0.9248 },
    { tau: 0.97, rep: 0.5733, active: 0.9746, clearCoded: 0.7931, clearDrawn: 0.7107, clearBinom: 0.9896 },
    { tau: 0.96, rep: 0.7810, active: 0.9803, clearCoded: 0.8588, clearDrawn: 0.7798, clearBinom: 0.9990 },
    { tau: 0.95, rep: 0.9985, active: 0.9866, clearCoded: 0.9061, clearDrawn: 0.8400, clearBinom: 0.9999 },
    { tau: 0.94, rep: 1.2131, active: 0.9886, clearCoded: 0.9372, clearDrawn: 0.8878, clearBinom: 1.0000 },
    { tau: 0.93, rep: 1.4258, active: 0.9912, clearCoded: 0.9575, clearDrawn: 0.9228, clearBinom: 1.0000 },
    { tau: 0.92, rep: 1.6305, active: 0.9927, clearCoded: 0.9669, clearDrawn: 0.9389, clearBinom: 1.0000 },
    { tau: 0.91, rep: 1.8256, active: 0.9935, clearCoded: 0.9745, clearDrawn: 0.9564, clearBinom: 1.0000 },
    { tau: 0.90, rep: 2.0110, active: 0.9942, clearCoded: 0.9803, clearDrawn: 0.9693, clearBinom: 1.0000 }
  ];

  var DELTA_STEPS = [
    { delta: 0.01, repAt99: 0.3338 },
    { delta: 0.02, repAt99: 0.3249 },
    { delta: 0.05, repAt99: 0.2998 },
    { delta: 0.10, repAt99: 0.2623 },
    { delta: 0.15, repAt99: 0.2294 },
    { delta: 0.25, repAt99: 0.1753 },
    { delta: 0.35, repAt99: 0.1342 },
    { delta: 0.50, repAt99: 0.0908 },
    { delta: 0.75, repAt99: 0.0497 },
    { delta: 1.00, repAt99: 0.0299 }
  ];

  /* Exact 30-seed bootstrap data from results_all3/headline_bootstrap.json */
  var PID_SCENARIOS = {
    regulatory: {
      label: 'Regulatory withdrawal (sustained)',
      baseRatio: 3.19, baseCI: [1.32, 5.34], baseStaticCV: 0.307, basePidCV: 0.096, baseStaticN: 7138, basePidN: 8343,
      opRatio: 6.41, opCI: [4.14, 9.46], opStaticCV: 0.513, opPidCV: 0.080, opStaticN: 4558, opPidN: 8667,
      delta: '+3.22x', deltaSub: '95% CI [+0.10x, +6.85x] · Widens under sustained withdrawal'
    },
    competitor: {
      label: 'Competitor shock (one-off month 18)',
      baseRatio: 5.53, baseCI: [3.16, 8.21], baseStaticCV: 0.520, basePidCV: 0.094, baseStaticN: 5471, basePidN: 8827,
      opRatio: 5.37, opCI: [3.51, 7.67], opStaticCV: 0.459, opPidCV: 0.085, opStaticN: 4722, opPidN: 9389,
      delta: '-0.16x', deltaSub: '95% CI [-3.47x, +2.83x] · Null change (controller already absorbs shock)'
    },
    bear: {
      label: 'Bear market (prolonged price contraction)',
      baseRatio: 4.34, baseCI: [2.72, 6.23], baseStaticCV: 0.371, basePidCV: 0.085, baseStaticN: 6683, basePidN: 8741,
      opRatio: 4.95, opCI: [3.31, 7.02], opStaticCV: 0.443, opPidCV: 0.089, opStaticN: 4912, opPidN: 8914,
      delta: '+0.61x', deltaSub: '95% CI [-1.84x, +3.12x] · Tight tracking preserved in both arms'
    }
  };

  function initB4Explorer(){
    var root = document.getElementById('b4-oprisk-explorer');
    if(!root) return;

    var tauInput = document.getElementById('b4-tau');
    var deltaInput = document.getElementById('b4-delta');
    var tauValEl = document.getElementById('b4-tau-val');
    var deltaValEl = document.getElementById('b4-delta-val');
    var mRep = document.getElementById('b4-m-rep');
    var mRepSub = document.getElementById('b4-m-rep-sub');
    var mVote = document.getElementById('b4-m-vote');
    var mVoteSub = document.getElementById('b4-m-vote-sub');
    var mClear = document.getElementById('b4-m-clear');
    var mClearSub = document.getElementById('b4-m-clear-sub');
    var repSvg = document.getElementById('b4-rep-svg');
    var pidSvg = document.getElementById('b4-pid-svg');

    var curScen = 'regulatory';

    function renderReputation(){
      var tIdx = tauInput ? parseInt(tauInput.value, 10) || 0 : 0;
      var dIdx = deltaInput ? parseInt(deltaInput.value, 10) || 5 : 5;
      var tRow = TAU_STEPS[tIdx] || TAU_STEPS[0];
      var dRow = DELTA_STEPS[dIdx] || DELTA_STEPS[5];

      /* Scale reputation when incident penalty delta_rep varies relative to baseline 0.25 */
      var deltaScale = dRow.repAt99 / 0.1753;
      var adjRep = Math.min(5.0, tRow.rep * (tIdx === 0 ? deltaScale : (1 + (deltaScale - 1) * 0.38)));
      var voteMult = Math.pow(1 + adjRep, 2);

      if(tauValEl) tauValEl.textContent = tRow.tau.toFixed(2) + (tRow.tau === 0.99 ? ' (default)' : (tRow.tau === 0.95 ? ' (recommended)' : ''));
      if(deltaValEl) deltaValEl.textContent = dRow.delta.toFixed(2) + (dRow.delta === 0.25 ? ' (baseline)' : '');

      if(mRep) mRep.textContent = adjRep.toFixed(2);
      if(mRepSub){
        if(adjRep < 0.45){
          mRepSub.textContent = 'Collapsed (governance disabled; baseline 0.28 without op-risk)';
        } else if(adjRep < 1.15){
          mRepSub.textContent = 'Restored (~1.0 steady state; ' + (tRow.active * 100).toFixed(1) + '% operators above floor)';
        } else {
          mRepSub.textContent = 'High recovery (' + (tRow.active * 100).toFixed(1) + '% operators active; steady state ~' + adjRep.toFixed(1) + ')';
        }
      }
      if(mVote) mVote.textContent = voteMult.toFixed(2) + 'x';
      if(mVoteSub) mVoteSub.textContent = 'At R = ' + adjRep.toFixed(2) + ' vs 1.00x floor (36.0x ceiling at R = 5.0)';
      if(mClear) mClear.textContent = (tRow.clearCoded * 100).toFixed(1) + '%';
      if(mClearSub){
        mClearSub.textContent = 'As-coded episodic (1.1d mean) · ' +
          (tRow.clearDrawn * 100).toFixed(1) + '% drawn (1.5d) · ' +
          (tRow.clearBinom * 100).toFixed(1) + '% binomial (0.45d)';
      }

      if(!repSvg) return;
      var W = 880, H = 290, padL = 56, padR = 54, padT = 24, padB = 42;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var maxRep = 2.5;

      function xOf(i){ return padL + (i / (TAU_STEPS.length - 1)) * plotW; }
      function yRep(v){ return padT + plotH - (Math.min(maxRep, v) / maxRep) * plotH; }
      function yPct(p){ return padT + plotH - p * plotH; }

      var svg = '';
      /* Horizontal grid lines */
      [0, 0.5, 1.0, 1.5, 2.0, 2.5].forEach(function(gv){
        var y = yRep(gv).toFixed(1);
        var pct = Math.round((gv / maxRep) * 100);
        svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3 3"/>';
        svg += '<text x="' + (padL - 8) + '" y="' + (parseFloat(y) + 4) + '" text-anchor="end" font-size="11" fill="currentColor" opacity="0.65">' + gv.toFixed(1) + '</text>';
        svg += '<text x="' + (W - padR + 8) + '" y="' + (parseFloat(y) + 4) + '" text-anchor="start" font-size="11" fill="currentColor" opacity="0.65">' + pct + '%</text>';
      });

      /* Paths for Reputation (baseline delta=0.25), Adjusted Reputation, and As-Coded Clearance % */
      var repPath = '', codedPath = '', drawnPath = '';
      TAU_STEPS.forEach(function(s, i){
        var x = xOf(i).toFixed(1);
        var rVal = Math.min(maxRep, s.rep * (i === 0 ? deltaScale : (1 + (deltaScale - 1) * 0.38)));
        repPath += (i === 0 ? 'M' : 'L') + x + ',' + yRep(rVal).toFixed(1) + ' ';
        codedPath += (i === 0 ? 'M' : 'L') + x + ',' + yPct(s.clearCoded).toFixed(1) + ' ';
        drawnPath += (i === 0 ? 'M' : 'L') + x + ',' + yPct(s.clearDrawn).toFixed(1) + ' ';
      });

      svg += '<path d="' + drawnPath + '" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>';
      svg += '<path d="' + codedPath + '" fill="none" stroke="#10b981" stroke-width="2.4"/>';
      svg += '<path d="' + repPath + '" fill="none" stroke="#b45309" stroke-width="3"/>';

      /* Highlight active tau column */
      var selX = xOf(tIdx).toFixed(1);
      var selYRep = yRep(adjRep).toFixed(1);
      var selYCoded = yPct(tRow.clearCoded).toFixed(1);
      svg += '<line x1="' + selX + '" y1="' + padT + '" x2="' + selX + '" y2="' + (H - padB) + '" stroke="#b45309" stroke-width="1.5" stroke-dasharray="4 3"/>';
      svg += '<circle cx="' + selX + '" cy="' + selYRep + '" r="5.5" fill="#b45309"/>';
      svg += '<circle cx="' + selX + '" cy="' + selYCoded + '" r="5" fill="#10b981"/>';

      /* X-axis ticks */
      TAU_STEPS.forEach(function(s, i){
        var x = xOf(i).toFixed(1);
        var bold = i === tIdx ? ' font-weight="700" opacity="1"' : ' opacity="0.7"';
        svg += '<text x="' + x + '" y="' + (H - 16) + '" text-anchor="middle" font-size="11.5" fill="currentColor"' + bold + '>' + s.tau.toFixed(2) + '</text>';
      });

      /* Legend */
      svg += '<g transform="translate(' + (padL + 8) + ',' + (padT + 8) + ')" font-size="11.5" fill="currentColor">' +
        '<rect x="0" y="-9" width="12" height="3" fill="#b45309"/><text x="17" y="-4">Year-5 avg reputation (left axis, 0 to 2.5)</text>' +
        '<rect x="255" y="-9" width="12" height="3" fill="#10b981"/><text x="272" y="-4">Count-rule clearance as coded (right axis, %)</text>' +
        '<rect x="545" y="-9" width="12" height="2" fill="#94a3b8"/><text x="562" y="-4">Drawn-duration clearance (%)</text>' +
        '</g>';

      repSvg.innerHTML = svg;
    }

    function renderPid(){
      var s = PID_SCENARIOS[curScen] || PID_SCENARIOS.regulatory;
      var baseRatioEl = document.getElementById('b4-p-base-ratio');
      var baseSubEl = document.getElementById('b4-p-base-sub');
      var opRatioEl = document.getElementById('b4-p-op-ratio');
      var opSubEl = document.getElementById('b4-p-op-sub');
      var deltaEl = document.getElementById('b4-p-delta');
      var deltaSubEl = document.getElementById('b4-p-delta-sub');

      if(baseRatioEl) baseRatioEl.textContent = s.baseRatio.toFixed(2) + 'x';
      if(baseSubEl) baseSubEl.textContent = 'Static CV ' + s.baseStaticCV.toFixed(3) + ' vs PID CV ' + s.basePidCV.toFixed(3) + ' · 95% CI [' + s.baseCI[0].toFixed(2) + 'x, ' + s.baseCI[1].toFixed(2) + 'x]';
      if(opRatioEl) opRatioEl.textContent = s.opRatio.toFixed(2) + 'x';
      if(opSubEl) opSubEl.textContent = 'Static CV ' + s.opStaticCV.toFixed(3) + ' vs PID CV ' + s.opPidCV.toFixed(3) + ' · 95% CI [' + s.opCI[0].toFixed(2) + 'x, ' + s.opCI[1].toFixed(2) + 'x]';
      if(deltaEl) deltaEl.textContent = s.delta;
      if(deltaSubEl) deltaSubEl.textContent = s.deltaSub;

      if(!pidSvg) return;
      var W = 880, H = 260, padL = 190, padR = 90, barW = W - padL - padR;
      var maxCV = 0.60;
      function wOf(cv){ return Math.max(4, (cv / maxCV) * barW); }

      var rows = [
        { label: 'Economic-only · Static', cv: s.baseStaticCV, n: s.baseStaticN, color: '#94a3b8' },
        { label: 'Economic-only · PID', cv: s.basePidCV, n: s.basePidN, color: '#0ea5e9' },
        { label: 'With op-risk · Static', cv: s.opStaticCV, n: s.opStaticN, color: '#dc2626' },
        { label: 'With op-risk · PID', cv: s.opPidCV, n: s.opPidN, color: '#10b981' }
      ];

      var svg = '';
      rows.forEach(function(r, idx){
        var y = 34 + idx * 50;
        var bw = wOf(r.cv).toFixed(1);
        svg += '<text x="' + (padL - 12) + '" y="' + (y + 18) + '" text-anchor="end" font-size="12.5" font-weight="600" fill="currentColor">' + r.label + '</text>';
        svg += '<rect x="' + padL + '" y="' + y + '" width="' + barW + '" height="26" rx="4" fill="currentColor" fill-opacity="0.06"/>';
        svg += '<rect x="' + padL + '" y="' + y + '" width="' + bw + '" height="26" rx="4" fill="' + r.color + '"/>';
        svg += '<text x="' + (padL + parseFloat(bw) + 10) + '" y="' + (y + 18) + '" font-size="12" font-weight="600" fill="currentColor">CV ' + r.cv.toFixed(3) + ' (mean N = ' + r.n.toLocaleString() + ')</text>';
      });

      pidSvg.innerHTML = svg;
    }

    if(tauInput) tauInput.addEventListener('input', renderReputation);
    if(deltaInput) deltaInput.addEventListener('input', renderReputation);

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-b4-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-b4-tab');
        root.querySelectorAll('button[data-b4-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pRep = document.getElementById('b4-panel-reputation');
        var pPid = document.getElementById('b4-panel-pid');
        if(pRep) pRep.hidden = target !== 'reputation';
        if(pPid) pPid.hidden = target !== 'pid';
        if(target === 'pid') renderPid(); else renderReputation();
        return;
      }
      var scenBtn = e.target.closest('button[data-b4-scen]');
      if(scenBtn){
        curScen = scenBtn.getAttribute('data-b4-scen') || 'regulatory';
        root.querySelectorAll('button[data-b4-scen]').forEach(function(b){
          var on = b === scenBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderPid();
      }
    });

    renderReputation();
    renderPid();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initB4Explorer);
  } else {
    initB4Explorer();
  }
})();

/* ==========================================================================
   Governance Concentration & Delegation Explorer (/papers/governance-concentration/)
   ========================================================================== */
(function(){
  'use strict';

  /* Exact protocol holding HHI values from Table 3 & Section 4.6.2 (Frontiers in Blockchain 9:1853465) */
  var B2_PROTOCOLS = [
    { name: 'Livepeer (LPT)', sec: 'DePIN', pca: 0.1989, uniform: 0.0330, nocex: 0.1989, raw: 0.2450, top10: '73.7%', note: 'Pass-through staking 0.199 vs uniform 0.033' },
    { name: 'WeatherXM (WXM)', sec: 'DePIN', pca: 0.1479, uniform: 0.1479, nocex: 0.1540, raw: 0.2180, top10: '77.9%', note: 'Top-1 holder 35.0% post-PCA' },
    { name: 'Aethir (ATH)', sec: 'DePIN', pca: 0.1001, uniform: 0.1001, nocex: 0.1120, raw: 0.2640, top10: '60.1%', note: '8 PCA + 3 CEX exclusions' },
    { name: 'Helium (HNT)', sec: 'DePIN', pca: 0.0988, uniform: 0.0988, nocex: 0.1080, raw: 0.1890, top10: '75.3%', note: 'Solana SPL via Helius DAS' },
    { name: 'Pokt Network (POKT)', sec: 'DePIN', pca: 0.0899, uniform: 0.0899, nocex: 0.0940, raw: 0.1620, top10: '66.7%', note: 'DePIN RPC infrastructure' },
    { name: 'IoTeX (IOTX)', sec: 'DePIN', pca: 0.0810, uniform: 0.0810, nocex: 0.0890, raw: 0.1750, top10: '80.9%', note: '8 PCA exclusions' },
    { name: 'GEODNET (GEOD)', sec: 'DePIN', pca: 0.0605, uniform: 0.0605, nocex: 0.0640, raw: 0.1280, top10: '62.3%', note: '4 PCA exclusions; S2R companion' },
    { name: 'Morpheus AI (MOR)', sec: 'DePIN', pca: 0.0464, uniform: 0.0464, nocex: 0.0490, raw: 0.1140, top10: '55.4%', note: '3 PCA exclusions' },
    { name: 'io.net (IO)', sec: 'DePIN', pca: 0.0402, uniform: 0.0402, nocex: 0.0480, raw: 0.1190, top10: '54.1%', note: 'Solana GPU network' },
    { name: 'Grass (GRASS)', sec: 'DePIN', pca: 0.0352, uniform: 0.0352, nocex: 0.0420, raw: 0.1320, top10: '38.2%', note: 'Raw 0.132 -> 0.035 post-PCA (3.8x)' },
    { name: 'Render (RENDER)', sec: 'DePIN', pca: 0.0273, uniform: 0.0273, nocex: 0.0390, raw: 0.4910, top10: '43.3%', note: 'Max ~18x raw inflation (Wormhole bridge)' },
    { name: 'DIMO (DIMO)', sec: 'DePIN', pca: 0.0249, uniform: 0.0249, nocex: 0.0290, raw: 0.3050, top10: '39.3%', note: 'Raw 0.305 -> 0.025 post-PCA (12.2x)' },
    { name: 'Filecoin (FIL)', sec: 'DePIN', pca: 0.0221, uniform: 0.0221, nocex: 0.0280, raw: 0.0640, top10: '35.6%', note: 'Decentralized storage network' },
    { name: 'Hivemapper (HONEY)', sec: 'DePIN', pca: 0.0200, uniform: 0.0200, nocex: 0.0240, raw: 0.0720, top10: '32.7%', note: 'Low-HHI DePIN counterexample' },
    { name: 'Anyone Protocol', sec: 'DePIN', pca: 0.0130, uniform: 0.0130, nocex: 0.0160, raw: 0.0480, top10: '30.2%', note: 'Lowest DePIN HHI (0.013)' },
    { name: 'GMX (GMX)', sec: 'DeFi', pca: 0.0647, uniform: 0.0520, nocex: 0.0690, raw: 0.1480, top10: '59.3%', note: 'Highest governance DeFi HHI' },
    { name: 'Jupiter (JUP)', sec: 'DeFi', pca: 0.0450, uniform: 0.0450, nocex: 0.0540, raw: 0.1650, top10: '58.3%', note: 'Solana DeFi aggregator' },
    { name: 'Gnosis (GNO)', sec: 'DeFi', pca: 0.0425, uniform: 0.0425, nocex: 0.0460, raw: 0.1120, top10: '51.7%', note: 'EVM DAO treasury & infra' },
    { name: 'Rocket Pool (RPL)', sec: 'DeFi', pca: 0.0406, uniform: 0.0360, nocex: 0.0440, raw: 0.0920, top10: '52.6%', note: 'Liquid staking governance' },
    { name: 'MakerDAO (MKR)', sec: 'DeFi', pca: 0.0404, uniform: 0.0404, nocex: 0.0470, raw: 0.0980, top10: '50.6%', note: '2017 launch; mature DeFi' },
    { name: 'Frax Finance (FXS)', sec: 'DeFi', pca: 0.0324, uniform: 0.0310, nocex: 0.0380, raw: 0.1180, top10: '50.3%', note: 'veFXS lockup 11.4x amplification' },
    { name: 'Balancer (BAL)', sec: 'DeFi', pca: 0.0290, uniform: 0.0290, nocex: 0.0340, raw: 0.0880, top10: '35.2%', note: 'veBAL lockup ~21x amplification' },
    { name: 'Drift (DRIFT)', sec: 'DeFi', pca: 0.0265, uniform: 0.0265, nocex: 0.0330, raw: 0.4190, top10: '37.5%', note: 'Raw 0.419 -> 0.026 post-PCA (16.1x)' },
    { name: 'Synthetix (SNX)', sec: 'DeFi', pca: 0.0171, uniform: 0.0171, nocex: 0.0230, raw: 0.0740, top10: '36.5%', note: 'EVM derivatives governance' },
    { name: 'Curve (CRV)', sec: 'DeFi', pca: 0.0146, uniform: 0.0146, nocex: 0.0210, raw: 0.1420, top10: '31.5%', note: 'Post-Convex raw CRV; veCRV ~0.26' },
    { name: 'Aave (AAVE)', sec: 'DeFi', pca: 0.0128, uniform: 0.0115, nocex: 0.0190, raw: 0.0840, top10: '27.5%', note: 'stkAAVE pass-through treated' },
    { name: 'Uniswap (UNI)', sec: 'DeFi', pca: 0.0100, uniform: 0.0100, nocex: 0.0160, raw: 0.0620, top10: '22.9%', note: 'Post 0xdead burn exclusion (11.3%)' },
    { name: 'Compound (COMP)', sec: 'DeFi', pca: 0.0086, uniform: 0.0086, nocex: 0.0140, raw: 0.0540, top10: '19.4%', note: '2018 launch; HHI 0.009' },
    { name: 'Lido (LDO)', sec: 'DeFi', pca: 0.0077, uniform: 0.0077, nocex: 0.0130, raw: 0.0490, top10: '18.3%', note: '9 PCA exclusions' },
    { name: 'Hyperliquid (HYPE)', sec: 'DeFi', pca: 0.0066, uniform: 0.0066, nocex: 0.0090, raw: 0.0950, top10: '18.2%', note: 'Post Assistance Fund exclusion' },
    { name: 'Algorand (ALGO)', sec: 'Infra', pca: 0.0591, uniform: 0.0591, nocex: 0.0680, raw: 0.1340, top10: '54.6%', note: 'GP1 to GP15 governance series' },
    { name: 'ENS (ENS)', sec: 'Infra', pca: 0.0463, uniform: 0.0463, nocex: 0.0510, raw: 0.1290, top10: '38.6%', note: 'Dispersing delegate design (0.48x)' },
    { name: 'Polygon (POL)', sec: 'Infra', pca: 0.0358, uniform: 0.0320, nocex: 0.0430, raw: 0.1150, top10: '49.4%', note: 'L2 / ecosystem staking' },
    { name: 'Axelar (AXL)', sec: 'Infra', pca: 0.0231, uniform: 0.0231, nocex: 0.0290, raw: 0.0820, top10: '38.6%', note: 'Cross-chain infrastructure' },
    { name: 'The Graph (GRT)', sec: 'Infra', pca: 0.0214, uniform: 0.0195, nocex: 0.0270, raw: 0.0790, top10: '32.9%', note: 'Indexing protocol' },
    { name: 'LayerZero (ZRO)', sec: 'Infra', pca: 0.0143, uniform: 0.0143, nocex: 0.0190, raw: 0.0680, top10: '29.9%', note: 'Omnichain messaging' },
    { name: 'Arbitrum (ARB)', sec: 'Infra', pca: 0.0122, uniform: 0.0122, nocex: 0.0180, raw: 0.0760, top10: '22.4%', note: '7 PCA exclusions; 3.1x delegation' },
    { name: 'Wormhole (W)', sec: 'Infra', pca: 0.0119, uniform: 0.0119, nocex: 0.0170, raw: 0.1260, top10: '18.5%', note: 'Raw 0.126 -> 0.012 post-PCA (10.5x)' },
    { name: 'Optimism (OP)', sec: 'Infra', pca: 0.0094, uniform: 0.0094, nocex: 0.0150, raw: 0.0690, top10: '21.1%', note: '7 PCA exclusions; 3.6x delegation' },
    { name: 'Bittensor (TAO)', sec: 'Infra', pca: 0.0075, uniform: 0.0075, nocex: 0.0110, raw: 0.0380, top10: '25.9%', note: '9.6x validator delegation ratio' },
    { name: 'Polkadot (DOT)', sec: 'Infra', pca: 0.0052, uniform: 0.0052, nocex: 0.0095, raw: 0.0310, top10: '21.0%', note: 'Lowest holding HHI (0.0052); 25.6x vote' }
  ];

  var B2_TREAT_META = {
    pca: {
      sector: '0.067 vs 0.026',
      sectorSub: '2.6x higher in DePIN (N = 15) than DeFi (N = 18) · L1/L2 Infra mean 0.022 · Kruskal-Wallis p = 0.005',
      test: 'd = 0.65 (p = 0.028)',
      testSub: 'Voter-inclusive pass-through of record (15 vs 15) · Powered Model 4 (N = 50) log-HHI p = 0.0107',
      mech: 'r = 0.09 vs \u03c1 = 0.44',
      mechSub: 'Launch insider share null (p = 0.55, TOST p = 0.02) · Top-holder insider retention \u03c1 = 0.44 (p = 0.005)'
    },
    uniform: {
      sector: '0.056 vs 0.025',
      sectorSub: 'Uniform staking-contract exclusion shifts Livepeer from 0.199 to 0.033 and removes outlier leverage',
      test: 'd = 0.75 (p = 0.018)',
      testSub: 'Stronger parametric & rank separation · 100,000-draw permutation p = 0.009 · LOO 30 of 30',
      mech: 'r = 0.09 vs \u03c1 = 0.44',
      mechSub: 'Sector ordering holds across both staking rules; DePIN remains significantly above DeFi'
    },
    nocex: {
      sector: '0.072 vs 0.032',
      sectorSub: 'Retaining 64 Nansen-labeled exchange wallets across 21 protocols adds sector-similar deposit noise',
      test: 'd \u2248 0.62 (p \u2248 0.04)',
      testSub: 'Attenuates effect size from 0.65 to ~0.62 (p \u2248 0.03 to 0.05) without reversing direction',
      mech: '64 CEX wallets in 21 tokens',
      mechSub: 'Centralized exchanges custody customer deposits and abstain from DAO governance'
    },
    raw: {
      sector: 'Median 2.3x inflation',
      sectorSub: 'Uncorrected top-1,000 holder lists conflate protocol architecture (bridges, treasuries, staking) with control',
      test: 'Up to ~18x (RENDER)',
      testSub: 'DRIFT 0.419 raw vs 0.026 post-PCA (16.1x) · DIMO 0.305 vs 0.025 (12.2x) · Wormhole 0.126 vs 0.012 (10.5x)',
      mech: '133 PCAs across 38 tokens',
      mechSub: 'Five-class PCA typology removes non-voting contracts before any governance metric is computed'
    }
  };

  /* Exact 18-protocol delegation + 3 vote-escrow dataset from Table 5 & Section 4.5.2 */
  var B2_DELEGATION = [
    { name: 'Polkadot (DOT)', group: 'amplify', hold: 0.0052, vote: 0.1330, ratio: 25.6, src: 'Subscan (239)' },
    { name: 'Balancer (veBAL)', group: 've', hold: 0.0290, vote: 0.6090, ratio: 21.0, src: 'veBAL lock (~21x)' },
    { name: 'Curve (veCRV)', group: 've', hold: 0.0146, vote: 0.2600, ratio: 15.0, src: 'veCRV top-50 (Convex 48%)' },
    { name: 'Frax (veFXS)', group: 've', hold: 0.0324, vote: 0.3690, ratio: 11.4, src: 'veFXS lock (11.4x)' },
    { name: 'Compound (COMP)', group: 'amplify', hold: 0.0086, vote: 0.0890, ratio: 9.9, src: 'Snapshot (138)' },
    { name: 'Bittensor (TAO)', group: 'amplify', hold: 0.0075, vote: 0.0720, ratio: 9.6, src: 'Taostats (75)' },
    { name: 'DIMO (DIMO)', group: 'amplify', hold: 0.0249, vote: 0.2280, ratio: 9.1, src: 'Snapshot (10)' },
    { name: 'Lido (LDO)', group: 'amplify', hold: 0.0077, vote: 0.0500, ratio: 6.3, src: 'Snapshot (333)' },
    { name: 'Synthetix (SNX)', group: 'amplify', hold: 0.0171, vote: 0.0950, ratio: 5.6, src: 'Snapshot (30)' },
    { name: 'Aave (AAVE)', group: 'amplify', hold: 0.0128, vote: 0.0580, ratio: 4.4, src: 'Tally (150,911)' },
    { name: 'WeatherXM (WXM)', group: 'amplify', hold: 0.1479, vote: 0.5560, ratio: 3.8, src: 'Snapshot (73)' },
    { name: 'Optimism (OP)', group: 'amplify', hold: 0.0094, vote: 0.0330, ratio: 3.6, src: 'Tally (1,000)' },
    { name: 'Arbitrum (ARB)', group: 'amplify', hold: 0.0122, vote: 0.0380, ratio: 3.1, src: 'Snapshot (5,466)' },
    { name: 'Drift (DRIFT)', group: 'amplify', hold: 0.0265, vote: 0.0830, ratio: 3.1, src: 'Solana VSR (641)' },
    { name: 'Uniswap (UNI)', group: 'amplify', hold: 0.0100, vote: 0.0270, ratio: 2.7, src: 'Tally (1,000)' },
    { name: 'Gnosis (GNO)', group: 'amplify', hold: 0.0425, vote: 0.1040, ratio: 2.5, src: 'Snapshot (481)' },
    { name: 'GMX (GMX)', group: 'disperse', hold: 0.0647, vote: 0.0570, ratio: 0.87, src: 'Tally (1,000)' },
    { name: 'ENS (ENS)', group: 'disperse', hold: 0.0463, vote: 0.0220, ratio: 0.48, src: 'Tally (1,000)' },
    { name: 'Helium (HNT)', group: 'disperse', hold: 0.0988, vote: 0.0325, ratio: 0.33, src: 'Solana VSR (1,835)' },
    { name: 'Livepeer (LPT)', group: 'disperse', hold: 0.1989, vote: 0.0540, ratio: 0.27, src: 'Orchestrators (100)' },
    { name: 'Jupiter (JUP)', group: 'disperse', hold: 0.0450, vote: 0.0055, ratio: 0.12, src: 'Solana del-vote (128,476)' }
  ];

  function initB2Explorer(){
    var root = document.getElementById('b2-gov-explorer');
    if(!root) return;

    var curTreat = 'pca';
    var curSec = 'all';
    var curDel = 'all';

    var secSvg = document.getElementById('b2-sector-svg');
    var delSvg = document.getElementById('b2-del-svg');

    function renderSector(){
      var meta = B2_TREAT_META[curTreat] || B2_TREAT_META.pca;
      var mSec = document.getElementById('b2-m-sector');
      var mSecSub = document.getElementById('b2-m-sector-sub');
      var mTest = document.getElementById('b2-m-test');
      var mTestSub = document.getElementById('b2-m-test-sub');
      var mMech = document.getElementById('b2-m-mech');
      var mMechSub = document.getElementById('b2-m-mech-sub');

      if(mSec) mSec.textContent = meta.sector;
      if(mSecSub) mSecSub.textContent = meta.sectorSub;
      if(mTest) mTest.textContent = meta.test;
      if(mTestSub) mTestSub.textContent = meta.testSub;
      if(mMech) mMech.textContent = meta.mech;
      if(mMechSub) mMechSub.textContent = meta.mechSub;

      if(!secSvg) return;

      var rows = B2_PROTOCOLS.filter(function(r){
        if(curSec === 'all') return true;
        return r.sec === curSec;
      }).slice();

      rows.sort(function(a, b){ return (b[curTreat] || 0) - (a[curTreat] || 0); });
      if(curSec === 'all'){
        /* Pick 15 representative protocols spanning top DePIN, DeFi, Infra, and counterexamples */
        var pickNames = {
          'Livepeer (LPT)': 1, 'WeatherXM (WXM)': 1, 'Aethir (ATH)': 1, 'Helium (HNT)': 1,
          'GMX (GMX)': 1, 'Algorand (ALGO)': 1, 'ENS (ENS)': 1, 'Jupiter (JUP)': 1,
          'Render (RENDER)': 1, 'Drift (DRIFT)': 1, 'DIMO (DIMO)': 1, 'Anyone Protocol': 1,
          'Arbitrum (ARB)': 1, 'Uniswap (UNI)': 1, 'Polkadot (DOT)': 1
        };
        rows = rows.filter(function(r){ return pickNames[r.name]; });
      } else {
        rows = rows.slice(0, 15);
      }

      var maxHHI = curTreat === 'raw' ? 0.52 : 0.26;
      var rowH = 22;
      var padT = 30, padB = 24, padL = 168, padR = 195;
      var W = 880, H = padT + rows.length * rowH + padB;
      var plotW = W - padL - padR;
      secSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      secSvg.setAttribute('height', String(H));

      function xOf(v){ return padL + (Math.min(maxHHI, v) / maxHHI) * plotW; }
      function colorForSec(s){
        if(s === 'DePIN') return '#0ea5e9';
        if(s === 'DeFi') return '#d97706';
        return '#10b981';
      }

      var svg = '';
      /* Grid ticks */
      var ticks = curTreat === 'raw' ? [0, 0.10, 0.25, 0.40, 0.50] : [0, 0.05, 0.10, 0.15, 0.20, 0.25];
      ticks.forEach(function(tv){
        var x = xOf(tv).toFixed(1);
        var isDoj = Math.abs(tv - 0.25) < 0.001;
        svg += '<line x1="' + x + '" y1="' + (padT - 6) + '" x2="' + x + '" y2="' + (H - padB) + '" stroke="' + (isDoj ? '#dc2626' : 'currentColor') + '" stroke-opacity="' + (isDoj ? '0.55' : '0.12') + '" stroke-dasharray="' + (isDoj ? '4 3' : '2 3') + '"/>';
        svg += '<text x="' + x + '" y="' + (padT - 11) + '" text-anchor="middle" font-size="10.5" fill="' + (isDoj ? '#dc2626' : 'currentColor') + '" opacity="' + (isDoj ? '0.9' : '0.65') + '">' + (isDoj ? '0.25 DOJ' : tv.toFixed(2)) + '</text>';
      });

      rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var val = r[curTreat] || 0;
        var pcaVal = r.pca;
        var bw = Math.max(3, xOf(val) - padL).toFixed(1);
        var col = colorForSec(r.sec);

        svg += '<text x="' + (padL - 10) + '" y="' + (y + 14) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + r.name + '</text>';
        svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + plotW + '" height="14" rx="3" fill="currentColor" fill-opacity="0.05"/>';
        svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + bw + '" height="14" rx="3" fill="' + col + '"/>';

        /* If not pca treatment, show ghost marker of canonical post-PCA HHI */
        if(curTreat !== 'pca'){
          var gx = xOf(pcaVal).toFixed(1);
          svg += '<line x1="' + gx + '" y1="' + (y + 1) + '" x2="' + gx + '" y2="' + (y + 19) + '" stroke="currentColor" stroke-width="2" stroke-opacity="0.75"/>';
        }

        var labelTxt = val.toFixed(3) + ' (' + r.sec + ' · Top-10: ' + r.top10 + ')';
        if(curTreat === 'raw' && pcaVal > 0){
          labelTxt = val.toFixed(3) + ' raw vs ' + pcaVal.toFixed(3) + ' PCA (' + (val / pcaVal).toFixed(1) + 'x)';
        }
        svg += '<text x="' + (padL + parseFloat(bw) + 8) + '" y="' + (y + 14) + '" font-size="11" fill="currentColor" opacity="0.88">' + labelTxt + '</text>';
      });

      secSvg.innerHTML = svg;
    }

    function renderDelegation(){
      if(!delSvg) return;
      var rows = B2_DELEGATION.filter(function(r){
        if(curDel === 'all') return true;
        return r.group === curDel;
      });

      var rowH = 21;
      var padT = 30, padB = 22, padL = 155, padR = 205;
      var W = 880, H = padT + rows.length * rowH + padB;
      var plotW = W - padL - padR;
      var maxV = 0.65;
      delSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      delSvg.setAttribute('height', String(H));

      function xOf(v){ return padL + (Math.min(maxV, v) / maxV) * plotW; }

      var svg = '';
      [0, 0.10, 0.25, 0.40, 0.60].forEach(function(tv){
        var x = xOf(tv).toFixed(1);
        var isDoj = Math.abs(tv - 0.25) < 0.001;
        svg += '<line x1="' + x + '" y1="' + (padT - 6) + '" x2="' + x + '" y2="' + (H - padB) + '" stroke="' + (isDoj ? '#dc2626' : 'currentColor') + '" stroke-opacity="' + (isDoj ? '0.5' : '0.12') + '" stroke-dasharray="3 3"/>';
        svg += '<text x="' + x + '" y="' + (padT - 11) + '" text-anchor="middle" font-size="10.5" fill="' + (isDoj ? '#dc2626' : 'currentColor') + '" opacity="0.75">' + (isDoj ? '0.25 DOJ' : tv.toFixed(2)) + '</text>';
      });

      rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var xHold = xOf(r.hold);
        var xVote = xOf(r.vote);
        var xMin = Math.min(xHold, xVote).toFixed(1);
        var spanW = Math.max(2, Math.abs(xVote - xHold)).toFixed(1);
        var col = r.group === 've' ? '#dc2626' : (r.group === 'amplify' ? '#d97706' : '#10b981');

        svg += '<text x="' + (padL - 10) + '" y="' + (y + 14) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + r.name + '</text>';
        svg += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + plotW + '" height="12" rx="3" fill="currentColor" fill-opacity="0.04"/>';
        /* Connector bar between holding HHI and voting HHI */
        svg += '<rect x="' + xMin + '" y="' + (y + 7) + '" width="' + spanW + '" height="6" rx="2" fill="' + col + '" fill-opacity="0.45"/>';
        /* Holding HHI circle (hollow) */
        svg += '<circle cx="' + xHold.toFixed(1) + '" cy="' + (y + 10) + '" r="4.2" fill="var(--bg)" stroke="currentColor" stroke-width="2"/>';
        /* Voting HHI circle (solid) */
        svg += '<circle cx="' + xVote.toFixed(1) + '" cy="' + (y + 10) + '" r="4.8" fill="' + col + '"/>';

        var rightX = Math.max(xHold, xVote) + 9;
        var ratioStr = r.ratio >= 1.0 ? (r.ratio.toFixed(1) + 'x amplify') : (r.ratio.toFixed(2) + 'x disperse');
        svg += '<text x="' + rightX.toFixed(1) + '" y="' + (y + 14) + '" font-size="11" font-weight="600" fill="currentColor">' + ratioStr + ' (hold ' + r.hold.toFixed(3) + ' \u2192 vote ' + r.vote.toFixed(3) + ')</text>';
      });

      delSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-b2-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-b2-tab');
        root.querySelectorAll('button[data-b2-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pSec = document.getElementById('b2-panel-sector');
        var pDel = document.getElementById('b2-panel-delegation');
        if(pSec) pSec.hidden = target !== 'sector';
        if(pDel) pDel.hidden = target !== 'delegation';
        if(target === 'delegation') renderDelegation(); else renderSector();
        return;
      }

      var treatBtn = e.target.closest('button[data-b2-treat]');
      if(treatBtn){
        curTreat = treatBtn.getAttribute('data-b2-treat') || 'pca';
        root.querySelectorAll('button[data-b2-treat]').forEach(function(b){
          var on = b === treatBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderSector();
        return;
      }

      var secBtn = e.target.closest('button[data-b2-sec]');
      if(secBtn){
        curSec = secBtn.getAttribute('data-b2-sec') || 'all';
        root.querySelectorAll('button[data-b2-sec]').forEach(function(b){
          var on = b === secBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderSector();
        return;
      }

      var delBtn = e.target.closest('button[data-b2-del]');
      if(delBtn){
        curDel = delBtn.getAttribute('data-b2-del') || 'all';
        root.querySelectorAll('button[data-b2-del]').forEach(function(b){
          var on = b === delBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderDelegation();
      }
    });

    renderSector();
    renderDelegation();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initB2Explorer);
  } else {
    initB2Explorer();
  }
})();

/* ==========================================================================
   Three Tokenization Strategies Dependency & Outage Matrix (/papers/three-strategies/)
   ========================================================================== */
(function(){
  'use strict';

  var MVEP_CATS = [
    '1. Rights parity',
    '2. System of record',
    '3. Reconciliation',
    '4. Custody',
    '5. Insolvency',
    '6. Settlement finality',
    '7. Reorg / exception',
    '8. Governance',
    '9. Disclosures',
    '10. Collateral operability'
  ];

  /* Base cell text from Section 9 Table (MVEP Application Across Strategies) */
  var S1_BASE = ['DTC securities', 'DTC register', 'Canton atomic', 'DTC / BNY', 'SIPA + DTC', 'JPMD + Canton', 'Canton consensus', 'DTC + banks', 'DTC framework', '24/7 3-path'];
  var S2_BASE = ['Fund share rights', 'Multi-TA / Oasis', '5 x 3 chains', 'Multi-custodian', 'By underlying', 'Chain-dependent', 'Bridge / multi', 'Router multisig', 'Composed NAV', 'Multi-pool router'];
  var S3_BASE = ['SEC same-CUSIP', 'DTC + digital TA', 'Corp-action gap', 'DTC custody', 'SIPA NMS', 'T+1 or NYSE T+0', 'Nasdaq / NYSE', 'Exchange rules', 'SEC disclosures', 'Venue whitelist'];

  /* Status codes per strategy x MVEP category (0 = unaffected, 1 = active dependency, 2 = primary outage failure) */
  var A4_ENTITIES = {
    securitize: {
      span: '3 of 3 strategies',
      spanSub: 'Transfer agent for BUIDL (S1 & S2) and first digital TA on NYSE Digital Trading Platform (S3; NYSE: SECZ)',
      scen: 'System-wide TA freeze',
      scenSub: 'Scenario 3C + Section 5: 72-hour outage halts minting, burning, and register updates across all three strategies simultaneously',
      mvep: 'Cat. 2 \u2192 Cat. 10',
      mvepSub: 'System of record (Cat. 2) freezes; collateral operability (Cat. 10) degrades; no fallback digital TA documented',
      s1: [0, 2, 1, 0, 0, 1, 0, 0, 1, 2],
      s2: [0, 2, 1, 0, 0, 0, 0, 0, 1, 1],
      s3: [1, 2, 2, 0, 0, 1, 0, 0, 1, 2]
    },
    dtc: {
      span: '2 of 3 strategies',
      spanSub: 'Authoritative securities register and custody backbone (>$100T) via ComposerX in Strategy 1 and Strategy 3',
      scen: 'Scenario 1A & 3A',
      scenSub: 'Overnight Canton node consensus failure (1A) or weekend corporate-actions record-date divergence (3A)',
      mvep: 'Cat. 2, 4, 6 \u2192 Cat. 10',
      mvepSub: 'DTC custody (Cat. 4) and register (Cat. 2) anchor S1 and S3; overnight disruption forces fallback to T+1 Monday rails',
      s1: [1, 2, 2, 1, 1, 2, 1, 1, 1, 2],
      s2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s3: [1, 2, 2, 1, 1, 1, 0, 1, 1, 1]
    },
    ubyx: {
      span: '2 of 3 strategies',
      spanSub: 'Many-to-many par-value clearing layer between deposit tokens (JPMD, BNY, Citi) and stablecoins (USDC)',
      scen: 'Cash-leg fragmentation',
      scenSub: 'Scenario 1B mitigation: without Ubyx multi-issuer depth, cash settlement tips toward single-bank concentration',
      mvep: 'Cat. 6 & Cat. 10',
      mvepSub: 'Governs par-value singleness of money and IAS 7 cash-equivalent accounting across deposit-token issuers',
      s1: [0, 0, 1, 0, 1, 2, 0, 0, 0, 2],
      s2: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      s3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    canton: {
      span: '2 of 3 strategies',
      spanSub: 'Permissioned-public-hybrid L1 providing atomic DvP settlement in Strategy 1 and institutional deployment in Strategy 2',
      scen: 'Scenario 1A consensus halt',
      scenSub: 'At 2:47 AM Saturday, a Canton validator disruption halts atomic DvP settlement during overnight margin calls',
      mvep: 'Cat. 3, 6, 7 \u2192 Cat. 10',
      mvepSub: 'Atomic settlement (Cat. 6) and consensus (Cat. 7) fail first; requires secondary-rail bridge attestation fallback',
      s1: [0, 1, 2, 0, 0, 2, 2, 1, 0, 2],
      s2: [0, 0, 1, 0, 0, 1, 1, 0, 0, 1],
      s3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    bny: {
      span: '3 of 3 strategies',
      spanSub: 'Tokenized deposits (Jan 9, 2026), BUIDL Treasury custodian (S1 & S2), and ICE clearinghouse margin bank (S3)',
      scen: 'Scenario 2C custodian stress',
      scenSub: 'Correlated Treasury-custodian restriction degrades underlying MMF liquidity while halting ICE clearing margin leg',
      mvep: 'Cat. 4, 5 & Cat. 6',
      mvepSub: 'Keeps custody-to-settlement chain inside one regulated bank; S1 custody fee capture ~12 to 20 bps',
      s1: [0, 0, 0, 1, 1, 1, 0, 1, 0, 1],
      s2: [0, 0, 0, 2, 1, 0, 0, 0, 0, 2],
      s3: [0, 0, 0, 0, 1, 1, 0, 0, 0, 1]
    },
    jpmd: {
      span: '1 of 3 strategies (primary)',
      spanSub: 'Kinexys USD deposit token (live on Base; native Canton issuance announced Jan 7, 2026) + BENJI custodian in S2',
      scen: 'Scenario 1B single-bank outage',
      scenSub: '100% single-bank deposit exposure on JPMD cash leg; Kinexys outage stops cash settlement unless Ubyx reroutes',
      mvep: 'Cat. 5 & Cat. 6',
      mvepSub: 'Binding Cat. 5 question: depositor status vs unsecured payment-instrument creditor in bank resolution',
      s1: [0, 0, 0, 0, 2, 2, 0, 1, 0, 2],
      s2: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      s3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    citi: {
      span: '2 of 3 strategies',
      spanSub: 'Tokenized deposits for ICE clearinghouse margin (S3) and third deposit-token leg in Ubyx clearing (S1)',
      scen: 'Clearinghouse margin leg',
      scenSub: 'Provides multi-issuer redundancy alongside JPMD and BNY for Ubyx par clearing and NYSE/ICE 24/7 funding',
      mvep: 'Cat. 5, 6 & Cat. 10',
      mvepSub: 'Expands deposit-token competition so settlement-layer rent is competed away at par',
      s1: [0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
      s2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s3: [0, 0, 0, 0, 1, 1, 0, 0, 0, 1]
    },
    ondo: {
      span: '2 of 3 strategies',
      spanSub: 'OUSG InstantManager ($50M/24h cap) + Oasis Pro SEC-registered TA/ATS/BD (S2) and Ondo Global Markets (S3)',
      scen: 'Scenario 2A & 2B',
      scenSub: 'Smart redemption router pause (2A) or yield-normalization NAV delta >5 bps across 5 issuers (2B)',
      mvep: 'Cat. 2, 3, 8 \u2192 Cat. 10',
      mvepSub: 'Oasis Pro acquisition closes the wrapper Cat. 2 TA gap; router multisig (Cat. 8) is S2 sole critical dependency',
      s1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s2: [1, 1, 2, 0, 0, 2, 1, 2, 1, 2],
      s3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    },
    nasdaq: {
      span: '1 of 3 strategies',
      spanSub: 'SEC-approved tokenized equities trading (Release 34-105047, March 18, 2026); same CUSIP and order book; Kraken gateway',
      scen: 'Scenario 3B venue arbitrage',
      scenSub: 'T+1 DTC settlement on Nasdaq vs T+0 instant settlement on NYSE creates cross-venue holder ambiguity',
      mvep: 'Cat. 1, 3 & Cat. 6',
      mvepSub: 'Preserves SIPA and SEC rights parity (Cat. 1) using Architecture C dual-record synchronization with DTC priority',
      s1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s3: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1]
    },
    nyse: {
      span: '1 of 3 strategies',
      spanSub: 'Digital Trading Platform (Securitize MoU March 24, 2026) targeting 24/7 T+0 trading with stablecoin and deposit-token funding',
      scen: 'Scenario 3B & 3C',
      scenSub: 'T+0 vs T+1 cross-venue finality divergence (3B) and single-TA reliance on Securitize with no secondary digital TA (3C)',
      mvep: 'Cat. 2, 6 & Cat. 7',
      mvepSub: 'Instant T+0 settlement requires continuous weekend corporate-action synchronization and multi-TA redundancy',
      s1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s3: [1, 2, 2, 0, 1, 2, 2, 1, 1, 2]
    }
  };

  var A4_CORP_ARCH = {
    halt: {
      reg: 'DTC snapshot only',
      regSub: 'On-chain transfers pause before the record-date cutoff; DTC and blockchain registers match by construction',
      trade: 'Suspended at window',
      tradeSub: 'Eliminates record-date divergence (Scenario 3A) by sacrificing continuous weekend liquidity during splits and dividends',
      rule: 'Fits existing SEC rules',
      ruleSub: 'Strong Cat. 2 & Cat. 3 (no divergence); weakens Cat. 10 (24/7 collateral operability paused during corporate actions)',
      weekendState: 'Trading halted Fri 4:00 PM to Mon 9:30 AM (0 weekend transfers)',
      weekendColor: '#d97706',
      mondayState: 'DTC & on-chain holder records identical (Holder A = Holder A); zero reconciliation dispute'
    },
    chain: {
      reg: 'Blockchain ledger primary',
      regSub: 'On-chain holder at the exact record-date block height is authoritative; DTC reconciles downstream to the chain',
      trade: 'Continuous 24/7 trading',
      tradeSub: 'Tokenized shares trade uninterrupted across all 6 weekend transfers; atomic smart-contract split at target block',
      rule: 'Requires new SEC rules',
      ruleSub: 'Eliminates dual-record conflict (Cat. 3) and preserves 24/7 operability (Cat. 10), but reverses DTC statutory hierarchy',
      weekendState: '24/7 trading active (6 weekend transfers settle natively on-chain)',
      weekendColor: '#10b981',
      mondayState: 'Blockchain block snapshot defines record holder (Holder G); DTC updates from chain'
    },
    dual: {
      reg: 'DTC priority + sync',
      regSub: 'Implicit model in Nasdaq SR-NASDAQ-2025-072: DTC remains authoritative; blockchain is the alternative record',
      trade: '24/7 with divergence window',
      tradeSub: '6 weekend on-chain transfers create a 65-hour window where on-chain holder (G) and Friday DTC holder (A) diverge',
      rule: 'Requires dispute protocol',
      ruleSub: 'Preserves current statutory hierarchy but requires continuous Cat. 3 reconciliation and ex-date claim adjudication',
      weekendState: '24/7 trading active, but DTC snapshot stays frozen at Friday close (65h divergence)',
      weekendColor: '#dc2626',
      mondayState: 'Divergence at open: DTC shows Holder A while blockchain shows Holder G; requires T+1 adjudication'
    }
  };

  function initA4Explorer(){
    var root = document.getElementById('a4-strategy-explorer');
    if(!root) return;

    var curEnt = 'securitize';
    var curArch = 'halt';
    var outSvg = document.getElementById('a4-outage-svg');
    var corpSvg = document.getElementById('a4-corp-svg');

    function renderOutage(){
      var d = A4_ENTITIES[curEnt] || A4_ENTITIES.securitize;
      var mSpan = document.getElementById('a4-m-span');
      var mSpanSub = document.getElementById('a4-m-span-sub');
      var mScen = document.getElementById('a4-m-scen');
      var mScenSub = document.getElementById('a4-m-scen-sub');
      var mMvep = document.getElementById('a4-m-mvep');
      var mMvepSub = document.getElementById('a4-m-mvep-sub');

      if(mSpan) mSpan.textContent = d.span;
      if(mSpanSub) mSpanSub.textContent = d.spanSub;
      if(mScen) mScen.textContent = d.scen;
      if(mScenSub) mScenSub.textContent = d.scenSub;
      if(mMvep) mMvep.textContent = d.mvep;
      if(mMvepSub) mMvepSub.textContent = d.mvepSub;

      if(!outSvg) return;
      var W = 880, H = 350, padL = 175, padT = 54, rowH = 27;
      var colW = (W - padL - 20) / 3;

      var svg = '';
      /* Legend & Column headers */
      var headers = [
        'Strategy 1: Collateral Circuit',
        'Strategy 2: Multi-Issuer Yield Stack',
        'Strategy 3: Tokenized Equity Rails'
      ];
      headers.forEach(function(h, c){
        var cx = padL + c * colW + colW / 2;
        svg += '<text x="' + cx.toFixed(1) + '" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">' + h + '</text>';
      });

      svg += '<g transform="translate(' + padL + ', 32)" font-size="10.5" fill="currentColor">' +
        '<rect x="0" y="0" width="11" height="11" rx="2" fill="#dc2626" fill-opacity="0.85"/><text x="15" y="9">Primary 72h outage failure point</text>' +
        '<rect x="205" y="0" width="11" height="11" rx="2" fill="#0ea5e9" fill-opacity="0.75"/><text x="220" y="9">Active entity dependency</text>' +
        '<rect x="385" y="0" width="11" height="11" rx="2" fill="currentColor" fill-opacity="0.08"/><text x="400" y="9">Independent / unaffected</text>' +
        '</g>';

      MVEP_CATS.forEach(function(cat, r){
        var y = padT + r * rowH;
        svg += '<text x="' + (padL - 10) + '" y="' + (y + 17) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + cat + '</text>';

        var states = [d.s1[r], d.s2[r], d.s3[r]];
        var texts = [S1_BASE[r], S2_BASE[r], S3_BASE[r]];
        states.forEach(function(st, c){
          var x = padL + c * colW + 4;
          var w = colW - 8;
          var fill = 'currentColor';
          var fOp = '0.06';
          var stroke = 'currentColor';
          var sOp = '0.12';
          var txtWeight = '500';
          var tag = '';
          if(st === 2){
            fill = '#dc2626'; fOp = '0.20'; stroke = '#dc2626'; sOp = '0.85'; txtWeight = '700'; tag = ' [FAIL]';
          } else if(st === 1){
            fill = '#0ea5e9'; fOp = '0.16'; stroke = '#0ea5e9'; sOp = '0.75'; txtWeight = '600'; tag = ' [DEP]';
          }
          svg += '<rect x="' + x.toFixed(1) + '" y="' + (y + 2) + '" width="' + w.toFixed(1) + '" height="' + (rowH - 4) + '" rx="4" fill="' + fill + '" fill-opacity="' + fOp + '" stroke="' + stroke + '" stroke-opacity="' + sOp + '"/>';
          svg += '<text x="' + (x + 10).toFixed(1) + '" y="' + (y + 17) + '" font-size="11" font-weight="' + txtWeight + '" fill="currentColor">' + texts[c] + tag + '</text>';
        });
      });

      outSvg.innerHTML = svg;
    }

    function renderCorp(){
      var a = A4_CORP_ARCH[curArch] || A4_CORP_ARCH.halt;
      var cReg = document.getElementById('a4-c-reg');
      var cRegSub = document.getElementById('a4-c-reg-sub');
      var cTrade = document.getElementById('a4-c-trade');
      var cTradeSub = document.getElementById('a4-c-trade-sub');
      var cRule = document.getElementById('a4-c-rule');
      var cRuleSub = document.getElementById('a4-c-rule-sub');

      if(cReg) cReg.textContent = a.reg;
      if(cRegSub) cRegSub.textContent = a.regSub;
      if(cTrade) cTrade.textContent = a.trade;
      if(cTradeSub) cTradeSub.textContent = a.tradeSub;
      if(cRule) cRule.textContent = a.rule;
      if(cRuleSub) cRuleSub.textContent = a.ruleSub;

      if(!corpSvg) return;
      var svg = '';
      /* Timeline header */
      svg += '<text x="140" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Fri 4:00 PM EST (Split Announced)</text>';
      svg += '<text x="440" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Weekend 24/7 Window (65 Hours)</text>';
      svg += '<text x="740" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Mon 9:30 AM EST (Record Date)</text>';

      /* Track 1: DTC Legacy Register */
      svg += '<text x="24" y="75" font-size="11.5" font-weight="700" fill="currentColor">DTC Register (T+1)</text>';
      svg += '<rect x="24" y="84" width="230" height="36" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/>';
      svg += '<text x="139" y="106" text-anchor="middle" font-size="11" fill="currentColor">EOD Snapshot: Holder A</text>';

      svg += '<rect x="266" y="84" width="348" height="36" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 3"/>';
      svg += '<text x="440" y="106" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Business-day batch closed (Holder A frozen)</text>';

      svg += '<rect x="626" y="84" width="230" height="36" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/>';
      svg += '<text x="741" y="106" text-anchor="middle" font-size="11" fill="currentColor">' + (curArch === 'chain' ? 'Reconciles to Chain (Holder G)' : 'Opens at Holder A') + '</text>';

      /* Track 2: Tokenized Equity Blockchain Ledger */
      svg += '<text x="24" y="155" font-size="11.5" font-weight="700" fill="currentColor">Blockchain Ledger (24/7)</text>';
      svg += '<rect x="24" y="164" width="230" height="36" rx="6" fill="#0ea5e9" fill-opacity="0.14" stroke="#0ea5e9" stroke-opacity="0.6"/>';
      svg += '<text x="139" y="186" text-anchor="middle" font-size="11" fill="currentColor">Block Snapshot: Holder A</text>';

      svg += '<rect x="266" y="164" width="348" height="36" rx="6" fill="' + a.weekendColor + '" fill-opacity="0.18" stroke="' + a.weekendColor + '" stroke-opacity="0.85"/>';
      svg += '<text x="440" y="186" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">' + a.weekendState + '</text>';

      svg += '<rect x="626" y="164" width="230" height="36" rx="6" fill="' + a.weekendColor + '" fill-opacity="0.14" stroke="' + a.weekendColor + '" stroke-opacity="0.7"/>';
      svg += '<text x="741" y="186" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">' + (curArch === 'halt' ? 'Resumes: Holder A' : 'Record Block: Holder G') + '</text>';

      /* Bottom Resolution Bar */
      svg += '<rect x="24" y="222" width="832" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>';
      svg += '<text x="440" y="246" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">Record-Date Outcome: ' + a.mondayState + '</text>';

      corpSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-a4-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-a4-tab');
        root.querySelectorAll('button[data-a4-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pOut = document.getElementById('a4-panel-outage');
        var pCorp = document.getElementById('a4-panel-corp');
        if(pOut) pOut.hidden = target !== 'outage';
        if(pCorp) pCorp.hidden = target !== 'corp';
        if(target === 'corp') renderCorp(); else renderOutage();
        return;
      }

      var entBtn = e.target.closest('button[data-a4-entity]');
      if(entBtn){
        curEnt = entBtn.getAttribute('data-a4-entity') || 'securitize';
        root.querySelectorAll('button[data-a4-entity]').forEach(function(b){
          var on = b === entBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderOutage();
        return;
      }

      var archBtn = e.target.closest('button[data-a4-arch]');
      if(archBtn){
        curArch = archBtn.getAttribute('data-a4-arch') || 'halt';
        root.querySelectorAll('button[data-a4-arch]').forEach(function(b){
          var on = b === archBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderCorp();
      }
    });

    renderOutage();
    renderCorp();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initA4Explorer);
  } else {
    initA4Explorer();
  }
})();

/* ==========================================================================
   GENIUS Act Rulemaking Tracker Filter & Search (/trackers/genius-act/)
   ========================================================================== */
(function(){
  'use strict';

  function initGeniusTracker(){
    var bar = document.getElementById('genius-tracker-toolbar');
    var table = document.querySelector('table.tracker-table');
    if(!bar || !table) return;

    var searchInput = document.getElementById('genius-tracker-search');
    var countWrap = document.getElementById('genius-tracker-count-wrap');
    var countEl = document.getElementById('genius-tracker-count');
    var resetBtn = document.getElementById('genius-tracker-reset');

    var allTrs = Array.prototype.slice.call(table.querySelectorAll('tbody > tr'));
    var items = [];
    for(var i = 0; i < allTrs.length; i++){
      var tr = allTrs[i];
      if(tr.classList.contains('letters-outcome-note')) continue;
      var noteTr = (i + 1 < allTrs.length && allTrs[i + 1].classList.contains('letters-outcome-note')) ? allTrs[i + 1] : null;
      var commented = tr.classList.contains('tracker-row--commented');
      var statusState = 'pending';
      if(tr.querySelector('.status-chip--open')) statusState = 'open';
      else if(tr.querySelector('.status-chip--final')) statusState = 'final';
      var agencyEl = tr.querySelector('.tracker-agency');
      var agencyTxt = agencyEl ? agencyEl.textContent : '';
      var fullTxt = (tr.textContent + ' ' + (noteTr ? noteTr.textContent : '')).toLowerCase();
      items.push({
        tr: tr,
        noteTr: noteTr,
        commented: commented,
        status: statusState,
        agencyTxt: agencyTxt,
        fullTxt: fullTxt
      });
    }

    var state = { status: 'all', coverage: 'all', agency: 'all' };
    var query = '';

    function apply(){
      var shown = 0;
      items.forEach(function(item){
        var ok = true;
        if(state.status !== 'all' && item.status !== state.status) ok = false;
        if(ok && state.coverage !== 'all'){
          if(state.coverage === 'commented' && !item.commented) ok = false;
          if(state.coverage === 'uncommented' && item.commented) ok = false;
        }
        if(ok && state.agency !== 'all'){
          if(state.agency === 'Federal Reserve'){
            if(item.agencyTxt.indexOf('Federal Reserve') < 0 && item.agencyTxt.indexOf('Board') < 0) ok = false;
          } else if(item.agencyTxt.indexOf(state.agency) < 0){
            ok = false;
          }
        }
        if(ok && query && item.fullTxt.indexOf(query) < 0) ok = false;

        item.tr.classList.toggle('is-filtered-out', !ok);
        if(item.noteTr) item.noteTr.classList.toggle('is-filtered-out', !ok);
        if(ok) shown++;
      });

      var active = Boolean(query) || state.status !== 'all' || state.coverage !== 'all' || state.agency !== 'all';
      if(countWrap && countEl){
        countEl.textContent = active ? ('Showing ' + shown + ' of ' + items.length + ' rulemakings') : '';
        countWrap.hidden = !active;
      }

      Array.prototype.forEach.call(bar.querySelectorAll('.filter-btn[data-tracker-axis]'), function(b){
        var ax = b.getAttribute('data-tracker-axis');
        var val = b.getAttribute('data-tracker-val');
        var on = (state[ax] || 'all') === val;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    if(searchInput){
      searchInput.addEventListener('input', function(){
        query = (searchInput.value || '').trim().toLowerCase();
        apply();
      });
    }

    bar.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-tracker-axis]');
      if(btn){
        var ax = btn.getAttribute('data-tracker-axis');
        var val = btn.getAttribute('data-tracker-val') || 'all';
        state[ax] = val;
        apply();
        return;
      }
      if(resetBtn && (e.target === resetBtn || e.target.closest('#genius-tracker-reset'))){
        state = { status: 'all', coverage: 'all', agency: 'all' };
        query = '';
        if(searchInput) searchInput.value = '';
        apply();
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initGeniusTracker);
  } else {
    initGeniusTracker();
  }
})();

/* ==========================================================================
   Seven Dollars Collateral Eligibility & Design-Axis Explorer (/papers/seven-dollars/)
   ========================================================================== */
(function(){
  'use strict';

  /* Exact 8-product collateral eligibility & operator CLII scores from Sections 3, 7.2, and 7.3 */
  var A3_PRODUCTS = [
    { name: 'USDC (Circle)', clii: 0.92, published: 0.777, rolling3y: 0.777, mechanical: 0.923, tier: 'A', tier3y: 'A', tierMech: 'A', limiter: 'Single redemption path; 10.4% SVB DEX depeg' },
    { name: 'PYUSD (Paxos)', clii: 0.83, published: 0.753, rolling3y: 0.753, mechanical: 0.859, tier: 'A', tier3y: 'A', tierMech: 'A', limiter: 'Absolute secondary depth; Oct 2025 overmint test' },
    { name: 'USDS (Sky / Maker)', clii: 0.15, published: 0.657, rolling3y: 0.657, mechanical: 0.637, tier: 'B', tier3y: 'B', tierMech: 'B', limiter: 'USDC contagion via PSM; on-chain data only' },
    { name: 'USDT (Tether)', clii: 0.52, published: 0.657, rolling3y: 0.800, mechanical: 0.674, tier: 'B', tier3y: 'A', tierMech: 'B', limiter: '42.7% historical 2018 depeg (0.80 Tier A on 3y window)' },
    { name: 'USDe (Ethena)', clii: 0.35, published: 0.604, rolling3y: 0.604, mechanical: 0.577, tier: 'B', tier3y: 'B', tierMech: 'C', limiter: 'No instant fiat redemption; CEX basis counterparty' },
    { name: 'DAI (MakerDAO)', clii: 0.15, published: 0.589, rolling3y: 0.589, mechanical: 0.575, tier: 'C', tier3y: 'C', tierMech: 'C', limiter: 'Hit $0.89 during SVB via $4.1B USDC PSM exposure' },
    { name: 'USDG (Paxos MAS)', clii: 0.83, published: 0.495, rolling3y: 0.495, mechanical: 0.552, tier: 'C', tier3y: 'C', tierMech: 'C', limiter: 'Near-zero DEX depth; single banking partner (DBS)' },
    { name: 'OUSG (Ondo)', clii: 0.61, published: 0.295, rolling3y: 0.295, mechanical: 0.288, tier: 'D', tier3y: 'D', tierMech: 'D', limiter: 'T+1/T+3 KYC-gated; Circle BUIDL pool dependency' }
  ];

  var A3_SPEC_META = {
    published: {
      top: 'USDC (0.777) \u00b7 PYUSD (0.753)',
      topSub: 'Standard eligibility tier (Tier A); USDC leads despite 10.4% DEX depeg during SVB (CLII 0.92)',
      div: 'USDT 0.657 vs USDG 0.495',
      divSub: 'USDT (CLII 0.52, Tier B) outranks higher-CLII USDG (CLII 0.83, Tier C) and OUSG (0.61, Tier D) on secondary depth',
      contagion: 'USDC \u2192 DAI & OUSG',
      contagionSub: 'SVB (Mar 2023): USDC depeg hit DAI via $4.1B PSM; Circle BUIDL pool (Mar 2025): 23h limit hit OUSG'
    },
    rolling3y: {
      top: 'USDT (~0.800) \u00b7 USDC (0.777)',
      topSub: 'Excluding the 2018 banking depeg lifts USDT from 0.657 (Tier B) to ~0.800 (Tier A) alongside USDC and PYUSD',
      div: 'USDT ~0.800 at CLII 0.52',
      divSub: 'Widens the divergence between operator regulatory score (CLII) and secondary-market collateral eligibility',
      contagion: 'Held peg in SVB Mar 2023',
      contagionSub: 'Tether had zero SVB reserve exposure and traded at a slight premium while USDC depegged 10.4% to 13%'
    },
    mechanical: {
      top: 'USDC (0.923) \u00b7 PYUSD (0.859)',
      topSub: 'Section 7.3 mechanical 8-metric rule reproduces the exact rank ordering (mean absolute residual 0.049)',
      div: 'USDT 0.674 vs USDG 0.552',
      divSub: 'Weights: Depth 0.20, Redemption 0.15, Max depeg 0.15, Paths 0.10, Hours 0.10, Restrictions 0.10, Transparency 0.10, Independence 0.10',
      contagion: 'OUSG 0.288 (3 paths, Tier D)',
      contagionSub: 'Inverts path-count intuition: 3 paths sharing 1 Circle BUIDL redemption pool score lowest on independence'
    }
  };

  /* Exact 11-product US-holder design scorecard from Section 3.2 */
  var A3_DESIGN = [
    { prod: 'USDC', grp: 'us', ppsi: true, m1: 'Full KYC', m2: 'Hybrid', m3: 'US (MTL/OCC)', m4: 'Allow-US', m5: 'PPSI-eligible', cls: 'For US holders' },
    { prod: 'PYUSD', grp: 'us', ppsi: true, m1: 'Full KYC', m2: 'Hybrid', m3: 'US (OCC/NYDFS)', m4: 'Allow-US', m5: 'PPSI-eligible', cls: 'For US holders' },
    { prod: 'RLUSD', grp: 'us', ppsi: true, m1: 'Full KYC', m2: 'Hybrid (Issuer)', m3: 'US (NYDFS trust)', m4: 'Allow-US', m5: 'PPSI-eligible', cls: 'For US holders' },
    { prod: 'USDS', grp: 'us', ppsi: false, m1: 'None', m2: 'DeFi-only', m3: 'Decentralized', m4: 'Allow-US', m5: 'Non-PPSI', cls: 'For US holders' },
    { prod: 'FRAX', grp: 'us', ppsi: false, m1: 'None', m2: 'DeFi-only', m3: 'Decentralized', m4: 'Allow-US', m5: 'Non-PPSI', cls: 'For US holders' },
    { prod: 'USDT', grp: 'offshore', ppsi: false, m1: 'None to Light', m2: 'Hybrid', m3: 'El Salvador', m4: 'Ambiguous', m5: 'Offshore variant', cls: 'Offshore-targeted' },
    { prod: 'USDe', grp: 'offshore', ppsi: false, m1: 'None to Light', m2: 'Hybrid', m3: 'Offshore', m4: 'Block-US', m5: 'Synthetic yield', cls: 'Offshore-targeted' },
    { prod: 'USDY', grp: 'offshore', ppsi: false, m1: 'Full KYC', m2: 'Issuer (non-US)', m3: 'US / Reg S', m4: 'Block-US', m5: 'Offshore note', cls: 'Offshore-targeted' },
    { prod: 'USDM', grp: 'offshore', ppsi: false, m1: 'Full KYC', m2: 'Hybrid (non-US)', m3: 'Bermuda', m4: 'Block-US', m5: 'Yield-bearing', cls: 'Offshore-targeted' },
    { prod: 'FDUSD', grp: 'boundary', ppsi: false, m1: 'Light to Full', m2: 'Hybrid', m3: 'Offshore (HK)', m4: 'Ambiguous', m5: 'Ambiguous', cls: 'Boundary case' },
    { prod: 'USD1', grp: 'boundary', ppsi: false, m1: 'None to Light', m2: 'Undocumented', m3: 'US-affiliated', m4: 'Ambiguous', m5: 'PPSI-ineligible', cls: 'Boundary case' }
  ];

  function initA3Explorer(){
    var root = document.getElementById('a3-dollars-explorer');
    if(!root) return;

    var curSpec = 'published';
    var curClass = 'all';
    var eligSvg = document.getElementById('a3-elig-svg');
    var desSvg = document.getElementById('a3-design-svg');

    function renderEligibility(){
      var meta = A3_SPEC_META[curSpec] || A3_SPEC_META.published;
      var mTop = document.getElementById('a3-m-top');
      var mTopSub = document.getElementById('a3-m-top-sub');
      var mDiv = document.getElementById('a3-m-div');
      var mDivSub = document.getElementById('a3-m-div-sub');
      var mCon = document.getElementById('a3-m-contagion');
      var mConSub = document.getElementById('a3-m-contagion-sub');

      if(mTop) mTop.textContent = meta.top;
      if(mTopSub) mTopSub.textContent = meta.topSub;
      if(mDiv) mDiv.textContent = meta.div;
      if(mDivSub) mDivSub.textContent = meta.divSub;
      if(mCon) mCon.textContent = meta.contagion;
      if(mConSub) mConSub.textContent = meta.contagionSub;

      if(!eligSvg) return;
      var rows = A3_PRODUCTS.slice().sort(function(a, b){ return (b[curSpec] || 0) - (a[curSpec] || 0); });
      var W = 880, H = 310, padL = 148, padR = 265, padT = 38, rowH = 31;
      var plotW = W - padL - padR;

      function xOf(v){ return padL + Math.min(1.0, Math.max(0, v)) * plotW; }
      function tierCol(t){
        if(t === 'A') return '#10b981';
        if(t === 'B') return '#0ea5e9';
        if(t === 'C') return '#d97706';
        return '#dc2626';
      }

      var svg = '';
      svg += '<g transform="translate(' + padL + ', 16)" font-size="11" fill="currentColor">' +
        '<rect x="0" y="-8" width="14" height="9" rx="2" fill="#0ea5e9"/><text x="19" y="0">Collateral eligibility score (0 to 1, colored by Tier A to D)</text>' +
        '<circle cx="348" cy="-3.5" r="4.5" fill="var(--bg)" stroke="currentColor" stroke-width="2.2"/><text x="358" y="0">Operator CLII regulatory score (0 to 1)</text>' +
        '</g>';

      [0, 0.25, 0.50, 0.75, 1.00].forEach(function(tv){
        var x = xOf(tv).toFixed(1);
        svg += '<line x1="' + x + '" y1="' + (padT - 6) + '" x2="' + x + '" y2="' + (H - 18) + '" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>';
        svg += '<text x="' + x + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.65">' + tv.toFixed(2) + '</text>';
      });

      rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var val = r[curSpec] || 0;
        var tier = curSpec === 'rolling3y' ? r.tier3y : (curSpec === 'mechanical' ? r.tierMech : r.tier);
        var bw = Math.max(4, xOf(val) - padL).toFixed(1);
        var cx = xOf(r.clii).toFixed(1);
        var col = tierCol(tier);

        svg += '<text x="' + (padL - 10) + '" y="' + (y + 16) + '" text-anchor="end" font-size="12" font-weight="600" fill="currentColor">' + r.name + '</text>';
        svg += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + plotW + '" height="16" rx="4" fill="currentColor" fill-opacity="0.05"/>';
        svg += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + bw + '" height="16" rx="4" fill="' + col + '" fill-opacity="0.82"/>';
        svg += '<circle cx="' + cx + '" cy="' + (y + 12) + '" r="5" fill="var(--bg)" stroke="currentColor" stroke-width="2.2"/>';

        svg += '<text x="' + (W - padR + 10) + '" y="' + (y + 16) + '" font-size="11" fill="currentColor"><tspan font-weight="700">' + val.toFixed(3) + ' (Tier ' + tier + ')</tspan> \u00b7 CLII ' + r.clii.toFixed(2) + '</text>';
      });

      eligSvg.innerHTML = svg;
    }

    function renderDesign(){
      if(!desSvg) return;
      var rows = A3_DESIGN.filter(function(r){
        if(curClass === 'all') return true;
        if(curClass === 'ppsi') return r.ppsi;
        return r.grp === curClass;
      });

      var rowH = 26, padT = 34, padB = 14, padL = 78;
      var W = 880, H = padT + rows.length * rowH + padB;
      desSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      desSvg.setAttribute('height', String(H));

      var cols = [
        { label: 'M1: KYC depth', w: 122 },
        { label: 'M2: Redemption', w: 132 },
        { label: 'M3: Jurisdiction', w: 136 },
        { label: 'M4: Geofencing', w: 118 },
        { label: 'M5: Legal character', w: 140 },
        { label: 'Design class', w: 142 }
      ];

      var svg = '';
      var xCur = padL;
      cols.forEach(function(c){
        svg += '<text x="' + (xCur + c.w / 2).toFixed(1) + '" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + c.label + '</text>';
        xCur += c.w;
      });

      rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var col = r.ppsi ? '#10b981' : (r.grp === 'us' ? '#0ea5e9' : (r.grp === 'offshore' ? '#d97706' : '#94a3b8'));
        svg += '<text x="' + (padL - 8) + '" y="' + (y + 17) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="currentColor">' + r.prod + '</text>';

        var vals = [r.m1, r.m2, r.m3, r.m4, r.m5, r.cls];
        var xc = padL;
        vals.forEach(function(v, ci){
          var cw = cols[ci].w;
          var isLast = ci === 5;
          svg += '<rect x="' + (xc + 2) + '" y="' + (y + 2) + '" width="' + (cw - 4) + '" height="' + (rowH - 4) + '" rx="4" fill="' + (isLast ? col : 'currentColor') + '" fill-opacity="' + (isLast ? '0.18' : '0.05') + '" stroke="' + (isLast ? col : 'currentColor') + '" stroke-opacity="' + (isLast ? '0.65' : '0.10') + '"/>';
          svg += '<text x="' + (xc + cw / 2).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="middle" font-size="10.5" font-weight="' + (isLast ? '700' : '500') + '" fill="currentColor">' + v + '</text>';
          xc += cw;
        });
      });

      desSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-a3-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-a3-tab');
        root.querySelectorAll('button[data-a3-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pElig = document.getElementById('a3-panel-eligibility');
        var pDes = document.getElementById('a3-panel-design');
        if(pElig) pElig.hidden = target !== 'eligibility';
        if(pDes) pDes.hidden = target !== 'design';
        if(target === 'design') renderDesign(); else renderEligibility();
        return;
      }

      var specBtn = e.target.closest('button[data-a3-spec]');
      if(specBtn){
        curSpec = specBtn.getAttribute('data-a3-spec') || 'published';
        root.querySelectorAll('button[data-a3-spec]').forEach(function(b){
          var on = b === specBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderEligibility();
        return;
      }

      var clsBtn = e.target.closest('button[data-a3-class]');
      if(clsBtn){
        curClass = clsBtn.getAttribute('data-a3-class') || 'all';
        root.querySelectorAll('button[data-a3-class]').forEach(function(b){
          var on = b === clsBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderDesign();
      }
    });

    renderEligibility();
    renderDesign();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initA3Explorer);
  } else {
    initA3Explorer();
  }
})();

/* ==========================================================================
   Who Controls Agentic Payments (x402) Explorer (/papers/who-controls-agentic-payments/)
   ========================================================================== */
(function(){
  'use strict';

  var C4_CHAINS = {
    base_jul: {
      count: 'HHI 6,512 \u00b7 CDP 78.5%',
      countSub: '3.6x the 1,800 DOJ/FTC merger-guidelines threshold; Coinbase CDP dominates July payment counts on Base',
      val: 'HHI 4,700 \u00b7 Meridian 62.6%',
      valSub: 'After 2-hop proxy-settlement correction; value monopolist swaps completely from count leader',
      scale: '$583,430 / 10.06M tx',
      scaleSub: 'Cross-chain July 2026 corrected total; registry covers 92.3% of Base EIP-3009 authorizations',
      rows: [
        { name: 'Coinbase CDP', countPct: 78.5, valPct: 24.1 },
        { name: 'Meridian (mrdn proxy)', countPct: 0.4, valPct: 62.6 },
        { name: 'Fluora / Fluxa', countPct: 14.2, valPct: 7.4 },
        { name: 'payAI & Relai', countPct: 5.1, valPct: 4.3 },
        { name: 'All other facilitators', countPct: 1.8, valPct: 1.6 }
      ]
    },
    solana_jul: {
      count: 'HHI 4,071 \u00b7 Dexter 52.2%',
      countSub: 'Clears both 1,800 and 2,500 antitrust thresholds; Dexter leads Solana transaction counts in July',
      val: 'HHI 3,831 \u00b7 payAI 56.2%',
      valSub: 'Count-versus-value flip replicates independently on Solana with a different pair of operators',
      scale: '24 Solana fee payers',
      scaleSub: 'Exact-SVM SPL TransferChecked with memo nonce; organic May cardinality 10.1 events/buyer',
      rows: [
        { name: 'Dexter', countPct: 52.2, valPct: 16.5 },
        { name: 'payAI', countPct: 14.8, valPct: 56.2 },
        { name: 'Coinbase CDP', countPct: 28.4, valPct: 19.8 },
        { name: 'Relai & Corbits', countPct: 4.6, valPct: 7.5 }
      ]
    },
    polygon_jul: {
      count: 'Single-operator (~99.5%)',
      countSub: 'Official Polygon Facilitator (24-address rotating fleet) generated 5.61M July payments (55.8% of all x402 counts)',
      val: '52 buyer wallets',
      valSub: 'Under a public $1M gas-rebate program (687,453 POL funded); 52 wallets recirculate seeded USDC at ~$0.025/tx',
      scale: '15.88% of Polygon USDC tx',
      scaleSub: 'Subsidized fleet alone accounts for ~1 in 6 Polygon USDC transfer events, distorting chain-level stats',
      rows: [
        { name: 'Polygon Facilitator (24-addr fleet)', countPct: 99.5, valPct: 99.2 },
        { name: 'All other Polygon facilitators', countPct: 0.5, valPct: 0.8 }
      ]
    },
    base_may: {
      count: 'HHI 6,009 \u00b7 CDP 75.6%',
      countSub: 'May 2026 validated baseline: 3,041,318 payments from 110,766 distinct buyers (26.7 events/buyer)',
      val: 'HHI 4,040 \u00b7 Meridian 57.2%',
      valSub: 'Corrected from $1,030,242 raw (HHI 5,621) to $652,882 after removing Meridian 2-hop double-count',
      scale: '$0.07 vs $33.86 avg tx',
      scaleSub: 'Coinbase CDP averages $0.07/payment across 110,350 buyers; Meridian averages $33.86 across 17 buyers',
      rows: [
        { name: 'coinbase (CDP)', countPct: 75.6, valPct: 25.8 },
        { name: 'mrdn (Meridian)', countPct: 0.4, valPct: 57.2 },
        { name: 'fluxa', countPct: 16.1, valPct: 8.7 },
        { name: 'payAI', countPct: 5.9, valPct: 1.7 },
        { name: 'relai & others', countPct: 2.0, valPct: 6.6 }
      ]
    },
    solana_may: {
      count: 'HHI 4,203 \u00b7 Dexter 51.8%',
      countSub: 'May 2026 Solana baseline: 799,769 payments across 78,922 buyers ($0.17 avg payment)',
      val: 'HHI 4,915 \u00b7 Coinbase 66.5%',
      valSub: 'Dexter leads counts (414,665 tx) while Coinbase leads value ($89,294) and Relai averages $1.41 across 19 buyers',
      scale: '$134,202 / 799,769 tx',
      scaleSub: 'Post-leaderboard-grind organic profile (down from 11,900 events/buyer in Dec 2025 to 10.1 in May 2026)',
      rows: [
        { name: 'dexter', countPct: 51.8, valPct: 15.0 },
        { name: 'coinbase', countPct: 38.5, valPct: 66.5 },
        { name: 'relai', countPct: 2.0, valPct: 16.4 },
        { name: 'payAI & corbits', countPct: 7.7, valPct: 2.1 }
      ]
    }
  };

  function initC4Explorer(){
    var root = document.getElementById('c4-x402-explorer');
    if(!root) return;

    var curChain = 'base_jul';
    var curDiag = 'cardinality';
    var chainsSvg = document.getElementById('c4-chains-svg');
    var diagSvg = document.getElementById('c4-diag-svg');

    function renderChains(){
      var d = C4_CHAINS[curChain] || C4_CHAINS.base_jul;
      var mCount = document.getElementById('c4-m-count');
      var mCountSub = document.getElementById('c4-m-count-sub');
      var mVal = document.getElementById('c4-m-val');
      var mValSub = document.getElementById('c4-m-val-sub');
      var mScale = document.getElementById('c4-m-scale');
      var mScaleSub = document.getElementById('c4-m-scale-sub');

      if(mCount) mCount.textContent = d.count;
      if(mCountSub) mCountSub.textContent = d.countSub;
      if(mVal) mVal.textContent = d.val;
      if(mValSub) mValSub.textContent = d.valSub;
      if(mScale) mScale.textContent = d.scale;
      if(mScaleSub) mScaleSub.textContent = d.scaleSub;

      if(!chainsSvg) return;
      var W = 880, H = 280, padL = 210, padR = 165, padT = 40;
      var plotW = W - padL - padR;
      var rowH = 44;

      var svg = '';
      svg += '<g transform="translate(' + padL + ', 18)" font-size="11" fill="currentColor">' +
        '<rect x="0" y="-8" width="14" height="8" rx="2" fill="#0ea5e9"/><text x="19" y="0">Payment-count share (%)</text>' +
        '<rect x="190" y="-8" width="14" height="8" rx="2" fill="#d97706"/><text x="209" y="0">Corrected dollar-volume share (%)</text>' +
        '</g>';

      [0, 25, 50, 75, 100].forEach(function(pct){
        var x = (padL + (pct / 100) * plotW).toFixed(1);
        svg += '<line x1="' + x + '" y1="' + (padT - 6) + '" x2="' + x + '" y2="' + (H - 22) + '" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>';
        svg += '<text x="' + x + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.65">' + pct + '%</text>';
      });

      d.rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var wCount = Math.max(3, (r.countPct / 100) * plotW).toFixed(1);
        var wVal = Math.max(3, (r.valPct / 100) * plotW).toFixed(1);

        svg += '<text x="' + (padL - 10) + '" y="' + (y + 18) + '" text-anchor="end" font-size="12" font-weight="600" fill="currentColor">' + r.name + '</text>';
        svg += '<rect x="' + padL + '" y="' + (y + 2) + '" width="' + wCount + '" height="13" rx="3" fill="#0ea5e9"/>';
        svg += '<rect x="' + padL + '" y="' + (y + 17) + '" width="' + wVal + '" height="13" rx="3" fill="#d97706"/>';

        svg += '<text x="' + (W - padR + 10) + '" y="' + (y + 13) + '" font-size="11" fill="#0ea5e9" font-weight="600">' + r.countPct.toFixed(1) + '% counts</text>';
        svg += '<text x="' + (W - padR + 10) + '" y="' + (y + 28) + '" font-size="11" fill="#d97706" font-weight="600">' + r.valPct.toFixed(1) + '% dollars</text>';
      });

      chainsSvg.innerHTML = svg;
    }

    function renderDiag(){
      if(!diagSvg) return;
      var W = 880, H = 270, padL = 235, padR = 195, padT = 32;
      var plotW = W - padL - padR;
      var svg = '';

      if(curDiag === 'cardinality'){
        /* Log10 scale from 1 to 200,000 events per buyer per month */
        var items = [
          { label: 'Solana May 2026 (organic rebuild)', val: 10.1, col: '#10b981', note: '10.1 tx/buyer (78,922 buyers)' },
          { label: 'Base May 2026 (validated baseline)', val: 26.7, col: '#10b981', note: '26.7 tx/buyer (110,766 buyers)' },
          { label: 'Base Nov 2025 (memecoin peak)', val: 541.1, col: '#d97706', note: '541 tx/buyer (64.3M tx / 118.8K buyers)' },
          { label: 'Solana Dec 2025 (leaderboard grind)', val: 11900, col: '#dc2626', note: '11,900 tx/buyer (26.9M tx / 2,261 buyers)' },
          { label: 'Polygon Jul 2026 ($1M gas rebate)', val: 107885, col: '#dc2626', note: '107,885 tx/buyer (5.61M tx / 52 wallets)' },
          { label: 'Polygon May 2026 (rebate fleet)', val: 144000, col: '#dc2626', note: '~144,000 tx/buyer (5.04M tx / 35 wallets)' }
        ];
        var maxLog = Math.log10(200000);
        items.forEach(function(it, idx){
          var y = padT + idx * 36;
          var bw = Math.max(6, (Math.log10(Math.max(1.2, it.val)) / maxLog) * plotW).toFixed(1);
          svg += '<text x="' + (padL - 10) + '" y="' + (y + 17) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + it.label + '</text>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + plotW + '" height="18" rx="4" fill="currentColor" fill-opacity="0.05"/>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + bw + '" height="18" rx="4" fill="' + it.col + '"/>';
          svg += '<text x="' + (padL + parseFloat(bw) + 8) + '" y="' + (y + 16) + '" font-size="11" font-weight="600" fill="currentColor">' + it.note + '</text>';
        });
      } else {
        var recs = [
          { label: 'Community Dune dashboard (May)', val: 179793, col: '#94a3b8', note: '$179,793 (49-addr map; misses Meridian)' },
          { label: 'Base raw transfer-sum (uncorrected)', val: 1030242, col: '#dc2626', note: '$1,030,242 (double-counts Meridian 2-hop proxy)' },
          { label: 'Base payment-validated (corrected)', val: 652882, col: '#10b981', note: '$652,882 (-36.6% proxy correction; HHI 4,040)' },
          { label: 'Cross-chain May 2026 (corrected)', val: 940323, col: '#0ea5e9', note: '$940,323 across 8.87M payments (3 chains)' },
          { label: 'Cross-chain July 2026 (corrected)', val: 583430, col: '#0ea5e9', note: '$583,430 across 10.06M payments (3 chains)' }
        ];
        var maxV = 1100000;
        recs.forEach(function(it, idx){
          var y = padT + idx * 42;
          var bw = Math.max(6, (it.val / maxV) * plotW).toFixed(1);
          svg += '<text x="' + (padL - 10) + '" y="' + (y + 18) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + it.label + '</text>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + plotW + '" height="20" rx="4" fill="currentColor" fill-opacity="0.05"/>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + bw + '" height="20" rx="4" fill="' + it.col + '"/>';
          svg += '<text x="' + (padL + parseFloat(bw) + 8) + '" y="' + (y + 17) + '" font-size="11" font-weight="600" fill="currentColor">' + it.note + '</text>';
        });
      }

      diagSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-c4-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-c4-tab');
        root.querySelectorAll('button[data-c4-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pCh = document.getElementById('c4-panel-chains');
        var pDi = document.getElementById('c4-panel-cardinality');
        if(pCh) pCh.hidden = target !== 'chains';
        if(pDi) pDi.hidden = target !== 'cardinality';
        if(target === 'cardinality') renderDiag(); else renderChains();
        return;
      }

      var chBtn = e.target.closest('button[data-c4-chain]');
      if(chBtn){
        curChain = chBtn.getAttribute('data-c4-chain') || 'base_jul';
        root.querySelectorAll('button[data-c4-chain]').forEach(function(b){
          var on = b === chBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderChains();
        return;
      }

      var diBtn = e.target.closest('button[data-c4-diag]');
      if(diBtn){
        curDiag = diBtn.getAttribute('data-c4-diag') || 'cardinality';
        root.querySelectorAll('button[data-c4-diag]').forEach(function(b){
          var on = b === diBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderDiag();
      }
    });

    renderChains();
    renderDiag();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initC4Explorer);
  } else {
    initC4Explorer();
  }
})();

/* ==========================================================================
   Who Burns the Tokens S2R & Observability Explorer (/papers/who-burns-the-tokens/)
   ========================================================================== */
(function(){
  'use strict';

  /* Exact Helium S2R series from Section 5.1.1 Tables */
  var B3_HNT_POINTS = [
    { label: 'May 23', monthly: 0.013, t3m: 0.013, t6m: 0.013, ttm: 0.013, burned: '37.2K', issued: '2.88M' },
    { label: 'Sep 23', monthly: 0.119, t3m: 0.068, t6m: 0.045, ttm: 0.038, burned: '138.7K', issued: '1.17M' },
    { label: 'Jan 24', monthly: 0.052, t3m: 0.055, t6m: 0.062, ttm: 0.049, burned: '75.6K', issued: '1.46M' },
    { label: 'Jun 24', monthly: 0.024, t3m: 0.031, t6m: 0.040, ttm: 0.048, burned: '28.2K', issued: '1.16M' },
    { label: 'Nov 24', monthly: 0.137, t3m: 0.078, t6m: 0.058, ttm: 0.056, burned: '159.5K', issued: '1.16M' },
    { label: 'Mar 25', monthly: 0.107, t3m: 0.095, t6m: 0.088, ttm: 0.069, burned: '200.4K', issued: '1.88M' },
    { label: 'Jun 25', monthly: 0.376, t3m: 0.245, t6m: 0.172, ttm: 0.115, burned: '708.9K', issued: '1.88M' },
    { label: 'Aug 25', monthly: 0.869, t3m: 0.520, t6m: 0.310, ttm: 0.155, burned: '532.9K', issued: '613.5K' },
    { label: 'Sep 25', monthly: 0.587, t3m: 0.611, t6m: 0.355, ttm: 0.168, burned: '456.2K', issued: '776.7K' },
    { label: 'Oct 25', monthly: 1.570, t3m: 0.980, t6m: 0.410, ttm: 0.190, burned: '975.3K', issued: '621.4K' },
    { label: 'Nov 25', monthly: 0.880, t3m: 0.980, t6m: 0.560, ttm: 0.220, burned: '546.8K', issued: '621.4K' },
    { label: 'Dec 25', monthly: 1.552, t3m: 1.350, t6m: 0.780, ttm: 0.340, burned: '1.21M', issued: '776.7K' },
    { label: 'Jan 26', monthly: 1.100, t3m: 1.210, t6m: 1.090, ttm: 0.410, burned: '683.5K', issued: '621.4K' },
    { label: 'Feb 26', monthly: 1.841, t3m: 1.500, t6m: 1.240, ttm: 0.510, burned: '1.14M', issued: '621.4K' }
  ];

  var B3_WIN_META = {
    monthly: {
      feb: '1.84x (net deflationary)',
      febSub: '1,144,240 HNT burned vs 621,370 HNT issued; crossed S2R = 1.0 parity in October 2025 (1.57x)',
      col: '#10b981'
    },
    t3m: {
      feb: '1.50x (trailing 3-month)',
      febSub: 'Crossed S2R = 1.0 parity in December 2025 (1.35x) and held above parity through February 2026 (1.50x)',
      col: '#0ea5e9'
    },
    t6m: {
      feb: '1.24x (trailing 6-month)',
      febSub: 'Crossed S2R = 1.0 parity in January 2026 (1.09x) as post-halving carrier burns compounded',
      col: '#d97706'
    },
    ttm: {
      feb: '0.51x (trailing 12-month)',
      febSub: 'Remains below 1.0 parity over a full 12-month window because pre-August 2025 issuance is included',
      col: '#94a3b8'
    }
  };

  /* Exact 13-protocol cohort from Sections 4.2, 5.3, and 6.3 */
  var B3_COHORT = [
    { name: 'Helium (HNT)', arch: 'direct', cat: 'GeoDePIN', sink: 'Direct DC burn', s2r: 1.841, s2rTxt: '1.84 peak (0.51 TTM)', demHHI: '0.27 (Top-5 ~90%)', govHHI: '0.099 post-PCA' },
    { name: 'Livepeer (LPT)', arch: 'direct', cat: 'DeVIN', sink: 'Direct ETH fee', s2r: 0.010, s2rTxt: '~0 (ETH fee routing)', demHHI: '0.31 (Top-2 75%)', govHHI: '0.199 (0.033 unif.)' },
    { name: 'GEODNET (GEOD)', arch: 'intermediated', cat: 'GeoDePIN', sink: 'Foundation buy-burn', s2r: 0.219, s2rTxt: '0.219 (52.5% Oct peak)', demHHI: 'Off-chain (treasury signer)', govHHI: '0.14 Polygon (0.061 PCA)' },
    { name: 'Hivemapper (HONEY)', arch: 'intermediated', cat: 'GeoDePIN', sink: 'Single relayer burn', s2r: 0.183, s2rTxt: '0.183 (Feb 2026)', demHHI: 'Off-axis (96% 1 relayer)', govHHI: '0.020 post-PCA' },
    { name: 'DIMO (DIMO)', arch: 'intermediated', cat: 'GeoDePIN', sink: 'Prepaid DCX credit', s2r: 0.350, s2rTxt: '4.24 1-mo license spike', demHHI: 'Off-axis (~100 credit wallets)', govHHI: '0.025 post-PCA (0.305 raw)' },
    { name: 'Filecoin (FIL)', arch: 'low', cat: 'DeVIN', sink: 'Base fee + collateral', s2r: 0.045, s2rTxt: '~0.045 (0.14-0.41 w/ lock)', demHHI: 'Unmeasured', govHHI: '0.022 post-PCA' },
    { name: 'Render (RENDER)', arch: 'low', cat: 'DeVIN', sink: 'BME fee burn', s2r: 0.020, s2rTxt: 'Low (DeVIN benchmark)', demHHI: 'Unmeasured', govHHI: '0.027 post-PCA' },
    { name: 'WeatherXM (WXM)', arch: 'low', cat: 'GeoDePIN', sink: 'Subscription burn', s2r: 0.010, s2rTxt: 'Active (volume small)', demHHI: 'Unmeasured', govHHI: '0.148 post-PCA' },
    { name: 'Anyone Protocol', arch: 'low', cat: 'GeoDePIN', sink: 'Stake / lock', s2r: 0.005, s2rTxt: '~0 (staking lock)', demHHI: 'Unmeasured', govHHI: '0.034 (0.013 post-PCA)' },
    { name: 'Grass (GRASS)', arch: 'low', cat: 'GeoDePIN*', sink: 'None yet (staking)', s2r: 0.005, s2rTxt: '~0 (no burn)', demHHI: 'None', govHHI: '0.119 (0.035 post-PCA)' },
    { name: 'UpRock', arch: 'low', cat: 'GeoDePIN*', sink: 'None yet', s2r: 0.005, s2rTxt: '~0 (pre-revenue)', demHHI: 'None', govHHI: 'Data-insufficient' },
    { name: 'Wayru / WiFiDabba', arch: 'low', cat: 'GeoDePIN', sink: 'Micro-payments', s2r: 0.005, s2rTxt: 'Data-insufficient', demHHI: 'Unmeasured', govHHI: 'Data-insufficient' },
    { name: 'CUDIS', arch: 'low', cat: 'GeoDePIN', sink: 'Data marketplace', s2r: 0.005, s2rTxt: 'Data-insufficient', demHHI: 'Unmeasured', govHHI: 'Data-insufficient' }
  ];

  function initB3Explorer(){
    var root = document.getElementById('b3-burns-explorer');
    if(!root) return;

    var curWin = 'monthly';
    var curArch = 'all';
    var hntSvg = document.getElementById('b3-helium-svg');
    var cohSvg = document.getElementById('b3-cohort-svg');

    function renderHelium(){
      var meta = B3_WIN_META[curWin] || B3_WIN_META.monthly;
      var mFeb = document.getElementById('b3-m-feb');
      var mFebSub = document.getElementById('b3-m-feb-sub');
      if(mFeb) mFeb.textContent = meta.feb;
      if(mFebSub) mFebSub.textContent = meta.febSub;

      if(!hntSvg) return;
      var W = 880, H = 290, padL = 56, padR = 36, padT = 28, padB = 42;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var maxY = 2.0;

      function xOf(i){ return padL + (i / (B3_HNT_POINTS.length - 1)) * plotW; }
      function yOf(v){ return padT + plotH - (Math.min(maxY, v) / maxY) * plotH; }

      var svg = '';
      [0, 0.5, 1.0, 1.5, 2.0].forEach(function(gv){
        var y = yOf(gv).toFixed(1);
        var isParity = Math.abs(gv - 1.0) < 0.01;
        svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="' + (isParity ? '#dc2626' : 'currentColor') + '" stroke-opacity="' + (isParity ? '0.65' : '0.12') + '" stroke-dasharray="' + (isParity ? '5 4' : '3 3') + '"/>';
        svg += '<text x="' + (padL - 8) + '" y="' + (parseFloat(y) + 4) + '" text-anchor="end" font-size="11" font-weight="' + (isParity ? '700' : '400') + '" fill="' + (isParity ? '#dc2626' : 'currentColor') + '" opacity="' + (isParity ? '0.95' : '0.65') + '">' + gv.toFixed(1) + '</text>';
      });

      svg += '<text x="' + (W - padR - 6) + '" y="' + (yOf(1.0) - 6).toFixed(1) + '" text-anchor="end" font-size="11" font-weight="700" fill="#dc2626">S2R = 1.0 Fiscal Parity (burns = emissions)</text>';

      /* Draw ghost monthly line when another window is active */
      if(curWin !== 'monthly'){
        var mPath = '';
        B3_HNT_POINTS.forEach(function(p, i){
          mPath += (i === 0 ? 'M' : 'L') + xOf(i).toFixed(1) + ',' + yOf(p.monthly).toFixed(1) + ' ';
        });
        svg += '<path d="' + mPath + '" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.8" stroke-dasharray="3 3"/>';
      }

      var activePath = '';
      B3_HNT_POINTS.forEach(function(p, i){
        var x = xOf(i).toFixed(1);
        var y = yOf(p[curWin]).toFixed(1);
        activePath += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
      });
      svg += '<path d="' + activePath + '" fill="none" stroke="' + meta.col + '" stroke-width="3"/>';

      B3_HNT_POINTS.forEach(function(p, i){
        var x = xOf(i).toFixed(1);
        var y = yOf(p[curWin]).toFixed(1);
        var v = p[curWin];
        svg += '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="' + (v >= 1.0 ? '#10b981' : meta.col) + '"/>';
        if(i === 6 || i === 7 || i === 9 || i === 13){
          svg += '<text x="' + x + '" y="' + (parseFloat(y) - 9).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="currentColor">' + v.toFixed(2) + '</text>';
        }
        svg += '<text x="' + x + '" y="' + (H - 16) + '" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.75">' + p.label + '</text>';
      });

      hntSvg.innerHTML = svg;
    }

    function renderCohort(){
      if(!cohSvg) return;
      var rows = B3_COHORT.filter(function(r){
        if(curArch === 'all') return true;
        return r.arch === curArch;
      });

      var rowH = 25, padT = 34, padB = 14, padL = 148;
      var W = 880, H = padT + rows.length * rowH + padB;
      cohSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      cohSvg.setAttribute('height', String(H));

      var cols = [
        { label: 'Category', w: 92 },
        { label: 'Payment / sink architecture', w: 175 },
        { label: 'Operating S2R', w: 165 },
        { label: 'Demand-HHI observability', w: 155 },
        { label: 'Governance HHI', w: 135 }
      ];

      var svg = '';
      var xCur = padL;
      cols.forEach(function(c){
        svg += '<text x="' + (xCur + c.w / 2).toFixed(1) + '" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + c.label + '</text>';
        xCur += c.w;
      });

      rows.forEach(function(r, idx){
        var y = padT + idx * rowH;
        var col = r.arch === 'direct' ? '#10b981' : (r.arch === 'intermediated' ? '#0ea5e9' : '#94a3b8');
        svg += '<text x="' + (padL - 8) + '" y="' + (y + 16) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="currentColor">' + r.name + '</text>';

        var vals = [r.cat, r.sink, r.s2rTxt, r.demHHI, r.govHHI];
        var xc = padL;
        vals.forEach(function(v, ci){
          var cw = cols[ci].w;
          var hi = (ci === 2 && r.s2r >= 0.15) || (ci === 3 && r.arch === 'direct');
          svg += '<rect x="' + (xc + 2) + '" y="' + (y + 2) + '" width="' + (cw - 4) + '" height="' + (rowH - 4) + '" rx="4" fill="' + (hi ? col : 'currentColor') + '" fill-opacity="' + (hi ? '0.18' : '0.05') + '" stroke="' + (hi ? col : 'currentColor') + '" stroke-opacity="' + (hi ? '0.65' : '0.10') + '"/>';
          svg += '<text x="' + (xc + cw / 2).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="middle" font-size="10.5" font-weight="' + (hi ? '700' : '500') + '" fill="currentColor">' + v + '</text>';
          xc += cw;
        });
      });

      cohSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-b3-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-b3-tab');
        root.querySelectorAll('button[data-b3-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pHnt = document.getElementById('b3-panel-helium');
        var pCoh = document.getElementById('b3-panel-cohort');
        if(pHnt) pHnt.hidden = target !== 'helium';
        if(pCoh) pCoh.hidden = target !== 'cohort';
        if(target === 'cohort') renderCohort(); else renderHelium();
        return;
      }

      var winBtn = e.target.closest('button[data-b3-win]');
      if(winBtn){
        curWin = winBtn.getAttribute('data-b3-win') || 'monthly';
        root.querySelectorAll('button[data-b3-win]').forEach(function(b){
          var on = b === winBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderHelium();
        return;
      }

      var archBtn = e.target.closest('button[data-b3-arch]');
      if(archBtn){
        curArch = archBtn.getAttribute('data-b3-arch') || 'all';
        root.querySelectorAll('button[data-b3-arch]').forEach(function(b){
          var on = b === archBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderCohort();
      }
    });

    renderHelium();
    renderCohort();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initB3Explorer);
  } else {
    initB3Explorer();
  }
})();

/* ==========================================================================
   Adaptive Tokenomics 240-Run MeshNet Ensemble Explorer (/papers/adaptive-tokenomics/)
   ========================================================================== */
(function(){
  'use strict';

  /* Exact 240-run ensemble metrics from Section 8 & Appendix A.4 to A.6 */
  var B1_SCENARIOS = {
    competitor: {
      cv: '0.087 PID vs 0.544 Static',
      cvSub: '6.25x variance compression across 30 seeds; PID price CV 0.532 vs Static 0.921',
      p5: '8,880 vs 1,049 nodes',
      p5Sub: 'PID preserves a viable network on worst-case paths while static collapses (5th-pct price $1.09 vs $0.04)',
      sup: '354M vs 308M slashed',
      supSub: 'Higher operator retention under PID generates 15% more slashing (-73.6% vs -66.1% circulating supply)',
      pidMean: 10240, pidP5: 8880, pidP95: 11559,
      statMean: 8610, statP5: 1049, statP95: 11934
    },
    regulatory: {
      cv: '0.093 PID vs 0.229 Static',
      cvSub: '2.46x variance compression under a 30% operating-cost shock at month 18',
      p5: '7,920 vs 5,180 nodes',
      p5Sub: 'Single-seed PID finishes at 9,152 nodes (8.5% deviation from N* = 10,000 target)',
      sup: '297M vs 281M slashed',
      supSub: 'Both arms net deflationary (-51.6% PID vs -52.4% Static circulating supply)',
      pidMean: 9152, pidP5: 7920, pidP95: 10480,
      statMean: 8890, statP5: 5180, statP95: 11934
    },
    bear: {
      cv: '0.219 PID vs 0.958 Static',
      cvSub: '4.37x variance compression; PID pays a dilution premium to bound worst-case collapse',
      p5: '4,429 vs 709 nodes',
      p5Sub: 'PID 5th-95th band [4,429, 8,194] (single-seed 5,536) vs Static [709, 11,028] (single-seed 7,401)',
      sup: '277.3M vs 176.4M emitted',
      supSub: 'Integral wind-up emits +57% more tokens (+3.9% inflation vs -54.7% static); anti-windup clamp recommended',
      pidMean: 5536, pidP5: 4429, pidP95: 8194,
      statMean: 7401, statP5: 709, statP95: 11028
    },
    bull: {
      cv: 'Identical convergence (~0.01)',
      cvSub: 'Strong demand economics drive operator entry regardless of emission schedule',
      p5: '11,934 vs 11,934 nodes',
      p5Sub: 'Both arms converge ~19.3% above the 10,000-node target across all 30 seeds',
      sup: '0.25x PID floor from mo. 35',
      supSub: 'PID steers across 66-74% of range in months 0-35, then pins at 0.25x floor (27,397/day) to prevent dilution',
      pidMean: 11934, pidP5: 11850, pidP95: 11934,
      statMean: 11934, statP5: 11850, statP95: 11934
    }
  };

  function initB1Explorer(){
    var root = document.getElementById('b1-meshnet-explorer');
    if(!root) return;

    var curScen = 'competitor';
    var curBat = 'cadence';
    var ensSvg = document.getElementById('b1-ens-svg');
    var cadSvg = document.getElementById('b1-cad-svg');

    function renderEnsemble(){
      var s = B1_SCENARIOS[curScen] || B1_SCENARIOS.competitor;
      var mCv = document.getElementById('b1-m-cv');
      var mCvSub = document.getElementById('b1-m-cv-sub');
      var mP5 = document.getElementById('b1-m-p5');
      var mP5Sub = document.getElementById('b1-m-p5-sub');
      var mSup = document.getElementById('b1-m-sup');
      var mSupSub = document.getElementById('b1-m-sup-sub');

      if(mCv) mCv.textContent = s.cv;
      if(mCvSub) mCvSub.textContent = s.cvSub;
      if(mP5) mP5.textContent = s.p5;
      if(mP5Sub) mP5Sub.textContent = s.p5Sub;
      if(mSup) mSup.textContent = s.sup;
      if(mSupSub) mSupSub.textContent = s.supSub;

      if(!ensSvg) return;
      var W = 880, H = 265, padL = 175, padR = 205, padT = 38;
      var plotW = W - padL - padR;
      var maxN = 12500;
      function xOf(n){ return padL + (Math.min(maxN, Math.max(0, n)) / maxN) * plotW; }

      var svg = '';
      svg += '<g transform="translate(' + padL + ', 16)" font-size="11" fill="currentColor">' +
        '<rect x="0" y="-8" width="16" height="8" rx="2" fill="#10b981" fill-opacity="0.35" stroke="#10b981"/><text x="22" y="0">5th to 95th percentile node-count band (30 seeds)</text>' +
        '<circle cx="315" cy="-4" r="4.5" fill="#10b981"/><text x="325" y="0">5th-percentile worst-case floor</text>' +
        '<circle cx="515" cy="-4" r="4.5" fill="var(--bg)" stroke="currentColor" stroke-width="2"/><text x="525" y="0">Mean / baseline outcome</text>' +
        '</g>';

      [0, 2500, 5000, 7500, 10000, 12500].forEach(function(tv){
        var x = xOf(tv).toFixed(1);
        var isTarget = tv === 10000;
        svg += '<line x1="' + x + '" y1="' + (padT - 4) + '" x2="' + x + '" y2="' + (H - 24) + '" stroke="' + (isTarget ? '#0ea5e9' : 'currentColor') + '" stroke-opacity="' + (isTarget ? '0.65' : '0.12') + '" stroke-dasharray="' + (isTarget ? '5 3' : '3 3') + '"/>';
        svg += '<text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" font-weight="' + (isTarget ? '700' : '400') + '" fill="' + (isTarget ? '#0ea5e9' : 'currentColor') + '" opacity="' + (isTarget ? '0.95' : '0.65') + '">' + (isTarget ? '10,000 (Target N*)' : tv.toLocaleString()) + '</text>';
      });

      var arms = [
        { label: 'PID Adaptive Controller', p5: s.pidP5, mean: s.pidMean, p95: s.pidP95, col: '#10b981' },
        { label: 'Static Emission (5%/yr taper)', p5: s.statP5, mean: s.statMean, p95: s.statP95, col: '#d97706' }
      ];

      arms.forEach(function(a, idx){
        var y = padT + 22 + idx * 78;
        var x5 = xOf(a.p5);
        var xM = xOf(a.mean);
        var x95 = xOf(a.p95);
        var spanW = Math.max(6, x95 - x5).toFixed(1);

        svg += '<text x="' + (padL - 12) + '" y="' + (y + 18) + '" text-anchor="end" font-size="12" font-weight="700" fill="currentColor">' + a.label + '</text>';
        svg += '<rect x="' + padL + '" y="' + (y + 2) + '" width="' + plotW + '" height="24" rx="5" fill="currentColor" fill-opacity="0.05"/>';
        svg += '<rect x="' + x5.toFixed(1) + '" y="' + (y + 4) + '" width="' + spanW + '" height="20" rx="4" fill="' + a.col + '" fill-opacity="0.28" stroke="' + a.col + '" stroke-width="1.5"/>';
        svg += '<circle cx="' + x5.toFixed(1) + '" cy="' + (y + 14) + '" r="5.5" fill="' + a.col + '"/>';
        svg += '<circle cx="' + xM.toFixed(1) + '" cy="' + (y + 14) + '" r="5.5" fill="var(--bg)" stroke="currentColor" stroke-width="2.2"/>';

        svg += '<text x="' + (W - padR + 10) + '" y="' + (y + 12) + '" font-size="11" font-weight="700" fill="' + a.col + '">5th pct: ' + a.p5.toLocaleString() + ' nodes</text>';
        svg += '<text x="' + (W - padR + 10) + '" y="' + (y + 26) + '" font-size="10.5" fill="currentColor" opacity="0.8">Mean: ' + a.mean.toLocaleString() + ' \u00b7 95th: ' + a.p95.toLocaleString() + '</text>';
      });

      ensSvg.innerHTML = svg;
    }

    function renderCadence(){
      if(!cadSvg) return;
      var W = 880, H = 260, padL = 220, padR = 230, padT = 28;
      var plotW = W - padL - padR;
      var svg = '';

      if(curBat === 'cadence'){
        var cads = [
          { label: '7-day cadence (rapid)', dev: 16.0, col: '#d97706', note: '16.0% dev \u00b7 76.4K/d vol \u00b7 728 floor steps (overreacts)' },
          { label: '14-day cadence (spec default)', dev: 22.0, col: '#94a3b8', note: '22.0% dev \u00b7 aligns with 14d governance window' },
          { label: '21-day cadence (optimal)', dev: 15.5, col: '#10b981', note: '15.5% dev (best) \u00b7 62.7K/d vol \u00b7 146 floor steps' },
          { label: '30-day cadence (slow)', dev: 21.0, col: '#94a3b8', note: '21.0% dev \u00b7 lags 18-month shock recovery' }
        ];
        var maxD = 26.0;
        cads.forEach(function(c, idx){
          var y = padT + idx * 50;
          var bw = Math.max(6, (c.dev / maxD) * plotW).toFixed(1);
          svg += '<text x="' + (padL - 10) + '" y="' + (y + 20) + '" text-anchor="end" font-size="12" font-weight="600" fill="currentColor">' + c.label + '</text>';
          svg += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + plotW + '" height="22" rx="4" fill="currentColor" fill-opacity="0.05"/>';
          svg += '<rect x="' + padL + '" y="' + (y + 4) + '" width="' + bw + '" height="22" rx="4" fill="' + c.col + '"/>';
          svg += '<text x="' + (padL + parseFloat(bw) + 8) + '" y="' + (y + 19) + '" font-size="11" font-weight="600" fill="currentColor">' + c.note + '</text>';
        });
      } else {
        var mechs = [
          { label: 'Slashing treasury inflow (5y)', pct: 95, col: '#0ea5e9', note: '269M to 354M MESH moved to treasury (dominates supply)' },
          { label: 'Burn-mint equilibrium (5y peak)', pct: 4, col: '#94a3b8', note: 'Peak BME 0.0061 (<0.05% of 5-year supply dynamics)' },
          { label: 'Wash-trading capture (no PoC)', pct: 60, col: '#dc2626', note: '3.00% fraudulent reward capture without verification' },
          { label: 'Wash-trading capture (with PoC)', pct: 4, col: '#10b981', note: '0.09% median capture across 200 Monte Carlo runs (-97%)' },
          { label: 'Voting Gini (quadratic rep)', pct: 72, col: '#10b981', note: 'Compresses raw token Gini 0.89 \u2192 0.72 (20% whale \u2192 ~8% vote)' }
        ];
        mechs.forEach(function(m, idx){
          var y = padT + idx * 42;
          var bw = Math.max(6, (m.pct / 100) * plotW).toFixed(1);
          svg += '<text x="' + (padL - 10) + '" y="' + (y + 18) + '" text-anchor="end" font-size="11.5" font-weight="600" fill="currentColor">' + m.label + '</text>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + plotW + '" height="18" rx="4" fill="currentColor" fill-opacity="0.05"/>';
          svg += '<rect x="' + padL + '" y="' + (y + 3) + '" width="' + bw + '" height="18" rx="4" fill="' + m.col + '"/>';
          svg += '<text x="' + (padL + parseFloat(bw) + 8) + '" y="' + (y + 16) + '" font-size="11" font-weight="600" fill="currentColor">' + m.note + '</text>';
        });
      }

      cadSvg.innerHTML = svg;
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-b1-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-b1-tab');
        root.querySelectorAll('button[data-b1-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pEns = document.getElementById('b1-panel-ensemble');
        var pCad = document.getElementById('b1-panel-cadence');
        if(pEns) pEns.hidden = target !== 'ensemble';
        if(pCad) pCad.hidden = target !== 'cadence';
        if(target === 'cadence') renderCadence(); else renderEnsemble();
        return;
      }

      var scenBtn = e.target.closest('button[data-b1-scen]');
      if(scenBtn){
        curScen = scenBtn.getAttribute('data-b1-scen') || 'competitor';
        root.querySelectorAll('button[data-b1-scen]').forEach(function(b){
          var on = b === scenBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderEnsemble();
        return;
      }

      var batBtn = e.target.closest('button[data-b1-bat]');
      if(batBtn){
        curBat = batBtn.getAttribute('data-b1-bat') || 'cadence';
        root.querySelectorAll('button[data-b1-bat]').forEach(function(b){
          var on = b === batBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderCadence();
      }
    });

    renderEnsemble();
    renderCadence();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initB1Explorer);
  } else {
    initB1Explorer();
  }
})();

/* ==========================================================================
   Routing the Dollar (#a1-routing-explorer): Monetary-Policy Regime & SVB/Chain Explorer
   ========================================================================== */
(function(){
  function initA1RoutingExplorer(){
    var root = document.getElementById('a1-routing-explorer');
    if(!root) return;

    var curMacro = 'null';
    var curStress = 'svb';

    function renderMacro(){
      var sumEl = document.getElementById('a1-macro-summary');
      var barsEl = document.getElementById('a1-macro-bars');
      if(!sumEl || !barsEl) return;

      if(curMacro === 'null'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Stablecoin supply (Fed securities + ON RRP)</span><span class="b4-stat__val">Trace 46.01 (p = 0.025)</span><span class="b4-stat__sub">Exceeds 43.3 critical value at lag 8; block bootstrap p = 0.032</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Bitcoin cointegration test</span><span class="b4-stat__val">p = 0.83 (Null)</span><span class="b4-stat__sub">No long-run equilibrium with Fed balance-sheet variables</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Ethereum cointegration test</span><span class="b4-stat__val">p = 0.57 (Null)</span><span class="b4-stat__sub">Confirms transmission channel is dollar-specific</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Securities held outright kurtosis</span><span class="b4-stat__val">0.02 vs 41.6</span><span class="b4-stat__sub">Avoids March 2023 emergency-facility spike ($354B) in total assets</span></div>';

        var rows = [
          { label: 'Dollar stablecoin supply (3-variable system, lag 8)', val: 46.01, max: 55, badge: 'Trace 46.01 vs 43.3 CV (p = 0.025)', note: 'Cointegrated under conditional randomization null (size 0.05) and block bootstrap (p = 0.032)' },
          { label: '95% conditional randomization critical value (lag 8)', val: 43.30, max: 55, badge: 'CV = 43.30', note: 'Size-controlled threshold accounting for non-stationary finite-sample persistence' },
          { label: 'Ethereum (ETH) placebo system', val: 24.80, max: 55, badge: 'p = 0.57 (Null)', note: 'No statistically significant cointegrating vector with Fed securities + ON RRP' },
          { label: 'Bitcoin (BTC) placebo system', val: 19.40, max: 55, badge: 'p = 0.83 (Null)', note: 'No statistically significant cointegrating vector; rules out generic crypto beta' }
        ];
        barsEl.innerHTML = rows.map(function(r){
          var pct = Math.min(100, (r.val / r.max) * 100).toFixed(1);
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.label + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      } else if(curMacro === 'mbs'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Quantitative tightening (QT) trace</span><span class="b4-stat__val">48.18 (CV = 29.80)</span><span class="b4-stat__sub">Strongest cointegration regime as reserve spread widens</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Full-sample MBS trace (157 weeks)</span><span class="b4-stat__val">30.68 (CV = 29.80)</span><span class="b4-stat__sub">Clears 95% threshold across Feb 2023 to Jan 2026</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Easing regime trace &amp; level r</span><span class="b4-stat__val">17.71 (r = -0.98)</span><span class="b4-stat__sub">Supply nearly doubled ($162B to $305B) after Sep 2024 rate cut</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Pre-cut 180d rolling correlation</span><span class="b4-stat__val">+0.06</span><span class="b4-stat__sub">Near-zero bivariate correlation during late tightening</span></div>';

        var mbsRows = [
          { label: 'Quantitative tightening regime (MBS specification)', val: 48.18, max: 55, badge: 'Trace 48.18 (95% CV = 29.80)', note: 'High Treasury bill rates widen issuer reserve carry; strongest equilibrium tie' },
          { label: 'Full 157-week sample (Feb 2023 to Jan 2026)', val: 30.68, max: 55, badge: 'Trace 30.68 (95% CV = 29.80)', note: 'Spans both tightening and post-September 2024 easing phases' },
          { label: '95% Johansen trace critical value (MBS system)', val: 29.80, max: 55, badge: 'CV = 29.80', note: 'Standard 5% significance threshold for rank-0 test' },
          { label: 'Easing regime (post-September 2024 rate cuts)', val: 17.71, max: 55, badge: 'Trace 17.71 | Level r = -0.98', note: 'Lower T-bill yields compress gap against DeFi lending rates; aggregate supply expanded from $162B to $305B' }
        ];
        barsEl.innerHTML = mbsRows.map(function(r){
          var pct = Math.min(100, (r.val / r.max) * 100).toFixed(1);
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.label + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      } else {
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Yield-spread Granger causality</span><span class="b4-stat__val">F = 11.30 (p = 0.001)</span><span class="b4-stat__sub">3m T-bill minus on-chain lending rate (Compound / Aave) forecasts supply growth</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">26-week variance share (FEVD)</span><span class="b4-stat__val">13.9% MBS / 2.2% Outright</span><span class="b4-stat__sub">5-week smoothed equilibrium adjustment half-life</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">25 FOMC meetings event study</span><span class="b4-stat__val">Null (p = 0.092 adj.)</span><span class="b4-stat__sub">No announcement effect survives Bonferroni correction</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Issuer bank-deposit recycling</span><span class="b4-stat__val">4% to 100%</span><span class="b4-stat__sub">Tether ~4%, Circle ~14%, Gemini ~100% held in bank deposits</span></div>';

        var spRows = [
          { label: 'Gemini (GUSD) bank-deposit reserve recycling share', val: 100, max: 100, badge: '~100% bank deposits', note: 'Reserves remain inside commercial banking perimeter' },
          { label: 'Circle (USDC) bank-deposit reserve recycling share', val: 14, max: 100, badge: '~14% bank deposits', note: '86% in short-duration Treasuries and repo via Circle Reserve Fund (BNY)' },
          { label: 'Fed + ON RRP 26-week forecast-error variance share (MBS system)', val: 13.9, max: 100, badge: '13.9% variance share', note: '2.2% in securities-held-outright system; 5-week error-correction half-life' },
          { label: 'Tether (USDT) bank-deposit reserve recycling share', val: 4, max: 100, badge: '~4% bank deposits', note: 'Predominantly Treasury bills and repo; minimal commercial-bank deposit recycling' }
        ];
        barsEl.innerHTML = spRows.map(function(r){
          var pct = Math.min(100, (r.val / r.max) * 100).toFixed(1);
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.label + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      }
    }

    function renderStress(){
      var sumEl = document.getElementById('a1-stress-summary');
      var barsEl = document.getElementById('a1-stress-bars');
      if(!sumEl || !barsEl) return;

      if(curStress === 'svb'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Tier 1 gateway volume swing</span><span class="b4-stat__val">63% -> 13% -> 57%</span><span class="b4-stat__sub">51.8 pp drop (2.7 SD below normal) during SVB weekend</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Escape-valve peak retention</span><span class="b4-stat__val">Curve 3pool 12.35x</span><span class="b4-stat__sub">$2.33B/d vs 28-day baseline as swaps exited USDC</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Within-Tier 1 divergence</span><span class="b4-stat__val">Coinbase 2.63x vs Circle 1.39x</span><span class="b4-stat__sub">Near-identical CLII (0.85 vs 0.92), opposite stress retention</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">PSM reserve-chain contagion</span><span class="b4-stat__val">DAI, USDP ($0.91), GUSD ($0.96)</span><span class="b4-stat__sub">Depegged with zero direct SVB bank exposure via DAI PSM</span></div>';

        var svbRows = [
          { name: 'Curve 3pool (Tier 3, CLII 0.18)', mult: 12.35, vol: '$2.33B/d', note: 'Primary permissionless escape-valve router during weekend banking closure' },
          { name: 'BitGo (Tier 1, CLII 0.80)', mult: 6.80, vol: '$0.09B/d', note: 'Institutional custody reallocation flow' },
          { name: '1inch (Tier 3, CLII 0.18)', mult: 5.57, vol: '$0.72B/d', note: 'DEX aggregator routing displaced stablecoin swaps across pools' },
          { name: 'OKX (Tier 2, CLII 0.40)', mult: 3.44, vol: '$0.43B/d', note: 'Offshore exchange 24/7 secondary-market routing' },
          { name: 'Bybit (Tier 2, CLII 0.40)', mult: 3.39, vol: '$0.14B/d', note: 'Offshore exchange settlement flow' },
          { name: 'Coinbase (Tier 1, CLII 0.85)', mult: 2.63, vol: '$4.03B/d', note: '56% of Tier 1 volume; no direct SVB reserve lockup' },
          { name: 'Binance (Tier 2, CLII 0.38)', mult: 2.20, vol: '$4.39B/d', note: 'Largest gross volume hub; absorbed $16.1B post-BUSD migration toward USDT' },
          { name: 'Kraken (Tier 2, CLII 0.58)', mult: 2.14, vol: '$0.82B/d', note: 'Secondary fiat and stablecoin conversion venue' },
          { name: 'Tether Treasury (Tier 2, CLII 0.45)', mult: 1.77, vol: '$0.45B/d', note: 'Gained ~$1.7B net supply over 5 days while USDC lost $5.1B' },
          { name: 'Circle Treasury (Tier 1, CLII 0.92)', mult: 1.39, vol: '$3.42B/d', note: '$3.3B SVB reserve exposure disclosed; primary redemptions bottlenecked over weekend' }
        ];
        barsEl.innerHTML = svbRows.map(function(r){
          var pct = Math.min(100, (r.mult / 12.35) * 100).toFixed(1);
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.mult.toFixed(2) + 'x (' + r.vol + ')</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      } else {
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Ethereum Tier 1 share (gross / net)</span><span class="b4-stat__val">41% gross / 47% net</span><span class="b4-stat__sub">Coinbase (56%) + Circle (44%) form Tier 1 duopoly</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Cross-chain Tier 1 presence</span><span class="b4-stat__val">11% Solana / 0% Tron</span><span class="b4-stat__sub">Tron is 58% Tier 3 protocols and 42% Tier 2 offshore</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Entity HHI (gross / net)</span><span class="b4-stat__val">2,742 / 2,583</span><span class="b4-stat__sub">Exceeds DOJ/FTC 1,800 threshold for highly concentrated markets</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Wintermute counterparty share</span><span class="b4-stat__val">1.4% -> 19.9%</span><span class="b4-stat__sub">Unique counterparties fell 25%; cross-gateway pairs 5.8% -> 2.6%</span></div>';

        var chainRows = [
          { name: 'Ethereum mainnet: Tier 1 regulated gateway share (net of internal rebalancing)', val: 47.0, badge: '47.0% net (41.0% gross)', note: 'Tier 2 is 50% net (55% gross); Tier 3 is 4% (Nansen rank correlation = 0.94)' },
          { name: 'Wintermute share of identified counterparty volume (end of 35-month window)', val: 19.9, badge: '1.4% -> 19.9%', note: 'Expanded across post-BUSD secondary routing while Cumberland fell from 3.3% to 0.1%' },
          { name: 'Solana: Tier 1 regulated gateway share', val: 11.0, badge: '~11.0% Tier 1', note: 'Predominantly Tier 2 exchange and Tier 3 DEX aggregator routing' },
          { name: 'USDT on Ethereum: share routed through Tier 1 regulated gateways', val: 10.8, badge: '10.8% via Tier 1', note: 'Offshore-issued token still touches U.S.-regulated gateways on 10.8% of Ethereum flow' },
          { name: 'Tron & BNB Chain: Tier 1 regulated gateway share', val: 0.5, badge: '0.0% Tier 1 (58% Tier 3 on Tron)', note: 'Zero monitored Tier 1 gateway presence on Tron or BNB Chain' }
        ];
        barsEl.innerHTML = chainRows.map(function(r){
          var pct = Math.min(100, (r.val / 50) * 100).toFixed(1);
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      }
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-a1-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-a1-tab');
        root.querySelectorAll('button[data-a1-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pMacro = document.getElementById('a1-panel-macro');
        var pStress = document.getElementById('a1-panel-stress');
        if(pMacro) pMacro.hidden = target !== 'macro';
        if(pStress) pStress.hidden = target !== 'stress';
        if(target === 'stress') renderStress(); else renderMacro();
        return;
      }

      var macroBtn = e.target.closest('button[data-a1-macro]');
      if(macroBtn){
        curMacro = macroBtn.getAttribute('data-a1-macro') || 'null';
        root.querySelectorAll('button[data-a1-macro]').forEach(function(b){
          var on = b === macroBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderMacro();
        return;
      }

      var stressBtn = e.target.closest('button[data-a1-stress]');
      if(stressBtn){
        curStress = stressBtn.getAttribute('data-a1-stress') || 'svb';
        root.querySelectorAll('button[data-a1-stress]').forEach(function(b){
          var on = b === stressBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderStress();
      }
    });

    renderMacro();
    renderStress();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initA1RoutingExplorer);
  } else {
    initA1RoutingExplorer();
  }
})();

/* ==========================================================================
   MVEP (#a2-mvep-explorer): 14-Product Composite Rating & 20-Regime Insolvency Matrix
   ========================================================================== */
(function(){
  function initA2MvepExplorer(){
    var root = document.getElementById('a2-mvep-explorer');
    if(!root) return;

    var curDim = 'overall';
    var curCohort = 'sample';

    var products = [
      { name: 'BENJI (Franklin Templeton 1940 Act MMF)', overall: 3.5, legal: 3.7, legalGate: 'Non-Equivalent', op: 3.2, opGate: 'Non-Equivalent', econ: 3.0, econGate: 'Non-Equivalent', disc: 'Adequate', bind: 'Economic / Collateral Operability FAIL (no 24/7 pool) & Cat 1/8' },
      { name: 'RLUSD (Ripple / NYDFS Trust)', overall: 3.5, legal: 3.0, legalGate: 'Non-Equivalent', op: 3.5, opGate: 'Non-Equivalent', econ: 4.3, econGate: 'Substantially Eq.', disc: 'Partial', bind: 'Legal / Rights Parity FAIL (sole product passing CSA companion test)' },
      { name: 'JPMD (JPMorgan Deposit Token)', overall: 3.3, legal: 3.7, legalGate: 'Indeterminate', op: 3.0, opGate: 'Non-Equivalent', econ: 3.7, econGate: 'Indeterminate', disc: 'None published', bind: 'Operational / Governance & Change Control FAIL (sole non-fail on C1)' },
      { name: 'BUIDL (BlackRock / BVI Reg D Fund)', overall: 3.2, legal: 3.0, legalGate: 'Non-Equivalent', op: 3.7, opGate: 'Non-Equivalent', econ: 3.3, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Legal / Rights Parity FAIL & recursive USDC CSA dependency' },
      { name: 'USDY (Ondo Tokenized Secured Note)', overall: 3.2, legal: 3.3, legalGate: 'Non-Equivalent', op: 3.5, opGate: 'Non-Equivalent', econ: 3.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Economic / Cash Settlement Asset FAIL & Legal / Rights Parity FAIL' },
      { name: 'USDG (Paxos / MAS & Global Dollar)', overall: 3.0, legal: 3.3, legalGate: 'Non-Equivalent', op: 3.2, opGate: 'Non-Equivalent', econ: 3.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Economic / Settlement Finality FAIL & Legal / Rights Parity FAIL' },
      { name: 'DAI (MakerDAO No-Entity Protocol)', overall: 2.9, legal: 1.0, legalGate: 'Non-Equivalent', op: 3.3, opGate: 'Non-Equivalent', econ: 2.7, econGate: 'Non-Equivalent', disc: 'Adequate', bind: 'Legal / Rights Parity & Cat 5 FAIL* (no legal entity or debtor claim)' },
      { name: 'PYUSD (PayPal / Paxos OCC Trust J3F)', overall: 2.8, legal: 2.7, legalGate: 'Non-Equivalent', op: 3.0, opGate: 'Non-Equivalent', econ: 3.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Legal / Rights Parity FAIL & J3F OCC trust insolvency ambiguity' },
      { name: 'USDC (Circle / State MTL + GENIUS J3)', overall: 2.7, legal: 3.3, legalGate: 'Non-Equivalent', op: 3.2, opGate: 'Non-Equivalent', econ: 2.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Economic / Settlement Finality FAIL (13% SVB par divergence)' },
      { name: 'OUSG (Ondo Delaware LP Wrapper)', overall: 2.6, legal: 2.3, legalGate: 'Non-Equivalent', op: 2.7, opGate: 'Non-Equivalent', econ: 2.7, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Legal / Rights Parity FAIL & composed BUIDL -> USDC settlement chain' },
      { name: 'USYC (Circle / Cayman-Bermuda J6xJ7)', overall: 2.5, legal: 2.7, legalGate: 'Non-Equivalent', op: 2.3, opGate: 'Non-Equivalent', econ: 2.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Economic / Collateral Operability FAIL & Marex prime-broker custody' },
      { name: 'SoFiUSD (SoFi Bank Non-Deposit J2S)', overall: 2.5, legal: 2.3, legalGate: 'Non-Equivalent', op: 2.3, opGate: 'Non-Equivalent', econ: 2.7, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Legal / Rights Parity FAIL ($99.76M/$100.01M uninsured demand deposits)' },
      { name: 'USD1 (WLF / BitGo OCC Trust J3F)', overall: 2.4, legal: 2.3, legalGate: 'Non-Equivalent', op: 2.7, opGate: 'Non-Equivalent', econ: 1.7, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Economic / Settlement Finality FAIL (0 passing cells across 11 tests)' },
      { name: 'USDT (Tether / El Salvador CNAD J8)', overall: 2.1, legal: 1.0, legalGate: 'Non-Equivalent', op: 2.5, opGate: 'Non-Equivalent', econ: 2.0, econGate: 'Non-Equivalent', disc: 'Partial', bind: 'Legal / Rights Parity & Cat 5 Insolvency FAIL (0/6 statutory protections)' }
    ];

    var regimesSample = [
      { id: 'J1', name: 'US registered fund (1940 Act) [BENJI]', pass: 7, part: 0, fail: 0, verdict: 'PASS (7/7 Pass)', note: 'ICA s.17(f) custody, s.18(f)(1) priority, Ch.15, Rule 2a-7/22e-3, Reserve Primary 99.1c recovery' },
      { id: 'J7', name: 'Bermuda (DABA / BMA) [USYC issuer]', pass: 3, part: 4, fail: 0, verdict: 'PARTIAL (3 Pass, 4 Partial)', note: 'DABA s.18(4) statutory trust + 2025 Custody Rules; dual-layer split with Cayman fund (J6)' },
      { id: 'J2', name: 'US bank deposit (FDI Act) [JPMD]', pass: 4, part: 1, fail: 2, verdict: 'PARTIAL (Claim-side substitute)', note: 'D2/D4/D6/D7 PASS (12 USC 1821(d)(11) depositor preference); D1/D5 FAIL* structurally inapplicable' },
      { id: 'J3', name: 'US trust / MTL + dormant GENIUS [USDC]', pass: 2, part: 5, fail: 0, verdict: 'PARTIAL (Re-score trigger July 2026)', note: 'D3 Ch.15 & D5 23 NYCRR 200.9 PASS; GENIUS s.10(c)/s.11 enacted but dormant until effective date' },
      { id: 'J9', name: 'Singapore (PSA / MAS / IRDA) [USDG]', pass: 2, part: 5, fail: 0, verdict: 'PARTIAL (PSR reg 18B in force)', note: 'D3 IRDA s.252 & D5 reg 18C PASS; MAS SCS final framework unlegislated' },
      { id: 'J4', name: 'Delaware LP / UCC Art. 9 [OUSG, USDY]', pass: 2, part: 4, fail: 1, verdict: 'PARTIAL (Note) / AMBIGUOUS (LP)', note: 'D2/D3 PASS; D4 FAIL (no product statute); D5 Partial(+) on UCC 9-322 note backstop, LP fails' },
      { id: 'J6', name: 'Cayman fund (CIMA / Companies Act) [USYC fund]', pass: 0, part: 7, fail: 0, verdict: 'AMBIGUOUS (0 Pass, 7 Partial)', note: 'CIMA Segregation Rule 5.2/5.5; s.37(7) redeemed-vs-unredeemed rank split (Primeo / Herald)' },
      { id: 'J5', name: 'BVI fund (Insolvency Act 2003) [BUIDL]', pass: 0, part: 6, fail: 1, verdict: 'AMBIGUOUS (D5 rehypothecation FAIL)', note: 'MFR reg 7 segregation PARTIAL, but no statutory rehypothecation limit in BVI fund law (D5 FAIL)' },
      { id: 'J2S', name: 'US insured bank, non-deposit stablecoin [SoFiUSD]', pass: 0, part: 5, fail: 2, verdict: 'AMBIGUOUS (D1 & D5 FAIL)', note: 'Not a deposit: FDIC insurance & depositor preference disclaimed; $99.76M/$100.01M uninsured cash' },
      { id: 'J3F', name: 'OCC uninsured national trust bank [USD1, PYUSD]', pass: 0, part: 4, fail: 3, verdict: 'AMBIGUOUS (D3, D5, D7 FAIL)', note: '12 CFR Part 51 receivership; NYDFS layer scoped away; no statutory rehypothecation constraint' },
      { id: 'J8', name: 'El Salvador (CNAD / quiebra) [USDT]', pass: 0, part: 1, fail: 6, verdict: 'FAIL (6/7 Fail)', note: 'Zero statutory segregation, priority, or rehypothecation limits; 3-jurisdiction split (SV/BVI/HK)' },
      { id: 'J10', name: 'No-entity protocol [DAI]', pass: 0, part: 0, fail: 7, verdict: 'FAIL* (7/7 Structural Inapplicability)', note: 'No legal entity, debtor, claim, or insolvency forum exists; Black Thursday resolved outside law' }
    ];

    var regimesIntl = [
      { id: 'J14A', name: 'UAE Abu Dhabi free zone (ADGM FSRA)', pass: 6, part: 0, fail: 1, verdict: '6/7 PASS (D7 untested)', note: 'COBS 14.12 deemed trust + S263(2) insolvency primacy + Ch 19A super-priority + Model Law (S271)' },
      { id: 'J11', name: 'EU MiCA (Reg 2023/1114) [EURC]', pass: 4, part: 2, fail: 1, verdict: '4/7 PASS (D1, D2, D4, D5)', note: 'MiCA Art 54 + EMD2 Art 7(1) statutory segregation & priority; D6 national-law override gap' },
      { id: 'J13', name: 'Hong Kong (Stablecoins Ord. Cap. 656 / HKMA)', pass: 4, part: 2, fail: 1, verdict: '4/7 PASS (D1, D2, D4, D5)', note: 'Cap. 656 Sch 2 statutory trust & priority; common-law comity (no UNCITRAL Model Law)' },
      { id: 'J14Z', name: 'UAE Dubai free zone (VARA Rulebooks)', pass: 4, part: 2, fail: 1, verdict: '4/7 PASS (D1, D2, D4, D5)', note: 'Custody III.B + FRVA III.B.4 estate exclusion; onshore UAE federal insolvency forum' },
      { id: 'J16', name: 'Japan PSA EPI framework (FSA 2025)', pass: 4, part: 2, fail: 1, verdict: '4/7 PASS (D1, D2, D4, D5)', note: 'PSA Art 2(9) trust + Art 59(1) holder priority + 50% deposit floor; no in-class precedent' },
      { id: 'J14', name: 'UAE federal (CBUAE PTSR Circular 2/2024)', pass: 3, part: 3, fail: 1, verdict: '3/7 PASS (D2, D4, D5)', note: 'PTSR Art 22.5 priority & escrow; D1 bank-vs-nonbank split under Decree-Law 51' },
      { id: 'J15', name: 'Switzerland (DLT Act 2021 / DEBA Art 242a)', pass: 3, part: 3, fail: 1, verdict: '3/7 PASS (D1, D4, D5)', note: 'DEBA Art 242a bankruptcy surrender & Banking Act Art 37d; no special crypto-holder priority class' },
      { id: 'J12', name: 'UK (FCA CP25/14 + EMR 2011 / Ipagoo)', pass: 1, part: 5, fail: 1, verdict: '1/7 PASS (D3 CBIR Model Law)', note: 'Ipagoo [2022] EWCA Civ 302 confirmed statutory trust + asset-pool top-up, but FCA regime still draft' }
    ];

    function renderComposite(){
      var sumEl = document.getElementById('a2-comp-summary');
      var barsEl = document.getElementById('a2-comp-bars');
      if(!sumEl || !barsEl) return;

      var sorted = products.slice().sort(function(a, b){
        var va = curDim === 'legal' ? a.legal : (curDim === 'operational' ? a.op : (curDim === 'economic' ? a.econ : a.overall));
        var vb = curDim === 'legal' ? b.legal : (curDim === 'operational' ? b.op : (curDim === 'economic' ? b.econ : b.overall));
        return (vb - va) || (b.overall - a.overall);
      });

      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Headline equivalence rate</span><span class="b4-stat__val">0 of 14 Equivalent</span><span class="b4-stat__sub">Non-compensatory floor caps every product on its weakest dimension</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Highest overall strength</span><span class="b4-stat__val">BENJI &amp; RLUSD (3.5)</span><span class="b4-stat__sub">Followed by JPMD (3.3), BUIDL (3.2), and USDY (3.2)</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Sole dimension above Indeterminate</span><span class="b4-stat__val">RLUSD Economic (4.3)</span><span class="b4-stat__sub">Substantially Equivalent on Economic; sole CSA companion Pass</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Universal legal ceiling</span><span class="b4-stat__val">UCC Art. 12 Subtest 1.1</span><span class="b4-stat__sub">13 of 14 fail Cat 1 Rights Parity; JPMD alone is Indeterminate (3.7)</span></div>';

      barsEl.innerHTML = sorted.map(function(p){
        var score = curDim === 'legal' ? p.legal : (curDim === 'operational' ? p.op : (curDim === 'economic' ? p.econ : p.overall));
        var gate = curDim === 'legal' ? p.legalGate : (curDim === 'operational' ? p.opGate : (curDim === 'economic' ? p.econGate : 'Non-Equivalent'));
        var pct = Math.min(100, (score / 5.0) * 100).toFixed(1);
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + p.name + '</span><span class="b4-bar-row__val">' + gate + ' · ' + score.toFixed(1) + ' / 5.0</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">Legal ' + p.legal.toFixed(1) + ' (' + p.legalGate + ') · Operational ' + p.op.toFixed(1) + ' · Economic ' + p.econ.toFixed(1) + ' (' + p.econGate + ') · Disclosure: ' + p.disc + ' · Binding: ' + p.bind + '</div>' +
        '</div>';
      }).join('');
    }

    function renderCat5(){
      var sumEl = document.getElementById('a2-cat5-summary');
      var barsEl = document.getElementById('a2-cat5-bars');
      if(!sumEl || !barsEl) return;

      var list = curCohort === 'intl' ? regimesIntl : regimesSample;
      if(curCohort === 'sample'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Only 7/7 Pass regime</span><span class="b4-stat__val">J1: 1940 Act (BENJI)</span><span class="b4-stat__sub">Statutory custody, flat capital structure, and 99.1c recovery precedent</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Charter-relocation traps</span><span class="b4-stat__val">J2S (SoFiUSD) &amp; J3F (USD1/PYUSD)</span><span class="b4-stat__sub">Federal charters relocate claims without curing non-deposit or D5 gaps</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Offshore dispersion</span><span class="b4-stat__val">Bermuda J7 vs El Salvador J8</span><span class="b4-stat__sub">Bermuda passes D1/D4/D5; El Salvador fails 6 of 7 dimensions</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Structural inapplicability (Fail*)</span><span class="b4-stat__val">J2 (D1/D5) &amp; J10 (7/7)</span><span class="b4-stat__sub">Separates no-custodied-asset / no-entity from weak statutory regimes</span></div>';
      } else {
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Highest international score</span><span class="b4-stat__val">J14A: ADGM (6/7 Pass)</span><span class="b4-stat__sub">Deemed trust + S263(2) insolvency primacy + UNCITRAL Model Law</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">4/7 Pass statutory regimes</span><span class="b4-stat__val">MiCA, HK Cap. 656, VARA, Japan</span><span class="b4-stat__sub">All pass D1 segregation, D2 priority, D4 statute, and D5 rehypothecation</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Universal international gap</span><span class="b4-stat__val">D7 Recovery Record (0/8 Pass)</span><span class="b4-stat__sub">No bespoke payment-stablecoin regime has completed an in-class insolvency</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Forced-conversion gap (D6)</span><span class="b4-stat__val">7 of 8 Partial</span><span class="b4-stat__sub">National insolvency moratoria and reorganization powers remain open</span></div>';
      }

      barsEl.innerHTML = list.map(function(r){
        var scorePts = r.pass * 1.0 + r.part * 0.5;
        var pct = Math.min(100, (scorePts / 7.0) * 100).toFixed(1);
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.id + ': ' + r.name + '</span><span class="b4-bar-row__val">' + r.verdict + '</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">Dimensions: ' + r.pass + ' Pass · ' + r.part + ' Partial · ' + r.fail + ' Fail/Fail* · ' + r.note + '</div>' +
        '</div>';
      }).join('');
    }

    root.addEventListener('click', function(e){
      var tabBtn = e.target.closest('button[data-a2-tab]');
      if(tabBtn){
        var target = tabBtn.getAttribute('data-a2-tab');
        root.querySelectorAll('button[data-a2-tab]').forEach(function(b){
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pComp = document.getElementById('a2-panel-composite');
        var pCat5 = document.getElementById('a2-panel-cat5');
        if(pComp) pComp.hidden = target !== 'composite';
        if(pCat5) pCat5.hidden = target !== 'cat5';
        if(target === 'cat5') renderCat5(); else renderComposite();
        return;
      }

      var dimBtn = e.target.closest('button[data-a2-dim]');
      if(dimBtn){
        curDim = dimBtn.getAttribute('data-a2-dim') || 'overall';
        root.querySelectorAll('button[data-a2-dim]').forEach(function(b){
          var on = b === dimBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderComposite();
        return;
      }

      var cohortBtn = e.target.closest('button[data-a2-cohort]');
      if(cohortBtn){
        curCohort = cohortBtn.getAttribute('data-a2-cohort') || 'sample';
        root.querySelectorAll('button[data-a2-cohort]').forEach(function(b){
          var on = b === cohortBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderCat5();
      }
    });

    renderComposite();
    renderCat5();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initA2MvepExplorer);
  } else {
    initA2MvepExplorer();
  }
})();

/* ==========================================================================
   Frameworks (#tdrc-simulator): Tokenized Dollar Regime Classifier Simulator
   ========================================================================== */
(function(){
  function initTdrcSimulator(){
    var root = document.getElementById('tdrc-simulator');
    if(!root) return;

    var state = { c1: 1.0, c2: 1.0, c3: 1.5, i1: 1.5, i2: 1.5, i3: 1.0 };
    var presets = {
      baseline: { c1: 1.0, c2: 1.0, c3: 1.5, i1: 1.5, i2: 1.5, i3: 1.0, desc: '2026 Baseline: Issuers retain Treasury reserve carry and high concentration (USDC/USDT), while exchanges and routers control last-mile distribution and holds.' },
      control:  { c1: 2.0, c2: 1.5, c3: 1.5, i1: 0.5, i2: 1.0, i3: 1.0, desc: 'Router-Centric CLARITY Equilibrium: Commoditized multi-issuer PPSI minting; wallets, exchanges, and automated sweep wrappers capture float and routing economics.' },
      issuer:   { c1: 0.5, c2: 0.5, c3: 1.0, i1: 2.0, i2: 1.5, i3: 1.5, desc: 'Reserve-Carry Duopoly: Settlement concentrates in one or two dominant issuers that keep reserve spread and gate direct mint/burn access.' },
      bank:     { c1: 1.5, c2: 1.5, c3: 1.5, i1: 1.5, i2: 1.5, i3: 1.5, desc: 'Bank Deposit-Token Walled Garden: Vertically integrated banks own both the obligated interface and the settlement liability; high scores on both axes contest the margin.' }
    };

    var activePreset = 'baseline';

    function render(){
      var sumEl = document.getElementById('tdrc-sim-summary');
      var barsEl = document.getElementById('tdrc-sim-bars');
      if(!sumEl || !barsEl) return;

      var cScore = state.c1 + state.c2 + state.c3;
      var iScore = state.i1 + state.i2 + state.i3;
      var diff = cScore - iScore;

      var regime = 'Split / Contested';
      var econOwner = 'Contested between reserve float (issuers) and routing/sweep fees (interfaces)';
      if(cScore >= 4.0 && diff >= 2.0){
        regime = 'Control-Dominant';
        econOwner = 'Distribution & interfaces capture economics (sweep defaults, wrapper yield, order flow)';
      } else if(iScore >= 4.0 && (-diff) >= 2.0){
        regime = 'Issuer-Dominant';
        econOwner = 'Issuers capture economics (Treasury reserve carry, direct mint/burn gatekeeping)';
      }

      var signStr = diff > 0 ? ('+' + diff.toFixed(1) + ' Control') : (diff < 0 ? ('+' + (-diff).toFixed(1) + ' Issuer') : '0.0 Parity');

      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Active TDRC Regime</span><span class="b4-stat__val">' + regime + '</span><span class="b4-stat__sub">Rule: score >= 4.0 and margin >= 2.0 over rival axis</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">ControlScore (0 to 6)</span><span class="b4-stat__val">' + cScore.toFixed(1) + ' / 6.0</span><span class="b4-stat__sub">C1 (' + state.c1.toFixed(1) + ') + C2 (' + state.c2.toFixed(1) + ') + C3 (' + state.c3.toFixed(1) + ')</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">IssuerScore (0 to 6)</span><span class="b4-stat__val">' + iScore.toFixed(1) + ' / 6.0</span><span class="b4-stat__sub">I1 (' + state.i1.toFixed(1) + ') + I2 (' + state.i2.toFixed(1) + ') + I3 (' + state.i3.toFixed(1) + ')</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Axis differential &amp; value capture</span><span class="b4-stat__val">' + signStr + '</span><span class="b4-stat__sub">' + econOwner + '</span></div>';

      var cPct = Math.min(100, (cScore / 6.0) * 100).toFixed(1);
      var iPct = Math.min(100, (iScore / 6.0) * 100).toFixed(1);

      function stepBtns(key, val){
        return [0, 0.5, 1.0, 1.5, 2.0].map(function(v){
          var on = Math.abs(val - v) < 0.01;
          return '<button type="button" class="tdrc-step-btn' + (on ? ' is-active' : '') + '" data-tdrc-comp="' + key + '" data-tdrc-val="' + v + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + v.toFixed(1) + '</button>';
        }).join('');
      }

      var noteText = (presets[activePreset] && presets[activePreset].desc) || 'Custom component configuration: adjust any of the six 0-to-2 components below to test threshold crossings.';

      barsEl.innerHTML =
        '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">ControlScore (Interfaces, Wallets, Routers, Default Sweeps)</span><span class="b4-bar-row__val">' + cScore.toFixed(1) + ' / 6.0</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + cPct + '%"></div></div>' +
        '</div>' +
        '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">IssuerScore (Mint/Burn Issuers, Reserve Carry, Settlement Concentration)</span><span class="b4-bar-row__val">' + iScore.toFixed(1) + ' / 6.0</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + iPct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">' + noteText + '</div>' +
        '</div>' +
        '<div class="tdrc-comp-grid">' +
          '<div class="tdrc-axis-col">' +
            '<h5>ControlScore components (0 to 2 each)</h5>' +
            '<div class="tdrc-comp-row"><span><strong>C1.</strong> Obligated-interface share of flows</span><span class="tdrc-comp-steps">' + stepBtns('c1', state.c1) + '</span></div>' +
            '<div class="tdrc-comp-row"><span><strong>C2.</strong> Default sweep &amp; wrapper penetration</span><span class="tdrc-comp-steps">' + stepBtns('c2', state.c2) + '</span></div>' +
            '<div class="tdrc-comp-row"><span><strong>C3.</strong> Holds / freeze usage as operating norm</span><span class="tdrc-comp-steps">' + stepBtns('c3', state.c3) + '</span></div>' +
          '</div>' +
          '<div class="tdrc-axis-col">' +
            '<h5>IssuerScore components (0 to 2 each)</h5>' +
            '<div class="tdrc-comp-row"><span><strong>I1.</strong> Settlement-object concentration</span><span class="tdrc-comp-steps">' + stepBtns('i1', state.i1) + '</span></div>' +
            '<div class="tdrc-comp-row"><span><strong>I2.</strong> Reserve carry retention by issuer</span><span class="tdrc-comp-steps">' + stepBtns('i2', state.i2) + '</span></div>' +
            '<div class="tdrc-comp-row"><span><strong>I3.</strong> Direct mint &amp; burn gatekeeping</span><span class="tdrc-comp-steps">' + stepBtns('i3', state.i3) + '</span></div>' +
          '</div>' +
        '</div>';
    }

    root.addEventListener('click', function(e){
      var pBtn = e.target.closest('button[data-tdrc-preset]');
      if(pBtn){
        var pKey = pBtn.getAttribute('data-tdrc-preset') || 'baseline';
        var p = presets[pKey];
        if(p){
          activePreset = pKey;
          state.c1 = p.c1; state.c2 = p.c2; state.c3 = p.c3;
          state.i1 = p.i1; state.i2 = p.i2; state.i3 = p.i3;
          root.querySelectorAll('button[data-tdrc-preset]').forEach(function(b){
            var on = b === pBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          render();
        }
        return;
      }

      var cBtn = e.target.closest('button[data-tdrc-comp]');
      if(cBtn){
        var comp = cBtn.getAttribute('data-tdrc-comp');
        var val = parseFloat(cBtn.getAttribute('data-tdrc-val'));
        if(comp && !isNaN(val) && state.hasOwnProperty(comp)){
          state[comp] = val;
          activePreset = 'custom';
          root.querySelectorAll('button[data-tdrc-preset]').forEach(function(b){
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          render();
        }
      }
    });

    render();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initTdrcSimulator);
  } else {
    initTdrcSimulator();
  }
})();

/* ==========================================================================
   Paper Pages (.access-cite-btn): One-Click APA/Chicago Citation & BibTeX Copy
   ========================================================================== */
(function(){
  function getMeta(name){
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  function buildCitationData(){
    var title = getMeta('citation_title');
    var hEl = document.getElementById('paper-title') || document.getElementById('letter-title') || document.querySelector('h1');
    if(!title && hEl){
      title = (hEl.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if(!title) return null;
    var author = getMeta('citation_author') || getMeta('author') || 'Zach Zukowski';
    var dateStr = getMeta('citation_publication_date') || '';
    if(!dateStr){
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for(var i = 0; i < scripts.length; i++){
        var m = (scripts[i].textContent || '').match(/"datePublished"\s*:\s*"([^"]+)"/);
        if(m && m[1]){ dateStr = m[1]; break; }
      }
    }
    var year = (dateStr.match(/\d{4}/) || ['2026'])[0];
    var doi = getMeta('citation_doi') || '';
    var canonEl = document.querySelector('link[rel="canonical"]');
    var url = getMeta('citation_fulltext_html_url') || (canonEl ? canonEl.getAttribute('href') : '') || window.location.href;
    var journal = getMeta('citation_journal_title') || '';
    if(!journal){
      if(window.location.pathname.indexOf('/letters/') === 0){
        var strip = document.querySelector('.paper-metadata-strip');
        var docketPart = strip ? (strip.textContent || '').split(/[·\u00b7]/)[0].trim() : '';
        journal = docketPart ? ('Federal Comment Letter (' + docketPart + '), Tokenization Systems') : 'Federal Comment Letter, Tokenization Systems';
      } else if(getMeta('citation_title')){
        journal = 'SSRN Working Paper';
      } else {
        journal = 'Tokenization Systems Research Briefing';
      }
    }
    var vol = getMeta('citation_volume') || '';
    var page = getMeta('citation_firstpage') || '';

    var parts = author.split(/\s+/);
    var last = parts.length > 1 ? parts[parts.length - 1] : author;
    var first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    var authorFormatted = first ? (last + ', ' + first) : author;

    var venueText = journal;
    if(vol && page){
      venueText = journal + ' ' + vol + ':' + page;
    }

    var textCite = authorFormatted + ' (' + year + '). "' + title + '." ' + venueText + (doi ? ('. https://doi.org/' + doi) : ('. ' + url));

    var slugWord = (title.toLowerCase().match(/[a-z0-9]{4,}/) || ['paper'])[0];
    var bibKey = last.toLowerCase().replace(/[^a-z0-9]/g, '') + year + slugWord;
    var bibLines = [
      '@article{' + bibKey + ',',
      '  author = {' + authorFormatted + '},',
      '  title = {' + title + '},',
      '  journal = {' + journal + '},',
      '  year = {' + year + '},'
    ];
    if(vol) bibLines.push('  volume = {' + vol + '},');
    if(page) bibLines.push('  pages = {' + page + '},');
    if(doi) bibLines.push('  doi = {' + doi + '},');
    bibLines.push('  url = {' + url + '}');
    bibLines.push('}');

    return { text: textCite, bibtex: bibLines.join('\n') };
  }

  function initPaperCitationCopy(){
    var btns = document.querySelectorAll('.access-cite-btn[data-cite-format]');
    if(!btns.length) return;
    var data = buildCitationData();
    if(!data) return;

    Array.prototype.forEach.call(btns, function(btn){
      var origLabel = btn.textContent;
      btn.addEventListener('click', function(){
        var fmt = btn.getAttribute('data-cite-format');
        var payload = fmt === 'bibtex' ? data.bibtex : data.text;
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(payload).then(function(){
            btn.textContent = fmt === 'bibtex' ? 'Copied BibTeX' : 'Copied citation';
            setTimeout(function(){ btn.textContent = origLabel; }, 1600);
          }).catch(function(){});
        }
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initPaperCitationCopy);
  } else {
    initPaperCitationCopy();
  }
})();

/* ==========================================================================
   Agent Infrastructure (#ai-control-explorer): Advisory Saturation vs Hard Gates
   ========================================================================== */
(function(){
  function initAiControlExplorer(){
    var root = document.getElementById('ai-control-explorer');
    if(!root) return;
    var curAdv = 'classes';
    var curGate = 'refusals';

    function renderAdv(){
      var sumEl = document.getElementById('ai-adv-summary');
      var barsEl = document.getElementById('ai-adv-bars');
      if(!sumEl || !barsEl) return;

      if(curAdv === 'classes'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Top-6 warning coverage</span><span class="b4-stat__val">21,698 of 24,166 (90%)</span><span class="b4-stat__sub">73-day study; fleet-wide total now 63,230 across 37 classes</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Highest-volume repeat rate</span><span class="b4-stat__val">84% saturation</span><span class="b4-stat__sub">Pipe-exit misread (13,975 firings across 2,260 workspaces)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Classes requiring hard gate</span><span class="b4-stat__val">3 of 6 (&gt;60% repeat)</span><span class="b4-stat__sub">Pipe-exit (84%), edit-running-script (69%), recursive-delete (64%)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Classes consistent with teaching</span><span class="b4-stat__val">2 of 6 (~30% repeat)</span><span class="b4-stat__sub">Ancestry-as-landedness (32%), destructive-probe check (29%)</span></div>';

        var rows = [
          { name: 'Pipe-exit misread (failed command treated as success)', rate: 84, badge: '84% repeat · 13,975 firings (2,260 workspaces)', note: 'Verdict: Requires an enforcing gate; unambiguous subset armed (2,080 blocked, <1% override)' },
          { name: 'Edit running script (live script modified in place)', rate: 69, badge: '69% repeat · 1,674 firings (518 workspaces)', note: 'Verdict: Requires an enforcing gate; advisory warning alone does not stop recurrence' },
          { name: 'Recursive delete (broad rm -rf or directory wipe path)', rate: 64, badge: '64% repeat · 2,143 firings (780 workspaces)', note: 'Verdict: Requires an enforcing gate; destructive signature intercepted at point of action' },
          { name: 'Unscoped negative claim (absence claimed without scoped search)', rate: 50, badge: '50% repeat · 2,271 firings (1,128 workspaces)', note: 'Verdict: Borderline (returns in half of workspaces; dropped from 64% to 48% in equal-span test)' },
          { name: 'Ancestry as landedness (history position used as deployment proof)', rate: 32, badge: '32% repeat · 994 firings (679 workspaces)', note: 'Verdict: Consistent with teaching; repeats in fewer than one-third of workspaces' },
          { name: 'Destructive-probe check (delete-protection gate tested unsafely)', rate: 29, badge: '29% repeat · 641 firings (454 workspaces)', note: 'Verdict: Consistent with teaching; lowest saturation among the top six classes' }
        ];
        barsEl.innerHTML = rows.map(function(r){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.rate + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      } else {
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Equal-span window length</span><span class="b4-stat__val">595.6 hours (24.8d)</span><span class="b4-stat__sub">Symmetric windows before and after 2026-08-04 control-maturity boundary</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Pipe-exit misread trajectory</span><span class="b4-stat__val">81% -> 87% (+6 pp)</span><span class="b4-stat__sub">2,683 firings pre-Aug 4 vs 7,767 post-Aug 4; confirmed need for deny gate</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Unscoped-absence trajectory</span><span class="b4-stat__val">64% -> 48% (-16 pp)</span><span class="b4-stat__sub">606 firings pre-Aug 4 vs 1,078 post-Aug 4; consistent with teaching</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">CPU-load launch-gate confound</span><span class="b4-stat__val">22.0% -> 1.8% failure</span><span class="b4-stat__sub">29% override rate during CPU contention fell to 0 overrides (10/543 reads)</span></div>';

        var eqRows = [
          { name: 'Pipe-exit misread: Post-Aug 4 equal-span window (595.6h)', val: 87, badge: '87% repeat (7,767 firings)', note: 'Up from 81% (2,683 firings) in pre-Aug 4 window; high saturation persists across equal spans' },
          { name: 'Pipe-exit misread: Pre-Aug 4 equal-span window (595.6h)', val: 81, badge: '81% repeat (2,683 firings)', note: 'Baseline window prior to deny-mode escalation on unambiguous pipe patterns' },
          { name: 'Unscoped negative claim: Pre-Aug 4 equal-span window (595.6h)', val: 64, badge: '64% repeat (606 firings)', note: 'Initial high recurrence before companion retrieval-gating and prompt refinements' },
          { name: 'Unscoped negative claim: Post-Aug 4 equal-span window (595.6h)', val: 48, badge: '48% repeat (1,078 firings)', note: '16 percentage point drop across identical observation span' },
          { name: 'Ownership-read launch gate: High CPU contention week (Aug 2026)', val: 29, badge: '22% read timeout · 29% override rate', note: 'Slow state reads under machine load trained agents to bypass or retry' },
          { name: 'Ownership-read launch gate: Normal machine load (543 attempts)', val: 1.8, badge: '1.8% read failure (10/543) · 0% overrides', note: '5 blocked launches and zero overrides with no code change to the gate itself' }
        ];
        barsEl.innerHTML = eqRows.map(function(r){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.val + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      }
    }

    function renderGates(){
      var sumEl = document.getElementById('ai-gate-summary');
      var barsEl = document.getElementById('ai-gate-bars');
      if(!sumEl || !barsEl) return;

      if(curGate === 'refusals'){
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Fleet-wide hard-gate hold rate</span><span class="b4-stat__val">99.56% (199 of 200)</span><span class="b4-stat__sub">13,098 stopped of 13,156 attempts; 58 documented overrides</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">73-day single-host table</span><span class="b4-stat__val">2,547 blocked / 49 overrides</span><span class="b4-stat__sub">98.1% hold rate across the 7 initial armed gate classes</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Largest armed gate class</span><span class="b4-stat__val">2,080 blocked (&lt;1% override)</span><span class="b4-stat__sub">Deny mode of pipe-exit misread (9 overrides; 99.6% hold rate)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Zero-override gate class</span><span class="b4-stat__val">48 blocked / 0 overrides</span><span class="b4-stat__sub">Malformed shared config write gate (100% hold rate since 2026-07-26)</span></div>';

        var gRows = [
          { name: 'Writing a malformed shared config (first seen 2026-07-26)', hold: 100.0, badge: '100.0% hold · 48 blocked, 0 overrides (0% override)', note: 'Prevents a single broken configuration line from halting every concurrent session' },
          { name: 'Misreading a piped command exit status (first seen 2026-08-08)', hold: 99.6, badge: '99.6% hold · 2,080 blocked, 9 overrides (<1% override)', note: 'Intercepts unambiguous pipe-exit misreads at point of execution' },
          { name: 'Rewriting critical shared config (first seen 2026-08-05)', hold: 97.0, badge: '97.0% hold · 32 blocked, 1 override (3% override)', note: 'Protects shared operating instructions across concurrent agents' },
          { name: 'Destroying a git stash (first seen 2026-07-11)', hold: 94.1, badge: '94.1% hold · 144 blocked, 9 overrides (6% override)', note: 'Prevents dropping stashed work another session may still need' },
          { name: 'Shell modifier that silently truncates (first seen 2026-08-18)', hold: 92.1, badge: '92.1% hold · 186 blocked, 16 overrides (8% override)', note: 'Stops right-looking output generated from a truncated command path' },
          { name: 'Force-deleting a branch (first seen 2026-07-10)', hold: 84.2, badge: '84.2% hold · 32 blocked, 6 overrides (16% override)', note: 'Blocks unmerged branch deletion where no second copy exists' },
          { name: 'Garbage-collecting the object store (first seen 2026-07-31)', hold: 75.8, badge: '75.8% hold · 25 blocked, 8 overrides (24% override)', note: 'Prevents pruning unreferenced objects during concurrent worktree activity' }
        ];
        barsEl.innerHTML = gRows.map(function(r){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.hold.toFixed(1) + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      } else {
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Diagnostic pattern</span><span class="b4-stat__val">11 silent failures</span><span class="b4-stat__sub">Every signal looked healthy until a second measurement checked outcomes</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Provenance &amp; delivery</span><span class="b4-stat__val">3 failures</span><span class="b4-stat__sub">Confabulated finding IDs, truncated startup files, stale hook bytes</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Control &amp; gate semantics</span><span class="b4-stat__val">4 failures</span><span class="b4-stat__sub">84% warning repeat, partial deny coverage (15%), CPU-driven blocks, stale HTTP buffer</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Queue &amp; corpus accounting</span><span class="b4-stat__val">4 failures</span><span class="b4-stat__sub">Exited process lock, impossible 95/d absolute sweep, bounded scan cap, 446/455 unread additions</span></div>';

        var sRows = [
          { name: '1. Shared finding reference & 2. Startup procedure truncation', pct: 100, badge: 'Apparent: Valid citation & full load -> Measured: Missing record & size-limit cut', note: 'Fix: Require existing record resolution at save time; verify UTF-16/line caps on load' },
          { name: '3. Highest-volume warning & 4. Failed-command deny coverage', pct: 84, badge: 'Apparent: Warning taught safety -> Measured: 84% workspace repeat; 11,886 of 13,975 stayed advisory', note: 'Fix: Grade warnings by workspace saturation; separate unambiguous deny subset (2,080) from advisory remainder' },
          { name: '5. New-work launch gate & 6. Claimed task ownership', pct: 78, badge: 'Apparent: Conflict block & active owner -> Measured: 22% CPU timeout & exited holder', note: 'Fix: Measure machine-load confounds; replace PID ownership with time-bounded committed leases' },
          { name: '7. Queue-sweeping duty & 8. Open-backlog bounded scan', pct: 70, badge: 'Apparent: Role failure & full backlog -> Measured: 95/d arrival impossibility & 22 resolved items un-scanned', note: 'Fix: Replace absolute sweep with arrival/closure rate target (95/50); report unmeasured remainder explicitly' },
          { name: '9. External-record verifier & 10. Committed hook rule', pct: 62, badge: 'Apparent: Fresh live pass & active rule -> Measured: Timed-out stale buffer & old checkout hook bytes', note: 'Fix: Clear buffer + test known-false ID + emit could-not-determine; compare committed bytes vs live hook bytes' },
          { name: '11. Catalogued reading corpus growth (732 to 1,186 entries)', pct: 55, badge: 'Apparent: Unread gap shrinking -> Measured: 446 of 455 weekly additions marked unread', note: 'Fix: Separate catalog ingestion count from verified-read completion count' }
        ];
        barsEl.innerHTML = sRows.map(function(r){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      }
    }

    root.addEventListener('click', function(e){
      var tBtn = e.target.closest('button[data-ai-tab]');
      if(tBtn){
        var target = tBtn.getAttribute('data-ai-tab');
        root.querySelectorAll('button[data-ai-tab]').forEach(function(b){
          var on = b === tBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pAdv = document.getElementById('ai-panel-advisory');
        var pGates = document.getElementById('ai-panel-gates');
        if(pAdv) pAdv.hidden = target !== 'advisory';
        if(pGates) pGates.hidden = target !== 'gates';
        if(target === 'gates') renderGates(); else renderAdv();
        return;
      }
      var aBtn = e.target.closest('button[data-ai-adv]');
      if(aBtn){
        curAdv = aBtn.getAttribute('data-ai-adv') || 'classes';
        root.querySelectorAll('button[data-ai-adv]').forEach(function(b){
          var on = b === aBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderAdv();
        return;
      }
      var gBtn = e.target.closest('button[data-ai-gate]');
      if(gBtn){
        curGate = gBtn.getAttribute('data-ai-gate') || 'refusals';
        root.querySelectorAll('button[data-ai-gate]').forEach(function(b){
          var on = b === gBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderGates();
      }
    });

    renderAdv();
    renderGates();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAiControlExplorer);
  } else {
    initAiControlExplorer();
  }
})();

/* ==========================================================================
   Field Guide (#field-guide-explorer): 4 Dollar Objects & 6-Step Diligence Router
   ========================================================================== */
(function(){
  function initFieldGuideExplorer(){
    var root = document.getElementById('field-guide-explorer');
    if(!root) return;
    var curObj = 'stablecoin';
    var curRoute = 'stablecoin';

    var objects = {
      stablecoin: {
        rulebook: 'GENIUS Act (PPSI) / State MTL / Trust',
        claim: 'Contractual or statutory reserve claim (not a deposit)',
        insolvency: 'GENIUS s.11 priority (when active); state/offshore split today',
        stress2am: 'On-chain swaps stay live; direct fiat mint/burn bottlenecked by banking hours',
        bars: [
          { label: '24/7 secondary-market & DeFi transferability', pct: 95, val: 'High (permissionless / blocklist)', note: 'Settles 24/7 on public chains, but par value can diverge during banking-hour reserve lockups (SVB 13% gap)' },
          { label: 'Direct par redemption & banking-hour independence', pct: 55, val: 'Gateway-contingent', note: 'Direct mint/burn gated by whitelisted institutional accounts and commercial-bank wire rails' },
          { label: 'Insolvency & customer-property protection (MVEP Cat 5)', pct: 50, val: 'Regime-dependent (J3 / J3F / J8)', note: 'Spans NYDFS trust/MTL (Partial), OCC uninsured trust (Ambiguous), to El Salvador (Fail)' },
          { label: 'Yield pass-through to end holder', pct: 15, val: 'Prohibited (GENIUS s.4(a)(11))', note: 'Issuers retain Treasury reserve carry; yield migrates to wrappers, sweeps, or distributor revenue-share' }
        ]
      },
      tokdep: {
        rulebook: 'Federal Banking Law (FDI Act / OCC IL 1188)',
        claim: 'Direct deposit liability of the issuing commercial bank',
        insolvency: 'FDIC insurance (to $250k) + 12 USC 1821(d)(11) depositor preference',
        stress2am: 'Internal 24/7 book transfer; single-bank perimeter',
        bars: [
          { label: 'Insolvency & depositor-preference protection', pct: 90, val: 'Strong (FDI Act resolution)', note: 'Same legal liability, supervision, and resolution waterfall as a traditional bank deposit' },
          { label: 'Same-bank 24/7 settlement & collateral mobility', pct: 85, val: 'High within issuing bank', note: 'Eliminates weekend cutoff inside the bank ledger mirror for internal treasury and margin moves' },
          { label: 'Cross-bank fungibility & open-network composability', pct: 20, val: 'Low (non-fungible single-bank)', note: 'An HSBC tokenized deposit is redeemable only at HSBC; does not settle across external institutions' },
          { label: 'Public disclosure & on-chain change-control transparency', pct: 40, val: 'Permissioned / bilateral', note: 'Operates on bank-controlled permissioned instances without public timelocks' }
        ]
      },
      deptok: {
        rulebook: 'Federal Banking Law + Interbank Clearing Rules',
        claim: 'Fungible bank deposit liability on a dedicated multi-bank ledger',
        insolvency: 'FDIA depositor preference (J2); MVEP Legal & Economic Indeterminate (3.7)',
        stress2am: '24/7 interbank settlement across accepting institutions',
        bars: [
          { label: 'Legal & economic equivalence profile (MVEP Exhibit 3)', pct: 74, val: '3.7 / 5.0 (Indeterminate)', note: 'JPMD is the sole product in the 14-product MVEP sample not failing Category 1 Rights Parity' },
          { label: 'Cross-institution settlement & wholesale fungibility', pct: 80, val: 'Multi-bank rail (JPMD / DBS / BNY)', note: 'Designed to settle across accepting banks rather than remaining locked to one core ledger' },
          { label: 'Market-structure concentration risk (Three Strategies)', pct: 85, val: 'High (24-month tipping dynamics)', note: 'Without neutral clearing (Ubyx-style), network effects tip settlement toward a single bank issuer' },
          { label: 'On-chain governance & public disclosure (MVEP Cat 8 & 9)', pct: 35, val: 'Binding constraint (3.0 Op.)', note: 'Held back from full equivalence by unilateral bank operator override and non-public rulebooks' }
        ]
      },
      mmf: {
        rulebook: 'Investment Company Act of 1940 (Rule 2a-7) / Reg D / Reg S',
        claim: 'Beneficial fund share, LP interest, or secured note',
        insolvency: '7/7 Pass for 1940 Act (BENJI J1); Ambiguous for BVI/LP (BUIDL J5, OUSG J4)',
        stress2am: '2am Saturday margin-call gap: finite USDC pool vs Monday NAV',
        bars: [
          { label: 'Statutory asset segregation & insolvency posture (1940 Act J1)', pct: 100, val: '7/7 Pass (BENJI 3.5 overall)', note: 'ICA s.17(f) qualified custody and s.18(f)(1) capital structure; offshore BVI/Cayman wrappers score lower' },
          { label: 'Holder yield & Treasury carry pass-through', pct: 95, val: 'Direct NAV / dividend accrual', note: 'Primary destination for yield when payment stablecoins are barred from paying interest' },
          { label: '2am Saturday collateral liquidation (MVEP Cat 10)', pct: 45, val: 'Constrained by pool & whitelist', note: 'Instant-redemption pools (BUIDL -> USDC) are finite and inherit recursive USDC settlement risk' },
          { label: 'Counterparty transparency in off-exchange margin pools', pct: 30, val: 'Opaque commingling risk', note: 'USYC, BUIDL, and BENJI accepted in off-exchange margin pools without counterparty election' }
        ]
      }
    };

    var routes = {
      stablecoin: {
        target: 'Stablecoin or payment gateway',
        anchor: 'Routing the Dollar + Seven Dollars + MVEP',
        primaryGate: 'CLII (0 to 1) + MVEP Cat 1, 5, 6 & CSA',
        focus: 'Gateway bank exposure, reserve segregation, and 24/7 conversion',
        steps: [
          { step: '1. Classify', pct: 100, tool: 'Comparative Framework for Dollar Products (Seven Dollars)', action: 'Partition For-US-holders (PPSI anchor: USDC, PYUSD, RLUSD) vs Offshore-targeted (USDT) across 5 design markers.' },
          { step: '2. Trace', pct: 90, tool: 'Routing the Dollar + Credit Migration Model', action: 'Map reserve custody, bank-deposit recycling share (Tether ~4%, Circle ~14%, Gemini ~100%), and PSM contagion links.' },
          { step: '3. Map', pct: 85, tool: 'Control Layer Intensity Index (CLII) + TDRC', action: 'Score all routing gateways across licensing, transparency, freeze authority, compliance, and geo-restrictions.' },
          { step: '4. Compare', pct: 80, tool: 'MVEP (10 categories + CSA companion test) + 3CRD', action: 'Verify Category 1 Rights Parity, Category 5 Jurisdiction Matrix (J1 to J16), and 3CRD point-of-use disclosures.' },
          { step: '5. Stress', pct: 75, tool: 'SVB & BUSD Gateway Rotation Benchmark', action: 'Test weekend bank closure (Tier 1 swing 63% -> 13%) and cease-mint regulatory wind-down routing.' },
          { step: '6. Decide', pct: 70, tool: 'Committee Gate & Continuous Drift Trigger', action: 'Set counterparty caps, require 24-hour CLII drift notification, and define fallback settlement rails.' }
        ]
      },
      treasury: {
        target: 'Tokenized Treasury or MMF collateral',
        anchor: 'Minimum Viable Equivalence Pack (MVEP) + Seven Dollars',
        primaryGate: 'MVEP Cat 4, 5, 10 & Recursive CSA',
        focus: '2am Saturday margin liquidation, whitelist locks, and recursive USDC redemption',
        steps: [
          { step: '1. Classify', pct: 100, tool: 'Four Legal Structures Taxonomy (MVEP Section 5)', action: 'Distinguish 1940 Act MMF (BENJI J1), BVI Reg D fund (BUIDL J5), Delaware LP (OUSG J4), and secured note (USDY).' },
          { step: '2. Trace', pct: 92, tool: 'Composed-Product Layer Audit + Recursive CSA', action: 'Trace every wrapper layer to its cash settlement asset (e.g., OUSG -> BUIDL -> Circle USDC instant pool).' },
          { step: '3. Map', pct: 84, tool: 'Transfer-Agent & Custodian Control Map', action: 'Identify the transfer agent (Securitize / Franklin), custodian (BNY / Ceffu / Marex), and admin key signers.' },
          { step: '4. Compare', pct: 78, tool: 'MVEP Exhibit 2 (Cat 5 Matrix) & Exhibit 3 (Composite)', action: 'Compare non-compensatory Legal, Operational, and Economic grades; check D5 statutory rehypothecation limits.' },
          { step: '5. Stress', pct: 88, tool: 'Seven Collateral Stress Scenarios (2am Saturday Test)', action: 'Simulate simultaneous instant-pool depletion, whitelist secondary-market illiquidity, and weekend NAV closure.' },
          { step: '6. Decide', pct: 72, tool: 'Collateral Haircut & Eligibility Schedule', action: 'Assign regime-differentiated haircuts and prohibit undisclosed commingling in off-exchange margin pools.' }
        ]
      },
      equity: {
        target: 'Tokenized equity or clearing rail',
        anchor: 'Three Tokenization Strategies + Tokenized Equity Vehicles',
        primaryGate: 'Tokenization Infrastructure Map + MVEP Cat 2, 3 & 8',
        focus: 'Transfer-agent single point of failure, corporate actions, and DTC vs on-chain books',
        steps: [
          { step: '1. Classify', pct: 100, tool: 'Tokenization Infrastructure Map (Three Strategies)', action: 'Classify as Strategy 1 (Nasdaq-DTC CSD-native), Strategy 2 (ICE-NYSE venue), or Strategy 3 (Securitize-Broadridge).' },
          { step: '2. Trace', pct: 90, tool: ' Investor Claim & Custody Chain Audit', action: 'Separate direct § 224 registered ownership from Jersey SPV tracker certificates (xStocks) or OTC derivatives (Robinhood).' },
          { step: '3. Map', pct: 88, tool: '10-Entity Shared-Dependency Matrix', action: 'Audit cross-strategy chokepoints: Securitize (all 3 strategies), BNY, Cantina, and Chainlink CCIP/oracles.' },
          { step: '4. Compare', pct: 82, tool: 'MVEP Cat 2 (System of Record) & Cat 3 (Reconciliation)', action: 'Verify authoritative book hierarchy when 24/7 token transfers cross ex-dividend, split, or proxy-record cutoffs.' },
          { step: '5. Stress', pct: 80, tool: 'Shared-Operator Outage & Off-Hours Drift Simulator', action: 'Test a single-operator transfer-agent halt or weekend price divergence against closed cash equity markets.' },
          { step: '6. Decide', pct: 74, tool: 'Settlement & Corporate-Actions Sign-Off', action: 'Require explicit loss-allocation rules for record breaks and multi-issuer deposit-token clearing (Ubyx-style).' }
        ]
      },
      depin: {
        target: 'DePIN or protocol token economy',
        anchor: 'Adaptive Tokenomics + Operational Risk + Governance + Who Burns',
        primaryGate: 'PID Stress Audit + S2R / Burn HHI + PCA-Corrected HHI',
        focus: 'Fiscal sustainability (S2R > 1), payer concentration, and threshold-induced reputation collapse',
        steps: [
          { step: '1. Classify', pct: 100, tool: 'Burn Mechanism Classification (Who Burns the Tokens?)', action: 'Classify payment architecture: Direct burn (Helium), Direct fee (Livepeer), Buy-and-burn (GEODNET), or Relayer.' },
          { step: '2. Trace', pct: 90, tool: 'Five-Class PCA Exclusion Typology (Governance Concentration)', action: 'Strip burn, locker, bridge, foundation, and treasury addresses before computing holder concentration (2.3x median bias).' },
          { step: '3. Map', pct: 85, tool: 'Delegation Amplification & Insider Retention Diagnostic', action: 'Check whether delegation amplifies voting HHI above holdings (13 of 18 protocols) and track insider wallet retention.' },
          { step: '4. Compare', pct: 82, tool: 'Subsidy-to-Revenue (S2R) & Demand-Payer HHI Matrix', action: 'Pair trailing S2R trajectory with on-chain burn-signer HHI (Helium 0.27; Top-5 payers = 90% of burn).' },
          { step: '5. Stress', pct: 92, tool: '624-Config ValOS/NORS Operational Risk & 240-Run PID Battery', action: 'Test 14-day PID emission cadence and verify reputation recovery threshold sits below realistic operator uptime (95% vs 99%).' },
          { step: '6. Decide', pct: 75, tool: 'Constitutional Parameter & Treasury Covenant Gate', action: 'Bound emission responsiveness, set multi-source demand disclosures, and enforce timelocked parameter governance.' }
        ]
      },
      agentic: {
        target: 'Agentic payment rail or AI fleet',
        anchor: 'Who Controls Agentic Payments? + Agent Infrastructure + FSB AI Letter',
        primaryGate: 'CLII-AI + MVEP-AI + Buyer-Cardinality Classifier',
        focus: 'Facilitator monopoly HHI, subsidy pipeline distortion, and advisory vs hard-gate hold rate',
        steps: [
          { step: '1. Classify', pct: 100, tool: 'MVEP-AI 5-Deployment-Class Taxonomy', action: 'Classify as Agentic system / x402 rail, Composed RAG product, Enterprise API, Frontier chat, or Open-weight deployment.' },
          { step: '2. Trace', pct: 92, tool: 'x402 Settlement Fingerprint & Proxy-Leg Reconciliation', action: 'Trace EIP-3009 / SPL settlement through the facilitator set and strip 2-hop proxy double-counting (-36.6% on Base).' },
          { step: '3. Map', pct: 90, tool: 'Count vs Value Facilitator HHI & Buyer Cardinality', action: 'Measure facilitator HHI on both count and dollar layers and compute payments per distinct buyer (26.7 Base vs 144k Polygon).' },
          { step: '4. Compare', pct: 85, tool: 'CLII-AI (5 dimensions) & MVEP-AI (10 categories)', action: 'Audit session-attributed provenance, time-bounded task leases, and irreversible push-payment loss allocation.' },
          { step: '5. Stress', pct: 88, tool: 'Advisory Saturation vs Armed Hard-Gate Outcome Test', action: 'Measure workspace repeat rate after warnings (84% pipe-exit) vs armed gate hold rate (99.56%, 13,098 of 13,156 stopped).' },
          { step: '6. Decide', pct: 78, tool: 'Operator Perimeter & Actuator Arming Sign-Off', action: 'Replace high-repeat advisories with narrow hard gates, require known-false verifier checks, and gate outbound acts.' }
        ]
      }
    };

    function renderObjects(){
      var sumEl = document.getElementById('fg-obj-summary');
      var barsEl = document.getElementById('fg-obj-bars');
      if(!sumEl || !barsEl) return;
      var d = objects[curObj] || objects.stablecoin;
      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Governing rulebook</span><span class="b4-stat__val">' + d.rulebook + '</span><span class="b4-stat__sub">Determines supervisory perimeter and statutory hooks</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Holder legal claim</span><span class="b4-stat__val">' + d.claim + '</span><span class="b4-stat__sub">What the token holder actually owns in law</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Insolvency posture</span><span class="b4-stat__val">' + d.insolvency + '</span><span class="b4-stat__sub">MVEP Category 5 treatment if issuer or bank fails</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">2am Saturday stress behavior</span><span class="b4-stat__val">' + d.stress2am + '</span><span class="b4-stat__sub">Off-hours liquidity and conversion bottleneck</span></div>';

      barsEl.innerHTML = d.bars.map(function(b){
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.label + '</span><span class="b4-bar-row__val">' + b.val + '</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">' + b.note + '</div>' +
        '</div>';
      }).join('');
    }

    function renderRouter(){
      var sumEl = document.getElementById('fg-route-summary');
      var barsEl = document.getElementById('fg-route-bars');
      if(!sumEl || !barsEl) return;
      var r = routes[curRoute] || routes.stablecoin;
      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Evaluation target</span><span class="b4-stat__val">' + r.target + '</span><span class="b4-stat__sub">Selected six-step decision path</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Primary research anchors</span><span class="b4-stat__val">' + r.anchor + '</span><span class="b4-stat__sub">Empirical and framework papers for this class</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Core scoring instruments</span><span class="b4-stat__val">' + r.primaryGate + '</span><span class="b4-stat__sub">Entry-gate and continuous-monitoring tools</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Primary failure seam</span><span class="b4-stat__val">' + r.focus + '</span><span class="b4-stat__sub">Where committee diligence concentrates first</span></div>';

      barsEl.innerHTML = r.steps.map(function(s){
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + s.step + '</span><span class="b4-bar-row__val">' + s.tool + '</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + s.pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">' + s.action + '</div>' +
        '</div>';
      }).join('');
    }

    root.addEventListener('click', function(e){
      var tBtn = e.target.closest('button[data-fg-tab]');
      if(tBtn){
        var target = tBtn.getAttribute('data-fg-tab');
        root.querySelectorAll('button[data-fg-tab]').forEach(function(b){
          var on = b === tBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pObj = document.getElementById('fg-panel-objects');
        var pRou = document.getElementById('fg-panel-router');
        if(pObj) pObj.hidden = target !== 'objects';
        if(pRou) pRou.hidden = target !== 'router';
        if(target === 'router') renderRouter(); else renderObjects();
        return;
      }
      var oBtn = e.target.closest('button[data-fg-obj]');
      if(oBtn){
        curObj = oBtn.getAttribute('data-fg-obj') || 'stablecoin';
        root.querySelectorAll('button[data-fg-obj]').forEach(function(b){
          var on = b === oBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderObjects();
        return;
      }
      var rBtn = e.target.closest('button[data-fg-route]');
      if(rBtn){
        curRoute = rBtn.getAttribute('data-fg-route') || 'stablecoin';
        root.querySelectorAll('button[data-fg-route]').forEach(function(b){
          var on = b === rBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderRouter();
      }
    });

    renderObjects();
    renderRouter();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initFieldGuideExplorer);
  } else {
    initFieldGuideExplorer();
  }
})();

/* ==========================================================================
   Frameworks (#ai-framework-explorer): CLII-AI & MVEP-AI Deployment Comparator
   ========================================================================== */
(function(){
  function initAiFrameworkExplorer(){
    var root = document.getElementById('ai-framework-explorer');
    if(!root) return;
    var curCls = 'agentic';
    var curDim = 'all';

    var classes = {
      agentic: {
        name: 'Agentic systems & x402 payment rails',
        clii: '0.28 to 0.62 (Split by facilitator / harness)',
        gate: 'Non-Equivalent (Cat 1, 6, 8 & 10 bind)',
        seam: 'Irreversible push-payment + unlicensed facilitator HHI (4,040 to 6,009)',
        bars: [
          { label: 'CLII-AI D1: Regulatory licensing & supervisory perimeter', pct: 25, val: '0.25 (Unlicensed facilitator layer)', note: 'x402 facilitators broadcast EIP-3009 / SPL authorizations without money-transmitter or payment-institution licensing' },
          { label: 'CLII-AI D3: Access gating, holds & actuator enforcement', pct: 68, val: '0.68 (Armed harness gates vs protocol irreversibility)', note: 'Fleet hard gates hold 99.56% (13,098/13,156), but once x402 settles on-chain no protocol chargeback exists' },
          { label: 'MVEP-AI Cat 2 & 3: System of record & lease reconciliation', pct: 85, val: 'Pass on committed leases; Fail on unattributed sellers', note: 'Time-bounded git leases prevent orphan tasks; top 25 Base x402 sellers remain pseudonymous' },
          { label: 'MVEP-AI Cat 6 & CSA: Execution finality & subsidy distortion', pct: 35, val: 'Fail (36.6% proxy overcount; 144k/buyer Polygon fleet)', note: 'Requires buyer-cardinality filtering and payment-level proxy-leg deduplication before trusting volume' }
        ]
      },
      composed: {
        name: 'Composed AI products (RAG / multi-provider workflows)',
        clii: '0.52 (Inherits weakest downstream layer)',
        gate: 'Weakest-link floor across model, retriever & tool chain',
        seam: 'Confabulated citations & silent upstream model drift',
        bars: [
          { label: 'MVEP-AI Cat 1 & 2: Reference validity & provenance binding', pct: 45, val: 'Primary failure mode (confabulated IDs)', note: 'Without save-time record resolution, one invented identifier becomes load-bearing across downstream sessions' },
          { label: 'MVEP-AI Cat 3 & 7: Retrieval gating & vacuous-check controls', pct: 60, val: 'Requires known-false verifier testing', note: 'Stale buffers or truncated startup files (25,000 UTF-16 unit cap) silently degrade retrieval unless checked' },
          { label: 'MVEP-AI Cat 8: Upstream provider change control', pct: 40, val: 'Opaque weight/prompt updates', note: 'Composed product equivalence breaks when an underlying API silently swaps checkpoint behavior' },
          { label: 'MVEP-AI Companion: Recursive dependency audit', pct: 50, val: 'Minimum across all composed layers', note: 'Analogous to OUSG -> BUIDL -> USDC: every tool, vector store, and model provider requires its own pack' }
        ]
      },
      api: {
        name: 'Enterprise foundation-model APIs',
        clii: '0.74 (High contractual & compliance posture)',
        gate: 'Partial (Strong SLA/SOC2; weak weight-level change control)',
        seam: 'Silent checkpoint deprecation & burst vs budget rate-limit ambiguity',
        bars: [
          { label: 'CLII-AI D4 & D5: Compliance infrastructure & geo/sanctions screening', pct: 85, val: '0.85 (Enterprise IAM, zero-retention, OFAC)', note: 'Strong identity, audit logging, and contractual data-isolation commitments' },
          { label: 'CLII-AI D2: Evaluation transparency & system-card disclosure', pct: 70, val: '0.70 (Pre-release evals published)', note: 'Point-in-time benchmark disclosures exist, but post-launch quantization/routing drift is rarely attested' },
          { label: 'MVEP-AI Cat 6 & 7: Exception handling & symptom disambiguation', pct: 55, val: 'Partial (Shared HTTP 429 symptom)', note: 'Burst rate limits and exhausted usage budgets emit identical errors requiring opposite fleet actions' },
          { label: 'MVEP-AI Cat 8: Pinned-version & timelock guarantees', pct: 45, val: 'Fail / Partial (Short deprecation windows)', note: 'Endpoint aliases update without on-chain-style timelocks or deterministic reproducibility' }
        ]
      },
      chat: {
        name: 'Frontier consumer / enterprise chat interfaces',
        clii: '0.68 (High interface gating; mutable system prompts)',
        gate: 'Non-Equivalent for autonomous production workflows',
        seam: 'Unannounced system-prompt edits & context-window truncation',
        bars: [
          { label: 'CLII-AI D3: Interface-level safety filters & refusal guardrails', pct: 80, val: '0.80 (Strong front-end moderation)', note: 'High refusal intensity at the chat surface, analogous to interface-level compliance in CLARITY' },
          { label: 'MVEP-AI Cat 2: Authoritative state & transcript exportability', pct: 50, val: 'Partial (Ephemeral UI state)', note: 'Session memory is platform-bound unless exported into a digest-verified transcript archive' },
          { label: 'MVEP-AI Cat 8: System-prompt & router change notification', pct: 30, val: 'Fail (Zero timelock on UI routing)', note: 'Model routers and hidden system instructions change continuously without customer sign-off' },
          { label: 'MVEP-AI Cat 10: Programmatic operability under stress', pct: 35, val: 'Fail (Human-in-the-loop UI only)', note: 'Cannot serve as an auditable machine-to-machine execution leg' }
        ]
      },
      open: {
        name: 'Open-weight self-hosted deployments',
        clii: '0.18 at release -> Operator-determined in production',
        gate: 'Inverts DAI pattern: deterministic weights, zero issuer recourse',
        seam: 'Full operational & liability burden shifts to deploying institution',
        bars: [
          { label: 'MVEP-AI Cat 2 & 8: Weight immutability & version pinning', pct: 95, val: 'Pass (Cryptographic weight hash)', note: 'Like DAI on Cat 2/3, self-hosted open weights eliminate silent vendor checkpoint drift' },
          { label: 'CLII-AI D1 & D3: Upstream release-point gating', pct: 18, val: '0.18 (Permissionless weight distribution)', note: 'Once weights are public, upstream freeze or revocation is structurally impossible' },
          { label: 'MVEP-AI Cat 5: Upstream operator insolvency or warranty recourse', pct: 10, val: 'Fail* (Structural inapplicability)', note: 'No ongoing service debtor stands behind open weights; deploying enterprise owns 100% of liability' },
          { label: 'MVEP-AI Cat 4 & 10: Local harness & actuator enforcement', pct: 80, val: 'Determined by local operating layer', note: 'Requires buyer-operated hard gates, worktree isolation, and verifier instrumentation to clear committee' }
        ]
      }
    };

    var crosswalk = [
      { dim: 'legal', cat: 'Category 1: Rights Parity', tok: 'Token-to-underlying legal claim memo (UCC Art. 8/12)', ai: 'Contractual output ownership, IP indemnity, and authority-to-bind scope for agent actions', pct: 90 },
      { dim: 'operational', cat: 'Category 2: System of Record', tok: 'Canonical ownership ledger (transfer agent vs chain)', ai: 'Session-attributed commit provenance and authoritative state store across concurrent agents', pct: 95 },
      { dim: 'operational', cat: 'Category 3: Records & Reconciliation', tok: 'Daily NAV / wallet balance reconciliation & break logs', ai: 'Save-time reference validation (preventing confabulated IDs) and startup truncation checks', pct: 92 },
      { dim: 'legal', cat: 'Category 4: Custody & Customer Property', tok: 'Statutory/trust segregation & qualified custodian control', ai: 'Per-session git worktree isolation, data zero-retention, and credential/key perimeter scoping', pct: 88 },
      { dim: 'legal', cat: 'Category 5: Insolvency Posture', tok: '20-regime bankruptcy priority & rehypothecation matrix', ai: 'Vendor-exit continuity, escrowed weights/prompts, and off-branch task-lease recovery on crash', pct: 85 },
      { dim: 'economic', cat: 'Category 6: Settlement Finality', tok: 'Value integrity, par convertibility & halt triggers', ai: 'Action & payment irreversibility bounds (x402 push-payment holds, pre-commit hard gates)', pct: 94 },
      { dim: 'operational', cat: 'Category 7: Reorg & Exception Handling', tok: 'Chain rollback detection, halt criteria & loss allocation', ai: 'Known-false verifier testing, three-valued state checks (present/absent/undetermined) & rollback', pct: 90 },
      { dim: 'operational', cat: 'Category 8: Governance & Change Control', tok: 'Multisig thresholds, named signers & 48h/7d timelocks', ai: 'Model checkpoint pinning, live hook-byte verification, and logged override auditing (99.56% hold)', pct: 96 },
      { dim: 'economic', cat: 'Category 9: Disclosures', tok: '3CRD point-of-use reserve, claim & custody disclosure', ai: 'Explicit saturation/override telemetry and bounded-scan unmeasured-remainder disclosure', pct: 86 },
      { dim: 'economic', cat: 'Category 10: Collateral / Stress Operability', tok: '2am Saturday liquidation across 3 paths under stress', ai: 'Throughput under peak concurrency (61 sessions), CPU-load gate independence & handoff continuity', pct: 92 },
      { dim: 'economic', cat: 'Companion: Recursive Settlement / Dependency Test', tok: 'Trace every redemption asset (BUIDL -> USDC)', ai: 'Trace every composed tool, facilitator (Meridian/CDP), and upstream model in the agent chain', pct: 95 }
    ];

    function renderClasses(){
      var sumEl = document.getElementById('aifw-cls-summary');
      var barsEl = document.getElementById('aifw-cls-bars');
      if(!sumEl || !barsEl) return;
      var c = classes[curCls] || classes.agentic;
      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Deployment class</span><span class="b4-stat__val">' + c.name + '</span><span class="b4-stat__sub">Evaluated under CLII-AI &amp; MVEP-AI</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Indicative CLII-AI range</span><span class="b4-stat__val">' + c.clii + '</span><span class="b4-stat__sub">Operator regulatory &amp; gating intensity (0 to 1)</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">MVEP-AI gate posture</span><span class="b4-stat__val">' + c.gate + '</span><span class="b4-stat__sub">Non-compensatory floor across 10 categories</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Primary failure seam</span><span class="b4-stat__val">' + c.seam + '</span><span class="b4-stat__sub">Where advisory rules fail without hard gates</span></div>';

      barsEl.innerHTML = c.bars.map(function(b){
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.label + '</span><span class="b4-bar-row__val">' + b.val + '</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta">' + b.note + '</div>' +
        '</div>';
      }).join('');
    }

    function renderCrosswalk(){
      var sumEl = document.getElementById('aifw-cw-summary');
      var barsEl = document.getElementById('aifw-cw-bars');
      if(!sumEl || !barsEl) return;
      var filtered = crosswalk.filter(function(r){ return curDim === 'all' || r.dim === curDim; });
      sumEl.innerHTML =
        '<div class="b4-stat"><span class="b4-stat__label">Categories shown</span><span class="b4-stat__val">' + filtered.length + ' of 11</span><span class="b4-stat__sub">10 MVEP-AI categories + recursive dependency companion</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Core analytical invariance</span><span class="b4-stat__val">1-to-1 structural map</span><span class="b4-stat__sub">Token label : Gateway gate :: Prompt rule : Armed harness gate</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Patent-pending coverage</span><span class="b4-stat__val">42 USPTO filings</span><span class="b4-stat__sub">32 patent families across staging, provenance, leases &amp; verifiers</span></div>' +
        '<div class="b4-stat"><span class="b4-stat__label">Regulatory application</span><span class="b4-stat__val">FSB AI Sound Practices</span><span class="b4-stat__sub">Submitted July 2026; paired with x402 SSRN working paper</span></div>';

      barsEl.innerHTML = filtered.map(function(r){
        return '<div class="b4-bar-row">' +
          '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.cat + '</span><span class="b4-bar-row__val">' + r.dim.toUpperCase() + '</span></div>' +
          '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div>' +
          '<div class="b4-bar-row__meta"><strong>Tokenized asset (MVEP):</strong> ' + r.tok + ' · <strong>AI operator (MVEP-AI):</strong> ' + r.ai + '</div>' +
        '</div>';
      }).join('');
    }

    root.addEventListener('click', function(e){
      var tBtn = e.target.closest('button[data-aifw-tab]');
      if(tBtn){
        var target = tBtn.getAttribute('data-aifw-tab');
        root.querySelectorAll('button[data-aifw-tab]').forEach(function(b){
          var on = b === tBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pCls = document.getElementById('aifw-panel-classes');
        var pCw = document.getElementById('aifw-panel-crosswalk');
        if(pCls) pCls.hidden = target !== 'classes';
        if(pCw) pCw.hidden = target !== 'crosswalk';
        if(target === 'crosswalk') renderCrosswalk(); else renderClasses();
        return;
      }
      var cBtn = e.target.closest('button[data-aifw-cls]');
      if(cBtn){
        curCls = cBtn.getAttribute('data-aifw-cls') || 'agentic';
        root.querySelectorAll('button[data-aifw-cls]').forEach(function(b){
          var on = b === cBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderClasses();
        return;
      }
      var dBtn = e.target.closest('button[data-aifw-dim]');
      if(dBtn){
        curDim = dBtn.getAttribute('data-aifw-dim') || 'all';
        root.querySelectorAll('button[data-aifw-dim]').forEach(function(b){
          var on = b === dBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderCrosswalk();
      }
    });

    renderClasses();
    renderCrosswalk();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAiFrameworkExplorer);
  } else {
    initAiFrameworkExplorer();
  }
})();

/* ==========================================================================
   Briefing Explorers: OUSD Yield Boundary, TCMAG-MVEP Crosswalk & Tokenized Equity
   ========================================================================== */
(function(){
  function initBriefingExplorers(){
    /* 1. OUSD Yield Boundary (#ousd-yield-explorer) */
    var ousdRoot = document.getElementById('ousd-yield-explorer');
    if(ousdRoot){
      var curStruct = 'ousd';
      var curMove = 'm1';

      var structs = {
        ousd: {
          hops: '1 Hop (Issuer -> Partner Businesses)',
          holderPay: 'None announced (0 bps to end holders)',
          exposure: 'Outside all 4 texts facially; pivots on calibration & custody holder status',
          bars: [
            { text: 'GENIUS Act Section 4(a)(11) (Enacted statute)', pct: 15, badge: 'Outside facially', note: 'Statute bars issuer-to-holder yield; OUSD pays distribution partners, unless partner omnibus wallet is deemed the holder' },
            { text: 'OCC Proposed Rule (91 Fed. Reg. 10199, 2-prong presumption)', pct: 10, badge: 'Prong 2 unmet (Safe side)', note: 'Presumption requires both issuer-to-partner AND partner-to-holder payment; preamble protects white-label profit sharing' },
            { text: 'FDIC Proposed Rule (91 Fed. Reg. 18534, 3rd-party arrangements)', pct: 40, badge: 'Contested only if balance-calibrated', note: 'Broader third-party phrasing still requires characterizing B2B partner revenue share as yield on stablecoins' },
            { text: 'CLARITY Act Section 404 (Senate-stage print)', pct: 10, badge: 'Outside (Targets Hop 2 only)', note: 'Bars digital-asset service providers from paying customer yield; does not bar receiving issuer revenue share' }
          ]
        },
        usdc: {
          hops: '2 Hops ($907.9M Circle -> Coinbase -> Customer Rewards)',
          holderPay: 'Yes (Advertised platform rewards on held USDC)',
          exposure: 'Directly targeted by OCC 2-prong presumption & CLARITY s.404',
          bars: [
            { text: 'GENIUS Act Section 4(a)(11) (Enacted statute)', pct: 65, badge: 'Contested (Reiners custody theory)', note: 'If exchange omnibus wallet is the statutory holder, balance-proportional revenue share faces direct statutory tension' },
            { text: 'OCC Proposed Rule (91 Fed. Reg. 10199, 2-prong presumption)', pct: 95, badge: 'Facially triggers both prongs', note: 'Issuer pays related party (Prong 1) and party pays holder rewards (Prong 2); shifts rebuttal burden to issuer' },
            { text: 'FDIC Proposed Rule (91 Fed. Reg. 18534, 3rd-party arrangements)', pct: 90, badge: 'Directly in scope', note: 'Two-hop customer reward structure is the core third-party arrangement the proposal targets' },
            { text: 'CLARITY Act Section 404 (Senate-stage print)', pct: 95, badge: 'Prohibits Hop 2 customer rewards', note: 'Expressly bars service providers from paying yield to US customers solely for holding stablecoin balances' }
          ]
        },
        direct: {
          hops: '1 Direct Hop (PPSI -> Token Holder)',
          holderPay: 'Yes (Direct cash, token, or rebase interest)',
          exposure: 'Categorically prohibited across all enacted and proposed texts',
          bars: [
            { text: 'GENIUS Act Section 4(a)(11) (Enacted statute)', pct: 100, badge: 'Categorically prohibited', note: 'Bars any form of interest or yield paid by a PPSI or foreign issuer solely in connection with holding, use, or retention' },
            { text: 'OCC Proposed Rule (91 Fed. Reg. 10199)', pct: 100, badge: 'Categorically prohibited', note: 'Direct prohibition on OCC-supervised Permitted Payment Stablecoin Issuers' },
            { text: 'FDIC Proposed Rule (91 Fed. Reg. 18534)', pct: 100, badge: 'Categorically prohibited', note: 'Direct prohibition on FDIC-supervised subsidiary stablecoin issuers' },
            { text: 'Market-structure consequence (Dollar v3 / Seven Dollars)', pct: 100, badge: 'Pushes yield into wrappers', note: 'Direct holder yield must use registered 1940 Act MMFs (BENJI) or offshore/Reg D wrappers (BUIDL, OUSG, USDY)' }
          ]
        },
        merchant: {
          hops: 'Independent Commercial / Activity Reward',
          holderPay: 'Checkout discount or non-balance transaction reward',
          exposure: 'Expressly carved out across OCC preamble & CLARITY s.404',
          bars: [
            { text: 'GENIUS Act Section 4(a)(11) ("solely" qualifier)', pct: 10, badge: 'Permitted (Not solely for holding)', note: 'Conditioned on commercial purchase or bona fide transaction rather than balance retention' },
            { text: 'OCC Proposed Rule Preamble', pct: 5, badge: 'Expressly permitted', note: 'Preamble confirms rule does not bar merchants from independently offering discounts for stablecoin payment' },
            { text: 'CLARITY Act Section 404 Carve-Out', pct: 15, badge: 'Permitted activity carve-out', note: 'Permits rewards based on bona fide activities not economically equivalent to deposit interest' },
            { text: 'CEA April 2026 Bank-Lending Estimate', pct: 20, badge: '$2.1B (~0.02% of total loans)', note: 'CEA white paper finds the entire yield prohibition shifts bank lending by only ~0.02% at baseline' }
          ]
        }
      };

      var moves = {
        m1: {
          title: 'Move 1: Finalize OCC 2-prong presumption as proposed',
          ousdStatus: 'SURVIVES INTACT',
          usdcStatus: 'Presumptively barred (rebuttal burden)',
          shift: 'Economics migrate from 2-hop holder rewards to 1-hop consortium revenue share',
          bars: [
            { label: 'Announced OUSD 1-hop business revenue share viability', pct: 92, val: 'Survives (Prong 2 absent)', note: 'Without a holder-facing second hop, the OCC presumption never attaches; matches Senate rejection of Warren/Hickenlooper amendments' },
            { label: 'Incumbent 2-hop exchange customer rewards (USDC model) viability', pct: 20, val: 'Triggers both prongs', note: 'Requires formal rebuttal or restructuring away from balance-based retail rewards' },
            { label: 'Administrative-law & statutory-authority defensibility', pct: 90, val: 'High (Statute-faithful)', note: 'Respects the legislative record where Congress declined to bar third-party revenue sharing directly' }
          ]
        },
        m2: {
          title: 'Move 2: Broaden trigger to balance-calibrated distributor share',
          ousdStatus: 'SURVIVES IF VOLUME/TIER CALIBRATED',
          usdcStatus: 'Barred on platform-held balances',
          shift: 'Forces OUSD consortium agreements to calibrate on transaction flow or flat tiers',
          bars: [
            { label: 'OUSD viability under volume- or tier-calibrated partner share', pct: 85, val: 'Survives', note: 'Originating transaction volume or governance tier is not a balance-held interest payment' },
            { label: 'OUSD viability under partner-custodied balance calibration', pct: 25, val: 'Reached by broadened rule', note: 'FDIC third-party formulation would treat balance-proportional payments to custodying partners as indirect yield' },
            { label: 'Administrative-law & statutory-authority defensibility', pct: 35, val: 'Vulnerable to APA challenge', note: 'Extends by agency rule what the Senate floor record explicitly considered and declined to enact' }
          ]
        },
        m3: {
          title: 'Move 3: Codify holder definition (control vs economic interest)',
          ousdStatus: 'DECIDED BY DEFINITION DIRECTION',
          usdcStatus: 'Decided by definition direction',
          shift: 'Resolves the Reiners omnibus-custody question in one stroke',
          bars: [
            { label: 'OUSD viability if "holder" = ultimate economic customer', pct: 95, val: 'Fully open (Defuses custody theory)', note: 'Partner exchanges are intermediaries, not holders, leaving Hop 1 completely outside s.4(a)(11)' },
            { label: 'OUSD viability if "holder" = omnibus custodial key controller', pct: 30, val: 'Arms partner-as-holder theory', note: 'Omnibus-custodying partners become statutory holders; balance-based share faces "solely" litigation' },
            { label: 'Likelihood in July 18, 2026 final rules', pct: 25, val: 'Low (Neither NPRM proposed a definition)', note: 'Definitional silence in both March/April proposals makes a sudden final-rule codification less likely' }
          ]
        },
        m4: {
          title: 'Move 4: Track statute & refer third-party gap to Congress',
          ousdStatus: 'SURVIVES COMPLETELY',
          usdcStatus: 'Governed by CLARITY s.404 if enacted',
          shift: 'Preserves 3-of-4-move survival asymmetry for consortium distribution',
          bars: [
            { label: 'Announced OUSD 1-hop revenue share viability', pct: 96, val: 'Undisturbed federally', note: 'Even if Congress later enacts CLARITY Section 404, Section 404 closes Hop 2 (customer rewards), not Hop 1' },
            { label: 'Distribution-layer capture of Treasury reserve float', pct: 90, val: 'High (TDRC ControlScore shift)', note: 'Confirms briefings core theorem: holders are excluded while reserve carry flows to distribution partners' },
            { label: 'Survival rate across all 4 plausible rulemaking moves', pct: 75, val: 'Survives 3 of 4 moves', note: 'Only a broad Move 2 or control-based Move 3 reaches OUSD, and only if its undisclosed calibration is balance-based' }
          ]
        }
      };

      function renderOusdHops(){
        var sumEl = document.getElementById('ousd-hops-summary');
        var barsEl = document.getElementById('ousd-hops-bars');
        if(!sumEl || !barsEl) return;
        var s = structs[curStruct] || structs.ousd;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Payment topology</span><span class="b4-stat__val">' + s.hops + '</span><span class="b4-stat__sub">Decomposition across issuer, distributor, and holder</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Holder-facing yield</span><span class="b4-stat__val">' + s.holderPay + '</span><span class="b4-stat__sub">Direct or indirect return to end stablecoin holder</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Statutory &amp; rule posture</span><span class="b4-stat__val">' + s.exposure + '</span><span class="b4-stat__sub">Read across GENIUS, OCC, FDIC, and CLARITY texts</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">CEA bank-lending benchmark</span><span class="b4-stat__val">+$2.1B (~0.02% loans)</span><span class="b4-stat__sub">Yield ban shifts who captures reserve carry, not aggregate bank credit</span></div>';
        barsEl.innerHTML = s.bars.map(function(b){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.text + '</span><span class="b4-bar-row__val">' + b.badge + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + b.note + '</div>' +
          '</div>';
        }).join('');
      }

      function renderOusdMoves(){
        var sumEl = document.getElementById('ousd-moves-summary');
        var barsEl = document.getElementById('ousd-moves-bars');
        if(!sumEl || !barsEl) return;
        var m = moves[curMove] || moves.m1;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Selected rulemaking move</span><span class="b4-stat__val">' + m.title + '</span><span class="b4-stat__sub">Ex-ante scoring rubric for final rules</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">OUSD 1-hop outcome</span><span class="b4-stat__val">' + m.ousdStatus + '</span><span class="b4-stat__sub">140+ partner consortium revenue-share model</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">2-hop rewards outcome</span><span class="b4-stat__val">' + m.usdcStatus + '</span><span class="b4-stat__sub">Bilateral issuer-to-exchange customer reward model</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Market-structure consequence</span><span class="b4-stat__val">' + m.shift + '</span><span class="b4-stat__sub">Competitive impact on distribution economics</span></div>';
        barsEl.innerHTML = m.bars.map(function(b){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.label + '</span><span class="b4-bar-row__val">' + b.val + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + b.note + '</div>' +
          '</div>';
        }).join('');
      }

      ousdRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-ousd-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-ousd-tab');
          ousdRoot.querySelectorAll('button[data-ousd-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pH = document.getElementById('ousd-panel-hops');
          var pM = document.getElementById('ousd-panel-moves');
          if(pH) pH.hidden = target !== 'hops';
          if(pM) pM.hidden = target !== 'moves';
          if(target === 'moves') renderOusdMoves(); else renderOusdHops();
          return;
        }
        var sBtn = e.target.closest('button[data-ousd-struct]');
        if(sBtn){
          curStruct = sBtn.getAttribute('data-ousd-struct') || 'ousd';
          ousdRoot.querySelectorAll('button[data-ousd-struct]').forEach(function(b){
            var on = b === sBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderOusdHops();
          return;
        }
        var mBtn = e.target.closest('button[data-ousd-move]');
        if(mBtn){
          curMove = mBtn.getAttribute('data-ousd-move') || 'm1';
          ousdRoot.querySelectorAll('button[data-ousd-move]').forEach(function(b){
            var on = b === mBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderOusdMoves();
        }
      });

      renderOusdHops();
      renderOusdMoves();
    }

    /* 2. TCMAG-MVEP Crosswalk (#tcmag-crosswalk-explorer) */
    var tcmagRoot = document.getElementById('tcmag-crosswalk-explorer');
    if(tcmagRoot){
      var curTcmag = 'all';
      var tcmagRows = [
        { type: 'direct', pct: 95, name: '1. Compliance (cross-jurisdictional)', mvep: 'MVEP Cat 1 (Rights Parity) + Cat 8 (Governance)', note: 'Direct overlap; MVEP adds explicit 3-tier statutory and ISO 17442 LEI entity-identification rigor.' },
        { type: 'gap', pct: 35, name: '2. Multi-Bank / Multi-Issuer Architecture', mvep: 'MVEP v2 Gap Candidate (Anchored in Three Strategies)', note: 'Without Ubyx-style clearing, deposit-token settlement tips to 1 or 2 issuers within 24 months.' },
        { type: 'partial', pct: 70, name: '3. Accounting Standards (Cash-equivalent treatment)', mvep: 'MVEP Cat 2 (System of Record) + Cat 9 (Disclosures)', note: 'Partial overlap; TCMAG emphasizes corporate balance-sheet valuation classification.' },
        { type: 'buyer', pct: 25, name: '4. Integrated (Corporate TMS / ERP connectivity)', mvep: 'Buyer-side treasury scope (Outside operator diagnostic)', note: 'Enterprise workflow integration requirement rather than an issuer/operator equivalence property.' },
        { type: 'direct', pct: 95, name: '5. Secure (Key management & custody resilience)', mvep: 'MVEP Cat 4 (Custody) + Cat 7 (Reorg / Exception Handling)', note: 'Direct overlap on qualified custody control of movements and key compromise containment.' },
        { type: 'gap', pct: 35, name: '6. Interoperability (Cross-chain & cross-rail)', mvep: 'MVEP v2 Gap Candidate', note: 'Candidate for MVEP v2 expansion covering cross-network settlement and bridge-free fungibility.' },
        { type: 'gap', pct: 35, name: '7. Confidentiality (Commercial transaction privacy)', mvep: 'MVEP v2 Gap Candidate', note: 'Candidate for MVEP v2 expansion balancing corporate payment confidentiality with supervisory auditability.' },
        { type: 'partial', pct: 72, name: '8. Functional Equivalence (Pooling, sweeping, netting)', mvep: 'MVEP Cat 10 (Collateral Operability)', note: 'Partial overlap; MVEP tests 2am Saturday collateral mobility while TCMAG covers intraday treasury sweeps.' },
        { type: 'partial', pct: 75, name: '9. 24/7 Operations (Always-on settlement & liquidity)', mvep: 'MVEP Cat 6 (Settlement Finality) + Cat 10', note: 'Partial overlap; MVEP tests weekend banking-hour redemption gaps and finite instant-pool capacity.' },
        { type: 'direct', pct: 96, name: '10. Controls (Maker-checker, SOD, audit trails)', mvep: 'MVEP Cat 8 (Governance) + Cat 3 (Reconciliation)', note: 'Direct overlap; MVEP specifies 3-of-5 / 4-of-7 multisig and 48h/7d timelock benchmarks.' },
        { type: 'direct', pct: 100, name: '11. Settlement Finality (Legal & technical irrevocability)', mvep: 'MVEP Cat 6 (Settlement Finality)', note: 'Direct name and substance match: combines technical confirmation, par value integrity, and halt rules.' },
        { type: 'partial', pct: 78, name: '12. Operational Resilience (Incident recovery & continuity)', mvep: 'MVEP Cat 7 (Reorg / Exception Handling)', note: 'Partial overlap; MVEP focuses on chain reorgs/rollbacks while TCMAG spans broader business continuity.' }
      ];

      function renderTcmag(){
        var sumEl = document.getElementById('tcmag-exp-summary');
        var barsEl = document.getElementById('tcmag-exp-bars');
        if(!sumEl || !barsEl) return;
        var list = tcmagRows.filter(function(r){ return curTcmag === 'all' || r.type === curTcmag; });
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Principles displayed</span><span class="b4-stat__val">' + list.length + ' of 12</span><span class="b4-stat__sub">TCMAG April 21, 2026 corporate-treasury principles</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Direct or partial MVEP coverage</span><span class="b4-stat__val">8 of 12 principles</span><span class="b4-stat__sub">4 direct overlaps + 4 partial overlaps with MVEP v9</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">MVEP v2 expansion shortlist</span><span class="b4-stat__val">3 operator gap candidates</span><span class="b4-stat__sub">Multi-Bank/Multi-Issuer, Interoperability, and Confidentiality</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Deposit-token tipping horizon</span><span class="b4-stat__val">24 months</span><span class="b4-stat__sub">Window before settlement consolidates without neutral clearing</span></div>';
        barsEl.innerHTML = list.map(function(r){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.mvep + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + r.note + '</div>' +
          '</div>';
        }).join('');
      }

      tcmagRoot.addEventListener('click', function(e){
        var fBtn = e.target.closest('button[data-tcmag-filter]');
        if(fBtn){
          curTcmag = fBtn.getAttribute('data-tcmag-filter') || 'all';
          tcmagRoot.querySelectorAll('button[data-tcmag-filter]').forEach(function(b){
            var on = b === fBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderTcmag();
        }
      });

      renderTcmag();
    }

    /* 3. Tokenized Equity Vehicles (#equity-arch-explorer) */
    var eqRoot = document.getElementById('equity-arch-explorer');
    if(eqRoot){
      var curEqDim = 'claim';
      var eqDims = {
        claim: {
          rh: 'OTC derivative contract against Robinhood Europe UAB',
          bx: 'Jersey SPV tracker certificate backed 1:1 by segregated shares',
          vote: 'Neither grants ordinary shareholder voting rights',
          protection: 'Robinhood: EUR 22,000 Lithuania scheme · xStocks: Security Agent lien',
          bars: [
            { name: 'Backed xStocks: Collateral segregation & issuer-insolvency remoteness', pct: 82, val: '1:1 SPV shares + Security Agent', note: 'Liechtenstein-approved prospectus + ISIN; holders are secured creditors of the Jersey SPV collateral pool' },
            { name: 'Robinhood Stock Tokens: Simplicity of single-counterparty wrapper', pct: 75, val: 'Closed-loop MiFID broker contract', note: 'No external custody chain for the user to manage, but 100% counterparty credit exposure to Robinhood Europe UAB' },
            { name: 'Direct registered shareholder parity (DGCL § 224 / Strategy 1 benchmark)', pct: 15, val: '0 of 2 (Economic exposure only)', note: 'Both June 30, 2025 European launches are intermediary wrappers rather than direct transfer-agent book-entry shares' }
          ]
        },
        liquidity: {
          rh: '24/5 internalized principal dealer (±0.5% price collar)',
          bx: '24/7 multi-venue CEX + Solana/EVM DeFi (Kraken, Bybit, Raydium, Jupiter)',
          vote: 'Off-hours trade-off: Robinhood halts/queues vs xStocks weekend price drift',
          protection: 'Arbitrage-linked spread compression vs single-dealer price certainty',
          bars: [
            { name: 'Backed xStocks: Multi-venue composability & 24/7 market access', pct: 92, val: '24/7 across CEX + Solana DeFi', note: 'Freely transferable SPL/ERC-20 tokens allow market makers and DeFi routers to arbitrage spreads across venues' },
            { name: 'Robinhood Stock Tokens: Reference-price collar stability during 24/5 hours', pct: 85, val: '±0.5% collar (24/5)', note: 'Internalized principal execution prevents weekend gap drift by halting or queuing when reference markets close' },
            { name: 'Backed xStocks: Weekend off-hours NAV tracking tightness', pct: 45, val: 'Weekend drift risk', note: 'When US cash equity markets are closed Saturday/Sunday, on-chain prices can diverge until underlying creation/redemption reopens Monday' }
          ]
        },
        tech: {
          rh: 'Closed Arbitrum instance (no external wallet withdrawals at launch)',
          bx: 'Open ERC-20 & Solana SPL + Chainlink CCIP, Data Streams & PoR',
          vote: 'Dividends: In-app cash credit (Robinhood) vs collateral/token accrual (xStocks)',
          protection: 'Attack surface: Single-broker platform risk vs multi-chain bridge/oracle stack',
          bars: [
            { name: 'Backed xStocks: Self-custody portability & DeFi collateral utility', pct: 95, val: 'Full ERC-20 / SPL transferability', note: 'Can be withdrawn to self-custody wallets and composed into permissionless lending and liquidity pools' },
            { name: 'Robinhood Stock Tokens: Bridge & smart-contract exploit insulation', pct: 88, val: 'Closed app perimeter', note: 'Walled garden eliminates public bridge (CCIP) and DEX oracle manipulation vectors at the cost of zero portability' },
            { name: 'Backed xStocks: Cross-chain dependency surface (CCIP + Data Streams + PoR)', pct: 65, val: 'Multi-oracle / bridge reliance', note: 'Requires continuous synchronization across custodian share counts, Chainlink Proof of Reserve, and cross-chain messaging' }
          ]
        }
      };

      function renderEqArch(){
        var sumEl = document.getElementById('eq-arch-summary');
        var barsEl = document.getElementById('eq-arch-bars');
        if(!sumEl || !barsEl) return;
        var d = eqDims[curEqDim] || eqDims.claim;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Robinhood Stock Tokens</span><span class="b4-stat__val">' + d.rh + '</span><span class="b4-stat__sub">Closed-loop Arbitrum OTC derivative model</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Backed xStocks</span><span class="b4-stat__val">' + d.bx + '</span><span class="b4-stat__sub">Open ERC-20 / Solana SPL tracker certificate model</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Governance &amp; corporate actions</span><span class="b4-stat__val">' + d.vote + '</span><span class="b4-stat__sub">Rights parity vs underlying US NMS common stock</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Primary protection / trade-off</span><span class="b4-stat__val">' + d.protection + '</span><span class="b4-stat__sub">Continuity inside one broker vs open network effects</span></div>';
        barsEl.innerHTML = d.bars.map(function(b){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + b.note + '</div>' +
          '</div>';
        }).join('');
      }

      function renderEqScen(){
        var sumEl = document.getElementById('eq-scen-summary');
        var barsEl = document.getElementById('eq-scen-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Favorable case (2025 to 2027)</span><span class="b4-stat__val">~$50B TVL (~0.03% spreads)</span><span class="b4-stat__sub">US no-action/pilot relief, ESMA DLT cap lift, sustained chain uptime</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Base planning case</span><span class="b4-stat__val">~$10B TVL</span><span class="b4-stat__sub">Gradual EU/Asia growth, cautious US stance, no major custody/oracle failures</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Adverse case</span><span class="b4-stat__val">~$1B to $2B TVL</span><span class="b4-stat__sub">Regulatory reclassification, SPV/bridge failure, or prolonged market contraction</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">US institutional evolution</span><span class="b4-stat__val">Three Strategies (2026)</span><span class="b4-stat__sub">Nasdaq-DTC CSD-native, ICE-NYSE venue, and Securitize-Broadridge</span></div>';
        var sRows = [
          { name: 'Favorable adoption scenario (2025 to 2027 illustrative planning case)', pct: 100, val: '~$50B TVL · ~3 bps spreads', note: 'Requires US regulatory relief (subsequently advanced in 2026 SEC tokenized NMS stock conditional exemptions) and deep DeFi arbitrage' },
          { name: 'Base adoption scenario (2025 to 2027 illustrative planning case)', pct: 20, val: '~$10B TVL', note: 'Driven by European MiFID/MiCA and Asian offshore demand with steady market-maker liquidity' },
          { name: 'Adverse adoption scenario (2025 to 2027 illustrative planning case)', pct: 4, val: '~$1B to $2B TVL', note: 'Capped by wrapper reclassification or an oracle/bridge/custody incident that fragments liquidity' }
        ];
        barsEl.innerHTML = sRows.map(function(b){
          return '<div class="b4-bar-row">' +
            '<div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div>' +
            '<div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div>' +
            '<div class="b4-bar-row__meta">' + b.note + '</div>' +
          '</div>';
        }).join('');
      }

      eqRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-eq-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-eq-tab');
          eqRoot.querySelectorAll('button[data-eq-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pA = document.getElementById('eq-panel-arch');
          var pS = document.getElementById('eq-panel-scen');
          if(pA) pA.hidden = target !== 'arch';
          if(pS) pS.hidden = target !== 'scen';
          if(target === 'scen') renderEqScen(); else renderEqArch();
          return;
        }
        var dBtn = e.target.closest('button[data-eq-dim]');
        if(dBtn){
          curEqDim = dBtn.getAttribute('data-eq-dim') || 'claim';
          eqRoot.querySelectorAll('button[data-eq-dim]').forEach(function(b){
            var on = b === dBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderEqArch();
        }
      });

      renderEqArch();
      renderEqScen();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initBriefingExplorers);
  } else {
    initBriefingExplorers();
  }
})();

/* ==========================================================================
   Wave 3 Explorers: Oracle Problem, Control Layer War, Dollar v3, x402 Memo,
   Advisory Scope Matcher & Resume Role Comparator
   ========================================================================== */
(function(){
  function initWave3Explorers(){
    /* 1. Oracle Problem in Stablecoin Ratings (#oracle-ratings-explorer) */
    var oraRoot = document.getElementById('oracle-ratings-explorer');
    if(oraRoot){
      var curMech = 'literature';
      function renderOraEv(){
        var sumEl = document.getElementById('ora-ev-summary');
        var barsEl = document.getElementById('ora-ev-bars');
        if(!sumEl || !barsEl) return;
        if(curMech === 'literature'){
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">1974 investor-to-issuer-pay shift</span><span class="b4-stat__val">~20% of a rating grade</span><span class="b4-stat__sub">Jiang, Stanford, and Xie (2012) natural experiment</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">CDO model vs assigned AAA size</span><span class="b4-stat__val">+12.1% larger AAA tranche</span><span class="b4-stat__sub">Griffin and Tang (2012) across 916 CDOs</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Model-implied valuation gap</span><span class="b4-stat__val">-20.1% lower (BBB vs AAA)</span><span class="b4-stat__sub">Counterfactual if model outputs had governed unadjusted</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Structural origin</span><span class="b4-stat__val">White (2010)</span><span class="b4-stat__sub">Post-2008 reforms left the issuer-pays model intact</span></div>';
          var rows = [
            { name: 'Jiang, Stanford & Xie (2012): S&P switch to issuer-pays (1974 natural experiment)', pct: 80, val: '+0.20 grade inflation on conflicted bonds', note: 'Ratings rose to match Moody\'s only on bonds with higher expected fees or lower credit quality' },
            { name: 'Griffin & Tang (2012): 916 CDOs out-of-model AAA tranche adjustment', pct: 88, val: '+12.1% AAA size | -20.1% valuation gap', note: 'Had the rater followed its own model without positive adjustments, AAA tranches would have averaged BBB' },
            { name: 'Voluntary stablecoin rating selection (Offshore / non-chartered pull)', pct: 75, val: 'Seller-commissioned marketing signal', note: 'Issuers choose whether to seek and pay for a score; strongest pull for issuers outside domestic bank charters' }
          ];
          barsEl.innerHTML = rows.map(function(r){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div><div class="b4-bar-row__meta">' + r.note + '</div></div>';
          }).join('');
        } else {
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">New automation surface</span><span class="b4-stat__val">Zero human circuit-breaker</span><span class="b4-stat__sub">Smart contracts read on-chain feeds directly into LTV &amp; haircuts</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Cadence mismatch</span><span class="b4-stat__val">Monthly review vs hours-scale run</span><span class="b4-stat__sub">SVB weekend depeg unfolded in hours; attestations run monthly</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">OUSD consortium mutation</span><span class="b4-stat__val">140+ partner overlap</span><span class="b4-stat__sub">Distributors funding the coin include DeFi lending consumers</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Buyer-side complement</span><span class="b4-stat__val">MVEP + CLII</span><span class="b4-stat__sub">Run by the party at risk before automated leverage executes</span></div>';
          var cRows = [
            { name: '1. Correlated parameter cascade across DeFi lending protocols', pct: 92, val: 'Simultaneous LTV / haircut trigger', note: 'When multiple lending contracts key collateral parameters to one on-chain rating feed, a single revision propagates everywhere at once' },
            { name: '2. Monitoring cadence lag vs stablecoin stress speed', pct: 85, val: 'Monthly/periodic vs 48-hour SVB gap', note: 'Periodic rating reviews and monthly reserve attestations lag intraday banking or peg shocks' },
            { name: '3. OUSD distributor-funded consortium loop (140+ partners)', pct: 80, val: 'Funder = Amplifier = Automated Consumer', note: 'Consortium partners receiving reserve revenue share overlap with the DeFi lending protocols consuming the on-chain score' }
          ];
          barsEl.innerHTML = cRows.map(function(r){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div><div class="b4-bar-row__meta">' + r.note + '</div></div>';
          }).join('');
        }
      }

      function renderOraPat(){
        var sumEl = document.getElementById('ora-pat-summary');
        var barsEl = document.getElementById('ora-pat-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">External validation</span><span class="b4-stat__val">Moody\'s (March 2026)</span><span class="b4-stat__sub">Klotz and Hu methodology compared against MVEP across 14 products</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Threshold convergence</span><span class="b4-stat__val">USDT &amp; DAI</span><span class="b4-stat__sub">Both frameworks exclude USDT (no segregation) and DAI (no issuer)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Strongest posture unrated</span><span class="b4-stat__val">BENJI (1940 Act)</span><span class="b4-stat__sub">7/7 Pass on MVEP Cat 5, but out of stablecoin rating scope</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Epistemic / scope divergence</span><span class="b4-stat__val">USDC, PYUSD, USDG &amp; funds</span><span class="b4-stat__sub">Binary eligibility vs graded 7-dimension Cat 5 + recursive CSA</span></div>';
        var pRows = [
          { name: 'Pattern 1: Threshold convergence (USDT)', pct: 95, val: 'MVEP: Cat 5 Fail · Rating: Out of perimeter · Disagreement: No', note: 'Tether terms affirmatively decline to segregate reserve assets; fails both gates at the threshold' },
          { name: 'Pattern 2: Convergence with attribution risk (DAI)', pct: 90, val: 'MVEP: Fail* (No entity) · Rating: Out of scope · Disagreement: No', note: 'No legal issuer entity exists and exit runs through the USDC Peg Stability Module' },
          { name: 'Pattern 3: Surface disagreement, same protection (JPMD)', pct: 85, val: 'MVEP: Strong bank law · Rating: Reroute to issuer credit · Disagreement: No', note: 'A deposit is a bank liability (no customer asset to segregate); both credit FDI Act bank supervision' },
          { name: 'Pattern 4: Strongest insolvency posture, out of rating perimeter (BENJI)', pct: 100, val: 'MVEP: 7/7 Cat 5 Pass (1940 Act) · Rating: Unrated · Disagreement: Yes (Scope)', note: 'Registered 1940 Act money market fund share has the strongest statutory segregation but sits outside stablecoin ratings' },
          { name: 'Pattern 5: Same facts, different reporting (USDC, PYUSD, USDG)', pct: 70, val: 'MVEP: Partial + re-score trigger · Rating: Binary gate · Disagreement: Yes (Epistemic)', note: 'GENIUS Act segregation is enacted but dormant until effective date; Circle S-1 concedes holder priority is untested' },
          { name: 'Pattern 6: Off-exchange collateral wrappers (USYC, BUIDL, OUSG, USDY)', pct: 65, val: 'MVEP: Graded 7 dims + recursive CSA · Rating: Out of scope · Disagreement: Yes (Detail)', note: 'MVEP tests composed redemption chains (BUIDL/OUSG -> USDC) and 2am Saturday collateral operability' }
        ];
        barsEl.innerHTML = pRows.map(function(r){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.name + '</span><span class="b4-bar-row__val">' + r.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + r.pct + '%"></div></div><div class="b4-bar-row__meta">' + r.note + '</div></div>';
        }).join('');
      }

      oraRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-ora-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-ora-tab');
          oraRoot.querySelectorAll('button[data-ora-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pE = document.getElementById('ora-panel-evidence');
          var pP = document.getElementById('ora-panel-patterns');
          if(pE) pE.hidden = target !== 'evidence';
          if(pP) pP.hidden = target !== 'patterns';
          if(target === 'patterns') renderOraPat(); else renderOraEv();
          return;
        }
        var mBtn = e.target.closest('button[data-ora-mech]');
        if(mBtn){
          curMech = mBtn.getAttribute('data-ora-mech') || 'literature';
          oraRoot.querySelectorAll('button[data-ora-mech]').forEach(function(b){
            var on = b === mBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderOraEv();
        }
      });
      renderOraEv();
      renderOraPat();
    }

    /* 2. Control Layer War (#clarity-control-explorer) */
    var clwRoot = document.getElementById('clarity-control-explorer');
    if(clwRoot){
      var curEq = 'router';
      var eqData = {
        router: {
          chokepoint: 'Front-end interfaces, wallet routers, and sweep engines',
          rent: 'Distribution layer captures float, routing spreads, and wrapper fees',
          liability: 'High false-positive / freeze-appeal burden at the app and router layer',
          tdrc: 'Control-Dominant (ControlScore >= 4, beats IssuerScore by >= 2)',
          bars: [
            { name: 'Obligated-interface share & default routing control', pct: 92, val: 'Primary enforcement surface', note: 'Compliance attaches where users initiate swaps, sweeps, and transfers; regulated routers emerge as gatekeepers' },
            { name: 'Yield migration into automated cash wrappers & sweeps', pct: 88, val: 'High wrapper capture', note: 'With token-level yield barred by GENIUS, wallets and brokers capture economics via default sweep allocation' },
            { name: 'Operational hold, freeze & appeal workflow burden', pct: 85, val: 'Case-management bottleneck', note: 'Winners are decided by reviewer throughput, low false-positive rates, and auditable release SLAs' }
          ]
        },
        issuer: {
          chokepoint: 'Permitted Payment Stablecoin Issuers (PPSIs) & reserve custodians',
          rent: 'Issuers retain Treasury bill reserve spread and direct mint/burn fees',
          liability: 'Contract-level blacklist (addBlackList) & primary redemption KYC',
          tdrc: 'Issuer-Dominant (IssuerScore >= 4, beats ControlScore by >= 2)',
          bars: [
            { name: 'Reserve carry retention & settlement-object concentration', pct: 90, val: 'High issuer spread capture', note: 'Two dominant issuers capture Treasury bill float while interfaces remain thin pass-throughs' },
            { name: 'Token-contract freeze & lawful-order compliance (GENIUS s.4)', pct: 85, val: 'Issuer-level admin key', note: 'Supervisory obligations concentrate at mint/burn onboarding and contract-level sanctions blacklists' },
            { name: 'Downstream DeFi & secondary-venue visibility', pct: 35, val: 'Limited beyond first hop', note: 'Issuer-only gating struggles to monitor composed wrappers or omnibus exchange routing without router hooks' }
          ]
        },
        infra: {
          chokepoint: 'Central securities depositories (DTC), exchanges & transfer agents',
          rent: 'Clearinghouses, transfer agents (Securitize) & qualified custodians',
          liability: 'Canonical book-entry reconciliation, whitelist gating & collateral haircuts',
          tdrc: 'Infrastructure-Gated (Three Strategies institutional perimeter)',
          bars: [
            { name: 'Transfer-agent & CSD canonical record authority (MVEP Cat 2)', pct: 95, val: 'Authoritative ownership book', note: 'Matches Strategy 1 (Nasdaq-DTC) and Strategy 3 (Securitize-Broadridge) where registered books govern' },
            { name: 'Collateral eligibility & clearinghouse haircut gating (CFTC 3038-0076)', pct: 88, val: 'Venue & DCO admission gate', note: 'Clearing organizations and exchanges define which tokenized instruments qualify as margin' },
            { name: 'Permissionless secondary-market composability', pct: 30, val: 'Constrained by allowlists', note: 'High institutional legibility, but whitelist transfer restrictions limit open DeFi liquidity' }
          ]
        }
      };

      function renderClwEq(){
        var sumEl = document.getElementById('clw-eq-summary');
        var barsEl = document.getElementById('clw-eq-bars');
        if(!sumEl || !barsEl) return;
        var d = eqData[curEq] || eqData.router;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Compelled chokepoint</span><span class="b4-stat__val">' + d.chokepoint + '</span><span class="b4-stat__sub">Where CLARITY obligations bind in practice</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Value &amp; float capture</span><span class="b4-stat__val">' + d.rent + '</span><span class="b4-stat__sub">Commercial winner under this equilibrium</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Operational liability</span><span class="b4-stat__val">' + d.liability + '</span><span class="b4-stat__sub">Primary compliance and tail-risk burden</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Corresponding TDRC regime</span><span class="b4-stat__val">' + d.tdrc + '</span><span class="b4-stat__sub">Link to Tokenized Dollar Regime Classifier</span></div>';
        barsEl.innerHTML = d.bars.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      function renderClwMet(){
        var sumEl = document.getElementById('clw-met-summary');
        var barsEl = document.getElementById('clw-met-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Proposed governance standards</span><span class="b4-stat__val">9 operating metrics</span><span class="b4-stat__sub">Turns abstract CLARITY debate into auditable operator performance</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Due-process core</span><span class="b4-stat__val">Time-to-release (p50 / p95)</span><span class="b4-stat__sub">Measures how long lawful users wait when a hold fires</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Accuracy core</span><span class="b4-stat__val">False-positive &amp; appeal win rate</span><span class="b4-stat__sub">Penalizes over-blocking as well as under-blocking</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Provenance core</span><span class="b4-stat__val">Tamper-evident audit logs</span><span class="b4-stat__sub">Coverage, retention, and override sign-off</span></div>';
        var mRows = [
          { name: '1. Time-to-release (Median p50 & 95th percentile p95 from hold to resolution)', pct: 95, val: 'Latency SLA', note: 'Prevents indefinite silent freezes on customer working capital' },
          { name: '2. False-positive rate & 3. Customer appeal win rate', pct: 92, val: 'Screening precision', note: 'Measures how often automated screening flags legitimate transfers that are overturned on review' },
          { name: '4. Appeal throughput (Cases/day/reviewer & backlog age) & 5. Hold-duration distribution', pct: 86, val: 'Reviewer capacity', note: 'Exposes operational bottlenecks during high-volume market stress' },
          { name: '6. Share of flows via compliant defaults & 7. Case-documentation quality', pct: 82, val: 'Routing coverage', note: 'Tracks default sweep/router penetration and evidentiary completeness per freeze event' },
          { name: '8. Audit-log completeness (Tamper evidence) & 9. Override governance', pct: 90, val: 'Accountability trail', note: 'Requires named signer attribution and post-incident audit for every emergency override' }
        ];
        barsEl.innerHTML = mRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      clwRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-clw-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-clw-tab');
          clwRoot.querySelectorAll('button[data-clw-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pE = document.getElementById('clw-panel-equil');
          var pM = document.getElementById('clw-panel-metrics');
          if(pE) pE.hidden = target !== 'equil';
          if(pM) pM.hidden = target !== 'metrics';
          if(target === 'metrics') renderClwMet(); else renderClwEq();
          return;
        }
        var eqBtn = e.target.closest('button[data-clw-eq]');
        if(eqBtn){
          curEq = eqBtn.getAttribute('data-clw-eq') || 'router';
          clwRoot.querySelectorAll('button[data-clw-eq]').forEach(function(b){
            var on = b === eqBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderClwEq();
        }
      });
      renderClwEq();
      renderClwMet();
    }

    /* 3. Dollar v3 (#dollar-v3-explorer) */
    var dv3Root = document.getElementById('dollar-v3-explorer');
    if(dv3Root){
      var curDv3 = 'levers';
      function renderDv3Lev(){
        var sumEl = document.getElementById('dv3-lev-summary');
        var barsEl = document.getElementById('dv3-lev-bars');
        if(!sumEl || !barsEl) return;
        if(curDv3 === 'levers'){
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">Organizing architecture</span><span class="b4-stat__val">5 interacting policy levers</span><span class="b4-stat__sub">Tightening one lever shifts commercial pressure to the others</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Payment-stablecoin perimeter</span><span class="b4-stat__val">GENIUS Act (Pub. L. 119-27)</span><span class="b4-stat__sub">1:1 liquid reserves, monthly disclosures, s.11 priority, 0% holder yield</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Bank execution perimeter</span><span class="b4-stat__val">OCC IL 1188 (Riskless principal)</span><span class="b4-stat__sub">Permits national bank crypto intermediation; operational risk remains</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">2030 to 2035 end state</span><span class="b4-stat__val">4-object hybrid stack</span><span class="b4-stat__sub">Stablecoins (cash leg), deposit tokens, tokenized deposits &amp; MMF wrappers</span></div>';
          var lRows = [
            { name: 'Lever 1: Who can issue in practice (Federal PPSI, State-certified, or IDI subsidiary)', pct: 90, val: 'GENIUS 3-lane charter map', note: 'Sets the entry gate and determines whether nonbanks or bank subsidiaries dominate issuance' },
            { name: 'Lever 2: Where yield is allowed to live (GENIUS s.4(a)(11) vs 1940 Act / Reg D wrappers)', pct: 95, val: 'Drives wrapper & sweep migration', note: 'Barring interest on payment stablecoins pushes yield into tokenized MMFs (BENJI, BUIDL) and distributor revenue share' },
            { name: 'Lever 3: Layer 0 reserve placement & backstop expectations (T-bills, RRP vs commercial banks)', pct: 88, val: 'Governs panic & run direction', note: 'Reserve custody location determines whether stress triggers flight-to-T-bills or bank deposit outflows' },
            { name: 'Lever 4: Offshore dollar perimeter (Treasury GENIUS s.3 / s.8 foreign issuer rules)', pct: 82, val: 'USDT vs US-regulated gateways', note: 'Determines whether offshore coins can route through US interfaces or remain segmented offshore' },
            { name: 'Lever 5: Open public spine vs private walled-garden bank ledgers', pct: 85, val: 'Interoperability determinant', note: 'Decides whether deposit tokens achieve cross-bank fungibility or fragment into single-bank islands' }
          ];
          barsEl.innerHTML = lRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        } else {
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">Anchor Fed study</span><span class="b4-stat__val">Dec 17, 2025 FEDS Note</span><span class="b4-stat__sub">Du, Sonawane, and Watsky (DOI 10.17016/2380-7172.3958)</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Three Fed deposit channels</span><span class="b4-stat__val">Reduce, Recycle, Restructure</span><span class="b4-stat__sub">Synthesized in Dollar v3 as deposit-funding mutation</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Observed deposit recycling</span><span class="b4-stat__val">4% to 100% by issuer</span><span class="b4-stat__sub">Tether ~4%, Circle ~14%, Gemini ~100% (Routing the Dollar)</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Supervisory blind spot</span><span class="b4-stat__val">FDIC AG21 &amp; AG27</span><span class="b4-stat__sub">Concentrated uninsured wholesale reserve deposits raise run risk</span></div>';
          var dRows = [
            { name: '1. Deposit reduction (Reserves placed in Treasury bills or ON RRP outside commercial banks)', pct: 86, val: 'Circle ~86% / Tether ~96% non-deposit', note: 'Shifts funding from commercial-bank retail deposits toward sovereign short-term debt' },
            { name: '2. Deposit recycling (Reserves redeposited as commercial-bank demand deposits)', pct: 50, val: 'Circle ~14% / Gemini ~100%', note: 'Keeps funding inside the banking system, but concentrates it at a small number of crypto-serving banks' },
            { name: '3. Deposit restructuring (Retail insured deposits -> Uninsured wholesale issuer balances)', pct: 95, val: 'High runoff sensitivity (SVB $3.3B lesson)', note: 'Even when aggregate deposits stay flat, funding mutates into concentrated, runnable wholesale balances' }
          ];
          barsEl.innerHTML = dRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        }
      }

      function renderDv3Rig(){
        var sumEl = document.getElementById('dv3-rig-summary');
        var barsEl = document.getElementById('dv3-rig-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Rights minimum viable spec</span><span class="b4-stat__val">5 citizen protections</span><span class="b4-stat__sub">Due-process freezes, data minimization, privacy zone, portability, transparency</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Practical evaluation rubric</span><span class="b4-stat__val">7 scoreboard criteria</span><span class="b4-stat__sub">Pairs normative user rights with institutional MVEP/CLII diligence</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Point-of-use disclosure</span><span class="b4-stat__val">3CRD template</span><span class="b4-stat__sub">Legal claim, reserve composition, and custody location at the wallet surface</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Commercial equilibrium test</span><span class="b4-stat__val">Float vs Home Screen</span><span class="b4-stat__sub">Tracked quantitatively via the TDRC 0-to-6 classifier</span></div>';
        var rRows = [
          { name: '1. Par redemption & 2. Clear insolvency claim priority (MVEP Cat 1, 5 & 6)', pct: 95, val: 'Core legal/economic floor', note: '1:1 convertibility under stress and statutory holder priority without administrative-insolvency traps' },
          { name: '3. Reserve transparency & 4. Stress-tested weekend liquidity (3CRD + MVEP Cat 4 & 10)', pct: 90, val: 'Custody & 2am Saturday readiness', note: 'Named reserve banks, custodian concentration caps, and 24/7 conversion paths' },
          { name: '5. Due-process freezes & 6. Small-value privacy / data minimization', pct: 85, val: 'Constitutional & user-rights floor', note: 'Notice, appeal SLAs, and time limits on holds; protection against warrantless bulk surveillance' },
          { name: '7. Real portability, cross-rail interoperability & macro-stability monitoring', pct: 88, val: 'Open-network anti-lock-in', note: 'Ability to move balances across wallets and banks without punitive exit fees or walled-garden lock-in' }
        ];
        barsEl.innerHTML = rRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      dv3Root.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-dv3-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-dv3-tab');
          dv3Root.querySelectorAll('button[data-dv3-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pL = document.getElementById('dv3-panel-levers');
          var pR = document.getElementById('dv3-panel-rights');
          if(pL) pL.hidden = target !== 'levers';
          if(pR) pR.hidden = target !== 'rights';
          if(target === 'rights') renderDv3Rig(); else renderDv3Lev();
          return;
        }
        var vBtn = e.target.closest('button[data-dv3-view]');
        if(vBtn){
          curDv3 = vBtn.getAttribute('data-dv3-view') || 'levers';
          dv3Root.querySelectorAll('button[data-dv3-view]').forEach(function(b){
            var on = b === vBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderDv3Lev();
        }
      });
      renderDv3Lev();
      renderDv3Rig();
    }

    /* 4. Agentic Payments Control Layer Memo (#x402-memo-explorer) */
    var xmRoot = document.getElementById('x402-memo-explorer');
    if(xmRoot){
      var curXmMet = 'payments';
      var curXmRec = 'providers';
      var baseSeries = [
        { m: '2025-10 (Launch ramp)', pay: 4065328, usd: 3965328, buyers: 175237, avg: '$0.98', epb: '23.2 / buyer' },
        { m: '2025-11 (Leaderboard peak)', pay: 64264312, usd: 27884714, buyers: 118767, avg: '$0.43', epb: '541.1 / buyer (Grind peak)' },
        { m: '2025-12 (Post-spike decay)', pay: 43037218, usd: 3265946, buyers: 46800, avg: '$0.08', epb: '919.6 / buyer' },
        { m: '2026-01 (Winter contraction)', pay: 12130123, usd: 1203956, buyers: 14588, avg: '$0.10', epb: '831.5 / buyer' },
        { m: '2026-02 (Cycle trough)', pay: 1419951, usd: 2066780, buyers: 22649, avg: '$1.46', epb: '62.7 / buyer' },
        { m: '2026-03 (Rebuild month 1)', pay: 1820877, usd: 2276725, buyers: 14845, avg: '$1.25', epb: '122.7 / buyer' },
        { m: '2026-04 (Rebuild month 2)', pay: 2304609, usd: 1938922, buyers: 38631, avg: '$0.84', epb: '59.7 / buyer' },
        { m: '2026-05 (Organic expansion)', pay: 3041318, usd: 1030242, buyers: 110766, avg: '$0.34', epb: '26.7 / buyer ($652.9k net)' },
        { m: '2026-06 (First 11 days UTC)', pay: 2524990, usd: 335006, buyers: 40636, avg: '$0.13', epb: '62.1 / buyer (11d)' }
      ];

      function renderXmSeries(){
        var sumEl = document.getElementById('xm-ser-summary');
        var barsEl = document.getElementById('xm-ser-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Cumulative Base payments</span><span class="b4-stat__val">134.3M transfers</span><span class="b4-stat__sub">May 2025 through June 11, 2026 across registry facilitators</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Cumulative Base USD volume</span><span class="b4-stat__val">$42.55M corrected</span><span class="b4-stat__sub">$43.97M raw minus Meridian 2-hop proxy double-count</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Nov 2025 grind -> May 2026</span><span class="b4-stat__val">541 -> 26.7 / buyer</span><span class="b4-stat__sub">110,766 distinct May buyers on Base vs 35 on Polygon</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Registry attribution coverage</span><span class="b4-stat__val">92.3% Base / 99.5% Polygon</span><span class="b4-stat__sub">138 addresses across 29 facilitators on 3 networks</span></div>';

        barsEl.innerHTML = baseSeries.map(function(r){
          var val = curXmMet === 'buyers' ? r.buyers : (curXmMet === 'usd' ? r.usd : r.pay);
          var max = curXmMet === 'buyers' ? 175237 : (curXmMet === 'usd' ? 27884714 : 64264312);
          var pct = Math.max(2, Math.min(100, (val / max) * 100)).toFixed(1);
          var badge = curXmMet === 'buyers'
            ? (r.buyers.toLocaleString() + ' buyers (' + r.epb + ')')
            : (curXmMet === 'usd'
              ? ('$' + (r.usd / 1e6).toFixed(2) + 'M raw (Avg ' + r.avg + ')')
              : ((r.pay / 1e6).toFixed(2) + 'M payments (' + r.epb + ')'));
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + r.m + '</span><span class="b4-bar-row__val">' + badge + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + pct + '%"></div></div><div class="b4-bar-row__meta">Payments: ' + r.pay.toLocaleString() + ' · Raw USD: $' + r.usd.toLocaleString() + ' · Distinct buyers: ' + r.buyers.toLocaleString() + ' · Avg: ' + r.avg + '</div></div>';
        }).join('');
      }

      function renderXmRecon(){
        var sumEl = document.getElementById('xm-rec-summary');
        var barsEl = document.getElementById('xm-rec-bars');
        if(!sumEl || !barsEl) return;
        if(curXmRec === 'providers'){
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">Cross-provider spread</span><span class="b4-stat__val">25x ($24M vs $0.94M)</span><span class="b4-stat__sub">Depending on EIP-3009 scope, wash filters &amp; proxy deduplication</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Base proxy overcount</span><span class="b4-stat__val">-36.6% ($1.03M -> $653k)</span><span class="b4-stat__sub">Meridian 2-hop settlement counted twice in naive transfer sums</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Share of chain USDC events</span><span class="b4-stat__val">2.83% (15.9% Polygon)</span><span class="b4-stat__sub">8.87M May payments across Base, Polygon, and Solana</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Share of chain USDC dollars</span><span class="b4-stat__val">0.0000376% ($940.3k)</span><span class="b4-stat__sub">Message-significant today; dollar-layer pre-material</span></div>';
          var pRows = [
            { name: 'x402.org headline 30-day figure (Unfiltered broad EIP-3009 / relayer sum)', pct: 100, val: '~$24.00M', note: 'Includes non-x402 EIP-3009 gasless wallet relayer traffic and double-counted proxy hops' },
            { name: 'Allium on-chain 30-day estimate (Reported in a16z crypto)', pct: 12.5, val: '~$3.00M', note: 'Narrows to x402 facilitator contracts but prior to payment-level proxy-leg deduplication' },
            { name: 'Artemis strict wash-filtered 30-day estimate (Reported in a16z crypto)', pct: 6.7, val: '~$1.60M', note: 'Applies heuristic wash-trading filters across chains' },
            { name: 'Tokenization Systems May 2026 cross-chain corrected total (Base + Solana + Polygon)', pct: 3.9, val: '$0.94M ($940,323)', note: 'Registry-attributed, target-discriminated on Polygon, and deduplicated for Meridian 2-hop proxy settlement (-36.6% on Base)' }
          ];
          barsEl.innerHTML = pRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        } else {
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">Base May count HHI</span><span class="b4-stat__val">6,009 (CDP 75.6%)</span><span class="b4-stat__sub">Clears DOJ/FTC 1,800 threshold by more than 3.3x</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Base May corrected USD HHI</span><span class="b4-stat__val">4,040 (Meridian 57.2%)</span><span class="b4-stat__sub">5,621 raw before removing $377.4k inner proxy leg</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Meridian retained fee</span><span class="b4-stat__val">0.99% (99 bps)</span><span class="b4-stat__sub">Directly observable on-chain across 17 active buyers</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Top-25 Base seller identity</span><span class="b4-stat__val">0 of 25 named</span><span class="b4-stat__sub">Every top sell-side endpoint is pseudonymous on public surfaces</span></div>';
          var fRows = [
            { name: 'coinbase (CDP facilitator): 2,290,425 payments | $168,516 USD', pct: 75.6, val: '75.6% count share · 25.8% value share', note: 'Dominates the message/transaction layer on Base' },
            { name: 'mrdn (Meridian proxy facilitator): 11,088 payments | $373,610 corrected USD', pct: 57.2, val: '0.4% count share · 57.2% value share', note: 'Dominates the dollar layer on Base via 2-hop proxy settlement (99 bps fee, 17 active buyers)' },
            { name: 'fluxa: 488,686 payments | $56,584 USD', pct: 16.1, val: '16.1% count share · 8.7% value share', note: 'Second-largest count facilitator on Base in May 2026' },
            { name: 'payAI: 178,083 payments | $11,064 USD', pct: 5.9, val: '5.9% count share · 1.7% value share', note: 'Third-largest count facilitator on Base in May 2026' },
            { name: 'relai & all others: 61,948 payments | $43,107 USD', pct: 6.6, val: '2.0% count share · 6.6% value share', note: 'Long tail across remaining registered Base facilitators' }
          ];
          barsEl.innerHTML = fRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        }
      }

      xmRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-xm-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-xm-tab');
          xmRoot.querySelectorAll('button[data-xm-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pS = document.getElementById('xm-panel-series');
          var pR = document.getElementById('xm-panel-recon');
          if(pS) pS.hidden = target !== 'series';
          if(pR) pR.hidden = target !== 'recon';
          if(target === 'recon') renderXmRecon(); else renderXmSeries();
          return;
        }
        var mBtn = e.target.closest('button[data-xm-metric]');
        if(mBtn){
          curXmMet = mBtn.getAttribute('data-xm-metric') || 'payments';
          xmRoot.querySelectorAll('button[data-xm-metric]').forEach(function(b){
            var on = b === mBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderXmSeries();
          return;
        }
        var rBtn = e.target.closest('button[data-xm-rec]');
        if(rBtn){
          curXmRec = rBtn.getAttribute('data-xm-rec') || 'providers';
          xmRoot.querySelectorAll('button[data-xm-rec]').forEach(function(b){
            var on = b === rBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderXmRecon();
        }
      });
      renderXmSeries();
      renderXmRecon();
    }

    /* 5. Advisory & Speaking Matcher (#advisory-scope-explorer) */
    var advRoot = document.getElementById('advisory-scope-explorer');
    if(advRoot){
      var curAdvTrk = 'diligence';
      var advTracks = {
        diligence: {
          audience: 'Asset managers, risk committees, custodians & allocators',
          timeline: '2 to 4 weeks (defined-scope project)',
          deliverable: 'Pass/fail MVEP report + remediation roadmap + CLII drift triggers',
          proof: '~250 investments backed at Borderless; Thorchain $200M collapse modeled 13m ahead',
          bars: [
            { name: 'Phase 1: Legal & Insolvency Equivalence Audit (MVEP Cat 1, 4, 5 & Exhibit 2)', pct: 95, val: 'Week 1 to 2', note: 'Tests UCC Art. 8/12 rights parity, custodian segregation, and 20-regime bankruptcy priority' },
            { name: 'Phase 2: Operational & Settlement Stress Audit (MVEP Cat 2, 3, 6, 7, 8, 10 & CSA)', pct: 90, val: 'Week 2 to 3', note: 'Audits transfer-agent reconciliation, admin-key timelocks, recursive USDC dependencies, and 2am Saturday liquidation' },
            { name: 'Phase 3: Committee Sign-Off Pack & Continuous Monitoring Setup (CLII + 3CRD)', pct: 85, val: 'Week 3 to 4', note: 'Delivers non-compensatory composite rating, remediation conditions, and 24-hour gateway drift triggers' }
          ]
        },
        structuring: {
          audience: 'Banks, asset managers, fintechs & payments firms pre-launch',
          timeline: '4 to 8 weeks (structuring memo + optional build retainer)',
          deliverable: 'Architecture memo: legal wrapper, custody/settlement stack & redemption design',
          proof: 'MVEP prospective design + Three Strategies + Uniswap fee-switch delegate committee',
          bars: [
            { name: 'Phase 1: Object & Rulebook Selection (Seven Dollars + Four Dollar Objects)', pct: 95, val: 'Week 1 to 2', note: 'Selects between PPSI stablecoin, tokenized deposit, multi-bank deposit token, or 1940 Act / Reg D wrapper' },
            { name: 'Phase 2: Custody, Transfer-Agent & Redemption Plumbing (Three Strategies)', pct: 92, val: 'Week 3 to 5', note: 'Structures canonical system of record, corporate-actions cutoff hierarchy, and multi-path redemption' },
            { name: 'Phase 3: Pre-Committee Red-Flag Review & Regulatory Filing Alignment', pct: 88, val: 'Week 6 to 8', note: 'Runs prospective MVEP 10-category gate check before code and legal agreements lock' }
          ]
        },
        token: {
          audience: 'DePIN networks, protocol foundations & token-economy underwriters',
          timeline: '4 to 8 weeks (simulation-backed design review)',
          deliverable: 'Monte Carlo scenario report + PID parameter bounds + governance guardrails',
          proof: '100+ tokenomics engagements across 9 accelerators; 240-run & 624-config simulation batteries',
          bars: [
            { name: 'Phase 1: Burn Architecture & Fiscal Sustainability Audit (Who Burns the Tokens?)', pct: 92, val: 'Week 1 to 2', note: 'Models S2R trajectory, burn-mint parity timing, and on-chain vs off-chain payer concentration (HHI)' },
            { name: 'Phase 2: 240-Run PID Emission & 624-Config Operational Risk Stress Battery', pct: 96, val: 'Week 3 to 5', note: 'Tests 14-day evaluation cadence, supply-cap invariants, and reputation recovery thresholds (95% vs 99%)' },
            { name: 'Phase 3: Governance Concentration & PCA-Exclusion Hardening (52-Protocol Benchmark)', pct: 88, val: 'Week 6 to 8', note: 'Designs delegation caps, insider-retention disclosures, and constitutional parameter boundaries' }
          ]
        },
        policy: {
          audience: 'Policy teams, stablecoin issuers, bank strategy groups & clearinghouses',
          timeline: 'Retained advisory or docket-specific sprint',
          deliverable: 'Decision memos, comment-letter drafting, operating gates & TDRC signposts',
          proof: '25 federal comment letters across 9 agencies (136 recommendations) + FSB AI response',
          bars: [
            { name: '1. GENIUS & CLARITY Rulemaking Translation (14 tracked GENIUS rulemakings)', pct: 95, val: 'Docket-to-product mapping', note: 'Translates OCC, FDIC, FinCEN, Treasury, Federal Reserve, SEC, and CFTC proposals into engineering and compliance gates' },
            { name: '2. Control-Layer & Yield-Boundary Positioning (OUSD / TDRC / 3CRD / MGCPT)', pct: 90, val: 'Equilibrium & revenue modeling', note: 'Maps two-hop yield boundaries, pass-through insurance gating, and router vs issuer value capture' },
            { name: '3. AI Fleet & Agentic Payments Governance (CLII-AI + MVEP-AI + x402)', pct: 88, val: 'Autonomous control assurance', note: 'Applies outcome-measured hard gates, lease coordination, and facilitator concentration diagnostics' }
          ]
        }
      };

      function renderAdvTrk(){
        var sumEl = document.getElementById('adv-trk-summary');
        var barsEl = document.getElementById('adv-trk-bars');
        if(!sumEl || !barsEl) return;
        var t = advTracks[curAdvTrk] || advTracks.diligence;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Built for</span><span class="b4-stat__val">' + t.audience + '</span><span class="b4-stat__sub">Primary decision-makers</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Typical duration</span><span class="b4-stat__val">' + t.timeline + '</span><span class="b4-stat__sub">Starts with 30-min intro call &amp; 1-page scope</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Core deliverable</span><span class="b4-stat__val">' + t.deliverable + '</span><span class="b4-stat__sub">Artifact-forward output</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Anchor track record</span><span class="b4-stat__val">' + t.proof + '</span><span class="b4-stat__sub">Publicly verifiable evidence base</span></div>';
        barsEl.innerHTML = t.bars.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      function renderAdvTlk(){
        var sumEl = document.getElementById('adv-tlk-summary');
        var barsEl = document.getElementById('adv-tlk-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Policy briefing</span><span class="b4-stat__val">30 to 45 minutes</span><span class="b4-stat__sub">Central banks, regulators, congressional staff &amp; industry groups</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Institutional diligence session</span><span class="b4-stat__val">45 to 60 minutes</span><span class="b4-stat__sub">Investment committees, treasury teams, custodians &amp; bank strategy</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Builder workshop</span><span class="b4-stat__val">60 to 90 minutes</span><span class="b4-stat__sub">Protocol teams, stablecoin product leads &amp; DePIN founders</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Delivery mode</span><span class="b4-stat__val">In-person or virtual</span><span class="b4-stat__sub">Custom decks + interactive explorer walk-throughs</span></div>';
        var tRows = [
          { name: 'TS-WORKSHOP-POLICY: Policy Briefing on Stablecoin & Tokenization Infrastructure (30 to 45m)', pct: 60, val: 'Routing the Dollar + CLII + GENIUS/CLARITY', note: 'Covers regime-dependent Fed transmission, SVB/BUSD gateway rotation, and where compliance attaches' },
          { name: 'TS-WORKSHOP-DILIGENCE: Institutional Diligence Session: Applying MVEP (45 to 60m)', pct: 80, val: 'MVEP 10 Categories + Exhibits 1 to 3', note: 'Walks committees through non-compensatory equivalence scoring, 20 insolvency regimes, and the 2am Saturday test' },
          { name: 'TS-WORKSHOP-BUILDER: Builder Workshop: Tokenomics, Governance & Diligence (60 to 90m)', pct: 100, val: 'Adaptive Tokenomics + Operational Risk + S2R', note: 'Stress-tests reserve design, redemption paths, PID emissions, and PCA-corrected governance concentration' }
        ];
        barsEl.innerHTML = tRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      advRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-adv-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-adv-tab');
          advRoot.querySelectorAll('button[data-adv-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pTrk = document.getElementById('adv-panel-tracks');
          var pTlk = document.getElementById('adv-panel-talks');
          if(pTrk) pTrk.hidden = target !== 'tracks';
          if(pTlk) pTlk.hidden = target !== 'talks';
          if(target === 'talks') renderAdvTlk(); else renderAdvTrk();
          return;
        }
        var trkBtn = e.target.closest('button[data-adv-track]');
        if(trkBtn){
          curAdvTrk = trkBtn.getAttribute('data-adv-track') || 'diligence';
          advRoot.querySelectorAll('button[data-adv-track]').forEach(function(b){
            var on = b === trkBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderAdvTrk();
        }
      });
      renderAdvTrk();
      renderAdvTlk();
    }

    /* 6. Resume Role Comparator (#resume-role-explorer) */
    var resRoot = document.getElementById('resume-role-explorer');
    if(resRoot){
      var curRole = 'policy';
      var roles = {
        policy: {
          title: 'Policy & market infrastructure',
          url: '/resume/policy/',
          pdf: '/resumes/Zukowski_Resume_Policy.pdf?v=20261009',
          mandate: 'Central banks, regulatory agencies, clearinghouses & financial-stability teams',
          proof: 'FRBNY Dollar Conference paper + 25 federal letters (136 recs across 9 agencies)',
          frameworks: 'CLII, MVEP, 3CRD, MGCPT & TDRC',
          bars: [
            { name: 'Regulatory rulemaking & supervisory comment architecture', pct: 98, val: '25 federal letters + FSB AI response', note: 'Covers OCC, FDIC, FinCEN, Treasury, Federal Reserve Board, SEC, CFTC, and NCUA dockets' },
            { name: 'Monetary-policy transmission & gateway concentration econometrics', pct: 95, val: '$60.6T 9-chain panel · 19 gateways', note: 'Johansen cointegration under conditional randomization null, SVB/BUSD stress rotation, and CLII scoring' },
            { name: 'Clearing, CSD & settlement-finality market structure', pct: 92, val: 'Three Strategies + Seven Dollars', note: 'Analyzes Nasdaq-DTC, ICE-NYSE, and Securitize-Broadridge strategies plus 20-regime insolvency law' }
          ]
        },
        asset: {
          title: 'Asset management & tokenization',
          url: '/resume/asset-management/',
          pdf: '/resumes/Zukowski_Resume_Asset_Management.pdf?v=20261009',
          mandate: 'Institutional asset managers, RWA funds, allocators & investment committees',
          proof: '~$500M deployed across 250 investments (1,000+ funnel); LayerZero seed (~80x)',
          frameworks: 'MVEP (Exhibits 1 to 3), mNAV Dashboard & Tokenization Infrastructure Map',
          bars: [
            { name: 'Institutional fund & wrapper diligence (14-product MVEP scorecard)', pct: 96, val: 'BENJI, BUIDL, OUSG, USYC, USDY', note: 'Non-compensatory Legal, Operational, and Economic equivalence grading across 10 categories + recursive CSA' },
            { name: 'Venture & liquid token underwriting track record (Borderless Capital)', pct: 95, val: '~$500M deployed · 250 investments', note: 'Founding research hire; sourced LayerZero seed (~80x); analyzed ~75 Digital Asset Treasury stocks (18 invested)' },
            { name: '2am Saturday collateral operability & off-exchange margin risk', pct: 90, val: '3 liquidation paths · 7 stress scenarios', note: 'Evaluates instant-redemption pool capacity, whitelist ATS liquidity, and weekend NAV gaps' }
          ]
        },
        payments: {
          title: 'Stablecoin & payments strategy',
          url: '/resume/stablecoin-payments/',
          pdf: '/resumes/Zukowski_Resume_Operator.pdf?v=20261009',
          mandate: 'Stablecoin issuers, payment networks, card/fintech rails & bank deposit-token teams',
          proof: '19-gateway CLII + 11-product US-holder scorecard + x402 facilitator census',
          frameworks: 'CLII, TDRC, Two-Hop Yield Boundary & Buyer-Cardinality Classifier',
          bars: [
            { name: 'Gateway routing, reserve economics & distribution structuring', pct: 96, val: 'CLII + OUSD / USDC 2-hop analysis', note: 'Maps reserve carry retention vs distributor revenue share under GENIUS s.4(a)(11) and CLARITY s.404' },
            { name: 'Cross-chain settlement & agentic payment facilitation (x402)', pct: 92, val: '138 facilitator addresses · 3 chains', note: 'Measures count vs value monopolists, proxy-settlement spreads (99 bps vs 14 bps), and subsidy pipelines' },
            { name: 'Portfolio advisory across payment & infrastructure founders', pct: 90, val: '100 portfolio companies advised 1-on-1', note: 'Hands-on reserve, redemption, and go-to-market structuring across six years' }
          ]
        },
        product: {
          title: 'Digital asset product',
          url: '/resume/product/',
          pdf: '/resumes/Zukowski_Resume_Product.pdf?v=20261009',
          mandate: 'Product leads at banks, exchanges, transfer agents & tokenization platforms',
          proof: '1,000+ deal funnel -> 250 investments; 9 accelerator cohorts (100 teams mentored)',
          frameworks: 'MVEP Product Gate, 3CRD UX Disclosure & 6-Step Decision Map',
          bars: [
            { name: 'End-to-end tokenized product lifecycle & exception handling', pct: 95, val: 'System of record, holds & cutoffs', note: 'Designs corporate-actions hierarchy, reversible hold/release workflows, and weekend redemption queues' },
            { name: 'Point-of-use disclosure & compliant default routing UX', pct: 92, val: '3CRD + CLARITY router metrics', note: 'Embeds legal claim, reserve composition, and custody location directly into wallet and checkout surfaces' },
            { name: 'Cross-functional alignment across engineering, legal, risk & liquidity', pct: 94, val: '100+ tokenomics & product workshops', note: 'Translates statutory text and committee gates into shippable product specifications' }
          ]
        },
        aigov: {
          title: 'AI governance & infrastructure',
          url: '/resume/ai-governance-infrastructure/',
          pdf: '/resumes/Zukowski_Resume_AI_Governance_Infrastructure.pdf?v=20261009',
          mandate: 'AI safety/governance teams, multi-agent runtime builders & enterprise AI risk leads',
          proof: '42 USPTO patent applications (32 families) · 68,000+ fleet commits · 99.56% gate hold',
          frameworks: 'CLII-AI, MVEP-AI, Lease Coordination & Outcome-Graded Safeguards',
          bars: [
            { name: 'Multi-agent runtime coordination, staging isolation & lease recovery', pct: 98, val: '14 typical / 61 peak concurrent agents', note: 'Built production operating layer across 68,000+ commits, 192 pre-commit checks, and 33 canonical state files' },
            { name: 'Outcome measurement of advisories vs armed hard gates', pct: 96, val: '63,230 advisories · 13,098/13,156 gate stops', note: 'Proved 84% workspace repeat rate on top advisory warning vs 99.56% hold rate on armed hard gates' },
            { name: 'Intellectual property & international AI supervisory policy', pct: 94, val: '42 USPTO filings · FSB AI consultation', note: '32 patent families covering provenance, verifiers, and fleet governance; Frontiers in Blockchain publication' }
          ]
        },
        risk: {
          title: 'Risk, controls & diligence',
          url: '/resume/risk-controls/',
          pdf: '/resumes/Zukowski_Resume_Risk.pdf?v=20261009',
          mandate: 'CROs, enterprise risk committees, clearinghouse risk desks & operational-resilience teams',
          proof: 'Thorchain $200M collapse modeled 13m ahead; 74 ValOS vectors -> 624-config battery',
          frameworks: 'MVEP Non-Compensatory Floor, ValOS/NORS Simulation & Vacuous-Check Controls',
          bars: [
            { name: 'Ex-ante structural failure modeling & stress-scenario engineering', pct: 98, val: 'Thorchain 10-step memo (Dec 2023)', note: 'Predicted step-by-step insolvency sequence 13 months before the $200M collapse occurred' },
            { name: 'Operational-risk simulation (74 ValOS vectors / 64 controls / 36 NORS objectives)', pct: 95, val: '624 configurations · 1,126 runs', note: 'Identified threshold-induced reputation collapse (99% vs 95%) and PID downside-insurance advantage' },
            { name: 'Verifier instrumentation & silent-failure elimination', pct: 94, val: '11 silent failures catalogued & fixed', note: 'Enforces known-false verifier testing, three-valued state checks, and live hook-byte verification' }
          ]
        }
      };

      function renderResRole(){
        var sumEl = document.getElementById('res-role-summary');
        var barsEl = document.getElementById('res-role-bars');
        if(!sumEl || !barsEl) return;
        var r = roles[curRole] || roles.policy;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Selected role profile</span><span class="b4-stat__val"><a href="' + r.url + '" style="color:inherit;text-decoration:underline;">' + r.title + '</a></span><span class="b4-stat__sub"><a href="' + r.pdf + '" target="_blank" rel="noopener noreferrer">Download tailored PDF</a></span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Target hiring context</span><span class="b4-stat__val">' + r.mandate + '</span><span class="b4-stat__sub">Decision-maker alignment</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Headline quantitative proof</span><span class="b4-stat__val">' + r.proof + '</span><span class="b4-stat__sub">Verified production &amp; research metrics</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Core frameworks applied</span><span class="b4-stat__val">' + r.frameworks + '</span><span class="b4-stat__sub">Reusable diagnostic instruments</span></div>';
        barsEl.innerHTML = r.bars.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      resRoot.addEventListener('click', function(e){
        var rBtn = e.target.closest('button[data-res-role]');
        if(rBtn){
          curRole = rBtn.getAttribute('data-res-role') || 'policy';
          resRoot.querySelectorAll('button[data-res-role]').forEach(function(b){
            var on = b === rBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderResRole();
        }
      });
      renderResRole();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initWave3Explorers);
  } else {
    initWave3Explorers();
  }
})();

/* ==========================================================================
   Wave 4 Hub Explorers: Letters, GENIUS Act Tracker, Patents & Data Catalog
   ========================================================================== */
(function(){
  function initWave4Explorers(){
    /* 1. Letters Program Explorer (#letters-program-explorer) */
    var letRoot = document.getElementById('letters-program-explorer');
    if(letRoot){
      var curLens = 'agency';
      function renderLetAg(){
        var sumEl = document.getElementById('let-ag-summary');
        var barsEl = document.getElementById('let-ag-bars');
        if(!sumEl || !barsEl) return;
        if(curLens === 'agency'){
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">Federal comment letters</span><span class="b4-stat__val">25 letters (+1 FSB)</span><span class="b4-stat__sub">Filed April 10 to October 19, 2026 across 19 dockets</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Recipient agencies</span><span class="b4-stat__val">9 federal agencies</span><span class="b4-stat__sub">FDIC, FinCEN, OFAC, OCC, Treasury, SEC, NCUA, Fed, CFTC</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Numbered recommendations</span><span class="b4-stat__val">136 concrete asks</span><span class="b4-stat__sub">Every ask indexed with statutory &amp; empirical citations</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Initial 10-day sprint</span><span class="b4-stat__val">8 letters (Apr 10 to 20)</span><span class="b4-stat__sub">7 rulemakings across 6 docket IDs and 5 agencies</span></div>';
          var aRows = [
            { name: 'FDIC (6 letters: AG19 PPSI activities, AG20 application, AG21 resolution, AG27 assessments, AG29 BSA, AG30 disclosure)', pct: 100, val: '6 letters · 33 recommendations', note: 'Anchors MGCPT conditional pass-through insurance (AG19 Rec 7) and wholesale reserve-deposit run-risk metrics (AG21/AG27)' },
            { name: 'FinCEN & OFAC (5 letters: AML/CFT + supp., PPSI sanctions + supp., AB74 joint PPSI CIP)', pct: 83, val: '5 letters · 33 recommendations', note: 'Operationalizes GENIUS Section 1033.240 freeze/block/reject capability and SVB Chow structural break (F = 7.41, p = 0.0012)' },
            { name: 'OCC (3 letters: AF41 PPSI MVEP, AF41 control-layer supplemental, AF55 BSA & sanctions)', pct: 50, val: '3 letters · 12 recommendations', note: 'First filing in the program (OCC-2025-0372-0057); attaches MVEP v9 manuscript to the administrative record' },
            { name: 'U.S. Department of the Treasury (3 letters: GENIUS state-similarity + Section 3 issuance & supplemental)', pct: 50, val: '3 letters · 13 recommendations', note: 'Applies 3CRD disclosure and CLII observable contract capability vs unobservable foreign compliance intent' },
            { name: 'SEC (3 letters: DSP-3 Strategic Plan, S7-2026-27 Reg Crypto Assets, File 4-927 Tokenized NMS Stock)', pct: 50, val: '3 letters · 19 recommendations', note: 'Applies 52-protocol PCA exclusion typology (2.3x inflation fix) and MVEP/CLII ledger-verifiable exemption conditions' },
            { name: 'NCUA (2 letters: RIN 3133-AG10 credit-union PPSI standards + routing supplemental)', pct: 33, val: '2 letters · 11 recommendations', note: 'Completes coverage of every GENIUS-implementing agency and flags cross-agency charter-arbitrage gaps' },
            { name: 'Federal Reserve Board, CFTC & Joint Banking Agencies (3 letters: R-1835, OMB 3038-0076, 91 FR 18304)', pct: 50, val: '3 letters · 15 recommendations', note: 'Covers Fed AML coordination omission, CFTC DCO tokenized collateral haircuts, and joint banking AML harmonization' },
            { name: 'Financial Stability Board (International consultation: Sound Practices for Responsible Adoption of AI)', pct: 25, val: '1 international response (All 7 Qs)', note: 'Introduces CLII-AI, MVEP-AI, and the live x402 agentic-payments settlement census to global supervisors' }
          ];
          barsEl.innerHTML = aRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        } else {
          sumEl.innerHTML =
            '<div class="b4-stat"><span class="b4-stat__label">CLII invocations</span><span class="b4-stat__val">19 letters</span><span class="b4-stat__sub">5-dimension operator regulatory intensity &amp; drift index</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">MVEP invocations</span><span class="b4-stat__val">15 letters</span><span class="b4-stat__sub">10-category non-compensatory product equivalence standard</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">Control-layer &amp; 3CRD / MGCPT</span><span class="b4-stat__val">11 letters</span><span class="b4-stat__sub">Point-of-use reserve disclosure &amp; pass-through gating</span></div>' +
            '<div class="b4-stat"><span class="b4-stat__label">AI extension (CLII-AI / MVEP-AI)</span><span class="b4-stat__val">FSB + SEC 4-927</span><span class="b4-stat__sub">Autonomous agent fleets &amp; x402 facilitator concentration</span></div>';
          var fRows = [
            { name: 'CLII (Control Layer Intensity Index): 0-to-1 gateway & operator scoring across 5 dimensions', pct: 76, val: '19 of 25 federal letters (+FSB)', note: 'Separates where regulatory obligations attach (licensing, transparency, freeze, compliance, geo) from product stress resilience' },
            { name: 'MVEP (Minimum Viable Equivalence Pack): 10-category buyer-side diligence gate', pct: 60, val: '15 of 25 federal letters (+FSB)', note: 'Tests Legal, Operational, and Economic equivalence; adopted in OCC, FDIC, NCUA, SEC, and CFTC collateral filings' },
            { name: 'Control-Layer Mandate & On-Chain Measurement (Holds, routing defaults, PCA exclusion)', pct: 44, val: '11 letters', note: 'Grounds supervisory triggers in directly observable contract state and PCA-corrected holder concentration' },
            { name: '3CRD (Three-Category Reserve Disclosure) & MGCPT (MVEP-Gated Conditional Pass-Through)', pct: 32, val: 'OCC, Treasury & FDIC AG19 core asks', note: 'Surfaces legal claim, reserve composition, and custody location at point of use; gates FDIC pass-through on 6 MVEP categories' }
          ];
          barsEl.innerHTML = fRows.map(function(b){
            return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
          }).join('');
        }
      }

      function renderLetCyc(){
        var sumEl = document.getElementById('let-cyc-summary');
        var barsEl = document.getElementById('let-cyc-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">GENIUS implementation cycle</span><span class="b4-stat__val">14 letters (78 recs)</span><span class="b4-stat__sub">Spans OCC, FDIC, FinCEN/OFAC, Treasury, and NCUA</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">AML/CFT program reform</span><span class="b4-stat__val">4 letters (21 recs)</span><span class="b4-stat__sub">FinCEN, Joint Banking Agencies, and Federal Reserve R-1835</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">FDIC resolution &amp; risk pricing</span><span class="b4-stat__val">3 letters (14 recs)</span><span class="b4-stat__sub">AG21 resolution plans, AG27 assessments, AG30 disclosure</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">SEC &amp; CFTC market structure</span><span class="b4-stat__val">4 letters (23 recs)</span><span class="b4-stat__sub">DSP-3, Reg Crypto Assets, Tokenized NMS Stock, CFTC DCOs</span></div>';
        var cRows = [
          { name: 'Cycle 1: GENIUS Act Implementation (OCC, FDIC, Treasury, FinCEN/OFAC, NCUA)', pct: 100, val: '14 letters · 78 recommendations', note: 'Covers PPSI chartering, reserve custody, state-similarity principles, foreign issuer Section 3 rules, and CIP/sanctions' },
          { name: 'Cycle 2: AML/CFT Program Modernization (FinCEN, Joint Banking Agencies, Fed R-1835)', pct: 35, val: '4 letters · 21 recommendations', note: 'Identifies interagency consultation omissions and aligns risk-assessment metrics across banking and stablecoin supervisors' },
          { name: 'Cycle 3: SEC Digital-Asset & Tokenized Securities Rulemaking (DSP-3, S7-2026-27, File 4-927)', pct: 30, val: '3 letters · 19 recommendations', note: 'Replaces self-certified decentralization and procedural descriptions with reproducible on-chain control and finality tests' },
          { name: 'Cycle 4: FDIC Resolution Submissions, Assessments & Supervisory Disclosure (AG21, AG27, AG30)', pct: 25, val: '3 letters · 14 recommendations', note: 'Preserves uninsured-deposit concentration reporting and establishes statistical disclosure controls for research access' },
          { name: 'Cycle 5: CFTC Clearing Organization Collateral & International AI Supervision (3038-0076, FSB)', pct: 20, val: '2 filings · 4 CFTC recs + 7 FSB Qs', note: 'Applies MVEP Categories 4, 5, 6, and 10 to DCO tokenized collateral haircuts and MVEP-AI/CLII-AI to autonomous fleets' }
        ];
        barsEl.innerHTML = cRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      letRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-let-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-let-tab');
          letRoot.querySelectorAll('button[data-let-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pA = document.getElementById('let-panel-agencies');
          var pC = document.getElementById('let-panel-cycles');
          if(pA) pA.hidden = target !== 'agencies';
          if(pC) pC.hidden = target !== 'cycles';
          if(target === 'cycles') renderLetCyc(); else renderLetAg();
          return;
        }
        var lBtn = e.target.closest('button[data-let-lens]');
        if(lBtn){
          curLens = lBtn.getAttribute('data-let-lens') || 'agency';
          letRoot.querySelectorAll('button[data-let-lens]').forEach(function(b){
            var on = b === lBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderLetAg();
        }
      });
      renderLetAg();
      renderLetCyc();
    }

    /* 2. GENIUS Act Tracker Explorer (#genius-timeline-explorer) */
    var genRoot = document.getElementById('genius-timeline-explorer');
    if(genRoot){
      function renderGenAg(){
        var sumEl = document.getElementById('gen-ag-summary');
        var barsEl = document.getElementById('gen-ag-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Tracked GENIUS actions</span><span class="b4-stat__val">14 rulemakings</span><span class="b4-stat__sub">Published Dec 19, 2025 through Sep 30, 2026</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Rulemaking status split</span><span class="b4-stat__val">1 in effect · 2 open · 11 pending</span><span class="b4-stat__sub">Treasury s.4(c) IFR in effect; 2 Fed proposals open to Nov 30</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Program letter coverage</span><span class="b4-stat__val">10 of 14 rulemakings</span><span class="b4-stat__sub">14 GENIUS-cycle comment letters filed (Nos. 1-4, 6, 8, 10-13, 15-16, 22, 24)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Next major target</span><span class="b4-stat__val">November 2026</span><span class="b4-stat__sub">OCC final-rule target &amp; Nov 30 Fed / Treasury IFR comment close</span></div>';
        var gRows = [
          { name: 'FDIC (3 NPRMs: RIN 3064-AG20 application, AG19 PPSI standards, AG29 BSA/sanctions)', pct: 100, val: '3 of 3 commented (Nos. 4, 8, 13) · All pending final rule', note: 'Covers IDI subsidiary issuance approvals, reserve/redemption standards, and BSA compliance' },
          { name: 'U.S. Department of the Treasury (3 actions: AC90 state-similarity, AC95 Section 3 issuance, s.4(c) IFR)', pct: 100, val: '1 IFR in effect · 2 NPRMs commented (Nos. 3, 22, 24)', note: 'September 30, 2026 interim final rule on state certification forms is the first GENIUS action in effect' },
          { name: 'OCC (2 NPRMs: RIN 1557-AF41 PPSI framework, RIN 1557-AF55 BSA & sanctions)', pct: 100, val: '2 of 2 commented (Nos. 1, 2, 15) · Target Nov 2026', note: 'Comptroller stated August 20, 2026 that OCC intends to issue its final rule by November 2026' },
          { name: 'FinCEN & Interagency (2 NPRMs: RIN 1506-AB73 sanctions/AML, RIN 1506-AB74 5-agency CIP)', pct: 100, val: '2 of 2 commented (Nos. 6, 10, 16) · Pending final rule', note: 'Establishes block/freeze/reject technical mandates and customer identification rules across all 5 regulators' },
          { name: 'NCUA (2 NPRMs: RIN 3133-AF69 PPSI licensing, RIN 3133-AG10 credit-union stablecoin standards)', pct: 50, val: '1 commented (Nos. 11, 12) · Both pending final rule', note: 'Adapts PPSI supervision and reserve rules to federally insured credit unions' },
          { name: 'Board of Governors of the Federal Reserve System (2 NPRMs: Docket R-1899 reserve/capital & subsidiary application)', pct: 40, val: '2 open for comment until Nov 30, 2026', note: 'Published September 29, 2026; completes the primary federal regulator proposal set' }
        ];
        barsEl.innerHTML = gRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      function renderGenSt(){
        var sumEl = document.getElementById('gen-st-summary');
        var barsEl = document.getElementById('gen-st-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Enactment date</span><span class="b4-stat__val">July 18, 2025</span><span class="b4-stat__sub">S. 1582 signed into law as Public Law 119-27</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Section 13 rule deadline</span><span class="b4-stat__val">July 18, 2026 (Passed)</span><span class="b4-stat__sub">1-year statutory deadline elapsed with 0 final rules issued</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Section 20 effective date</span><span class="b4-stat__val">January 18, 2027</span><span class="b4-stat__sub">Earlier of 18 months post-enactment or 120d after final rules</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Section 3 DASP restriction</span><span class="b4-stat__val">July 18, 2028</span><span class="b4-stat__sub">3 years post-enactment: US platforms limited to PPSI coins</span></div>';
        var sRows = [
          { name: 'Milestone 1: July 18, 2025 (GENIUS Act Enactment, Pub. L. 119-27)', pct: 100, val: 'Completed (Month 0)', note: 'Sets federal PPSI perimeter, 1:1 liquid reserve mandate, Bankruptcy Code holder priority, and Section 4(a)(11) yield ban' },
          { name: 'Milestone 2: July 18, 2026 (Section 13 Statutory Rulemaking Deadline, 12 months)', pct: 100, val: 'Elapsed (proposals still pending)', note: 'Because final rules were not issued within 8 months of enactment, the 120-day prong could not precede January 18, 2027' },
          { name: 'Milestone 3: November 30, 2026 (Federal Reserve R-1899 & Treasury s.4(c) IFR Comment Close)', pct: 82, val: 'Active window (Month 16)', note: 'Concludes initial notice-and-comment across all primary federal payment stablecoin regulators' },
          { name: 'Milestone 4: January 18, 2027 (Statutory Effective Date, 18 months after enactment)', pct: 75, val: 'Binding effective date (Month 18)', note: '18-month prong of the Section 20 formula governs automatically because final rules did not land before September 20, 2026' },
          { name: 'Milestone 5: July 18, 2028 (Section 3 Digital Asset Service Provider Perimeter Lock)', pct: 40, val: 'Month 36 enforcement gate', note: 'Three years after enactment, DASPs may offer or sell to U.S. persons only payment stablecoins issued by qualified PPSIs or compliant foreign issuers' }
        ];
        barsEl.innerHTML = sRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      genRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-gen-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-gen-tab');
          genRoot.querySelectorAll('button[data-gen-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pA = document.getElementById('gen-panel-agencies');
          var pS = document.getElementById('gen-panel-statute');
          if(pA) pA.hidden = target !== 'agencies';
          if(pS) pS.hidden = target !== 'statute';
          if(target === 'statute') renderGenSt(); else renderGenAg();
        }
      });
      renderGenAg();
      renderGenSt();
    }

    /* 3. Patents Crosswalk Explorer (#patents-crosswalk-explorer) */
    var patRoot = document.getElementById('patents-crosswalk-explorer');
    if(patRoot){
      function renderPatAr(){
        var sumEl = document.getElementById('pat-ar-summary');
        var barsEl = document.getElementById('pat-ar-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">USPTO applications</span><span class="b4-stat__val">42 provisional filings</span><span class="b4-stat__sub">Filed in 2026 across 32 distinct patent families</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Largest problem area</span><span class="b4-stat__val">Coordination &amp; fleet (9)</span><span class="b4-stat__sub">Includes 64/180,865 (claim, lease, and park resolution)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Production validation</span><span class="b4-stat__val">68,000+ fleet commits</span><span class="b4-stat__sub">14 typical / 61 peak concurrent sessions; 99.56% gate hold</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">On-chain &amp; DePIN families</span><span class="b4-stat__val">6 attribution filings</span><span class="b4-stat__sub">Reputation recovery threshold &amp; control-attribution interlock</span></div>';
        var arRows = [
          { name: 'Area 4: Coordination, fleet governance, and session continuity (64/231,533 to 64/180,865)', pct: 100, val: '9 filings (21.4%)', note: 'Time-bounded task leases, off-branch compare-and-swap claim admission, resource-triggered handoff, and outward-act governance' },
          { name: 'Area 3: Provenance and artifact coherence (64/107,069 to 64/143,852)', pct: 89, val: '8 filings (19.0%)', note: 'Tamper-evident coordination-proof logging, count-in-artifact staleness detection, and seal-to-log provenance chains' },
          { name: 'Area 5: Measurement and detector validity (64/135,000 to 64/174,920)', pct: 89, val: '8 filings (19.0%)', note: 'Instrument-absence controls, calibration-gated detector promotion, typed-judgment offload (Jev), and observer-first arming' },
          { name: 'Area 1: Concurrent repository integrity (64/071,767 to 64/137,910)', pct: 78, val: '7 filings (16.7%)', note: 'Per-session staging isolation, push-time landing concurrency control, edit-intent collision gating, and false-vs-true contention' },
          { name: 'Area 6: On-chain governance and control attribution (64/128,867 to 64/120,240)', pct: 67, val: '6 filings (14.3%)', note: 'Self-calibrating reputation-recovery threshold and deterministic multi-surface control-attribution interlock (PCA exclusion)' },
          { name: 'Area 2: Evidence and retrieval quality (64/097,316 to 64/143,857)', pct: 44, val: '4 filings (9.5%)', note: 'Authority-aware context routing, evidence-grounding for cited values, and conjunctive detection of omitted/unsupported claims' }
        ];
        barsEl.innerHTML = arRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      function renderPatPp(){
        var sumEl = document.getElementById('pat-pp-summary');
        var barsEl = document.getElementById('pat-pp-bars');
        if(!sumEl || !barsEl) return;
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Agent Infrastructure page</span><span class="b4-stat__val">36 filings (Areas 1 to 5)</span><span class="b4-stat__sub">Staging isolation, leases, provenance, and outcome-graded gates</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Governance Concentration (B2)</span><span class="b4-stat__val">64/130,737 &amp; 64/136,352</span><span class="b4-stat__sub">Multi-surface control-attribution interlock &amp; typed absence</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Operational Risk (B4)</span><span class="b4-stat__val">64/128,867 &amp; 64/135,014</span><span class="b4-stat__sub">Self-calibrating reputation-recovery threshold (95% vs 99%)</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">MVEP &amp; Comment Letters</span><span class="b4-stat__val">64/095,597 &amp; 64/128,862</span><span class="b4-stat__sub">Evidence-grounded assessments &amp; derived-artifact admission control</span></div>';
        var ppRows = [
          { name: 'Agent Infrastructure (/agent-infrastructure/) -> Areas 1, 3, 4 & 5', pct: 96, val: '64/071,767 · 64/180,865 · 64/174,920', note: 'Directly implements worktree staging isolation, time-bounded task leases, known-false verifier checks, and observer-first hard gates' },
          { name: 'Auditing Governance Concentration (/papers/governance-concentration/) -> Area 6', pct: 90, val: '64/130,737 · 64/136,352 · 64/138,859', note: 'Formalizes the 5-class PCA exclusion typology and frontier-relative typed absence outcome when pseudonymous control is undetermined' },
          { name: 'Operational Risk in Token Economies (/papers/operational-risk/) -> Area 6', pct: 88, val: '64/128,867 · 64/135,014', note: 'Formalizes the self-calibrating reputation-recovery threshold that prevents threshold-induced governance collapse under validator downtime' },
          { name: 'MVEP & 25-Letter Regulatory Program (/papers/mvep/ & /letters/) -> Areas 2 & 3', pct: 85, val: '64/095,597 · 64/102,816 · 64/111,022', note: 'Governs evidence-grounding for cited statutory/empirical values and count-in-artifact staleness detection across 140+ letter mentions' }
        ];
        barsEl.innerHTML = ppRows.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.val + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      patRoot.addEventListener('click', function(e){
        var tBtn = e.target.closest('button[data-pat-tab]');
        if(tBtn){
          var target = tBtn.getAttribute('data-pat-tab');
          patRoot.querySelectorAll('button[data-pat-tab]').forEach(function(b){
            var on = b === tBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          var pA = document.getElementById('pat-panel-areas');
          var pP = document.getElementById('pat-panel-papers');
          if(pA) pA.hidden = target !== 'areas';
          if(pP) pP.hidden = target !== 'papers';
          if(target === 'papers') renderPatPp(); else renderPatAr();
        }
      });
      renderPatAr();
      renderPatPp();
    }

    /* 4. Data & Code Catalog Explorer (#data-catalog-explorer) */
    var datRoot = document.getElementById('data-catalog-explorer');
    if(datRoot){
      var curDat = 'all';
      var datItems = [
        { cat: 'feeds', pct: 100, name: 'Letters registry (/letters/letters.json)', badge: 'JSON · 25 federal + 1 FSB · 19 dockets', note: 'Complete machine-readable record of dockets, agencies, frameworks, 136 recommendations, and proceeding outcomes' },
        { cat: 'feeds', pct: 96, name: 'Recommendation index (/letters/recommendations.csv)', badge: 'CSV · 136 rows', note: 'Flat one-row-per-ask export with letter number, agency, filing date, ask summary, full text, topics, and status' },
        { cat: 'feeds', pct: 92, name: 'GENIUS Act rulemaking tracker (/trackers/genius-act/genius-act.json)', badge: 'JSON · 14 rulemakings', note: 'Every implementing rulemaking under Pub. L. 119-27 with RIN, Federal Register citation, comment window, and status' },
        { cat: 'feeds', pct: 95, name: 'MVEP scorecard & composite rating (/data/mvep/*.csv)', badge: '2 CSVs · 154 cells + 14 ratings', note: 'Exhibit 1 (11 rows x 14 products) and Exhibit 3 non-compensatory composite ratings mirrored from mvep-replication' },
        { cat: 'feeds', pct: 90, name: 'Patent portfolio registry (/patents/patents.json)', badge: 'JSON · 42 filings · 32 families', note: 'All 42 USPTO provisional serial numbers and descriptions grouped across the 6 technical problem areas' },
        { cat: 'feeds', pct: 94, name: 'Fleet commit series (/agent-infrastructure/commits-per-3-days.json)', badge: 'JSON · 79 3d bins + 237 1d bins', note: '67,675 commits in series (68,264 on ref) from March 2 through October 24, 2026 in America/New_York time' },
        { cat: 'feeds', pct: 85, name: 'Compiled comment letters packet (/letters/all-letters.pdf)', badge: 'PDF · Bookmarked compilation', note: 'All 25 federal comment letters assembled in filing order with cover table of contents and PDF outline bookmarks' },
        { cat: 'feeds', pct: 82, name: 'Syndication feeds (/letters/feed.xml & /notes/feed.xml)', badge: 'Atom XML · 2 feeds', note: 'Subscribe to new regulatory filings and dated status/event notes' },
        { cat: 'tracka', pct: 100, name: 'Routing the Dollar replication (GitHub v43-post-conference + #a1-routing-explorer)', badge: 'SSRN 6267698 · $60.6T panel', note: '157-week 9-chain panel, 51-address Ethereum gateway registry, Johansen conditional randomization null, and SVB/BUSD scripts' },
        { cat: 'tracka', pct: 98, name: 'Minimum Viable Equivalence Pack replication (GitHub mvep-replication + #a2-mvep-explorer)', badge: 'SSRN 6363138 · 14 products · 20 regimes', note: 'Exhibit 1 scorecard, Exhibit 2 20-regime Category 5 insolvency matrix (140 primary-source cells), and Exhibit 3 rating generator' },
        { cat: 'tracka', pct: 92, name: 'Seven Dollars replication (GitHub v1.0 + #a3-dollars-explorer)', badge: 'SSRN 6483118 · 8-metric eligibility + 11-product US-holder', note: 'Collateral eligibility scoring across published, 3-year rolling, and mechanical specs plus 5-marker US-holder classification' },
        { cat: 'tracka', pct: 86, name: 'Three Tokenization Strategies explorer (#a4-strategy-explorer)', badge: 'SSRN 6483198 · 10-entity dependency matrix', note: 'Interactive shared-operator outage simulator (Securitize, BNY, Cantina, Chainlink) and corporate-actions cutoff matrix' },
        { cat: 'tracka', pct: 90, name: 'Who Controls Agentic Payments? explorer (#c4-x402-explorer & #x402-memo-explorer)', badge: 'SSRN 7396241 · 138 facilitator addresses', note: 'Base, Solana, and Polygon facilitator HHI (count vs value monopolists), buyer-cardinality classifier, and Meridian 2-hop reconciliation' },
        { cat: 'trackb', pct: 100, name: 'Governance Concentration replication (GitHub v1.0.4 + #b2-gov-explorer)', badge: 'Frontiers 9:1853465 · 52 protocols', note: '133 PCA exclusions across 38 protocols, 50-protocol allocation null (r = 0.09), and 18-protocol Snapshot/Tally delegation dataset' },
        { cat: 'trackb', pct: 94, name: 'Who Burns the Tokens? replication (GitHub + #b3-burns-explorer)', badge: 'SSRN 6483619 · 34m Helium S2R + 13 protocols', note: 'Helium 34-month burn-to-emission series, Top-5 payer HHI (0.27), and 13-protocol payment-architecture observability matrix' },
        { cat: 'trackb', pct: 96, name: 'Adaptive Tokenomics simulation (GitHub + #b1-meshnet-explorer)', badge: 'SSRN 6364158 · 240-run 30-seed ensemble', note: '5-year MeshNet Monte Carlo comparing PID vs static emissions across Competitor, Regulatory, Bear, and Bull shocks' },
        { cat: 'trackb', pct: 96, name: 'Operational Risk simulation (GitHub meshnet-depin-simulation + #b4-oprisk-explorer)', badge: 'SSRN 6352118 · 624 configs · 1,126 runs', note: '74 ValOS risk vectors and 36 NORS objectives mapped to 7 simulatable parameters; reputation-threshold phase transition (95% vs 99%)' }
      ];

      function renderDat(){
        var sumEl = document.getElementById('dat-cat-summary');
        var barsEl = document.getElementById('dat-cat-bars');
        if(!sumEl || !barsEl) return;
        var list = datItems.filter(function(r){ return curDat === 'all' || r.cat === curDat; });
        sumEl.innerHTML =
          '<div class="b4-stat"><span class="b4-stat__label">Items displayed</span><span class="b4-stat__val">' + list.length + ' of 17</span><span class="b4-stat__sub">8 live site feeds + 9 SSRN paper replication packages</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Interactive explorers</span><span class="b4-stat__val">23 live across site</span><span class="b4-stat__sub">Every SSRN paper, briefing, and core hub has an interactive tool</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Content &amp; data licence</span><span class="b4-stat__val">CC BY 4.0</span><span class="b4-stat__sub">Free to reuse with attribution and link; code per repo licence</span></div>' +
          '<div class="b4-stat"><span class="b4-stat__label">Citation support</span><span class="b4-stat__val">42 pages (APA + BibTeX)</span><span class="b4-stat__sub">One-click Copy citation &amp; Copy BibTeX on all 16 papers &amp; 26 letters</span></div>';
        barsEl.innerHTML = list.map(function(b){
          return '<div class="b4-bar-row"><div class="b4-bar-row__top"><span class="b4-bar-row__name">' + b.name + '</span><span class="b4-bar-row__val">' + b.badge + '</span></div><div class="b4-bar-track"><div class="b4-bar-fill" style="width:' + b.pct + '%"></div></div><div class="b4-bar-row__meta">' + b.note + '</div></div>';
        }).join('');
      }

      datRoot.addEventListener('click', function(e){
        var cBtn = e.target.closest('button[data-dat-cat]');
        if(cBtn){
          curDat = cBtn.getAttribute('data-dat-cat') || 'all';
          datRoot.querySelectorAll('button[data-dat-cat]').forEach(function(b){
            var on = b === cBtn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          renderDat();
        }
      });
      renderDat();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initWave4Explorers);
  } else {
    initWave4Explorers();
  }
})();










