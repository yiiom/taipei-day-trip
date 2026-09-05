let attractionImages = []; // 儲存景點的所有圖片

let currentImageIndex = 0; // 記錄目前顯示的圖片
const attractionId = window.location.pathname.split("/").pop(); // 從網址取得景點編號

async function loadAttraction() { // 建立取得景點資料的非同步函式
  const response = await fetch(`/api/attraction/${attractionId}`); // 呼叫指定景點的 API
  const result = await response.json(); // 將 API 回應轉成 JavaScript 物件
  const attraction = result.data; // 取得 API 回傳的景點資料
  attractionImages = attraction.images; // 儲存 API 回傳的圖片陣列

  const indicatorContainer = document.querySelector("#image-indicators"); // 取得指示點容器元素

  attractionImages.forEach((image, index) => { // 根據圖片數量建立指示點
    const indicator = document.createElement("span"); // 建立一個指示點元素

    indicator.className = "image-indicator"; // 設定指示點的 CSS 類別

    indicator.dataset.index = index; // 記錄指示點對應的圖片索引

    if (index === currentImageIndex) { // 判斷是否為目前顯示的圖片
      indicator.classList.add("active"); // 將目前圖片標記為啟用狀態
    } 

    indicatorContainer.append(indicator); // 將指示點加入畫面
  }); 

  const firstImage = attractionImages[currentImageIndex]; // 取得目前索引的圖片

document.querySelector("#attraction-image").src = firstImage; // 將第一張圖片放入圖片元素

document.querySelector("#attraction-image").alt = attraction.name; // 將景點名稱設定為圖片替代文字

document.querySelector("#attraction-name").textContent = attraction.name; // 顯示景點名稱

document.querySelector("#attraction-category").textContent = `${attraction.category} at ${attraction.mrt}`; // 顯示景點分類與捷運站
document.querySelector("#attraction-description").textContent = attraction.description; // 顯示景點介紹

document.querySelector("#attraction-address").textContent = attraction.address; // 顯示景點地址

document.querySelector("#attraction-transport").textContent = attraction.transport; // 顯示交通方式
  console.log(result); // 在 Console 印出景點資料
} 

loadAttraction(); // 執行取得景點資料的函式
const nextImageButton = document.querySelector("#next-image-button"); // 取得下一張圖片按鈕

nextImageButton.addEventListener("click", () => { // 監聽下一張按鈕的點擊事件
  currentImageIndex += 1; // 將圖片索引往後移動一張

  if (currentImageIndex >= attractionImages.length) { // 判斷是否已經超過最後一張圖片
    currentImageIndex = 0; // 回到第一張圖片
  } 

  document.querySelector("#attraction-image").src = attractionImages[currentImageIndex]; // 顯示下一張圖片

  document.querySelectorAll(".image-indicator").forEach((indicator, index) => { // 更新所有指示條狀態
    indicator.classList.toggle("active", index === currentImageIndex); // 只標記目前圖片的指示條
  }); 
}); 

const previousImageButton = document.querySelector("#previous-image-button"); // 取得上一張圖片按鈕

previousImageButton.addEventListener("click", () => { // 監聽上一張按鈕的點擊事件
  currentImageIndex -= 1; // 將圖片索引往前移動一張

  if (currentImageIndex < 0) { // 判斷是否已經超過第一張圖片
    currentImageIndex = attractionImages.length - 1; // 回到最後一張圖片
  } 

  document.querySelector("#attraction-image").src = attractionImages[currentImageIndex]; // 顯示上一張圖片

  document.querySelectorAll(".image-indicator").forEach((indicator, index) => { // 更新所有指示條狀態
    indicator.classList.toggle("active", index === currentImageIndex); // 只標記目前圖片的指示條
  }); 
}); 

const morningTime = document.querySelector("#morning-time"); // 取得上半天單選按鈕

const afternoonTime = document.querySelector("#afternoon-time"); // 取得下半天單選按鈕

const bookingPrice = document.querySelector("#booking-price"); // 取得導覽費用文字

morningTime.addEventListener("change", () => { // 監聽上半天選項的變化
  bookingPrice.textContent = "新台幣 2000 元"; // 上半天時顯示 2000 元
}); 

afternoonTime.addEventListener("change", () => { // 監聽下半天選項的變化
  bookingPrice.textContent = "新台幣 2500 元"; // 下半天時顯示 2500 元
});

const bookingForm = document.querySelector(".booking-form"); // 取得預約表單
const bookingDate = document.querySelector("#booking-date"); // 取得日期輸入框
const bookingTimeOptions = document.querySelectorAll('input[name="booking-time"]'); // 取得上午與下午選項

bookingForm.addEventListener("submit", async (event) => { // 監聽開始預約行程按鈕
  event.preventDefault(); // 阻止表單重新整理頁面
  const token = localStorage.getItem("token"); // 取得瀏覽器中的登入 Token
  if (!token) { // 如果使用者尚未登入
    const authModal = document.querySelector("#auth-modal"); // 取得登入註冊視窗
    const signinView = document.querySelector("#signin-view"); // 取得登入畫面
    const signupView = document.querySelector("#signup-view"); // 取得註冊畫面
    const authDialog = document.querySelector(".auth-dialog"); // 取得登入註冊視窗內容
    authModal.classList.remove("hidden"); // 開啟登入註冊視窗
    signinView.classList.remove("hidden"); // 顯示登入畫面
    signupView.classList.add("hidden"); // 隱藏註冊畫面
    authDialog.classList.remove("signup-mode"); // 使用登入視窗樣式
    return; // 結束表單送出流程
  } // 結束未登入判斷
  const selectedTimeOption = Array.from(bookingTimeOptions).find((option) => option.checked); // 找出使用者選取的時間
  if (!bookingDate.value || !selectedTimeOption) { // 如果沒有選日期或時間
    alert("請選擇日期與時間"); // 提示使用者補齊資料
    return; // 結束表單送出流程
  } // 結束資料檢查
  const response = await fetch("/api/booking", { // 呼叫建立預約 API
    method: "POST", // 使用 POST 方法建立預約
    headers: { // 設定請求標頭
      "Content-Type": "application/json", // 指定傳送 JSON 資料
      Authorization: `Bearer ${token}`, // 傳送登入者的 JWT Token
    }, // 結束請求標頭
    body: JSON.stringify({ // 建立要傳送的預約資料
      attractionId: Number(attractionId), // 傳送目前景點編號
      date: bookingDate.value, // 傳送使用者選擇的日期
      time: selectedTimeOption.value, // 傳送使用者選擇的上午或下午
    }), // 結束預約資料
  }); // 結束建立預約 API
  if (response.ok) { // 如果預約建立成功
    window.location.href = "/booking"; // 導向預約頁面
    return; // 結束表單送出流程
  } // 結束成功判斷
  const result = await response.json(); // 讀取後端錯誤訊息
  alert(result.message || "預約建立失敗"); // 顯示預約失敗原因
}); // 結束預約表單事件