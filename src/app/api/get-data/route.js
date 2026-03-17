import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = 'force-dynamic'; // Prevent static generation during build
export const revalidate = 150; //caches for 150 seconds, 2.5 minutes

export async function GET() {
    let data = await sql`SELECT * FROM sdd2026;`;
    return NextResponse.json({rows: data.rows}, {status: 200});
}