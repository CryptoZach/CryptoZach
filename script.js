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

  // Set by homepage matrix init so hero-wide touch release can call mtxStop (capture target is #hero).
  var homeHeroMtxStop = null;
  /* Long-press flagship CTA on coarse pointers: keep matrix running until outside tap or Escape. */
  var mtxHeroLongPressPin = false;

  // Mobile menu (toggle, Escape to close, close when viewport is desktop width)
  const menuToggle = document.getElementById('menuToggle');
  const navMobile = document.getElementById('nav-mobile');
  const MOBILE_NAV_MQ = window.matchMedia('(max-width: 768px)');
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
        var closeBtn = navMobile.querySelector('.mobile-nav-close');
        if(closeBtn){
          closeBtn.focus();
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
        '.mobile-nav-close, .mobile-nav-linkset a.navlink, .nav-mobile-social a.header-social-link'
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
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
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

  // Homepage hero: eyebrow spotlight, coral reef on full #hero, matrix on eyebrow (see below)
  const heroHome = document.querySelector('#hero.hero--homepage');
  const heroEyebrow = heroHome && heroHome.querySelector('.hero-eyebrow');
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
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
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
          pileCtx.fillStyle = 'rgba(74, 222, 128, 0.7)';
          pileCtx.shadowColor = 'rgba(74, 222, 128, 0.3)';
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
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
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
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
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
          cancelAnimationFrame(reefRaf);
          reefRaf = null;
          rctx.setTransform(1, 0, 0, 1, 0, 0);
          rctx.clearRect(0, 0, reefCanvas.width, reefCanvas.height);
          reefResize();
          return;
        }

        var now = performance.now();

        for (var n = 0; n < reefNodes.length; n++) {
          var nd = reefNodes[n];
          var age = now - nd.born;
          if (age > nd.maxAge) { reefNodes.splice(n, 1); n--; continue; }
          var nAlpha = nd.alpha * reefFade;
          var fadeOut = age > nd.maxAge * 0.7 ? 1 - (age - nd.maxAge * 0.7) / (nd.maxAge * 0.3) : 1;
          nAlpha *= fadeOut;
          var p = Math.sin(now * 0.003 + nd.pulse) * 0.3 + 0.7;

          rctx.beginPath();
          rctx.arc(nd.x, nd.y, nd.r * p, 0, Math.PI * 2);
          rctx.fillStyle = 'rgba(74, 222, 128, ' + nAlpha * 0.6 + ')';
          rctx.fill();

          rctx.beginPath();
          rctx.arc(nd.x, nd.y, nd.r * p * 1.8, 0, Math.PI * 2);
          rctx.fillStyle = 'rgba(74, 222, 128, ' + nAlpha * 0.12 + ')';
          rctx.fill();
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
                    rctx.strokeStyle = 'rgba(74, 222, 128, ' + la + ')';
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
          rctx.strokeStyle = 'rgba(74, 222, 128, ' + bAlpha + ')';
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

      /* Prevent scrolling while touch-dragging in hero so coral reef captures the gesture */
      var reefTouchActive = false;
      heroHome.addEventListener('touchstart', function(e) {
        reefTouchActive = true;
      }, { passive: true });
      heroHome.addEventListener('touchmove', function(e) {
        if (reefTouchActive) e.preventDefault();
      }, { passive: false });
      heroHome.addEventListener('touchend', function() {
        reefTouchActive = false;
      }, { passive: true });
      heroHome.addEventListener('touchcancel', function() {
        reefTouchActive = false;
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
    /* Mobile layout or touch-first: keep matrix running without hover (hero pointerup otherwise calls mtxStop every lift). */
    var mtxMobileMatrixAlways = window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(max-width: 768px)').matches;
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
      { src: '/icons/matrix/btc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/eth.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sol.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt2.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdt2.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dai.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/busd.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wlfi.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/usdp.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hnt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fil.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/uni.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/uni.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/build-sources/aave.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xrp.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xrp.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ada.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ada.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/avax.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dot.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/atom.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ltc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/link.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xlm.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/doge.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/trx.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bnb.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/op.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/arb.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/near.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/apt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sui.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/inj.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hyperliquid.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tia.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tia.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xmr.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/zec.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/crv.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/crv.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ldo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ldo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stx.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/mkr.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/xtz.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/algo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hbar.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ton.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ton.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sei.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sei.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wld.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/rndr.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tao.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kraken.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/layerzero.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wormhole.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wormhole.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ondo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/zrx.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/base.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ink.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/arc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stripe.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/1inch.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/gemini.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bitgo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/compound.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/okx.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/chainalysis.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fireblocks.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wintermute.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/grayscale.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/binance.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/binance.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/paxos.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/paxos.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/msft.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/jpmorgan.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/citi.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/gs.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/coinbase.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/coinbase.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/sq.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/visa.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fednow.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ma.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/googl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/amzn.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/meta.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/x.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/facebook.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wmt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nvda.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/tsla.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/amd.png', loaded: false, img: null, tinted: null },
      /* nflx removed: file not present */
      { src: '/icons/matrix/bac.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wordmark-option-1/wfc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wordmark-option-1/wfc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/schw.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/pypl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/venmo.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/cashapp.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/clearstreet.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wu.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/moneygram.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wise.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wise.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/intc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/csco.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/orcl.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dis.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/mstr.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/mstr.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hood.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hood.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ibm.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nasdaq.png', loaded: false, img: null, tinted: null },
      /* Second Nasdaq slot: former NDX text ticker (macro index) now uses Nasdaq logo PNG only. */
      { src: '/icons/matrix/nasdaq.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/nyse.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ice.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/revolut.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/block.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/blk.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/blk.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/securitize.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bakkt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/fidelity.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/broadridge.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/franklin.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/wisdomtree.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/ubs.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bnymellon.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/dtcc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/hsbc.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/stt.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/plaid.png', loaded: false, img: null, tinted: null },
      { src: '/icons/matrix/bybit.png', loaded: false, img: null, tinted: null },
      /* Fed removed: seal reads as ambiguous blob at matrix size. */
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
    var mtxCoreStableSlugs = ['usdc.png', 'usdt.png', 'usdt2.png', 'dai.png'];
    var mtxStablecoinSlugs = ['usdc.png', 'usdt.png', 'usdt2.png', 'dai.png', 'mkr.png', 'm0.png', 'circle.png'];
    var mtxTopL1Slugs = ['btc.png', 'eth.png', 'sol.png'];
    var mtxMajorL1Slugs = ['xrp.png', 'ada.png', 'avax.png', 'dot.png', 'bnb.png'];
    mtxCryptoIconDefs.forEach(function(def){
      var isCoreStable = mtxCoreStableSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isStable = mtxStablecoinSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isTopL1 = mtxTopL1Slugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isMajorL1 = mtxMajorL1Slugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var mtxInfraSlugs = ['chainalysis.png', 'fireblocks.png', 'wintermute.png', 'bitgo.png', 'compound.png', 'gemini.png', '1inch.png', 'okx.png', 'securitize.png', 'layerzero.png', 'coinbase.png', 'kraken.png', 'aave.png', 'crv.png', 'grayscale.png', 'binance.png', 'paxos.png'];
      var isInfra = mtxInfraSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var n = isCoreStable ? 8 : (isStable ? 5 : (isTopL1 ? 5 : (isMajorL1 ? 4 : (isInfra ? 4 : 3))));
      for(var k = 0; k < n; k++){
        mtxCryptoPool.push({ type: 'icon', def: def });
      }
    });

    var mtxTradPool = mtxTradTextChars.map(function(v){ return { type: 'text', value: v }; });
    /* Weight company logos in the trad stream so they read alongside fiat and macro tickers */
    mtxStockIconDefs.forEach(function(def){
      var isAapl = def.src.indexOf('aapl.png') >= 0;
      var n = (def.src.indexOf('visa.png') >= 0 || def.src.indexOf('tsla.png') >= 0) ? 7 : (isAapl ? 5 : 4);
      var k;
      for(k = 0; k < n; k++){
        mtxTradPool.push({ type: 'icon', def: def });
      }
    });
    /* Former WTI text ticker: show Wormhole mark in trad stream (same def as crypto pool). */
    var mtxWormholeTradDef = mtxCryptoIconDefs.find(function(d){ return d.src.indexOf('wormhole.png') >= 0; });
    if(mtxWormholeTradDef){
      mtxTradPool.push({ type: 'icon', def: mtxWormholeTradDef });
    }

    /* ~35% of glyphs from crypto icons only (no crypto ASCII tickers); rest from fiat, commodities, macro, stock icons */
    var mtxCryptoPickRate = 0.35;
    /* ₿ and Ξ only via this branch so they are not diluted by pools */
    var mtxLegacyMarkRate = 0.07;

    /* Bust browser cache for matrix PNGs when assets change (avoids mixed old/new silhouettes after deploy). */
    var mtxIconAssetVer = '139';
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

    /* CTA position in matrix-local coords for $ attraction */
    var mtxCtaX = null, mtxCtaY = null;
    function mtxUpdateCtaPos(){
      var btn = heroHome.querySelector('a.cta-primary[href*="routing-the-dollar"]')
        || heroHome.querySelector('a.cta-primary');
      if(!btn || !matrixContainer) return;
      var br = btn.getBoundingClientRect();
      var cr = matrixContainer.getBoundingClientRect();
      mtxCtaX = (br.left + br.width / 2) - cr.left;
      mtxCtaY = (br.top + br.height / 2) - cr.top;
    }

    /* Dollar-specific warp: attract to CTA only, no cursor interaction */
    function mtxDollarWarp(px, py, cw, ch){
      var ox = px, oy = py;
      /* Attract toward CTA button */
      if(mtxCtaX != null && mtxCtaY != null){
        var dxC = px - mtxCtaX;
        var dyC = py - mtxCtaY;
        var distC = Math.sqrt(dxC * dxC + dyC * dyC);
        var maxR = Math.max(128, Math.min(cw, ch) * 0.5);
        var strength = Math.min(cw, ch) * 0.05;
        if(distC > 0.5 && distC < maxR){
          var invd = 1 / distC;
          var t = 1 - distC / maxR;
          var s = t * t * strength;
          ox = px - dxC * invd * s;
          oy = py - dyC * invd * s;
        }
      }
      return { x: ox, y: oy };
    }
    var mtxDrops = [];
    var mtxColItem = [];
    var mtxColOpacity = [];
    var mtxColStep = [];
    var mtxColDriftX = [];
    var mtxColDriftRate = [];
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
    var mtxSubmersionZoneTop = 0.76; /* lower ~24%: glyphs feel like they enter the mesh */
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
      if (!heroContainerMtx || !matrixContainer) {
        return;
      }
      var cr = matrixContainer.getBoundingClientRect();
      var nodes = heroContainerMtx.querySelectorAll('[data-hero-safe]');
      var pad = 12;
      var zi;
      for (zi = 0; zi < nodes.length; zi++) {
        var r = nodes[zi].getBoundingClientRect();
        mtxHeroSafeZones.push({
          left: r.left - cr.left - pad,
          top: r.top - cr.top - pad,
          right: r.right - cr.left + pad,
          bottom: r.bottom - cr.top + pad
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
        trailGlowSprites.def.push(buildGlowSprite(sz, 74, 222, 128));
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
    var mtxDollarMagBtnCache = null;
    var mtxDollarMagBtnTick = 0;
    var mtxDollarMagPrevMx = null;
    var mtxDollarMagPrevMy = null;

    function mtxTrailFill(){
      mtxTrailFillFrame++;
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

    function mtxUpdateWarpFromEvent(e){
      if(!matrixContainer.classList.contains('active')){
        return;
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
      var r = matrixContainer.getBoundingClientRect();
      mtxWarpTx = cx - r.left;
      mtxWarpTy = cy - r.top;
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
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      matrixCanvas.width = Math.floor(w * dpr);
      matrixCanvas.height = Math.floor(h * dpr);
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
      /* Only reset drop positions if column count changed or explicitly requested. */
      if(forceResetDrops || colCount !== prevColCount){
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
      }
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
      mtxMeasureHeroSafeZones();
    }

    function mtxIsBitcoinItem(item) {
      if (item.type === 'icon' && item.def && item.def.src && item.def.src.indexOf('btc.png') >= 0) return true;
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
          if(srcKey2.indexOf('usdt2.png') >= 0 || srcKey2.indexOf('usdt.png') >= 0 || srcKey2.indexOf('coinbase.png') >= 0){
            dMin += 2;
            dMax += 2;
          }
          ds = dMin + Math.random() * (dMax - dMin);
        }
        if(item.def && item.def.src && item.def.src.indexOf('franklin.png') >= 0){
          ds = 44 + Math.random() * 20;
        } else if(item.def && item.def.src && item.def.src.indexOf('blk.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('layerzero.png') >= 0){
          ds = mtxIconLZDrawSizeMin + Math.random() * (mtxIconLZDrawSizeMax - mtxIconLZDrawSizeMin);
        } else if(item.def && item.def.src && item.def.src.indexOf('uni.png') >= 0){
          ds = mtxIconLZUniDrawSizeMin + Math.random() * (mtxIconLZUniDrawSizeMax - mtxIconLZUniDrawSizeMin);
        } else if(item.def && item.def.src && item.def.src.indexOf('crv.png') >= 0){
          ds = Math.min(ds + 6, 38);
        } else if(item.def && item.def.src && item.def.src.indexOf('hyperliquid.png') >= 0){
          ds = Math.min(ds + 4, 34);
        } else if(item.def && item.def.src && item.def.src.indexOf('link.png') >= 0){
          ds = Math.max(ds, 24);
        } else if(item.def && item.def.src && item.def.src.indexOf('wintermute.png') >= 0){
          /* Wireframe mark: keep above default min so strokes stay visible in the trail */
          ds = Math.max(ds, 26);
        } else if(item.def && item.def.src && item.def.src.indexOf('okx.png') >= 0){
          /* Wide thin-stroke wordmark: needs enough px when drawn square */
          ds = Math.max(ds, 28);
        } else if(item.def && item.def.src && item.def.src.indexOf('fidelity.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('mstr.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('kinexys.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('m0.png') >= 0){
          ds = Math.min(ds + 6, 32);
        } else if(item.def && item.def.src && (item.def.src.indexOf('csco.png') >= 0 || item.def.src.indexOf('amd.png') >= 0 || item.def.src.indexOf('ink.png') >= 0 || item.def.src.indexOf('mkr.png') >= 0)){
          ds = Math.max(ds, 26);
        } else if(item.def && item.def.src && item.def.src.indexOf('gs.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('wfc.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && item.def.src.indexOf('jpmorgan.png') >= 0){
          ds = 44 + Math.random() * 16;
        } else if(item.def && item.def.src && (item.def.src.indexOf('visa.png') >= 0 || item.def.src.indexOf('jpm.png') >= 0 || item.def.src.indexOf('citi.png') >= 0 || item.def.src.indexOf('bac.png') >= 0 || item.def.src.indexOf('ma.png') >= 0)){
          ds = 16 + Math.random() * 24;
        }
        /* Wide wordmarks (4:1 aspect ratio): explicit width + height */
        var isWideWordmark = item.def && item.def.src && (item.def.src.indexOf('fednow.png') >= 0 || item.def.src.indexOf('kinexys.png') >= 0 || item.def.src.indexOf('mstr.png') >= 0 || item.def.src.indexOf('fidelity.png') >= 0 || item.def.src.indexOf('gs.png') >= 0 || item.def.src.indexOf('wfc.png') >= 0 || item.def.src.indexOf('blk.png') >= 0 || item.def.src.indexOf('jpmorgan.png') >= 0 || item.def.src.indexOf('okx.png') >= 0 || item.def.src.indexOf('wisdomtree.png') >= 0 || item.def.src.indexOf('ubs.png') >= 0 || item.def.src.indexOf('dtcc.png') >= 0 || item.def.src.indexOf('bybit.png') >= 0);
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
        } else {
          baseFs = mtxFontSize;
        }
        if(item.value !== '₿'){
          var fsVariation2 = 0.7 + Math.random() * 0.6;
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
        var baseSpeed = 0.15 + Math.random() * 0.04;
        mtxColStep[i] = baseSpeed * (0.75 + normalizedSize * 0.25);
        if(isBtc && item.drawSize > mtxIconDrawSizeMax){
          mtxColStep[i] *= 0.75;
        }
      } else {
        mtxColOpacity[i] = 0.17 + Math.random() * 0.22;
        if(isBtc){
          mtxColOpacity[i] = Math.min(0.8, mtxColOpacity[i] + 0.15);
        }
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
      mtxDollarMagBtnTick++;
      if(mtxDollarMagBtnCache && mtxDollarMagBtnTick % 90 !== 0) return mtxDollarMagBtnCache;
      if(!heroFlagshipMtx) return null;
      var b = heroFlagshipMtx.getBoundingClientRect();
      var c = matrixContainer.getBoundingClientRect();
      mtxDollarMagBtnCache = {
        x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height,
        cx: b.left - c.left + b.width / 2, top: b.top - c.top
      };
      return mtxDollarMagBtnCache;
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
      var br = mtxDollarMagBtnRect();
      if(!br) return;
      var hasCursor = mtxWarpX != null && mtxWarpY != null;
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
      for(var i = mtxDollarMag.length - 1; i >= 0; i--){
        var p = mtxDollarMag[i];
        if(!p.settled){
          if(hasCursor){
            var dx = mx - p.x, dy = my - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if(d > 1){
              p.vx += (dx / d) * 0.2 * dtMul;
              p.vy += (dy / d) * 0.2 * dtMul;
            }
          } else {
            /* No cursor: attract toward particle's target position on button top */
            var tx = p.targetX != null ? p.targetX : br.cx;
            var ty = btnCeil;
            var dx = tx - p.x, dy = ty - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if(d > 1){
              p.vx += (dx / d) * 0.15 * dtMul;
              p.vy += (dy / d) * 0.15 * dtMul;
            }
            /* Only apply gravity if above the button ceiling */
            if(p.y < btnCeil){
              p.vy += 0.04 * dtMul;
            }
          }
          /* Repel free-flying particles that get too close to cursor near button. */
          if(hasCursor && d < 50 && d > 1 && mbDist < 200){
            var repF = (1 - d / 50) * 1.2;
            p.vx -= (dx / d) * repF;
            p.vy -= (dy / d) * repF;
          }
          var inBtnX = p.x > br.x - 20 && p.x < br.x + br.w + 20;
          var nearTop = p.y > btnCeil - 18 && p.y < btnCeil + 6;
          var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if(inBtnX && nearTop && spd < 1.8 && (!hasCursor || mbDist < 200)){
            p.settled = true;
            p.vx *= 0.3;
            p.vy *= 0.3;
          }
          p.vx *= 0.965;
          p.vy *= 0.965;
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
            /* Proximity repulsion: always active when cursor is near a settled particle. */
            if(rd < 90){
              var proxF = (1 - rd / 90) * 1.6;
              var latBiasP = (p.x < br.cx) ? -1 : 1;
              p.vx += (rx / rd) * proxF * 2.0 + latBiasP * proxF * 1.0;
              p.vy += (ry / rd) * proxF * 0.8 - proxF * 0.6;
              p.settled = false;
            }
            /* Velocity-based bounce: triggers when mouse moves toward the button. */
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
        /* Hard boundary: deflect any particle that enters the button rect. */
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
        if(sp > 20){ p.vx = (p.vx / sp) * 20; p.vy = (p.vy / sp) * 20; }
        p.x += p.vx * dtMul;
        p.y += p.vy * dtMul;
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

    function mtxDollarMagDraw(ctx, fontFamily){
      if(!mtxDollarMag.length) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 7;
      ctx.shadowColor = 'rgba(167, 243, 208, 0.45)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      for(var i = 0; i < mtxDollarMag.length; i++){
        var p = mtxDollarMag[i];
        ctx.font = '700 ' + Math.round(p.sz) + 'px ' + fontFamily;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = 'rgba(204, 251, 229, ' + Math.min(0.99, p.alpha + 0.1) + ')';
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
        var col = isDollarFamily ? '204, 251, 229' : '74, 222, 128';
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
            mtxCtx.strokeStyle = 'rgba(74, 222, 128, ' + lineAlpha + ')';
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
        mtxCtx.fillStyle = 'rgba(74, 222, 128, ' + (drawAlpha * 0.3 * mtxMeshLaneAlpha(cx, w, cy, h)) + ')';
        mtxCtx.fill();
        mtxCtx.beginPath();
        mtxCtx.arc(cx, cy, nd.r * pulse * 1.75, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(74, 222, 128, ' + (drawAlpha * 0.048 * mtxMeshLaneAlpha(cx, w, cy, h)) + ')';
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
            var rc = rp.isDollar ? '204, 251, 229' : '74, 222, 128';
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
            mtxCtx.strokeStyle = 'rgba(74, 222, 128, ' + fa + ')';
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
      tie.addColorStop(0, 'rgba(74, 222, 128, 0)');
      tie.addColorStop(0.65, 'rgba(74, 222, 128, ' + (0.0016 * pulse) + ')');
      tie.addColorStop(1, 'rgba(74, 222, 128, ' + (0.0035 * pulse) + ')');
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
          grad.addColorStop(0.55, 'rgba(74, 222, 128, ' + (pocketAlpha * 0.45) + ')');
          grad.addColorStop(1, 'rgba(74, 222, 128, 0)');
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
      var col = isDollar ? '204, 251, 229' : '74, 222, 128';
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
      var col = isDollar ? '204, 251, 229' : '74, 222, 128';

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
      var col = isDollar ? '204, 251, 229' : '74, 222, 128';
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

    function mtxDraw(ts){
      var mtxIsActive = matrixContainer.classList.contains('active');
      if(!mtxIsActive && mtxDollarMag.length === 0){
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
      mtxCtx.fillStyle = mtxTrailFill();
      mtxCtx.fillRect(0, 0, w, h);
      var meshNow = performance.now();
      mtxStepControlLayer(meshNow, w, h, dtMul);
      mtxBootstrapMeshIfEmpty(w, h, meshNow);
      if (mtxReducedMotion) {
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
      /* Two-pass rendering: pass 1 draws text glyphs and icon mattes (panel-base rectangles that
         prevent trail accumulation through transparent icon pixels). Pass 2 draws icon sprites on
         top of every matte. This prevents column i+1's matte from overwriting column i's icon
         when icons are wider than mtxColWidth. */
      var iconQueue = [];
      var coralNodes = []; /* collect glyph positions for inter-glyph coral web */
      for(i = 0; i < n; i++){
        var x0 = i * mtxColWidth + 1 + mtxColDriftX[i];
        var y0 = mtxDrops[i] * mtxLineStep;
        if(mtxColItem[i] == null){
          mtxAssignColVisual(i);
        }
        var item = mtxColItem[i];
        var op = mtxColOpacity[i];
        var itemIsDollar = item && item.type === 'text' && item.value === '$';
        var warped = itemIsDollar ? mtxDollarWarp(x0, y0, w, h) : mtxWarpPoint(x0, y0, w, h);
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

        var isDollarHead = item.type === 'text' && item.value === '$';
        if (mtxGetSubmerge(y0, h) > 0.04) {
          var colCenterX = i * mtxColWidth + mtxColWidth * 0.5 + mtxColDriftX[i];
          mtxReactMeshNear(colCenterX, y0, meshNow, isDollarHead, i, w, h);
        }

        /* Control-layer head-attached wake (history sampled after draw; lighter pass inside). */
        mtxDrawHeadWake(item, warped, y0, op, meshNow, w, h, i);
        mtxPushHeadWakeSample(i, warped.x, warped.y, meshNow, op, isDollarHead, item.type === 'icon');

        if(item.type === 'text'){
          mtxCtx.textAlign = 'left';
          var fs = item.fontSize || mtxFontSize;
          mtxCtx.font = '700 ' + fs + 'px ' + mtxFontFamily;
          if(item.value === '₿'){
            mtxCtx.fillStyle = 'rgba(247, 147, 26, ' + Math.min(1, op + 0.22) + ')';
            mtxCtx.shadowColor = 'rgba(251, 191, 36, 0.35)';
          } else if(item.value === '$'){
            mtxCtx.fillStyle = 'rgba(204, 251, 229, ' + Math.min(0.99, op + 0.24) + ')';
            mtxCtx.shadowColor = 'rgba(167, 243, 208, 0.32)';
          } else if(mtxFiatNonUsd[item.value]){
            mtxCtx.fillStyle = 'rgba(134, 239, 172, ' + Math.min(0.96, op + 0.14) + ')';
            mtxCtx.shadowColor = 'rgba(74, 222, 128, 0.22)';
          } else {
            mtxCtx.fillStyle = 'rgba(96, 230, 156, ' + Math.min(0.94, op + 0.12) + ')';
            mtxCtx.shadowColor = 'rgba(52, 211, 153, 0.28)';
          }
          mtxCtx.save();
          var isLargeBtc = (item.value === '₿' && item.btcLarge && item.fontSize > mtxFontSize * 1.3);
          mtxCtx.shadowBlur = isLargeBtc ? 10 : (item.value.length > 2 ? 5 : 6);
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
          mtxCtx.fillText(item.value, tx, ty);
          mtxCtx.restore();
          /* Collect position for coral web */
          if (y0 > 0 && y0 < h) {
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
              colIdx: i
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
            var isHollowHex = item.def.src && /\/(link|hnt)\.png(\?|$)/.test(item.def.src);
            var isCrispLine = item.def.src && item.def.src.indexOf('franklin.png') >= 0;
            var isBtcGlow = item.def.src && item.def.src.indexOf('btc.png') >= 0 && item.drawSize > mtxIconDrawSizeMax;
            var iconDollarTint = !!(item.def.src && /\/(usdc|usdt2?|dai|m0)\.png/i.test(item.def.src));
            iconQueue.push({
              tint: tint,
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
          mtxAssignColVisual(i);
          if(mtxColItem[i].type !== 'icon'){
            mtxColStep[i] = 0.15 + Math.random() * 0.04;
          }
        }
        mtxDrops[i] += mtxColStep[i] * dtMul;
        mtxColDriftX[i] += mtxColDriftRate[i] * dtMul;
      }
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
        mtxCtx.drawImage(q.tint, q.ix, q.iy, q.iw, q.ih);
        mtxCtx.restore();
        /* Collect position for coral web */
        if (q.iy > 0 && q.iy < h) {
          coralNodes.push({
            cx: q.ix + q.iw * 0.5,
            cy: q.iy + q.ih * 0.5,
            footY: q.iy + q.ih * 0.85,
            bw: q.iw,
            bh: q.ih,
            op: q.op,
            isDollar: q.iconDollarTint,
            colIdx: q.colIdx
          });
        }
        /* Foreground wade overlay + footline: redraw nearby pads OVER icon bottom */
        if (q.submerge > 0.08) {
          mtxDrawGlyphWadeOverlay(q.ix, q.iy, q.iw, q.ih, q.submerge, meshNow, w, h, q.iconDollarTint);
          mtxDrawFootlineWake(q.ix, q.iy, q.iw, q.ih, q.submerge, meshNow, q.iconDollarTint);
        }
      }

      mtxDrawMeshUnderlay(meshNow, w, h, ['front'], false);

      /* ══════════════════════════════════════════════
         Coral web: tendrils ONLY between nearby icons.
         No constant tendrils — only when icons get close enough.
         Tendrils connect from all sides (nearest edge to nearest edge).
         Connected icons are magnetized toward each other.
         ══════════════════════════════════════════════ */
      if (coralNodes.length > 1 && !mtxReducedMotion) {
        var coralThreshold = mtxIsMobile ? 90 : 130;
        var coralMaxLinks = mtxWakePerfTier >= 1 ? (mtxIsMobile ? 2 : 3) : (mtxIsMobile ? 2 : 4);
        var coralAttractBase = mtxIsMobile ? 0.018 : 0.028;
        var coralLinkCount = {};
        var drawnCoralEdges = {};

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
                var hPull = closeness * (mtxIsMobile ? 0.18 : 0.32) * dtMul;
                if (cn.cx < nb.cx) {
                  mtxColDriftX[cnCol] += hPull;
                  mtxColDriftX[nbCol] -= hPull;
                } else {
                  mtxColDriftX[cnCol] -= hPull;
                  mtxColDriftX[nbCol] += hPull;
                }
                var vPull = closeness * 0.008 * dtMul;
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
            var brAlpha = closeness * 0.30;
            if (brAlpha < 0.01) continue;

            var isMint = cn.isDollar || nb.isDollar;
            var brCol = isMint ? '204, 251, 229' : '74, 222, 128';

            /* Anchor points: connect center to center (simple, reliable) */
            var startX = cn.cx;
            var startY = cn.cy;
            var endX = nb.cx;
            var endY = nb.cy;

            /* Curved branch with gentle perpendicular sway */
            var angle = Math.atan2(endY - startY, endX - startX);
            var perpX = -Math.sin(angle);
            var perpY = Math.cos(angle);
            var sway = Math.sin(meshNow * 0.002 + ci * 1.3 + ck * 2.1) * dist * 0.15;
            var cpX = (startX + endX) * 0.5 + perpX * sway;
            var cpY = (startY + endY) * 0.5 + perpY * sway;

            /* Single quadratic bezier curve — simple and visible */
            mtxCtx.beginPath();
            mtxCtx.moveTo(startX, startY);
            mtxCtx.quadraticCurveTo(cpX, cpY, endX, endY);
            mtxCtx.strokeStyle = 'rgba(' + brCol + ', ' + brAlpha + ')';
            mtxCtx.lineWidth = 0.6 + closeness * 0.5;
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
            if (!mtxIsMobile && closeness > 0.45) {
              var forkAngle = angle + Math.PI * 0.5 * (Math.sin(ci + ck) > 0 ? 1 : -1);
              var forkLen = dist * 0.2;
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

      /* Pass 3: dollar magnet particles. */
      mtxDollarMagUpdate(w, h, dtMul);
      mtxDollarMagDraw(mtxCtx, mtxFontFamily);


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

    function mtxStart(opts){
      opts = opts || {};
      mtxTrailFillCache = '';
      mtxTrailFillFrame = 0;
      if(opts.forceReset === true){
        mtxInitCanvas(true);
      } else {
        var alreadyRunning = matrixContainer.classList.contains('active') && mtxRaf;
        if(alreadyRunning){
          /* Animation is live: resize the canvas buffer but do not reset column positions. */
          mtxInitCanvas(false);
        } else {
          /* Fresh start: reset everything. */
          mtxInitCanvas(true);
        }
      }
      matrixContainer.classList.add('active');
      if(!mtxRaf){
        mtxRaf = requestAnimationFrame(mtxDraw);
      }
    }

    function mtxStop(force){
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
      mtxWarpTx = mtxWarpTy = mtxWarpX = mtxWarpY = null;
      /* Let magnetized $ symbols fade out gracefully instead of vanishing */
      mtxDollarMagPrevMx = mtxDollarMagPrevMy = null;
      mtxDollarMagBtnCache = null;
      if(mtxMobileMatrixAlways){
        return;
      }
      /* Keep active + draw loop alive while $ particles remain visible */
      if(mtxDollarMag.length > 0){
        return;
      }
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
      mtxStop();
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

  // Sticky section rail: /frameworks/ (Frameworks), /overview/ (Overview), /speaker/
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
        'seven-papers',
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
