
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Mock process.env
const serviceAccountJson = envConfig.FIREBASE_SERVICE_ACCOUNT_JSON;

console.log('--- Debugging Firebase Credentials ---');

if (!serviceAccountJson) {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
    process.exit(1);
}

try {
    console.log('Raw JSON string length:', serviceAccountJson.length);
    console.log('First 50 chars:', serviceAccountJson.substring(0, 50));

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('\nParsed JSON successfully.');
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Client Email:', serviceAccount.client_email);

    let privateKey = serviceAccount.private_key;
    console.log('\nPrivate Key Check:');
    console.log('Contains literal "\\n" (backslash-n):', privateKey.includes('\\n'));
    console.log('Contains actual newline characters:', privateKey.includes('\n'));

    // Simulate the fix
    const fixedKey = privateKey.replace(/\\n/g, '\n');
    console.log('\nApply Fix (replace \\\\n with \\n):');
    console.log('Fixed Key contains literal "\\n":', fixedKey.includes('\\n'));
    console.log('Fixed Key contains actual newlines:', fixedKey.includes('\n'));

    console.log('\nFixed Key Preview:');
    console.log(fixedKey.substring(0, 50) + '...');

} catch (e) {
    console.error('ERROR Parsing JSON:', e);
}

console.log('\n--- System Time Check ---');
console.log('Current System Time:', new Date().toISOString());
