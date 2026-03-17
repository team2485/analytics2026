import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");
    const match = searchParams.get("match");
    console.log("Looking for match:", match);
    console.log("Looking for team:", team);

    // Validate required parameters
    if (!team || !match) {
        return NextResponse.json(
            { valid: false, error: "Missing required parameters" },
            { status: 400 }
        );
    }

    try {
        // Fetch match data from The Blue Alliance API
        const response = await fetch(
            `https://www.thebluealliance.com/api/v3/event/2026casnd/matches/simple`,
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

        const matches = await response.json();

        // Filter for the specific match and team
        const teamKey = `frc${team}`;
        const matchKey = `2026casnd_qm${match}`;

        const validMatch = matches.find(match => {
            // Check if this is the correct match
            if (match.key !== matchKey) return false;

            // Check if the team is in either alliance
            const redTeams = match.alliances.red.team_keys;
            const blueTeams = match.alliances.blue.team_keys;
            return redTeams.includes(teamKey) || blueTeams.includes(teamKey);
        });

        return NextResponse.json(
            { 
                valid: Boolean(validMatch),
                matchData: validMatch || null
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("TBA API Error:", error);
        return NextResponse.json(
            { 
                valid: false, 
                error: "Error fetching match data"
            },
            { status: 500 }
        );
    }
}