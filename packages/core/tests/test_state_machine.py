"""Unit tests for Baseball State Machine."""
import pytest
from packages.core.models import (
    ScoreLiveState,
    InningHalf,
    BaseState,
    GameLineup,
    TeamLineup,
    Player,
    PlayEventType,
)
from packages.core.state_machine import BaseballStateMachine


@pytest.fixture
def dummy_lineup():
    return GameLineup(
        guest_team=TeamLineup(
            team_name="客隊少棒",
            lineup=[
                Player(order=1, number="10", name="陳小強", position="SS"),
                Player(order=2, number="6", name="王小明", position="2B"),
            ]
        ),
        home_team=TeamLineup(
            team_name="主隊少棒",
            lineup=[
                Player(order=1, number="1", name="李大仁", position="P"),
                Player(order=2, number="2", name="林阿豪", position="C"),
            ]
        ),
        card_image_url="https://example.com/card.jpg",
        is_confirmed=True,
    )


def test_strikeout_deduction(dummy_lineup):
    fsm = BaseballStateMachine(game_id="game-1", youtube_url="https://youtube.com/watch?v=xyz", lineup=dummy_lineup)
    
    # 模擬 2 好球後三振，球數歸零且 1 出局
    s1 = ScoreLiveState(
        timestamp_sec=120.0,
        inning_num=1,
        inning_half=InningHalf.TOP,
        balls=1,
        strikes=2,
        outs=0,
        current_batter_number="10",
        current_batter_name="陳小強",
    )
    s2 = ScoreLiveState(
        timestamp_sec=128.5,
        inning_num=1,
        inning_half=InningHalf.TOP,
        balls=0,
        strikes=0,
        outs=1,
        current_batter_number="6",
        current_batter_name="王小明",
    )

    box = fsm.process_state_stream([s1, s2])
    assert len(box.all_events) == 1
    ev = box.all_events[0]
    assert ev.event_type == PlayEventType.STRIKEOUT
    assert ev.timestamp_sec == 128.5
    assert ev.outs_recorded == 1
    assert "三振" in ev.description


def test_inning_checkpoint_generation(dummy_lineup):
    fsm = BaseballStateMachine(game_id="game-1", lineup=dummy_lineup)

    # 模擬 1 局上半結束換 1 局下半
    s1 = ScoreLiveState(
        timestamp_sec=300.0,
        inning_num=1,
        inning_half=InningHalf.TOP,
        outs=2,
        guest_score=2,
    )
    s2 = ScoreLiveState(
        timestamp_sec=315.0,
        inning_num=1,
        inning_half=InningHalf.BOTTOM,
        outs=0,
        guest_score=2,
    )

    box = fsm.process_state_stream([s1, s2])
    assert len(box.innings) >= 1
    chk = box.innings[0]
    assert chk.inning_num == 1
    assert chk.inning_half == InningHalf.TOP
    assert "第 1 局上" in chk.summary_text
