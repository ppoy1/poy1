// Turns a plot code (e.g. "C258", "AV-C022", "or-c081") into a price
// estimate, using the zone/district price index built from real closed
// #realestate auctions (see PoyBankBot's build_market_snapshot). There's no
// public database of every plot on the server, so this infers the zone from
// the plot's naming convention instead of looking it up - DemocracyCraft's
// plot codes are prefixed by zone (R### = Residential, C### = Commercial,
// S### = Skyscraper, I### = Industrial) or by district for named towns
// (AV- = Aventura, WL- = Willow, OR- = Oakridge), with an inner letter
// sometimes indicating the zone within that district.

const DISTRICT_PREFIXES = { AV: "Aventura", WL: "Willow", OR: "Oakridge" };
const SUB_ZONE_LETTERS = { C: "Commercial", R: "Residential", S: "Skyscraper" };
const ZONE_PREFIXES = { R: "Residential", C: "Commercial", S: "Skyscraper", I: "Industrial" };

export function inferZoneFromCode(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();

  const districtMatch = code.match(/^(AV|WL|OR)-?([A-Z])?\d/);
  if (districtMatch) {
    const district = DISTRICT_PREFIXES[districtMatch[1]];
    const zone = districtMatch[2] ? SUB_ZONE_LETTERS[districtMatch[2]] || null : null;
    return { zone, district };
  }

  const zoneMatch = code.match(/^([RCSI])\d/);
  if (zoneMatch) {
    return { zone: ZONE_PREFIXES[zoneMatch[1]], district: null };
  }

  return { zone: null, district: null };
}

export function estimateForCode(rawCode, snapshot) {
  const { zone, district } = inferZoneFromCode(rawCode);
  const zoneStats = zone ? snapshot.zone_stats?.[zone] : null;
  const districtStats = district ? snapshot.location_stats?.[district] : null;
  const overallStats = snapshot.overall_stats?.All;

  let stats = zoneStats || districtStats || overallStats || null;
  let basis = zoneStats ? "zone" : districtStats ? "district" : overallStats ? "overall" : "none";

  const comparableSales = (snapshot.sales || []).filter((s) => {
    if (zone && s.zone === zone) return true;
    if (!zone && district && s.location === district) return true;
    return false;
  }).slice(0, 8);

  return {
    code: (rawCode || "").trim().toUpperCase(),
    zone,
    district,
    basis,
    stats,
    comparable_sales: stats ? comparableSales : [],
  };
}
