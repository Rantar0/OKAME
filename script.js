// script.js
const vConsole = new VConsole();
console.log("vConsole is ready.");

// --- 【重要】ご自身の環境に合わせて必ず設定してください ---
const GAS_API_GET_DATA_URL = 'https://script.google.com/macros/s/AKfycbynbJpXQ2_F1sPpi2uWAL6XhbM2fN2IEhDJKACvTjYJw9K9N0CT-HANjy7Ve5KYSrDs/exec'; // あなたのGASデータ取得APIのURL
const GAS_API_SAVE_USER_URL = 'https://script.google.com/macros/s/AKfycbynbJpXQ2_F1sPpi2uWAL6XhbM2fN2IEhDJKACvTjYJw9K9N0CT-HANjy7Ve5KYSrDs/exec'; // あなたのGASユーザー保存APIのURL (通常GETと同じ)
const LIFF_ID = '2007511020-EQ98my1W'; // あなたのLIFF ID
// --- 設定ここまで ---

const statusElement = document.getElementById('liff-status');

console.log("初期定数確認:", { GAS_API_GET_DATA_URL, GAS_API_SAVE_USER_URL, LIFF_ID });

/**
 * ページコンテンツ（タイトルとテーブル）を描画する関数
 */
async function renderPageContent() {
    statusElement.textContent = "スケジュールデータ取得中...";
    console.log("renderPageContent: 開始");
    try {
        if (!GAS_API_GET_DATA_URL || GAS_API_GET_DATA_URL.includes('貼り付け')) {
            throw new Error("GASデータ取得APIのURLが正しく設定されていません。");
        }
        console.log("fetch (GET - ページデータ) を開始します:", GAS_API_GET_DATA_URL);
        const response = await fetch(GAS_API_GET_DATA_URL);
        console.log("fetch (GET - ページデータ) レスポンスオブジェクト:", response);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`データ取得APIエラー (${response.status} ${response.statusText}):`, errorText);
            throw new Error(`データ取得APIでエラーが発生しました (Status: ${response.status})。詳細はvConsoleを確認してください。`);
        }
        
        const pageData = await response.json();
        console.log("ページデータ (JSONパース後):", pageData);

        if (pageData.error) {
            throw new Error(`GAS側でデータ取得エラー: ${pageData.error}`);
        }

        document.getElementById('main-title').textContent = pageData.mainTitle;
        document.getElementById('sub-title').textContent = pageData.subTitle;
        createTable(pageData.scheduleData, 'schedule-container', '年間計画');
        createTable(pageData.boardData, 'board-container', '連絡事項');
        statusElement.textContent = "スケジュール表示完了";
        console.log("renderPageContent: 正常に完了しました。");
    } catch (e) {
        console.error("renderPageContent でキャッチされたエラー:", e.message, e.stack || e);
        document.getElementById('main-title').textContent = "表示エラー";
        document.getElementById('sub-title').textContent = "スケジュールデータの表示中に問題が発生しました。";
        statusElement.textContent = `データ表示エラー: ${e.message} (詳細はvConsole参照)`;
    }
}

/**
 * データ配列を元にHTMLのテーブルを生成し、指定したコンテナに表示する関数
 * @param {Array<Array<string>>} data - テーブルデータ (二次元配列)
 * @param {string} containerId - テーブルを表示するdiv要素のID
 * @param {string} tableName - テーブル名 (ログやメッセージ用)
 */
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
    // ヘッダー行 (data[0])
    if (data.length > 0) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        data[0].forEach(cellData => {
            const th = document.createElement("th");
            th.textContent = cellData === null ? "" : cellData;
            headerRow.appendChild(th);
        });
    }
    // データ行 (data[1]以降)
    const tbody = table.createTBody();
    let hasActualDataRows = false;
    data.slice(1).forEach(rowData => {
        if (rowData.every(cell => cell === "" || cell === null)) return; // 全て空の行はスキップ
        hasActualDataRows = true;
        const row = tbody.insertRow();
        rowData.forEach(cellData => {
            const td = row.insertCell();
            td.textContent = cellData === null ? "" : cellData;
        });
    });

    if (!hasActualDataRows && table.tHead && table.tHead.rows.length > 0) { // ヘッダーのみで実質データなし
        const message = (tableName === '連絡事項') ? '現在のところ、お知らせはありません。' : `${tableName}: 表示する内容はありません。`;
        container.innerHTML = `<p>${message}</p>`;
        console.log(`${tableName}: ヘッダー行のみで、実質的なデータ行はありませんでした。`);
        return;
    }

    container.innerHTML = ""; 
    container.appendChild(table);
    console.log(`${tableName}: テーブルを生成し表示しました。`);
}

/**
 * LIFFの初期化とユーザー情報の取得・保存を行う非同期関数
 */
async function initializeLiffAndProcessUser() {
    try {
        console.log("=== LIFF処理開始 ===");
        if (!LIFF_ID || LIFF_ID.includes('入力') || LIFF_ID.includes('あなたの')) {
            throw new Error("LIFF IDがscript.jsに正しく設定されていません。");
        }
        console.log("使用するLIFF ID:", LIFF_ID);
        console.log("User Agent:", navigator.userAgent);
        statusElement.textContent = "LIFF初期化中...";
        
        await liff.init({ liffId: LIFF_ID });
        console.log("liff.init() 成功");
        
        statusElement.textContent = "ログイン状態確認中...";
        if (!liff.isLoggedIn()) {
            console.log("未ログイン - liff.login() を呼び出します。");
            statusElement.textContent = "LINEログインにリダイレクトします...";
            liff.login(); 
            return; // liff.login()はページ遷移するので、ここで処理を終了
        }
        console.log("ログイン済みです。");
        
        statusElement.textContent = "IDトークン取得中...";
        const idToken = liff.getIDToken();
        if (!idToken) {
            throw new Error("IDトークンが取得できませんでした。Scopeに'openid'が設定されているか確認してください。");
        }
        console.log("IDトークン取得成功。");
        
        statusElement.textContent = "ユーザー情報を記録中...";
        console.log("fetch (POST - ユーザー保存API) 開始:", GAS_API_SAVE_USER_URL);
        if (!GAS_API_SAVE_USER_URL || GAS_API_SAVE_USER_URL.includes('貼り付け')) {
            throw new Error("GASユーザー保存APIのURLがscript.jsに設定されていません。");
        }
        
        // GAS呼び出しをPromiseでラップし、タイムアウト処理を追加
        const gasPromise = new Promise((resolve, reject) => {
            fetch(GAS_API_SAVE_USER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ idToken: idToken })
            })
            .then(response => {
                console.log("fetch (POST - ユーザー保存API) レスポンスオブジェクト:", response);
                if (!response.ok) {
                    // エラーレスポンスのボディをテキストとして取得試行
                    response.text().then(text => {
                        console.error(`ユーザー保存APIエラー (${response.status} ${response.statusText}):`, text);
                        reject(new Error(`ユーザー保存APIエラー: ${response.status}. 詳細: ${text}`));
                    }).catch(textErr => { // response.text()自体が失敗する場合
                        console.error(`ユーザー保存APIエラー (${response.status} ${response.statusText})、詳細取得失敗:`, textErr);
                        reject(new Error(`ユーザー保存APIエラー: ${response.status} (レスポンス詳細取得失敗)`));
                    });
                } else {
                    // 成功時はJSONとしてパース試行
                    response.json().then(resolve).catch(jsonErr => {
                        console.error("GASユーザー保存API 応答のJSONパースエラー:", jsonErr);
                        reject(new Error("GASからの応答の解析に失敗しました。"));
                    });
                }
            })
            .catch(networkError => { // fetch自体が失敗するネットワークエラーなど
                 console.error("fetch (POST - ユーザー保存API) ネットワークエラー:", networkError);
                 reject(new Error(`ネットワークエラーが発生しました: ${networkError.message}`));
            });
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                console.error('GASユーザー保存APIが20秒でタイムアウトしました');
                reject(new Error('GASユーザー保存APIがタイムアウトしました（20秒）'));
            }, 20000);
        });

        const gasResponse = await Promise.race([gasPromise, timeoutPromise]);
        console.log("GASユーザー保存API 応答 (Promise.race後):", gasResponse);
                
        if (gasResponse && gasResponse.status === 'Success') {
            statusElement.textContent = `ようこそ、${gasResponse.displayName} さん`;
        } else {
            // gasResponseがエラーオブジェクトや期待しない形式の場合も考慮
            const errorMessage = gasResponse && gasResponse.message ? gasResponse.message : "不明な応答";
            throw new Error(`ユーザー保存処理でエラーまたは不明な応答: ${errorMessage}`);
        }
        console.log("=== LIFF処理正常完了 ===");

    } catch (error) {
        console.error("=== LIFF処理中に最終的なエラー発生 ===");
        console.error("エラー詳細:", error.message, error.stack ? "\nStack:" + error.stack : "", error);
        statusElement.textContent = `LIFF処理エラー: ${error.message} (詳細はvConsole参照)`;
    }
}

// ページのDOM構造が読み込み終わってから、少し遅れて処理を開始
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoadedイベント発生。");

    // API URLとLIFF IDが正しく設定されているか基本的なチェック
    if (!GAS_API_GET_DATA_URL || GAS_API_GET_DATA_URL.includes('貼り付け') || 
        !GAS_API_SAVE_USER_URL || GAS_API_SAVE_USER_URL.includes('貼り付け') ||
        !LIFF_ID || LIFF_ID.includes('入力') || LIFF_ID.includes('あなたの')) {
        const errMsg = "【重要】script.js内のAPI URLまたはLIFF IDが未設定か、初期値のままです。確認してください。";
        console.error(errMsg);
        statusElement.textContent = errMsg;
        // 開発者に分かりやすいように、ページ上部にもエラーメッセージを表示
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red'; errorDiv.style.fontWeight = 'bold';
        errorDiv.style.padding = '10px'; errorDiv.style.border = '2px solid red';
        errorDiv.style.margin = '10px';
        errorDiv.textContent = errMsg;
        document.body.insertBefore(errorDiv, document.body.firstChild);
        return; // 致命的な設定エラーなので、以降の処理を中断
    }

    // 最初にページコンテンツを描画
    console.log("ページコンテンツ描画処理を開始します。");
    renderPageContent(); 
    
    // ページ描画後、少し遅延させてLIFF処理を開始 (LINEブラウザの準備を待つため)
    setTimeout(() => {
        console.log("遅延タイマー発火、LIFF処理を開始します。");
        initializeLiffAndProcessUser();
    }, 500); // 0.5秒の遅延
});
</script>
</body>
</html>
