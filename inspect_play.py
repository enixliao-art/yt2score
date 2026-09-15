import yt_dlp
import requests
import cv2
import numpy as np

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    sb0 = [f for f in info.get("formats", []) if f.get("format_id") == "sb0"][0]
    base_sb_url = sb0.get("url")

# 下載 M1 (涵蓋 02:30 ~ 05:00)
r = requests.get(base_sb_url.replace("M$M.jpg", "M1.jpg"))
img = cv2.imdecode(np.asarray(bytearray(r.content), dtype=np.uint8), cv2.IMREAD_COLOR)

# 切出 5x5 的個別畫面
h, w = img.shape[:2]
ch, cw = h // 5, w // 5

# 第 1 棒打擊時 (約在第 2~4 列)
for idx, (row, col) in enumerate([(1, 3), (2, 1), (2, 3), (3, 0), (3, 2)]):
    sub = img[row*ch:(row+1)*ch, col*cw:(col+1)*cw]
    cv2.imwrite(f"real_play_{idx}.jpg", sub)

print("Saved real_play_0~4.jpg!")