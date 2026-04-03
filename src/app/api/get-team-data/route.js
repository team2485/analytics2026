import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';
import _ from 'lodash';
import { tidy, mutate, mean, select, summarizeAll, groupBy, summarize, first, n, median, total, arrange, asc, slice } from '@tidyjs/tidy';
import { calcEPA, calcAuto, calcTele, calcEnd } from "../../../util/calculations.js";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');

  if (!_.isNumber(+team)) {
    return NextResponse.json({ message: "ERROR: Invalid team number" }, { status: 400 });
  }

  // Fetch team data from database
  let data = await sql`SELECT * FROM dcmp2026 WHERE team = ${team};`;
  const rows = data.rows;

  if (rows.length === 0) {
    return NextResponse.json({ message: `ERROR: No data for team ${team}` }, { status: 404 });
  }

  function byAveragingNumbers(index) {
    // Boolean fields - return true if any row has it as true
    if (['noshow', 'intakeground', 'intakeoutpost', 'passingbulldozer', 'passingshooter', 'passingdump', 'shootwhilemove', 'bump', 'trench', 'stuckonfuel', 'stuckonbump', 'playeddefense', 'winauto', 'climbtf', 'wideclimb'].includes(index)) {
      return arr => arr.some(row => row[index] === true);
    }
    // String/Text fields - join with " - "
    if (['scoutname', 'generalcomments', 'breakdowncomments', 'defensecomments', 'foulcomments'].includes(index)) {
      return arr => arr.map(row => row[index]).filter(a => a != null).join(" - ") || null;
    }
    // Integer enum fields - format and join with " - "
    if (['autoclimb', 'autoclimbposition', 'endclimbposition', 'shootingmechanism', 'defense', 'fuelpercent'].includes(index)) {
      return arr => {
        const values = arr.map(row => row[index]).filter(a => a != null);
        if (values.length === 0) return null;
        // Format integers appropriately
        if (index === 'autoclimb') {
          const map = {0: 'None', 1: 'Fail', 2: 'Success'};
          return values.map(v => map[v] || v).join(" - ");
        } else if (index === 'autoclimbposition') {
          const map = {0: 'Left', 1: 'Center', 2: 'Right'};
          return values.map(v => map[v] || v).join(" - ");
        } else if (index === 'endclimbposition') {
          const map = {0: 'LeftL3', 1: 'LeftL2', 2: 'LeftL1', 3: 'CenterL3', 4: 'CenterL2', 5: 'CenterL1', 6: 'RightL3', 7: 'RightL2', 8: 'RightL1'};
          return values.map(v => map[v] || v).join(" - ");
        } else if (index === 'shootingmechanism') {
          const map = {0: 'Static', 1: 'Turret'};
          return values.map(v => map[v] || v).join(" - ");
        } else if (index === 'defense') {
          const map = {0: 'weak', 1: 'harassment', 2: 'game changing'};
          return values.map(v => map[v] || v).join(" - ");
        } else if (index === 'fuelpercent') {
          return values.map(v => `${v}%`).join(" - ");
        }
        return values.join(" - ");
      };
    }
    // Qualitative ratings (0-5 scale, -1 for not rated)
    if (['climbhazard', 'hoppercapacity', 'maneuverability', 'defenseevasion', 'climbspeed', 'fuelspeed', 'passingquantity', 'autodeclimbspeed'].includes(index)) {
      return arr => {
        let filtered = arr.filter(row => row[index] != -1 && row[index] != null).map(row => row[index]);
        return filtered.length === 0 ? -1 : mean(filtered);
      };
    }
    // Numeric fields - calculate mean
    return mean(index);
  }

  function rowsToArray(x, index) {
    return x.map(row => row[index]).filter(val => val != null);
  }

  function percentValue(arr, index, value) {
    return arr.filter(e => e[index] === value).length / arr.length;
  }

  const tbaHeaders = { 'X-TBA-Auth-Key': process.env.TBA_AUTH_KEY, 'Accept': 'application/json' };
  const TBA_EVENT_KEY = '2026dcmp';

  const [teamName, tbaMatchData] = await Promise.all([
    fetch(`https://www.thebluealliance.com/api/v3/team/frc${team}/simple`, { headers: tbaHeaders })
      .then(resp => resp.status === 200 ? resp.json() : null)
      .then(data => data?.nickname ?? "")
      .catch(() => ""),
    fetch(`https://www.thebluealliance.com/api/v3/event/${TBA_EVENT_KEY}/matches`, { headers: tbaHeaders })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []),
  ]);

  /** team -> { [tbaMatchKey]: wonAuto } */
  const winAutoMap = {};
  for (const match of tbaMatchData) {
    if (!match.key || !match.score_breakdown) continue;
    const redAuto = match.score_breakdown.red?.autoPoints
      ?? match.score_breakdown.red?.totalAutoPoints
      ?? match.score_breakdown.red?.auto_points
      ?? 0;
    const blueAuto = match.score_breakdown.blue?.autoPoints
      ?? match.score_breakdown.blue?.totalAutoPoints
      ?? match.score_breakdown.blue?.auto_points
      ?? 0;
    const redWin = redAuto > blueAuto;
    const blueWin = blueAuto > redAuto;
    for (const tk of (match.alliances?.red?.team_keys ?? [])) {
      const t = parseInt(tk.replace('frc', ''), 10);
      if (!winAutoMap[t]) winAutoMap[t] = {};
      winAutoMap[t][match.key] = redWin;
    }
    for (const tk of (match.alliances?.blue?.team_keys ?? [])) {
      const t = parseInt(tk.replace('frc', ''), 10);
      if (!winAutoMap[t]) winAutoMap[t] = {};
      winAutoMap[t][match.key] = blueWin;
    }
  }

  function tbaMatchKeyForScoutRow(row) {
    const m = Number(row.match);
    const mt = Number(row.matchtype ?? row.matchType);
    if (!Number.isFinite(m)) return null;
    if (!Number.isFinite(mt)) return `${TBA_EVENT_KEY}_qm${m}`;
    if (mt === 2) return `${TBA_EVENT_KEY}_qm${m}`;
    if (mt === 1) return `${TBA_EVENT_KEY}_qm${m + 50}`;
    if (mt === 0) return `${TBA_EVENT_KEY}_qm${m + 100}`;
    if (mt === 3) {
      const userElim = m - 150;
      if (userElim <= 0) return null;
      const cands = tbaMatchData.filter(
        (x) =>
          x.comp_level &&
          x.comp_level !== 'qm' &&
          x.match_number === userElim &&
          x.score_breakdown &&
          x.key
      );
      if (cands.length === 1) return cands[0].key;
      return null;
    }
    return `${TBA_EVENT_KEY}_qm${m}`;
  }

  for (const row of rows) {
    const teamNum = Number(row.team);
    const key = tbaMatchKeyForScoutRow(row);
    const fromTba = key != null ? winAutoMap[teamNum]?.[key] : undefined;
    if (fromTba !== undefined) row.winauto = fromTba;
  }

  let teamTable = tidy(rows, mutate({
    auto: rec => calcAuto(rec),
    tele: rec => calcTele(rec),
    end: rec => calcEnd(rec),
    epa: rec => calcEPA(rec) // Ensure EPA is using the correct calculation
}));

  const matchesScouted = new Set(teamTable.map(row => row.match)).size;

  function standardDeviation(arr, key) {
      const values = arr.map(row => row[key]).filter(v => typeof v === 'number' && !isNaN(v));
    
      if (values.length === 0) return 0;
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return stdDev;
    }
    
    let returnObject = tidy(teamTable, 
      summarize({
        team: first('team'),
        name: () => teamName,
        
        // Fixed avgEpa calculation that averages by match first
        avgEpa: arr => {
          // Get unique matches and their average EPA
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.epa;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgEpa: data.sum / data.count
          }));
          
          if (matchAverages.length === 0) return 0;
          return matchAverages.reduce((sum, m) => sum + m.avgEpa, 0) / matchAverages.length;
        },
        
        // Fixed avgAuto calculation that averages by match first
        avgAuto: arr => {
          // Get unique matches and their average Auto
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.auto;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgAuto: data.sum / data.count
          }));
          
          if (matchAverages.length === 0) return 0;
          return matchAverages.reduce((sum, m) => sum + m.avgAuto, 0) / matchAverages.length;
        },
        
        // Fixed avgTele calculation that averages by match first
        avgTele: arr => {
          // Get unique matches and their average Tele
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.tele;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgTele: data.sum / data.count
          }));
          
          if (matchAverages.length === 0) return 0;
          return matchAverages.reduce((sum, m) => sum + m.avgTele, 0) / matchAverages.length;
        },
        
        // Fixed avgEnd calculation that averages by match first
        avgEnd: arr => {
          // Get unique matches and their average End
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.end;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgEnd: data.sum / data.count
          }));
          
          if (matchAverages.length === 0) return 0;
          return matchAverages.reduce((sum, m) => sum + m.avgEnd, 0) / matchAverages.length;
        },
    
        // Last 3 averages - keeping your existing functions
        last3Epa: arr => {
          // Get unique matches and their average EPA
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.epa;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgEpa: data.sum / data.count
          }));
          
          // Sort by match number (descending) and take last 3
          const latest3Matches = matchAverages.sort((a, b) => b.match - a.match).slice(0, 3);
          
          if (latest3Matches.length === 0) return 0;
          return latest3Matches.reduce((sum, m) => sum + m.avgEpa, 0) / latest3Matches.length;
        },
    
        last3Auto: arr => {
          // Get unique matches and their average Auto
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.auto;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgAuto: data.sum / data.count
          }));
          
          // Sort by match number (descending) and take last 3
          const latest3Matches = matchAverages.sort((a, b) => b.match - a.match).slice(0, 3);
          
          if (latest3Matches.length === 0) return 0;
          return latest3Matches.reduce((sum, m) => sum + m.avgAuto, 0) / latest3Matches.length;
        },
    
        last3Tele: arr => {
          // Get unique matches and their average Tele
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.tele;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgTele: data.sum / data.count
          }));
          
          // Sort by match number (descending) and take last 3
          const latest3Matches = matchAverages.sort((a, b) => b.match - a.match).slice(0, 3);
          
          if (latest3Matches.length === 0) return 0;
          return latest3Matches.reduce((sum, m) => sum + m.avgTele, 0) / latest3Matches.length;
        },
    
        last3End: arr => {
          // Get unique matches and their average End
          const matchGroups = {};
          arr.forEach(row => {
            if (!matchGroups[row.match]) {
              matchGroups[row.match] = { sum: 0, count: 0 };
            }
            matchGroups[row.match].sum += row.end;
            matchGroups[row.match].count += 1;
          });
          
          // Convert to array of match averages
          const matchAverages = Object.entries(matchGroups).map(([match, data]) => ({
            match: parseInt(match),
            avgEnd: data.sum / data.count
          }));
          
          // Sort by match number (descending) and take last 3
          const latest3Matches = matchAverages.sort((a, b) => b.match - a.match).slice(0, 3);
          
          if (latest3Matches.length === 0) return 0;
          return latest3Matches.reduce((sum, m) => sum + m.avgEnd, 0) / latest3Matches.length;
        },
        //Add TBA to pull win/lose auto
        // Extract match and performance metrics (include winauto for win/loss dots on all over-time charts)
        epaOverTime: arr => tidy(arr, select(['epa', 'match', 'winauto', 'majorfouls', 'minorfouls'])),
        autoOverTime: arr => tidy(arr, select(['match', 'auto', 'winauto'])),
        teleOverTime: arr => tidy(arr, select(['match', 'tele', 'winauto'])),
      
        // Consistency: 100 − (breakdownRate + EPA std dev); if negative, use 1%
        consistency: arr => {
          const uniqueMatches = new Set(arr.map(row => row.match));
          const uniqueBreakdownCount = Array.from(uniqueMatches).filter(match =>
            arr.some(row => row.match === match && row.breakdowncomments !== null)
          ).length;
          const breakdownRate = uniqueMatches.size > 0 ? (uniqueBreakdownCount / uniqueMatches.size) * 100 : 0;
          const epaStdDev = standardDeviation(arr, 'epa');
          const raw = 100 - (breakdownRate + epaStdDev);
          return raw < 0 ? 1 : raw;
        },
    
        lastBreakdown: arr => {
          const withBreakdown = arr.filter(e => e.breakdowncomments != null && e.breakdowncomments !== '');
          if (withBreakdown.length === 0) return "N/A";
          const lastMatch = withBreakdown.reduce((a, b) => b.match, null);
          return lastMatch != null ? `Match ${lastMatch}` : "N/A";
        },
        noShow: arr => percentValue(arr, 'noshow', true),
        stuckOnFuel: arr => {
          const total = arr.length;
          const stuck = arr.filter(row => row.stuckonfuel === true).length;
          return total > 0 ? (stuck / total) * 100 : 0;
        },
        stuckOnBump: arr => {
          const total = arr.length;
          const stuck = arr.filter(row => row.stuckonbump === true).length;
          return total > 0 ? (stuck / total) * 100 : 0;
        },
        meanMajorFouls: arr => meanAndMedianAcrossMatches(arr, 'majorfouls').mean,
        medianMajorFouls: arr => meanAndMedianAcrossMatches(arr, 'majorfouls').median,
        meanMinorFouls: arr => meanAndMedianAcrossMatches(arr, 'minorfouls').mean,
        medianMinorFouls: arr => meanAndMedianAcrossMatches(arr, 'minorfouls').median,
    
        breakdown: arr => {
          const uniqueMatches = new Set(arr.map(row => row.match));
          const uniqueBreakdownCount = Array.from(uniqueMatches).filter(match =>
            arr.some(row => row.match === match && row.breakdowncomments !== null)
          ).length;
          return (uniqueBreakdownCount / uniqueMatches.size) * 100;
        },
    
        defense: arr => {
          const uniqueMatches = new Set(arr.map(row => row.match));
          const uniqueDefenseCount = Array.from(uniqueMatches).filter(match =>
            arr.some(row => row.match === match && row.playeddefense === true)
          ).length;
          return (uniqueDefenseCount / uniqueMatches.size) * 100;
        },
    
        matchesScouted: () => matchesScouted,
        scouts: arr => {
          const scoutsByMatch = {};
          arr.forEach(row => {
            if (row.scoutname && row.scoutname.trim()) {
              if (!scoutsByMatch[row.match]) {
                scoutsByMatch[row.match] = [];
              }
              if (!scoutsByMatch[row.match].includes(row.scoutname)) {
                scoutsByMatch[row.match].push(row.scoutname);
              }
            }
          });
          return Object.entries(scoutsByMatch)
            .map(([match, names]) => ({ match: Number(match), names: [...names] }))
            .sort((a, b) => a.match - b.match);
        },
        generalComments: arr => {
          const commentsByMatch = {};
          arr.forEach(row => {
            if (row.generalcomments && row.generalcomments.trim()) {
              if (!commentsByMatch[row.match]) {
                commentsByMatch[row.match] = [];
              }
              commentsByMatch[row.match].push(row.generalcomments);
            }
          });
          
          const result = Object.entries(commentsByMatch)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([match, comments]) => `Match ${match}: ${comments.join(', ')}`);

          return result.length > 0 ? result : [];
        },
        
        breakdownComments: arr => {
          const commentsByMatch = {};
          arr.forEach(row => {
            if (row.breakdowncomments && row.breakdowncomments.trim()) {
              if (!commentsByMatch[row.match]) {
                commentsByMatch[row.match] = [];
              }
              commentsByMatch[row.match].push(row.breakdowncomments);
            }
          });
          
          const result = Object.entries(commentsByMatch)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([match, comments]) => `Match ${match}: ${comments.join(', ')}`);

          return result.length > 0 ? result : [];
        },

        foulComments: arr => {
          const commentsByMatch = {};
          arr.forEach(row => {
            if (row.foulcomments && row.foulcomments.trim()) {
              if (!commentsByMatch[row.match]) {
                commentsByMatch[row.match] = [];
              }
              commentsByMatch[row.match].push(row.foulcomments);
            }
          });

          const result = Object.entries(commentsByMatch)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([match, comments]) => `Match ${match}: ${comments.join(', ')}`);

          return result.length > 0 ? result : [];
        },

    // Defense comments removed - not in 2026 schema
    // Defense information is now in Defense field (weak/harassment/game changing) and PlayedDefense boolean
    autoOverTime: arr => tidy(arr, select(['match', 'auto', 'winauto'])),
    teleOverTime: arr => tidy(arr, select(['match', 'tele', 'winauto'])),
    // Leave field removed - not in 2026 schema

    auto: arr => ({
      fuel: {
        avgFuel: (() => {
          const validRows = rows.filter(row => row.autofuel != null && row.autofuel >= 0);
          return validRows.length > 0 
            ? validRows.reduce((sum, row) => sum + (row.autofuel || 0), 0) / validRows.length 
            : 0;
        })(),
        totalFuel: (() => rows.reduce((sum, row) => sum + (row.autofuel || 0), 0))(),
      },
      climb: {
        successRate: (() => {
          const totalMatches = rows.length;
          const successfulClimbs = rows.filter(row => row.autoclimb === 2).length; // 2 = Success
          return totalMatches > 0 ? (successfulClimbs / totalMatches) * 100 : 0;
        })(),
        failRate: (() => {
          const totalMatches = rows.length;
          const failedClimbs = rows.filter(row => row.autoclimb === 1).length; // 1 = Fail
          return totalMatches > 0 ? (failedClimbs / totalMatches) * 100 : 0;
        })(),
        noneRate: (() => {
          const totalMatches = rows.length;
          const noClimbs = rows.filter(row => row.autoclimb === 0 || row.autoclimb == null).length; // 0 = None
          return totalMatches > 0 ? (noClimbs / totalMatches) * 100 : 0;
        })(),
        positionLeft: (() => {
          const successfulClimbs = rows.filter(row => row.autoclimb === 2).length; // 2 = Success
          const leftPosition = rows.filter(row => row.autoclimb === 2 && row.autoclimbposition === 0).length; // 0 = Left
          return successfulClimbs > 0 ? (leftPosition / successfulClimbs) * 100 : 0;
        })(),
        positionCenter: (() => {
          const successfulClimbs = rows.filter(row => row.autoclimb === 2).length; // 2 = Success
          const centerPosition = rows.filter(row => row.autoclimb === 2 && row.autoclimbposition === 1).length; // 1 = Center
          return successfulClimbs > 0 ? (centerPosition / successfulClimbs) * 100 : 0;
        })(),
        positionRight: (() => {
          const successfulClimbs = rows.filter(row => row.autoclimb === 2).length; // 2 = Success
          const rightPosition = rows.filter(row => row.autoclimb === 2 && row.autoclimbposition === 2).length; // 2 = Right
          return successfulClimbs > 0 ? (rightPosition / successfulClimbs) * 100 : 0;
        })(),
      },
      winAuto: (() => {
        const totalMatches = rows.length;
        const wonAuto = rows.filter(row => row.winauto === true).length;
        return totalMatches > 0 ? (wonAuto / totalMatches) * 100 : 0;
      })(),
    }),

    tele: arr => ({
      fuel: {
        avgFuel: (() => {
          const validRows = rows.filter(row => row.telefuel != null && row.telefuel >= 0);
          return validRows.length > 0 
            ? validRows.reduce((sum, row) => sum + (row.telefuel || 0), 0) / validRows.length 
            : 0;
        })(),
        totalFuel: (() => rows.reduce((sum, row) => sum + (row.telefuel || 0), 0))(),
      },
      passing: {
        bulldozer: (() => {
          const totalMatches = rows.length;
          const usedBulldozer = rows.filter(row => row.passingbulldozer === true).length;
          return totalMatches > 0 ? (usedBulldozer / totalMatches) * 100 : 0;
        })(),
        shooter: (() => {
          const totalMatches = rows.length;
          const usedShooter = rows.filter(row => row.passingshooter === true).length;
          return totalMatches > 0 ? (usedShooter / totalMatches) * 100 : 0;
        })(),
        dump: (() => {
          const totalMatches = rows.length;
          const usedDump = rows.filter(row => row.passingdump === true).length;
          return totalMatches > 0 ? (usedDump / totalMatches) * 100 : 0;
        })(),
      },
      shootWhileMove: (() => {
        const totalMatches = rows.length;
        const shootWhileMoving = rows.filter(row => row.shootwhilemove === true).length;
        return totalMatches > 0 ? (shootWhileMoving / totalMatches) * 100 : 0;
      })(),
      defenseLocations: {
        outpost: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationoutpost === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        tower: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationtower === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        hub: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationhub === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        az: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationaz === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        nz: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationnz === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        trench: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationtrench === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
        bump: (() => {
          const totalMatches = rows.length;
          const defended = rows.filter(row => row.defenselocationbump === true).length;
          return totalMatches > 0 ? (defended / totalMatches) * 100 : 0;
        })(),
      },
    }),

// This appears to be inside a function that returns something via NextResponse
  // I'm providing the fixed version of the code snippet you shared
  
  // Assuming this is inside a function where 'rows' is defined

  // The endPlacement, attemptCage, successCage functions are likely inside a map or some object construction
  // which appears to be closed with "))" and then the result is assigned to returnObject[0]
  
  // First part of your object definition with fixed endPlacement
  endPlacement: (rows) => {
    // Group data by match number
    const matchGroups = {};
    rows.forEach(row => {
      const matchId = row.match;
      if (matchId === undefined || matchId === null) return;
      const matchKey = row.matchtype ? `${matchId}-${row.matchtype}` : `${matchId}`;
      if (!matchGroups[matchKey]) matchGroups[matchKey] = [];
      matchGroups[matchKey].push(row);
    });

    const totalMatches = Object.keys(matchGroups).length;
    if (totalMatches === 0) {
      return {
        none: 0,
        L1: { left: 0, center: 0, right: 0 },
        L2: { left: 0, center: 0, right: 0 },
        L3: { left: 0, center: 0, right: 0 },
      };
    }

    // 0=LeftL3, 1=LeftL2, 2=LeftL1, 3=CenterL3, 4=CenterL2, 5=CenterL1, 6=RightL3, 7=RightL2, 8=RightL1; >8 = none
    const positionCounts = {
      L1: { left: 0, center: 0, right: 0 },
      L2: { left: 0, center: 0, right: 0 },
      L3: { left: 0, center: 0, right: 0 },
    };
    let noneCount = 0;

    Object.values(matchGroups).forEach((matchRows) => {
      // Count occurrences of each endclimbposition (0-8) in this match
      const posCounts = {};
      matchRows.forEach(row => {
        const ep = row.endclimbposition;
        if (ep == null || ep === undefined || ep === '' || ep < 0 || ep > 8) {
          posCounts['none'] = (posCounts['none'] || 0) + 1;
          return;
        }
        const n = Number(ep);
        if (n >= 0 && n <= 8) posCounts[n] = (posCounts[n] || 0) + 1;
      });

      // Most common value for this match (endclimbposition 0-8 or 'none')
      let mode = null;
      let maxCount = 0;
      Object.entries(posCounts).forEach(([key, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mode = key === 'none' ? 'none' : Number(key);
        }
      });

      if (mode === 'none' || mode === null) {
        noneCount++;
        return;
      }
      // mode is 0-8: position 0-2=left, 3-5=center, 6-8=right; level 0=L3, 1=L2, 2=L1
      const levelKey = mode % 3 === 0 ? 'L3' : mode % 3 === 1 ? 'L2' : 'L1';
      const position = mode < 3 ? 'left' : mode < 6 ? 'center' : 'right';
      positionCounts[levelKey][position]++;
    });

    const pct = (count) => Math.round((count / totalMatches) * 1000) / 10;
    return {
      none: pct(noneCount),
      L1: { left: pct(positionCounts.L1.left), center: pct(positionCounts.L1.center), right: pct(positionCounts.L1.right) },
      L2: { left: pct(positionCounts.L2.left), center: pct(positionCounts.L2.center), right: pct(positionCounts.L2.right) },
      L3: { left: pct(positionCounts.L3.left), center: pct(positionCounts.L3.center), right: pct(positionCounts.L3.right) },
    };
  },

  attemptCage: (rows) => {
    // Group data by match
    const matchGroups = {};
    rows.forEach(row => {
      const match = row.match;
      if (!matchGroups[match]) {
        matchGroups[match] = [];
      }
      matchGroups[match].push(row);
    });
    
    // Count matches where the modal EndClimb value indicates a climb attempt (L1, L2, or L3)
    const matchesWithAttempt = Object.values(matchGroups).filter(matchRows => {
      // Find the most common EndClimbPosition level for this match
      const counts = {};
      matchRows.forEach(row => {
        const ep = row.endclimbposition; // 0-8 valid; >8 (e.g. 9) = none
        if (ep == null || ep === undefined || ep < 0 || ep > 8) {
          counts['none'] = (counts['none'] || 0) + 1;
          return;
        }
        const level = Number(ep) % 3; // 0=L3, 1=L2, 2=L1
        if (level === 0) {
          counts['L3'] = (counts['L3'] || 0) + 1;
        } else if (level === 1) {
          counts['L2'] = (counts['L2'] || 0) + 1;
        } else if (level === 2) {
          counts['L1'] = (counts['L1'] || 0) + 1;
        } else {
          counts['none'] = (counts['none'] || 0) + 1;
        }
      });
      
      let mode = null;
      let maxCount = 0;
      Object.entries(counts).forEach(([value, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mode = value;
        }
      });
      
      // Return true if the modal value indicates a climb attempt (L1, L2, or L3)
      return ['L1', 'L2', 'L3'].includes(mode);
    }).length;
    
    const totalMatches = Object.keys(matchGroups).length;
    return totalMatches > 0 ? (matchesWithAttempt / totalMatches) * 100 : 0;
  },
  
  successCage: (rows) => {
    // Group data by match
    const matchGroups = {};
    rows.forEach(row => {
      const match = row.match;
      if (!matchGroups[match]) {
        matchGroups[match] = [];
      }
      matchGroups[match].push(row);
    });
    
    // Process each match to find its modal EndClimb level
    const matchesWithModalEndClimb = Object.values(matchGroups).map(matchRows => {
      // Find the most common EndClimbPosition level for this match
      const counts = {};
      matchRows.forEach(row => {
        const ep = row.endclimbposition; // 0-8 valid; >8 (e.g. 9) = none
        if (ep == null || ep === undefined || ep < 0 || ep > 8) {
          counts['none'] = (counts['none'] || 0) + 1;
          return;
        }
        const level = Number(ep) % 3; // 0=L3, 1=L2, 2=L1
        if (level === 0) {
          counts['L3'] = (counts['L3'] || 0) + 1;
        } else if (level === 1) {
          counts['L2'] = (counts['L2'] || 0) + 1;
        } else if (level === 2) {
          counts['L1'] = (counts['L1'] || 0) + 1;
        } else {
          counts['none'] = (counts['none'] || 0) + 1;
        }
      });
      
      let mode = null;
      let maxCount = 0;
      Object.entries(counts).forEach(([value, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mode = value;
        }
      });
      
      return mode;
    });
    
    // Count matches where an attempt was made (L1, L2, or L3)
    const attemptedMatches = matchesWithModalEndClimb.filter(level => 
      ['L1', 'L2', 'L3'].includes(level)
    ).length;
    
    // Count successful matches (L2 or L3 - higher level climbs)
    const successfulMatches = matchesWithModalEndClimb.filter(level => 
      ['L2', 'L3'].includes(level)
    ).length;
    
    // Calculate success rate among attempted matches only
    return attemptedMatches > 0 ? (successfulMatches / attemptedMatches) * 100 : 0;
  },
  
  shootingmechanism: arr => {
    const values = arr.map(row => row.shootingmechanism).filter(a => a != null);
    if (values.length === 0) return null;
    const staticCount = values.filter(v => v === 0).length;
    const turretCount = values.filter(v => v === 1).length;
    // Show only the most occurring type; on tie, default to Turret
    return staticCount > turretCount ? 'Static' : 'Turret';
  },
  
  qualitative: arr => {
    function safeAverage(key, invert = false) {
      const values = rows.map(row => row[key]).filter(v => typeof v === 'number' && v >= 0);
      if (values.length === 0) return -1;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return invert ? 5 - avg : avg;
    }
  
    return [
      { name: "Climb Hazard*", rating: safeAverage('climbhazard', true) },
      { name: "Hopper Capacity", rating: safeAverage('hoppercapacity') },
      { name: "Maneuverability", rating: safeAverage('maneuverability') },
      { name: "Defense Evasion", rating: safeAverage('defenseevasion') },
      { name: "Climb Speed", rating: safeAverage('climbspeed') },
      { name: "Fuel Speed", rating: safeAverage('fuelspeed') },
      { name: "Passing Quantity", rating: safeAverage('passingquantity') },
      { name: "Auto Declimb Speed", rating: safeAverage('autodeclimbspeed') },
    ];
  }
  
}));  // This appears to close the object and function call that contains these properties

// The rest of your code seems fine and doesn't need modification for your current issue
// Defense quality from "defense" column: 0=weak, 1=harassment, 2=game changing. Only count matches where they played defense.
const defenseCounts = { 0: 0, 1: 0, 2: 0 };
const playedDefenseRows = rows.filter(row => row.playeddefense === true || row.defenseplayed === true);
playedDefenseRows.forEach(row => {
  const d = Number(row.defense);
  if (d === 0 || d === 1 || d === 2) defenseCounts[d]++;
});
const defensePlayedCount = playedDefenseRows.length;
const defenseQuality = defensePlayedCount > 0
  ? {
      weak: (defenseCounts[0] / defensePlayedCount) * 100,
      harassment: (defenseCounts[1] / defensePlayedCount) * 100,
      gameChanging: (defenseCounts[2] / defensePlayedCount) * 100,
    }
  : { weak: 0, harassment: 0, gameChanging: 0 };

const loc = returnObject[0].tele?.defenseLocations || {};
returnObject[0] = {
  ...returnObject[0],
  intakeGround: rows.some(row => row.intakeground === true),
  intakeOutpost: rows.some(row => row.intakeoutpost === true),
  passingBulldozer: rows.some(row => row.passingbulldozer === true),
  passingShooter: rows.some(row => row.passingshooter === true),
  passingDump: rows.some(row => row.passingdump === true),
  shootWhileMove: rows.some(row => row.shootwhilemove === true),
  bump: rows.some(row => row.bump === true),
  trench: rows.some(row => row.trench === true),
  wideClimb: rows.some(row => row.wideclimb === true || row.wideclimb === 'true'),
  defenseQuality,
  defenseLocation: {
    allianceZone: Number(loc.az) || 0,
    neutralZone: Number(loc.nz) || 0,
    trench: Number(loc.trench) || 0,
    bump: Number(loc.bump) || 0,
    tower: Number(loc.tower) || 0,
    outpost: Number(loc.outpost) || 0,
    hub: Number(loc.hub) || 0,
  },
};

function meanRounded(items, key) {
  const valid = items.map((d) => Math.abs(Number(d[key]))).filter((v) => Number.isFinite(v));
  return valid.length
    ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
    : undefined;
}

/** Per-match mean of a numeric field, then mean and median across matches (each match weighted once). */
function meanAndMedianAcrossMatches(rows, key) {
  const byMatch = {};
  rows.forEach((row) => {
    const m = row.match;
    if (m === undefined || m === null) return;
    if (!byMatch[m]) byMatch[m] = [];
    byMatch[m].push(Math.abs(Number(row[key]) || 0));
  });
  const perMatchMeans = Object.values(byMatch).map(
    (vals) => vals.reduce((a, b) => a + b, 0) / vals.length
  );
  if (perMatchMeans.length === 0) return { mean: 0, median: 0 };
  const mean = perMatchMeans.reduce((a, b) => a + b, 0) / perMatchMeans.length;
  const sorted = [...perMatchMeans].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { mean, median };
}

// Aggregate function definition
function aggregateByMatch(dataArray) {
  return tidy(
    dataArray,
    groupBy("match", [
      summarize({
        epa: mean("epa"),
        auto: mean("auto"),
        tele: mean("tele"),
        // Per-match win (auto): majority of scouts; undefined if no winauto data
        won: (items) => {
          const withVal = items.filter(d => d.winauto !== undefined && d.winauto !== null);
          if (withVal.length === 0) return undefined;
          const wins = withVal.filter(d => d.winauto === true || d.winauto === 1).length;
          return wins >= withVal.length / 2;
        },
        majorfouls: (items) => meanRounded(items, 'majorfouls'),
        minorfouls: (items) => meanRounded(items, 'minorfouls'),
      }),
    ]),
    mutate({
      epa: d => Math.round(d.epa * 100) / 100,
      auto: d => Math.round(d.auto * 100) / 100,
      tele: d => Math.round(d.tele * 100) / 100,
    }),
    arrange([asc("match")])
  );
}

// Apply the aggregation and sorting
let processedEPAOverTime = aggregateByMatch(returnObject[0].epaOverTime);
let processedAutoOverTime = aggregateByMatch(returnObject[0].autoOverTime);
let processedTeleOverTime = aggregateByMatch(returnObject[0].teleOverTime);

returnObject[0].epaOverTime = processedEPAOverTime;
returnObject[0].autoOverTime = processedAutoOverTime;
returnObject[0].teleOverTime = processedTeleOverTime;

// Just one return statement
return NextResponse.json(returnObject[0], { status: 200 });

}
