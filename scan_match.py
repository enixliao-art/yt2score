import yt_dlp
import requests
import cv2
import os

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"

ydl_opts = {
    "format": "18",
    "extractor_args": {"youtube": {"player_client": ["android"]}},
    "quiet": True,
}

print("[1] 取得 YouTube 串流...")
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    stream_url = info["url"]
    headers = info.get("http_headers", {})

# 下載前 25MB (約涵蓋前 5~8 分鐘開賽畫面)
print("[2] 下載開賽區間數據 (25MB)...")
headers["Range"] = "bytes=0-26214400"
r = requests.get(stream_url, headers=headers, timeout=20)
with open("early_game.mp4", "wb") as f:
    f.write(r.content)

print("[3] 進行抽幀掃描尋找攻守名單字卡...")
os.makedirs("cards_scanned", exist_ok=True)
cap = cv2.VideoCapture("early_game.mp4")
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

step = int(fps * 5) # 每 5 秒抽 1 幀
frame_idx = 0
saved = 0

while frame_idx < total_frames:
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if not ret:
        break
    
    # 儲存抽樣幀
    sec = int(frame_idx / fps)
    out_name = f"cards_scanned/frame_{sec:03d}s.jpg"
    cv2.imwrite(out_name, frame)
    saved += 1
    frame_idx += step

cap.release()
print(f"[4] 完成！已擷取 {saved} 張開賽畫面至 cards_scanned/")