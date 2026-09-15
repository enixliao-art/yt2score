import yt_dlp

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
ydl_opts = {
    "format": "18",
    "extractor_args": {"youtube": {"player_client": ["ios", "android"]}},
    "quiet": True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    print("Video Title:", info.get("title"))
    print("Stream URL acquired:", info.get("url")[:60])