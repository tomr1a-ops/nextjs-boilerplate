"use client";

import { useEffect, useMemo, useState } from "react";

type Licensee = {
  id: string;
  name: string;
  code: string;
  status: "active" | "disabled" | string;
  created_at?: string;
};

type Video = {
  id?: string;
  label: string;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  created_at?: string;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function upper(v: any) {
  return clean(v).toUpperCase();
}

async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.error) ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export default function AdminClient() {
  const [adminKey, setAdminKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState("");

  const [catalog, setCatalog] = useState<Video[]>([]);
  const [allowedLabels, setAllowedLabels] = useState<Set<string>>(new Set());
  const [savingAllowed, setSavingAllowed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Add licensee form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addStatus, setAddStatus] = useState<"active" | "disabled">("active");

  const selected = useMemo(
    () => licensees.find((l) => l.id === selectedId) || null,
    [licensees, selectedId]
  );

  function headersWithKey(extra?: Record<string, string>) {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extra || {}),
    };
    if (adminKey) h["x-admin-key"] = adminKey;
    return h;
  }

  async function loadLicensees() {
    setErr("");
    const data = await fetchJson("/api/admin/licensees", {
      headers: headersWithKey(),
    });
    const list = (data?.licensees ?? []) as Licensee[];
    setLicensees(list);

    // Auto-select first if none selected
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    // If selected was deleted, fallback
    if (selectedId && !list.find((x) => x.id === selectedId)) {
      setSelectedId(list[0]?.id || "");
    }
  }

  async function loadCatalog() {
    setErr("");
    const data = await fetchJson("/api/admin/videos", {
      headers: headersWithKey(),
    });
    setCatalog((data?.videos ?? []) as Video[]);
  }

  async function loadRooms(licenseeId: string) {
    setErr("");
    const data = await fetchJson(`/api/admin/licensees/${licenseeId}/rooms`, {
      headers: headersWithKey(),
    });
    setRooms(((data?.rooms ?? []) as string[]).map((r) => clean(r)).filter(Boolean));
  }

  async function loadAllowedVideos(licenseeId: string) {
    setErr("");
    const data = await fetchJson(`/api/admin/licensees/${licenseeId}/videos`, {
      headers: headersWithKey(),
    });

    const labels = (data?.video_labels ?? []) as string[];
    const set = new Set(labels.map((x) => upper(x)).filter(Boolean));
    setAllowedLabels(set);
  }

  // Load admin key from localStorage
  useEffect(() => {
    try {
      const k = localStorage.getItem("imaos_admin_key") || "";
      if (k) {
        setAdminKey(k);
        setKeySaved(true);
      }
    } catch {}
  }, []);

  // After key is available: load licensees + catalog
  useEffect(() => {
    if (!adminKey) return;
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        await Promise.all([loadLicensees(), loadCatalog()]);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load admin data");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  // When selected licensee changes: load rooms + allowed
  useEffect(() => {
    if (!adminKey) return;
    if (!selectedId) return;
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        await Promise.all([loadRooms(selectedId), loadAllowedVideos(selectedId)]);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load licensee details");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, adminKey]);

  function saveKey() {
    setErr("");
    const k = clean(adminKey);
    if (!k) {
      setErr("Enter your ADMIN key first.");
      return;
    }
    try {
      localStorage.setItem("imaos_admin_key", k);
      setKeySaved(true);
    } catch {}
  }

  function forgetKey() {
    try {
      localStorage.removeItem("imaos_admin_key");
    } catch {}
    setAdminKey("");
    setKeySaved(false);
    setLicensees([]);
    setSelectedId("");
    setRooms([]);
    setCatalog([]);
    setAllowedLabels(new Set());
  }

  async function addLicensee() {
    setErr("");
    const name = clean(addName);
    const code = upper(addCode);
    if (!name) return setErr("Licensee name is required.");
    if (!code) return setErr("Licensee code is required (ex: ATLANTA).");

    try {
      setBusy(true);
      const data = await fetchJson("/api/admin/licensees", {
        method: "POST",
        headers: headersWithKey(),
        body: JSON.stringify({ name, code, status: addStatus }),
      });

      const created: Licensee | undefined = data?.licensee;
      setShowAdd(false);
      setAddName("");
      setAddCode("");
      setAddStatus("active");

      await loadLicensees();
      if (created?.id) setSelectedId(created.id);
    } catch (e: any) {
      setErr(e?.message || "Failed to create licensee");
    } finally {
      setBusy(false);
    }
  }

  async function addRoomToLicensee() {
    if (!selectedId) return;
    setErr("");
    const room_id = clean(newRoom);
    if (!room_id) return setErr("Room ID is required (ex: atlanta1).");

    try {
      setBusy(true);
      await fetchJson(`/api/admin/licensees/${selectedId}/rooms`, {
        method: "POST",
        headers: headersWithKey(),
        body: JSON.stringify({ room_id }),
      });
      setNewRoom("");
      await loadRooms(selectedId);
    } catch (e: any) {
      setErr(e?.message || "Failed to add room");
    } finally {
      setBusy(false);
    }
  }

  async function removeRoom(room_id: string) {
    if (!selectedId) return;
    setErr("");
    try {
      setBusy(true);
      // This route supports DELETE ?room_id=...
      await fetchJson(
        `/api/admin/licensees/${selectedId}/rooms?room_id=${encodeURIComponent(room_id)}`,
        {
          method: "DELETE",
          headers: headersWithKey(),
        }
      );
      await loadRooms(selectedId);
    } catch (e: any) {
      setErr(e?.message || "Failed to remove room");
    } finally {
      setBusy(false);
    }
  }

  function toggleAllowed(label: string) {
    const L = upper(label);
    setAllowedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(L)) next.delete(L);
      else next.add(L);
      return next;
    });
  }

  async function saveAllowed() {
    if (!selectedId) return;
    setErr("");
    setSavingAllowed(true);
    try {
      const video_labels = Array.from(allowedLabels.values()).sort();
      await fetchJson(`/api/admin/licensees/${selectedId}/videos`, {
        method: "PUT",
        headers: headersWithKey(),
        body: JSON.stringify({ video_labels }),
      });
      // Reload to confirm
      await loadAllowedVideos(selectedId);
    } catch (e: any) {
      setErr(e?.message || "Failed to save allowed videos");
    } finally {
      setSavingAllowed(false);
    }
  }

  const activeCount = useMemo(() => licensees.filter((l) => l.status === "active").length, [licensees]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: 0.2 }}>IMAOS Command Center</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Licensees: <b>{licensees.length}</b> (active: <b>{activeCount}</b>)
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {busy ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Ready</div>
            )}
          </div>
        </div>

        {/* Admin key bar */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 900 }}>Admin Key</div>
          <input
            value={adminKey}
            onChange={(e) => {
              setAdminKey(e.target.value);
              setKeySaved(false);
            }}
            placeholder="paste ADMIN key…"
            style={{
              flex: "1 1 360px",
              minWidth: 260,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              outline: "none",
              fontSize: 14,
            }}
          />
          <button
            onClick={saveKey}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "#16a34a",
              color: "#000",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Save Key
          </button>
          <button
            onClick={forgetKey}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "#374151",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Forget
          </button>

          {keySaved ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              ✅ saved in this browser (localStorage)
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              (not saved yet)
            </div>
          )}
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.20)",
              color: "rgba(255,220,220,0.95)",
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        {/* Main grid */}
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* LEFT: Licensee list */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontWeight: 950 }}>Licensees</div>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#16a34a",
                  color: "#000",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                + Add New
              </button>
            </div>

            <div style={{ maxHeight: "70vh", overflow: "auto" }}>
              {licensees.length === 0 ? (
                <div style={{ padding: 12, opacity: 0.8 }}>
                  {adminKey ? "No licensees found." : "Enter Admin Key to load licensees."}
                </div>
              ) : (
                licensees.map((l) => {
                  const active = l.id === selectedId;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: active ? "rgba(0,255,140,0.10)" : "transparent",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 950, fontSize: 15 }}>{l.name}</div>
                        <div
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: l.status === "active" ? "rgba(22,163,74,0.75)" : "rgba(239,68,68,0.75)",
                            color: "#000",
                            fontWeight: 950,
                            height: 20,
                          }}
                        >
                          {l.status}
                        </div>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                        Code: <b>{l.code}</b>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Details */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {selected ? selected.name : "Select a licensee"}
                </div>
                {selected ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Code: <b>{selected.code}</b> • Status: <b>{selected.status}</b>
                  </div>
                ) : null}
              </div>

              <button
                onClick={async () => {
                  if (!adminKey) return setErr("Enter Admin Key first.");
                  try {
                    setBusy(true);
                    await Promise.all([loadLicensees(), selectedId ? loadRooms(selectedId) : Promise.resolve(), selectedId ? loadAllowedVideos(selectedId) : Promise.resolve(), loadCatalog()]);
                  } catch (e: any) {
                    setErr(e?.message || "Refresh failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#374151",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            {!selected ? (
              <div style={{ padding: 12, opacity: 0.8 }}>
                Click a licensee on the left to manage rooms + allowed videos.
              </div>
            ) : (
              <div style={{ padding: 12, display: "grid", gap: 14 }}>
                {/* Rooms */}
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.25)",
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>Rooms</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input
                      value={newRoom}
                      onChange={(e) => setNewRoom(e.target.value)}
                      placeholder='ex: atlanta1'
                      style={{
                        flex: "1 1 220px",
                        minWidth: 200,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={addRoomToLicensee}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "#16a34a",
                        color: "#000",
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      + Add Room
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {rooms.length === 0 ? (
                      <div style={{ opacity: 0.75, fontSize: 13 }}>No rooms assigned yet.</div>
                    ) : (
                      rooms.map((r) => (
                        <div
                          key={r}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)",
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {r}
                          <button
                            onClick={() => removeRoom(r)}
                            title="Remove room"
                            style={{
                              border: "none",
                              background: "rgba(255,0,0,0.25)",
                              color: "#fff",
                              fontWeight: 950,
                              cursor: "pointer",
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Allowed videos */}
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.25)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>Allowed Videos</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Check labels this licensee can play (enforced by <code>/api/session</code> + <code>/api/videos</code>)
                      </div>
                    </div>

                    <button
                      onClick={saveAllowed}
                      disabled={savingAllowed}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: savingAllowed ? "rgba(22,163,74,0.5)" : "#16a34a",
                        color: "#000",
                        fontWeight: 950,
                        cursor: savingAllowed ? "wait" : "pointer",
                        opacity: savingAllowed ? 0.85 : 1,
                      }}
                    >
                      {savingAllowed ? "Saving…" : "Save Allowed Videos"}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {catalog.length === 0 ? (
                      <div style={{ opacity: 0.75, fontSize: 13 }}>
                        No catalog loaded yet (or none in DB).
                      </div>
                    ) : (
                      catalog.map((v) => {
                        const L = upper(v.label);
                        const checked = allowedLabels.has(L);
                        return (
                          <label
                            key={v.id || v.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 10px",
                              borderRadius: 14,
                              border: checked
                                ? "2px solid rgba(0,255,140,0.55)"
                                : "1px solid rgba(255,255,255,0.10)",
                              background: checked
                                ? "rgba(0,255,140,0.10)"
                                : "rgba(255,255,255,0.04)",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAllowed(L)}
                              style={{ transform: "scale(1.2)" }}
                            />
                            <div style={{ fontWeight: 950 }}>{L}</div>
                            <div style={{ marginLeft: "auto", fontSize: 11, opacity: 0.65 }}>
                              {v.sort_order ?? ""}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
                  Tip: Bookmark this page on your laptop.
                  <br />
                  Admin URL: <span style={{ fontFamily: "monospace" }}>/admin</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Licensee Modal (simple inline) */}
        {showAdd ? (
          <div
            onClick={() => setShowAdd(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(560px, 96vw)",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0b0b0b",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 18 }}>Add New Licensee</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Example: Atlanta Franchise / ATLANTA / active
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name (ex: Atlanta Franchise)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                />

                <input
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  placeholder="Code (ex: ATLANTA)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>Status:</div>
                  <button
                    onClick={() => setAddStatus("active")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: addStatus === "active" ? "#16a34a" : "#374151",
                      color: addStatus === "active" ? "#000" : "#fff",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setAddStatus("disabled")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: addStatus === "disabled" ? "rgba(239,68,68,0.9)" : "#374151",
                      color: addStatus === "disabled" ? "#000" : "#fff",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Disabled
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setShowAdd(false)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "#374151",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addLicensee}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "#16a34a",
                      color: "#000",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Create Licensee
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
