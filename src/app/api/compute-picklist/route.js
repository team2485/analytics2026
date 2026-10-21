import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';
import { tidy, mutate, arrange, desc, mean, select, summarizeAll, summarize, max, groupBy } from '@tidyjs/tidy';
import { calcAuto, calcTele, calcEnd, calcEPA } from "@/util/calculations";
import { avgManeuverabilityByTeam, blendDefenseMapWithManeuver } from "@/util/picklistDefenseBlend";

/** Per-scout foul total for defense penalty: major + minor (same scale as legacy single fouls count). */
function foulScalar(row) {
  const major = Math.abs(Number(row.majorfouls));
  const minor = Math.abs(Number(row.minorfouls));
  return (Number.isFinite(major) ? major : 0) + (Number.isFinite(minor) ? minor : 0);
}

export const dynamic = 'force-dynamic'; 

export async function POST(request) {

  const requestBody = await request.json(); 

  let data = await sql`SELECT * FROM dcmp2026;`;

  let rows = data.rows;

  function averageField(index) {
    // Boolean fields - return true if any row has it as true
    if (['noshow', 'intakeground', 'intakeoutpost', 'passingbulldozer', 'passingshooter', 'passingdump', 'shootwhilemove', 'bump', 'trench', 'stuckonfuel', 'stuckonbump', 'playeddefense', 'winauto', 'climbtf', 'wideclimb'].includes(index)) {
      return arr => arr.some(row => row[index] === true);
    }
    // String/Text fields - join with comma
    if (['scoutname', 'generalcomments', 'breakdowncomments', 'defensecomments'].includes(index)) {
      return arr => arr.map(row => row[index]).filter(a => a != null).join(', ') || null;
    }
    // Numeric fields - calculate mean
    const validValues = arr => arr.map(row => row[index]).filter(val => val != null && !isNaN(val));
    return arr => validValues(arr).length > 0 
      ? validValues(arr).reduce((sum, v) => sum + v, 0) / validValues(arr).length 
      : 0;    
  }

  // DB values may come back as booleans, or as strings like "true"/"false".
  const isTrue = (v) => v === true || v === "true" || v === 1 || v === "1";
  const parseDefenseType = (v) => {
    const n = Number(v);
    return n === 0 || n === 1 || n === 2 ? n : null;
  };

  // Pre-process: remove no-shows and invalid teams
  rows = rows.filter(row => !row.noshow && row.team != null && row.team !== '' && Number(row.team) > 0);

  // Calculate consistency per team before summarizing
  const teamConsistencyMap = Object.fromEntries(
    tidy(rows, groupBy(['team'], [
      summarize({
        consistency: arr => {
          const uniqueMatches = new Set(arr.map(row => row.match));
          const uniqueBreakdownCount = Array.from(uniqueMatches).filter(match =>
            arr.some(row => row.match === match && row.breakdowncomments && row.breakdowncomments.trim() !== "")
          ).length;
          const breakdownRate = uniqueMatches.size > 0
            ? (uniqueBreakdownCount / uniqueMatches.size) * 100
            : 0;

          const epaValues = arr.map(row => calcEPA(row)).filter(v => typeof v === 'number' && !isNaN(v));
          const meanVal = epaValues.length ? epaValues.reduce((a, b) => a + b, 0) / epaValues.length : 0;
          const variance = epaValues.length ? epaValues.reduce((sum, v) => sum + Math.pow(v - meanVal, 2), 0) / epaValues.length : 0;
          const epaStdDev = Math.sqrt(variance);

          const raw = 100 - (breakdownRate + epaStdDev);
          return raw < 0 ? 1 : raw;
        }
      })
    ])).map(d => [d.team, d.consistency])
  );

  // Group by team + match first
  let teamTable = tidy(rows, groupBy(['team', 'match'], [summarizeAll(averageField)]));

  // Group by team
  teamTable = tidy(teamTable, groupBy(['team'], [summarizeAll(averageField)]));

  // STEP 1: Calculate last3epa by match grouping
  const last3EPAMap = {};
  const matchGroupedByTeam = rows.reduce((acc, row) => {
    if (!row.noshow) {
      const team = row.team;
      const match = row.match;
      if (!acc[team]) acc[team] = {};
      if (!acc[team][match]) acc[team][match] = [];
      acc[team][match].push(row);
    }
    return acc;
  }, {});

  for (const team in matchGroupedByTeam) {
    const matches = Object.entries(matchGroupedByTeam[team])
      .map(([matchNum, matchRows]) => {
        const avgEpa = matchRows.reduce((sum, row) => sum + calcEPA(row), 0) / matchRows.length;
        return { match: parseInt(matchNum), avgEpa };
      })
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);

    const avgOfLast3 = matches.length > 0
      ? matches.reduce((sum, m) => sum + (Number(m.avgEpa) || 0), 0) / matches.length
      : 0;

    last3EPAMap[team] = (typeof avgOfLast3 === 'number' && !isNaN(avgOfLast3)) ? avgOfLast3 : 0;
  }

  const trimmedepaMap = {};
  for (const team in matchGroupedByTeam) {
    const epaValues = Object.values(matchGroupedByTeam[team])
      .map(matchRows => matchRows.reduce((sum, row) => sum + calcEPA(row), 0) / matchRows.length);
    if (epaValues.length >= 3) {
      epaValues.sort((a, b) => a - b);
      const trimmed = epaValues.slice(1, -1);
      trimmedepaMap[team] = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    } else {
      trimmedepaMap[team] = epaValues.length > 0
        ? epaValues.reduce((a, b) => a + b, 0) / epaValues.length
        : 0;
    }
  }

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

  // Defense: compute at team+match level first, then average into a team-level metric.
  // - defense type is categorical (0/1/2), so we aggregate it with MAX (2>1>0)
  // - foul penalty is applied per match, then averaged
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

    entry.foulsSum += foulScalar(row);
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

  const maneuverAvgByTeam = avgManeuverabilityByTeam(rows);
  const teamDefenseBlendedMap = blendDefenseMapWithManeuver(teamDefenseMap, maneuverAvgByTeam);

  teamTable = tidy(teamTable, mutate({
    auto: d => calcAuto(d),
    epa: d => calcEPA(d),
    last3epa: d => last3EPAMap[d.team] || 0,
    fuel: d => teamFuelAvg[d.team] ?? 0,
    tower: d => teamTowerAvg[d.team] ?? 0,
    passing: d => teamPassingPct[d.team] ?? 0,
    defense: d => teamDefenseBlendedMap[d.team] ?? 0,
    consistency: d => teamConsistencyMap[d.team] ?? 0,
    trimmedepa: d => trimmedepaMap[d.team] ?? 0,
  }), select(['team', 'epa', 'last3epa', 'fuel', 'tower', 'passing', 'defense', 'auto', 'consistency', 'trimmedepa']));

  const getTBARankings = async () => {
    try {
      const response = await fetch(`https://www.thebluealliance.com/api/v3/event/2026cascmp/rankings`, {
        headers: {
          'X-TBA-Auth-Key': process.env.TBA_AUTH_KEY,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.rankings.map(team => ({ teamNumber: team.team_key.replace('frc', ''), rank: team.rank }));
    } catch (error) {
      console.error('Error fetching TBA rankings:', error);
      return [];
    }
  }

  try {
    const tbaRankings = await getTBARankings();
    teamTable = teamTable.map(teamData => {
      const rankedData = tbaRankings.find(rankedTeam => rankedTeam.teamNumber == teamData.team);
      return { ...teamData, tbaRank: rankedData ? rankedData.rank : -1 };
    });
  } catch (error) {
    console.error('Error updating rankings:', error);
  }

  const maxes = tidy(teamTable, summarizeAll(max))[0];
  teamTable = tidy(teamTable, mutate({
    epa: d => (maxes.epa && Number(maxes.epa)) ? d.epa / maxes.epa : 0,
    last3epa: d => (maxes.last3epa && Number(maxes.last3epa)) ? d.last3epa / maxes.last3epa : 0,
    fuel: d => (maxes.fuel && Number(maxes.fuel)) ? d.fuel / maxes.fuel : 0,
    tower: d => (maxes.tower && Number(maxes.tower)) ? d.tower / maxes.tower : 0,
    passing: d => (maxes.passing && Number(maxes.passing)) ? d.passing / maxes.passing : 0,
    defense: d => (maxes.defense && Number(maxes.defense)) ? d.defense / maxes.defense : 0,
    auto: d => (maxes.auto && Number(maxes.auto)) ? d.auto / maxes.auto : 0,
    consistency: d => (maxes.consistency && Number(maxes.consistency)) ? d.consistency / maxes.consistency : 0,
    trimmedepa: d => (maxes.trimmedepa && Number(maxes.trimmedepa)) ? d.trimmedepa / maxes.trimmedepa : 0,
    score: d => requestBody.reduce((sum, [key, weight]) => {
      const value = d[key] ?? 0;
      const num = Number(value);
      return sum + ((!isNaN(num) ? num : 0) * parseFloat(weight));
    }, 0),
  }), arrange(desc('score')));

  return NextResponse.json(teamTable, { status: 200 });
}