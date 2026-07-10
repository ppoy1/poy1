function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadAdminData() {
  const res = await fetch("/api/admin/data");
  if (res.status === 401) {
    window.location.href = "/auth/discord/login";
    return null;
  }
  if (!res.ok) {
    document.getElementById("loading").innerHTML = '<p class="muted">Couldn\'t load bank data. Try again shortly.</p>';
    return null;
  }
  return res.json();
}

function clientRow(ign, client) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${client.display_name || ign}</td>
    <td>$${fmt(client.deposit_balance)}</td>
    <td>$${fmt(client.savings_balance)}</td>
  `;
  return tr;
}

function render(data) {
  isOwner = !!data.is_owner;
  document.getElementById("sidebar-username").textContent = data.admin_username || "Owner";
  const avatarEl = document.getElementById("sidebar-avatar");
  if (data.admin_avatar_url) {
    avatarEl.textContent = "";
    avatarEl.style.backgroundImage = `url(${data.admin_avatar_url})`;
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
  } else {
    avatarEl.textContent = (data.admin_username || "?").charAt(0).toUpperCase();
  }

  document.getElementById("total-deposits").textContent = fmt(data.summary?.total_deposits_held);
  document.getElementById("total-loans").textContent = fmt(data.summary?.total_loans_outstanding);
  const clients = data.clients || {};
  document.getElementById("client-count").textContent = Object.keys(clients).length;
  document.getElementById("active-now").textContent = data.activity?.active_now ?? 0;
  document.getElementById("active-today").textContent = data.activity?.active_today ?? 0;

  document.querySelectorAll(".sync-pill").forEach((el) => {
    el.textContent = `Synced ${data.synced_at || "unknown"}`;
  });

  const clientsBody = document.getElementById("clients-body");
  clientsBody.innerHTML = "";
  for (const [ign, client] of Object.entries(clients)) {
    clientsBody.appendChild(clientRow(ign, client));
  }

  const topBody = document.getElementById("top-clients-body");
  topBody.innerHTML = "";
  const topClients = Object.entries(clients)
    .sort((a, b) => Number(b[1].deposit_balance || 0) - Number(a[1].deposit_balance || 0))
    .slice(0, 5);
  for (const [ign, client] of topClients) {
    topBody.appendChild(clientRow(ign, client));
  }

  renderWithdrawals(data.pending_withdrawals || []);
  renderTransactions(data.recent_transactions || []);
  renderMarket(data.chestshop_market);

  const loansBody = document.getElementById("loans-body");
  loansBody.innerHTML = "";
  for (const loan of data.loans || []) {
    const total = Number(loan.total_obligation || loan.amount || 0);
    const repaid = Number(loan.repaid || 0);
    const pct = total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0;
    const ign = loan.minecraft_ign || "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ign || loan.borrower_name || ""}</td>
      <td>$${fmt(loan.amount)}</td>
      <td>$${fmt(loan.weekly_payment)}</td>
      <td>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="muted" style="font-size:0.75rem">${pct}% paid</span>
      </td>
      <td>$${fmt(loan.owed)}</td>
      <td><span class="badge">${loan.next_installment || ""} &middot; ${loan.next_due_date || ""}</span></td>
    `;
    loansBody.appendChild(tr);
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("content").style.display = "";
}

// ---------- Withdrawals ----------

function renderWithdrawals(pending) {
  const body = document.getElementById("withdrawals-body");
  const empty = document.getElementById("withdrawals-empty");
  const badge = document.getElementById("withdrawals-badge");

  body.innerHTML = "";
  if (!pending.length) {
    empty.style.display = "";
    badge.style.display = "none";
  } else {
    empty.style.display = "none";
    badge.style.display = "";
    badge.textContent = pending.length;
    for (const req of pending) {
      const tr = document.createElement("tr");
      tr.dataset.requestId = req.id;
      tr.innerHTML = `
        <td>${req.ign}</td>
        <td>$${fmt(req.amount)}</td>
        <td style="text-align:right">
          <button class="secondary" data-action="accept_savings_withdrawal" data-id="${req.id}">Approve</button>
          <button class="secondary" data-action="deny_savings_withdrawal" data-id="${req.id}">Deny</button>
        </td>
      `;
      body.appendChild(tr);
    }
  }
}

document.getElementById("withdrawals-body").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const type = btn.dataset.action;
  const requestId = Number(btn.dataset.id);
  const row = btn.closest("tr");
  row.querySelectorAll("button").forEach((b) => (b.disabled = true));
  btn.textContent = "...";

  try {
    const res = await fetch("/api/admin/actions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, request_id: requestId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error || "Something went wrong.");
      row.querySelectorAll("button").forEach((b) => (b.disabled = false));
      btn.textContent = type === "accept_savings_withdrawal" ? "Approve" : "Deny";
      return;
    }
    row.innerHTML = body.instant
      ? `<td colspan="3" class="muted-cell">Approved - paid out instantly.</td>`
      : `<td colspan="3" class="muted-cell">Submitted - the bot processes this within about a minute.</td>`;
  } catch {
    alert("Couldn't reach the server. Try again shortly.");
    row.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
});

// ---------- Transactions ----------

function renderTransactions(transactions) {
  const body = document.getElementById("transactions-body");
  const empty = document.getElementById("transactions-empty");
  const table = body.closest("table");

  body.innerHTML = "";
  if (!transactions.length) {
    empty.style.display = "";
    table.style.display = "none";
    return;
  }
  empty.style.display = "none";
  table.style.display = "";
  for (const txn of transactions) {
    const amount = Number(txn.amount || 0);
    const isIn = amount > 0;
    const icon = isIn
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="muted-cell">${fmtDate(txn.date)}</td>
      <td>${txn.counterparty || ""}</td>
      <td><span class="txn-type ${isIn ? "deposit" : "withdrawal"}">${icon}${isIn ? "In" : "Out"}</span></td>
      <td>${isIn ? "+" : "-"}$${fmt(Math.abs(amount))}</td>
    `;
    body.appendChild(tr);
  }
}

// ---------- Market (Beta) ----------

function renderMarket(market) {
  const volumeEl = document.getElementById("market-volume");
  const salesEl = document.getElementById("market-sales");
  const itemsEl = document.getElementById("market-items");
  const shopsEl = document.getElementById("market-shops");
  const body = document.getElementById("market-items-body");
  const empty = document.getElementById("market-empty");
  const table = body.closest("table");

  const stats = market?.stats;
  volumeEl.textContent = fmt(stats?.totalVolume);
  salesEl.textContent = (stats?.totalSales ?? 0).toLocaleString();
  itemsEl.textContent = (stats?.distinctItems ?? 0).toLocaleString();
  shopsEl.textContent = (stats?.activeShops ?? 0).toLocaleString();

  body.innerHTML = "";
  const items = market?.items || [];
  if (!items.length) {
    empty.style.display = "";
    table.style.display = "none";
    return;
  }
  empty.style.display = "none";
  table.style.display = "";

  const sorted = items.slice().sort((a, b) => Number(b.totalVolume || 0) - Number(a.totalVolume || 0));
  for (const item of sorted) {
    const days = (item.priceByDay || []).slice().sort((a, b) => (a.day || "").localeCompare(b.day || ""));
    const priced = days.filter((d) => Number(d.avgUnitPrice) > 0);
    let trendHtml = '<span class="muted">—</span>';
    if (priced.length >= 2) {
      const first = Number(priced[0].avgUnitPrice);
      const last = Number(priced[priced.length - 1].avgUnitPrice);
      if (first > 0) {
        const pct = ((last - first) / first) * 100;
        const up = pct >= 0;
        trendHtml = `<span style="color:${up ? "var(--good)" : "var(--bad)"}">${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%</span>`;
      }
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.itemName || item.itemKey || ""}</td>
      <td>$${fmt(item.avgUnitPrice)}</td>
      <td>${(item.tradeCount || 0).toLocaleString()}</td>
      <td>$${fmt(item.totalVolume)}</td>
      <td>${(item.activeShopCount || 0).toLocaleString()}</td>
      <td>${trendHtml}</td>
    `;
    body.appendChild(tr);
  }
}

// ---------- Ventures (Beta) ----------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

const VENTURE_TAG_LABELS = { partners: "Partners", investment: "Investment", advice: "Advice / Information" };

// Cache of the last-fetched list, so search/filtering/the modal can all
// work without a round-trip - the beta only has one user (the owner)
// posting to a small KV blob, so there's no pagination/dataset-size
// concern yet.
let allVentures = [];
let currentVentureId = null;
let ventureImageDataUrl = null;
const ventureFilters = { status: "all", tag: null, query: "" };
// Set from /api/admin/data's is_owner flag (see render()) - today every
// admin session already IS the owner, but the Delete button is gated on
// this explicitly rather than "the whole page is admin-only" so it stays
// correct if that ever changes.
let isOwner = false;

// Normalizes any uploaded photo to a bounded JPEG before it goes anywhere
// near the network - there's no object storage (R2) wired up yet, so
// images live as data URLs inside the same KV blob as the posts, and this
// keeps that blob from growing unbounded off a raw phone photo.
function resizeImageFile(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

document.getElementById("venture-image-trigger").addEventListener("click", () => {
  document.getElementById("venture-image").click();
});

document.getElementById("venture-image").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const errorEl = document.getElementById("venture-error");
  const preview = document.getElementById("venture-image-preview");
  const filenameEl = document.getElementById("venture-image-filename");
  if (!file) {
    ventureImageDataUrl = null;
    preview.style.display = "none";
    filenameEl.textContent = "No file chosen";
    return;
  }
  errorEl.style.display = "none";
  filenameEl.textContent = file.name;
  try {
    ventureImageDataUrl = await resizeImageFile(file);
    preview.src = ventureImageDataUrl;
    preview.style.display = "";
  } catch {
    ventureImageDataUrl = null;
    preview.style.display = "none";
    filenameEl.textContent = "No file chosen";
    errorEl.textContent = "Couldn't process that image. Try a different file.";
    errorEl.style.display = "";
  }
});

// Discord username is always known (it's who's logged in); the Minecraft
// IGN comes from the bank's discord_id->IGN link and is null if that
// Discord account was never linked to an in-game account.
function ventureByline(entry) {
  const discord = escapeHtml(entry.authorUsername || "Unknown");
  return entry.authorIgn
    ? `${discord} <span class="muted">(MC: ${escapeHtml(entry.authorIgn)})</span>`
    : discord;
}

function ventureCommentsHtml(comments) {
  if (!comments || !comments.length) {
    return `<p class="muted" style="font-size:0.85rem">No messages yet - be the first to reach out.</p>`;
  }
  return comments
    .map(
      (c) => `
        <div style="padding:8px 0; border-bottom:1px solid var(--border)">
          <p class="muted" style="font-size:0.75rem; margin:0 0 2px">${ventureByline(c)} &middot; ${fmtDate((c.createdAt || "").split("T")[0])}</p>
          <p style="margin:0; white-space:pre-wrap">${escapeHtml(c.text)}</p>
        </div>
      `
    )
    .join("");
}

function ventureTagsHtml(idea) {
  return (idea.lookingFor || [])
    .map((t) => `<span class="badge">${escapeHtml(VENTURE_TAG_LABELS[t] || t)}</span>`)
    .join(" ");
}

const VENTURE_PLACEHOLDER_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M2 20h20"/><path d="M4 20V10l4-4 4 4v10"/><path d="M12 20V6l4-4 4 4v14"/>
  </svg>
`;

// Fundraiser-card-style preview, per the gnomefundme.org layout the owner
// referenced: a big image (or a placeholder if none was uploaded) up top
// with status/tag badges overlaid, then title/byline/snippet below. Click
// to open opens the thread modal - no inline actions or discussion here.
function venturePreview(idea) {
  const div = document.createElement("div");
  div.className = "venture-preview";
  div.dataset.id = idea.id;
  const isClosed = idea.status === "closed";
  const statusBadge = isClosed
    ? `<span class="badge">CLOSED</span>`
    : `<span class="badge badge-good">OPEN</span>`;
  const commentCount = (idea.comments || []).length;
  const snippet = idea.description.length > 140 ? idea.description.slice(0, 140) + "..." : idea.description;
  const mediaHtml = idea.image
    ? `<img src="${idea.image}" alt="" />`
    : `<div class="venture-tile-media-placeholder">${VENTURE_PLACEHOLDER_ICON}</div>`;
  div.innerHTML = `
    <div class="venture-tile-media">
      ${mediaHtml}
      <div class="venture-tile-badges">${statusBadge}</div>
    </div>
    <div class="venture-tile-body">
      <h2 style="margin:0">${escapeHtml(idea.title)}</h2>
      <p class="muted" style="font-size:0.8rem; margin:0">by ${ventureByline(idea)} &middot; ${fmtDate((idea.createdAt || "").split("T")[0])}</p>
      <p class="muted" style="white-space:pre-wrap; margin:0; flex:1">${escapeHtml(snippet)}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
        <div>${ventureTagsHtml(idea)}</div>
        <span class="muted" style="font-size:0.78rem; white-space:nowrap">&#128172; ${commentCount}</span>
      </div>
    </div>
  `;
  return div;
}

function renderVentures(ideas) {
  const list = document.getElementById("ventures-list");
  const empty = document.getElementById("ventures-empty");
  const noMatch = document.getElementById("ventures-no-match");
  list.innerHTML = "";
  empty.style.display = "none";
  noMatch.style.display = "none";

  if (!allVentures.length) {
    empty.style.display = "";
    return;
  }
  if (!ideas.length) {
    noMatch.style.display = "";
    return;
  }
  for (const idea of ideas) {
    list.appendChild(venturePreview(idea));
  }
}

function filterVentures() {
  const q = ventureFilters.query.trim().toLowerCase();
  return allVentures.filter((idea) => {
    if (ventureFilters.status !== "all" && idea.status !== ventureFilters.status) return false;
    if (ventureFilters.tag && !(idea.lookingFor || []).includes(ventureFilters.tag)) return false;
    if (q && !idea.title.toLowerCase().includes(q) && !idea.description.toLowerCase().includes(q)) return false;
    return true;
  });
}

function applyVentureFilters() {
  renderVentures(filterVentures());
}

async function loadVentures() {
  try {
    const res = await fetch("/api/business-ideas/list");
    if (!res.ok) return;
    const data = await res.json();
    allVentures = data.ideas || [];
    applyVentureFilters();
    if (currentVentureId) renderVentureModal();
  } catch {
    // Silent - Ventures tab just stays empty if this fails, same as the
    // other read-only tabs on a transient error.
  }
}

document.getElementById("venture-search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  ventureFilters.query = document.getElementById("venture-search").value;
  applyVentureFilters();
});

document.querySelectorAll(".filter-btn[data-filter-status]").forEach((btn) => {
  btn.addEventListener("click", () => {
    ventureFilters.status = btn.dataset.filterStatus;
    document
      .querySelectorAll(".filter-btn[data-filter-status]")
      .forEach((b) => b.classList.toggle("active", b === btn));
    applyVentureFilters();
  });
});

document.querySelectorAll(".filter-btn[data-filter-tag]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.filterTag;
    ventureFilters.tag = ventureFilters.tag === tag ? null : tag;
    document
      .querySelectorAll(".filter-btn[data-filter-tag]")
      .forEach((b) => b.classList.toggle("active", b.dataset.filterTag === ventureFilters.tag));
    applyVentureFilters();
  });
});

document.getElementById("venture-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  const title = document.getElementById("venture-title").value.trim();
  const description = document.getElementById("venture-description").value.trim();
  const lookingFor = Array.from(document.querySelectorAll(".venture-tag:checked")).map((el) => el.value);
  const errorEl = document.getElementById("venture-error");
  errorEl.style.display = "none";

  btn.disabled = true;
  try {
    const res = await fetch("/api/business-ideas/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, lookingFor, image: ventureImageDataUrl }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorEl.textContent = body.error || "Something went wrong.";
      errorEl.style.display = "";
      btn.disabled = false;
      return;
    }
    e.target.reset();
    ventureImageDataUrl = null;
    document.getElementById("venture-image-preview").style.display = "none";
    document.getElementById("venture-image-filename").textContent = "No file chosen";
    btn.disabled = false;
    loadVentures();
  } catch {
    errorEl.textContent = "Couldn't reach the server. Try again shortly.";
    errorEl.style.display = "";
    btn.disabled = false;
  }
});

// ---------- Ventures thread modal (Discord-thread-style click-to-open) ----------

const ventureModal = document.getElementById("venture-modal");

function renderVentureModal() {
  const idea = allVentures.find((i) => i.id === currentVentureId);
  if (!idea) {
    closeVentureModal();
    return;
  }
  const isClosed = idea.status === "closed";
  document.getElementById("venture-modal-title").textContent = idea.title;
  document.getElementById("venture-modal-meta").innerHTML =
    `by ${ventureByline(idea)} &middot; ${fmtDate((idea.createdAt || "").split("T")[0])} &middot; ${isClosed ? "Closed" : "Open"}`;

  const thumbHtml = idea.image ? `<img class="venture-thumb" src="${idea.image}" alt="" />` : "";
  // Delete is an owner-only moderation tool, not tied to who posted it -
  // only ever rendered when the logged-in session is actually the owner
  // (isOwner, set from /api/admin/data's is_owner flag in render()).
  const deleteBtnHtml = isOwner
    ? `<button class="secondary venture-delete" data-id="${idea.id}" style="color:var(--bad); border-color:var(--bad)">Delete</button>`
    : "";
  document.getElementById("venture-modal-body").innerHTML = `
    <div>${ventureTagsHtml(idea)}</div>
    ${thumbHtml}
    <p style="white-space:pre-wrap">${escapeHtml(idea.description)}</p>
    <div style="display:flex; gap:8px; margin:14px 0">
      <button class="secondary venture-toggle-status" data-id="${idea.id}" data-status="${isClosed ? "open" : "closed"}">
        ${isClosed ? "Reopen" : "Mark Closed"}
      </button>
      ${deleteBtnHtml}
    </div>
    <h2 style="font-size:0.85rem; margin-top:18px">Thread</h2>
    <div class="venture-comments">${ventureCommentsHtml(idea.comments)}</div>
  `;
}

function openVentureModal(id) {
  currentVentureId = id;
  renderVentureModal();
  ventureModal.style.display = "flex";
}

function closeVentureModal() {
  currentVentureId = null;
  ventureModal.style.display = "none";
}

document.getElementById("ventures-list").addEventListener("click", (e) => {
  const card = e.target.closest(".venture-preview");
  if (!card) return;
  openVentureModal(card.dataset.id);
});

document.getElementById("venture-modal-close").addEventListener("click", closeVentureModal);
ventureModal.addEventListener("click", (e) => {
  if (e.target === ventureModal) closeVentureModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ventureModal.style.display !== "none") closeVentureModal();
});

document.getElementById("venture-modal-body").addEventListener("click", async (e) => {
  const toggleBtn = e.target.closest(".venture-toggle-status");
  if (toggleBtn) {
    toggleBtn.disabled = true;
    try {
      const res = await fetch("/api/business-ideas/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: toggleBtn.dataset.id, status: toggleBtn.dataset.status }),
      });
      if (res.ok) {
        await loadVentures();
      } else {
        toggleBtn.disabled = false;
      }
    } catch {
      toggleBtn.disabled = false;
    }
    return;
  }

  const deleteBtn = e.target.closest(".venture-delete");
  if (deleteBtn) {
    if (!confirm("Delete this idea permanently? This can't be undone.")) return;
    deleteBtn.disabled = true;
    try {
      const res = await fetch("/api/business-ideas/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteBtn.dataset.id }),
      });
      if (res.ok) {
        closeVentureModal();
        await loadVentures();
      } else {
        deleteBtn.disabled = false;
      }
    } catch {
      deleteBtn.disabled = false;
    }
  }
});

document.getElementById("venture-modal-comment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("venture-modal-comment-input");
  const btn = e.target.querySelector("button[type=submit]");
  const text = input.value.trim();
  if (!text || !currentVentureId) return;

  btn.disabled = true;
  input.disabled = true;
  try {
    const res = await fetch("/api/business-ideas/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: currentVentureId, text }),
    });
    if (res.ok) {
      input.value = "";
      await loadVentures();
    }
  } finally {
    btn.disabled = false;
    input.disabled = false;
  }
});

loadVentures();

// ---------- Tab switching ----------

function switchTab(tab) {
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((el) => el.classList.toggle("active", el.dataset.panel === tab));
  closeSidebar();
}

document.querySelectorAll(".nav-link").forEach((el) => {
  el.addEventListener("click", () => switchTab(el.dataset.tab));
});

// ---------- Mobile sidebar ----------

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebar-backdrop");

function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("open");
}

document.getElementById("sidebar-toggle").addEventListener("click", () => {
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});
backdrop.addEventListener("click", closeSidebar);

loadAdminData().then((data) => {
  if (data) render(data);
});
