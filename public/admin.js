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
