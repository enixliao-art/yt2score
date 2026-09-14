"use client";

import React, { useState } from "react";
import { Check, Edit3, ShieldAlert } from "lucide-react";

interface Player {
  order: number;
  number: string;
  name: string;
  position: string;
}

interface TeamLineup {
  team_name: string;
  lineup: Player[];
}

interface GameLineup {
  guest_team: TeamLineup;
  home_team: TeamLineup;
  card_image_url?: string;
}

interface LineupEditorProps {
  initialLineup: GameLineup;
  onConfirm: (confirmedLineup: GameLineup) => void;
}

export const LineupEditor: React.FC<LineupEditorProps> = ({ initialLineup, onConfirm }) => {
  const [lineupData, setLineupData] = useState<GameLineup>(initialLineup);

  const handlePlayerChange = (
    team: "guest_team" | "home_team",
    index: number,
    field: keyof Player,
    value: string
  ) => {
    const updated = { ...lineupData };
    (updated[team].lineup[index] as any)[field] = value;
    setLineupData(updated);
  };

  const renderTeamTable = (teamKey: "guest_team" | "home_team", title: string) => (
    <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center justify-between">
        <span>{title} ({lineupData[teamKey].team_name})</span>
        <span className="text-xs text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded">先發 9 人</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/60 border-b border-slate-700">
            <tr>
              <th className="px-2 py-1.5 w-12">棒次</th>
              <th className="px-2 py-1.5 w-16">背號</th>
              <th className="px-3 py-1.5">姓名 (可手動校對)</th>
              <th className="px-2 py-1.5 w-20">守位</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {lineupData[teamKey].lineup.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-700/30">
                <td className="px-2 py-1 text-center font-bold text-slate-400">{p.order}</td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={p.number}
                    onChange={(e) => handlePlayerChange(teamKey, idx, "number", e.target.value)}
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-amber-300 font-mono"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handlePlayerChange(teamKey, idx, "name", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-medium"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={p.position}
                    onChange={(e) => handlePlayerChange(teamKey, idx, "position", e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-300 font-mono uppercase"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-indigo-400" />
            開賽先發攻守字卡 OCR 校對
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            系統已從開賽畫面自動截取字卡並完成 OCR。請檢視姓名讀音或錯字，確認無誤後即可啟動追蹤。
          </p>
        </div>
        <button
          onClick={() => onConfirm(lineupData)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all"
        >
          <Check className="w-5 h-5" />
          確認名單並開始逐局追蹤
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTeamTable("guest_team", "客隊先發名單")}
        {renderTeamTable("home_team", "主隊先發名單")}
      </div>
    </div>
  );
};
