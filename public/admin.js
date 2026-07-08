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
      <td style="text-align:right; white-space:nowrap">
        <button class="secondary" data-loan-action="add_late_fine" data-ign="${ign}">Late Fine</button>
        <button class="secondary" data-loan-action="loan_change" data-ign="${ign}">Change Total</button>
        <button class="secondary" data-loan-action="remove_loan" data-ign="${ign}">Remove</button>
      </td>
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

// ---------- Loans management ----------

document.getElementById("add-loan-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch("/api/admin/actions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "add_loan_entry",
        borrower_name: document.getElementById("loan-borrower-name").value,
        minecraft_ign: document.getElementById("loan-ign").value,
        amount: document.getElementById("loan-amount").value,
        weekly_payment: document.getElementById("loan-weekly-payment").value,
        payday: document.getElementById("loan-payday").value,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error || "Something went wrong.");
      return;
    }
    alert("Loan entry submitted - the bot processes this within about a minute.");
    e.target.reset();
  } catch {
    alert("Couldn't reach the server. Try again shortly.");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("loans-body").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-loan-action]");
  if (!btn) return;
  const type = btn.dataset.loanAction;
  const ign = btn.dataset.ign;
  if (!ign) {
    alert("This loan has no Minecraft IGN on record, so it can't be targeted from the website - use Discord for this one.");
    return;
  }

  const payload = { type, minecraft_ign: ign };

  if (type === "add_late_fine") {
    const lateDays = prompt(`How many days late is ${ign}'s payment?`);
    if (lateDays === null) return;
    payload.late_days = Number(lateDays);
    if (!(payload.late_days > 0)) {
      alert("Days late must be a number greater than 0.");
      return;
    }
  } else if (type === "loan_change") {
    const newTotal = prompt(`Set ${ign}'s new total amount owed to:`);
    if (newTotal === null) return;
    payload.new_total_owed = Number(newTotal);
    if (!(payload.new_total_owed > 0)) {
      alert("New total owed must be a number greater than 0.");
      return;
    }
  } else if (type === "remove_loan") {
    if (!confirm(`Remove ${ign}'s loan from the ledger? This can't be undone from the website.`)) return;
  }

  const row = btn.closest("tr");
  row.querySelectorAll("button").forEach((b) => (b.disabled = true));

  try {
    const res = await fetch("/api/admin/actions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error || "Something went wrong.");
      row.querySelectorAll("button").forEach((b) => (b.disabled = false));
      return;
    }
    alert("Submitted - the bot processes this within about a minute.");
    const data = await loadAdminData();
    if (data) render(data);
  } catch {
    alert("Couldn't reach the server. Try again shortly.");
    row.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
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
