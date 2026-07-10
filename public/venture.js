function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const VENTURE_TAG_LABELS = { partners: "Partners", investment: "Investment", advice: "Advice / Information" };

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

const ventureId = new URLSearchParams(window.location.search).get("id");
let currentVenture = null;

function renderVenture(idea) {
  currentVenture = idea;
  const isClosed = idea.status === "closed";

  document.getElementById("venture-title").textContent = idea.title;
  document.getElementById("venture-meta").innerHTML =
    `by ${ventureByline(idea)} &middot; ${fmtDate((idea.createdAt || "").split("T")[0])} &middot; ${isClosed ? "Closed" : "Open"}`;

  document.getElementById("venture-tags").innerHTML = (idea.lookingFor || [])
    .map((t) => `<span class="badge">${escapeHtml(VENTURE_TAG_LABELS[t] || t)}</span>`)
    .join(" ");

  const img = document.getElementById("venture-image");
  if (idea.image) {
    img.src = idea.image;
    img.style.display = "";
  } else {
    img.style.display = "none";
  }

  document.getElementById("venture-description").textContent = idea.description;

  const toggleBtn = document.getElementById("venture-toggle-status");
  toggleBtn.textContent = isClosed ? "Reopen" : "Mark Closed";
  toggleBtn.dataset.status = isClosed ? "open" : "closed";

  document.getElementById("venture-comments").innerHTML = ventureCommentsHtml(idea.comments);
}

async function loadVenture() {
  try {
    const res = await fetch("/api/business-ideas/list");
    if (res.status === 401) {
      window.location.href = "/auth/discord/login";
      return;
    }
    if (!res.ok) {
      document.getElementById("loading").innerHTML = '<p class="muted">Couldn\'t load this idea. Try again shortly.</p>';
      return;
    }
    const data = await res.json();
    const idea = (data.ideas || []).find((i) => i.id === ventureId);

    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "";

    if (!idea) {
      document.getElementById("venture-not-found").style.display = "";
      document.getElementById("venture-detail").style.display = "none";
      document.getElementById("venture-title").textContent = "Not found";
      return;
    }
    renderVenture(idea);
  } catch {
    document.getElementById("loading").innerHTML = '<p class="muted">Couldn\'t load this idea. Try again shortly.</p>';
  }
}

document.getElementById("venture-toggle-status").addEventListener("click", async (e) => {
  const btn = e.target;
  btn.disabled = true;
  try {
    const res = await fetch("/api/business-ideas/set-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ventureId, status: btn.dataset.status }),
    });
    if (res.ok) {
      await loadVenture();
    }
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("venture-delete").addEventListener("click", async () => {
  if (!confirm("Delete this idea permanently? This can't be undone.")) return;
  const btn = document.getElementById("venture-delete");
  btn.disabled = true;
  try {
    const res = await fetch("/api/business-ideas/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ventureId }),
    });
    if (res.ok) {
      window.location.href = "/admin.html#ventures";
    } else {
      btn.disabled = false;
    }
  } catch {
    btn.disabled = false;
  }
});

document.getElementById("venture-comment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("venture-comment-input");
  const btn = e.target.querySelector("button[type=submit]");
  const text = input.value.trim();
  if (!text) return;

  btn.disabled = true;
  input.disabled = true;
  try {
    const res = await fetch("/api/business-ideas/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: ventureId, text }),
    });
    if (res.ok) {
      input.value = "";
      await loadVenture();
    }
  } finally {
    btn.disabled = false;
    input.disabled = false;
  }
});

// ---------- Mobile sidebar (same pattern as admin.js/portal.js) ----------

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

if (!ventureId) {
  document.getElementById("loading").innerHTML = '<p class="muted">No idea specified.</p>';
} else {
  document.getElementById("sidebar-username").textContent = "Owner";
  loadVenture();
}
