import yt_dlp
import requests
import json
import os

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    sb0 = [f for f in formats if f.get("format_id") == "sb0"][0]
    base_sb_url = sb0.get("url")

# 下載 M1, M2, M3 查看字卡出現的時間點
for i in [1, 2, 3]:
    target_url = base_sb_url.replace("M$M.jpg", f"M{i}.jpg")
    r = requests.get(target_url)
    with open(f"storyboard_high_{i}.jpg", "wb") as f:
        f.write(r.content)
    print(f"Saved storyboard_high_{i}.jpg")