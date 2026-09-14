"""Lineup Card Detector and Structured OCR (Gemini 3.8 Flash).
Scans early minutes of YouTube stream at low resolution (360p) to capture lineup cards.
"""
import os
import json
import numpy as np
from typing import Optional, Dict, Any
from packages.core.models import GameLineup, TeamLineup, Player


class LineupDetector:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def is_lineup_card_candidate(self, frame_bgr: np.ndarray) -> bool:
        """
        低解析度 (360p) 快速篩選：
        利用邊緣密度與水平文字行特徵判斷此幀是否為攻守名單表格字卡。
        避免盲目上傳每一幀到多模態模型。
        """
        import cv2
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        # 名單字卡通常帶有大量表格線條與文字，邊緣密度高且畫面中央有結構性分佈
        return 0.08 < edge_density < 0.35

    def extract_lineup_with_gemini(self, frame_jpg_bytes: bytes) -> Optional[GameLineup]:
        """
        將篩選出的高潛力圖卡幀傳送至 Gemini 多模態 API，結構化提取攻守名單。
        """
        if not self.api_key:
            # 支援本機開發或無 key 狀況下的 fallback mock
            return None

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            prompt = """
            你是一位專業棒球轉播紀錄員。這張圖片是少棒/青少棒賽事的開賽先發攻守名單圖卡。
            請仔細辨識客隊與主隊的隊名、打序(1~9)、球衣背號、球員姓名、守備位置。
            請一律輸出成嚴格的 JSON 格式：
            {
              "guest_team": {
                "team_name": "客隊名稱",
                "lineup": [{"order": 1, "number": "10", "name": "姓名", "position": "SS"}]
              },
              "home_team": {
                "team_name": "主隊名稱",
                "lineup": [{"order": 1, "number": "1", "name": "姓名", "position": "P"}]
              }
            }
            """

            response = client.models.generate_content(
                model="gemini-2.5-flash", # 或 gemini-3.8-flash
                contents=[
                    types.Part.from_bytes(data=frame_jpg_bytes, mime_type="image/jpeg"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            data = json.loads(response.text)
            guest = TeamLineup(**data.get("guest_team", {}))
            home = TeamLineup(**data.get("home_team", {}))
            return GameLineup(guest_team=guest, home_team=home, is_confirmed=False)

        except Exception as e:
            print(f"[LineupDetector] Gemini OCR error: {e}")
            return None
