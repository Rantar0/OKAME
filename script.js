// script.js
const vConsole = new VConsole();
console.log("vConsole is ready.");

// 【重要】これらのAPI URLは、ステップ2でGASをAPIとしてデプロイした後に取得するURLに置き換えます
const GAS_API_GET_DATA_URL = 'https://script.google.com/macros/s/AKfycbxzEdFYTjM31oEoL8eEn0f08MCRBr6wOwn9ktw15UWsk1oiU4nHe58A6Y0rMx80SeW9/exec';
const GAS_API_SAVE_USER_URL = 'https://script.google.com/macros/s/AKfycbxzEdFYTjM31oEoL8eEn0f08MCRBr6wOwn9ktw15UWsk1oiU4nHe58A6Y0rMx80SeW9/exec';
const LIFF_ID = '2007511020-EQ98my1W'; // これはConfig.gsと同じもの

const statusElement = document.getElementById('liff-status');

/** ページコンテンツ（タイトルとテーブル）を描画する関数 */
async function renderPageContent() {
    statusElement.textContent = "スケジュールデータ取得中...";
    try {
        console.log("GASからページデータを取得開始:", GAS_API_GET_DATA_URL);
        const response = await fetch(GAS_API_GET_DATA_URL); // GASのAPIを呼び出し
        if (!response.ok) {
            throw new Error(`GAS API (getPageData) Error: ${response.status} ${response.statusText}`);
        }
        const pageData = await response.json(); // GASからのJSONレスポンスをパース
        console.log("ページデータ取得成功:", pageData);

        document.getElementById('main-title').textContent = pageData.mainTitle;
        document.getElementById('sub-title').textContent = pageData.subTitle;
        createTable(pageData.scheduleData, 'schedule-container', '年間計画');
        createTable(pageData.boardData, 'board-container', '連絡事項');
        console.log("ページコンテンツ描画完了。");
        statusElement.textContent = "スケジュール表示完了";
    } catch (e) {
        console.error("ページコンテンツ描画エラー:", e);
        document.getElementById('main-title').textContent = "エラー";
        document.getElementById('sub-title').textContent = "データの表示に失敗しました。";
        statusElement.textContent = "データ表示エラー";
    }
}

/** テーブル生成関数 (内容は以前のものと同じ) */
function createTable(data, containerId, tableName) {
    const container = document.getElementById(containerId);
    let isEmpty = !data || data.length === 0 || (data.length === 1 && data[0].every(cell => cell === "" || cell === null));
    if (isEmpty) {
        const message = (tableName === '連絡事項') ? '現在のところ、お知らせはありません。' : `${tableName}: 表示する内容はありません。`;
        container.innerHTML = `<p>${message}</p>`;
        console.log(`${tableName}: ${message}`);
        return;
    }
    const table = document.createElement("table");
    if (data.length > 0) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        data[0].forEach(cellData => {
            const th = document.createElement("th");
            th.textContent = cellData === null ? "" : cellData;
            headerRow.appendChild(th);
        });
    }
    const tbody = table.createTBody();
    let hasDataRows = false;
    data.slice(1).forEach(rowData => {
        if (rowData.every(cell => cell === "" || cell === null)) return;
        hasDataRows = true;
        const row = tbody.insertRow();
        rowData.forEach(cellData => {
            const td = row.insertCell();
            td.textContent = cellData === null ? "" : cellData;
        });
    });
    if (!hasDataRows && table.tHead && table.tHead.rows.length > 0) {
        const message = (tableName === '連絡事項') ? '現在のところ、お知らせはありません。' : `${tableName}: 表示する内容はありません。`;
        container.innerHTML = `<p>${message}</p>`;
        console.log(`${tableName}: ヘッダーのみで実質的なデータ行なし。`);
        return;
    }
    container.innerHTML = ""; 
    container.appendChild(table);
    console.log(`${tableName}: テーブル生成完了。`);
}

/** LIFFの初期化とユーザー情報処理 */
async function initializeLiffAndProcessUser() {
    try {
        console.log("=== LIFF処理開始 ===");
        console.log("使用するLIFF ID:", LIFF_ID);
        statusElement.textContent = "LIFF初期化中...";
        
        await liff.init({ liffId: LIFF_ID });
        console.log("liff.init() 完了");
        
        statusElement.textContent = "ログイン状態確認中...";
        if (!liff.isLoggedIn()) {
            console.log("未ログイン - liff.login() 呼び出し実行");
            statusElement.textContent = "LINEログインにリダイレクトします...";
            liff.login();
            return;
        }
        console.log("ログイン済みです。");
        
        statusElement.textContent = "IDトークン取得中...";
        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("IDトークンが取得できませんでした。");
        console.log("IDトークン取得成功。");
        
        statusElement.textContent = "ユーザー情報を記録中...";
        console.log("GAS (ユーザー保存API) 呼び出し開始:", GAS_API_SAVE_USER_URL);
        
        const response = await fetch(GAS_API_SAVE_USER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: idToken }) // IDトークンをJSONで送信
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GAS API (saveUser) Error: ${response.status} ${errorText}`);
        }
        
        const gasResponse = await response.json(); // GASからのJSONレスポンスをパース
        console.log("GASユーザー保存API 応答:", gasResponse);
                
        if (gasResponse && gasResponse.status === 'Success') {
            statusElement.textContent = `ようこそ、${gasResponse.displayName} さん`;
        } else {
            statusElement.textContent = `記録完了 (詳細はvConsole参照)`;
        }

    } catch (error) {
        console.error("=== LIFF処理中にエラー発生 ===");
        console.error("エラー詳細:", error);
        statusElement.textContent = `エラー: ${error.message} (詳細はvConsole参照)`;
    }
}

// ページのDOM構造が読み込み終わってから処理を開始
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoadedイベント発生。");
    renderPageContent(); // まずページコンテンツを描画 (GAS API呼び出しを含む)
    initializeLiffAndProcessUser(); // 次にLIFFの処理を開始
});