const fs = require('node:fs');
const path = require('node:path');

const outputsPath = path.resolve('outputs.json');
if (!fs.existsSync(outputsPath)) {
  console.error('outputs.json not found. Run your deploy to generate it.');
  process.exit(1);
}

const outputsRaw = fs.readFileSync(outputsPath, 'utf8');
let outputs = {};
try {
  outputs = JSON.parse(outputsRaw);
} catch (error) {
  console.error('Failed to parse outputs.json:', error && error.message);
  process.exit(1);
}

const [firstKey] = Object.keys(outputs);
const stackOutputs = outputs[firstKey] || {};
const url = String(stackOutputs.SummariserApiUrl || stackOutputs.SummariserApiEndpointD45F7373 || '').replace(/\/$/, '');

if (!url) {
  console.error('API URL not found in outputs.json');
  process.exit(1);
}

const envDir = path.resolve('frontend');
const envPath = path.join(envDir, '.env');
fs.mkdirSync(envDir, { recursive: true });

const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
let next = current;
if (/^NEXT_PUBLIC_API_URL=/m.test(current)) {
  next = current.replace(/^NEXT_PUBLIC_API_URL=.*/m, `NEXT_PUBLIC_API_URL=${url}`);
} else {
  next = `${current}${current.endsWith('\n') ? '' : '\n'}NEXT_PUBLIC_API_URL=${url}\n`;
}

fs.writeFileSync(envPath, next);
console.log('Wrote NEXT_PUBLIC_API_URL', url, 'to', envPath);
