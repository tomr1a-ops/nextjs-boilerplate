"use client";

import React, { useEffect, useMemo, useState } from "react";

type Licensee = {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at?: string;
  rooms?: string[];
  allowed_videos?: string[]; // labels (e.g., "AL1V1")
};

type VideoRow = {
  id: string;
  label: string;     // "AL1V1"
  title?: string;    // optional display name
  sort_order?: number | null;
  created_at?: string;
};

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export default function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  const selected = useMemo(
    () => licensees.find((l) => l.id === selectedId) || null,
    [licensees, selectedId]
  );

  const [roomInput, setRoomInput] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [savingVideos, setSavingVideos] = useState(false);

  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiJson<{ licensees: Licensee[] }>("/api/admin/licensees", { method: "GET" });
      setLicensees(data.licensees || []);

      const stillExists =
        selectedId && (data.licensees || []).some((l) => l.id === selectedId);
      if (!stillExists) setSelectedId(data.licensees?.[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load licensees");
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    setVideosLoading(true);
    try {
      const data = await apiJson<{ videos: VideoRow[] }>("/api/admin/videos", { method: "GET" });
      const rows = (data.videos || []).filter(v => v?.label);
      setVideos(rows);
    } catch (e: any) {
      // If this fails, admin can still load licensees, but video list will be empty
      setError((prev) => prev || (e?.message || "Failed to load videos list"));
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([refresh(), loadVideos()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setRooms([]);
      setAllowed(new Set());
      return;
    }
    setRooms(Array.isArray(selected.rooms) ? selected.rooms : []);
    setAllowed(new Set(Array.isArray(selected.allowed_videos) ? selected.allowed_videos : []));
  }, [selected]);

  const addLicensee = async () => {
    try {
      const name = window.prompt("Licensee name (e.g., Atlanta 1):");
      if (!name) return;
      const code = window.prompt("Licensee code (e.g., AT100):");
      if (!code) return;

      await apiJson<{ licensee: Licensee }>("/api/admin/licensees", {
        method: "POST",
        body: JSON.stringify({ name, code, status: "active" }),
      });

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to add licensee");
    }
  };

  const addRoom = () => {
    const v = roomInput.trim();
    if (!v) return;
    if (rooms.includes(v)) return;
    setRooms((prev) => [...prev, v]);
    setRoomInput("");
  };

  const removeRoom = (room: string) => {
    setRooms((prev) => prev.filter((r) => r !== room));
  };

  const toggleAllowed = (label: string) => {
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const saveRooms = async () => {
    if (!selected) return;
    setError("");
    try {
      await apiJson(`/api/admin/licensees/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ rooms }),
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save rooms");
    }
  };

  const saveAllowedVideos = async () => {
    if (!selected) return;
    setSavingVideos(true);
    setError("");
    try {
      const allowed_videos = Array.from(allowed);

      await apiJson(`/api/admin/licensees/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ allowed_videos }),
      });

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save allowed videos");
    } finally {
      setSavingVideos(false);
    }
  };

  const statusBadge = (s: string) => {
    const cls =
      s === "active"
        ? "bg-green-700/40 border-green-600 text-green-100"
        : "bg-gray-700/40 border-gray-600 text-gray-100";
    return (
      <span className={`ml-auto text-xs px-2 py-1 rounded-full border ${cls}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-[70vh] text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold">IMAOS Command Center</div>
        <div className="text-sm opacity-80">Ready</div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/40 px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Licensees</div>
            <button
              onClick={addLicensee}
              className="rounded-xl bg-green-600 hover:bg-green-500 text-black font-semibold px-4 py-2"
            >
              + Add New
            </button>
          </div>

          {loading ? (
            <div className="opacity-70">Loading…</div>
          ) : licensees.length === 0 ? (
            <div className="opacity-70">No licensees found.</div>
          ) : (
            <div className="space-y-3">
              {licensees.map((l) => {
                const isSel = l.id === selectedId;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                      isSel
                        ? "bg-green-700/25 border-green-500"
                        : "bg-black/20 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{l.name}</div>
                      {statusBadge(l.status)}
                    </div>
                    <div className="text-sm opacity-75 mt-1">Code: {l.code}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xl font-bold">
                {selected ? selected.name : "Select a licensee"}
              </div>
              {selected ? (
                <div className="text-sm opacity-75">
                  Code: {selected.code} • Status:{" "}
                  <span className="font-semibold">{selected.status}</span>
                </div>
              ) : (
                <div className="text-sm opacity-75">
                  Click a licensee on the left to manage rooms + allowed videos.
                </div>
              )}
            </div>

            <button
              onClick={refresh}
              className="rounded-xl bg-gray-700 hover:bg-gray-600 px-4 py-2 font-semibold"
            >
              Refresh
            </button>
          </div>

          {!selected ? null : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold mb-2">Rooms</div>
                <div className="flex gap-2">
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    placeholder="ex: atlanta1"
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                  />
                  <button
                    onClick={addRoom}
                    className="rounded-xl bg-green-600 hover:bg-green-500 text-black font-semibold px-4 py-2"
                  >
                    + Add Room
                  </button>
                  <button
                    onClick={saveRooms}
                    className="rounded-xl bg-gray-700 hover:bg-gray-600 px-4 py-2 font-semibold"
                  >
                    Save Rooms
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {rooms.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1"
                    >
                      <span className="font-semibold">{r}</span>
                      <button
                        onClick={() => removeRoom(r)}
                        className="h-5 w-5 rounded-full bg-red-700/60 hover:bg-red-700 text-white text-xs leading-5"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Allowed Videos</div>
                    <div className="text-xs opacity-70 mt-1">
                      Loaded from your videos table (via /api/admin/videos)
                    </div>
                  </div>
                  <button
                    onClick={saveAllowedVideos}
                    disabled={savingVideos}
                    className={`rounded-xl px-4 py-2 font-semibold ${
                      savingVideos
                        ? "bg-green-900 text-green-200 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-500 text-black"
                    }`}
                  >
                    {savingVideos ? "Saving…" : "Save Allowed Videos"}
                  </button>
                </div>

                {videosLoading ? (
                  <div className="opacity-70 mt-3">Loading videos…</div>
                ) : videos.length === 0 ? (
                  <div className="opacity-70 mt-3">
                    No videos found. (Check your Supabase table name/columns.)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {videos.map((v, idx) => {
                      const label = v.label;
                      const checked = allowed.has(label);
                      return (
                        <button
                          key={v.id || label}
                          onClick={() => toggleAllowed(label)}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            checked
                              ? "border-green-500 bg-green-700/25"
                              : "border-white/10 bg-black/25 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="h-4 w-4"
                              />
                              <span className="font-semibold">{label}</span>
                            </div>
                            <span className="text-xs opacity-60">
                              {v.sort_order ?? idx + 1}
                            </span>
                          </div>
                          {v.title ? (
                            <div className="text-xs opacity-70 mt-1">{v.title}</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
