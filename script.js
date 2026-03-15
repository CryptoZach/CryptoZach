(function(){
  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getSavedTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (error) {
      return null;
    }
  }

  function prefersDarkMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    if (toggle) toggle.setAttribute('aria-pressed', String(isDark));
  }

  function getPreferredTheme() {
    var savedTheme = getSavedTheme();
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return prefersDarkMode() ? 'dark' : 'light';
  }

  function onMediaChange(query, handler) {
    if (query.addEventListener) {
      query.addEventListener('change', handler);
    } else if (query.addListener) {
      query.addListener(handler);
    }
  }

  // :has() fallback classes for older browsers.
  var hasSupport = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:has(*))');
  if (!hasSupport) {
    document.querySelectorAll('.writing-card').forEach(function(card) {
      if (card.querySelector('a.writing-link')) card.classList.add('writing-card--linked');
    });
    document.querySelectorAll('.writing-link').forEach(function(link) {
      if (link.querySelector('.writing-thumb')) link.classList.add('writing-link--thumb');
    });
  }

  // Theme controls.
  var toggle = document.getElementById('themeToggle');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(getPreferredTheme());

  onMediaChange(prefersDark, function(event) {
    if (!getSavedTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });

  if (toggle) {
    toggle.addEventListener('click', function() {
      var nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem('theme', nextTheme);
      } catch (error) {
        // Ignore storage failures and keep the in-memory state.
      }
    });
  }

  // Mobile menu.
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  var main = document.getElementById('main');
  var backToTop = document.getElementById('backToTop');
  var previouslyFocused = null;

  function setBackgroundInteractivity(disabled) {
    if (!main) return;
    if ('inert' in main) {
      main.inert = disabled;
    } else if (disabled) {
      main.setAttribute('aria-hidden', 'true');
    } else {
      main.removeAttribute('aria-hidden');
    }
  }

  function getMobileFocusable() {
    if (!mobileNav) return [];
    return Array.prototype.slice.call(
      mobileNav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }

  function closeMobileNav(restoreFocus) {
    if (!menuToggle || !mobileNav) return;
    mobileNav.classList.remove('open');
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
    document.body.removeAttribute('data-nav-open');
    setBackgroundInteractivity(false);
    if (backToTop) backToTop.hidden = false;
    if (restoreFocus !== false && previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  function openMobileNav() {
    if (!menuToggle || !mobileNav) return;
    previouslyFocused = document.activeElement;
    mobileNav.hidden = false;
    mobileNav.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-nav-open', 'true');
    setBackgroundInteractivity(true);
    if (backToTop) backToTop.hidden = true;
    var focusable = getMobileFocusable();
    if (focusable.length) focusable[0].focus();
  }

  function trapMobileFocus(event) {
    if (!mobileNav || !mobileNav.classList.contains('open') || event.key !== 'Tab') return;
    var focusable = getMobileFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (menuToggle && mobileNav) {
    menuToggle.setAttribute('aria-controls', 'mobileNav');
    mobileNav.hidden = true;

    menuToggle.addEventListener('click', function() {
      if (mobileNav.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    mobileNav.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        closeMobileNav(false);
      });
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 768 && mobileNav.classList.contains('open')) {
        closeMobileNav(false);
      }
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && mobileNav.classList.contains('open')) {
        event.preventDefault();
        closeMobileNav();
        return;
      }
      trapMobileFocus(event);
    });
  }

  // Copy email feedback.
  var copy = document.getElementById('copyEmail');
  var email = document.getElementById('emailAddr');
  var copyStatus = document.getElementById('copyStatus');

  function announceCopyStatus(message) {
    if (!copyStatus) {
      copyStatus = document.createElement('div');
      copyStatus.id = 'copyStatus';
      copyStatus.className = 'sr-only';
      copyStatus.setAttribute('aria-live', 'polite');
      document.body.appendChild(copyStatus);
    }
    copyStatus.textContent = '';
    window.setTimeout(function() {
      copyStatus.textContent = message;
    }, 20);
  }

  if (copy && email) {
    copy.addEventListener('click', function() {
      var address = email.textContent.trim();

      function showCopied() {
        var previousText = copy.textContent;
        copy.textContent = 'Copied';
        copy.classList.add('copied');
        announceCopyStatus('Email address copied.');
        window.setTimeout(function() {
          copy.textContent = previousText;
          copy.classList.remove('copied');
        }, 1200);
      }

      function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = address;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch (error) {
          announceCopyStatus('Opening your mail app.');
          window.location.href = 'mailto:' + encodeURIComponent(address);
        }
        document.body.removeChild(textarea);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(showCopied, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  // Active page highlighting for nav links.
  var currentPath = window.location.pathname.replace(/\/+$/, '');
  if (currentPath) {
    document.querySelectorAll('.navlink').forEach(function(link) {
      var linkHref = link.getAttribute('href');
      if (!linkHref || linkHref.charAt(0) === '#') return;
      var resolved = new URL(linkHref, window.location.href).pathname.replace(/\/+$/, '');
      if (resolved === currentPath) {
        link.classList.add('active');
      }
    });
  }

  // Scroll progress indicator.
  var progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    var updateProgress = function() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = documentHeight > 0 ? Math.min(scrollTop / documentHeight, 1) : 0;
      progressBar.style.transform = 'scaleX(' + progress + ')';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  // Header scroll state.
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function() {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Section-aware anchor highlighting.
  var anchorLinks = document.querySelectorAll('.navlink[href^="#"]');
  var sectionIds = Array.from(anchorLinks).map(function(link) {
    return link.getAttribute('href').slice(1);
  });
  var sections = sectionIds.map(function(id) {
    return document.getElementById(id);
  }).filter(Boolean);

  if (sections.length && typeof IntersectionObserver !== 'undefined') {
    var headerHeight = parseInt(getComputedStyle(root).getPropertyValue('--header-h'), 10) || 72;
    var navObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var link = document.querySelector('.navlink[href="#' + entry.target.id + '"]');
        if (link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { threshold: 0.05, rootMargin: '-' + headerHeight + 'px 0px -40% 0px' });

    sections.forEach(function(section) {
      navObserver.observe(section);
    });
  }

  // Hero entrance stagger.
  if (!prefersReducedMotion) {
    var hero = document.querySelector('.hero');
    if (hero) {
      var staggerItems = [
        hero.querySelector('.kicker'),
        hero.querySelector('.hero-name'),
        hero.querySelector('h1'),
        hero.querySelector('.hero-subhead'),
        hero.querySelector('.hero-points'),
        hero.querySelector('.hero-actions'),
        hero.querySelector('.hero-pills'),
        hero.querySelector('.meta'),
        hero.querySelector('.hero-rail')
      ].filter(Boolean);

      staggerItems.forEach(function(element, index) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(16px)';
        element.style.transition =
          'opacity .5s cubic-bezier(.25,.46,.45,.94) ' + (index * 80) + 'ms, ' +
          'transform .5s cubic-bezier(.25,.46,.45,.94) ' + (index * 80) + 'ms';
      });

      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          staggerItems.forEach(function(element) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          });
        });
      });
    }
  }

  // Writing excerpt expand/collapse.
  document.querySelectorAll('.writing-expand').forEach(function(button, index) {
    var item = button.closest('.writing-item');
    var excerpt = item ? item.querySelector('.writing-excerpt') : null;
    if (!item || !excerpt) return;

    if (!excerpt.id) {
      excerpt.id = 'writing-excerpt-' + (index + 1);
    }

    button.setAttribute('aria-controls', excerpt.id);
    button.setAttribute('aria-expanded', String(item.classList.contains('expanded')));

    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      var willExpand = !item.classList.contains('expanded');
      item.classList.toggle('expanded', willExpand);
      button.setAttribute('aria-expanded', String(willExpand));
    });
  });

  // Back to top button.
  if (backToTop) {
    var onScrollTop = function() {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    };
    onScrollTop();
    window.addEventListener('scroll', onScrollTop, { passive: true });
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  // Scroll reveal.
  if (!prefersReducedMotion && typeof IntersectionObserver !== 'undefined') {
    var reveals = document.querySelectorAll('.reveal');
    var revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function(element) {
      revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function(element) {
      element.classList.add('visible');
    });
  }

  // Staggered card reveals.
  function setupStagger(containerSelector, itemSelector) {
    document.querySelectorAll(containerSelector).forEach(function(container) {
      var items = container.querySelectorAll(itemSelector);
      items.forEach(function(item) {
        item.classList.add('stagger-item');
      });

      if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
        items.forEach(function(item) {
          item.classList.add('visible');
        });
        return;
      }

      var revealed = false;
      function revealAll() {
        if (revealed) return;
        revealed = true;
        items.forEach(function(item, index) {
          window.setTimeout(function() {
            item.classList.add('visible');
          }, index * 100);
        });
      }

      var staggerObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            revealAll();
            items.forEach(function(item) {
              staggerObserver.unobserve(item);
            });
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

      items.forEach(function(item) {
        staggerObserver.observe(item);
      });
    });
  }

  setupStagger('.grid', '.card');
  setupStagger('.writing-list', '.writing-item');
})();
