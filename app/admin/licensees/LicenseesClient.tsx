"use client";

import React, { useEffect, useState } from "react";

type Licensee = {
  id: string;
  code?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  billing_address?: string | null;
  contract_details?: string | null;
  notes?: string | null;
  pin?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type Video = {
  id: string;
  label?: string | null;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  created_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null, text };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

function normLabel(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

export default function LicenseesClient({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    licensee_name: "",
    name: "",
    company_name: "",
    email: "",
    phone: "",
    code: "",
    pin: "",
    billing_address: "",
    contract_details: "",
    notes: "",
  });
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [editingLicensee, setEditingLicensee] = useState<Licensee | null>(null);
  const [showVideosFor, setShowVideosFor] = useState<Licensee | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [savingVideos, setSavingVideos] = useState(false);
  const [videosErr, setVideosErr] = useState("");

  const adminHeaders = { "x-admin-key": adminKey };

  function generateNextCode(): string {
    if (items.length === 0) return "LIC001";
    const existingCodes = items
      .map((item) => item.code || "")
      .filter((c) => c.match(/^LIC\d{3}$/i))
      .map((c) => parseInt(c.replace(/lic/i, ""), 10))
      .filter((n) => !isNaN(n));
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `lic${String(maxNum + 1).padStart(3, "0")}`;
  }

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licensees", { cache: "no-store", headers: adminHeaders });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || out.text || `Request failed (${out.status})`); setItems([]); return; }
      const list = out.json?.licensees || out.json?.data || out.json?.items || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load licensees");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openOnboardingModal() {
    setOnboardingForm({ licensee_name: "", name: "", company_name: "", email: "", phone: "", code: autoGenerateCode ? generateNextCode() : "", pin: "", billing_address: "", contract_details: "", notes: "" });
    setAutoGenerateCode(true);
    setShowOnboardingModal(true);
  }

  function openEditModal(licensee: Licensee) {
    setOnboardingForm({
      licensee_name: licensee.name || "",
      name: licensee.name || "",
      company_name: licensee.company_name || "",
      email: licensee.email || "",
      phone: licensee.phone || "",
      code: licensee.code || "",
      pin: licensee.pin || "",
      billing_address: licensee.billing_address || "",
      contract_details: licensee.contract_details || "",
      notes: licensee.notes || "",
    });
    setEditingLicensee(licensee);
    setShowOnboardingModal(true);
  }

  async function saveEdit() {
    if (!editingLicensee) return;
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(editingLicensee.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          name: onboardingForm.licensee_name.trim(),
          company_name: onboardingForm.company_name.trim() || null,
          email: onboardingForm.email.trim() || null,
          phone: onboardingForm.phone.trim() || null,
          pin: onboardingForm.pin.trim() || null,
          billing_address: onboardingForm.billing_address.trim() || null,
          contract_details: onboardingForm.contract_details.trim() || null,
          notes: onboardingForm.notes.trim() || null,
        }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || out.text || `Update failed (${out.status})`); return; }
      setEditingLicensee(null);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitOnboarding() {
    if (!onboardingForm.licensee_name.trim()) { setErr("Licensee name is required"); return; }
    if (!onboardingForm.name.trim()) { setErr("Contact name is required"); return; }
    const finalCode = autoGenerateCode ? generateNextCode() : onboardingForm.code.trim();
    if (!finalCode) { setErr("Licensee code is required"); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/licensees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          name: onboardingForm.licensee_name.trim(),
          code: finalCode.toLowerCase(),
          email: onboardingForm.email.trim() || null,
          phone: onboardingForm.phone.trim() || null,
          company_name: onboardingForm.company_name.trim() || null,
          pin: onboardingForm.pin.trim() || null,
          billing_address: onboardingForm.billing_address.trim() || null,
          contract_details: onboardingForm.contract_details.trim() || null,
          notes: onboardingForm.notes.trim() || null,
          active: true,
        }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || out.text || `Create failed (${out.status})`); return; }
      setShowOnboardingModal(false);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLicensee(id: string) {
    if (!confirm("Delete this licensee? This cannot be undone.")) return;
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: adminHeaders });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || out.text || `Delete failed (${out.status})`); return; }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(licensee: Licensee) {
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(licensee.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ active: !(licensee.active ?? true) }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || out.text || `Update failed (${out.status})`); return; }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function openVideosModal(licensee: Licensee) {
    setVideosErr(""); setShowVideosFor(licensee); setSavingVideos(false); setAllVideos([]); setChecked({});
    try {
      const resVideos = await fetch(`/api/admin/videos`, { cache: "no-store", headers: adminHeaders });
      const outVideos = await safeJson(resVideos);
      if (!outVideos.ok) { setVideosErr(outVideos.json?.error || `Videos load failed (${outVideos.status})`); return; }
      const vids: Video[] = Array.isArray(outVideos.json?.videos) ? outVideos.json.videos : [];
      setAllVideos(vids);
      const resAssigned = await fetch(`/api/admin/licensees/${encodeURIComponent(licensee.id)}/videos`, { cache: "no-store", headers: adminHeaders });
      const outAssigned = await safeJson(resAssigned);
      if (!outAssigned.ok) { setVideosErr(outAssigned.json?.error || `Assigned load failed (${outAssigned.status})`); return; }
      const assignedLabels: string[] = Array.isArray(outAssigned.json?.video_labels) ? outAssigned.json.video_labels : [];
      const assignedSet = new Set(assignedLabels.map(normLabel));
      const map: Record<string, boolean> = {};
      for (const v of vids) {
        const label = normLabel(v.label);
        if (!label) continue;
        map[label] = assignedSet.has(label);
      }
      setChecked(map);
    } catch (e: any) {
      setVideosErr(e?.message || "Failed to load videos");
    }
  }

  function toggleVideo(label: string) {
    const key = normLabel(label);
    if (!key) return;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveVideos() {
    if (!showVideosFor) return;
    setVideosErr(""); setSavingVideos(true);
    try {
      const selectedLabels = Object.entries(checked).filter(([, v]) => v).map(([k]) => normLabel(k)).filter(Boolean);
      const res = await fetch(`/api/admin/licensees/${encodeURIComponent(showVideosFor.id)}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ video_labels: selectedLabels }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setVideosErr(out.json?.error || out.text || `Save failed (${out.status})`); return; }
      setShowVideosFor(null);
    } catch (e: any) {
      setVideosErr(e?.message || "Save failed");
    } finally {
      setSavingVideos(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#0f0f0f", color: "#fff", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 14, opacity: 0.85 }}>{loading ? "Loading..." : `${items.length} licensee(s)`}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={refresh} disabled={loading} style={{ padding: "12px 20px", borderRadius: 12, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Refresh</button>
          <button onClick={openOnboardingModal} disabled={loading} style={{ padding: "12px 24px", borderRadius: 12, border: "2px solid #1f4d2a", background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#000", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>+ New Licensee</button>
        </div>
      </div>

      {err && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, border: "1px solid #7f1d1d", background: "#2a0f10", color: "#fecaca", fontWeight: 700 }}>{err}</div>}

      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#111" }}>
            {["Name", "Code", "PIN", "Status", "Created", "", "", ""].map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "12px", fontWeight: 900, borderBottom: "1px solid #222" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && !loading ? (
            <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>No licensees found.</td></tr>
          ) : (
            items.map((x) => {
              const isActive = x.active ?? true;
              return (
                <tr key={x.id} style={{ borderBottom: "1px solid #222", opacity: isActive ? 1 : 0.55 }}>
                  <td style={{ padding: "12px", fontWeight: 700 }}>{x.name || "—"}</td>
                  <td style={{ padding: "12px", fontFamily: "ui-monospace, monospace" }}>{x.code || "—"}</td>
                  <td style={{ padding: "12px", fontFamily: "ui-monospace, monospace", letterSpacing: 2 }}>{x.pin || "—"}</td>
                  <td style={{ padding: "12px", fontWeight: 900, color: isActive ? "#22c55e" : "#f97316" }}>{isActive ? "ACTIVE" : "INACTIVE"}</td>
                  <td style={{ padding: "12px", opacity: 0.7 }}>{x.created_at ? new Date(x.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "12px" }}><button onClick={() => openEditModal(x)} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>Edit</button></td>
                  <td style={{ padding: "12px" }}><button onClick={() => toggleActive(x)} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #333", background: isActive ? "#111827" : "#7c2d12", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>{isActive ? "Deactivate" : "Activate"}</button></td>
                  <td style={{ padding: "12px" }}><button onClick={() => openVideosModal(x)} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #1e40af", background: "#1e3a8a", color: "#e2e8f0", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>Videos</button></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Onboarding/Edit Modal */}
      {showOnboardingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }} onClick={() => { setShowOnboardingModal(false); setEditingLicensee(null); }}>
          <div style={{ width: "min(900px, 96vw)", maxHeight: "85vh", overflow: "auto", background: "#0b0b0b", border: "2px solid #22c55e", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(34, 197, 94, 0.3)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 24, fontWeight: 900, color: "#22c55e" }}>{editingLicensee ? "Edit Licensee" : "New Licensee Onboarding"}</h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Licensee Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={onboardingForm.licensee_name} onChange={(e) => setOnboardingForm({ ...onboardingForm, licensee_name: e.target.value })} placeholder="Miami Fitness Studio" style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Contact Person Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={onboardingForm.name} onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })} placeholder="John Doe" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Company Name (Optional)</label>
                  <input value={onboardingForm.company_name} onChange={(e) => setOnboardingForm({ ...onboardingForm, company_name: e.target.value })} placeholder="Acme Fitness LLC" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Email</label>
                  <input type="email" value={onboardingForm.email} onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })} placeholder="john@gym.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Phone</label>
                  <input type="tel" value={onboardingForm.phone} onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })} placeholder="+1 (555) 123-4567" style={inputStyle} />
                </div>
              </div>

              {!editingLicensee && (
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Licensee Code</label>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                    <input value={autoGenerateCode ? generateNextCode() : onboardingForm.code} onChange={(e) => setOnboardingForm({ ...onboardingForm, code: e.target.value })} disabled={autoGenerateCode} placeholder="lic001" style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontWeight: 700, opacity: autoGenerateCode ? 0.7 : 1 }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#0f0f0f" }}>
                      <input type="checkbox" checked={autoGenerateCode} onChange={(e) => setAutoGenerateCode(e.target.checked)} style={{ width: 18, height: 18 }} />
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Auto-generate</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>PIN Code <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  value={onboardingForm.pin}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, pin: e.target.value })}
                  placeholder="e.g. 4821"
                  maxLength={8}
                  style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 24, letterSpacing: 8 }}
                />
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>This PIN is entered on the TV app to authenticate the device</div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Billing Address</label>
                <textarea value={onboardingForm.billing_address} onChange={(e) => setOnboardingForm({ ...onboardingForm, billing_address: e.target.value })} rows={3} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Contract Details</label>
                <textarea value={onboardingForm.contract_details} onChange={(e) => setOnboardingForm({ ...onboardingForm, contract_details: e.target.value })} placeholder="12-month contract, $500/month" rows={2} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Internal Notes</label>
                <textarea value={onboardingForm.notes} onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 10 }}>
                <div>
                  {editingLicensee && (
                    <button onClick={() => { deleteLicensee(editingLicensee.id); setShowOnboardingModal(false); setEditingLicensee(null); }} style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid #7f1d1d", background: "#991b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Delete Licensee</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setShowOnboardingModal(false); setEditingLicensee(null); }} style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                  <button onClick={editingLicensee ? saveEdit : submitOnboarding} disabled={loading} style={{ padding: "12px 32px", borderRadius: 12, border: "2px solid #1f4d2a", background: "#22c55e", color: "#000", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
                    {loading ? "Saving..." : editingLicensee ? "Save Changes" : "Create Licensee"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Videos Modal */}
      {showVideosFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }} onClick={() => savingVideos ? null : setShowVideosFor(null)}>
          <div style={{ width: "min(980px, 96vw)", maxHeight: "80vh", overflow: "auto", background: "#0b0b0b", border: "1px solid #222", borderRadius: 16, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Assign Videos</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>{showVideosFor.name} — <span style={{ fontFamily: "monospace" }}>{showVideosFor.code}</span></div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowVideosFor(null)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Close</button>
                <button onClick={saveVideos} disabled={savingVideos} style={{ padding: "10px 14px", borderRadius: 12, background: "#22c55e", color: "#000", fontWeight: 900, cursor: "pointer" }}>{savingVideos ? "Saving..." : "Save"}</button>
              </div>
            </div>
            {videosErr && <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #7f1d1d", background: "#2a0f10", color: "#fecaca" }}>{videosErr}</div>}
            <div style={{ marginTop: 14, borderTop: "1px solid #222", paddingTop: 12 }}>
              {allVideos.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No videos found.</div>
              ) : (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {allVideos.map((v) => {
                    const label = normLabel(v.label);
                    if (!label) return null;
                    return (
                      <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, border: checked[label] ? "2px solid #22c55e" : "1px solid #333", borderRadius: 12, background: checked[label] ? "#0a1f14" : "#0f0f0f", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!checked[label]} onChange={() => toggleVideo(label)} disabled={savingVideos} style={{ width: 20, height: 20 }} />
                        <div style={{ fontWeight: 900, fontSize: 16, color: checked[label] ? "#22c55e" : "#fff" }}>{v.label || v.id}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
