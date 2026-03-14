'use client';

import styles from "./page.module.css";
import { useEffect, useState, useRef} from "react";

export default function Picklist() {
  console.log("yes?");
  const [fields, setFields] = useState([]);
  const [picklist, setPicklist] = useState([]);
  const [maxScore, setMaxScore] = useState(1);
  const [teamsToExclude, setTeamsToExclude] = useState(new Array(24));
  const [allianceData, setAllianceData] = useState({});
  const [weights, setWeights] = useState({});
  const [teamRatings, setTeamRatings] = useState({});
  const [weightsChanged, setWeightsChanged] = useState(false);
  const [isClient, setIsClient] = useState(false);


  const weightsFormRef = useRef();
  const alliancesFormRef = useRef();

  const greenToRedColors = ["#9ADC83", "#BECC72", "#E1BB61", "#F0A56C", "#FF8E76"];

  useEffect(() => {
    setIsClient(true);
    const urlParams = new URLSearchParams(window.location.search);
  
    // Weight keys filter
    const weightKeys = ['epa', 'last3epa', 'fuel', 'tower', 'passing', 'defense', 'auto', 'consistency', 'epaCapacity'];
    const urlWeights = Object.fromEntries(
      Array.from(urlParams).filter(([key]) => weightKeys.includes(key))
    );
    setWeights(urlWeights);
    // Alliance data parsing
    const urlAlliances = {};
    const urlTeamsToExclude = new Array(32).fill('');
    urlParams.forEach((value, key) => {
      if (key.startsWith('A') && key.includes('T')) {
        const match = key.match(/A(\d+)T(\d+)/);
        if (match) {
          const [_, allianceNumber, teamPosition] = match;
          if (!urlAlliances[allianceNumber]) {
            urlAlliances[allianceNumber] = [];
          }
          const index = parseInt(teamPosition) - 1;
          urlAlliances[allianceNumber][index] = value;
          urlTeamsToExclude[((parseInt(allianceNumber) - 1) * 4) + index] = +value;
        }
      }
    });
    
    setAllianceData(urlAlliances);
    setTeamsToExclude(urlTeamsToExclude);
  }, []);

  async function recalculate(event) {
    const formData = new FormData(weightsFormRef.current);
    const weightEntries = [...formData.entries()];
    const newWeights = Object.fromEntries(weightEntries);
    setWeights(newWeights);

    const urlParams = new URLSearchParams([...weightEntries, ...Object.entries(allianceData).flatMap(([allianceNumber, teams]) => teams.map((team, index) => [`T${allianceNumber}A${index + 1}`, team]))]);
    window.history.replaceState(null, '', `?${urlParams.toString()}`);
    
    const picklist = await fetch('/api/compute-picklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weightEntries),
    }).then(resp => resp.json());

    setPicklist(Array.isArray(picklist) ? picklist : []);
    setMaxScore(Array.isArray(picklist) && picklist.length > 0 ? picklist[0].score : 1);
    setWeightsChanged(false);
  }

  function updateAlliancesData(allianceNumber, allianceTeams) {
    // This function updates the URL with the current alliance data
    const urlParams = new URLSearchParams([
      ...Object.entries(weights), 
      ...Object.entries({
        ...allianceData,
        [allianceNumber]: allianceTeams
      }).flatMap(([allianceNum, teams]) => 
        teams.filter(team => team).map((team, index) => [`A${allianceNum}T${index + 1}`, team])
      )
    ]);
    window.history.replaceState(null, '', `?${urlParams.toString()}`);
  }

  const Weights = () => {
    const handleWeightChange = (e) => {
      setWeightsChanged(true);
      const { name, value } = e.target;
      setWeights(prevWeights => ({ ...prevWeights, [name]: parseFloat(value) }));
    }

    // BIG MUST: CHANGE THE BACKEND LOGIC FOR EACH OF THESE NEW VALUE NAMES
    return <table className={styles.weightsTable}>
      <tbody>
        <tr>
          <td><label htmlFor="epa">EPA:</label></td>
          <td><input id="epa" type="number" value={weights.epa || 0} name="epa" onChange={handleWeightChange}></input></td>
          <td><label htmlFor="last3epa">Last 3 EPA:</label></td>
          <td><input id="last3epa" type="number" value={weights.last3epa || 0} name="last3epa" onChange={handleWeightChange}></input></td>
        </tr>
        <tr>
          <td><label htmlFor="fuel">Fuel:</label></td>
          <td><input id="fuel" type="number" value={weights.fuel || 0} name="fuel" onChange={handleWeightChange}></input></td>
          <td><label htmlFor="tower">Tower:</label></td>
          <td><input id="tower" type="number" value={weights.tower || 0} name="tower" onChange={handleWeightChange}></input></td>
        </tr>
        <tr>
          <td><label htmlFor="passing">Passing:</label></td>
          <td><input id="passing" type="number" value={weights.passing || 0} name="passing" onChange={handleWeightChange}></input></td>
          <td><label htmlFor="defense">Defense:</label></td>
          <td><input id="defense" type="number" value={weights.defense || 0} name="defense" onChange={handleWeightChange}></input></td>
        </tr>
        <tr>
          <td><label htmlFor="auto">Auto:</label></td>
          <td><input id="auto" type="number" value={weights.auto || 0} name="auto" onChange={handleWeightChange}></input></td>
          <td><label htmlFor="consistency">Cnstcy:</label></td>
          <td><input id="consistency" type="number" value={weights.consistency || 0} name="consistency" onChange={handleWeightChange}></input></td>
        </tr>
        <tr>
          <td><label htmlFor="epaCapacity">EPA Cap:</label></td>
          <td><input id="epaCapacity" type="number" value={weights.epaCapacity || 0} name="epaCapacity" onChange={handleWeightChange}></input></td>
        </tr>
      </tbody>
    </table>
  }

  
  function CommentCell({ team }) {
    const [comment, setComment] = useState('');
    const [mounted, setMounted] = useState(false);
  
    useEffect(() => {
      setMounted(true);
      const savedComments = localStorage.getItem('teamComments');
      if (savedComments) {
        const comments = JSON.parse(savedComments);
        setComment(comments[team] || '');
      }
    }, [team]);
  
    const handleChange = (e) => {
      const newComment = e.target.value;
      setComment(newComment);
      
      const savedComments = JSON.parse(localStorage.getItem('teamComments') || '{}');
      savedComments[team] = newComment;
      localStorage.setItem('teamComments', JSON.stringify(savedComments));
    };
  
    if (!mounted) {
      return <textarea className={styles.commentBox} />;
    }
  
    return (
      <textarea 
        value={comment}
        onChange={handleChange}
        className={styles.commentBox}
      />
    );
  }

  useEffect(() => {
    console.log('useEffect starting...');
    setIsClient(true);
    console.log('isClient set to true');
    // First, try to load alliance data from localStorage
    const storedAlliances = localStorage.getItem('allianceData');
    console.log('Retrieved from localStorage:', storedAlliances);
    let localStorageAlliances = {};
    if (storedAlliances) {
      localStorageAlliances = JSON.parse(storedAlliances);
    }
  
    const urlParams = new URLSearchParams(window.location.search);
    const urlWeights = Object.fromEntries(urlParams);
    setWeights(urlWeights);
  
    const storedRatings = localStorage.getItem('teamRatings');
    if (storedRatings) {
      setTeamRatings(JSON.parse(storedRatings));
    }
  
    // Process URL parameters for alliances
    const urlAlliances = {};
    let urlTeamsToExclude = new Array(32);
    
    for (const [key, value] of urlParams.entries()) {
      if (key.startsWith('A') && key.includes('T')) {
        const [, allianceNumber, teamPosition] = key.match(/A(\d+)T(\d+)/);
        if (!urlAlliances[allianceNumber]) {
          urlAlliances[allianceNumber] = [];
        }
        urlAlliances[allianceNumber][parseInt(teamPosition) - 1] = value;
        
        if (value) {
          urlTeamsToExclude[((parseInt(allianceNumber) - 1) * 4) + (parseInt(teamPosition) - 1)] = +value;
        }
      }
    }
    
    // Use URL alliances if available, otherwise use localStorage data
    const finalAllianceData = Object.keys(urlAlliances).length > 0 
      ? urlAlliances 
      : localStorageAlliances;
    
    setAllianceData(finalAllianceData);
    
    // Update teams to exclude based on alliance data
    if (Object.keys(finalAllianceData).length > 0) {
      let updatedTeamsToExclude = new Array(32);
      Object.entries(finalAllianceData).forEach(([allianceNumber, teams]) => {
        teams.forEach((team, index) => {
          if (team) {
            updatedTeamsToExclude[((parseInt(allianceNumber) - 1) * 4) + index] = +team;
          }
        });
      });
      setTeamsToExclude(updatedTeamsToExclude);
    }
  }, []);



  const AllianceRow = ({ allianceNumber, allianceData, handleAllianceChange }) => {
    const firstValue = allianceData ? allianceData[0] : '';
    const secondValue = allianceData ? allianceData[1] : '';
    const thirdValue = allianceData ? allianceData[2] : '';
    const fourthValue = allianceData ? allianceData[3] : '';

    return (
      <tr>
        <td>A{allianceNumber}</td>
        <td><label htmlFor={`A${allianceNumber}T1`}></label><input name={`A${allianceNumber}T1`} type="number" defaultValue={firstValue}
          onBlur={e => {
            handleAllianceChange(allianceNumber, [e.target.value, secondValue, thirdValue, fourthValue]);
          }}></input></td>
        <td><label htmlFor={`A${allianceNumber}T2`}></label><input name={`A${allianceNumber}T2`} type="number" defaultValue={secondValue}
          onBlur={e => {
            handleAllianceChange(allianceNumber, [firstValue, e.target.value, thirdValue, fourthValue])
          }}></input></td>
        <td><label htmlFor={`A${allianceNumber}T3`}></label><input name={`A${allianceNumber}T3`} type="number" defaultValue={thirdValue}
          onBlur={e => {
            handleAllianceChange(allianceNumber, [firstValue, secondValue, e.target.value, fourthValue])
          }}></input></td>
        <td><label htmlFor={`A${allianceNumber}T4`}></label><input name={`A${allianceNumber}T4`} type="number" defaultValue={fourthValue}
          onBlur={e => {
            handleAllianceChange(allianceNumber, [firstValue, secondValue, thirdValue, e.target.value])
          }}></input></td>
      </tr>
    )
  };

  const handleAllianceChange = (allianceNumber, allianceTeams) => {
    const updatedAllianceData = {
      ...allianceData,
      [allianceNumber]: allianceTeams
    };
    
    setAllianceData(updatedAllianceData);
    
    // Save to localStorage
    localStorage.setItem('allianceData', JSON.stringify(updatedAllianceData));
    
    // Update teams to exclude
    let updatedTeamsToExclude = [...teamsToExclude];
    allianceTeams.forEach((team, index) => {
      const position = ((parseInt(allianceNumber) - 1) * 4) + index;
      updatedTeamsToExclude[position] = team ? +team : undefined;
    });
    setTeamsToExclude(updatedTeamsToExclude);
    
    updateAlliancesData(allianceNumber, allianceTeams);
  };

const handleAllianceClear = () => {
  // 1. Clear alliance data in state
  const clearedAllianceData = {};
  for (let i = 1; i <= 8; i++) clearedAllianceData[i] = ['', '', '', ''];
  setAllianceData(clearedAllianceData);

  // 2. Clear localStorage
  localStorage.setItem('allianceData', JSON.stringify(clearedAllianceData));
  
  // 3. Reset team exclusions
  setTeamsToExclude(new Array(32).fill(''));

  // 4. Build new URL params
  const newParams = new URLSearchParams(weights);
  
  // 5. Remove all alliance parameters
  for (let i = 1; i <= 8; i++) {
    for (let j = 1; j <= 4; j++) {
      newParams.delete(`A${i}T${j}`);
    }
  }

  // 6. Update URL
  window.history.replaceState(null, '', `?${newParams.toString()}`);
};

  function PicklistTable() {
    
    const valueToColor = (value) => {
      if (value > 0.8) return greenToRedColors[0];
      if (value > 0.6) return greenToRedColors[1];
      if (value > 0.4) return greenToRedColors[2];
      if (value > 0.2) return greenToRedColors[3];
      return greenToRedColors[4];
    };

    function handleThumbsUp(team) {
      const newRatings = { ...teamRatings, [team]: true };
      setTeamRatings(newRatings);
      localStorage.setItem('teamRatings', JSON.stringify(newRatings));
    }
  
    function handleThumbsDown(team) {
      const newRatings = { ...teamRatings, [team]: false };
      setTeamRatings(newRatings);
      localStorage.setItem('teamRatings', JSON.stringify(newRatings));
    }
  
    function handleMeh(team) {
      const newRatings = { ...teamRatings, [team]: undefined };
      setTeamRatings(newRatings);
      localStorage.setItem('teamRatings', JSON.stringify(newRatings));
    }
    

    if (!picklist || picklist.length === 0) {
      return (
        <div className={styles.picklistContainer}>
          <h1>Picklist</h1>
          <span>Hit recalculate to view the picklist according to the weights you entered...</span>
        </div>
      );
    }
    

    const roundToThree = (x) => (typeof x !== 'number' || isNaN(x)) ? 0 : Math.round(x * 1000) / 1000;
    

    return (
      <div className={styles.picklistContainer}>
        <h1>Picklist</h1>
        {/* <div className={styles.picklistTableContainer}> */}
          <table className={styles.picklistTable} id="teamTable">
          <thead>
          <tr>
            <th>Rank</th>
            <th>TBA</th>
            <th>Team</th>
            <th>EPA</th>
            <th>Last 3</th>
            <th>Fuel</th>
            <th>Tower</th>
            <th>Passing</th>
            <th>Defense</th>
            <th>Auto</th>
            <th>Cnstcy</th>
            <th>EPA Cap</th>
            <th>Rating</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
            {picklist.map((teamData, index) => {
              if (teamsToExclude.includes(teamData.team)) {
                return <tr key={teamData.team} style={{display: "none"}}></tr>
              } else {
                const displayRank = `#${index + 1}`;
                const tbaRank = (teamData.tbaRank !== -1 ? `${teamData.tbaRank}` : "");
                
                return (
                  <tr key={teamData.team}>
                    <td>
                      <div className={styles.picklistRank}>
                        {displayRank}
                      </div>
                    </td>
                      <td>#{tbaRank}</td>
                      <td><a href={`/team-view?team=${teamData.team}`}>{teamData.team}
                        {teamRatings[teamData.team] === true && '✅'}
                        {teamRatings[teamData.team] === false && '❌'}
                        </a>
                      </td>
                      <td style={{ backgroundColor: valueToColor(teamData.epa) }}>{roundToThree(teamData.epa)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.last3epa) }}>{roundToThree(teamData.last3epa)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.fuel) }}>{roundToThree(teamData.fuel)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.tower) }}>{roundToThree(teamData.tower)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.passing) }}>{roundToThree(teamData.passing)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.defense) }}>{roundToThree(teamData.defense)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.auto) }}>{roundToThree(teamData.auto)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.consistency) }}>{roundToThree(teamData.consistency)}</td>
                      <td style={{ backgroundColor: valueToColor(teamData.epaCapacity) }}>{roundToThree(teamData.epaCapacity)}</td>
                      <td>
                        {teamRatings[teamData.team] !== true &&
                          <button onClick={() => handleThumbsUp(teamData.team)}>✅</button>
                        }
                        {teamRatings[teamData.team] !== false &&
                          <button onClick={() => handleThumbsDown(teamData.team)}>❌</button>
                        }
                        {teamRatings[teamData.team] !== undefined &&
                          <button onClick={() => handleMeh(teamData.team)}>🫳</button>
                        }
                      </td>
                      <td>  
                        <CommentCell team={teamData.team} />
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        {/* </div> */}
      </div>
    );
  };

  function AllianceMatchView() {
  
    const handleMatchViewSubmit = (e) => {
      e.preventDefault();
      const redAlliance = e.target.redAlliance.value;
      const blueAlliance = e.target.blueAlliance.value;
  
      // Find the teams for the selected red and blue alliances
      const redTeams = allianceData[redAlliance] || [];
      const blueTeams = allianceData[blueAlliance] || [];
  
      // Construct the URL with the teams
      const matchViewParams = new URLSearchParams({
        team1: redTeams[0] || '',
        team2: redTeams[1] || '',
        team3: redTeams[2] || '',
        team4: blueTeams[0] || '',
        team5: blueTeams[1] || '',
        team6: blueTeams[2] || '',
        go: 'go',
        match: ''
      });
  
      // Navigate to match view
      window.location.href = `/match-view?${matchViewParams.toString()}`;
    };
  
    return (
      <form onSubmit={handleMatchViewSubmit}>
        <div className={styles.allianceMatchView}>
          <div className={styles.red}>
            <label style={{color: "red"}} htmlFor="redAlliance">Red:</label>
            <input className={styles.redInput} name="redAlliance" type="number" min="1" max="8" ></input>
          </div>
          <div className={styles.blue}>
            <label style={{color: "blue"}} htmlFor="blueAlliance">Blue:</label>
            <input className={styles.blueInput} name="blueAlliance" type="number" min="1" max="8" ></input>
          </div>
          <button type="submit">Go!</button>
        </div>
      </form>
    );
  }

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.MainDiv}>
      <div className={styles.LeftColumn}>
        <form ref={weightsFormRef} className={styles.weightsForm}>
          <div className={styles.weights}>
            <h1>Weights</h1>
            <Weights></Weights>
          </div>
          <button type="button" onClick={recalculate} style={{
            marginBottom: '30px',
            fontSize: "20px",
          }} className={weightsChanged ? styles.recalculateIsMad : ""}>Recalculate Picklist</button>
        </form>
        <div className={styles.alliances}>
          <div className={styles.allianceButton}>
            <h1>Alliances</h1>
            <button onClick={handleAllianceClear}>Clear All Teams</button>
          </div>
          <div className={styles.wholeAlliance}>
            <form ref={alliancesFormRef}>
              <table className={styles.allianceTable}>
                <thead>
                  <tr key="head">
                    <th></th>
                    <th>T1</th>
                    <th>T2</th>
                    <th>T3</th>
                    <th>T4</th>
                  </tr>
                </thead>
                <tbody>
                  <AllianceRow allianceNumber={"1"} allianceData={allianceData["1"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"2"} allianceData={allianceData["2"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"3"} allianceData={allianceData["3"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"4"} allianceData={allianceData["4"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"5"} allianceData={allianceData["5"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"6"} allianceData={allianceData["6"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"7"} allianceData={allianceData["7"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                  <AllianceRow allianceNumber={"8"} allianceData={allianceData["8"]} handleAllianceChange={handleAllianceChange}></AllianceRow>
                </tbody>
              </table>
            </form>
            <AllianceMatchView/>
          </div>
        </div>
      </div>
      <PicklistTable></PicklistTable>
    </div>
  )
}