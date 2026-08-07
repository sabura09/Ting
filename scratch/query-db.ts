import 'dotenv/config';
import { query } from '../src/lib/pg';

async function run() {
    try {
        const res = await query("SELECT id, sender_number, sender_name, message_text, reply_text, status, created_at FROM whatsapp_logs ORDER BY created_at DESC LIMIT 5");
        console.log("Latest WhatsApp logs in DB:");
        console.dir(res.rows, { depth: null });
    } catch (e) {
        console.error(e);
    }
}
run();
