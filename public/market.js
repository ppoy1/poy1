function fmt(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statCard(label, stats) {
  const div = document.createElement("div");
  div.className = "stat-card good";
  div.innerHTML = `
    <h2>${label}</h2>
    <div class="balance-amount">$${fmt(stats.median)}</div>
    <p class="field-hint">median of ${stats.count} sale${stats.count === 1 ? "" : "s"} &middot; range $${fmt(stats.min)}-$${fmt(stats.max)}</p>
  `;
  return div;
}

function render(data) {
  document.getElementById("synced-at").textContent = `Synced ${data.generated_at || "unknown"}`;

  const zoneGrid = document.getElementById("zone-grid");
  const zoneEntries = Object.entries(data.zone_stats || {});
  if (!zoneEntries.length) {
    document.getElementById("zone-card").style.display = "none";
  } else {
    zoneGrid.innerHTML = "";
    for (const [zone, stats] of zoneEntries) zoneGrid.appendChild(statCard(zone, stats));
  }

  const locationGrid = document.getElementById("location-grid");
  const locationEntries = Object.entries(data.location_stats || {});
  if (!locationEntries.length) {
    document.getElementById("location-card").style.display = "none";
  } else {
    locationGrid.innerHTML = "";
    for (const [loc, stats] of locationEntries) locationGrid.appendChild(statCard(loc, stats));
  }

  const body = document.getElementById("sales-body");
  const empty = document.getElementById("sales-empty");
  const sales = data.sales || [];
  body.innerHTML = "";
  if (!sales.length) {
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  for (const s of sales) {
    const multiplier = s.starting_bid ? `${(s.final_price / s.starting_bid).toFixed(1)}x` : "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name || ""}</td>
      <td>${s.zone || ""}</td>
      <td>${s.location || ""}</td>
      <td>${s.starting_bid ? "$" + fmt(s.starting_bid) : "-"}</td>
      <td>$${fmt(s.final_price)}</td>
      <td><span class="badge badge-good">${multiplier}</span></td>
      <td class="muted-cell">${fmtDate(s.created_at)}</td>
    `;
    body.appendChild(tr);
  }
}

async function loadMarketData() {
  const res = await fetch("/api/market/data");
  if (!res.ok) {
    document.getElementById("zone-card").innerHTML = '<p class="muted">No market data yet - the bot syncs this every 30 minutes, check back shortly.</p>';
    document.getElementById("location-card").style.display = "none";
    return null;
  }
  return res.json();
}

loadMarketData().then((data) => {
  if (data) render(data);
});
