import yt_dlp
import requests

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    # 取得音訊串流
    audio_format = [f for f in formats if f.get("format_id") == "251" or f.get("acodec") != "none"][0]
    audio_url = audio_format.get("url")

# 下載 03:30 ~ 05:00 之間的音訊片段 (約 1MB)
# 251 的碼率約 100kbps，90 秒約 1.1MB
headers = audio_format.get("http_headers", {})
headers["Range"] = "bytes=2000000-3200000"
r = requests.get(audio_url, headers=headers, timeout=10)
with open("anchor_play1.webm", "wb") as f:
    f.write(r.content)
print("Saved anchor audio clip, size:", len(r.content))