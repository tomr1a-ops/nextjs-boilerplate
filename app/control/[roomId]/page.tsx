'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ControlPage() {
  const pathname = usePathname()
  const room = pathname?.split('/').pop() || ''

  const [session, setSession] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [licenseeName, setLicenseeName] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!room) return
    fetchSession()
    fetchLicenseeName()
    fetchVideos()
    const interval = setInterval(fetchSession, 1000)
    return () => clearInterval(interval)
  }, [room])

  async function fetchSession() {
    try {
      const res = await fetch(`/api/session?room=${room}&t=${Date.now()}`)
      const data = await res.json()
      setSession(data)
    } catch (err) {
      console.error('Session fetch error:', err)
    }
  }

  async function fetchLicenseeName() {
    try {
      const res = await fetch(`/api/licensee-name?code=${room}`)
      const data = await res.json()
      if (data.name) setLicenseeName(data.name)
    } catch (err) {
      console.error('Licensee fetch error:', err)
    }
  }

  async function fetchVideos() {
    try {
      const res = await fetch(`/api/videos?room=${room}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (err) {
      console.error('Videos fetch error:', err)
    }
  }

  async function playVideo(playbackId: string) {
    await fetch(`/api/session?room=${room}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'playing', playback_id: playbackId })
    })
  }

  async function togglePlayPause() {
    const newState = session?.state === 'playing' ? 'paused' : 'playing'
    await fetch(`/api/session?room=${room}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState, playback_id: session?.playback_id })
    })
  }

  async function stopVideo() {
    await fetch(`/api/session?room=${room}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'stopped' })
    })
  }

  async function seek(seconds: number) {
    await fetch(`/api/session?room=${room}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'seek_delta', value: seconds })
    })
  }

  const isPlaying = session?.state === 'playing'
  const currentVideo = videos.find(v => v.playback_id === session?.playback_id)

  const levels: Record<number, any[]> = { 1: [], 2: [], 3: [] }
  for (const video of videos) {
    const label = video.label || ''
    if (label.startsWith('AL1')) levels[1].push(video)
    else if (label.startsWith('AL2')) levels[2].push(video)
    else if (label.startsWith('AL3')) levels[3].push(video)
  }

  const btnBase: React.CSSProperties = {
    width: '100%',
    padding: '22px 16px',
    borderRadius: 16,
    border: 'none',
    fontSize: 20,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  }

  // LEVEL SCREEN
  if (selectedLevel !== null) {
    const levelVideos = levels[selectedLevel] || []
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 20, paddingBottom: 160 }}>
        <button
          onClick={() => setSelectedLevel(null)}
          style={{ ...btnBase, background: '#222', color: '#fff', marginBottom: 16, width: 'auto', paddingLeft: 24, paddingRight: 24 }}
        >
          ← Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Level {selectedLevel}</div>
          {currentVideo ? (
            <div style={{ marginTop: 6, fontSize: 16, color: '#34d399', fontWeight: 700 }}>
              ▶ Playing: {currentVideo.label}
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 14, color: '#666' }}>No video selected</div>
          )}
        </div>

        {/* Video buttons */}
        <div style={{ display: 'grid', gap: 12 }}>
          {levelVideos.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>No videos in this level</div>
          ) : (
            levelVideos.map((video) => (
              <button
                key={video.playback_id}
                onClick={() => playVideo(video.playback_id)}
                style={{
                  ...btnBase,
                  background: session?.playback_id === video.playback_id ? '#059669' : '#1a3a2a',
                  color: '#fff',
                  border: session?.playback_id === video.playback_id ? '2px solid #34d399' : '2px solid transparent',
                }}
              >
                {video.label || 'Video'}
              </button>
            ))
          )}
        </div>

        {/* Fixed transport controls at bottom */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#111', borderTop: '1px solid #333', padding: 16
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, maxWidth: 600, margin: '0 auto' }}>
            <button onClick={() => seek(-20)} style={{ ...btnBase, background: '#f59e0b', color: '#000', padding: '14px 8px', fontSize: 15 }}>⏪ 20s</button>
            <button onClick={togglePlayPause} style={{ ...btnBase, background: isPlaying ? '#555' : '#22c55e', color: '#fff', padding: '14px 8px', fontSize: 15 }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={stopVideo} style={{ ...btnBase, background: '#dc2626', color: '#fff', padding: '14px 8px', fontSize: 15 }}>⏹</button>
            <button onClick={() => seek(20)} style={{ ...btnBase, background: '#f59e0b', color: '#000', padding: '14px 8px', fontSize: 15 }}>20s ⏩</button>
          </div>
        </div>
      </div>
    )
  }

  // MAIN SCREEN
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 20 }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <img
          src="/IMA_logo_final3.png"
          alt="IMA Logo"
          style={{ width: 120, height: 120, objectFit: 'contain' }}
        />
      </div>

      {/* Location + status */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{licenseeName || room}</div>
        {currentVideo ? (
          <div style={{ marginTop: 6, fontSize: 14, color: '#34d399', fontWeight: 700 }}>
            ▶ Playing: {currentVideo.label}
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 14, color: '#555' }}>No video playing</div>
        )}
      </div>

      {/* Level buttons */}
      <div style={{ display: 'grid', gap: 16 }}>
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            style={{ ...btnBase, background: '#00c48c', color: '#000', padding: '28px 16px', fontSize: 24 }}
          >
            Level {level}
          </button>
        ))}
      </div>
    </div>
  )
}
