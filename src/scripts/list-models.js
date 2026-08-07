const dotenv = require('dotenv');
const fetch = require('node-fetch');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key found');
        return;
    }

    console.log('Using API Key starts with:', apiKey.substring(0, 5));

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', JSON.stringify(data.error, null, 2));
            return;
        }

        console.log('Available Models:');
        data.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Supported Actions: ${m.supportedGenerationMethods}`);
        });
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

listModels();
