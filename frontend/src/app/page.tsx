"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Sparkles, Tv, Layers, Clock } from "lucide-react";

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    // 導向比賽專屬記分與驗證面板 (例如模擬 game-1)
    setTimeout(() => {
      router.push("/game/demo-game-1");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* 頂部 Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/30">
              S
            </span>
            <span className="font-bold text-lg tracking-tight text-white">ScoreLive AI 棒球直播極速記分雲</span>
          </div>
          <span className="text-xs text-slate-400 border border-slate-700/60 bg-slate-800/60 px-3 py-1 rounded-full">
            Cloud Serverless Edition
          </span>
        </div>
      </header>

      {/* 核心輸入區塊 */}
      <main className="max-w-4xl mx-auto px-6 py-12 text-center space-y-8 flex-1 flex flex-col justify-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Modal 分散式平行運算 ‧ 360p 自適應動作觸發 ‧ 秒級影片跳轉驗證
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            YouTube 棒球直播 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">極速自動記分系統</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            貼上少棒或青少棒賽事 YouTube 網址，雲端 AI 自動擷取開賽先發字卡供您線上校對，並即時產出逐局戰報與可點擊跳轉驗證的攻守記錄。
          </p>
        </div>

        <form onSubmit={handleStartAnalysis} className="max-w-2xl mx-auto w-full space-y-4">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="請貼上 YouTube 比賽直播網址 (例: https://www.youtube.com/watch?v=d9IbTyrrYMc)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl px-5 py-4 text-white placeholder-slate-500 text-sm md:text-base focus:outline-none shadow-2xl transition-all pr-36"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
            >
              <Play className="w-4 h-4 fill-white" />
              {loading ? "啟動中..." : "開始分析"}
            </button>
          </div>
          <p className="text-xs text-slate-500 text-left px-2">
            * 系統預設以 360p 低頻寬快速掃描，僅在記分板變動時進行詳細提取，極致省時省頻寬。
          </p>
        </form>

        {/* 核心特色卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left pt-6">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-indigo-400 mb-2">
              <Tv className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm">開賽字卡 OCR + 校對</h4>
            <p className="text-xs text-slate-400 mt-1">自動捕捉先發攻守字卡，提供線上表單核對姓名讀音與背號。</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center text-purple-400 mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm">逐局即時產出</h4>
            <p className="text-xs text-slate-400 mt-1">每半局結束即時封裝文字記錄，中斷可直接從指定局數接續。</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-pink-950 flex items-center justify-center text-pink-400 mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm">時間戳秒級連動</h4>
            <p className="text-xs text-slate-400 mt-1">點擊記錄上的時間標籤，右側影片立即跳轉到該擊球瞬時 Play 覆核。</p>
          </div>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        ScoreLive AI Web Service ‧ Fully Serverless Architecture
      </footer>
    </div>
  );
}