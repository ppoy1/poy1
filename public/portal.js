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

function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function render(data) {
  document.getElementById("greeting").textContent = `Welcome, ${data.ign}`;
  document.getElementById("deposit-balance").textContent = fmt(data.account.deposit_balance);
  document.getElementById("savings-balance").textContent = fmt(data.account.savings_balance);
  document.getElementById("synced-at").textContent = `Last synced: ${data.synced_at || "unknown"}`;

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

loadPortalData().then((data) => {
  if (data) render(data);
});
