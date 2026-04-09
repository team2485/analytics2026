"use client";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import VBox from "./components/VBox";
import ScoutsByMatch from "./components/ScoutsByMatch";
import Comments from "./components/Comments";
import TwoByTwo from "./components/TwoByTwo";
import ThreeByThree from "./components/ThreeByThree";
import FourByTwo from "./components/FourByTwo";
import EPALineChart from './components/EPALineChart';
import PiecePlacement from "./components/PiecePlacement";
import Endgame from "./components/Endgame";
import Qualitative from "./components/Qualitative";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, RadarChart, PolarRadiusAxis, PolarAngleAxis, PolarGrid, Radar, Legend } from 'recharts';
import ClimbTable from "./components/ClimbTable";
import VBoxCheck from "./components/VBoxCheck";






export default function TeamViewPage() {
   return (
       <Suspense>
           <TeamView />
       </Suspense>
   );
}


function filterNegative(value) {
 return typeof value === 'number' && value >= 0 ? value : 0;
}




function TeamView() {


   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const searchParams = useSearchParams();
   const team = searchParams.get("team");
   const hasTopBar = searchParams.get('team1') !== null;

   function round10(n) {
     const x = Number(n);
     return (x !== x) ? 0 : Math.round(x * 10) / 10; // NaN-safe, round to tenth
   }

   function normalizeTeamData(api) {
     if (!api) return null;
     const ep = api.endPlacement;
     // API may return L1/L2/L3 as { left, center, right } or legacy number; none is a number
     const toPos = (pct) => (typeof pct === 'object' && pct != null && 'left' in pct)
       ? { left: round10(pct.left), center: round10(pct.center), right: round10(pct.right) }
       : { left: 0, right: 0, center: round10(Number(pct) || 0) };
     const dq = api.defenseQuality && typeof api.defenseQuality === 'object' ? api.defenseQuality : {};
     const dl = api.defenseLocation && typeof api.defenseLocation === 'object' ? api.defenseLocation : {};
     return {
       ...api,
       team: api.team ?? 0,
       name: api.name ?? "—",
       avgEpa: round10(api.avgEpa),
       avgAuto: round10(api.avgAuto),
       avgTele: round10(api.avgTele),
       avgEnd: round10(api.avgEnd),
       last3Epa: round10(api.last3Epa),
       last3Auto: round10(api.last3Auto),
       last3Tele: round10(api.last3Tele),
       last3End: round10(api.last3End),
       epaOverTime: Array.isArray(api.epaOverTime) ? api.epaOverTime.map((d) => ({ ...d, epa: round10(d.epa) })) : [],
       autoOverTime: Array.isArray(api.autoOverTime) ? api.autoOverTime.map((d) => ({ ...d, auto: round10(d.auto) })) : [],
       teleOverTime: Array.isArray(api.teleOverTime) ? api.teleOverTime.map((d) => ({ ...d, tele: round10(d.tele) })) : [],
       consistency: round10(api.consistency),
       stuckOnFuel: round10(api.stuckOnFuel ?? api.stuckonfuel),
       stuckOnBump: round10(api.stuckOnBump ?? api.stuckonbump),
       shootingMechanism: api.shootingmechanism ?? api.shootingMechanism ?? "—",
       lastBreakdown: api.lastBreakdown ?? "N/A",
       noShow: round10((() => { const n = Number(api.noShow) ?? 0; return n <= 1 ? n * 100 : n; })()),
       breakdown: round10(api.breakdown),
       matchesScouted: Number(api.matchesScouted) ?? 0,
       scoutsByMatch: (() => {
         const raw = api.scouts;
         if (!Array.isArray(raw) || raw.length === 0) return [];
         const first = raw[0];
         if (
           first &&
           typeof first === "object" &&
           first !== null &&
           "match" in first &&
           Array.isArray(first.names)
         ) {
           return raw
             .map((g) => ({
               match: Number(g.match),
               names: g.names.filter(Boolean).map(String),
             }))
             .filter((g) => Number.isFinite(g.match))
             .sort((a, b) => a.match - b.match);
         }
         const legacy = [];
         raw.forEach((entry) => {
           const s = String(entry);
           const m = s.match(/^\s*\*Match\s+(\d+)\s*:\s*(.+?)\s*\*\s*$/is);
           if (m) {
             legacy.push({
               match: Number(m[1]),
               names: m[2]
                 .split(/\s*,\s*/)
                 .map((n) => n.trim())
                 .filter(Boolean),
             });
           }
         });
         return legacy.sort((a, b) => a.match - b.match);
       })(),
       generalComments: Array.isArray(api.generalComments) ? api.generalComments : [],
       breakdownComments: Array.isArray(api.breakdownComments) ? api.breakdownComments : [],
       defenseComments: Array.isArray(api.defenseComments) ? api.defenseComments : [],
       foulComments: Array.isArray(api.foulComments) ? api.foulComments : [],
       autoclimb: {
         success: round10(api.auto?.climb?.successRate),
         fail: round10(api.auto?.climb?.failRate),
         none: round10(api.auto?.climb?.noneRate),
       },
       autoMedianFuel: round10(api.auto?.fuel?.avgFuel),
       teleMedianFuel: round10(api.tele?.fuel?.avgFuel),
       passing: {
         bulldozer: round10(api.tele?.passing?.bulldozer),
         shooter: round10(api.tele?.passing?.shooter),
         dump: round10(api.tele?.passing?.dump),
       },
       defenseQuality: {
         weak: round10(dq.weak),
         harassment: round10(dq.harassment),
         gameChanging: round10(dq.gameChanging),
       },
       defenseLocation: {
         allianceZone: round10(dl.allianceZone),
         neutralZone: round10(dl.neutralZone),
         trench: round10(dl.trench),
         bump: round10(dl.bump),
         tower: round10(dl.tower),
         outpost: round10(dl.outpost),
         hub: round10(dl.hub),
       },
       endPlacement: {
         none: ep?.none != null ? { left: 0, right: 0, center: round10(Number(ep.none)) } : { left: 0, right: 0, center: 0 },
         L1: ep?.L1 != null ? toPos(ep.L1) : { left: 0, right: 0, center: 0 },
         L2: ep?.L2 != null ? toPos(ep.L2) : { left: 0, right: 0, center: 0 },
         L3: ep?.L3 != null ? toPos(ep.L3) : { left: 0, right: 0, center: 0 },
       },
       qualitative: Array.isArray(api.qualitative)
         ? api.qualitative.map((q) => ({ ...q, rating: typeof q.rating === 'number' && !isNaN(q.rating) ? round10(q.rating) : q.rating }))
         : [],
       groundIntake: Boolean(api.intakeGround ?? api.groundIntake),
       outpostIntake: Boolean(api.intakeOutpost ?? api.outpostIntake),
       shootWhileMove: Boolean(api.shootWhileMove),
       bumpTrav: Boolean(api.bump),
       trenchTrav: Boolean(api.trench),
       wideClimb: Boolean(api.wideClimb ?? api.wideclimb),
      meanMajorFouls: round10(api.meanMajorFouls),
      medianMajorFouls: round10(api.medianMajorFouls),
      meanMinorFouls: round10(api.meanMinorFouls),
      medianMinorFouls: round10(api.medianMinorFouls),
     };
   }

   useEffect(() => {
     if (!team) {
       setLoading(false);
       setData(null);
       return;
     }
     setLoading(true);
     setError(null);
     fetch(`/api/get-team-data?team=${encodeURIComponent(team)}`)
       .then((res) => {
         if (!res.ok) throw new Error(res.status === 404 ? `No data for team ${team}` : "Failed to fetch data");
         return res.json();
       })
       .then((apiData) => setData(normalizeTeamData(apiData)))
       .catch((err) => {
         setError(err.message);
         setData(null);
       })
       .finally(() => setLoading(false));
   }, [team]);

   function AllianceButtons({t1, t2, t3, colors}) {
     return <div className={styles.allianceBoard}>
       <Link href={`/team-view?team=${t1 || ""}&${searchParams.toString()}`}>
         <button style={team == t1 ? {background: 'black', color: 'yellow'} : {background: colors[0][1]}}>{t1 || 404}</button>
       </Link>
       <Link href={`/team-view?team=${t2 || ""}&${searchParams.toString()}`}>
         <button style={team == t2 ? {background: 'black', color: 'yellow'} : {background: colors[1][1]}}>{t2 || 404}</button>
       </Link>
       <Link href={`/team-view?team=${t3 || ""}&${searchParams.toString()}`}>
         <button style={team == t3 ? {background: 'black', color: 'yellow'} : {background: colors[2][1]}}>{t3 || 404}</button>
       </Link>
     </div>
   }
   function TopBar() {
     const COLORS = [
       ["#B7F7F2", "#A1E7E1", "#75C6BF", "#5EB5AE"],
       ["#8AB8FD", "#7D99FF", "#6184DD", "#306BDD"],
       ["#E1BFFA", "#E1A6FE", "#CA91F2", "#A546DF"],
       ["#FFC6F6", "#ECA6E0", "#ED75D9", "#C342AE"],
       ["#FABFC4", "#FEA6AD", "#F29199", "#E67983"],
       ["#FFE3D3", "#EBB291", "#E19A70", "#D7814F"],
     ];
     if (!hasTopBar) {
       return <></>
     }
     return <div className={styles.matchNav}>
       <AllianceButtons t1={searchParams.get('team1')} t2={searchParams.get('team2')} t3={searchParams.get('team3')} colors={[COLORS[0], COLORS[1], COLORS[2]]}></AllianceButtons>
       <Link href={`/match-view?team1=${searchParams.get('team1') || ""}&team2=${searchParams.get('team2') || ""}&team3=${searchParams.get('team3') || ""}&team4=${searchParams.get('team4') || ""}&team5=${searchParams.get('team5') || ""}&team6=${searchParams.get('team6') || ""}&go=go`}><button style={{background: "#ffff88", color: "black"}}>Match</button></Link>
       <AllianceButtons t1={searchParams.get('team4')} t2={searchParams.get('team5')} t3={searchParams.get('team6')} colors={[COLORS[3], COLORS[4], COLORS[5]]}></AllianceButtons>
     </div>
   }




   if (!team) {
       return (
           <div>
               <form className={styles.teamInputForm}>
                   <span>{error}</span>
                   <label htmlFor="team">Team: </label>
                   <input id="team" name="team" placeholder="Team #" type="number"></input>
                   <br></br>
                   <button>Go!</button>
               </form>
           </div>
       );
   }


   if (loading) {
       return (
           <div>
               <h1>Loading...</h1>
           </div>
       );
   }

   if (!data) {
       return (
           <div>
               <h1>No data found for team {team}</h1>
               {error && <p style={{ color: '#c00' }}>{error}</p>}
           </div>
       );
   }

   const Colors = [
       //light to dark
       ["#CCFBF7", "#76E3D3", "#18a9a2", "#117772"], //green
       ["#D7F2FF", "#7dd4ff", "#38b6f4", "#0A6D9F"], //blue
       ["#D7D8FF", "#a0a3fb", "#8488FF", "#2022AA"], //blue-purple
       ["#F3D8FB", "#DBA2ED", "#C37DDB", "#8E639C"], //pink-purple
       ["#FFDDF3", "#EDA2DB", "#DD64C0", "#9C6392"], //pink
   ];


   const epaColors = {
     red1: "#fa8888",
     red2: "#F7AFAF",
     yellow1: "#ffe16b",
     yellow2: "#ffff9e",
     green1: "#7FD689",
     green2: "#c4f19f",
   }


   //overall last3epa
   let overallLast3 = epaColors.yellow1;
   if ((data.avgEpa + 12) < data.last3Epa) overallLast3 = epaColors.green1;
   else if ((data.avgEpa - 12) > data.last3Epa) overallLast3 = epaColors.red1;


   //auto last3epa
   let autoLast3 = epaColors.yellow2;
   if ((data.avgAuto + 6) < data.last3Auto) autoLast3 = epaColors.green2;
   else if ((data.avgAuto - 6) > data.last3Auto) autoLast3 = epaColors.red2;


   //tele last3epa
   let teleLast3 = epaColors.yellow2;
   if ((data.avgTele + 10) < data.last3Tele) teleLast3 = epaColors.green2;
   else if ((data.avgTele - 10) > data.last3Tele) teleLast3 = epaColors.red2;


   //tele last3epa
   let endLast3 = epaColors.yellow2;
   if ((data.avgEnd + 6) < data.last3End) endLast3 = epaColors.green2;
   else if ((data.avgEnd - 6) > data.last3End) endLast3 = epaColors.red2;


   const endgamePieData = [
       { x: 'None', y: (data.endPlacement.none.left+data.endPlacement.none.right+data.endPlacement.none.center)},
       { x: 'L1', y: (data.endPlacement.L1.left+data.endPlacement.L1.right+data.endPlacement.L1.center)},
       { x: 'L2', y: (data.endPlacement.L2.left+data.endPlacement.L2.right+data.endPlacement.L2.center)},
       { x: 'L3', y: (data.endPlacement.L3.left+data.endPlacement.L3.right+data.endPlacement.L3.center)}
   ];
   const autoPieData = [
    { x: 'None', y: (data.autoclimb.none)},
    { x: 'Success', y: (data.autoclimb.success)},
    { x: 'Fail', y: (data.autoclimb.fail)},
];




   return (<div>
         <TopBar></TopBar>
       <div className={styles.MainDiv}>
           <div className={styles.leftColumn}>
               <h1 style={{ color: Colors[0][3] }}>Team {data.team} View</h1>
               <h3>{data.name}</h3>
               <div className={styles.EPAS}>
                   <div className={styles.EPA}>
                       <div className={styles.scoreBreakdownContainer}>
                           <div style={{ background: Colors[0][1] }} className={styles.epaBox}>{Math.round(10*data.avgEpa)/10}</div>
                           <div className={styles.epaBreakdown}>
                               <div style={{ background: Colors[0][0] }}>A: {Math.round(10*data.avgAuto)/10}</div>
                               <div style={{ background: Colors[0][0] }}>T: {Math.round(10*data.avgTele)/10}</div>
                               <div style={{ background: Colors[0][0] }}>E: {Math.round(10*data.avgEnd)/10}</div>
                           </div>
                       </div>
                   </div>
                   <div className={styles.Last3EPA}>
                       <div className={styles.scoreBreakdownContainer}>
                           <div style={{background: overallLast3}} className={styles.Last3EpaBox}>{Math.round(10*data.last3Epa)/10}</div>
                             <div className={styles.epaBreakdown}>
                               <div style={{background: autoLast3}}>A: {Math.round(10*data.last3Auto)/10}</div>
                               <div style={{background: teleLast3}}>T: {Math.round(10*data.last3Tele)/10}</div>
                               <div style={{background: endLast3}}>E: {Math.round(10*data.last3End)/10}</div>
                             </div>
                           </div>
                         </div>
                   </div>
               <div className={styles.graphContainer}>
                   <h4 className={styles.graphTitle}>EPA Over Time</h4>
                   <EPALineChart 
                   data={data.epaOverTime} 
                   color={Colors[0][3]} 
                   label={"epa"} 
                   teamNumber={data.team}
                   />
                 </div>
               <div className={styles.valueBoxes}>
                 <div className={styles.leftColumnBoxes}>
                   <div className={styles.leftBoxR1}>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Consistency"} value={typeof data.consistency === 'number' ? `${Math.round(10 * data.consistency) / 10}%` : data.consistency}/>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Stuck on Fuel Easily"} value={typeof data.stuckOnFuel === 'number' ? `${Math.round(10 * data.stuckOnFuel) / 10}%` : data.stuckOnFuel}/>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Stuck on Bump"} value={typeof data.stuckOnBump === 'number' ? `${Math.round(10 * data.stuckOnBump) / 10}%` : data.stuckOnBump}/>
                   </div>
                   <div className={styles.leftBoxR2}>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"No Show"} value={data.noShow + "%"}/>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Breakdown"} value={data.breakdown + "%"}/>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Matches Scouted"} value={data.matchesScouted}/>
                   </div>
                   <div className={styles.leftBoxR3}>
                     <VBoxCheck color1={Colors[0][1]} color2={Colors[0][0]} title={"Shoot While Move?"} value={data.shootWhileMove}/>
                     <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Shooting Mech."} value={data.shootingMechanism}/>
                     <table className={styles.horizontalTable2}> 
                     <tbody>
                      <tr>
                        <td style={{backgroundColor: Colors[0][1]}}>Bump</td>
                        <td style={{backgroundColor: Colors[0][1]}}>Trench</td>
                      </tr>
                      <tr>
                        <td className={styles.coloredBoxes} style={{backgroundColor: Colors[0][0], width: "50px", height: "30px"}}><input id="bumpcheck" type="checkbox" readOnly checked={data.bumpTrav}></input></td>
                        <td className={styles.coloredBoxes} style={{backgroundColor: Colors[0][0], width: "50px", height: "30px"}}><input id="trenchcheck" type="checkbox" readOnly checked={data.trenchTrav}></input></td>
                      </tr>
                    </tbody>
                    </table>
                 </div>
                 <div className={styles.leftBoxR4}>
                 <VBox color1={Colors[0][1]} color2={Colors[0][0]} title={"Last Breakdown"} value={data.lastBreakdown}/>
                   <table className={styles.horizontalTable}> 
                  <tbody>
                    <tr>
                      <td style={{backgroundColor: Colors[0][2]}} rowSpan="2">Intake</td>
                      <td style={{backgroundColor: Colors[0][1]}}>Ground</td>
                      <td style={{backgroundColor: Colors[0][1]}}>Outpost</td>
                    </tr>
                    <tr>
                    <td className={styles.coloredBoxes} style={{backgroundColor: Colors[0][0], width: "50px", height: "30px"}}><input id="groundcheck" type="checkbox" readOnly checked={data.groundIntake}></input></td>
                    <td className={styles.coloredBoxes} style={{backgroundColor: Colors[0][0], width: "50px", height: "30px"}}><input id="groundcheck" type="checkbox" readOnly checked={data.outpostIntake}></input></td>
                    </tr>
                  </tbody>
                  </table>
               </div>
                 </div>
                 <div className={styles.allComments}>
                   <Comments color1={Colors[0][1]} color2={Colors[0][0]} title={"General Comments"} value={data.generalComments} />
                   <Comments color1={Colors[0][1]} color2={Colors[0][0]} title={"Breakdown Comments"} value={data.breakdownComments} />
                   <Comments color1={Colors[0][1]} color2={Colors[0][0]} title={"Defense Comments"} value={data.defenseComments} />
                   <Comments color1={Colors[0][1]} color2={Colors[0][0]} title={"Foul Elaboration"} value={data.foulComments} />
                 </div>
                 <ScoutsByMatch
                   color1={Colors[0][1]}
                   color2={Colors[0][0]}
                   title={"Scouts"}
                   groups={data.scoutsByMatch}
                 />
               </div>
         </div>




 <div className={styles.rightColumn}>
   <div className={styles.topRow}>
     <div className={styles.auto}>
       <h1 style={{ color: Colors[1][3] }}>Auto</h1>
         <div className={styles.graphContainer}>
             <h4 className={styles.graphTitle}>Auto Over Time</h4>
             <EPALineChart
               data={data.autoOverTime}
               color={Colors[1][3]}
               label={"auto"}
               teamNumber={data.team}
             />
         </div>
      <div className={styles.autoBox}>
        <VBox color1={Colors[1][2]} color2={Colors[1][0]} color3={Colors[1][2]} title={"Median Fuel"} value={data.autoMedianFuel}/>
        <h4 className={styles.graphTitle}>Auto Climb Success</h4>
        <div className={styles.autoPieBox}>
          <Endgame
            data={autoPieData}
            color={Colors[1]}
          />
        </div>
      </div>
     </div>


     <div className={styles.tele}>
       <h1 style={{ color: Colors[2][3] }}>Tele</h1>
         <div className={styles.graphContainer}>
           <h4 className={styles.graphTitle}>Tele Over Time</h4>
             <EPALineChart
               data={data.teleOverTime}
               color={Colors[2][3]}
               label={"tele"}
               teamNumber={data.team}
             />
           </div>
      
     <div className={styles.teleRightAlignment}>
       <div className={styles.alignElements}>
           <div className={styles.alignElements}>
             <div className={styles.rightColumnBoxesTwo}>

          <div className={styles.desktopTables}>
          
          <div className={styles.hBox1}>
            <VBox color1={Colors[2][2]} color2={Colors[2][0]} color3={Colors[2][2]} title={"Median Fuel"} value={Math.round(10*data.teleMedianFuel)/10} />
    
            <table className={styles.horizontalTable}> 
                <tbody>
                  <tr>
                    <td style={{backgroundColor: Colors[2][2]}} rowSpan="2">Passing</td>
                    <td style={{backgroundColor: Colors[2][1]}}>Shooter</td>
                    <td style={{backgroundColor: Colors[2][1]}}>Bulldozer</td>
                    <td style={{backgroundColor: Colors[2][1]}}>Dump</td>
                  </tr>
                  <tr>
                    <td style={{backgroundColor: Colors[2][0]}}>{data.passing.shooter}%</td>
                    <td style={{backgroundColor: Colors[2][0]}}>{data.passing.bulldozer}%</td>
                    <td style={{backgroundColor: Colors[2][0]}}>{data.passing.dump}%</td>
                  </tr>
                </tbody>
              </table>
              </div>
              
              <div className={styles.hBox}>
              <div className={styles.hBox3}>
              <table className={styles.verticalTable1}> 
                  <tbody>
                    <tr>
                      <th style={{backgroundColor: Colors[2][2]}}>Defense Quality</th>
                      <td style={{backgroundColor: Colors[2][2]}}>%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Weak</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.weak}%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Harassment</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.harassment}%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Game Changing</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.gameChanging}%</td>
                    </tr>
                  </tbody>
              </table>
              
            </div>

            <div className={styles.hBox2}>
            <div className={styles.foulsTableWrap}>
            <table className={styles.horizontalTable}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: 'white', borderTop: 'hidden', borderLeft: 'hidden', borderBottomStyle: 'none', borderRightStyle: 'none' }} aria-hidden="true" />
                    <td style={{ backgroundColor: Colors[2][1] }}>Mn. Fouls</td>
                    <td style={{ backgroundColor: Colors[2][1] }}>Mj. Fouls</td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: Colors[2][1] }}>Median</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.medianMinorFouls}</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.medianMajorFouls}</td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: Colors[2][1] }}>Mean</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.meanMinorFouls}</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.meanMajorFouls}</td>
                  </tr>
                </tbody>
            </table>
            </div>
            <table className={styles.horizontalDTable}> 
              <tbody>
                <tr>
                  <td style={{backgroundColor: Colors[2][2]}} rowSpan="2">Defense</td>
                  <td style={{backgroundColor: Colors[2][1]}}>AZ</td>
                  <td style={{backgroundColor: Colors[2][1]}}>NZ</td>
                </tr>
                <tr>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.defenseLocation.allianceZone}%</td>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.defenseLocation.neutralZone}%</td>
                </tr>
              </tbody>
            </table>
            </div>
            </div>
            </div>

          <div className={styles.mobileTables}>
          <table className={styles.horizontalTable}> 
              <tbody>
                <tr>
                  <td style={{backgroundColor: Colors[2][2]}} rowSpan="2">Passing</td>
                  <td style={{backgroundColor: Colors[2][1]}}>Shooter</td>
                  <td style={{backgroundColor: Colors[2][1]}}>Bulldozer</td>
                  <td style={{backgroundColor: Colors[2][1]}}>Dump</td>
                </tr>
                <tr>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.passing.shooter}%</td>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.passing.bulldozer}%</td>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.passing.dump}%</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.vDefBox}>
              <div className={styles.vDefBox1}>
                <div className={styles.vBox3}>
                <VBox color1={Colors[2][2]} color2={Colors[2][0]} color3={Colors[2][2]} title={"Median Fuel"} value={Math.round(10*data.teleMedianFuel)/10} />
                <div className={styles.foulsTableWrap}>
                <table className={styles.horizontalTable}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: 'white', borderTop: 'hidden', borderLeft: 'hidden', borderBottomStyle: 'none', borderRightStyle: 'none' }} aria-hidden="true" />
                    <td style={{ backgroundColor: Colors[2][1] }}>Mn. Fouls</td>
                    <td style={{ backgroundColor: Colors[2][1] }}>Mj. Fouls</td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: Colors[2][1] }}>Median</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.medianMinorFouls}</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.medianMajorFouls}</td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: Colors[2][1] }}>Mean</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.meanMinorFouls}</td>
                    <td style={{ backgroundColor: Colors[2][0] }}>{data.meanMajorFouls}</td>
                  </tr>
                </tbody>
                </table>
                </div>
                </div>
                </div>

                <div className={styles.vBox4}>
                <table className={styles.verticalTable1}> 
                  <tbody>
                    <tr>
                      <th style={{backgroundColor: Colors[2][2]}}>Defense Quality</th>
                      <td style={{backgroundColor: Colors[2][2]}}>%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Weak</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.weak}%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Harassment</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.harassment}%</td>
                    </tr>
                    <tr>
                      <th style={{backgroundColor: Colors[2][1]}}>Game Changing</th>
                      <td style={{backgroundColor: Colors[2][0]}}>{data.defenseQuality.gameChanging}%</td>
                    </tr>
                  </tbody>
                </table>
            <table className={styles.verticalDTable}> 
              <tbody>
                <tr>
                  <th style={{backgroundColor: Colors[2][2]}}>Defense</th>
                  <td style={{backgroundColor: Colors[2][2]}}>%</td>
                </tr>
                <tr>
                  <th style={{backgroundColor: Colors[2][1]}}>AZ</th>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.defenseLocation.allianceZone}%</td>
                </tr>
                <tr>
                  <th style={{backgroundColor: Colors[2][1]}}>NZ</th>
                  <td style={{backgroundColor: Colors[2][0]}}>{data.defenseLocation.neutralZone}%</td>
                </tr>
              </tbody>
            </table>
            </div>
            </div>
          </div>

            </div>
         </div>
       </div>
     </div>
   </div>
   </div>
       <div className={styles.bottomRow}>
         <div className={styles.endgame}>
           <h1 className={styles.header} style={{ color: Colors[3][3] }}>Endgame</h1>
             <div className={styles.chartContainer}>
               <h4 className={styles.graphTitle}>Endgame Placement</h4>
               </div>
            <div className={styles.endPieBox}>
              <Endgame
                data={endgamePieData}
                color={Colors[3]}
              />
             </div>
             <div className={styles.endBoxes}>
             <VBoxCheck color1={Colors[3][1]} color2={Colors[3][0]} title={"Wide Climb?"} value={data.wideClimb}/>
              {/* <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Left</th>
                    <th>Center</th>
                    <th>Right</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>L3</td>
                    <td>#</td>
                    <td>#</td>
                    <td>#</td>
                  </tr>
                  <tr>
                    <td>L2</td>
                    <td>#</td>
                    <td>#</td>
                    <td>#</td>
                  </tr>
                  <tr>
                    <td>L1</td>
                    <td>#</td>
                    <td>#</td>
                    <td>#</td>
                  </tr>
                </tbody>
              </table> */}
              <ClimbTable
                R1C1={data.endPlacement.L3.left}
                R1C2={data.endPlacement.L3.center}
                R1C3={data.endPlacement.L3.right}
                R2C1={data.endPlacement.L2.left}
                R2C2={data.endPlacement.L2.center}
                R2C3={data.endPlacement.L2.right}
                R3C1={data.endPlacement.L1.left}
                R3C2={data.endPlacement.L1.center}
                R3C3={data.endPlacement.L1.right}
                color1={Colors[3][2]} 
                color2={Colors[3][1]}
                color3={Colors[3][0]}
              ></ClimbTable>
             </div>
         </div>


         <div className={styles.qualitative}>
         <h1 className={styles.header} style={{ color: Colors[4][3] }}>Qualitative</h1>
           <div className={styles.radarContainer}>
           <h4 className={styles.graphTitle} >Qualitative Ratings</h4>
           <Qualitative
               data={data.qualitative.map(q => ({
                 ...q,
                 rating: filterNegative(q.rating)
               }))}
               color1={Colors[4][2]}
               color2={Colors[4][2]}
             />
           <p>*Inverted so outside is good</p>
         </div>
        
       </div>
       </div>
   </div>
   </div>
   </div>
   )


 }