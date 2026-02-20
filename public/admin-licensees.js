(async function () {
  const root = document.getElementById("admin-licensees-root");
  if (!root) return;

  root.innerHTML = `
    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button id="addBtn" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#16a34a;color:#000;font-weight:900;cursor:pointer">
        + Add New Licensee
      </button>
      <span id="msg" style="opacity:0.8;font-size:13px"></span>
    </div>
    <div id="list" style="margin-top:14px;display:grid;gap:10px"></div>

    <div id="modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);padding:16px">
      <div style="max-width:520px;margin:10vh auto;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px">
        <div style="font-size:18px;font-weight:900;margin-bottom:10px">Add Licensee</div>

        <label style="font-size:13px;opacity:0.8">Name</label>
        <input id="name" style="width:100%;margin-top:6px;margin-bottom:10px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#fff" />

        <label style="font-size:13px;opacity:0.8">Code (ex: ATLANTA)</label>
        <input id="code" style="width:100%;margin-top:6px;margin-bottom:10px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#fff" />

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
          <button id="cancel" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#222;color:#fff;font-weight:900;cursor:pointer">
            Cancel
          </button>
          <button id="save" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#16a34a;color:#000;font-weight:900;cursor:pointer">
            Save
          </button>
        </div>

        <div id="err" style="margin-top:10px;color:#ffb4b4;font-weight:700"></div>
      </div>
    </div>
  `;

  const list = document.getElementById("list");
  const msg = document.getElementById("msg");
  const modal = document.getElementById("modal");
  const addBtn = document.getElementById("addBtn");
  const cancel = document.getElementById("cancel");
  const save = document.getElementById("save");
  const nameEl = document.getElementById("name");
  const codeEl = document.getElementById("code");
  const errEl = document.getElementById("err");

  function openModal() {
    errEl.textContent = "";
    nameEl.value = "";
    codeEl.value = "";
    modal.style.display = "block";
    nameEl.focus();
  }
  function closeModal() {
    modal.style.display = "none";
  }

  addBtn.onclick = openModal;
  cancel.onclick = closeModal;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  async function load() {
    msg.textContent = "Loading…";
    const res = await fetch("/api/admin/licensees", { cache: "no-store" });
    if (!res.ok) {
      msg.textContent = "Failed to load.";
      return;
    }
    const data = await res.json();
    const rows = data.licensees || [];
    msg.textContent = rows.length ? `Showing ${rows.length} licensees` : "No licensees yet";

    list.innerHTML = rows.map((x) => `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05)">
        <div>
          <div style="font-weight:900;font-size:16px">${escapeHtml(x.name || "")}</div>
          <div style="opacity:0.75;font-size:12px">Code: <b>${escapeHtml(x.code || "")}</b> • Status: ${escapeHtml(x.status || "")}</div>
        </div>
        <a href="/admin/licensees/${encodeURIComponent(x.id)}" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#222;color:#fff;font-weight:900;text-decoration:none">
          Manage
        </a>
      </div>
    `).join("");
  }

  save.onclick = async () => {
    errEl.textContent = "";
    const name = (nameEl.value || "").trim();
    const code = (codeEl.value || "").trim().toUpperCase();
    if (!name || !code) {
      errEl.textContent = "Name and Code are required.";
      return;
    }

    const res = await fetch("/api/admin/licensees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, status: "active" })
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      errEl.textContent = t || "Create failed";
      return;
    }

    closeModal();
    await load();
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  await load();
})();
