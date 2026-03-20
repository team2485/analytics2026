import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';
import { tidy, mutate, select, summarizeAll, groupBy, summarize } from '@tidyjs/tidy';
import { calcAuto, calcEPA } from "@/util/calculations";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows: rawRows } = await sql`SELECT * FROM sdd2026;`;
    const rows = rawRows.filter(
      (row) => !row.noshow && row.team != null && row.team !== '' && Number(row.team) > 0
    );

    // Consistency from EPA variance + breakdown rate (no L1–L4)
    const teamConsistencyMap = Object.fromEntries(
      tidy(rows, groupBy(['team'], [
        summarize({
          consistency: (arr) => {
            const uniqueMatches = new Set(arr.map((row) => row.match));
            const uniqueBreakdownCount = Array.from(uniqueMatches).filter((match) =>
              arr.some((row) => row.match === match && row.breakdowncomments && row.breakdowncomments.trim() !== '')
            ).length;
            const breakdownRate = uniqueMatches.size > 0 ? (uniqueBreakdownCount / uniqueMatches.size) * 100 : 0;
            const epaValues = arr.map((row) => calcEPA(row)).filter((v) => typeof v === 'number' && !isNaN(v));
            const meanVal = epaValues.length ? epaValues.reduce((a, b) => a + b, 0) / epaValues.length : 0;
            const variance = epaValues.length ? epaValues.reduce((sum, v) => sum + Math.pow(v - meanVal, 2), 0) / epaValues.length : 0;
            const epaStdDev = Math.sqrt(variance);
            const raw = 100 - (breakdownRate + epaStdDev);
            return raw < 0 ? 1 : raw;
          },
        }),
      ])).map((d) => [d.team, d.consistency])
    );

    const columns = rawRows.length > 0 ? Object.keys(rawRows[0]).sort() : [];
    const firstRow = rawRows[0] || null;
    const sampleRow = firstRow
      ? Object.fromEntries(
          columns.map((k) => [k, firstRow[k] == null ? null : String(firstRow[k]).slice(0, 80)])
        )
      : null;

    function averageField(index) {
      if (['breakdown', 'leave', 'noshow'].includes(index)) return (arr) => arr.some((row) => row[index] === true);
      if (['scoutname', 'generalcomments', 'breakdowncomments', 'defensecomments'].includes(index)) return (arr) => arr.map((row) => row[index]).join(', ');
      const validValues = (arr) => arr.map((row) => row[index]).filter((val) => val != null && !isNaN(val));
      return (arr) => (validValues(arr).length > 0 ? validValues(arr).reduce((sum, v) => sum + v, 0) / validValues(arr).length : 0);
    }

    // DB values may come back as booleans, or as strings like "true"/"false".
    const isTrue = (v) => v === true || v === "true" || v === 1 || v === "1";
    const parseDefenseType = (v) => {
      const n = Number(v);
      return n === 0 || n === 1 || n === 2 ? n : null;
    };

    let teamTable = tidy(rows, groupBy(['team', 'match'], [summarizeAll(averageField)]));
    teamTable = tidy(teamTable, groupBy(['team'], [summarizeAll(averageField)]));

    const matchGroupedByTeam = rows.reduce((acc, row) => {
      const team = row.team;
      const match = row.match;
      if (!acc[team]) acc[team] = {};
      if (!acc[team][match]) acc[team][match] = [];
      acc[team][match].push(row);
      return acc;
    }, {});

    const last3EPAMap = {};
    for (const team in matchGroupedByTeam) {
      const matches = Object.entries(matchGroupedByTeam[team])
        .map(([matchNum, matchRows]) => {
          const avgEpa = matchRows.reduce((sum, row) => sum + calcEPA(row), 0) / matchRows.length;
          return { match: parseInt(matchNum, 10), avgEpa };
        })
        .sort((a, b) => b.match - a.match)
        .slice(0, 3);
      const avgOfLast3 = matches.length > 0 ? matches.reduce((sum, m) => sum + (Number(m.avgEpa) || 0), 0) / matches.length : 0;
      last3EPAMap[team] = typeof avgOfLast3 === 'number' && !isNaN(avgOfLast3) ? avgOfLast3 : 0;
    }

    // Fuel: autofuel + telefuel per match (SCC / 2026 style; no L1–L4)
    const teamFuelMap = {};
    rows.forEach((row) => {
      const team = row.team;
      if (!teamFuelMap[team]) teamFuelMap[team] = { sum: 0, count: 0 };
      const f = (Number(row.autofuel) || 0) + (Number(row.telefuel) || 0);
      teamFuelMap[team].sum += f;
      teamFuelMap[team].count += 1;
    });
    const teamFuelAvg = {};
    Object.keys(teamFuelMap).forEach((team) => {
      const t = teamFuelMap[team];
      teamFuelAvg[team] = t.count > 0 ? t.sum / t.count : 0;
    });

    const towerPointsFromRow = (row) => {
      if (row.endclimbposition != null && row.endclimbposition !== undefined) {
        const level = Number(row.endclimbposition) % 3;
        if (level === 0) return 30;
        if (level === 1) return 20;
        if (level === 2) return 10;
        return 0;
      }
      const loc = Math.round(Number(row.endlocation) || 0);
      if (loc === 2) return 6;
      if (loc === 3) return 12;
      return 0;
    };
    const teamTowerMap = {};
    rows.forEach((row) => {
      const team = row.team;
      if (!teamTowerMap[team]) teamTowerMap[team] = { sum: 0, count: 0 };
      teamTowerMap[team].sum += towerPointsFromRow(row);
      teamTowerMap[team].count += 1;
    });
    const teamTowerAvg = {};
    Object.keys(teamTowerMap).forEach((team) => {
      const t = teamTowerMap[team];
      teamTowerAvg[team] = t.count > 0 ? t.sum / t.count : 0;
    });

    const teamPassingMap = {};
    rows.forEach((row) => {
      const team = row.team;
      if (!teamPassingMap[team]) teamPassingMap[team] = { withPassing: 0, total: 0 };
      teamPassingMap[team].total += 1;
      if (row.passingbulldozer || row.passingshooter || row.passingdump) teamPassingMap[team].withPassing += 1;
    });
    const teamPassingPct = {};
    Object.keys(teamPassingMap).forEach((team) => {
      const t = teamPassingMap[team];
      teamPassingPct[team] = t.total > 0 ? (t.withPassing / t.total) * 100 : 0;
    });

    // Defense (match-level, then averaged to team-level) to match compute-picklist.
    const teamMatchDefense = {};
    let maxFoulsMatch = 0;

    rows.forEach((row) => {
      const team = row.team;
      const match = row.match;
      if (!teamMatchDefense[team]) teamMatchDefense[team] = {};
      if (!teamMatchDefense[team][match]) {
        teamMatchDefense[team][match] = {
          played: false,
          defenseTypes: [],
          foulsSum: 0,
          foulsCount: 0,
          foulsMean: 0,
        };
      }

      const entry = teamMatchDefense[team][match];
      const played = isTrue(row.defenseplayed ?? row.playeddefense);
      if (played) entry.played = true;

      const defenseType = parseDefenseType(row.defense);
      if (played && defenseType !== null) {
        entry.defenseTypes.push(defenseType);
      }

      const f = Number(row.fouls);
      entry.foulsSum += Number.isFinite(f) ? Math.abs(f) : 0;
      entry.foulsCount += 1;
    });

    for (const team in teamMatchDefense) {
      for (const match in teamMatchDefense[team]) {
        const entry = teamMatchDefense[team][match];
        entry.foulsMean = entry.foulsCount > 0 ? entry.foulsSum / entry.foulsCount : 0;
        if (entry.foulsMean > maxFoulsMatch) maxFoulsMatch = entry.foulsMean;
      }
    }

    const teamDefenseMap = {};
    for (const team in teamMatchDefense) {
      let sum = 0;
      let count = 0;
      for (const match in teamMatchDefense[team]) {
        const entry = teamMatchDefense[team][match];

        let baseScore = 0;
        if (entry.played) {
          const type = entry.defenseTypes.length ? Math.max(...entry.defenseTypes) : 0;
          if (type === 0) baseScore = 1;
          else if (type === 1) baseScore = 5;
          else if (type === 2) baseScore = 10;
          else baseScore = 1;
        }

        const foulRate = maxFoulsMatch > 0 ? Math.abs(entry.foulsMean ?? 0) / maxFoulsMatch : 0;
        const defenseMatch = baseScore * (1 - foulRate);
        sum += defenseMatch;
        count += 1;
      }
      teamDefenseMap[team] = count > 0 ? sum / count : 0;
    }

    teamTable = tidy(teamTable, mutate({
      auto: (d) => calcAuto(d),
      epa: (d) => calcEPA(d),
      last3epa: (d) => last3EPAMap[d.team] || 0,
      fuel: (d) => teamFuelAvg[d.team] ?? 0,
      tower: (d) => teamTowerAvg[d.team] ?? 0,
      passing: (d) => teamPassingPct[d.team] ?? 0,
      defense: (d) => teamDefenseMap[d.team] ?? 0,
      consistency: (d) => teamConsistencyMap[d.team] ?? 0,
    }), select(['team', 'epa', 'last3epa', 'fuel', 'tower', 'passing', 'defense', 'auto', 'consistency']));

    const matchCountByTeam = rows.reduce((acc, row) => {
      const t = String(row.team);
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const teams = teamTable.map((d) => ({
      team: d.team,
      matchCount: matchCountByTeam[String(d.team)] || 0,
      raw: {
        epa: Math.round((d.epa || 0) * 100) / 100,
        auto: Math.round((d.auto || 0) * 100) / 100,
        last3epa: Math.round((d.last3epa || 0) * 100) / 100,
        fuel: Math.round((d.fuel || 0) * 100) / 100,
        tower: Math.round((d.tower || 0) * 100) / 100,
        defense: Math.round((d.defense || 0) * 100) / 100,
        passing: Math.round((d.passing || 0) * 100) / 100,
        consistency: Math.round((d.consistency || 0) * 100) / 100,
      },
    }));

    const maxes = teams.length ? teams.reduce((acc, t) => {
      Object.keys(t.raw).forEach((k) => {
        acc[k] = Math.max(acc[k] ?? 0, t.raw[k] ?? 0);
      });
      return acc;
    }, {}) : {};

    return NextResponse.json(
      {
        message: 'Picklist verification: raw values from DB. UI shows each value / max (0–1).',
        totalRowsInDb: rawRows.length,
        rowsAfterFilter: rows.length,
        invalidTeamsExcluded: rawRows.length - rows.length,
        columns,
        sampleRow,
        maxes,
        teams,
        howToCompare: 'For each team, UI value ≈ raw[metric] / maxes[metric]. Example: if team 2488 has raw.epa 45 and maxes.epa 45, UI EPA = 1.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify picklist error:', error);
    return NextResponse.json({ error: String(error.message) }, { status: 500 });
  }
}
