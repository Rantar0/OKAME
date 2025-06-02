// script.js (GitHub Pages用 - 改善・堅牢化版)
const vConsole = new VConsole();
console.log("vConsole is ready.");

// --- 【重要】ご自身の環境に合わせて必ず正しい値を設定してください ---
const GAS_API_GET_DATA_URL = "https://script.google.com/macros/s/AKfycbynbJpXQ2_F1sPpi2uWAL6XhbM2fN2IEhDJKACvTjYJw9K9N0CT-HANjy7Ve5KYSrDs/exec";
const GAS_API_SAVE_USER_URL = "https://script.google.com/macros/s/AKfycbynbJpXQ2_F1sPpi2uWAL6XhbM2fN2IEhDJKACvTjYJw9K9N0CT-HANjy7Ve5KYSrDs/exec"; // 通常GETと同じURL
const LIFF_ID = "2007511020-EQ98my1W";
// --- 設定ここまで ---

const statusElement = document.getElementById("liff-status");

console.log("初期定数確認:", {
  GAS_API_GET_DATA_URL,
  GAS_API_SAVE_USER_URL,
  LIFF_ID,
});

/**
 * URLがGASのウェブアプリURLとして正しい形式か検証する関数
 * @param {string} url 検証するURL
 * @return {boolean} 正しい形式であればtrue
 */
function isValidGasApiUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
    url
  );
}

/**
 * LIFF IDが正しい形式か検証する関数
 * @param {string} liffId 検証するLIFF ID
 * @return {boolean} 正しい形式であればtrue
 */
function isValidLiffIdFormat(liffId) {
  if (!liffId || typeof liffId !== "string") return false;
  // LIFF IDの形式: 10桁の数字 - 8桁の英数字 (例: 1234567890-Abcdefgh)
  return /^[0-9]{10}-[A-Za-z0-9]{8}$/.test(liffId);
}

/**
 * テーブルデータが空かどうかを判定する関数 (ヘッダー行のみの場合も空とみなすかなど調整可能)
 * @param {Array<Array<string>>} data テーブルデータ (二次元配列)
 * @return {boolean} データが実質的に空であればtrue
 */
function isTableDataEmpty(data) {
  if (!data || data.length === 0) return true; // データ配列自体がないか空
  if (
    data.length === 1 &&
    data[0].every((cell) => cell === "" || cell === null)
  )
    return true; // ヘッダー行のみで、そのヘッダーも全て空
  // データ行 (data[1]以降) が全て空かどうかをチェック
  if (
    data.length > 1 &&
    data
      .slice(1)
      .every((row) => row.every((cell) => cell === "" || cell === null))
  ) {
    // ヘッダー行が存在し、かつそれが空でない場合、データ行がなくてもテーブルは表示する（ヘッダーのみ）
    // もしヘッダーのみの場合も「空」としたい場合は、ここのロジックを調整
    if (data[0].some((cell) => cell !== "" && cell !== null)) return false; // ヘッダーに内容があれば空ではない
    return true; // ヘッダーも空で、データ行もすべて空
  }
  return data.every((row) => row.every((cell) => cell === "" || cell === null)); // 全てのセルが空かnull
}

/** ページコンテンツ（タイトルとテーブル）を描画する関数 */
async function renderPageContent() {
  statusElement.textContent = "スケジュールデータ取得中...";
  console.log("renderPageContent: 開始");
  try {
    if (!isValidGasApiUrl(GAS_API_GET_DATA_URL)) {
      throw new Error(
        "GASデータ取得APIのURL形式が正しくありません。script.jsを確認してください。"
      );
    }
    console.log(
      "fetch (GET - ページデータ) を開始します:",
      GAS_API_GET_DATA_URL
    );
    const response = await fetch(GAS_API_GET_DATA_URL);
    console.log("fetch (GET - ページデータ) レスポンスオブジェクト:", response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `データ取得APIエラー (${response.status} ${response.statusText}):`,
        "レスポンスボディ(text):",
        errorText
      );
      throw new Error(
        `データ取得APIでエラーが発生しました (Status: ${response.status})。詳細はvConsoleを確認してください。`
      );
    }

    const pageData = await response.json();
    console.log("ページデータ (JSONパース後):", pageData);

    if (pageData.error) {
      throw new Error(`GAS側でデータ取得エラー: ${pageData.error}`);
    }

    document.getElementById("main-title").textContent = pageData.mainTitle;
    document.getElementById("sub-title").textContent = pageData.subTitle;
    createTable(pageData.scheduleData, "schedule-container", "年間計画");
    createTable(pageData.boardData, "board-container", "連絡事項");
    statusElement.textContent = "スケジュール表示完了";
    console.log("renderPageContent: 正常に完了しました。");
  } catch (e) {
    console.error(
      "renderPageContent でキャッチされたエラー:",
      e.message,
      e.stack || e
    );
    document.getElementById("main-title").textContent = "表示エラー";
    document.getElementById("sub-title").textContent =
      "スケジュールデータの表示中に問題が発生しました。";
    statusElement.textContent = `データ表示エラー: ${e.message} (詳細はvConsole参照)`;
  }
}

/** テーブル生成関数 */
function createTable(data, containerId, tableName) {
  const container = document.getElementById(containerId);

  if (isTableDataEmpty(data)) {
    // ★関数化された空チェックを使用
    const message =
      tableName === "連絡事項"
        ? "現在のところ、お知らせはありません。"
        : `${tableName}: 表示する内容はありません。`;
    container.innerHTML = `<p>${message}</p>`;
    console.log(`${tableName}: ${message}`);
    return;
  }

  const table = document.createElement("table");
  // ヘッダー行 (data[0])
  if (data.length > 0 && data[0].some((cell) => cell !== "" && cell !== null)) {
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    data[0].forEach((cellData) => {
      const th = document.createElement("th");
      th.textContent = cellData === null ? "" : cellData;
      headerRow.appendChild(th);
    });
  }
  // データ行 (data[1]以降)
  const tbody = table.createTBody();
  let hasActualDataRows = false;
  data.slice(1).forEach((rowData) => {
    if (rowData.every((cell) => cell === "" || cell === null)) return;
    hasActualDataRows = true;
    const row = tbody.insertRow();
    rowData.forEach((cellData) => {
      const td = row.insertCell();
      td.textContent = cellData === null ? "" : cellData;
    });
  });

  // ヘッダーは存在するがデータ行が全くない場合、またはヘッダーすら空だった場合
  if (table.tHead && table.tHead.rows.length > 0 && !hasActualDataRows) {
    // ヘッダーのみ表示するか、メッセージを表示するかはtableNameで判断
    if (tableName === "連絡事項") {
      // 連絡事項はヘッダーだけでも「お知らせなし」
      container.innerHTML = `<p>現在のところ、お知らせはありません。</p>`;
      console.log(`${tableName}: ヘッダーのみで実質的なデータ行なし。`);
      return;
    }
    // それ以外はヘッダーのみ表示
  } else if (!table.tHead && !hasActualDataRows) {
    // ヘッダーもデータ行もない場合
    const message =
      tableName === "連絡事項"
        ? "現在のところ、お知らせはありません。"
        : `${tableName}: 表示する内容はありません。`;
    container.innerHTML = `<p>${message}</p>`;
    console.log(`${tableName}: ヘッダーもデータ行もありませんでした。`);
    return;
  }

  container.innerHTML = "";
  container.appendChild(table);
  console.log(`${tableName}: テーブルを生成し表示しました。`);
}

/** LIFF初期化とユーザー情報処理 */
async function initializeLiffAndProcessUser() {
  try {
    console.log("=== LIFF処理開始 ===");
    if (!isValidLiffIdFormat(LIFF_ID)) {
      // ★LIFF ID形式チェックを追加
      throw new Error(
        "LIFF IDの形式が正しくありません。script.jsを確認してください。"
      );
    }
    console.log("使用LIFF ID:", LIFF_ID);
    statusElement.textContent = "LIFF初期化中...";

    await liff.init({ liffId: LIFF_ID });
    console.log("liff.init() 成功");

    statusElement.textContent = "ログイン状態確認中...";
    if (!liff.isLoggedIn()) {
      console.log("未ログイン - liff.login() 呼び出し");
      statusElement.textContent = "LINEログインへ...";
      liff.login();
      return;
    }
    console.log("ログイン済み");

    statusElement.textContent = "IDトークン取得中...";
    const idToken = liff.getIDToken();
    if (!idToken)
      throw new Error(
        "IDトークン取得失敗。Scopeに'openid'が設定されているか確認してください。"
      );
    console.log("IDトークン取得成功。");

    statusElement.textContent = "ユーザー情報を記録中...";
    console.log("fetch (POST - ユーザー保存API) 開始:", GAS_API_SAVE_USER_URL);
    if (!isValidGasApiUrl(GAS_API_SAVE_USER_URL)) {
      // ★API URL形式チェックを追加
      throw new Error(
        "GASユーザー保存APIのURL形式が正しくありません。script.jsを確認してください。"
      );
    }

    const gasPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error("GASユーザー保存APIが20秒でタイムアウトしました");
        reject(new Error("GASユーザー保存APIがタイムアウトしました（20秒）"));
      }, 20000);

      fetch(GAS_API_SAVE_USER_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ idToken: idToken }),
      })
        .then((response) => {
          clearTimeout(timeoutId);
          console.log(
            "fetch (POST - ユーザー保存API) レスポンスオブジェクト:",
            response
          );
          if (!response.ok) {
            response
              .text()
              .then((text) => {
                console.error(
                  `ユーザー保存APIエラー (${response.status} ${response.statusText}):`,
                  text
                );
                reject(
                  new Error(
                    `ユーザー保存APIエラー: ${response.status}. 詳細: ${text}`
                  )
                );
              })
              .catch((textErr) => {
                console.error(
                  `ユーザー保存APIエラー (${response.status} ${response.statusText})、詳細取得失敗:`,
                  textErr
                );
                reject(
                  new Error(
                    `ユーザー保存APIエラー: ${response.status} (レスポンス詳細取得失敗)`
                  )
                );
              });
          } else {
            response
              .json()
              .then(resolve)
              .catch((jsonErr) => {
                console.error(
                  "GASユーザー保存API 応答のJSONパースエラー:",
                  jsonErr
                );
                reject(new Error("GASからの応答の解析に失敗しました。"));
              });
          }
        })
        .catch((networkError) => {
          clearTimeout(timeoutId);
          console.error(
            "fetch (POST - ユーザー保存API) ネットワークエラー:",
            networkError
          );
          reject(
            new Error(
              `ネットワークエラーが発生しました: ${networkError.message}`
            )
          );
        });
    });

    const gasResponse = await gasPromise;
    console.log("GASユーザー保存API 応答:", gasResponse);

    if (gasResponse && gasResponse.status === "Success") {
      statusElement.textContent = `ようこそ、${gasResponse.displayName} さん`;
    } else {
      const errorMessage =
        gasResponse && gasResponse.message ? gasResponse.message : "不明な応答";
      throw new Error(
        `ユーザー保存処理でエラーまたは不明な応答: ${errorMessage}`
      );
    }
    console.log("=== LIFF処理正常完了 ===");
  } catch (error) {
    console.error("=== LIFF処理中に最終的なエラー発生 ===");
    console.error(
      "エラー詳細:",
      error.message,
      error.stack ? "\nStack:" + error.stack : "",
      error
    );
    statusElement.textContent = `LIFF処理エラー: ${error.message} (詳細はvConsole参照)`;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoadedイベント発生。");
  // API URLとLIFF IDが設定されているか基本的なチェック
  if (
    !isValidGasApiUrl(GAS_API_GET_DATA_URL) ||
    !isValidGasApiUrl(GAS_API_SAVE_USER_URL) ||
    !isValidLiffIdFormat(LIFF_ID)
  ) {
    const errMsg =
      "【重要】script.js内のAPI URLまたはLIFF IDが正しく設定されていません。確認してください。";
    console.error(errMsg);
    if (statusElement) statusElement.textContent = errMsg;
    const errorDiv = document.createElement("div");
    errorDiv.style.color = "red";
    errorDiv.style.fontWeight = "bold";
    errorDiv.style.padding = "10px";
    errorDiv.style.border = "2px solid red";
    errorDiv.style.margin = "10px";
    errorDiv.textContent = errMsg;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    return;
  }
  renderPageContent();
  setTimeout(() => initializeLiffAndProcessUser(), 500);
});
