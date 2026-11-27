/* ══════════════════════════════════════════════════
   INSIDEX — Discord live widget (public widget.json API)
══════════════════════════════════════════════════ */

(() => {
  const GUILD_ID = '1400021255528382526';
  const list = $('#discMembersList');
  const countEl = $('#discOnlineCount');
  const onlineEl = $('#discWidgetOnline');
  if (!list) return;

  const statusClass = s => (s === 'idle' || s === 'dnd') ? s : 'online';

  function memberHtml(m) {
    const initials = esc((m.username || '??').slice(0, 2).toUpperCase());
    const avatar = m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="" loading="lazy">` : '';
    const game = m.game?.name ? `<span class="dw-game">${esc(m.game.name)}</span>` : '';
    return `
      <li class="dw-member">
        <span class="dw-avatar">
          <span class="dw-initials">${initials}</span>${avatar}
          <span class="dw-status ${statusClass(m.status)}"></span>
        </span>
        <span class="dw-meta"><span class="dw-mname">${esc(m.username)}</span>${game}</span>
      </li>`;
  }

  // Broken avatar → fall back to the initials underneath
  list.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

  // A page opened in a background tab skipped the first load and showed "Connecting..."
  // until the next minute's poll; a hung request showed it forever. Now: a 10 s timeout,
  // and a load as soon as the tab is shown if the last one is older than the poll interval.
  const POLL = 60000;
  let loadedAt = 0;

  // state: 'loading' | 'ok' | 'error' — the text is drawn from it in the page language,
  // and drawn again when the visitor switches language (ix:lang from js/i18n.js)
  let state = 'loading';
  let online = 0;
  let hasMembers = false;

  function renderText() {
    if (state === 'ok') {
      countEl.textContent = online.toLocaleString();
      onlineEl.textContent = tr('dw.online', { n: online.toLocaleString() });
      if (!hasMembers) list.innerHTML = `<div class="dw-state">${esc(tr('dw.none'))}</div>`;
    } else if (state === 'error') {
      countEl.textContent = '—';
      onlineEl.textContent = 'INSIDEX Community';
      list.innerHTML = `<div class="dw-state">${esc(tr('dw.unavailable'))}<small>discord.com/api unavailable</small></div>`;
    } else {
      onlineEl.textContent = tr('dw.loading');
      list.innerHTML = `<div class="dw-state"><span class="spinner"></span>${esc(tr('dw.connecting'))}</div>`;
    }
  }

  async function load() {
    if (document.hidden) return;
    loadedAt = Date.now();
    try {
      const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined;
      const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const members = data.members || [];
      online = data.presence_count || members.length || 0;
      hasMembers = members.length > 0;
      state = 'ok';
      if (hasMembers) list.innerHTML = `<ul>${members.map(memberHtml).join('')}</ul>`;
    } catch {
      state = 'error';
    }
    renderText();
  }

  renderText();
  document.addEventListener('ix:lang', renderText);

  load();
  setInterval(load, POLL);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - loadedAt >= POLL) load();
  });
})();
