/* home.js: the homepage's own engine, served as one cached file (2026-10-12).
   Two blocks that used to be inline at the end of index.html: the mobile menu, theme
   hooks and the hero field (matrix, reef, pile), then the dial (vaultMountDial, verbatim
   from vault.js plus the compact branches). The logo matrix embedded in ICONS is kept
   in sync with scripts/homepage_matrix_logos.json by scripts/sync_homepage_matrix_logos.py,
   and scripts/check_homepage_matrix.cjs and check_homepage_animation_budgets.cjs read this
   file alongside index.html. Loaded with defer, so it runs after the document is parsed,
   exactly when the inline blocks ran. The small shell-reaction script stays inline. */
(function(){
  var root = document.documentElement;
  function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }

  /* ── MOBILE MENU ───────────────────────────────────────────────────────────
     Six behaviours, and they are correctness rather than taste, so they match
     the interior panel one for one: hidden+inert+aria-hidden while closed so it
     leaves the a11y tree, focus to the first link on open, Escape closes and
     returns focus to the button, a Tab trap while open, the body scroll locked,
     and an automatic close when the viewport goes back past the breakpoint. The
     media query below MUST match the CSS collapse at 900px: the shared version
     carries a comment saying a mismatch there once left its focus trap inert in
     the band where the hamburger showed. */
  (function(){
    var btn = document.getElementById('menuToggle');
    var panel = document.getElementById('nav-mobile-home');
    if (!btn || !panel) return;
    /* MUST match the CSS collapse above. The shared implementation carries a
       comment recording that a mismatch here once left its focus trap inert in
       the band where the hamburger was showing. */
    var MQ = window.matchMedia('(max-width: 1279px)');
    var root = document.documentElement;
    var hdr = document.querySelector('header .hdr') || document.querySelector('header');
    function syncHeaderHeight(){
      if (hdr) root.style.setProperty('--hdr-h', Math.round(hdr.getBoundingClientRect().height) + 'px');
    }
    syncHeaderHeight();
    /* Setting --hdr-h on the root element invalidates style for the whole
       document. iOS Safari fires resize continuously through a pinch, because
       innerWidth and innerHeight track the VISUAL viewport, so an unthrottled
       listener here ran a full-document style invalidation dozens of times a
       second during the gesture. The header height does not change during a
       pinch at all: the layout box does not move. Settle first, then write. */
    var hdrTimer = null;
    window.addEventListener('resize', function(){
      if (hdrTimer) clearTimeout(hdrTimer);
      hdrTimer = setTimeout(function(){ hdrTimer = null; syncHeaderHeight(); }, 200);
    }, { passive: true });
    function focusables(){
      return panel.querySelectorAll('.nmh-set a, .nmh-social a');
    }
    function setOpen(open){
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.hidden = !open;
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
      root.classList.toggle('nav-open', open);
      if (open) syncHeaderHeight();
      if (open) window.requestAnimationFrame(function(){
        var first = focusables()[0]; if (first) first.focus();
      });
    }
    function close(){ if (btn.getAttribute('aria-expanded') === 'true') setOpen(false); }
    btn.addEventListener('click', function(){
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape') return;
      if (btn.getAttribute('aria-expanded') === 'true'){ setOpen(false); btn.focus(); }
    });
    panel.addEventListener('keydown', function(e){
      if (e.key !== 'Tab' || btn.getAttribute('aria-expanded') !== 'true') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
    panel.addEventListener('click', function(e){ if (e.target.closest('a')) close(); });
    window.addEventListener('resize', function(){ if (!MQ.matches) close(); });
    if (typeof MQ.addEventListener === 'function') MQ.addEventListener('change', function(e){ if (!e.matches) close(); });
    else if (typeof MQ.addListener === 'function') MQ.addListener(function(e){ if (!e.matches) close(); });
  })();

  /* black-hole collapse on the brand mark, click-triggered, self-clearing */
  (function(){
    var mark = document.querySelector('.vault-headdial');
    var link = document.querySelector('.brand a');
    if (!mark || !link) return;
    link.addEventListener('click', function(){
      mark.classList.remove('collapse');
      void mark.getBoundingClientRect().width;   /* force a restart */
      mark.classList.add('collapse');
    });
    mark.addEventListener('animationend', function(e){
      if (e.animationName === 'markCollapse') mark.classList.remove('collapse');
    });
  })();

  var saved = get('theme');
  if (saved) root.setAttribute('data-theme', saved);
  document.getElementById('themeToggle').addEventListener('click', function(){
    var dark = getComputedStyle(root).colorScheme.indexOf('dark') > -1;
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next); set('theme', next);
  });
  /* isDark() resolved the entire root style on every call, and tintFor() calls
     it once per mark per frame purely to build a cache key. Measured at 390x844
     dpr3 with everything else already fixed: 3,463 root style resolutions in
     three idle seconds from tintFor alone, ~1,150 a second, the single largest
     style cost on the page and all of it for a boolean that changes only when
     the theme does. Resolve once, and let the two things that can change it say
     so. */
  var darkCached = null;
  function isDark(){
    if (darkCached === null) darkCached = getComputedStyle(root).colorScheme.indexOf('dark') > -1;
    return darkCached;
  }
  if (window.MutationObserver){
    new MutationObserver(refreshTheme)
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  (function(){
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var clear = refreshTheme;
    mq.addEventListener ? mq.addEventListener('change', clear) : mq.addListener(clear);
  })();

  function refreshTheme(){
    darkCached = null;
    /* The pile canvas repaints only when a coin moves, so a settled pile kept
       the old theme's olive until something nudged it. */
    pileDirty = true;
    if (reduce && W) staticFrame();
  }

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = motionQuery.matches;
  var hero = document.getElementById('hero');
  var mtxC = document.getElementById('mtx'), mctx = mtxC.getContext('2d');
  var rfC  = document.getElementById('reef'), rctx = rfC.getContext('2d');
  var plC  = document.getElementById('pile'), pctx = plC.getContext('2d');
  var W = 0, H = 0, dpr = 1;

  /* Field colors, taken from the live hero in script.js:
     olive 96 108 62 for the field, mint 204 251 229 and accent blue
     91 156 245 for the dollar glyphs, which cross-fade across x. */
  var OLIVE = [76, 122, 100];   /* was the live yellow-olive 96,108,62 */
  var MINT  = [204, 251, 229];
  var BLUE  = [91, 156, 245];
  var MINT_L = [5, 200, 122], BLUE_L = [47, 111, 208], OLIVE_L = [58, 104, 86];
  function pal(){
    return isDark()
      ? { olive: OLIVE, mint: MINT, blue: BLUE, trail: [17, 29, 33], fade: 0.158 }
      : { olive: OLIVE_L, mint: MINT_L, blue: BLUE_L, trail: [233, 237, 242], fade: 0.170 };
  }
  function rgb(c, a){ return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixc(a, b, t){
    return [Math.round(a[0]*(1-t)+b[0]*t), Math.round(a[1]*(1-t)+b[1]*t), Math.round(a[2]*(1-t)+b[2]*t)];
  }

  function resize(){
    var r = hero.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(320, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* iOS Safari fires window resize continuously through a pinch gesture,
       because innerWidth and innerHeight track the VISUAL viewport. The hero
       layout box does not move under a pinch, so without this guard a zoom
       gesture reallocated two full-viewport canvases dozens of times a
       second and the tab was killed for memory. Bail when nothing changed. */
    var cw = Math.floor(W * dpr), ch = Math.floor(H * dpr);
    if (mtxC.width === cw && mtxC.height === ch && rfC.width === cw && rfC.height === ch) return;
    [mtxC, rfC].forEach(function(c){
      c.width = cw; c.height = ch;
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    bandH = 0;
    ICONPT_CAP = Math.max(220, Math.round(W / 3));
    buildColumns();
    measureCta();
    pileDirty = true;
    mctx.clearRect(0, 0, W, H);
  }

  /* ══ LOGO MATRIX: the live site's matrix marks, embedded as data URIs ══
     Every mark is a white silhouette on transparency, so a single source-atop
     fill recolors the whole bitmap. n = slug, c = 1 for the crypto stream,
     w = how many pool slots the mark gets (stables and majors run heavier). */
  var ICONS = [
    {n:"btc",c:1,w:6,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAADIElEQVRYCbWXTUgVURTHG4Mwwo+KPrTNow8iioKkgkgLaWFBtZGgTVgQhIsWYlQbCQKJIsRaFIEELSIqCNpEEX2QghlEUdFCMFN6qBmapUSb1+9M9453pndn7uTrwN/z9T/nnrlv5s7ozUohuVyuBvouILoSLAXFQKQXPAJ3PM97LIGCCIsuBi1gCLjKJ4inwLx/HkKKQSuYiQxT3Jh6CIrWguxMVo7UPsGvcBoE4iogkxdaRmm4JnYICIvAQIqV78L9kILfD3eJdQiSnSmaCXUhKFE1l9HnwJjybaor7wCwz9oqjPg17G/Kfy+NsPcof6PyZauT5GhoCNiZpAryb3QRdh2oVws2Y08qex22i0xAWqD7yVXccKh6Dac2KDIM4nIgSZ96hz6a0hK0IPJDRx10e1CYx6C+Elx36DNKeXERxN0YaU6sr3pdajcBOS/OA/8e4BjOgoNwLmmeRcsNXC3b1gbSyA7dkKLjkUK5GF+IyxGeJK1FsDeoGifF1XUbxO2GLWYwALwR/O+RfNTdIgOsjkZj/Gfkfhr5Kew+5Q+g23SOS6/CLtG+RVfIT5BGzlgahcI0nA9eODQelx3wn+FQB7sjO+ALzRvAVVCjY4buwN5s+DZzjuxAP3CVuboTBQ+Mos/YtTonGv+hkbeZWSH22LIqLs1FnkYW+BOd/jsWyR+aTlmtTvkJXpqFeezD3NEe8X06R7tqbRv6i2GL+Svi53N7ZAfijs9hqvQ3318NqG0At4B8OfnHsSbhd4Ak2SYDlIPJGOYUudugEZTpBeI0vJUgST4GPWBeSGKrfBm6FFwB64MGhkF8P3D5ojoRlFGwDCSJfwJC2quI/gDYfeA56ALymnWREUjBE+UPQuBkQqUssBVcBBNShHZ9/0MNybHg6k0DytsQze4MkjoC2u0Ua+aeuWbIpiQDZHv+l7yjcfyrH0IV0N99hRxE3g3loSu2ORBlJ7oLuPpN1rKeJ7Y55CZrBkmf2XFzjpM8YF3AJUEDee5PA7nxXKUXYhMoTVpDznhnoeFOyHVgOciAFWA2GAKDQP49v8+r4xXaSX4DgVU0HeDk+WMAAAAASUVORK5CYII="},
    {n:"eth",c:1,w:6,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAADFElEQVRYCdWWS0hUURjHnTKIFgktSmYxzKJ3UZCzthZRu2hT9EQoIyKKoBcY4khRRJC16G0LLYLCNlEEGZTZbFxUkAWis5GQnlIIiWIz/f6Xc4fxcufMvWNMeODn9zjne9xzzz1jRcV0Htls9gNM/JdnoHAMMjAIT8veBEXT0ANJUCPzS2liRilBFNtF3AJ4YuJvI1NGDyVKaoAKV+GIWykSiexDj9LYdtcXVIZugCKXSD5M0VZPETV03eMraoZugIyHYKM3Mw3dwveTBlu8czY7VAMkf0ayFMX6CiTdgP9wgTlfd+AGKB4lw3qK1/pmwmkae83azkJrvP5Kr8NidzGnbbYOmlhLA/osY+iD1sVMBtoBkul0R0m43yfhUh/fNXwvfPyluWjgF+SKx+Px2djNMAEp6IM9+dmxR6Au31eSTpKL4Gwlshouw29oBDWhm3ARtMIPOKFCyDoYKVY0yCvQqT5IsnbkGxjgVcyB0+gZ0OHrh3rUhTCPtfKvBDV0BVnaILgXlES/erp+Jw18TZCc5DQG/qPwHZwm/dbIZ/sKtDvjMBc284TdyDBDr60K+m1BtleQoegagu9AF0/y0ZYof461A9j3oYUcS/LnvLqlgXWVJNpLQCNJtK4K+w80eJO4NnNnQVs+08S0YT8GXWLhB4HHQZ/TKUUjD4A+va/GbkJPGl3vW3M7jH0efQj0U11wWHbAOd0XiHwOq0ikd/mOJ9O5+YStJ90KW4yeNnNfsIfwa34Un3ZxaoOEo7AMdOncVDbkYhg3xIxPW94Jui/ew4qpVTbRJKqFl6ZIPfoYbHOTo+8E3f+7zZoz6AXPihsXSpLwHJx0gmpqZqHfg1fQDfpSnIGegB7X/qeSxG9htZsUvV24tiS2Dl51vs+m2y4ivzj9w9EL+odUIw0RR+MPhfUr2MzB++z6iknrV+ANJvE3fMco1Oadw6d/0+KsueGds9mhGlAiCuh96wzkDqEp8CiSSGwyemCR277AEWYhDQyj6mnHYDk8oLkOZHkGDei060J6CHfLU9VThcIdoHMxfcdf6xUOrsSraeUAAAAASUVORK5CYII="},
    {n:"sol",c:1,w:5,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAABBElEQVRYCe2WMQrCMBSGmwsoFAouLgoew1uIIHR069jVRe/haeripqVO4uAgeAQHrd9DwbbpJObhkAfBNCnv+/qbIUHgqyWBsiwXDI3KLTzUlQYZxp0xrQmwkCrBBRM34YkiPGnC54rwtAmPgT+UBJY1uDwAzpXgKwvuF/4hAcP/P0Nk5FjmRv+1MeZqcRDYKh3CC5xBm0CXjZ2SxBlOv00iZOOgJHGCE7VJRGzIpkbJx4YiYaomLEo8G4YdU/XF38z3tBnXBKQvEkN+MkZPnh1XZgkI8J3EhGnHscDRcX/f/ssEOANal9LCUgTuL6WE4Lz8pfRz9gi7cB74C+AvpZ/YK7Mn0fTTCXlF5okAAAAASUVORK5CYII="},
    {n:"usdc",c:1,w:8,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAEz0lEQVRYCa2XW4hXRRzH/Zd3QyvW1C4+dNG2y5Kg2EOX3XrpJYMgIYIeDJOgeqigm5TpQz1Ydn0QKoIu0LJYtkRRD0allWkpGglLqLsJmltpF9MyT5/P+c+cnXP2uP6jvvDZmfn+fjPn/OfMmTnbGPUvlGXZaaTfCBdDW4Bi1GBgG+WaRqNxUPN/Exe+AXrhT1CHoR8+DwxQHgFlzjuw4D/fAIPcAt+C2gQPwZy6gfEbMBeWwmZQ22FhXf6IHp3GQzeoLXD9iB1qgvaBraBeg7E1acMtEqfCV6BWw0nDs1pz7AsvgtoIrpvji4Rx8CWoFdVMvGlwN0ypiU3HvwMm18Qex1fexLhqvGgT7DELPVWYVGifCk7j36CuTOPW8TrzSJb9TvksTEhzaD8d4t2pX9QJuuDUB1BMO/U58D2oo/AGjCk6hgreFHgTonxDiimn7uN4PwTLCxPTqd8DB8F3PRf1S+FHUB/CmTFmSbsdZlW8C/C+AdUHp8e4dfgNdsLQj6DxAKj7kuQxtL/L3Sx7ibKYlSTHwQZiO5Z4zoYzoLzxoi/1BzVRcS1/yX7YBcVdUfedV+9BMYAXoT0DbgfXhDdxTbx4LPFcNztA3Zv4vuI+0uaNU+kA9UiS5KYyCO5uxXM0TvuSEKMoyVd3dBwj5M4PGXvTGPUVwW93wPtD46rYmfblwXs+erHEd0pVPoWUE2GtBloU82KJ93YeybKbE+/a4N3j1HaEwPaYQBl3vp7Ei9W4FT+jwcFziGIxPAY/QVUvB2N+EvDQUh3OgK/GX8128y/tbXpwcupbx1sPaiVcWI1X2+S4XtRbMUbdR3wMeh3Q3WlnDFrSdlH+kHqxjn8F/ApRh6g4Rvndjh2a47l/bE4sr+FC3OCiOWZOGqTeD2dVvLzJlH9Kx+k0uuAimAfXgZvQbOKlLRzPWZSZkOpo3iDBBXQkjQSPIpuY+serk3euyWh/NQfPw03F556n0PYRr3ER7oOxNCYlnQdC/erEc9p8t53OjalPfRe4jhpQVVx8vTHgONSd/b3ewJYQmBtKiy9C/abEc8UfoO2znMcgy2AWnEd7NbiJvQJVLQjG2iQQr/W1v+psUKtiAnXPBjcPf+350bekfRn0QarDNJaDP6gQ7XPAMdzUitmh/gKo5tlCxcPjZzgl9qa+FJQrvHq0+hp56NjHb0CntCQ8z5KPQN0Vg9QnwQGIM5//qjsx1MNJogNsyN3mEV13kT3Ef4l9Yok3Gl4NfddF3xJvWfCXFD6Gi7AfqrNwBt5uUD6SuEPmfWnPhtJmRHsmfALK2Utn1VMyHse+mkMicCuoHkifl2f4uwaC3DknD/Vs1vTAvp6QyjOg+HSj7mPz016VFnc+Amaa8ETNBRaR45Srzpp4ZzOU7aO8rSb+ZIjXnS/NdBImwNaQ+BxlaZpo+6gWw7SaC7hHLIHSRydt10Nc9X7wluLVcVwkPncT1ccwY1hSiwZ9fcXXg3I9TG2pK4l+tXSD8rBZCcW33YkGIbcNVsEfoByrtX9M0sHptBB8O5Q34qvVBcUijfl64IfG6xAvvJv68AUXO7VSMoCzsRx8DaP8VPPGPoNNMAB6UeY+CuNPdI1hv2SkDgzYTrwL3J7bwGfqUT4Y6KNcx5mxg7Il/QMBkirufbOHvQAAAABJRU5ErkJggg=="},
    {n:"usdt",c:1,w:7,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACiElEQVRYCe2VPWgUURSFZ+JP0Kj4h38kEYvYGDQYa1HUThBNIaQXRBQDiQhCLAQ7QVCwswsKNlqlEAW1sTCNYFIoRiUoSEQRFDFo1u+sO8vdt+9l3yazW4gXDvPuffeec+bN7GyS/A/PCRQKhX0g79jrkfKXUH6Ytzp8D/xqTpXG3gaIZ5S9jlySugU671E7YuqvWH8weT3LzTRvNwN30zQ9ZvLKJeLdYDazW7qerOyKz5g/4XCJu8sytNiE9QVQdSpOz0JScV+0BGUDONvKxnG72aB1f0mrSL/YiOjuy4ZM/TADm0yu5SzP8pKt0TNMvsjWWO92cqXSOA9OKSkeN8NbWL8BS1WMCBmoEINjhrklEbNqUW87HNPZHQ9RiBUXwUJDWudEkuJ8LdcpsFwFJ76RvwOfwEfQClaCBPcHdM0CnvusdaI/wFfQAdaDbSDE3aF34Gyg4Tr1dnAUxMShQNOtUr3f2V9BfjrB+Vvgix0Uh8Br36ZDJh5fTFAcAD2+TWqTegR7INPxrXFJyW+Da0BHuhG0AfXvAnp0Nj6TjINfYAI8AzrBAdAH3PhC4WD2K+gmeQxcUjs0RvId/AQveAcG7SY3coW8B+ix6mZ2glBMs7EfDhn+GxB0gfcgJn5nc9mVoZmYQXqkoRezOtjoBJOgVszXgLg7q5VNhYYN4GUNB/MxMC5uIxVe0rgOPJ/DRL0GxLU6rOjZYWAVGAuYqMfAU3F5JGqXGGwDTzwmYg1odlltpbk7WiEZdUzEGBiFVp/ufAIDdxwTj8gt7LY+YLlHCwojViWwHkG5+IHL3YGIEb0ZEFb5RiPFyzeE0FWPicvlhmYsMDBsTOgPp/mBgUFwpvnK/5LiH9G1eJNlhWvJAAAAAElFTkSuQmCC"},
    {n:"dai",c:1,w:5,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAB4UlEQVRYCe1XMU7DQBCMEQUNokTQUPAFRJvLL3gBNT/wpeINPIGCN3DpKOADdJQRokBQ0JkZa8/anM4b28GkyUrn3bud3dlb3znKZLKTLXeg6MJfVZUHbmpgF+ILRVEEAzfMxQIw+ojvyrTXFahwAbYeytWYpVTrmpVNDCTTHcgmBcYlOKmhyuJ71ZMkXpswwbOQ1pghr2Bt8TiIHqC5ApbKXjFHKYAMSRH161lh7jNJWup6xvIV1JKLa/0OIOIeAecSdAp9IvYr9JfYlnpAF26RxwH0KMAZ1oLYtkLgXV328Md1ZFApYiHRNbE6cAHUuyBvoDkoVxhPtWU/frDbJSEogMSONtZWOPe5mBPgnuM6EnxGG3oJ35uab2SOdguSqhZxjs24aFP/VwENJ7oXmsk2CtDktFvPAFp1CX99iKCPCBY5hu8sTgz9jd1+iH9q4PIukIxxDX3K1toBAA8xXiRgyIfogLHYiJccwxWTYERxfTLFIOpc3Ki3AJxekc6V3c9kIu5AxHWJBlbH8EuYFesMZAO6LIKchE5hW3f/ZwWAlIQcvHLUUWbpxyc6qIcUUIKs1Elgu2TOacCYW+QEDSnAMdCQAN8CxN7ANK6uBQREsLWW8AdnnD8mFuvOt2kHfgFg0NBC/BNInQAAAABJRU5ErkJggg=="},
    {n:"xrp",c:1,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACxElEQVRYCe2WvWsUQRjG76IiJn5gsDDRFIKigqIBiZEUgkjwI61aiIIgiIgB/4Ngk8o6gpWtWgga/EKMhWiiKBrMBVERsREFQTAxKq6/525mmd2duVu5S3cv/G5m3+edZ/ZmZ+euUGhGcwVSKxBFURdcgY/wLSX/9yUeX4yXPDvTBgvdBAWbuR6H33APXkG9cQGDbdAPJeboLRaLJZ9pC+IkPIOlvoJ6cvI03k+9PojrQHHIW9CAJN5HyjNE0Rpr12I7tFp+xdtKMy+f74zrFuvu3sAyk5y14jy0P4znCuvt3oDNJVqWrBu+wmfYmhA9F6oxtRrT7SlJpGreADv2BSN6YQ4eYdqTcHAu0PpUA6rVbtfYfMHgU/AXvG8A+U54DTNwIO1KbgBmYQrWpnVdk9eboDlOZnSSN8D/iphq9JUwDn/gjDWhPwgyltZu874W/TlcjTUudsAoyGBvLAQ61LTBCCg+wKdyL4ou0bYFhsVpag6a+uu027Usv0zifFyVo8OYHrho2JljSFzCmGFQ/NQmPAa34CiJ1XFV7c5ySnRmvIEFtcsrFczRQe8wjMLxSpZPBO3wm3Ei0KGmFa6BQsuvx6C4DHkewW3qxjL2JM/BDELw26DbTaj9MmhN6J8GbcwJqLYJF6HrTTlrx8YtSXtOb4iTTge9A/QazsGAI5W75PpB5iXoSuu6Jr8RFHoE5fAdRJkVYMB6qvUzLeM9HDCZR0XuLtpu0D7S67iJNh2Z+TKJ9AiMdJw+gcXQx0Q66byBNoGwy4iPGRs8Na1B4g+JTbotpjpOV7m5an3qp9Ez/3xCY9wV+G6KloSKG5C33naugnsDU2YC7yZswOSysPti0uvHMxuDl9DqLagjiad+iKbhftAGUe/5Q3gPQ7AvWJxTwGO/8ZLnA9AJWj0oOgF3YLh6ZW1VHqDTT0d+M5orkFmBf9kgNEggyRGRAAAAAElFTkSuQmCC"},
    {n:"ada",c:1,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAADBklEQVRYCdWWSUhVYRTHfVGkNBClBUkTlUI2WFZG5spaVBTSQqNNoEZRNEJE0EIoqoUEDUgDIW2yQaMiKArDCFzUuqBVQsOiFk0UEdHrd57fuX7vyvfd+7wtegd+75zzP+c79747FxTks6XT6cOwP8l/GOFbzPBqeO3pmUGt0lVn7SeocNUjdRaPgS2RjY4G1q51lPJM5p80wFUojdp1ehbDNWiM6o1dZ9h1EFuni4iL4SO8grGW3kgudkq1xJ5hJVBrDyJfBmpzQrX5dh47ZtoFOB53Ab3NUJVDfxv9R+z+kXZCPAG+hLSslAFrEGqgJ5VKXZYi2iKcnJ4XaHdFc1gxepGjNlRm8BQ4BAulit8Kti0hqbUF4k2mt4z4DiwdOjmmwuJeEOs0Q7sH0uD3JNHZIBsILpneLqP3+DbnfRKy8CZ8gytmyFPj1T0geKyJ8X3Gd+P7QXxy49/MhEmwGW5BvU4lPgYPYTdMhHKt/RPPwBug1uQaSsNRbcK3u/qydBpPQ5mI+CoQa9Mm4lkZZfDnu9ZCvnCwJYhmaw9Ku1EzR4dYLtIzcg0IadM4ynj79vxtNHW/NAj5n+Ryvdgmmtpogh9QaATZ7h8T+x17KkdJzfl2pGGnNuFb/VNzrDKwAuQC2wNywZ3QEcQHQW5ZuS2ng3wnJDcGyYvlKzTINPxesK2FZLstEO8yveuJZe0O357IefDZNorjIPN0w4ef+wvQMk9JvNoqE8hOy9qNWsjZs/fLoQPmymK8fBfYVkNSbQvEme8AfDm0guxkPKO5Ey76uqnXg3yMBoOJS+EA1EWslY+ae3aPfbuJ/hwm2w3hmLfdbTRBjsg+3Fu0LnycD5B39H2G3IwNjYestxp5HahNsycirrDzxDEDz5strdZh5FNBPsnkhRUY+QYQ6whETxA+Ba7WJxTkEfpBGzjs74lLNLf8S+JeuG9peRpyGIugabi7z1p5Pctn2PCMxfPgjWs1tUdwzlPvo17pqovuvQY4z3I+s67w0LBn5P0hLUhZvzJI/tfgL9QZ3v7txD08AAAAAElFTkSuQmCC"},
    {n:"avax",c:1,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACn0lEQVRYCe2WO2hUQRSGZzYPNCIBEQLiK/iCiBbuFrEQ01i44APTB5U0NlpZ2dhayULSCWKVQgu7JGAXBJUYX0QEsTAIIkJ0XROUmL1+Z7N3Mzv3NTssWJgD/945r/+cO6+7Sm3IP54B7Vs/CILt5I6APnBfaz3ry+WTl6OBcVAGv8AU2OVD5JVDsSL4AEJZZXAbspwXYStJFNoG7oSVjecc48FWuHxiZeqHwaJR2ByWUHp9iJ1yIO8Dj8yK1vgL+gknMp8gyC+BP1ZRW52Bu/17gSq9YNmuFqPLhpQj6iSOnQ51wia7fLMD62etD/9wiHMP4Y1OgZ8xb2ub5E44587sEAmhHLtJIFObJQ8IkJuxbSLH7ipIOnZmQ59QzlDZ+3qPdA3hfjANqiBL5HLaEiHxNwx0Q3g9qyp+ae4tyBu1ZOauAZm5G6D1xkg6AuZBlqwQME7xxtSjXwDhnpHnKP4Oo8HsIUljwEU+EtS4fhn3g69W4gv03dlV6xEEF0DFIolTZfqHTWJ0+Uzbe0b0khmXPN47tIlgl6knLJiGyJz689jkNMSJ3CPmPonvgaArcdkxNln7foOlA/0uCNeeYUT415TvMnKah4QfAu8iaVGDFLkJwqtZdv1l8A2kyXecF6ka/QTg6AG3wBJIE1nPl+BY2D7jneAhsNceU5OIfwYcDHPNToSwCHpCZ8JzGfuE1oU3db9wHAenQWM/1H32Q/xHwVmlBrrFaTawB32HGFMkwPcMTCj1fGUtLi/nW96oRrhmS/3dincf+7y2fGYD8zjep6YqJZ/Ze/wFX1iPqzXyFL3e0LonYVTG/hqOivibpoy1OYDtJIi7OqvY50h8zNOSfFcQzMoRK4DkXa7UKv5XWhefKDX52yLZUP/TGfgL1hE8uSE4rXIAAAAASUVORK5CYII="},
    {n:"link",c:1,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAA/klEQVRYCe2XawrDIBCEYy/W3Kz2ZLYnS2epk0JA66z6zwVZ8piZjyUKCZuzjuPYIX1gvc0ihBCtTy8LxkpY14q4EacBwLwUPBdECB4L0hHcBzIwWAOZGFwH6Qg+v3h42A5Q67trVBXeP4OvW86eqX6bICgG94C0ADQHe0BqAOlq6L3GlFNp0jev6SjdAlgTWBNYE6idhDy8ovfQgUGkSam3AFDbDNISTFMFgJoiiBJMMwOwMdlS6wSB0KNP0O0bK5t4jCCVKuHtXzAB2PHQO5F/FPVgArAPBNGCCcDeAdIXTAB2AWRsMAHYKyCu4EBjtRtI1tzRn/g9f+VrqX0A7zV3kWul2X8AAAAASUVORK5CYII="},
    {n:"uni",c:1,w:4,s:"data:image/webp;base64,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"},
    {n:"ltc",c:1,w:3,z:1.42,s:"data:image/webp;base64,UklGRpABAABXRUJQVlA4TIQBAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHAGOAAAQZNtO21iMtfT3v9zSl61bhoj+O3LbyJFUkzZ5b4ZdTzj+dhvrXxtDw015bU4aTV4fB0NxTtgZFVQYVUGAMRQYmLII/JdZQYLRNar01wN2TwoK3nQDCzPpqkFxNtjrglc9FVhY5NCYLl4141U9TFVjuu9+5In4yGNZeMXZ8ZEn015/9iOPfPQjz3yDIs87q9pXIo9hqKq3LSbWwXD/qFO1qU2RSTXdnE/U301ZmACLPFT3ryt0WuSBur8VNaMGiOlqdTIk95moUZbZAiR1uPRo+NjE6csQ7VS813m810Fq1goN73UR5XUtabAYrxs1msNTE2cfxasDf4E43gu7xrenbs+Pdd0+3v26XTV1+73fNQ7+rpFft+mmK+/+pv8hXzFhq+h70xRE9BUhdOEi9Mu5CKCWuKvOjYNRWoRQS9ptbCNkZA3CJipcxca1pN5GopnuvrXE41Uz3nTHXYx9cqm/a8zxH8Ic"},
    {n:"circle",c:1,w:5,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAEEklEQVRYCaWWWYiOURjHv89usu/LYOwZhCbZLkiRC0XjwnCDC0KSLUkRIlfuhhQXyi6KG3Eh48JOGssYoRkjTLYSIdvr93+9551nzrfiqf/3bP/nOef93vOec5KJPCUIggKoM0AZGAy6RPiJrgcvwF1wG5xNJpOv0f8vDNwd7AOfQb7yBeJO0O4/ZlDcggbbgJr9q7yjcCWTaJZpIsl0CYq6Ej8DJqTLE3sK7oHH4DNoDorBZNAR+FJNoJTX8tBPpPgMPgzUAV+eEVgHClOKGgLNyJeCKuDLtQZaBouKQvDSq9QrWEJJ0wxlfliTOO31kLvCJzbyIbQDD8Q08hR7RCNidqcp/JOm3plrojJNbiPonNKGYLljR7oG3TuFyD9BfA7QU1aAE2ArKAPHgS+r/vQY1JLE2Si5t1FfgoPA9ygp9REMtCT8DmAzeAXylfhvp8A+4C/8IXF/nCNex2VxEoPcSPDC4+Ry48HVC7IWsJVD4RhE2oKfJqPdLP48ifcAr03emXcw9AoeAT2RleVhc/NTlChqBcH2+YbfRjObayuxF5s65f1/R1/JeI/Tidh6oMks/ZMLN7KJHm81eSvzNMBhE/mK3cYVYQ81OZn6Ktq7fGZd0hzeKRUgoxwPu0sYafjZowncbPCDq44sTVxbsZUpNp/JpuCMKdpuecRrTO5yE5LdDKHS2DKnGf8OW2mF8bOZI01yjLFl6rR0UqgJ6Fh14h+h/VwCrb0/X7F7vu2hep0dTjpqAnaL1aFipZVxWhs7l9nCEOyACv8wuUATeG8C8QKMYrUmN9zYWcwSPYT9Suo8sk5aJy81gVrnoccZW+Yt4183dkYzCG4tIGkf5JJHHm38V1rpu82q1IbU1hGwp0S5A8Q02awCtwR8imqktNn0ckXY/RU0Uq4J6Py2Mt8VSJOINxPsZUB3hbXALN7wu19B7AOwssvrtcUmsadrgAJgr103bJGz4WgAK9p+74MKkO4C84S4eRXhzvicmJMPiUS4XsKn3O+ikV7oBpYmttLL53IfQyjyeuzwinbHeRL+lrvDJcmt8gqzubUk1+rgcfXSxMYCrQcnumF3txyR3JlwgkR4iyWmd+3LAQKKnwcVEY6iZ1AXn6KuOfFioNuxlW0uH2uyPcFq1wTbP7/V4CD5nF+Dawp/EqhXoZEr/j/k+LGGvMYUOPNI/oOHC24DhfaeoT5aG53igTIZkC4CXyoJzAYZG5AbADYB/6kJBdWgrz9myjsTAWIBqhwskp9G3hC7HyFAFwGd+/7BQyiUC/zO4TTl0/sLYSKzgL+ACOUtH2FuYEh74P3FDKDSQHfG5UB/Yb6i7bgcmN0y/bhpX0F6ajgZXS5mgqmgD+gB9FW8jVCNPpZMDj+XSFR9w84pvwG7MbuJubUAygAAAABJRU5ErkJggg=="},
    {n:"coinbase",c:1,w:5,z:1.18,s:"data:image/webp;base64,UklGRvYDAABXRUJQVlA4TOoDAAAvf8AfEA+joG0byfxJ77+jMP/z77BtI0cOnuQJF//Vtm3DwFNP7sARAz5AAYDFojAQixcgKASLwh9isQBABAAI0ACuHgLngZVDINIPLAbRCC6IgggGzhsPQId0a5sMSWqMvbZt27a9xbz/u9gdVERmnP2151RkfFUZ0X8HbiMpUmrh+BZ7m/YDg/86tOPQQdWkrUTOnjG7YIVbpd5as2hyOHL/3hO35rurhNWK7f0jAtjz9rUDUK5SjVWytEoA0OueoNny9SMAVKrYUOsuTttvCZTREgoAZiDJDEAP7cJjYhbM0jYsphcrlMqJJuhiFxAz75CDe5LDWQrm1W2v3E94UIdX28J4cfKmg8KLFLgV/TPcf9V99zQCGpHG3rkClPCoDDcPe+YOfiu8qgQ6rzxDD9/S3HUeeeUUAUjxyu8oeBg+D2UEFMl8XOYeokQwSuj4/3fyFnoEpNwdZecAWoREmS5Pcs/P5SkokHCfd5j/+1pgyqDznGx13xGcIozztds/q/DQzvhemnkJnlHLdcS0mIgzXMzhB4KUIXK5uJ+yGizO9e7RuFul1O1mcclhUVseZpFTlx/4fmOwkSW3ePLHV4A65E55QEl2qd8/jw2VQHbOE1hYJn5HgZeUZX4J8kIbx5y86x5dpC30xUQ+aDhiy5xoPRP50G0TMtp245hTxyn6coM6bKfzgfbuUxbLlUB8k8zevKacNa+ZDGfqKWeufVMqP9GcSu+z2e10X5Vgs35QeUmgwPUBm+B6Aq+JHC8qgs14O+YjKarmvKEGOpQF/sjqO1vbfPepXiLGeQSUOXzqrDl4THP2W4rdjsz6gubcIXGNcsZe58Y1x55NUjhjKZR5PEmxXrdI6Vw0JxuyD1lz6tM0wpkMKZOzFM43psLuyK5dv3+2zfSjPUXhRGMSogehue4S2Pkx1Y0Ze0gbbN7UNlPfzhM45go0ZhRF6GAtnUMQzz//SQshyP8h+XZPvt2Xf92Tf92X7/fI9/vE+70y/P7nJL9fRNzzAApC3CMh7hu9qClxn4S4d+qFKylxr4S4/zgyUOJ+CXmP60VFyntIyPsQE5fh572myXmv0PN+o8P3qXm/4POeD0Cu1oWf983Jed/g895Krn4Fk/f/+uNkHHrI+2dQ4XUPfG5F133qn28nZde9fmFFeN0v2YL4uqf8uq/4urf4ur/4vgf5fR/i+16k9/2I73vy2veVq+i+rxjvAKXovrcYD99EJrrvL8bxTeF9jzFO3vLb9ym+71V636/4vmfpfd/S+96F9/3Lue8hpY2Xodc9su77gBW9Yd37PmTd92J23hwAS/ZH0QYite+QxsH/HYo="},
    {n:"blk",c:0,w:4,s:"data:image/webp;base64,UklGRoACAABXRUJQVlA4THQCAAAvf8AHEJVIciPJkaT6/6fZIis7kTNH5TOr11dESAAAsGyknm3btm3btm3btm3btm3jbdvfxoHbNo7E7XcXQNf/kBcIi2ygbSHeGyWWRHdRr7Ls8xl5YFj888oAmWQ98gm09ZPQXm39p/tccE4Ch+iX6tjGeJJAw6anzp6TBH8dnlA25KWfrmQiShIkyr5+OBcF+wSTZ/7SPEvgfhTB1U/5Hvvz989y5F5EamxEAdK2dQE3QeJySPg1QukWwj4z8aQog9jZUOYK6WLkTnDJ2C6tkcoKQgYdjbxyT9TUIh64lDwFSNwhclThmfrpv09QoroW8cIiYAHQvBS5/SE8Hoxxrcwg8NNXZAeUsK7QGzhWqzAzsImau5f55TviA0oQ/vMX3krkdj4zPoFKVpx+963sUK2+yUfZVxOAOyiPxjRBD7VqTpL8KLmlyK0XMDB/BfuKZoDJfltfNNxwrrSJFlzqj7hEFy4VNZBXhguR28eiptwHlupOAhVYpG94VdyMQ8Z1AnV2ARO3naoJzwoaqC6tlcjthFTqHVLAIwQHlNC/YQaonfALZcwA3OcPIQ/YC9MqHVgtrpXI7fSMOzyA0STRdYMB4g3MJNzKf/gqE/3vFfz5WN0HPeQH7CSYwF5CXYrcCgo6qfUN+R1s//ygCxuvRn/7Af2ATFUHOngMfQJjHX/K9FT6FLR6npipYewwCNquxANaitw9Vq7jmKK29Zu5PzV8QNi9b9vKO6ARDv/8xDD93fv4gynYvW3b2oNzQGuRO4G9M0YpI1hKffTFJPFI8ENNgtOQLz7bYgPl/FeiGtA+5ar6E8w/vfvqXib8ZDHy5dES"},
    {n:"citi",c:0,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACA0lEQVRYCe2VMWgUQRSGZ/UIJicELAIeB64BK0VEDMoFo5AuBJTEay0ELewEQxoF+1RBLISQQKqYC0SsLQIqJHjcQYqkFEngTBUOm0PE9fs3M+HcW49b3M794ePNvJl5b+7tzJwxmbIKZBX43yvg/WsBgiA4TYwyXIUi9ME+7MKK53nfsOmLxHl4BS34m34xsA6FVHdAwCvwFaQ9eALjUIBBGIVHsAlSE+6ksgkCnYMDkN7C4FHgwKM9DcsuUWBMjv4cSD/glhtzNvEZIMgUiy9Dg+/72gXC79P+AlX8I84vy9gk5hocMjYvX09ioUp625Lvtog5Pkhb3eb1NEaQfnijaG1q0L6rANin1v/M9j+2zXPNTTt2wzreqx9VLuowZvUkvjWYsGM72H44DzrRF62/3dTpKNZ1+A410LrkIsGs3XENq6ShaN+EGXVkQXp+NBr6Yj8Bc5JWwDywQR9zYHSoQtH+QEOkqhMx0cJf7XmVzzFjqbviNtBUliAoD6WeLSZg3AY+2XkPo/P5nqlvKuYWmJck1rP5goQXsO9At+A+DOMrYXnkQjmrjk6/dJY5A9gx2JYjsQige/4ToqriOAN/vAMuAf5624KW7y+dot/1Fri1HZaFl2ARNmAB7tk3gvMRlEAV0q88Fn29nPqHrICebM0tguaqgpmyCmQVyCrQUYHf6KfRH7VN0DoAAAAASUVORK5CYII="},
    {n:"dtcc",c:0,w:3,s:"data:image/webp;base64,UklGRs4CAABXRUJQVlA4TMICAAAvf8AHEBfkIJIkRbrsgbtH/35JA8S2jSTJyaWquve9g9i2kSQ5uVRV9753Ctq2YUNNupPH45H3/z8IgqQCUkFqht4llb3XOYfb+z2pAAQgKUAKBNQMc06RlDUDmHMKAAJAzbj3TsqUCAAA1IygZlozrRlrpgDUTFMCAPber5mmhOCT6t77AKZMdc653r2UqcI552tmIIAgVQgggL17qaZaM5uaVCGomYUwVQghgLB3PzUQwK9U4T9Iu7U3bSTN4sDyzizTMLjLzMzMzIzlLrSxpfevx7GVdPlTRP8ngP4avq3X6tG1Nw9OrfMtatTquuXGhG/D2SefG/XwSuNyxurjDz826uG1+ru4JrQfLE8tg7bApPpvQvW2Z/YFqLbiqsKiyI7RWUlES4VFN5EZIpr3Es6xxFq55bkLdiyxLLW4GgS6Cd6nINC1SJ1DB4oOnu3oQFFQLw4c1uc2kLDk8IG5YGyzxWflJNESm1ivZFnvDztFNAaHtNjwtr1ORIsh8NrwxJb1FB0uEQ1CfyvRAVhP/CMiGhXni9diXDabjTGmtOVsG+K7TtRrZowxpmRegQEIkh2mZIyZNguJjnoE5X3hew9MENE0rKd9aO/+fcG7tCy2UfYax75bFHoTzvONQg97GE9Jc8YjqFDuWbsD6C6cwt2M7/0aL3Kp9hZmZ8hxWIU7WX0az/OZ2w3H/vs5+WvaHXIPrmAv8plfmG0BKxJGwZ7mUqGCMK6YzSZdOtSC+K7ldsQj+DQSvml0VdDXyeGR0OGRjVqqFhdzO+jRfEhE45LSFD222ZIhJ3KbyBAX3nE3iGgI4nPh1lX0FB1GclvgWFKxDreIqKfC7IkU1IvD/GVObnQBHT3ag3ZXiWNMUH59b8BORInugx1L1wBuDxWABq5CMWvWGUZ8cdqvzw9RIYjWnn7W1CIaPPS4LFHNuL/3"},
    {n:"fidelity",c:0,w:3,s:"data:image/webp;base64,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"},
    {n:"franklin",c:0,w:3,s:"data:image/webp;base64,UklGRpIBAABXRUJQVlA4TIYBAAAvf8AfEA8w//M///Mf8JBzbZupV898E9u2jcp2Stupc2zbtu2/wOlOUh3bthXud629JxN1qSL6z8BtI0Ve5sNPYNIvCBoh8AnARpg9glzJWSdF3cDf+80cuTGClczKXKQsoxz7QbrOhTdghRdLQTlA93Mu+oiIv3iN8OCwsh26izWXH7EXn1EcXVh+Qnew+PgDvODyTN1A7adHeLESi4p2x2oGoqV4cQ2Lct2i+nWNmoSlAugdLhfoJSIyGhrlAEkqOb2SH0fZP4njixwgSEnk4IeVDn8klroXXYYfsmWBEFPxI1AJnSPCiPyU3ULOjuKPYiNAdd+BL3LkBuuXLO3NAZTPkUh279MdSY9vDkx+6HXZUK3pMoB5sHDC4IELtYaFRPNhAQyqupfCTqUP0OAHaETM6omUEeYBFKBxto+LnpnL1rIfAOEFX77PeE4OW7lgy36G9TKrQ1wkw+wJh5Ug/oNo6/DvkEEKy7jgI3yXCqwtuhurlimYRm6MoM70etT/DSb7AgA="},
    {n:"gs",c:0,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACRklEQVRYCe3TzUsVURjHccd3KfMN0grUSpRIUVFRCEUopEVCRCm2cqFQGERZ9A8IguDKRRaKbl24EEJbSGi6UNKsRWJYKKVgoSBRFJpdv7/xHBqCKxfangc+9zn3OTNnzjwzExXlwnQgFAql4CFuoeffxlDLw5itM07HBI7a2n9lFprEdS1CfmDyU8b3cQkl+G7qLYy1UUUqBtCK12jCFxzHXTzCO6ShE6qt4ILWijYL5pFrsMpELVmbqSfnQnf9BH5Qz2HQgeGDiv9bwe9nqBubRgl5A8nIwjkUYQdv8XcD/ImHYheVGMBJ7EGhsY0zDH7hty0E8h/GIUM3l4/5wH+G/ryyf/P+D38+4Ct0Bx+hGEUcjmEINpYYJCLTFg7Jzcz9RNj3xLMn01o9gmaoVuF5XiG104x1oTnooqXUp6hXMVZ3jmBadWjjepTLJuu/2t+IKSwiG1tIxzfW+kQ+CBa9jXZ46LP1cJlj3uBKuPlI67GBA88zvogF6M3V3WnnIyhmt9eoDTJW/QUU+jRXyJfRgFVUcWwbOaKw74AO1qf3HON4DD27XiQhmwvVk8+iCy+h0LujlpZBz/kmuhFxBDfQwM7vcWYdbkCf0R3MQKGNxHDMK7Ke5ynY0Dr90Ms6zWbtV2Xnw+bgBq5yotqoT2nQ5G1yORTP8INjUsjV2EQw1MEJjLLJneDEYePgV1DEgRlYZoF1ncTFdJeqxVGbN7UCxu+Z08b0/HOxhhNIYG6W7MJ1wHXAdcB1wHXAdcB1wHUg4g7sA7gUFp07Rc8jAAAAAElFTkSuQmCC"},
    {n:"hsbc",c:0,w:4,s:"/icons/matrix/hsbc.webp?v=274"},
    {n:"morgan-stanley",c:0,w:4,s:"/icons/matrix/morgan-stanley.webp?v=274"},
    {n:"borderless",c:0,w:6,z:1.2,s:"/icons/matrix/borderless.webp?v=276"},
    {n:"ice",c:0,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAC2UlEQVRYCe2Xv2sUQRTHb6Oi6CEqRIIgQUTtBEHUYLQQwcKAlY0pbcQ/QEHsxJBSBEsjkaRKoYKIYOxUOAsLc6AoCJGA+AtBjaDmcn6+w75hJnu7MatJiuTB997Md9689+bNzO5epbLUJZlZgGaz2QYnzIdMJ0kyPR+OS/v0FdDKlR36EN4Og9+lvbaeuAp6lBg1iyWzlYGtyq7y9IBzAf8/m4pRAxYrSsACfaUxBR6Ax2AFKLtvCtQAXeAY+AYiCSsQDoi/T7muhmTZNiU/y9zjrebnJSDbKhM1LqgiZcTmVvMmFyWgKzNFEhXpPAdFvM1F526h9mhRZTmBJVOBJgdNB1E6koWqgG6bYmVu3UIl8IXgb4F0JJmMotF/7ATPj+u4GgTueRLw2ZLMFpOHit6gej80cETX9+1hA5004FVd2bq9h/tJOyNzroCC4sWtRMHDvnlPeUtItDt8gb2Z/v2XT7qiCnoruCyt4Eg7uAKegzFwMeV3074L6uAW2Jby0bmLOj6t1g37eOlk+ALowOlatF7ZJ8ENMAw+wW9BPwHvwXmwATyEX4NGuW2j2eJaOLb4R19K2oKP4AzYATaxOn/CCXBN43Cn0Yo4hhoHR+Du0XdnSGNFZ6ANQ40L4dtQlTD+KO2agmO7mrZEtrvARrgJtIL9Akq8HUismoUJTOJYzsLgbnb6o4P1A2xP+wrAFHcDlEwdnALrgXzI9jOQ6CvJSd4Z0IQeVtAHLgE5sVOtwJaU9nwn470EdteN9jq4EXAQVOHr4CXtd+hJtLKUj1iYqLJqv/rBTOk0awa600F958l+IO2/Ro+Dm0DX4zaQ6Ba8As+A2ya03wLfgLTP8v34PQBsldJDlj12m+mfAHfgPqCVxF7UPvAdPIJ/gxbfjdoDxD8FL4AeHtkKMFBKCOIXETrI40MbtTOTmahzEZ0NMrZqaFWa466RrQROffPl/37l8dgui6/AH9GGgwXNA0a1AAAAAElFTkSuQmCC"},
    {n:"jpm",c:0,w:5,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAB00lEQVRYCe2XPUsDQRCGc9EU+fhVViKCHwgWISBaqGBhYaWtVhYWgoWFSNQqoikE/5YgiYUxl2eS3LGY3c1svCSNA292bmb2fec2uxvN5ZQWx/EB0FqLwiUltb8MogYogmcQaht+dk8WpQjUh4plxtehHzL8UFz1yLhTTLw1lCZtQCi6YNetZMkw4VJmGvaXBhKaY4vUaIjq02SGMWbRgNBdjCoaEQqODFHTzaoB4bwBkSE7cAnWJOuwLBsQiUeQF+X+Bw/b+PcSmJHJyXhBt5DjYwV0gM/K02pMznqsIC9FUfSlqEtLoC3y8J4G7M6btoEyDbTtHPYoDVTIfNqzabTd3wPpo9sZ3bXu2pBMSdtACGlQ7bwbGJzFoJYzLp73CgwuooxfKoTu/ytQr4DmtgxZ+qR2YRGvBvaA87IJvQUTdsXYcooqJntLFFdxB4I1+TUsgCbI0uSntuIhlD9W1+UN8izvN+MmeJLADEz20w66TdHqX0Q8dPFlL9xJcMq2j96DU4OlufIsnTbl+gpOnMJmApUzrZKjztbAuakx1of4EMg/FZPY7wauxwraClCuAtmxoWY2ULdxq2Mob4WqU98AcgyzOVkQLYM20NgHRavaN+wBrQATyrTIfrAAAAAASUVORK5CYII="},
    {n:"ma",c:0,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACOElEQVRYCe2VQUhVQRiF3zUKCVpEbdIoaGmECPGglEJpIUKGujKisoXQpmWLoPaKy1bVOlsooWDbhBSFRBG1aBVBWbQTzGqhr+883ruM48zcuevuD+e9mXPOzPzz35l7S6UiigoUFXBUoFKpHAV3wSuwDraBYgs8Ax32MLgr4DmQR6ExGvsS3MbfaI9x9jH3g28gK+YwnKxhMcuM/gX02Is2GESCYZT+JGgyeF/zJ4Iq0Q6++0wGf4b2DGs8Nri0qcVfgNjQ7m+BPbALBkFMFbBVYyxdWQ2ohzUh5u8XJj3v34Z5h3aHxRmyszlUTQLpOKgfHKfTIh/QVyntmIDIs5GvJHBEu79vzxToq+StHl1am0fz0b06hAdOZrU07p930N1uqZTAXwLLHt1FdyuBVpfi4T7Ct3g00RfAh4BuS2UlcMJmA31dt1MB/TSanm1snFMCe7FufFn+Q3h2c8x3WBP+yDFAL6jNgF+7VxViY1MJvI9149Pz3wj419DOB3RbWtQ17PPdEQ9/0cOLLgc0l9TTkCTJFGl9slML9C+jzTj0CbhOB++jVln7TVUktV5Xeh5On1m9dv8aul7L4v4YXFaza19muEeyRhj6LO2boP4xGqCd52P0aN/itY6+iGMgNsYx3gN3wGsQG09ci6ccs9wASxGzzeNpAs1gIcL/Fs+1dKH6rm2i3sdcpj0MdOjOgi2gK7gCpjlAc/yngf8qneugDei6HgOfwSx4ij/PQWdIEUUF/pcK/AO10r+sQj5H+wAAAABJRU5ErkJggg=="},
    {n:"nasdaq",c:0,w:3,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACjElEQVRYCb2Wv2sUURDH30aw8RcSGxu53jSCiKiVNuKPqCSxELWy919QsBH8A0TBIlaeCSaVIAEhhWKhkJCAncEiNqZQOMVgXD9z2SNzs+/NGvbWB3M7852fb97u3Auh4ZXn+RKUWstDTeYna4v4h50cs40WQOIxJ7moZir09dR0YD7Ve/DVetErvEkwDP1xCngoIZo8glHiZ06djbd/xtl9J9xZ2ukUV1NFcJL/cgpo/1MGAtxzgvxENw61odM6IPIo5K1r2j7K470HWneiTKJ7XOhXdBCwJ47fBrp92j7KYzThBBHVGPRV2WwOnDzPDK5MuuycTuh9BZe1oeHXkTvQsMIvCp+HcNLgyqTLzmogXkC7vQOjC9rQ8K+QzxpMPjtZXuGin5Ifd9GoM7ZvRr6FvGowGToHoE8G1+J7mzjegRAuWUMjf0Y+aDAZOtKVlsG12Nd+UaQKGNdehn+DfMpgIq5BhyK4hkrTr1QA/TqCh92dDiK7uKKBgpfh4nXuS5Zli9avVAAGVS/RB2xGbCDkd9CxCN6DnvUY/YwV4O1iJbu7PE+AHzoI/Hdol8GsWDp/axBof0u/shH+vjiBTxndU+SXBtPit7D5aZdy9gF43NZeEf5EUcANo7uO7P35TPYlUoI9Au/81/jO3ha+0s6NgpepKHG8v9fS21/4bj3YwX5I/ihS69GWdfcY5grDFzzlCFJLOrNb+0Z5jKSN3jqnHTE8Cj2HrkJe+x9ovyRPkGkotf7LDaaTyg4+nax8EAoSnHeSi+rmIPIkY5Cgd7OJ1fEbcG/Subai+gbzunYOJ8AQN5jj6PXNxppXj1DrsQ1ZBog3fCRU9RDZRsKSKef7MXbwBbZQchgw8BeEeShK1aCT6QAAAABJRU5ErkJggg=="},
    {n:"nyse",c:0,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACp0lEQVRYCe2XTWiPcRzA//9tpo0RSVleUty4qN3khFzmxBRxWCk3dkFuDg47KLWLk1k5oDYX5SUhrylDUi4obSKZ5iU0tsfn8/y/v3ks5bgdnm999n39/Z7v//u89FulMhMkq8mv0JfsCftN+Kr7EXtRiD2N2INCbAi7CvcKseGouxwxrzNhTKmrqen7WzZQTqCcQDmBcgLlBMoJTPsEGuIk4AFBqqENp1iyk06HiaIu2v+rS7XWVVIDTiJNoynPVCpzC7HmiM0pxLQVc2mta5RibGpdqs0LUwMbc4+TGHok7K3oRrDjLxyjXLgdZoPyPWKd2POhHr6Bsg9awLVjUdeFvRBmoNDhLTgLjVAPDeAhsifs0+hrsBpm+RPQnXAb9oZ/GPsJPIJuWAXutRtugIdX84/Vf42BQJIDsVkTgXEYDH9bFFwMfwn+Z/gBi8BmlA/wNreyrC9qj4b/HD0INvjQ3KQQ+AmK97oV7HwUrqci7D5QNsCJ3MqyDvPYTtBmfBb0d8GasA9iexRfrv9PIak8AxsZsAj9FW6GXYe9GPyFI6Ck/x/8P+B4Hsmy8+gtrkmCbwPKTlgHbdCa8rkmoJyEVNyO/RruWID2bVCnUdvESvDiNrcArkCSVxjrY82RFCzobnOTEgkfQjcbgmH4BPktQPtQerFm8NlIU/JW+fHKBXsznAHlpUF0+lGHsDvASaytrfjzIfL9b6xWqxMk92P3R8FYKiRHqvYGELPOC9cRt6E27KXYF9BX8eeh20FxD/fvJf/eQFHSh8jNLKpQNMAG5zB36E8Ra/wgNVBHWT4V1x6DTfh30SPgxdMD7JfQmlPkR8MeZ/0e7JqQ+Ai9emh3XgHvII06bxS/BXwQ+6I23Rofrn5I4hSWRU0Xtvv7lkyKuRkhvwFJWhwK2GKG3gAAAABJRU5ErkJggg=="},
    {n:"pypl",c:0,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAEmElEQVRYCdWXTWjcRRTAdzfZbDabiERJJEaQJhghMVQimFu8eRARxEDxKkiF3oTqyRy8qHgQ8SSiiKJ48KAe1IPizYom0kphMRi1aUVCix5C091sdv39Zv8TdrMfrd314IP5vzfvvXnfM5ukUv89DOIi3cnNUUHYT05Ojuzs7LxYq9UWOVhjZToZaODX0ul0KZPJXASfHxwc/H5+fv6H9fX1/URH29rqCkabymazJ0Aq3/QiCAMqEsizKysrwS72jiYMqxliAK/CrrCuJVj6RpcZu6qskABV+Xp8fPwW9layaxCh1Bz4Mjms05uuAmcPWCVtDAwMvAcWBuqo9Rsim52dzVG6C4h1rIFeAvCslahg8yCXy81AC21nKjCHhobmUIiZH5YRXi+BBHvYfhw7JhpnoimS2JsFFCyT2UceZM9gAtqLOBhsLEVwxtW7P3GlYr9AP2lsb05PT+ehHdKW5MJwMICfIdR5bIN0L8tKVpmBbQJIM4xvsN6EJxwWIESztLSURfEXBDrsxwBqx2y9BS+BU9j/3T3z8Jj7CCESpvQYCuEAgn4MoEl4A0qjo6O34/QR6JAclf4kOheH8qPwKLQK/Si/zss65DU8BZ3C6SYoJAZ/I/D8AHEgeh3A2DoTyOAki9NXKpWKfX+rWq3OwlcmlOuo/o0D+DHbThUwI9vTbmm0qWU4v0hFn4CfwvnroGjX81V4HygTQvarq6sDHCqyj1mI42oy3sCP8oA5f4WMP+fH7El/gMbGxu5h/02iH9tqADV0ngIH5w5gdXh4+K5SqbTJVcmpkMhAdRpDG6x3KONlMhtSAFTYX4V/hXN/zM3N/Um501tbW0v7+/snkZ2Ar57Vs8ox0N1CoTCzu7t72ex9FivcgIfL5fIXHDDbeD+l0zi4tLCwcG+xWLwTHV9KDWYoo49LAflt4GOs+1jHWbcijxCdu7fvQwzl8wT6MnR4krNKSOo0yAhDiRppHL3P3im+lPBDJl1oyx3nwiSkg11sfLq2tmaCViS0P0SBkw9htA2AQ6cWFxcL9NifVg0dXWbm3w5H5bHv/nHiY/S2v7bo6Tg4B9c3KPwEbQCWLGYYaAZmKZ/PP9hGHvU6YuyWSeArKuwbE+HQudnXRkZG7tjb25tJpFGoUe9yeWpq6vz29vbJRN44IwkrvPXfsbmKvu/+39AXmIVz9PsMc/MzS11LH4N1XwcG8CEOKWjJnui9mr7hH4HUaZkRnLygThcwKXveAmHaDw4OnF6FZhch0PB/lEEAxxNBvCFufTscYH9BdeJAxwGzuq6Ytcm1QDCGE//8jpPbhHFwZnl5OY/O3cnpxhZJ/8WM/AY2A88auM6incakYLcBnJyFrYGmBb/m8DmE0sgbW6QDp/tbsBADq+9u8BuuIH0+TRse4IzRxpJhO52emJg4ywA+3dCiUDX0DMi34RxnJe2xQfUfuL/vYtXh867HN2AP2hf0GbAQkqmT//5r9HFoInagsr5awK/QTe1xT4Fs0TK00HbK66LO3+v1zbfef9We86ZgxiA8EzCV2eBNf429rZP3/4PrVSBm1K2/PQ3eP+K8aOXcfaCmAAAAAElFTkSuQmCC"},
    {n:"stripe",c:0,w:4,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACZklEQVRYCbWWT0gXQRTH2xQDQVEwElKRQEGxQ9CllEIyL3rqoOihu+hFTx4KunUoOgbdfh4tBC928CQUIaYHFdQMPaiY+O8iKqLy6/OMhZ3dGXd3ZnvwYXfevO97b//M7ng3Ulg+n79P+HN4DPVwF0phHw7gDyzBAnzzPG+Vo7tRuAdmIa3NIxiGOqsuEJbAJLjarqmBQtME/iL4Ci3XxCSd+mUKvGma4JLfMpdFcSmxbKqjbYDijQiGTCILf7oGKNBtUeQ6yYpp0vQOtJkEAb8svUHYgkqohgfwCGohaLI0kxuPYDvBa99uyoi2Ad7BLpwS55litX5EZxBnHVqx6iwiSZI4VYVoL6468+vQoCozGpF4IUEDEnIJn0A+0dkZCT9AWvuJoB9KnDshSVPa6oH4E84/Qq1TIyTIBZLanJ4iGnBpopAE4zaVQ5ovNHHLthFp4nMooc0wZ9vAlY6KT8H1t/zMqQkR04S8nKNgY5PODfgJqC6NvIckn2y/2QtOyvwcWR0LSPoazv0qMcfWrAoreSjaEVPYn+5VhAxMG5JOFGPQHBboxux+J/Abt10BTeT3r20AQRO8gO80sQjyiS0OJFJOmbuNo0px6gc7Ybf2P03CEQJfhoLPGc/DDPyGDTgEKf4GZBsXZzXcrc24IFluc5C1abdlpkfwP/7zY7orjzwCLvsegWu6YAefPPt6bv9ROIfuDmR99ccU7dIVDzdzNZY7ALIEszDZWSV5OaO9iBBewQ+QrVcaWyK4j6wF0cyqJ/IOqNP/RiSTbdYTaIWHcAcqoBxkKW6DLM1pmOJ2z3FMZH8BsQ/1AQLVU5cAAAAASUVORK5CYII="},
    {n:"ubs",c:0,w:3,s:"data:image/webp;base64,UklGRlQEAABXRUJQVlA4TEgEAAAvf8AHEB/HuG3bQJXf3X/fnpXgRiCTtsVL75FJ2+Kl9wykbYvf7Arbtm26h+3ojrPd/YNzh+zze6om7Tfp/q0QHJTqS1pu8126xTcIUlrAvtQMkAJKASDpUkAZ9pt0qUEASu35BNC1utRDAKRmhvleFEO4QOrB6AC0bms7JElPKjIyy+2ybdu2bdu27bZt27Ztd38/JSKy5yJGdxH9nwD8LyqmlWmKlilLWARyuUwuByhlGS2l5UoyWvIHsuU62iuV+MXcKSItLz0izF7A0A6Mi48K1BTbhkVm5CYGefsFRsd6rODS9gyJiknMzAizkvBIYFTXqZfnBxtjpAAkthWL28ZqrFXCG8YvPd5fl1FSO3NgY4kBm25+b1NBSl7H9gNDZjyirR17mzwtddQFU826f0eTuyq03FrfkSM+RlZ2adueXW5SZ+i3zVc6megbOtRfeJLCI8DyY9+vOIM7fTAMzJgHP1aDGX+bnPViZF8f1QdTo/trI6/onyQ3vBXIG4uTABCkPiHrlRirtpCn1eqA9uLHVLA7XaznFeOT5LqvAgUTCTIAkownZIMag+5883FMH/A/+9abQ3V9Ka8YniTXvRXIH4+VAhClPyEbVBhKHe8/9WkBCdfeZAvZJLm+vGJ0SrGCsRiKS5WxbPXvu8k0EHz8xyZ/dRYoU7xieJJc9/ozccYTsp5i+J39tNoEgPE0eTWXaa9Jg3cZnn/NLgNKY4VDy5E1wSIA4oybv1+fnKoMNZTx3GgUQ5L5hJxIco3N6lozEkKDadBx6dvvl+c2d6Wa8pCXAoVjHE/JmZKwwrqRxYEETRZY1O69+/H7l4cHWxyFfw8HAk08/GObNm6us2SBbmTb1isffny5Nm7KLyfIDW8FisYiJYysp2SjBgCpz5onV9s1WSAxDa+aOfaKvM6j+MTgOLnpp0DxWDjXOhkA0CkXf10LZgNEy11z1r8hi/58oneU3ApUoGQ8lGujGgMr15Jf5QCEDABLQrd8uTHFJzqHye1QBSqngkUAqOynZIMKi3iUkE4pTO04QOc9+3mTT1btI3fjRVz1s4ECRo4CGPz9q59CcpkKB9xvk3t8ojH//UWdnGt4gzkA0LlPyQY1FqVpQlqApllLLsvnjwf4RFxyn+y25dDaOiVhiLOfkg1KLAHHyIskoPFQhRpH2OfNpnwCs03kdZ0ai27D+gywJj/6sUbAsFvz8+OkCZBx9nggm97wnSLwqiDp2OszbeEuDo4e5RNF2gwdz84P5Ii3sY1T9MiNB/NeYsB27esN4Tb6eoY2FRu6jfgFGjFzp4+uG2hv7+nO0gEAeXTDxMWHe2ozyxrGd26oc6IAyFL2Hl9ozkvLre2tNAHfKjsml1YWZyeHu2qBKbYPjUjLivP39A2IiPbSEYK5zD+zICc9KTbcxxA8LFLT1NFcKgUnpUxTEoqWSSkxFKWW6hgaaKrg712A/1IB"},
    {n:"visa",c:0,w:5,s:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAACGklEQVRYCe2TS0hWURSF/1uS0otCUCIIkiCCgh5qUA0UbCQ1qEFIgyBHSg1qYDMREmfhTIRqEEQ0CELQUZJESBQUWEjOKqjwAYZFRg/6+/bf2pfdH0KIs86Bddfae+2z72HfcwuFtNIE0gTSBNIEVnACxWJxHTgA6v65LcUnwDXgaxHRFhsQP5Q5Q34NekrxPatDbwE3lXOaR+z3Puh6MCPzO/lK90qMcQh8VcF9N4l3KWd0GWwKcS96PfADBaskq0OfkTLzoHs5UzCsonlPEvcr9wPeCo4qNjoGWkN8iX2rifeA9tCjLtR8kz5n/iovEo+KN1O0DV0Fzih3N8uyd+h48sfEtfKNmtm3g7oX4HrId0o/gx9JNwT/t2TzXp3O6Dg4HeImqyL2Kb1WbFP5FOq+oPvM06ok/iD/AnxF+qUXRM4w51TQDT+QnvQi4lnlboec3ZNbwO+QlZw3H263gGWfsBacskBro/fIGeOOzOdeBXeo2faQu5hvksDbB/wQT7RnQnum4R4wqNioubyHnbgjFJhcAGvVLJ7+CPkNIL8TaPuEn4GtIXC4pJZ+dFX8dYJCYawsd4MLtaicv6xI/BRYPEZ/2Tn9RA2A0k2HP4J+4OskYjdo9MQfTMP34dA73SQ3rry93KZ1FrxVzmkS0QJqgP9yV72H9tmnsPUmi8Yytf339ktZr1dMa3qZfdK2NIE0gTSB/3QCvwARnNjNeA4e3wAAAABJRU5ErkJggg=="},
    {n:"kalshi",c:0,w:4,z:0.72,s:"data:image/webp;base64,UklGRjgEAABXRUJQVlA4TCsEAAAv/8APEJegoG0bxvxJtzsg5n/+CbJt8U+wJpbBRzggHAEAQJZsO3UrHYEwtO0A0vxnm1wk8KN/I/o/AXAktsIxsBmLExsJS0cej1gxlqaqdQtYltXqQF2tdTVWI69VdbyuUPTPzvdR1NrozRw6ut1FVHPCi9l0WOJNiGnHm1HjcQ8ftXa8mWRRuoOkVomvppj4BqibdvxnnWr94D8rqVXCy4mWjssFMSW8HIhhv95HrQdeTxoTulxWa6P3g21EAq5G3cR4Qdj6HzXiclWtBa8I2M6u7YhY1y+rteItre8WxSJxAjFz+bkxx/UC81a+N+a4DHEqpZSNw401tSZ4x72rUY60UtybjsuZVuBTB9s29q+Ob5fKaj3gS3tT136ERXJVz77TpNTU2NJI1fFypahWIRfKov4bLZCaess2g4o6ZrqhZmJ4UtOpjaYVnfmZcKhruZ9drTs8WWcLTfro3OZW1Xm/myiWRh4s07SFKR+d/XEq6i3hZrpaAxyp6YJlRtL52aWp/3EvRa0ZnlWXZL+gC3bymBrvJKn1A8+oa55+u63VbtK82HYnzSLB5bTVvZRTTEpu3VATvrdu6IvVG/moNcIzqlESfodmyV6s4zv+PsaU1lK6D/MB12KQgL/pYzi98ljFIMlY8pHCBBAfNr6rRj67gTHKBvU6xsoIylhx6Ql/ZlO5q+5Ux06MW4JT9Ytjp0vE4PEQevrIWJnCKwiNOJp2jNJTaHTh8TAW1jjHtPFCYQiP0clj5rFGMaj2nVfBeL0rMWlZiHLTNZLpu9e6b3FWe4bNJnGByLyV2tXRK7j87ufGM+oz4GPSPieWo+lEL5x+37LTw0WbZjfKXWe75Tmq2sKjodgk+vAhOt8NbZZqfjSISQ8P+uiSfjRPj0dLNs22JHotRJmmx5PhYxOyJF11AuJnmsYnY5vuhqT+IssAW5/VngzFpmmIulM7NkJdCOBDpmh6Muq2RiO7mlthjvi5FkC8Hc2vPBmSTfcRNcoRMLrab857bR7no+G0afgrWhLGr/GTtmbqzxbF1uiPYigwynUAcDfos6HYNP9xGoKBdAXi4TgEkjdBYpPwqxpg5CVYh2UM9U2AbVp9guFcIo5pfC84bZpc8ljWJWDIE+rjBQcJX6dB4kjRRWRMeYR1fH88bDY9vrJBJf+i0nWV3aDlD9rVWJ6Pmk03AMGiKmcpR1VXr2BROUsp5RS1hucDO3QAsM30wmHxPvACcNp0B1CuF2QJegVBbBoBapdDWqHgFaA4VADbhF4XwT7vg5eAbtMMYHNrtAzSrAOvITpIAJDFpxLWQawzZMN7QLVpBQBuDn0HVgJy85Ij4E2Q2DThe2sGKYTVAD49WiYMPgKx1YbA9vADiGmv8tXOzISfgccJANgII3Eqtf5qdc8cMR54PBgCj4evyOPBBQA="},
    {n:"polymarket",c:1,w:4,s:"data:image/webp;base64,UklGRr4EAABXRUJQVlA4TLIEAAAv/8APEJ+goG0bxvxJtzsg5n/+CbJt8U+wJpbBRzggHOEIAODZti1JkiRJutA/A0ABA4D7/1/7oEFEokU80xXR/wnAfyG03v7hTMidHPaP5lLl3P/BTCidm38uJ5WH6S9lYxk8lz+Tz437PQf8nWy8BrfHFS2Av1LIjfsteyy/RxQRsd/Ni4j4D7Dp4v4o0WL3e1SS9N9NSFLeZkvnfhWH0wcqt8eVzG82uNtLMLjxLSSH/GRc1+Rw84vIan6nSpJ+q4nHF2D54UiOK9oPEExtGorhp9Mthw8BTFftN2tjQ1/JfgSColkZnyR58zobRLyZGS8S7ImPIsHd4JK4h1wUCfY2Dydth2TPwbwPEz+zhfPLn3WSTItMkhdQSRK+cloMYC9Oq9uwZXDaZeFJUlwlWQ/cIMlmZrFz2sKExx4ATCx9Q9fk3lZ3EnfzUVZ10VVcRK6biYPL4RaRu83slMEz00hyWGjbuFke0C7VHZK9RPOmtpG5X06soplYkhxYbDfu9lniftuZ75lGksNBm8Ht8gwAE3Lf0O09hqtAPYrkrigHaCpOkio7LUudkBxFrqEYlaWu0YeiGB+pJDkcpo36EmmKARCRroqInGmbrp3pO7IaANBVMQBQFO1BUtekqbAaHgDc7P8GgGmqqKz+QYuqWyV673cKdcQ0kuRwABBVh67KA7hHh9xeZjN1ARBJshtMq8oHRtEAMCQ5sIqYFtUNdFBVVeUnRnEnYr4o1BHzrjym/0jSvQSAjdcbep02TocBcKmIuVP9AJcKAKLKG34mKmOuhto/KTiI1AlzR5IN86DkNTZe4w2HwwHAUGaBTpL2IKoC4FLuJtninvHen8hBpS5YJpUXVl3vCLlz+y3dQZNkx7oqf2AGyQFgkOx4kU2Vu7dNO9ZZ9bpU9TmXLh6/44qYelU3yh0oJBkQSDK/SHj4DOOqqsOHTCid+02eKn7usD6SW4IqKMq9p/BVw36ES5X7vQQDPCU4tyf1FgySHZ1kw2uEJIc4AHgD216r2/+7ycQyuF+Tw/R9UNxoyh1lkowkmd7Tlcf0oeYGScosq4TzEy+N+z0HbH5AU25hqHHk1NS+xpJkwxuaQVD0k6iup06vZLH/AVmVhajrDH3R8Bqv6isEwD/VjbKKbuXMQy17nH+AVQwTN5S/IS3ie5waZlKeM50k/ylU1cwsjGYml4oH44oWt34AsqJ4OBkkWXGDXZj3YJBkCzCh8jl4xaic4hAPGyrJ4ZSoFrxfNY/bP8E0tTnsHWiTCy8Ste8eQVbDAkBUu8OqoE5rcl8Dpm0Nh1viJL4JbWeo8IxpJNkU4l53mPZF3SDZSzDfASZvFIN7jBrmVSYvRhBVnoFTFAVfN4rB3I0ZQu4buol7TRQRcTcBNl211pos1lFExK7QSBaso4iInTkREb8QPQFsrrVeycCKiEQAVkTEr7yIiJ8hiJ4ATmqt9UoWmybVWmsGAJuuHZLjivYVH+5IMmz8gD63Dd2y/3KF5MCPaeM1NkiOK9nv5Uiy/BraS9vQPYcvZIMUavuLADCxjI3ll/GcZ/ywLtWD+JWa+WUAmFD6hv9GzeAHdun6SlZqzQE/c8iNDf9hFw=="},
    {n:"rndr",c:1,w:3,s:"data:image/webp;base64,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"},
    {n:"kraken",c:1,w:4,s:"data:image/webp;base64,UklGRmIBAABXRUJQVlA4TFUBAAAvH8AHEJU4jiTJUfy34kytx6zEgkaLAmLCBgyKAACkqzqb3cYRvEXzBmz2km0dgN/GAWy72Y5vAjIKVPDCDDwBIBzBNCSAnqUghgMHYQ4kC6DsJIwDfAKQsOY0XABzCEhwBsBC+ATKAODh0qVwAvAerLr41wGXy8HaAPR9HTwDvEDcjZBLcgyCtx3wfU7A4lYwJLC4B6YCUDcDAmS7Hp9dEICxXTABpwX+IAHVDvSgBL8tGD/Df4FNeC7AScDVAHUClgakEuAXuFGFlST5qnCRJHcV/o5BSW4qvBeolYd6KzCvwmWSQMMuVAuc9WBW/Rco9aBeHj1Y6EG1B7UC5z2YU+GqPE/st+M6AfMLnhPnHlR7UC0XAPRV7uplAO5UiBTYUKFfoKfCVoGkCj/QUUFUIKSCoYBVhUYBlfoEMtzCG9jShAq8gztNCMIH7AG2BLoAwA6QAQA="},
    {n:"bnymellon",c:0,w:3,s:"data:image/webp;base64,UklGRs4CAABXRUJQVlA4TMECAAAvP8APEDXAjmy7baMGspxz7L/EnTEgCAA/nd6LkP78nyHJQ5qq6X69tm3bZi0qnXR+67Pxjp101vaebdvuVFJZnW/NejNgIEmKk901UXgRxDfEdwAFcloaaYcigTd4WcmlgpDFdYMWBFdNKhEKQES/SstJOaoWyQCpiM8lXuoCELURmShAJXNYRorQoogMKlAp7MG8AD5kUOHEnSqX+x5Nl2TqlxoGCkDFfciTcUCo2iaR0pOSycHIXdPJpdUTFSjiNFNSqchZAPl8DmhlusDcp2GH1KJxxkdWiSDJPhCuK3qWpjcYiQJZn3JZTJfYzWF+syRd2A5NEf8TnwygqHgckR22LDBw04GlVRYfAKcpXdXhD4JXNQ2vCQw3XTEwPwjrzsq4xRPCn4IkCiQcUBkDIPzATDeIY7glFtOO8xnFHiEoFakS71VyiaW2tg1pnfAEeZfHdI1RyVtUOhDihyWG6R5i4TdhSb+4CzwU/1GohDCHmW7yTE9WWXy1YzQY7WWv3foN5myl6/Ifzf24xHoIzPQoIywQSRN3jTvBwYIf48Cx8JvFqtNcey/PkmfWGaP3fhBWjUge+cReYCMsTXX15yXKodtXk7AotIPdNN7dCYsfTghco/73Kc6aRKv1kGzJAqOrS8K6q3KHvsqKnKXRjWnnXzXvDguGdwScFq5j8SbaBbquSD3OglLA1kgT4TejHfAWdIk+oNHq4yxdV2EaSbnlJT6esOBYvVW2CPdVvsnDSX+N9ejSXiG0h0ldJfm3CLVgHSsJjztSEn4YdhiprrUxnKVJ+HL4kOlEWDUpdU4BkOxs64iqD7qMJ2llCv6UWYU0TWrXFWdEM+i+MZETy4bjBtvQTtdjLBwSeZKY023aM4w4S1M09wfg3mxEe+MuDDprBPDfocllF221aCQdkTD/x4GDycahh8p9ZfpWYwAA"},
    {n:"frbny",c:0,w:3,s:"data:image/webp;base64,UklGRs4AAABXRUJQVlA4TMIAAAAvH8AHEHVAciRJUvT/VxtbVmUDM+dErYAINwEAIE0BPicBNdzhdMvgEGP2LYhvr1sD948ANgHzT6Q5KrWbyi9lSaFtlSwQ4iuAzebn+wumMg9jGn8xqvwDqJCpgFrvKpnaZqpJOlAJ8hibZA5BJ8l5hM3dHIDLQ0yfzaNpI6TEdtlU00TKIr7HecWmhZJlQoflmmmHgdUsWuts+Ac4jWf8KjMtvYMR44oQXy5kBy7w02KqEavSeApnFWHosePyQcw/EQ=="},
    {n:"tally",c:1,w:4,s:"data:image/webp;base64,UklGRngCAABXRUJQVlA4TGsCAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAAASZNupG0lgDIQEg/a/3LQFkfR6/lMR/Yfgto0kSa65Z7aviraq+weklWNyi4ScJzPPGoDp/M7I6DBfCR3mV8SkspRHgCFWaR+nLrVZUG6TuUn7OA/pyTghKLws9jqlJ/2A6GvrYg9NXEaLOH29S8Ue5WXUgFNrL7EA5GVk5195sZQqFsB7GX49mMeVPi/2UJn9evC9T3vcLXZxGc2vB981JesmrIodwINCTe0VO4QH92rquBX7px50hKSbZbFjeJB5d1PKZNbwoBcWuhGLXcWD/uCZ0TzIGxn6HvSGjQddYeVBT9h50A+WHvSCrQd9YO1BD2h5sO170AEOPGiOpgfzvgeNceJBU7Q9uD9PtMSPB+2w8CBte9AKXx60wZsHLfDmwdMAdx5UaI31c+l68PqcMFb48yAptMoWeSh4MN/Qn+878mDTQO4/Bhnnpx5MOuz0HxcePHRZ9x8XHryUEfuPyTI2PXhos+g/PjyY9JH7j60HmyHi/zNTDwYNvHtwKODWg9ftcoUPiNJl0IovKEx9ns4gAwP0vw+JHZovOQdzh4YolwAOETlkNnQqxQbOl3kiNLd54iapIyCcZFtz3yEXYUCh7UF0kHvEk2x7EBBEacAinmQDJYnzREy4x9U8saKxOuWenpUA4SlvLCTMvwjUFtFhrgEdngUd5gLPE57+v2kaPHGiQ8dAhyhPdChUJYpfiGL79LyLePL1QU6T+i5tcd6n9BbIbfJYIu2Qi0BS54pbzhIIJaEtgEzsIqBJQx2XHlTGrwczISc2e78SAA=="},
    {n:"snapshot",c:1,w:4,s:"data:image/webp;base64,UklGRqQCAABXRUJQVlA4TJgCAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAAC0JNmqalsDEERcExj9b+9BnM557uMrov8TgPdjrrdMkgKHQ2mDf1YRj1pF+yvl5vpr6bwnv7gv1smn76Rr8Ku7YuPGF0Lp/PCeULl1W6iTn96SBzWdkx/fEH7cvecY/PyzNKgoXDTwUeGLG9KgPRc1Fdr4oFHTRYMaNTUa1Kip0aCLmhoNKtTUaFCipkqDwtCUadGPiuK0KFNTp0FhaKq0qFJRnBZFahJa1DQdtChSk5hUNR00aWoSkwoVJZp0a2omBWqaJhVNmSY1Tc2moWmYFKko0eSs6bSpamo23ZrEJtFEm6eibtT/qQWKZWW2EvCqfSRnO5wj2cs+cYIcxTtSjj3VEfIKO4orHGlD8oU8n2E6w/bs9oY9PDndYQ8Poj/sYQ3dH/awdjrE31rwiNcSmkfMS9GlGVcgHlGWkks8V9BcmmElTo/YVnC6xLiC7lJbitMjxhUUl64lXB7NNfwcYlkL3aF7DaH7w7CG0P3JDxDEnfYEaN6MZyjOMDxD6r4cG4DqSt2CKI5ce4BD3JBdwCHeAfGaHsw3AORrmMeXAMRcZZgmSgfJKYqnpn/9u1FdkRglim6bhqZqk2gqNlVNyaasCTYFRWJTh6Jq06Up2ZQUDZg0oOiyqWpKNkVFHSbdUFRsOhQNmCRQVGw6FA2Y9IOibNKMigQmndAzo0kCRScsmlGRwKQMPSOYVKFnJljUoKjAoh8UFVjUg6ICi1qAngKLGh6+MgssOqFnJBg0D+iRAIN+AWrmiY3fGxk7d0mEPbMGqBkZez/WIjbvGAW7vzRqwPZnvWD/Z2bLePPBuBLe/Ea/Ml5ekZrwsrIhUs8j4H0hu9y1JCgE"},
    {n:"vantage-bank",c:0,w:6,s:"data:image/webp;base64,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"},
    {n:"custodia",c:0,w:6,s:"data:image/webp;base64,UklGRiQEAABXRUJQVlA4TBgEAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAADebtuqatu2rcxDpGIDSv7/P5eHSsExxpyfIvo/AfgP2RwxF5KSf/6DTCicLuZjTOLt+i2RT54f4iofzd8R+PB3JD59fYM7Mh8Pu7Phl/mu2ZkJF5+uMsrY95H5eLLgOGwrCB/PFvAjwaZ95fMBAOIoberH58WhzaNsduQqnxeHOxS/n8AXs0E/TZC/3fz4uCSL8THFYreS+GjOMTjM5ylK2Ejh7et0eNSkKfIyuyi8mQ+86GWK4vfwx/k/i3dNmiJ/O0icLg7vuzrFYtVFTkesGacoQdnBWXFY1ZUZ8jKaHGeLwcKnzFC8HiMzCWubvxkyqvnjZMLyXmZYjI7AyQSFJs1QnAbLyQSdrk6QQUGZ+IPaOMO03MlxgWJXJljMWoZjMZqAc4LVLJUnHJS7MqK4hTzHAfp/I4pdp47+sEMnA1azSuBQzBZg8oB5FRl57PI3YFwjcvjDos7b1xAGYpaQgWBNk0nG1+B7TCtEDv0aTtja1+B7dQUZZCzp2c/vIXZo3wscmiWsDPh7zy9TBxFLZk4m89avI3jdsy9Y8uC0XPHwffOEZTe/lwdhjdKIy515Se5W7p2vWfYFS1q2B0y5R7L4ucS+ee03CGv4pgIw+QkyTZjEfsLr0hMsxOIAnPUJFtuzhUP7mmc/LGI65A8AXMzlFsU1h3D4w+upJ1g19lgM5l2sPYoFEscV77Mfl8Gvx+rmAJzSYUXiWNx7x8CsA5c7FHcHtnRYORnwfupdWPrsUNwdmNKZDVhQen4tuNqwmjsw5UbAgo7ditVNaVhuwU7JgRVjLy4HUxr+buGaKBZLlp5dD6Y0PG65gZxYlN0CjaY21dyBKyRzwKq+d6qAbZhurR57RgfOhk5X7lRozc2li92oxjb0mkzPqUFsLk2+B71GSNIqip2sCLFJilInarKNKModrwmJJIMedqHaN1lZ1YVKkkbXpexsghbXicpcc2nxnUMZCsmqy2s7SdKpgnbfRCXHHiAks5K4iYukKAmbCCTpdPim6vPNqSjrQ5M+LZPMOlxTNxBJUgca5pwzh9mr8I1TdNdqcE3QUZ6IGtD8dBxPnCoyyawDR71nVUSSRcl8aCpUHiS5AWmiDt94dYGt0QEhxaiTJkGpuy4H7ZGt1bJDwzbhu/865rs824jvro2Y74psAz7bsq347tJx33WyTfhsw1bMd5XOgcWdn3a6TrYS2yvf5rLlNGosdylRS9oGWYyOayMsRoXfCZMK+CvrlwG9ij363MufBaQOzXcZ6fjvwtWJH5a+zkjn+K7Erv0ql9kt+Ew/G+OvchiUWD95xNk8K1w0Y+3M7YpZ6+R2q8PacTvJYHEre0kW6xs/GRdO+dHo8X+T"},
    {n:"maple",c:1,w:4,s:"data:image/webp;base64,UklGRhwFAABXRUJQVlA4TBAFAAAv/8APEJ+goG0bxvxJd5fD/M8/QbYt3glegkmaajsGZfDEsfMAAM+2bceRAEnSfegIGqgw4N3//1o+NDShmJiZ+yCi/xOA/2dZgjvO8MvdJZz19L8cAHdoK+6XA5DJHn86+Eb2+MsBhWSVqZDH8kwep7dw0X0pJJIMUxynRzLHb+CP0kmGb4VIkscEjlF/REcZn6+0vxcOkjwmkAeMD0QOT7xg+H6oJOknMKoP1BFe8fx+4VZ3MGxzfBf5fmgkueVvW3kZ/BtQb2EH3Sbpv1PelPlrOO7ohro9nWT/KaohC9Vg2hJJMv0ShfeOhdyNLjsqyR72SMg5B3nIp5yD/Au4mHMO7hu4P5pp6TAYNziSTDtcvmjXw90OkgAa7ZucnWY95BF3Ntr9jC8nR6fZZMmp0TaUG44lOZWzegBerXMmKyf12Ccn5//8i/nSaavDEk6DbkmUZEZeicrVJo0W6kAqF69dSWlqVYOaXiqWxnH32OCtaymTpF+KSjOHICF2klSOZFC4XPck3jV5AL7cyPQ6/ihVOVsEO9AMykojWbESlfc/B1MyxzdYiaQeQeDCZbHuiLx3BzsZDG8hIeWrVq62iNVBsvJCJMm44pT3IhgfW5SsDnboBtOa6E0dxtno8kEp53zVe+feGmFKWEMzdKGQ7LJSeG+C2bKDrIKx64au/YP3iEmpN6YPqny0Jw/b9x3ZYJpyJJmwEGkGTLst3WE2GswrTm8d04fR30ivJBgnJTagGzqVSaqsFKNgMe84MH8ZunLxnuZg0L1MzQHTrpFtSzEYJkRJZiw4mmElbGhYDAb9QjewWI3jHbReOQXBqpwkGbeI1SYOkvQrhyUr0LVzBc3Ic4H3vuf6HB/ueNAV3k9swWXQjSrJgpVsVCxfa36pGnUuGzUsFqN9zsMhd5oFm7z1N4gk6ZeqkdfyUsdy3lGN3S8U4qkcntiFy6BYhWTFUjPSc3UtGe0rhRBy5WyL2BetbHiSjGs0wwcEgzta3ftZEoZHLrVztZ+CB9CMbpwkFV8g4135dE2wQ9yUDR4ApJPMG/TD9KtpzQ7DQ8MmWA1AIqluQzXy2vlcNuqO6zv0kiMm/R8pu06DHigkCzYUo6z158qOYujLaT1zDoJpOZRs2CVWgSNJvyMbfcnxuWqUuWTQrYUoH3RdeTIGj41yKEmGbfgzOhLJP+xIBv1KWqOsiBpxTtQoaxe1fM7j4VTeT+xzBsNFMm0RNfJK35BWEk3M4TIoK55kf6eYO+0TD6Ab/yTZsAWnoW4ucUNbaUZZidY/VyrJ/DoulqocH3gkGPdjkzdYp7zuYJw7aMoKmsE8d5GkvIeElGvtnK4ez0AHKptwGiwycp1busx4NQ4seTVYZSSVJDM+14cQYs4513vjxhaxvHYMTuySZrAF6+hk28EmI6+8N6zhsKjF31zpJKnyQZUPl4CNaxi4HXKDV4OsNefaSarfwh4NOZX3JjtQLJJaq9IOeKkrOuw8b+qnsnFi1qt1GfBqTSZYcaaQZK/lqp1mE5jByhbO0aQGvNF1BMHeRLP7GTHCjCiHpwHX5jRgoH5CMhdPgenUYrQQdaU5vEurOXo8GDhsMygkK2YbJ7MBRJ04BSO2CcDXmT/BsHGozgKyzvSAD095mEIIgn9BF8ZTEkJwU2HWDwB/VrLXBDMMpwDJVcl6RsyGSRkBLtdO9utw+AVnfvX/L8j9bqfV3a8WOOzyo9URrx/tKwI="},
    {n:"hazel-network",c:0,w:6,s:"data:image/webp;base64,UklGRowCAABXRUJQVlA4TH8CAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAACwZFsJI4ESJWZQ3v6X24mttvmeiP5PAP0bPenB75YB1BxfLOK25fBW1G4AlPhS6QkweSXyDqCEN0pd8PxCZF2Ahfdh74On16HofUDZHstnD0X/AsZbO9Bpl2ZhImL7ApV3RtZx30oKJNaHyjvj+s1nPWM4vQeVN0ahDQDQNKTagcobo+hDAFyH2BOunRG3QUBL0h6gOyOuo4CW9AGyM6JzGFBzu3PeGkkbBtR2g7I34nNcp+yNKJRpdXdEofgcwEyPsDMiTjbntmXeGBGFVOokwHWVIj/xyaKnWbuxNgCovMQJ/Zl+9iFoYYEItDEsWc0cQDPTLGFSqBhceV4BcH4XteJ7v3IcJ47h5zwHgMJd8WwY7leOI/jEzDgNt67hLp4Ns91UuEsK5tZFAFQzM8eqzUw/izmml1n+tPEyqbwAypzgLwCdQukN2hxKftc2dk0iTpedB9vGZNZ9wr5PWpJ9X4XWVOzaM60ZfFOWmRb9w17bwbR4xl4r0+qKzQotGi+zM4tow2aNFmXHrnWVP2w7LSJYtpkVVS1m5otA16hrXDnSl0H0avPQZIGMBS0xDY6p+CTAZFbweSY0ldM1CbBjjmG2Cc3ndM0BWuZxiskmtKqcdQbgZxgUMdVLpKX5UBsH4JIR7B1VJav1mB70k5LURgEmX3HFo2e6D5I0iwT67Xio1RGASR9XPHqkDbOofQcU7ogVj5Vp2zFd/gVafFA8V6a9H6d3weNHanj+Y9q/lB40puToPOkdObcnaEKnJ3rP1B7MO2qkV03tDo+u9LrZAZd248r0xkGI4mVWEtP//QEA"},
    {n:"layerzero",c:1,w:4,s:"data:image/webp;base64,UklGRkACAABXRUJQVlA4TDMCAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAACybVsJIwmiIrGigf//3OlJF17y2GtF9H8CCLb2Maf/OOcplV716NN/bx85XoJl+dc/7QVYzUPvzrmxerz1zJr5lqtkxZdvqzkV840XJyS+t5V0uu9uNZnhgJJKd8iSiDimlTSaoxonwQbjM4nlwJqCOnRN4HDsmcAF5h2uOrox2oRzBSuOf4ONBFyg2DOcUJKCH0gz6tZaazstqgOxByv9zFfQAmpBSg9njAONmEVPD4tpODNGHtGIURyPrc805gNTguh5i7lh6k41xmHa62ke9a+mo35ZdNpLfLeey39+JdbbH25VkmD151tRjt381Xj6r3eaGVRzpDMB8W/uJHjiYAwnDrYIXRytoxWHYzA2uJPAL4c7wKrDDQJfcHaANYfrBL7gJoFXRzNGG2hWCJwNTQi9OZgQ/ABrhL+g7kIJOtLFlGAFskYp4pgy5dhBbmXKUhHuUSjR/ebo9cv8FoH1rybJg1FqHoRa0jAYCqrPNGbirBh5NmIUZ8TMR2wxgtNivD+5PJZxjiDv/+HhsTcBzyBfchCVbh6sSBK164F0pHAT9CeDjlUTMMaihXcSeIUzRqOJpgRfwG7GI8WqlOFCOinFYjiLc6AGYwdl2UGsUp4DQyjTgSCU67lfo2xlMyuUb7GdFlPGfO2jlHWzPVahvFk3MKHcWS3mFsqfZX3v0+gljz7td/dHmF61iM65/plzaisECwA="},
    {n:"hnt",c:1,w:4,s:"data:image/webp;base64,UklGRiIFAABXRUJQVlA4TBYFAAAvf8AfEI8gFkzmL92Vw/zPP0G2Lf4J1sQaHOEIAACwbdsFa+2gqnqQ/P/nKo3UHfc1ov8TgE9SOFMpTSZbKekMhD8xpJtFvd2n35s7b1nPd6RN0VnF7B1pP8ctxnPYCsUmH6xxG5RYPtriHk6WD7f4vdDk4zV8yxXZYKYPnSxb5OMrrsg2f/SJg2WjzX/gks2e1qjIdrMtV2XDlQx5li1XZ8azbJq9Ec+ybfYmPMvG2RvwLFtnt8yxbL7SIqqy/bqoyB+Yl1zyJ8YFh2yzlVIKq4lXc7yJ+yA8urMpNdIqssXsMB2bimSlU3bIAW8pq8ih4ngH1UExqjBpFNkgEx7pSCmd/glRQy6FQ3bo0bsszy0+IGuIf9d2kNAfLJM/6og1yqtTNsjURZmvBABRQ44XxDtIAOD5heQOrNFeJPlkuVOfS3twXZHXobs0JE4Rm+M7OszScbUKAF7e311QaVNRjJcITdddCtJBRcJMs1UCFhaN0LFKmTjEcgtY2tSKirjRbenCYrZ1DUjscsDqotZ0eHDaqR5fQC/Kx1M1Uwnrq8Ldea384MRqI6wPohi6U4sfTivs8ZaOVPrr9AOqChl905Kju60ceBmLzLbkAIQq7yt1QdSvToxemI9NXpfSRPFH6KteAxCMNJpyRWy2iMckCx2QjATMBpbF7Uq9x/MhKyNw2yiYjbL6xMvASy6AbYSZIKsjXp6ytoDEZMWk41UV867IagQbcabIdEkppZvn0lTIst6dNmgiyiRHwiPFpuObWAzJxI3JNpEJk5QnrgkSk6mYOCeijDNe5lGbwL2PMHGPfnj9G8gxcZoozQTGJEOmd8SDPBFsiMU6cYxOKKYBT2AbZSKNSIMG4ieaBTZxT+RBgWoZHBPFgs00UQaXzjVIf0HSSf+XPHEPLp1rX2UiDapOHYT91IljIE7DydBPVAtsQiZolDTSgDEpFksz4UeoA3bviAf3hLdRTJwTcSDlXZHhMRFN3DbuCeKB5DdZhg2T2URKJoRGKCMpbsYVGZ8zzcR5mqheRfhyTy6xjBsmvZgMYR0nh9k6IyLtTumuMh1msg1HyxJh2snqhEliEwy0NRwwT3VVxmwSkwW4l7DHfKiyOGOW2MYFnCvY4zHeTYRLk9Unpi+xeQB+xYE+NLFZPaa9GCUArPdDH0WxxHDWNy1inqqRCgC3nuuivOeA3l9t1PKBt1mMXl1UKwDgWOHAmEJMKQaH91Gsho7UYpflfYPBKFYZj7eWA0CieBmIYjY/RSUGgEMjrYti93gipdIljWsVZbHbMMy2yqLQxHAaBVt5CWUx7UaoKrWLGmmBSyymb0xGFemchu8Op3BksR5m0FQCAJR3DX2Teh1uIpw3i/mC6ahydeHd0Xl5bqWXj4Y5NI3W4XqT0efBpwteRg2JHfJcoc7JDsMbVA2mDidPXHj87eCH10FDfg9wV+tadniMskP3DllD0gMACsFh6HkHCYrEGpIG055lgw2qh4r86NUpWww6+KkIx7lQZYsJytRURPgKT/6ssscKda/UcylNtslOD6feXg+szH9Bwtq6v4zFVHdXaRUc760S1nveWSVY9LyvSrDpeVeVYJXqnirBLtUdZYLpvJ8E63EzfMC+bzupDl+kvI+Erx68hxbwXbp2kPBtX772c/h8aF8qAVuM7SslYJuhfOEO2Kq72FZLDvs9MlvhfGDXx9XW1Stg7y5eRa9cB+FvdCGlUgo/cSl3OoPDNwE="},
    {n:"geodnet",c:1,w:4,s:"data:image/webp;base64,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"},
    {n:"wormhole",c:1,w:4,s:"data:image/webp;base64,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"},
    {n:"x",c:0,w:5,s:"data:image/webp;base64,UklGRvIBAABXRUJQVlA4TOYBAAAvH8AHELVQjCRJkWy1/kr7g5ndFSHe+8ycn/+PgAMAANkmSWfbtm1etm3btm1f3Wfbtm3b9qoJYABz6xl1TyuYX/IHSNXN9D7Fa9BMKoTOJqj6Y+P8BDWoiep9Cv/7w1eBzyeWh4j8vE+6lj9rB6sQ/jRTB3wAnZsZPbCbg2NnUisK0BN897O12UbSPRGIL0hWcuYP39Xn+ucGU4+Kn8ODVwfns/3+3wX4fBPp4QNZnMrqO4hJfk/IvqDbkzj9jEYlcl+QrJ+gx6un+c098jqgqTk8eKQ+TlEvNDANFXafMKo/n7YDvQK9t7GtuG2zBv8AL/1m3jFXujb8vVgrjJEK9ef79lUo3U5ARWtj8aK+nh/8lXIYL+hflJrZODgF3/70vAi3501ORQJi3F/yv8NZhR6VA5S4+cL2goNrek6QS59rJHUgSzN1wOc0zjPuDpadqa9w/DyhT0mZf/IHKCIQY11xmT98T/yz/dP7oucNfaV91g7WQ1T9T+oBLn+wOKMHLOTuJ/kR3N9MY7df+ZmwivqgSN6hcjILB/cu/vuScKV8Dv+9+uzrfUTVo6Zm9+DUwXM0hVca9w3uHsby8xRWJCBG4T1pg/yvJzlv/1Vi5wxhsd449bTe3YL3n//JPMDzqD3fjAY="},
    {n:"facebook",c:0,w:5,s:"data:image/webp;base64,UklGRl4BAABXRUJQVlA4TFIBAAAvH8AHEDU4iCQpcM6/6a4Ebjkc8BFwbts29ZzPtr8vtm1UqVzZ6ZIfoNK2bbNNm7S2bdu64zhw28aRqO199+4VL4QjTLVpxx7fZ0qVEOyCQQzUeoYhz2ron2DK9Q0P+ZKFETG0AAeZpR+wcQlHOWfdMHIFh7lgsMG2DBNb0rjgFzwKLibhP3OYi6I4ykFv76J2ewy5f0z9JMoK3oEvhj/a0uga5+jTWEDoI1G770NjK4C/4Z03fDEwEbHh5gSmhGuLuGzMwkizhYjZgoVkZjxETBZimLlFbvnrbJN8H+qCQrLy0Pj31NgoyNHCxr2VIYGdBT1DMjsdkoebjXXiyPzcneb7FRi8o7fgcUBu+F9/bc1nxz8Sof05O/jbR2TvecoTm4I9vl5mPPEq6HFwMGGPbUGKSDtygmgiKDjExYS/xK9RjgWDqKWSb69g17AUyvA0Dw=="},
    {n:"openai",c:0,w:5,s:"data:image/webp;base64,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"},
    {n:"xai",c:0,w:5,s:"data:image/webp;base64,UklGRvgCAABXRUJQVlA4TOwCAAAv/8APEJcgFkzmL92Vw/zPP0G2Lf4J1sQaHOEIRwAAWbJtRaFzLj0qgXvmP9sgl5dGfiP6PwE4RQkhxBRKCoKjDiGU2lppNYWAk/aplKak3iV7HLVLpTb+3msJOGqXyjU47TU7nLQLuXXO25U8TlpCbp2vrQaHk/bx7nxvV3A46ZDvwfd+R4eTjqVz9UqCk/alcXXUgJOWdClXR3E46VAaV/XOgoN28R5cbklw0C7eyuWeHA7apcb1UTwOWnLnuhaHk06NxpZw0r7SqFVw0D53Gu+Ek443jVo9DtqVQePIgoP2t9LYIz65L1b5U/Kg9fH46lG5PvyfIJXmS/DhXV8j84/5SnN1+PiXgY/7kfjQqlXw/cNYo4Z9sdOqRXCErq2RVfaERvPlcIxF19jchtBofhxOMvQ1arTEm+YWcJrPGvnIiu8094ADjYZrwT80a8aZ+rbQPF5dpVkvwalKnWnGqxSluXmcbFCSVfAaBs0j4XBdGwmvrtF+OZyvYC5Vae4Br1JHPpbXqLQXvCcl+RyNPLR3j1ffOe3+XLLSXvAqhYvpUEKjvTm8ZuVykxPJSnvBYjRQw3G4RvsIWJa2RpbDyEp7FVizgc0fhDRujHgtw8/g+xoZjyEq7d1j7jrJOAMeA6ucQeHGB69R+fsjM2QDuz8AN2jXhLlrfB1hBtfWyPz5ktI+AuZhcLXMINXA5r5d4cYmmHvlenMTII41jvDhXOPGS/AedI0jzuCeNbJ8Nq/cmLAsv9bIZwZkA7v/ZoEbNcCaDexuBj/WqOmLZW5UD7sfa9Q4gzxr5PO55OLGJpi6sBz7GnnLBMi6xhG+ldzceAumQfmzw8/g+hqZv5R0brwE06T88TKDVANv+Ux+cGPFPPNPvGUCRF2j+o/klRsT5g//TI0zyK81sn6ioNyYMQ9lf1sj6wwoBnb/fQJ3FvyJ2cDuZghjjYxfJ+oGTfgz3Vij5hnkNvCWT+PutjHiT5XajGkGpGa85H8D"},
    {n:"nvda",c:0,w:4,s:"/icons/matrix/nvda.webp?v=149"},
    {n:"doge",c:1,w:4,s:"/icons/matrix/doge.webp?v=270"},
    {n:"tsla",c:0,w:4,s:"/icons/matrix/tsla.webp?v=151"},
    {n:"chatgpt",c:1,w:4,s:"/icons/matrix/chatgpt.webp?v=152"},
    {n:"claude",c:1,w:4,s:"/icons/matrix/claude.webp?v=153"},
    {n:"cursor",c:1,w:4,s:"/icons/matrix/cursor.webp?v=154"},
    {n:"apt",c:1,w:4,s:"/icons/matrix/apt.webp?v=155"},
    {n:"1inch",c:1,w:4,s:"/icons/matrix/1inch.webp?v=156"},
    {n:"grayscale",c:0,w:4,s:"/icons/matrix/grayscale.webp?v=157"},
    {n:"revolut",c:0,w:4,s:"/icons/matrix/revolut.webp?v=159"},
    {n:"securitize",c:0,w:4,s:"/icons/matrix/securitize.webp?v=164"},
    {n:"wisdomtree-connect",c:0,w:4,s:"/icons/matrix/wisdomtree-connect.webp?v=161"},
    {n:"state-street",c:0,w:4,s:"/icons/matrix/state-street.webp?v=162"},
    {n:"arc",c:1,w:4,s:"/icons/matrix/arc.webp?v=165"},
    {n:"fil",c:1,w:4,s:"data:image/webp;base64,UklGRgYDAABXRUJQVlA4TPoCAAAvf8AfEJcgFkzmL92Vw/zPP0G2Lf4J1sQaDOEIcAQAgCXbahCJJJimW9GE/e92wtOyYL4j+j8BFHbdRMyV3ihbPobh8+BU2mVPakmjneZeF2TGSfC05fhwKbxDk1MQWx+VljwBu0oCH1tf5DNiPb6vrUcBiCcg4X1tfVWCP0CPrpvLdFM8Dq4NR+i2rGYL7rT1Ve7Rd7FT6OUwt9KTfZppjU3M/VHO1fya1Nc7KWc2vyd1eLPltJl/UM4nIDk1A2tOP2BQym0CmlM3kHMawFVSagZ+KWVBJKcLoZSrgZqTIJLTgbSU6kAo5c3APacd6TkZyik1RCllQfaUyoX0lNhQSvmDXGH97FJl5ocG0sNSW6seIvVONZTD84cqM5dFR5TCHrdAkX4hEpe9taZHYfNrVEUkpMqi+gp3qjK3UFwWUR1v8E+RjVsky8qbyFuWU3UXjsQtzKrXK5YSkH++hAIf0HxuBlYMPYlI5FB9QANjSMhl3kSwHliHPp5bmEX1TwlMIb7ls1DgE5ntsdgNVcq4p7dDkpLlsDE/VjAKu1xmZqcIc73F0IyLDRyqXxHkB2kK/lRlbkQK/VJ5luOS/5KJfJhrRPUj8o7lUBXpwawbs+p8gT9UO7dQfJHzHf4pUoNZNhbV+Y6/R0BreY2Edb6mhmVwp8asej0yKQUmv4vc0bAYo7uFWVTHooclkNwCu0gNS6H+XOgT4oyqoaNmJNBBGe+QpGRwzahBkzLukKakUE9pIKOmZKhSxh2SlL4QpazIlVIdiKTEhpaUBNkp5RPpORk4W0qMHJSyIJyTApNyNvCXU0VaTgIMynkAklMxf1LODPyS+gEtqcs7KWnze1LiXSUp9Trl3KYzKOlurmQ1vBJcF+ZnurmdYhf7uz0xHKXg52Ju93ZzS3Bi67PcYVvPjYI/HJM7w/lS9OpZhYra+qDwD8AKUE5bTqb4GVFAbc2UoQB2bn/qZuuLKcUigJmK7MPW30pZtgmAo1Oq/bgxjk7pchdZ7NK5Utw="},
    {n:"aapl",c:0,w:4,s:"/icons/matrix/aapl.webp?v=167"},
    {n:"aave",c:1,w:4,s:"/icons/matrix/aave.webp?v=267"},
    {n:"algo",c:1,w:4,s:"/icons/matrix/algo.webp?v=169"},
    {n:"amd",c:0,w:4,s:"/icons/matrix/amd.webp?v=170"},
    {n:"amzn",c:0,w:4,s:"/icons/matrix/amzn.webp?v=171"},
    {n:"arb",c:1,w:4,s:"/icons/matrix/arb.webp?v=273"},
    {n:"arweave",c:1,w:4,z:1.6,s:"/icons/matrix/arweave.webp?v=277"},
    {n:"atom",c:1,w:4,z:1.7,s:"/icons/matrix/atom.webp?v=272"},
    {n:"bac",c:0,w:4,s:"/icons/matrix/bac.webp?v=174"},
    {n:"binance",c:0,w:4,s:"/icons/matrix/binance.webp?v=175"},
    {n:"bnb",c:1,w:4,s:"/icons/matrix/bnb.webp?v=176"},
    {n:"busd",c:1,w:4,s:"/icons/matrix/busd.webp?v=177"},
    {n:"cashapp",c:0,w:4,s:"/icons/matrix/cashapp.webp?v=178"},
    {n:"compound",c:1,w:4,s:"/icons/matrix/compound.webp?v=248"},
    {n:"crv",c:1,w:4,s:"/icons/matrix/crv.webp?v=247"},
    {n:"csco",c:0,w:4,s:"/icons/matrix/csco.webp?v=181"},
    {n:"dot",c:1,w:4,s:"/icons/matrix/dot.webp?v=182"},
    {n:"googl",c:0,w:4,s:"/icons/matrix/googl.webp?v=183"},
    {n:"hbar",c:1,w:4,z:1.42,s:"/icons/matrix/hbar.webp?v=261"},
    {n:"hood",c:0,w:4,s:"/icons/matrix/hood.webp?v=185"},
    {n:"ibm",c:0,w:4,s:"/icons/matrix/ibm.webp?v=186"},
    {n:"inj",c:1,w:4,s:"/icons/matrix/inj.webp?v=187"},
    {n:"intc",c:0,w:4,s:"/icons/matrix/intc.webp?v=188"},
    {n:"ldo",c:1,w:4,s:"/icons/matrix/ldo.webp?v=189"},
    {n:"meta",c:0,w:4,s:"/icons/matrix/meta.webp?v=190"},
    {n:"mkr",c:1,w:4,z:1.42,s:"/icons/matrix/mkr.webp?v=263"},
    {n:"msft",c:0,w:4,s:"/icons/matrix/msft.webp?v=192"},
    {n:"mstr",c:0,w:4,s:"/icons/matrix/mstr.webp?v=193"},
    {n:"near",c:1,w:4,s:"/icons/matrix/near.webp?v=194"},
    {n:"okx",c:0,w:4,s:"/icons/matrix/okx.webp?v=195"},
    {n:"op",c:1,w:4,s:"/icons/matrix/op.webp?v=196"},
    {n:"orcl",c:0,w:4,s:"/icons/matrix/orcl.webp?v=197"},
    {n:"sei",c:1,w:4,s:"/icons/matrix/sei.webp?v=198"},
    {n:"sq",c:0,w:4,s:"/icons/matrix/sq.webp?v=199"},
    {n:"stx",c:1,w:4,s:"/icons/matrix/stx.webp?v=269"},
    {n:"sui",c:1,w:4,s:"/icons/matrix/sui.webp?v=201"},
    {n:"tao",c:1,w:4,s:"/icons/matrix/tao.webp?v=202"},
    {n:"tia",c:1,w:4,s:"/icons/matrix/tia.webp?v=203"},
    {n:"ton",c:1,w:4,s:"/icons/matrix/ton.webp?v=268"},
    {n:"trx",c:1,w:4,z:1.42,s:"/icons/matrix/trx.webp?v=262"},
    {n:"venmo",c:0,w:4,s:"/icons/matrix/venmo.webp?v=206"},
    {n:"wfc",c:0,w:4,s:"/icons/matrix/wfc.webp?v=207"},
    {n:"wise",c:0,w:4,s:"/icons/matrix/wise.webp?v=208"},
    {n:"wmt",c:0,w:4,s:"/icons/matrix/wmt.webp?v=209"},
    {n:"wu",c:0,w:4,s:"/icons/matrix/wu.webp?v=210"},
    {n:"xlm",c:1,w:4,s:"/icons/matrix/xlm.webp?v=211"},
    {n:"xmr",c:1,w:4,s:"/icons/matrix/xmr.webp?v=212"},
    {n:"xtz",c:1,w:4,z:1.42,s:"/icons/matrix/xtz.webp?v=264"},
    {n:"zec",c:1,w:4,s:"/icons/matrix/zec.webp?v=271"},
    {n:"zrx",c:1,w:4,s:"/icons/matrix/zrx.webp?v=215"},
    {n:"hyperliquid",c:1,w:4,s:"/icons/matrix/hyperliquid.webp?v=216"},
    {n:"wlfi",c:1,w:4,s:"/icons/matrix/wlfi.webp?v=217"},
    {n:"wld",c:1,w:4,s:"/icons/matrix/wld.webp?v=218"},
    {n:"clearstreet",c:0,w:4,s:"/icons/matrix/clearstreet.webp?v=219"},
    {n:"bakkt",c:0,w:4,s:"/icons/matrix/bakkt.webp?v=220"},
    {n:"ondo",c:1,w:4,s:"/icons/matrix/ondo.webp?v=221"},
    {n:"usdp",c:1,w:4,s:"/icons/matrix/usdp.webp?v=249"},
    {n:"base",c:1,w:4,s:"/icons/matrix/base.webp?v=223"},
    {n:"ink",c:1,w:4,s:"/icons/matrix/ink.webp?v=224"},
    {n:"m0",c:1,w:4,s:"/icons/matrix/m0.webp?v=225"},
    {n:"gemini",c:1,w:4,s:"/icons/matrix/gemini.webp?v=226"},
    {n:"bitgo",c:1,w:4,s:"/icons/matrix/bitgo.webp?v=227"},
    {n:"chainalysis",c:1,w:4,s:"/icons/matrix/chainalysis.webp?v=228"},
    {n:"fireblocks",c:1,w:4,s:"/icons/matrix/fireblocks.webp?v=229"},
    {n:"wintermute",c:1,w:4,s:"/icons/matrix/wintermute.webp?v=230"},
    {n:"paxos",c:1,w:4,s:"/icons/matrix/paxos.webp?v=231"},
    {n:"bybit",c:1,w:4,s:"/icons/matrix/bybit.webp?v=232"},
    {n:"usdt2",c:1,w:4,s:"/icons/matrix/usdt2.webp?v=233"},
    {n:"kinexys",c:0,w:4,s:"/icons/matrix/kinexys.webp?v=234"},
    {n:"fednow",c:0,w:4,s:"/icons/matrix/fednow.webp?v=235"},
    {n:"schw",c:0,w:4,s:"/icons/matrix/schw.webp?v=236"},
    {n:"moneygram",c:0,w:4,s:"/icons/matrix/moneygram.webp?v=237"},
    {n:"block",c:0,w:4,s:"/icons/matrix/block.webp?v=239"},
    {n:"broadridge",c:0,w:4,s:"/icons/matrix/broadridge.webp?v=240"},
    {n:"plaid",c:0,w:4,s:"/icons/matrix/plaid.webp?v=241"},
    {n:"jpmorgan",c:0,w:4,s:"/icons/matrix/jpmorgan.webp?v=242"},
    {n:"nflx",c:0,w:4,s:"/icons/matrix/nflx.webp?v=244"},
    {n:"stt",c:0,w:4,s:"/icons/matrix/stt.webp?v=245"},
    {n:"wisdomtree",c:0,w:4,s:"/icons/matrix/wisdomtree.webp?v=246"},
  ];
  /* Marks whose artwork is TEXT rather than a symbol. Measured 2026-08-28 against
     the live field: a wordmark's legibility floor is its x-height, not its box, so
     the symbol sizing starves it twice. blk, dtcc, fidelity and ubs are 64x16
     sources that the ar>1.6 branch drew 34x9, and citi, gs, ice, nyse, visa and
     franklin are 32x32 sources carrying type that 19x19 cannot resolve. The same
     ten also rasterise thinnest, so they carry the least ink: mean alpha over inked
     pixels runs 0.28 (fidelity) to 0.75 (dtcc) where every symbol mark sits at 0.8
     to 0.92. Sized and inked as symbols they were drawn on every frame and seen on
     none. */
  var WORDMARK = { "morgan-stanley":1, "blk":1, "citi":1, "dtcc":1, "fidelity":1, "franklin":1, "gs":1, "ice":1, "nyse":1, "ubs":1, "visa":1, "kalshi":1, "polymarket":1, "vantage-bank":1, "maple":1, "xai":1, "securitize":1 };
  var iconsSeen = 0;
  ICONS.forEach(function(d){
    d.img = null; d.ok = false; d.ar = 1; d.tc = {}; d.wm = WORDMARK[d.n] ? 1 : 0;
    var im = new Image();
    im.decoding = 'async';
    im.onload = function(){
      d.img = im; d.ok = true;
      d.ar = (im.naturalWidth || 32) / (im.naturalHeight || 32);
      iconsSeen++; if (iconsSeen === ICONS.length) onIconsReady();
    };
    im.onerror = function(){
      iconsSeen++; if (iconsSeen === ICONS.length) onIconsReady();
    };
    im.src = d.s;
  });

  /* Two bakes per theme, olive and accent blue, cross-faded by x so marks sit in
     the olive field on the left and pick up the accent on the right. That is the
     inverse of the $ cross-fade, which is what the live hero does. Six x-steps
     are baked per mark per theme, so a mark costs one drawImage per frame and
     the mix is a true cross-fade rather than two stacked alpha passes. */
  var TINT_STEPS = 6, ACCENT_MAX = 0.72;
  function tintFor(d, step){
    var key = (isDark() ? 'd' : 'l') + step;
    if (d.tc[key]) return d.tc[key];
    if (!d.ok || !d.img) return null;
    var nw = d.img.naturalWidth || 32, nh = d.img.naturalHeight || 32;
    var cv = document.createElement('canvas');
    cv.width = nw; cv.height = nh;
    var t = cv.getContext('2d');
    /* Thin type rasterises to partial coverage, and source-atop PRESERVES that
       alpha, so a wordmark reaches the field at a fraction of a symbol's weight
       before the draw alpha is even applied. Compositing the source over itself
       compounds coverage (a=0.28 becomes 1-(1-0.28)^3=0.63) without touching the
       silhouette, which is what the tint then recolors. */
    var passes = d.wm ? 3 : 1;
    for (var p = 0; p < passes; p++) t.drawImage(d.img, 0, 0, nw, nh);
    t.globalCompositeOperation = 'source-atop';
    var P = pal();
    var base = mixc(P.olive, P.mint, 0.34);
    t.fillStyle = rgb(mixc(base, P.blue, (step / (TINT_STEPS - 1)) * ACCENT_MAX), 1);
    t.fillRect(0, 0, nw, nh);
    t.globalCompositeOperation = 'source-over';
    d.tc[key] = cv;
    return cv;
  }

  /* ══ MATRIX FIELD: columns of instrument tickers and logos raining, $ picked out ══ */
  /* Currency MARKS rather than three-letter codes, matching the live hero's textChars.
   The bitcoin mark is drawn in brand gold; every other glyph stays in the olive field. */
  var GOLD = [251, 191, 36];
  /* The forex marks, as distinct from the tickers and commodity codes they share
     the pool with. They are the only glyphs that get their own size. */
  var FX = {'\u20AC':1,'\u00A3':1,'\u00A5':1,'\u20A9':1};
  var POOL = ['$','$','$','\u20BF','\u20BF','USDC','USDT','PYUSD','RLUSD','DAI','FDUSD',
              '\u20AC','\u00A3','\u00A5','\u20A9',
              'T-BILL','REPO','SOFR','DXY','XAU','XAG','WTI','VIX','NAV','CUSIP'];

  /* mtxCryptoPickRate on the live site: about 35 percent of picks come from the
     crypto stream, the rest from fiat, commodity, macro and stock. */
  var CRYPTO_RATE = 0.35;
  var cryptoPool = [], tradPool = [];
  (function buildPools(){
    var i, k;
    for (i = 0; i < POOL.length; i++){
      var w = POOL[i] === '$' ? 5 : 3;
      for (k = 0; k < w; k++) tradPool.push({ t: 0, v: POOL[i] });
    }
    for (i = 0; i < ICONS.length; i++){
      var d = ICONS[i];
      var tgt = d.c ? cryptoPool : tradPool;
      var n = d.c ? d.w : Math.max(1, Math.round(d.w * 0.42));
      for (k = 0; k < n; k++) tgt.push({ t: 1, d: d });
    }
  })();
  /* matrixwatch=1 cycles every loaded mark through the field so a measurement
     can see a logo the collision pass drops. The public page does not set it. */
  var matrixWatch = /(?:^|[?&])matrixwatch=1(?:&|$)/.test(location.search);
  var matrixWatchList = [], matrixWatchAt = 0;
  function matrixWatchItem(){
    if (!matrixWatchList.length){
      for (var i = 0; i < ICONS.length; i++){
        if (ICONS[i].ok) matrixWatchList.push({ t: 1, d: ICONS[i] });
      }
    }
    if (!matrixWatchList.length) return null;
    var it = matrixWatchList[matrixWatchAt % matrixWatchList.length];
    matrixWatchAt++;
    return it;
  }
  function pickItem(){
    if (matrixWatch){
      var forced = matrixWatchItem();
      if (forced) return forced;
    }
    if (Math.random() < CRYPTO_RATE){
      var ci = cryptoPool[(Math.random() * cryptoPool.length) | 0];
      if (ci && ci.d.ok) return ci;
    }
    var it = tradPool[(Math.random() * tradPool.length) | 0];
    if (it.t === 1 && !it.d.ok) return { t: 0, v: POOL[(Math.random() * POOL.length) | 0] };
    return it;
  }

  /* the $ magnet: a smoothed cursor the money glyphs lean toward */
  var warpX = null, warpY = null, warpTX = null, warpTY = null;
  function dollarWarp(px, py){
    if (warpX == null) return null;
    var dx = warpX - px, dy = warpY - py;
    var d = Math.sqrt(dx * dx + dy * dy);
    var maxR = Math.max(140, Math.min(W, H) * 0.5);
    if (d <= 0.5 || d >= maxR) return null;
    var t = 1 - d / maxR;
    var sc = t * t * (Math.min(W, H) * 0.062);
    return [px + dx / d * sc, py + dy / d * sc];
  }

  var COLW = 26, cols = [];
  function buildColumns(reseed){
    var n = Math.ceil(W / COLW) + 1;
    var prev = cols;
    cols = [];
    for (var i = 0; i < n; i++){
      var old = prev && prev[i];
      var c = {
        x: i * COLW + COLW * 0.5,
        /* seeded ON SCREEN, not above it: the old -H seed left the field empty for
           about ten seconds after load, so a first hover had no marks to pull */
        y: old ? old.y : Math.random() * (H * 1.06),
        sp: old ? old.sp : 0.5 + Math.random() * 1.5,
        len: old ? old.len : 6 + Math.floor(Math.random() * 12),
        glyphs: old && !reseed ? old.glyphs : [],
        nudges: old && !reseed ? old.nudges : [],
        marks: old && !reseed ? old.marks : [],
        swapEvery: old ? old.swapEvery : 120 + Math.random()*120,
        tick: old ? old.tick : 0
      };
      if (!c.glyphs.length){
        for (var g = 0; g < 20; g++) c.glyphs.push(pickItem());
      }
      cols.push(c);
    }
  }

  /* Icon positions this frame, plus a uniform grid over them. Everything that
     needs a neighbor lookup (the tendril web, the $ magnet, the coral transit)
     goes through the grid, so nothing scans all the icons for every node. */
  var iconPts = [], ICELL = 120, LINKR = 112, iconGrid = {};
  /* Magnet-target budget. This was a flat 170 while the column loop runs left to
     right, so the budget was spent before it reached the right half and no mark
     over there could ever attract a $. It scales with the field now. */
  var ICONPT_CAP = 220;
  var _scr = [], _scr2 = [], _tg = [];
  function buildIconGrid(){
    iconGrid = {};
    for (var i = 0; i < iconPts.length; i++){
      var p = iconPts[i], k = ((p.x / ICELL) | 0) + ':' + ((p.y / ICELL) | 0);
      if (iconGrid[k]) iconGrid[k].push(p); else iconGrid[k] = [p];
    }
  }
  function nearIcons(x, y, r, out){
    out.length = 0;
    var c0 = ((x - r) / ICELL) | 0, c1 = ((x + r) / ICELL) | 0;
    var r0 = ((y - r) / ICELL) | 0, r1 = ((y + r) / ICELL) | 0;
    for (var cx = c0; cx <= c1; cx++){
      for (var cy = r0; cy <= r1; cy++){
        var b = iconGrid[cx + ':' + cy];
        if (!b) continue;
        for (var i = 0; i < b.length; i++) out.push(b[i]);
      }
    }
    return out;
  }
  function nearestIcon(x, y, maxR){
    nearIcons(x, y, maxR, _scr);
    var best = null, bd = maxR * maxR;
    for (var i = 0; i < _scr.length; i++){
      var p = _scr[i], dx = p.x - x, dy = p.y - y, d2 = dx*dx + dy*dy;
      if (d2 < bd){ bd = d2; best = p; }
    }
    return best;
  }
  /* Up to four neighbor icons around a point, shuffled, for the coral ride. */
  function neighborTargets(x, y){
    nearIcons(x, y, LINKR, _scr2);
    var bp = [null, null, null, null], bd = [0, 0, 0, 0], n = 0, z, w;
    for (var i = 0; i < _scr2.length; i++){
      var p = _scr2[i], dx = p.x - x, dy = p.y - y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < 10 || d > LINKR) continue;
      if (n < 4){ bp[n] = p; bd[n] = d; n++; }
      else {
        w = 0;
        for (z = 1; z < 4; z++) if (bd[z] > bd[w]) w = z;
        if (d < bd[w]){ bd[w] = d; bp[w] = p; }
      }
    }
    if (!n) return 0;
    for (z = n - 1; z > 0; z--){
      var r2 = (Math.random() * (z + 1)) | 0, tmp = bp[z];
      bp[z] = bp[r2]; bp[r2] = tmp;
    }
    _tg.length = 0;
    for (z = 0; z < n; z++) _tg.push(bp[z]);
    return n;
  }

  /* Express motion in 60 Hz steps so refresh rate changes do not change speed. */
  var FRAME_MS = 1000 / 60;
  function frameEase(amount, step){ return 1 - Math.pow(1 - amount, step); }

  /* Reserve actual ink bounds, not nominal columns. Independent stream speeds
     can bring marks together after they were chosen, so enforce spacing at draw
     time. Only accepted marks become targets for the coral and dollar magnet. */
  var MATRIX_CELL = 64, matrixSpace = {}, matrixTextMetrics = {};
  function claimMatrixSpace(name, left, top, width, height, velocity){
    var gapX = 3, gapY = 0.5, cx = left + width * 0.5, cy = top + height * 0.5;
    var box = { l:left-gapX, t:top-gapY, r:left+width+gapX, b:top+height+gapY,
                x:cx, y:cy, w:width, h:height, n:name, v:velocity || 0 };
    var reachX = name ? COLW * 2 : 0, reachY = name ? 44 : 0;
    var x0 = Math.floor((box.l-reachX) / MATRIX_CELL);
    var x1 = Math.floor((box.r+reachX) / MATRIX_CELL);
    var y0 = Math.floor((box.t-reachY) / MATRIX_CELL);
    var y1 = Math.floor((box.b+reachY) / MATRIX_CELL);
    var x, y, bucket, j, other;
    for (x = x0; x <= x1; x++){
      for (y = y0; y <= y1; y++){
        bucket = matrixSpace[x + ':' + y];
        if (!bucket) continue;
        for (j = 0; j < bucket.length; j++){
          other = bucket[j];
          if (box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t) return false;
          if (name && name === other.n &&
              Math.abs(cx-other.x) <= Math.max(COLW*2, (width+other.w)*0.5+12) &&
              Math.abs(cy-other.y) <= Math.max(44, (height+other.h)*0.5+12)) return false;
        }
      }
    }
    for (x = Math.floor(box.l/MATRIX_CELL); x <= Math.floor(box.r/MATRIX_CELL); x++){
      for (y = Math.floor(box.t/MATRIX_CELL); y <= Math.floor(box.b/MATRIX_CELL); y++){
        var key = x + ':' + y;
        if (!matrixSpace[key]) matrixSpace[key] = [];
        matrixSpace[key].push(box);
      }
    }
    return true;
  }
  /* All streams share the same bounded speed multiplier. Look ahead using
     their relative fall rates, without letting cursor motion alter eligibility.
     The local grid holds resting ink and trails; nudges may overlap. */
  function matrixConflictWithin(name, left, top, width, height, velocity, steps, maxSpeed){
    var cx = left+width*0.5, cy = top+height*0.5;
    var reachX = name ? COLW*2 : 0, reachY = name ? 44 : 0;
    var travel = MATRIX_IDLE_SPEED*steps;
    var sweep = (Math.abs(velocity)+maxSpeed)*travel;
    var x0 = Math.floor((left-3-reachX)/MATRIX_CELL);
    var x1 = Math.floor((left+width+3+reachX)/MATRIX_CELL);
    var y0 = Math.floor((top-0.5-reachY-sweep)/MATRIX_CELL);
    var y1 = Math.floor((top+height+0.5+reachY+sweep)/MATRIX_CELL);
    for (var x = x0; x <= x1; x++){
      for (var y = y0; y <= y1; y++){
        var bucket = matrixSpace[x+':'+y];
        if (!bucket) continue;
        for (var j = 0; j < bucket.length; j++){
          var other = bucket[j];
          var dy = cy-other.y, end = dy+(velocity-other.v)*travel;
          var nearest = dy*end <= 0 ? 0 : Math.min(Math.abs(dy), Math.abs(end));
          var inkX = left-3 < other.r && left+width+3 > other.l;
          if (inkX && nearest < (height+other.h)*0.5+1) return true;
          if (name && name === other.n &&
              Math.abs(cx-other.x) <= Math.max(COLW*2, (width+other.w)*0.5+12) &&
              nearest <= Math.max(44, (height+other.h)*0.5+12)) return true;
        }
      }
    }
    return false;
  }

  function matrixTextBounds(value){
    var key = mctx.font + ':' + value, cached = matrixTextMetrics[key];
    if (cached) return cached;
    var m = mctx.measureText(value);
    var size = parseFloat(mctx.font.split(' ')[1]) || 12;
    return matrixTextMetrics[key] = {
      left: m.actualBoundingBoxLeft == null ? m.width*0.5 : m.actualBoundingBoxLeft,
      right: m.actualBoundingBoxRight == null ? m.width*0.5 : m.actualBoundingBoxRight,
      up: m.actualBoundingBoxAscent == null ? size*0.6 : m.actualBoundingBoxAscent,
      down: m.actualBoundingBoxDescent == null ? size*0.4 : m.actualBoundingBoxDescent
    };
  }
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      matrixTextMetrics = {};
      if (reduce && W) staticFrame();
    });
  }

  /* Apply one edge policy to image logos and measured text ink, including trails.
     Whole marks fade before the vertical boundary. Logos use resting bounds;
     currency text is checked after its pointer-driven movement. */
  function matrixEdgeAlpha(left, top, width, height, trail){
    /* resize floors backing dimensions; cover one physical pixel even at zoom-out. */
    var inset = Math.max(1, 1/dpr);
    if (left < inset || left+width > W-inset || top-trail < inset || top+height > H-inset) return 0;
    if (reduce) return 1;
    var t = Math.min(1, (top-trail-inset)/24, (H-inset-top-height)/24);
    return t*t*(3-2*t);
  }

  /* A local deflection of up to eight pixels, with a soft return.
     Keep it per visible slot: pool entries are shared across many columns. */
  function nudgeMatrixIcon(c, k, item, x, y, width, height, step, trail){
    if (!c.nudges) c.nudges = [];
    var n = c.nudges[k];
    if (!n || n.item !== item) n = c.nudges[k] = { item:item, x:0, y:0 };
    var tx = 0, ty = 0;
    if (!reduce && active && warpTX != null){
      var dx = x-warpTX, dy = y-warpTY, distance = Math.hypot(dx, dy);
      var radius = 28 + Math.max(width, height)*0.5;
      if (distance < radius){
        var strength = 8 * Math.pow(1-distance/radius, 2);
        if (distance < 0.01){ dx = 1; dy = 0; distance = 1; }
        tx = dx/distance*strength; ty = dy/distance*strength*(MATRIX_VERTICAL_NUDGE/8);
      }
    }
    var ease = reduce ? 1 : frameEase(0.22, step);
    n.x += (tx-n.x)*ease; n.y += (ty-n.y)*ease;
    /* Keep every painted pixel, including the upper trail, inside the field.
       Store the applied displacement so coral targets and release agree. */
    var inset = Math.max(1, 1/dpr);
    n.x = Math.max(inset-x+width*0.5, Math.min(W-inset-x-width*0.5, n.x));
    n.y = Math.max(inset-y+height*0.5+trail, Math.min(H-inset-y-height*0.5, n.y));
    return n;
  }

  function sameMatrixItem(a, b){
    return a.t === b.t && (a.t === 1 ? a.d.n === b.d.n : a.v === b.v);
  }
  function matrixGlyph(c, k, item, step){
    if (!c.marks) c.marks = [];
    var m = c.marks[k];
    if (!m) m = c.marks[k] = { item:item, alpha:1, visible:false };
    m.wasVisible = m.visible;
    m.visible = false;
    m.beforeAlpha = m.alpha;
    if (reduce){ m.item = item; m.alpha = 1; m.retiring = false; m.wait = 0; }
    else if (!sameMatrixItem(m.item, item)){
      m.alpha = Math.max(0, m.alpha-step/14);
      if (m.alpha < 0.000001){
        m.item = item; m.alpha = 0; m.wasVisible = false;
        m.retiring = false; m.wait = 0;
      }
    } else if (m.retiring){
      m.alpha = Math.max(0, m.alpha-step/14);
      if (m.alpha < 0.000001){ m.alpha = 0; m.retiring = false; m.wait = 18; }
    } else if (m.wait > 0){
      m.wait = Math.max(0, m.wait-step); m.alpha = 0;
    } else m.alpha = Math.min(1, m.alpha+step/18);
    return m;
  }
  /* Hover slows only the falling streams. Nudge, fade and coral clocks stay live. */
  var MATRIX_IDLE_SPEED = 0.48, MATRIX_HOVER_RATIO = 0.6, MATRIX_EASE_MS = 500;
  var MATRIX_ROW_STEP = 26, MATRIX_VERTICAL_NUDGE = 8;
  var matrixSpeed = MATRIX_IDLE_SPEED, matrixHovered = false;
  var matrixFrom = MATRIX_IDLE_SPEED, matrixTarget = MATRIX_IDLE_SPEED, matrixElapsed = MATRIX_EASE_MS;
  function resetMatrixHover(){
    matrixHovered = false;
    matrixSpeed = matrixFrom = matrixTarget = MATRIX_IDLE_SPEED;
    matrixElapsed = MATRIX_EASE_MS;
  }
  function matrixMotion(step){
    var target = matrixHovered ? MATRIX_IDLE_SPEED*MATRIX_HOVER_RATIO : MATRIX_IDLE_SPEED;
    if (target !== matrixTarget){
      matrixFrom = matrixSpeed; matrixTarget = target; matrixElapsed = 0;
    }
    matrixElapsed = Math.min(MATRIX_EASE_MS, matrixElapsed + step*FRAME_MS);
    var t = matrixElapsed/MATRIX_EASE_MS, eased = t*t*(3-2*t);
    matrixSpeed = matrixFrom + (matrixTarget-matrixFrom)*eased;
    return matrixSpeed;
  }


  /* Head size is what the collision pass reserves. A wordmark wider than about
     two columns loses that pass and never paints, which is how a loaded logo
     disappears. czMatrixAdmit counts paints against those rejections. */
  var czHost = (typeof window !== "undefined") ? window : this;
  czHost.czMatrixAdmit = { by: {}, roster: (typeof ICONS === "undefined" ? [] : ICONS).map(function(d){ return d.n; }) };
  function czAdmit(name, kind, iw, ih){
    var book = czHost.czMatrixAdmit;
    var row = book.by[name];
    if (!row) row = book.by[name] = { paint:0, edge:0, conflict:0, claim:0, w:0, h:0 };
    row[kind]++;
    if (iw){ row.w = iw; row.h = ih; }
  }
  function matrixIconSize(d, head){
    var ar = d.ar || 1, iw, ih;
    if (ar > 1.6){ iw = d.wm ? 52 : 34; ih = iw / ar; }
    else { ih = d.wm ? 26 : 19; iw = ih * ar; }
    var markScale = d.z || 1;
    iw *= markScale; ih *= markScale;
    if (head){ iw *= 1.14; ih *= 1.14; }
    return { iw: Math.max(2, Math.round(iw)), ih: Math.max(2, Math.round(ih)) };
  }

  function drawMatrix(now, boost, step){
    if (step == null) step = 1;
    var rowStep = reduce ? 20 : MATRIX_ROW_STEP;
    mtxC.dataset.rowStep = rowStep;
    var P = pal();
    /* Explicit short trails share each mark's reservation. Clearing old pixels
       prevents a rejected logo's afterimage colliding with its new neighbor. */
    mctx.globalAlpha = 1;
    mctx.fillStyle = rgb(P.trail, 1);
    mctx.fillRect(0, 0, W, H);
    matrixSpace = {};
    /* A loaded font can replace its fallback without changing mctx.font.
       Share measurements within this frame, never across a possible font swap. */
    matrixTextMetrics = {};
    var trail = reduce ? 0 : 4;

    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    iconPts.length = 0;
    var speed = reduce ? 0 : matrixMotion(step);
    var maxStreamSpeed = 2;
    for (var si = 0; si < cols.length; si++) maxStreamSpeed = Math.max(maxStreamSpeed, Math.abs(cols[si].sp));
    /* Existing logos keep ownership. New marks wait for free space, and warped
       text yields to both. Pointer nudges may cross resting bounds
       without changing which logos are eligible to appear. */
    for (var pass = 0; pass < 3; pass++){
    for (var i = 0; i < cols.length; i++){
      var c = cols[i];
      if (pass === 0){
      c.y += c.sp * speed * step;
      if (c.y - c.len * rowStep > H){
        c.y = -Math.random() * 220;
        c.nudges = []; c.marks = [];
        c.sp = 0.5 + Math.random() * 1.5;
        c.len = 6 + Math.floor(Math.random() * 12);
      }
      c.tick += step;
      if (c.tick >= (c.swapEvery || 150)){
        c.tick = 0;
        c.swapEvery = 120 + Math.random()*120;
        c.glyphs[(Math.random() * c.glyphs.length) | 0] = pickItem();
      }
      }
      var gm = Math.max(0, Math.min(1, c.x / W));
      var gstep = Math.min(TINT_STEPS - 1, (gm * TINT_STEPS) | 0);
      for (var k = 0; k < c.len; k++){
        var gy = c.y - k * rowStep;
        if (gy < -24 || gy > H + 24) continue;
        var chosen = c.glyphs[(i + k) % c.glyphs.length];
        var mark = pass === 0 ? matrixGlyph(c, k, chosen, step) : c.marks[k];
        var it = mark.item, head = k === 0;
        var baseA = (1-k/c.len)*0.36*(head ? 1.5 : 1);
        var a = baseA*mark.alpha;
        if (a <= 0.012) continue;
        var tl = it.t === 1 ? tintFor(it.d, gstep) : null;
        if (tl){
          if (pass === 2 || (pass === 0) !== !!mark.wasVisible) continue;
          /* a company or asset mark, dimmed into the olive field */
          var sz = matrixIconSize(it.d, head), iw = sz.iw, ih = sz.ih;
          var ix = Math.round(c.x - iw * 0.5), iy = gy - ih * 0.5;
          var edgeAlpha = matrixEdgeAlpha(ix, iy, iw, ih, trail);
          if (edgeAlpha <= 0){ czAdmit(it.d.n, "edge", iw, ih); continue; }
          var nudge = nudgeMatrixIcon(c, k, it, ix+iw*0.5, gy, iw, ih, step, trail);
          /* Claim resting ink and its trail, then apply the live nudge.
             Transient overlap never changes admission or triggers a swap.
             Retain an old logo's reservation through its fade. A replacement
             starts at zero and cannot evict a neighbor that is already visible. */
          if (!reduce && !mark.retiring && matrixConflictWithin(it.d.n,
              ix, iy-trail, iw, ih+trail, c.sp,
              mark.wasVisible ? 18 : 44, maxStreamSpeed)){
            if (mark.wasVisible){
              /* Commit to the exit even if the winner later disappears. The
                 extra lookahead covers the largest normal animation step. */
              mark.retiring = true;
              mark.alpha = Math.max(0, mark.beforeAlpha-step/14);
            } else {
              /* Do not admit a logo just long enough to flash before yielding.
                 Count it: a mark rejected here never reaches drawImage, and
                 nothing else records that it was dropped. */
              czAdmit(it.d.n, "conflict", iw, ih);
              mark.alpha = 0; mark.wait = 12;
              continue;
            }
          }
          if (!claimMatrixSpace(it.d.n, ix, iy-trail, iw, ih+trail, c.sp)){
            czAdmit(it.d.n, "claim", iw, ih);
            mark.alpha = 0; mark.retiring = false; mark.wait = reduce ? 0 : 18;
            continue;
          }
          mark.visible = true;
          ix += nudge.x; iy += nudge.y;
          var ia = Math.min(0.92, baseA*1.8)*mark.alpha*edgeAlpha;
          if (trail){
            mctx.globalAlpha = ia * 0.12;
            mctx.drawImage(tl, ix, iy-trail, iw, ih);
            mctx.globalAlpha = ia * 0.24;
            mctx.drawImage(tl, ix, iy-trail*0.5, iw, ih);
          }
          mctx.globalAlpha = ia;
          mctx.drawImage(tl, ix, iy, iw, ih);
          czAdmit(it.d.n, "paint", iw, ih);
          mctx.globalAlpha = 1;
          var iconY = iy+ih*0.5;
          if (iconY > 0 && iconY < H && ia > 0.14 && iconPts.length < ICONPT_CAP){
            iconPts.push({ x: ix+iw*0.5, y: iconY, a: ia, i: iconPts.length });
          }
        } else {
          if (pass !== 2) continue;
          var v = it.t === 1 ? '$' : it.v;
          var gxw = c.x, gyw = gy;
          if (v === '$' || v === '\u20BF'){
            var wp = dollarWarp(c.x, gy);
            if (wp){ gxw = wp[0]; gyw = wp[1]; }
          }
          if (v === '$'){
            /* dollars cross-fade blue (left) to mint (right), as on the live hero */
            var col = mixc(P.blue, P.mint, gm);
            mctx.font = '700 ' + (head ? 17 : 14) + 'px "JetBrains Mono", ui-monospace, monospace';
            mctx.fillStyle = rgb(col, Math.min(1, a * 1.25));
          } else if (v === '\u20BF'){
            /* the bitcoin mark is the one gold thing in the chain */
            mctx.font = '700 ' + (head ? 18 : 15) + 'px "JetBrains Mono", ui-monospace, monospace';
            mctx.fillStyle = rgb(GOLD, Math.min(1, a * 1.4));
          } else {
            /* Author, 2026-08-30: the forex marks run 25% larger than the
               tickers beside them, 12px to 15px, so a currency reads as a
               currency at a glance. Ticker words are unchanged at 10px and
               other single glyphs at 12px. */
            /* Give Xi and won enough space for their distinguishing strokes. */
            var glyphSize = v === '\u20A9' ? 18 : (FX[v] ? 15 : (v.length > 3 ? 10 : 12));
            mctx.font = '500 ' + glyphSize + 'px "JetBrains Mono", ui-monospace, monospace';
            /* five tonal steps across the columns, green through green-blue, so the
               field reads as a range with depth instead of one flat colour */
            var fieldC = mixc(P.olive, P.blue, 0.05 + 0.30 * ((i % 5) / 4));
            mctx.fillStyle = rgb(fieldC, head ? Math.min(1, a * 1.55) : a * 1.12);
          }
          var tb = matrixTextBounds(v);
          var textEdgeAlpha = matrixEdgeAlpha(gxw-tb.left, gyw-tb.up, tb.left+tb.right, tb.up+tb.down, trail);
          if (textEdgeAlpha <= 0) continue;
          if (!claimMatrixSpace('', gxw-tb.left, gyw-tb.up-trail, tb.left+tb.right, tb.up+tb.down+trail)) continue;
          if (trail){
            mctx.globalAlpha = 0.12*textEdgeAlpha;
            mctx.fillText(v, gxw, gyw-trail);
            mctx.globalAlpha = 0.24*textEdgeAlpha;
            mctx.fillText(v, gxw, gyw-trail*0.5);
          }
          mctx.globalAlpha = textEdgeAlpha;
          mctx.fillText(v, gxw, gyw);
          mctx.globalAlpha = 1;
        }
      }
    }
    }
    buildIconGrid();
  }

  /* ══ CORAL REEF: pointer-driven branching, olive tendrils, $ nodes ══ */
  var branches = [], nodes = [];
  var MAXB = 180, MAXN = 200;
  var mx = -1, my = -1, pmx = -1, pmy = -1, vel = 0, lastMove = 0, lastSpawn = 0;
  var active = false, fade = 0;
  function rnd(a, b){ return a + Math.random() * (b - a); }

  /* MAXB and MAXN are the most each array holds. Both guards read `>` until
     2026-09-29, which admitted one more: 181 branches and 201 $ (measured in
     scripts/check_homepage_animation_budgets.cjs). */
  function spawnBranch(x, y, ang, gen, speed){
    if (branches.length >= MAXB) return;
    branches.push({ x:x, y:y, angle:ang, speed:speed || rnd(0.6,1.6), curve:rnd(-0.04,0.04),
                    life:0, maxLife:rnd(30,90), gen:gen||0, forked:false,
                    thickness:Math.max(0.3, 1.8 - (gen||0)*0.3), alpha:rnd(0.35,0.8) });
  }
  function addNode(x, y, gen, now){
    if (nodes.length >= MAXN) nodes.shift();
    nodes.push({ x:x, y:y, r:rnd(1.2, 3.0 - gen*0.3), alpha:rnd(0.3,0.8),
                 born:now, maxAge:rnd(3000,8000), gen:gen, pulse:rnd(0, Math.PI*2), ph:0,
                 free: now + GRACE_MS });
  }
  /* A FINGER IS NOT A CURSOR. On a mouse the $ spray is continuous: the pointer
     is always over the hero, so clusters accumulate and read as a trail. On
     touch, pointermove fires ONLY while a finger is down, the browser competes
     for the same gesture, and pointerleave fires the moment it lifts, so the
     same constants produce a handful of small marks that are gone before they
     register. A touch event gets a bigger, faster, wider burst so one tap or
     short drag is legible; the mouse path is untouched. The burst keys on the
     EVENT, not on the device: it was also keyed on (pointer: coarse), which
     handed the 26 startup clusters and the idle drip 4 extra branches each on
     every phone, 2.74x the desktop's seeded density before a finger landed. */
  function spawnCluster(cx, cy, v, now, isTouch){
    var count = (Math.random() < 0.3 ? 3 : 2) + (v > 0.8 ? 1 : 0);
    var speedMul = 1 + Math.min(0.6, v * 0.3);
    var spreadMul = 1 + Math.min(0.8, v * 0.4);
    if (isTouch){ count += 4; speedMul *= 1.45; spreadMul *= 1.7; }
    for (var i = 0; i < count; i++){
      var a = rnd(0, Math.PI * 2), d = rnd(3, 18) * spreadMul;
      spawnBranch(cx + Math.cos(a)*d, cy + Math.sin(a)*d, a + rnd(-0.5,0.5), 0, rnd(0.6,1.6)*speedMul);
    }
    addNode(cx, cy, 0, now);
  }

  /* ── the magnet: a $ snaps to a mark, holds, then rides a curved tendril to a
     neighboring mark. Live constants: hold 25ms, absorb radius 12, transit 400ms.
     ph is 0 free, 1 held on a mark, 2 riding a tendril. ── */
  var HOLD_MS = 25, ABSORB_R = 12, TRANSIT_MS = 400;
  /* a $ stays free and visible this long before any mark may pull or absorb it,
     so the spray from the cursor always reads before the field claims it */
  var GRACE_MS = 520;
  function beginTransit(nd, x0, y0, x1, y1, now){
    var mdx = x1 - x0, mdy = y1 - y0;
    var len = Math.sqrt(mdx*mdx + mdy*mdy) || 1;
    var px = -mdy / len, py = mdx / len;
    var sway = len * (0.14 + Math.random() * 0.11);
    var flip = Math.random() > 0.5 ? 1 : -1;
    nd.ph = 2;
    nd.t0 = now; nd.t1 = now + TRANSIT_MS + Math.random() * 140;
    nd.ax = x0; nd.ay = y0; nd.bx = x1; nd.by = y1;
    nd.qx = (x0 + x1) * 0.5 + px * sway * flip;
    nd.qy = (y0 + y1) * 0.5 + py * sway * flip;
    nd.x = x0; nd.y = y0;
  }
  function spawnTraveler(x0, y0, x1, y1, now, gen){
    if (nodes.length >= MAXN) return;
    var nd = { x:x0, y:y0, r:rnd(1.0, 2.4), alpha:rnd(0.35, 0.72), born:now,
               maxAge:rnd(2800, 6200), gen:gen || 0, pulse:rnd(0, Math.PI*2), ph:0 };
    beginTransit(nd, x0, y0, x1, y1, now);
    nodes.push(nd);
  }

  /* ── olive tendril web between neighboring marks, on the reef layer so it
     stays crisp instead of smearing into the matrix trail ── */
  function drawIconWeb(now, P){
    if (iconPts.length < 2) return;
    var drawn = 0;
    var bp = [null, null, null, null], bd = [0, 0, 0, 0];
    for (var i = 0; i < iconPts.length && drawn < 180; i++){
      var p = iconPts[i];
      nearIcons(p.x, p.y, LINKR, _scr2);
      var n = 0, z, w;
      for (var j = 0; j < _scr2.length; j++){
        var q = _scr2[j];
        if (q === p) continue;
        var dx = q.x - p.x, dy = q.y - p.y;
        var d = dx*dx + dy*dy;
        if (d > LINKR * LINKR || d < 81) continue;
        if (n < 4){ bp[n] = q; bd[n] = d; n++; }
        else {
          w = 0;
          for (z = 1; z < 4; z++) if (bd[z] > bd[w]) w = z;
          if (d < bd[w]){ bd[w] = d; bp[w] = q; }
        }
      }
      for (z = 0; z < n; z++){
        var nb = bp[z];
        /* one edge per pair: only the lower-indexed mark draws it */
        if (nb.i < p.i) continue;
        var dd = Math.sqrt(bd[z]), close = 1 - dd / LINKR;
        var sway = Math.sin(now * 0.002 + i * 1.3 + z * 2.1) * dd * 0.21;
        var cpx = (p.x + nb.x) * 0.5 - (nb.y - p.y) / dd * sway;
        var cpy = (p.y + nb.y) * 0.5 + (nb.x - p.x) / dd * sway;
        var la = Math.max(0.09, close * 0.66) * Math.min(p.a, nb.a) * fade * 3.1;
        rctx.beginPath();
        rctx.moveTo(p.x, p.y);
        rctx.quadraticCurveTo(cpx, cpy, nb.x, nb.y);
        rctx.strokeStyle = rgb(P.olive, Math.min(0.6, la));
        rctx.lineWidth = 0.95 + close * 0.85;
        rctx.lineCap = 'round';
        rctx.stroke();
        /* junction bead at the bend */
        var jr = (0.7 + (Math.sin(now * 0.003 + i + z) * 0.22 + 0.78) * 0.5) * close;
        if (jr > 0.3 && close > 0.42){
          rctx.beginPath();
          rctx.arc(cpx, cpy, jr, 0, Math.PI * 2);
          rctx.fillStyle = rgb(P.olive, Math.min(0.42, la * 0.6));
          rctx.fill();
        }
        drawn++;
        if (drawn >= 180) break;
      }
    }
    rctx.lineCap = 'butt';
  }

  /* ── node mesh, gridded so it never scans every pair ── */
  /* The grid bounds the SCAN, not the STROKES: 200 nodes inside one 55px link
     radius is 19,900 pairs, one stroke each, and a pointer held nearly still
     builds that cluster in seconds (measured 8,687 strokes in one frame, node
     degree 135; an ordinary sweep peaks near 1,950 and idle near 650, in
     scripts/check_homepage_animation_budgets.cjs). The icon web has had a
     180-edge budget since it was written; the mesh had none. Each node now
     links to its first MESH_DEGREE_CAP neighbours and the frame stops at
     MESH_EDGE_CAP. A node past the degree cap is one already sitting in a
     blob, where the extra lines only darkened it.
     Those two caps count STROKES; a pair that draws nothing still costs a
     check. Co-located $ (an absorbed $ snaps onto its mark) are all inside the
     5px floor, so a full pool on one point was 20,100 checks for 0 strokes.
     MESH_SCAN_CAP bounds the candidates one $ examines per frame, so a frame
     costs at most MAXN x 64 checks (10,720 on that cluster). Ordinary frames
     examine at most 36 (idle) and 55 (sweep) per $, and the harness redraws
     both with the cap lifted: no frame changes. Only a pointer held still on
     a cluster loses a few links, inside the blob the degree cap thins. */
  var NCELL = 55, nodeGrid = {};
  var NOFF = [[0,0],[1,0],[-1,1],[0,1],[1,1]];
  var MESH_EDGE_CAP = 1600, MESH_DEGREE_CAP = 16, MESH_SCAN_CAP = 64;
  function drawNodeMesh(P){
    nodeGrid = {};
    var i, n, k, drawn = 0;
    for (i = 0; i < nodes.length; i++){
      n = nodes[i];
      n.deg = 0;
      k = ((n.x / NCELL) | 0) + ':' + ((n.y / NCELL) | 0);
      if (nodeGrid[k]) nodeGrid[k].push(n); else nodeGrid[k] = [n];
    }
    for (var key in nodeGrid){
      var bkt = nodeGrid[key];
      var sp = key.split(':'), gx = +sp[0], gy = +sp[1];
      for (var a1 = 0; a1 < bkt.length; a1++){
        var A = bkt[a1], scanned = 0;
        for (var o = 0; o < 5 && A.deg < MESH_DEGREE_CAP && scanned < MESH_SCAN_CAP; o++){
          var ob = o === 0 ? bkt : nodeGrid[(gx + NOFF[o][0]) + ':' + (gy + NOFF[o][1])];
          if (!ob) continue;
          for (var b1 = o === 0 ? a1 + 1 : 0; b1 < ob.length && A.deg < MESH_DEGREE_CAP && scanned < MESH_SCAN_CAP; b1++){
            var B = ob[b1];
            scanned++;
            if (B.deg >= MESH_DEGREE_CAP) continue;
            var dx = A.x - B.x, dy = A.y - B.y, d2 = dx*dx + dy*dy;
            if (d2 > 3025 || d2 < 25) continue;
            var d = Math.sqrt(d2);
            rctx.beginPath(); rctx.moveTo(A.x, A.y); rctx.lineTo(B.x, B.y);
            rctx.strokeStyle = rgb(P.olive, Math.min(A.alpha, B.alpha) * fade * (1 - d / 55) * 0.44);
            rctx.lineWidth = 1; rctx.stroke();
            A.deg++; B.deg++;
            if (++drawn >= MESH_EDGE_CAP) return;
          }
        }
      }
    }
  }

  function drawReef(now, step){
    if (step == null) step = 1;
    var P = pal();
    rctx.clearRect(0, 0, W, H);
    if (active && fade < 1) fade = Math.min(1, fade + 0.08 * step);
    if (!active && fade > 0.40) fade = Math.max(0.40, fade - 0.008 * step);

    /* Expire first. The draw loop used to remove a $ past its age only after
       the hold, transit, absorb, pull and mesh passes had run, so on the frame
       it died it still sent travellers and drew links; and a full pool evicted
       the oldest live $ for a new one while expired $ still held slots. */
    for (var e = nodes.length - 1; e >= 0; e--){
      if (now - nodes[e].born > nodes[e].maxAge) nodes.splice(e, 1);
    }

    /* branches grow, curve, fork, and lay down nodes */
    for (var i = branches.length - 1; i >= 0; i--){
      var b = branches[i];
      b.life += step;
      if (b.life > b.maxLife){ branches.splice(i, 1); continue; }
      b.angle += b.curve * step;
      var nx = b.x + Math.cos(b.angle) * b.speed * step;
      var ny = b.y + Math.sin(b.angle) * b.speed * step;
      var la = b.alpha * fade * (1 - b.life / b.maxLife) * 1.45;
      rctx.beginPath();
      rctx.moveTo(b.x, b.y); rctx.lineTo(nx, ny);
      rctx.strokeStyle = rgb(P.olive, la);
      rctx.lineWidth = b.thickness * 1.15;
      rctx.stroke();
      b.x = nx; b.y = ny;
      if (!b.forked && b.gen < 3 && b.life > b.maxLife * 0.4 && Math.random() < frameEase(0.06, step)){
        b.forked = true;
        spawnBranch(b.x, b.y, b.angle + rnd(0.4, 1.0) * (Math.random() < 0.5 ? 1 : -1), b.gen + 1);
        if (Math.random() < 0.4) addNode(b.x, b.y, b.gen + 1, now);
      }
      if (Math.random() < frameEase(0.03, step)) addNode(b.x, b.y, b.gen, now);
    }

    /* the marks get their own tendril web, and the $ ride it */
    drawIconWeb(now, P);

    var nd, nlen = nodes.length;
    /* a held $ tracks the mark it is sitting on as that mark falls */
    for (i = 0; i < nlen; i++){
      nd = nodes[i];
      if (nd.ph !== 1) continue;
      var snap = nearestIcon(nd.x, nd.y, 30);
      /* lerp, never teleport: a hard snap made the $ ride a falling mark off screen */
      if (snap){ var holdEase = frameEase(0.35, step); nd.x += (snap.x - nd.x) * holdEase; nd.y += (snap.y - nd.y) * holdEase; }
      else if (nd.y > H + 8) { nd.ph = 0; }
    }
    /* a riding $ follows its quadratic bezier, sway and all */
    for (i = 0; i < nlen; i++){
      nd = nodes[i];
      if (nd.ph !== 2) continue;
      var tt = (now - nd.t0) / (nd.t1 - nd.t0);
      if (tt >= 1){ nd.x = nd.bx; nd.y = nd.by; nd.ph = 0; continue; }
      var om = 1 - tt;
      nd.x = om*om*nd.ax + 2*om*tt*nd.qx + tt*tt*nd.bx;
      nd.y = om*om*nd.ay + 2*om*tt*nd.qy + tt*tt*nd.by;
    }
    /* the hold expires: depart for a neighboring mark, and send copies to the rest */
    for (i = 0; i < nlen; i++){
      nd = nodes[i];
      if (nd.ph !== 1 || now - nd.hold < HOLD_MS) continue;
      var got = neighborTargets(nd.x, nd.y);
      if (!got){ nd.ph = 0; continue; }
      var ox = nd.x, oy = nd.y;
      beginTransit(nd, ox, oy, _tg[0].x, _tg[0].y, now);
      var cap = Math.min(4, got);
      for (var t = 1; t < cap; t++) spawnTraveler(ox, oy, _tg[t].x, _tg[t].y, now, nd.gen);
    }
    /* a free $ close enough to a mark is absorbed by it */
    for (i = 0; i < nlen; i++){
      nd = nodes[i];
      if (nd.ph) continue;
      if (now < nd.free) continue;
      var hit = nearestIcon(nd.x, nd.y, ABSORB_R);
      if (hit){ nd.ph = 1; nd.hold = now; nd.x = hit.x; nd.y = hit.y; }
    }
    /* and everything else drifts toward the nearest mark */
    if (iconPts.length && fade > 0.03){
      var PULLR = 110, PULLK = 0.065 * fade;
      for (i = 0; i < nlen; i++){
        nd = nodes[i];
        if (nd.ph || now < nd.free) continue;
        var tgt = nearestIcon(nd.x, nd.y, PULLR);
        if (!tgt) continue;
        var pdx = tgt.x - nd.x, pdy = tgt.y - nd.y;
        var pd = Math.sqrt(pdx*pdx + pdy*pdy);
        if (pd <= 0.6) continue;
        var f = frameEase((1 - pd / PULLR) * PULLK, step);
        nd.x += pdx * f; nd.y += pdy * f;
        nd.x = Math.max(-12, Math.min(W + 12, nd.x));
        nd.y = Math.max(-12, Math.min(H + 12, nd.y));
      }
    }

    drawNodeMesh(P);

    /* the $ nodes, blue on the left cross-fading to mint on the right */
    rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
    for (var n = nodes.length - 1; n >= 0; n--){
      nd = nodes[n];
      var age = now - nd.born;
      var a = nd.alpha * fade;
      if (age > nd.maxAge * 0.7) a *= 1 - (age - nd.maxAge * 0.7) / (nd.maxAge * 0.3);
      if (nd.ph) a = Math.min(1, a * 1.3);
      var p = Math.sin(now * 0.003 + nd.pulse) * 0.3 + 0.7;
      var px = Math.max(8, Math.min(15, nd.r * p * 3.8));
      if (nd.ph === 1) px *= 1.12;
      /* Bound the font raster cache while retaining the breathing effect. */
      px = Math.round(px * 2) / 2;
      var t2 = Math.max(0, Math.min(1, nd.x / W));
      var col = mixc(P.blue, P.mint, t2);
      rctx.save();
      rctx.font = '700 ' + px + 'px "JetBrains Mono", ui-monospace, monospace';
      rctx.shadowColor = rgb(mixc(P.blue, [52, 211, 153], t2), a * 0.4);
      rctx.shadowBlur = Math.min(7, px * 0.5);
      rctx.fillStyle = rgb(col, Math.min(1, a * 0.72 + 0.1));
      rctx.fillText('$', nd.x, nd.y);
      rctx.restore();
    }
  }

  /* ══ STACKED $: the pile that settles on the primary CTA, and that the cursor
     pushes around. Live constants: gravity 0.15, cursor radius 80, cursor
     strength 5, damping 0.3, friction 0.4, radius 7. ══ */
  var PILE_G = 0.15, PILE_CR = 80, PILE_CS = 5, PILE_DAMP = 0.3, PILE_FRIC = 0.4, PILE_R = 7;
  var pile = [], pileMax = 15, pcx = -1, pcy = -1, lastDrop = 0, ctaAt = 0, pileDirty = true;
  /* The stack only ever occupies a band above the button. Keeping the canvas to
     that band rather than the whole hero saves a full viewport layer of
     compositing every frame, which measured out at about six frames per second. */
  var PILE_BAND = 340, bandTop = 0, bandH = 0;
  var ctaTop = 0, ctaBottom = 0, ctaL = 0, ctaR = 0, ctaOK = false;
  function measureCta(){
    var b = hero.querySelector('.cta-row .btn-primary') || hero.querySelector('.cta-row .btn');
    if (!b){ ctaOK = false; return; }
    var br = b.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    if (br.width < 8){ ctaOK = false; return; }
    ctaTop = br.top - hr.top - 2;
    ctaBottom = br.bottom - hr.top;
    ctaL = br.left - hr.left;
    ctaR = ctaL + br.width;
    ctaOK = true;
    pileMax = W < 760 ? 8 : 15;
    var wantH = Math.min(H, PILE_BAND);
    var wantTop = Math.max(0, Math.min(H - wantH, ctaTop + 60 - wantH));
    if (Math.abs(wantTop - bandTop) > 1 || Math.abs(wantH - bandH) > 1){
      bandTop = wantTop; bandH = wantH;
      plC.style.top = bandTop + 'px';
      plC.style.bottom = 'auto';
      plC.style.height = bandH + 'px';
      plC.width = Math.floor(W * dpr);
      plC.height = Math.floor(bandH * dpr);
      /* hero coordinates in, band coordinates out */
      pctx.setTransform(dpr, 0, 0, dpr, 0, -bandTop * dpr);
      pileDirty = true;
    }
    /* The band is placed by script. Keep the canvas invisible until it has its
       place, so the move does not register as a layout shift (CLS 0.196 on the
       2026-10-12 audit, all of it this canvas). */
    plC.style.visibility = 'visible';
  }
  function pileSpawn(){
    if (!ctaOK || pile.length >= pileMax) return;
    pileDirty = true;
    var span = Math.max(1, (ctaR - ctaL) - PILE_R * 2 - 8);
    pile.push({ x: ctaL + PILE_R + 4 + Math.random() * span,
                y: bandTop + 2 + Math.random() * 12, vx: rnd(-0.25, 0.25), vy: rnd(0.4, 1.4) });
  }
  function pileSim(){
    if (!ctaOK || !pile.length) return;
    var moved = false;
    var ground = ctaTop - PILE_R;
    pile.sort(function(a, b){ return b.y - a.y; });
    for (var i = 0; i < pile.length; i++){
      var p = pile[i];
      p.vy += PILE_G;
      if (pcx >= 0){
        var dxm = p.x - pcx, dym = p.y - pcy;
        var dm = Math.sqrt(dxm*dxm + dym*dym) || 1;
        if (dm < PILE_CR){
          var force = PILE_CS * (1 - dm / PILE_CR);
          p.vx += (dxm / dm) * force;
          p.vy += (dym / dm) * force;
        }
      }
      p.x += p.vx; p.y += p.vy; p.vx *= 0.98;
      var on = p.x >= ctaL && p.x <= ctaR;
      if (on && p.y >= ground){
        p.y = ground;
        if (Math.abs(p.vy) < 0.5) p.vy = 0; else p.vy *= -PILE_DAMP;
        p.vx *= PILE_FRIC;
      }
      /* settled coins do not disturb each other, only kicked ones do */
      for (var j = i + 1; j < pile.length; j++){
        var o = pile[j];
        if (Math.abs(p.vx) + Math.abs(p.vy) < 1 && Math.abs(o.vx) + Math.abs(o.vy) < 1) continue;
        var dx = p.x - o.x, dy = p.y - o.y;
        var d = Math.sqrt(dx*dx + dy*dy) || 0.1;
        var minD = PILE_R * 2;
        if (d < minD){
          var ov = (minD - d) * 0.5, nx = dx / d, ny = dy / d;
          p.x += nx * ov; p.y += ny * ov;
          o.x -= nx * ov; o.y -= ny * ov;
          var rel = (p.vx - o.vx) * nx + (p.vy - o.vy) * ny;
          if (rel > 0){
            p.vx -= nx * rel * 0.5; p.vy -= ny * rel * 0.5;
            o.vx += nx * rel * 0.5; o.vy += ny * rel * 0.5;
          }
        }
      }
      on = p.x >= ctaL && p.x <= ctaR;
      if (on && p.y > ground) p.y = ground;
      if (Math.abs(p.vx) > 0.02 || Math.abs(p.vy) > 0.02) moved = true;
      if (p.y > bandTop + bandH + 16 || p.y < bandTop - 10 || p.x < -50 || p.x > W + 50){ pile.splice(i, 1); i--; moved = true; }
    }
    /* a settled stack is static, so its canvas does not need repainting */
    if (moved) pileDirty = true;
  }
  function drawPile(){
    if (!pileDirty) return;
    pileDirty = false;
    var P = pal();
    pctx.clearRect(0, bandTop, W, bandH);
    if (!pile.length) return;
    pctx.save();
    pctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace';
    pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    pctx.fillStyle = rgb(P.olive, 0.7);
    pctx.shadowColor = rgb(P.olive, 0.3);
    pctx.shadowBlur = 4;
    for (var i = 0; i < pile.length; i++) pctx.fillText('$', pile[i].x, pile[i].y);
    pctx.restore();
  }

  /* ── pointer drives the reef and the pile; an ambient drip keeps it alive when idle ── */
  /* The browser cancels touch pointer events when a native pan starts. Passive
     touch events keep the decorative reef following a single finger through
     that pan, while links, page scrolling and pinch zoom remain native. */
  var heroTouchId = null, heroTouchBlocked = false;
  function stopHeroInput(){
    matrixHovered = false;
    active = false; vel = 0; pmx = -1; pmy = -1; pcx = -1; pcy = -1;
    warpX = null; warpY = null; warpTX = null; warpTY = null;
  }
  function trackHeroInput(clientX, clientY, press, isTouch){
    if (reduce) return;
    var r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var x = (clientX-r.left) * W/r.width, y = (clientY-r.top) * H/r.height;
    if (x < 0 || x > W || y < 0 || y > H){ stopHeroInput(); return; }
    var now = performance.now();
    if (press){ vel = 1.2; }
    else if (pmx >= 0){
      /* Distance over TIME, so the spray reads the hand, not the event rate.
         The floor was one 60 Hz frame, which halved vel on a 120 Hz pointer
         and quartered it at 240 Hz for the same hand speed; 4ms only guards
         two events landing inside the same millisecond. */
      var dt = Math.max(4, now-lastMove);
      vel = Math.hypot(x-pmx, y-pmy) / dt * 10;
    }
    pmx = x; pmy = y; mx = x; my = y; lastMove = now;
    warpTX = x; warpTY = y; pcx = x; pcy = y; active = true;
    if (press || now-lastSpawn > 40){
      lastSpawn = now; spawnCluster(x, y, vel, now, isTouch);
    }
  }
  function mouseHoverInput(e){
    return !reduce && e.pointerType === 'mouse' && heroTouchId === null &&
      !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
  }
  hero.addEventListener('pointerenter', function(e){
    if (mouseHoverInput(e)) matrixHovered = true;
  }, {passive:true});
  hero.addEventListener('pointermove', function(e){
    if (e.pointerType !== 'touch'){
      if (mouseHoverInput(e)) matrixHovered = true;
      else resetMatrixHover();
      trackHeroInput(e.clientX, e.clientY, false, false);
    }
  }, {passive:true});
  hero.addEventListener('pointerdown', function(e){
    if (e.pointerType !== 'touch'){
      if (mouseHoverInput(e)) matrixHovered = true;
      else resetMatrixHover();
      trackHeroInput(e.clientX, e.clientY, true, false);
    }
  }, {passive:true});
  /* A touch anywhere ends prior mouse hover on hybrid devices. */
  document.addEventListener('touchstart', resetMatrixHover, {passive:true,capture:true});
  window.addEventListener('blur', resetMatrixHover);
  hero.addEventListener('pointerleave', function(e){
    if (e.pointerType !== 'touch') stopHeroInput();
  }, {passive:true});
  hero.addEventListener('pointercancel', function(e){
    if (e.pointerType !== 'touch') stopHeroInput();
  }, {passive:true});
  hero.addEventListener('pointerup', function(e){
    if (e.pointerType === 'pen') stopHeroInput();
  }, {passive:true});
  hero.addEventListener('touchstart', function(e){
    resetMatrixHover();
    if (e.touches.length !== 1){
      heroTouchId = null; heroTouchBlocked = true; stopHeroInput(); return;
    }
    /* A one-finger start is a fresh gesture, including after the last pinch
       finger lifted outside the hero and its touchend did not bubble here. */
    heroTouchBlocked = false;
    var t = e.touches[0];
    heroTouchId = t.identifier;
    trackHeroInput(t.clientX, t.clientY, true, true);
  }, {passive:true});
  hero.addEventListener('touchmove', function(e){
    if (e.touches.length !== 1){
      heroTouchId = null; heroTouchBlocked = true; stopHeroInput(); return;
    }
    if (heroTouchBlocked || heroTouchId === null) return;
    var t = e.touches[0];
    if (t.identifier === heroTouchId) trackHeroInput(t.clientX, t.clientY, false, true);
  }, {passive:true});
  function endHeroTouch(e){
    heroTouchId = null; heroTouchBlocked = e.touches.length > 0; stopHeroInput();
  }
  hero.addEventListener('touchend', endHeroTouch, {passive:true});
  hero.addEventListener('touchcancel', endHeroTouch, {passive:true});

  var ambient = 0, previousFrame = null, pileSteps = 0;
  function frame(timestamp){
    var now = typeof timestamp === 'number' ? timestamp : performance.now();
    var step = previousFrame == null ? 1 : Math.min(3, Math.max(0, (now - previousFrame) / FRAME_MS));
    previousFrame = now;
    if (warpTX != null){
      var warpEase = frameEase(0.18, step);
      warpX = (warpX == null) ? warpTX : warpX + (warpTX - warpX) * warpEase;
      warpY = (warpY == null) ? warpTY : warpY + (warpTY - warpY) * warpEase;
    }
    if (!active && now - ambient > 620){
      ambient = now;
      spawnCluster(rnd(W * 0.06, W * 0.94), rnd(H * 0.12, H * 0.88), 0.2, now);
    }
    if (now - ctaAt > 700){ ctaAt = now; measureCta(); }
    if (now - lastDrop > 640){ lastDrop = now; pileSpawn(); }
    drawMatrix(now, 0.10, step);
    drawReef(now, step);
    /* Keep collision physics on its original 60 Hz clock. Bound catch-up work. */
    pileSteps = Math.min(3, pileSteps + step);
    while (pileSteps >= 1){ pileSim(); pileSteps -= 1; }
    drawPile();
    heroRaf = heroAwake() ? requestAnimationFrame(frame) : 0;
  }

  /* Three canvases, two of them the full viewport, painted 60 times a second
     for as long as the tab lived: scrolled past, in a background tab, and
     through a pinch, when WebKit is simultaneously rasterizing every layer at
     the zoom scale. That sustained cost is what the tab ran out of memory on.
     Painting a field nobody can see buys nothing, so stop when the hero is off
     screen or the tab is hidden and pick up where it left off on return. This
     is NOT the rejected "pause the animation at high zoom" workaround: nothing
     here keys on zoom, and anything on screen keeps animating exactly as it
     did. */
  var heroRaf = 0, heroSeen = true;
  var heroWoken = false;
  function heroAwake(){ return heroWoken && heroSeen && !document.hidden && !reduce; }
  function heroStart(){ if (!heroRaf && heroAwake()){ previousFrame = null; heroRaf = requestAnimationFrame(frame); } }
  function heroStop(){ if (heroRaf){ cancelAnimationFrame(heroRaf); heroRaf = 0; } previousFrame = null; pileSteps = 0; resetMatrixHover(); }
  if (window.IntersectionObserver){
    new IntersectionObserver(function(es){
      heroSeen = es[0].isIntersecting;
      heroSeen ? heroStart() : heroStop();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function(){
    document.hidden ? heroStop() : heroStart();
  });

  function refreshMotion(){
    reduce = motionQuery.matches;
    if (reduce){ heroStop(); staticFrame(); } else { heroStart(); }
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', refreshMotion);
  else motionQuery.addListener(refreshMotion);

  /* one static composition: the field is present, nothing moves */
  function staticFrame(){
    var t = performance.now();
    for (var c = 0; c < cols.length; c++) cols[c].y = rnd(H * 0.1, H * 1.05);
    mctx.clearRect(0, 0, W, H);
    drawMatrix(t, 0.25);
    drawReef(t);
    measureCta();
    pile.length = 0;
    for (var s = 0; s < pileMax; s++) pileSpawn();
    for (var k = 0; k < 320; k++) pileSim();
    drawPile();
  }

  function onIconsReady(){
    /* Replace startup fallback glyphs once image decoding finishes. */
    buildColumns(true);
    if (reduce) staticFrame();
  }

  var resizeTimer = null;
  window.addEventListener('resize', function(){
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      resizeTimer = null;
      resize();
      if (reduce) staticFrame();
    }, 200);
  }, { passive: true });
  resize();
  if (reduce){
    for (var s = 0; s < 90; s++) spawnCluster(rnd(W*0.05, W*0.95), rnd(H*0.1, H*0.9), 0.2, performance.now());
    fade = 0.5;
    staticFrame();
  } else {
    for (var s2 = 0; s2 < 26; s2++) spawnCluster(rnd(W*0.05, W*0.95), rnd(H*0.1, H*0.9), 0.2, performance.now() - rnd(0, 2000));
    fade = 0.46;
    /* FIRST PAINT IS ONE STILL FRAME; THE LOOP WAITS FOR THE VISITOR (2026-10-12).
       Measured on the built page under a 4x CPU slowdown: a 46 ms median frame, 132 ms
       at the 90th percentile, 33 long tasks totalling 10.4 s in the first twelve seconds,
       and a Lighthouse total blocking time of 5.8 s, all from a decorative field drawn
       before anyone had touched the page. One frame is drawn now so the hero is never
       blank; the 60 Hz loop starts on the first pointer, touch, key, wheel or scroll
       anywhere on the page, or after eight seconds in view for a visitor who never
       interacts. Reduced motion keeps its still composition above. */
    frame(performance.now());
    var wakeEvents = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
    function wakeHero(){
      if (heroWoken) return;
      heroWoken = true;
      wakeEvents.forEach(function(ev){ document.removeEventListener(ev, wakeHero, true); });
      heroStart();
    }
    wakeEvents.forEach(function(ev){ document.addEventListener(ev, wakeHero, { capture: true, passive: true }); });
    setTimeout(wakeHero, 8000);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ buildColumns(); });
})();

/* ONE DIAL, TWO SIZES. This is vaultMountDial verbatim from vault.js, which is
   this page's own dial code after the 1b331cd7b extraction plus the compact
   branches. Replacing the hardwired copy with the shared one is what makes the
   header mark here and the header mark on the other 50 pages the same object
   rather than two things that resemble each other. */
function vaultMountDial(cv, opts){
  if (!cv) return;
  opts = opts || {};
  var compact = !!opts.compact;
  var minSize = opts.minSize || (compact ? 120 : 200);
  var ctx = cv.getContext('2d'), TAU = Math.PI * 2;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = motionQuery.matches;
  var spin = 0, size = 320, root = document.documentElement;
  var SPIN_SCALE = compact ? 5.2 : 1;
  /* Every rate below is per 60 Hz frame. frame() scales them by the real
     interval, the way the hero field does, because requestAnimationFrame runs
     at the display's rate: measured 2.0x at 120 Hz on spin, grind, glow, bolt
     fade, spark life and sparks per second before this (see
     scripts/check_homepage_animation_budgets.cjs). */
  var DIAL_FRAME_MS = 1000 / 60, previousFrame = null, sparkDebt = 0;
  var COARSE_DIAL = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  /* draw() read four computed styles off the root every frame, on both dials,
     to fetch three custom properties and the colour scheme. Each read resolves
     the whole root style. Measured at 390x844 dpr3: 5,094 style resolutions in
     three idle seconds, ~1,700 a second for values that change only when the
     theme does. Resolve them on a flag instead, and set the flag from the two
     things that can actually change them. */
  var skinDirty = true, skinA, skinHot, skinInk, skinDark;
  function readSkin(){
    skinDirty = false;
    var cs = getComputedStyle(root);
    skinA    = cs.getPropertyValue('--accent').trim()     || '#5b9cf5';
    skinHot  = cs.getPropertyValue('--accent-hot').trim() || '#7ab0ff';
    skinInk  = cs.getPropertyValue('--ink-mute').trim()   || '#9ca3af';
    skinDark = cs.colorScheme.indexOf('dark') > -1;
  }
  /* The loop can be stopped when the theme flips (off screen, hidden tab,
     reduced motion), and a stopped loop would leave the old palette baked into
     a canvas that is about to come back into view. Mark the skin stale, and
     repaint here if nothing else is going to. */
  function reskin(){ skinDirty = true; if (!raf) draw(); }
  if (window.MutationObserver){
    new MutationObserver(reskin)
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  (function(){
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener ? mq.addEventListener('change', reskin) : mq.addListener(reskin);
  })();
  function rgbaA(c, a){ return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rgba(hex, a){
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var n = parseInt(hex, 16);
    return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
  }
  /* ── THE GRIND ──────────────────────────────────────────────────────────────
     Bring the cursor to the rim and it bites: sparks are thrown along the tangent,
     in the direction the ring turns, then fall and burn out. The contact keeps a
     hot glow that outlives it for a moment. All of this lives in the dial's
     translated space, origin at the centre. */
  var sparks = [], cur = null, grind = 0, grindA = 0, curSpeed = 0;
  var SPARK_MAX = 340;
  /* Which way you drag decides what the rim does. The ring turns clockwise, so a
     clockwise drag rides WITH it and glides: a lighter, gold shower. A
     counterclockwise drag cuts AGAINST it, bites, throws red and yellow, and
     drags the wheel down. grindDir is +1 with, -1 against, 0 while still. */
  var grindDir = 0, lastA = null, dirHeld = 0, strike = 0;
  /* true only while the pointer is actually TRAVELLING along the rim */
  var gMoving = false;
  /* one ding per bolt: it lights teal as the contact point passes over it */
  var boltDing = new Array(19).fill(0);
  var captionTarget = null, captionGlow = { ticks: 0, bolts: 0 }, captionTime = 0;
  /* the core lights while the cursor is anywhere on the dial */
  var coreGlow = 0;
  var RED   = [255, 92, 38],  YEL  = [255, 214, 96];   /* hot metal */
  var ROYAL = [58, 96, 232],  TEAL = [42, 214, 196];   /* cold arc  */
  var TEAL_PALE = [168, 245, 236];
  /* Pointer coordinates below are compared against `size`, the LOGICAL dial
     space, not the CSS box, so they only agree when the two are the same
     scale. A compact dial is drawn at minSize and displayed far smaller, so
     attaching these would put the contact test in the wrong coordinate space
     as well as spend a rim-grind budget on a 30px ornament. */
  if (!compact){
    var stage = cv.closest('.dialstage') || cv;
    var rim = stage.querySelector('#dial-gesture-rim');
    var dragId = null, lastTrack = 0;
    var track = function(e){
      if (e.isPrimary === false || (dragId !== null && e.pointerId !== dragId)) return;
      var b = cv.getBoundingClientRect();
      var nx = (e.clientX - b.left) * size / b.width;
      var ny = (e.clientY - b.top) * size / b.height;
      /* px per 60 Hz frame (1000/60 ms), whatever the event rate: a 120 Hz
         pointer reports half the distance per event for the same hand speed,
         and read raw it halved the sparks. The literal keeps this block
         standalone for check_homepage_matrix.cjs, which runs it alone. */
      var now = performance.now();
      if (cur) curSpeed = Math.min(3, Math.hypot(nx - cur.x, ny - cur.y) * (1000 / 60) / Math.max(4, now - lastTrack));
      lastTrack = now;
      cur = { x: nx, y: ny };
    };
    stage.addEventListener('pointermove', track, {passive:true});
    /* A tap gets a short glow. A rim drag retains its pointer even when the
       finger leaves the ring, and touch-action decides ownership before the
       browser can turn a vertical segment into a page scroll. */
    var HOLD_MS = 260, holdUntil = 0, holdTimer = null;
    stage.addEventListener('pointerdown', function(e){
      if (e.isPrimary === false || dragId !== null) return;
      if (holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
      curSpeed = 0; track(e);
      holdUntil = performance.now() + HOLD_MS;
      if (rim && e.target === rim){
        dragId = e.pointerId;
        stage.setPointerCapture(e.pointerId);
      }
    }, {passive:true});
    var clear = function(){ cur = null; curSpeed = 0; holdTimer = null; };
    var release = function(e){
      if (dragId !== null && e.pointerId !== dragId) return;
      var ended = dragId;
      dragId = null;
      if (ended !== null && stage.hasPointerCapture(ended)) stage.releasePointerCapture(ended);
      if (e.type === 'pointercancel'){
        if (holdTimer) clearTimeout(holdTimer);
        clear();
        return;
      }
      var left = holdUntil - performance.now();
      if (left > 0){
        if (!holdTimer) holdTimer = setTimeout(clear, left);
        return;
      }
      if (holdTimer) clearTimeout(holdTimer);
      clear();
    };
    stage.addEventListener('pointerleave', function(e){ if (dragId === null) release(e); });
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('pointerup', release);
    stage.addEventListener('lostpointercapture', function(e){ if (e.pointerId === dragId) release(e); });

    /* Captions explain the two measured rings. Touch uses a brief afterglow,
       while keyboard focus stays lit; native scrolling owns caption drags. */
    var figure = cv.closest('.dialfig');
    var captions = figure ? Array.from(figure.querySelectorAll('[data-dial-highlight]')) : [];
    var captionHover = null, captionFocus = null, captionPress = null;
    var captionPointer = null, captionPulse = null, captionTimer = null;
    var captionTouchId = null, captionTouchBlocked = false, captionClient = null;
    function syncCaption(){
      var next = captionPress || captionHover || captionFocus || captionPulse;
      if (next === captionTarget) return;
      captionTarget = next;
      captions.forEach(function(button){
        button.classList.toggle('is-active', button.dataset.dialHighlight === captionTarget);
      });
      if (!raf){
        captionGlow.ticks = captionTarget === 'ticks' ? 1 : 0;
        captionGlow.bolts = captionTarget === 'bolts' ? 1 : 0;
        draw();
      }
    }
    function clearCaptionPulse(){
      if (captionTimer) clearTimeout(captionTimer);
      captionTimer = null; captionPulse = null;
    }
    function pulseCaption(kind){
      clearCaptionPulse(); captionPulse = kind; syncCaption();
      captionTimer = setTimeout(function(){ captionTimer = null; captionPulse = null; syncCaption(); }, 550);
    }
    captions.forEach(function(button){
      var kind = button.dataset.dialHighlight;
      button.addEventListener('pointerenter', function(e){
        if (e.pointerType === 'touch') return;
        clearCaptionPulse(); captionHover = kind; syncCaption();
      }, {passive:true});
      button.addEventListener('pointerleave', function(e){
        if (e.pointerType === 'touch') return;
        captionHover = null; syncCaption();
      }, {passive:true});
      button.addEventListener('focus', function(){
        if (button.matches(':focus-visible')){ captionFocus = kind; syncCaption(); }
      });
      button.addEventListener('blur', function(){ captionFocus = null; syncCaption(); });
      button.addEventListener('pointerdown', function(e){
        if (e.pointerType === 'touch') return;
        clearCaptionPulse(); captionFocus = null;
        if (e.isPrimary !== false && e.pointerType !== 'mouse'){
          captionPointer = e.pointerId; captionPress = kind;
        }
        syncCaption();
      }, {passive:true});
      button.addEventListener('pointermove', function(e){
        if (e.pointerId !== captionPointer) return;
        var box = button.getBoundingClientRect();
        captionPress = e.clientX >= box.left && e.clientX <= box.right &&
          e.clientY >= box.top && e.clientY <= box.bottom ? kind : null;
        syncCaption();
      }, {passive:true});
      button.addEventListener('click', function(){ pulseCaption(kind); });
    });
    function releaseCaption(e){
      if (e.pointerId !== captionPointer) return;
      var kind = captionPress;
      captionPress = null; captionPointer = null;
      if (e.type === 'pointerup' && kind) pulseCaption(kind);
      else { clearCaptionPulse(); syncCaption(); }
    }
    window.addEventListener('pointerup', releaseCaption, {passive:true});
    window.addEventListener('pointercancel', releaseCaption, {passive:true});

    /* A native pan cancels pointer events, but touch events keep their original
       target. Hit-test the current finger position so slides can enter either
       label, cross between them, and keep working while the page scrolls. */
    function trackCaptionTouch(touch){
      captionClient = {clientX:touch.clientX, clientY:touch.clientY};
      var hit = document.elementFromPoint(touch.clientX, touch.clientY);
      var button = hit && hit.closest ? hit.closest('[data-dial-highlight]') : null;
      captionPress = captions.indexOf(button) >= 0 ? button.dataset.dialHighlight : null;
      syncCaption();
    }
    function endCaptionTouch(afterglow){
      var kind = captionPress;
      captionTouchId = null; captionClient = null; captionPress = null;
      if (afterglow && kind) pulseCaption(kind);
      else { clearCaptionPulse(); syncCaption(); }
    }
    function clearCaptionInput(){
      captionHover = captionFocus = captionPress = captionPointer = null;
      captionTouchId = null; captionClient = null; captionTouchBlocked = false;
      clearCaptionPulse(); syncCaption();
    }
    if (captions.length){
      document.addEventListener('touchstart', function(e){
        clearCaptionPulse(); captionHover = captionFocus = captionPointer = null;
        if (e.touches.length !== 1){
          captionTouchBlocked = true; endCaptionTouch(false); return;
        }
        captionTouchBlocked = false; captionTouchId = e.touches[0].identifier;
        trackCaptionTouch(e.touches[0]);
      }, {passive:true,capture:true});
      document.addEventListener('touchmove', function(e){
        if (e.touches.length !== 1){
          captionTouchBlocked = true; endCaptionTouch(false); return;
        }
        if (captionTouchBlocked || captionTouchId === null) return;
        var touch = e.touches[0];
        if (touch.identifier === captionTouchId) trackCaptionTouch(touch);
      }, {passive:true,capture:true});
      document.addEventListener('touchend', function(e){
        captionTouchBlocked = e.touches.length > 0;
        endCaptionTouch(!captionTouchBlocked);
      }, {passive:true,capture:true});
      document.addEventListener('touchcancel', function(e){
        captionTouchBlocked = e.touches.length > 0; endCaptionTouch(false);
      }, {passive:true,capture:true});
      document.addEventListener('scroll', function(){
        if (captionTouchId !== null && captionClient && !captionTouchBlocked) trackCaptionTouch(captionClient);
      }, {passive:true,capture:true});
      document.addEventListener('visibilitychange', function(){ if (document.hidden) clearCaptionInput(); });
    }
    window.addEventListener('blur', clearCaptionInput);
  }

  /* The rect read is the other half of the same bill as the style reads above:
     getBoundingClientRect forces a layout flush, and fit() ran from draw(),
     once per frame, on two dials. The dial's box only moves on a resize or a
     font load, so measure on a flag too. setTransform stays unconditional and
     costs no flush, and it has to, because a reallocation clears it. */
  var boxDirty = true, dpr = 1;
  function fit(){
    if (boxDirty){
      boxDirty = false;
      var r = cv.getBoundingClientRect();
      size = Math.max(minSize, r.width || 320);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      /* Assigning canvas.width or canvas.height destroys and reallocates the
         backing store even when the value is unchanged. That was 120 full
         canvas reallocations a second, which is what iOS Safari runs out of
         memory on while it is also rasterizing the page at a pinch-zoom
         scale. Reallocate only on a real size change. */
      var w = Math.floor(size * dpr), h = w;
      if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(step){
    if (!(step > 0)) step = 1;
    fit();
    if (skinDirty) readSkin();
    var A = skinA, HOT = skinHot, INK = skinInk, dark = skinDark;
    var R = size * 0.385;
    var captionNow = performance.now();
    var captionEase = reduce ? 1 : 1 - Math.exp(-(captionNow - captionTime) / 100);
    captionTime = captionNow;
    ['ticks', 'bolts'].forEach(function(kind){
      var target = captionTarget === kind ? 1 : 0;
      captionGlow[kind] += (target - captionGlow[kind]) * captionEase;
      if (Math.abs(target - captionGlow[kind]) < 0.001) captionGlow[kind] = target;
    });
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size/2, size/2);

    var face = ctx.createRadialGradient(-R*0.35, -R*0.4, R*0.05, 0, 0, R);
    face.addColorStop(0, dark ? 'rgba(214,240,255,.05)' : 'rgba(255,255,255,.92)');
    face.addColorStop(0.55, dark ? 'rgba(214,240,255,.013)' : 'rgba(255,255,255,.4)');
    face.addColorStop(1, dark ? 'rgba(0,0,0,.45)' : 'rgba(60,72,90,.22)');
    ctx.beginPath(); ctx.arc(0, 0, R*0.97, 0, TAU); ctx.fillStyle = face; ctx.fill();

    [0.97, 0.885, 0.70, 0.40].forEach(function(k, i){
      ctx.beginPath(); ctx.arc(0, 0, R*k, 0, TAU);
      ctx.strokeStyle = rgba(INK, i === 0 ? (dark ? .42 : .60) : (dark ? .22 : .36));
      ctx.lineWidth = i === 0 ? 1.4 : 1; ctx.stroke();
    });

    ctx.save(); ctx.rotate(spin * 0.55);
    var tickGlow = captionGlow.ticks;
    ctx.shadowColor = rgba(A, .8); ctx.shadowBlur = 8 * tickGlow;
    for (var i = 0; i < 52; i++){
      var a = (i/52)*TAU - Math.PI/2, major = i % 13 === 0;
      var r1 = R*0.905, r2 = R*((major ? 0.955 : 0.935) + (major ? .01 : .025)*tickGlow);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r1, Math.sin(a)*r1);
      ctx.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
      /* A tick drawn 1px wide in a 120px space is a fifth of a pixel once the
         header displays it at 26. Compact keeps all 52 ticks and the 13-major
         rhythm, but paints them in accent and thickens them, so the rim still
         reads blue at the size it is actually shown. */
      ctx.strokeStyle = compact ? (major ? rgba(A, 1) : rgba(A, .60))
                                : (tickGlow > .01 ? rgba(A, major ? .92 + .08*tickGlow : .5 + .5*tickGlow) : (major ? rgba(A, .92) : rgba(INK, .5)));
      ctx.lineWidth = compact ? (major ? 3 : 1.7) : (major ? 2 : 1) + 1.7*tickGlow; ctx.stroke();
    }
    /* No index mark on the rim. One was added here on 2026-08-28 to break the
       ring's 52-fold symmetry, which is what made the header dial look frozen,
       and removed the same day on author instruction ("remove the orange tick").
       The symmetry problem is real and did not go away with it, so the motion
       cue moved to the CORE instead, which is 1-fold already and needs no mark
       added to the face. See the conic rotation below. */
    ctx.restore();

    ctx.save(); ctx.rotate(-spin * 0.32);
    for (var b = 0; b < 19; b++){
      var ab = (b/19)*TAU - Math.PI/2;
      /* the bolt's angle in unrotated space, so it can be compared to the contact */
      if (cur){
        /* the bolt's real position, then a distance test against the cursor: an
           angle test alone dinged every bolt on the same bearing from the centre */
        var abs = ab - spin * 0.32;
        var hx = Math.cos(abs) * R * 0.795, hy = Math.sin(abs) * R * 0.795;
        var mdx = (cur.x - size/2) - hx, mdy = (cur.y - size/2) - hy;
        /* A FINGER CANNOT FIND A 6px DISC, the same fault the rim band already
           carries a coarse branch for. 0.028R at 1.9 is a 6.0px radius on the
           295px dial a 390px phone renders, against a contact patch tens of
           pixels across, so a drag crossed the bolts and dinged nothing. The
           bolts sit at 0.795R, which puts 29.8px between neighbours there, so
           the coarse target is capped just under half that: it is reachable by
           touch and still cannot light two bolts at once. */
        var boltHit = R * 0.028 * (COARSE_DIAL ? 4.5 : 1.9);
        if (Math.sqrt(mdx*mdx + mdy*mdy) < boltHit) boltDing[b] = 1;
      }
      var bx = Math.cos(ab)*R*0.795, by = Math.sin(ab)*R*0.795,
          br = R*(compact ? 0.045 : 0.028);
      var g = ctx.createRadialGradient(bx - br*0.4, by - br*0.5, 0, bx, by, br);
      g.addColorStop(0, rgba(HOT, .88)); g.addColorStop(1, rgba(A, .42));
      ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = rgba(A, .75); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - Math.cos(ab)*br*0.55, by - Math.sin(ab)*br*0.55);
      ctx.lineTo(bx + Math.cos(ab)*br*0.55, by + Math.sin(ab)*br*0.55);
      ctx.strokeStyle = dark ? 'rgba(0,0,0,.55)' : 'rgba(30,40,55,.4)'; ctx.stroke();
      /* the ding: a teal ring that rings out and fades */
      var dv = Math.max(boltDing[b], captionGlow.bolts);
      if (dv > 0.02){
        var dr = br * (1.5 + (1 - dv) * 2.6);
        ctx.beginPath(); ctx.arc(bx, by, dr, 0, TAU);
        ctx.strokeStyle = rgbaA(TEAL, 0.7 * dv); ctx.lineWidth = 1.6 * dv; ctx.stroke();
        var dg = ctx.createRadialGradient(bx, by, 0, bx, by, br * 2.2);
        dg.addColorStop(0, rgbaA(TEAL_PALE, 0.75 * dv));
        dg.addColorStop(1, rgbaA(TEAL, 0));
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(bx, by, br * 2.2, 0, TAU); ctx.fill();
      }
      boltDing[b] = boltDing[b] > 0.02 ? boltDing[b] * Math.pow(0.9, step) : 0;
    }
    ctx.restore();

    ctx.save(); ctx.rotate(spin * 0.18);
    /* the spokes are decorative grey and only muddy the mark at header size */
    for (var q = 0; q < (compact ? 0 : 4); q++){
      ctx.save(); ctx.rotate(q*(TAU/4) + Math.PI/4);
      ctx.beginPath();
      ctx.moveTo(R*0.42, -R*0.028); ctx.lineTo(R*0.865, -R*0.013);
      ctx.lineTo(R*0.865,  R*0.013); ctx.lineTo(R*0.42,  R*0.028);
      ctx.closePath();
      ctx.fillStyle = rgba(INK, dark ? .16 : .22); ctx.fill();
      ctx.strokeStyle = rgba(INK, .3); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    /* the well: the black-hole read, a deep recess with a bright event rim */
    var well = ctx.createRadialGradient(0, 0, R*0.02, 0, 0, R*0.40);
    well.addColorStop(0, dark ? 'rgba(0,0,0,.92)' : 'rgba(30,40,55,.34)');
    well.addColorStop(0.72, dark ? 'rgba(0,0,0,.55)' : 'rgba(30,40,55,.12)');
    well.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(0, 0, R*0.40, 0, TAU); ctx.fillStyle = well; ctx.fill();
    /* AUTHOR, 2026-08-27: "tokenization systems block rainbow orb and disc icon
       are duplicative. Combine all." The header carried two round marks side by
       side: the brand's dark-rainbow orb (styles.css header .brand a
       strong::before) and this dial. Rather than drop either, the orb becomes
       the dial's CORE, so one mark carries both. The five stops are the site's
       own accent rotation, copied from that rule, not a new palette. CSS conic
       0deg points up and canvas 0rad points right, hence the -90deg. */
    if (compact && ctx.createConicGradient){
      /* AUTHOR, 2026-08-28: "the rainbow colors dont look like they fit the
         rest of the brand identity." They did not: the old five stops were
         navy, VIOLET, ROSE, amber, teal, and violet and rose appear nowhere
         else on this site. The brand is three colours with meanings already
         attached, --brand-blue #2563eb (Track A), --brand-teal #0d9488
         (Track B) and --brand-gold, so the core is built from those and their
         teal-400 companion. Blue through teal is the short hop, gold is the
         single glint, and blue closes the circle. */
      /* THE CORE IS THE MOTION CUE, now that the rim carries no index.
         The ring cannot supply one: 52 evenly spaced ticks look identical every
         6.923 degrees, so it reads as frozen at any speed (measured: frame
         difference rose to 5.9/255 then fell back to 1.06 as the pattern
         re-aligned). This gradient has three distinct brand colours and ONE of
         each, so rotating it is unambiguous movement with nothing added to the
         face. spin*0.55 matches the tick layer, so core and rim turn together
         rather than reading as two mechanisms. */
      var orb = ctx.createConicGradient((200 - 90) * Math.PI / 180 + spin * 0.55, 0, 0);
      orb.addColorStop(0,    '#2563eb'); orb.addColorStop(0.28, '#0d9488');
      orb.addColorStop(0.52, '#2dd4bf'); orb.addColorStop(0.78, '#a16207');
      orb.addColorStop(1,    '#2563eb');
      ctx.beginPath(); ctx.arc(0, 0, R*0.185, 0, TAU);
      ctx.fillStyle = orb; ctx.fill();
      /* the orb's specular highlight, top-left, as in the CSS original */
      var spec = ctx.createRadialGradient(-R*0.055, -R*0.065, 0, 0, 0, R*0.185);
      spec.addColorStop(0,    'rgba(255,255,255,.55)');
      spec.addColorStop(0.28, 'rgba(255,255,255,.10)');
      spec.addColorStop(0.62, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(0, 0, R*0.185, 0, TAU);
      ctx.fillStyle = spec; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, R*0.185, 0, TAU);
    ctx.strokeStyle = rgba(A, compact ? .95 : .55);
    ctx.lineWidth = compact ? 2.6 : 1.2; ctx.stroke();
    var halo = ctx.createRadialGradient(0, 0, R*0.185, 0, 0, R*0.30);
    halo.addColorStop(0, rgba(HOT, .22)); halo.addColorStop(1, rgba(HOT, 0));
    ctx.beginPath(); ctx.arc(0, 0, R*0.30, 0, TAU); ctx.fillStyle = halo; ctx.fill();

    /* hover glow, held INSIDE the inner ring so the core lights rather than the disc */
    coreGlow = cur ? Math.min(1, coreGlow + 0.07 * step) : Math.max(0, coreGlow - 0.045 * step);
    if (coreGlow > 0.01){
      var cg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R*0.185);
      cg2.addColorStop(0,   rgba(HOT, 0.272 * coreGlow));
      cg2.addColorStop(0.55, rgba(A,  0.16 * coreGlow));
      cg2.addColorStop(1,   rgba(A, 0));
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.arc(0, 0, R*0.185, 0, TAU); ctx.fill();
      /* the barrier ring itself brightens a touch */
      ctx.beginPath(); ctx.arc(0, 0, R*0.185, 0, TAU);
      ctx.strokeStyle = rgba(HOT, 0.24 * coreGlow); ctx.lineWidth = 1.6; ctx.stroke();
    }

    /* is the cursor riding the rim? */
    var contact = false;
    if (cur){
      var ddx = cur.x - size/2, ddy = cur.y - size/2;
      var dd = Math.sqrt(ddx*ddx + ddy*ddy);
      /* A FINGER CANNOT FIND A 39px RING. The mouse band is 0.84R to 1.04R,
         which on the 505px hero dial is r 163 to 202: twenty percent of the
         radius, about 39px wide. That is a fine mouse target and an impossible
         touch one, and "drag around the edges" naturally means the OUTER edge of
         the canvas, which sits outside it entirely (measured: a drag at r=212
         registers nothing, r=197 registers). Coarse pointers get 0.62R to 1.28R,
         about 130px, which a fingertip can land on while still excluding the
         core and its bolts. The mouse path keeps its precision. */
      var rimIn = COARSE_DIAL ? 0.62 : 0.84, rimOut = COARSE_DIAL ? 1.28 : 1.04;
      if (dd > R*rimIn && dd < R*rimOut){ contact = true; grindA = Math.atan2(ddy, ddx); }
    }
    if (contact && !reduce){
      grind = Math.min(1, grind + 0.2 * step);
      /* angular travel since the last frame, wrapped into [-PI, PI] */
      if (lastA !== null){
        var da = grindA - lastA;
        while (da >  Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        if (Math.abs(da) > 0.004){ grindDir = da > 0 ? 1 : -1; dirHeld = 1; }
        /* AUTHOR, 2026-08-28: the sparks fired while the cursor merely SAT on
           the rim. Two faults, and they compounded. (1) grindDir was sticky: it
           was set on movement and never cleared, and `against` read it alone,
           so one counterclockwise flick left the wheel biting forever on a
           motionless pointer. dirHeld decays four times faster now and takes
           grindDir to neutral with it. (2) Emission was gated on CONTACT, not
           on travel, and the rate floor was 4 against / 1.2 with, so
           `1 + random*rate` threw at least one spark per frame at zero cursor
           speed. Cutting metal is work: no travel, no sparks. */
        else { dirHeld = Math.max(0, dirHeld - 0.16 * step); if (dirHeld === 0) grindDir = 0; }
      }
      lastA = grindA;
      /* actively travelling, not resting. Held briefly so a pause between two
         pointermove events inside one frame does not strobe the effect off. */
      gMoving = dirHeld > 0.25;
      var against = gMoving && grindDir < 0;

      var ex = Math.cos(grindA)*R*0.945, ey = Math.sin(grindA)*R*0.945;
      /* against the spin throws far more material than riding with it */
      if (against) strike = Math.min(1, strike + 0.55);
      if (gMoving){
        var rate = against ? (4 + curSpeed*2.4) : (1.2 + curSpeed*0.9);
        /* the per-frame count, owed per 60 Hz frame: a fast display pays it in
           fractions and a slow one in lumps, so sparks per second hold */
        sparkDebt += (1 + ((Math.random() * rate) | 0)) * step;
        var n = sparkDebt | 0; sparkDebt -= n;
        for (var q2 = 0; q2 < n && sparks.length < SPARK_MAX; q2++){
          var tang = grindA + Math.PI/2;
          var sp = against ? (2.0 + Math.random() * (4.6 + curSpeed*1.5))
                           : (1.1 + Math.random() * (2.6 + curSpeed));
          var spread = (Math.random() - 0.5) * (against ? 1.35 : 0.8);
          sparks.push({ x:ex, y:ey, px:ex, py:ey,
                        vx: Math.cos(tang + spread)*sp, vy: Math.sin(tang + spread)*sp,
                        life:1, hot: against, arc: against ? (Math.random() < 0.45) : true,
                        decay: against ? (0.018 + Math.random()*0.035)
                                       : (0.036 + Math.random()*0.055) });
        }
      }
    } else {
      grind = Math.max(0, grind - 0.055 * step);
      lastA = null; gMoving = false; grindDir = 0; dirHeld = 0;
    }

    if (grind > 0.015){
      /* a resting cursor gets the soft contact glow; the bite, its teal arc and
         the hot core belong to travel, same rule as the sparks. */
      var bite = gMoving && grindDir < 0;
      var coreC = bite ? YEL : TEAL_PALE, edgeC = bite ? RED : TEAL;
      var rad = R * (bite ? 0.155 : 0.10);
      var gx = Math.cos(grindA)*R*0.945, gy = Math.sin(grindA)*R*0.945;
      var gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      gg.addColorStop(0, rgbaA(coreC, (bite ? 0.85 : 0.5)*grind));
      gg.addColorStop(0.4, rgbaA(edgeC, (bite ? 0.42 : 0.22)*grind));
      gg.addColorStop(1, rgbaA(edgeC, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(gx, gy, rad, 0, TAU); ctx.fill();
      /* the arc igniting: a teal core that lives only a few frames per strike */
      if (bite && strike > 0.02){
        var sr = R * 0.052 * (0.7 + strike * 0.6);
        var sg = ctx.createRadialGradient(gx, gy, 0, gx, gy, sr);
        sg.addColorStop(0, rgbaA(TEAL_PALE, 0.95 * strike));
        sg.addColorStop(0.55, rgbaA(TEAL, 0.6 * strike));
        sg.addColorStop(1, rgbaA(TEAL, 0));
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(gx, gy, sr, 0, TAU); ctx.fill();
      }
      var arc = (bite ? 0.085 : 0.045) * grind;
      ctx.beginPath();
      ctx.arc(0, 0, R*0.945, grindA - arc, grindA + arc);
      ctx.strokeStyle = rgbaA(coreC, (bite ? 0.95 : 0.7)*grind);
      ctx.lineWidth = bite ? 3.2 : 2.2; ctx.stroke();
    }

    ctx.lineCap = 'round';
    var damp = Math.pow(0.986, step);
    for (var si = sparks.length - 1; si >= 0; si--){
      var sk = sparks[si];
      sk.px = sk.x; sk.py = sk.y;
      sk.vy += 0.058 * step;
      sk.vx *= damp; sk.vy *= damp;
      sk.x += sk.vx * step; sk.y += sk.vy * step;
      sk.life -= sk.decay * step;
      if (sk.life <= 0){ sparks.splice(si, 1); continue; }
      ctx.beginPath();
      ctx.moveTo(sk.px, sk.py); ctx.lineTo(sk.x, sk.y);
      /* against the spin the rim throws hot metal AND a cold arc side by side;
         riding with it is teal only */
      var c0, c1;
      if (!sk.hot){ c0 = TEAL_PALE; c1 = TEAL; }
      else if (sk.arc){ c0 = TEAL;  c1 = ROYAL; }
      else { c0 = YEL; c1 = RED; }
      var mixT = 1 - sk.life;
      ctx.strokeStyle = rgbaA([Math.round(c0[0]*(1-mixT)+c1[0]*mixT),
                               Math.round(c0[1]*(1-mixT)+c1[1]*mixT),
                               Math.round(c0[2]*(1-mixT)+c1[2]*mixT)],
                              Math.min(1, sk.life * (sk.hot ? 1.9 : 1.4)));
      ctx.lineWidth = Math.max(0.6, sk.life * (sk.hot ? 2.4 : 1.6));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    ctx.restore();
  }
  /* grinding drags the wheel: it turns faster while the cursor is on it */
  function frame(timestamp){
    var now = typeof timestamp === 'number' ? timestamp : performance.now();
    var step = previousFrame == null ? 1 : Math.min(3, Math.max(0, (now - previousFrame) / DIAL_FRAME_MS));
    previousFrame = now;
    /* against the rotation the friction fights it and the rim stalls; with it,
       a light assist. The wheel can be dragged to a standstill but not spun
       backwards fast. */
    strike *= Math.pow(0.78, step);
    /* the pointer heats only while the rim is actually being cut */
    var wantGrind = grind > 0.12;
    if (wantGrind !== cv.classList.contains('grinding')){
      cv.classList.toggle('grinding', wantGrind);
      if (stage) stage.classList.toggle('grinding', wantGrind);
    }
    var drag = grindDir < 0 ? -grind * 0.0052 : grind * 0.0032;
    /* ANGULAR velocity is scale-free; PERCEIVED motion is not. The hero figure
       turns its tick layer at spin*0.55, about 3 degrees a second, and at 320px
       a rim feature therefore travels roughly 8px a second, which reads as a
       slow instrument. The header mounts the same numbers at 40px, where the
       rim radius is ~18px and that same 3 degrees a second moves a tick 0.95px
       a second: under one pixel, which is why the mark looked frozen unless you
       zoomed in (author, 2026-08-28). Compact scales the step so the rim moves
       at a comparable PIXEL rate instead of a comparable angular one. 5.2x puts
       the tick layer near 5px/s at 40px and one revolution at about 22s; at
       60fps that is ~26 frames per tick period, well clear of strobing. */
    spin += Math.max(-0.0012, 0.0016 * SPIN_SCALE + drag) * step;
    draw(step);
    raf = awake() ? requestAnimationFrame(frame) : 0;
  }

  /* Same reasoning as the hero field: a dial scrolled off the screen, or in a
     hidden tab, is painting 52 ticks, 19 bolts, four gradients and up to 340
     sparks for nobody, and it was doing it right through the pinch that killed
     the tab. Nothing here keys on zoom. The header dial is sticky, so it stays
     intersecting and keeps turning; it is the 505px hero dial that stops. */
  var raf = 0, seen = true;
  function awake(){ return seen && !document.hidden && !reduce; }
  function start(){ if (!raf && awake()) raf = requestAnimationFrame(frame); }
  function stop(){
    if (raf){ cancelAnimationFrame(raf); raf = 0; }
    previousFrame = null;
    /* Tab navigation can scroll the dial away halfway through a fade.
       Finish the caption response before pausing so it resumes cleanly. */
    var ticks = captionTarget === 'ticks' ? 1 : 0, bolts = captionTarget === 'bolts' ? 1 : 0;
    if (captionGlow.ticks !== ticks || captionGlow.bolts !== bolts){
      captionGlow.ticks = ticks; captionGlow.bolts = bolts; draw();
    }
  }
  if (window.IntersectionObserver){
    new IntersectionObserver(function(es){
      seen = es[0].isIntersecting;
      seen ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  }
  document.addEventListener('visibilitychange', function(){
    document.hidden ? stop() : start();
  });
  /* Reduced motion can change while the page is open. The hero field follows
     it; both dials read it once at load, so turning it on left their loops
     running and turning it off left them still until a reload. Entering it
     settles to what a reduced-motion load draws: no sparks in flight and no
     grind left over from a drag. */
  function refreshMotion(){
    reduce = motionQuery.matches;
    if (reduce){
      stop();
      sparks.length = 0; sparkDebt = 0; grind = 0; strike = 0; gMoving = false;
      draw();
    } else start();
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', refreshMotion);
  else if (motionQuery.addListener) motionQuery.addListener(refreshMotion);

  /* This listener is the residual the 2026-08-28 fix left behind. It guarded
     the canvas REALLOCATION but left the redraw itself on an unthrottled
     resize, and draw() is the expensive half: iOS fires resize continuously
     through a pinch, so a two-second gesture ran ~120 full dial repaints per
     dial on top of the animation loop already running. Measured at 390x844
     dpr3, 120 resize events scheduled 16ms apart took 6,039ms of wall clock
     instead of 1,920, i.e. the main thread was saturated more than 3x over.
     The dial's layout box does not move during a pinch, so every one of those
     repaints was redundant. Settle first, and only then re-measure and paint. */
  var reTimer = null;
  window.addEventListener('resize', function(){
    if (reTimer) clearTimeout(reTimer);
    reTimer = setTimeout(function(){
      reTimer = null; boxDirty = true; skinDirty = true;
      draw();
    }, 200);
  }, { passive: true });
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ boxDirty = true; });
  }
  reduce ? draw() : start();
}
vaultMountDial(document.getElementById('dial'));
vaultMountDial(document.querySelector('header .vault-headdial'), { compact: true });
