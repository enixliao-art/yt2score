import yt_dlp
import requests
import cv2
import numpy as np

url = "https://www.youtube.com/watch?v=d9IbTyrrYMc"
with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
    info = ydl.extract_info(url, download=False)
    sb0 = [f for f in info.get("formats", []) if f.get("format_id") == "sb0"][0]
    base_sb_url = sb0.get("url")

# 下載 M1 與 M2
for m_idx in [1, 2]:
    r = requests.get(base_sb_url.replace("M$M.jpg", f"M{m_idx}.jpg"))
    img = cv2.imdecode(np.asarray(bytearray(r.content), dtype=np.uint8), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    ch, cw = h // 5, w // 5
    for r_idx in range(5):
        for c_idx in range(5):
            sub = img[r_idx*ch:(r_idx+1)*ch, c_idx*cw:(c_idx+1)*cw]
            # 專門檢查左上角記分板 (x: 10~150, y: 10~80)
            bug = sub[10:80, 10:150]
            # 檢查右邊菱形壘包 (一壘包在菱形右側頂點: x: 105~125, y: 15~35)
            # 當一壘有人時，壘包會被填成黃色或白色
            b1_crop = bug[15:40, 105:130]
            b1_mean = np.mean(b1_crop)
            # 檢查出局數燈號 (O 後方的兩盞燈: y: 40~55, x: 80~110)
            out_crop = bug[40:55, 80:110]
            
            global_frame_idx = (m_idx * 25) + (r_idx * 5 + c_idx)
            est_sec = global_frame_idx * 5.8 # 每幀約 5.8 秒
            
            # 若在 03:30 ~ 07:00 之間
            if 200 <= est_sec <= 420:
                fn = f"play_sec_{int(est_sec)}.jpg"
                cv2.imwrite(fn, sub)
                print(f"[{int(est_sec//60):02d}:{int(est_sec%60):02d}] 儲存真實比賽畫面: {fn}")