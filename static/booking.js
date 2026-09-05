const token = localStorage.getItem("token"); // 取得瀏覽器中的登入 Token

if (!token) { // 如果使用者沒有登入 Token
  window.location.href = "/"; // 將使用者導回首頁
} else { // 如果使用者有登入 Token
  loadBookingPage(); // 載入預約頁面資料
} // 結束登入判斷

async function loadBookingPage() { // 建立載入預約頁面的非同步函式
  const userResponse = await fetch("/api/user", { // 呼叫取得使用者資料的 API
    method: "GET", // 使用 GET 方法
    headers: { Authorization: `Bearer ${token}` }, // 傳送登入者的 JWT Token
  }); // 結束使用者 API 請求

  if (!userResponse.ok) { // 如果 Token 無效或取得使用者資料失敗
    localStorage.removeItem("token"); // 移除無效的登入 Token
    window.location.href = "/"; // 將使用者導回首頁
    return; // 結束函式
  } // 結束 API 錯誤判斷

  const userResult = await userResponse.json(); // 將使用者回應轉成 JavaScript 物件
  const user = userResult.data; // 取得使用者資料

  document.querySelector("#booking-user-name").textContent = user.name; // 顯示問候文字中的會員姓名
  document.querySelector("#contact-name").value = user.name; // 填入聯絡姓名
  document.querySelector("#contact-email").value = user.email; // 填入聯絡信箱
  const bookingResponse = await fetch("/api/booking", { // 呼叫取得預約資料的 API
    method: "GET", // 使用 GET 方法
    headers: { Authorization: `Bearer ${token}` }, // 傳送登入者的 JWT Token
  }); // 結束預約 API 請求

  const bookingResult = await bookingResponse.json(); // 將預約回應轉成 JavaScript 物件
  const booking = bookingResult.data; // 取得預約資料
  const emptyBooking = document.querySelector("#empty-booking"); // 取得沒有預約時的文字
  const bookingContent = document.querySelector("#booking-content"); // 取得預約內容區域

  if (!booking) { // 如果目前沒有預約資料
    emptyBooking.classList.remove("hidden"); // 顯示沒有預約文字
    bookingContent.classList.add("hidden"); // 隱藏預約內容區域
    document.querySelector(".booking-page").classList.add("empty-state"); // 標記目前為沒有預約的空狀態
    return; // 結束函式
  } // 結束沒有預約判斷

  emptyBooking.classList.add("hidden"); // 隱藏沒有預約文字
  bookingContent.classList.remove("hidden"); // 顯示預約內容區域

  const attraction = booking.attraction; // 取得預約景點資料
  const bookingImage = document.querySelector("#booking-image"); // 取得預約景點圖片
  const bookingAttractionName = document.querySelector("#booking-attraction-name"); // 取得景點名稱
  const bookingDateElement = document.querySelector("#booking-date"); // 取得預約日期文字
  const bookingTimeElement = document.querySelector("#booking-time"); // 取得預約時間文字
  const bookingPriceElement = document.querySelector("#booking-price"); // 取得預約價格文字
  const bookingAddressElement = document.querySelector("#booking-address"); // 取得景點地址文字
  const bookingTotalPrice = document.querySelector("#booking-total-price"); // 取得總價格文字

  bookingImage.src = attraction.image; // 設定預約景點圖片
  bookingImage.alt = attraction.name; // 設定圖片替代文字
  bookingAttractionName.textContent = `台北一日遊：${attraction.name}`; // 顯示網站名稱與景點名稱
  bookingDateElement.textContent = booking.date; // 顯示預約日期
  bookingTimeElement.textContent = booking.time === "morning" ? "早上9點到下午4點" : "下午2點到晚上9點"; // 顯示預約時段
  bookingPriceElement.textContent = booking.price; // 顯示預約價格
  bookingAddressElement.textContent = attraction.address; // 顯示景點地址
  bookingTotalPrice.textContent = booking.price; // 顯示總價格
} // 結束載入預約頁面函式

const deleteBookingButton = document.querySelector("#delete-booking-button"); // 取得刪除預約按鈕

deleteBookingButton.addEventListener("click", async () => { // 監聽刪除按鈕點擊事件
  const deleteResponse = await fetch("/api/booking", { // 呼叫刪除預約 API
    method: "DELETE", // 使用 DELETE 方法
    headers: { Authorization: `Bearer ${token}` }, // 傳送登入者的 JWT Token
  }); // 結束刪除預約 API 請求

  if (deleteResponse.ok) { // 如果刪除預約成功
    window.location.reload(); // 重新整理頁面並顯示沒有預約的狀態
    return; // 結束刪除事件
  } // 結束成功判斷

  alert("刪除預約失敗"); // 顯示刪除失敗訊息
}); // 結束刪除按鈕事件
