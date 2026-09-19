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
  Camera,
  Mic,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";

export interface PlayEvidence {
  has_screenshot?: boolean;
  screenshot?: string; // data:image/jpeg;base64,...
  has_audio?: boolean;
  audio_transcript?: string; // 主播播報語音原文
  vlm_reasoning?: string; // 多模態視覺分析推導
}

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
  is_out?: boolean;
  is_stolen_base?: boolean;
  scorers?: string[];
  batter_pos?: string;
  batter_num?: string;
  flag?: string;
  evidence?: PlayEvidence;
}

export interface InningCheckpoint {
  inning_num: number;
  inning_half: "TOP" | "BOTTOM";
  guest_runs: number;
  home_runs: number;
  summary_text: string;
  events: PlayEvent[];
  analysis_metadata?: {
    is_real_ai_call?: boolean;
    model?: string;
    elapsed_seconds?: number;
    analyzed_at?: string;
    gemini_summary?: string;
  };
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
  const [openedEvidenceIds, setOpenedEvidenceIds] = useState<Set<string>>(new Set());

  const toggleEvidence = (playId: string) => {
    setOpenedEvidenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(playId)) {
        next.delete(playId);
      } else {
        next.add(playId);
      }
      return next;
    });
  };

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
      {/* 快速局數導航標籤 */}
      {innings.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 font-semibold shrink-0 mr-1">局數快速導航：</span>
          {innings.map((inn, idx) => {
            const label = `${inn.inning_num}${inn.inning_half === "TOP" ? "上" : "下"}`;
            const runs = inn.inning_half === "TOP" ? inn.guest_runs : inn.home_runs;
            return (
              <a
                key={idx}
                href={`#inning-${inn.inning_num}-${inn.inning_half}`}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-colors shrink-0 font-mono"
              >
                {label} ({runs}分)
              </a>
            );
          })}
        </div>
      )}

      {innings.map((inn, innIdx) => {
        const halfText = inn.inning_half === "TOP" ? "上半局" : "下半局";
        return (
          <div
            key={innIdx}
            id={`inning-${inn.inning_num}-${inn.inning_half}`}
            className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 scroll-mt-20"
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

            {/* AI 即時現場分析狀態標章 */}
            {inn.analysis_metadata && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-indigo-950/60 border border-indigo-500/40 px-3.5 py-2 rounded-xl text-indigo-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-bold text-emerald-400">🤖 Google Gemini 2.5 Flash 現場多模態解析</span>
                  <span className="text-slate-300">‧ 現場運算耗時：<strong className="text-white font-mono">{inn.analysis_metadata.elapsed_seconds} 秒</strong></span>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">
                  即時完成時間：{inn.analysis_metadata.analyzed_at}
                </span>
              </div>
            )}

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
                    className="group rounded-xl bg-slate-950/70 hover:bg-indigo-950/40 border border-slate-800/90 hover:border-indigo-500/50 transition-all p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
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

                      {/* 右側：打席結果標籤（出局與否、打點、跑回本壘得分、盜壘）與操作按鈕 */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0 justify-end">
                        {/* 出局與否 */}
                        {ev.is_out !== undefined && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                              ev.is_out
                                ? "text-rose-400 bg-rose-950/60 border-rose-800"
                                : "text-emerald-400 bg-emerald-950/60 border-emerald-800"
                            }`}
                          >
                            {ev.is_out ? `✕ 出局 (${ev.outs_recorded || 1}出局)` : "✓ 上壘/安全"}
                          </span>
                        )}

                        {/* 打點 RBI */}
                        {(((ev.rbi ?? 0) > 0) || ((ev.runs_scored ?? 0) > 0)) && (
                          <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700 flex items-center gap-1">
                            <span>打點:</span>
                            <span className="font-mono text-white font-black">{ev.rbi || ev.runs_scored}</span>
                          </span>
                        )}

                        {/* 跑回本壘得分名單 */}
                        {ev.scorers && ev.scorers.length > 0 && (
                          <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700 flex items-center gap-1">
                            <span>🏃 得分:</span>
                            <span>{ev.scorers.join(", ")}</span>
                          </span>
                        )}

                        {/* 盜壘成功 */}
                        {ev.is_stolen_base && (
                          <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700">
                            ⚡ 盜壘成功
                          </span>
                        )}

                        {/* 查看 AI 多模態佐證按鈕 */}
                        {ev.evidence && (
                          <button
                            type="button"
                            onClick={() => toggleEvidence(ev.id)}
                            title="展開/收起真實影格截圖與主播語音分析"
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                              openedEvidenceIds.has(ev.id)
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                                : "bg-slate-900 hover:bg-slate-800 text-indigo-400 border-slate-700"
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>AI 佐證</span>
                          </button>
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

                    {/* 多模態分析真實佐證展開抽屜 */}
                    {ev.evidence && openedEvidenceIds.has(ev.id) && (
                      <div className="pt-2.5 border-t border-slate-800/80 bg-slate-900/60 p-3 rounded-xl space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            AI 多模態分析真實佐證 (視覺影格 + 主播實況語音)
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            來源：YouTube 直播真實抽幀與音訊轉錄
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          {/* 截圖與記分板 */}
                          {ev.evidence.screenshot && (
                            <div className="md:col-span-5 space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                                <Camera className="w-3 h-3 text-indigo-400" />
                                📸 轉播影格與記分板即時截圖：
                              </span>
                              <img
                                src={ev.evidence.screenshot}
                                alt="Play Screenshot"
                                className="w-full rounded-lg border border-slate-700 shadow-md object-cover"
                              />
                            </div>
                          )}

                          {/* 主播播報與 VLM 推導 */}
                          <div className={`space-y-2.5 ${ev.evidence.screenshot ? "md:col-span-7" : "md:col-span-12"}`}>
                            {ev.evidence.audio_transcript && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                  <Mic className="w-3 h-3" />
                                  🎙️ 主播播報實況語音轉錄 (Audio Transcript)：
                                </span>
                                <p className="text-xs text-emerald-200 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-800/60 font-mono leading-relaxed">
                                  「{ev.evidence.audio_transcript}」
                                </p>
                              </div>
                            )}

                            {ev.evidence.vlm_reasoning && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  🧠 多模態綜合決策依據 (VLM Reasoning)：
                                </span>
                                <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                                  {ev.evidence.vlm_reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
