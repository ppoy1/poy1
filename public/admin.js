function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadAdminData() {
  const res = await fetch("/api/admin/data");
  if (res.status === 401) {
    window.location.href = "/admin-login.html";
    return null;
  }
  if (!res.ok) {
    document.getElementById("loading").textContent = "Couldn't load bank data. Try again shortly.";
    return null;
  }
  return res.json();
}

function render(data) {
  document.getElementById("total-deposits").textContent = fmt(data.summary?.total_deposits_held);
  document.getElementById("total-loans").textContent = fmt(data.summary?.total_loans_outstanding);
  document.getElementById("synced-at").textContent = `Last synced: ${data.synced_at || "unknown"}`;

  const clientsBody = document.getElementById("clients-body");
  clientsBody.innerHTML = "";
  for (const [ign, client] of Object.entries(data.clients || {})) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${client.display_name || ign}</td>
      <td>$${fmt(client.deposit_balance)}</td>
      <td>$${fmt(client.savings_balance)}</td>
    `;
    clientsBody.appendChild(tr);
  }

  const loansBody = document.getElementById("loans-body");
  loansBody.innerHTML = "";
  for (const loan of data.loans || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${loan.minecraft_ign || loan.borrower_name || ""}</td>
      <td>$${fmt(loan.amount)}</td>
      <td>$${fmt(loan.weekly_payment)}</td>
      <td>$${fmt(loan.owed)}</td>
      <td>${loan.next_installment || ""} - ${loan.next_due_date || ""}</td>
    `;
    loansBody.appendChild(tr);
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("content").style.display = "";
}

loadAdminData().then((data) => {
  if (data) render(data);
});
