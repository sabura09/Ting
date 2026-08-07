import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Connection string can be POSTGRES_URL (pooling) or POSTGRES_URL_NON_POOLING
let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
    console.warn("POSTGRES_URL not found in environment variables. Database connections will fail.");
} else {
    // Strip sslmode from the connection string to allow ssl constructor options to work properly
    try {
        const parsedUrl = new URL(connectionString);
        parsedUrl.searchParams.delete('sslmode');
        connectionString = parsedUrl.toString();
    } catch (e) {
        // Fallback to original connection string if parsing fails
    }
}

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
}

export async function getClient() {
    const client = await pool.connect();
    return client;
}
