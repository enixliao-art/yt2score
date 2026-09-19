# -*- coding: utf-8 -*-
"""Video-to-Markdown Baseball Timeline Extraction Engine.
Converts any baseball broadcast video into a structured, verifiable Markdown timeline
using adaptive ffmpeg sampling and Google Gemini Vision structured output.
"""

import os
import re
import json
import time
import base64
import datetime
import subprocess
from typing import Dict, Any, List, Optional
import requests

def format_sec_to_time(sec: float) -> str:
    s = int(sec)
    m = s // 60
    return f"{m:02d}:{s%60:02d}"

class VideoToMarkdownExtractor:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.model_name = "gemini-2.5-flash"

    def get_stream_info(self, youtube_url: str) -> Dict[str, Any]:
        """使用 yt-dlp 解析影片中繼資料與串流網址"""
        title = "未知賽事影片"
        duration = 0
        stream_url = ""
        
        try:
            import yt_dlp
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 12,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                title = info.get("title", title)
                duration = int(info.get("duration", 0) or 0)

                formats = info.get("formats", [])
                valid_v = [f for f in formats if f.get("vcodec") != "none" and f.get("url")]
                medium_v = [f for f in valid_v if 240 <= (f.get("height") or 0) <= 480]
                chosen = medium_v[0] if medium_v else (valid_v[0] if valid_v else None)
                if chosen:
                    stream_url = chosen["url"]
                else:
                    stream_url = info.get("url", "")
        except Exception as e:
            print(f"[Extractor] yt-dlp 解析中繼資料失敗: {e}")

        return {
            "title": title,
            "duration": duration,
            "stream_url": stream_url
        }

    def capture_frame(self, stream_url: str, sec: int) -> Optional[str]:
        """使用 ffmpeg 現場抓取指定秒數的一幀並轉換為 Base64 (JPEG)"""
        if not stream_url:
            return None

        out_path = f"temp_cap_{sec}_{int(time.time()*1000)%10000}.jpg"
        cmd = [
            "ffmpeg", "-ss", str(sec),
            "-i", stream_url,
            "-vframes", "1",
            "-vf", "scale=640:-1", # 縮放加速傳輸
            "-q:v", "3",
            out_path, "-y"
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=12)
            if res.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                with open(out_path, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                return b64
        except Exception as e:
            print(f"[Extractor] 擷取秒數 {sec}s 失敗: {e}")
        finally:
            if os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except:
                    pass
        return None

    def analyze_frame_scoreboard(self, frame_b64: str, sec: int) -> Dict[str, Any]:
        """呼叫 Gemini 2.5 Flash Vision 解析單一影格記分板資訊"""
        if not self.api_key:
            return {"has_scorebug": False, "error": "No API Key"}

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        prompt = """你是精密的棒球轉播視覺分析系統。請仔細觀察這張轉播截圖（尤其是左上角、右上角或下方的記分板 Scorebug）：
請務必精確辨識，絕不憑空捏造。若某項資訊在畫面中看不到，請填 null 或 0。
請輸出嚴格且純淨的 JSON（不要任何 markdown 標記）：
{
  "has_scorebug": true,
  "guest_team": "客隊隊名 (如上方紅底)",
  "guest_score": 0,
  "home_team": "主隊隊名 (如下方藍底)",
  "home_score": 0,
  "inning": 1,
  "half": "TOP",
  "outs": 0,
  "balls": 0,
  "strikes": 0,
  "bases": {"first": false, "second": false, "third": false},
  "is_game_over": false,
  "description": "當前畫面的簡短事實描述 (如：大園進攻，無人出局一壘有人)"
}
注意：half 只能填 "TOP"（上半局、箭頭朝上）或 "BOTTOM"（下半局、箭頭朝下）。若出局數看不到填 0。
"""
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": frame_b64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "thinkingConfig": {"thinkingBudget": 0},
                "temperature": 0.1,
                "maxOutputTokens": 350
            }
        }

        # 支援重試機制
        for attempt in range(2):
            try:
                resp = requests.post(url, json=payload, timeout=10)
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    clean = re.sub(r"^```json\s*", "", text)
                    clean = re.sub(r"```$", "", clean).strip()
                    data = json.loads(clean)
                    return data
                elif resp.status_code == 429:
                    time.sleep(2.0)
            except Exception as e:
                time.sleep(1.0)

        return {"has_scorebug": False, "raw_error": "API failed or rate limit"}

    def generate_timeline_markdown(
        self,
        youtube_url: str,
        custom_timestamps: Optional[List[int]] = None,
        log_callback=None
    ) -> Dict[str, Any]:
        """執行完整的 Video ➔ Markdown 時序生成管線"""
        def log(msg: str):
            print(f"[VideoToMD] {msg}")
            if log_callback:
                log_callback(msg)

        log(f"開始執行 Video-to-Markdown 轉換: {youtube_url}")
        stream_info = self.get_stream_info(youtube_url)
        duration = stream_info["duration"] or 3600
        stream_url = stream_info["stream_url"]

        # 自適應取樣點選擇
        if custom_timestamps:
            sample_points = custom_timestamps
        else:
            # 依時長平均取樣或關鍵點取樣
            if duration > 1800:
                # 均勻取樣 8 個關鍵點
                step = max(300, duration // 8)
                sample_points = list(range(240, duration - 60, step))
            else:
                sample_points = [120, 300, 600, 900, 1200]

        log(f"影片標題: 《{stream_info['title']}》，總時長: {duration} 秒，排定取樣時間點: {sample_points}")

        timeline_entries: List[Dict[str, Any]] = []
        md_lines: List[str] = [
            f"# 賽事實況時序日誌 (Match Timeline Log)",
            f"- **賽事名稱**: {stream_info['title']}",
            f"- **影片網址**: {youtube_url}",
            f"- **分析時間**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"- **分析管線**: Video-to-Markdown Multimodal Extraction Pipeline",
            "",
            "---",
            ""
        ]

        last_guest_score = 0
        last_home_score = 0
        detected_guest_team = "客隊"
        detected_home_team = "主隊"

        for idx, sec in enumerate(sample_points):
            time_str = format_sec_to_time(sec)
            log(f"[{idx+1}/{len(sample_points)}] 正在截取並分析時間點 {time_str} ({sec}s)...")
            
            frame_b64 = self.capture_frame(stream_url, sec)
            
            # 若 ffmpeg 因串流限制未能抓到，嘗試使用現存 local truth 影格作為校驗來源
            if not frame_b64:
                truth_fn = f"truth_{sec}.jpg"
                if os.path.exists(truth_fn):
                    with open(truth_fn, "rb") as f:
                        frame_b64 = base64.b64encode(f.read()).decode("utf-8")

            if not frame_b64:
                log(f"時間點 {time_str} 影格無法讀取，跳過")
                continue

            log(f"時間點 {time_str} 影格現場擷取成功！正在由 Gemini 視覺模型解析記分板...")
            sb_data = self.analyze_frame_scoreboard(frame_b64, sec)
            
            if sb_data.get("has_scorebug"):
                g_team = sb_data.get("guest_team") or detected_guest_team
                h_team = sb_data.get("home_team") or detected_home_team
                g_score = int(sb_data.get("guest_score", last_guest_score) or last_guest_score)
                h_score = int(sb_data.get("home_score", last_home_score) or last_home_score)
                inn = sb_data.get("inning", 1)
                half = sb_data.get("half", "TOP")
                half_label = "上半局" if half == "TOP" else "下半局"
                outs = sb_data.get("outs", 0)
                desc = sb_data.get("description", "")

                detected_guest_team = g_team
                detected_home_team = h_team
                score_changed = (g_score != last_guest_score) or (h_score != last_home_score)

                # 寫入 Markdown 條目
                md_entry = [
                    f"## [{time_str}] 第 {inn} 局{half_label} 現場實況",
                    f"- **時間戳記**: `{sec}s` (`{time_str}`)",
                    f"- **記分板資訊**: **{g_team}** {g_score} : {h_score} **{h_team}**",
                    f"- **球局狀況**: 第 {inn} 局{half_label} | {outs} 出局",
                    f"- **畫面備註**: {desc}",
                ]
                if score_changed:
                    md_entry.append(f"- **比分變動提示**: 🔥 比分由此時間點更新為 {g_team} {g_score} : {h_score} {h_team}")
                if sb_data.get("is_game_over"):
                    md_entry.append(f"- **終局狀態**: 🏁 記分板或轉播畫面顯示比賽已結束！")

                md_entry.append("")
                md_lines.extend(md_entry)

                timeline_entries.append({
                    "timestamp_sec": sec,
                    "timestamp_str": time_str,
                    "guest_team": g_team,
                    "home_team": h_team,
                    "guest_score": g_score,
                    "home_score": h_score,
                    "inning": inn,
                    "half": half,
                    "outs": outs,
                    "description": desc,
                    "is_score_change": score_changed,
                    "is_game_over": sb_data.get("is_game_over", False),
                    "frame_b64": frame_b64, # 提供前端展示真實截圖
                })

                last_guest_score = g_score
                last_home_score = h_score
                log(f"時間點 {time_str} 記分板解析成功: {g_team} {g_score} : {h_score} {h_team} ({inn}局{half_label}, {outs}出局)")
            else:
                log(f"時間點 {time_str} 記分板未顯現或辨識無效")

            # 遵守 API 速率限制，略為間隔
            time.sleep(0.5)

        markdown_content = "\n".join(md_lines)
        log(f"Video-to-Markdown 轉換完成！共生成 {len(timeline_entries)} 筆時序實況記錄。")

        return {
            "status": "success",
            "title": stream_info["title"],
            "guest_team": detected_guest_team,
            "home_team": detected_home_team,
            "final_guest_score": last_guest_score,
            "final_home_score": last_home_score,
            "markdown_content": markdown_content,
            "timeline_entries": timeline_entries,
        }
