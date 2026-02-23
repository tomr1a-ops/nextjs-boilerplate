"use client";

import { useEffect, useRef, useState } from "react";

type SessionData = {
  state: string;
  playback_id: string | null;
  started_at: string | null;
  paused_at: string | null;
  seek_seconds: number;
  command_id: number;
  command_type: string | null;
  command_value: number | null;
};

type Video = {
  label: string;
  playback_id: string;
};

export default function PlayerClient({ roomId }: { roomId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [err, setErr] = useState("");
  const [lastCommandId, setLastCommandId] = useState(0);

  const code = roomId;
  const codeUpper = code.toUpperCase();

  // Load available videos
  async function loadVideos() {
    try {
      const res = await fetch(`/api/videos?room=${encodeURIComponent(code)}`);
      const json = await res.json();
      
      if (res.ok) {
        setVideos(json.videos || []);
      }
    } catch (e: any) {
      console.error("Failed to load videos:", e);
    }
  }

  // Poll session state
  async function pollSession() {
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(code)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (res.ok) {
        setSession(json);
        setErr("");
      } else {
        setErr(json?.error || "Session error");
      }
    } catch (e: any) {
      console.error("Poll error:", e);
    }
  }

  // Handle session state changes
  useEffect(() => {
    if (!session || !videoRef.current) return;

    const video = videoRef.current;
    const { state, playback_id, command_id, command_type, command_value } = session;

    // Find video info
    const videoInfo = videos.find(v => 
      v.playback_id === playback_id || v.label === playback_id
    );

    // If playback_id looks like a label (short, uppercase), use it directly
    const isLabel = playback_id && playback_id.length < 20 && /^[A-Z0-9]+$/i.test(playback_id);
    const displayLabel = videoInfo?.label || (isLabel ? playback_id : null);

    // Handle state changes
    if (state === "playing" && playback_id) {
      const newPlaybackId = videoInfo?.playback_id || playback_id;
      
      // New video or different video
      if (!currentVideo || currentVideo.playback_id !== newPlaybackId) {
        setCurrentVideo({ 
          label: displayLabel || "Video", 
          playback_id: newPlaybackId 
        });
        video.src = `https://stream.mux.com/${newPlaybackId}.m3u8`;
        video.load();
        video.play().catch(e => console.error("Play error:", e));
      } else {
        // Same video, just resume
        video.play().catch(e => console.error("Play error:", e));
      }
    } else if (state === "paused") {
      video.pause();
    } else if (state === "stopped") {
      video.pause();
      video.currentTime = 0;
      setCurrentVideo(null);
    }

    // Handle seek commands
    if (command_id && command_id !== lastCommandId && command_type === "seek_delta" && command_value) {
      video.currentTime += command_value;
      setLastCommandId(command_id);
    }

  }, [session, videos, currentVideo, lastCommandId]);

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, [code]);

  // Poll session every second
  useEffect(() => {
    pollSession();
    const interval = setInterval(pollSession, 1000);
    return () => clearInterval(interval);
  }, [code]);

  const state = session?.state || "unknown";
  const isPlaying = state === "playing";

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#000", 
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ 
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        padding: "16px 24px",
        background: "rgba(0,0,0,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>IMAOS Player</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
            Code: <span style={{ fontFamily: "monospace", fontWeight: 900 }}>{codeUpper}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            padding: "8px 16px",
            borderRadius: 999,
            background: isPlaying ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${isPlaying ? "#22c55e" : "rgba(255,255,255,0.2)"}`,
            fontSize: 14,
            fontWeight: 900,
            color: isPlaying ? "#22c55e" : "#fff",
          }}>
            {isPlaying ? "▶ PLAYING" : state.toUpperCase()}
          </div>

          {currentVideo && (
            <div style={{
              padding: "8px 16px",
              borderRadius: 12,
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid #22c55e",
              fontSize: 14,
              fontWeight: 900,
              color: "#22c55e",
            }}>
              {currentVideo.label || "Playing"}
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div style={{ 
        width: "100%", 
        maxWidth: 1920,
        aspectRatio: "16/9",
        background: "#000",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: isPlaying ? "0 0 60px rgba(34, 197, 94, 0.3)" : "none",
      }}>
        <video
          ref={videoRef}
          style={{ 
            width: "100%", 
            height: "100%",
            objectFit: "contain",
          }}
          playsInline
          controls
        />
      </div>

      {/* Error Display */}
      {err && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          right: 24,
          padding: 16,
          background: "rgba(220, 38, 38, 0.9)",
          border: "1px solid #ef4444",
          borderRadius: 12,
          fontWeight: 700,
          maxWidth: 600,
          margin: "0 auto",
        }}>
          {err}
        </div>
      )}

      {/* Waiting State */}
      {!isPlaying && !err && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          opacity: 0.5,
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏸</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            Waiting for playback...
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Use the control page to start playing
          </div>
        </div>
      )}
    </div>
  );
}
