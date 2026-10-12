'use strict';
/* =========================================================
   도움반의 배달 — 특수학급 배달앱 주문 실습
   학생 화면: #/home …   선생님 화면: #/t/orders …
   ========================================================= */

// ▼ (선택) Firebase 설정을 여기에 직접 붙여넣으면, 이 파일을 연 모든 기기가 링크 없이 자동으로 연결됩니다.
//   예) const FIXED_FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", databaseURL: "...", projectId: "..." };
const FIXED_FIREBASE_CONFIG = null;
const FIXED_CLASS_CODE = '';
const FB_VER = '10.12.2';

const CATS = [
  { name: '한식', emo: '🍚' }, { name: '치킨', emo: '🍗' }, { name: '찜·탕', emo: '🍲' }, { name: '카페·디저트', emo: '🧋' }, { name: '패스트푸드', emo: '🍔' },
  { name: '중식', emo: '🍜' }, { name: '피자', emo: '🍕' }, { name: '분식', emo: '🍢' }, { name: '일식', emo: '🍣' }, { name: '양식', emo: '🍝' },
];
const STATUS = ['접수', '조리 중', '배달 중', '배달 완료'];
const NEXT_LABEL = { '접수': '조리 시작', '조리 중': '배달 출발', '배달 중': '배달 완료' };
const RIDER_REQ = ['문 앞에 두고 초인종 눌러주세요.', '문 앞에 두고 노크해 주세요.', '직접 받을게요.', '도착하면 전화해 주세요.', '직접 입력'];
const STORE_REQ = ['요청사항 없음', '맵지 않게 해주세요.', '양 많이 주세요.', '소스 많이 주세요.', '직접 입력'];

/* ---------- 작은 도구들 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원';
const toNum = v => { const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
const digits = v => String(v ?? '').replace(/\D/g, '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtCard = n => digits(n).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtPhone = v => { const d = digits(v).slice(0, 11); if (d.length < 4) return d; if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3); return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4); };
const hhmm = t => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const timeAgo = t => { const m = Math.floor((Date.now() - t) / 60000); if (m < 1) return '방금'; if (m < 60) return m + '분 전'; const h = Math.floor(m / 60); return h < 24 ? h + '시간 전' : new Date(t).toLocaleDateString('ko-KR'); };
const isToday = t => new Date(t).toDateString() === new Date().toDateString();
const catEmo = name => (CATS.find(c => c.name === name) || {}).emo || '🍽️';
const hue = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const pastel = s => `hsl(${hue(s)} 85% 92%)`;
const strong = s => `hsl(${hue(s)} 70% 58%)`;
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v === undefined || v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } },
};
const SS = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } },
};

const IC = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4M10 5l-7 7 7 7"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h2.6l2.2 10.6a1.6 1.6 0 0 0 1.6 1.3h7.8a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 3 10.5V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9-9.3C2 7.3 4.2 4.5 7.3 4.5c2 0 3.6 1.2 4.7 2.8 1.1-1.6 2.7-2.8 4.7-2.8 3.1 0 5.3 2.8 4.3 6.2C19.5 15.4 12 20 12 20z"/></svg>',
  heartF: '<svg viewBox="0 0 24 24" fill="#ff3d5a" stroke="#ff3d5a" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9-9.3C2 7.3 4.2 4.5 7.3 4.5c2 0 3.6 1.2 4.7 2.8 1.1-1.6 2.7-2.8 4.7-2.8 3.1 0 5.3 2.8 4.3 6.2C19.5 15.4 12 20 12 20z"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 13.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 9h12l-6 7z"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

/* ---------- 상태 ---------- */
// S: 모든 기기가 함께 보는 데이터 / L: 이 기기에만 저장 / T: 지금 화면의 임시 상태
const S = { stores: {}, cards: {}, orders: {}, settings: {} };
const loaded = {};
const L = {
  deviceId: LS.get('doum_device') || (() => { const id = 'd' + uid(); LS.set('doum_device', id); return id; })(),
  profile: LS.get('doum_profile', { name: '', phone: '', address: '', detail: '' }),
  cart: LS.get('doum_cart', { storeId: null, items: [] }),
  card: LS.get('doum_card', null),
  likes: LS.get('doum_likes', []),
};
const saveL = k => LS.set('doum_' + k, L[k]);
let T = {};
let current = null;
let lastOrder = null;
let pendingRefresh = false;
let renderedLoading = false;
const navStack = [];
const scrollMem = {};
const fresh = new Map();
let knownOrders = null;

/* =========================================================
   데이터 저장소 — Firebase(여러 기기 실시간) 또는 이 기기(localStorage)
   ========================================================= */
const DB = (() => {
  const KEYS = ['stores', 'cards', 'orders', 'settings'];
  let mode = 'local', code = 'class1', root = null, local = {}, cb = () => { }, connCb = () => { }, connected = null, cfgUsed = null;
  const lsKey = () => 'doum_db_' + code;
  const parts = p => p.split('/').filter(Boolean);
  function setAt(obj, p, val) {
    const ps = parts(p); let o = obj;
    for (let i = 0; i < ps.length - 1; i++) { if (typeof o[ps[i]] !== 'object' || o[ps[i]] === null) o[ps[i]] = {}; o = o[ps[i]]; }
    const last = ps[ps.length - 1];
    if (val === null || val === undefined) delete o[last]; else o[last] = clone(val);
  }
  const getAt = (obj, p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const emit = k => cb(k, local[k] || {});
  const saveLocal = () => LS.set(lsKey(), local);
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Firebase 프로그램을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); document.head.appendChild(s); });
  return {
    get mode() { return mode; }, get code() { return code; }, get connected() { return connected; }, get cfg() { return cfgUsed; },
    initError: '', readError: '',
    readLocal(c) { return LS.get('doum_db_' + (c || code), {}); },
    async init(cfg, c) {
      code = String(c || 'class1').replace(/[^a-zA-Z0-9_-]/g, '') || 'class1';
      if (cfg && cfg.databaseURL) {
        try {
          await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
          await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-database-compat.js`);
          const app = firebase.initializeApp(cfg);
          const fdb = firebase.database(app);
          root = fdb.ref('doumban/' + code);
          mode = 'firebase'; cfgUsed = cfg;
          fdb.ref('.info/connected').on('value', s => { connected = !!s.val(); connCb(connected); });
          return;
        } catch (e) { console.error(e); this.initError = e.message || String(e); }
      }
      mode = 'local'; local = LS.get(lsKey(), {}); connected = true;
      window.addEventListener('storage', e => { if (e.key === lsKey()) { local = LS.get(lsKey(), {}); KEYS.forEach(emit); } });
    },
    start(onChange, onConn) {
      cb = onChange; if (onConn) connCb = onConn;
      if (mode === 'local') KEYS.forEach(emit);
      else KEYS.forEach(k => root.child(k).on('value', s => cb(k, s.val() || {}), err => { console.error(err); this.readError = err.message; cb(k, {}, err); }));
    },
    newId(path) { return mode === 'firebase' ? root.child(path).push().key : uid(); },
    async set(path, val) {
      if (mode === 'firebase') return root.child(path).set(val == null ? null : clone(val));
      setAt(local, path, val); saveLocal(); emit(parts(path)[0]);
    },
    async update(path, obj) {
      if (mode === 'firebase') return root.child(path).update(clone(obj));
      for (const k in obj) setAt(local, path + '/' + k, obj[k]);
      saveLocal(); emit(parts(path)[0]);
    },
    remove(path) { return this.set(path, null); },
    // 카드 잔액 바꾸기 (동시에 결제해도 안전하게)
    async addBalance(no, delta) {
      if (mode === 'firebase') {
        const r = await root.child('cards/' + no + '/balance').transaction(b => {
          if (b === null) return null;
          const nb = Number(b) + delta;
          if (nb < 0) return; // 잔액 부족 → 취소
          return nb;
        }, undefined, false);
        const bal = r.snapshot.val();
        if (bal === null) return { ok: false, reason: 'nocard' };
        if (!r.committed) return { ok: false, reason: 'balance', balance: bal };
        return { ok: true, balance: bal };
      }
      local = LS.get(lsKey(), {});
      const c = getAt(local, 'cards/' + no);
      if (!c) return { ok: false, reason: 'nocard' };
      const nb = (Number(c.balance) || 0) + delta;
      if (nb < 0) return { ok: false, reason: 'balance', balance: c.balance };
      c.balance = nb; saveLocal(); emit('cards');
      return { ok: true, balance: nb };
    },
  };
})();

/* =========================================================
   시작
   ========================================================= */
async function boot() {
  const h = location.hash;
  if (h.startsWith('#cfg=')) {
    let toTeacher = false;
    try {
      const d = JSON.parse(b64d(h.slice(5)));
      if (d.c) LS.set('doum_fb', d.c);
      if (d.k) LS.set('doum_class', d.k);
      toTeacher = !!d.t;
    } catch (e) { console.error(e); }
    history.replaceState(null, '', location.pathname + location.search + (toTeacher ? '#/t/orders' : '#/home'));
  }
  const cfg = FIXED_FIREBASE_CONFIG || LS.get('doum_fb', null);
  const code = FIXED_CLASS_CODE || LS.get('doum_class', 'class1');
  await DB.init(cfg, code);
  DB.start(onData, () => { if (current && current.view.startsWith('t-')) { const c = $('#conn'); if (c) c.outerHTML = connBadge(); } });
  window.addEventListener('hashchange', () => render());
  render();
  if (DB.mode === 'local' && !S.settings.initialized) await seedSample(true);
  if (DB.initError) toast('실시간 연결에 실패해서 이 기기에만 저장해요. (' + DB.initError + ')', 5000);
}

function ready() { return loaded.stores && loaded.cards && loaded.orders && loaded.settings; }

function onData(k, v) {
  S[k] = v || {};
  loaded[k] = true;
  if (k === 'orders') detectNewOrders();
  if (renderedLoading && ready()) { render(true); return; }
  liveRefresh();
}

function detectNewOrders() {
  const ids = Object.keys(S.orders);
  if (!knownOrders) { knownOrders = new Set(ids); return; }
  let added = 0;
  ids.forEach(id => { if (!knownOrders.has(id)) { knownOrders.add(id); fresh.set(id, Date.now()); added++; } });
  if (added && current && current.view.startsWith('t-')) {
    beep();
    toast(`🔔 새 주문이 ${added}건 들어왔어요!`);
  }
}

const LIVE = new Set(['home', 'list', 'store', 'orders', 'done', 'my', 'likes', 'search', 't-orders', 't-cards', 't-stores']);
function liveRefresh() {
  if (!current) return;
  if (!LIVE.has(current.view)) return;
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $('#root').contains(a)) { pendingRefresh = true; return; }
  render(true);
}
document.addEventListener('focusout', () => setTimeout(() => {
  const a = document.activeElement;
  if (pendingRefresh && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { pendingRefresh = false; render(true); }
}, 250));
setInterval(() => { if (current && current.view === 't-orders') liveRefresh(); }, 30000);

/* ---------- 화면 이동 ---------- */
function parseRoute() {
  let h = location.hash.replace(/^#\/?/, '');
  let segs;
  try { segs = h.split('/').map(decodeURIComponent); } catch (e) { segs = h.split('/'); }
  if (!segs[0]) segs = ['home'];
  let view = segs[0], args = segs.slice(1);
  if (view === 't') { view = 't-' + (args[0] || 'orders'); args = args.slice(1); }
  if (!VIEWS[view]) { view = 'home'; args = []; }
  return { view, args, key: [segs[0], ...segs.slice(1)].join('/') };
}
let pushing = false;
const toHash = path => '#/' + String(path).split('/').map(encodeURIComponent).join('/');
const go = path => { const h = toHash(path); if (h === location.hash) return; pushing = true; location.hash = h; };
const replaceTo = path => { navStack.pop(); pushing = true; location.replace(toHash(path)); };
// 뒤로: 앱 안에서 온 화면이 있으면 브라우저 뒤로, 없으면(링크로 바로 들어옴) 정해진 화면으로
function back(parent) {
  if (navStack.length > 1) history.back(); else go(parent);
}
function trackNav(key) {
  if (!pushing && navStack[navStack.length - 2] === key) navStack.pop();
  else if (navStack[navStack.length - 1] !== key) navStack.push(key);
  pushing = false;
  if (navStack.length > 60) navStack.splice(0, 20);
}
const KEEP_SCROLL = new Set(['home', 'list', 'store', 't-stores', 't-store', 't-cards', 't-orders']);

function snapshotInputs() {
  return $$('#root input[id], #root textarea[id], #root select[id]')
    .filter(el => el.type !== 'file' && !/^og_/.test(el.id))
    .map(el => [el.id, el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value, el.type]);
}
function restoreInputs(vals) {
  vals.forEach(([id, v, type]) => {
    const el = document.getElementById(id);
    if (!el || el.type !== type) return;
    if (type === 'checkbox' || type === 'radio') el.checked = v; else el.value = v;
  });
}

function render(keep) {
  const r = parseRoute();
  const changed = !current || r.key !== current.key;
  if (changed) {
    if (current) scrollMem[current.key] = window.scrollY;
    T = {};
    trackNav(r.key);
    keep = false;
  }
  current = r;
  const isT = r.view.startsWith('t-');
  document.body.classList.toggle('teacher', isT);
  if (isT) initAudio();
  const sy = keep ? window.scrollY : (KEEP_SCROLL.has(r.view) ? (scrollMem[r.key] || 0) : 0);
  const vals = keep ? snapshotInputs() : null;
  let html;
  renderedLoading = false;
  if (!ready() && r.view !== 't-settings') { html = vLoading(); renderedLoading = true; }
  else {
    try { html = VIEWS[r.view](...r.args); }
    catch (e) { console.error(e); html = `<div class="app"><div class="empty"><div class="big">😵</div><b>화면을 그리다가 문제가 생겼어요</b>${esc(e.message)}<br><br><button class="btn-mint" data-act="go" data-to="home">홈으로</button></div></div>`; }
  }
  $('#root').innerHTML = html;
  if (vals) restoreInputs(vals);
  window.scrollTo(0, sy);
  const t = $('#autofocus'); if (t && !keep) t.focus();
  if (AFTER[r.view]) AFTER[r.view](...r.args);
}

function vLoading() {
  const err = DB.readError;
  return `<div class="app"><div class="empty"><div class="big">🛵</div><b>도움반의 배달</b>${err ? `데이터를 읽지 못했어요.<br><small>${esc(err)}</small><br><br>Firebase 데이터베이스 규칙(읽기·쓰기 허용)을 확인해 주세요.<br><br><button class="btn-line" data-act="go" data-to="t/settings">연결 설정 열기</button>` : '가게 정보를 불러오는 중이에요…'}</div></div>`;
}

/* ---------- 데이터 도우미 ---------- */
function menuList(s) {
  return Object.entries((s && s.menus) || {}).map(([id, m]) => ({ ...m, id })).filter(m => m && m.name)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(b.name));
}
function storeList() {
  return Object.entries(S.stores || {}).map(([id, s]) => ({ ...s, id })).filter(s => s && s.name)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(b.name));
}
const areaWords = s => String(s.areas || '').split(/[,，\n]/).map(t => t.trim()).filter(Boolean);
function areaMatch(s) {
  const kws = areaWords(s); if (!kws.length) return true;
  const a = (L.profile.address + ' ' + L.profile.detail).replace(/\s/g, '');
  return kws.some(k => a.includes(k.replace(/\s/g, '')));
}
function visibleStores() {
  return storeList().filter(s => !L.profile.address || areaMatch(s));
}
function groupNames(s, menus) {
  const base = String(s.groups || '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
  menus.forEach(m => { const g = (m.group || '').trim() || '메뉴'; if (!base.includes(g)) base.push(g); });
  return base.filter(g => menus.some(m => ((m.group || '').trim() || '메뉴') === g));
}
const feeFor = (s, tot) => (toNum(s.freeOver) && tot >= toNum(s.freeOver)) ? 0 : toNum(s.fee);
const cartTotal = () => L.cart.items.reduce((a, i) => a + i.unit * i.qty, 0);
const cartCount = () => L.cart.items.reduce((a, i) => a + i.qty, 0);
const menuEmo = (m, s) => (m && m.emoji) || (s && s.emoji) || catEmo(s && s.category);
const storeEmo = s => s.emoji || catEmo(s.category);
function findMenu(s, mid) { const m = s && s.menus && s.menus[mid]; return m ? { ...m, id: mid } : null; }
const opts = m => (Array.isArray(m.options) ? m.options : Object.values(m.options || {})).map(g => ({ ...g, choices: Array.isArray(g.choices) ? g.choices : Object.values(g.choices || {}) }));

function imgOr(src, emo, bgKey) {
  return src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="emo" style="background:${pastel(bgKey)}">${esc(emo)}</span>`;
}
function logoHtml(s, size) {
  return `<span class="logo" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .52)}px;background:${s.logo ? '#fff' : pastel(s.category)}">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : esc(storeEmo(s))}</span>`;
}
const cartBadge = () => cartCount() ? `<span class="badge">${cartCount()}</span>` : '';

/* =========================================================
   학생 화면
   ========================================================= */
function nav(on) {
  const b = (v, ic, label) => `<button class="${on === v ? 'on' : ''}" data-act="go" data-to="${v}">${ic}<span>${label}</span></button>`;
  return `<nav class="bottomnav">${b('home', IC.home, '홈')}${b('likes', IC.heart, '찜')}${b('orders', IC.receipt, '주문내역')}${b('my', IC.smile, '마이')}</nav>`;
}
function topbar(title, backTo, right = '') {
  return `<header class="topbar"><button class="iconbtn" data-act="back" data-to="${esc(backTo)}" aria-label="뒤로">${IC.back}</button><h1>${title}</h1>${right || '<span class="iconbtn"></span>'}</header>`;
}
const cartBtn = () => `<button class="iconbtn" data-act="go" data-to="cart" aria-label="장바구니">${IC.cart}${cartBadge()}</button>`;

/* 1. 홈 */
function vHome() {
  const p = L.profile;
  const stores = visibleStores();
  const banner = S.settings.bannerText || '지금 도움반의 배달에서\n주문 연습을 해 볼까요?';
  const myActive = Object.values(S.orders).filter(o => o.deviceId === L.deviceId && !['배달 완료', '취소'].includes(o.status));
  return `<div class="app">
  <div class="home-head">
    <div class="addr-row">
      <button class="addr-btn ${p.address ? '' : 'empty'}" data-act="profile" data-focus="addr"><span>${p.address ? esc(p.address) : '주소를 입력해 주세요'}</span>${IC.down}</button>
      <span class="brandtag">도움반의 배달</span>
      <button class="iconbtn" data-act="go" data-to="orders" aria-label="주문 알림">${IC.bell}${myActive.length ? '<span class="badge">' + myActive.length + '</span>' : ''}</button>
      ${cartBtn()}
    </div>
    <form class="search" data-form="search" role="search"><input id="q" name="q" placeholder="떡볶이? 치킨?" enterkeyhint="search" autocomplete="off"><button class="iconbtn" aria-label="검색">${IC.search}</button></form>
    <div class="banner"><div class="txt"><h2>${esc(banner).replace(/\n/g, '<br>')}</h2><button class="pill" data-act="go" data-to="list/전체">가게 보러가기 ›</button></div><div class="coupon">주문</div></div>
  </div>
  <div class="sheet">
    <div class="tabs"><button class="on">음식배달</button><button class="dim" data-act="soon">픽업</button><button class="dim" data-act="soon">장보기·쇼핑</button><button class="dim" data-act="soon">선물하기</button><button class="dim" data-act="soon">혜택모아보기</button></div>
    <div class="catgrid">${CATS.map(c => `<button class="cat" data-act="go" data-to="list/${esc(c.name)}"><span class="ic">${c.emo}</span>${esc(c.name)}</button>`).join('')}</div>
    <button class="more" data-act="go" data-to="list/전체"><b>음식배달</b>에서 더보기 ${IC.right}</button>
  </div>
  <div class="gap"></div>
  ${!p.address ? `<button class="notice-box" style="display:block;width:calc(100% - 32px);text-align:left" data-act="profile" data-focus="addr"><b>📍 먼저 우리 집 주소를 입력해요</b>주소를 입력하면 우리 동네로 배달하는 가게가 보여요. 여기를 눌러요.</button>` : ''}
  <h3 class="sec-title">우리 동네 가게</h3>
  ${stores.length ? `<div class="storerow">${stores.map(s => `<button data-act="store" data-id="${esc(s.id)}" class="${s.open === false ? 'closed' : ''}">${logoHtml(s, 76)}<span class="nm">${esc(s.name)}</span></button>`).join('')}</div>`
      : `<div class="empty" style="padding:30px 20px"><div class="big">🏪</div><b>배달 가능한 가게가 없어요</b>${p.address ? '주소가 맞는지 확인하거나 선생님께 물어보세요.' : '선생님이 가게를 준비하고 있어요.'}</div>`}
  ${nav('home')}
  </div>`;
}

/* 2. 가게 목록 */
function vList(cat = '전체') {
  const sort = T.sort || '기본순';
  let arr = visibleStores().filter(s => cat === '전체' || s.category === cat);
  if (T.free) arr = arr.filter(s => !toNum(s.fee));
  if (T.star) arr = arr.filter(s => Number(s.rating) >= 4.5);
  if (sort === '별점 높은 순') arr.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  if (sort === '배달 빠른 순') arr.sort((a, b) => toNum(a.time) - toNum(b.time));
  if (sort === '최소주문 낮은 순') arr.sort((a, b) => toNum(a.minOrder) - toNum(b.minOrder));
  const tabs = ['전체', ...CATS.map(c => c.name)];
  return `<div class="app no-nav" style="padding-bottom:40px">
  <header class="topbar left"><button class="iconbtn" data-act="back" data-to="home" aria-label="뒤로">${IC.back}</button><h1>음식배달 🍴</h1><button class="iconbtn" data-act="go" data-to="search" aria-label="검색">${IC.search}</button>${cartBtn()}</header>
  <div class="cattabs">${tabs.map(t => `<button class="${t === cat ? 'on' : ''}" data-act="tab" data-to="list/${esc(t)}">${esc(t)}</button>`).join('')}</div>
  <div class="chips">
    <button class="chip on" data-act="sort">⇅ ${esc(sort)}</button>
    <button class="chip ${T.free ? 'on' : ''}" data-act="toggle" data-k="free">🛵 배달팁 0원</button>
    <button class="chip ${T.star ? 'on' : ''}" data-act="toggle" data-k="star">⭐ 별점 4.5 이상</button>
  </div>
  ${arr.length ? arr.map(storeCard).join('') : `<div class="empty"><div class="big">${cat === '전체' ? '🏪' : catEmo(cat)}</div><b>${esc(cat)} 가게가 없어요</b>다른 음식 종류를 눌러 보세요.</div>`}
  </div>`;
}
function storeCard(s) {
  const ms = menuList(s).filter(m => !m.soldOut).sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || (b.image ? 1 : 0) - (a.image ? 1 : 0)).slice(0, 2);
  while (ms.length < 2) ms.push(null);
  const pic = m => `<div class="pic">${m ? imgOr(m.image, menuEmo(m, s), m.name) : imgOr(s.banner, storeEmo(s), s.name)}${m ? `<div class="cap">${esc(m.name)}<b>${won(m.price)}</b></div>` : ''}</div>`;
  const fee = toNum(s.fee);
  return `<button class="storecard ${s.open === false ? 'closed' : ''}" data-act="store" data-id="${esc(s.id)}">
    <div class="pics">${pic(ms[0])}${pic(ms[1])}</div>
    <div class="sname">${esc(s.name)} <span class="rate"><i>★</i>${esc(s.rating || '5.0')} <small>(${esc(s.reviews || 0)})</small></span></div>
    <div class="smeta"><span>🛵 약 ${esc(s.time || '30분')}</span><span>배달팁 ${fee ? won(fee) : '0원'}</span>${s.distance ? `<span>📍${esc(s.distance)}</span>` : ''}<span><span class="g">최소주문</span> ${won(s.minOrder)}</span></div>
    ${s.open === false ? '<span class="tagline" style="color:#c0392b;border-color:#f3b4ad">지금은 준비 중이에요</span>' : (toNum(s.freeOver) && fee ? `<span class="tagline">${won(s.freeOver)} 이상 주문하면 배달팁 0원</span>` : '')}
  </button>`;
}

/* 검색 */
function vSearch(q = '') {
  const qq = q.trim().replace(/\s/g, '');
  const res = qq ? visibleStores().filter(s => (s.name + s.category).replace(/\s/g, '').includes(qq) || menuList(s).some(m => String(m.name).replace(/\s/g, '').includes(qq))) : [];
  return `<div class="app no-nav" style="padding-bottom:40px">
  ${topbar('검색', 'home', cartBtn())}
  <form class="search" data-form="search" style="margin:0 16px"><input id="${q ? 'q' : 'autofocus'}" name="q" value="${esc(q)}" placeholder="가게 이름이나 메뉴를 써 보세요" enterkeyhint="search" autocomplete="off"><button class="iconbtn" aria-label="검색">${IC.search}</button></form>
  ${q ? (res.length ? `<p style="padding:16px 16px 0;margin:0;color:var(--sub)">‘${esc(q)}’ 검색 결과 ${res.length}개</p>` + res.map(storeCard).join('') : `<div class="empty"><div class="big">🔍</div><b>‘${esc(q)}’ 검색 결과가 없어요</b>다른 낱말로 찾아보세요.</div>`) : `<div class="empty"><div class="big">🔍</div><b>무엇을 먹고 싶나요?</b>예) 치킨, 떡볶이, 버거</div>`}
  </div>`;
}

/* 3·5. 가게 */
function vStore(sid) {
  const s = S.stores[sid]; if (!s) return notFound('가게를 찾을 수 없어요');
  const st = { ...s, id: sid };
  const menus = menuList(st);
  const pop = menus.filter(m => m.popular);
  const groups = groupNames(st, menus);
  const liked = L.likes.includes(sid);
  const inCart = L.cart.storeId === sid && L.cart.items.length;
  const fee = toNum(s.fee);
  const item = (m, rank) => `<button class="mitem ${m.soldOut ? 'soldout' : ''}" data-act="menu" data-sid="${esc(sid)}" data-mid="${esc(m.id)}">
      <div class="t">${rank ? `<span class="rank">인기 ${rank}위</span><br>` : ''}<div class="n">${esc(m.name)}${m.soldOut ? '<span class="soldtag">품절</span>' : ''}</div>${m.desc ? `<div class="d">${esc(m.desc)}</div>` : ''}<div class="p">${won(m.price)}</div></div>
      <div class="thumb"><div class="box">${imgOr(m.image, menuEmo(m, st), m.name)}</div>${m.soldOut ? '' : '<span class="plus">+</span>'}</div>
    </button>`;
  return `<div class="app ${inCart ? 'no-nav' : ''}" style="${inCart ? '' : 'padding-bottom:40px'}">
  <div class="hero" style="background:${strong(s.category)}">
    ${s.banner ? `<img src="${esc(s.banner)}" alt="">` : `<span class="emo">${esc(storeEmo(s))}</span>`}
    <div class="hero-bar"><button class="iconbtn" data-act="back" data-to="list/${esc(s.category || '전체')}" aria-label="뒤로">${IC.back}</button>${cartBtn()}</div>
    ${logoHtml(st, 84)}
  </div>
  <div class="sinfo">
    <h2>${esc(s.name)} <button class="iconbtn" data-act="like" data-id="${esc(sid)}" aria-label="찜하기">${liked ? IC.heartF : IC.heart}</button></h2>
    <div class="rate" style="margin-top:4px"><i>★</i>${esc(s.rating || '5.0')}(${esc(s.reviews || 0)}) ›</div>
    ${s.open === false ? '<p class="err">지금은 준비 중이라 주문할 수 없어요.</p>' : ''}
  </div>
  <dl class="infobox">
    <dt>최소주문</dt><dd class="num">${won(s.minOrder)}</dd>
    <dt>가게배달 🛵</dt><dd>${esc(s.time || '30분')}<br><span class="num">배달팁 ${fee ? won(fee) : '0원'}</span>${toNum(s.freeOver) && fee ? `<br><small style="color:var(--mint-ink)">${won(s.freeOver)} 이상 주문하면 0원</small>` : ''}</dd>
  </dl>
  ${s.notice ? `<div class="snotice">📢 ${esc(s.notice)}</div>` : ''}
  ${menus.length ? `<div class="menuchips">${pop.length ? '<button class="chip on" data-act="jump" data-to="g-pop">인기 메뉴</button>' : ''}${groups.map((g, i) => `<button class="chip" data-act="jump" data-to="g-${i}">${esc(g)}</button>`).join('')}</div>` : ''}
  ${pop.length ? `<section class="mgroup" id="g-pop"><h3>가장 인기 있는 메뉴</h3><p class="desc">한 달 동안 주문이 많고 만족도가 높은 메뉴예요.</p>${pop.map((m, i) => item(m, i + 1)).join('')}</section>` : ''}
  ${groups.map((g, i) => `<section class="mgroup" id="g-${i}"><h3>${esc(g)}</h3>${menus.filter(m => ((m.group || '').trim() || '메뉴') === g).map(m => item(m)).join('')}</section>`).join('')}
  ${!menus.length ? '<div class="empty"><div class="big">📋</div><b>아직 메뉴가 없어요</b>선생님이 메뉴를 준비하고 있어요.</div>' : ''}
  ${inCart ? storeCartBar(st) : ''}
  </div>`;
}
function storeCartBar(s) {
  const tot = cartTotal(); const need = toNum(s.minOrder) - tot;
  return `<div class="actionbar"><div class="sum"><b class="num">${won(tot)}</b><small class="${need > 0 ? '' : 'ok'}">${need > 0 ? won(need) + ' 더 담으면 주문 가능' : '주문 가능'}</small></div><button class="btn-mint" data-act="go" data-to="cart"><span class="cnt">${cartCount()}</span> 장바구니 보기</button></div>`;
}

/* 4. 메뉴 고르기 */
function vMenu(sid, mid) {
  const s = S.stores[sid]; const m = findMenu(s, mid);
  if (!s || !m) return notFound('메뉴를 찾을 수 없어요');
  const groups = opts(m);
  if (!T.sel) { T.sel = {}; T.qty = 1; groups.forEach((g, gi) => { T.sel[gi] = (g.required && (Number(g.max) || 1) === 1 && g.choices.length) ? [0] : []; }); }
  const unit = menuUnit(m, groups);
  return `<div class="app no-nav">
  <div class="mhero">${imgOr(m.image, menuEmo(m, s), m.name)}<div class="hero-bar"><button class="iconbtn" data-act="back" data-to="store/${esc(sid)}" aria-label="뒤로">${IC.back}</button>${cartBtn()}</div></div>
  <div class="photo-note">메뉴 사진은 실제 음식과 다를 수 있어요</div>
  <div class="mhead">${m.popular ? '<span class="rank" style="display:inline-block;background:var(--bg2);font-size:13px;font-weight:700;padding:3px 8px;border-radius:6px">인기 메뉴</span>' : ''}<h2>${esc(m.name)}</h2>${m.desc ? `<p>${esc(m.desc)}</p>` : ''}</div>
  <div class="row"><span class="lb">수량</span><span class="stepper"><button data-act="qty" data-d="-1" ${T.qty <= 1 ? 'disabled' : ''} aria-label="빼기">−</button><span class="num">${T.qty}</span><button data-act="qty" data-d="1" aria-label="더하기">+</button></span></div>
  <div class="row"><span class="lb">가격</span><span class="val num">${won(m.price)}</span></div>
  ${groups.map((g, gi) => {
    const max = Number(g.max) || 1; const sel = T.sel[gi] || [];
    const single = max === 1;
    return `<section class="optgroup" id="og-${gi}"><div class="gh"><div><b>${esc(g.name)}</b><small>${single ? '1개 고르기' : `최대 ${max}개까지 고르기`}</small></div><span class="req ${g.required ? '' : 'optional'}">${g.required ? '필수' : '선택'}</span></div>
      ${g.choices.map((c, ci) => `<button class="opt ${sel.includes(ci) ? 'on' : ''}" data-act="opt" data-g="${gi}" data-c="${ci}"><span class="${single && g.required ? 'radio' : 'check'}"></span><span class="nm">${esc(c.name)}</span><span class="pr num">+${won(c.price)}</span></button>`).join('')}
    </section>`;
  }).join('')}
  <div class="actionbar"><div class="sum"><small>배달 최소주문금액</small><b class="num" style="font-size:18px">${won(s.minOrder)}</b></div><button class="btn-mint" style="flex:1.4" data-act="add" data-sid="${esc(sid)}" data-mid="${esc(mid)}">${won(unit * T.qty)} 담기</button></div>
  </div>`;
}
function menuUnit(m, groups) {
  let u = toNum(m.price);
  groups.forEach((g, gi) => (T.sel[gi] || []).forEach(ci => { u += toNum(g.choices[ci] && g.choices[ci].price); }));
  return u;
}

/* 6-1·6-2. 장바구니 */
function vCart() {
  const s = S.stores[L.cart.storeId]; const items = L.cart.items;
  const head = `${topbar('장바구니', s ? 'store/' + L.cart.storeId : 'home')}<div class="segtabs"><div class="on">배달·픽업 ${cartCount() || ''}</div><div>장보기·쇼핑</div><div>전국특가</div></div>`;
  if (!s || !items.length) return `<div class="app graybg" style="padding-bottom:40px">${head}<div class="empty"><div class="big">🛒</div><b>장바구니가 비어 있어요</b>먹고 싶은 메뉴를 담아 보세요.<br><br><button class="btn-mint" data-act="go" data-to="list/전체">가게 보러가기</button></div></div>`;
  const st = { ...s, id: L.cart.storeId };
  const tot = cartTotal(); const fee = feeFor(s, tot); const need = toNum(s.minOrder) - tot;
  const menus = menuList(st);
  const rec = menus.filter(m => !m.soldOut && !items.some(i => i.menuId === m.id)).slice(0, 3);
  const freeNeed = toNum(s.freeOver) && toNum(s.fee) && tot < toNum(s.freeOver) ? toNum(s.freeOver) - tot : 0;
  return `<div class="app graybg no-nav">${head}
  <button class="storehead" data-act="go" data-to="store/${esc(st.id)}">${logoHtml(st, 36)} ${esc(s.name)} ›</button>
  <div class="card">
    ${items.map((it, idx) => { const m = findMenu(s, it.menuId); return `<div class="citem">
      <div class="top"><div class="t"><div class="n">${esc(it.name)}</div><div class="o">가격 : ${won(it.base)}${it.opts.map(o => `<br>${esc(o)}`).join('')}</div><div class="sum num">${won(it.unit * it.qty)}</div></div>
      <div class="mini">${imgOr(m && m.image, menuEmo(m || {}, s), it.name)}</div></div>
      <div class="ctl"><button class="btn-line" data-act="cdel" data-i="${idx}">삭제</button><span class="stepper sm"><button data-act="cqty" data-i="${idx}" data-d="-1" aria-label="빼기">−</button><span class="num">${it.qty}</span><button data-act="cqty" data-i="${idx}" data-d="1" aria-label="더하기">+</button></span></div>
    </div>`; }).join('')}
    <button class="addmore" data-act="go" data-to="store/${esc(st.id)}">＋ 메뉴 추가</button>
  </div>
  ${rec.length ? `<div class="card rec"><h4>함께 먹으면 좋아요</h4>${freeNeed ? `<p>${won(freeNeed)} 더 담으면 배달팁 <s>${won(s.fee)}</s> <b>0원</b></p>` : ''}
    ${rec.map(m => `<div class="recitem"><div class="mini">${imgOr(m.image, menuEmo(m, s), m.name)}</div><div class="t"><b>${esc(m.name)}</b><span class="num">${won(m.price)}${opts(m).length ? '~' : ''}</span></div><button class="round-plus" data-act="recadd" data-mid="${esc(m.id)}" aria-label="${esc(m.name)} 담기">+</button></div>`).join('')}</div>` : ''}
  <div class="card"><div class="ch">배달</div><div class="cb"><div class="deliv"><div><b>가게배달 🛵</b><small>${esc(s.time || '30분')}</small></div><b class="num">${won(fee)}</b></div></div></div>
  <div class="card"><div class="ch">결제금액을 확인해 주세요</div><div class="cb"><table class="paytable num">
    <tr><td>메뉴 금액</td><td>${won(tot)}</td></tr>
    <tr><td>배달팁</td><td>${won(fee)}</td></tr>
    <tr class="total"><td>결제예정금액</td><td>${won(tot + fee)}</td></tr>
  </table></div></div>
  <div class="actionbar"><div class="sum"><b class="num">${won(tot + fee)}</b><small class="${need > 0 ? '' : 'ok'}">${need > 0 ? won(need) + ' 더 담아야 주문할 수 있어요' : '주문 가능'}</small></div><button class="btn-mint ${need > 0 || s.open === false ? 'off' : ''}" data-act="order">가게배달 주문하기</button></div>
  </div>`;
}

/* 6-3·6-4·6-5. 주문하기 */
function vCheckout() {
  const s = S.stores[L.cart.storeId]; const items = L.cart.items;
  if (!s || !items.length) return vCart();
  const force = !!S.settings.forceCardInput;
  if (T.rider === undefined) { T.rider = RIDER_REQ[0]; T.storeReq = STORE_REQ[0]; T.noUtensils = true; T.method = ''; T.useSaved = !!L.card && !force; T.csave = !force; }
  const p = L.profile;
  const tot = cartTotal(); const fee = feeFor(s, tot); const total = tot + fee;
  const first = items[0]; const fm = findMenu(s, first.menuId);
  const err = T.err || {};
  const errHtml = sec => err.sec === sec ? `<div class="err">⚠️ ${esc(err.msg)}</div>` : '';
  const areaBad = p.address && !areaMatch(s);
  const card = L.card && S.cards[L.card.no];
  const payopt = (k, label, ic, dis) => `<button class="payopt ${T.method === k ? 'on' : ''} ${dis ? 'dis' : ''}" data-act="method" data-k="${k}"><span class="radio"></span>${ic}<span>${label}</span></button>`;
  return `<div class="app graybg no-nav" style="padding-bottom:120px">
  ${topbar('주문하기', 'cart')}
  <div class="ordhead">가게배달 🛵로 받을게요 <span>⏱ ${esc(s.time || '30분')} 후 도착</span></div>

  <div class="card"><div class="ch">담은 메뉴</div><div class="cb">
    <div class="sumline"><div class="mini" style="width:72px;height:72px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);flex:none;background:#f5f6f8">${imgOr(fm && fm.image, menuEmo(fm || {}, s), first.name)}</div>
      <div class="t"><b>${esc(first.name)} ${first.qty}개${items.length > 1 ? ` 외 ${items.length - 1}개` : ''}</b><span class="num">${won(tot)}</span></div>
      <button class="btn-line" data-act="toggle" data-k="detail">자세히 ${T.detail ? '▲' : '▼'}</button></div>
    ${T.detail ? `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">${items.map(it => `<div style="padding:8px 0;font-size:16px"><b>${esc(it.name)} × ${it.qty}</b> <span class="num" style="float:right">${won(it.unit * it.qty)}</span><div style="color:var(--sub);font-size:14px">${it.opts.map(esc).join('<br>')}</div></div>`).join('')}</div>` : ''}
  </div></div>

  <div class="card" id="sec-addr"><div class="ch">배달주소 <button class="btn-line" data-act="profile" data-focus="addr">변경</button></div><div class="cb">
    ${p.address ? `<div style="font-size:19px;font-weight:700">${esc(p.address)}</div><div style="color:var(--sub);font-size:16px">${esc(p.detail || '상세주소 없음')}</div>` : `<button class="btn-line dark" data-act="profile" data-focus="addr">📍 배달받을 주소 입력하기</button>`}
    ${areaBad ? `<div class="err">⚠️ ${esc(s.name)}은(는) 이 주소로 배달하지 않아요.</div>` : ''}
    ${errHtml('addr')}
  </div>
    <div class="linkrow" style="display:block"><b>라이더 요청사항</b>
      <select class="sel" id="rider_sel" style="margin-top:6px">${RIDER_REQ.map(r => `<option ${T.rider === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
      ${T.rider === '직접 입력' ? '<input class="inp" id="rider_custom" style="margin-top:8px" placeholder="라이더에게 할 말을 적어요" maxlength="60">' : ''}
    </div>
  </div>

  <div class="card" id="sec-phone"><button class="linkrow" style="border-top:0" data-act="profile" data-focus="phone"><div><b>내 연락처</b>${p.phone ? `<span>${esc(p.name ? p.name + ' · ' : '')}${esc(p.phone)}</span>` : '<span class="ph">이름과 연락처를 입력해 주세요</span>'}</div>${IC.right}</button>${err.sec === 'phone' ? `<div style="padding:0 22px 16px">${errHtml('phone')}</div>` : ''}</div>

  <div class="card"><div class="ch">가게 요청사항</div><div class="cb">
    <select class="sel" id="store_sel">${STORE_REQ.map(r => `<option ${T.storeReq === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    ${T.storeReq === '직접 입력' ? '<input class="inp" id="store_custom" style="margin-top:8px" placeholder="가게 사장님께 할 말을 적어요" maxlength="60">' : ''}
    <label class="cbox"><input type="checkbox" id="no_utensils" ${T.noUtensils ? 'checked' : ''}> 수저·포크 안 받기</label>
  </div></div>

  <div class="card" id="sec-pay"><div class="ch">결제수단</div><div class="cb">
    ${payopt('money', '도움페이머니', '<span class="ic" style="background:#ffd54a">P</span>', true)}
    ${payopt('card', '신용·체크카드', '<span class="ic" style="background:#e8e6ff;color:#5a48f5">💳</span>')}
    ${T.method === 'card' ? (T.useSaved && L.card ? `
      <div class="savedcard"><div class="t"><b>도움반 카드</b><span>${esc(L.card.name || '')} · **** ${esc(L.card.no.slice(-4))}</span></div><div class="bal"><span>잔액</span><b class="num">${card ? won(card.balance) : '확인 불가'}</b></div></div>
      <button class="btn-line" data-act="saved-off">다른 카드 번호 입력하기</button>` : cardForm(force)) : ''}
    ${payopt('easy', '간편결제', '<span class="ic" style="background:#e6f0ff;color:#2c6cf6">⚡</span>', true)}
    ${payopt('etc', '기타 결제수단', '<span class="ic" style="background:#f0f0f0">…</span>', true)}
    ${errHtml('pay')}
  </div></div>

  <div class="card"><div class="ch">할인쿠폰 <span style="font-size:15px;font-weight:500">0개 보유</span></div><div class="cb"><div class="deliv" style="border:1.5px solid #dfe2e6"><span>사용 가능한 쿠폰이 없어요</span>${IC.right}</div></div>
    <div class="linkrow"><b style="margin:0">선물함</b><span>0원</span></div><div class="linkrow"><b style="margin:0">포인트</b><span>0원</span></div></div>
  <div class="card"><div class="linkrow" style="border-top:0"><b style="margin:0">현금영수증</b><span>신청 안함</span></div></div>

  <div class="card"><div class="cb" style="padding-top:20px"><table class="paytable num">
    <tr><td>메뉴금액</td><td>${won(tot)}</td></tr><tr><td>배달팁</td><td>${won(fee)}</td></tr>
    <tr class="total"><td>결제금액</td><td>${won(total)}</td></tr></table></div></div>
  <div class="agree"><div>배달상품 주의사항 동의 <span>›</span></div><div>개인정보 제3자 제공 동의 <span>›</span></div><div>개인정보 처리 위탁 안내 <span>›</span></div>
    <p style="color:var(--faint);font-size:13px;margin:12px 6px 0">위 내용을 확인했으며 결제에 동의합니다. (실습용 앱이라 실제 결제는 되지 않아요)</p></div>
  <div class="actionbar"><button class="btn-mint full num" data-act="pay">${won(total)} 결제하기</button></div>
  </div>`;
}
function cardForm(force) {
  return `<div class="cardform"><h5>카드 정보 입력</h5><p style="margin:0 0 6px;color:var(--sub);font-size:14px">선생님께 받은 카드를 보고 똑같이 입력해요.</p>
    <label class="field"><span>카드 번호 (16자리)</span><div class="cnum">${[1, 2, 3, 4].map(i => `<input class="inp num" id="cn${i}" inputmode="numeric" maxlength="${i === 1 ? 19 : 4}" autocomplete="off" placeholder="0000" aria-label="카드 번호 ${i}번째 칸">`).join('')}</div></label>
    <div class="two"><label class="field"><span>유효기간 (월/년)</span><input class="inp num" id="cexp" inputmode="numeric" maxlength="5" placeholder="MM/YY" autocomplete="off"></label>
    <label class="field"><span>CVC (뒷면 3자리)</span><input class="inp num" id="ccvc" inputmode="numeric" maxlength="3" placeholder="000" autocomplete="off"></label></div>
    <label class="field"><span>카드 비밀번호 앞 2자리</span><input class="inp num" id="cpw" type="password" inputmode="numeric" maxlength="2" placeholder="●●" autocomplete="off" style="max-width:140px"></label>
    ${force ? '' : `<label class="cbox" style="font-size:16px"><input type="checkbox" id="csave" ${T.csave ? 'checked' : ''}> 다음에도 이 카드 쓰기</label>`}
  </div>`;
}

/* 주문 완료 */
function vDone(id) {
  const o = S.orders[id] || (lastOrder && lastOrder.id === id ? lastOrder : null);
  if (!o) return notFound('주문을 찾을 수 없어요');
  const info = {
    '접수': ['📝', '주문이 접수되었어요!', '가게에서 주문을 확인하고 있어요.'],
    '조리 중': ['🍳', '음식을 만들고 있어요', '조금만 기다려 주세요.'],
    '배달 중': ['🛵', '라이더가 배달하고 있어요', '곧 도착해요!'],
    '배달 완료': ['🎉', '배달이 완료되었어요!', '맛있게 드세요.'],
    '취소': ['↩️', '주문이 취소되었어요', '결제한 돈은 카드로 돌려받았어요.'],
  }[o.status] || ['📝', o.status, ''];
  const si = STATUS.indexOf(o.status);
  const c = S.cards[o.cardNo];
  return `<div class="app">
  <header class="topbar"><button class="iconbtn" data-act="go" data-to="home" aria-label="홈으로">${IC.close}</button><h1>주문 상태</h1><span class="iconbtn"></span></header>
  <div class="done-top"><div class="big">${info[0]}</div><h2>${info[1]}</h2><p>${info[2]}</p></div>
  ${o.status !== '취소' ? `<div class="steps">${STATUS.map((x, i) => `<div class="${i <= si ? 'on' : ''}"><i></i>${x}</div>`).join('')}</div>` : ''}
  <div class="card" style="border:1.5px solid var(--line)"><div class="ch">${esc(o.storeName)} <span class="status-pill ${o.status === '취소' ? 's-cancel' : ''}">${esc(o.status)}</span></div><div class="cb">
    <p style="margin:0 0 10px;color:var(--sub);font-size:15px">주문번호 ${esc(o.code)} · ${hhmm(o.createdAt)}</p>
    ${(o.items || []).map(it => `<div style="padding:6px 0;font-size:17px"><b>${esc(it.name)} × ${it.qty}</b><span class="num" style="float:right">${won(it.total)}</span>${(it.opts || []).length ? `<div style="color:var(--sub);font-size:14px">${it.opts.map(esc).join(' / ')}</div>` : ''}</div>`).join('')}
    <table class="paytable num" style="margin-top:10px"><tr><td>메뉴금액</td><td>${won(o.menuTotal)}</td></tr><tr><td>배달팁</td><td>${won(o.fee)}</td></tr><tr class="total"><td>결제금액</td><td>${won(o.total)}</td></tr></table>
    <p style="margin:14px 0 0;font-size:16px">💳 카드(**** ${esc(o.cardLast4)})로 결제 ${c ? `· 남은 잔액 <b class="num">${won(c.balance)}</b>` : ''}</p>
    <p style="margin:6px 0 0;font-size:15px;color:var(--sub)">📍 ${esc(o.address)} ${esc(o.detail || '')}</p>
  </div></div>
  <div style="display:flex;gap:10px;padding:0 16px"><button class="btn-line" style="flex:1;height:56px" data-act="go" data-to="orders">주문내역</button><button class="btn-mint" style="flex:1" data-act="go" data-to="home">홈으로</button></div>
  ${nav('orders')}
  </div>`;
}

/* 주문내역 */
function vOrders() {
  const mine = Object.entries(S.orders).map(([id, o]) => ({ ...o, id })).filter(o => o.deviceId === L.deviceId).sort((a, b) => b.createdAt - a.createdAt);
  return `<div class="app">
  <header class="topbar"><span class="iconbtn"></span><h1>주문내역</h1><span class="iconbtn"></span></header>
  ${mine.length ? `<div class="olist">${mine.map(o => `<button class="ocard" data-act="go" data-to="done/${esc(o.id)}">
      ${logoHtml({ ...(S.stores[o.storeId] || {}), category: o.storeCategory, emoji: o.storeEmoji }, 54)}
      <div class="t"><b>${esc(o.storeName)}</b><span>${esc((o.items || []).map(i => i.name + ' ' + i.qty + '개').join(', '))}</span><br><span class="num">${won(o.total)} · ${new Date(o.createdAt).toLocaleDateString('ko-KR')} ${hhmm(o.createdAt)}</span></div>
      <span class="status-pill ${o.status === '취소' ? 's-cancel' : o.status === '배달 완료' ? 's-done' : ''}">${esc(o.status)}</span></button>`).join('')}</div>`
      : `<div class="empty"><div class="big">🧾</div><b>아직 주문한 적이 없어요</b>먹고 싶은 음식을 주문해 보세요.<br><br><button class="btn-mint" data-act="go" data-to="list/전체">가게 보러가기</button></div>`}
  ${nav('orders')}
  </div>`;
}

/* 찜 */
function vLikes() {
  const arr = storeList().filter(s => L.likes.includes(s.id));
  return `<div class="app"><header class="topbar"><span class="iconbtn"></span><h1>찜</h1><span class="iconbtn"></span></header>
  ${arr.length ? arr.map(storeCard).join('') : '<div class="empty"><div class="big">💗</div><b>찜한 가게가 없어요</b>가게 화면에서 하트를 누르면 여기에 모여요.</div>'}
  ${nav('likes')}</div>`;
}

/* 마이 */
function vMy() {
  const p = L.profile; const c = L.card && S.cards[L.card.no];
  return `<div class="app">
  <header class="topbar"><span class="iconbtn"></span><h1>마이</h1><span class="iconbtn"></span></header>
  <div class="mybox"><h3>${esc(p.name || '이름을 입력해 주세요')}</h3><div style="color:#3b3a7a">${esc(p.phone || '연락처 없음')}</div><div style="margin-top:6px">📍 ${esc(p.address ? p.address + ' ' + (p.detail || '') : '주소 없음')}</div>
    <button class="btn-line" style="margin-top:12px" data-act="profile">내 정보 바꾸기</button></div>
  <h3 class="sec-title" style="padding-top:8px">내 카드</h3>
  <div style="padding:0 16px">${L.card ? `<div class="savedcard"><div class="t"><b>도움반 카드</b><span>${esc(L.card.name || '')} · **** ${esc(L.card.no.slice(-4))}</span></div><div class="bal"><span>잔액</span><b class="num">${c ? won(c.balance) : '확인 불가'}</b></div></div>
    <button class="btn-line red" data-act="card-forget">이 기기에서 카드 지우기</button>`
      : `<p style="color:var(--sub);margin:0 0 8px">저장한 카드가 없어요. 카드 번호를 넣으면 잔액을 볼 수 있어요.</p>
    <form data-form="balance" style="display:flex;gap:8px"><input class="inp num" id="bal_no" inputmode="numeric" placeholder="카드 번호 16자리" maxlength="19" autocomplete="off"><button class="btn-line dark" style="height:auto">잔액 보기</button></form>`}</div>
  <h3 class="sec-title">더보기</h3>
  <div class="mylist"><button data-act="go" data-to="orders">주문내역 <small>›</small></button><button data-act="go" data-to="likes">찜한 가게 <small>›</small></button><button data-act="cart-clear">장바구니 비우기 <small>›</small></button></div>
  <button class="teacher-link" data-act="go" data-to="t/orders">선생님 화면</button>
  ${nav('my')}
  </div>`;
}

function notFound(msg) {
  return `<div class="app"><div class="empty"><div class="big">🤔</div><b>${esc(msg)}</b>선생님이 내용을 바꿨을 수 있어요.<br><br><button class="btn-mint" data-act="go" data-to="home">홈으로</button></div></div>`;
}

/* ---------- 모달 / 토스트 ---------- */
function modal(html) {
  closeModal();
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  w.addEventListener('click', e => { if (e.target === w) closeModal(); });
  document.body.appendChild(w);
  return w;
}
function closeModal() { $$('.modal-wrap').forEach(m => m.remove()); }
function ask(title, msg, ok = '확인', cancel = '취소') {
  return new Promise(res => {
    const w = modal(`<h3>${title}</h3><p>${msg}</p><div class="btns"><button class="btn-gray" data-r="0">${cancel}</button><button class="btn-mint" data-r="1">${ok}</button></div>`);
    w.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { closeModal(); res(b.dataset.r === '1'); }));
  });
}
function info(title, msg, btn = '확인') {
  return new Promise(res => {
    const w = modal(`<h3>${title}</h3><p>${msg}</p><div class="btns"><button class="btn-mint" data-r="1">${btn}</button></div>`);
    w.querySelector('[data-r]').addEventListener('click', () => { closeModal(); res(true); });
  });
}
let toastTimer;
function toast(msg, ms = 2200) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), ms);
}
function profileModal(focus) {
  const p = L.profile;
  modal(`<h3>내 정보 입력</h3><p style="color:var(--sub);font-size:15px">음식을 받을 주소와 연락처를 적어 주세요.</p>
    <label class="field"><span>이름</span><input class="inp" id="pf_name" value="${esc(p.name)}" placeholder="예) 김도움" autocomplete="off"></label>
    <label class="field"><span>주소 (동 이름을 꼭 넣어요)</span><input class="inp" id="pf_addr" value="${esc(p.address)}" placeholder="예) 창원시 마산회원구 양덕동 123-4" autocomplete="off"></label>
    <label class="field"><span>상세주소</span><input class="inp" id="pf_detail" value="${esc(p.detail)}" placeholder="예) 도움아파트 101동 1001호" autocomplete="off"></label>
    <label class="field"><span>연락처</span><input class="inp num" id="pf_phone" value="${esc(p.phone)}" inputmode="numeric" placeholder="010-0000-0000" autocomplete="off"></label>
    <div class="err" id="pf_err"></div>
    <div class="btns"><button class="btn-gray" data-act="close">취소</button><button class="btn-mint" data-act="pf-save">저장하기</button></div>`);
  const f = { addr: 'pf_addr', phone: 'pf_phone', name: 'pf_name' }[focus];
  setTimeout(() => { const el = document.getElementById(f || (p.name ? 'pf_addr' : 'pf_name')); if (el) el.focus(); }, 60);
}

/* ---------- 장바구니 동작 ---------- */
async function addToCart(sid, m, sel, qty) {
  const s = S.stores[sid];
  const groups = opts(m);
  const optText = []; let unit = toNum(m.price);
  groups.forEach((g, gi) => {
    const picked = (sel[gi] || []).map(ci => g.choices[ci]).filter(Boolean);
    if (picked.length) optText.push(`${g.name} : ${picked.map(c => c.name).join(', ')}`);
    picked.forEach(c => { unit += toNum(c.price); });
  });
  if (L.cart.storeId && L.cart.storeId !== sid && L.cart.items.length) {
    const prev = S.stores[L.cart.storeId];
    const ok = await ask('장바구니에는 한 가게 메뉴만 담을 수 있어요', `${esc(prev ? prev.name : '다른 가게')} 메뉴를 지우고<br><b>${esc(s.name)}</b> 메뉴를 담을까요?`, '지우고 담기');
    if (!ok) return false;
    L.cart = { storeId: null, items: [] };
  }
  L.cart.storeId = sid;
  const same = L.cart.items.find(i => i.menuId === m.id && i.opts.join('|') === optText.join('|'));
  if (same) same.qty += qty;
  else L.cart.items.push({ menuId: m.id, name: m.name, base: toNum(m.price), unit, qty, opts: optText });
  saveL('cart');
  return true;
}

/* ---------- 결제 ---------- */
function failAt(sec, msg) {
  T.err = { sec, msg };
  toast(msg, 3000);
  render(true);
  const el = document.getElementById('sec-' + sec);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}
async function pay() {
  if (T.paying) return;
  const s = S.stores[L.cart.storeId]; const items = L.cart.items;
  if (!s || !items.length) return;
  const p = L.profile;
  T.err = null;
  if (!p.address) return failAt('addr', '배달받을 주소를 입력해 주세요.');
  if (!areaMatch(s)) return failAt('addr', `${s.name}은(는) 이 주소로 배달하지 않아요. 주소를 다시 확인해 주세요.`);
  if (!p.name || digits(p.phone).length < 9) return failAt('phone', '이름과 연락처를 입력해 주세요.');
  if (s.open === false) return info('주문할 수 없어요', '지금은 가게가 준비 중이에요.');
  const tot = cartTotal(); const fee = feeFor(s, tot); const total = tot + fee;
  if (tot < toNum(s.minOrder)) return info('최소주문금액이 모자라요', `${won(toNum(s.minOrder) - tot)} 더 담아야 주문할 수 있어요.`);
  if (T.method !== 'card') return failAt('pay', '결제수단에서 ‘신용·체크카드’를 골라 주세요.');
  let cin;
  if (T.useSaved && L.card && !S.settings.forceCardInput) cin = { ...L.card };
  else {
    cin = { no: digits([1, 2, 3, 4].map(i => ($('#cn' + i) || {}).value || '').join('')), exp: digits(($('#cexp') || {}).value), cvc: digits(($('#ccvc') || {}).value), pw: digits(($('#cpw') || {}).value) };
    if (cin.no.length !== 16) return failAt('pay', '카드 번호 16자리를 모두 입력해 주세요.');
    if (cin.exp.length !== 4) return failAt('pay', '유효기간 4자리(월 2자리, 년 2자리)를 입력해 주세요.');
    if (cin.cvc.length !== 3) return failAt('pay', '카드 뒷면의 CVC 3자리를 입력해 주세요.');
    if (cin.pw.length !== 2) return failAt('pay', '카드 비밀번호 앞 2자리를 입력해 주세요.');
  }
  const c = S.cards[cin.no];
  if (!c) return failAt('pay', '등록되지 않은 카드예요. 카드 번호를 다시 확인해 주세요.');
  if (digits(c.exp) !== cin.exp) return failAt('pay', '유효기간이 맞지 않아요. 카드 앞면을 다시 확인해 주세요.');
  if (String(c.cvc) !== cin.cvc) return failAt('pay', 'CVC 번호가 맞지 않아요. 카드 뒷면을 다시 확인해 주세요.');
  if (String(c.pw) !== cin.pw) return failAt('pay', '카드 비밀번호가 맞지 않아요.');
  if (c.disabled) return failAt('pay', '이 카드는 지금 쓸 수 없어요. 선생님께 물어보세요.');
  if ((Number(c.balance) || 0) < total) return insufficient(c.balance, total);

  T.paying = true;
  const w = modal('<div style="text-align:center;padding:20px 0"><div style="font-size:54px">💳</div><h3>결제하는 중이에요…</h3><p>잠시만 기다려 주세요.</p></div>');
  w.onclick = null;
  try {
    const r = await DB.addBalance(cin.no, -total);
    if (!r.ok) { closeModal(); T.paying = false; return r.reason === 'balance' ? insufficient(r.balance, total) : failAt('pay', '카드를 찾을 수 없어요.'); }
    const id = DB.newId('orders');
    const order = {
      id, code: Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: Date.now(), deviceId: L.deviceId,
      studentName: p.name, phone: p.phone, address: p.address, detail: p.detail || '',
      storeId: L.cart.storeId, storeName: s.name, storeCategory: s.category || '', storeEmoji: storeEmo(s),
      items: items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, total: i.unit * i.qty, opts: i.opts })),
      menuTotal: tot, fee, total, cardNo: cin.no, cardLast4: cin.no.slice(-4), cardOwner: c.name || '',
      riderReq: T.rider === '직접 입력' ? ((($('#rider_custom') || {}).value || '').trim() || '없음') : T.rider,
      storeReq: T.storeReq === '직접 입력' ? ((($('#store_custom') || {}).value || '').trim() || '없음') : T.storeReq,
      noUtensils: !!T.noUtensils, status: '접수',
    };
    try { await DB.set('orders/' + id, order); }
    catch (e) { await DB.addBalance(cin.no, total); throw e; }
    const usedSaved = T.useSaved && L.card && !S.settings.forceCardInput;
    if (!usedSaved && !S.settings.forceCardInput && $('#csave') && $('#csave').checked) {
      L.card = { no: cin.no, exp: cin.exp, cvc: cin.cvc, pw: cin.pw, name: c.name || '' }; saveL('card');
    }
    lastOrder = order;
    L.cart = { storeId: null, items: [] }; saveL('cart');
    closeModal();
    replaceTo('done/' + id);
  } catch (e) {
    console.error(e); closeModal(); T.paying = false;
    info('결제하지 못했어요', '인터넷 연결을 확인하고 다시 눌러 주세요.<br><small>' + esc(e.message || e) + '</small>');
  }
}
function insufficient(bal, total) {
  const w = modal(`<div style="text-align:center;font-size:54px">😥</div><h3 style="text-align:center">카드 잔액이 모자라요</h3>
    <table class="paytable num" style="margin-top:10px"><tr><td>카드 잔액</td><td>${won(bal)}</td></tr><tr><td>결제할 금액</td><td>${won(total)}</td></tr><tr class="total"><td>모자란 돈</td><td style="color:var(--red)">${won(total - bal)}</td></tr></table>
    <p style="margin-top:14px">장바구니에서 메뉴를 빼거나 수량을 줄여 보세요.</p>
    <div class="btns"><button class="btn-gray" data-act="close">닫기</button><button class="btn-mint" data-act="close-go" data-to="cart">장바구니로 가기</button></div>`);
  return false;
}

/* =========================================================
   선생님 화면
   ========================================================= */
const teacherOk = () => SS.get('doum_t') === '1';
function connBadge() {
  if (DB.mode === 'local') return `<span class="conn" id="conn" title="다른 기기와 공유하려면 설정에서 실시간 연결을 해 주세요"><i></i>이 기기에만 저장 중</span>`;
  return DB.connected === false ? `<span class="conn bad" id="conn"><i></i>연결 끊김 · 다시 연결하는 중</span>` : `<span class="conn ok" id="conn"><i></i>실시간 연결됨 · 반 코드 ${esc(DB.code)}</span>`;
}
function tHead(tab) {
  const active = Object.values(S.orders).filter(o => !['배달 완료', '취소'].includes(o.status)).length;
  const b = (k, label, extra = '') => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-to="t/${k}">${label}${extra}</button>`;
  return `<header class="thead"><div class="brand">🛵 도움반의 배달 <em>선생님</em></div>
  <nav class="tnav">${b('orders', '주문 현황', active ? ` <span class="n">${active}</span>` : '')}${b('stores', '가게·메뉴')}${b('cards', '카드')}${b('settings', '설정')}<button data-act="go" data-to="home">📱 학생 화면</button></nav>
  ${connBadge()}</header>`;
}
function tPage(tab, inner) {
  if (!teacherOk()) return vPin();
  return `<div class="tapp">${tHead(tab)}${inner}</div>`;
}
function vPin() {
  return `<div class="tapp"><div class="pin"><div style="font-size:48px">🔒</div><h2>선생님 화면</h2><p style="color:var(--sub);margin:0">선생님 비밀번호를 입력해 주세요.<br><small>처음 비밀번호는 1234예요.</small></p>
  <form data-form="pin"><input class="inp num" id="autofocus" type="password" inputmode="numeric" autocomplete="off" aria-label="비밀번호"><div class="err" id="pin_err"></div><button class="btn-mint full" style="margin-top:8px">들어가기</button></form>
  <button class="teacher-link" data-act="go" data-to="home">학생 화면으로 돌아가기</button></div></div>`;
}

/* 주문 현황 */
function vTOrders() {
  const f = T.filter || 'active';
  const all = Object.entries(S.orders).map(([id, o]) => ({ ...o, id }));
  const today = all.filter(o => isToday(o.createdAt));
  const activeArr = all.filter(o => !['배달 완료', '취소'].includes(o.status));
  let arr = f === 'active' ? activeArr.sort((a, b) => a.createdAt - b.createdAt)
    : all.filter(o => f === 'all' || (f === 'done' ? o.status === '배달 완료' : o.status === '취소')).sort((a, b) => b.createdAt - a.createdAt);
  const chip = (k, label) => `<button class="chip ${f === k ? 'on' : ''}" data-act="t-filter" data-k="${k}">${label}</button>`;
  const sound = LS.get('doum_sound', true);
  return tPage('orders', `
  <div class="stat"><div><b class="num">${activeArr.length}</b><span>처리할 주문</span></div><div><b class="num">${today.length}</b><span>오늘 주문</span></div><div><b class="num">${won(today.filter(o => o.status !== '취소').reduce((a, o) => a + (o.total || 0), 0))}</b><span>오늘 결제 금액</span></div></div>
  <div class="tpanel" style="padding:14px 16px"><div class="tbar">${chip('active', '진행 중')}${chip('done', '배달 완료')}${chip('cancel', '취소')}${chip('all', '전체')}<span class="sp"></span>
    <button class="btn-line" data-act="t-sound">${sound ? '🔔 알림음 켜짐' : '🔕 알림음 꺼짐'}</button>
    <button class="btn-line" data-act="t-clear-done">끝난 주문 지우기</button><button class="btn-line red" data-act="t-clear-all">모든 주문 지우기</button></div></div>
  ${arr.length ? `<div class="ogrid">${arr.map(tOrderCard).join('')}</div>` : `<div class="tpanel"><div class="empty" style="padding:40px"><div class="big">🧾</div><b>${f === 'active' ? '지금 처리할 주문이 없어요' : '주문이 없어요'}</b>학생이 주문하면 여기에 바로 나타나고 알림음이 울려요.</div></div>`}`);
}
function tOrderCard(o) {
  const isNew = fresh.has(o.id) && Date.now() - fresh.get(o.id) < 20000;
  const next = STATUS[STATUS.indexOf(o.status) + 1];
  const finished = ['배달 완료', '취소'].includes(o.status);
  const reqs = [o.storeReq && o.storeReq !== '요청사항 없음' ? '가게: ' + o.storeReq : '', o.riderReq ? '라이더: ' + o.riderReq : '', o.noUtensils ? '수저·포크 안 받음' : '수저·포크 받음'].filter(Boolean);
  return `<article class="tord ${isNew ? 'new' : ''} ${o.status === '취소' ? 'st-cancel' : o.status === '배달 완료' ? 'st-done' : ''}">
    <div class="who"><div><b>${esc(o.studentName || '이름 없음')}</b><small>${hhmm(o.createdAt)} · ${timeAgo(o.createdAt)} · 주문번호 ${esc(o.code || '')}</small></div><span class="status-pill ${o.status === '취소' ? 's-cancel' : o.status === '배달 완료' ? 's-done' : ''}">${esc(o.status)}</span></div>
    <div class="store">${esc(o.storeEmoji || '🍽️')} ${esc(o.storeName)}</div>
    <ul>${(o.items || []).map(i => `<li><span class="q">×${i.qty}</span>${esc(i.name)}${(i.opts || []).length ? `<small>${i.opts.map(esc).join(' / ')}</small>` : ''}</li>`).join('')}</ul>
    <div class="req">${reqs.map(esc).join('<br>')}</div>
    <div class="meta">📍 ${esc(o.address)} ${esc(o.detail || '')}<br>📞 ${esc(o.phone || '-')}<br>💳 ${esc(o.cardOwner || '')} 카드 (**** ${esc(o.cardLast4 || '')})</div>
    <div class="total"><span>결제금액</span><span class="num">${won(o.total)}</span></div>
    <div class="acts">${next && o.status !== '취소' ? `<button class="btn-mint" data-act="t-status" data-id="${esc(o.id)}" data-s="${esc(next)}">${esc(NEXT_LABEL[o.status] || next)} →</button>` : ''}
      ${!finished ? `<button class="btn-line red" data-act="t-cancel" data-id="${esc(o.id)}">취소·환불</button>` : `<button class="btn-line" style="flex:1" data-act="t-odel" data-id="${esc(o.id)}">지우기</button>`}</div>
  </article>`;
}

/* 가게 목록 관리 */
function vTStores() {
  const arr = storeList();
  return tPage('stores', `<div class="tpanel"><div class="tbar"><div><h2>가게·메뉴</h2><p class="hint" style="margin:0">처음에는 가게 몇 개로 연습하고, 익숙해지면 가게와 메뉴를 늘려 보세요.</p></div><span class="sp"></span>
    <button class="btn-line" data-act="t-sample">예시 가게 불러오기</button><button class="btn-mint" style="min-height:46px;font-size:16px" data-act="go" data-to="t/store/new">＋ 가게 추가</button></div></div>
  ${arr.length ? `<div class="tgrid2">${arr.map((s, i) => { const ms = menuList(s); const aw = areaWords(s); return `<div class="tstore">
    <div class="top">${logoHtml(s, 56)}<div class="t"><b>${esc(s.name)}</b><span>${esc(s.category || '종류 없음')} · 메뉴 ${ms.length}개</span></div></div>
    <div class="tags"><span class="tag ${s.open === false ? 'off' : 'on'}">${s.open === false ? '준비 중' : '영업 중'}</span><span class="tag">최소 ${won(s.minOrder)}</span><span class="tag">배달팁 ${won(s.fee)}</span><span class="tag">📍 ${aw.length ? esc(aw.join(', ')) : '모든 지역'}</span></div>
    <div class="tbar"><button class="btn-line dark" data-act="go" data-to="t/store/${esc(s.id)}">가게·메뉴 수정</button><button class="btn-line" data-act="t-open" data-id="${esc(s.id)}">${s.open === false ? '영업 시작' : '준비 중으로'}</button>
      <button class="btn-line" data-act="t-smove" data-id="${esc(s.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="앞으로">↑</button><button class="btn-line" data-act="t-smove" data-id="${esc(s.id)}" data-d="1" ${i === arr.length - 1 ? 'disabled' : ''} aria-label="뒤로">↓</button>
      <button class="btn-line red" data-act="t-sdel" data-id="${esc(s.id)}">삭제</button></div>
  </div>`; }).join('')}</div>`
      : `<div class="tpanel"><div class="empty" style="padding:40px"><div class="big">🏪</div><b>아직 가게가 없어요</b>‘가게 추가’로 직접 만들거나 ‘예시 가게 불러오기’로 시작해 보세요.</div></div>`}`);
}

/* 가게 수정 */
function vTStore(id) {
  const isNew = id === 'new';
  const s = isNew ? { open: true, category: '패스트푸드', rating: '5.0', reviews: 0, minOrder: 12000, fee: 2000, time: '20~30분' } : S.stores[id];
  if (!s) return tPage('stores', '<div class="tpanel"><div class="empty"><b>가게를 찾을 수 없어요</b></div></div>');
  if (!T.img) T.img = { logo: s.logo || '', banner: s.banner || '' };
  const ms = isNew ? [] : menuList({ ...s, id });
  const fld = (label, inner, wide) => `<label class="field ${wide ? 'wide' : ''}"><span>${label}</span>${inner}</label>`;
  const inp = (fid, val, ph = '', type = 'text', extra = '') => `<input class="inp" id="${fid}" type="${type}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  return tPage('stores', `
  <div class="tpanel"><div class="tbar"><button class="btn-line" data-act="go" data-to="t/stores">← 가게 목록</button><span class="sp"></span></div>
  <h2 style="margin-top:14px">${isNew ? '새 가게 만들기' : esc(s.name) + ' 수정'}</h2>
  <div class="tform">
    ${fld('가게 이름 <b>*</b>', inp('s_name', s.name, '예) 도움버거 양덕점'))}
    ${fld('음식 종류', `<select class="sel" id="s_category">${CATS.map(c => `<option ${s.category === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`)}
    ${fld('그림 글자(사진 없을 때 보여요)', inp('s_emoji', s.emoji, catEmo(s.category) + ' (비워 두면 자동)'))}
    ${fld('영업 상태', `<label class="cbox" style="margin-top:4px"><input type="checkbox" id="s_open" ${s.open !== false ? 'checked' : ''}> 영업 중 (끄면 학생이 주문할 수 없어요)</label>`)}
    ${fld('가게 로고', imgPick('logo', T.img.logo, 'round', storeEmo(s)), false)}
    ${fld('가게 대표 사진 (가게 화면 위쪽)', imgPick('banner', T.img.banner, 'wide', storeEmo(s)), false)}
    ${fld('최소주문금액 (원)', inp('s_min', s.minOrder, '12000', 'text', 'inputmode="numeric"'))}
    ${fld('배달팁 (원)', inp('s_fee', s.fee, '2000', 'text', 'inputmode="numeric"'))}
    ${fld('무료배달 기준 (원, 0이면 없음)', inp('s_free', s.freeOver || 0, '예) 25000', 'text', 'inputmode="numeric"'))}
    ${fld('배달 시간', inp('s_time', s.time, '예) 20~30분'))}
    ${fld('거리', inp('s_dist', s.distance, '예) 1.2km'))}
    ${fld('별점 / 리뷰 수', `<div class="two">${inp('s_rating', s.rating, '4.8')}${inp('s_reviews', s.reviews, '62', 'text', 'inputmode="numeric"')}</div>`)}
    ${fld('배달 가능 지역 — 학생 주소에 이 낱말이 들어 있으면 가게가 보여요. 쉼표로 여러 개, 비워 두면 모든 학생에게 보여요.', inp('s_areas', s.areas, '예) 양덕동, 합성동, 석전동'), true)}
    ${fld('메뉴 분류 (가게 화면의 메뉴 묶음 순서, 쉼표로 구분)', inp('s_groups', s.groups, '예) 세트, 버거, 디저트, 음료'), true)}
    ${fld('가게 안내문', `<textarea class="inp" id="s_notice" placeholder="예) 배달 제품 가격은 매장 가격과 다를 수 있어요.">${esc(s.notice || '')}</textarea>`, true)}
  </div>
  <div class="tbar" style="margin-top:16px"><button class="btn-mint" style="min-height:50px;font-size:17px" data-act="t-ssave" data-id="${esc(id)}">${isNew ? '가게 만들기' : '가게 정보 저장'}</button></div>
  </div>
  ${isNew ? '<div class="tpanel"><p class="hint" style="margin:0">가게를 먼저 만들면 메뉴를 넣을 수 있어요.</p></div>' : `
  <div class="tpanel"><div class="tbar"><h2>메뉴 (${ms.length}개)</h2><span class="sp"></span><button class="btn-mint" style="min-height:46px;font-size:16px" data-act="go" data-to="t/menu/${esc(id)}/new">＋ 메뉴 추가</button></div>
  ${ms.length ? ms.map((m, i) => `<div class="tmenu"><div class="mini" style="background:${pastel(m.name)}">${m.image ? `<img src="${esc(m.image)}" alt="">` : esc(menuEmo(m, s))}</div>
    <div class="t"><b>${esc(m.name)} ${m.popular ? '<span class="tag on">인기</span>' : ''} ${m.soldOut ? '<span class="tag off">품절</span>' : ''}</b><span class="num">${won(m.price)} · ${esc(m.group || '메뉴')} · 선택사항 ${opts(m).length}개</span></div>
    <div class="b"><button class="btn-line dark" data-act="go" data-to="t/menu/${esc(id)}/${esc(m.id)}">수정</button><button class="btn-line" data-act="t-mcopy" data-sid="${esc(id)}" data-mid="${esc(m.id)}">복사</button>
    <button class="btn-line" data-act="t-mmove" data-sid="${esc(id)}" data-mid="${esc(m.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="위로">↑</button><button class="btn-line" data-act="t-mmove" data-sid="${esc(id)}" data-mid="${esc(m.id)}" data-d="1" ${i === ms.length - 1 ? 'disabled' : ''} aria-label="아래로">↓</button>
    <button class="btn-line red" data-act="t-mdel" data-sid="${esc(id)}" data-mid="${esc(m.id)}">삭제</button></div></div>`).join('') : '<p class="hint">아직 메뉴가 없어요. ‘메뉴 추가’를 눌러 주세요.</p>'}
  </div>`}`);
}
function imgPick(key, src, shape, emo) {
  return `<div class="imgpick"><div class="prev ${shape}" id="prev_${key}">${src ? `<img src="${esc(src)}" alt="">` : esc(emo)}</div>
    <div style="display:flex;flex-direction:column;gap:6px"><label class="btn-line">사진 고르기<input type="file" accept="image/*" data-img="${key}"></label>${src ? `<button class="btn-line red" data-act="t-imgdel" data-k="${key}">사진 빼기</button>` : ''}</div></div>`;
}

/* 메뉴 수정 */
const OPT_PRESETS = {
  '음료 선택': { name: '음료 선택', required: true, max: 1, choices: [{ name: '콜라', price: 0 }, { name: '사이다', price: 0 }, { name: '제로콜라', price: 0 }, { name: '콜라 큰 컵', price: 500 }] },
  '맵기 선택': { name: '맵기 선택', required: true, max: 1, choices: [{ name: '순한맛', price: 0 }, { name: '보통맛', price: 0 }, { name: '매운맛', price: 0 }] },
  '양 선택': { name: '양 선택', required: true, max: 1, choices: [{ name: '보통', price: 0 }, { name: '곱빼기', price: 1000 }] },
  '추가 토핑': { name: '추가 선택', required: false, max: 3, choices: [{ name: '치즈 추가', price: 1000 }, { name: '계란 추가', price: 500 }, { name: '소스 추가', price: 500 }] },
};
function vTMenu(sid, mid) {
  const s = S.stores[sid]; if (!s) return tPage('stores', '<div class="tpanel"><b>가게를 찾을 수 없어요</b></div>');
  const isNew = mid === 'new';
  const m = isNew ? { name: '', price: '', group: '', options: [] } : findMenu(s, mid);
  if (!m) return tPage('stores', '<div class="tpanel"><b>메뉴를 찾을 수 없어요</b></div>');
  if (!T.img) T.img = { image: m.image || '' };
  if (!T.opts) T.opts = opts(m).map(g => ({ name: g.name || '', required: !!g.required, max: Number(g.max) || 1, text: g.choices.map(c => `${c.name} ${toNum(c.price)}`).join('\n') }));
  const groups = groupNames(s, menuList(s)).concat(String(s.groups || '').split(/[,，]/).map(t => t.trim()).filter(Boolean));
  return tPage('stores', `<div class="tpanel">
  <div class="tbar"><button class="btn-line" data-act="go" data-to="t/store/${esc(sid)}">← ${esc(s.name)}</button></div>
  <h2 style="margin-top:14px">${isNew ? '새 메뉴' : esc(m.name) + ' 수정'}</h2>
  <div class="tform">
    <label class="field"><span>메뉴 이름 <b>*</b></span><input class="inp" id="m_name" value="${esc(m.name)}" placeholder="예) 불고기버거 세트" autocomplete="off"></label>
    <label class="field"><span>가격 (원) <b>*</b></span><input class="inp" id="m_price" value="${esc(m.price)}" inputmode="numeric" placeholder="8900" autocomplete="off"></label>
    <label class="field"><span>메뉴 분류</span><input class="inp" id="m_group" value="${esc(m.group || '')}" list="grouplist" placeholder="예) 세트" autocomplete="off"><datalist id="grouplist">${[...new Set(groups)].map(g => `<option value="${esc(g)}">`).join('')}</datalist></label>
    <label class="field"><span>그림 글자(사진 없을 때)</span><input class="inp" id="m_emoji" value="${esc(m.emoji || '')}" placeholder="${esc(storeEmo(s))}" autocomplete="off"></label>
    <label class="field wide"><span>메뉴 설명</span><textarea class="inp" id="m_desc" placeholder="예) 두툼한 고기와 달콤한 소스가 어울리는 대표 버거">${esc(m.desc || '')}</textarea></label>
    <label class="field"><span>메뉴 사진</span>${imgPick('image', T.img.image, '', menuEmo(m, s))}</label>
    <div class="field"><span>표시</span><label class="cbox"><input type="checkbox" id="m_popular" ${m.popular ? 'checked' : ''}> 인기 메뉴 (가게 화면 맨 위)</label><label class="cbox"><input type="checkbox" id="m_sold" ${m.soldOut ? 'checked' : ''}> 품절</label></div>
  </div>
  <h3>선택사항 (세트 음료·맵기·추가 토핑 등)</h3>
  <p class="hint">한 줄에 하나씩 <code class="k">이름 가격</code>으로 적어요. 예) <code class="k">콜라 0</code> <code class="k">치즈 추가 1000</code> — 가격을 안 쓰면 0원이에요.</p>
  <div id="optwrap">${T.opts.map((g, i) => `<div class="optedit">
    <div class="r"><input class="inp" id="og_name_${i}" value="${esc(g.name)}" placeholder="그룹 이름 (예: 음료 선택)" autocomplete="off">
      <label class="mini"><input type="checkbox" id="og_req_${i}" ${g.required ? 'checked' : ''}> 필수</label>
      <label class="mini">최대 <input class="inp n" id="og_max_${i}" value="${esc(g.max)}" inputmode="numeric"> 개</label>
      <button class="btn-line red" data-act="t-ogdel" data-i="${i}">그룹 삭제</button></div>
    <textarea class="inp" id="og_text_${i}" style="margin-top:8px;min-height:110px" placeholder="콜라 0&#10;사이다 0&#10;콜라 큰 컵 500">${esc(g.text)}</textarea>
  </div>`).join('')}</div>
  <div class="tbar" style="margin-top:12px"><button class="btn-line dark" data-act="t-ogadd">＋ 빈 그룹 추가</button>${Object.keys(OPT_PRESETS).map(k => `<button class="btn-line" data-act="t-ogpreset" data-k="${esc(k)}">＋ ${esc(k)} 예시</button>`).join('')}</div>
  <div class="tbar" style="margin-top:20px"><button class="btn-mint" style="min-height:50px;font-size:17px" data-act="t-msave" data-sid="${esc(sid)}" data-mid="${esc(mid)}">메뉴 저장</button><button class="btn-line" data-act="go" data-to="t/store/${esc(sid)}">취소</button></div>
  </div>`);
}
function readOptsFromDom() {
  if (!T.opts) return;
  T.opts = T.opts.map((g, i) => ({
    name: ($('#og_name_' + i) || {}).value ?? g.name,
    required: $('#og_req_' + i) ? $('#og_req_' + i).checked : g.required,
    max: toNum(($('#og_max_' + i) || {}).value) || 1,
    text: ($('#og_text_' + i) || {}).value ?? g.text,
  }));
}
function parseChoices(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const mm = l.match(/^(.*?)[\s:]+\+?(-?[\d,]+)\s*원?$/);
    return mm && mm[1].trim() ? { name: mm[1].trim(), price: toNum(mm[2]) } : { name: l, price: 0 };
  });
}

/* 카드 관리 */
function vTCards() {
  const arr = Object.entries(S.cards).map(([no, c]) => ({ ...c, no })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const usedBy = {}; Object.values(S.orders).forEach(o => { if (o.status !== '취소') usedBy[o.cardNo] = (usedBy[o.cardNo] || 0) + 1; });
  const quick = target => `<div class="quick">${[10000, 20000, 30000, 50000].map(v => `<button data-act="t-quick" data-t="${target}" data-v="${v}">${v / 10000}만원</button>`).join('')}</div>`;
  return tPage('cards', `
  <div class="tpanel"><h2>가상 카드 만들기</h2><p class="hint">카드마다 금액을 넣어 주면 학생은 그 금액 안에서만 주문할 수 있어요. 카드는 인쇄해서 코팅해 나눠 주세요.</p>
    <div class="tform">
      <label class="field"><span>학생 이름</span><input class="inp" id="c_name" placeholder="예) 김도움" autocomplete="off"></label>
      <label class="field"><span>넣어 줄 금액 (원)</span><input class="inp num" id="c_amt" value="30000" inputmode="numeric" autocomplete="off">${quick('c_amt')}</label>
      <label class="field wide"><span>여러 명 한 번에 만들기 (한 줄에 한 명씩, 쓰면 위 이름 대신 사용해요)</span><textarea class="inp" id="c_names" placeholder="김도움&#10;이사랑&#10;박희망"></textarea></label>
    </div>
    <div class="tbar" style="margin-top:12px"><button class="btn-mint" style="min-height:50px;font-size:17px" data-act="t-cnew">카드 만들기</button></div>
  </div>
  <div class="tpanel"><div class="tbar"><h2>카드 ${arr.length}장</h2><span class="sp"></span>
    <label class="cbox" style="font-size:15px;margin:0"><input type="checkbox" id="c_printpw"> 인쇄할 때 비밀번호도 넣기</label>
    <button class="btn-line" data-act="t-cprint" data-all="0">선택한 카드 인쇄</button><button class="btn-line" data-act="t-cprint" data-all="1">모든 카드 인쇄</button>
    <button class="btn-line red" data-act="t-creset-all">모든 카드 처음 금액으로</button></div>
  ${arr.length ? `<div class="tcards"><table><thead><tr><th><input type="checkbox" id="c_selall" aria-label="모두 선택"></th><th>학생</th><th>카드 번호</th><th>유효기간</th><th>CVC</th><th>비밀번호</th><th>넣어 준 금액</th><th>잔액</th><th>관리</th></tr></thead><tbody>
    ${arr.map(c => { const amt = Number(c.amount) || 0, bal = Number(c.balance) || 0; const pct = amt ? Math.max(0, Math.min(100, bal / amt * 100)) : 0; return `<tr${c.disabled ? ' style="opacity:.55"' : ''}>
      <td><input type="checkbox" class="csel" id="csel_${esc(c.no)}" data-no="${esc(c.no)}" aria-label="${esc(c.name)} 선택"></td>
      <td><b>${esc(c.name || '-')}</b>${c.disabled ? '<br><span class="tag off">잠김</span>' : ''}<br><small style="color:var(--sub)">주문 ${usedBy[c.no] || 0}건</small></td>
      <td class="cn">${fmtCard(c.no)}</td><td class="cn">${esc(c.exp)}</td><td class="cn">${esc(c.cvc)}</td><td class="cn">${esc(c.pw)}</td>
      <td class="num">${won(amt)}</td>
      <td><div class="bal num" style="color:${bal <= 0 ? 'var(--red)' : 'inherit'}">${won(bal)}</div><div class="bar"><i style="width:${pct}%"></i></div></td>
      <td><div class="act"><input class="inp num" id="cx_${esc(c.no)}" inputmode="numeric" placeholder="금액" autocomplete="off">
        <button class="btn-line" data-act="t-ccharge" data-no="${esc(c.no)}">충전</button><button class="btn-line" data-act="t-cset" data-no="${esc(c.no)}">금액 바꾸기</button>
        <button class="btn-line dark" data-act="t-creset" data-no="${esc(c.no)}">리셋</button><button class="btn-line" data-act="t-clock" data-no="${esc(c.no)}">${c.disabled ? '잠금 풀기' : '잠그기'}</button><button class="btn-line red" data-act="t-cdel" data-no="${esc(c.no)}">삭제</button></div></td>
    </tr>`; }).join('')}</tbody></table></div>
    <p class="hint" style="margin-top:12px">충전: 잔액과 넣어 준 금액에 더해요 · 금액 바꾸기: 넣어 준 금액과 잔액을 새 금액으로 · 리셋: 잔액을 넣어 준 금액으로 되돌려요(다시 실습할 때)</p>`
      : '<div class="empty" style="padding:30px"><div class="big">💳</div><b>아직 카드가 없어요</b>위에서 학생 이름과 금액을 넣고 카드를 만들어 주세요.</div>'}
  </div>`);
}
function newCardNo() {
  let no;
  do { no = '9410' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join(''); } while (S.cards[no]);
  return no;
}
function makeCard(name, amount) {
  const d = new Date(); const exp = String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 3) % 100).padStart(2, '0');
  return { no: newCardNo(), name, exp, cvc: String(Math.floor(100 + Math.random() * 900)), pw: String(Math.floor(10 + Math.random() * 90)), amount, balance: amount, createdAt: Date.now() + Math.random() };
}
function printCards(list) {
  if (!list.length) return toast('인쇄할 카드를 골라 주세요.');
  const pw = $('#c_printpw') && $('#c_printpw').checked;
  $('#print').innerHTML = list.map(c => `<div class="pcard front"><div class="bn">도움반 카드 💳</div><div class="chipi"></div><div class="no">${fmtCard(c.no)}</div>
    <div class="bt"><div><small>이름</small><b>${esc(c.name || '')}</b></div><div style="text-align:right"><small>유효기간 (월/년)</small><b>${esc(c.exp)}</b></div></div></div>
    <div class="pcard back"><div class="stripe"></div><div class="sig">CVC <div>${esc(c.cvc)}</div></div>${pw ? `<div class="pw">카드 비밀번호 앞 2자리 <b>${esc(c.pw)}</b></div>` : '<div class="pw">카드 비밀번호 앞 2자리: 선생님께 물어보세요</div>'}<div class="amt">도움반의 배달 실습용 카드 · 실제 결제 안 됨</div></div>`).join('');
  setTimeout(() => window.print(), 80);
}

/* 설정 */
function studentLink(teacher) {
  const base = location.href.split('#')[0];
  if (DB.mode !== 'firebase') return base + (teacher ? '#/t/orders' : '#/home');
  return base + '#cfg=' + b64e(JSON.stringify({ c: DB.cfg, k: DB.code, t: teacher ? 1 : 0 }));
}
function vTSettings() {
  if (!teacherOk()) return vPin();
  const st = S.settings || {};
  const cfgText = DB.mode === 'firebase' ? JSON.stringify(DB.cfg, null, 2) : (LS.get('doum_fb', null) ? JSON.stringify(LS.get('doum_fb'), null, 2) : '');
  const isFile = location.protocol === 'file:';
  const localData = DB.mode === 'firebase' ? DB.readLocal(DB.code) : null;
  const hasLocal = localData && (Object.keys(localData.stores || {}).length || Object.keys(localData.cards || {}).length);
  return `<div class="tapp">${tHead('settings')}
  <div class="tpanel"><h2>학생 접속 안내</h2>
    ${DB.mode === 'firebase' ? '<p class="hint">학생 기기에서 아래 QR을 찍거나 링크를 열면 우리 반 가게·카드에 바로 연결돼요. 한 번 열면 그 기기는 다음부터 자동으로 연결돼요.</p>'
      : '<p class="hint">⚠️ 지금은 <b>이 기기에만 저장</b>하고 있어요. 학생이 자기 휴대폰·태블릿에서 주문하고 선생님 기기에서 주문을 보려면 아래 ‘실시간 연결’을 먼저 해 주세요. (연결 전에는 한 기기에서 학생 화면과 선생님 화면을 번갈아 보며 연습할 수 있어요.)</p>'}
    ${isFile ? '<p class="err">이 파일은 컴퓨터에서 바로 연 상태예요. 학생 기기에서 열려면 인터넷 주소(예: GitHub Pages, Netlify)에 올려 주세요. 사용안내.md를 참고하세요.</p>' : ''}
    <div class="qrbox"><div id="qr">QR 만드는 중…</div>
      <div class="linkbox"><label class="field" style="margin-top:0"><span>학생용 링크</span><textarea class="inp" id="link_s" readonly>${esc(studentLink(false))}</textarea></label>
      <div class="tbar" style="margin-top:8px"><button class="btn-line dark" data-act="t-copy" data-from="link_s">학생 링크 복사</button><button class="btn-line" data-act="t-copy" data-from="link_t">선생님 기기용 링크 복사</button></div>
      <textarea id="link_t" class="hidden" readonly>${esc(studentLink(true))}</textarea></div></div>
  </div>

  <div class="tpanel"><h2>실시간 연결 (Firebase)</h2>
    <p class="hint">무료 Firebase 실시간 데이터베이스를 연결하면 학생 기기와 선생님 기기가 같은 가게·카드·주문을 실시간으로 함께 써요. 만드는 방법은 사용안내.md에 있어요.</p>
    <ol class="guide"><li>firebase.google.com → 프로젝트 만들기</li><li>빌드 → Realtime Database → 데이터베이스 만들기 → <b>테스트 모드</b>로 시작</li><li>프로젝트 설정 → 내 앱 → 웹 앱(&lt;/&gt;) 추가 → 보이는 <code class="k">firebaseConfig</code> 내용을 아래에 붙여넣기</li></ol>
    <div class="tform">
      <label class="field wide"><span>Firebase 설정 (firebaseConfig 전체를 붙여넣어도 돼요)</span><textarea class="inp" id="fb_cfg" style="min-height:150px;font-family:Consolas,monospace;font-size:14px" placeholder='const firebaseConfig = {&#10;  apiKey: "...",&#10;  authDomain: "...",&#10;  databaseURL: "https://....firebasedatabase.app",&#10;  projectId: "...",&#10;};'>${esc(cfgText)}</textarea></label>
      <label class="field"><span>반 코드 (반마다 다르게 쓰면 데이터가 따로 저장돼요)</span><input class="inp" id="fb_code" value="${esc(DB.code)}" placeholder="class1" autocomplete="off"></label>
    </div>
    ${FIXED_FIREBASE_CONFIG ? '<p class="hint">app.js 파일에 설정이 직접 들어 있어서 여기서 바꿀 수 없어요.</p>' : `<div class="tbar" style="margin-top:12px"><button class="btn-mint" style="min-height:50px;font-size:17px" data-act="t-fbsave">저장하고 연결하기</button>${DB.mode === 'firebase' || LS.get('doum_fb', null) ? '<button class="btn-line red" data-act="t-fboff">연결 끊고 이 기기만 쓰기</button>' : ''}</div>`}
    ${DB.initError ? `<p class="err">연결 실패: ${esc(DB.initError)}</p>` : ''}
    ${hasLocal ? `<p class="hint" style="margin-top:14px">이 기기에 연결 전에 만든 가게 ${Object.keys(localData.stores || {}).length}개, 카드 ${Object.keys(localData.cards || {}).length}장이 있어요. <button class="btn-line" data-act="t-uplocal">실시간 데이터로 올리기</button></p>` : ''}
  </div>

  <div class="tpanel"><h2>앱 설정</h2><div class="tform">
    <label class="field wide"><span>학생 홈 화면 문구</span><textarea class="inp" id="set_banner" placeholder="지금 도움반의 배달에서&#10;주문 연습을 해 볼까요?">${esc(st.bannerText || '')}</textarea></label>
    <label class="field"><span>선생님 비밀번호 (숫자)</span><input class="inp num" id="set_pin" value="${esc(st.pin || '1234')}" inputmode="numeric" autocomplete="off"></label>
    <div class="field"><span>결제 연습</span><label class="cbox"><input type="checkbox" id="set_force" ${st.forceCardInput ? 'checked' : ''}> 결제할 때마다 카드 번호를 직접 입력하게 하기 (카드 저장 안 됨)</label></div>
  </div><div class="tbar" style="margin-top:12px"><button class="btn-mint" style="min-height:50px;font-size:17px" data-act="t-setsave">설정 저장</button></div></div>

  <div class="tpanel"><h2>데이터</h2><p class="hint">가게·메뉴·카드를 파일로 백업해 두면 다른 반이나 다른 기기에서 그대로 불러올 수 있어요.</p>
    <div class="tbar"><button class="btn-line dark" data-act="t-backup">백업 파일 내려받기</button><label class="btn-line" style="cursor:pointer">백업 파일 불러오기<input type="file" accept=".json,application/json" id="restore_file" class="hidden"></label>
    <button class="btn-line" data-act="t-sample">예시 가게 불러오기</button><button class="btn-line red" data-act="t-wipe">모든 데이터 지우기</button></div></div>
  </div>`;
}

/* 화면 목록 */
const VIEWS = {
  home: vHome, list: vList, search: vSearch, store: vStore, menu: vMenu, cart: vCart, checkout: vCheckout, done: vDone,
  orders: vOrders, likes: vLikes, my: vMy,
  't-orders': vTOrders, 't-stores': vTStores, 't-store': vTStore, 't-menu': vTMenu, 't-cards': vTCards, 't-settings': vTSettings,
};
const AFTER = {
  list() { const t = $('.cattabs .on'); if (t) t.scrollIntoView({ block: 'nearest', inline: 'center' }); },
  't-settings'() {
    const box = $('#qr'); if (!box) return;
    if (typeof QRCode === 'undefined') { box.textContent = 'QR을 만들 수 없어요 (인터넷 연결 확인)'; return; }
    box.innerHTML = '';
    try { new QRCode(box, { text: studentLink(false), width: 200, height: 200, correctLevel: QRCode.CorrectLevel.L }); }
    catch (e) { box.textContent = '링크가 길어서 QR을 만들지 못했어요. 링크를 복사해서 보내 주세요.'; }
  },
};

/* =========================================================
   눌렀을 때 하는 일
   ========================================================= */
const ACT = {
  go: el => go(el.dataset.to),
  tab: el => replaceTo(el.dataset.to),
  back: el => back(el.dataset.to),
  close: () => closeModal(),
  'close-go': el => { closeModal(); go(el.dataset.to); },
  soon: () => toast('실습에서는 ‘음식배달’만 사용해요.'),
  profile: el => profileModal(el.dataset.focus),
  'pf-save': () => {
    const name = $('#pf_name').value.trim(), address = $('#pf_addr').value.trim(), detail = $('#pf_detail').value.trim(), phone = fmtPhone($('#pf_phone').value);
    const e = $('#pf_err');
    if (!name) { e.textContent = '이름을 입력해 주세요.'; $('#pf_name').focus(); return; }
    if (!address) { e.textContent = '주소를 입력해 주세요.'; $('#pf_addr').focus(); return; }
    if (digits(phone).length < 10) { e.textContent = '연락처를 010으로 시작하는 숫자로 입력해 주세요.'; $('#pf_phone').focus(); return; }
    L.profile = { name, address, detail, phone }; saveL('profile');
    closeModal(); toast('내 정보를 저장했어요.'); if (T.err) T.err = null; render(true);
  },
  like: el => {
    const id = el.dataset.id; const i = L.likes.indexOf(id);
    if (i >= 0) { L.likes.splice(i, 1); toast('찜을 취소했어요.'); } else { L.likes.push(id); toast('찜했어요 💗'); }
    saveL('likes'); render(true);
  },
  store: el => go('store/' + el.dataset.id),
  sort: () => { const o = ['기본순', '별점 높은 순', '배달 빠른 순', '최소주문 낮은 순']; T.sort = o[(o.indexOf(T.sort || '기본순') + 1) % o.length]; render(true); },
  toggle: el => { T[el.dataset.k] = !T[el.dataset.k]; render(true); },
  jump: el => {
    const t = document.getElementById(el.dataset.to); if (!t) return;
    const y = t.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top: y, behavior: 'smooth' });
    $$('.menuchips .chip').forEach(c => c.classList.toggle('on', c === el));
  },
  menu: el => {
    const s = S.stores[el.dataset.sid]; const m = findMenu(s, el.dataset.mid);
    if (!s || !m) return;
    if (s.open === false) return toast('지금은 준비 중이라 주문할 수 없어요.');
    if (m.soldOut) return toast('품절된 메뉴예요. 다른 메뉴를 골라 보세요.');
    go(`menu/${el.dataset.sid}/${el.dataset.mid}`);
  },
  qty: el => { T.qty = Math.max(1, Math.min(20, (T.qty || 1) + Number(el.dataset.d))); render(true); },
  opt: el => {
    const s = S.stores[current.args[0]]; const m = findMenu(s, current.args[1]); if (!m) return;
    const gi = +el.dataset.g, ci = +el.dataset.c; const g = opts(m)[gi]; const max = Number(g.max) || 1;
    let sel = T.sel[gi] || [];
    if (max === 1) sel = sel.includes(ci) && !g.required ? [] : [ci];
    else if (sel.includes(ci)) sel = sel.filter(x => x !== ci);
    else if (sel.length >= max) { toast(`최대 ${max}개까지 고를 수 있어요.`); return; }
    else sel = [...sel, ci];
    T.sel[gi] = sel; render(true);
  },
  add: async el => {
    const sid = el.dataset.sid; const s = S.stores[sid]; const m = findMenu(s, el.dataset.mid); if (!m) return;
    const groups = opts(m);
    const miss = groups.findIndex((g, gi) => g.required && !(T.sel[gi] || []).length);
    if (miss >= 0) { toast(`‘${groups[miss].name}’을(를) 골라 주세요.`); document.getElementById('og-' + miss)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (await addToCart(sid, m, T.sel, T.qty)) { toast('장바구니에 담았어요 🛒'); back('store/' + sid); }
  },
  cqty: async el => {
    const it = L.cart.items[+el.dataset.i]; if (!it) return;
    const d = Number(el.dataset.d);
    if (it.qty + d < 1) return ACT.cdel(el);
    it.qty = Math.min(20, it.qty + d); saveL('cart'); render(true);
  },
  cdel: async el => {
    const it = L.cart.items[+el.dataset.i]; if (!it) return;
    if (!(await ask('메뉴를 뺄까요?', `<b>${esc(it.name)}</b>을(를) 장바구니에서 빼요.`, '빼기'))) return;
    L.cart.items.splice(+el.dataset.i, 1); if (!L.cart.items.length) L.cart.storeId = null; saveL('cart'); render(true);
  },
  recadd: async el => {
    const sid = L.cart.storeId; const s = S.stores[sid]; const m = findMenu(s, el.dataset.mid); if (!m) return;
    const groups = opts(m);
    if (groups.some(g => g.required)) return go(`menu/${sid}/${m.id}`);
    await addToCart(sid, m, {}, 1); toast(`${m.name}을(를) 담았어요.`); render(true);
  },
  'cart-clear': async () => { if (await ask('장바구니를 비울까요?', '담은 메뉴가 모두 빠져요.', '비우기')) { L.cart = { storeId: null, items: [] }; saveL('cart'); toast('장바구니를 비웠어요.'); render(true); } },
  order: () => {
    const s = S.stores[L.cart.storeId]; if (!s) return;
    if (s.open === false) return toast('지금은 가게가 준비 중이에요.');
    const need = toNum(s.minOrder) - cartTotal();
    if (need > 0) return info('조금 더 담아야 해요', `이 가게는 <b>${won(s.minOrder)}</b> 이상 주문해야 해요.<br>${won(need)} 더 담아 주세요.`);
    go('checkout');
  },
  method: el => {
    const k = el.dataset.k;
    if (k !== 'card') return toast('실습에서는 ‘신용·체크카드’로 결제해요.');
    T.method = 'card'; if (T.err && T.err.sec === 'pay') T.err = null; render(true);
    setTimeout(() => { const f = $('#cn1'); if (f) f.focus(); }, 50);
  },
  'saved-off': () => { T.useSaved = false; render(true); setTimeout(() => $('#cn1')?.focus(), 50); },
  pay: () => pay(),
  'card-forget': async () => { if (await ask('카드를 지울까요?', '이 기기에 저장된 카드 정보만 지워요. 카드 잔액은 그대로예요.', '지우기')) { L.card = null; saveL('card'); render(true); } },

  /* ----- 선생님 ----- */
  't-filter': el => { T.filter = el.dataset.k; render(true); },
  't-sound': () => { LS.set('doum_sound', !LS.get('doum_sound', true)); if (LS.get('doum_sound', true)) beep(); render(true); },
  't-status': async el => { await DB.update('orders/' + el.dataset.id, { status: el.dataset.s, ['t_' + STATUS.indexOf(el.dataset.s)]: Date.now() }); toast(`‘${el.dataset.s}’(으)로 바꿨어요.`); },
  't-cancel': async el => {
    const o = S.orders[el.dataset.id]; if (!o) return;
    if (!(await ask('주문을 취소할까요?', `${esc(o.studentName)} 학생의 주문을 취소하고 <b>${won(o.total)}</b>을 카드로 돌려줘요.`, '취소하고 환불', '닫기'))) return;
    if (S.cards[o.cardNo] && !o.refunded) await DB.addBalance(o.cardNo, o.total);
    await DB.update('orders/' + el.dataset.id, { status: '취소', refunded: true });
    toast('주문을 취소하고 환불했어요.');
  },
  't-odel': async el => { await DB.remove('orders/' + el.dataset.id); },
  't-clear-done': async () => {
    const ids = Object.entries(S.orders).filter(([, o]) => ['배달 완료', '취소'].includes(o.status)).map(([id]) => id);
    if (!ids.length) return toast('지울 주문이 없어요.');
    if (!(await ask('끝난 주문을 지울까요?', `배달 완료·취소된 주문 ${ids.length}건을 지워요.`, '지우기'))) return;
    const u = {}; ids.forEach(id => { u[id] = null; }); await DB.update('orders', u); toast('지웠어요.');
  },
  't-clear-all': async () => { if (await ask('모든 주문을 지울까요?', '학생 주문내역도 모두 사라져요. 카드 잔액은 그대로예요.', '모두 지우기')) { await DB.set('orders', null); toast('모든 주문을 지웠어요.'); } },
  't-sample': async () => { if (await ask('예시 가게를 불러올까요?', '예시 가게 4곳과 메뉴가 추가돼요. 지금 있는 가게는 그대로예요.', '불러오기')) { await seedSample(false); toast('예시 가게를 불러왔어요.'); } },
  't-open': async el => { const s = S.stores[el.dataset.id]; await DB.update('stores/' + el.dataset.id, { open: s.open === false }); },
  't-smove': async el => {
    const arr = storeList(); const i = arr.findIndex(s => s.id === el.dataset.id); const j = i + Number(el.dataset.d);
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    const u = {}; arr.forEach((s, k) => { u[s.id + '/order'] = k * 10; }); await DB.update('stores', u);
  },
  't-sdel': async el => {
    const s = S.stores[el.dataset.id];
    if (!(await ask('가게를 삭제할까요?', `<b>${esc(s.name)}</b>과(와) 메뉴 ${menuList(s).length}개가 모두 지워져요.`, '삭제'))) return;
    await DB.remove('stores/' + el.dataset.id); toast('가게를 삭제했어요.');
  },
  't-imgdel': el => { T.img[el.dataset.k] = ''; const p = $('#prev_' + el.dataset.k); if (p) p.innerHTML = '🖼️'; el.remove(); },
  't-ssave': async el => {
    const id = el.dataset.id; const isNew = id === 'new';
    const name = $('#s_name').value.trim();
    if (!name) { toast('가게 이름을 입력해 주세요.'); $('#s_name').focus(); return; }
    const data = {
      name, category: $('#s_category').value, emoji: $('#s_emoji').value.trim(), open: $('#s_open').checked,
      logo: T.img.logo || '', banner: T.img.banner || '',
      minOrder: toNum($('#s_min').value), fee: toNum($('#s_fee').value), freeOver: toNum($('#s_free').value),
      time: $('#s_time').value.trim(), distance: $('#s_dist').value.trim(),
      rating: ($('#s_rating').value.trim() || '5.0'), reviews: toNum($('#s_reviews').value),
      areas: $('#s_areas').value.trim(), groups: $('#s_groups').value.trim(), notice: $('#s_notice').value.trim(),
    };
    el.disabled = true;
    try {
      if (isNew) {
        const nid = DB.newId('stores');
        data.order = (storeList().reduce((a, s) => Math.max(a, Number(s.order) || 0), 0)) + 10;
        await DB.set('stores/' + nid, data);
        toast('가게를 만들었어요. 이제 메뉴를 넣어 주세요.');
        replaceTo('t/store/' + nid);
      } else { await DB.update('stores/' + id, data); toast('저장했어요.'); render(true); }
    } catch (e) { toast('저장하지 못했어요: ' + e.message, 4000); }
    el.disabled = false;
  },
  't-ogadd': () => { readOptsFromDom(); T.opts.push({ name: '', required: false, max: 1, text: '' }); render(true); },
  't-ogpreset': el => { readOptsFromDom(); const p = OPT_PRESETS[el.dataset.k]; T.opts.push({ name: p.name, required: p.required, max: p.max, text: p.choices.map(c => `${c.name} ${c.price}`).join('\n') }); render(true); },
  't-ogdel': el => { readOptsFromDom(); T.opts.splice(+el.dataset.i, 1); render(true); },
  't-msave': async el => {
    readOptsFromDom();
    const sid = el.dataset.sid; let mid = el.dataset.mid; const s = S.stores[sid];
    const name = $('#m_name').value.trim(); const price = toNum($('#m_price').value);
    if (!name) { toast('메뉴 이름을 입력해 주세요.'); $('#m_name').focus(); return; }
    if (!$('#m_price').value.trim()) { toast('가격을 입력해 주세요.'); $('#m_price').focus(); return; }
    const options = T.opts.map(g => ({ name: g.name.trim(), required: !!g.required, max: Math.max(1, toNum(g.max) || 1), choices: parseChoices(g.text) })).filter(g => g.name && g.choices.length);
    const bad = T.opts.find(g => (g.name.trim() && !parseChoices(g.text).length) || (!g.name.trim() && parseChoices(g.text).length));
    if (bad) { toast('선택사항 그룹의 이름과 고를 것들을 모두 적어 주세요.', 3000); return; }
    const old = mid === 'new' ? null : findMenu(s, mid);
    if (mid === 'new') mid = DB.newId('stores/' + sid + '/menus');
    const menu = {
      name, price, group: $('#m_group').value.trim(), desc: $('#m_desc').value.trim(), emoji: $('#m_emoji').value.trim(),
      image: T.img.image || '', popular: $('#m_popular').checked, soldOut: $('#m_sold').checked, options,
      order: old ? (Number(old.order) || 0) : (menuList(s).reduce((a, m) => Math.max(a, Number(m.order) || 0), 0) + 10),
    };
    el.disabled = true;
    try {
      await DB.set(`stores/${sid}/menus/${mid}`, menu); toast('메뉴를 저장했어요.');
      if (navStack[navStack.length - 2] === 't/store/' + sid) history.back(); else replaceTo('t/store/' + sid);
    }
    catch (e) { toast('저장하지 못했어요: ' + e.message, 4000); el.disabled = false; }
  },
  't-mcopy': async el => {
    const s = S.stores[el.dataset.sid]; const m = findMenu(s, el.dataset.mid); if (!m) return;
    const nid = DB.newId('stores/' + el.dataset.sid + '/menus'); const c = clone(m); delete c.id;
    c.name += ' (복사)'; c.order = (Number(m.order) || 0) + 1;
    await DB.set(`stores/${el.dataset.sid}/menus/${nid}`, c); toast('메뉴를 복사했어요.');
    render(true);
  },
  't-mmove': async el => {
    const sid = el.dataset.sid; const arr = menuList(S.stores[sid]); const i = arr.findIndex(m => m.id === el.dataset.mid); const j = i + Number(el.dataset.d);
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    const u = {}; arr.forEach((m, k) => { u[m.id + '/order'] = k * 10; }); await DB.update(`stores/${sid}/menus`, u); render(true);
  },
  't-mdel': async el => {
    const m = findMenu(S.stores[el.dataset.sid], el.dataset.mid); if (!m) return;
    if (!(await ask('메뉴를 삭제할까요?', `<b>${esc(m.name)}</b>을(를) 지워요.`, '삭제'))) return;
    await DB.remove(`stores/${el.dataset.sid}/menus/${el.dataset.mid}`); toast('메뉴를 삭제했어요.'); render(true);
  },
  't-quick': el => { const t = document.getElementById(el.dataset.t); if (t) t.value = el.dataset.v; },
  't-cnew': async () => {
    const amt = toNum($('#c_amt').value);
    if (amt <= 0) { toast('넣어 줄 금액을 입력해 주세요.'); return; }
    const many = $('#c_names').value.split('\n').map(t => t.trim()).filter(Boolean);
    const names = many.length ? many : [$('#c_name').value.trim()];
    if (!names[0]) { toast('학생 이름을 입력해 주세요.'); $('#c_name').focus(); return; }
    const u = {};
    names.forEach(n => { const c = makeCard(n, amt); S.cards[c.no] = c; u[c.no] = c; });
    $('#c_name').value = ''; $('#c_names').value = '';
    await DB.update('cards', u);
    toast(`카드 ${names.length}장을 만들었어요.`);
  },
  't-ccharge': async el => {
    const no = el.dataset.no; const v = toNum(($('#cx_' + no) || {}).value); if (v <= 0) return toast('충전할 금액을 입력해 주세요.');
    $('#cx_' + no).value = '';
    await DB.addBalance(no, v); await DB.update('cards/' + no, { amount: (Number(S.cards[no].amount) || 0) + v });
    toast(`${won(v)} 충전했어요.`);
  },
  't-cset': async el => {
    const no = el.dataset.no; const v = toNum(($('#cx_' + no) || {}).value); if (v <= 0) return toast('새 금액을 입력해 주세요.');
    $('#cx_' + no).value = '';
    await DB.update('cards/' + no, { amount: v, balance: v }); toast(`금액을 ${won(v)}으로 바꿨어요.`);
  },
  't-creset': async el => { const c = S.cards[el.dataset.no]; await DB.update('cards/' + el.dataset.no, { balance: Number(c.amount) || 0 }); toast(`${c.name} 카드를 ${won(c.amount)}으로 되돌렸어요.`); },
  't-creset-all': async () => {
    const arr = Object.entries(S.cards); if (!arr.length) return;
    if (!(await ask('모든 카드를 되돌릴까요?', `카드 ${arr.length}장의 잔액을 각각 넣어 준 금액으로 되돌려요.`, '모두 리셋'))) return;
    const u = {}; arr.forEach(([no, c]) => { u[no + '/balance'] = Number(c.amount) || 0; }); await DB.update('cards', u); toast('모든 카드를 리셋했어요.');
  },
  't-clock': async el => { const c = S.cards[el.dataset.no]; await DB.update('cards/' + el.dataset.no, { disabled: !c.disabled }); },
  't-cdel': async el => {
    const c = S.cards[el.dataset.no];
    if (!(await ask('카드를 삭제할까요?', `${esc(c.name)} 카드(**** ${el.dataset.no.slice(-4)})를 지워요. 이 카드로는 더 이상 결제할 수 없어요.`, '삭제'))) return;
    await DB.remove('cards/' + el.dataset.no);
  },
  't-cprint': el => {
    const all = Object.entries(S.cards).map(([no, c]) => ({ ...c, no })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const sel = el.dataset.all === '1' ? all : all.filter(c => { const b = document.getElementById('csel_' + c.no); return b && b.checked; });
    printCards(sel);
  },
  't-copy': el => {
    const t = document.getElementById(el.dataset.from); if (!t) return;
    const done = () => toast('복사했어요. 학생들에게 보내 주세요.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => { t.classList.remove('hidden'); t.select(); toast('글자가 선택되었어요. Ctrl+C로 복사해 주세요.'); });
    else { t.classList.remove('hidden'); t.select(); document.execCommand('copy'); done(); }
  },
  't-fbsave': async () => {
    const cfg = parseFbConfig($('#fb_cfg').value);
    const code = $('#fb_code').value.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'class1';
    if (!cfg) return info('설정을 읽을 수 없어요', 'Firebase 콘솔에서 firebaseConfig 내용을 그대로 복사해서 붙여넣어 주세요.');
    if (!cfg.databaseURL) return info('databaseURL이 없어요', 'Realtime Database를 먼저 만든 다음, 프로젝트 설정에서 firebaseConfig를 다시 복사해 주세요. <code class="k">databaseURL</code> 줄이 있어야 해요.');
    LS.set('doum_fb', cfg); LS.set('doum_class', code);
    toast('연결 정보를 저장했어요. 다시 시작해요…');
    setTimeout(() => location.reload(), 600);
  },
  't-fboff': async () => { if (await ask('연결을 끊을까요?', '이 기기는 실시간 데이터 대신 이 기기에 저장된 데이터만 써요.', '연결 끊기')) { LS.set('doum_fb', null); location.reload(); } },
  't-uplocal': async () => {
    const d = DB.readLocal(DB.code);
    if (!(await ask('이 기기 데이터를 올릴까요?', '연결 전에 만든 가게와 카드를 실시간 데이터에 더해요. 같은 가게는 덮어써요.', '올리기'))) return;
    if (d.stores && Object.keys(d.stores).length) await DB.update('stores', d.stores);
    if (d.cards && Object.keys(d.cards).length) await DB.update('cards', d.cards);
    toast('올렸어요.');
  },
  't-setsave': async () => {
    const pin = digits($('#set_pin').value);
    if (pin.length < 4) return toast('비밀번호는 숫자 4자리 이상으로 해 주세요.');
    await DB.update('settings', { bannerText: $('#set_banner').value.trim(), pin, forceCardInput: $('#set_force').checked, initialized: true });
    toast('설정을 저장했어요.');
  },
  't-backup': () => {
    const data = { app: 'doumban-delivery', version: 1, savedAt: new Date().toISOString(), stores: S.stores, cards: S.cards, settings: S.settings };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    const d = new Date(); a.download = `도움반의배달_백업_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  't-wipe': async () => {
    if (!(await ask('모든 데이터를 지울까요?', '가게·메뉴·카드·주문이 <b>모두</b> 사라져요. 먼저 백업 파일을 내려받아 두세요.', '다음'))) return;
    if (!(await ask('정말 지울까요?', '되돌릴 수 없어요.', '모두 지우기'))) return;
    for (const k of ['stores', 'cards', 'orders']) await DB.set(k, null);
    await DB.update('settings', { initialized: true });
    toast('모든 데이터를 지웠어요.');
  },
};

function parseFbConfig(text) {
  const t = String(text || '').trim(); if (!t) return null;
  try { const j = JSON.parse(t); if (j && typeof j === 'object') return j; } catch (e) { }
  const o = {}; const re = /(\w+)\s*:\s*["'`]([^"'`]+)["'`]/g; let mm;
  while ((mm = re.exec(t))) o[mm[1]] = mm[2];
  return o.apiKey || o.databaseURL ? o : null;
}

/* ---------- 이벤트 연결 ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault();
  Promise.resolve(fn(el, e)).catch(err => { console.error(err); toast('문제가 생겼어요: ' + (err.message || err), 4000); });
});
document.addEventListener('submit', e => {
  const f = e.target; if (!f.dataset.form) return;
  e.preventDefault();
  if (f.dataset.form === 'search') { const q = (f.querySelector('input').value || '').trim(); if (current.view === 'search') replaceTo('search/' + q); else go('search/' + q); }
  if (f.dataset.form === 'pin') {
    const v = digits(f.querySelector('input').value);
    if (v === String(S.settings.pin || '1234')) { SS.set('doum_t', '1'); render(); }
    else { $('#pin_err').textContent = '비밀번호가 맞지 않아요.'; f.querySelector('input').value = ''; }
  }
  if (f.dataset.form === 'balance') {
    const no = digits($('#bal_no').value); const c = S.cards[no];
    if (no.length !== 16) return toast('카드 번호 16자리를 입력해 주세요.');
    if (!c) return info('카드를 찾을 수 없어요', '카드 번호를 다시 확인해 주세요.');
    info(`${esc(c.name || '')} 카드 잔액`, `<span style="font-size:30px;font-weight:800" class="num">${won(c.balance)}</span><br>처음 넣은 금액 ${won(c.amount)}`);
  }
});
document.addEventListener('input', e => {
  const t = e.target; const id = t.id;
  if (id === 'cn1' && digits(t.value).length > 4) { // 16자리를 한 번에 붙여넣기
    const d = digits(t.value).slice(0, 16);
    [0, 1, 2, 3].forEach(i => { const f = $('#cn' + (i + 1)); if (f) f.value = d.slice(i * 4, i * 4 + 4); });
    (d.length === 16 ? $('#cexp') : $('#cn' + (Math.floor(d.length / 4) + 1)))?.focus();
    return;
  }
  if (/^cn[1-4]$/.test(id)) {
    t.value = digits(t.value).slice(0, 4);
    if (t.value.length === 4) (id === 'cn4' ? $('#cexp') : $('#cn' + (+id[2] + 1)))?.focus();
  }
  if (id === 'cexp') {
    const d = digits(t.value).slice(0, 4);
    t.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    if (d.length === 4) $('#ccvc')?.focus();
  }
  if (id === 'ccvc') { t.value = digits(t.value).slice(0, 3); if (t.value.length === 3) $('#cpw')?.focus(); }
  if (id === 'cpw') t.value = digits(t.value).slice(0, 2);
  if (id === 'pf_phone') t.value = fmtPhone(t.value);
  if (id === 'bal_no') t.value = fmtCard(digits(t.value).slice(0, 16));
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Backspace' && /^cn[2-4]$/.test(t.id) && !t.value) { const p = $('#cn' + (+t.id[2] - 1)); if (p) { p.focus(); } }
  if (e.key === 'Enter' && t.closest && t.closest('.modal') && t.tagName === 'INPUT') { const b = $('.modal [data-act="pf-save"]'); if (b) { e.preventDefault(); b.click(); } }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'rider_sel') { T.rider = t.value; render(true); if (t.value === '직접 입력') $('#rider_custom')?.focus(); }
  if (t.id === 'store_sel') { T.storeReq = t.value; render(true); if (t.value === '직접 입력') $('#store_custom')?.focus(); }
  if (t.id === 'no_utensils') T.noUtensils = t.checked;
  if (t.id === 'csave') T.csave = t.checked;
  if (t.id === 'c_selall') $$('.csel').forEach(b => { b.checked = t.checked; });
  if (t.matches && t.matches('input[type=file][data-img]')) {
    const f = t.files && t.files[0]; if (!f) return;
    const key = t.dataset.img;
    const max = key === 'logo' ? 240 : key === 'banner' ? 900 : 520;
    try {
      const url = await resizeImage(f, max, key === 'logo' ? 0.85 : 0.75);
      T.img = T.img || {}; T.img[key] = url;
      const p = $('#prev_' + key); if (p) p.innerHTML = `<img src="${url}" alt="">`;
      toast('사진을 넣었어요. 저장을 눌러야 반영돼요.');
    } catch (err) { toast(err.message); }
    t.value = '';
  }
  if (t.id === 'restore_file') {
    const f = t.files && t.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || (!d.stores && !d.cards)) throw new Error('도움반의 배달 백업 파일이 아니에요.');
      if (await ask('백업을 불러올까요?', `가게 ${Object.keys(d.stores || {}).length}개, 카드 ${Object.keys(d.cards || {}).length}장으로 <b>바꿔요</b>. 지금 있는 가게·카드는 지워져요.`, '불러오기')) {
        await DB.set('stores', d.stores || null); await DB.set('cards', d.cards || null);
        if (d.settings) await DB.set('settings', { ...d.settings, initialized: true });
        toast('백업을 불러왔어요.');
      }
    } catch (err) { info('불러오지 못했어요', esc(err.message)); }
    t.value = '';
  }
});

function resizeImage(file, max, q) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('사진 파일만 넣을 수 있어요.'));
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = () => rej(new Error('사진을 읽을 수 없어요. 다른 사진을 골라 주세요.'));
      img.src = fr.result;
    };
    fr.onerror = () => rej(new Error('파일을 읽을 수 없어요.'));
    fr.readAsDataURL(file);
  });
}

/* ---------- 알림음 ---------- */
let actx = null;
function initAudio() {
  if (initAudio.done) return; initAudio.done = true;
  const unlock = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
}
function beep() {
  if (!LS.get('doum_sound', true)) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    [[0, 880], [0.2, 1175], [0.4, 1568]].forEach(([d, f]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
      o.start(t0 + d); o.stop(t0 + d + 0.2);
    });
  } catch (e) { }
}

/* =========================================================
   예시 데이터
   ========================================================= */
function sampleStores() {
  const ch = (...a) => a.map(([name, price]) => ({ name, price }));
  const SET = [
    { name: '디저트 변경', required: true, max: 1, choices: ch(['세트 감자튀김', 0], ['코울슬로', 0], ['치즈스틱', 400], ['감자튀김(L)', 500]) },
    { name: '음료 변경', required: true, max: 1, choices: ch(['콜라(R)', 0], ['사이다(R)', 0], ['제로콜라(R)', 0], ['콜라(L)', 500]) },
  ];
  const TOP = { name: '추가 선택', required: false, max: 2, choices: ch(['치즈 추가', 500], ['고기 추가', 1500]) };
  const PART = { name: '부위 선택', required: true, max: 1, choices: ch(['한 마리', 0], ['순살', 2000]) };
  const SAUCE = { name: '소스 추가', required: false, max: 3, choices: ch(['양념소스', 500], ['허니머스타드', 500], ['치즈가루', 1000]) };
  const SPICY = { name: '맵기 선택', required: true, max: 1, choices: ch(['순한맛', 0], ['보통맛', 0], ['매운맛', 0]) };
  const SIZE = { name: '양 선택', required: true, max: 1, choices: ch(['보통', 0], ['곱빼기', 1000]) };
  let n = 0;
  const m = (name, price, group, emoji, extra = {}) => ({ name, price, group, emoji, order: (n += 10), ...extra });
  const menus = arr => Object.fromEntries(arr.map((x, i) => ['m' + (i + 1), x]));
  return {
    sample_burger: {
      name: '도움버거 양덕점', category: '패스트푸드', emoji: '🍔', rating: '4.8', reviews: 62, minOrder: 12000, fee: 2000, freeOver: 0,
      time: '9~24분', distance: '700m', areas: '', groups: '세트, 버거, 치킨, 디저트, 음료', notice: '배달 제품 가격은 매장 가격과 다를 수 있어요.', open: true, order: 10, sample: true,
      menus: menus([
        m('불고기버거 세트', 8900, '세트', '🍔', { popular: true, desc: '두툼한 고기와 달콤한 불고기 소스가 잘 어울리는 대표 버거 세트', options: SET }),
        m('새우버거 세트', 9200, '세트', '🍤', { popular: true, desc: '통새우가 들어간 바삭한 버거 세트', options: SET }),
        m('치즈버거', 6500, '버거', '🧀', { desc: '고소한 치즈가 두 장 들어간 버거', options: [TOP] }),
        m('불고기버거', 5200, '버거', '🍔', { desc: '달콤한 불고기 소스 버거' }),
        m('치킨너겟 4조각', 3000, '치킨', '🍗'),
        m('양념치킨 2조각', 4800, '치킨', '🍗', { options: [{ name: '맛 선택', required: true, max: 1, choices: ch(['양념', 0], ['후라이드', 0]) }] }),
        m('치즈스틱', 2000, '디저트', '🧀', { popular: true }),
        m('감자튀김', 1900, '디저트', '🍟'),
        m('콜라', 2000, '음료', '🥤'),
        m('사이다', 2000, '음료', '🥤', { soldOut: true }),
      ]),
    },
    sample_chicken: {
      name: '바삭치킨 합성점', category: '치킨', emoji: '🍗', rating: '4.9', reviews: 312, minOrder: 15000, fee: 3000, freeOver: 0,
      time: '30~45분', distance: '1.2km', areas: '', groups: '치킨, 사이드, 음료', notice: '모든 치킨은 국내산 닭을 사용해요.', open: true, order: 20, sample: true,
      menus: menus([
        m('후라이드치킨', 18000, '치킨', '🍗', { popular: true, desc: '겉은 바삭, 속은 촉촉한 기본 치킨', options: [PART, SAUCE] }),
        m('양념치킨', 19000, '치킨', '🍗', { popular: true, desc: '달콤하고 매콤한 양념치킨', options: [PART, SPICY, SAUCE] }),
        m('반반치킨', 19000, '치킨', '🍗', { desc: '후라이드 반, 양념 반', options: [PART] }),
        m('치즈볼 5개', 5000, '사이드', '🧀'),
        m('감자튀김', 3500, '사이드', '🍟'),
        m('콜라 1.25L', 2500, '음료', '🥤'),
      ]),
    },
    sample_bunsik: {
      name: '행복분식', category: '분식', emoji: '🍢', rating: '4.7', reviews: 150, minOrder: 10000, fee: 1000, freeOver: 20000,
      time: '20~35분', distance: '900m', areas: '', groups: '떡볶이, 김밥, 튀김·순대, 음료', notice: '떡볶이 맵기를 꼭 골라 주세요.', open: true, order: 30, sample: true,
      menus: menus([
        m('떡볶이', 4500, '떡볶이', '🌶️', { popular: true, desc: '쫄깃한 쌀떡과 달콤한 국물', options: [SPICY, { name: '추가 선택', required: false, max: 3, choices: ch(['치즈 추가', 1000], ['삶은 계란', 500], ['어묵 추가', 1000]) }] }),
        m('김밥', 3000, '김밥', '🍙', { popular: true }),
        m('참치김밥', 4000, '김밥', '🍙'),
        m('라면', 4000, '떡볶이', '🍜', { options: [{ name: '추가 선택', required: false, max: 2, choices: ch(['계란 추가', 500], ['떡 추가', 1000]) }] }),
        m('모둠튀김', 5000, '튀김·순대', '🍤'),
        m('순대', 4500, '튀김·순대', '🌭'),
        m('쿨피스', 1500, '음료', '🧃'),
      ]),
    },
    sample_china: {
      name: '짜장명가', category: '중식', emoji: '🍜', rating: '4.6', reviews: 88, minOrder: 13000, fee: 2000, freeOver: 0,
      time: '25~40분', distance: '1.5km', areas: '', groups: '면, 밥, 요리', notice: '', open: true, order: 40, sample: true,
      menus: menus([
        m('짜장면', 7000, '면', '🍜', { popular: true, options: [SIZE] }),
        m('짬뽕', 8000, '면', '🍲', { popular: true, options: [SIZE] }),
        m('볶음밥', 8000, '밥', '🍛'),
        m('탕수육(소)', 15000, '요리', '🥟', { options: [{ name: '소스', required: true, max: 1, choices: ch(['부어 주세요', 0], ['따로 주세요', 0]) }] }),
        m('군만두', 6000, '요리', '🥟'),
      ]),
    },
  };
}
async function seedSample(withCards) {
  await DB.update('stores', sampleStores());
  if (withCards && !Object.keys(S.cards).length) {
    const c = makeCard('예시 학생', 30000); c.no = '9410123456780001'; c.exp = '12/29'; c.cvc = '123'; c.pw = '12';
    await DB.update('cards', { [c.no]: c });
  }
  await DB.update('settings', { initialized: true });
}

boot();
