// odds-sp.js — スマホ版オッズUI

let spType       = 'win-place';
let spSortMode   = 'num';
let spVoteMode   = 'formation';
let spMsRows     = [new Set(), new Set(), new Set()];
let spFilterMode = false;
let spCartOpen   = false;

const TYPE_LABELS = {
    'win-place': '単勝・複勝',
    quinella:    '2連複',
    wide:        'ワイド',
    exacta:      '2連単',
    trio:        '3連複',
    trifecta:    '3連単',
};

const FRAME_COLORS = {
    1: { bg: '#f0f0f0', fg: '#111' }, 2: { bg: '#111',    fg: '#fff' },
    3: { bg: '#cc2200', fg: '#fff' }, 4: { bg: '#1a4fd6', fg: '#fff' },
    5: { bg: '#d4a000', fg: '#111' }, 6: { bg: '#1a7a3a', fg: '#fff' },
    7: { bg: '#d06000', fg: '#fff' }, 8: { bg: '#c0357a', fg: '#fff' },
};

// ブレイクポイントはCSSと同期（style.cssの--is-spで管理するのが理想）
function isSP() { return window.innerWidth <= 767; }

function initSP() {
    // 初期タブはwin-placeなのでマークシートを非表示
    const msWrap = document.getElementById('sp-ms-wrap');
    if (msWrap) msWrap.style.display = 'none';
    spRenderMs();
    spRender();
    spRenderCart();
}

function initSPAfterLoad() {
    if (isSP()) initSP();
}

// ── 券種切り替え ─────────────────────────────────────

function spSwitchType(type, el) {
    spType       = type;
    spFilterMode = false;
    spMsRows     = [new Set(), new Set(), new Set()];
    spVoteMode   = 'formation';

    document.querySelectorAll('.sp-type-tab').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    document.getElementById('sp-ms-wrap').style.display = type === 'win-place' ? 'none' : '';

    const axis1 = document.getElementById('sp-btn-axis1');
    const axis2 = document.getElementById('sp-btn-axis2');
    axis1.style.display = (type === 'exacta' || type === 'trifecta') ? '' : 'none';
    axis2.style.display = (type === 'trifecta') ? '' : 'none';

    document.querySelectorAll('.sp-ms-mode-btn').forEach(b => b.classList.remove('active'));
    const fBtn = document.querySelector('.sp-ms-mode-btn[data-mode="formation"]');
    if (fBtn) fBtn.classList.add('active');

    spRenderMs();
    spRender();
}

// ── ソート切り替え ───────────────────────────────────

function spSetSort(mode) {
    spSortMode = mode;
    document.getElementById('sp-btn-num').classList.toggle('active', mode === 'num');
    document.getElementById('sp-btn-pop').classList.toggle('active', mode === 'pop');
    spRender();
}

// ── 買い方切り替え ───────────────────────────────────

function spSwitchMode(mode, el) {
    spVoteMode = mode;
    spMsRows   = [new Set(), new Set(), new Set()];
    document.querySelectorAll('.sp-ms-mode-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    spRenderMs();
    spUpdateMsCount();
}

// ── マークシート描画 ─────────────────────────────────

function spRenderMs() {
    const wrap    = document.getElementById('sp-ms-rows');
    const rowDefs = getMsRowDefs(spType, spVoteMode);

    wrap.innerHTML = rowDefs.map(({ label, rowIdx: ri }) => {
        const btns = teams.map((t, ci) => {
            const num      = ci + 1;
            const isMarked = spMsRows[ri].has(num);
            let cls = 'sp-ms-btn';
            if (isMarked) {
                if (ri === 0 && (spVoteMode === 'axis1' || spVoteMode === 'axis2')) cls += ' axis1';
                else if (ri === 1 && spVoteMode === 'axis2') cls += ' axis2';
                else cls += ' marked';
            }
            return `<button class="${cls}" onclick="spToggleMs(${ri},${num})">${num}</button>`;
        }).join('');

        return `<div class="sp-ms-row">
            <div class="sp-ms-row-label">${label}</div>
            <div class="sp-ms-btns">${btns}
                <button class="sp-ms-btn" style="background:#e8f5e9;color:#1a7a3a;border-color:#1a7a3a;font-size:.65rem;" onclick="spBulkMs(${ri},true)">全</button>
                <button class="sp-ms-btn" style="background:#fff0f0;color:#d00;border-color:#d00;font-size:.65rem;" onclick="spBulkMs(${ri},false)">消</button>
            </div>
        </div>`;
    }).join('');

    spUpdateMsCount();
}

function spToggleMs(ri, num) {
    if (spMsRows[ri].has(num)) {
        spMsRows[ri].delete(num);
    } else {
        if (spVoteMode === 'axis1' && ri === 0 && spMsRows[0].size >= 1) return;
        if (spVoteMode === 'axis2' && ri === 0 && spMsRows[0].size >= 2) return;
        spMsRows[ri].add(num);
    }
    spRenderMs();
}

function spBulkMs(ri, val) {
    if (val) teams.forEach((_, ci) => spMsRows[ri].add(ci + 1));
    else     spMsRows[ri].clear();
    spRenderMs();
}

function spUpdateMsCount() {
    document.getElementById('sp-ms-count').textContent = spGetCombinations().length;
}

function spGetCombinations() {
    return calcCombinations(spType, spVoteMode, spMsRows);
}

// ── オッズリスト描画 ─────────────────────────────────

function spRender() {
    const container = document.getElementById('sp-odds-list');
    if (spType === 'win-place') { spRenderWinPlace(container); return; }

    const combs   = spFilterMode ? spGetCombinations() : Object.keys(oddsData[spType] || {});
    let dataArr   = combs.map(key => {
        const val = (oddsData[spType] || {})[key] || '---';
        return { key, val, sortVal: parseFloat(val.split('-')[0]) || 99999 };
    });

    if (spSortMode === 'pop') {
        dataArr.sort((a, b) => a.sortVal - b.sortVal);
    } else {
        dataArr.sort((a, b) => {
            const ak = a.key.split('-').map(n => n.padStart(2, '0')).join('');
            const bk = b.key.split('-').map(n => n.padStart(2, '0')).join('');
            return ak.localeCompare(bk);
        });
    }

    container.innerHTML = dataArr.map(d => {
        const nums      = d.key.split('-').map(Number);
        const fc        = FRAME_COLORS[nums[0]] || { bg: '#999', fg: '#fff' };
        const teamNames = nums.map(n => (teams[n - 1] ? teams[n - 1].tag : String(n))).join(' - ');
        return `<div class="sp-odds-item" data-comb="${d.key}" onclick="spAddComb('${d.key}')">
            <div class="sp-odds-frame" style="background:${fc.bg};color:${fc.fg}">${nums[0]}</div>
            <div class="sp-odds-item-body">
                <div class="sp-odds-comb">${d.key}</div>
                <div class="sp-odds-team">${teamNames}</div>
            </div>
            <div class="sp-odds-val-wrap">
                <div class="sp-odds-val ${getOddsClass(d.val, spType)}">${d.val}</div>
            </div>
        </div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:#aaa;font-size:.88rem;">該当する買い目がありません</div>';
}

function spRenderWinPlace(container) {
    let list = teams.map((t, i) => ({
        no: i + 1, name: t.name, tag: t.tag,
        win:   (oddsData.win   || {})[i + 1],
        place: (oddsData.place || {})[i + 1],
    }));
    if (spSortMode === 'pop') list.sort((a, b) => parseFloat(a.win) - parseFloat(b.win));

    container.innerHTML = list.map(item => {
        const fc = FRAME_COLORS[item.no] || { bg: '#999', fg: '#fff' };
        return `<div class="sp-odds-item" style="cursor:default;">
            <div class="sp-odds-frame" style="background:${fc.bg};color:${fc.fg}">${item.no}</div>
            <div class="sp-odds-item-body">
                <div class="sp-odds-team">${item.name}</div>
            </div>
            <div style="display:flex;gap:6px;padding:0 8px;align-items:center;">
                <div style="text-align:center;cursor:pointer;padding:6px 0;border:1.5px solid #ddd;border-radius:6px;background:#fff;width:62px;flex-shrink:0;" onclick="spAddBet('win','${item.no}','単勝')">
                    <div class="sp-odds-val ${getOddsClass(item.win, 'win')}">${item.win || '---'}</div>
                    <div style="font-size:.62rem;color:#aaa;">単勝</div>
                </div>
                <div style="text-align:center;cursor:pointer;padding:6px 10px;border:1.5px solid #ddd;border-radius:6px;background:#fff;" onclick="spAddBet('place','${item.no}','複勝')">
                    <div class="sp-odds-val">${item.place || '---'}</div>
                    <div style="font-size:.62rem;color:#aaa;">複勝</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── マークシートからセット ───────────────────────────

function spApplyMs() {
    spFilterMode = true;
    spRender();
}

// ── SP: 追加トースト通知 ──
let _spToastTimer = null;
function spToast(msg) {
    let toast = document.getElementById('sp-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sp-toast';
        toast.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(0,125,67,.96);color:#fff;padding:14px 26px;border-radius:10px;font-size:1rem;font-weight:700;z-index:9500;box-shadow:0 6px 24px rgba(0,0,0,.3);pointer-events:none;opacity:0;transition:opacity .15s;text-align:center;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.opacity = '1';
    if (_spToastTimer) clearTimeout(_spToastTimer);
    _spToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 900);
}

// 予算超過チェック（追加予定額を渡す）
async function spCheckBudget(addAmount) {
    const total = calcCartTotal(cart);
    if (total + addAmount > BUDGET_LIMIT) {
        await psAlert(`予算超過：合計が${BUDGET_LIMIT.toLocaleString()}ptを超えるため追加できません。\n（残り利用可能：${(BUDGET_LIMIT - total).toLocaleString()}pt）`);
        return false;
    }
    return true;
}

async function spSetMs() {
    const combs = spGetCombinations();
    if (!combs.length) { await psAlert('買い目を選択してください'); return; }
    if (!await spCheckBudget(combs.length * 100)) return;
    const formation = spMsRows
        .map(r => [...r].sort((a, b) => a - b).join(','))
        .filter(s => s)
        .join(' / ');
    addToCart({
        displayType: TYPE_LABELS[spType] || spType,
        type: spType,
        formation,
        combs,
        amountPerBet: 100,
    });
    spRenderCart();
    spToast(`✓ ${TYPE_LABELS[spType] || spType} ${combs.length}点 を追加`);
}

// ── 買い目追加 ───────────────────────────────────────

async function spAddBet(type, formation, label) {
    if (!await spCheckBudget(100)) return;
    addToCart({ displayType: label, type, formation, combs: [formation], amountPerBet: 100 });
    spRenderCart();
    spToast(`✓ ${label} ${formation} を追加`);
}

async function spAddComb(key) {
    if (!await spCheckBudget(100)) return;
    const label = TYPE_LABELS[spType] || spType;
    addToCart({
        displayType: label,
        type: spType,
        formation: key,
        combs: [key],
        amountPerBet: 100,
    });
    spRenderCart();
    const el = document.querySelector(`.sp-odds-item[data-comb="${key}"]`);
    if (el) { el.classList.add('added'); setTimeout(() => el.classList.remove('added'), 600); }
    spToast(`✓ ${label} ${key} を追加`);
}

// ── SPカート描画 ─────────────────────────────────────

function spRenderCart() {
    const total = calcCartTotal(cart);
    const rem   = 20000 - total;

    document.getElementById('sp-cart-count').textContent = cart.length;
    const countMini = document.getElementById('sp-cart-count-mini');
    if (countMini) countMini.textContent = cart.length;
    document.getElementById('sp-cart-total').textContent = total.toLocaleString();
    const remEl = document.getElementById('sp-budget-rem');
    remEl.textContent = rem.toLocaleString() + ' pt';
    remEl.className   = 'sp-budget-rem' + (rem < 0 ? ' over' : '');

    const detail = document.getElementById('sp-cart-detail');
    if (!cart.length) {
        detail.innerHTML = '<div style="padding:12px 14px;color:#888;font-size:.82rem;">買い目がありません</div>';
        return;
    }
    detail.innerHTML = cart.map(item => {
        const isMulti = item.combs.length > 1;
        const expandBtns = isMulti ? `
            <div style="display:flex;gap:4px;margin-top:4px;">
                <button class="sp-cart-sub-btn" onclick="expandBet(${item.id})">展開</button>
                <button class="sp-cart-sub-btn" onclick="openExpandBudgetNumpad(${item.id})">予算分配</button>
            </div>` : '';
        return `
        <div class="sp-cart-item">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                <span class="sp-cart-item-type">${item.displayType}</span>
                <span class="sp-cart-item-comb">${item.formation}${isMulti ? ` (${item.combs.length}点)` : ''}</span>
            </div>
            <span class="sp-cart-item-amt" onclick="spOpenNumpad(${item.id})">[${item.amountPerBet / 100}]00pt</span>
            <button class="sp-cart-item-del" onclick="removeFromCart(${item.id})">✕</button>
            ${expandBtns}
        </div>`;
    }).join('');
}

function spToggleCart() {
    const wrap = document.getElementById('sp-cart-wrap');
    // 最小化状態ならまず解除（バータップで通常に戻す）
    if (wrap && wrap.classList.contains('minimized')) {
        wrap.classList.remove('minimized');
        const mb = document.getElementById('sp-minimize-btn');
        if (mb) mb.textContent = '最小化';
        return;
    }
    spCartOpen = !spCartOpen;
    document.getElementById('sp-cart-detail').classList.toggle('open', spCartOpen);
    document.getElementById('sp-cart-toggle').textContent = spCartOpen ? '▼ 閉じる' : '▲ 開く';
}

// カートを最小化（細いバーのみ表示）
function spToggleMinimize() {
    const wrap = document.getElementById('sp-cart-wrap');
    if (!wrap) return;
    wrap.classList.add('minimized');
    spCartOpen = false;
    document.getElementById('sp-cart-detail').classList.remove('open');
    const tg = document.getElementById('sp-cart-toggle');
    if (tg) tg.textContent = '▲ 開く';
    const countMini = document.getElementById('sp-cart-count-mini');
    if (countMini) countMini.textContent = cart.length;
}

async function spClearCart() {
    await clearCart();
}

// テンキーは cart.js の npConfirm 内で spRenderCart を呼ぶため、ここでは開くだけ
function spOpenNumpad(id) {
    openNumpad(id);
}
