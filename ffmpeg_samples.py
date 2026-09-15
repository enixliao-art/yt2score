import yt_dlp
import subprocess
import os

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

ydl_opts = {
    "format": "18",
    "quiet": True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    stream_url = info["url"]

os.makedirs("debug_frames", exist_ok=True)

# 使用 ffmpeg 抽取單一幀，穩定度極高且免除 OpenCV https 協議限制
for sec in [15, 60, 120, 180, 240, 300, 360, 420]:
    out_file = f"debug_frames/sec_{sec:03d}.jpg"
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(sec),
        "-i", stream_url,
        "-vframes", "1",
        "-q:v", "2",
        out_file
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(out_file):
        print(f"Captured: {out_file}")

print("FFmpeg capture completed!")