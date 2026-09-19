"use client";

import React, { useState } from "react";
import { FileText, Copy, Download, Check, PlayCircle, Eye, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface TimelineEntry {
  timestamp_sec: number;
  timestamp_str: string;
  guest_team: string;
  home_team: string;
  guest_score: number;
  home_score: number;
  inning: number;
  half: string;
  outs: number;
  description: string;
  is_score_change?: boolean;
  is_game_over?: boolean;
  frame_b64?: string;
}

interface MarkdownTimelineViewerProps {
  markdownContent: string;
  timelineEntries?: TimelineEntry[];
  onSelectTimestamp: (sec: number) => void;
}

export const MarkdownTimelineViewer: React.FC<MarkdownTimelineViewerProps> = ({
  markdownContent,
  timelineEntries = [],
  onSelectTimestamp,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"CARD" | "RAW">("CARD");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleCopy = () => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!markdownContent) return;
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `baseball_match_timeline_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 頂部工具列 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              賽事實況 Markdown 時序日誌
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                100% 真實提取
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              影片多模態視覺與時間戳記對齊生成 ‧ 棒球狀態機推導依據
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 切換卡片/原始模式 */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("CARD")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === "CARD" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              時序卡片視圖
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("RAW")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === "RAW" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Markdown 原文
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "已複製" : "複製 MD"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下載 .md</span>
          </button>
        </div>
      </div>

      {/* 內容區塊 */}
      {activeTab === "CARD" ? (
        <div className="space-y-3">
          {timelineEntries && timelineEntries.length > 0 ? (
            timelineEntries.map((entry, idx) => (
              <div
                key={idx}
                className={`bg-slate-900/90 border rounded-2xl p-4 transition-all duration-200 hover:border-slate-700 ${
                  entry.is_score_change
                    ? "border-emerald-500/50 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                    : entry.is_game_over
                    ? "border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/30"
                    : "border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTimestamp(entry.timestamp_sec)}
                        className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-mono px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors cursor-pointer"
                        title="點擊同步跳轉播放器"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>{entry.timestamp_str} ({entry.timestamp_sec}s)</span>
                      </button>

                      <span className="text-xs font-bold text-slate-300">
                        第 {entry.inning} 局 {entry.half === "TOP" ? "上半局" : "下半局"}
                      </span>

                      {entry.is_score_change && (
                        <span className="text-[10px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                          比分變動 🔥
                        </span>
                      )}

                      {entry.is_game_over && (
                        <span className="text-[10px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                          比賽結束 🏁
                        </span>
                      )}
                    </div>

                    {/* 記分板數據 */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-base font-black text-white">
                        {entry.guest_team}{" "}
                        <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {entry.guest_score} : {entry.home_score}
                        </span>{" "}
                        {entry.home_team}
                      </span>
                      <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">
                        出局數: <strong className="text-slate-200">{entry.outs}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed pt-1">
                      {entry.description || "記分板畫面清晰，轉播畫面正在進行常規投打對決。"}
                    </p>
                  </div>

                  {/* 縮圖預覽 */}
                  {entry.frame_b64 && (
                    <div className="relative group cursor-pointer" onClick={() => setSelectedImage(`data:image/jpeg;base64,${entry.frame_b64}`)}>
                      <img
                        src={`data:image/jpeg;base64,${entry.frame_b64}`}
                        alt="截圖證據"
                        className="w-28 h-16 object-cover rounded-xl border border-slate-700/80 shadow transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>檢視</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              目前尚無結構化時序條目，請點擊上方開始分析。
            </div>
          )}
        </div>
      ) : (
        /* Markdown 原始碼視圖 */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
          <pre className="text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {markdownContent || "尚未生成 Markdown 實況日誌。"}
          </pre>
        </div>
      )}

      {/* 彈出放大圖片 Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-bold text-white">真實轉播記分板影格檢驗</span>
              <span>點擊任意處關閉</span>
            </div>
            <img src={selectedImage} alt="放大截圖" className="w-full h-auto rounded-xl object-contain max-h-[75vh]" />
          </div>
        </div>
      )}
    </div>
  );
};
