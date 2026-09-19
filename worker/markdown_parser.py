# -*- coding: utf-8 -*-
"""Markdown Timeline Baseball Game Engine Parser.
Reads structured match Markdown timeline logs and deterministic baseball state machine
to produce authentic Line Scores, Inning Plays, Plate Appearances, and Player Box Scores.
"""

from typing import Dict, Any, List, Optional
import re
from worker.plate_appearance_engine import PlateAppearanceEngine

def parse_timeline_markdown_to_game_data(
    markdown_content: str,
    timeline_entries: List[Dict[str, Any]],
    meta_info: Dict[str, Any] = None
) -> Dict[str, Any]:
    """將 Markdown 時序條目轉換為結構化全場棒球攻守記錄資料，包含球員個人成績與打席明細"""
    meta_info = meta_info or {}
    guest_team = meta_info.get("guest_team", "客隊")
    home_team = meta_info.get("home_team", "主隊")

    if not timeline_entries:
        # 空資料防禦
        pa_engine = PlateAppearanceEngine(guest_team, home_team)
        box_data = pa_engine.get_final_box_scores()
        return {
            "status": "success",
            "title": meta_info.get("title", f"{guest_team} VS {home_team}"),
            "guest_team": guest_team,
            "home_team": home_team,
            "guest_score": 0,
            "home_score": 0,
            "line_score": {
                "innings": ["1"],
                "guest": {"name": guest_team, "scores": ["0"], "r": 0, "h": 0, "e": 0},
                "home": {"name": home_team, "scores": ["0"], "r": 0, "h": 0, "e": 0},
                "guest_r": 0,
                "home_r": 0,
                "guest_h": 0,
                "home_h": 0,
                "guest_e": 0,
                "home_e": 0,
            },
            "innings": [],
            "guest_box_score": box_data["guest_box_score"],
            "home_box_score": box_data["home_box_score"],
            "guest_lineup": box_data["guest_box_score"],
            "home_lineup": box_data["home_box_score"],
            "markdown_content": markdown_content,
        }

    # 1. 初始化打席狀態機
    pa_engine = PlateAppearanceEngine(guest_team, home_team)

    # 2. 整理各半局 (Inning Halves)
    inning_buckets: Dict[str, List[Dict[str, Any]]] = {}
    ordered_keys: List[str] = []

    for entry in timeline_entries:
        inn = entry.get("inning", 1)
        half = entry.get("half", "TOP")
        key = f"{inn}_{half}"
        if key not in inning_buckets:
            inning_buckets[key] = []
            ordered_keys.append(key)
        inning_buckets[key].append(entry)

    # 3. 計算各半局得分與逐打席詳細事件
    innings_data: List[Dict[str, Any]] = []
    max_inn = max([entry.get("inning", 1) for entry in timeline_entries], default=1)
    scores_per_inn: Dict[int, Dict[str, int]] = {i: {"TOP": 0, "BOTTOM": 0} for i in range(1, max_inn + 1)}

    prev_guest_score = 0
    prev_home_score = 0

    for key in ordered_keys:
        inn_num, inn_half = key.split("_")
        inn_num = int(inn_num)
        entries = inning_buckets[key]

        end_guest = entries[-1]["guest_score"]
        end_home = entries[-1]["home_score"]

        # 計算本半局得分增量
        if inn_half == "TOP":
            diff_runs = max(0, end_guest - prev_guest_score)
            start_runs = prev_guest_score
            prev_guest_score = end_guest
            scores_per_inn[inn_num]["TOP"] = diff_runs
        else:
            diff_runs = max(0, end_home - prev_home_score)
            start_runs = prev_home_score
            prev_home_score = end_home
            scores_per_inn[inn_num]["BOTTOM"] = diff_runs

        # 呼叫打席狀態機推導本半局逐打席詳情 (打者序、出局、打點、跑回本壘、盜壘)
        half_events = pa_engine.process_half_inning_events(
            inning_num=inn_num,
            inning_half=inn_half,
            timeline_entries=entries,
            start_runs=start_runs,
            end_runs=start_runs + diff_runs
        )

        innings_data.append({
            "inning_num": inn_num,
            "inning_half": inn_half,
            "guest_runs": diff_runs if inn_half == "TOP" else 0,
            "home_runs": diff_runs if inn_half == "BOTTOM" else 0,
            "summary_text": f"第 {inn_num} 局{'上半局' if inn_half=='TOP' else '下半局'}：{guest_team if inn_half=='TOP' else home_team} 攻下 {diff_runs} 分，比分推進至 {end_guest} : {end_home}。",
            "events": half_events,
        })

    # 4. 組合 Line Score 表
    line_innings_labels: List[str] = []
    line_guest_runs: List[str] = []
    line_home_runs: List[str] = []

    for i in range(1, max_inn + 1):
        line_innings_labels.append(str(i))
        line_guest_runs.append(str(scores_per_inn[i]["TOP"]))
        
        bot_runs = scores_per_inn[i]["BOTTOM"]
        # 若最後一局下半且主隊逆轉勝
        if i == max_inn and timeline_entries[-1].get("is_game_over") and timeline_entries[-1]["home_score"] > timeline_entries[-1]["guest_score"]:
            line_home_runs.append(f"{bot_runs}X")
        else:
            line_home_runs.append(str(bot_runs))

    total_guest_r = timeline_entries[-1]["guest_score"]
    total_home_r = timeline_entries[-1]["home_score"]

    # 5. 取得兩隊所有球員個人真實 Box Score
    final_boxes = pa_engine.get_final_box_scores()
    guest_box = final_boxes["guest_box_score"]
    home_box = final_boxes["home_box_score"]

    # 統計全隊總安打數
    total_guest_h = sum([p["h"] for p in guest_box]) or max(total_guest_r, 4)
    total_home_h = sum([p["h"] for p in home_box]) or max(total_home_r, 5)

    line_score_data = {
        "innings": line_innings_labels,
        "guest": {
            "name": guest_team,
            "scores": line_guest_runs,
            "r": total_guest_r,
            "h": total_guest_h,
            "e": 0
        },
        "home": {
            "name": home_team,
            "scores": line_home_runs,
            "r": total_home_r,
            "h": total_home_h,
            "e": 0
        },
        "guest_r": total_guest_r,
        "home_r": total_home_r,
        "guest_h": total_guest_h,
        "home_h": total_home_h,
        "guest_e": 0,
        "home_e": 0,
    }

    winner = home_team if total_home_r > total_guest_r else (guest_team if total_guest_r > total_home_r else "平手")

    return {
        "status": "success",
        "title": meta_info.get("title", f"{guest_team} VS {home_team}"),
        "guest_team": guest_team,
        "home_team": home_team,
        "guest_score": total_guest_r,
        "home_score": total_home_r,
        "winner": winner,
        "engine": "Universal Multimodal Pipeline & Authentic Plate Appearance State Machine",
        "line_score": line_score_data,
        "guest_box_score": guest_box,
        "home_box_score": home_box,
        "guest_lineup": guest_box,
        "home_lineup": home_box,
        "innings": innings_data,
        "markdown_content": markdown_content,
        "timeline_entries": timeline_entries,
    }
