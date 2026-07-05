function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtWhole(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
  document.getElementById("sidebar-avatar").textContent = (data.ign || "?").charAt(0).toUpperCase();

  if (data.is_admin) {
    document.getElementById("admin-nav-category").style.display = "";
  }

  document.getElementById("ov-deposit-balance").textContent = fmt(data.account.deposit_balance);
  document.getElementById("ov-savings-balance").textContent = fmt(data.account.savings_balance);
  document.getElementById("dep-deposit-balance").textContent = fmt(data.account.deposit_balance);
  document.getElementById("sav-savings-balance").textContent = fmt(data.account.savings_balance);

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

function showStatus(message, ok) {
  const el = document.getElementById("action-status");
  el.textContent = message;
  el.className = `status-msg ${ok ? "ok" : "err"}`;
}

async function submitAction(payload) {
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
  showStatus(
    "Request submitted - it's processed by the bot within about a minute. Refresh in a bit to see the updated balance.",
    true
  );
}

document.getElementById("withdraw-deposit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = document.getElementById("withdraw-deposit-amount").value;
  await submitAction({ type: "withdraw_deposit", amount });
});

document.getElementById("withdraw-savings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = document.getElementById("withdraw-savings-amount").value;
  await submitAction({ type: "withdraw_savings", amount });
});

document.getElementById("claim-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const account_type = document.getElementById("claim-account-type").value;
  await submitAction({ type: "claim_deposit", account_type });
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

// ---------- Market ----------

function marketStatCard(label, stats) {
  const div = document.createElement("div");
  div.className = "stat-card good";
  div.innerHTML = `
    <h2>${label}</h2>
    <div class="balance-amount">$${fmtWhole(stats.median)}</div>
    <p class="field-hint">median of ${stats.count} sale${stats.count === 1 ? "" : "s"} &middot; range $${fmtWhole(stats.min)}-$${fmtWhole(stats.max)}</p>
  `;
  return div;
}

function renderMarket(data) {
  document.getElementById("market-synced-at").textContent = `Synced ${data.generated_at || "unknown"}`;

  const zoneGrid = document.getElementById("market-zone-grid");
  const zoneEntries = Object.entries(data.zone_stats || {});
  zoneGrid.innerHTML = "";
  if (!zoneEntries.length) {
    document.getElementById("market-zone-card").style.display = "none";
  } else {
    document.getElementById("market-zone-card").style.display = "";
    for (const [zone, stats] of zoneEntries) zoneGrid.appendChild(marketStatCard(zone, stats));
  }

  const body = document.getElementById("market-sales-body");
  const empty = document.getElementById("market-sales-empty");
  const sales = data.sales || [];
  body.innerHTML = "";
  if (!sales.length) {
    empty.style.display = "";
  } else {
    empty.style.display = "none";
    for (const s of sales.slice(0, 20)) {
      const multiplier = s.starting_bid ? `${(s.final_price / s.starting_bid).toFixed(1)}x` : "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.plot_code || s.name || ""}</td>
        <td>${s.zone || ""}</td>
        <td>${s.location || ""}</td>
        <td>${s.starting_bid ? "$" + fmtWhole(s.starting_bid) : "-"}</td>
        <td>$${fmtWhole(s.final_price)}</td>
        <td><span class="badge badge-good">${multiplier}</span></td>
      `;
      body.appendChild(tr);
    }
  }
}

async function loadMarketData() {
  const res = await fetch("/api/market/data");
  if (!res.ok) {
    document.getElementById("market-zone-card").style.display = "none";
    document.getElementById("market-sales-empty").textContent = "No market data yet - check back after the bot's next sync.";
    document.getElementById("market-sales-empty").style.display = "";
    return;
  }
  renderMarket(await res.json());
}

document.getElementById("plot-lookup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("plot-lookup-code").value.trim();
  const resultEl = document.getElementById("plot-lookup-result");
  resultEl.innerHTML = '<p class="muted">Looking up...</p>';
  try {
    const res = await fetch(`/api/market/estimate?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) {
      resultEl.innerHTML = `<p class="muted">${data.error || "Something went wrong."}</p>`;
      return;
    }
    if (!data.stats) {
      resultEl.innerHTML = `<p class="muted">Couldn't place <strong>${data.code}</strong> in a known zone or district, and there's no general price data yet.</p>`;
      return;
    }
    const basisLabel = {
      zone: `${data.zone} zone`,
      district: `${data.district} district`,
      overall: "all recent sales (no zone/district match)",
    }[data.basis];
    resultEl.innerHTML = `
      <div class="stat-card good" style="margin-top:12px">
        <h2>${data.code}</h2>
        <div class="balance-amount">$${fmtWhole(data.stats.median)}</div>
        <p class="field-hint">estimated from ${data.stats.count} comparable sale${data.stats.count === 1 ? "" : "s"} in ${basisLabel} &middot; range $${fmtWhole(data.stats.min)}-$${fmtWhole(data.stats.max)}</p>
      </div>
    `;
  } catch {
    resultEl.innerHTML = "<p class=\"muted\">Couldn't reach the estimator. Try again shortly.</p>";
  }
});

loadMarketData();
