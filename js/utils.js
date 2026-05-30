// utils.js — 共通ユーティリティ・組み合わせ計算

// ── 組み合わせ計算 ────────────────────────────────────
// PC版(getMsCombinations)とSP版(spGetCombinations)で
// 同じロジックが重複していたものを一本化

/**
 * マークシートの行選択から買い目の組み合わせ配列を生成する
 * @param {string} betType    - 券種 ('quinella'|'wide'|'exacta'|'trio'|'trifecta')
 * @param {string} voteMode   - 買い方 ('formation'|'box'|'axis1'|'axis2')
 * @param {number[][]} rows   - 各行の選択番号配列 [row0, row1, row2]
 * @returns {string[]}        - 組み合わせキーの配列 例: ['1-2', '1-3', ...]
 */
function calcCombinations(betType, voteMode, rows) {
    const [r0, r1, r2] = rows.map(r => [...r]);
    const is3      = (betType === 'trio' || betType === 'trifecta');
    const isExacta = (betType === 'exacta' || betType === 'trifecta');

    const uniqPair = (a, b) => [a, b].sort((x, y) => x - y).join('-');
    const uniqTrio = (a, b, c) => [a, b, c].sort((x, y) => x - y).join('-');

    // ── ボックス ──────────────────────────────────────
    if (voteMode === 'box') {
        const res = [];
        if (!isExacta) {
            const sorted = [...r0].sort((a, b) => a - b);
            for (let i = 0; i < sorted.length; i++) {
                for (let j = i + 1; j < sorted.length; j++) {
                    if (is3) {
                        for (let k = j + 1; k < sorted.length; k++) {
                            res.push(uniqTrio(sorted[i], sorted[j], sorted[k]));
                        }
                    } else {
                        res.push(uniqPair(sorted[i], sorted[j]));
                    }
                }
            }
        } else {
            r0.forEach(a => r0.forEach(b => {
                if (a === b) return;
                if (is3) {
                    r0.forEach(c => { if (c !== a && c !== b) res.push(`${a}-${b}-${c}`); });
                } else {
                    res.push(`${a}-${b}`);
                }
            }));
        }
        return res;
    }

    // ── 1チーム軸マルチ ──────────────────────────────
    if (voteMode === 'axis1') {
        const ax = r0[0];
        if (!ax) return [];
        const aite = r1.filter(x => x !== ax);
        const seen = new Set();
        const res  = [];
        if (!is3) {
            aite.forEach(b => {
                [`${ax}-${b}`, `${b}-${ax}`].forEach(k => {
                    if (!seen.has(k)) { seen.add(k); res.push(k); }
                });
            });
        } else {
            for (let i = 0; i < aite.length; i++) {
                for (let j = i + 1; j < aite.length; j++) {
                    const b = aite[i], c = aite[j];
                    [[ax,b,c],[ax,c,b],[b,ax,c],[b,c,ax],[c,ax,b],[c,b,ax]].forEach(([x,y,z]) => {
                        const k = `${x}-${y}-${z}`;
                        if (!seen.has(k)) { seen.add(k); res.push(k); }
                    });
                }
            }
        }
        return res;
    }

    // ── 2チーム軸マルチ ──────────────────────────────
    if (voteMode === 'axis2') {
        const axes = r0.slice(0, 2);
        if (axes.length < 2) return [];
        const aite = r1.filter(x => !axes.includes(x));
        if (!aite.length) return [];
        const [a1, a2] = axes;
        const seen = new Set();
        const res  = [];
        aite.forEach(c => {
            const p = [a1, a2, c];
            [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].forEach(([x,y,z]) => {
                const k = `${p[x]}-${p[y]}-${p[z]}`;
                if (!seen.has(k)) { seen.add(k); res.push(k); }
            });
        });
        return res;
    }

    // ── フォーメーション ─────────────────────────────
    const res = [];
    if (!is3) {
        r0.forEach(a => r1.forEach(b => {
            if (a === b) return;
            const key = isExacta ? `${a}-${b}` : uniqPair(a, b);
            if (!res.includes(key)) res.push(key);
        }));
    } else {
        r0.forEach(a => r1.forEach(b => r2.forEach(c => {
            if (new Set([a, b, c]).size < 3) return;
            const key = isExacta ? `${a}-${b}-${c}` : uniqTrio(a, b, c);
            if (!res.includes(key)) res.push(key);
        })));
    }
    return res;
}

// ── オッズ表示ユーティリティ ──────────────────────────

/**
 * オッズ値の文字列から中間値を返す
 * 範囲表記（例: "1.2 - 2.0"）は中間を返す
 */
function getOddsMidpoint(valStr) {
    if (!valStr || valStr === '---') return null;
    if (valStr.includes(' - ')) {
        const [lo, hi] = valStr.split(' - ').map(parseFloat);
        if (isNaN(lo) || isNaN(hi)) return null;
        return Math.floor(((lo + hi) / 2) * 10) / 10;
    }
    const v = parseFloat(valStr);
    return isNaN(v) ? null : v;
}

/**
 * オッズ値に応じたCSSクラスを返す（低オッズ＝赤、高オッズ＝青）
 */
function getOddsClass(valStr, type) {
    if (!valStr || valStr === '---') return '';
    const minVal = parseFloat(valStr.split('-')[0]);
    if (isNaN(minVal)) return '';
    const isMulti = ['quinella', 'exacta', 'trio', 'trifecta'].includes(type);
    if (isMulti) {
        if (minVal <= 100)  return 'odds-low';
        if (minVal >= 1000) return 'odds-high';
    } else {
        if (minVal <= 10)  return 'odds-low';
        if (minVal >= 100) return 'odds-high';
    }
    return '';
}

// ── マークシート行定義 ────────────────────────────────

/**
 * 券種・買い方に応じたマークシート行ラベル定義を返す
 */
function getMsRowDefs(betType, voteMode) {
    if (voteMode === 'box')   return [{ label: 'ボックス', rowIdx: 0 }];
    if (voteMode === 'axis1') return [{ label: '軸（1チーム）', rowIdx: 0 }, { label: '相手', rowIdx: 1 }];
    if (voteMode === 'axis2') return [{ label: '軸（2チーム）', rowIdx: 0 }, { label: '相手', rowIdx: 1 }];
    const rows = (betType === 'trio' || betType === 'trifecta') ? 3 : 2;
    return ['1列目', '2列目', '3列目'].slice(0, rows).map((label, i) => ({ label, rowIdx: i }));
}

/**
 * 買い方に応じたヒントテキストを返す
 */
function getMsHint(voteMode, betType) {
    const hints = {
        formation: '各行でそれぞれ選択したチームを組み合わせます',
        box:       '選択した全チームのボックス買いです',
        axis1: betType === 'exacta'
            ? '軸は1チームのみ（赤）。軸が1着・2着どちらにも絡む全パターンを購入します'
            : '軸は1チームのみ（赤）。軸が1・2・3着どこにでも絡む全順列を購入します',
        axis2: '軸2チーム（赤）を固定し、相手を1チームずつ加えた3チームの全順列を購入します',
    };
    return hints[voteMode] || '';
}

// ── カートユーティリティ ─────────────────────────────

/**
 * カートアイテムの想定払戻額を計算する（1点買いのみ）
 */
function calcExpectedReturn(item, oddsData) {
    if (item.combs.length !== 1) return null;
    const typeKey = (item.type === 'win' || item.type === 'place') ? item.type : item.type;
    const oddsStr = oddsData[typeKey] ? oddsData[typeKey][item.combs[0]] : null;
    if (!oddsStr) return null;
    const mid = getOddsMidpoint(oddsStr);
    return mid !== null ? Math.round(item.amountPerBet * mid) : null;
}

/**
 * カートの合計ポイントを計算する
 */
function calcCartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.combs.length * item.amountPerBet, 0);
}
