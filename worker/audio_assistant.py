"""Audio-Assisted Play Classifier.
Extracts 5~8 second audio clips around Scorebug action timestamps,
transcribes anchor commentary (via Whisper or Gemini), and refines baseball play details.
"""
import os
import subprocess
from typing import Optional


class AudioAssistant:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def extract_audio_clip(self, stream_url: str, start_sec: float, duration_sec: float = 6.0, output_path: str = "/tmp/clip.mp3") -> bool:
        """
        使用 ffmpeg 在雲端直接對 YouTube 串流擷取指定秒數區間的音訊，避免下載整部音訊
        """
        try:
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(max(0, start_sec - 1.0)),
                "-i", stream_url,
                "-t", str(duration_sec),
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                output_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return os.path.exists(output_path)
        except Exception as e:
            print(f"[AudioAssistant] Audio extraction failed: {e}")
            return False

    def transcribe_play_context(self, audio_path: str) -> Optional[str]:
        """
        將音訊送至語音辨識模型，分析主播播報內容（判定滾地、飛球、三振或出局者）
        """
        if not self.api_key or not os.path.exists(audio_path):
            return None

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            with open(audio_path, "rb") as f:
                audio_bytes = f.read()

            prompt = "這是一段棒球轉播主播的實況語音。請精簡寫出這球的結果（例如：三振出局、二壘滾地球傳一壘出局、擊出平飛安打、四壞球保送等）。若無清楚語音請回覆無。"

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type="audio/mp3"),
                    prompt,
                ],
            )
            text = response.text.strip()
            return text if "無" not in text else None
        except Exception as e:
            print(f"[AudioAssistant] Transcription error: {e}")
            return None
