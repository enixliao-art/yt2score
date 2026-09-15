"use client";

import React, { useState } from "react";
import { Play, Sparkles, Tv, Layers, Clock, Loader2 } from "lucide-react";
import { VideoSyncPlayer } from "@/components/VideoSyncPlayer";
import { InningPlayTimeline } from "@/components/InningPlayTimeline";
import { LineupEditor } from "@/components/LineupEditor";

const MODAL_API_URL = "https://enixliao-art--yt2score-service-fastapi-app.modal.run/api/analyze";

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=d9IbTyrrYMc");
  const [loading, setLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setLoading(true);

    try {
      // 真正向 Modal 雲端伺服器發送 POST 請求
      const res = await fetch(MODAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAnalyzedData(data);
      } else {
        alert("分析失敗：" + (data.message || "未知錯誤"));
      }
    } catch (err: any) {
      alert("連線雲端 API 失敗：" + err.message);
    } finally {
      setLoading(false);
    }
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
            ● 雲端 API 已就位 (Modal Serverless)
          </span>
        </div>
      </header>

      {/* 主內容區塊 */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* 輸入網址區塊 */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            真正呼叫 Modal 雲端叢集 ‧ 自適應偵測 ‧ 點擊時間標籤秒級連動
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            YouTube 棒球直播極速自動記分
          </h1>

          <form onSubmit={handleStartAnalysis} className="flex gap-2">
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  雲端運算分析中...
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

        {/* 若有分析結果，動態呈現 */}
        {analyzedData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-800/80">
            {/* 左側：真實比賽記分卡與時間軸 */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {analyzedData.title}
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">
                    {analyzedData.guest_team} 0 : 0 {analyzedData.home_team}
                  </h2>
                </div>
              </div>

              {/* 逐局事件時間軸 */}
              <InningPlayTimeline
                innings={analyzedData.innings}
                onSelectTimestamp={(sec) => setSelectedTimestamp(sec)}
              />
            </div>

            {/* 右側：YouTube 連動播放器 */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6">
                <VideoSyncPlayer
                  youtubeUrl={youtubeUrl}
                  seekTimestamp={selectedTimestamp}
                />
                <div className="mt-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">💡 實況驗證小提示：</p>
                  <p>請點擊左側的 <strong className="text-indigo-400 font-mono">[04:15]</strong> 或 <strong className="text-indigo-400 font-mono">[04:38]</strong>，右側播放器會自動跳轉至該球擊出安打或盜壘的真實秒數！</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        ScoreLive AI Web Service ‧ Live Modal Cloud API Connected
      </footer>
    </div>
  );
}