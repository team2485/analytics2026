import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  console.log("Looking for team:", team);

  // Validate required parameters
  if (!team) {
    return NextResponse.json(
      { valid: false, error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Fetch match data from The Blue Alliance API
    const response = await fetch(
      `https://www.thebluealliance.com/api/v3/event/2026dcmp/teams`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_AUTH_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`TBA API returned ${response.status}`);
    }

    const teams = await response.json();

    const teamKey = `frc${team}`;
    const validTeam = teams.find(teamData => teamData.key === teamKey);

    return NextResponse.json(
      {
        valid: Boolean(validTeam),
        teamData: validTeam || null
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("TBA API Error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Error fetching team data"
      },
      { status: 500 }
    );
  }
}