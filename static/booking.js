const tapPayAppId = 171092; // TapPay 測試環境的 App ID
const tapPayAppKey = "app_UI5EKrZrnq9ZVN7aa9ormIcKrMR8Lp9pcxsgCSW5Kz1WOt4zK3BW21eUwHq5"; // TapPay 測試環境的 App Key
TPDirect.setupSDK(tapPayAppId, tapPayAppKey, "sandbox"); // 初始化 TapPay 測試環境
TPDirect.card.setup({ // 設定 TapPay 三個安全卡片欄位
  fields: { // 設定各個卡片欄位的位置與提示文字
    number: { // 設定卡號欄位
      element: "#card-number", // 指定卡號欄位的 HTML 元素
      placeholder: "**** **** **** ****", // 設定卡號欄位的提示文字
    }, 
    expirationDate: { // 設定有效期限欄位
      element: "#card-expiration-date", // 指定有效期限欄位的 HTML 元素
      placeholder: "MM / YY", // 設定有效期限欄位的提示文字
    }, 
    ccv: { // 設定驗證碼欄位
      element: "#card-ccv", // 指定驗證碼欄位的 HTML 元素
      placeholder: "CVV", // 設定驗證碼欄位的提示文字
    }, 
  }, 
  styles: { // 設定 TapPay 欄位內部輸入文字的樣式
    input: { // 設定所有 TapPay 輸入欄位
      color: "#666666", // 設定輸入文字顏色
      "font-size": "16px", // 設定輸入文字大小
    }, 
    ":focus": { // 設定輸入欄位取得焦點時的樣式
      color: "#333333", // 設定焦點狀態的文字顏色
    }, 
    ".valid": { // 設定輸入內容正確時的樣式
      color: "#2e7d32", // 設定正確狀態的文字顏色
    }, 
    ".invalid": { // 設定輸入內容錯誤時的樣式
      color: "#d32f2f", // 設定錯誤狀態的文字顏色
    }, 
  }, 
}); 
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

const confirmBookingButton = document.querySelector("#confirm-booking-button"); // 取得確認訂購並付款按鈕

confirmBookingButton.addEventListener("click", () => { // 監聽付款按鈕點擊事件
  const tappayStatus = TPDirect.card.getTappayFieldsStatus(); // 取得 TapPay 卡片欄位狀態

  if (!tappayStatus.canGetPrime) { // 如果卡片資料尚未填寫正確
    alert("請確認信用卡資訊是否正確"); // 顯示錯誤提示
    return; // 結束付款流程
  } 
  TPDirect.card.getPrime(async (result) => { // 向 TapPay 取得 Prime
    if (result.status !== 0) { // 如果取得 Prime 失敗
      alert(`取得付款資訊失敗：${result.msg}`); // 顯示 TapPay 的錯誤訊息
      return; // 結束付款流程
    } 

    const prime = result.card.prime; // 取得 TapPay Prime

    const orderResponse = await fetch("/api/orders", { // 將訂單資料傳送到後端
      method: "POST", // 使用 POST 方法建立訂單
      headers: { // 設定請求標頭
        "Content-Type": "application/json", // 指定傳送 JSON 格式
        Authorization: `Bearer ${token}`, // 傳送登入者 Token
      }, 
      body: JSON.stringify({ // 將資料轉換成 JSON 字串
        prime: prime, // 傳送 TapPay Prime
        name: document.querySelector("#contact-name").value, // 傳送聯絡人姓名
        email: document.querySelector("#contact-email").value, // 傳送聯絡人 Email
        phone: document.querySelector("#contact-phone").value, // 傳送聯絡人手機
      }), // 結束 JSON 資料
    }); // 結束後端 API 請求

    const orderResult = await orderResponse.json(); // 讀取後端回應資料

    if (!orderResponse.ok) { // 如果後端建立訂單或付款失敗
      alert(orderResult.message || "付款失敗"); // 顯示錯誤訊息
      return; // 結束付款流程
    } 

    window.location.href = `/thankyou?number=${encodeURIComponent(orderResult.data.number)}`; // 導向 thankyou 頁面
  }); // 結束 TapPay 取得 Prime 回呼函式
}); // 結束付款按鈕事件
