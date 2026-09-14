"""FastAPI Backend Gateway for yt2score.
Deployable on Railway, Render, Fly.io, or run as a containerized Web Service.
Provides REST endpoints for submitting jobs, editing lineups, and fetching incremental box scores.
"""
import uuid
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from packages.core.models import BoxScore, GameLineup, InningCheckpoint, InningHalf
from packages.core.state_machine import BaseballStateMachine

app = FastAPI(title="yt2score Web API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 記憶體快取 (在正式雲端環境可切換至 Supabase 或 Redis)
GAMES_DB: Dict[str, Dict[str, Any]] = {}


class CreateGameRequest(BaseModel):
    youtube_url: str


class UpdateLineupRequest(BaseModel):
    lineup: GameLineup


@app.get("/")
def read_root():
    return {"status": "online", "service": "yt2score-api"}


@app.post("/api/games/analyze")
def create_game_job(req: CreateGameRequest, background_tasks: BackgroundTasks):
    """
    1. 接收 YouTube 直播網址
    2. 初始化比賽 Job
    3. 觸發背景任務：擷取開賽先發攻守字卡並進行 OCR
    """
    game_id = str(uuid.uuid4())[:8]
    GAMES_DB[game_id] = {
        "game_id": game_id,
        "youtube_url": req.youtube_url,
        "status": "SCANNING_LINEUP",
        "progress": 5,
        "lineup": None,
        "box_score": None,
        "created_at": time.time(),
    }

    # 在實際部署時，呼叫 modal_app.scan_lineup_card.spawn(req.youtube_url)
    return {"game_id": game_id, "status": "SCANNING_LINEUP"}


@app.get("/api/games/{game_id}/status")
def get_game_status(game_id: str):
    """查詢當前進度與先發名單"""
    if game_id not in GAMES_DB:
        raise HTTPException(status_code=404, detail="Game not found")
    return GAMES_DB[game_id]


@app.post("/api/games/{game_id}/confirm-lineup")
def confirm_lineup(game_id: str, req: UpdateLineupRequest):
    """
    使用者於 Web 介面完成攻守字卡人工校對後，送出確認並正式啟動逐局追蹤
    """
    if game_id not in GAMES_DB:
        raise HTTPException(status_code=404, detail="Game not found")

    game = GAMES_DB[game_id]
    game["lineup"] = req.lineup.model_dump()
    game["status"] = "TRACKING_INNINGS"
    game["progress"] = 20
    return {"status": "success", "message": "Lineup confirmed. Inning tracking started."}


@app.get("/api/games/{game_id}/boxscore")
def get_boxscore(game_id: str):
    """
    取得最新逐局文字戰報、BoxScore 與帶時間戳之 Play-by-Play 事件清單
    """
    if game_id not in GAMES_DB:
        raise HTTPException(status_code=404, detail="Game not found")
    game = GAMES_DB[game_id]
    return game.get("box_score") or {}
