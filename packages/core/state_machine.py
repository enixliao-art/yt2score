"""Baseball State Machine Reducer.
Aggregates ScoreLiveState snapshots into structured PlayEvents, InningCheckpoints, and BoxScore.
Supports incremental inning-by-inning checkpointing and resumption.
"""
import uuid
import time
from typing import List, Optional, Dict
from packages.core.models import (
    ScoreLiveState,
    PlayEvent,
    PlayEventType,
    BoxScore,
    BatterBoxScore,
    InningCheckpoint,
    InningHalf,
    GameLineup,
)


class BaseballStateMachine:
    def __init__(self, game_id: str, youtube_url: str = "", lineup: Optional[GameLineup] = None):
        self.game_id = game_id
        self.youtube_url = youtube_url
        self.lineup = lineup
        self.play_by_play: List[PlayEvent] = []
        self.innings_checkpoints: List[InningCheckpoint] = []
        self.current_half_events: List[PlayEvent] = []

    def process_state_stream(self, states: List[ScoreLiveState]) -> BoxScore:
        """接收依時間排序之動作狀態快照序列，支援逐局即時產出記錄"""
        if not states:
            return self._empty_box_score()

        sorted_states = sorted(states, key=lambda s: s.timestamp_sec)
        prev = sorted_states[0]

        for current in sorted_states[1:]:
            event = self._infer_transition(prev, current)
            if event:
                self.play_by_play.append(event)
                self.current_half_events.append(event)

                # 偵測半局結束：當產生 INNING_END 事件時，立即封裝該半局文字記錄 Checkpoint
                if event.event_type == PlayEventType.INNING_END:
                    self._create_inning_checkpoint(
                        inning_num=event.inning_num,
                        inning_half=event.inning_half,
                        guest_runs=current.guest_score,
                        home_runs=current.home_score,
                    )
                prev = current
            else:
                if (current.balls, current.strikes, current.outs, current.guest_score, current.home_score, current.bases) != \
                   (prev.balls, prev.strikes, prev.outs, prev.guest_score, prev.home_score, prev.bases):
                    prev = current

        # 若最後一個狀態尚在該半局進行中，封裝當前未完局的即時 Checkpoint
        if self.current_half_events and sorted_states:
            last_state = sorted_states[-1]
            self._create_inning_checkpoint(
                inning_num=last_state.inning_num,
                inning_half=last_state.inning_half,
                guest_runs=last_state.guest_score,
                home_runs=last_state.home_score,
                in_progress=True,
            )

        return self._generate_box_score(sorted_states[-1])

    def _create_inning_checkpoint(self, inning_num: int, inning_half: InningHalf, guest_runs: int, home_runs: int, in_progress: bool = False):
        """生成單半局的純文字戰報與時間點清單"""
        events_copy = list(self.current_half_events)
        half_str = "上" if inning_half == InningHalf.TOP else "下"
        status_suffix = " (進行中)" if in_progress else " (已結束)"

        summary_lines = [f"【第 {inning_num} 局{half_str}戰報{status_suffix}】"]
        for ev in events_copy:
            time_str = f"{int(ev.timestamp_sec // 60):02d}:{int(ev.timestamp_sec % 60):02d}"
            summary_lines.append(f"- [{time_str}] {ev.description}")

        checkpoint = InningCheckpoint(
            game_id=self.game_id,
            inning_num=inning_num,
            inning_half=inning_half,
            guest_runs=guest_runs,
            home_runs=home_runs,
            summary_text="\n".join(summary_lines),
            events=events_copy,
            created_at=time.time(),
        )
        self.innings_checkpoints.append(checkpoint)
        if not in_progress:
            self.current_half_events = []

    def _infer_transition(self, s1: ScoreLiveState, s2: ScoreLiveState) -> Optional[PlayEvent]:
        event_id = str(uuid.uuid4())[:8]

        # 1. 換局偵測
        if (s1.inning_num != s2.inning_num) or (s1.inning_half != s2.inning_half):
            half_name = "上半局" if s1.inning_half == InningHalf.TOP else "下半局"
            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s1.inning_num,
                inning_half=s1.inning_half,
                event_type=PlayEventType.INNING_END,
                description=f"第 {s1.inning_num} 局{half_name}結束 (3 出局攻守交換)",
                runs_scored=0,
                outs_recorded=0,
                batter_number=s1.current_batter_number,
                batter_name=s1.current_batter_name,
                state_before=s1,
                state_after=s2,
            )

        runs_diff = (s2.guest_score + s2.home_score) - (s1.guest_score + s1.home_score)
        flag = "MANUAL_CHECK" if (runs_diff > 4 or runs_diff < 0) else None

        # 2. 出局數增加
        outs_diff = s2.outs - s1.outs
        if outs_diff > 0:
            if s1.strikes >= 2 and s2.strikes == 0 and s2.balls == 0:
                event_type = PlayEventType.STRIKEOUT
                desc = f"打者遭三振出局 (目前 {s2.outs} 出局)"
            else:
                event_type = PlayEventType.FIELD_OUT
                desc = f"擊球出局 (目前 {s2.outs} 出局)"

            if runs_diff > 0:
                desc += f"，壘上跑者回本壘得 {runs_diff} 分"

            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s2.inning_num,
                inning_half=s2.inning_half,
                event_type=event_type,
                description=desc,
                runs_scored=max(0, runs_diff),
                outs_recorded=outs_diff,
                batter_number=s1.current_batter_number or s2.current_batter_number,
                batter_name=s1.current_batter_name or s2.current_batter_name,
                state_before=s1,
                state_after=s2,
                flag=flag,
            )

        # 3. 球數歸零（保送、安打、得分）
        ball_strike_reset = (s1.balls > 0 or s1.strikes > 0) and (s2.balls == 0 and s2.strikes == 0)

        if s1.balls == 3 and ball_strike_reset and runs_diff == 0 and s2.bases.runners_count >= s1.bases.runners_count:
            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s2.inning_num,
                inning_half=s2.inning_half,
                event_type=PlayEventType.WALK,
                description="獲得四壞球保送 (BB)",
                runs_scored=0,
                outs_recorded=0,
                batter_number=s1.current_batter_number or s2.current_batter_number,
                batter_name=s1.current_batter_name or s2.current_batter_name,
                state_before=s1,
                state_after=s2,
                flag=flag,
            )

        if runs_diff > 0 or (ball_strike_reset and s2.bases.runners_count > 0):
            if runs_diff == 4:
                event_type = PlayEventType.HOME_RUN
                desc = "滿貫全壘打 (Grand Slam)！進帳 4 分"
            elif runs_diff >= 1 and s2.bases.runners_count == 0 and ball_strike_reset:
                event_type = PlayEventType.HOME_RUN
                desc = f"陽春全壘打！得 {runs_diff} 分"
            else:
                if s2.bases.third and not s1.bases.third:
                    event_type = PlayEventType.TRIPLE
                    desc = "擊出三壘安打"
                elif s2.bases.second and not s1.bases.second and not s2.bases.first:
                    event_type = PlayEventType.DOUBLE
                    desc = "擊出二壘安打"
                else:
                    event_type = PlayEventType.SINGLE
                    desc = "擊出一壘安打"

                if runs_diff > 0:
                    desc += f"，送回 {runs_diff} 分"

            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s2.inning_num,
                inning_half=s2.inning_half,
                event_type=event_type,
                description=desc,
                runs_scored=runs_diff,
                outs_recorded=0,
                batter_number=s1.current_batter_number or s2.current_batter_number,
                batter_name=s1.current_batter_name or s2.current_batter_name,
                state_before=s1,
                state_after=s2,
                flag=flag,
            )

        # 4. 單純好壞球增補
        if s2.strikes > s1.strikes:
            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s2.inning_num,
                inning_half=s2.inning_half,
                event_type=PlayEventType.STRIKE,
                description=f"好球 ({s2.balls}B-{s2.strikes}S)",
                runs_scored=0,
                outs_recorded=0,
                batter_number=s2.current_batter_number,
                batter_name=s2.current_batter_name,
                state_before=s1,
                state_after=s2,
            )
        elif s2.balls > s1.balls:
            return PlayEvent(
                id=event_id,
                timestamp_sec=s2.timestamp_sec,
                inning_num=s2.inning_num,
                inning_half=s2.inning_half,
                event_type=PlayEventType.BALL,
                description=f"壞球 ({s2.balls}B-{s2.strikes}S)",
                runs_scored=0,
                outs_recorded=0,
                batter_number=s2.current_batter_number,
                batter_name=s2.current_batter_name,
                state_before=s1,
                state_after=s2,
            )

        return None

    def _generate_box_score(self, last_state: ScoreLiveState) -> BoxScore:
        guest_name = self.lineup.guest_team.team_name if self.lineup else "客隊"
        home_name = self.lineup.home_team.team_name if self.lineup else "主隊"

        guest_batters: List[BatterBoxScore] = []
        home_batters: List[BatterBoxScore] = []

        if self.lineup:
            for p in self.lineup.guest_team.lineup:
                guest_batters.append(self._calc_batter_stats(p.number, p.name, p.order, InningHalf.TOP))
            for p in self.lineup.home_team.lineup:
                home_batters.append(self._calc_batter_stats(p.number, p.name, p.order, InningHalf.BOTTOM))

        return BoxScore(
            game_id=self.game_id,
            youtube_url=self.youtube_url,
            guest_team_name=guest_name,
            home_team_name=home_name,
            guest_runs=last_state.guest_score,
            home_runs=last_state.home_score,
            current_inning=last_state.inning_num,
            current_half=last_state.inning_half,
            lineup=self.lineup,
            innings=self.innings_checkpoints,
            guest_batters=guest_batters,
            home_batters=home_batters,
            all_events=self.play_by_play,
        )

    def _calc_batter_stats(self, number: str, name: str, order: int, half: InningHalf) -> BatterBoxScore:
        events = [e for e in self.play_by_play if (e.batter_number == number or e.batter_name == name) and e.inning_half == half]
        pa = len([e for e in events if e.event_type in [
            PlayEventType.STRIKEOUT, PlayEventType.WALK, PlayEventType.SINGLE,
            PlayEventType.DOUBLE, PlayEventType.TRIPLE, PlayEventType.HOME_RUN,
            PlayEventType.FIELD_OUT, PlayEventType.SACRIFICE, PlayEventType.ERROR
        ]])
        bb = len([e for e in events if e.event_type == PlayEventType.WALK])
        so = len([e for e in events if e.event_type == PlayEventType.STRIKEOUT])
        hr = len([e for e in events if e.event_type == PlayEventType.HOME_RUN])
        h = len([e for e in events if e.event_type in [
            PlayEventType.SINGLE, PlayEventType.DOUBLE, PlayEventType.TRIPLE, PlayEventType.HOME_RUN
        ]])
        ab = max(0, pa - bb)
        rbi = sum([e.runs_scored for e in events if e.runs_scored > 0])

        return BatterBoxScore(
            order=order,
            number=number,
            name=name,
            pa=pa,
            ab=ab,
            h=h,
            rbi=rbi,
            bb=bb,
            so=so,
            hr=hr,
            events=events,
        )

    def _empty_box_score(self) -> BoxScore:
        return BoxScore(
            game_id=self.game_id,
            youtube_url=self.youtube_url,
            guest_team_name=self.lineup.guest_team.team_name if self.lineup else "客隊",
            home_team_name=self.lineup.home_team.team_name if self.lineup else "主隊",
            guest_runs=0,
            home_runs=0,
            current_inning=1,
            current_half=InningHalf.TOP,
            lineup=self.lineup,
            innings=[],
            guest_batters=[],
            home_batters=[],
            all_events=[],
        )
