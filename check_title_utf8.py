import yt_dlp
import sys

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    sys.stdout.buffer.write(info.get("title", "").encode("utf-8") + b"\n")