import os  # 匯入讀取環境變數的工具
import json
from fastapi import FastAPI,Request,Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from db import get_connection
from pydantic import BaseModel  # 匯入 BaseModel，用來定義前端傳來的資料格式
import jwt  # 匯入 PyJWT，用來產生和解碼 JWT Token
from datetime import datetime, timedelta, timezone  # 匯入時間工具，用來設定 Token 有效期限
app=FastAPI()
JWT_SECRET = os.getenv("JWT_SECRET")  # 從環境變數讀取 JWT 密鑰
JWT_ALGORITHM = "HS256"  # 設定 JWT 使用的加密演算法

app.mount("/static", StaticFiles(directory="static"), name="static")

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
	return FileResponse("./static/thankyou.html", media_type="text/html")
class UserSignup(BaseModel):  # 建立註冊資料的格式
    name: str  # 接收使用者姓名
    email: str  # 接收使用者 Email
    password: str  # 接收使用者密碼
class UserSignin(BaseModel):  # 建立登入資料的格式
    email: str  # 接收使用者輸入的 Email
    password: str  # 接收使用者輸入的密碼

class BookingCreate(BaseModel):  # 建立預約資料格式
    attractionId: int  # 接收景點編號
    date: str  # 接收預約日期
    time: str  # 接收預約時段，只允許 morning 或 afternoon

def get_user_id(authorization: str | None) -> int | None:  # 建立取得登入者 ID 的函式
    if not authorization or not authorization.startswith("Bearer "):  # 檢查是否有 Bearer Token
        return None  # 沒有 Token 時回傳沒有登入

    token = authorization.split(" ", 1)[1]  # 從標頭中取出真正的 Token

    try:  # 開始驗證 JWT Token
        payload = jwt.decode(  # 解碼並驗證 JWT Token
            token,  # 傳入前端送來的 Token
            JWT_SECRET,  # 使用後端的 JWT 密鑰
            algorithms=[JWT_ALGORITHM]  # 指定 JWT 使用的演算法
        )  # 結束 Token 解碼

        return payload["id"]  # 回傳 Token 裡的使用者 ID

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError):  # 處理過期、無效或缺少資料的 Token
        return None  # Token 驗證失敗時回傳沒有登入

@app.post("/api/user")  # 建立 POST /api/user 註冊 API
async def signup(user: UserSignup):  # 接收前端傳來的註冊資料
    conn = get_connection()  # 連線到 MySQL 資料庫
    cursor = conn.cursor(dictionary=True)  # 建立可以回傳字典格式的游標

    try:  # 開始執行資料庫操作
        cursor.execute(  # 查詢 Email 是否已經註冊
            "SELECT id FROM users WHERE email = %s",  # 使用 Email 查詢會員
            (user.email,)  # 傳入使用者輸入的 Email
        )  # 結束查詢指令

        existing_user = cursor.fetchone()  # 取得查詢到的會員資料

        if existing_user:  # 如果查詢到相同的 Email
            return JSONResponse(  # 回傳錯誤訊息
                status_code=400,  # 設定 HTTP 400，表示請求資料有問題
                content={  # 設定回傳內容
                    "error": True,  # 表示發生錯誤
                    "message": "Email already exists."  # 告知 Email 已經註冊
                }  # 結束回傳內容
            )  # 結束錯誤回應

        cursor.execute(  # 將新會員資料寫入 users 資料表
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",  # 新增會員資料
            (user.name, user.email, user.password)  # 傳入姓名、Email 和密碼
        )  # 結束新增指令

        conn.commit()  # 確認並儲存資料庫變更

        return JSONResponse(  # 回傳註冊成功訊息
            status_code=200,  # 設定 HTTP 200，表示請求成功
            content={  # 設定回傳內容
                "ok": True  # 表示註冊成功
            }  # 結束回傳內容
        )  # 結束成功回應

    except Exception as error:  # 如果資料庫操作發生錯誤
        conn.rollback()  # 發生錯誤時取消這次資料庫操作
        return JSONResponse(  # 回傳伺服器錯誤訊息
            status_code=500,  # 設定 HTTP 500，表示伺服器發生錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": str(error)  # 回傳錯誤原因
            }  # 結束回傳內容
        )  # 結束錯誤回應

    finally:  # 無論成功或失敗都會執行
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線

@app.put("/api/user")  # 建立 PUT /api/user 登入 API
async def signin(user: UserSignin):  # 接收前端傳來的登入資料
    conn = get_connection()  # 連線到 MySQL 資料庫
    cursor = conn.cursor(dictionary=True)  # 建立可以回傳字典格式的游標

    try:  # 開始執行登入流程
        cursor.execute(  # 依照 Email 查詢會員
            "SELECT id, name, email, password FROM users WHERE email = %s",  # 查詢會員資料
            (user.email,)  # 傳入使用者輸入的 Email
        )  # 結束查詢指令

        existing_user = cursor.fetchone()  # 取得查詢到的會員資料

        if not existing_user or existing_user["password"] != user.password:  # 檢查會員是否存在以及密碼是否正確
            return JSONResponse(  # 回傳登入失敗訊息
                status_code=400,  # 設定 HTTP 400，表示登入資料錯誤
                content={  # 設定回傳內容
                    "error": True,  # 表示登入發生錯誤
                    "message": "Invalid email or password."  # 告知 Email 或密碼錯誤
                }  # 結束回傳內容
            )  # 結束錯誤回應

        payload = {  # 建立要放入 JWT Token 的資料
            "id": existing_user["id"],  # 將會員 ID 放入 Token
            "name": existing_user["name"],  # 將會員姓名放入 Token
            "email": existing_user["email"],  # 將會員 Email 放入 Token
            "exp": datetime.now(timezone.utc) + timedelta(days=7)  # 設定 Token 7 天後過期
        }  # 結束 Token 資料

        token = jwt.encode(  # 使用 PyJWT 產生 Token
            payload,  # 傳入 Token 內容
            JWT_SECRET,  # 傳入 JWT 密鑰
            algorithm=JWT_ALGORITHM  # 指定 JWT 加密演算法
        )  # 結束 Token 產生

        return JSONResponse(  # 回傳登入成功結果
            status_code=200,  # 設定 HTTP 200，表示登入成功
            content={  # 設定回傳內容
                "data": {  # 建立資料物件
                    "token": token  # 回傳 JWT Token
                }  # 結束資料物件
            }  # 結束回傳內容
        )  # 結束成功回應

    except Exception as error:  # 如果資料庫操作發生錯誤
        return JSONResponse(  # 回傳伺服器錯誤訊息
            status_code=500,  # 設定 HTTP 500，表示伺服器發生錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": str(error)  # 回傳錯誤原因
            }  # 結束回傳內容
        )  # 結束錯誤回應

    finally:  # 無論成功或失敗都會執行
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線     

@app.get("/api/user")  # 建立 GET /api/user 取得目前使用者 API
async def get_current_user(authorization: str | None = Header(default=None)):  # 接收 Authorization 標頭
    if not authorization or not authorization.startswith("Bearer "):  # 檢查是否有正確的 Bearer Token
        return JSONResponse(  # 回傳尚未登入的結果
            status_code=200,  # 使用 HTTP 200 表示請求正常完成
            content={  # 設定回傳內容
                "data": None  # 沒有 Token 代表目前沒有登入
            }  # 結束回傳內容
        )  # 結束回應

    token = authorization.split(" ", 1)[1]  # 從 Authorization 標頭取出真正的 Token

    try:  # 開始驗證 JWT Token
        payload = jwt.decode(  # 解碼並驗證 JWT Token
            token,  # 傳入前端送來的 Token
            JWT_SECRET,  # 傳入 JWT 密鑰
            algorithms=[JWT_ALGORITHM]  # 指定允許使用的加密演算法
        )  # 結束 Token 解碼

        return JSONResponse(  # 回傳目前登入使用者資料
            status_code=200,  # 設定 HTTP 200，表示請求成功
            content={  # 設定回傳內容
                "data": {  # 建立使用者資料物件
                    "id": payload["id"],  # 取得 Token 裡的會員 ID
                    "name": payload["name"],  # 取得 Token 裡的會員姓名
                    "email": payload["email"]  # 取得 Token 裡的會員 Email
                }  # 結束使用者資料物件
            }  # 結束回傳內容
        )  # 結束成功回應

    except jwt.ExpiredSignatureError:  # 如果 Token 已經過期
        return JSONResponse(  # 回傳 Token 過期訊息
            status_code=401,  # 設定 HTTP 401，表示未經授權
            content={  # 設定回傳內容
                "error": True,  # 表示驗證失敗
                "message": "Token has expired."  # 告知 Token 已過期
            }  # 結束回傳內容
        )  # 結束錯誤回應

    except (jwt.InvalidTokenError, KeyError):  # 如果 Token 無效或缺少必要資料
        return JSONResponse(  # 回傳 Token 無效訊息
            status_code=401,  # 設定 HTTP 401，表示未經授權
            content={  # 設定回傳內容
                "error": True,  # 表示驗證失敗
                "message": "Invalid token."  # 告知 Token 無效
            }  # 結束回傳內容
        )  # 結束錯誤回應   

@app.get("/api/categories")
async def get_categories():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT DISTINCT category
            FROM attractions
            WHERE category IS NOT NULL
            ORDER BY category
        """)

        categories = [
            row["category"]
            for row in cursor.fetchall()
        ]

        return {
            "data": categories
        }

    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )

    finally:
        cursor.close()
        conn.close()
@app.get("/api/mrts")
async def get_mrts():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT mrt
            FROM attractions
            WHERE mrt IS NOT NULL
            GROUP BY mrt
            ORDER BY COUNT(*) DESC
        """)

        mrts = [
            row["mrt"]
            for row in cursor.fetchall()
        ]

        return {
            "data": mrts
        }

    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )

    finally:
        cursor.close()
        conn.close()
@app.get("/api/attraction/{attractionId}")
async def get_attraction(attractionId: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM attractions
            WHERE id = %s
        """, (attractionId,))

        attraction = cursor.fetchone()

        if attraction is None:
            return JSONResponse(
                status_code=400,
                content={
                    "error": True,
                    "message": "景點編號不正確"
                }
            )

        images = attraction["images"]

        if isinstance(images, str):
            images = json.loads(images)

        return {
            "data": {
                "id": attraction["id"],
                "name": attraction["name"],
                "category": attraction["category"],
                "description": attraction["description"],
                "address": attraction["address"],
                "transport": attraction["transport"],
                "mrt": attraction["mrt"],
                "lat": float(attraction["latitude"]),
                "lng": float(attraction["longitude"]),
                "images": images
            }
        }

    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )

    finally:
        cursor.close()
        conn.close()

@app.get("/api/attractions")
async def get_attractions(
    page: int,
    category: str | None = None,
    keyword: str | None = None,
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        page_size = 8
        offset = page * page_size

        sql = """
        SELECT *
        FROM attractions
        WHERE 1=1
        """


        params = []
        if category:
            sql += " AND category = %s"
            params.append(category)
        if keyword:
            sql += " AND (mrt = %s OR name LIKE %s)"
            params.append(keyword)
            params.append(f"%{keyword}%")
        sql += " LIMIT %s OFFSET %s"
        params.extend([page_size + 1, offset])
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        has_next_page = len(rows) > page_size
        next_page = page + 1 if has_next_page else None
        rows = rows[:page_size]
        data = []
        for row in rows:
            images = row["images"]

            if isinstance(images, str):
                images = json.loads(images)
            data.append({
                    "id": row["id"],
                    "name": row["name"],
                    "category": row["category"],
                    "description": row["description"],
                    "address": row["address"],
                    "transport": row["transport"],
                    "mrt": row["mrt"],
                    "lat": float(row["latitude"]),
                    "lng": float(row["longitude"]),
                    "images": images
            })
        return {
            "nextPage": next_page,
            "data": data
        }    
    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )

    finally:
        cursor.close()
        conn.close()        

@app.post("/api/booking")  # 建立 POST /api/booking 預約 API
async def create_booking(  # 建立新增預約的函式
    booking: BookingCreate,  # 接收前端傳來的預約資料
    authorization: str | None = Header(default=None)  # 接收 Authorization 標頭
):  # 結束函式參數設定
    user_id = get_user_id(authorization)  # 從 Token 取得目前登入者的 ID

    if user_id is None:  # 如果無法取得使用者 ID
        return JSONResponse(  # 回傳尚未登入的錯誤訊息
            status_code=401,  # 設定 HTTP 401，表示尚未授權
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": "未登入會員"  # 告知使用者需要先登入
            }  
        ) 

    if booking.time not in ("morning", "afternoon"):  # 檢查預約時段是否正確
        return JSONResponse(  # 回傳錯誤訊息
            status_code=400,  # 設定 HTTP 400，表示資料格式錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": "預約時段不正確"  # 告知可使用的時段不正確
            }  
        )  

    price = 2000 if booking.time == "morning" else 2500  # 根據時段決定預約價格

    conn = get_connection()  # 連線到 MySQL 資料庫
    cursor = conn.cursor(dictionary=True)  # 建立可以回傳字典格式的游標

    try:  # 開始執行建立預約的資料庫操作
        cursor.execute(  # 查詢景點是否存在
            "SELECT id FROM attractions WHERE id = %s",  # 使用景點編號查詢景點
            (booking.attractionId,)  # 傳入前端送來的景點編號
        )  

        attraction = cursor.fetchone()  # 取得景點查詢結果

        if attraction is None:  # 如果找不到這個景點
            return JSONResponse(  # 回傳景點不存在的錯誤訊息
                status_code=400,  # 設定 HTTP 400，表示資料錯誤
                content={  # 設定回傳內容
                    "error": True,  # 表示發生錯誤
                    "message": "景點編號不正確"  # 告知景點編號錯誤
                } 
            )  

        cursor.execute(  # 新增預約或取代使用者原本的預約
            """INSERT INTO bookings (user_id, attraction_id, booking_date, booking_time, price)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                attraction_id = VALUES(attraction_id),
                booking_date = VALUES(booking_date),
                booking_time = VALUES(booking_time),
                price = VALUES(price)""",  # 使用相同 user_id 時更新原本的預約
            (user_id, booking.attractionId, booking.date, booking.time, price)  # 傳入預約欄位資料
        ) 

        conn.commit()  # 確認並儲存資料庫變更

        return {  # 回傳建立預約成功的結果
            "ok": True  # 表示預約成功
        }  

    except Exception as error:  # 如果資料庫操作發生錯誤
        conn.rollback()  # 發生錯誤時取消這次資料庫操作
        return JSONResponse(  # 回傳伺服器錯誤訊息
            status_code=500,  # 設定 HTTP 500，表示伺服器發生錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": str(error)  # 回傳實際錯誤原因
            }  
        )  

    finally:  # 無論成功或失敗都會執行
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線

@app.get("/api/booking")  # 建立 GET /api/booking 取得預約 API
async def get_booking(  # 建立取得預約資料的函式
    authorization: str | None = Header(default=None)  # 接收 Authorization 標頭
):  
    user_id = get_user_id(authorization)  # 從 Token 取得目前登入者的 ID

    if user_id is None:  # 如果使用者尚未登入
        return JSONResponse(  # 回傳尚未登入的錯誤訊息
            status_code=401,  # 設定 HTTP 401，表示尚未授權
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": "未登入會員"  # 告知使用者需要先登入
            }  
        )  

    conn = get_connection()  # 連線到 MySQL 資料庫
    cursor = conn.cursor(dictionary=True)  # 建立字典格式的資料庫游標

    try:  # 開始查詢預約資料
        cursor.execute(  # 查詢目前使用者的預約和景點資料
            """SELECT
                b.booking_date,
                b.booking_time,
                b.price,
                a.id AS attraction_id,
                a.name,
                a.address,
                a.images
            FROM bookings AS b
            JOIN attractions AS a ON b.attraction_id = a.id
            WHERE b.user_id = %s""",  # 只查詢目前登入使用者的預約
            (user_id,)  # 傳入使用者 ID
        )  

        booking = cursor.fetchone()  # 取得一筆預約資料

        if booking is None:  # 如果使用者目前沒有預約
            return {  # 回傳沒有預約的結果
                "data": None  # 使用 null 表示沒有預約資料
            }  

        images = booking["images"]  # 取得景點圖片資料

        if isinstance(images, str):  # 如果圖片資料是字串格式
            images = json.loads(images)  # 將圖片字串轉換成 Python 陣列

        return {  # 回傳預約資料
            "data": {  # 建立預約資料物件
                "attraction": {  # 建立景點資料物件
                    "id": booking["attraction_id"],  # 回傳景點編號
                    "name": booking["name"],  # 回傳景點名稱
                    "address": booking["address"],  # 回傳景點地址
                    "image": images[0] if images else None  # 回傳第一張景點圖片
                },  
                "date": booking["booking_date"].isoformat(),  # 將日期轉成文字格式
                "time": booking["booking_time"],  # 回傳預約時段
                "price": booking["price"]  # 回傳預約價格
            }  
        }  

    except Exception as error:  # 如果資料庫操作發生錯誤
        return JSONResponse(  # 回傳伺服器錯誤訊息
            status_code=500,  # 設定 HTTP 500，表示伺服器發生錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": str(error)  # 回傳實際錯誤原因
            }  
        )  

    finally:  # 無論成功或失敗都會執行
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線

@app.delete("/api/booking")  # 建立 DELETE /api/booking 刪除預約 API
async def delete_booking(  # 建立刪除預約的函式
    authorization: str | None = Header(default=None)  # 接收 Authorization 標頭
):  
    user_id = get_user_id(authorization)  # 從 Token 取得目前登入者的 ID

    if user_id is None:  # 如果使用者尚未登入
        return JSONResponse(  # 回傳尚未登入的錯誤訊息
            status_code=401,  # 設定 HTTP 401，表示尚未授權
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": "未登入會員"  # 告知使用者需要先登入
            }  
        )  

    conn = get_connection()  # 連線到 MySQL 資料庫
    cursor = conn.cursor()  # 建立資料庫游標

    try:  # 開始執行刪除預約操作
        cursor.execute(  # 刪除目前登入使用者的預約
            "DELETE FROM bookings WHERE user_id = %s",  # 只刪除目前使用者的預約
            (user_id,)  # 傳入使用者 ID
        )  

        conn.commit()  # 確認並儲存資料庫變更

        return {  # 回傳刪除成功的結果
            "ok": True  # 表示刪除成功
        }  

    except Exception as error:  # 如果資料庫操作發生錯誤
        conn.rollback()  # 發生錯誤時取消這次資料庫操作
        return JSONResponse(  # 回傳伺服器錯誤訊息
            status_code=500,  # 設定 HTTP 500，表示伺服器發生錯誤
            content={  # 設定回傳內容
                "error": True,  # 表示發生錯誤
                "message": str(error)  # 回傳實際錯誤原因
            }  
        )  

    finally:  # 無論成功或失敗都會執行
        cursor.close()  # 關閉資料庫游標
        conn.close()  # 關閉資料庫連線