"""Domain models for baseball game state, ScoreLive events, and Web Service sync."""
from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class InningHalf(str, Enum):
    TOP = "TOP"       # 上半局 (客隊進攻)
    BOTTOM = "BOTTOM" # 下半局 (主隊進攻)


class BaseState(BaseModel):
    first: bool = Field(default=False, description="一壘是否有人")
    second: bool = Field(default=False, description="二壘是否有人")
    third: bool = Field(default=False, description="三壘是否有人")

    @property
    def runners_count(self) -> int:
        return sum([self.first, self.second, self.third])

    @property
    def is_loaded(self) -> bool:
        return self.first and self.second and self.third


class ScoreLiveState(BaseModel):
    """由視覺辨識從 ScoreLive 圖層動作幀萃取的狀態快照"""
    timestamp_sec: float = Field(..., description="影片時間戳 (秒)")
    inning_num: int = Field(..., description="第幾局 (1, 2, ...)")
    inning_half: InningHalf = Field(..., description="上半局/下半局")
    guest_score: int = Field(default=0, description="客隊比分")
    home_score: int = Field(default=0, description="主隊比分")
    balls: int = Field(default=0, ge=0, le=4, description="壞球數 (0~3)")
    strikes: int = Field(default=0, ge=0, le=3, description="好球數 (0~2)")
    outs: int = Field(default=0, ge=0, le=3, description="出局數 (0~2)")
    bases: BaseState = Field(default_factory=BaseState, description="壘包狀態")
    current_batter_number: Optional[str] = Field(default=None, description="當前打者背號")
    current_batter_name: Optional[str] = Field(default=None, description="當前打者姓名")
    raw_confidence: float = Field(default=1.0, description="辨識信心度")


class PlayEventType(str, Enum):
    BALL = "BALL"                   # 壞球
    STRIKE = "STRIKE"               # 好球
    STRIKEOUT = "STRIKEOUT"         # 三振出局 (K / ꓘ)
    WALK = "WALK"                   # 四壞保送 (BB)
    HIT_BY_PITCH = "HIT_BY_PITCH"   # 觸身球 (HBP)
    SINGLE = "SINGLE"               # 一壘安打 (1B)
    DOUBLE = "DOUBLE"               # 二壘安打 (2B)
    TRIPLE = "TRIPLE"               # 三壘安打 (3B)
    HOME_RUN = "HOME_RUN"           # 全壘打 (HR)
    FIELD_OUT = "FIELD_OUT"         # 滾地/飛球出局
    SACRIFICE = "SACRIFICE"         # 犧牲打
    ERROR = "ERROR"                 # 失誤上壘
    INNING_END = "INNING_END"       # 換局
    UNKNOWN = "UNKNOWN"             # 待確認


class PlayEvent(BaseModel):
    """具體事件或打席結束結果，具備精確時間戳以連動 YouTube 播放器"""
    id: str = Field(..., description="事件唯一識別碼")
    timestamp_sec: float = Field(..., description="事件發生在 YouTube 的精確秒數，供前端跳轉 Play")
    inning_num: int
    inning_half: InningHalf
    event_type: PlayEventType
    description: str = Field(..., description="事件文字描述，例如：6-3 滾地球出局")
    runs_scored: int = 0
    outs_recorded: int = 0
    batter_number: Optional[str] = None
    batter_name: Optional[str] = None
    audio_transcript: Optional[str] = Field(default=None, description="事件發生時主播播報文字輔助")
    state_before: ScoreLiveState
    state_after: ScoreLiveState
    flag: Optional[str] = Field(default=None, description="例如 MANUAL_CHECK 標記")


class Player(BaseModel):
    order: int = Field(..., description="打序 (1~9)")
    number: str = Field(..., description="球衣背號")
    name: str = Field(..., description="球員姓名")
    position: str = Field(default="", description="守備位置 (P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH)")


class TeamLineup(BaseModel):
    team_name: str
    lineup: List[Player] = Field(default_factory=list)


class GameLineup(BaseModel):
    guest_team: TeamLineup
    home_team: TeamLineup
    card_image_url: Optional[str] = Field(default=None, description="擷取到的開賽攻守字卡截圖 URL (供前端核對)")
    is_confirmed: bool = Field(default=False, description="使用者是否已於 Web 介面完成人工校對")


class BatterBoxScore(BaseModel):
    order: int
    number: str
    name: str
    pa: int = 0      # 打席數 Plate Appearances
    ab: int = 0      # 打數 At Bats
    r: int = 0       # 得分 Runs
    h: int = 0       # 安打 Hits
    rbi: int = 0     # 打點 RBIs
    bb: int = 0      # 保送 Walks
    so: int = 0      # 三振 Strikeouts
    hr: int = 0      # 全壘打 Home Runs
    events: List[PlayEvent] = Field(default_factory=list, description="打者該場所有打席事件，含秒數")


class InningCheckpoint(BaseModel):
    """逐局產出的文字記錄與記分卡檢查點"""
    game_id: str
    inning_num: int
    inning_half: InningHalf
    guest_runs: int
    home_runs: int
    summary_text: str = Field(..., description="該半局文字戰報記錄")
    events: List[PlayEvent] = Field(default_factory=list)
    created_at: float


class BoxScore(BaseModel):
    game_id: str
    youtube_url: str
    guest_team_name: str
    home_team_name: str
    guest_runs: int
    home_runs: int
    current_inning: int
    current_half: InningHalf
    is_finished: bool = False
    lineup: Optional[GameLineup] = None
    innings: List[InningCheckpoint] = Field(default_factory=list)
    guest_batters: List[BatterBoxScore] = Field(default_factory=list)
    home_batters: List[BatterBoxScore] = Field(default_factory=list)
    all_events: List[PlayEvent] = Field(default_factory=list)
