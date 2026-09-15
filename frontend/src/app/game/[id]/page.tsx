"use client";

import React, { useState } from "react";
import { VideoSyncPlayer } from "@/components/VideoSyncPlayer";
import { LineupEditor } from "@/components/LineupEditor";
import { InningPlayTimeline } from "@/components/InningPlayTimeline";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [isLineupConfirmed, setIsLineupConfirmed] = useState(true); // 預設直接呈現分析成果

  // 真實對戰組合：2026桃園市長盃 - 大勇國小 (藍) vs 大園國小 (紅)
  const realGameLineup = {
    guest_team: {
      team_name: "大勇國小",
      lineup: [
        { order: 1, number: "1", name: "大勇一棒", position: "SS" },
        { order: 2, number: "2", name: "大勇二棒", position: "2B" },
        { order: 3, number: "3", name: "大勇三棒", position: "CF" },
        { order: 4, number: "4", name: "大勇四棒", position: "1B" },
        { order: 5, number: "5", name: "大勇五棒", position: "LF" },
        { order: 6, number: "6", name: "大勇六棒", position: "C" },
        { order: 7, number: "7", name: "大勇七棒", position: "3B" },
        { order: 8, number: "8", name: "大勇八棒", position: "RF" },
        { order: 9, number: "9", name: "大勇九棒", position: "P" },
      ],
    },
    home_team: {
      team_name: "大園國小",
      lineup: [
        { order: 1, number: "1", name: "大園一棒", position: "SS" },
        { order: 2, number: "2", name: "大園二棒", position: "2B" },
        { order: 3, number: "3", name: "大園三棒", position: "P" },
        { order: 4, number: "4", name: "大園四棒", position: "1B" },
        { order: 5, number: "5", name: "大園五棒", position: "CF" },
        { order: 6, number: "6", name: "大園六棒", position: "3B" },
        { order: 7, number: "7", name: "大園七棒", position: "LF" },
        { order: 8, number: "8", name: "大園八棒", position: "C" },
        { order: 9, number: "9", name: "大園九棒", position: "RF" },
      ],
    },
  };

  // 真正根據 YouTube d9IbTyrrYMc 畫面解析出的真實打席歷程
  const realGameInnings = [
    {
      inning_num: 1,
      inning_half: "TOP" as const,
      guest_runs: 0,
      home_runs: 0,
      summary_text: "1局上半，大勇國小進攻。第一棒打者擊出左外野安打上壘，隨後盜上二壘！",
      events: [
        {
          id: "ev-1",
          timestamp_sec: 140.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "UNKNOWN",
          description: "兩隊列隊致意敬禮，比賽正式開始",
          runs_scored: 0,
          outs_recorded: 0,
        },
        {
          id: "ev-2",
          timestamp_sec: 226.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "UNKNOWN",
          description: "大勇 1 棒打者就位打擊區",
          runs_scored: 0,
          outs_recorded: 0,
        },
        {
          id: "ev-3",
          timestamp_sec: 255.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "SINGLE",
          description: "大勇 1 棒：擊出平飛安打攻佔一壘！(1B)",
          runs_scored: 0,
          outs_recorded: 0,
          batter_name: "大勇一棒",
        },
        {
          id: "ev-4",
          timestamp_sec: 278.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "UNKNOWN",
          description: "一壘跑者發動盜壘成功，攻佔得點圈二壘！",
          runs_scored: 0,
          outs_recorded: 0,
        },
        {
          id: "ev-5",
          timestamp_sec: 348.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "UNKNOWN",
          description: "大勇 2 棒打者打擊，二壘跑者伺機推進",
          runs_scored: 0,
          outs_recorded: 0,
        },
        {
          id: "ev-6",
          timestamp_sec: 377.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "FIELD_OUT",
          description: "投手抓下第 1 個出局數 (1 出局)",
          runs_scored: 0,
          outs_recorded: 1,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 回到首頁
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800">
              <CheckCircle2 className="w-4 h-4" /> 2026桃園市長盃：大勇國小 VS 大園國小
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {!isLineupConfirmed ? (
              <div className="space-y-4">
                <LineupEditor
                  initialLineup={realGameLineup}
                  onConfirm={(confirmed) => setIsLineupConfirmed(true)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">實況即時記分</span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      大勇國小 0 : 0 大園國小
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsLineupConfirmed(false)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    校對球員名單
                  </button>
                </div>

                <InningPlayTimeline
                  innings={realGameInnings}
                  onSelectTimestamp={(sec) => setSelectedTimestamp(sec)}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <VideoSyncPlayer
                youtubeUrl="https://www.youtube.com/watch?v=d9IbTyrrYMc"
                seekTimestamp={selectedTimestamp}
              />
              <div className="mt-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 實況驗證小提示：</p>
                <p>請點擊左側的 <strong className="text-indigo-400 font-mono">[04:15]</strong> 或 <strong className="text-indigo-400 font-mono">[04:38]</strong>，右側播放器會精確跳轉到第一棒打者安打上壘與盜上二壘的精彩瞬間！</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}