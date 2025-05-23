const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Setting up environment variables...\n');

rl.question('Enter your Gemini API key: ', (apiKey) => {
  // Remove any spaces from the API key
  const cleanApiKey = apiKey.trim().replace(/\s+/g, '');
  
  const envContent = `# Gemini API Configuration
GEMINI_API_KEY=${cleanApiKey}

# Server Configuration
PORT=5001
NODE_ENV=development
`;

  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\nEnvironment variables have been set up successfully!');
    console.log('You can now start the server with: npm run dev');
  } catch (error) {
    console.error('\nError setting up environment variables:', error.message);
  }
  
  rl.close();
}); 