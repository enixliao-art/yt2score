import yt_dlp
import json

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    storyboards = [f for f in formats if "storyboard" in f.get("format_note", "") or f.get("ext") == "mhtml" or "sb" in f.get("format_id", "")]
    print(f"Found {len(storyboards)} storyboard tracks")
    if storyboards:
        print("Storyboard URL:", storyboards[0].get("url"))