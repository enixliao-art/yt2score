import yt_dlp

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

# 僅下載前 10MB 的影片片段 (前 15~30 秒)
ydl_opts = {
    "format": "18",
    "outtmpl": "sample_clip.mp4",
    "downloader_args": {"ffmpeg_i": ["-ss", "0", "-t", "40"]},
    "quiet": False,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([url])

print("Sample clip downloaded!")