(function(){
  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // :has() fallback classes for older browsers
  var hasSupport = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:has(*))');
  if (!hasSupport) {
    document.querySelectorAll('.writing-card').forEach(function(card) {
      if (card.querySelector('a.writing-link')) card.classList.add('writing-card--linked');
      if (card.querySelector('.writing-thread')) card.classList.add('writing-card--threaded');
    });
    document.querySelectorAll('.writing-link').forEach(function(link) {
      if (link.querySelector('.writing-thumb')) link.classList.add('writing-link--thumb');
    });
  }

  // Theme: respect saved preference, then system preference, then default light
  var toggle = document.getElementById('themeToggle');
  var saved = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (toggle) toggle.setAttribute('aria-pressed', 'true');
    } else {
      root.removeAttribute('data-theme');
      if (toggle) toggle.setAttribute('aria-pressed', 'false');
    }
  }

  if (saved) {
    applyTheme(saved);
  } else if (prefersDark.matches) {
    applyTheme('dark');
  }

  prefersDark.addEventListener('change', function(e) {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  if(toggle){
    toggle.addEventListener('click', function() {
      var isDark = root.getAttribute('data-theme') === 'dark';
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

  // Mobile menu toggle
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  function closeMobileNav() {
    if (!menuToggle || !mobileNav) return;
    mobileNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }
  if(menuToggle && mobileNav){
    menuToggle.addEventListener('click', function() {
      var open = mobileNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMobileNav);
    });
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) closeMobileNav();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMobileNav();
    });
  }

  // Copy email - with fallback for browsers without Clipboard API
  var copy = document.getElementById('copyEmail');
  var email = document.getElementById('emailAddr');
  if(copy && email){
    copy.addEventListener('click', function() {
      var addr = email.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function() {
          showCopied();
        }, fallbackCopy);
      } else {
        fallbackCopy();
      }
      function showCopied() {
        var prev = copy.textContent;
        copy.textContent = 'Copied';
        copy.classList.add('copied');
        setTimeout(function() {
          copy.textContent = prev;
          copy.classList.remove('copied');
        }, 1200);
      }
      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch(e) {
          window.location.href = 'mailto:' + encodeURIComponent(addr);
        }
        document.body.removeChild(ta);
      }
    });
  }

  // Header scroll state
  var header = document.querySelector('header');
  if(header){
    var onScroll = function() {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Active nav link highlighting
  var anchorLinks = document.querySelectorAll('.navlink[href^="#"]');
  var sectionIds = Array.from(anchorLinks).map(function(l) { return l.getAttribute('href').slice(1); });
  var sections = sectionIds.map(function(id) { return document.getElementById(id); }).filter(Boolean);
  if(sections.length && typeof IntersectionObserver !== 'undefined'){
    var headerH = parseInt(getComputedStyle(root).getPropertyValue('--header-h')) || 72;
    var navObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var id = entry.target.id;
        var link = document.querySelector('.navlink[href="#' + id + '"]');
        if(link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { threshold: 0.05, rootMargin: '-' + headerH + 'px 0px -40% 0px' });
    sections.forEach(function(s) { navObserver.observe(s); });
  }

  // Hero entrance stagger
  if(!prefersReducedMotion){
    var hero = document.querySelector('.hero');
    if(hero){
      var staggerItems = [
        hero.querySelector('.kicker'),
        hero.querySelector('.display-name'),
        hero.querySelector('h1'),
        hero.querySelector('.hero-actions'),
        hero.querySelector('.meta'),
        hero.querySelector('.hero-rail')
      ].filter(Boolean);

      staggerItems.forEach(function(el, i) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity .5s cubic-bezier(.25,.46,.45,.94) ' + (i * 80) + 'ms, transform .5s cubic-bezier(.25,.46,.45,.94) ' + (i * 80) + 'ms';
      });

      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          staggerItems.forEach(function(el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        });
      });
    }
  }

  // Writing excerpt expand/collapse
  document.querySelectorAll('.writing-expand').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var item = btn.closest('.writing-item');
      if(item) item.classList.toggle('expanded');
    });
  });

  // Back to top button
  var backToTop = document.getElementById('backToTop');
  if(backToTop){
    var onScrollTop = function() {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    };
    onScrollTop();
    window.addEventListener('scroll', onScrollTop, { passive: true });
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  // Scroll reveal (skipped if prefers-reduced-motion)
  if(!prefersReducedMotion && typeof IntersectionObserver !== 'undefined'){
    var reveals = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el) { observer.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('visible'); });
  }

  // Staggered card reveals
  function setupStagger(containerSelector, itemSelector) {
    var containers = document.querySelectorAll(containerSelector);
    containers.forEach(function(container) {
      var items = container.querySelectorAll(itemSelector);
      items.forEach(function(item) { item.classList.add('stagger-item'); });

      if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
        items.forEach(function(item) { item.classList.add('visible'); });
        return;
      }

      var triggered = false;
      function revealAll() {
        if (triggered) return;
        triggered = true;
        items.forEach(function(item, i) {
          setTimeout(function() { item.classList.add('visible'); }, i * 100);
        });
      }

      var staggerObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            revealAll();
            items.forEach(function(item) { staggerObserver.unobserve(item); });
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

      items.forEach(function(item) { staggerObserver.observe(item); });
    });
  }

  setupStagger('.positioning-grid', '.positioning-card');
  setupStagger('.writing-list', '.writing-item');

  // Animated number counter for positioning stats
  function animateCounter(el, target, suffix) {
    suffix = suffix || '';
    var isNumber = !isNaN(parseFloat(target));
    if (!isNumber) { el.textContent = target; return; }

    var num = parseFloat(target);
    var isFloat = target.indexOf('.') !== -1;
    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * num;
      el.textContent = (isFloat ? current.toFixed(target.split('.')[1].length) : Math.floor(current).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (!prefersReducedMotion && typeof IntersectionObserver !== 'undefined') {
    var stats = document.querySelectorAll('.positioning-stat');
    var statObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var text = el.textContent.trim();
          var numMatch = text.match(/^([\d,.]+)(.*)/);
          if (numMatch) {
            var numStr = numMatch[1].replace(/,/g, '');
            animateCounter(el, numStr, numMatch[2] || '');
          }
          statObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    stats.forEach(function(s) { statObserver.observe(s); });
  }
})();
