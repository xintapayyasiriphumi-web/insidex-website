/* ══════════════════════════════════════════════════
   INSIDEX — Core helpers + UI interactions
   Load order (all defer): main.js → i18n.js → shop.js → discord.js
══════════════════════════════════════════════════ */

/* ── Helpers (shared by the other scripts) ── */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const store = {
  get(key)        { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  remove(key)     { try { localStorage.removeItem(key); } catch {} },
};

// แท็บเดียว — รอดข้าม navigation ออกนอกเว็บแล้วกลับมา แต่หน้าอื่นเขียนให้ไม่ได้
const session = {
  get(key)        { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
  remove(key)     { try { sessionStorage.removeItem(key); } catch {} },
};

/* ── Action registry ──
   <el data-action="name"> → Actions.name(el, event)
   Each script registers its own actions, one delegated listener handles all. */
const Actions = {};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && Actions[el.dataset.action]) Actions[el.dataset.action](el, e);
});

// Enter / Space for non-button elements that act as buttons
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (el.matches?.('[data-action][role="button"]')) { e.preventDefault(); el.click(); }
});

/* ── Toast ── */
let toastTimer;
function toast(msg, type = 'info', ms = 3000) {
  const el = $('#ixToast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

Actions.copy = el => {
  if (!navigator.clipboard) return toast('Copy ไม่สำเร็จ', 'error');
  navigator.clipboard.writeText(el.dataset.copy)
    .then(() => toast('Copy แล้ว!', 'success'), () => toast('Copy ไม่สำเร็จ', 'error'));
};

/* ── Scroll lock (modal / mobile menu) ── */
function syncScrollLock() {
  document.body.classList.toggle('no-scroll', !!$('.modal.open, .mob-menu.open'));
}

/* ── Modals ── */
function openModal(id) {
  $$('.modal.open').forEach(m => { if (m.id !== id) m.classList.remove('open'); });
  document.getElementById(id)?.classList.add('open');
  syncScrollLock();
}

function closeModal(id) {
  const targets = id ? [document.getElementById(id)] : $$('.modal.open');
  targets.forEach(m => m?.classList.remove('open'));
  syncScrollLock();
}

Actions['open-modal']  = (el, e) => { e.preventDefault(); openModal(el.dataset.target); };
Actions['close-modal'] = el => closeModal(el.closest('.modal')?.id);

// Click on the dimmed backdrop closes the modal
document.addEventListener('click', e => {
  if (e.target.classList?.contains('modal')) closeModal(e.target.id);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); toggleMenu(false); }
});

/* ── Mobile menu ── */
function toggleMenu(force) {
  const menu = $('#mobMenu');
  const btn = $('#navHam');
  const open = menu.classList.toggle('open', force);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  syncScrollLock();
}
Actions['menu-toggle'] = () => toggleMenu();
Actions['menu-close']  = () => toggleMenu(false);

/* ── Navbar state + scroll progress ── */
(() => {
  const nav = $('#nav');
  const bar = $('#progress');
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 24);
    ticking = false;
  }

  document.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ── Highlight the nav link of the section in view ── */
(() => {
  const links = $$('.nav-link');
  const byId = new Map(links.map(a => [a.hash.slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.remove('active'));
      byId.get(entry.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();

/* ── Reveal on scroll ── */
(() => {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();

/* ── Count-up numbers ──
   HTML already holds the final value, so nothing breaks if this never runs. */
(() => {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      io.unobserve(el);
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / 1600);
        el.textContent = Math.round((1 - Math.pow(1 - t, 4)) * target).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .5 });
  $$('[data-count]').forEach(el => io.observe(el));
})();

/* ── Showcase slider + lazy YouTube ── */
(() => {
  const viewport = $('#sliderOuter');
  const track = $('#sliderTrack');
  if (!track) return;
  const slides = $$('.slide', track);
  const dots = $$('.dot', $('#sliderDots'));
  let index = 0;

  function stopVideo(slide) {
    const media = $('.slide-media', slide);
    const frame = media && $('iframe', media);
    if (frame) { frame.remove(); media.classList.remove('playing'); }
  }

  function go(n) {
    stopVideo(slides[index]);
    index = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
      d.setAttribute('aria-current', String(i === index));
    });
  }

  Actions['slide-prev'] = () => go(index - 1);
  Actions['slide-next'] = () => go(index + 1);
  Actions['slide-to']   = el => go(Number(el.dataset.index));
  Actions.play = el => {
    if (el.classList.contains('playing')) return;
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube.com/embed/${encodeURIComponent(el.dataset.videoId)}?autoplay=1&rel=0`;
    frame.title = 'INSIDEX Showcase';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    el.appendChild(frame);
    el.classList.add('playing');
  };

  // Swipe / drag — a drag must not also count as a click on the video
  let startX = null;
  let dragged = false;
  viewport.addEventListener('pointerdown', e => { startX = e.clientX; dragged = false; });
  viewport.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = startX - e.clientX;
    startX = null;
    if (Math.abs(dx) > 50) { dragged = true; go(index + (dx > 0 ? 1 : -1)); }
  });
  viewport.addEventListener('pointercancel', () => { startX = null; });
  viewport.addEventListener('click', e => {
    if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
  }, true);
})();

/* ── FAQ accordion ── */
Actions.faq = el => {
  const item = el.closest('.faq-item');
  const willOpen = !item.classList.contains('open');
  $$('.faq-item.open').forEach(i => {
    i.classList.remove('open');
    $('.faq-q', i).setAttribute('aria-expanded', 'false');
  });
  if (willOpen) {
    item.classList.add('open');
    el.setAttribute('aria-expanded', 'true');
  }
};

/* ── Reviews row ──
   Prev/next buttons for everyone (a mouse wheel can't scroll sideways). On top of that the
   row drifts on its own and loops: hover, keyboard focus, a touch or a button press pauses it,
   and it carries on from wherever the visitor left it. The cards are cloned once (hidden from
   assistive tech) so the loop has no seam. prefers-reduced-motion (also on when Windows
   animations are turned off): no drift, the buttons and the scrollbar still work. */
(() => {
  const row = $('#reviews .marquee');
  const track = $('#testiTrack');
  if (!row || !track || !track.children.length) return;

  const cards = Array.from(track.children);
  const step = () => cards[0].offsetWidth + (parseFloat(getComputedStyle(cards[0]).marginRight) || 0);
  let loopWidth = () => 0;
  let holdUntil = 0;

  const nudge = dir => {
    holdUntil = performance.now() + 3000;
    const w = loopWidth();
    if (w && dir < 0 && row.scrollLeft < step()) row.scrollLeft += w;   // wrap before going back past the start
    row.scrollBy({ left: dir * step(), behavior: 'smooth' });
  };
  Actions['reviews-prev'] = () => nudge(-1);
  Actions['reviews-next'] = () => nudge(1);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  cards.forEach(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    track.append(copy);
  });
  row.classList.add('is-auto');
  let loopW = 0;
  const measure = () => { loopW = track.children[cards.length].offsetLeft - cards[0].offsetLeft; };
  measure();
  new ResizeObserver(measure).observe(track);   // fonts loading / viewport changes resize the cards
  loopWidth = () => loopW;

  const SPEED = 32;                       // px per second
  let pos = row.scrollLeft;
  let last = 0;
  let hover = false, touch = false, focus = false, inView = false;
  let touchTimer = 0;

  const tick = now => {
    const dt = last ? Math.min(now - last, 64) : 0;
    last = now;
    if (inView && !hover && !touch && !focus && now > holdUntil) {
      if (Math.abs(row.scrollLeft - pos) > 2) pos = row.scrollLeft;   // the visitor moved it
      pos += SPEED * dt / 1000;
      const w = loopWidth();
      if (w > 0 && pos >= w) pos -= w;
      row.scrollLeft = pos;
    } else {
      pos = row.scrollLeft;
    }
    requestAnimationFrame(tick);
  };

  row.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  row.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });
  row.addEventListener('touchstart', () => { touch = true; clearTimeout(touchTimer); }, { passive: true });
  row.addEventListener('touchend', () => { touchTimer = setTimeout(() => { touch = false; }, 2500); }, { passive: true });
  row.addEventListener('focusin', () => { focus = true; });
  row.addEventListener('focusout', () => { focus = false; });
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(row);

  requestAnimationFrame(tick);
})();
