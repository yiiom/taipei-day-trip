// 取得景點卡片清單的容器
const attractionList = document.querySelector("#attraction-list");
// 取得無限捲動時用來偵測底部的元素
const loadMoreSentinel = document.querySelector("#load-more-sentinel");
// 取得 MRT 站名清單的容器
const mrtList = document.querySelector("#mrt-list");
// 取得分類下拉選單的按鈕
const categoryButton = document.querySelector("#category-button");
// 取得分類選項面板
const categoryMenu = document.querySelector("#category-menu");
// 取得顯示目前分類名稱的文字元素
const selectedCategory = document.querySelector("#selected-category");
// 取得關鍵字搜尋輸入欄
const keywordInput = document.querySelector("#keyword-input");
// 取得搜尋按鈕
const searchButton = document.querySelector("#search-button");
// 取得 MRT 向左切換按鈕
const mrtLeftButton = document.querySelector("#mrt-left-button");
// 取得 MRT 向右切換按鈕
const mrtRightButton = document.querySelector("#mrt-right-button");

// 記錄下一次要向 API 請求的景點頁碼
let currentPage = 0;
// 記錄使用者目前點選的 MRT 站名
let selectedMrt = "";
// 記錄使用者目前選擇的景點分類
let selectedCategoryValue = "";
// 記錄 MRT 清單目前從第幾筆開始顯示
let mrtOffset = 0;
// 儲存從 API 載入的所有 MRT 站名
let mrtStations = [];
// 防止同一時間重複發送景點 API 請求
let isLoadingAttractions = false;

// 依螢幕大小決定 MRT 一次可見的站名數量
function getMrtPageSize() {
  // 手機顯示 6 筆，桌面顯示 16 筆
  return window.matchMedia("(max-width: 600px)").matches ? 6 : 16;
}

// 依螢幕大小決定每次點箭頭要移動幾筆站名
function getMrtStepSize() {
  // 手機每次移動 3 筆，桌面每次移動 4 筆
  return window.matchMedia("(max-width: 600px)").matches ? 3 : 4;
}

// 將一筆景點 API 資料轉換成一張景點卡片
function createCard(attraction) {
  // 建立卡片最外層 article 元素
  const card = document.createElement("article");
  // 套用景點卡片的 CSS 類別
  card.className = "attraction-card";
  // 取得第一張圖片；沒有圖片時使用空字串
  const image = attraction.images?.[0] || "";
  // 將景點資料組成卡片 HTML
  card.innerHTML = `
    <a class="attraction-card-link" href="/attraction/${attraction.id}">
      <div class="attraction-image-container">
        <img class="attraction-image" src="${image}" alt="${attraction.name}">
        <div class="attraction-name">${attraction.name}</div>
      </div>
      <div class="attraction-details">
        <div class="attraction-info">
          <span class="attraction-mrt">${attraction.mrt || ""}</span>
          <span class="attraction-category">${attraction.category}</span>
        </div>
      </div>
    </a>`;
  // 回傳已建立好的景點卡片
  return card;
}

// 向 API 載入景點；reset 為 true 時代表重新搜尋
async function loadAttractions({ reset = false } = {}) {
  // 載入中或沒有下一頁時，不再發送新的請求。
  if (isLoadingAttractions || (!reset && currentPage === null)) return;

  // 重新搜尋時，將頁碼與目前畫面中的景點重設
  if (reset) {
    // 從 API 的第 0 頁重新開始
    currentPage = 0;
    // 清空舊的景點卡片
    attractionList.replaceChildren();
  }

  // 建立 API 查詢參數，先放入目前頁碼
  const params = new URLSearchParams({ page: currentPage });
  // 有選分類時才加入 category 參數
  if (selectedCategoryValue) params.set("category", selectedCategoryValue);
  // 有選 MRT 或輸入關鍵字時才加入 keyword 參數
  if (selectedMrt || keywordInput.value.trim()) {
    // MRT 優先於手動輸入的關鍵字
    params.set("keyword", selectedMrt || keywordInput.value.trim());
  }

  // 標記景點資料正在載入
  isLoadingAttractions = true;
  try {
    // 呼叫景點 API 並附上查詢參數
    const response = await fetch(`/api/attractions?${params}`);
    // API 回應失敗時，交給 catch 顯示錯誤訊息
    if (!response.ok) throw new Error("Unable to load attractions");
    // 將 API 回應轉成 JavaScript 物件
    const result = await response.json();
    // 將每筆景點資料建立成卡片並加入清單
    result.data.forEach((attraction) => attractionList.append(createCard(attraction)));
    // 儲存後端回傳的下一頁頁碼；沒有下一頁時會是 null
    currentPage = result.nextPage;
  } catch (error) {
    // 只有尚未顯示任何景點時才顯示錯誤訊息
    if (!attractionList.children.length) {
      // 告知使用者景點資料無法載入
      attractionList.innerHTML = '<p class="empty-message">目前無法載入景點資料。</p>';
    }
  } finally {
    // 不論成功或失敗，都解除載入中的標記
    isLoadingAttractions = false;
  }
}

// 依目前 offset 將可見的 MRT 站名渲染到畫面上
function renderMrtStations() {
  // 清空前一批 MRT 站名按鈕
  mrtList.replaceChildren();
  // 取得本裝置一次可見的站名數量
  const pageSize = getMrtPageSize();
  // 計算最後一頁可使用的起始索引
  const lastOffset = Math.max(0, mrtStations.length - pageSize);
  // 避免 offset 超過最後一頁的範圍
  mrtOffset = Math.min(mrtOffset, lastOffset);
  // 從所有站名中取出目前要顯示的一段資料
  const visibleStations = mrtStations.slice(mrtOffset, mrtOffset + pageSize);
  // 將每個可見 MRT 站名建立為可點擊按鈕
  visibleStations.forEach((station) => {
    // 建立單一 MRT 站名按鈕
    const button = document.createElement("button");
    // 指定按鈕型態，避免它在表單中送出資料
    button.type = "button";
    // 套用 MRT 站名的 CSS 類別
    button.className = "mrt-item";
    // 將 API 回傳的站名顯示在按鈕上
    button.textContent = station;
    // 點擊站名後，以該站名重新搜尋景點
    button.addEventListener("click", () => {
      // 儲存目前選取的 MRT 站名
      selectedMrt = station;
      // 將站名同步顯示在搜尋輸入欄
      keywordInput.value = station;
      // 重新從第 0 頁載入該站的景點
      loadAttractions({ reset: true });
    });
    // 將 MRT 按鈕加到 MRT 清單容器
    mrtList.append(button);
  });
  // 在第一段資料時停用左箭頭
  mrtLeftButton.disabled = mrtOffset === 0;
  // 已顯示到最後一段資料時停用右箭頭
  mrtRightButton.disabled = mrtOffset + pageSize >= mrtStations.length;
}

// 從 API 載入 MRT 站名
async function loadMrts() {
  try {
    // 呼叫 MRT API
    const response = await fetch("/api/mrts");
    // API 回應失敗時，交給 catch 顯示錯誤訊息
    if (!response.ok) throw new Error("Unable to load MRT stations");
    // 取出 API 的 data 陣列並存入 MRT 站名資料
    mrtStations = (await response.json()).data;
    // 將載入完成的 MRT 站名顯示到畫面
    renderMrtStations();
  } catch (_) {
    // 告知使用者 MRT 資料無法載入
    mrtList.innerHTML = '<span class="empty-message">捷運站資料載入失敗</span>';
  }
}

// 從 API 載入景點分類
async function loadCategories() {
  try {
    // 呼叫分類 API
    const response = await fetch("/api/categories");
    // API 回應失敗時，交給 catch 顯示錯誤訊息
    if (!response.ok) throw new Error("Unable to load categories");
    // 解構取出 API 回傳的分類陣列
    const { data } = await response.json();
    // 建立固定的全部分類選項，用來清除目前的分類篩選
    const allCategoryButton = document.createElement("button");
    // 指定按鈕型態，避免它在表單中送出資料
    allCategoryButton.type = "button";
    // 顯示全部分類文字
    allCategoryButton.textContent = "全部分類";
    // 點擊後清除分類條件並重新載入全部景點
    allCategoryButton.addEventListener("click", () => {
      // 清除目前選擇的分類值
      selectedCategoryValue = "";
      // 將上方按鈕文字恢復為全部分類
      selectedCategory.textContent = "全部分類";
      // 選取後關閉分類選單
      categoryMenu.classList.add("hidden");
      // 從第 0 頁重新載入全部景點
      loadAttractions({ reset: true });
    });
    // 將全部分類按鈕放在選單第一格
    categoryMenu.append(allCategoryButton);
    // 將每個分類建立成可點擊按鈕
    data.forEach((category) => {
      // 建立單一分類按鈕
      const button = document.createElement("button");
      // 指定按鈕型態，避免它在表單中送出資料
      button.type = "button";
      // 顯示 API 回傳的分類名稱
      button.textContent = category;
      // 點擊分類後，以該分類重新搜尋景點
      button.addEventListener("click", () => {
        // 儲存目前選取的分類
        selectedCategoryValue = category;
        // 更新分類按鈕上顯示的文字
        selectedCategory.textContent = category;
        // 選取後關閉分類選單
        categoryMenu.classList.add("hidden");
        // 重新從第 0 頁載入該分類景點
        loadAttractions({ reset: true });
      });
      // 將分類按鈕加入分類選單
      categoryMenu.append(button);
    });
  } catch (_) {
    // 告知使用者分類資料無法載入
    categoryMenu.innerHTML = '<span class="empty-message">分類載入失敗</span>';
  }
}

// 點擊分類按鈕時，在顯示與隱藏選單之間切換
categoryButton.addEventListener("click", () => categoryMenu.classList.toggle("hidden"));
// 點擊搜尋按鈕時，依輸入欄與分類條件重新搜尋
searchButton.addEventListener("click", () => {
  // 手動搜尋時清除先前點選的 MRT 條件
  selectedMrt = "";
  // 重新從第 0 頁載入搜尋結果
  loadAttractions({ reset: true });
});
// 在搜尋輸入欄按 Enter 時執行搜尋
keywordInput.addEventListener("keydown", (event) => {
  // 只有 Enter 鍵才觸發搜尋按鈕
  if (event.key === "Enter") searchButton.click();
});
// 點左箭頭時，將 MRT 清單向左移動
mrtLeftButton.addEventListener("click", () => {
  // 往左移動指定筆數，且不低於第 0 筆
  mrtOffset = Math.max(0, mrtOffset - getMrtStepSize());
  // 重新顯示移動後的 MRT 清單
  renderMrtStations();
});
// 點右箭頭時，將 MRT 清單向右移動
mrtRightButton.addEventListener("click", () => {
  // 往右移動指定筆數，且不超過最後一段資料
  mrtOffset = Math.min(
    // 取得最後一頁可用的起始索引
    Math.max(0, mrtStations.length - getMrtPageSize()),
    // 計算向右移動後的起始索引
    mrtOffset + getMrtStepSize(),
  );
  // 重新顯示移動後的 MRT 清單
  renderMrtStations();
});

// 建立觀察器，在使用者接近景點列表底部時載入下一頁
const attractionObserver = new IntersectionObserver(
  // 當被觀察元素進入畫面範圍時執行此函式
  (entries) => {
    // sentinel 出現在畫面或距離畫面 200px 內時，載入下一頁景點
    if (entries[0].isIntersecting) loadAttractions();
  },
  // 提早 200px 載入，讓使用者滑到底前就取得下一批資料
  { rootMargin: "200px 0px" },
);

// sentinel 存在時才開始監看它
if (loadMoreSentinel) attractionObserver.observe(loadMoreSentinel);

// 網頁載入後先取得分類資料
loadCategories();
// 網頁載入後再取得 MRT 站名資料
loadMrts();
// 網頁載入後從第 0 頁取得第一批景點
loadAttractions({ reset: true });

const authLink = document.querySelector(".auth-link"); // 取得右上角登入／註冊連結
const authModal = document.querySelector("#auth-modal"); // 取得登入註冊彈窗
const authDialog = document.querySelector(".auth-dialog"); // 取得彈窗內容區
const authCloseButton = document.querySelector("#auth-close-button"); // 取得關閉按鈕
const authBackdrop = document.querySelector(".auth-backdrop"); // 取得背景遮罩
const signinView = document.querySelector("#signin-view"); // 取得登入畫面
const signupView = document.querySelector("#signup-view"); // 取得註冊畫面
const showSignupButton = document.querySelector("#show-signup-button"); // 取得切換註冊按鈕
const showSigninButton = document.querySelector("#show-signin-button"); // 取得切換登入按鈕

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
  authDialog.classList.add("signup-mode"); // 使用註冊彈窗的 332px 高度
}); // 結束切換註冊事件

showSigninButton.addEventListener("click", () => { // 監聽點此登入按鈕
  signupView.classList.add("hidden"); // 隱藏註冊畫面
  signinView.classList.remove("hidden"); // 顯示登入畫面
  authDialog.classList.remove("signup-mode"); // 使用登入彈窗的 275px 高度
}); // 結束切換登入事件

async function checkSigninStatus() { // 建立檢查登入狀態的函式
  const token = localStorage.getItem("token"); // 從瀏覽器取得 JWT Token

  if (!token) { // 如果瀏覽器沒有 Token
    authLink.textContent = "登入/註冊"; // 顯示登入／註冊文字
    return; // 結束函式
  } // 結束沒有 Token 的判斷

  const response = await fetch("/api/user", { // 呼叫取得目前使用者的 API
    method: "GET", // 使用 GET 方法
    headers: { // 設定請求標頭
      Authorization: `Bearer ${token}`, // 傳送 Bearer JWT Token
    }, // 結束請求標頭
  }); // 結束 API 請求

  const data = await response.json(); // 讀取後端回傳資料

  if (response.ok && data.data) { // 如果 Token 有效且取得使用者資料
    authLink.textContent = "登出系統"; // 顯示登出系統文字
  } else { // 如果 Token 無效或已過期
    localStorage.removeItem("token"); // 移除無效的 Token
    authLink.textContent = "登入/註冊"; // 改回登入／註冊文字
  } // 結束登入狀態判斷
} // 結束檢查登入狀態函式

checkSigninStatus(); // 網頁載入後立即檢查登入狀態

const signupForm = document.querySelector("#signup-form"); // 取得註冊表單
const signupName = document.querySelector("#signup-name"); // 取得姓名輸入框
const signupEmail = document.querySelector("#signup-email"); // 取得 Email 輸入框
const signupPassword = document.querySelector("#signup-password"); // 取得密碼輸入框
const signupMessage = document.querySelector("#signup-message"); // 取得註冊訊息區域

signupForm.addEventListener("submit", async (event) => { // 監聽註冊表單送出
  event.preventDefault(); // 阻止表單重新整理頁面

  const response = await fetch("/api/user", { // 呼叫註冊 API
    method: "POST", // 使用 POST 方法
    headers: { // 設定請求標頭
      "Content-Type": "application/json", // 告訴後端資料格式是 JSON
    }, // 結束請求標頭
    body: JSON.stringify({ // 將表單資料轉成 JSON
      name: signupName.value, // 傳送使用者姓名
      email: signupEmail.value, // 傳送使用者 Email
      password: signupPassword.value, // 傳送使用者密碼
    }), // 結束 JSON 資料
  }); // 結束 API 請求

  const data = await response.json(); // 讀取後端回傳資料

  if (response.ok) { // 如果註冊成功
    signupMessage.textContent = "註冊成功"; // 顯示成功訊息
    signupForm.reset(); // 清空註冊表單
  } else { // 如果註冊失敗
    signupMessage.textContent = "Email 已經註冊過了"; // 顯示中文註冊錯誤訊息
  } // 結束成功或失敗判斷
}); // 結束註冊表單事件

const signinForm = document.querySelector("#signin-form"); // 取得登入表單
const signinEmail = document.querySelector("#signin-email"); // 取得登入 Email 輸入框
const signinPassword = document.querySelector("#signin-password"); // 取得登入密碼輸入框
const signinMessage = document.querySelector("#signin-message"); // 取得登入錯誤訊息區域

signinForm.addEventListener("submit", async (event) => { // 監聽登入表單送出
  event.preventDefault(); // 阻止表單重新整理頁面

  const response = await fetch("/api/user", { // 呼叫登入 API
    method: "PUT", // 使用 PUT 方法
    headers: { // 設定請求標頭
      "Content-Type": "application/json", // 告訴後端資料格式是 JSON
    }, // 結束請求標頭
    body: JSON.stringify({ // 將登入資料轉成 JSON
      email: signinEmail.value, // 傳送使用者 Email
      password: signinPassword.value, // 傳送使用者密碼
    }), // 結束 JSON 資料
  }); // 結束 API 請求

  const data = await response.json(); // 讀取後端回傳資料

  if (response.ok && data.data && data.data.token) { // 確認登入成功並取得 Token
    localStorage.setItem("token", data.data.token); // 將 JWT Token 儲存到瀏覽器
    location.reload(); // 重新整理頁面並更新登入狀態
  } else { // 如果登入失敗
    signinMessage.textContent = "Email 或密碼錯誤"; // 顯示中文登入錯誤訊息
  } // 結束登入結果判斷
}); // 結束登入表單事件