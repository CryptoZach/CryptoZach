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
})();
