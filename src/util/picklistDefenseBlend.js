/** Tunable: defense raw is multiplied by (BASE + SPAN * (avgManeuver / 5)); avg 0 → BASE, avg 5 → BASE+SPAN. */
export const DEFENSE_MANEUVER_MULT_BASE = 0.5;
export const DEFENSE_MANEUVER_MULT_SPAN = 0.5;
export const MANEUVER_RATING_MAX = 5;

/**
 * Mean maneuverability per team from scout rows (0–5 scale; -1 / null / NaN skipped).
 * @returns {Record<string|number, number>} team -> average (only teams with ≥1 valid rating)
 */
export function avgManeuverabilityByTeam(rows) {
  const acc = {};
  for (const row of rows) {
    const team = row.team;
    const v = Number(row.maneuverability);
    if (!Number.isFinite(v) || v < 0) continue;
    if (!acc[team]) acc[team] = { sum: 0, n: 0 };
    acc[team].sum += Math.min(MANEUVER_RATING_MAX, v);
    acc[team].n += 1;
  }
  const out = {};
  for (const team of Object.keys(acc)) {
    const { sum, n } = acc[team];
    if (n > 0) out[team] = sum / n;
  }
  return out;
}

/**
 * Multiplier applied to raw defense. If no valid team maneuver average, returns 1 (no penalty).
 */
export function maneuverDefenseMultiplier(maneuverAvg) {
  if (maneuverAvg === undefined || maneuverAvg === null || !Number.isFinite(maneuverAvg)) {
    return 1;
  }
  const clamped = Math.max(0, Math.min(MANEUVER_RATING_MAX, maneuverAvg));
  return DEFENSE_MANEUVER_MULT_BASE + DEFENSE_MANEUVER_MULT_SPAN * (clamped / MANEUVER_RATING_MAX);
}

export function defenseWithManeuverBlend(defenseRaw, maneuverAvg) {
  return defenseRaw * maneuverDefenseMultiplier(maneuverAvg);
}

/** Blend raw per-team defense map with team maneuver averages (same keys as teamDefenseMap). */
export function blendDefenseMapWithManeuver(teamDefenseMap, maneuverAvgByTeam) {
  const out = {};
  for (const team of Object.keys(teamDefenseMap)) {
    out[team] = defenseWithManeuverBlend(
      teamDefenseMap[team],
      maneuverAvgByTeam[team]
    );
  }
  return out;
}
