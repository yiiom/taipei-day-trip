const authLink = document.querySelector(".auth-link"); // 取得右上角登入／註冊連結
const authModal = document.querySelector("#auth-modal"); // 取得登入註冊彈窗
const authDialog = document.querySelector(".auth-dialog"); // 取得彈窗內容區
const authCloseButton = document.querySelector("#auth-close-button"); // 取得關閉按鈕
const authBackdrop = document.querySelector(".auth-backdrop"); // 取得背景遮罩
const signinView = document.querySelector("#signin-view"); // 取得登入畫面
const signupView = document.querySelector("#signup-view"); // 取得註冊畫面
const showSignupButton = document.querySelector("#show-signup-button"); // 取得切換註冊按鈕
const showSigninButton = document.querySelector("#show-signin-button"); // 取得切換登入按鈕
const signupForm = document.querySelector("#signup-form"); // 取得註冊表單
const signupName = document.querySelector("#signup-name"); // 取得姓名輸入框
const signupEmail = document.querySelector("#signup-email"); // 取得註冊 Email 輸入框
const signupPassword = document.querySelector("#signup-password"); // 取得註冊密碼輸入框
const signupMessage = document.querySelector("#signup-message"); // 取得註冊訊息區域
const signinForm = document.querySelector("#signin-form"); // 取得登入表單
const signinEmail = document.querySelector("#signin-email"); // 取得登入 Email 輸入框
const signinPassword = document.querySelector("#signin-password"); // 取得登入密碼輸入框
const signinMessage = document.querySelector("#signin-message"); // 取得登入錯誤訊息區域

authLink.addEventListener("click", (event) => { // 監聽右上角登入／註冊或登出文字
  event.preventDefault(); // 阻止連結預設跳轉行為
  const token = localStorage.getItem("token"); // 取得瀏覽器中的 JWT Token
  if (token) { // 如果目前有 Token，代表使用者已登入
    localStorage.removeItem("token"); // 移除瀏覽器中的 JWT Token
    location.reload(); // 重新整理頁面並更新登入狀態
    return; // 結束函式
  }
  authModal.classList.remove("hidden"); // 沒有 Token 時顯示登入註冊彈窗
  signinView.classList.remove("hidden"); // 顯示登入畫面
  signupView.classList.add("hidden"); // 隱藏註冊畫面
  authDialog.classList.remove("signup-mode"); // 使用登入彈窗高度
}); // 結束登入／註冊或登出事件

authCloseButton.addEventListener("click", () => { // 監聽右上角關閉按鈕
  authModal.classList.add("hidden"); // 隱藏登入註冊彈窗
}); // 結束關閉按鈕事件

authBackdrop.addEventListener("click", () => { // 監聽背景遮罩點擊事件
  authModal.classList.add("hidden"); // 點擊背景時關閉彈窗
}); // 結束背景遮罩事件

showSignupButton.addEventListener("click", () => { // 監聽點此註冊按鈕
  signinView.classList.add("hidden"); // 隱藏登入畫面
  signupView.classList.remove("hidden"); // 顯示註冊畫面
  authDialog.classList.add("signup-mode"); // 使用註冊彈窗高度
}); // 結束切換註冊事件

showSigninButton.addEventListener("click", () => { // 監聽點此登入按鈕
  signupView.classList.add("hidden"); // 隱藏註冊畫面
  signinView.classList.remove("hidden"); // 顯示登入畫面
  authDialog.classList.remove("signup-mode"); // 使用登入彈窗高度
}); // 結束切換登入事件

async function checkSigninStatus() { // 建立檢查登入狀態的函式
  const token = localStorage.getItem("token"); // 從瀏覽器取得 JWT Token
  if (!token) { // 如果瀏覽器沒有 Token
    authLink.textContent = "登入/註冊"; // 顯示登入／註冊文字
    return; // 結束函式
  }
  const response = await fetch("/api/user", { // 呼叫取得目前使用者的 API
    method: "GET", // 使用 GET 方法
    headers: { Authorization: `Bearer ${token}` }, // 傳送 Bearer JWT Token
  });
  const data = await response.json(); // 讀取後端回傳資料
  if (response.ok && data.data) { // 如果 Token 有效且取得使用者資料
    authLink.textContent = "登出系統"; // 顯示登出系統文字
  } else { // 如果 Token 無效或已過期
    localStorage.removeItem("token"); // 移除無效的 Token
    authLink.textContent = "登入/註冊"; // 改回登入／註冊文字
  }
} // 結束檢查登入狀態函式

checkSigninStatus(); // 網頁載入後立即檢查登入狀態

signupForm.addEventListener("submit", async (event) => { // 監聽註冊表單送出
  event.preventDefault(); // 阻止表單重新整理頁面
  const response = await fetch("/api/user", { // 呼叫註冊 API
    method: "POST", // 使用 POST 方法
    headers: { "Content-Type": "application/json" }, // 設定 JSON 請求標頭
    body: JSON.stringify({ name: signupName.value, email: signupEmail.value, password: signupPassword.value }), // 傳送註冊資料
  });
  const data = await response.json(); // 讀取後端回傳資料
  if (response.ok) { // 如果註冊成功
    signupMessage.textContent = "註冊成功"; // 顯示成功訊息
    signupForm.reset(); // 清空註冊表單
  } else { // 如果註冊失敗
    signupMessage.textContent = "Email 已經註冊過了"; // 顯示中文註冊錯誤訊息
  }
}); // 結束註冊表單事件

signinForm.addEventListener("submit", async (event) => { // 監聽登入表單送出
  event.preventDefault(); // 阻止表單重新整理頁面
  const response = await fetch("/api/user", { // 呼叫登入 API
    method: "PUT", // 使用 PUT 方法
    headers: { "Content-Type": "application/json" }, // 設定 JSON 請求標頭
    body: JSON.stringify({ email: signinEmail.value, password: signinPassword.value }), // 傳送登入資料
  });
  const data = await response.json(); // 讀取後端回傳資料
  if (response.ok && data.data && data.data.token) { // 確認登入成功並取得 Token
    localStorage.setItem("token", data.data.token); // 將 JWT Token 儲存到瀏覽器
    location.reload(); // 重新整理頁面並更新登入狀態
  } else { // 如果登入失敗
    signinMessage.textContent = "Email 或密碼錯誤"; // 顯示中文登入錯誤訊息
  }
}); // 結束登入表單事件
