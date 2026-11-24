(() => {
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    preference = localStorage.getItem('ai-basics-theme');
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn('Theme preference storage is unavailable.', error);
  }
  if (preference !== null && !['light', 'dark'].includes(preference)) {
    console.warn(`Unsupported saved theme "${preference}"; using the system theme.`);
    preference = null;
  }
  function applyTheme() {
    const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    const select = document.getElementById('themeSelect');
    if (select) select.value = theme;
  }
  applyTheme();
  systemTheme.addEventListener('change', () => {
    if (preference === null) applyTheme();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('themeSelect');
    applyTheme();
    select.addEventListener('change', () => {
      if (!['light', 'dark'].includes(select.value)) throw new Error(`Unsupported theme: ${select.value}`);
      preference = select.value;
      applyTheme();
      try {
        localStorage.setItem('ai-basics-theme', preference);
      } catch (error) {
        if (!(error instanceof DOMException)) throw error;
        console.warn('Could not save the theme preference.', error);
      }
    });
  });
})();
