/**
 * Lit GROQ_API_KEY depuis Frontend/.env ou .env a la racine du monorepo,
 * puis genere src/environments/environment.secrets.ts (gitignore).
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const frontEnv = loadEnvFile(path.join(__dirname, '../.env'));
const rootEnv = loadEnvFile(path.join(__dirname, '../../.env'));
const groqApiKey =
  process.env.GROQ_API_KEY || frontEnv.GROQ_API_KEY || rootEnv.GROQ_API_KEY || '';

const outPath = path.join(__dirname, '../src/environments/environment.secrets.ts');
const content = `/** Genere par npm run env:sync — ne pas editer a la main */
export const environmentSecrets = {
  groqApiKey: ${JSON.stringify(groqApiKey)},
};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(
  groqApiKey
    ? '[env:sync] GROQ_API_KEY chargee (env/.env)'
    : '[env:sync] GROQ_API_KEY absente (.env) — fonctions IA Groq desactivees'
);
