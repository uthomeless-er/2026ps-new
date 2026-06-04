// cart.js — カート管理・テンキー・予算分配
// 依存: common.js（CART_STORAGE_KEY）
//       utils.js（getOddsMidpoint, calcExpectedReturn, calcCartTotal）
//       odds-init.js で宣言される oddsData グローバル変数
//       psAlert / psConfirm（dialog.js など別途定義）
// cart.js — カート管理・テンキー・予算分配
// BUDGET_LIMIT は common.js で宣言済み

let cart       = [];
let _idCounter = 1;

function genId() { return _idCounter++; }

// ── 永続化 ───────────────────────────────────────────

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadCart() {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
            cart = JSON.parse(saved);
            const maxId = cart.reduce((m, i) => Math.max(m, i.id || 0), 0);
            _idCounter = maxId + 1;
        }
    } catch (e) {
        cart = [];
    }
}

// ── カート操作 ───────────────────────────────────────

function addToCart(item) {
    cart.push({ id: genId(), ...item });
    saveCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderAllCarts();
}

async function clearCart() {
    const ok = await psConfirm('買い目をすべて削除します。よろしいですか？');
    if (!ok) return;
    cart = [];
    saveCart();
    renderAllCarts();
}

function expandBet(id) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const idx = cart.findIndex(i => i.id === id);
    const expanded = item.combs.map(ck => ({
        id: genId(),
        displayType: item.displayType,
        type: item.type,
        formation: ck,
        combs: [ck],
        amountPerBet: item.amountPerBet,
    }));
    cart.splice(idx, 1, ...expanded);
    saveCart();
    renderAllCarts();
}

async function expandWithBudget(id, budget) {
    const item = cart.find(i => i.id === id);
    if (!item || item.combs.length === 0) return;

    const otherTotal = cart
        .filter(i => i.id !== id)
        .reduce((s, i) => s + i.combs.length * i.amountPerBet, 0);

    if (otherTotal + budget > BUDGET_LIMIT) {
        await psAlert(`予算超過：残り利用可能は ${(BUDGET_LIMIT - otherTotal).toLocaleString()} pt です`);
        return;
    }

    const typeKey  = item.type;
    const combOdds = item.combs.map(ck => {
        const oddsStr = oddsData[typeKey] ? oddsData[typeKey][ck] : null;
        return { ck, mid: oddsStr ? (getOddsMidpoint(oddsStr) || 1) : 1 };
    });

    const minTotal = item.combs.length * 100;
    if (minTotal > budget) {
        await psAlert(
            `点数が多すぎて予算内に収まりません。予算を増やすか、買い目を減らしてください。\n` +
            `（最低必要: ${minTotal.toLocaleString()}pt / 設定予算: ${budget.toLocaleString()}pt）`
        );
        return;
    }

    // 全点に最低100ptを配分し、残りを払い戻し均一になるよう追加
    const amounts  = combOdds.map(() => 100);
    let remainder  = budget - minTotal;
    while (remainder >= 100) {
        const returns = amounts.map((amt, i) => amt * combOdds[i].mid);
        const minIdx  = returns.indexOf(Math.min(...returns));
        amounts[minIdx] += 100;
        remainder -= 100;
    }

    const idx      = cart.findIndex(i => i.id === id);
    const newItems = combOdds.map((c, i) => ({
        id: genId(),
        displayType: item.displayType,
        type: item.type,
        formation: c.ck,
        combs: [c.ck],
        amountPerBet: amounts[i],
    }));
    cart.splice(idx, 1, ...newItems);
    saveCart();
    renderAllCarts();
}

// ── PC版カート描画 ───────────────────────────────────

function renderCart() {
    const tbody = document.getElementById('cart-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:#999;">買い目がありません</td></tr>';
        updateTotal();
        return;
    }

    cart.forEach(item => {
        const isSingle = item.combs.length === 1;
        const oddsVal  = isSingle && oddsData[item.type]
            ? (oddsData[item.type][item.combs[0]] || '---')
            : null;
        const oddsInfo  = oddsVal ? `<br><span style="color:#d00;font-size:.8em;">オッズ: ${oddsVal}</span>` : '';
        const ret       = isSingle ? calcExpectedReturn(item, oddsData) : null;
        const retInfo   = isSingle
            ? `<br><span id="ret-${item.id}" style="color:#007d43;font-size:.8em;">${ret !== null ? '想定払戻: ' + ret.toLocaleString() + ' pt' : ''}</span>`
            : '';
        const n = item.amountPerBet / 100;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">${item.displayType}</td>
            <td style="font-family:monospace;">${item.formation}${oddsInfo}${retInfo}</td>
            <td>${item.combs.length}点</td>
            <td><span class="pt-display" onclick="openNumpad(${item.id})">[<span class="pt-n" id="pt-n-${item.id}">${n}</span>]<span class="pt-fixed">00 pt</span></span></td>
            <td>
                ${!isSingle ? `<button class="btn-expand" onclick="expandBet(${item.id})">展開</button> <button class="btn-expand-budget" onclick="openExpandBudgetNumpad(${item.id})">予算分配して展開</button> ` : ''}
                <button class="btn-delete" onclick="removeFromCart(${item.id})">削除</button>
            </td>`;
        tbody.appendChild(tr);
    });
    updateTotal();
}

function updateTotal() {
    const total = calcCartTotal(cart);
    const el    = document.getElementById('total-bet-amount');
    const rem   = document.getElementById('remaining-budget');
    if (el)  el.innerText   = total.toLocaleString();
    if (rem) {
        rem.innerText   = (BUDGET_LIMIT - total).toLocaleString();
        rem.style.color = (BUDGET_LIMIT - total) < 0 ? 'red' : 'white';
    }
}

// PC・SP両方を再描画するヘルパー
function renderAllCarts() {
    renderCart();
    spRenderCart();
}

// ── テンキー ─────────────────────────────────────────

let npTargetId = null;
let npExpandId = null;
let npBuffer   = '';
let npMode     = 'amount';

function openNumpad(id) {
    npTargetId = id;
    npExpandId = null;
    npMode     = 'amount';
    npBuffer   = '';
    document.getElementById('numpad-label').textContent = '× 100 pt で入力してください';
    updateNumpadPreview();
    document.getElementById('numpad-overlay').classList.remove('hidden');
}

function openExpandBudgetNumpad(id) {
    npExpandId = id;
    npTargetId = null;
    npMode     = 'expand-budget';
    npBuffer   = '';
    document.getElementById('numpad-label').textContent = '配分予算を × 100 pt で入力';
    updateNumpadPreview();
    document.getElementById('numpad-overlay').classList.remove('hidden');
}

function closeNumpad(e) {
    if (e && e.target !== document.getElementById('numpad-overlay')) return;
    _closeNumpadCleanup();
}

function _closeNumpadCleanup() {
    document.getElementById('numpad-overlay').classList.add('hidden');
    npTargetId = null;
    npBuffer   = '';
    npMode     = 'amount';
    npExpandId = null;
}

function updateNumpadPreview() {
    const n = npBuffer || '0';
    document.getElementById('numpad-preview').innerHTML =
        `[<span style="color:var(--jra-blue)">${n}</span>]<span style="font-size:.75em;color:#666">00 pt</span>` +
        `<br><span style="font-size:.6em;color:#aaa">= ${(parseInt(n) || 0) * 100} pt</span>`;
}

function npInput(digit) {
    if (npBuffer === '0') npBuffer = '';
    if (npBuffer.length >= 4) return;
    npBuffer += String(digit);
    updateNumpadPreview();
}

function npBack()  { npBuffer = npBuffer.slice(0, -1); updateNumpadPreview(); }
function npClear() { npBuffer = ''; updateNumpadPreview(); }

function npConfirm() {
    const n = Math.max(1, parseInt(npBuffer) || 1);
    if (npMode === 'expand-budget') {
        expandWithBudget(npExpandId, n * 100);
    } else if (npTargetId !== null) {
        const item = cart.find(i => i.id === npTargetId);
        if (item) {
            item.amountPerBet = n * 100;
            const elN   = document.getElementById(`pt-n-${npTargetId}`);
            const elRet = document.getElementById(`ret-${npTargetId}`);
            if (elN)   elN.innerText = n;
            if (elRet) {
                const ret = calcExpectedReturn(item, oddsData);
                elRet.textContent = ret !== null ? `想定払戻: ${ret.toLocaleString()} pt` : '';
            }
            updateTotal();
            saveCart();
            spRenderCart();
        }
    }
    _closeNumpadCleanup();
}

// ── フォームエクスポート ─────────────────────────────

async function prepareGoogleForm() {
    if (cart.length === 0) return await psAlert('買い目がありません');
    let exportData = '【Premier Series 26-27 買い目】\n';
    cart.forEach(item => {
        exportData += `[${item.displayType}] ${item.formation} / ${item.combs.length}点 / 各${item.amountPerBet}pt / 計${item.combs.length * item.amountPerBet}pt\n`;
    });
    exportData += `------------------\n合計: ${calcCartTotal(cart).toLocaleString()}pt`;
    document.getElementById('form-data-text').value = exportData;
    document.getElementById('copy-feedback').style.display = 'none';
    document.getElementById('btn-copy').textContent = '📋 コピーする';
    document.getElementById('form-export-area').classList.remove('hidden');
}

async function copyFormData() {
    const text = document.getElementById('form-data-text').value;
    if (!text) return;
    const onSuccess = () => {
        const fb  = document.getElementById('copy-feedback');
        const btn = document.getElementById('btn-copy');
        fb.style.display = 'inline';
        btn.textContent  = '✔ コピー済み';
        setTimeout(() => { fb.style.display = 'none'; btn.textContent = '📋 コピーする'; }, 3000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
    } else {
        fallbackCopy(text, onSuccess);
    }
}

async function fallbackCopy(text, onSuccess) {
    const ta = document.getElementById('form-data-text');
    ta.removeAttribute('readonly');
    ta.focus();
    ta.select();
    try {
        if (document.execCommand('copy')) onSuccess();
        else await psAlert('コピーできませんでした。手動で選択してコピーしてください。');
    } catch (e) {
        await psAlert('コピーできませんでした。手動で選択してコピーしてください。');
    }
    ta.setAttribute('readonly', '');
}
