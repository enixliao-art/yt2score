"use client";

import React from "react";
import { PlayCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface PlayEvent {
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
  flag?: string;
}

interface InningCheckpoint {
  inning_num: number;
  inning_half: "TOP" | "BOTTOM";
  guest_runs: number;
  home_runs: number;
  summary_text: string;
  events: PlayEvent[];
}

interface InningPlayTimelineProps {
  innings: InningCheckpoint[];
  onSelectTimestamp: (sec: number) => void;
}

export const InningPlayTimeline: React.FC<InningPlayTimelineProps> = ({ innings, onSelectTimestamp }) => {
  return (
    <div className="space-y-6">
      {innings.map((inn, idx) => {
        const halfText = inn.inning_half === "TOP" ? "上半局" : "下半局";
        return (
          <div key={idx} className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                第 {inn.inning_num} 局{halfText} 戰報
              </h3>
              <div className="text-sm font-mono text-slate-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                比分: 客 {inn.guest_runs} - {inn.home_runs} 主
              </div>
            </div>

            <div className="space-y-2">
              {inn.events.map((ev) => {
                const minutes = Math.floor(ev.timestamp_sec / 60);
                const seconds = Math.floor(ev.timestamp_sec % 60);
                const timeLabel = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectTimestamp(ev.timestamp_sec)}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400 group-hover:text-indigo-400 flex items-center gap-1.5 font-mono text-xs bg-slate-800 group-hover:bg-indigo-900/60 px-2.5 py-1 rounded-md transition-colors">
                        <PlayCircle className="w-3.5 h-3.5" />
                        {timeLabel}
                      </button>
                      <span className="text-slate-200 text-sm font-medium">
                        {ev.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ev.flag === "MANUAL_CHECK" && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                          <ShieldAlert className="w-3 h-3" />
                          待覆核
                        </span>
                      )}
                      {ev.runs_scored > 0 && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                          +{ev.runs_scored} 分
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
