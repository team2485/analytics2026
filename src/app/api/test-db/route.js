import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = 'force-dynamic'; // Prevent static generation during build

export async function GET() {
  try {
    // Test database connection with a simple query
    const result = await sql`SELECT NOW() as current_time, version() as pg_version;`;
    
    // Try to check if table exists
    let tableExists = false;
    let rowCount = 0;
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sdd2026'
        );
      `;
      tableExists = tableCheck.rows[0]?.exists || false;
      
      if (tableExists) {
        const count = await sql`SELECT COUNT(*) as count FROM sdd2026;`;
        rowCount = parseInt(count.rows[0]?.count || 0);
      }
    } catch (tableError) {
      // Table doesn't exist yet, which is okay
      console.log("Table check error:", tableError.message);
    }
    
    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
      database: {
        currentTime: result.rows[0]?.current_time,
        postgresVersion: result.rows[0]?.pg_version?.split(',')[0],
        tableExists: tableExists,
        rowCount: rowCount
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
      hint: "Make sure POSTGRES_URL is set in your .env.local file"
    }, { status: 500 });
  }
}

