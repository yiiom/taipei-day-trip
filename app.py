import json
from fastapi import FastAPI,Request
from fastapi.responses import FileResponse, JSONResponse
from db import get_connection
app=FastAPI()


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