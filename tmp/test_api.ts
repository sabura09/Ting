import fs from 'fs';
import path from 'path';
import axios from 'axios';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let key = match[1];
        let val = match[2] || '';
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        env[key] = val;
    }
});

const NVIDIA_KEY = env.NVIDIA_API_KEY || '';

async function testModel(modelName: string) {
    console.log(`Testing ${modelName} on NVIDIA...`);
    try {
        const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
            model: modelName,
            messages: [{ role: "user", content: "Hello" }],
            stream: false,
            temperature: 0.7,
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${NVIDIA_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Success: ${modelName}`);
        return true;
    } catch (e: any) {
        console.error(`Failed ${modelName}. Status: ${e.response?.status}, Detail: ${e.response?.data?.detail || e.response?.data?.title}`);
        return false;
    }
}

async function run() {
    await testModel("deepseek-ai/deepseek-v4-pro");
    await testModel("deepseek-ai/deepseek-v4-flash");
    await testModel("z-ai/glm-5.2");
    await testModel("minimaxai/minimax-m2.7");
}

run();
