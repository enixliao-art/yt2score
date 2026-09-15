import yt_dlp
import requests

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
ydl_opts = {
    "format": "18",
    "extractor_args": {"youtube": {"player_client": ["android"]}},
    "quiet": True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    stream_url = info["url"]
    headers = info.get("http_headers", {})

# 測試以 HTTP Range 下載前 2MB 影片測試
headers["Range"] = "bytes=0-2097152"
r = requests.get(stream_url, headers=headers, timeout=10)
print(f"HTTP Status: {r.status_code}, Bytes downloaded: {len(r.content)}")
with open("sample_start.mp4", "wb") as f:
    f.write(r.content)
print("sample_start.mp4 saved successfully!")