"""Real Multi-modal Baseball Vision & Audio Engine for yt2score.
Extracts real frames, crops Scorebug, extracts audio clips, and queries Gemini 2.5 Flash.
Outputs structured PlayEvents with transparent multi-modal evidence.
"""
import os
import json
import base64
import requests
import numpy as np

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

def query_gemini_vision(prompt: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """呼叫 Gemini 2.5 Flash 多模態視覺模型 (禁用 thinking budget 以實現低延遲直出)"""
    if not GEMINI_API_KEY:
        return ""
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode("utf-8")}}
            ]
        }],
        "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}, "maxOutputTokens": 400}
    }
    try:
        r = requests.post(GEMINI_URL, json=payload, timeout=25)
        if r.status_code == 200:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[RealEngine] Vision query error: {e}")
    return ""

def query_gemini_audio(prompt: str, audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """呼叫 Gemini 2.5 Flash 語音模型轉譯主播播報"""
    if not GEMINI_API_KEY:
        return ""
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(audio_bytes).decode("utf-8")}}
            ]
        }],
        "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}, "maxOutputTokens": 300}
    }
    try:
        r = requests.post(GEMINI_URL, json=payload, timeout=25)
        if r.status_code == 200:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[RealEngine] Audio query error: {e}")
    return ""
