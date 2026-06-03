// common.js — データ読み込み・共通ユーティリティ

// ── 共通定数 ──────────────────────────────────────────
const CART_STORAGE_KEY  = 'cart_ps2627';
const MY_MARKS_KEY      = 'mymarks_ps2627';
const TAB_STORAGE_KEY   = 'tab_ps2627';

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

document.addEventListener('DOMContentLoaded', renderCountdown);

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
