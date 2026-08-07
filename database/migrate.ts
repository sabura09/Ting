
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Client } = pg;


async function migrate() {
    console.log("Starting migration...");

    let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    if (!connectionString) {
        throw new Error("No POSTGRES_URL found in environment variables.");
    }

    // Strip sslmode from the connection string to allow ssl constructor options to work properly
    try {
        const parsedUrl = new URL(connectionString);
        parsedUrl.searchParams.delete('sslmode');
        connectionString = parsedUrl.toString();
    } catch (e) {
        // Fallback to original connection string if parsing fails
    }

    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("Connected to Supabase Postgres.");

        // Increase statement timeout to handle large schema operations
        await client.query("SET statement_timeout = '120s';");

        const schemaPath = path.join(process.cwd(), 'database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Applying schema...");
        await client.query(schemaSql);
        console.log("Schema applied successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
