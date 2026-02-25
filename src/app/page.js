"use client";
import { useEffect, useRef, useState } from "react";
import Header from "./form-components/Header";
import TextInput from "./form-components/TextInput";
import styles from "./page.module.css";
import Checkbox from "./form-components/Checkbox";
import CommentBox from "./form-components/CommentBox";
import EndPlacement from "./form-components/EndPlacement";
import Qualitative from "./form-components/Qualitative";
import SubHeader from "./form-components/SubHeader";
import MatchType from "./form-components/MatchType";
import JSConfetti from 'js-confetti';
import FuelCounter from "./form-components/FuelCounter";
import AutoClimb from "./form-components/AutoClimb";
import autoClimbStyles from "./form-components/AutoClimb.module.css";
import ClimbCheckbox from "./form-components/ClimbCheckbox";
import DefenseBreakdown from "./form-components/DefenseBreakdown";
import ThreeOptionRadio from "./form-components/ThreeOptionRadio";
import TwoOptionRadio from "./form-components/TwoOptionRadio";

export default function Home() {
  const [noShow, setNoShow] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [defense, setDefense] = useState(false);
  const [matchType, setMatchType] = useState("2");
  const [scoutProfile, setScoutProfile] = useState(null);
  const [climbYesNo, setClimbYesNo] = useState("0");
  const [climbPosition, setClimbPosition] = useState(null); // Will be "0", "1", or "2" for auto climb position
  const [defenseType, setDefenseType] = useState("");
  const [shootingMechanism, setShootingMechanism] = useState("");

  const form = useRef();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem("ScoutProfile");
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile)
        setScoutProfile(profileData);
        setMatchType(profileData.matchType || "2")
      }
    }
  }, []);
  
  function onNoShowChange(e) {
    let checked = e.target.checked;
    setNoShow(checked);
  }

  function onBreakdownChange(e) {
    let checked = e.target.checked;
    setBreakdown(checked);
  }

  function onDefenseChange(e) {
    let checked = e.target.checked;
    setDefense(checked);
    if (!checked) {
      setDefenseType(""); // Clear defense type when unchecked
    }
  }

  function onDefenseTypeChange(value) {
    setDefenseType(value);
  }
  
  function handleMatchTypeChange(value){
    setMatchType(value);
    console.log("Selected match type:", value);
};

  function handleClimbYesNo (value) {
    setClimbYesNo(value);
    console.log("Selected climb type:", value);
};

  function handleClimbPosition (value) {
    setClimbPosition(value);
    console.log("Selected climb position:", value);
};

  function handleShootingMechanism (value) {
    setShootingMechanism(value);
};

  // added from last years code (still review)
  async function submit(e) {
    e.preventDefault();
    //disable submit
    let submitButton = document.querySelector("#submit");
    submitButton.disabled = true;
    //import values from form to data variable

    let data = { noshow: false, breakdowncomments: null, defensecomments: null, generalcomments: null };
    [...new FormData(form.current).entries()].forEach(([name, value]) => {
      if (value == 'on') {
        data[name] = true;
      } else {
        if (!isNaN(value) && value != "") {
          data[name] = +value;
        } else {
          data[name] = value;
        }
      }
    });
     
    // Map form field names to API field names and convert data types
    
    // Auto Climb: climbYesNo (string "0","1","2") -> autoclimb (integer 0=None, 1=Fail, 2=Success)
    if (data.climbYesNo !== undefined) {
      data.autoclimb = parseInt(data.climbYesNo);
      delete data.climbYesNo;
    }
    
    if (data.autoClimbPosition !== undefined && data.autoclimb === 2) {
      data.autoclimbposition = parseInt(data.autoClimbPosition);
      delete data.autoClimbPosition;
    } else {
      data.autoclimbposition = null;
      delete data.autoClimbPosition;
    }
    
  
    // 0=LeftL3, 1=LeftL2, 2=LeftL1, 3=CenterL3, 4=CenterL2, 5=CenterL1, 6=RightL3, 7=RightL2, 8=RightL1, 9=None
    if (data.endClimbPosition !== undefined && data.endClimbPosition !== null && data.endClimbPosition !== "") {
      data.endclimbposition = parseInt(data.endClimbPosition);
      delete data.endClimbPosition;
    } else {
      data.endclimbposition = null;
      delete data.endClimbPosition;
    }

    // WideClimb: checkbox (true if checked)
    data.wideclimb = data.wideclimb === true;
    
    // Shooting Mechanism: staticShooting radio -> shootingmechanism (0=Static, 1=Turret)
    // const staticShootingRadio = document.querySelector('input[name="staticShooting"]:checked');
    // if (staticShootingRadio) {
    //   const label = staticShootingRadio.closest('label');
    //   const labelText = label ? label.textContent.trim() : "";
    //   if (labelText === "Static") {
    //     data.shootingmechanism = 0;
    //   } else if (labelText === "Turret") {
    //     data.shootingmechanism = 1;
    //   } else {

    //     data.shootingmechanism = 0;
    //   }
    // } else {

    //   data.shootingmechanism = 0;
    // }
    // delete data.staticShooting;
    

    data.fuelpercent = (data.percentfuel != null && data.percentfuel !== "")
      ? (parseInt(String(data.percentfuel).replace('%', '').trim(), 10) || 0)
      : 0;
    delete data.percentfuel;
    
// After setting playeddefense
const playedDefenseValue = data.defense === true;
data.playeddefense = playedDefenseValue;
delete data.defense; 

// Map defense type to numeric value
if (playedDefenseValue && defenseType) {
  data.defense = Number(defenseType);
// const defenseMap = {
//   "Weak": 0,
//   "Harassment": 1,
//   "Game Changing": 2,
  //};
  //data.defense = defenseMap[defenseType] !== undefined ? defenseMap[defenseType] : null;
} else {
  data.defense = null;
}
    
    
    if (Array.isArray(data.defenselocationoutpost)) {
      data.defenselocationoutpost = data.defenselocationoutpost.some(v => v === true);
    } else {
      data.defenselocationoutpost = data.defenselocationoutpost === true;
    }
    data.defenselocationtower = data.defenselocationtower === true;
    data.defenselocationhub = data.defenselocationhub === true;
    data.defenselocationaz = data.defenselocationaz === true;
    data.defenselocationnz = data.defenselocationnz === true;
    data.defenselocationtrench = data.defenselocationtrench === true;
    data.defenselocationbump = data.defenselocationbump === true;

    data.intakeground = data.intakeground === true;
    data.intakeoutpost = data.intakeoutpost === true;
    data.passingbulldozer = data.passingbulldozer === true;
    data.passingshooter = data.passingshooter === true;
    data.passingdump = data.passingdump === true;
    
    // Field name fixes: normalize to lowercase with no spaces
    // "win auto" -> "winauto" (unchecked = not in FormData, so default false)
    data.winauto = data["win auto"] === true;
    delete data["win auto"];

    data.autofuel = data["auto fuel"] != null && data["auto fuel"] !== "" ? Number(data["auto fuel"]) : 0;
    delete data["auto fuel"];

    data.telefuel = data["tele fuel"] != null && data["tele fuel"] !== "" ? Number(data["tele fuel"]) : 0;
    delete data["tele fuel"];

    data.shootwhilemove = (data["shoot while move"] === true || data.shootwhilemove === true);
    delete data["shoot while move"];

    data.stuckonfuel = (data["stuckOnFuel"] === true || data.stuckonfuel === true);
    delete data["stuckOnFuel"];

    data.bump = data.bump === true;
    data.trench = data.trench === true;

    data.breakdown = undefined;

    //check pre-match data (skip percentfuel — 0% is valid)
    let preMatchInputs = document.querySelectorAll(".preMatchInput"); //todo: use the data object
    for (let preMatchInput of preMatchInputs) {
      if (preMatchInput.name === "percentfuel") continue; // allow 0 for percent fuel
      if (preMatchInput.value == "" || preMatchInput.value <= "0") {
        alert("Invalid Pre-Match Data!");
        submitButton.disabled = false;
        return;
      }
    }
    if (matchType == 2) {
      try {
        const response = await fetch(`/api/get-valid-team?team=${data.team}&match=${data.match}`)
        const validationData = await response.json();
        
        if (!validationData.valid) {
          alert("Invalid Team and Match Combination!");
          submitButton.disabled = false;
          return;
        }
      } catch (error) {
        console.error("Validation error:", error);
        alert("Error validating team and match. Please try again.");
        submitButton.disabled = false;
        return;
      } 
    } else {
      try {
        const response = await fetch(`/api/get-valid-match-teams?team=${data.team}`)
        const validationData = await response.json();
        
        if (!validationData.valid) {
          alert("Invalid Team!");
          submitButton.disabled = false;
          return;
        }
      } catch (error) {
        console.error("Validation error:", error);
        alert("Error validating team. Please try again.");
        submitButton.disabled = false;
        return;
      } 
    }

    //confirm and submit
    if (confirm("Are you sure you want to submit?") == true) {
      fetch('/api/add-match-data', {
        method: "POST",
        body: JSON.stringify(data)
      }).then((response)=> {
        if(response.status === 201) {
          return response.json();
        } else {
          return response.json().then(err => Promise.reject(err.message));
        }
      }) 
      .then(data => {
        alert("Thank you!");
        const jsConfetti = new JSConfetti();
        jsConfetti.addConfetti({
        emojis: ['🪲', '🪲','🟡', '🟡', '🟡', '🔎', '🟡'],
        emojiSize: 100,
        confettiRadius: 3,
        confettiNumber: 100,
       })
       
        if (typeof document !== 'undefined')  {
          let ScoutName = document.querySelector("input[name='scoutname']").value;
          let ScoutTeam = document.querySelector("input[name='scoutteam']").value;
          let Match = document.querySelector("input[name='match']").value;
          let newProfile = { 
            scoutname: ScoutName, 
            scoutteam: ScoutTeam, 
            match: Number(Match)+1,
            matchType: matchType 
          };
          setScoutProfile(newProfile);
          localStorage.setItem("ScoutProfile", JSON.stringify(newProfile));
          console.log(scoutProfile)
        }

        globalThis.scrollTo({ top: 0, left: 0, behavior: "smooth" });

        setTimeout(() => {
          location.reload()
        }, 2000);
      })
      .catch(error => {
        alert(error);
        submitButton.disabled = false;
      });

    } else {
      //user didn't want to submit
      submitButton.disabled = false;
    };
  }
console.log("page",matchType)

  return (
    <div className={styles.MainDiv}>
      <form ref={form} name="Scouting Form" onSubmit={submit}>
        <Header headerName={"Match Info"} />
        <div className={styles.allMatchInfo}>
        <div className={styles.MatchInfo}>
        <TextInput 
            visibleName={"Scout Name:"} 
            internalName={"scoutname"} 
            defaultValue={scoutProfile?.scoutname || ""}
          />
          <TextInput 
            visibleName={"Team #:"} 
            internalName={"scoutteam"} 
            defaultValue={scoutProfile?.scoutteam || ""}
            type={"number"}
          />
          <TextInput
            visibleName={"Team Scouted:"}
            internalName={"team"}
            defaultValue={""}
            type={"number"}
          />
          <TextInput 
            visibleName={"Match #:"} 
            internalName={"match"} 
            defaultValue={scoutProfile?.match || ""}
            type={"number"}
          />
        </div>
        <MatchType onMatchTypeChange={handleMatchTypeChange} defaultValue={matchType}/>
        <Checkbox
          visibleName={"No Show"}
          internalName={"noshow"}
          changeListener={onNoShowChange}
        />
        </div>
        {!noShow && (
          <>
          <br></br>
            <div className={styles.Auto}>
              <Header headerName={"Auto"}/>

              <FuelCounter internalName={"auto fuel"}/>
            <div className={styles.AutoClimb}>
              <SubHeader subHeaderName={"Climb"}></SubHeader>
              <ThreeOptionRadio
                onThreeOptionRadioChange={handleClimbYesNo}
                internalName="climbYesNo"
                defaultValue={climbYesNo}
                value1="None"
                value2="Fail"
                value3="Success"
              />
              {climbYesNo === "2" && (
                <ThreeOptionRadio
                  onThreeOptionRadioChange={handleClimbPosition}
                  internalName="autoClimbPosition"
                  defaultValue={climbPosition}
                  value1="Left"
                  value2="Center"
                  value3="Right"
                />
                )}
              
          </div>
              <Checkbox visibleName={"Win Auto?"} internalName={"win auto"}/>
            </div>
              
              <br></br>
              <br></br>
            <div className={styles.Tele}>
             <Header headerName={"Tele"}/>


             <br></br>


             <SubHeader subHeaderName={"Intake"}></SubHeader>
             <div className={styles.intakeBox}>
               <Checkbox visibleName={"Ground"} internalName={"intakeground"}></Checkbox>
               <Checkbox visibleName={"Outpost"} internalName={"intakeoutpost"}></Checkbox>
             </div>


             <br></br>
             <br></br>


             <FuelCounter internalName={"tele fuel"}/>
             <Checkbox visibleName={"Shoot while move?"} internalName={"shootwhilemove"}></Checkbox>
             <br></br>
             <br></br>
             <SubHeader subHeaderName={"Passing?"}></SubHeader>
             <div className={styles.passingBox}>
               <Checkbox visibleName={"Bulldozer"} internalName={"passingbulldozer"}></Checkbox>
               <Checkbox visibleName={"Dumper"} internalName={"passingdump"}></Checkbox>
               <Checkbox visibleName={"Shooter"} internalName={"passingshooter"}></Checkbox>
             </div>
             <br></br>
             <SubHeader subHeaderName={"Defense Location"}></SubHeader>
             <div className={styles.defenseBox}>
               <Checkbox visibleName={"Alliance Zone (AZ)"} internalName={"defenselocationaz"}></Checkbox>
               <Checkbox visibleName={"Neutral Zone"} internalName={"defenselocationnz"}></Checkbox>
               <Checkbox visibleName={"Bump"} internalName={"defenselocationbump"}></Checkbox>
               <Checkbox visibleName={"Trench"} internalName={"defenselocationtrench"}></Checkbox>
               <Checkbox visibleName={"Tower"} internalName={"defenselocationtower"}></Checkbox>
               <Checkbox visibleName={"Hub"} internalName={"defenselocationhub"}></Checkbox>
               <Checkbox visibleName={"Outpost"} internalName={"defenselocationoutpost"}></Checkbox>
             </div>
           </div>
           <div className={styles.PostMatch}>
            <Header headerName={"Endgame"}/>
            <br></br>
            <SubHeader subHeaderName={"Climb"}></SubHeader>
            <div>
              <ClimbCheckbox></ClimbCheckbox>
            </div>

            <Checkbox visibleName={"Wide Climb?"} internalName={"wideclimb"} />

           </div>


            <div className={styles.PostMatch}>       
              <Header headerName={"Post-Match"}/>
              <br></br>
                <div className={styles.percentFuel}>
                  <TextInput 
                    visibleName={"% of Alliance Fuel Scored by Robot:"} 
                    internalName={"percentfuel"} 
                    defaultValue={""}
                    type={"text"}
                  />
                </div>

                <br></br>

                <SubHeader subHeaderName={"Shooting Mechanism"}></SubHeader>
                <div className= {styles.shootingBox}>
                  <TwoOptionRadio
                    onTwoOptionRadioChange={handleShootingMechanism}
                    internalName="shootingmechanism"
                    defaultValue={shootingMechanism}
                    value1="Static"
                    value2="Turret"
                  />
                  {/* <div className={autoClimbStyles.radioGroup}>
                    <label>
                        <input
                          type="radio"
                          name="staticShooting"
                        />
                        Static
                    </label>

                    <label>
                        <input
                          type="radio"
                          name="turretShooting"
                        />
                        Turret
                    </label>
                  </div> */}
                </div>
                <br></br>

                <SubHeader subHeaderName={"Terrain Capability"}></SubHeader>
                <div className={styles.terrainBox}>
                  <Checkbox visibleName={"Bump"} internalName={"bump"}></Checkbox>
                  <Checkbox visibleName={"Trench"} internalName={"trench"}></Checkbox>
                </div>

                <Checkbox visibleName={"Stuck on Fuel Easily?"} internalName={"stuckOnFuel"} />
              
                <div className={styles.Qual}>
                  <Qualitative                   
                    visibleName={"Hopper Capacity"}
                    internalName={"hoppercapacity"}
                    description={"Hopper Capacity"}/>
                  <Qualitative                   
                    visibleName={"Maneuverability"}
                    internalName={"maneuverability"}
                    description={"Maneuverability"}/>
                  <Qualitative                   
                    visibleName={"Durability"}
                    internalName={"durability"}
                    description={"Durability"}/>
                  <Qualitative                   
                    visibleName={"Fuel Speed"}
                    internalName={"fuelspeed"}
                    description={"Fuel Speed"}/>
                  <Qualitative                   
                    visibleName={"Passing Speed"}
                    internalName={"passingspeed"}
                    description={"Passing Speed"}/>
                  <Qualitative                   
                    visibleName={"Climb Speed"}
                    internalName={"climbspeed"}
                    description={"Climb Speed"}/>
                  <Qualitative                   
                    visibleName={"Auto Declimb Speed"}
                    internalName={"autodeclimbspeed"}
                    description={"Auto Declimb Speed"}/>
                  <Qualitative                   
                    visibleName={"Bump Speed"}
                    internalName={"bumpspeed"}
                    description={"Bump Speed"}/>
                  <Qualitative                   
                    visibleName={"Defense Evasion"}
                    internalName={"defenseevasion"}
                    description={"Defense Evasion Ability"}/>
                  <Qualitative
                    visibleName={"Aggression"}
                    internalName={"aggression"}
                    description={"Aggression"}
                    symbol={"ⵔ"}/>
                  <Qualitative
                    visibleName={"Climb Hazard"}
                    internalName={"climbhazard"}
                    description={"Climb Hazard"}
                    symbol={"ⵔ"}/>
                </div>
              <br></br>

              <DefenseBreakdown 
                onBreakdownChange={onBreakdownChange}
                onDefenseChange={onDefenseChange}
                onDefenseTypeChange={onDefenseTypeChange}
                breakdownValue={breakdown}
                defenseValue={defense}
                defenseTypeValue={defenseType}
              />
              <CommentBox
                visibleName={"General Comments"}
                internalName={"generalcomments"}
              />
            </div>
          </>
        )}
        <br></br>
        <button id="submit" type="submit">SUBMIT</button>
      </form>
    </div>
  );
}