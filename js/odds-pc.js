// odds-pc.js — PC版オッズUI（タブ・マークシート・オッズ描画）

let currentType = 'win-place';
let voteMode    = 'formation';
let sortMode    = 'num';
let filterMode  = false;
let msRows      = [new Set(), new Set(), new Set()];
const msState   = {};

// ── タブ切り替え ─────────────────────────────────────

function switchTab(type, el) {
    document.querySelectorAll('.tab-menu li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');
    currentType = type;
    filterMode  = false;

    msState[type] = { voteMode: 'formation', rows: [new Set(), new Set(), new Set()] };
    voteMode = 'formation';
    msRows   = msState[type].rows;

    const modeBar  = document.getElementById('vote-mode-bar');
    const msArea   = document.getElementById('marksheet-area');
    const axis1Btn = document.getElementById('btn-axis1');
    const axis2Btn = document.getElementById('btn-axis2');

    if (type === 'win-place') {
        modeBar.classList.add('hidden');
        msArea.classList.add('hidden');
    } else {
        modeBar.classList.remove('hidden');
        msArea.classList.remove('hidden');
        axis1Btn.style.display = (type === 'exacta' || type === 'trifecta') ? '' : 'none';
        axis2Btn.style.display = (type === 'trifecta') ? '' : 'none';
        resetVoteModeButtons('formation');
        buildMsRows();
        updateMsCombCount();
    }
    render();
}

function resetVoteModeButtons(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`[data-mode="${mode}"]`);
    if (target) target.classList.add('active');
}

function switchVoteMode(mode, el) {
    voteMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    msRows = [new Set(), new Set(), new Set()];
    const st = getCurrentMsState();
    st.voteMode = mode;
    st.rows     = msRows;
    buildMsRows();
    updateMsCombCount();
}

function getCurrentMsState() {
    if (!msState[currentType]) {
        msState[currentType] = { voteMode: 'formation', rows: [new Set(), new Set(), new Set()] };
    }
    return msState[currentType];
}

// ── マークシート ─────────────────────────────────────

function initMsHeader() {
    const hNum = document.getElementById('ms-head-nums');
    const hTag = document.getElementById('ms-head-tags');
    teams.forEach((tm, i) => {
        hNum.innerHTML += `<td class="course_num">${i + 1}</td>`;
        hTag.innerHTML += `<td style="font-size:.7em;">${tm.tag}</td>`;
    });
    hNum.innerHTML += `<td colspan="2">操作</td>`;
    hTag.innerHTML += `<td colspan="2"></td>`;
}

function buildMsRows() {
    const body    = document.getElementById('ms-body');
    const rowDefs = getMsRowDefs(currentType, voteMode);
    body.innerHTML = '';
    rowDefs.forEach((def, ri) => {
        let html = `<tr><th class="ms-row-label">${def.label}</th>`;
        teams.forEach((_, ci) => {
            const num      = ci + 1;
            const isMarked = msRows[ri].has(num);
            let cls = 'ms-cell';
            if (isMarked) {
                if (ri === 0 && (voteMode === 'axis1' || voteMode === 'axis2')) cls = 'ms-cell axis1';
                else if (ri === 1 && voteMode === 'axis2') cls = 'ms-cell axis2';
                else cls = 'ms-cell marked';
            }
            html += `<td class="${cls}" onclick="toggleMs(${ri},${num})">${num}</td>`;
        });
        html += `<td><input type="button" value="全" class="all_button" onclick="bulkMs(${ri},true)"></td>`;
        html += `<td><input type="button" value="消" class="all_button" onclick="bulkMs(${ri},false)"></td>`;
        html += `</tr>`;
        body.innerHTML += html;
    });
    document.getElementById('ms-hint').innerText = getMsHint(voteMode, currentType);
}

function toggleMs(ri, num) {
    if (msRows[ri].has(num)) {
        msRows[ri].delete(num);
    } else {
        if (voteMode === 'axis1' && ri === 0) msRows[0].clear();
        if (voteMode === 'axis2' && ri === 0 && msRows[0].size >= 2) return;
        msRows[ri].add(num);
    }
    getCurrentMsState().rows = msRows;
    buildMsRows();
    updateMsCombCount();
}

function bulkMs(ri, val) {
    if (val) teams.forEach((_, i) => msRows[ri].add(i + 1));
    else     msRows[ri].clear();
    getCurrentMsState().rows = msRows;
    buildMsRows();
    updateMsCombCount();
}

function updateMsCombCount() {
    document.getElementById('ms-comb-count').innerText = getMsCombinations().length;
}

function getMsCombinations() {
    return calcCombinations(currentType, voteMode, msRows);
}

async function applyMarksheet() {
    filterMode = getMsCombinations().length > 0;
    render();
}

async function setMarksheet() {
    const combs = getMsCombinations();
    if (combs.length === 0) return await psAlert('買い目を選択してください');

    const modeNames  = { formation: 'フォーメーション', box: 'ボックス', axis1: '1チーム軸マルチ', axis2: '2チーム軸マルチ' };
    const displayType = document.querySelector('.tab-menu li.active').innerText;
    let formationStr  = '';
    if (voteMode === 'formation') {
        formationStr = getMsRowDefs(currentType, voteMode)
            .map((_, ri) => [...msRows[ri]].join(','))
            .join(' - ');
    } else if (voteMode === 'box') {
        formationStr = `BOX[${[...msRows[0]].join(',')}]`;
    } else if (voteMode === 'axis1') {
        formationStr = `軸${[...msRows[0]][0]} - 相手[${[...msRows[1]].join(',')}]`;
    } else if (voteMode === 'axis2') {
        formationStr = `軸[${[...msRows[0]].join(',')}] - 相手[${[...msRows[1]].join(',')}]`;
    }

    addToCart({
        displayType: `${displayType}(${modeNames[voteMode]})`,
        type: currentType,
        formation: formationStr,
        combs,
        amountPerBet: 100,
    });
    renderAllCarts();
    document.getElementById('bet-management').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── ソート ───────────────────────────────────────────

function setSortMode(mode) {
    sortMode = mode;
    document.getElementById('btn-num').className = `sort-btn ${mode === 'num' ? 'active' : ''}`;
    document.getElementById('btn-pop').className = `sort-btn ${mode === 'pop' ? 'active' : ''}`;
    render();
}

// ── オッズ描画 ───────────────────────────────────────

function render() {
    const container = document.getElementById('main-view');
    container.innerHTML = '';
    if (currentType === 'win-place') { renderWinPlace(); return; }

    const activeCombs = filterMode ? getMsCombinations() : Object.keys(oddsData[currentType] || {});
    let dataArr = activeCombs.map(key => {
        const val = (oddsData[currentType] || {})[key] || '---';
        return { key, val, sortVal: parseFloat(val.split('-')[0]) || 99999 };
    });

    if (sortMode === 'pop') {
        dataArr.sort((a, b) => a.sortVal - b.sortVal);
    } else {
        dataArr.sort((a, b) => {
            const ak = a.key.split('-').map(n => n.padStart(2, '0')).join('');
            const bk = b.key.split('-').map(n => n.padStart(2, '0')).join('');
            return ak.localeCompare(bk);
        });
    }

    let html = `<div class="list-wrapper"><table class="list-table odds-list">
        <thead><tr><th class="col-comb">組合せ</th><th class="col-odds">オッズ</th></tr></thead><tbody>`;
    dataArr.forEach(d => {
        html += `<tr class="odds_row" data-comb="${d.key}">
            <td class="col-comb">${d.key}</td>
            <td class="col-odds odds-val ${getOddsClass(d.val, currentType)}" data-clickable="1">${d.val}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table></div>`;
}

function renderWinPlace() {
    const container = document.getElementById('main-view');
    let list = teams.map((t, i) => ({
        no: i + 1, tag: t.name,
        win:   (oddsData.win   || {})[i + 1],
        place: (oddsData.place || {})[i + 1],
    }));
    if (sortMode === 'pop') list.sort((a, b) => parseFloat(a.win) - parseFloat(b.win));
    let html = `<table class="list-table"><thead><tr><th>番号</th><th>チーム</th><th>単勝</th><th>複勝</th></tr></thead><tbody>`;
    list.forEach(item => {
        html += `<tr class="odds_row" data-no="${item.no}">
            <td>${item.no}</td><td>${item.tag}</td>
            <td class="odds-val ${getOddsClass(item.win,   'win-place')}" data-bet-type="win">${item.win   || '---'}</td>
            <td class="odds-val ${getOddsClass(item.place, 'win-place')}" data-bet-type="place">${item.place || '---'}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

// ── クリックでカートへ ───────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('main-view').addEventListener('click', function (e) {
        const row = e.target.closest('tr.odds_row');
        if (!row) return;
        let combKey, betType, displayType;

        if (currentType === 'win-place') {
            const cell = e.target.closest('td[data-bet-type]');
            if (!cell) return;
            betType     = cell.dataset.betType;
            combKey     = row.dataset.no;
            displayType = betType === 'win' ? '単勝' : '複勝';
        } else {
            const cell = e.target.closest('td[data-clickable]');
            if (!cell) return;
            combKey     = row.dataset.comb;
            betType     = currentType;
            displayType = document.querySelector('.tab-menu li.active').innerText;
            if (!combKey) return;
        }

        addToCart({ displayType, type: betType, formation: combKey, combs: [combKey], amountPerBet: 100 });
        renderAllCarts();
        document.getElementById('bet-management').scrollIntoView({ behavior: 'smooth', block: 'start' });

        row.style.transition = 'none';
        row.style.backgroundColor = '#ffe082';
        setTimeout(() => { row.style.transition = 'background 0.4s'; row.style.backgroundColor = ''; }, 150);
    });
});

// ── チームヘッダー ───────────────────────────────────

function renderTeamHeader() {
    const table = document.getElementById('teamHeader');
    let h = '<tr>', t = '<tr>';
    teams.forEach((tm, i) => {
        h += `<th>${i + 1}</th>`;
        t += `<td><img src="${tm.logo}" class="team-logo" alt="${tm.tag}"><br>${tm.tag}</td>`;
    });
    table.innerHTML = h + '</tr>' + t + '</tr>';
}
