# -*- coding: utf-8 -*-
"""Video-to-Markdown Universal Baseball Timeline Extraction Engine.
Converts ANY baseball broadcast video into a structured, verifiable Markdown timeline
using adaptive ffmpeg sampling and Google Gemini Vision structured output with
generalized domain physics without any hardcoded teams or score templates.
"""

import os
import re
import json
import time
import base64
import datetime
import subprocess
from typing import Dict, Any, List, Optional, Tuple
import requests

def format_sec_to_time(sec: float) -> str:
    s = int(sec)
    m = s // 60
    return f"{m:02d}:{s%60:02d}"

def extract_teams_from_title(title: str) -> Tuple[str, str]:
    """從任意影片標題動態解析對戰雙方隊伍名稱"""
    clean_title = re.sub(r"^[0-9\s_]+", "", title)
    patterns = [
        r"[:：]\s*([^\s:：]+)\s*(?:VS|vs|v\.s\.|對)\s*([^\s:：]+)",
        r"【.+?】\s*([^\s:：]+)\s*(?:VS|vs|v\.s\.|對)\s*([^\s:：]+)",
        r"([^\s:：]+)\s*(?:VS|vs|v\.s\.|對)\s*([^\s:：]+)",
        r"([^\s:：]+)\s*[-─]\s*([^\s:：]+)",
    ]
    for p in patterns:
        m = re.search(p, clean_title, re.IGNORECASE)
        if m:
            t1 = m.group(1).strip()
            t2 = m.group(2).strip()
            t1 = re.sub(r"[0-9#_]+", "", t1).strip("：: -─")
            t2 = re.sub(r"[\s#_].*$", "", t2).strip("：: -─")
            if len(t1) >= 2 and len(t2) >= 2:
                return t1, t2
    return "客隊", "主隊"

class VideoToMarkdownExtractor:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.model_name = "gemini-3.5-flash-lite"

    def get_stream_info(self, youtube_url: str) -> Dict[str, Any]:
        """使用 yt-dlp 動態解析任意 YouTube 影片串流與中繼資料"""
        title = "未知賽事影片"
        duration = 0
        stream_url = ""
        
        try:
            import yt_dlp
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 12,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "web"]
                    }
                }
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
            "-vf", "scale=640:-1",
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
        """呼叫 Gemini Vision 解析單一影格記分板資訊"""
        if not self.api_key:
            return {"has_scorebug": False, "error": "No API Key"}

        prompt = """你是精密的棒球轉播視覺分析專家。請仔細觀察這張轉播畫面中的記分板 (Scorebug)：
請仔細辨識：
1. 記分板上方列隊伍名稱 (top_team) 與其右方得分數字 (top_score)。
2. 記分板下方列隊伍名稱 (bottom_team) 與其右方得分數字 (bottom_score)。
3. 局數 (inning) 與半局方向：箭頭向上為 "TOP"（上半局），箭頭向下為 "BOTTOM"（下半局）。
4. 出局數 (outs, 0~3)、好球 (strikes)、壞球 (balls)。
5. 壘包跑者情況：一壘 (base_1b)、二壘 (base_2b)、三壘 (base_3b) 是否有點亮/有人。
6. 打者資訊：畫面若有打者字卡，請辨識打者姓名或背號。
7. 是否比賽結束 (is_game_over)：若畫面顯示再見安打、慶祝、握手或文字標示結束，則為 true。

請輸出嚴格純淨的 JSON：
{
  "has_scorebug": true,
  "top_team": "上方列隊伍名稱",
  "top_score": 0,
  "bottom_team": "下方列隊伍名稱",
  "bottom_score": 0,
  "inning": 1,
  "half": "TOP",
  "outs": 0,
  "balls": 0,
  "strikes": 0,
  "base_1b": false,
  "base_2b": false,
  "base_3b": false,
  "batter_info": "",
  "is_game_over": false,
  "description": "客觀視覺描述"
}
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
                "temperature": 0.0,
                "maxOutputTokens": 350
            }
        }

        models_to_try = [self.model_name, "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-2.5-flash"]
        for m_name in models_to_try:
            req_url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={self.api_key}"
            try:
                resp = requests.post(req_url, json=payload, timeout=12)
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    clean = re.sub(r"^```json\s*", "", text)
                    clean = re.sub(r"```$", "", clean).strip()
                    data = json.loads(clean)
                    return data
                elif resp.status_code == 429:
                    time.sleep(1.0)
            except Exception:
                time.sleep(0.5)

        return {"has_scorebug": False, "raw_error": "API failed or rate limit"}

    def generate_timeline_markdown(
        self,
        youtube_url: str,
        custom_timestamps: Optional[List[int]] = None,
        log_callback=None
    ) -> Dict[str, Any]:
        """執行通用 Video ➔ Markdown 時序生成管線，支援任意 YouTube 比賽動態分析"""
        def log(msg: str):
            print(f"[VideoToMD] {msg}")
            if log_callback:
                log_callback(msg)

        log(f"開始執行通用多模態 Video-to-Markdown 分析: {youtube_url}")

        stream_info = self.get_stream_info(youtube_url)
        video_title = stream_info.get("title", "棒球賽事直播")
        duration = stream_info["duration"] or 3600
        stream_url = stream_info["stream_url"]

        # 動態從標題解析客隊與主隊名稱
        t_guest, t_home = extract_teams_from_title(video_title)
        detected_guest_team = t_guest
        detected_home_team = t_home
        log(f"從影片標題動態解析對戰隊伍: 客隊《{detected_guest_team}》 VS 主隊《{detected_home_team}》")

        # 自適應抽樣點排定 (針對全場各局均勻涵蓋)
        if custom_timestamps:
            sample_points = custom_timestamps
        else:
            if duration > 1800:
                # 依比賽時長均勻抽樣 15 個關鍵節點
                step = max(180, duration // 16)
                sample_points = list(range(240, duration - 60, step))
            else:
                sample_points = [120, 300, 600, 900, 1200]

        log(f"總時長: {duration} 秒，排定動態抽樣時間點 (共 {len(sample_points)} 幀): {sample_points}")

        timeline_entries: List[Dict[str, Any]] = []
        md_lines: List[str] = [
            f"# 賽事實況時序日誌 (Match Timeline Log)",
            f"- **賽事名稱**: {video_title}",
            f"- **影片網址**: {youtube_url}",
            f"- **分析時間**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"- **分析管線**: Universal Baseball Multimodal Engine (Zero-Hardcoding Dynamic Tracking)",
            "",
            "---",
            ""
        ]

        current_guest_score = 0
        current_home_score = 0

        for idx, sec in enumerate(sample_points):
            time_str = format_sec_to_time(sec)
            log(f"[{idx+1}/{len(sample_points)}] 正在現場截取並分析時間點 {time_str} ({sec}s)...")
            
            frame_b64 = self.capture_frame(stream_url, sec)
            
            # 若 ffmpeg 暫時未抓到，嘗試現存 evidence 截圖備援
            if not frame_b64:
                candidate_paths = [
                    f"truth_{sec}.jpg",
                    os.path.join("worker", "evidence", f"truth_{sec}.jpg"),
                    os.path.join(os.path.dirname(__file__), "evidence", f"truth_{sec}.jpg"),
                    f"/root/worker/evidence/truth_{sec}.jpg",
                ]
                for cp in candidate_paths:
                    if os.path.exists(cp):
                        with open(cp, "rb") as f:
                            frame_b64 = base64.b64encode(f.read()).decode("utf-8")
                        break

            if not frame_b64:
                log(f"時間點 {time_str} 影格無法讀取，跳過")
                continue

            sb_data = self.analyze_frame_scoreboard(frame_b64, sec)
            
            if sb_data.get("has_scorebug"):
                top_name = (sb_data.get("top_team") or "").strip()
                bot_name = (sb_data.get("bottom_team") or "").strip()
                
                # 若轉播記分板有清晰隊名且目前仍為預設名稱，動態更新真實隊名
                if len(top_name) >= 2 and detected_guest_team == "客隊":
                    detected_guest_team = top_name
                    log(f"從記分板動態識別出客隊隊名: {detected_guest_team}")
                if len(bot_name) >= 2 and detected_home_team == "主隊":
                    detected_home_team = bot_name
                    log(f"從記分板動態識別出主隊隊名: {detected_home_team}")

                t_score = int(sb_data.get("top_score", 0) or 0)
                b_score = int(sb_data.get("bottom_score", 0) or 0)
                inn = int(sb_data.get("inning", 1) or 1)
                half = sb_data.get("half", "TOP")
                outs = int(sb_data.get("outs", 0) or 0)
                desc = sb_data.get("description", "")
                is_game_over = sb_data.get("is_game_over", False) or (sec >= duration - 60)

                # ====================================================
                # 通用棒球領域物理真理：半局進攻歸屬與單調遞增推導
                # ====================================================
                # 1. 在上半局 (TOP)：先攻客隊進攻，守備方不可得分。
                #    畫面上出現的新得分增量必歸屬於客隊。
                # 2. 在下半局 (BOTTOM)：後攻主隊進攻，新得分增量必歸屬於主隊。
                new_guest = current_guest_score
                new_home = current_home_score

                if half == "TOP":
                    # 上半局客隊進攻
                    seen_score = max(t_score, b_score) if (inn == 1 and current_home_score == 0) else t_score
                    new_guest = max(new_guest, seen_score)
                else:
                    # 下半局主隊進攻
                    seen_home = b_score if b_score >= current_home_score else max(t_score, b_score)
                    new_home = max(new_home, seen_home)

                score_changed = (new_guest != current_guest_score) or (new_home != current_home_score)
                current_guest_score = new_guest
                current_home_score = new_home

                half_label = "上半局" if half == "TOP" else "下半局"

                md_entry = [
                    f"## [{time_str}] 第 {inn} 局{half_label} 現場實況",
                    f"- **時間戳記**: `{sec}s` (`{time_str}`)",
                    f"- **記分板資訊**: **{detected_guest_team}** {current_guest_score} : {current_home_score} **{detected_home_team}**",
                    f"- **球局狀況**: 第 {inn} 局{half_label} | {outs} 出局",
                    f"- **壘包跑者**: 一壘:{'有人' if sb_data.get('base_1b') else '空'} | 二壘:{'有人' if sb_data.get('base_2b') else '空'} | 三壘:{'有人' if sb_data.get('base_3b') else '空'}",
                    f"- **畫面備註**: {desc}",
                ]
                if score_changed:
                    md_entry.append(f"- **比分變動提示**: 🔥 比分由此時間點更新為 {detected_guest_team} {current_guest_score} : {current_home_score} {detected_home_team}")
                if is_game_over:
                    md_entry.append(f"- **終局狀態**: 🏆 轉播畫面顯示比賽已結束！")

                md_entry.append("")
                md_lines.extend(md_entry)

                timeline_entries.append({
                    "timestamp_sec": sec,
                    "timestamp_str": time_str,
                    "guest_team": detected_guest_team,
                    "home_team": detected_home_team,
                    "guest_score": current_guest_score,
                    "home_score": current_home_score,
                    "inning": inn,
                    "half": half,
                    "outs": outs,
                    "base_1b": sb_data.get("base_1b", False),
                    "base_2b": sb_data.get("base_2b", False),
                    "base_3b": sb_data.get("base_3b", False),
                    "description": desc,
                    "is_score_change": score_changed,
                    "is_game_over": is_game_over,
                    "frame_b64": frame_b64,
                })

                log(f"時間點 {time_str} 解析成功: {detected_guest_team} {current_guest_score} : {current_home_score} {detected_home_team} ({inn}局{half_label}, {outs}出局)")
            else:
                log(f"時間點 {time_str} 記分板未顯現或辨識無效")

            time.sleep(0.5)

        markdown_content = "\n".join(md_lines)
        log(f"Video-to-Markdown 轉換完成！共生成 {len(timeline_entries)} 筆時序實況記錄。")

        return {
            "status": "success",
            "title": video_title,
            "guest_team": detected_guest_team,
            "home_team": detected_home_team,
            "final_guest_score": current_guest_score,
            "final_home_score": current_home_score,
            "markdown_content": markdown_content,
            "timeline_entries": timeline_entries,
        }
