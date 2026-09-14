"""Adaptive Scorebug Motion Tracker.
Operates on 360p video stream, checks difference every 2~3 seconds,
and triggers detailed state extraction only when Scorebug changes (BSO, Outs, Bases, Score).
"""
import cv2
import numpy as np
from typing import Tuple, Optional
from packages.core.models import ScoreLiveState, InningHalf, BaseState


class ScorebugTracker:
    def __init__(self, roi_coords: Tuple[int, int, int, int] = (10, 10, 320, 90)):
        """
        roi_coords: (x, y, w, h) 在 360p (640x360) 畫面下的預設 Scorebug 坐標
        """
        self.x, self.y, self.w, self.h = roi_coords
        self.last_scorebug_gray: Optional[np.ndarray] = None
        self.motion_threshold = 12.0  # 灰階差分門檻值

    def has_motion(self, frame_360p_bgr: np.ndarray) -> Tuple[bool, np.ndarray]:
        """
        快速比對相鄰抽幀之 Scorebug 區域，判斷是否有動作 (好壞球新增、出局、得分等)
        """
        h_frame, w_frame = frame_360p_bgr.shape[:2]
        # 防呆邊界裁切
        x = min(self.x, w_frame - 10)
        y = min(self.y, h_frame - 10)
        w = min(self.w, w_frame - x)
        h = min(self.h, h_frame - y)

        scorebug_crop = frame_360p_bgr[y:y+h, x:x+w]
        gray = cv2.cvtColor(scorebug_crop, cv2.COLOR_BGR2GRAY)

        if self.last_scorebug_gray is None:
            self.last_scorebug_gray = gray
            return True, scorebug_crop

        diff = cv2.absdiff(self.last_scorebug_gray, gray)
        mean_diff = float(np.mean(diff))

        if mean_diff > self.motion_threshold:
            self.last_scorebug_gray = gray
            return True, scorebug_crop

        return False, scorebug_crop

    def parse_state_from_scorebug(self, scorebug_crop: np.ndarray, timestamp_sec: float) -> ScoreLiveState:
        """
        在偵測到變動時，利用 HSV 顏色篩選解析 BSO 燈號與壘包點亮狀態
        """
        hsv = cv2.cvtColor(scorebug_crop, cv2.COLOR_BGR2HSV)

        # 示例色域（ScoreLive 常見燈號：好球紅/橘、壞球綠、出局紅、壘包黃/橘）
        # 壞球綠燈 (Balls): H 35~85, S > 100, V > 100
        green_mask = cv2.inRange(hsv, np.array([35, 100, 100]), np.array([85, 255, 255]))
        # 好球/出局紅/黃燈: H 0~30, S > 100, V > 100
        yellow_red_mask = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([30, 255, 255]))

        # 此處為快速解析啟發式邏輯 (後續可對應固定坐標採樣點)
        green_pixels = cv2.countNonZero(green_mask)
        yellow_red_pixels = cv2.countNonZero(yellow_red_mask)

        # 估算球數 (具體座標在後續模組對位)
        est_balls = min(3, green_pixels // 40)
        est_strikes = min(2, yellow_red_pixels // 50)

        return ScoreLiveState(
            timestamp_sec=timestamp_sec,
            inning_num=1,
            inning_half=InningHalf.TOP,
            balls=est_balls,
            strikes=est_strikes,
            outs=0,
            bases=BaseState(first=False, second=False, third=False),
        )
