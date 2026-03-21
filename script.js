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
      function flagshipCtaEl(){
        return heroHome.querySelector('a.cta-primary[href*="routing-the-dollar-brief"]')
          || heroHome.querySelector('a.cta-primary')
          || heroHome.querySelector('a.action.primary.cta-primary');
      }

      var ctaBtn = flagshipCtaEl();
      if(!ctaBtn) return;

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
        });

        /* Occasionally spawn a Bitcoin orbit particle */
        if(btcFlightActive && Math.random() < 0.04){
          spawnBtcParticle();
        }
      }

      function startDollarFlightLoop(){
        if(dollarLoopActive) return;
        dollarLoopActive = true;
        spawnDollar();
        var config = getDollarConfig();
        dollarSpawnIntervalId = setInterval(spawnDollar, config.spawnInterval);
        startBtcFlight();
      }

      function stopDollarFlightLoop(){
        dollarLoopActive = false;
        if(dollarSpawnIntervalId){
          clearInterval(dollarSpawnIntervalId);
          dollarSpawnIntervalId = null;
        }
        stopBtcFlight();
      }

      /* ══════════════════════════════════════════════
         Bitcoin ₿ orbit particles (JS-driven canvas)
         ══════════════════════════════════════════════ */

      var btcCanvas = document.getElementById('heroBtcFlight');
      var btcCtx = btcCanvas ? btcCanvas.getContext('2d') : null;
      var btcParticles = [];
      var btcFlightActive = false;
      var btcRaf = null;
      var btcCursorX = -1, btcCursorY = -1;

      var btcConfig = {
        maxParticles: getDollarConfig().isMobile ? 3 : 6,
        ctaGravity: 0.00035,
        cursorGravity: 0.00012,
        tangentialFactor: 0.7,
        damping: 0.992,
        orbitMinDist: 30,
        fadeInFrames: 20,
        maxLifeFrames: 600,
        spiralInDist: 18,
        maxSpeed: 3.5,
        cursorRange: 250
      };

      function btcResize(){
        if(!btcCanvas) return;
        var r = heroHome.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        btcCanvas.width = Math.floor(r.width * dpr);
        btcCanvas.height = Math.floor(r.height * dpr);
        btcCanvas.style.width = r.width + 'px';
        btcCanvas.style.height = r.height + 'px';
        btcCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      if(btcCanvas){
        btcResize();
        window.addEventListener('resize', function(){ setTimeout(btcResize, 220); }, { passive: true });

        heroHome.addEventListener('pointermove', function btcCursorTrack(e){
          if(e.pointerType !== 'mouse') return;
          var r = heroHome.getBoundingClientRect();
          btcCursorX = e.clientX - r.left;
          btcCursorY = e.clientY - r.top;
        }, { passive: true });

        heroHome.addEventListener('pointerleave', function btcCursorReset(){
          btcCursorX = -1;
          btcCursorY = -1;
        }, { passive: true });
      }

      function spawnBtcParticle(){
        if(!btcCanvas || btcParticles.length >= btcConfig.maxParticles) return;

        var heroRect = heroHome.getBoundingClientRect();
        var w = heroRect.width, h = heroRect.height;
        if(w <= 0 || h <= 0) return;

        /* Spawn from random edge */
        var perimeter = 2 * (w + h);
        var p = Math.random() * perimeter;
        var sx, sy;
        if(p < w){ sx = p; sy = -10; }
        else if(p < w + h){ sx = w + 10; sy = p - w; }
        else if(p < 2 * w + h){ sx = 2 * w + h - p; sy = h + 10; }
        else { sx = -10; sy = perimeter - p; }

        /* Initial velocity toward hero center */
        var centerX = w / 2, centerY = h / 2;
        var ddx = centerX - sx, ddy = centerY - sy;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        var speed = 0.4 + Math.random() * 0.3;

        var willOrbit = Math.random() < 0.85;
        var orbitBudget = willOrbit ? (2 + Math.floor(Math.random() * 3)) : 0;

        btcParticles.push({
          x: sx, y: sy,
          vx: (ddx / dist) * speed,
          vy: (ddy / dist) * speed,
          life: 0,
          maxLife: btcConfig.maxLifeFrames,
          fontSize: 14 + Math.floor(Math.random() * 10),
          willOrbit: willOrbit,
          orbitBudget: orbitBudget,
          crossings: 0,
          prevAngleToCta: null
        });
      }

      function btcDraw(){
        if(!btcFlightActive){ btcRaf = null; return; }
        btcRaf = requestAnimationFrame(btcDraw);

        var r = heroHome.getBoundingClientRect();
        var w = r.width, h = r.height;
        btcCtx.clearRect(0, 0, w, h);

        if(btcParticles.length === 0) return;

        var tx = targetX, ty = targetY;

        for(var i = btcParticles.length - 1; i >= 0; i--){
          var bp = btcParticles[i];
          bp.life++;

          if(bp.life > bp.maxLife){
            btcParticles.splice(i, 1);
            continue;
          }

          /* CTA attraction */
          var dxCta = tx - bp.x, dyCta = ty - bp.y;
          var distCta = Math.sqrt(dxCta * dxCta + dyCta * dyCta) || 1;

          if(distCta < btcConfig.spiralInDist){
            btcParticles.splice(i, 1);
            continue;
          }

          var ctaForce = btcConfig.ctaGravity;
          if(bp.willOrbit && bp.crossings >= bp.orbitBudget * 2){
            ctaForce *= 2.5;
            bp.willOrbit = false;
          }

          var ctaFx = (dxCta / distCta) * ctaForce * distCta;
          var ctaFy = (dyCta / distCta) * ctaForce * distCta;

          /* Tangential deflection for orbiting */
          if(bp.willOrbit && distCta > btcConfig.orbitMinDist){
            var tangX = -dyCta / distCta;
            var tangY = dxCta / distCta;
            var tangSign = (bp.vx * tangX + bp.vy * tangY) >= 0 ? 1 : -1;
            var tangStr = btcConfig.tangentialFactor * ctaForce * distCta;
            ctaFx += tangX * tangSign * tangStr;
            ctaFy += tangY * tangSign * tangStr;
          }

          /* Cursor attraction (weaker, range-limited) */
          if(btcCursorX >= 0 && btcCursorY >= 0){
            var dxCur = btcCursorX - bp.x;
            var dyCur = btcCursorY - bp.y;
            var distCur = Math.sqrt(dxCur * dxCur + dyCur * dyCur) || 1;
            if(distCur < btcConfig.cursorRange){
              var cursorStr = btcConfig.cursorGravity * (1 - distCur / btcConfig.cursorRange);
              bp.vx += (dxCur / distCur) * cursorStr * distCur;
              bp.vy += (dyCur / distCur) * cursorStr * distCur;
            }
          }

          /* Apply CTA forces */
          bp.vx += ctaFx;
          bp.vy += ctaFy;

          /* Damping */
          bp.vx *= btcConfig.damping;
          bp.vy *= btcConfig.damping;

          /* Speed cap */
          var spd = Math.sqrt(bp.vx * bp.vx + bp.vy * bp.vy);
          if(spd > btcConfig.maxSpeed){
            bp.vx = (bp.vx / spd) * btcConfig.maxSpeed;
            bp.vy = (bp.vy / spd) * btcConfig.maxSpeed;
          }

          /* Move */
          bp.x += bp.vx;
          bp.y += bp.vy;

          /* Track orbit completion via angle sign crossings */
          var angleToCta = Math.atan2(dyCta, dxCta);
          if(bp.prevAngleToCta !== null){
            if(bp.prevAngleToCta > 2.5 && angleToCta < -2.5) bp.crossings++;
            else if(bp.prevAngleToCta < -2.5 && angleToCta > 2.5) bp.crossings++;
          }
          bp.prevAngleToCta = angleToCta;

          /* Render */
          var fadeIn = Math.min(1, bp.life / btcConfig.fadeInFrames);
          var fadeOut = bp.life > bp.maxLife * 0.85
            ? 1 - (bp.life - bp.maxLife * 0.85) / (bp.maxLife * 0.15)
            : 1;
          var distFade = distCta < 50 ? distCta / 50 : 1;
          var alpha = fadeIn * fadeOut * distFade;
          if(alpha < 0.01) continue;

          btcCtx.save();
          btcCtx.font = '700 ' + bp.fontSize + 'px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          btcCtx.textAlign = 'center';
          btcCtx.textBaseline = 'middle';
          btcCtx.fillStyle = 'rgba(247, 147, 26, ' + (alpha * 0.9) + ')';
          btcCtx.shadowColor = 'rgba(251, 191, 36, ' + (alpha * 0.4) + ')';
          btcCtx.shadowBlur = 8;
          btcCtx.shadowOffsetX = 0;
          btcCtx.shadowOffsetY = 0;
          btcCtx.fillText('₿', bp.x, bp.y);
          btcCtx.restore();
        }
      }

      function startBtcFlight(){
        if(!btcCanvas) return;
        btcFlightActive = true;
        btcResize();
        if(!btcRaf) btcRaf = requestAnimationFrame(btcDraw);
      }

      function stopBtcFlight(){
        btcFlightActive = false;
        btcParticles = [];
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

      /* Disrupt dollar flow when cursor approaches the CTA convergence point */
      heroHome.addEventListener('pointermove', function(e) {
        if (e.pointerType !== 'mouse') return; /* touch doesn't have a persistent cursor */

        var heroRect = heroHome.getBoundingClientRect();
        var cursorX = e.clientX - heroRect.left;
        var cursorY = e.clientY - heroRect.top;

        var dx = cursorX - targetX;
        var dy = cursorY - targetY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dollarDisruptProximity) {
          disruptDollars();
        }
        /* Recovery is timer-based (500ms after last disruption trigger), not distance-based.
           If the cursor stays near the CTA, disruptDollars() re-fires on each move
           and resets the 500ms timer, keeping the disruption active. */
      });

      heroHome.addEventListener('pointerleave', function dollarDisruptLeave(e) {
        if (dollarDisrupted) {
          if (dollarDisruptTimer) {
            clearTimeout(dollarDisruptTimer);
            dollarDisruptTimer = null;
          }
          /* Recover slightly faster on leave */
          setTimeout(recoverDollars, 200);
        }
      });

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
        var baseInterval = 55;
        var velocityBoost = Math.min(40, reefVelocity * 25);
        var spawnInterval = Math.max(15, baseInterval - velocityBoost);

        if (now - reefLastSpawn > spawnInterval) {
          reefLastSpawn = now;

          /* Interpolate spawns along the movement vector for fast sweeps */
          var interpDist = 0;
          if (reefPrevMx >= 0) {
            var idx = mx - reefPrevMx;
            var idy = my - reefPrevMy;
            interpDist = Math.sqrt(idx * idx + idy * idy);
          }

          if (interpDist > 30 && reefPrevMx >= 0) {
            /* Fast movement: spawn intermediate clusters along the path */
            var interpSteps = Math.min(4, Math.floor(interpDist / 25));
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
  var matrixActivatorList = Array.prototype.slice.call(document.querySelectorAll('#hero.hero--homepage .matrix-hover-activator'));
  var heroEyebrowMtx = document.querySelector('#hero.hero--homepage .hero-eyebrow');
  var heroFlagshipMtx = document.querySelector('#hero.hero--homepage a.cta-primary[href*="routing-the-dollar-brief"]')
    || document.querySelector('#hero.hero--homepage a.action.primary.cta-primary');
  function mtxEnsureActivator(el){
    if(!el || matrixActivatorList.indexOf(el) !== -1){
      return;
    }
    matrixActivatorList.push(el);
  }
  /* If nothing was marked with .matrix-hover-activator, fall back to eyebrow + flagship (legacy). */
  if(matrixActivatorList.length === 0){
    mtxEnsureActivator(heroEyebrowMtx);
  }
  /* Flagship brief CTA must always bind: when eyebrow already has the class, the old code skipped this link. */
  mtxEnsureActivator(heroFlagshipMtx);
  if(matrixContainer && matrixCanvas && matrixActivatorList.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    /* Mobile layout or touch-first: keep matrix running without hover (hero pointerup otherwise calls mtxStop every lift). */
    var mtxMobileMatrixAlways = window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(max-width: 768px)').matches;
    const mtxCtx = matrixCanvas.getContext('2d');
    /* One USD glyph: USDC stablecoin read comes from usdc.png in the crypto pool (duplicated there). */
    const textChars = [
      '$',
      '€', '£', '¥', '₩', '₹', '₣', '₴', '\uFDFC',
      '₿', '\u039E',
      'XAU', 'XAG',
      'DXY', 'VIX'
    ];

    var mtxFiatNonUsd = { '€': 1, '£': 1, '¥': 1, '₩': 1, '₹': 1, '₣': 1, '₴': 1, '\uFDFC': 1 };

    var iconDefs = [
      { src: './icons/matrix/btc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/eth.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sol.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/usdt2.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/dai.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hnt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/fil.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/uni.png', loaded: false, img: null, tinted: null },
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
      { src: './icons/matrix/hyperliquid.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tia.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tia.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xmr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/zec.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/crv.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/crv.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ldo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ldo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/stx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/mkr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/xtz.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/algo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hbar.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ton.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ton.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sei.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sei.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wld.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/rndr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tao.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/kraken.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/metamask.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/layerzero.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wormhole.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ondo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/zrx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/base.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ink.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/arc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/m0.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/stripe.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/circle.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/aapl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/msft.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/jpm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/citi.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/gs.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/coinbase.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/sq.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/visa.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/kinexys.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/fednow.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ma.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/googl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/amzn.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/meta.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/x.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wmt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nvda.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/tsla.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/amd.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nflx.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/bac.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wfc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wfc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/schw.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/pypl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/venmo.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/cashapp.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/cantor.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/clearstreet.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wu.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/moneygram.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wise.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/wise.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/intc.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/csco.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/orcl.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/dis.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/mstr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/mstr.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/hood.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ibm.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nasdaq.png', loaded: false, img: null, tinted: null },
      /* Second Nasdaq slot: former NDX text ticker (macro index) now uses Nasdaq logo PNG only. */
      { src: './icons/matrix/nasdaq.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/nyse.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ice.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/ko.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/revolut.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/block.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/blk.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/blk.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/securitize.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/bakkt.png', loaded: false, img: null, tinted: null },
      { src: './icons/matrix/fidelity.png', loaded: false, img: null, tinted: null },
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
    var mtxStablecoinSlugs = ['usdc.png', 'usdt.png', 'usdt2.png', 'dai.png', 'mkr.png', 'm0.png'];
    mtxCryptoIconDefs.forEach(function(def){
      var isCoreStable = mtxCoreStableSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var isStable = mtxStablecoinSlugs.some(function(s){ return def.src.indexOf(s) >= 0; });
      var n = isCoreStable ? 8 : (isStable ? 5 : 2);
      for(var k = 0; k < n; k++){
        mtxCryptoPool.push({ type: 'icon', def: def });
      }
    });

    var mtxTradPool = mtxTradTextChars.map(function(v){ return { type: 'text', value: v }; });
    /* Weight company logos in the trad stream so they read alongside fiat and macro tickers */
    mtxStockIconDefs.forEach(function(def){
      var n = (def.src.indexOf('visa.png') >= 0 || def.src.indexOf('tsla.png') >= 0) ? 5 : 3;
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
    var mtxIconAssetVer = '114';
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
    var mtxIconLZDrawSizeMin = 44;
    var mtxIconLZDrawSizeMax = 50;
    var mtxTrailFillCache = '';
    var mtxTrailFillFrame = 0;

    /* ── Control-layer mesh state ── */
    var mtxIsMobile = window.matchMedia('(max-width: 768px)').matches;
    var meshNodes = [];
    var meshMaxNodes = mtxIsMobile ? 12 : 30;
    var meshZoneTop = 0.88; /* mesh lives in bottom 12% */
    var meshNodeLifeMin = 9000;
    var meshNodeLifeMax = 14000;
    var meshConnectionDist = mtxIsMobile ? 35 : 48;
    var meshMaxLinksPerNode = 3;
    var meshPulseSpeed = 0.0012; /* slower than reef: infrastructure, not bioluminescence */
    var meshRipples = [];
    var meshRippleMaxAge = 600;

    /* ── Afterburn config ── */
    var trailSteps = mtxIsMobile ? 2 : 4;
    var trailBaseAlphaFactor = 0.10; /* intentionally soft */

    /* ── Pre-rendered glow sprite (built once, reused every frame) ── */
    var trailGlowSprite = null;
    var trailGlowSpriteSize = 0;
    var trailGlowSpriteDollar = null;

    function buildGlowSprite(size, r, g, b) {
      var c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      var cx = c.getContext('2d');
      var half = size / 2;
      var grad = cx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ', 1)');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ', 0)');
      cx.fillStyle = grad;
      cx.fillRect(0, 0, size, size);
      return c;
    }

    /* Build sprites once after first frame (need canvas context ready) */
    function ensureGlowSprites() {
      if (trailGlowSprite) return;
      trailGlowSpriteSize = 12;
      trailGlowSprite = buildGlowSprite(trailGlowSpriteSize, 74, 222, 128);
      trailGlowSpriteDollar = buildGlowSprite(trailGlowSpriteSize, 204, 251, 229);
    }

    /* Find the k nearest mesh neighbors for a node */
    function meshNearestK(nodeIndex, k) {
      var nd = meshNodes[nodeIndex];
      var neighbors = [];
      for (var j = 0; j < meshNodes.length; j++) {
        if (j === nodeIndex) continue;
        var other = meshNodes[j];
        var dx = nd.x - other.x, dy = nd.y - other.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < meshConnectionDist && dist > 3) {
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
      /* Hollow hex PNGs (link, hnt): raster anti-alias leaves low-alpha pixels inside the ring opening; after tint they read as a squiggly line. Drop faint pixels; snap edge AA to solid white before tint. */
      if(def.src && /\/(link|hnt)\.png(\?|$)/.test(def.src)){
        var idPre = tctx.getImageData(0, 0, nw, nh);
        var dPre = idPre.data;
        var iPre;
        for(iPre = 0; iPre < dPre.length; iPre += 4){
          var a0 = dPre[iPre + 3];
          if(a0 < 128){
            dPre[iPre] = dPre[iPre + 1] = dPre[iPre + 2] = dPre[iPre + 3] = 0;
          } else if(a0 < 255){
            dPre[iPre] = dPre[iPre + 1] = dPre[iPre + 2] = 255;
            dPre[iPre + 3] = 255;
          }
        }
        tctx.putImageData(idPre, 0, 0);
      }
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
      meshNodes = [];
      meshRipples = [];
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
          /* Bitcoin icon: same minimum, double maximum */
          var btcMax = mtxIconDrawSizeMax * 2;
          ds = mtxIconDrawSizeMin + Math.random() * (btcMax - mtxIconDrawSizeMin);
        } else {
          ds = mtxIconDrawSizeMin + Math.random() * (mtxIconDrawSizeMax - mtxIconDrawSizeMin);
        }
        if(item.def && item.def.src && item.def.src.indexOf('blk.png') >= 0){
          ds = Math.min(ds + 2, 34);
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
        } else if(item.def && item.def.src && (item.def.src.indexOf('mstr.png') >= 0 || item.def.src.indexOf('fidelity.png') >= 0)){
          ds = Math.min(ds + 10, 44);
        } else if(item.def && item.def.src && item.def.src.indexOf('kinexys.png') >= 0){
          ds = Math.min(ds + 4, 30);
        } else if(item.def && item.def.src && item.def.src.indexOf('m0.png') >= 0){
          ds = Math.min(ds + 6, 32);
        } else if(item.def && item.def.src && (item.def.src.indexOf('csco.png') >= 0 || item.def.src.indexOf('amd.png') >= 0 || item.def.src.indexOf('ink.png') >= 0 || item.def.src.indexOf('mkr.png') >= 0)){
          ds = Math.max(ds, 26);
        } else if(item.def && item.def.src && (item.def.src.indexOf('visa.png') >= 0 || item.def.src.indexOf('gs.png') >= 0 || item.def.src.indexOf('jpm.png') >= 0 || item.def.src.indexOf('citi.png') >= 0 || item.def.src.indexOf('bac.png') >= 0 || item.def.src.indexOf('wfc.png') >= 0 || item.def.src.indexOf('ma.png') >= 0)){
          ds = 16 + Math.random() * 24;
        }
        /* FedNow wordmark: wide aspect ratio (4:1), needs explicit width + height */
        var isFedNow = item.def && item.def.src && item.def.src.indexOf('fednow.png') >= 0;
        var drawHeight = null;
        if(isFedNow){
          ds = 44 + Math.random() * 20;
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
        mtxColOpacity[i] = 0.32 + Math.random() * 0.16 + normalizedSize * 0.12;
        if(isBtc && item.drawSize > mtxIconDrawSizeMax){
          mtxColOpacity[i] = Math.min(0.85, mtxColOpacity[i] + 0.1);
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
      var side = Math.floor(Math.random() * 4);
      var x, y;
      if(side === 0){ x = Math.random() * w; y = -14; }
      else if(side === 1){ x = w + 14; y = Math.random() * h; }
      else if(side === 2){ x = Math.random() * w; y = h + 14; }
      else { x = -14; y = Math.random() * h; }
      return { x: x, y: y, vx: 0, vy: 0, alpha: 0.35 + Math.random() * 0.3, settled: false, sz: 17 + Math.random() * 5 };
    }

    function mtxDollarMagUpdate(w, h, dtMul){
      var br = mtxDollarMagBtnRect();
      if(!br) return;
      if(mtxDollarMag.length < mtxDollarMagMax && Math.random() < 0.06 * dtMul){
        mtxDollarMag.push(mtxDollarMagSpawn(w, h));
      }
      var hasCursor = mtxWarpX != null && mtxWarpY != null;
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
          var dx = mx - p.x, dy = my - p.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if(d > 1){
            p.vx += (dx / d) * 0.2 * dtMul;
            p.vy += (dy / d) * 0.2 * dtMul;
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

    function mtxDraw(ts){
      if(!matrixContainer.classList.contains('active')){
        mtxRaf = null;
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

      var n = mtxDrops.length;
      var i;
      /* Two-pass rendering: pass 1 draws text glyphs and icon mattes (panel-base rectangles that
         prevent trail accumulation through transparent icon pixels). Pass 2 draws icon sprites on
         top of every matte. This prevents column i+1's matte from overwriting column i's icon
         when icons are wider than mtxColWidth. */
      var iconQueue = [];
      for(i = 0; i < n; i++){
        var x0 = i * mtxColWidth + 1 + mtxColDriftX[i];
        var y0 = mtxDrops[i] * mtxLineStep;
        if(mtxColItem[i] == null){
          mtxAssignColVisual(i);
        }
        var item = mtxColItem[i];
        var op = mtxColOpacity[i];
        var warped = mtxApplyWarp(x0, y0, w, h);
        var x = warped.x;
        var y = warped.y;

        /* ── Afterburn trail (each step warped individually) ── */
        ensureGlowSprites();
        var trailAlpha = trailBaseAlphaFactor * op;
        var isDollar = (item.type === 'text' && item.value === '$');
        var sprite = isDollar ? trailGlowSpriteDollar : trailGlowSprite;
        var spriteHalf = trailGlowSpriteSize / 2;

        /* Submersion zone: shorten trail and diffuse glow in bottom 20% */
        var submersionFactor = 1;
        var inSubmersion = (y0 * mtxLineStep) > (h * meshZoneTop);
        if (inSubmersion) {
          var depth = ((y0 * mtxLineStep) - h * meshZoneTop) / (h * (1 - meshZoneTop));
          submersionFactor = Math.max(0.2, 1 - depth * 0.7);
        }

        var effectiveSteps = Math.max(1, Math.round(trailSteps * submersionFactor));

        for (var t = 1; t <= effectiveSteps; t++) {
          /* Compute unwarped trail point, then warp it */
          var rawTrailY = mtxDrops[i] * mtxLineStep - t * mtxLineStep;
          if (rawTrailY < 0) break;
          var rawTrailX = i * mtxColWidth + 1;
          var warpedTrail = mtxApplyWarp(rawTrailX, rawTrailY, w, h);

          var tAlpha = trailAlpha * (1 - t / (effectiveSteps + 1));
          if (tAlpha < 0.004) break;

          /* In submersion zone, glow diffuses wider */
          var glowScale = 1; /* no size increase in submersion zone */
          var drawSize = trailGlowSpriteSize * glowScale;
          var drawHalf = drawSize / 2;

          mtxCtx.save();
          mtxCtx.globalAlpha = tAlpha;
          mtxCtx.drawImage(sprite,
            warpedTrail.x + mtxColWidth * 0.4 - drawHalf,
            warpedTrail.y + mtxLineStep * 0.5 - drawHalf,
            drawSize, drawSize
          );
          mtxCtx.restore();
        }

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
          mtxCtx.fillText(item.value, tx, ty);
          mtxCtx.restore();
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
            /* Pass 1: matte only. Full icon bbox so trail clears completely under the sprite. */
            mtxCtx.globalAlpha = 1;
            mtxCtx.fillStyle = mtxPanelMatteRgb();
            mtxCtx.fillRect(ix, iy, Math.ceil(iw), Math.ceil(ih));
            /* Queue the sprite draw for pass 2. */
            var isHollowHex = item.def.src && /\/(link|hnt)\.png(\?|$)/.test(item.def.src);
            var isBtcGlow = item.def.src && item.def.src.indexOf('btc.png') >= 0 && item.drawSize > mtxIconDrawSizeMax;
            iconQueue.push({ tint: tint, ix: ix, iy: iy, iw: iw, ih: ih, op: op, hollow: isHollowHex, btcGlow: isBtcGlow });
          }
        }

        /* ── Mesh proximity reaction: glyph entering bottom zone ── */
        var glyphScreenY = y0 * mtxLineStep;
        if (glyphScreenY > h * meshZoneTop && glyphScreenY < h) {
          /* Wake nearby mesh nodes: brief brightness pulse */
          var proximityDepth = (glyphScreenY - h * meshZoneTop) / (h * (1 - meshZoneTop));
          if (proximityDepth > 0.3 && Math.random() < 0.02) {
            for (var pm = 0; pm < meshNodes.length; pm++) {
              var pn = meshNodes[pm];
              var pdx = (i * mtxColWidth + mtxColWidth * 0.5) - pn.x;
              var pdy = glyphScreenY - pn.y;
              var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
              if (pdist < 30) {
                pn.reactBright = Math.min(1, (pn.reactBright || 0) + 0.3);
              }
            }
          }
        }

        if(y0 > h){
          /* ── Deposit node into control-layer mesh ── */
          var occupancy = meshNodes.length / meshMaxNodes;
          var depositChance = 0.45 * (1 - occupancy * occupancy);
          if (meshNodes.length < meshMaxNodes && Math.random() < depositChance) {
            var meshTargetY = h * meshZoneTop + Math.random() * h * (1 - meshZoneTop);
            /* Drift from column center to avoid vertical banding */
            var meshTargetX = i * mtxColWidth + mtxColWidth * 0.5
              + (Math.random() - 0.5) * mtxColWidth * 2.5;
            meshTargetX = Math.max(4, Math.min(w - 4, meshTargetX));

            var isDollarDeposit = (item.type === 'text' && item.value === '$');
            meshNodes.push({
              x: meshTargetX,
              y: meshTargetY - 8, /* start slightly above resting point */
              restY: meshTargetY,
              r: 1.0 + Math.random() * 1.5,
              alpha: isDollarDeposit ? (0.28 + Math.random() * 0.3) : (0.18 + Math.random() * 0.32),
              born: performance.now(),
              life: meshNodeLifeMin + Math.random() * (meshNodeLifeMax - meshNodeLifeMin),
              pulse: Math.random() * Math.PI * 2,
              settling: true,
              reactBright: 0
            });

            /* Arrival ripple */
            meshRipples.push({
              x: meshTargetX,
              y: meshTargetY,
              born: performance.now(),
              maxR: 12 + Math.random() * 8,
              alpha: 0.08
            });
          }

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
        mtxCtx.imageSmoothingEnabled = !q.hollow;
        if('imageSmoothingQuality' in mtxCtx && !q.hollow){
          mtxCtx.imageSmoothingQuality = 'high';
        }
        mtxCtx.drawImage(q.tint, q.ix, q.iy, q.iw, q.ih);
        mtxCtx.restore();
      }
      /* Pass 3: dollar magnet particles (desktop only). */
      mtxDollarMagUpdate(w, h, dtMul);
      mtxDollarMagDraw(mtxCtx, mtxFontFamily);

      /* ══════════════════════════════════════════════
         Control-layer mesh: infrastructure beneath the rain
         ══════════════════════════════════════════════ */
      var meshNow = performance.now();

      /* Top-edge gradient mask: mesh fades in from meshZoneTop, no hard band */
      var meshMaskTop = h * meshZoneTop;
      var meshMaskFadeH = h * 0.10;

      /* Expire old nodes */
      for (var mi = meshNodes.length - 1; mi >= 0; mi--) {
        if (meshNow - meshNodes[mi].born > meshNodes[mi].life) {
          meshNodes.splice(mi, 1);
        }
      }

      /* Settle newly deposited nodes toward resting Y */
      for (var ms = 0; ms < meshNodes.length; ms++) {
        var sn = meshNodes[ms];
        if (sn.settling) {
          sn.y += (sn.restY - sn.y) * 0.06;
          if (Math.abs(sn.y - sn.restY) < 0.3) {
            sn.y = sn.restY;
            sn.settling = false;
          }
        }
        /* Decay reactBright */
        if (sn.reactBright > 0) {
          sn.reactBright *= 0.94;
          if (sn.reactBright < 0.01) sn.reactBright = 0;
        }
      }

      /* Expire old ripples */
      for (var mr = meshRipples.length - 1; mr >= 0; mr--) {
        if (meshNow - meshRipples[mr].born > meshRippleMaxAge) {
          meshRipples.splice(mr, 1);
        }
      }

      /* Zone alpha: applies a vertical fade at the top of the mesh zone */
      function meshZoneAlpha(nodeY) {
        if (nodeY < meshMaskTop) return 0;
        if (nodeY < meshMaskTop + meshMaskFadeH) {
          return (nodeY - meshMaskTop) / meshMaskFadeH;
        }
        return 1;
      }

      function meshNodeFade(nd) {
        var age = meshNow - nd.born;
        var fadeIn = Math.min(1, age / 800);
        var fadeOut = age > nd.life * 0.7
          ? 1 - (age - nd.life * 0.7) / (nd.life * 0.3)
          : 1;
        return fadeIn * fadeOut * meshZoneAlpha(nd.y);
      }

      /* Draw connection lines (k-nearest, not all pairs) */
      var drawnEdges = {};
      for (var ma = 0; ma < meshNodes.length; ma++) {
        var neighbors = meshNearestK(ma, meshMaxLinksPerNode);
        var ndA = meshNodes[ma];
        var fadeA = meshNodeFade(ndA);

        for (var nb = 0; nb < neighbors.length; nb++) {
          var bi = neighbors[nb].idx;
          var edgeKey = ma < bi ? (ma + ':' + bi) : (bi + ':' + ma);
          if (drawnEdges[edgeKey]) continue;
          drawnEdges[edgeKey] = true;

          var ndB = meshNodes[bi];
          var fadeB = meshNodeFade(ndB);
          var dist = neighbors[nb].dist;

          var lineAlpha = Math.min(ndA.alpha, ndB.alpha)
            * Math.min(fadeA, fadeB)
            * (1 - dist / meshConnectionDist)
            * 0.08;

          /* React brightness: flash nearby links on arrival */
          var reactBoost = Math.max(ndA.reactBright || 0, ndB.reactBright || 0) * 0.2;
          lineAlpha += reactBoost;

          if (lineAlpha > 0.003) {
            mtxCtx.beginPath();
            mtxCtx.moveTo(ndA.x, ndA.y);
            mtxCtx.lineTo(ndB.x, ndB.y);
            mtxCtx.strokeStyle = 'rgba(74, 222, 128, ' + lineAlpha + ')';
            mtxCtx.lineWidth = 0.5;
            mtxCtx.stroke();
          }
        }
      }

      /* Draw mesh nodes */
      for (var mn = 0; mn < meshNodes.length; mn++) {
        var nd = meshNodes[mn];
        var nFade = meshNodeFade(nd);
        if (nFade < 0.003) continue;

        var pulse = Math.sin(meshNow * meshPulseSpeed + nd.pulse) * 0.25 + 0.75;
        var drawAlpha = nd.alpha * nFade;

        /* React brightness boost */
        var rBoost = nd.reactBright || 0;
        drawAlpha = Math.min(1, drawAlpha + rBoost * 0.35);

        /* Core dot */
        mtxCtx.beginPath();
        mtxCtx.arc(nd.x, nd.y, nd.r * pulse, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(74, 222, 128, ' + drawAlpha * 0.25 + ')';
        mtxCtx.fill();

        /* Soft halo: smaller and dimmer than reef — infrastructure, not bloom */
        mtxCtx.beginPath();
        mtxCtx.arc(nd.x, nd.y, nd.r * pulse * 1.8, 0, Math.PI * 2);
        mtxCtx.fillStyle = 'rgba(74, 222, 128, ' + drawAlpha * 0.03 + ')';
        mtxCtx.fill();
      }

      /* Draw arrival ripples */
      for (var ri = 0; ri < meshRipples.length; ri++) {
        var rp = meshRipples[ri];
        var rAge = meshNow - rp.born;
        var rProgress = rAge / meshRippleMaxAge;
        var rRadius = rp.maxR * rProgress;
        var rAlpha = rp.alpha * (1 - rProgress) * (1 - rProgress) * meshZoneAlpha(rp.y);
        if (rAlpha > 0.003) {
          mtxCtx.beginPath();
          mtxCtx.arc(rp.x, rp.y, rRadius, 0, Math.PI * 2);
          mtxCtx.strokeStyle = 'rgba(74, 222, 128, ' + rAlpha + ')';
          mtxCtx.lineWidth = 0.7;
          mtxCtx.stroke();
        }
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
      mtxDollarMag.length = 0;
      mtxDollarMagPrevMx = mtxDollarMagPrevMy = null;
      mtxDollarMagBtnCache = null;
      if(mtxMobileMatrixAlways){
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
        meshMaxNodes = mtxIsMobile ? 12 : 30;
        meshConnectionDist = mtxIsMobile ? 35 : 48;
        trailSteps = mtxIsMobile ? 2 : 4;
        if(matrixContainer.classList.contains('active')){
          mtxInitCanvas();
        }
      }, 200);
    });

    if(mtxMobileMatrixAlways){
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

  // Sticky section rail: Operating-Model.html (Structure), 2026-frameworks.html, speaker-advisory.html
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
