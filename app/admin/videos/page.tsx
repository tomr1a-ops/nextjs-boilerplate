'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''

export default function VideosPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editVideo, setEditVideo] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newPlaybackId, setNewPlaybackId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  async function fetchVideos() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/videos', {
        headers: { 'x-admin-key': ADMIN_KEY }
      })
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function handleUpload() {
    if (!newLabel.trim()) return alert('Label is required')
    if (!newPlaybackId.trim()) return alert('Mux Playback ID is required')
    setUploading(true)
    setUploadProgress('Saving...')
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ label: newLabel.trim(), playback_id: newPlaybackId.trim() })
      })
      if (!res.ok) throw new Error('Failed to save')
      setUploadProgress('Saved!')
      setNewLabel('')
      setNewPlaybackId('')
      setShowUpload(false)
      fetchVideos()
    } catch (err) {
      alert('Error saving video')
    }
    setUploading(false)
    setUploadProgress('')
  }

  async function handleEdit() {
    if (!editVideo?.label?.trim()) return alert('Label is required')
    try {
      const res = await fetch(`/api/admin/videos?id=${editVideo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ label: editVideo.label, active: editVideo.active })
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditVideo(null)
      fetchVideos()
    } catch (err) {
      alert('Error updating video')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this video?')) return
    await fetch(`/api/admin/videos?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': ADMIN_KEY }
    })
    fetchVideos()
  }

  async function toggleActive(video: any) {
    await fetch(`/api/admin/videos?id=${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ active: !video.active })
    })
    fetchVideos()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="bg-black border-b border-gray-800 px-6 py-4 flex items-center gap-6">
        <span className="font-bold text-lg">IMAOS Admin</span>
        <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-white">Dashboard</button>
        <button onClick={() => router.push('/admin/licensees')} className="text-blue-400 hover:text-white">Licensees</button>
        <button onClick={() => router.push('/admin/users')} className="text-purple-400 hover:text-white">Users</button>
        <span className="text-green-400 font-semibold">Videos</span>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-gray-400 mt-1">{videos.length} videos</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold text-lg transition-all"
          >
            + Add Video
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : videos.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl">No videos yet. Add your first video.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {videos.map((video) => (
              <div key={video.id} className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl">🎬</div>
                  <div>
                    <div className="text-xl font-bold">{video.label}</div>
                    <div className="text-sm text-gray-500 font-mono">{video.playback_id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(video)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      video.active ? 'bg-green-700 hover:bg-green-800' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {video.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => setEditVideo({ ...video })}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg font-semibold text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg font-semibold text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Video Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Add Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Label <span className="text-red-400">*</span></label>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. AL1V1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mux Playback ID <span className="text-red-400">*</span></label>
                <input
                  value={newPlaybackId}
                  onChange={e => setNewPlaybackId(e.target.value)}
                  placeholder="e.g. abc123xyz..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Find this in your Mux dashboard under Assets</p>
              </div>
            </div>
            {uploadProgress && <p className="text-green-400 mt-4">{uploadProgress}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUpload(false)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold">Cancel</button>
              <button onClick={handleUpload} disabled={uploading} className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold disabled:opacity-50">
                {uploading ? 'Saving...' : 'Save Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Edit Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Label</label>
                <input
                  value={editVideo.label}
                  onChange={e => setEditVideo({ ...editVideo, label: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Playback ID (read only)</label>
                <input
                  value={editVideo.playback_id}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-500 font-mono"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Active</label>
                <button
                  onClick={() => setEditVideo({ ...editVideo, active: !editVideo.active })}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${editVideo.active ? 'bg-green-700' : 'bg-gray-700'}`}
                >
                  {editVideo.active ? 'Yes' : 'No'}
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditVideo(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold">Cancel</button>
              <button onClick={handleEdit} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
