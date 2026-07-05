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

// DemocracyCraft's actual main-spawn coordinates on the Reveille map -
// confirms distance is a real, computable signal whenever a plot's x/z is
// known, without needing a parcel database.
const SPAWN = { x: 2734, z: 4152 };

export function distanceFromSpawn(x, z) {
  return Math.round(Math.hypot(Number(x) - SPAWN.x, Number(z) - SPAWN.z));
}

// Hand-entered reference sales (not from the bot's automated #realestate
// sync - these are anecdotal examples passed along manually). Shown as
// context only, never blended into the statistical estimate below: two
// data points isn't enough to safely fit a distance/land-size curve, and a
// fabricated formula from that little evidence would be less honest than
// just showing the raw comps.
const MANUAL_REFERENCE_SALES = [
  { code: "C256", zone: "Commercial", land_area: 2100, distance_from_spawn: 200, price: 100000 },
  { code: "C233", zone: "Commercial", land_area: 3000, distance_from_spawn: 300, price: 95000 },
];

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

export function estimateForCode(rawCode, snapshot, options = {}) {
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

  const landArea = options.landArea ? Number(options.landArea) : null;
  const hasCoords = options.x != null && options.z != null && options.x !== "" && options.z !== "";
  const distance = hasCoords ? distanceFromSpawn(options.x, options.z) : null;

  const referenceSales = zone
    ? MANUAL_REFERENCE_SALES.filter((r) => r.zone === zone)
    : [];

  return {
    code: (rawCode || "").trim().toUpperCase(),
    zone,
    district,
    basis,
    stats,
    comparable_sales: stats ? comparableSales : [],
    land_area: landArea,
    distance_from_spawn: distance,
    reference_sales: referenceSales,
  };
}
