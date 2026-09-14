"""Modal.com Serverless Pipeline for yt2score.
Provides distributed chunk analysis, lineup OCR, and WebSocket / Webhook entry points.
Fully cloud-native, zero local dependencies.
"""
import os
import modal
from typing import Dict, Any, List

# 定義雲端容器映像檔，包含 ffmpeg 與 Python 科學/視覺運算套件
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "opencv-python-headless>=4.9.0",
        "yt-dlp>=2024.3.10",
        "numpy>=1.26.0",
        "pydantic>=2.7.0",
        "google-genai>=0.1.1",
        "supabase>=2.4.0",
    )
)

app = modal.App(name="yt2score-service", image=image)


@app.function(timeout=600, secrets=[modal.Secret.from_name("gemini-secret", required=False)])
def scan_lineup_card(youtube_url: str) -> Dict[str, Any]:
    """
    雲端任務：以 360p 取樣影片前 8 分鐘，擷取攻守字卡並使用 Gemini 進行結構化 OCR
    """
    import subprocess
    import cv2
    from worker.lineup_detector import LineupDetector

    # 1. 透過 yt-dlp 取得 360p 直播視訊真實串流網址
    cmd = ["yt-dlp", "-f", "best[height<=360]/worst", "-g", youtube_url]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    stream_url = res.stdout.strip()

    # 2. 開啟串流取樣
    cap = cv2.VideoCapture(stream_url)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    detector = LineupDetector()

    # 每 5 秒抽 1 幀，最多看前 8 分鐘 (480 秒)
    step_frames = int(fps * 5)
    max_frames = int(fps * 480)
    current_frame = 0

    best_card_bytes = None
    lineup_result = None

    while current_frame < max_frames and cap.isOpened():
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
        ret, frame = cap.read()
        if not ret:
            break

        if detector.is_lineup_card_candidate(frame):
            _, buf = cv2.imencode(".jpg", frame)
            best_card_bytes = buf.tobytes()
            lineup = detector.extract_lineup_with_gemini(best_card_bytes)
            if lineup and (len(lineup.guest_team.lineup) > 0 or len(lineup.home_team.lineup) > 0):
                lineup_result = lineup.model_dump()
                break

        current_frame += step_frames

    cap.release()
    return {
        "status": "success" if lineup_result else "manual_input_required",
        "lineup": lineup_result,
        "has_card_image": best_card_bytes is not None,
    }


@app.function(timeout=600)
def process_video_chunk(chunk_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    分散式切片 Worker：負責 10 分鐘區間的 360p 抽幀、Scorebug 差分與動作偵測
    """
    stream_url = chunk_info["stream_url"]
    start_sec = chunk_info["start_sec"]
    end_sec = chunk_info["end_sec"]

    import cv2
    from worker.scorebug_tracker import ScorebugTracker

    tracker = ScorebugTracker()
    cap = cv2.VideoCapture(stream_url)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    start_frame = int(start_sec * fps)
    end_frame = int(end_sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    events_detected = []
    current_f = start_frame
    sample_interval = int(fps * 2.5) # 每 2.5 秒取樣一次

    while current_f < end_frame and cap.isOpened():
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_f)
        ret, frame = cap.read()
        if not ret:
            break

        timestamp_sec = current_f / fps
        has_motion, crop = tracker.has_motion(frame)

        if has_motion:
            state = tracker.parse_state_from_scorebug(crop, timestamp_sec)
            events_detected.append(state.model_dump())

        current_f += sample_interval

    cap.release()
    return events_detected
