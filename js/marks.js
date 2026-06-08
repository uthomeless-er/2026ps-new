// marks.js — 印管理・PC/SP同期・フォーメーション遷移
// 依存: common.js（CART_STORAGE_KEY, MY_MARKS_KEY, psAlert, psConfirm, loadJSON）

document.addEventListener('DOMContentLoaded', function(){ renderLayout(); });

const UNIQUE_MARKS  = ['honmei','taikou','tanana','renka'];
const MARK_OPTIONS  = [
    { value:'',       label:'なし' },
    { value:'honmei', label:'◎ 本命' },
    { value:'taikou', label:'○ 対抗' },
    { value:'tanana', label:'▲ 単穴' },
    { value:'renka',  label:'⟁ 連下' },
    { value:'osae',   label:'△ 抑え' },
];
const MARK_LABELS    = { honmei:'◎', taikou:'○', tanana:'▲', renka:'⟁', osae:'△' };
const MARK_LABELS_JP = { honmei:'◎本命', taikou:'○対抗', tanana:'▲単穴', renka:'⟁連下', osae:'△抑え' };
const MARK_ORDER     = ['honmei','taikou','tanana','renka','osae'];
const FRAME_COLORS   = {
    1:{ bg:'#f0f0f0', text:'#111' }, 2:{ bg:'#111', text:'#fff' },
    3:{ bg:'#cc2200', text:'#fff' }, 4:{ bg:'#1a4fd6', text:'#fff' },
    5:{ bg:'#d4a000', text:'#111' }, 6:{ bg:'#1a7a3a', text:'#fff' },
    7:{ bg:'#d06000', text:'#fff' }, 8:{ bg:'#c0357a', text:'#fff' },
};

let teamsData     = [];
let selectedMarks = JSON.parse(localStorage.getItem(MY_MARKS_KEY) || '{}');
let imageMode     = 'honmei';
let logoCache     = {};

window.addEventListener('DOMContentLoaded', async () => {
    try {
        teamsData = await loadJSON('data/teams.json');
        renderPCTable();
        renderSPList();
        updateFormationPreview();
        await preloadLogos();
        drawCanvas();
    } catch(e) {}
});

/* ── PC: テーブル描画 ── */
function renderPCTable() {
    const table = document.getElementById('marks-table');
    table.innerHTML = '';
    const labelCol = document.createElement('div'); labelCol.className = 'label-col';
    [{ cls:'row-num',text:'番号'},{ cls:'row-logo',text:''},{ cls:'row-name',text:'チーム名'},{ cls:'row-select',text:'印'}].forEach(d => {
        const w = document.createElement('div'); w.className = d.cls;
        const c = document.createElement('div'); c.className = 'cell'; c.textContent = d.text;
        w.appendChild(c); labelCol.appendChild(w);
    });
    table.appendChild(labelCol);
    teamsData.forEach(team => {
        const col = document.createElement('div'); col.className = `team-col frame-${team.id}`;
        addCell(col, 'row-num', String(team.id));
        const lw = document.createElement('div'); lw.className = 'row-logo';
        const lc = document.createElement('div'); lc.className = 'cell';
        const img = document.createElement('img'); img.src = team.logo; img.alt = team.tag;
        img.onerror = () => { const p = document.createElement('div'); p.className = 'logo-placeholder'; p.textContent = team.tag; lc.replaceChild(p, img); };
        lc.appendChild(img); lw.appendChild(lc); col.appendChild(lw);
        addCell(col, 'row-name', team.name);
        const sw = document.createElement('div'); sw.className = 'row-select';
        const sc = document.createElement('div'); sc.className = 'cell';
        const sel = document.createElement('select'); sel.className = 'mark-select'; sel.id = `mark-${team.id}`;
        MARK_OPTIONS.forEach(opt => { const o = document.createElement('option'); o.value = opt.value; o.textContent = opt.label; sel.appendChild(o); });
        const saved = selectedMarks[String(team.id)] || ''; sel.value = saved; updateSelectStyle(sel, saved);
        sel.addEventListener('change', () => onMarkChange(team.id, sel.value));
        sc.appendChild(sel); sw.appendChild(sc); col.appendChild(sw);
        table.appendChild(col);
    });
}

/* ── SP: カードリスト描画 ── */
function renderSPList() {
    const list = document.getElementById('sp-marks-list');
    list.innerHTML = '';
    teamsData.forEach(team => {
        const saved = selectedMarks[String(team.id)] || '';
        const card = document.createElement('div');
        card.className = 'sp-mark-card';
        const opts = MARK_OPTIONS.map(o =>
            `<option value="${o.value}" ${saved===o.value?'selected':''}>${o.label}</option>`
        ).join('');
        card.innerHTML = `
            <div class="sp-frame-badge sp-frame-${team.id}">${team.id}</div>
            <div class="sp-mark-logo">
                <img src="${team.logo}" alt="${team.tag}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div class="sp-mark-logo-ph" style="display:none">${team.tag}</div>
            </div>
            <div class="sp-mark-info">
                <div class="sp-mark-name">${team.name}</div>
                <select class="sp-mark-select${saved ? ' sel-'+saved : ''}" id="sp-sel-${team.id}">
                    ${opts}
                </select>
            </div>`;
        card.querySelector('select').addEventListener('change', function() {
            onMarkChange(team.id, this.value);
            // セレクトの色も更新
            this.className = 'sp-mark-select' + (this.value ? ' sel-'+this.value : '');
            // 他チームのセレクトも更新（排他制御）
            teamsData.forEach(t => {
                const sel = document.getElementById('sp-sel-'+t.id);
                if (sel) sel.className = 'sp-mark-select' + (sel.value ? ' sel-'+sel.value : '');
            });
        });
        list.appendChild(card);
    });
}

function refreshSPBtns(teamId) {
    const saved = selectedMarks[String(teamId)] || '';
    const btns = document.querySelectorAll(`#sp-btns-${teamId} .sp-mark-btn`);
    btns.forEach(btn => {
        const val = btn.dataset.val;
        btn.className = 'sp-mark-btn';
        if (val === '') {
            btn.classList.add('none-btn');
            if (!saved) btn.classList.add('active-none');
        } else {
            if (saved === val) btn.classList.add('active-' + val);
        }
    });
    // 他のチームのbtnsも更新（排他制御のため）
    teamsData.forEach(t => {
        if (t.id === teamId) return;
        const otherSaved = selectedMarks[String(t.id)] || '';
        const otherBtns = document.querySelectorAll(`#sp-btns-${t.id} .sp-mark-btn`);
        otherBtns.forEach(btn => {
            const val = btn.dataset.val;
            btn.className = 'sp-mark-btn';
            if (val === '') {
                btn.classList.add('none-btn');
                if (!otherSaved) btn.classList.add('active-none');
            } else {
                if (otherSaved === val) btn.classList.add('active-' + val);
            }
        });
    });
}

function addCell(col, cls, text) {
    const w = document.createElement('div'); w.className = cls;
    const c = document.createElement('div'); c.className = 'cell'; c.textContent = text;
    w.appendChild(c); col.appendChild(w);
}

function onMarkChange(teamId, val) {
    if (val && UNIQUE_MARKS.includes(val)) {
        Object.keys(selectedMarks).forEach(id => {
            if (String(id) !== String(teamId) && selectedMarks[id] === val) {
                selectedMarks[id] = '';
                const sel = document.getElementById(`mark-${id}`);
                if (sel) { sel.value = ''; updateSelectStyle(sel, ''); }
            }
        });
    }
    selectedMarks[String(teamId)] = val;
    // PC版セレクト更新
    const sel = document.getElementById(`mark-${teamId}`);
    if (sel) { sel.value = val; updateSelectStyle(sel, val); }
    // SP版セレクト更新
    const spSel = document.getElementById(`sp-sel-${teamId}`);
    if (spSel) {
        spSel.value = val;
        spSel.className = 'sp-mark-select' + (val ? ' sel-' + val : '');
    }
    // 排他制御: 他のSP版セレクトも更新
    if (val && ['honmei','taikou','tanana','renka'].includes(val)) {
        Object.keys(selectedMarks).forEach(id => {
            if (String(id) !== String(teamId)) {
                const otherSpSel = document.getElementById(`sp-sel-${id}`);
                if (otherSpSel && otherSpSel.value === val) {
                    otherSpSel.value = '';
                    otherSpSel.className = 'sp-mark-select';
                }
            }
        });
    }
    saveMarks();
    updateFormationPreview();
    drawCanvas();
}

function updateSelectStyle(sel, val) {
    sel.className = 'mark-select';
    if (val) sel.classList.add(`sel-${val}`);
}

function saveMarks() {
    localStorage.setItem(MY_MARKS_KEY, JSON.stringify(selectedMarks));
    const st = document.getElementById('save-status');
    if (st) { st.style.display = 'inline'; setTimeout(() => { st.style.display = 'none'; }, 2000); }
}

async function resetMarks() {
    const ok = await psConfirm('印をすべてリセットします。よろしいですか？'); if (!ok) return;
    selectedMarks = {};
    localStorage.setItem(MY_MARKS_KEY, JSON.stringify(selectedMarks));
    teamsData.forEach(t => {
        const s = document.getElementById(`mark-${t.id}`);
        if (s) { s.value = ''; updateSelectStyle(s, ''); }
    });
    renderSPList();
    updateFormationPreview();
    drawCanvas();
}

/* ── フォーメーション ── */
const MARK_GROUP = {
    honmei:['honmei'], honmei_taikou:['honmei','taikou'],
    honmei_taikou_tanana:['honmei','taikou','tanana'],
    taikou:['taikou'], taikou_tanana:['taikou','tanana'],
    taikou_tanana_renka:['taikou','tanana','renka'],
    taikou_tanana_renka_osae:['taikou','tanana','renka','osae'],
    tanana:['tanana'], tanana_renka:['tanana','renka'],
    tanana_renka_osae:['tanana','renka','osae'],
    all_marked:['honmei','taikou','tanana','renka','osae'],
};

function getTeamsByMarkGroup(gk) {
    if (gk === 'all_marked') return teamsData.map(t => t.id).sort((a,b) => a-b);
    return Object.entries(selectedMarks)
        .filter(([,v]) => (MARK_GROUP[gk]||[]).includes(v))
        .map(([id]) => parseInt(id)).sort((a,b) => a-b);
}

function updateFormationPreview() {
    const type = document.getElementById('f-type').value;
    const is3 = (type === 'trio' || type === 'trifecta');
    document.getElementById('f-row2-wrap').style.display = is3 ? '' : 'none';
    const r0 = getTeamsByMarkGroup(document.getElementById('f-row0').value);
    const r1 = getTeamsByMarkGroup(document.getElementById('f-row1').value);
    const r2 = getTeamsByMarkGroup(document.getElementById('f-row2').value);
    const prev = document.getElementById('f-preview');
    if (!r0.length && !r1.length) { prev.textContent = '印を付けるとプレビューが表示されます'; return; }
    let txt = `1列目: [${r0.join(',') || 'なし'}]　2列目: [${r1.join(',') || 'なし'}]`;
    if (is3) txt += `　3列目: [${r2.join(',') || 'なし'}]`;
    prev.textContent = txt;
}

async function goToOddsWithFormation() {
    const type = document.getElementById('f-type').value;
    const r0 = getTeamsByMarkGroup(document.getElementById('f-row0').value);
    const r1 = getTeamsByMarkGroup(document.getElementById('f-row1').value);
    const r2 = getTeamsByMarkGroup(document.getElementById('f-row2').value);
    if (!r0.length) { await psAlert('1列目に該当するチームがありません。先に印を付けてください。'); return; }
    const p = new URLSearchParams({ tab: type, mode: 'formation', r0: r0.join(','), r1: r1.join(','), r2: r2.join(',') });
    p.append('apply', '1');
    window.location.href = `odds.html?${p.toString()}`;
}

/* ── Canvas ── */
async function preloadLogos() {
    await Promise.all(teamsData.map(team => new Promise(resolve => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { logoCache[team.id] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = team.logo;
    })));
}

function switchImageMode(mode, btn) {
    imageMode = mode;
    document.querySelectorAll('.image-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    drawCanvas();
}

function drawCanvas() {
    if (imageMode === 'honmei') drawHonmeiCanvas();
    else drawAllMarksCanvas();
    updateTweetText();
}

function drawHonmeiCanvas() {
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const hEntry = Object.entries(selectedMarks).find(([,v]) => v === 'honmei');
    const noMsg = document.getElementById('no-honmei-msg');
    if (!hEntry) { noMsg.style.display = ''; canvas.style.display = 'none'; return; }
    noMsg.style.display = 'none'; canvas.style.display = 'block';
    const honmeiId = parseInt(hEntry[0]);
    const team = teamsData.find(t => t.id === honmeiId);
    const frame = FRAME_COLORS[honmeiId] || { bg: '#003399', text: '#fff' };
    const W = 1120, H = 630; canvas.width = W; canvas.height = H;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W-4, H-4);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, W-28, H-28);
    const BAND_H = 56;
    ctx.fillStyle = '#003399'; ctx.fillRect(2, 2, W-4, BAND_H);
    ctx.save();
    ctx.font = 'bold 26px "Helvetica Neue",Arial,sans-serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Premier Series 26-27 予想企画', W/2, 2+BAND_H/2);
    ctx.restore();
    const CY = (BAND_H + H) / 2 + 10;
    const MARK_X = 56, FRAME_X = 160, FRAME_W = 112, FRAME_H = 112, LOGO_X = 296, LOGO_S = 160, NAME_X = 484;
    ctx.save();
    ctx.font = 'bold 120px serif'; ctx.fillStyle = '#cc0000';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('◎', MARK_X+36, CY);
    ctx.restore();
    const by = CY - FRAME_H/2;
    ctx.fillStyle = frame.bg; ctx.fillRect(FRAME_X, by, FRAME_W, FRAME_H);
    ctx.strokeStyle = frame.bg === '#f0f0f0' ? '#bbb' : 'rgba(0,0,0,.15)';
    ctx.lineWidth = 2; ctx.strokeRect(FRAME_X, by, FRAME_W, FRAME_H);
    ctx.save();
    ctx.font = 'bold 76px "Arial Black",Arial,sans-serif';
    ctx.fillStyle = frame.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(honmeiId), FRAME_X + FRAME_W/2, CY);
    ctx.restore();
    const ly = CY - LOGO_S/2;
    if (logoCache[honmeiId]) { ctx.drawImage(logoCache[honmeiId], LOGO_X, ly, LOGO_S, LOGO_S); }
    const name = team ? (team.name || team.tag) : `チーム${honmeiId}`;
    ctx.save();
    let fs = 56;
    ctx.font = `bold ${fs}px "Helvetica Neue",Arial,sans-serif`;
    while (ctx.measureText(name).width > W - NAME_X - 32 && fs > 24) { fs -= 2; ctx.font = `bold ${fs}px "Helvetica Neue",Arial,sans-serif`; }
    ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(name, NAME_X, CY);
    ctx.restore();
}

function drawAllMarksCanvas() {
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const noMsg = document.getElementById('no-honmei-msg');
    const entries = [];
    MARK_ORDER.forEach(mk => {
        Object.entries(selectedMarks)
            .filter(([,v]) => v === mk)
            .sort(([a],[b]) => parseInt(a)-parseInt(b))
            .forEach(([tid]) => entries.push({ mk, tid: parseInt(tid) }));
    });
    if (!entries.length) { noMsg.style.display = ''; canvas.style.display = 'none'; return; }
    noMsg.style.display = 'none'; canvas.style.display = 'block';
    const W = 1120, H = 630; canvas.width = W; canvas.height = H;
    const BAND_H = 56, FOOTER_H = 44;
    const CONTENT_H = H - BAND_H - FOOTER_H;
    const ROW_H = Math.floor(CONTENT_H / Math.max(entries.length, 1));
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W-4, H-4);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, W-28, H-28);
    ctx.fillStyle = '#003399'; ctx.fillRect(2, 2, W-4, BAND_H);
    ctx.save();
    ctx.font = 'bold 26px "Helvetica Neue",Arial,sans-serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Premier Series 26-27 予想企画', W/2, 2+BAND_H/2);
    ctx.restore();
    entries.forEach(({ mk, tid }, i) => {
        const team = teamsData.find(t => t.id === tid);
        const frame = FRAME_COLORS[tid] || { bg: '#003399', text: '#fff' };
        const y = BAND_H + i * ROW_H;
        const midY = y + ROW_H/2;
        if (i % 2 === 0) { ctx.fillStyle = '#f8f8f8'; ctx.fillRect(18, y+2, W-36, ROW_H-4); }
        const markFs = Math.min(44, ROW_H * 0.55);
        ctx.save();
        ctx.font = `bold ${markFs}px serif`; ctx.fillStyle = '#333';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(MARK_LABELS[mk], 60, midY);
        ctx.restore();
        const bside = Math.min(48, ROW_H * 0.6);
        const bx = 96, bby = midY - bside/2;
        ctx.fillStyle = frame.bg; ctx.fillRect(bx, bby, bside, bside);
        ctx.strokeStyle = frame.bg === '#f0f0f0' ? '#bbb' : 'rgba(0,0,0,.1)';
        ctx.lineWidth = 1; ctx.strokeRect(bx, bby, bside, bside);
        ctx.save();
        ctx.font = `bold ${Math.floor(bside*0.6)}px Arial,sans-serif`; ctx.fillStyle = frame.text;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(tid), bx + bside/2, midY);
        ctx.restore();
        const ls = Math.min(56, ROW_H * 0.7);
        if (logoCache[tid]) { ctx.drawImage(logoCache[tid], 154, midY-ls/2, ls, ls); }
        const name = team ? (team.name || team.tag) : `チーム${tid}`;
        ctx.save();
        let fs = Math.min(30, ROW_H * 0.38);
        ctx.font = `bold ${fs}px "Helvetica Neue",Arial,sans-serif`;
        while (ctx.measureText(name).width > W - 248 && fs > 16) { fs--; ctx.font = `bold ${fs}px "Helvetica Neue",Arial,sans-serif`; }
        ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(name, 222, midY);
        ctx.restore();
        if (i < entries.length - 1) {
            ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(28, y + ROW_H); ctx.lineTo(W-28, y + ROW_H); ctx.stroke();
        }
    });
}

function updateTweetText() {
    const parts = [];
    MARK_ORDER.forEach(mk => {
        Object.entries(selectedMarks)
            .filter(([,v]) => v === mk)
            .sort(([a],[b]) => parseInt(a)-parseInt(b))
            .forEach(([tid]) => {
                const t = teamsData.find(t => String(t.id) === String(tid));
                if (t) parts.push(`${MARK_LABELS[mk]}${t.tag}`);
            });
    });
    const marksLine = parts.join(' ');
    document.getElementById('tweet-text').value = marksLine || '';
}

function saveImage() {
    const c = document.getElementById('preview-canvas');
    const a = document.createElement('a'); a.download = 'shadowverse_ps_yoso.png'; a.href = c.toDataURL('image/png'); a.click();
}

function doTweet() {
    const text = document.getElementById('tweet-text').value;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}
