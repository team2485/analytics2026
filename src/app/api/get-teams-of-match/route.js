import { NextResponse } from "next/server";
import _ from "lodash";
import { sql } from "@vercel/postgres";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchNumber = searchParams.get("match");

  const matchNum = parseInt(matchNumber, 10);
  if (matchNumber == null || matchNumber === "" || !Number.isFinite(matchNum) || matchNum < 1) {
    return NextResponse.json({ message: "Invalid match number" }, { status: 400 });
  }

  try {
    // 1) Try scouting database first (works for your recorded/simulated matches)
    const dbResult = await sql`
      SELECT DISTINCT team FROM dcmp2026
      WHERE match = ${matchNum} AND (noshow = false OR noshow IS NULL)
      ORDER BY team
    `;
    const teams = (dbResult.rows || []).map((r) => Number(r.team)).filter((t) => Number.isFinite(t));

    if (teams.length === 6) {
      return NextResponse.json({
        team1: teams[0],
        team2: teams[1],
        team3: teams[2],
        team4: teams[3],
        team5: teams[4],
        team6: teams[5],
      }, { status: 200 });
    }

    // 2) Fallback: The Blue Alliance (for official event schedule)
    if (!process.env.TBA_AUTH_KEY) {
      return NextResponse.json(
        { message: teams.length > 0 ? `Match ${matchNum} has ${teams.length} teams (need 6).` : `No data for match ${matchNum}.` },
        { status: 200 }
      );
    }

    const response = await fetch(
      `https://www.thebluealliance.com/api/v3/event/2026cascmp/matches/simple`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_AUTH_KEY,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: teams.length > 0 ? `Match ${matchNum} has ${teams.length} teams (need 6).` : "Failed to fetch match data." },
        { status: response.status }
      );
    }

    const matches = await response.json();
    const matchArr = matches.filter(
      (m) => m.comp_level === "qm" && m.match_number === matchNum
    );

    if (matchArr.length === 1) {
      const match = matchArr[0];
      return NextResponse.json(
        {
          team1: parseInt(match.alliances.red.team_keys[0].replace("frc", ""), 10),
          team2: parseInt(match.alliances.red.team_keys[1].replace("frc", ""), 10),
          team3: parseInt(match.alliances.red.team_keys[2].replace("frc", ""), 10),
          team4: parseInt(match.alliances.blue.team_keys[0].replace("frc", ""), 10),
          team5: parseInt(match.alliances.blue.team_keys[1].replace("frc", ""), 10),
          team6: parseInt(match.alliances.blue.team_keys[2].replace("frc", ""), 10),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: teams.length > 0 ? `Match ${matchNum} has ${teams.length} teams (need 6).` : "Match not found." },
      { status: 200 }
    );
  } catch (error) {
    console.error("get-teams-of-match error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}