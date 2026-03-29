import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(workspaceRoot, 'infra/platform/digitalocean/app.template.yaml');
const outputPath = path.join(workspaceRoot, 'infra/platform/digitalocean/app.generated.yaml');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const source = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }
  return entries;
}

function getRequiredValue(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required value for ${key}.`);
  }
  return value;
}

function escapeReplacement(value) {
  return value.replaceAll('\\', '\\\\');
}

const fileEnv = {
  ...readEnvFile(path.join(workspaceRoot, '.env')),
  ...readEnvFile(path.join(workspaceRoot, '.env.local')),
};

const env = {
  ...fileEnv,
  ...process.env,
};

const replacements = {
  '__DOCR_API_REPOSITORY__': env.DOCR_API_REPOSITORY?.trim() || 'bakki-api',
  '__DOCR_API_TAG__': env.DOCR_API_TAG?.trim() || 'latest',
  '__DOCR_WEB_REPOSITORY__': env.DOCR_WEB_REPOSITORY?.trim() || 'bakki-web',
  '__DOCR_WEB_TAG__': env.DOCR_WEB_TAG?.trim() || 'latest',
  '__ODOO_API_KEY__': getRequiredValue(env, 'ODOO_API_KEY'),
  '__BAKKI_CORE_DATABASE_URL__': getRequiredValue(env, 'BAKKI_CORE_DATABASE_URL'),
  '__MEDIA_PROVIDER__': env.MEDIA_PROVIDER?.trim() || 'digitalocean-spaces',
  '__LOCAL_MEDIA_ROOT__': env.LOCAL_MEDIA_ROOT?.trim() || '/tmp/bakki-media',
  '__SPACES_BUCKET__': env.SPACES_BUCKET?.trim() || '',
  '__SPACES_ENDPOINT__': env.SPACES_ENDPOINT?.trim() || '',
  '__SPACES_REGION__': env.SPACES_REGION?.trim() || '',
  '__SPACES_KEY__': env.SPACES_KEY?.trim() || '',
  '__SPACES_SECRET__': env.SPACES_SECRET?.trim() || '',
  '__SPACES_CDN_BASE_URL__': env.SPACES_CDN_BASE_URL?.trim() || '',
};

let rendered = fs.readFileSync(templatePath, 'utf8');

for (const [placeholder, value] of Object.entries(replacements)) {
  rendered = rendered.replaceAll(placeholder, escapeReplacement(value));
}

fs.writeFileSync(outputPath, rendered);
process.stdout.write(`${outputPath}\n`);
