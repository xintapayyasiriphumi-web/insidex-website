/* ══════════════════════════════════════════════════
   INSIDEX — Site theme (default / halloween / christmas)
   The <head> script (js/boot.js) sets data-theme before first paint (?theme= preview,
   else the last theme the API returned, plus the seasonal date window). This confirms
   it with GET /api/site-config: an explicit API theme wins, otherwise the season
   decides (Christmas 1 Dec → 1 Jan), otherwise default. Nothing here blocks page load.
══════════════════════════════════════════════════ */

(() => {
  const THEMES = ['default', 'halloween', 'christmas'];
  const THEME_COLOR = { default: '#09080d', halloween: '#0a0608', christmas: '#05090a' };
  const API_TIMEOUT_MS = 3000;
  const root = document.documentElement;

  // Inline SVG only — no images, no libraries
  const HALLOWEEN_DECO = `
    <div class="hx-deco" data-deco="halloween" aria-hidden="true">
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

  const CHRISTMAS_DECO = `
    <div class="xm-deco" data-deco="christmas" aria-hidden="true">
      <div class="xm-snow"></div>
      <div class="xm-snow xm-snow-near"></div>
      <svg class="xm-holly" viewBox="0 0 120 100" focusable="false">
        <path fill="#166534" d="M2 14l10 2 3-9 7 8 8-6 1 10 10-1-4 9 9 5-9 4 3 10-10-2-3 9-7-8-8 6-1-10-10 1 4-9z" transform="rotate(-8 30 30)"/>
        <path fill="#15803d" d="M44 44l10-3 1-10 8 6 8-6 2 10 10 1-5 9 7 7-10 2 0 10-9-4-6 8-4-9-10 2 2-10-9-5z"/>
        <circle cx="42" cy="38" r="5.5" fill="#dc2626"/>
        <circle cx="52" cy="33" r="5" fill="#ef4444"/>
        <circle cx="50" cy="44" r="4.5" fill="#b91c1c"/>
        <circle cx="40.5" cy="36.5" r="1.4" fill="#fff" opacity=".6"/>
        <circle cx="50.5" cy="31.5" r="1.3" fill="#fff" opacity=".6"/>
      </svg>
      <svg class="xm-baubles" viewBox="0 0 150 110" focusable="false">
        <g class="xm-b xm-b1">
          <line x1="28" y1="0" x2="28" y2="46"/>
          <rect x="24" y="44" width="8" height="5" rx="1" fill="#d4a72c"/>
          <circle cx="28" cy="61" r="13" fill="#dc2626"/>
          <ellipse cx="23" cy="56" rx="3.5" ry="2.2" fill="#fff" opacity=".35"/>
        </g>
        <g class="xm-b xm-b2">
          <line x1="76" y1="0" x2="76" y2="72"/>
          <rect x="72.5" y="70" width="7" height="4.5" rx="1" fill="#d4a72c"/>
          <circle cx="76" cy="84" r="10" fill="#15803d"/>
          <ellipse cx="72" cy="80" rx="2.8" ry="1.8" fill="#fff" opacity=".35"/>
        </g>
        <g class="xm-b xm-b3">
          <line x1="120" y1="0" x2="120" y2="28"/>
          <rect x="116.5" y="26" width="7" height="4.5" rx="1" fill="#d4a72c"/>
          <circle cx="120" cy="41" r="11.5" fill="#fbbf24"/>
          <ellipse cx="115.5" cy="36.5" rx="3" ry="2" fill="#fff" opacity=".4"/>
        </g>
      </svg>
      <svg class="xm-tree" viewBox="0 0 64 80" focusable="false">
        <path fill="#166534" d="M32 12l17 22h-8l14 18h-10l15 20H4l15-20H9l14-18h-8z"/>
        <rect x="27.5" y="72" width="9" height="7" fill="#78350f"/>
        <circle cx="26" cy="32" r="2.6" fill="#ef4444"/>
        <circle cx="38" cy="46" r="2.6" fill="#fbbf24"/>
        <circle cx="22" cy="58" r="2.6" fill="#fbbf24"/>
        <circle cx="42" cy="63" r="2.6" fill="#ef4444"/>
        <circle cx="31" cy="52" r="2.2" fill="#f8fafc"/>
        <path class="xm-star" fill="#fbbf24" d="M32 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L32 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>
      </svg>
    </div>`;
  const DECO = { halloween: HALLOWEEN_DECO, christmas: CHRISTMAS_DECO };

  function applyTheme(theme) {
    root.dataset.theme = theme;
    $('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    // One decoration layer at a time; appended last so it paints above .page-bg (both fixed at z-index -1)
    document.querySelectorAll('[data-deco]').forEach(el => { if (el.dataset.deco !== theme) el.remove(); });
    if (DECO[theme] && !$(`[data-deco="${theme}"]`)) document.body.insertAdjacentHTML('beforeend', DECO[theme]);
  }

  // ?theme=halloween|christmas|default → preview this page load only: no API call, nothing cached
  const preview = new URLSearchParams(location.search).get('theme');
  if (THEMES.includes(preview)) { applyTheme(preview); return; }

  applyTheme(THEMES.includes(root.dataset.theme) ? root.dataset.theme : window.ixResolveTheme(null));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  fetch(`${API}/api/site-config`, { signal: ctrl.signal })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    .then(cfg => {
      // Cache the API's own answer (not the resolved one) so boot.js can re-apply the season next load
      const apiTheme = THEMES.includes(cfg?.theme) ? cfg.theme : 'default';
      store.set('ix_theme', apiTheme);
      applyTheme(window.ixResolveTheme(apiTheme));
    })
    .catch(() => {
      store.remove('ix_theme');
      applyTheme(window.ixResolveTheme(null));
    })
    .finally(() => clearTimeout(timer));
})();
