import json
from db import get_connection

def parse_images(img_host: str, imgurls: str) -> list[str]:
    """
    將：
    /imgs/1-0.jpg/imgs/1-1.jpg

    轉成：
    [
        "https://.../imgs/1-0.jpg",
        "https://.../imgs/1-1.jpg"
    ]
    """
    paths = imgurls.split("/imgs/")

    return [
        f"{img_host}/imgs/{path}"
        for path in paths
        if path
    ]


conn = get_connection()

cursor = conn.cursor()

with open(
    "data/taipei-attractions.json",
    "r",
    encoding="utf-8",
) as file:
    raw_data = json.load(file)

img_host = raw_data["img_host"]
attractions = raw_data["list"]

sql = """
INSERT INTO attractions (
    id,
    name,
    category,
    description,
    address,
    transport,
    mrt,
    latitude,
    longitude,
    images
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category = VALUES(category),
    description = VALUES(description),
    address = VALUES(address),
    transport = VALUES(transport),
    mrt = VALUES(mrt),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude),
    images = VALUES(images)
"""

try:
    for attraction in attractions:
        images = parse_images(
            img_host,
            attraction["imgurls"],
        )

        # 原始資料的「其　　他」含有全形空白，匯入前清除避免分類顯示被拆開。
        category = attraction["CAT"].replace("　", "").strip()

        values = (
            attraction["_id"],
            attraction["name"],
            category,
            attraction["description"],
            attraction["address"],
            attraction["direction"],
            attraction.get("MRT"),
            float(attraction["latitude"]),
            float(attraction["longitude"]),
            json.dumps(images, ensure_ascii=False),
        )

        cursor.execute(sql, values)

    conn.commit()
    print(f"成功匯入 {cursor.rowcount} 筆異動資料")
    print(f"JSON 原始景點數量：{len(attractions)}")

except Exception as error:
    conn.rollback()
    print(f"匯入失敗：{error}")

finally:
    cursor.close()
    conn.close()
