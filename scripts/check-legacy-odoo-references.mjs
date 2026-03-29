import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['apps', 'packages', 'infra', 'scripts', 'prototype'];
const INCLUDE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.html',
  '.sh',
]);
const IGNORED_SEGMENTS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.turbo',
  '.next',
  'coverage',
]);
const PATTERNS = [
  ['odoo', 'custom_addons', 'bakki'].join('/'),
  ['custom_addons', 'bakki'].join('/'),
];
const SELF_PATH = relative(ROOT, new URL(import.meta.url).pathname);

function main() {
  const matches = [];

  for (const target of TARGETS) {
    walk(join(ROOT, target), matches);
  }

  if (matches.length === 0) {
    console.log(`No live code references to ${PATTERNS[0]} were found.`);
    return;
  }

  console.error('Legacy Odoo addon references were found in live code paths:');
  for (const match of matches) {
    console.error(`- ${match.file}:${match.line}: ${match.text}`);
  }
  process.exitCode = 1;
}

function walk(directory, matches) {
  let entries = [];

  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORED_SEGMENTS.has(entry.name)) {
      continue;
    }

    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, matches);
      continue;
    }

    if (relative(ROOT, filePath) === SELF_PATH) {
      continue;
    }

    if (!shouldCheckFile(entry.name)) {
      continue;
    }

    const contents = readFileSafe(filePath);
    if (!contents) {
      continue;
    }

    const lines = contents.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (PATTERNS.some((pattern) => line.includes(pattern))) {
        matches.push({
          file: relative(ROOT, filePath),
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  }
}

function shouldCheckFile(fileName) {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  return INCLUDE_EXTENSIONS.has(extension);
}

function readFileSafe(filePath) {
  try {
    if (!statSync(filePath).isFile()) {
      return '';
    }
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

main();
