// odds-init.js — オッズページ初期化エントリーポイント
// 依存関係（読み込み順）:
//   common.js → utils.js → cart.js → odds-pc.js → odds-sp.js → odds-init.js

let teams    = [];
let oddsData = {};

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await loadAllData();
        teams    = data.teams;
        oddsData = data.odds;

        loadCart();
        // saveMsState / loadMsState は空stub（タブ移動でリセット仕様のため保存不要）
        renderTeamHeader();
        initMsHeader();
        renderAllCarts();
        initSPAfterLoad();

        // URLパラメータからフォーメーションを復元（印ページからの遷移）
        const params  = new URLSearchParams(window.location.search);
        const urlTab  = params.get('tab');
        const urlMode = params.get('mode');

        if (urlTab && urlMode === 'formation') {
            const tabEl = document.querySelector(`.tab-menu li[data-type="${urlTab}"]`);
            if (tabEl) {
                switchTab(urlTab, tabEl);
                const fBtn = document.querySelector('[data-mode="formation"]');
                if (fBtn) switchVoteMode('formation', fBtn);

                const parseNums = s => (s || '').split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
                msRows[0] = new Set(parseNums(params.get('r0')));
                msRows[1] = new Set(parseNums(params.get('r1')));
                msRows[2] = new Set(parseNums(params.get('r2')));
                getCurrentMsState().rows = msRows;
                buildMsRows();
                updateMsCombCount();
                render();

                if (params.get('apply') === '1') applyMarksheet();
            }
        } else {
            const tabEl = document.querySelector(`.tab-menu li[data-type="win-place"]`);
            if (tabEl) switchTab('win-place', tabEl);
            else render();
        }

    } catch (e) {
        console.error('データ読み込み失敗:', e);
        document.body.insertAdjacentHTML('afterbegin',
            `<div style="background:#fdd;padding:10px;border:1px solid #d00;margin-bottom:10px;">
             ⚠️ データの読み込みに失敗しました。ローカルでの直接ファイル開きには対応していません。
             Live Serverなどのローカルサーバー経由で開いてください。</div>`);
    }
});
