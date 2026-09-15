import yt_dlp
import json

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    print("Title:", info.get("title"))
    print("Channel:", info.get("channel"))