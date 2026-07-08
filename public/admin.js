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
