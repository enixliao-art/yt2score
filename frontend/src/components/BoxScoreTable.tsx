"use client";

import React, { useState } from "react";
import { Users, Trophy, Shield } from "lucide-react";

export interface BatterStats {
  order: number;
  number: string;
  name: string;
  pos: string;
  pa: number;
  ab: number;
  h: number;
  r: number;
  rbi: number;
  bb: number;
  so: number;
  avg?: string;
}

export interface LineScoreData {
  innings: string[];
  guest: { name: string; scores: string[]; r: number; h: number; e: number };
  home: { name: string; scores: string[]; r: number; h: number; e: number };
}

interface BoxScoreTableProps {
  lineScore?: LineScoreData;
  guestBoxScore?: BatterStats[];
  homeBoxScore?: BatterStats[];
  guestTeam: string;
  homeTeam: string;
}

export const BoxScoreTable: React.FC<BoxScoreTableProps> = ({
  lineScore,
  guestBoxScore = [],
  homeBoxScore = [],
  guestTeam,
  homeTeam,
}) => {
  const [activeTab, setActiveTab] = useState<"GUEST" | "HOME">("GUEST");

  return (
    <div className="space-y-6">
      {/* 1. 局數得分線表 (Line Score) */}
      {lineScore && (
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl overflow-x-auto">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>比賽記分板 (Line Score)</span>
          </div>

          <table className="w-full text-center text-sm font-mono border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="text-left py-2 px-3 font-sans font-semibold">球隊</th>
                {lineScore.innings.map((inn, i) => (
                  <th key={i} className="py-2 px-2.5 w-9">{inn}</th>
                ))}
                <th className="py-2 px-3 text-amber-400 font-bold border-l border-slate-800 w-10">R</th>
                <th className="py-2 px-3 text-slate-300 w-10">H</th>
                <th className="py-2 px-3 text-slate-400 w-10">E</th>
              </tr>
            </thead>
            <tbody>
              {/* 客隊 */}
              <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                <td className="text-left py-2.5 px-3 font-sans font-semibold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {lineScore.guest.name} (客)
                </td>
                {lineScore.guest.scores.map((sc, i) => (
                  <td key={i} className="py-2.5 px-2 text-slate-200">{sc}</td>
                ))}
                <td className="py-2.5 px-3 font-black text-amber-400 border-l border-slate-800 text-base">{lineScore.guest.r}</td>
                <td className="py-2.5 px-3 text-slate-300 font-semibold">{lineScore.guest.h}</td>
                <td className="py-2.5 px-3 text-slate-400">{lineScore.guest.e}</td>
              </tr>
              {/* 主隊 */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="text-left py-2.5 px-3 font-sans font-semibold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  {lineScore.home.name} (主)
                </td>
                {lineScore.home.scores.map((sc, i) => (
                  <td key={i} className="py-2.5 px-2 text-slate-200">{sc}</td>
                ))}
                <td className="py-2.5 px-3 font-black text-amber-400 border-l border-slate-800 text-base">{lineScore.home.r}</td>
                <td className="py-2.5 px-3 text-slate-300 font-semibold">{lineScore.home.h}</td>
                <td className="py-2.5 px-3 text-slate-400">{lineScore.home.e}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 2. 球員打者攻守統計表 (Box Score Table) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        {/* 切換客隊 / 主隊 Tab */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              打者攻守記錄表 (Box Score)
            </h3>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("GUEST")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "GUEST"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {guestTeam} (客)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("HOME")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "HOME"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {homeTeam} (主)
            </button>
          </div>
        </div>

        {/* 攻守統計表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs font-mono border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-2 text-center w-12 font-semibold">棒次</th>
                <th className="py-2.5 px-2 text-center w-12 font-semibold">背號</th>
                <th className="py-2.5 px-3 text-left font-sans font-semibold">球員姓名</th>
                <th className="py-2.5 px-2 text-center w-12 font-semibold">守位</th>
                <th className="py-2.5 px-2.5 font-semibold">PA</th>
                <th className="py-2.5 px-2.5 font-semibold">AB</th>
                <th className="py-2.5 px-2.5 font-semibold text-amber-400">R</th>
                <th className="py-2.5 px-2.5 font-semibold text-emerald-400">H</th>
                <th className="py-2.5 px-2.5 font-semibold text-indigo-400">RBI</th>
                <th className="py-2.5 px-2.5 font-semibold">BB</th>
                <th className="py-2.5 px-2.5 font-semibold">SO</th>
                <th className="py-2.5 px-3 text-slate-300 font-semibold">AVG</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "GUEST" ? guestBoxScore : homeBoxScore).map((b, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2 px-2 text-slate-400">{b.order}</td>
                  <td className="py-2 px-2 font-bold text-slate-300">{b.number}</td>
                  <td className="py-2 px-3 text-left font-sans font-medium text-slate-200">
                    {b.name}
                  </td>
                  <td className="py-2 px-2">
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">
                      {b.pos}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-slate-300">{b.pa}</td>
                  <td className="py-2 px-2.5 text-slate-300">{b.ab}</td>
                  <td className="py-2 px-2.5 font-bold text-amber-400">{b.r}</td>
                  <td className="py-2 px-2.5 font-bold text-emerald-400">{b.h}</td>
                  <td className="py-2 px-2.5 font-bold text-indigo-400">{b.rbi}</td>
                  <td className="py-2 px-2.5 text-slate-300">{b.bb}</td>
                  <td className="py-2 px-2.5 text-slate-400">{b.so}</td>
                  <td className="py-2 px-3 text-slate-300">{b.avg || ".000"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
