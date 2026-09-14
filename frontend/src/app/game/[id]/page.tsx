"use client";

import React, { useState } from "react";
import { VideoSyncPlayer } from "@/components/VideoSyncPlayer";
import { LineupEditor } from "@/components/LineupEditor";
import { InningPlayTimeline } from "@/components/InningPlayTimeline";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [isLineupConfirmed, setIsLineupConfirmed] = useState(false);

  const mockLineup = {
    guest_team: {
      team_name: "桃園龜山少棒",
      lineup: [
        { order: 1, number: "10", name: "邱則瑋", position: "SS" },
        { order: 2, number: "6", name: "彭成安", position: "2B" },
        { order: 3, number: "1", name: "范宸竣", position: "CF" },
        { order: 4, number: "3", name: "吳昀熹", position: "1B" },
        { order: 5, number: "7", name: "陳泓宇", position: "LF" },
        { order: 6, number: "2", name: "許邵傑", position: "C" },
        { order: 7, number: "5", name: "莊傑恩", position: "3B" },
        { order: 8, number: "9", name: "賴承希", position: "RF" },
        { order: 9, number: "18", name: "游騰皓", position: "P" },
      ],
    },
    home_team: {
      team_name: "台北東園少棒",
      lineup: [
        { order: 1, number: "1", name: "黃小傑", position: "SS" },
        { order: 2, number: "2", name: "張廷宇", position: "2B" },
        { order: 3, number: "10", name: "林子揚", position: "P" },
        { order: 4, number: "4", name: "陳冠廷", position: "1B" },
        { order: 5, number: "8", name: "周彥廷", position: "CF" },
        { order: 6, number: "3", name: "郭宇翔", position: "3B" },
        { order: 7, number: "9", name: "葉冠宏", position: "LF" },
        { order: 8, number: "5", name: "劉秉軒", position: "C" },
        { order: 9, number: "7", name: "王品捷", position: "RF" },
      ],
    },
  };

  const mockInnings = [
    {
      inning_num: 1,
      inning_half: "TOP" as const,
      guest_runs: 2,
      home_runs: 0,
      summary_text: "1局上半，邱則瑋選到保送，范宸竣擊出右外野方向二壘安打帶有 2 分打點",
      events: [
        {
          id: "ev-1",
          timestamp_sec: 145.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "WALK",
          description: "1棒 邱則瑋：四壞球保送上壘 (BB)",
          runs_scored: 0,
          outs_recorded: 0,
        },
        {
          id: "ev-2",
          timestamp_sec: 182.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "FIELD_OUT",
          description: "2棒 彭成安：二壘滾地球出局 (4-3 GO，跑者推進二壘)",
          runs_scored: 0,
          outs_recorded: 1,
        },
        {
          id: "ev-3",
          timestamp_sec: 220.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "DOUBLE",
          description: "3棒 范宸竣：擊出右外野平飛二壘安打，送回邱則瑋",
          runs_scored: 1,
          outs_recorded: 1,
        },
        {
          id: "ev-4",
          timestamp_sec: 255.0,
          inning_num: 1,
          inning_half: "TOP" as const,
          event_type: "STRIKEOUT",
          description: "4棒 吳昀熹：站著不動遭到三振 (ꓘ，3 出局換局)",
          runs_scored: 0,
          outs_recorded: 2,
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
            <span className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
              <CheckCircle2 className="w-4 h-4" /> 雲端服務同步中
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {!isLineupConfirmed ? (
              <LineupEditor
                initialLineup={mockLineup}
                onConfirm={(confirmed) => setIsLineupConfirmed(true)}
              />
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">即時記分狀態</span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      {mockLineup.guest_team.team_name} 2 : 0 {mockLineup.home_team.team_name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsLineupConfirmed(false)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    重新校對攻守名單
                  </button>
                </div>

                <InningPlayTimeline
                  innings={mockInnings}
                  onSelectTimestamp={(sec) => setSelectedTimestamp(sec)}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <VideoSyncPlayer
                youtubeUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                seekTimestamp={selectedTimestamp}
              />
              <div className="mt-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 實況驗證小提示：</p>
                <p>點擊左側任一攻守記錄之時間（如 03:40），右側播放器會立即跳轉至該秒數並開始播放，方便您瞬間核對打擊與出局結果。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}