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

  async function load() {
    if (document.hidden) return;
    try {
      const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const members = data.members || [];
      const online = data.presence_count || members.length || 0;

      countEl.textContent = online.toLocaleString();
      onlineEl.textContent = `${online.toLocaleString()} คนออนไลน์`;
      list.innerHTML = members.length
        ? `<ul>${members.map(memberHtml).join('')}</ul>`
        : '<div class="dw-state">ไม่มีสมาชิกออนไลน์</div>';
    } catch {
      countEl.textContent = '—';
      onlineEl.textContent = 'INSIDEX Community';
      list.innerHTML = '<div class="dw-state">Widget ไม่พร้อมใช้งาน<small>discord.com/api unavailable</small></div>';
    }
  }

  load();
  setInterval(load, 60000);
})();
