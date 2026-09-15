import subprocess
import json
import cv2
import os

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

# 1. 取得 360p 串流網址
print("[1] 取得串流網址...")
cmd = ["python", "-m", "yt_dlp", "-f", "best[height<=360]/worst", "-g", url]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
stream_url = res.stdout.strip()
print(f"串流網址獲取成功: {stream_url[:50]}...")

# 2. 開啟 VideoCapture 取樣前 8 分鐘尋找字卡
print("[2] 取樣前 8 分鐘截圖...")
cap = cv2.VideoCapture(stream_url)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

# 抽樣前 8 分鐘 (480秒)，每 10 秒存 1 張圖測試
os.makedirs("debug_frames", exist_ok=True)
saved = 0

for sec in range(10, 480, 15):
    frame_no = int(sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    if ret:
        fn = f"debug_frames/sec_{sec:03d}.jpg"
        cv2.imwrite(fn, frame)
        saved += 1
        if saved >= 8:
            break

cap.release()
print(f"已儲存 {saved} 張抽樣幀至 debug_frames/")