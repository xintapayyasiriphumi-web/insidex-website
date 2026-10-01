/* ══════════════════════════════════════════════════
   INSIDEX — Site theme (default / halloween)
   The <head> script sets data-theme before first paint (?theme= preview, else the
   last theme the API returned). This confirms it with GET /api/site-config;
   any failure or timeout → default. Nothing here blocks page load.
══════════════════════════════════════════════════ */

(() => {
  const THEMES = ['default', 'halloween'];
  const THEME_COLOR = { default: '#07060b', halloween: '#0a0608' };
  const API_TIMEOUT_MS = 3000;
  const root = document.documentElement;

  // Inline SVG only — no images, no libraries
  const DECO_HTML = `
    <div class="hx-deco" id="hxDeco" aria-hidden="true">
      <svg class="hx-web" viewBox="0 0 120 130" focusable="false">
        <path class="hx-strands" d="M0 0L118 0M0 0L109 45.2M0 0L83.4 83.4M0 0L45.2 109M0 0L0 118M32 0Q27 5.4 29.6 12.2Q22.9 15.3 22.6 22.6Q15.3 22.9 12.2 29.6Q5.4 27 0 32M62 0Q52.3 10.4 57.3 23.7Q44.3 29.6 43.8 43.8Q29.6 44.3 23.7 57.3Q10.4 52.3 0 62M92 0Q77.6 15.4 85 35.2Q65.8 44 65.1 65.1Q44 65.8 35.2 85Q15.4 77.6 0 92M65.1 65.1V97"/>
        <g class="hx-spider">
          <circle cx="65.1" cy="99.5" r="3"/>
          <ellipse cx="65.1" cy="106" rx="4.5" ry="5.5"/>
          <path fill="none" d="M61 103l-6-4M61 106h-7M61 109l-6 4M69.2 103l6-4M69.2 106h7M69.2 109l6 4"/>
        </g>
      </svg>
      <svg class="hx-bats" viewBox="0 0 160 90" focusable="false">
        <defs>
          <symbol id="hx-bat" viewBox="0 0 64 32">
            <path d="M32 13L29.5 8.5L29 12.5C24 8.5 14 6.5 4 9.5C9 11.5 11 15 11 18.5C14.5 16.5 18.5 17 20.5 20C22 17.5 25 17 27.5 18.5L32 24L36.5 18.5C39 17 42 17.5 43.5 20C45.5 17 49.5 16.5 53 18.5C53 15 55 11.5 60 9.5C50 6.5 40 8.5 35 12.5L34.5 8.5Z"/>
          </symbol>
        </defs>
        <circle class="hx-moon" cx="112" cy="38" r="26"/>
        <use class="hx-bat" href="#hx-bat" x="14" y="12" width="48" height="24"/>
        <use class="hx-bat" href="#hx-bat" x="78" y="54" width="32" height="16"/>
        <use class="hx-bat" href="#hx-bat" x="124" y="6" width="26" height="13"/>
      </svg>
      <svg class="hx-pumpkin" viewBox="0 0 64 58" focusable="false">
        <path fill="#4d7c0f" d="M30 12c0-4 1-8 4-10l3 2c-2 2-3 5-3 8z"/>
        <ellipse cx="20" cy="36" rx="15" ry="18" fill="#c2410c"/>
        <ellipse cx="44" cy="36" rx="15" ry="18" fill="#c2410c"/>
        <ellipse cx="32" cy="35" rx="15" ry="20" fill="#f97316"/>
        <path fill="#1c0a02" d="M20 31l5-7 5 7zM34 31l5-7 5 7zM18 41c4 7 24 7 28 0l-4 2-3.5-3-3.5 3-3.5-3-3.5 3-3.5-3-3.5 3-3-2z"/>
      </svg>
    </div>`;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    $('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    const deco = $('#hxDeco');
    // Appended last so it paints above .page-bg (both are fixed at z-index -1)
    if (theme === 'halloween' && !deco) document.body.insertAdjacentHTML('beforeend', DECO_HTML);
    if (theme !== 'halloween' && deco) deco.remove();
  }

  // ?theme=halloween|default → preview this page load only: no API call, nothing cached
  const preview = new URLSearchParams(location.search).get('theme');
  if (THEMES.includes(preview)) { applyTheme(preview); return; }

  applyTheme(root.dataset.theme === 'halloween' ? 'halloween' : 'default');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  fetch(`${API}/api/site-config`, { signal: ctrl.signal })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    .then(cfg => {
      const theme = THEMES.includes(cfg?.theme) ? cfg.theme : 'default';
      store.set('ix_theme', theme);
      applyTheme(theme);
    })
    .catch(() => {
      store.remove('ix_theme');
      applyTheme('default');
    })
    .finally(() => clearTimeout(timer));
})();
