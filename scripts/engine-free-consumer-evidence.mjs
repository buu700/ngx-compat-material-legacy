/**
 * Reviewed engine-free case identities.
 * Forbidden specifiers and testing entries are derived from the motion
 * contract (no Angular animations engine or recipe entry) and the export
 * registry before a candidate tarball is opened.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const FORBIDDEN_SPECS = [
  '@angular/animations',
  '@angular/platform-browser/animations',
];

export const NPM_INSTALL_ARGS = ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'];

export const ENGINE_SPECIFIER = /(?:import|export)\s*(?:type\s+)?(?:[\s\S]*?\sfrom\s*)?['"](@angular\/animations|@angular\/platform-browser\/animations)['"]|require\(\s*['"](@angular\/animations|@angular\/platform-browser\/animations)['"]\s*\)|import\(\s*['"](@angular\/animations|@angular\/platform-browser\/animations)['"]\s*\)/;

export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*?$/gm, '$1');
}

export function loadExportKeys() {
  const required = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/library-exports.json'), 'utf8'));
  if (!Array.isArray(required.exports) || required.exports.length === 0) {
    throw new Error('Export matrix is empty');
  }
  return required.exports;
}

export function testingSlugs(keys) {
  return keys.filter(key => key.endsWith('/testing')).map(key => key.slice(2, -'/testing'.length));
}

export function engineFreeGroups(keys) {
  return {
    'engine-absence': [
      'engine-free-consumer/engine-absence/manifest',
      'engine-free-consumer/engine-absence/packed-runtime',
      'engine-free-consumer/engine-absence/packed-declarations',
      'engine-free-consumer/engine-absence/packed-testing',
      'engine-free-consumer/engine-absence/no-recipe-entry',
      ...FORBIDDEN_SPECS.map(spec => `engine-free-consumer/engine-absence/unresolved/${spec}`),
      ...FORBIDDEN_SPECS.map(spec => `engine-free-consumer/engine-absence/not-installed/${spec}`),
    ],
    'strict-consumer': [
      'engine-free-consumer/strict-consumer/legacy-button-template',
      'engine-free-consumer/strict-consumer/legacy-checkbox-template',
      'engine-free-consumer/strict-consumer/skip-lib-check-false',
      'engine-free-consumer/strict-consumer/no-legacy-peer-deps',
      'engine-free-consumer/strict-consumer/runtime-button',
    ],
    'testing-entrypoints': [
      ...testingSlugs(keys).map(slug => `engine-free-consumer/testing-entrypoints/${slug}`),
      'engine-free-consumer/testing-entrypoints/legacy-button-harness',
    ],
  };
}

export function engineFreeCaseIds(keys) {
  const groups = engineFreeGroups(keys);
  return [...groups['engine-absence'], ...groups['strict-consumer'], ...groups['testing-entrypoints']];
}

export function manifestEngineDeps(manifest) {
  const hits = [];
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies']) {
    for (const name of Object.keys(manifest?.[field] ?? {})) {
      if (FORBIDDEN_SPECS.includes(name)) hits.push(`${field}:${name}`);
    }
  }
  return hits;
}

export function recipeKeys(keys) {
  return keys.filter(key => key === './animations' || key.endsWith('/animations') || key.includes('/animations/'));
}

export function classifyEngineHits(files) {
  const buckets = {runtime: [], declarations: [], testing: []};
  for (const file of files) {
    if (!file || typeof file.name !== 'string' || typeof file.text !== 'string') continue;
    if (!/\.(mjs|cjs|js|d\.ts)$/.test(file.name)) continue;
    if (!ENGINE_SPECIFIER.test(stripComments(file.text))) continue;
    if (file.name.includes('testing')) buckets.testing.push(file.name);
    else if (file.name.endsWith('.d.ts')) buckets.declarations.push(file.name);
    else buckets.runtime.push(file.name);
  }
  return buckets;
}

export function installUsesLegacyPeerDeps(args) {
  return args.some(arg => arg === '--legacy-peer-deps' || arg.startsWith('--legacy-peer-deps='));
}
