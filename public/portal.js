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

function txnTypeCell(kind) {
  const isDeposit = kind === "deposit";
  const icon = isDeposit
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
  const label = isDeposit ? "Deposit" : "Withdrawal";
  return `<span class="txn-type ${isDeposit ? "deposit" : "withdrawal"}">${icon}${label}</span>`;
}

function renderHistoryRows(tbodyEl, emptyEl, entries) {
  tbodyEl.innerHTML = "";
  if (!entries.length) {
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";
  for (const h of entries) {
    const tr = document.createElement("tr");
    const sign = h.type === "withdrawal" ? "-" : "+";
    tr.innerHTML = `
      <td class="muted-cell">${fmtDate(h.date)}</td>
      <td>${txnTypeCell(h.type)}</td>
      <td>${h.account_type || ""}</td>
      <td>${sign}$${fmt(h.amount)}</td>
    `;
    tbodyEl.appendChild(tr);
  }
}

function renderRecentActivity(entries) {
  const tbody = document.getElementById("recent-history-body");
  const empty = document.getElementById("recent-history-empty");
  const table = tbody.closest("table");
  tbody.innerHTML = "";
  const recent = entries.slice(0, 5);
  if (!recent.length) {
    empty.style.display = "";
    table.style.display = "none";
    return;
  }
  empty.style.display = "none";
  table.style.display = "";
  for (const h of recent) {
    const tr = document.createElement("tr");
    const sign = h.type === "withdrawal" ? "-" : "+";
    tr.innerHTML = `
      <td class="muted-cell">${fmtDate(h.date)}</td>
      <td>${txnTypeCell(h.type)}</td>
      <td class="muted-cell">${h.account_type || ""}</td>
      <td>${sign}$${fmt(h.amount)}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadPortalData() {
  const res = await fetch("/api/portal/data");
  if (res.status === 401) {
    window.location.href = "/auth/discord/login";
    return null;
  }
  if (!res.ok) {
    document.getElementById("loading").innerHTML = '<p class="muted">Couldn\'t load your account. Try again shortly.</p>';
    return null;
  }
  return res.json();
}

function render(data) {
  document.getElementById("sidebar-username").textContent = data.ign;
  const avatarEl = document.getElementById("sidebar-avatar");
  if (data.avatar_url) {
    avatarEl.textContent = "";
    avatarEl.style.backgroundImage = `url(${data.avatar_url})`;
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
  } else {
    avatarEl.textContent = (data.ign || "?").charAt(0).toUpperCase();
  }

  if (data.is_admin) {
    document.getElementById("admin-nav-category").style.display = "";
  }

  document.getElementById("ov-deposit-balance").textContent = fmt(data.account.deposit_balance);
  document.getElementById("ov-savings-balance").textContent = fmt(data.account.savings_balance);
  document.getElementById("dep-deposit-balance").textContent = fmt(data.account.deposit_balance);
  document.getElementById("sav-savings-balance").textContent = fmt(data.account.savings_balance);

  if (data.savings_rate) {
    const rateLabel = `${Number(data.savings_rate)}% / mo`;
    const ovBadge = document.getElementById("ov-rate-badge");
    const savBadge = document.getElementById("sav-rate-badge");
    ovBadge.textContent = rateLabel;
    ovBadge.style.display = "";
    savBadge.textContent = rateLabel;
    savBadge.style.display = "";
  }

  document.querySelectorAll(".sync-pill").forEach((el) => {
    el.textContent = `Synced ${data.synced_at || "unknown"}`;
  });

  if (data.loans && data.loans.length) {
    const body = document.getElementById("loans-body");
    body.innerHTML = "";
    for (const loan of data.loans) {
      const total = Number(loan.total_obligation || loan.amount || 0);
      const repaid = Number(loan.repaid || 0);
      const pct = total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>$${fmt(loan.amount)}</td>
        <td>$${fmt(loan.weekly_payment)}</td>
        <td>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="muted" style="font-size:0.75rem">${pct}% paid</span>
        </td>
        <td>$${fmt(loan.owed)}</td>
        <td><span class="badge">${loan.next_installment || ""} &middot; ${loan.next_due_date || ""}</span></td>
      `;
      body.appendChild(tr);
    }
    document.getElementById("loans-card").style.display = "";
  }

  const history = (data.account.history || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  renderRecentActivity(history);
  renderHistoryRows(
    document.getElementById("deposit-history-body"),
    document.getElementById("deposit-history-empty"),
    history.filter((h) => h.account_type === "Deposit")
  );
  renderHistoryRows(
    document.getElementById("savings-history-body"),
    document.getElementById("savings-history-empty"),
    history.filter((h) => h.account_type === "Savings")
  );
  renderHistoryRows(
    document.getElementById("full-history-body"),
    document.getElementById("full-history-empty"),
    history
  );

  document.getElementById("loading").style.display = "none";
  document.getElementById("content").style.display = "";
}

let statusHideTimer = null;

function showStatus(message, ok) {
  const el = document.getElementById("action-status");
  el.textContent = message;
  el.className = `status-msg ${ok ? "ok" : "err"}`;
  clearTimeout(statusHideTimer);
  statusHideTimer = setTimeout(() => {
    el.className = "";
    el.textContent = "";
  }, 6000);
}

async function submitAction(payload, formEl) {
  // Disabling the submit button immediately (not just awaiting the
  // request) is the actual double-click guard - a fresh idempotency key is
  // minted per request server-side specifically so retries of genuinely
  // separate submissions aren't silently merged, which means a double-click
  // wouldn't be caught by that mechanism and needs to be stopped here.
  const buttons = formEl ? formEl.querySelectorAll("button") : [];
  buttons.forEach((b) => (b.disabled = true));
  try {
    const res = await fetch("/api/actions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showStatus(body.error || "Something went wrong.", false);
      return;
    }
    let message;
    if (body.instant) {
      message = "Done - sent instantly. Your balance below is already up to date.";
    } else if (payload.type === "withdraw_savings") {
      message = "Request submitted - needs the owner's approval before anything is paid out. Your balance won't change until then.";
    } else {
      message = "Done - your balance below is updated. Fully settles with the bot within about a minute.";
    }
    showStatus(message, true);
    const data = await loadPortalData();
    if (data) render(data);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

document.getElementById("withdraw-deposit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = document.getElementById("withdraw-deposit-amount").value;
  await submitAction({ type: "withdraw_deposit", amount }, e.target);
});

document.getElementById("withdraw-savings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = document.getElementById("withdraw-savings-amount").value;
  await submitAction({ type: "withdraw_savings", amount }, e.target);
});

document.getElementById("claim-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const account_type = document.getElementById("claim-account-type").value;
  await submitAction({ type: "claim_deposit", account_type }, e.target);
});

// ---------- Tab switching ----------

function switchTab(tab) {
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((el) => el.classList.toggle("active", el.dataset.panel === tab));
  closeSidebar();
}

document.querySelectorAll(".nav-link").forEach((el) => {
  el.addEventListener("click", () => switchTab(el.dataset.tab));
});

document.querySelectorAll(".goto-tab").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab(el.dataset.tab);
  });
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

loadPortalData().then((data) => {
  if (data) render(data);
});
