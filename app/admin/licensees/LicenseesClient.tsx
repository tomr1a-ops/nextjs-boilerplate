"use client";

import { useEffect, useState } from "react";

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
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

export default function LicenseesClient({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // Onboarding modal state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    licensee_name: "",
    name: "",
    company_name: "",
    email: "",
    phone: "",
    code: "",
    billing_address: "",
    contract_details: "",
    notes: "",
  });
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  // Edit modal state
  const [editingLicensee, setEditingLicensee] = useState<Licensee | null>(null);

  // Video assignment modal state
  const [showVideosFor, setShowVideosFor] = useState<Licensee | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [savingVideos, setSavingVideos] = useState(false);
  const [videosErr, setVideosErr] = useState("");

  const adminHeaders = { "x-admin-key": adminKey };

  function generateNextCode(): string {
    if (items.length === 0) return "LIC001";
    
    const existingCodes = items
      .map(item => item.code || "")
      .filter(c => c.match(/^LIC\d{3}$/))
      .map(c => parseInt(c.replace("LIC", "")))
      .filter(n => !isNaN(n));
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNum = maxNum + 1;
    return `LIC${String(nextNum).padStart(3, "0")}`;
  }

  async function refresh() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/licensees", {
        cache: "no-store",
        headers: adminHeaders,
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Request failed (${out.status})`);
        setItems([]);
        return;
      }

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
    setOnboardingForm({
      licensee_name: "",
      name: "",
      company_name: "",
      email: "",
      phone: "",
      code: autoGenerateCode ? generateNextCode() : "",
      billing_address: "",
      contract_details: "",
      notes: "",
    });
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
      billing_address: licensee.billing_address || "",
      contract_details: licensee.contract_details || "",
      notes: licensee.notes || "",
    });
    setEditingLicensee(licensee);
    setShowOnboardingModal(true);
  }

  async function saveEdit() {
    if (!editingLicensee) return;

    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(editingLicensee.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          name: onboardingForm.licensee_name.trim(),
          company_name: onboardingForm.company_name.trim() || null,
          email: onboardingForm.email.trim() || null,
          phone: onboardingForm.phone.trim() || null,
          billing_address: onboardingForm.billing_address.trim() || null,
          contract_details: onboardingForm.contract_details.trim() || null,
          notes: onboardingForm.notes.trim() || null,
        }),
      });

      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Update failed (${out.status})`);
        return;
      }

      setEditingLicensee(null);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitOnboarding() {
    if (!onboardingForm.licensee_name.trim()) {
      setErr("Licensee name is required");
      return;
    }

    if (!onboardingForm.name.trim()) {
      setErr("Contact name is required");
      return;
    }

    const finalCode = autoGenerateCode ? generateNextCode() : onboardingForm.code.trim();
    if (!finalCode) {
      setErr("Licensee code is required");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/licensees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          name: onboardingForm.licensee_name.trim(),
          code: finalCode.toUpperCase(),
          email: onboardingForm.email.trim() || null,
          phone: onboardingForm.phone.trim() || null,
          company_name: onboardingForm.company_name.trim() || null,
          billing_address: onboardingForm.billing_address.trim() || null,
          contract_details: onboardingForm.contract_details.trim() || null,
          notes: onboardingForm.notes.trim() || null,
          active: true,
        }),
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Create failed (${out.status})`);
        return;
      }

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

    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Delete failed (${out.status})`);
        return;
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(licensee: Licensee) {
    setErr("");
    setLoading(true);

    try {
      const nextActive = !(licensee.active ?? true);

      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(licensee.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ active: nextActive }),
      });

      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Update failed (${out.status})`);
        return;
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function openVideosModal(licensee: Licensee) {
    setVideosErr("");
    setShowVideosFor(licensee);
    setSavingVideos(false);
    setAllVideos([]);
    setChecked({});

    try {
      const resVideos = await fetch(`/api/admin/videos`, {
        cache: "no-store",
        headers: adminHeaders,
      });
      const outVideos = await safeJson(resVideos);

      if (!outVideos.ok) {
        setVideosErr(outVideos.json?.error || outVideos.text || `Videos load failed (${outVideos.status})`);
        return;
      }

      const vids: Video[] = Array.isArray(outVideos.json?.videos)
        ? outVideos.json.videos
        : Array.isArray(outVideos.json?.data)
        ? outVideos.json.data
        : Array.isArray(outVideos.json)
        ? outVideos.json
        : [];

      setAllVideos(vids);

      const resAssigned = await fetch(`/api/admin/licensees/${encodeURIComponent(licensee.id)}/videos`, {
        cache: "no-store",
        headers: adminHeaders,
      });
      const outAssigned = await safeJson(resAssigned);

      if (!outAssigned.ok) {
        setVideosErr(outAssigned.json?.error || outAssigned.text || `Assigned load failed (${outAssigned.status})`);
        return;
      }

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

    setVideosErr("");
    setSavingVideos(true);

    try {
      const selectedLabels = Object.entries(checked)
        .filter(([, v]) => v)
        .map(([k]) => normLabel(k))
        .filter(Boolean);

      const res = await fetch(`/api/admin/licensees/${encodeURIComponent(showVideosFor.id)}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ video_labels: selectedLabels }),
      });

      const out = await safeJson(res);
      if (!out.ok) {
        setVideosErr(out.json?.error || out.text || `Save failed (${out.status})`);
        return;
      }

      setShowVideosFor(null);
    } catch (e: any) {
      setVideosErr(e?.message || "Save failed");
    } finally {
      setSavingVideos(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Header with New Licensee Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          {loading ? "Loading..." : `${items.length} licensee(s)`}
        </div>
        
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#1b1b1b",
              color: "#fff",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>

          <button
            onClick={openOnboardingModal}
            disabled={loading}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "2px solid #1f4d2a",
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "#000",
              fontWeight: 900,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
            }}
          >
            + New Licensee Onboarding
          </button>
        </div>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #7f1d1d",
            background: "#2a0f10",
            color: "#fecaca",
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      )}

      {/* Licensees Table */}
      <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto auto",
            gap: 12,
            padding: 12,
            background: "#111",
          }}
        >
          <div style={{ fontWeight: 900, opacity: 0.9, textAlign: "left" }}>Name</div>
          <div style={{ fontWeight: 900, opacity: 0.9, textAlign: "left" }}>Code</div>
          <div style={{ fontWeight: 900, opacity: 0.9, textAlign: "left" }}>Status</div>
          <div style={{ fontWeight: 900, opacity: 0.9, textAlign: "left" }}>Created</div>
          <div />
          <div />
          <div />
        </div>

        {items.map((x) => {
          const isActive = x.active ?? true;

          return (
            <div
              key={x.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto auto",
                padding: 12,
                borderTop: "1px solid #222",
                alignItems: "center",
                gap: 12,
                opacity: isActive ? 1 : 0.55,
              }}
            >
              <div style={{ fontWeight: 700 }}>{x.name || "—"}</div>

              <div style={{ 
                opacity: 0.9, 
                fontFamily: "ui-monospace, monospace" 
              }}>
                {x.code || "—"}
              </div>

              <div style={{ fontWeight: 900, color: isActive ? "#22c55e" : "#f97316" }}>
                {isActive ? "ACTIVE" : "INACTIVE"}
              </div>

              <div style={{ opacity: 0.7 }}>
                {x.created_at ? new Date(x.created_at).toLocaleDateString() : "—"}
              </div>

              <button
                onClick={() => openEditModal(x)}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Edit
              </button>

              <button
                onClick={() => toggleActive(x)}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: isActive ? "#111827" : "#7c2d12",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>

              <button
                onClick={() => openVideosModal(x)}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #1e40af",
                  background: "#1e3a8a",
                  color: "#e2e8f0",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Videos
              </button>
            </div>
          );
        })}

        {items.length === 0 && !loading && (
          <div style={{ padding: 14, opacity: 0.7 }}>
            No licensees found. Click "New Licensee Onboarding" to add your first licensee.
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setShowOnboardingModal(false)}
        >
          <div
            style={{
              width: "min(900px, 96vw)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "#0b0b0b",
              border: "2px solid #22c55e",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 20px 60px rgba(34, 197, 94, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: 24, fontWeight: 900, color: "#22c55e" }}>
              {editingLicensee ? "Edit Licensee" : "New Licensee Onboarding"}
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              {/* Row 0: Licensee Name (Business Name) */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Licensee Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={onboardingForm.licensee_name}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, licensee_name: e.target.value })}
                  placeholder="Atlanta Fitness Studio 1"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#0f0f0f",
                    color: "#fff",
                    outline: "none",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Row 1: Contact Name, Company */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Contact Person Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={onboardingForm.name}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#0f0f0f",
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Company Name (Optional)
                  </label>
                  <input
                    value={onboardingForm.company_name}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, company_name: e.target.value })}
                    placeholder="Acme Fitness LLC"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#0f0f0f",
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Email, Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={onboardingForm.email}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                    placeholder="john@acmefitness.com"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#0f0f0f",
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={onboardingForm.phone}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#0f0f0f",
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Code (only show when creating, not editing) */}
              {!editingLicensee && (
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Licensee Code {!autoGenerateCode && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                    <input
                      value={autoGenerateCode ? generateNextCode() : onboardingForm.code}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, code: e.target.value })}
                      placeholder="LIC001"
                      disabled={autoGenerateCode}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #333",
                        background: autoGenerateCode ? "#1a1a1a" : "#0f0f0f",
                        color: "#fff",
                        fontFamily: "ui-monospace, monospace",
                        fontWeight: 700,
                        opacity: autoGenerateCode ? 0.7 : 1,
                        outline: "none",
                      }}
                    />
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 8, 
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#0f0f0f",
                    }}>
                      <input
                        type="checkbox"
                        checked={autoGenerateCode}
                        onChange={(e) => setAutoGenerateCode(e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Auto-generate</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Row 4: Billing Address */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Billing Address
                </label>
                <textarea
                  value={onboardingForm.billing_address}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, billing_address: e.target.value })}
                  placeholder="123 Main St, Suite 100&#10;Atlanta, GA 30301"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#0f0f0f",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Row 5: Contract Details */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Contract Details
                </label>
                <textarea
                  value={onboardingForm.contract_details}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, contract_details: e.target.value })}
                  placeholder="12-month contract, $500/month, starts March 1st"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#0f0f0f",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Row 6: Notes */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Internal Notes
                </label>
                <textarea
                  value={onboardingForm.notes}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
                  placeholder="Any internal notes about this licensee..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#0f0f0f",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 10 }}>
                <div>
                  {editingLicensee && (
                    <button
                      onClick={() => {
                        deleteLicensee(editingLicensee.id);
                        setShowOnboardingModal(false);
                        setEditingLicensee(null);
                      }}
                      disabled={loading}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 12,
                        border: "1px solid #7f1d1d",
                        background: "#991b1b",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      Delete Licensee
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setShowOnboardingModal(false);
                      setEditingLicensee(null);
                    }}
                    disabled={loading}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#1b1b1b",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={editingLicensee ? saveEdit : submitOnboarding}
                    disabled={loading || !onboardingForm.licensee_name.trim() || !onboardingForm.name.trim()}
                    style={{
                      padding: "12px 32px",
                      borderRadius: 12,
                      border: "2px solid #1f4d2a",
                      background: loading || !onboardingForm.licensee_name.trim() || !onboardingForm.name.trim() ? "#14532d" : "#22c55e",
                      color: "#000",
                      fontWeight: 900,
                      fontSize: 16,
                      cursor: loading || !onboardingForm.licensee_name.trim() || !onboardingForm.name.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? (editingLicensee ? "Saving..." : "Creating...") : (editingLicensee ? "Save Changes" : "Create Licensee")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Videos Modal */}
      {showVideosFor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => (savingVideos ? null : setShowVideosFor(null))}
        >
          <div
            style={{
              width: "min(980px, 96vw)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#0b0b0b",
              border: "1px solid #222",
              borderRadius: 16,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Assign Videos</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {showVideosFor.name || "Licensee"} —{" "}
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>
                    {showVideosFor.code || "NO_CODE"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowVideosFor(null)}
                  disabled={savingVideos}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#1b1b1b",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: savingVideos ? "not-allowed" : "pointer",
                  }}
                >
                  Close
                </button>

                <button
                  onClick={saveVideos}
                  disabled={savingVideos}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #1f4d2a",
                    background: savingVideos ? "#14532d" : "#22c55e",
                    color: "#000",
                    fontWeight: 900,
                    cursor: savingVideos ? "not-allowed" : "pointer",
                  }}
                >
                  {savingVideos ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {videosErr && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #7f1d1d",
                  background: "#2a0f10",
                  color: "#fecaca",
                  fontWeight: 700,
                }}
              >
                {videosErr}
              </div>
            )}

            <div style={{ marginTop: 14, borderTop: "1px solid #222", paddingTop: 12 }}>
              {allVideos.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No videos found. Upload videos in the Videos tab first.</div>
              ) : (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {allVideos.map((v) => {
                    const label = normLabel(v.label);
                    if (!label) return null;

                    return (
                      <label
                        key={v.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: 14,
                          border: checked[label] ? "2px solid #22c55e" : "1px solid #333",
                          borderRadius: 12,
                          background: checked[label] ? "#0a1f14" : "#0f0f0f",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!checked[label]) {
                            e.currentTarget.style.borderColor = "#555";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!checked[label]) {
                            e.currentTarget.style.borderColor = "#333";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!checked[label]}
                          onChange={() => toggleVideo(label)}
                          disabled={savingVideos}
                          style={{ 
                            width: 20, 
                            height: 20,
                            marginTop: 2,
                            cursor: savingVideos ? "not-allowed" : "pointer",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 900, 
                            fontSize: 16,
                            color: checked[label] ? "#22c55e" : "#fff",
                          }}>
                            {v.label || v.id}
                          </div>
                        </div>
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
