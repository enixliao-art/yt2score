import yt_dlp
import requests

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    # 尋找解析度更高的 storyboard (sb1 或 sb2 或 sb3)
    sb_formats = [f for f in formats if "sb" in f.get("format_id", "")]
    for sb in sb_formats:
        print(sb.get("format_id"), sb.get("width"), sb.get("height"), sb.get("url"))