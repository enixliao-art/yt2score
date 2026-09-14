"use client";

import React, { useEffect, useRef } from "react";

interface VideoSyncPlayerProps {
  youtubeUrl: string;
  seekTimestamp: number | null; // 當使用者在記錄表點擊時間戳時傳入
}

export const VideoSyncPlayer: React.FC<VideoSyncPlayerProps> = ({ youtubeUrl, seekTimestamp }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 解析 YouTube Video ID
  const getVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getVideoId(youtubeUrl) || "dQw4w9WgXcQ";

  useEffect(() => {
    if (seekTimestamp !== null && iframeRef.current) {
      // 透過 postMessage 通知 YouTube IFrame API 跳轉秒數並 Play
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seekTimestamp, true],
        }),
        "*"
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: [],
        }),
        "*"
      );
    }
  }, [seekTimestamp]);

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
      <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center text-sm font-medium text-slate-200">
        <span>實況影像對照核對</span>
        {seekTimestamp !== null && (
          <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800 text-xs">
            已同步至 {Math.floor(seekTimestamp / 60)} 分 {Math.floor(seekTimestamp % 60)} 秒
          </span>
        )}
      </div>
      <div className="relative pt-[56.25%]">
        <iframe
          ref={iframeRef}
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
          title="YouTube Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};
