// Build script to generate Public/env.js from Vercel environment variables
// This runs during Vercel build process

const fs = require('fs');
const path = require('path');

// Create Public directory if it doesn't exist
const publicDir = path.join(__dirname, 'Public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Get Google Client ID from environment variable
// Vercel automatically injects NEXT_PUBLIC_* variables
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                       process.env.GOOGLE_CLIENT_ID || 
                       '';

// Create env.js content
const envContent = `// Auto-generated file - DO NOT EDIT MANUALLY
// Generated from Vercel environment variables
window.ENV = {
  GOOGLE_CLIENT_ID: ${JSON.stringify(googleClientId)}
};
`;

// Write to Public/env.js
const envFilePath = path.join(publicDir, 'env.js');
fs.writeFileSync(envFilePath, envContent, 'utf8');

console.log('✅ Generated Public/env.js from environment variables');
console.log(`   GOOGLE_CLIENT_ID: ${googleClientId ? '✅ Set' : '⚠️ Not set'}`);

