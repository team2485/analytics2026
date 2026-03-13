import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import _ from "lodash";

export const dynamic = 'force-dynamic'; // Prevent static generation during build

export async function POST(req) {
  let body = await req.json();
  console.log(body);

  // Coerce pre-match fields (form may send strings or empty values)
  const scoutname = body.scoutname != null ? String(body.scoutname) : "";
  const scoutteam = Number(body.scoutteam);
  const team = Number(body.team);
  const matchNum = Number(body.match);
  const matchTypeNum = parseInt(body.matchType, 10);

  // Adjust match number based on match type
  let adjustedMatch;
  switch (matchTypeNum) {
    case 0: // pre-comp
      adjustedMatch = matchNum - 100;
      break;
    case 1: // practice
      adjustedMatch = matchNum - 50;
      break;
    case 2: // qual (no change)
      adjustedMatch = matchNum;
      break;
    case 3: // elim
      adjustedMatch = matchNum + 150;
      break;
    default:
      adjustedMatch = NaN;
      break;
  }

  // Validate Pre-Match Data (allow string numbers and empty scout name)
  if (
    typeof scoutname !== "string" ||
    !Number.isFinite(scoutteam) ||
    !Number.isFinite(team) ||
    !Number.isFinite(matchNum) ||
    !Number.isFinite(adjustedMatch) ||
    !(matchTypeNum >= 0 && matchTypeNum <= 3)
  ) {
    return NextResponse.json({ message: "Invalid Pre-Match Data!" }, { status: 400 });
  }

  // Use coerced values for the rest of the request
  body.scoutname = scoutname;
  body.scoutteam = scoutteam;
  body.team = team;
  body.match = matchNum;
  body.matchType = matchTypeNum;
  
  // If no-show, add a basic row
  if (body.noshow) {
    console.log("no show!");
    let resp = await sql`
      INSERT INTO phd2026 (ScoutName, ScoutTeam, Team, Match, MatchType, NoShow)
      VALUES (${body.scoutname}, ${body.scoutteam}, ${body.team}, ${adjustedMatch}, ${body.matchType}, ${body.noshow})
    `;
    return NextResponse.json({ message: "Success!" }, { status: 201 });
  }
  
  // Validate Auto Data
  if (
    !(
      _.isNumber(body.autoclimb) && // 0=None, 1=Fail, 2=Success
      (body.autoclimb === 0 || body.autoclimb === 1 || body.autoclimb === 2) &&
      _.isBoolean(body.winauto)
    )
  ) {
    return NextResponse.json({ message: "Invalid Auto Data!" }, { status: 400 });
  }

  // If AutoClimb is Success (2), validate position
  if (body.autoclimb === 2) {
    if (body.autoclimbposition !== null && body.autoclimbposition !== undefined) {
      if (!_.isNumber(body.autoclimbposition) || ![0, 1, 2].includes(body.autoclimbposition)) {
        return NextResponse.json({ message: "Invalid Auto Climb Position!" }, { status: 400 });
      }
    }
  } else {
    // If not Success (None or Fail), position should be null
    body.autoclimbposition = null;
  }
  
  // Tele Data: default unchecked/missing to false, telefuel to 0
  const teleBooleans = [
    'intakeground', 'intakeoutpost', 'passingbulldozer', 'passingshooter', 'passingdump',
    'shootwhilemove','defenselocationaz', 'defenselocationnz',
  ];
  for (const key of teleBooleans) {
    if (!_.isBoolean(body[key])) body[key] = false;
  }
  if (!_.isNumber(body.telefuel) || !Number.isFinite(body.telefuel)) {
    body.telefuel = Number(body.telefuel);
    if (!Number.isFinite(body.telefuel)) body.telefuel = 0;
  }

  if (
    !(
      _.isBoolean(body.intakeground) &&
      _.isBoolean(body.intakeoutpost) &&
      _.isBoolean(body.passingbulldozer) &&
      _.isBoolean(body.passingshooter) &&
      _.isBoolean(body.passingdump) &&
      _.isBoolean(body.shootwhilemove) &&
      _.isNumber(body.telefuel) &&
      _.isBoolean(body.defenselocationaz) &&
      _.isBoolean(body.defenselocationnz)
    )
  ) {
    return NextResponse.json({ message: "Invalid Tele Data!" }, { status: 400 });
  }
  
  // Validate Endgame Data
  // EndClimbPosition: 0=LeftL3, 1=LeftL2, 2=LeftL1, 3=CenterL3, 4=CenterL2, 5=CenterL1, 6=RightL3, 7=RightL2, 8=RightL1 9=None
    if (!_.isNumber(body.endclimbposition) || !(body.endclimbposition >= 0 && body.endclimbposition <= 9)) {
      return NextResponse.json({ message: "Invalid End Climb Position!" }, { status: 400 });
    }
  

  // WideClimb: True if robot used wide climb
  if (body.wideclimb !== undefined && !_.isBoolean(body.wideclimb)) {
    return NextResponse.json({ message: "Invalid WideClimb!" }, { status: 400 });
  }
  if (body.wideclimb === undefined) body.wideclimb = false;

  // Postmatch Data: default missing/unchecked to false, numbers to 0 or -1
  if (!_.isNumber(body.shootingmechanism) || (body.shootingmechanism !== 0 && body.shootingmechanism !== 1)) {
    body.shootingmechanism = Number(body.shootingmechanism) === 1 ? 1 : 0;
  }
  const postmatchBooleans = ['bump', 'trench', 'stuckonfuel', 'playeddefense'];
  for (const key of postmatchBooleans) {
    if (!_.isBoolean(body[key])) body[key] = false;
  }

  // Validate Postmatch Data
  if (
    !(
      _.isNumber(body.shootingmechanism) &&
      (body.shootingmechanism === 0 || body.shootingmechanism === 1) && // 0=Static, 1=Turret
      _.isBoolean(body.bump) &&
      _.isBoolean(body.trench) &&
      _.isBoolean(body.stuckonfuel) &&
      _.isNumber(body.fuelpercent) &&
      (body.fuelpercent >= 0 && body.fuelpercent <= 100) &&
      _.isBoolean(body.playeddefense)
    )
  ) {
    return NextResponse.json({ message: "Invalid Postmatch Data!" }, { status: 400 });
  }

// Validate Defense (only required if playeddefense is true)
//body.defense = Number(body.defense);

if (body.playeddefense) {
  body.defense = Number(body.defense);

  if (!Number.isFinite(body.defense) || ![0, 1, 2].includes(body.defense)) {
    return NextResponse.json({ message: "Invalid Defense!"}, { status: 400 });
  }
} else {
  body.defense = null;
}


  // Qualitative Ratings (0-5 scale, -1 for not rated): default missing to -1
  const qualitativeFields = [
    'aggression', 'climbhazard', 'hoppercapacity', 'maneuverability',
    'durability', 'defenseevasion', 'climbspeed', 'fuelspeed',
    'passingquantity', 'autodeclimbspeed', 'bumpspeed'
  ];
  for (const field of qualitativeFields) {
    const v = Number(body[field]);
    if (!Number.isFinite(v) || v < -1 || v > 5) {
      body[field] = -1;
    } else {
      body[field] = v;
    }
  }

  // Comments: default missing to empty string (breakdown/defense can stay null)
  if (!_.isString(body.generalcomments)) body.generalcomments = body.generalcomments != null ? String(body.generalcomments) : "";
  if (body.breakdowncomments != null && !_.isString(body.breakdowncomments)) body.breakdowncomments = String(body.breakdowncomments);
  if (body.defensecomments != null && !_.isString(body.defensecomments)) body.defensecomments = String(body.defensecomments);
  
  // Insert Data into Database
  let resp = await sql`
    INSERT INTO phd2026 (
      scoutname, scoutteam, team, match, matchtype, noshow,
      autoclimb, autoclimbposition, autofuel,
      intakeground, intakeoutpost, passingbulldozer, passingshooter, passingdump, shootwhilemove, telefuel,
      defenselocationaz, defenselocationnz,endclimbposition, wideclimb,
      shootingmechanism, bump, trench, stuckonfuel, playeddefense, defense,
      aggression, climbhazard, hoppercapacity, maneuverability, defenseevasion,
      climbspeed, fuelspeed, passingquantity, autodeclimbspeed, bumpspeed,
      generalcomments, breakdowncomments, defensecomments
    )
    VALUES (
      ${body.scoutname}, ${body.scoutteam}, ${body.team}, ${adjustedMatch}, ${body.matchType}, ${body.noshow},
      ${body.autoclimb}, ${body.autoclimb === 2 ? body.autoclimbposition : null}, ${body.autofuel},
      ${body.intakeground}, ${body.intakeoutpost}, ${body.passingbulldozer}, ${body.passingshooter}, ${body.passingdump}, ${body.shootwhilemove}, ${body.telefuel},
      ${body.defenselocationaz}, ${body.defenselocationnz},
      ${body.endclimbposition}, ${body.wideclimb},
      ${body.shootingmechanism}, ${body.bump}, ${body.trench}, ${body.stuckonfuel}, ${body.fuelpercent}, ${body.playeddefense}, ${body.defense},
      ${body.aggression}, ${body.climbhazard}, ${body.hoppercapacity}, ${body.maneuverability}, ${body.durability}, ${body.defenseevasion},
      ${body.climbspeed}, ${body.fuelspeed}, ${body.passingquantity}, ${body.autodeclimbspeed}, ${body.bumpspeed},
      ${body.generalcomments}, ${body.breakdowncomments || null}, ${body.defensecomments || null}
    )
  `;

  return NextResponse.json({ message: "Success!" }, { status: 201 });
}
