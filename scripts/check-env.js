const fs = require('fs');
const path = require('path');

// Load .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const requiredVars = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEET_ID',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('Error: The following environment variables are missing:');
  missingVars.forEach(key => console.error(`  - ${key}`));
  console.error('\nPlease check your .env.local file or deployment configuration.');
  process.exit(1);
}

console.log('Success: All required environment variables are present.');
