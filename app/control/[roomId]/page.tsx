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
    return (
  <div className="bg-black text-white min-h-screen">
    <div className="max-w-2xl mx-auto p-6 pb-52">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">IMAOS Control</h1>
        <p className="text-xl text-gray-400">{licenseeName || room}</p>
      </div>

      <h2 className="text-xl font-bold mb-3">Available Videos</h2>
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
  
  // Find current playing video
  const currentVideo = videos.find(v => v.playback_id === session?.playback_id)

  return (
<div className="bg-black text-white p-6 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">IMAOS Control</h1>
          <p className="text-2xl text-gray-400">{licenseeName || room}</p>
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
              <div className="text-4xl">▶</div>
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Now Playing</div>
                <div className="text-3xl font-bold text-green-400">
                  {currentVideo?.label || currentVideo?.title || 'Video'}
                </div>
                {currentVideo?.title && (
                  <div className="text-lg text-gray-400 mt-1">{currentVideo.title}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={togglePlayPause} className={`p-6 rounded-2xl text-xl font-bold transition-all ${
            isPlaying ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
          }`}>
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          
          <button onClick={stopVideo} className="p-6 bg-red-600 hover:bg-red-700 rounded-2xl text-xl font-bold transition-all">
            ⏹ STOP
          </button>

          <button onClick={() => seek(-10)} className="p-6 bg-gray-700 hover:bg-gray-600 rounded-2xl text-xl font-bold transition-all">
            ⏪ -10s
          </button>

          <button onClick={() => seek(10)} className="p-6 bg-gray-700 hover:bg-gray-600 rounded-2xl text-xl font-bold transition-all">
            +10s ⏩
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-4">Available Videos</h2>
        {videos.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Loading videos...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {videos.map((video) => (
              <button
                key={video.playback_id}
                onClick={() => playVideo(video.playback_id)}
                className={`p-6 rounded-2xl transition-all text-left ${
                  session?.playback_id === video.playback_id
                    ? 'bg-green-600 border-2 border-green-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="text-2xl font-bold mb-1">
                  {video.label || 'No Label'}
                </div>
                {video.title && (
                  <div className="text-sm text-gray-400">
                    {video.title}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
