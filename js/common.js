// common.js — データ読み込み・共通ユーティリティ・共通パーツ生成

// ── 共通定数 ──────────────────────────────────────────
const CART_STORAGE_KEY  = 'cart_ps2627';
const MY_MARKS_KEY      = 'mymarks_ps2627';
const TAB_STORAGE_KEY   = 'tab_ps2627';
const BUDGET_LIMIT      = 20000;

// ── Supabase設定 ───────────────────────────────────────
const SUPABASE_URL      = 'https://bshhqybvrxqlinnlmyng.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGhxeWJ2cnhxbGlubmxteW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Mzg5ODcsImV4cCI6MjA5NjAxNDk4N30.1QAkc_aPx2Chg-uF_Sz6euqJOj70Qou_XAd3HDrL2t8';

// Supabaseクライアント（SDKロード後に初期化）
function getSupabase() {
    if (!window.supabase) throw new Error('Supabase SDK未読み込み');
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── 開幕カウントダウン ────────────────────────────────
const KICKOFF = new Date('2026-07-07T13:00:00+09:00');

// 締め切りを過ぎたか
function isClosed() {
    return KICKOFF && new Date() >= KICKOFF;
}

// ── 共通: サイトヘッダー生成 ──────────────────────────
// opts.title    : ロゴ横の主タイトル（省略時 'PS予想企画'）
// opts.subtitle : サブタイトル（省略時 'PREMIER SERIES 26-27'）
// opts.logoHref : ロゴのリンク先（省略時 'index.html'）
function renderHeader(opts) {
    opts = opts || {};
    const title    = opts.title    || 'PS予想企画';
    const subtitle = opts.subtitle || 'PREMIER SERIES 26-27';
    const logoHref = opts.logoHref || 'index.html';
    const mount = document.getElementById('site-header');
    if (!mount) return;
    mount.outerHTML = `
<header class="site-header">
    <div class="header-inner">
        <a href="${logoHref}" class="site-logo">
            <img src="assets/images/logo.png" alt="${title}" class="site-logo-img">
            <div class="site-logo-text">
                <span class="site-logo-main">${title}</span>
                <span class="site-logo-sub">${subtitle}</span>
            </div>
        </a>
    </div>
</header>`;
}

// ── 共通: ナビ生成（現在ページを自動でactive判定）──────
// guide-basic / guide-how は「使い方」をactive扱い
const NAV_ITEMS = [
    { href: 'index.html',       label: 'トップ' },
    { href: 'lineup.html',      label: '出馬表' },
    { href: 'marks.html',       label: '印' },
    { href: 'odds.html',        label: 'オッズ' },
    { href: 'submit.html',      label: '買い目を送る' },
    { href: 'predictions.html', label: '予想家の見解' },
    { href: 'help.html',        label: '使い方' },
    { href: 'faq.html',         label: 'Q&A' },
];

function renderNav(activeHrefOverride) {
    const mount = document.getElementById('page-nav');
    if (!mount) return;
    // 現在のファイル名を取得
    let current = location.pathname.split('/').pop() || 'index.html';
    if (current === '') current = 'index.html';
    // guideページは使い方をactiveに
    if (current === 'guide-basic.html' || current === 'guide-how.html') current = 'help.html';
    // 明示指定があれば優先
    if (activeHrefOverride) current = activeHrefOverride;

    const links = NAV_ITEMS.map(item => {
        const cls = item.href === current ? ' class="active"' : '';
        return `    <a href="${item.href}"${cls}>${item.label}</a>`;
    }).join('\n');

    mount.outerHTML = `<nav class="page-nav">\n${links}\n</nav>`;
}

// ── 共通: カウントダウンバー生成 ──────────────────────
function renderCountdownBar() {
    const mount = document.getElementById('countdown-bar-mount');
    if (mount) {
        mount.outerHTML = '<div id="countdown-bar"><div id="countdown-bar-inner"></div></div>';
    }
    renderCountdown();
}

function renderCountdown() {
    const bar = document.getElementById('countdown-bar');
    const el  = document.getElementById('countdown-bar-inner') || bar;
    if (!bar || !el) return;

    if (!KICKOFF) {
        el.innerHTML = '<span class="cd-label">Premier Series開幕まで：</span><span class="cd-value">開幕日程未定</span>';
        bar.classList.remove('cd-urgent');
        return;
    }

    const now  = new Date();
    const diff = KICKOFF - now;

    if (diff <= 0) {
        el.innerHTML = '<span class="cd-label">Premier Series開幕まで：</span><span class="cd-value cd-closed">開幕！</span>';
        bar.classList.add('cd-urgent');
        return;
    }

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const days       = Math.floor(totalHours / 24);
    const hours      = totalHours % 24;

    const isUrgent = days === 0;
    bar.classList.toggle('cd-urgent', isUrgent);
    const text = days >= 1
        ? `あと <strong>${days}</strong> 日`
        : `あと <strong>${hours}</strong> 時間`;
    el.innerHTML = `<span class="cd-label">Premier Series開幕まで：</span><span class="cd-value">${text}</span>`;
}

// ── 共通: フッター生成 ────────────────────────────────
function renderFooter() {
    const mount = document.getElementById('site-footer');
    if (!mount) return;
    const year = new Date().getFullYear();
    mount.outerHTML = `
<footer class="site-footer">
    <div class="footer-inner">
        <div class="footer-links">
            <a href="index.html">トップ</a>
            <a href="lineup.html">出馬表</a>
            <a href="odds.html">オッズ</a>
            <a href="help.html">使い方</a>
            <a href="faq.html">Q&A</a>
        </div>
<div class="footer-copy">© ${year} PS予想企画</div>
    </div>
</footer>`;
}

// ── 共通レイアウト一括描画 ────────────────────────────
// 各ページの DOMContentLoaded で renderLayout() を呼ぶだけでヘッダー/ナビ/カウントダウン/フッターが入る
function renderLayout(opts) {
    renderHeader(opts && opts.header);
    renderNav(opts && opts.activeNav);
    renderCountdownBar();
    renderFooter();
}

// ── データ読み込み ─────────────────────────────────────
async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
}

async function loadAllData() {
    const [teams, odds, results] = await Promise.all([
        loadJSON('data/teams.json'),
        loadJSON('data/odds.json'),
        loadJSON('data/results.json'),
    ]);
    return { teams, odds, results };
}

// ── カスタムダイアログ ─────────────────────────────────
function psAlert(msg) {
    return new Promise(resolve => _showDialog(msg, false, resolve));
}
function psConfirm(msg) {
    return new Promise(resolve => _showDialog(msg, true, resolve));
}
function _showDialog(msg, hasCancel, resolve) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:10px;padding:24px 20px 18px;max-width:320px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.25);font-family:"Noto Sans JP",sans-serif;';
    const p = document.createElement('p');
    p.style.cssText = 'margin:0 0 18px;font-size:.92rem;line-height:1.7;color:#1a1a2e;white-space:pre-wrap;';
    p.textContent = msg;
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    if (hasCancel) {
        const cancel = document.createElement('button');
        cancel.textContent = 'キャンセル';
        cancel.style.cssText = 'padding:8px 18px;border:1.5px solid #ccc;border-radius:6px;background:#fff;color:#555;font-size:.88rem;cursor:pointer;font-family:inherit;';
        cancel.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        btns.appendChild(cancel);
    }
    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.style.cssText = 'padding:8px 22px;border:none;border-radius:6px;background:#1a4fd6;color:#fff;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit;';
    ok.onclick = () => { document.body.removeChild(overlay); resolve(true); };
    btns.appendChild(ok);
    box.appendChild(p);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ok.focus();
}
