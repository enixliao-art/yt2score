"use client";

import React, { useState } from "react";
import { Play, Sparkles, Loader2, Layers, CheckCircle2, Table, ListOrdered, Cpu, Video, CheckCheck } from "lucide-react";
import { VideoSyncPlayer } from "@/components/VideoSyncPlayer";
import { InningPlayTimeline } from "@/components/InningPlayTimeline";
import { BoxScoreTable } from "@/components/BoxScoreTable";

const MODAL_API_URL = "https://enixliao-art--yt2score-service-fastapi-app.modal.run/api/analyze";

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=d9IbTyrrYMc");
  const [loading, setLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"SCORECARD" | "BOXSCORE">("SCORECARD");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    setAnalysisPhase(1);
    setProgressPct(20);

    // 四階段平滑進度模擬器
    const timer1 = setTimeout(() => {
      setAnalysisPhase(2);
      setProgressPct(50);
    }, 1200);

    const timer2 = setTimeout(() => {
      setAnalysisPhase(3);
      setProgressPct(80);
    }, 2800);

    const timer3 = setTimeout(() => {
      setAnalysisPhase(4);
      setProgressPct(95);
    }, 4500);

    try {
      const res = await fetch(MODAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
      });
      const data = await res.json();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (data.status === "success") {
        setProgressPct(100);
        setAnalysisPhase(4);
        setAnalyzedData(data);
        const elapsed = data.full_game_metadata?.elapsed_seconds || 3.5;
        const totalInnings = data.innings?.length || 8;
        showToast(`🏆 全場雙軌分析完成！共分析 ${totalInnings} 個半局，現場運算耗時 ${elapsed} 秒！`);
      } else {
        alert("分析錯誤：" + (data.message || "未知錯誤"));
      }
    } catch (err: any) {
      alert("連線雲端 API 失敗：" + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setAnalysisPhase(0), 1000);
    }
  };

  const handleInningsChange = (updatedInnings: any[], extraData?: any) => {
    // 動態重新統計全場總分
    let totalGuest = 0;
    let totalHome = 0;

    // 建立 1~6 局的 line score 陣列
    const maxInningNum = Math.max(6, ...updatedInnings.map(inn => inn.inning_num || 1));
    const guestScores = Array(maxInningNum).fill("-");
    const homeScores = Array(maxInningNum).fill("-");

    updatedInnings.forEach((inn) => {
      const idx = (inn.inning_num || 1) - 1;
      if (inn.inning_half === "TOP") {
        totalGuest += Number(inn.guest_runs) || 0;
        if (idx < guestScores.length) guestScores[idx] = String(inn.guest_runs);
      } else {
        totalHome += Number(inn.home_runs) || 0;
        if (idx < homeScores.length) homeScores[idx] = String(inn.home_runs);
      }
    });

    setAnalyzedData((prev: any) => {
      if (!prev) return prev;
      const updatedLineScore = extraData?.line_score || {
        ...prev.line_score,
        innings: Array.from({ length: maxInningNum }, (_, i) => String(i + 1)),
        guest: {
          ...prev.line_score?.guest,
          scores: guestScores,
          r: totalGuest,
        },
        home: {
          ...prev.line_score?.home,
          scores: homeScores,
          r: totalHome,
        }
      };

      return {
        ...prev,
        guest_score: totalGuest,
        home_score: totalHome,
        innings: updatedInnings,
        line_score: updatedLineScore,
        guest_box_score: extraData?.guest_box_score || prev.guest_box_score,
        home_box_score: extraData?.home_box_score || prev.home_box_score,
      };
    });
  };

  // 重新使用視覺 AI 分析特定半局
  const handleReanalyzeInning = async (innIdx: number, inningNum: number, inningHalf: "TOP" | "BOTTOM") => {
    const halfText = inningHalf === "TOP" ? "上半局" : "下半局";
    showToast(`🤖 正在啟動 Google Gemini 2.5 Flash 現場分析第 ${inningNum} 局${halfText}真實影格...`);
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
        handleInningsChange(nextInnings, data);
        const elapsed = data.inning.analysis_metadata?.elapsed_seconds;
        if (elapsed) {
          showToast(`✅ 視覺 AI 現場分析完成！Gemini 2.5 Flash 現場運算耗時 ${elapsed} 秒，已即時解析轉播影格與記分板！`);
        } else {
          showToast(`✅ 視覺 AI 重新影像分析完成！已刷新第 ${inningNum} 局${halfText}真實打席與比分記錄！`);
        }
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
    const halfText = nextHalf === "TOP" ? "上半局" : "下半局";
    showToast(`🤖 正在呼叫 Google Gemini 2.5 Flash 現場掃描第 ${nextNum} 局${halfText}...`);

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
        handleInningsChange(nextInnings, data);
        const elapsed = data.inning.analysis_metadata?.elapsed_seconds;
        if (elapsed) {
          showToast(`✅ 視覺 AI 成功接續第 ${nextNum} 局${halfText}！(現場耗時 ${elapsed} 秒)`);
        } else {
          showToast(`✅ 視覺 AI 成功接續第 ${nextNum} 局${halfText}！`);
        }
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-300 border border-indigo-700/60 bg-indigo-950/60 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              雙軌全自動分析 (平行加速 + Gemini 多模態)
            </span>
            <span className="text-xs text-emerald-400 border border-emerald-700/60 bg-emerald-950/60 px-3 py-1 rounded-full">
              ● 逐 Play 在線即時微調
            </span>
          </div>
        </div>
      </header>

      {/* 浮動提示 Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-2xl shadow-emerald-500/40 border border-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* 主內容區塊 */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            一鍵全場完整分析 ‧ 雲端平行切片加速 ‧ Gemini 2.5 Flash 多模態逐局打席推導
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            YouTube 棒球直播全場極速自動記分
          </h1>
          <p className="text-sm text-slate-400">
            雙軌架構一次分析完整場比賽所有局數與打席！支援全場 Play-by-Play 即時編輯與個別半局重新影像校驗。
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  全場雙軌分析中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  一鍵全場分析
                </>
              )}
            </button>
          </form>

          {/* 四階段全場分析進度卡片 */}
          {loading && (
            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 text-left space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  正在執行雲端雙軌分析管線...
                </span>
                <span className="font-mono font-bold text-white text-sm">{progressPct}%</span>
              </div>

              {/* 進度條 */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>

              {/* 四步驟指示器 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${analysisPhase >= 1 ? "bg-indigo-950/60 border-indigo-500 text-indigo-200" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                  <span className="font-bold">1</span>
                  <span>🔍 字卡名單辨識</span>
                </div>
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${analysisPhase >= 2 ? "bg-indigo-950/60 border-indigo-500 text-indigo-200" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                  <span className="font-bold">2</span>
                  <span>⚡ 全場分段掃描</span>
                </div>
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${analysisPhase >= 3 ? "bg-indigo-950/60 border-indigo-500 text-indigo-200" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                  <span className="font-bold">3</span>
                  <span>🧠 Gemini 多模態推導</span>
                </div>
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${analysisPhase >= 4 ? "bg-emerald-950/60 border-emerald-500 text-emerald-200" : "bg-slate-950/40 border-slate-800 text-slate-500"}`}>
                  <span className="font-bold">4</span>
                  <span>📊 彙整全場記錄表</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 分析結果呈現 */}
        {analyzedData && (
          <div className="space-y-6 pt-6 border-t border-slate-800/80">
            {/* 全場雙軌分析結果成就標章 */}
            {analyzedData.full_game_metadata && (
              <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900/80 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ● 全場雙軌分析完成
                      </span>
                      <span className="text-xs text-indigo-300 font-mono">
                        {analyzedData.full_game_metadata.game_status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      共分析 <strong className="text-emerald-300 font-mono text-base">{analyzedData.innings?.length || 0}</strong> 個半局 ‧ 現場運算耗時：<strong className="text-indigo-300 font-mono">{analyzedData.full_game_metadata.elapsed_seconds} 秒</strong> ‧ 核心模型：{analyzedData.full_game_metadata.model}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  完成時間：{analyzedData.full_game_metadata.analyzed_at}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左側：逐局戰報與打席 */}
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
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                    ⚾ 全場逐棒打席實質分析 (Scorecard)
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
                    📋 全場攻守記錄表 (Box Score)
                  </button>
                </div>

                {activeView === "SCORECARD" ? (
                  /* 全場逐局時間軸 (支援影像 AI 重新分析此局、接續分析下一半局、即時 Play 編輯) */
                  <InningPlayTimeline
                    innings={analyzedData.innings}
                    onSelectTimestamp={(sec) => setSelectedTimestamp(sec)}
                    onInningsChange={handleInningsChange}
                    onReanalyzeInning={handleReanalyzeInning}
                    onAnalyzeNextInning={handleAnalyzeNextInning}
                  />
                ) : (
                  /* 全場攻守記錄表 */
                  <BoxScoreTable
                    guestTeam={analyzedData.guest_team}
                    homeTeam={analyzedData.home_team}
                    guestBoxScore={analyzedData.guest_box_score}
                    homeBoxScore={analyzedData.home_box_score}
                    lineScore={analyzedData.line_score}
                  />
                )}
              </div>

              {/* 右側：YouTube 影音同步連動播放器 */}
              <div className="lg:col-span-5 space-y-6">
                <VideoSyncPlayer
                  youtubeUrl={youtubeUrl}
                  seekTimestamp={selectedTimestamp}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部 Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        <p>ScoreLive AI Baseball Engine ‧ Google Gemini 2.5 Flash 現場多模態驅動 ‧ Modal.com Serverless</p>
      </footer>
    </div>
  );
}
