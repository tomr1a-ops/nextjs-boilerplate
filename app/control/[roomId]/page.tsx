'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ControlPage() {
  const pathname = usePathname()
  const room = pathname?.split('/').pop() || ''
  
  const [session, setSession] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [licenseeName, setLicenseeName] = useState<string>('')

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

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-2xl mx-auto p-6 pb-52">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">IMAOS Control</h1>
          <p className="text-xl text-gray-400">{licenseeName || room}</p>
        </div>

        <h2 className="text-xl font-bold mb-3">Available Videos</h2>
        {videos.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Loading videos...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map((video) => (
              <button
                key={video.playback_id}
                onClick={() => playVideo(video.playback_id)}
                className={`p-5 rounded-2xl transition-all text-left ${
                  session?.playback_id === video.playback_id
                    ? 'bg-green-600 border-2 border-green-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="text-xl font-bold">{video.label || 'No Label'}</div>
                {video.title && <div className="text-sm text-gray-400">{video.title}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fixed controls at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 p-4">
        <div className="max-w-2xl mx-auto">
          {session?.playback_id && (
            <div className="text-center mb-2 text-green-400 font-bold text-sm">
              ▶ {currentVideo?.label || 'Playing'}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => seek(-10)} className="p-3 bg-gray-700 rounded-xl font-bold text-sm">⏪ -10s</button>
            <button onClick={togglePlayPause} className={`p-3 rounded-xl font-bold text-sm ${isPlaying ? 'bg-yellow-600' : 'bg-green-600'}`}>
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button onClick={stopVideo} className="p-3 bg-red-600 rounded-xl font-bold text-sm">⏹ STOP</button>
            <button onClick={() => seek(10)} className="p-3 bg-gray-700 rounded-xl font-bold text-sm">+10s ⏩</button>
          </div>
        </div>
      </div>
    </div>
  )
}
