import yt_dlp
import cv2
import os

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

ydl_opts = {
    "format": "18", # 直接選擇 640x360 預合成串流
    "quiet": True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    stream_url = info["url"]
    print("Direct 360p Stream URL acquired!")

os.makedirs("debug_frames", exist_ok=True)
cap = cv2.VideoCapture(stream_url)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

# 抽樣 30 秒, 60 秒, 90 秒, 120 秒, 180 秒, 240 秒, 300 秒, 360 秒
sample_seconds = [15, 45, 75, 120, 180, 240, 300, 360, 420]
for sec in sample_seconds:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(sec * fps))
    ret, frame = cap.read()
    if ret:
        fn = f"debug_frames/sec_{sec:03d}.jpg"
        cv2.imwrite(fn, frame)
        print(f"Captured: {fn}")

cap.release()
print("Sample frames extraction complete!")