"use client";

import React, { useState } from "react";
import { Play, Sparkles, Loader2, Layers, CheckCircle2, Table, ListOrdered } from "lucide-react";
import { VideoSyncPlayer } from "@/components/VideoSyncPlayer";
import { InningPlayTimeline } from "@/components/InningPlayTimeline";
import { BoxScoreTable } from "@/components/BoxScoreTable";

const MODAL_API_URL = "https://enixliao-art--yt2score-service-fastapi-app.modal.run/api/analyze";

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=d9IbTyrrYMc");
  const [loading, setLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"SCORECARD" | "BOXSCORE">("SCORECARD");

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(MODAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAnalyzedData(data);
      } else {
        alert("分析錯誤：" + (data.message || "未知錯誤"));
      }
    } catch (err: any) {
      alert("連線雲端 API 失敗：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInningsChange = (updatedInnings: any[]) => {
    // 動態重新統計全場總分
    let totalGuest = 0;
    let totalHome = 0;

    updatedInnings.forEach((inn) => {
      if (inn.inning_half === "TOP") {
        totalGuest += inn.guest_runs || 0;
      } else {
        totalHome += inn.home_runs || 0;
      }
    });

    setAnalyzedData((prev: any) => ({
      ...prev,
      guest_score: totalGuest,
      home_score: totalHome,
      innings: updatedInnings,
    }));
  };

  // 重新使用視覺 AI 分析特定半局
  const handleReanalyzeInning = async (innIdx: number, inningNum: number, inningHalf: "TOP" | "BOTTOM") => {
    try {
      const res = await fetch("https://enixliao-art--yt2score-service-fastapi-app.modal.run/api/analyze-inning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: youtubeUrl.trim(),
          inning_num: inningNum,
          inning_half: inningHalf,
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.inning) {
        const nextInnings = [...analyzedData.innings];
        nextInnings[innIdx] = data.inning;
        handleInningsChange(nextInnings);
      } else {
        alert("視覺 AI 分析失敗：" + (data.message || "未知錯誤"));
      }
    } catch (err: any) {
      alert("連線雲端視覺 AI 引擎失敗：" + err.message);
    }
  };

  // 影像 AI 分析並接續下一半局
  const handleAnalyzeNextInning = async () => {
    if (!analyzedData || !analyzedData.innings) return;
    const lastInning = analyzedData.innings[analyzedData.innings.length - 1];
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

    try {
      const res = await fetch("https://enixliao-art--yt2score-service-fastapi-app.modal.run/api/analyze-inning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: youtubeUrl.trim(),
          inning_num: nextNum,
          inning_half: nextHalf,
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.inning) {
        const nextInnings = [...analyzedData.innings, data.inning];
        handleInningsChange(nextInnings);
      } else {
        alert("視覺 AI 接續分析失敗：" + (data.message || "未知錯誤"));
      }
    } catch (err: any) {
      alert("連線雲端視覺 AI 引擎失敗：" + err.message);
    }
  };

  const handleExportJSON = () => {
    if (!analyzedData) return;
    const blob = new Blob([JSON.stringify(analyzedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baseball_score_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* 頂部 Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/30">
              S
            </span>
            <span className="font-bold text-lg tracking-tight text-white">ScoreLive AI 棒球直播極速記分雲</span>
          </div>
          <span className="text-xs text-emerald-400 border border-emerald-700/60 bg-emerald-950/60 px-3 py-1 rounded-full">
            ● 逐 Play 在線即時編輯 ‧ 全場接續分析
          </span>
        </div>
      </header>

      {/* 主內容區塊 */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            一鍵全場分析 ‧ 逐 Play 即時在線微調 ‧ 接續每個半局 ‧ YouTube 秒級連動
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            YouTube 棒球直播全場極速自動記分
          </h1>
          <p className="text-sm text-slate-400">
            支援全場賽事逐局分析與 Play-by-Play 即時編輯，絕不因單一局部誤判影響整體記分，精確追蹤比分走勢。
          </p>

          <form onSubmit={handleStartAnalysis} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="請輸入 YouTube 直播網址"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none shadow-xl"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  全場雲端分析中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  開始分析
                </>
              )}
            </button>
          </form>
        </div>

        {/* 分析結果呈現 */}
        {analyzedData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-slate-800/80">
            {/* 左側：逐局戰報 */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {analyzedData.title}
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-3">
                    <span>{analyzedData.guest_team}</span>
                    <span className="font-mono text-emerald-400 bg-slate-950 px-3 py-0.5 rounded-lg border border-slate-800">
                      {analyzedData.guest_score} : {analyzedData.home_score}
                    </span>
                    <span>{analyzedData.home_team}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    💾 匯出 JSON
                  </button>
                  <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    共 {analyzedData.innings?.length || 0} 個半局
                  </span>
                </div>
              </div>

              {/* 視圖切換器：逐棒打席實質分析 (Scorecard) vs 攻守記錄表 (Box Score) */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveView("SCORECARD")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeView === "SCORECARD"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  ⚾ 逐棒打席實質分析 (Scorecard)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("BOXSCORE")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeView === "BOXSCORE"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Table className="w-4 h-4" />
                  📋 攻守記錄表 (Box Score)
                </button>
              </div>

              {activeView === "SCORECARD" ? (
                /* 逐局時間軸 (支援影像 AI 重新分析此局、接續分析下一半局、即時 Play 編輯) */
                <InningPlayTimeline
                  innings={analyzedData.innings}
                  onSelectTimestamp={(sec) => setSelectedTimestamp(sec)}
                  onInningsChange={handleInningsChange}
                  onReanalyzeInning={handleReanalyzeInning}
                  onAnalyzeNextInning={handleAnalyzeNextInning}
                />
              ) : (
                /* 標準攻守記錄表與得分線表 */
                <BoxScoreTable
                  lineScore={analyzedData.line_score}
                  guestBoxScore={analyzedData.guest_box_score}
                  homeBoxScore={analyzedData.home_box_score}
                  guestTeam={analyzedData.guest_team}
                  homeTeam={analyzedData.home_team}
                />
              )}
            </div>

            {/* 右側：YouTube 播放器 */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6">
                <VideoSyncPlayer
                  youtubeUrl={youtubeUrl}
                  seekTimestamp={selectedTimestamp}
                />
                <div className="mt-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-300">💡 互動記分員操作提示：</p>
                  <p>1. 點擊任一 Play 的 <strong className="text-indigo-400">[時間標籤]</strong>，右側 YouTube 自動精確跳轉到該秒畫面驗證。</p>
                  <p>2. 點擊任一 Play 右側的 <strong className="text-indigo-400">✏️ (編輯)</strong>，可即時修改秒數、事件類型、文字描述、得分與出局數，總比分即時自動重算！</p>
                  <p>3. 支援 <strong className="text-emerald-400">+ 新增 Play</strong> 與 <strong className="text-indigo-400">+ 接續新增下一半局</strong>，確保全場比賽順暢記錄直到完賽！</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        ScoreLive AI Web Service ‧ Full Match Engine Online
      </footer>
    </div>
  );
}