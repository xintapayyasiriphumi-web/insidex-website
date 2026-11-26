// Runs in <head> before first paint (not deferred). Kept out of index.html so the CSP needs no inline scripts.
document.documentElement.classList.add('js');

// Seasonal themes, by Bangkok wall-clock date (UTC+7 all year, no DST).
// Each window is [month, day] → [month, day], both days inclusive; a window may wrap past New Year.
// Shared with js/theme.js.
window.IX_SEASONS = [
  { theme: 'christmas', from: [12, 1], to: [1, 1] }   // 1 Dec 00:00 → 1 Jan 23:59 ICT
];
window.ixSeasonTheme = function (nowMs) {
  var d = new Date((typeof nowMs === 'number' ? nowMs : Date.now()) + 7 * 36e5); // read with UTC getters = Bangkok time
  var md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  for (var i = 0; i < window.IX_SEASONS.length; i++) {
    var s = window.IX_SEASONS[i], a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1];
    if (a <= b ? (md >= a && md <= b) : (md >= a || md <= b)) return s.theme;
  }
  return null;
};
// The API's theme wins when it asks for a specific one (e.g. Halloween from the panel);
// 'default', no answer, or an unknown value falls through to the seasonal theme.
window.ixResolveTheme = function (apiTheme, nowMs) {
  if (apiTheme === 'halloween' || apiTheme === 'christmas') return apiTheme;
  return window.ixSeasonTheme(nowMs) || 'default';
};

// Theme before first paint: ?theme= preview, else last theme the API returned (+ season). js/theme.js confirms it.
(function () {
  var t = null;
  try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  var preview = t === 'halloween' || t === 'christmas' || t === 'default';
  if (!preview) {
    try { t = localStorage.getItem('ix_theme'); } catch (e) { t = null; }
    t = window.ixResolveTheme(t);
  }
  document.documentElement.setAttribute('data-theme', t);
})();
