// script.js (GitHub Pages用 - 最終確認・デバッグ強化版)
const vConsole = new VConsole();
console.log("vConsole is ready.");

// ★★★【最重要】ご自身の環境に合わせて必ず正しい値を設定してください ★★★
const GAS_API_GET_DATA_URL = 'https://script.google.com/macros/s/AKfycbwAUHVfcQzqMvvgUL7dCQYpT6u30WxB9MI3jBbaiua7UH0RHqgjduY0xrzqyZ_ZXlgM/exec';
const GAS_API_SAVE_USER_URL = 'https://script.google.com/macros/s/AKfycbwAUHVfcQzqMvvgUL7dCQYpT6u30WxB9MI3jBbaiua7UH0RHqgjduY0xrzqyZ_ZXlgM/exec'; // 通常はGETと同じURL
const LIFF_ID = '2007511020-EQ98my1W';
// ★★★ 設定ここまで ★★★

const statusElement = document.getElementById('liff-status');

console.log("初期定数設定完了。");
console.log("GAS_GET_URL:", GAS_API_GET_DATA_URL);
console.log("GAS_SAVE_URL:", GAS_API_SAVE_USER_URL);
console.log("LIFF_ID:", LIFF_ID);

/** ページコンテンツ（タイトルとテーブル）を描画する関数 */
async function renderPageContent() {
    statusElement.textContent = "スケジュールデータ取得開始...";
    console.log("renderPageContent: 開始");
    try {
        if (!GAS_API_GET_DATA_URL || GAS_API_GET_DATA_URL.includes('貼り付け')) {
            throw new Error("GASデータ取得APIのURLがscript.jsに設定されていません。");
        }
        console.log("fetch (GET - ページデータ) 開始:", GAS_API_GET_DATA_URL);
        const response = await fetch(GAS_API_GET_DATA_URL);
        console.log("fetch (GET - ページデータ) レスポンスオブジェクト:", response);

        if (!response.ok) {
            const errorText = await response.text(); // エラー時はテキストで詳細取得を試みる
            console.error(`データ取得APIエラー (response.ok === false): ${response.status} ${response.statusText}`, "レスポンスボディ(text):", errorText);
            throw new Error(`データ取得APIエラー: ${response.status} ${response.statusText}. 詳細: ${errorText}`);
        }
        
        const pageData = await response.json(); // 成功時はJSONとしてパース
        console.log("ページデータ (JSONパース後):", pageData);

        if (pageData.error) { // GAS側でエラーオブジェクトが返ってきた場合
            throw new Error(`GAS側でデータ取得エラー: ${pageData.error}`);
        }

        document.getElementById('main-title').textContent = pageData.mainTitle;
        document.getElementById('sub-title').textContent = pageData.subTitle;
        createTable(pageData.scheduleData, 'schedule-container', '年間計画');
        createTable(pageData.boardData, 'board-container', '連絡事項');
        statusElement.textContent = "スケジュール表示完了";
        console.log("renderPageContent: 正常完了");
    } catch (e) {
        console.error("renderPageContent でキャッチされたエラー:", e.message, e.stack ? "\nStack:" + e.stack : "");
        document.getElementById('main-title').textContent = "表示エラー";
        document.getElementById('sub-title').textContent = "スケジュールデータの表示に失敗しました。";
        statusElement.textContent = `データ表示エラー: ${e.message} (詳細はvConsole参照)`;
    }
}

/** テーブル生成関数 (変更なし) */
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

/** LIFF初期化とユーザー情報処理 */
async function initializeLiffAndProcessUser() {
    try {
        console.log("=== LIFF処理開始 ===");
        if (!LIFF_ID || LIFF_ID.includes('入力')) { // LIFF IDの基本的なチェック
            throw new Error("LIFF IDがscript.jsに正しく設定されていません。");
        }
        console.log("使用LIFF ID:", LIFF_ID);
        console.log("User Agent:", navigator.userAgent);
        statusElement.textContent = "LIFF初期化中...";
        
        await liff.init({ liffId: LIFF_ID });
        console.log("liff.init() 成功");
        
        statusElement.textContent = "ログイン状態確認中...";
        if (!liff.isLoggedIn()) {
            console.log("未ログイン - liff.login() 呼び出し");
            statusElement.textContent = "LINEログインへ...";
            liff.login(); return;
        }
        console.log("ログイン済み");
        
        statusElement.textContent = "IDトークン取得中...";
        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("IDトークン取得失敗。Scopeに'openid'が設定されているか確認してください。");
        console.log("IDトークン取得成功。");
        
        statusElement.textContent = "ユーザー情報を記録中...";
        console.log("fetch (POST - verifyAndSaveUser) 開始:", GAS_API_SAVE_USER_URL);
        if (!GAS_API_SAVE_USER_URL || GAS_API_SAVE_USER_URL.includes('貼り付け')) {
            throw new Error("GASユーザー保存APIのURLがscript.jsに設定されていません。");
        }
        
        const gasPromise = new Promise((resolve, reject) => {
            fetch(GAS_API_SAVE_USER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ idToken: idToken })
            })
            .then(response => {
                console.log("fetch (POST) レスポンスオブジェクト:", response);
                if (!response.ok) {
                    response.text().then(text => {
                        console.error(`ユーザー保存APIエラー (response.ok === false): ${response.status} ${response.statusText}`, "レスポンスボディ(text):", text);
                        reject(new Error(`ユーザー保存APIエラー: ${response.status}. 詳細: ${text}`));
                    }).catch(textErr => { // response.text()自体が失敗する稀なケース
                        console.error(`ユーザー保存APIエラー (response.ok === false, text()も失敗): ${response.status} ${response.statusText}`, textErr);
                        reject(new Error(`ユーザー保存APIエラー: ${response.status} (詳細取得失敗)`));
                    });
                } else {
                    response.json().then(resolve).catch(jsonErr => { // response.json()が失敗するケース
                        console.error("GASユーザー保存API 応答のJSONパースエラー:", jsonErr);
                        reject(new Error("GASからの応答の解析に失敗しました。"));
                    });
                }
            })
            .catch(networkError => { // fetch自体が失敗するネットワークエラーなど
                 console.error("fetch (POST) ネットワークエラー:", networkError);
                 reject(new Error(`ネットワークエラーが発生しました: ${networkError.message}`));
            });
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('GASユーザー保存APIが20秒でタイムアウトしました')), 20000);
        });

        const gasResponse = await Promise.race([gasPromise, timeoutPromise]);
        console.log("GASユーザー保存API 応答 (Promise.race後):", gasResponse);
                
        if (gasResponse && gasResponse.status === 'Success') {
            statusElement.textContent = `ようこそ、${gasResponse.displayName} さん`;
        } else {
            throw new Error(gasResponse.message || "ユーザー保存処理で不明な応答を受け取りました。");
        }
        console.log("=== LIFF処理正常完了 ===");
    } catch (error) {
        console.error("=== LIFF処理中に最終的なエラー発生 ===");
        console.error("エラー詳細:", error.message, error.stack ? "\nStack:" + error.stack : "", error);
        statusElement.textContent = `LIFF処理エラー: ${error.message} (詳細はvConsole参照)`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoadedイベント発生。");
    if (!GAS_API_GET_DATA_URL || GAS_API_GET_DATA_URL.includes('貼り付け') || 
        !GAS_API_SAVE_USER_URL || GAS_API_SAVE_USER_URL.includes('貼り付け') ||
        !LIFF_ID || LIFF_ID.includes('入力')) {
        const errMsg = "【重要】script.js内のAPI URLまたはLIFF IDが未設定です。開発者に連絡してください。";
        console.error(errMsg);
        statusElement.textContent = errMsg;
        // alert(errMsg); // 開発時以外はアラートは不要かもしれません
        // 致命的な設定エラーなので、ここで処理を中断
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red'; errorDiv.style.fontWeight = 'bold'; errorDiv.style.padding = '10px';
        errorDiv.style.border = '2px solid red';
        errorDiv.textContent = errMsg;
        document.body.insertBefore(errorDiv, document.body.firstChild);
        return;
    }
    renderPageContent(); 
    setTimeout(() => initializeLiffAndProcessUser(), 500); // 少し遅延させてLIFF処理開始
});
