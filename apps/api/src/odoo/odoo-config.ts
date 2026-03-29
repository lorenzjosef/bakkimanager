import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function readApiKeysFile() {
  const candidatePaths = new Set<string>();
  let cursor = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    candidatePaths.add(resolve(cursor, 'API_Keys.txt'));
    const parent = dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  for (const filePath of candidatePaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    try {
      return readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  return '';
}

export function readOdooApiKeyFromLocalFile() {
  const contents = readApiKeysFile();
  if (!contents) {
    return '';
  }

  const match = contents.match(/^Odoo API Key:\s*(.+)$/im);
  return match?.[1]?.trim() ?? '';
}

export function resolveOdooServiceSecretSource() {
  if (process.env.ODOO_PASSWORD?.trim() || process.env.ODOO_API_KEY?.trim()) {
    return 'environment' as const;
  }

  if (readOdooApiKeyFromLocalFile()) {
    return 'api_keys_file' as const;
  }

  return 'missing' as const;
}
