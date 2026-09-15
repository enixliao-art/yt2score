import yt_dlp
import requests
import json
import cv2
import numpy as np

# 1. 抓取 YouTube 影片的 storyboard 清單（最快取得高畫質連續幀的方式）
url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
print("[1] 獲取影片分鏡串流...")
with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    sb0 = [f for f in formats if f.get("format_id") == "sb0"][0]
    base_sb_url = sb0.get("url")

# 下載前 4 張 storyboard (涵蓋前 10 分鐘，每張約含 25 幀，每幀間隔約 4~5 秒)
print("[2] 下載開賽實況幀...")
frames = []
for i in range(4):
    target_url = base_sb_url.replace("M$M.jpg", f"M{i}.jpg")
    r = requests.get(target_url)
    img_array = np.asarray(bytearray(r.content), dtype=np.uint8)
    mosaic = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if mosaic is not None:
        # 分解 5x5 的 mosaic 拼貼 (每格 320x180)
        h, w = mosaic.shape[:2]
        cell_h, cell_w = h // 5, w // 5
        for r_idx in range(5):
            for c_idx in range(5):
                frame = mosaic[r_idx*cell_h:(r_idx+1)*cell_h, c_idx*cell_w:(c_idx+1)*cell_w]
                frames.append(frame)

print(f"共取得 {len(frames)} 個實況時間點！")

# 2. 針對每幀裁切左上角 ScoreLive 記分板，檢測燈號與壘包
# 記分板位置約在: y: 8~60, x: 8~120
detected_events = []
# 影片總長 5568 秒，每張 mosaic 代表約 150 秒 (每幀約 6 秒)
time_per_frame = 5568.0 / (len(formats) * 25) # 大約每幀 6 秒

for idx, frame in enumerate(frames[:60]): # 檢視前 6 分鐘
    est_sec = idx * 6.0
    if est_sec < 180 or est_sec > 360:
        continue # 專注在第 1 局首棒打擊區間 (03:00 ~ 06:00)

    h_f, w_f = frame.shape[:2]
    # 裁切記分板
    bug = frame[5:65, 5:140]
    hsv = cv2.cvtColor(bug, cv2.COLOR_BGR2HSV)
    
    # 偵測一壘壘包點亮 (亮黃色/橘色: H: 10~30, S: 150~255, V: 150~255)
    # 壘包菱形區域約在記分板右側 (x: 80~125, y: 5~45)
    bases_area = bug[5:45, 80:125]
    bases_hsv = cv2.cvtColor(bases_area, cv2.COLOR_BGR2HSV)
    yellow_mask = cv2.inRange(bases_hsv, np.array([10, 120, 120]), np.array([35, 255, 255]))
    yellow_pixels = cv2.countNonZero(yellow_mask)

    # 儲存抽樣供確認
    if idx % 3 == 0:
        cv2.imwrite(f"frame_sec_{int(est_sec)}.jpg", bug)
        print(f"[{int(est_sec//60):02d}:{int(est_sec%60):02d}] 記分板狀態 - 壘包像素: {yellow_pixels}")

print("實測分析完成！")cv2.imwrite("full_frame_0354.jpg", frames[39])
cv2.imwrite("full_frame_0412.jpg", frames[42])
print("Saved full frames!")