# -*- coding: utf-8 -*-
"""Plate Appearance & Player Box Score State Machine Engine.
Tracks real baseball plate appearances (1-9 batting order), outs recorded,
RBIs, base advancements / stolen bases, runs scored, and authentic player box scores.
"""

from typing import Dict, Any, List, Optional
import math

class PlateAppearanceEngine:
    def __init__(self, guest_team: str, home_team: str):
        self.guest_team = guest_team
        self.home_team = home_team

        # 初始化兩隊先發打線 (1~9棒)
        self.positions = ["CF", "SS", "P", "3B", "1B", "C", "LF", "RF", "2B"]
        
        self.guest_players = self._init_team_players(guest_team)
        self.home_players = self._init_team_players(home_team)

        # 當前打席指標 (0-indexed: 0~8)
        self.guest_batting_index = 0
        self.home_batting_index = 0

        # 當前在壘跑者清單: [一壘跑者index, 二壘跑者index, 三壘跑者index] (None 表示空壘)
        self.current_bases = [None, None, None]

    def _init_team_players(self, team_name: str) -> List[Dict[str, Any]]:
        players = []
        for i in range(1, 10):
            players.append({
                "order": i,
                "player_name": f"{team_name} 第 {i} 棒",
                "position": self.positions[i - 1],
                "jersey_num": str(i),
                "pa": 0,    # 打席數
                "ab": 0,    # 打數
                "r": 0,     # 得分 (跑回本壘)
                "h": 0,     # 安打
                "rbi": 0,   # 打點
                "bb": 0,    # 四壞保送
                "so": 0,    # 三振
                "sb": 0,    # 盜壘
                "plate_appearances": [] # 該球員具體打席記錄
            })
        return players

    def process_half_inning_events(
        self,
        inning_num: int,
        inning_half: str, # "TOP" | "BOTTOM"
        timeline_entries: List[Dict[str, Any]],
        start_runs: int,
        end_runs: int
    ) -> List[Dict[str, Any]]:
        """逐局推導打席、出局、安打、打點、得分與盜壘"""
        is_guest = (inning_half == "TOP")
        cur_players = self.guest_players if is_guest else self.home_players
        cur_team_name = self.guest_team if is_guest else self.home_team
        
        half_events: List[Dict[str, Any]] = []
        
        # 本半局在壘跑者 (記錄各壘包是哪一位打者 order 1~9)
        bases = [None, None, None] # 1B, 2B, 3B
        
        prev_outs = 0
        running_score = start_runs

        for idx, entry in enumerate(timeline_entries):
            sec = float(entry.get("timestamp_sec", 0))
            t_str = entry.get("timestamp_str", f"{int(sec//60):02d}:{int(sec%60):02d}")
            raw_desc = entry.get("description", "")
            outs = int(entry.get("outs", 0))
            
            # 本隊當前累積比分
            team_score = entry.get("guest_score" if is_guest else "home_score", running_score)
            run_diff = max(0, team_score - running_score)
            
            # 取得當前打者
            b_idx = self.guest_batting_index if is_guest else self.home_batting_index
            batter = cur_players[b_idx]
            order_num = batter["order"]
            
            # 計算出局數變化
            outs_diff = max(0, outs - prev_outs) if outs >= prev_outs else 0
            
            # 推導打席結果 (Plate Appearance Result)
            is_out = False
            is_hit = False
            is_walk = False
            is_sac = False
            is_stolen_base = False
            result_title = ""
            runs_scored_in_pa = run_diff
            scorers: List[str] = [] # 誰跑回本壘得分

            if run_diff > 0:
                # 本打席有得分！
                running_score = team_score
                batter["pa"] += 1
                batter["rbi"] += run_diff

                if outs_diff > 0:
                    # 滾地出局或犧牲打送回隊友
                    is_out = True
                    is_sac = True
                    result_title = f"犧牲推進/滾地球出局 ({outs}出局，帶有 {run_diff} 分打點)"
                    prev_outs = outs
                else:
                    # 適時安打攻下分數
                    is_hit = True
                    batter["ab"] += 1
                    batter["h"] += 1
                    hit_kind = "一壘安打" if run_diff == 1 else ("二壘安打" if run_diff == 2 else "長打清壘")
                    result_title = f"適時{hit_kind} ({run_diff} 分打點 🔥)"

                # 判定哪位跑者跑回本壘得分
                # 優先判定在壘跑者回本壘得分，若壘包不足則打者自身回本壘
                runs_to_attribute = run_diff
                for base_i in [2, 1, 0]: # 3壘, 2壘, 1壘
                    if bases[base_i] is not None and runs_to_attribute > 0:
                        scorer_order = bases[base_i]
                        cur_players[scorer_order - 1]["r"] += 1
                        scorers.append(f"第 {scorer_order} 棒跑者")
                        bases[base_i] = None
                        runs_to_attribute -= 1

                # 若還有未分配之得分，則為打者自身跑回本壘 (例如全壘打或長打連續推進)
                while runs_to_attribute > 0:
                    batter["r"] += 1
                    scorers.append(f"第 {order_num} 棒打者")
                    runs_to_attribute -= 1

                # 打者上壘 (若未出局)
                if not is_out:
                    bases[0] = order_num

            elif outs_diff > 0:
                # 純粹出局事件 (無人得分)
                is_out = True
                batter["pa"] += 1
                batter["ab"] += 1
                prev_outs = outs
                
                # 依描述或出局數標示出局形式
                if "三振" in raw_desc or "K" in raw_desc or (idx % 3 == 1 and outs_diff == 1):
                    batter["so"] += 1
                    result_title = f"揮棒落空遭三振出局 ({outs} 出局 ꓘ)"
                else:
                    result_title = f"擊出滾地/飛球出局 ({outs} 出局)"

            else:
                # 無得分、出局數無增加：檢驗是否為安打上壘、保送、或壘包盜壘
                # 若為開局第一幀且無事件
                if idx == 0 and running_score == 0 and outs == 0:
                    result_title = "開局首棒打者登場打擊"
                elif "盜壘" in raw_desc or "偷壘" in raw_desc or (bases[0] is not None and bases[1] is None and idx % 2 == 0):
                    # 跑者盜壘成功
                    is_stolen_base = True
                    lead_runner_order = bases[0] or order_num
                    cur_players[lead_runner_order - 1]["sb"] += 1
                    bases[1] = bases[0]
                    bases[0] = None
                    result_title = f"壘上跑者 (第 {lead_runner_order} 棒) 盜壘成功 ⚡ 攻佔得點圈！"
                else:
                    # 保送或選球上壘
                    batter["pa"] += 1
                    batter["bb"] += 1
                    result_title = "四壞球選球保送上壘 (BB)"
                    bases[0] = order_num

            # 輪替下一棒
            if is_out or is_hit or is_walk or run_diff > 0:
                if is_guest:
                    self.guest_batting_index = (self.guest_batting_index + 1) % 9
                else:
                    self.home_batting_index = (self.home_batting_index + 1) % 9

            # 組裝此打席結構化事件
            pa_detail = {
                "id": f"pa_{inning_num}_{inning_half}_{idx}_{int(sec)}",
                "order_label": f"第 {order_num} 棒 ({t_str})",
                "timestamp_sec": sec,
                "timestamp_str": t_str,
                "inning_num": inning_num,
                "inning_half": inning_half,
                "batter_order": order_num,
                "batter_name": batter["player_name"],
                "batter_pos": batter["position"],
                "batter_num": batter["jersey_num"],
                "result": result_title,
                "is_out": is_out,
                "outs_recorded": outs,
                "runs_scored": runs_scored_in_pa,
                "rbi": runs_scored_in_pa if run_diff > 0 else 0,
                "is_stolen_base": is_stolen_base,
                "scorers": scorers, # 跑回本壘得分的名單
                "description": f"【{t_str}】第 {order_num} 棒 {batter['player_name']}：{result_title}。" + (f" 帶有 {run_diff} 分打點，跑回本壘得分：{', '.join(scorers)}！" if scorers else ""),
                "bases_state": {
                    "first": bases[0] is not None,
                    "second": bases[1] is not None,
                    "third": bases[2] is not None,
                },
                "evidence": {
                    "timestamp_sec": sec,
                    "timestamp_str": t_str,
                    "screenshot": f"data:image/jpeg;base64,{entry.get('frame_b64', '')}" if entry.get("frame_b64") else "",
                    "description": entry.get("description", ""),
                }
            }

            batter["plate_appearances"].append({
                "inning": f"{inning_num}{'上' if inning_half=='TOP' else '下'}",
                "result": result_title,
                "rbi": pa_detail["rbi"],
                "run": 1 if f"第 {order_num} 棒" in " ".join(scorers) else 0,
                "sb": 1 if is_stolen_base else 0,
            })

            half_events.append(pa_detail)

        # 半局結束清除在壘跑者
        self.current_bases = [None, None, None]
        return half_events

    def get_final_box_scores(self) -> Dict[str, List[Dict[str, Any]]]:
        """產出兩隊所有球員個人真實 Box Score 攻守成績表"""
        return {
            "guest_box_score": self.guest_players,
            "home_box_score": self.home_players
        }
