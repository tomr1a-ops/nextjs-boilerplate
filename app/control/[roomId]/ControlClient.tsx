'use client'

import { useEffect, useState } from 'react'

export default function ControlClient({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [licenseeName, setLicenseeName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSession()
    fetchVideos()
    fetchLicenseeName()
    const interval = setInterval(fetchSession, 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchSession() {
    try {
      const res = await fetch(`/api/session?room=${roomId}&t=${Date.now()}`)
      const data = await res.json()
      setSession(data)
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  }

  async function fetchVideos() {
    try {
      const res = await fetch(`/api/licensees/${roomId}/videos`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLicenseeName() {
    try {
      const res = await fetch(`/api/licensees?code=${roomId}`)
      const data = await res.json()
      if (data.licensees && data.licensees.length > 0) {
        setLicenseeName(data.licensees[0].name)
      }
    } catch (err) {
      console.error('Failed to fetch licensee name:', err)
    }
  }

  async function playVideo(playbackId: string) {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        state: 'playing',
        playback_id: playbackId
      })
    })
  }

  async function togglePlayPause() {
    const newState = session?.state === 'playing' ? 'paused' : 'playing'
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        state: newState,
        playback_id: session?.playback_id
      })
    })
  }

  async function stopVideo() {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        state: 'stopped'
      })
    })
  }

  async function seek(seconds: number) {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        state: session?.state || 'playing',
        playback_id: session?.playback_id,
        command_type: 'seek_delta',
        command_value: seconds
      })
    })
  }

  const isPlaying = session?.state === 'playing'

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">IMAOS Control</h1>
          <p className="text-2xl text-gray-400">{licenseeName || roomId}</p>
        </div>

        <div className="mb-6">
          <div className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
            isPlaying ? 'bg-green-600' : 'bg-gray-700'
          }`}>
            {isPlaying ? '▶ Playing' : '⏸ Paused'}
          </div>
        </div>

        {session?.playback_id && (
          <div className="mb-8 p-6 bg-gray-900 rounded-2xl border-2 border-green-500">
            <div className="flex items-center gap-4">
              <div className="text-5xl">▶</div>
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Now Playing</div>
                <div className="text-3xl font-bold text-green-400">{session.playback_id}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={togglePlayPause}
            className={`p-6 rounded-2xl text-xl font-bold transition-all ${
              isPlaying 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          
          <button
            onClick={stopVideo}
            className="p-6 bg-red-600 hover:bg-red-700 rounded-2xl text-xl font-bold transition-all"
          >
            ⏹ STOP
          </button>

          <button
            onClick={() => seek(-10)}
            className="p-6 bg-gray-700 hover:bg-gray-600 rounded-2xl text-xl font-bold transition-all"
          >
            ⏪ -10s
          </button>

          <button
            onClick={() => seek(10)}
            className="p-6 bg-gray-700 hover:bg-gray-600 rounded-2xl text-xl font-bold transition-all"
          >
            +10s ⏩
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Available Videos</h2>
          
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No videos assigned</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {videos.map((video) => (
                <button
                  key={video.playback_id}
                  onClick={() => playVideo(video.playback_id)}
                  className={`p-6 rounded-2xl text-xl font-bold transition-all ${
                    session?.playback_id === video.playback_id
                      ? 'bg-green-600 border-2 border-green-400'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="text-sm text-gray-400 mb-1">
                    {video.playback_id}
                  </div>
                  <div className="text-lg">{video.title || 'Untitled'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
