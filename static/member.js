const token = localStorage.getItem("token"); // 取得登入後儲存在瀏覽器的 JWT Token
const memberName = document.querySelector("#member-name"); // 取得會員姓名顯示位置
const hostUrl = document.querySelector("#mcp-host-url"); // 取得 MCP Host URL 顯示位置
const mcpToken = document.querySelector("#mcp-token"); // 取得 Bearer Token 顯示位置
const generateButton = document.querySelector("#generate-token-button"); // 取得產生 Token 按鈕
const tokenMessage = document.querySelector("#token-message"); // 取得操作結果訊息位置
const logoutButton = document.querySelector("#logout-button"); // 取得登出按鈕
const authLink = document.querySelector(".auth-link"); // 取得導覽列登入／登出連結

if (!token) { // 如果沒有登入 Token
  window.location.href = "/"; // 將使用者導回首頁
}

hostUrl.textContent = `${window.location.origin}/mcp/`; // 顯示目前網站的 MCP Host URL

async function loadMember() { // 建立載入會員資料的函式
  const response = await fetch("/api/user", { // 呼叫取得目前會員資料的 API
    headers: { Authorization: `Bearer ${token}` }, // 傳送登入者的 JWT Token
  }); // 結束 API 請求設定
  const result = await response.json(); // 將回應內容轉成 JSON
  if (!response.ok || !result.data) { // 如果 Token 無效或沒有會員資料
    localStorage.removeItem("token"); // 清除無效的登入 Token
    window.location.href = "/"; // 將使用者導回首頁
    return; // 結束函式
  } // 結束錯誤判斷
  memberName.textContent = result.data.name; // 顯示會員姓名
  authLink.textContent = "會員中心"; // 在會員頁面顯示會員中心文字
  authLink.href = "/member"; // 將會員中心文字連結到會員頁面
} // 結束載入會員資料函式

generateButton.addEventListener("click", async () => { // 監聽產生／更新金鑰按鈕
  tokenMessage.textContent = "金鑰產生中⋯⋯"; // 顯示處理中的訊息
  const response = await fetch("/api/member/mcp-token", { // 呼叫產生 MCP Token 的 API
    method: "POST", // 使用 POST 方法
    headers: { Authorization: `Bearer ${token}` }, // 傳送登入者的 JWT Token
  }); // 結束 API 請求設定
  const result = await response.json(); // 將回應內容轉成 JSON
  if (response.ok && result.data) { // 如果 Token 產生成功
    mcpToken.textContent = result.data.token; // 顯示新的 Bearer Token
    tokenMessage.textContent = "金鑰已更新"; // 顯示成功訊息
  } else { // 如果 Token 產生失敗
    tokenMessage.textContent = "金鑰產生失敗，請稍後再試"; // 顯示錯誤訊息
  } // 結束結果判斷
}); // 結束按鈕事件

logoutButton.addEventListener("click", () => { // 監聽登出按鈕
  localStorage.removeItem("token"); // 移除瀏覽器中的登入 Token
  window.location.href = "/"; // 登出後回到首頁
}); // 結束登出事件


loadMember(); // 網頁載入時取得會員資料