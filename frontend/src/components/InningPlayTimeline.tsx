"use client";

import React, { useState } from "react";
import {
  PlayCircle,
  ShieldAlert,
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  Sparkles,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

export interface PlayEvent {
  id: string;
  timestamp_sec: number;
  inning_num: number;
  inning_half: "TOP" | "BOTTOM";
  event_type: string;
  description: string;
  runs_scored: number;
  outs_recorded: number;
  batter_number?: string;
  batter_name?: string;
  order_label?: string;
  result?: string;
  rbi?: number;
  batter_pos?: string;
  batter_num?: string;
  flag?: string;
}

export interface InningCheckpoint {
  inning_num: number;
  inning_half: "TOP" | "BOTTOM";
  guest_runs: number;
  home_runs: number;
  summary_text: string;
  events: PlayEvent[];
}

interface InningPlayTimelineProps {
  innings: InningCheckpoint[];
  onSelectTimestamp: (sec: number) => void;
  onInningsChange?: (updatedInnings: InningCheckpoint[]) => void;
  onReanalyzeInning?: (innIdx: number, num: number, half: "TOP" | "BOTTOM") => Promise<void>;
  onAnalyzeNextInning?: () => Promise<void>;
}

const EVENT_TYPE_OPTIONS = [
  { value: "SINGLE", label: "一壘安打" },
  { value: "DOUBLE", label: "二壘安打" },
  { value: "TRIPLE", label: "三壘安打" },
  { value: "HOME_RUN", label: "全壘打 / 場內全壘打" },
  { value: "WALK", label: "四壞保送" },
  { value: "HIT_BY_PITCH", label: "觸身球" },
  { value: "FIELD_OUT", label: "內野刺殺 / 出局" },
  { value: "FLY_OUT", label: "飛球接殺" },
  { value: "STRIKEOUT", label: "三振出局" },
  { value: "STEAL", label: "盜壘成功" },
  { value: "ERROR", label: "守備失誤" },
  { value: "INNING_SWITCH", label: "攻守交換 (3出局)" },
  { value: "START", label: "半局開始" },
  { value: "OTHER", label: "其他事件" },
];

export const InningPlayTimeline: React.FC<InningPlayTimelineProps> = ({
  innings,
  onSelectTimestamp,
  onInningsChange,
  onReanalyzeInning,
  onAnalyzeNextInning,
}) => {
  const [reanalyzingIndex, setReanalyzingIndex] = useState<number | null>(null);
  const [analyzingNext, setAnalyzingNext] = useState<boolean>(false);

  const handleTriggerReanalyze = async (innIdx: number, num: number, half: "TOP" | "BOTTOM") => {
    if (!onReanalyzeInning) return;
    setReanalyzingIndex(innIdx);
    try {
      await onReanalyzeInning(innIdx, num, half);
    } finally {
      setReanalyzingIndex(null);
    }
  };

  const handleTriggerAnalyzeNext = async () => {
    if (!onAnalyzeNextInning) return;
    setAnalyzingNext(true);
    try {
      await onAnalyzeNextInning();
    } finally {
      setAnalyzingNext(false);
    }
  };

  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    time_str: string;
    description: string;
    runs: number;
    outs: number;
    event_type: string;
    batter_name: string;
  }>({
    time_str: "00:00",
    description: "",
    runs: 0,
    outs: 0,
    event_type: "OTHER",
    batter_name: "",
  });

  const [addingToInningIndex, setAddingToInningIndex] = useState<number | null>(null);
  const [newPlayForm, setNewPlayForm] = useState({
    time_str: "10:00",
    description: "",
    runs: 0,
    outs: 0,
    event_type: "SINGLE",
    batter_name: "",
  });

  const secToTimeStr = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const timeStrToSec = (str: string) => {
    const parts = str.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return m * 60 + s;
    }
    return parseFloat(str) || 0;
  };

  const startEdit = (ev: PlayEvent) => {
    setEditingPlayId(ev.id);
    setEditForm({
      time_str: secToTimeStr(ev.timestamp_sec),
      description: ev.description,
      runs: ev.runs_scored,
      outs: ev.outs_recorded,
      event_type: ev.event_type || "OTHER",
      batter_name: ev.batter_name || "",
    });
  };

  const cancelEdit = () => {
    setEditingPlayId(null);
  };

  const saveEdit = (innIdx: number, playId: string) => {
    const nextInnings = [...innings];
    const targetInning = { ...nextInnings[innIdx] };
    const eventIdx = targetInning.events.findIndex((e) => e.id === playId);
    if (eventIdx === -1) return;

    const newSec = timeStrToSec(editForm.time_str);
    const updatedEvent: PlayEvent = {
      ...targetInning.events[eventIdx],
      timestamp_sec: newSec,
      description: editForm.description,
      runs_scored: Number(editForm.runs),
      outs_recorded: Number(editForm.outs),
      event_type: editForm.event_type,
      batter_name: editForm.batter_name,
    };

    targetInning.events = [
      ...targetInning.events.slice(0, eventIdx),
      updatedEvent,
      ...targetInning.events.slice(eventIdx + 1),
    ];

    // 動態重算該半局的總得分
    const totalRuns = targetInning.events.reduce((sum, e) => sum + (Number(e.runs_scored) || 0), 0);
    if (targetInning.inning_half === "TOP") {
      targetInning.guest_runs = totalRuns;
    } else {
      targetInning.home_runs = totalRuns;
    }

    nextInnings[innIdx] = targetInning;
    setEditingPlayId(null);
    if (onInningsChange) onInningsChange(nextInnings);
  };

  const deletePlay = (innIdx: number, playId: string) => {
    if (!confirm("確定要刪除這個打席/事件嗎？")) return;
    const nextInnings = [...innings];
    const targetInning = { ...nextInnings[innIdx] };
    targetInning.events = targetInning.events.filter((e) => e.id !== playId);

    // 重算半局得分
    const totalRuns = targetInning.events.reduce((sum, e) => sum + (Number(e.runs_scored) || 0), 0);
    if (targetInning.inning_half === "TOP") {
      targetInning.guest_runs = totalRuns;
    } else {
      targetInning.home_runs = totalRuns;
    }

    nextInnings[innIdx] = targetInning;
    if (onInningsChange) onInningsChange(nextInnings);
  };

  const handleAddPlay = (innIdx: number) => {
    const nextInnings = [...innings];
    const targetInning = { ...nextInnings[innIdx] };
    const newId = "user_play_" + Date.now();
    const newSec = timeStrToSec(newPlayForm.time_str);

    const newEv: PlayEvent = {
      id: newId,
      timestamp_sec: newSec,
      inning_num: targetInning.inning_num,
      inning_half: targetInning.inning_half,
      event_type: newPlayForm.event_type,
      description: newPlayForm.description || "自訂打席記錄",
      runs_scored: Number(newPlayForm.runs),
      outs_recorded: Number(newPlayForm.outs),
      batter_name: newPlayForm.batter_name || "",
    };

    targetInning.events = [...targetInning.events, newEv].sort(
      (a, b) => a.timestamp_sec - b.timestamp_sec
    );

    // 重算得分
    const totalRuns = targetInning.events.reduce((sum, e) => sum + (Number(e.runs_scored) || 0), 0);
    if (targetInning.inning_half === "TOP") {
      targetInning.guest_runs = totalRuns;
    } else {
      targetInning.home_runs = totalRuns;
    }

    nextInnings[innIdx] = targetInning;
    setAddingToInningIndex(null);
    setNewPlayForm({
      time_str: "10:00",
      description: "",
      runs: 0,
      outs: 0,
      event_type: "SINGLE",
      batter_name: "",
    });
    if (onInningsChange) onInningsChange(nextInnings);
  };

  const handleAddNewInning = () => {
    const lastInning = innings[innings.length - 1];
    let nextNum = 1;
    let nextHalf: "TOP" | "BOTTOM" = "TOP";

    if (lastInning) {
      if (lastInning.inning_half === "TOP") {
        nextNum = lastInning.inning_num;
        nextHalf = "BOTTOM";
      } else {
        nextNum = lastInning.inning_num + 1;
        nextHalf = "TOP";
      }
    }

    const halfStr = nextHalf === "TOP" ? "上半局" : "下半局";
    const newInning: InningCheckpoint = {
      inning_num: nextNum,
      inning_half: nextHalf,
      guest_runs: 0,
      home_runs: 0,
      summary_text: `【第 ${nextNum} 局${halfStr}】手動接續半局開始`,
      events: [
        {
          id: `start_${nextNum}_${nextHalf}_${Date.now()}`,
          timestamp_sec: lastInning?.events.slice(-1)[0]?.timestamp_sec ? lastInning.events.slice(-1)[0].timestamp_sec + 60 : 1200,
          inning_num: nextNum,
          inning_half: nextHalf,
          event_type: "START",
          description: `第 ${nextNum} 局${halfStr} 比賽開始`,
          runs_scored: 0,
          outs_recorded: 0,
        },
      ],
    };

    const nextInnings = [...innings, newInning];
    if (onInningsChange) onInningsChange(nextInnings);
  };

  return (
    <div className="space-y-6">
      {innings.map((inn, innIdx) => {
        const halfText = inn.inning_half === "TOP" ? "上半局" : "下半局";
        return (
          <div
            key={innIdx}
            className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4"
          >
            {/* 半局標題與總分 */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  第 {inn.inning_num} 局{halfText}
                </h3>
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {inn.events.length} 個打席 / 事件
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={reanalyzingIndex === innIdx}
                  onClick={() => handleTriggerReanalyze(innIdx, inn.inning_num, inn.inning_half)}
                  title="重新使用視覺 AI 模型掃描此局畫面與記分板"
                  className="text-xs bg-indigo-950/80 hover:bg-indigo-600 text-indigo-200 border border-indigo-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  {reanalyzingIndex === innIdx ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      影像 AI 重新掃描中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      重新影像分析此局
                    </>
                  )}
                </button>
                <span className="text-xs text-indigo-400 font-mono bg-indigo-950/60 border border-indigo-800/80 px-3 py-1 rounded-lg">
                  本局得分：{inn.inning_half === "TOP" ? inn.guest_runs : inn.home_runs} 分
                </span>
              </div>
            </div>

            {/* 半局摘要 */}
            {inn.summary_text && (
              <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed">
                {inn.summary_text}
              </p>
            )}

            {/* 打席列表 */}
            <div className="space-y-2">
              {inn.events.map((ev) => {
                const isEditing = editingPlayId === ev.id;
                const timeLabel = secToTimeStr(ev.timestamp_sec);

                if (isEditing) {
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl bg-slate-800 border-2 border-indigo-500 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold border-b border-slate-700 pb-1.5">
                        <span>✏️ 正在編輯打席事件</span>
                        <span>ID: {ev.id}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">時間 (分:秒)</label>
                          <input
                            type="text"
                            value={editForm.time_str}
                            onChange={(e) =>
                              setEditForm({ ...editForm, time_str: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">事件類型</label>
                          <select
                            value={editForm.event_type}
                            onChange={(e) =>
                              setEditForm({ ...editForm, event_type: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          >
                            {EVENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">得分 (+分)</label>
                          <input
                            type="number"
                            min="0"
                            max="4"
                            value={editForm.runs}
                            onChange={(e) =>
                              setEditForm({ ...editForm, runs: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">出局數 (+出局)</label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            value={editForm.outs}
                            onChange={(e) =>
                              setEditForm({ ...editForm, outs: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="md:col-span-2">
                          <label className="text-slate-400 block mb-1">文字描述</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">打者姓名/棒次</label>
                          <input
                            type="text"
                            value={editForm.batter_name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, batter_name: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(innIdx, ev.id)}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-indigo-600/30"
                        >
                          <Check className="w-3.5 h-3.5" />
                          儲存修改
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={ev.id}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 hover:bg-indigo-950/40 border border-slate-800/90 hover:border-indigo-500/50 transition-all"
                  >
                    {/* 左側：秒數跳轉、棒次徽章、打席結果與描述 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={() => onSelectTimestamp(ev.timestamp_sec)}
                        title="點擊跳轉 YouTube 播放此畫面"
                        className="text-indigo-400 hover:text-white flex items-center gap-1.5 font-mono text-xs bg-indigo-950/80 hover:bg-indigo-600 border border-indigo-800/80 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        {timeLabel}
                      </button>

                      {ev.order_label && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {ev.order_label}
                        </span>
                      )}

                      {ev.result && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 ${
                            ev.event_type === "HOME_RUN"
                              ? "bg-rose-950/80 text-rose-300 border-rose-700"
                              : ev.event_type === "SINGLE" ||
                                ev.event_type === "DOUBLE" ||
                                ev.event_type === "TRIPLE"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                              : ev.event_type === "WALK"
                              ? "bg-sky-950/80 text-sky-300 border-sky-700"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {ev.result}
                        </span>
                      )}

                      <span
                        onClick={() => onSelectTimestamp(ev.timestamp_sec)}
                        className="text-slate-200 text-sm font-medium truncate cursor-pointer hover:text-indigo-300"
                        title={ev.description}
                      >
                        {ev.description}
                      </span>
                    </div>

                    {/* 右側：標籤與操作按鈕 */}
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.runs_scored > 0 && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          +{ev.runs_scored} 分
                        </span>
                      )}
                      {ev.outs_recorded > 0 && (
                        <span className="text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                          +{ev.outs_recorded} 出局
                        </span>
                      )}

                      {/* 編輯按鈕 */}
                      <button
                        type="button"
                        onClick={() => startEdit(ev)}
                        title="編輯此 Play"
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 刪除按鈕 */}
                      <button
                        type="button"
                        onClick={() => deletePlay(innIdx, ev.id)}
                        title="刪除此 Play"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 新增打席事件按鈕或表單 */}
            {addingToInningIndex === innIdx ? (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-emerald-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold border-b border-slate-700 pb-1.5">
                  <span>➕ 在此半局新增打席/事件</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">時間 (分:秒)</label>
                    <input
                      type="text"
                      value={newPlayForm.time_str}
                      onChange={(e) =>
                        setNewPlayForm({ ...newPlayForm, time_str: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">事件類型</label>
                    <select
                      value={newPlayForm.event_type}
                      onChange={(e) =>
                        setNewPlayForm({ ...newPlayForm, event_type: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">得分 (+分)</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={newPlayForm.runs}
                      onChange={(e) =>
                        setNewPlayForm({
                          ...newPlayForm,
                          runs: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">出局數 (+出局)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      value={newPlayForm.outs}
                      onChange={(e) =>
                        setNewPlayForm({
                          ...newPlayForm,
                          outs: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="md:col-span-2">
                    <label className="text-slate-400 block mb-1">文字描述</label>
                    <input
                      type="text"
                      placeholder="例：擊出中外野深遠二壘安打"
                      value={newPlayForm.description}
                      onChange={(e) =>
                        setNewPlayForm({ ...newPlayForm, description: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">打者姓名/棒次</label>
                    <input
                      type="text"
                      placeholder="例：大勇國小 1 棒"
                      value={newPlayForm.batter_name}
                      onChange={(e) =>
                        setNewPlayForm({ ...newPlayForm, batter_name: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddingToInningIndex(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPlay(innIdx)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-emerald-600/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    確認新增
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingToInningIndex(innIdx)}
                className="w-full py-2 border border-dashed border-slate-700 hover:border-indigo-500/80 rounded-xl text-xs text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-colors bg-slate-950/40"
              >
                <Plus className="w-3.5 h-3.5" />
                新增此半局打席 / 事件 (Play)
              </button>
            )}
          </div>
        );
      })}

      {/* 接續新增半局按鈕：以影像 AI 視覺分析為核心 */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          disabled={analyzingNext}
          onClick={handleTriggerAnalyzeNext}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/40 transition-all disabled:opacity-60 cursor-pointer"
        >
          {analyzingNext ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              雲端視覺 AI 正在掃描下一半局影格...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-white" />
              🎥 影像 AI 自動分析並接續下一半局
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleAddNewInning}
          className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          手動建立空白半局
        </button>
      </div>
    </div>
  );
};
