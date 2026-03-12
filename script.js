(function(){
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle
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

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  if(menuToggle && mobileNav){
    menuToggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
        document.body.style.overflow = '';
      });
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
        copy.classList.add('copied');
        setTimeout(() => {
          copy.textContent = prev;
          copy.classList.remove('copied');
        }, 1200);
      } catch(e){
        window.location.href = 'mailto:' + encodeURIComponent(email.textContent.trim());
      }
    });
  }

  // Header scroll state
  const header = document.querySelector('header');
  if(header){
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Active nav link highlighting
  const anchorLinks = document.querySelectorAll('.navlink[href^="#"]');
  const sectionIds = Array.from(anchorLinks).map(l => l.getAttribute('href').slice(1));
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  if(sections.length){
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = document.querySelector(`.navlink[href="#${id}"]`);
        if(link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { threshold: 0.05, rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72}px 0px -40% 0px` });
    sections.forEach(s => navObserver.observe(s));
  }

  // Hero entrance stagger
  if(!prefersReducedMotion){
    const hero = document.querySelector('.hero');
    if(hero){
      const staggerItems = [
        hero.querySelector('.kicker'),
        hero.querySelector('.display-name'),
        hero.querySelector('h1'),
        hero.querySelector('.hero-actions'),
        hero.querySelector('.meta'),
        hero.querySelector('.hero-rail')
      ].filter(Boolean);

      staggerItems.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = `opacity .5s cubic-bezier(.25,.46,.45,.94) ${i * 80}ms, transform .5s cubic-bezier(.25,.46,.45,.94) ${i * 80}ms`;
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          staggerItems.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        });
      });
    }
  }

  // Writing excerpt expand/collapse
  document.querySelectorAll('.writing-expand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = btn.closest('.writing-item');
      if(item) item.classList.toggle('expanded');
    });
  });

  // Back to top button
  const backToTop = document.getElementById('backToTop');
  if(backToTop){
    const onScrollTop = () => {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    };
    onScrollTop();
    window.addEventListener('scroll', onScrollTop, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  // Scroll reveal (skipped if prefers-reduced-motion)
  if(!prefersReducedMotion){
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }
})();
