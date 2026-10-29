// Runs in <head> before first paint (not deferred). Kept out of index.html so the CSP needs no inline scripts.
document.documentElement.classList.add('js');
// Theme before first paint: ?theme= preview, else last theme the API returned. js/theme.js confirms it.
(function () {
  var t = null;
  try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (t !== 'halloween' && t !== 'default') { try { t = localStorage.getItem('ix_theme'); } catch (e) {} }
  document.documentElement.setAttribute('data-theme', t === 'halloween' ? 'halloween' : 'default');
})();
