from fastmcp import FastMCP  # 匯入 FastMCP 伺服器工具
from fastmcp.server.dependencies import get_http_headers  # 匯入取得 HTTP 標頭的函式
from db import get_connection  # 匯入資料庫連線函式
mcp = FastMCP("台北一日遊")  # 建立名稱為台北一日遊的 MCP 伺服器
def get_mcp_user_id() -> int | None:  # 建立驗證 MCP Token 並取得會員 ID 的函式
    headers = get_http_headers()  # 取得目前 MCP 請求的 HTTP 標頭
    authorization = headers.get("authorization", "")  # 取得 Authorization 標頭內容
    if not authorization.startswith("Bearer "):  # 檢查是否使用 Bearer Token 格式
        return None  # 沒有正確格式時回傳無效
    token = authorization.split(" ", 1)[1]  # 取出 Bearer 後面的實際 Token
    conn = get_connection()  # 建立資料庫連線
    cursor = conn.cursor(dictionary=True)  # 建立可回傳字典資料的游標
    try:  # 開始查詢 Token
        cursor.execute("SELECT user_id FROM member_mcp_tokens WHERE token = %s", (token,))  # 查詢 Token 對應的會員
        row = cursor.fetchone()  # 取得查詢結果
        return row["user_id"] if row else None  # 找到時回傳會員 ID，找不到時回傳無效
    finally:  # 無論查詢成功或失敗都執行清理
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線

@mcp.tool  # 將函式註冊為 MCP 工具
def search_attractions(keyword: str) -> dict:  # 建立景點搜尋工具並接收關鍵字
    """透過景點名稱或捷運站名稱搜尋台北景點。"""  # 設定工具說明文字
    user_id = get_mcp_user_id()  # 驗證 Bearer Token 並取得會員 ID
    if user_id is None:  # 如果 Token 無效或沒有提供 Token
        return {"error": True}  # 回傳錯誤格式並拒絕搜尋
    conn = get_connection()  # 建立資料庫連線
    cursor = conn.cursor(dictionary=True)  # 建立可回傳字典資料的游標
    try:  # 開始執行搜尋流程
        cursor.execute(  # 執行景點搜尋 SQL
            "SELECT id, name, description, category, address, mrt FROM attractions WHERE mrt LIKE %s OR name LIKE %s LIMIT 20",  # 搜尋捷運站或景點名稱並取得完整資訊
            (f"%{keyword}%", f"%{keyword}%"),  # 使用包含關鍵字的方式搜尋
        )  # 結束 SQL 執行
        rows = cursor.fetchall()  # 取得所有搜尋結果
        return {"data": rows}  # 依作業規定回傳景點資料
    except Exception:  # 捕捉搜尋錯誤
        return {"error": True}  # 回傳錯誤格式
    finally:  # 無論成功或失敗都執行清理
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線
@mcp.tool  # 將函式註冊為 MCP 工具
def add_to_cart(attraction_id: int, date: str, time: str, price: int) -> dict:  # 建立加入行程工具
    """根據景點編號、日期、時間和價格建立預約。"""  # 設定工具說明文字
    user_id = get_mcp_user_id()  # 驗證 Bearer Token 並取得會員 ID
    if user_id is None:  # 如果 Token 無效
        return {"error": True}  # 回傳錯誤格式
    if time not in ("morning", "afternoon"):  # 檢查時間是否為上午或下午
        return {"error": True}  # 時間格式錯誤時回傳錯誤
    expected_price = 2000 if time == "morning" else 2500  # 根據時段計算正確價格
    if price != expected_price:  # 檢查輸入價格是否正確
        return {"error": True}  # 價格不一致時回傳錯誤
    conn = get_connection()  # 建立資料庫連線
    cursor = conn.cursor()  # 建立資料庫游標
    try:  # 開始建立預約
        cursor.execute("SELECT id FROM attractions WHERE id = %s", (attraction_id,))  # 檢查景點是否存在
        if cursor.fetchone() is None:  # 如果找不到景點
            return {"error": True}  # 回傳景點不存在錯誤
        cursor.execute("INSERT INTO bookings (user_id, attraction_id, booking_date, booking_time, price) VALUES (%s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE booking_date = VALUES(booking_date), booking_time = VALUES(booking_time), price = VALUES(price)", (user_id, attraction_id, date, time, price))  # 新增或更新預約
        conn.commit()  # 儲存資料庫變更
        return {"ok": True, "message": "台北導覽行程，預定成功，請到 http://13.112.91.227:8000/booking 完成付款。"}  # 回傳成功訊息
    except Exception:  # 捕捉資料庫錯誤
        conn.rollback()  # 發生錯誤時取消變更
        return {"error": True}  # 回傳錯誤格式
    finally:  # 執行資料庫清理
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線