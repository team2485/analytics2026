'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import EPALineChart from './components/EPALineChart';
import Endgame from './components/Endgame';
import Qualitative from './components/Qualitative';
import { Chart, registerables } from 'chart.js';
import Link from "next/link";

Chart.register(...registerables);

export default function MatchViewPage() {
  return <Suspense>
    <ScoutingApp />
  </Suspense>
}

function filterNegative(value) {
  return typeof value === 'number' && value >= 0 ? value : 0;
}

function ScoutingApp() {
  const [allData, setAllData] = useState(null);
  const [data, setData] = useState(false);
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch team data (match-specific when match is in URL so points are for that match only)
  useEffect(() => {
    if (!searchParams) return;
    const matchParam = searchParams.get('match');
    const url = matchParam != null && matchParam !== ''
      ? "/api/get-alliance-data?match=" + encodeURIComponent(matchParam)
      : "/api/get-alliance-data";
    fetch(url)
      .then(resp => resp.json())
      .then(data => {
        console.log("[Match View] get-alliance-data response (keys = team numbers):", data);
        setAllData(data);
      });
  }, [searchParams]);

  // Load team data based on URL parameters
  useEffect(() => {
    if (!searchParams || !allData) return;
    const matchParam = searchParams.get('match');
    const hasMatch = matchParam != null && matchParam !== '';
    const hasTeams = [1, 2, 3, 4, 5, 6].every((i) => (searchParams.get(`team${i}`)?.trim?.() ?? searchParams.get(`team${i}`)));
    const team1 = searchParams.get("team1")?.trim?.() ?? searchParams.get("team1");
    const team2 = searchParams.get("team2")?.trim?.() ?? searchParams.get("team2");
    const team3 = searchParams.get("team3")?.trim?.() ?? searchParams.get("team3");
    const team4 = searchParams.get("team4")?.trim?.() ?? searchParams.get("team4");
    const team5 = searchParams.get("team5")?.trim?.() ?? searchParams.get("team5");
    const team6 = searchParams.get("team6")?.trim?.() ?? searchParams.get("team6");
    const lookup = (t) => (t != null && t !== '') ? (allData[t] ?? allData[String(t)]) : undefined;

    if (hasMatch && !hasTeams) {
      // Resolve match number to team list, keep match in URL so points stay match-specific
      fetch('/api/get-teams-of-match?match=' + encodeURIComponent(matchParam))
        .then(resp => resp.json())
        .then(matchData => {
          if (matchData.message) {
            alert(matchData.message);
            const backUrl = matchParam ? `${window.location.pathname}?match=${encodeURIComponent(matchParam)}` : window.location.pathname;
            window.history.replaceState(null, 'Match View', backUrl);
            setData({});
          } else {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('team1', String(matchData.team1));
            newParams.set('team2', String(matchData.team2));
            newParams.set('team3', String(matchData.team3));
            newParams.set('team4', String(matchData.team4));
            newParams.set('team5', String(matchData.team5));
            newParams.set('team6', String(matchData.team6));
            newParams.set('match', matchParam);

            const newUrl = `${window.location.pathname}?${newParams.toString()}`;
            window.history.replaceState(null, 'Match View', newUrl);

            setData({
              team1: lookup(matchData.team1),
              team2: lookup(matchData.team2),
              team3: lookup(matchData.team3),
              team4: lookup(matchData.team4),
              team5: lookup(matchData.team5),
              team6: lookup(matchData.team6)
            });
          }
        })
        .catch(err => {
          alert('Could not load match: ' + (err.message || 'Network error'));
          const backUrl = matchParam ? `${window.location.pathname}?match=${encodeURIComponent(matchParam)}` : window.location.pathname;
          window.history.replaceState(null, 'Match View', backUrl);
          setData({});
        });
      return;
    }

    // Lookup by team1..team6 (with or without match in URL; when match in URL, allData is match-specific)
    setData({
      team1: lookup(team1),
      team2: lookup(team2),
      team3: lookup(team3),
      team4: lookup(team4),
      team5: lookup(team5),
      team6: lookup(team6)
    });
  }, [searchParams, allData]);

  const defaultTeam = {
    team: 404,
    teamName: "Invisibotics 👻",
    last3Auto: 0,
    last3Tele: 0,
    last3End: 0,
    last3EPA: 0,
    displayAuto: 0,
    displayTele: 0,
    displayEnd: 0,
    displayEPA: 0,
    avgFuel: 0,
    leave: false,
    autoClimb: 0,
    endgame: { none: 0, L1: 0, L2: 0, L3: 0, fail: 0},
    qualitative: { fuelspeed: 0, maneuverability: 0, durability: 0, collectioncapacity: 0, passingspeed: 0, climbingspeed: 0, autodeclimbspeed: 0, bumpspeed: 0, defenseevasion: 0, aggression: 0, climbhazard: 0 }
  };

  // Show loading until data is ready
  if (!data || searchParams == null) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Loading...</h1>
    </div>
  }

  // Show form if "go" parameter is not set
  if (searchParams.get("go") != "go") {
    return (
      <div>
        <form className={styles.teamForm} action="/match-view" method="get">
          <span>View by Teams...</span>
          <div className={styles.horizontalBox}>
            <div className={styles.RedInputs}>
              <div>
                <label htmlFor="team1">Red 1:</label>
                <br />
                <input id="team1" name="team1" defaultValue={searchParams.get("team1")}></input>
              </div>
              <div>
                <label htmlFor="team2">Red 2:</label>
                <br />
                <input id="team2" name="team2" defaultValue={searchParams.get("team2")}></input>
              </div>
              <div>
                <label htmlFor="team3">Red 3:</label>
                <br />
                <input id="team3" name="team3" defaultValue={searchParams.get("team3")}></input>
              </div>
            </div>
            <div className={styles.BlueInputs}>
              <div>
                <label htmlFor="team4">Blue 1:</label>
                <br />
                <input id="team4" name="team4" defaultValue={searchParams.get("team4")}></input>
              </div>
              <div>
                <label htmlFor="team5">Blue 2:</label>
                <br />
                <input id="team5" name="team5" defaultValue={searchParams.get("team5")}></input>
              </div>
              <div>
                <label htmlFor="team6">Blue 3:</label>
                <br />
                <input id="team6" name="team6" defaultValue={searchParams.get("team6")}></input>
              </div>
            </div>
            <input type="hidden" name="go" value="go"></input>
          </div>
          <span>Or by Match...</span>
          <label htmlFor="match">Match #</label>
          <input id="match" name="match" type="number" defaultValue={searchParams.get("match") ?? ""}></input>
          <button>Go!</button>
        </form>
      </div>
    );
  }

  // Get team data with fallback to default
  const redAlliance = [data.team1 || defaultTeam, data.team2 || defaultTeam, data.team3 || defaultTeam];
  const blueAlliance = [data.team4 || defaultTeam, data.team5 || defaultTeam, data.team6 || defaultTeam];

  // Helper function to sum alliance stats
  let get = (alliance, thing) => {
    let sum = 0;
    if (alliance[0] && alliance[0][thing]) sum += alliance[0][thing];
    if (alliance[1] && alliance[1][thing]) sum += alliance[1][thing];
    if (alliance[2] && alliance[2][thing]) sum += alliance[2][thing];
    return sum;
  }

  // Color schemes
  const COLORS = [
    ["#A6DDD9", "#79CDC6", "#51BEB5", "#3DA49B", "#32867F"], //green
    ["#C8DCF9", "#91B8F3", "#6CA0EF", "#387ee8", "#1f67d2"], //blue
    ["#D2B9DF", "#BF9DD2", "#AD81C5", "#9257B2", "#71408C"], //purple
    ["#F1D0E0", "#E7B1CC", "#DD92B6", "#CE6497", "#C44582"], //pink
    ["#FFD1D0", "#F7B7B7", "#DC8683", "#BE5151", "#A43D3D"], //red
    ["#FFC999", "#FFB370", "#FF9D47", "#FF7C0A", "#ed5e07"], //orange
  ];

  let blueScores = [0, get(blueAlliance, "displayAuto")];
  blueScores.push(blueScores[1] + get(blueAlliance, "displayTele"));
  blueScores.push(blueScores[2] + get(blueAlliance, "displayEnd"));
  
  let redScores = [0, get(redAlliance, "displayAuto")];
  redScores.push(redScores[1] + get(redAlliance, "displayTele"));
  redScores.push(redScores[2] + get(redAlliance, "displayEnd"));

  // EPA Over Time data
  const epaTimeData = [
    { name: "0", blue: 0, red: 0 },
    { name: "Auto", blue: Math.round(blueScores[1]), red: Math.round(redScores[1]) },
    { name: "Tele", blue: Math.round(blueScores[2]), red: Math.round(redScores[2]) },
    { name: "End", blue: Math.round(blueScores[3]), red: Math.round(redScores[3]) }
  ];

  // Calculate RPs
  const RGBColors = { red: "#FF9393", green: "#BFFEC1", yellow: "#FFDD9A" };
  
  const blueTotal = blueScores[3];
  const redTotal = redScores[3];
  const blueFuel = blueScores[2]; // auto + tele
  const redFuel = redScores[2];
  const blueClimb = get(blueAlliance, "displayEnd");
  const redClimb = get(redAlliance, "displayEnd");

  const blueRPs = {
    victory: blueTotal > redTotal,
    energized: blueFuel >= 100,
    supercharged: blueFuel >= 360,
    traversal: blueClimb >= 50
  };

  const redRPs = {
    victory: redTotal > blueTotal,
    energized: redFuel >= 100,
    supercharged: redFuel >= 360,
    traversal: redClimb >= 50
  };

  // Fuel distribution for pie charts (percentage of each team's contribution)
  const totalBlueFuel = (blueAlliance[0]?.avgFuel || 0) + (blueAlliance[1]?.avgFuel || 0) + (blueAlliance[2]?.avgFuel || 0);
  const totalRedFuel = (redAlliance[0]?.avgFuel || 0) + (redAlliance[1]?.avgFuel || 0) + (redAlliance[2]?.avgFuel || 0);

  const blueFuelData = [
    { x: 'Team 1', y: totalBlueFuel > 0 ? Math.round((blueAlliance[0]?.avgFuel || 0) / totalBlueFuel * 100) : 0 },
    { x: 'Team 2', y: totalBlueFuel > 0 ? Math.round((blueAlliance[1]?.avgFuel || 0) / totalBlueFuel * 100) : 0 },
    { x: 'Team 3', y: totalBlueFuel > 0 ? Math.round((blueAlliance[2]?.avgFuel || 0) / totalBlueFuel * 100) : 0 }
  ];

  const redFuelData = [
    { x: 'Team 1', y: totalRedFuel > 0 ? Math.round((redAlliance[0]?.avgFuel || 0) / totalRedFuel * 100) : 0 },
    { x: 'Team 2', y: totalRedFuel > 0 ? Math.round((redAlliance[1]?.avgFuel || 0) / totalRedFuel * 100) : 0 },
    { x: 'Team 3', y: totalRedFuel > 0 ? Math.round((redAlliance[2]?.avgFuel || 0) / totalRedFuel * 100) : 0 }
  ];

  // Radar chart data for qualitative metrics
  const radarData = [
    { qual: 'fuelspeed', team1: filterNegative(data?.team1?.qualitative?.fuelspeed) || 0, team2: filterNegative(data?.team2?.qualitative?.fuelspeed) || 0, team3: filterNegative(data?.team3?.qualitative?.fuelspeed) || 0 },
    { qual: 'maneuverability', team1: filterNegative(data?.team1?.qualitative?.maneuverability) || 0, team2: filterNegative(data?.team2?.qualitative?.maneuverability) || 0, team3: filterNegative(data?.team3?.qualitative?.maneuverability) || 0 },
    { qual: 'durability', team1: filterNegative(data?.team1?.qualitative?.durability) || 0, team2: filterNegative(data?.team2?.qualitative?.durability) || 0, team3: filterNegative(data?.team3?.qualitative?.durability) || 0 },
    { qual: 'collectioncapacity', team1: filterNegative(data?.team1?.qualitative?.hoppercapacity) || 0, team2: filterNegative(data?.team2?.qualitative?.hoppercapacity) || 0, team3: filterNegative(data?.team3?.qualitative?.hoppercapacity) || 0 },
    { qual: 'passingspeed', team1: filterNegative(data?.team1?.qualitative?.passingspeed) || 0, team2: filterNegative(data?.team2?.qualitative?.passingspeed) || 0, team3: filterNegative(data?.team3?.qualitative?.passingspeed) || 0 },
    { qual: 'climbingspeed', team1: filterNegative(data?.team1?.qualitative?.climbspeed) || 0, team2: filterNegative(data?.team2?.qualitative?.climbspeed) || 0, team3: filterNegative(data?.team3?.qualitative?.climbspeed) || 0 },
    { qual: 'autodeclimbspeed', team1: filterNegative(data?.team1?.qualitative?.autodeclimbspeed) || 0, team2: filterNegative(data?.team2?.qualitative?.autodeclimbspeed) || 0, team3: filterNegative(data?.team3?.qualitative?.autodeclimbspeed) || 0 },
    { qual: 'bumpspeed', team1: filterNegative(data?.team1?.qualitative?.bumpspeed) || 0, team2: filterNegative(data?.team2?.qualitative?.bumpspeed) || 0, team3: filterNegative(data?.team3?.qualitative?.bumpspeed) || 0 },
    { qual: 'defenseevasion', team1: filterNegative(data?.team1?.qualitative?.defenseevasion) || 0, team2: filterNegative(data?.team2?.qualitative?.defenseevasion) || 0, team3: filterNegative(data?.team3?.qualitative?.defenseevasion) || 0 },
    { qual: 'aggression', team1: filterNegative(data?.team1?.qualitative?.aggression) || 0, team2: filterNegative(data?.team2?.qualitative?.aggression) || 0, team3: filterNegative(data?.team3?.qualitative?.aggression) || 0 },
    { qual: 'climbhazard', team1: filterNegative(data?.team1?.qualitative?.climbhazard) || 0, team2: filterNegative(data?.team2?.qualitative?.climbhazard) || 0, team3: filterNegative(data?.team3?.qualitative?.climbhazard) || 0 }
  ];

  // Red radar data
  const redRadarData = [
    { qual: 'fuelspeed', team1: filterNegative(data?.team4?.qualitative?.fuelspeed) || 0, team2: filterNegative(data?.team5?.qualitative?.fuelspeed) || 0, team3: filterNegative(data?.team6?.qualitative?.fuelspeed) || 0 },
    { qual: 'maneuverability', team1: filterNegative(data?.team4?.qualitative?.maneuverability) || 0, team2: filterNegative(data?.team5?.qualitative?.maneuverability) || 0, team3: filterNegative(data?.team6?.qualitative?.maneuverability) || 0 },
    { qual: 'durability', team1: filterNegative(data?.team4?.qualitative?.durability) || 0, team2: filterNegative(data?.team5?.qualitative?.durability) || 0, team3: filterNegative(data?.team6?.qualitative?.durability) || 0 },
    { qual: 'collectioncapacity', team1: filterNegative(data?.team4?.qualitative?.hoppercapacity) || 0, team2: filterNegative(data?.team5?.qualitative?.hoppercapacity) || 0, team3: filterNegative(data?.team6?.qualitative?.hoppercapacity) || 0 },
    { qual: 'passingspeed', team1: filterNegative(data?.team4?.qualitative?.passingspeed) || 0, team2: filterNegative(data?.team5?.qualitative?.passingspeed) || 0, team3: filterNegative(data?.team6?.qualitative?.passingspeed) || 0 },
    { qual: 'climbingspeed', team1: filterNegative(data?.team4?.qualitative?.climbspeed) || 0, team2: filterNegative(data?.team5?.qualitative?.climbspeed) || 0, team3: filterNegative(data?.team6?.qualitative?.climbspeed) || 0 },
    { qual: 'autodeclimbspeed', team1: filterNegative(data?.team4?.qualitative?.autodeclimbspeed) || 0, team2: filterNegative(data?.team5?.qualitative?.autodeclimbspeed) || 0, team3: filterNegative(data?.team6?.qualitative?.autodeclimbspeed) || 0 },
    { qual: 'bumpspeed', team1: filterNegative(data?.team4?.qualitative?.bumpspeed) || 0, team2: filterNegative(data?.team5?.qualitative?.bumpspeed) || 0, team3: filterNegative(data?.team6?.qualitative?.bumpspeed) || 0 },
    { qual: 'defenseevasion', team1: filterNegative(data?.team4?.qualitative?.defenseevasion) || 0, team2: filterNegative(data?.team5?.qualitative?.defenseevasion) || 0, team3: filterNegative(data?.team6?.qualitative?.defenseevasion) || 0 },
    { qual: 'aggression', team1: filterNegative(data?.team4?.qualitative?.aggression) || 0, team2: filterNegative(data?.team5?.qualitative?.aggression) || 0, team3: filterNegative(data?.team6?.qualitative?.aggression) || 0 },
    { qual: 'climbhazard', team1: filterNegative(data?.team4?.qualitative?.climbhazard) || 0, team2: filterNegative(data?.team5?.qualitative?.climbhazard) || 0, team3: filterNegative(data?.team6?.qualitative?.climbhazard) || 0 }
  ];

  // Team View Data (bottom 6 cards): always use last-3-matches EPA and last-3-matches charts; fallback to all-match data if no last3
  const colorIndex = (idx) => (idx < 3 ? idx + 3 : idx - 3);
  const teamsData = [
    // Red alliance teams
    data.team1 || defaultTeam,
    data.team2 || defaultTeam,
    data.team3 || defaultTeam,
    // Blue alliance teams
    data.team4 || defaultTeam,
    data.team5 || defaultTeam,
    data.team6 || defaultTeam
  ].map((teamData, idx) => {
    const c = colorIndex(idx);
    const useLast3 = teamData.last3EPA != null || teamData.last3Fouls != null;
    return {
    number: teamData.team,
    name: teamData.teamName,
    color: COLORS[c][1],
    darkColor: COLORS[c][3],
    lightColor: COLORS[c][0],
    // EPA: last 3 matches (or fewer if only 2/1 in DB)
    epa: Math.round(teamData.last3EPA ?? teamData.displayEPA ?? 0),
    autoEPA: Math.round(teamData.last3Auto ?? teamData.displayAuto ?? 0),
    teleEPA: Math.round(teamData.last3Tele ?? teamData.displayTele ?? 0),
    endgameEPA: Math.round(teamData.last3End ?? teamData.displayEnd ?? 0),
    fouls: { mean: teamData.foulsMean ?? 0, median: teamData.foulsMedian ?? 0 },
    // Defense Quality from DB "defense" column: 0=weak, 1=harassment, 2=game changing
    defenseQuality: (useLast3 && teamData.last3Defense)
      ? { weak: teamData.last3Defense.weak, harassment: teamData.last3Defense.harassment, gameChanging: teamData.last3Defense.gameChanging }
      : { weak: teamData.defense?.weak ?? 0, harassment: teamData.defense?.harassment ?? 0, gameChanging: teamData.defense?.gameChanging ?? 0 },
    endgamePlacement: useLast3 && teamData.last3Endgame
      ? { none: teamData.last3Endgame.None, l1: teamData.last3Endgame.L1, l2: teamData.last3Endgame.L2, l3: teamData.last3Endgame.L3 }
      : { none: teamData.endgame?.None ?? teamData.endgame?.none ?? 0, l1: teamData.endgame?.L1 ?? 0, l2: teamData.endgame?.L2 ?? 0, l3: teamData.endgame?.L3 ?? 0 }
  }; });

  // Red alliance = red/pink tones (COLORS 3,4,5); Blue alliance = blue/green tones (COLORS 0,1,2)
  const matchData = {
    redAlliance: {
      teams: [
        { number: redAlliance[0].team, color: COLORS[3][1], darkColor: COLORS[3][3] },
        { number: redAlliance[1].team, color: COLORS[4][1], darkColor: COLORS[4][3] },
        { number: redAlliance[2].team, color: COLORS[5][1], darkColor: COLORS[5][3] }
      ],
      totalEPA: Math.round(redScores[3]),
      autoEPA: Math.round(redScores[1]),
      teleEPA: Math.round(redScores[2] - redScores[1]),
      endgameEPA: Math.round(redScores[3] - redScores[2]),
      rps: redRPs
    },
    blueAlliance: {
      teams: [
        { number: blueAlliance[0].team, color: COLORS[0][1], darkColor: COLORS[0][3] },
        { number: blueAlliance[1].team, color: COLORS[1][1], darkColor: COLORS[1][3] },
        { number: blueAlliance[2].team, color: COLORS[2][1], darkColor: COLORS[2][3] }
      ],
      totalEPA: Math.round(blueScores[3]),
      autoEPA: Math.round(blueScores[1]),
      teleEPA: Math.round(blueScores[2] - blueScores[1]),
      endgameEPA: Math.round(blueScores[3] - blueScores[2]),
      rps: blueRPs
    }
  };

  function AllianceButtons({t1, t2, t3, colors}) {
  return <div className={styles.allianceBoard}>
    <Link href={`/team-view?team=${t1.team}&team1=${data.team1?.team || ""}&team2=${data.team2?.team || ""}&team3=${data.team3?.team || ""}&team4=${data.team4?.team || ""}&team5=${data.team5?.team || ""}&team6=${data.team6?.team || ""}`}>
      <button style={{background: colors[0][1]}}>{t1.team}</button>
    </Link>
    <Link href={`/team-view?team=${t2.team}&team1=${data.team1?.team || ""}&team2=${data.team2?.team || ""}&team3=${data.team3?.team || ""}&team4=${data.team4?.team || ""}&team5=${data.team5?.team || ""}&team6=${data.team6?.team || ""}`}>
      <button style={{background: colors[1][1]}}>{t2.team}</button>
    </Link>
    <Link href={`/team-view?team=${t3.team}&team1=${data.team1?.team || ""}&team2=${data.team2?.team || ""}&team3=${data.team3?.team || ""}&team4=${data.team4?.team || ""}&team5=${data.team5?.team || ""}&team6=${data.team6?.team || ""}`}>
      <button style={{background: colors[2][1]}}>{t3.team}</button>
    </Link>
  </div>
}

  const showDebug = searchParams?.get('debug') === '1';

  return (
    <div className={styles.MainDiv}>
      {/* Debug panel: add ?debug=1 to URL to see raw API data (defense vs qualitative) */}
      {showDebug && (
        <div className={styles.debugPanel}>
          <h3>Raw data (from get-alliance-data) — Defense pie uses qualitative, not DB &quot;defense&quot;</h3>
          <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 320, background: '#f5f5f5', padding: 8 }}>
            {JSON.stringify(
              {
                team1: data?.team1 ? { team: data.team1.team, defense: data.team1.defense, qualitative: data.team1.qualitative } : null,
                team2: data?.team2 ? { team: data.team2.team, defense: data.team2.defense, qualitative: data.team2.qualitative } : null,
                team3: data?.team3 ? { team: data.team3.team, defense: data.team3.defense, qualitative: data.team3.qualitative } : null,
                team4: data?.team4 ? { team: data.team4.team, defense: data.team4.defense, qualitative: data.team4.qualitative } : null,
                team5: data?.team5 ? { team: data.team5.team, defense: data.team5.defense, qualitative: data.team5.qualitative } : null,
                team6: data?.team6 ? { team: data.team6.team, defense: data.team6.defense, qualitative: data.team6.qualitative } : null
              },
              null,
              2
            )}
          </pre>
          <p style={{ fontSize: 12, color: '#666' }}>
            Defense pie = DB &quot;defense&quot; column: 0=weak, 1=harassment, 2=game changing (% of matches).
          </p>
        </div>
      )}
      {/* MATCH VIEW */}
      <div className={styles.matchView}>
          <div className={styles.matchNav}>
        <AllianceButtons t1={data.team1 || defaultTeam} t2={data.team2 || defaultTeam} t3={data.team3 || defaultTeam} colors={[COLORS[3], COLORS[4], COLORS[5]]}></AllianceButtons>
        <Link href={`/match-view?team1=${data.team1?.team || ""}&team2=${data.team2?.team || ""}&team3=${data.team3?.team || ""}&team4=${data.team4?.team || ""}&team5=${data.team5?.team || ""}&team6=${data.team6?.team || ""}`}><button style={{background: "#ffff88", color: "black"}}>Edit</button></Link>
        <AllianceButtons t1={data.team4 || defaultTeam} t2={data.team5 || defaultTeam} t3={data.team6 || defaultTeam} colors={[COLORS[0], COLORS[1], COLORS[2]]}></AllianceButtons>
      </div>

  <div className={styles.allianceHeadRow}>
    <div className={styles.headWidthRed}>
      <div className={styles.EPABox} style={{ backgroundColor: '#FFD4DC', borderColor: '#8B0000' }}>
                <div className={styles.epaLabel}>EPA</div>
                <div className={styles.epaValue}>{matchData.redAlliance.totalEPA}</div>
              </div>
              <div className={styles.EPABreakdown}>
                <div style={{ backgroundColor: '#F29FA6', borderColor: '#8B0000' }}>A: {matchData.redAlliance.autoEPA}</div>
                <div style={{ backgroundColor: '#F29FA6', borderColor: '#8B0000' }}>T: {matchData.redAlliance.teleEPA}</div>
                <div style={{ backgroundColor: '#F29FA6', borderColor: '#8B0000' }}>E: {matchData.redAlliance.endgameEPA}</div>
              </div>
              <div className={styles.RPs}>
                <div className={styles.rpLabel}>RPs</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.redAlliance.rps.victory ? '#C8F5D4' : '#FF7F7F' }}>Victory</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.redAlliance.rps.energized ? '#C8F5D4' : '#FF7F7F' }}>Energized</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.redAlliance.rps.supercharged ? '#C8F5D4' : '#FF7F7F' }}>Supercharged</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.redAlliance.rps.traversal ? '#C8F5D4' : '#FF7F7F' }}>Traversal</div>
              </div>
          </div>
              <div className={styles.headWidthBlue}>
      <div className={styles.EPABox} style={{ backgroundColor: '#D4E8F5', borderColor: '#00008B' }}>
                <div className={styles.epaLabel}>EPA</div>
                <div className={styles.epaValue}>{matchData.blueAlliance.totalEPA}</div>
              </div>
              <div className={styles.EPABreakdown}>
                <div style={{ backgroundColor: '#8FA5F5', borderColor: '#00008B' }}>A: {matchData.blueAlliance.autoEPA}</div>
                <div style={{ backgroundColor: '#8FA5F5', borderColor: '#00008B' }}>T: {matchData.blueAlliance.teleEPA}</div>
                <div style={{ backgroundColor: '#8FA5F5', borderColor: '#00008B' }}>E: {matchData.blueAlliance.endgameEPA}</div>
              </div>
              <div className={styles.RPs}>
                <div className={styles.rpLabel}>RPs</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.blueAlliance.rps.victory ? '#C8F5D4' : '#FF7F7F' }}>Victory</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.blueAlliance.rps.energized ? '#C8F5D4' : '#FF7F7F' }}>Energized</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.blueAlliance.rps.supercharged ? '#C8F5D4' : '#FF7F7F' }}>Supercharged</div>
                <div className={styles.rpCell} style={{ backgroundColor: matchData.blueAlliance.rps.traversal ? '#C8F5D4' : '#FF7F7F' }}>Traversal</div>
              </div>
            </div>
          </div>
          <div className={styles.allianceGraphs}>
            {/* Red Alliance - LEFT SIDE */}
            <div className={styles.allianceColumn}>
              <div className={styles.chartSection}>
                <h2>Fuel Distribution</h2>
                <div className={styles.pieChartWrapper}>
                  <Endgame colors={[COLORS[3][1], COLORS[4][1], COLORS[5][1]]} endgameData={redFuelData} />
                </div>
              </div>
              <div className={styles.radarSection}>
                <Qualitative radarData={radarData} teamIndices={[1, 2, 3]} colors={[COLORS[3][1], COLORS[4][1], COLORS[5][1]]} teamNumbers={[1, 2, 3]} />
              </div>
            </div>

            {/* Center - EPA Over Time */}
            <div className={styles.centerColumn}>
              <h2 className={styles.centerTitle}>EPA Over Time</h2>
              <EPALineChart data={epaTimeData}/>
          </div>

            {/* Blue Alliance - RIGHT SIDE */}
            <div className={styles.allianceColumn}>
              <div className={styles.chartSection}>
                <h2>Fuel Distribution</h2>
                <div className={styles.pieChartWrapper}>
                  <Endgame colors={[COLORS[0][1], COLORS[1][1], COLORS[2][1]]} endgameData={blueFuelData} />
                </div>
              </div>
              <div className={styles.radarSection}>
                <Qualitative radarData={redRadarData} teamIndices={[1, 2, 3]} colors={[COLORS[0][1], COLORS[1][1], COLORS[2][1]]} teamNumbers={[1, 2, 3]} />
              </div>
            </div>
          </div>
        </div>

      {/* INDIVIDUAL TEAM INFO */}
      <div className={styles.teamView}>
        <div className={styles.teamRow}>
          {teamsData.slice(0, 3).map((team, idx) => (
            <TeamCard key={`row1-${idx}`} team={team} />
          ))}
        </div>
        <div className={styles.teamRow}>
          {teamsData.slice(3, 6).map((team, idx) => (
            <TeamCard key={`row2-${idx}`} team={team} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Team Card Component
function TeamCard({ team }) {
  const defenseChartRef = useRef(null);
  const defenseChartInstance = useRef(null);
  const endgameChartRef = useRef(null);
  const endgameChartInstance = useRef(null);

  const hasDefenseData = team.defenseQuality && (team.defenseQuality.weak + team.defenseQuality.harassment + team.defenseQuality.gameChanging) > 0;

  useEffect(() => {
    // Defense Quality - Pie Chart (only when team has defense data)
    if (defenseChartRef.current) {
      if (defenseChartInstance.current) {
        defenseChartInstance.current.destroy();
        defenseChartInstance.current = null;
      }

      if (hasDefenseData) {
        const ctx = defenseChartRef.current.getContext('2d');
        const colors = [team.darkColor, team.color, team.lightColor || team.color];

        defenseChartInstance.current = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Harassment', 'Weak', 'Game Changing'],
            datasets: [{
              data: [team.defenseQuality.harassment, team.defenseQuality.weak, team.defenseQuality.gameChanging],
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { font: { size: 11 }, padding: 8, boxWidth: 12 } }
            }
          }
        });
      }
    }

    // Endgame Placement - Pie Chart
    if (endgameChartRef.current) {
      if (endgameChartInstance.current) {
        endgameChartInstance.current.destroy();
      }

      const ctx = endgameChartRef.current.getContext('2d');
      const colors = ['#a7a7a7', team.lightColor, team.color, team.darkColor];

      endgameChartInstance.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: [`None: ${team.endgamePlacement.none}%`, `L1: ${team.endgamePlacement.l1}%`, `L2: ${team.endgamePlacement.l2}%`, `L3: ${team.endgamePlacement.l3}%`],
          datasets: [{
            data: [team.endgamePlacement.none, team.endgamePlacement.l1, team.endgamePlacement.l2, team.endgamePlacement.l3],
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'left', labels: { font: { size: 11 }, padding: 8, boxWidth: 12 } }
          }
        }
      });
    }

    return () => {
      if (defenseChartInstance.current) defenseChartInstance.current.destroy();
      if (endgameChartInstance.current) endgameChartInstance.current.destroy();
    };
  }, [team, hasDefenseData]);

  return (
    <div className={styles.teamCard}>
      <div className={styles.teamHeader}>
        <h1 style={{ color: team.darkColor }}>{team.number}</h1>
        <h2 style={{ color: team.darkColor }}>{team.name}</h2>
      </div>
      <div className={styles.EPABox} style={{ backgroundColor: team.lightColor, borderColor: team.darkColor }}>
        <div className={styles.epaLabel}>EPA</div>
        <div className={styles.epaValue}>{team.epa}</div>
      </div>
      <div className={styles.EPABreakdown}>
        <div style={{ backgroundColor: team.color, borderColor: team.darkColor }}>A:{team.autoEPA}</div>
        <div style={{ backgroundColor: team.color, borderColor: team.darkColor }}>T:{team.teleEPA}</div>
        <div style={{ backgroundColor: team.color, borderColor: team.darkColor }}>E:{team.endgameEPA}</div>
      </div>
      <div className={styles.chartsRow}>
        <div className={styles.chartColumn}>
          <h3>Fouls</h3>
          <div className={styles.foulBox} style={{ borderColor: team.darkColor, backgroundColor: team.lightColor }}>
            <div className={styles.foulStat}>
              <span className={styles.foulLabel}>Mean</span>
              <span className={styles.foulValue} style={{ color: team.darkColor }}>{team.fouls.mean}</span>
            </div>
            <div className={styles.foulStat}>
              <span className={styles.foulLabel}>Median</span>
              <span className={styles.foulValue} style={{ color: team.darkColor }}>{team.fouls.median}</span>
            </div>
          </div>
        </div>
        <div className={styles.chartColumn}>
          <h3>Defense Quality</h3>
          <div className={styles.chartWrapper}>
            {hasDefenseData ? (
              <canvas ref={defenseChartRef}></canvas>
            ) : (
              <p className={styles.noDefenseMessage}>Did not play defense</p>
            )}
          </div>
        </div>
      </div>
      <div className={styles.endgameSection}>
        <h3>Endgame Placement</h3>
        <div className={styles.endgameWrapper}>
          <canvas ref={endgameChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}