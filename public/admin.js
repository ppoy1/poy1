function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  document.getElementById("sidebar-avatar").textContent = (data.admin_username || "?").charAt(0).toUpperCase();

  document.getElementById("total-deposits").textContent = fmt(data.summary?.total_deposits_held);
  document.getElementById("total-loans").textContent = fmt(data.summary?.total_loans_outstanding);
  const clients = data.clients || {};
  document.getElementById("client-count").textContent = Object.keys(clients).length;

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
  renderReports(data);

  const loansBody = document.getElementById("loans-body");
  loansBody.innerHTML = "";
  for (const loan of data.loans || []) {
    const total = Number(loan.total_obligation || loan.amount || 0);
    const repaid = Number(loan.repaid || 0);
    const pct = total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${loan.minecraft_ign || loan.borrower_name || ""}</td>
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

// ---------- Reports ----------

let reportsClients = {};

function renderReports(data) {
  const bs = data.bank_summary || {};
  document.getElementById("rep-deposits-lifetime").textContent = fmt(bs.deposits_lifetime);
  document.getElementById("rep-withdrawals-lifetime").textContent = fmt(bs.withdrawals_lifetime);
  document.getElementById("rep-loans-given").textContent = fmt(bs.loans_given_lifetime);
  document.getElementById("rep-loan-repayments").textContent = fmt(bs.loan_repayments_lifetime);
  document.getElementById("rep-loans-outstanding").textContent = fmt(bs.current_loans_outstanding_total);
  document.getElementById("rep-penalty-revenue").textContent = fmt(bs.penalty_revenue_lifetime);

  reportsClients = data.clients || {};
  renderUnverifiedClients(reportsClients, data.account_links || {});
  renderEmployees(data.employees || {});
  renderTransactions(data.recent_transactions || []);
  populateSavingsDetailSelect(reportsClients);
}

function renderUnverifiedClients(clients, accountLinks) {
  const body = document.getElementById("unverified-body");
  const empty = document.getElementById("unverified-empty");
  const verifiedIgns = new Set(Object.values(accountLinks).map((ign) => (ign || "").toLowerCase()));

  const flagged = Object.entries(clients).filter(([ign, c]) => {
    const hasBalance = Number(c.deposit_balance || 0) > 0 || Number(c.savings_balance || 0) > 0;
    return hasBalance && !verifiedIgns.has((c.display_name || ign).toLowerCase());
  });

  body.innerHTML = "";
  if (!flagged.length) {
    empty.style.display = "";
  } else {
    empty.style.display = "none";
    flagged
      .sort((a, b) => (Number(b[1].deposit_balance) + Number(b[1].savings_balance)) - (Number(a[1].deposit_balance) + Number(a[1].savings_balance)))
      .forEach(([ign, client]) => body.appendChild(clientRow(ign, client)));
  }
}

function renderEmployees(employees) {
  const body = document.getElementById("employees-body");
  const empty = document.getElementById("employees-empty");
  const entries = Object.entries(employees);

  body.innerHTML = "";
  if (!entries.length) {
    empty.style.display = "";
  } else {
    empty.style.display = "none";
    for (const [discordId, emp] of entries) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${emp.display_name || discordId}${emp.ign ? ` <span class="muted">(${emp.ign})</span>` : ""}</td>
        <td>$${fmt(emp.salary)}</td>
        <td>${emp.payday ?? ""}</td>
        <td>${emp.last_paid || "never"}</td>
      `;
      body.appendChild(tr);
    }
  }
}

function renderTransactions(transactions) {
  const body = document.getElementById("transactions-body");
  const empty = document.getElementById("transactions-empty");

  body.innerHTML = "";
  if (!transactions.length) {
    empty.style.display = "";
  } else {
    empty.style.display = "none";
    for (const txn of transactions) {
      const amount = Number(txn.amount || 0);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="muted-cell">${txn.date || ""}</td>
        <td>${txn.counterparty || ""}</td>
        <td>${amount < 0 ? "-" : "+"}$${fmt(Math.abs(amount))}</td>
      `;
      body.appendChild(tr);
    }
  }
}

function populateSavingsDetailSelect(clients) {
  const select = document.getElementById("savings-detail-select");
  const previous = select.value;
  const igns = Object.keys(clients).sort((a, b) => a.localeCompare(b));

  select.innerHTML = '<option value="">Select a client...</option>' + igns.map((ign) => `<option value="${ign}">${clients[ign].display_name || ign}</option>`).join("");
  if (igns.includes(previous)) select.value = previous;
  renderSavingsDetail(select.value);
}

function renderSavingsDetail(ign) {
  const body = document.getElementById("savings-detail-body");
  const empty = document.getElementById("savings-detail-empty");
  body.innerHTML = "";

  const client = ign ? reportsClients[ign] : null;
  const deposits = client?.savings_deposits || [];
  if (!client || !deposits.length) {
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  const now = Date.now();
  [...deposits]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((d) => {
      const depositedAt = new Date(d.date);
      const heldMs = now - depositedAt.getTime();
      const heldDays = Math.floor(heldMs / (1000 * 60 * 60 * 24));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="muted-cell">${Number.isNaN(depositedAt.getTime()) ? d.date : depositedAt.toLocaleString()}</td>
        <td>$${fmt(d.amount)}</td>
        <td>${Number.isNaN(heldMs) ? "" : `${heldDays} day(s)`}</td>
      `;
      body.appendChild(tr);
    });
}

document.getElementById("savings-detail-select").addEventListener("change", (e) => {
  renderSavingsDetail(e.target.value);
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
