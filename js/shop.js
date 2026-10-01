/* ══════════════════════════════════════════════════
   INSIDEX — Shop system
   Discord login → pick products → PromptPay QR → slip verify → license key
══════════════════════════════════════════════════ */

const API = 'https://cozy-healing-production-ee02.up.railway.app';
const LOGIN_URL = `${API}/auth/discord`;
const PROMPTPAY_ID = '0822099267';

const CATEGORY_ORDER = ['setting', 'v25', 'pack', 'supportx'];
const CATEGORY_META = {
  setting:  { label: 'Standard' },
  v25:      { label: 'V2.5',      tone: 'is-accent' },
  pack:     { label: 'Pack V2.5', tone: 'is-accent' },
  supportx: { label: 'SupportX',  tone: 'is-gold' },
};
const SHOP_TABS = [
  { key: 'all',      label: 'ทั้งหมด',  cats: CATEGORY_ORDER },
  { key: 'standard', label: 'Standard', cats: ['setting'] },
  { key: 'v25',      label: 'V2.5',     cats: ['v25', 'pack'] },
  { key: 'supportx', label: 'SupportX', cats: ['supportx'] },
];
const STEP_HINTS = {
  1: 'เลือกสินค้าที่ต้องการ',
  2: 'สแกน QR แล้วแนบสลิปโอนเงิน',
  3: 'ชำระเงินสำเร็จ — รับ Key ได้เลย',
};
const CONFIRM_LABEL = '<svg class="i"><use href="#i-check"/></svg> ยืนยันการชำระเงิน';
const SKELETON_CARD = '<div class="sk-card"><div class="skeleton sk-img"></div><div class="sk-body"><div class="skeleton sk-line w-60"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line w-30"></div></div></div>';

let currentUser = null;
let shopProducts = [];
let shopTab = 'all';
let shopStep = 1;
let selectedProducts = [];

/* ══ Auth ══ */
function checkLogin() {
  const params = new URLSearchParams(location.search);
  const userParam = params.get('user');

  // Coming back from the Discord OAuth callback
  if (userParam) {
    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      store.set('ix_user', JSON.stringify(user));
      setUser(user);
      if (params.get('login') === 'success') toast(`ยินดีต้อนรับ ${user.username}!`, 'success');
      history.replaceState({}, '', location.pathname);
      return;
    } catch {}
  }

  const saved = store.get('ix_user');
  if (saved) {
    try { setUser(JSON.parse(saved)); } catch {}
  }
}

function setUser(user) {
  currentUser = user;
  $('#loginBtn').hidden = true;
  $('#userBar').hidden = false;

  const avatar = $('#navAvatar');
  avatar.hidden = !user.avatar;
  if (user.avatar) {
    avatar.onerror = () => { avatar.hidden = true; };
    avatar.src = user.avatar;
  }
  $('#navUsername').textContent = user.username;
  const badge = $('#navBadge');
  badge.textContent = user.is_admin ? 'ADMIN' : 'MEMBER';
  badge.classList.toggle('admin', !!user.is_admin);

  $('#profileName').textContent = user.username;
  $('#profileId').textContent = `Discord: ${user.discord_id}`;
  $('#profileAvatar').innerHTML = user.avatar
    ? `<img src="${esc(user.avatar)}" alt="">`
    : esc((user.username || '?').slice(0, 2).toUpperCase());
}

async function doLogout() {
  try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
  store.remove('ix_user');
  currentUser = null;
  $('#loginBtn').hidden = false;
  $('#userBar').hidden = true;
  closeModal('modalUser');
  toast('ออกจากระบบแล้ว', 'info');
}

/* Entry point for every "buy" button on the page */
function buyNow(productId) {
  if (!currentUser) { location.href = LOGIN_URL; return; }
  if (productId) openShopProduct(productId);
  else openShop();
}

/* ══ Products ══ */
async function fetchProducts() {
  const res = await fetch(`${API}/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function showProductSkeleton() {
  $('#productList').innerHTML = `<div class="pgrid">${SKELETON_CARD.repeat(4)}</div>`;
}

async function openShop() {
  openModal('modalShop');
  selectedProducts = [];
  shopTab = 'all';
  showShopStep(1);
  showProductSkeleton();
  try {
    shopProducts = await fetchProducts();
    renderShopProducts();
  } catch {
    $('#productList').innerHTML = '<p class="shop-empty">โหลดไม่สำเร็จ</p>';
  }
}

// Straight to payment for a single product (e.g. GOATX banner)
async function openShopProduct(productId) {
  openModal('modalShop');
  selectedProducts = [];
  showShopStep(1);
  showProductSkeleton();
  try {
    shopProducts = await fetchProducts();
    const p = shopProducts.find(x => x.id === productId);
    if (!p) { renderShopProducts(); toast('ไม่พบสินค้า', 'error'); return; }
    startPayment([{ id: p.id, name: p.name, price: p.price }]);
  } catch {
    toast('เกิดข้อผิดพลาด', 'error');
  }
}

function productState(p) {
  const release = p.release_at ? new Date(p.release_at).getTime() : null;
  const released = release !== null && Date.now() >= release;
  return { soon: !p.is_active && !released, out: p.stock_count <= 0 };
}

const isSelected = id => selectedProducts.some(p => p.id === id);

/* Promo: the API returns the price in effect as `price` and the normal one as `original_price`
   only while a promo runs — the backend decides, so nothing here knows promo dates or prices. */
const fmt = n => Number(n).toLocaleString();
const hasPromo = p => p.original_price > p.price;
const wasHtml = p => `<s class="price-was"><span class="sr-only">ราคาปกติ </span>฿${fmt(p.original_price)}</s>`;
const promoChipHtml = p => `<span class="chip chip-promo">ลด ฿${fmt(p.original_price - p.price)}</span>`;

// Pinned to the top of the product list as the best seller (Max Pack → v2.5)
const FEATURED_ID = 8;

function renderProductCard(p, hot = false) {
  const { soon, out } = productState(p);
  const gold = p.category === 'supportx';
  const selected = isSelected(p.id);
  const classes = ['pcard', hot && 'is-hot', gold && 'is-gold', soon && 'is-soon', out && !soon && 'is-out', selected && 'selected']
    .filter(Boolean).join(' ');
  const badge = hot
    ? '<span class="chip chip-hot pcard-badge"><svg class="i"><use href="#i-flame"/></svg>ยอดฮิต</span>'
    : gold ? '<span class="chip chip-gold pcard-badge">Limited</span>' : '';
  const media = p.image_url
    ? `<img class="pcard-img" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`
    : `<div class="pcard-ph"><svg class="i"><use href="#${gold ? 'i-bulb' : 'i-gear'}"/></svg></div>`;
  const stock = soon ? 'SOON' : out ? 'OUT' : `${p.stock_count} left`;

  return `
    <div class="${classes}" role="button" tabindex="${out && !soon ? -1 : 0}" aria-pressed="${selected}"
         data-action="select-product" data-id="${Number(p.id)}">
      ${badge}
      <span class="pcard-check"><svg class="i"><use href="#i-check"/></svg></span>
      ${soon ? '<span class="pcard-soon">COMING SOON</span>' : ''}
      ${media}
      <div class="pcard-body">
        <p class="pcard-name">${esc(p.name)}</p>
        <p class="pcard-desc">${esc(p.description || '')}</p>
        <div class="pcard-foot">
          <div class="pcard-pricebox">
            ${hasPromo(p) ? `<span class="pcard-promo">${wasHtml(p)}${promoChipHtml(p)}</span>` : ''}
            <span class="pcard-price"><span class="cur">฿</span>${fmt(p.price)}</span>
          </div>
          <span class="pcard-stock${out ? ' empty' : ''}">${stock}</span>
        </div>
      </div>
    </div>`;
}

function renderShopProducts() {
  const catOf = p => CATEGORY_ORDER.includes(p.category) ? p.category : 'setting';
  const featured = shopProducts.find(p => p.id === FEATURED_ID);

  // The featured product is pulled out of its group and pinned on top instead
  const grouped = {};
  for (const p of shopProducts) {
    if (p !== featured) (grouped[catOf(p)] ||= []).push(p);
  }
  const showsFeatured = tab => !!featured && tab.cats.includes(catOf(featured));
  const countOf = tab => tab.cats.reduce((n, c) => n + (grouped[c]?.length || 0), 0) + (showsFeatured(tab) ? 1 : 0);

  const tabsHtml = SHOP_TABS.map(t => `
    <button class="shop-tab${t.key === shopTab ? ' active' : ''}" role="tab" aria-selected="${t.key === shopTab}"
            data-action="shop-tab" data-tab="${t.key}">${t.label}<span class="tab-count">${countOf(t)}</span></button>`
  ).join('');

  const activeTab = SHOP_TABS.find(t => t.key === shopTab) || SHOP_TABS[0];
  const cats = activeTab.cats.filter(c => grouped[c]?.length);
  const withLabels = shopTab === 'all' && cats.length > 1;
  const pinnedHtml = showsFeatured(activeTab)
    ? (withLabels ? '<p class="pgroup-label is-hot">ยอดฮิต</p>' : '') + renderProductCard(featured, true)
    : '';
  const cardsHtml = pinnedHtml + cats.map(c => {
    const meta = CATEGORY_META[c];
    const label = withLabels ? `<p class="pgroup-label ${meta.tone || ''}">${meta.label}</p>` : '';
    return label + grouped[c].map(p => renderProductCard(p)).join('');
  }).join('');

  $('#productList').innerHTML = `
    <div class="shop-tabs" role="tablist">${tabsHtml}</div>
    <div class="pgrid">${cardsHtml || '<p class="shop-empty">ไม่มีสินค้าในหมวดนี้</p>'}</div>`;
}

Actions['shop-tab'] = el => { shopTab = el.dataset.tab; renderShopProducts(); };

Actions['select-product'] = el => {
  const p = shopProducts.find(x => x.id === Number(el.dataset.id));
  if (!p) return;
  const { soon, out } = productState(p);
  if (soon) { toast('สินค้านี้ยังไม่พร้อมขาย', 'info'); return; }
  if (out) return;

  const i = selectedProducts.findIndex(x => x.id === p.id);
  if (i > -1) selectedProducts.splice(i, 1);
  else selectedProducts.push({ id: p.id, name: p.name, price: p.price });
  el.classList.toggle('selected', i === -1);
  el.setAttribute('aria-pressed', String(i === -1));
  updateCheckoutBar();
};

/* ══ Steps & checkout bar ══ */
function showShopStep(n) {
  shopStep = n;
  [1, 2, 3].forEach(i => { $(`#shopStep${i}`).hidden = i !== n; });
  $('#shopBackBtn').hidden = n !== 2;

  $$('#shopSteps .step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
    $('.step-dot', el).textContent = s < n ? '✓' : s;
  });
  $$('#shopSteps .step-line').forEach((el, i) => el.classList.toggle('done', i + 1 < n));
  $('#shopStepHint').textContent = STEP_HINTS[n] || '';
  $('#modalShop .modal-body').scrollTop = 0;
  updateCheckoutBar();
}

function updateCheckoutBar() {
  const bar = $('#shopStickyBar');
  const show = shopStep === 1 && selectedProducts.length > 0;
  bar.hidden = !show;
  if (!show) return;
  const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  $('#stickyCount').textContent = `${selectedProducts.length} รายการ`;
  $('#stickyTotal').innerHTML = `<span class="cur">฿</span>${total.toLocaleString()}`;
}

function backToProducts() {
  selectedProducts = [];
  showShopStep(1);
  renderShopProducts();
}
Actions['shop-back'] = backToProducts;

/* ══ Payment ══ */
Actions['go-pay'] = () => {
  if (!currentUser) { toast('กรุณา Login ก่อน', 'error'); return; }
  if (!selectedProducts.length) { toast('กรุณาเลือกสินค้า', 'error'); return; }
  startPayment([...selectedProducts]);
};

function startPayment(items) {
  selectedProducts = items;
  const total = items.reduce((sum, p) => sum + p.price, 0);
  $('#qrAmount').textContent = `฿${total.toLocaleString()}`;
  $('#qrLabel').textContent = items.map(p => p.name).join(' + ');
  resetSlip();

  const img = $('#qrImg');
  const loading = $('#qrLoading');
  img.classList.remove('ready');
  loading.hidden = false;
  loading.innerHTML = '<span class="spinner"></span>GENERATING...';
  $('#qrInfo').hidden = true;
  showShopStep(2);

  img.onload = () => {
    loading.hidden = true;
    img.classList.add('ready');
    $('#qrInfo').hidden = false;
  };
  img.onerror = () => { loading.textContent = 'สร้าง QR ไม่สำเร็จ'; };
  const payload = generatePromptPayPayload(PROMPTPAY_ID, total);
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}&bgcolor=ffffff&color=000000&margin=12`;
}

// EMVCo PromptPay payload with CRC16-CCITT checksum
function generatePromptPayPayload(phone, amount) {
  const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;
  const crc16 = str => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  };

  const mobile = '0066' + phone.replace(/^0/, '');
  const payload =
    field('00', '01') +
    field('01', '12') +
    field('29', field('00', 'A000000677010111') + field('01', mobile)) +
    field('53', '764') +
    field('54', amount.toFixed(2)) +
    field('58', 'TH') +
    '6304';
  return payload + crc16(payload);
}

/* ══ Slip upload & verify ══ */
const readAsDataURL = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function resetSlip() {
  $('#slipInput').value = '';
  $('#slipPreview').hidden = true;
  $('#slipLabel').textContent = 'อัพโหลดสลิปโอนเงิน';
  $('#refundAgree').checked = false;
  const btn = $('#confirmSlipBtn');
  btn.disabled = false;
  btn.innerHTML = CONFIRM_LABEL;
}

$('#slipInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = $('#slipPreview');
  preview.src = await readAsDataURL(file);
  preview.hidden = false;
  $('#slipLabel').textContent = `✓ ${file.name}`;
});

Actions['submit-slip'] = async btn => {
  if (!currentUser) { toast('กรุณา Login ก่อน', 'error'); return; }
  const file = $('#slipInput').files[0];
  if (!file) { toast('กรุณาแนบสลิปก่อน', 'error'); return; }
  if (!$('#refundAgree').checked) { toast('กรุณายอมรับนโยบายไม่คืนเงินก่อน', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> กำลัง verify...';
  try {
    const res = await fetch(`${API}/shop/buy-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_ids: selectedProducts.map(p => p.id),
        discord_id: currentUser.discord_id,
        slip_image: await readAsDataURL(file),
      }),
    });
    const data = await res.json();
    if (!data.success) {
      toast(data.error || 'เกิดข้อผิดพลาด', 'error');
      return;
    }
    showKeys(data);
    toast('ได้รับ Key แล้ว!', 'success', 5000);
  } catch {
    toast('เกิดข้อผิดพลาด', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = CONFIRM_LABEL;
  }
};

function keyRow(key) {
  return `
    <div class="key-row">
      <code class="key-value">${esc(key)}</code>
      <button class="btn btn-outline btn-xs" data-action="copy" data-copy="${esc(key)}"><svg class="i"><use href="#i-copy"/></svg>COPY</button>
    </div>`;
}

function showKeys(data) {
  const products = data.products || [];
  $('#keyProductName').textContent = products.join(' + ');
  $('#keysList').innerHTML = (data.keys || []).map((key, i) => `
    <div class="key-item">
      <p class="key-label">${esc(products[i] || `KEY ${i + 1}`)}</p>
      ${keyRow(key)}
    </div>`).join('');
  showShopStep(3);
}

/* ══ Purchase history ══ */
async function openHistory() {
  if (!currentUser) return;
  openModal('modalHistory');
  const list = $('#historyList');
  list.innerHTML = '<div class="hist-sk"><div class="skeleton sk-line w-60"></div><div class="skeleton sk-line w-30"></div></div>'.repeat(3);

  try {
    const res = await fetch(`${API}/shop/history/${encodeURIComponent(currentUser.discord_id)}`);
    const data = await res.json();
    if (!data.length) {
      list.innerHTML = '<p class="shop-empty">ยังไม่มีประวัติการซื้อ</p>';
      return;
    }
    list.innerHTML = data.map(p => {
      const d = new Date(p.created_at);
      const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="hist-item">
          <div class="hist-top">
            <p class="hist-name">${esc(p.product_name)}</p>
            <span class="hist-date">${date} · ${time}</span>
          </div>
          ${keyRow(p.key)}
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<p class="shop-empty">โหลดไม่สำเร็จ</p>';
  }
}

/* ══ Pricing section ══
   The HTML holds normal prices so it reads fine without the API; live prices + promo are filled in here. */
async function hydratePriceTable() {
  const els = $$('[data-price-id]');
  if (!els.length) return;
  let products;
  try { products = await fetchProducts(); } catch { return; }
  const byId = new Map(products.map(p => [p.id, p]));

  els.forEach(el => {
    const p = byId.get(Number(el.dataset.priceId));
    if (!p) return;
    el.textContent = `${fmt(p.price)}.-`;
    if (!hasPromo(p)) return;

    const name = $('.price-name', el.closest('.price-row'));
    const breakdown = $('.price-breakdown', name);
    if (breakdown) breakdown.insertAdjacentHTML('beforebegin', promoChipHtml(p));
    else name.insertAdjacentHTML('beforeend', promoChipHtml(p));

    const stack = document.createElement('span');
    stack.className = 'price-stack';
    el.before(stack);
    stack.innerHTML = wasHtml(p);
    stack.append(el);
  });
}

/* ══ Actions ══ */
Actions.buy = (el, e) => {
  e.preventDefault();
  buyNow(el.dataset.product ? Number(el.dataset.product) : null);
};
Actions['user-shop']    = () => openShop();
Actions['open-history'] = () => openHistory();
Actions.logout          = () => doLogout();

checkLogin();
hydratePriceTable();
