// Test-only expectation from untouched Material 16 Stepper evidence.
// Pre-repair measurements stay unchanged and serve as rejected samples.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const oracleBytes = readFileSync('fixtures/sass/stepper-historical-bridge-oracle.json');
const shapeBytes = readFileSync('tests/fixtures/stepper-material-16/shape-observation.json');
const manifestBytes = readFileSync('tests/fixtures/stepper-material-16/source-manifest.json');
assert.equal(sha(oracleBytes), 'a952c70fbb725c5ec0bd78d8b6bb7b54ac506c5dcf0600616c29e328f8bf67d9');
assert.equal(sha(shapeBytes), '9834806bacc495276bfeae3c36c6e583daff0ee35919b3f373ccd31c404ca805');
assert.equal(sha(manifestBytes), 'ed9b9c8e69c63bb134b71a25ded9d68d21f1d120cdd513ba423126864986fe74');
const oracle = JSON.parse(oracleBytes), shape = JSON.parse(shapeBytes), manifest = JSON.parse(manifestBytes);
assert.equal(oracle.archive_sha256, manifest.archive_sha256);
assert.equal(oracle.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
assert.equal(oracle.source_manifest_sha256, sha(manifestBytes));
assert.equal(oracle.sources.length, 163);
assert.equal(manifest.source_files.length, 163);
for (const row of Object.values(shape.cases)) for (const value of Object.values(row)) assert.equal(value, '0px');
const color = (scenario, name) => {
  const entry = oracle.scenarios[scenario];
  assert.equal(sha(entry.source), entry.source_sha256);
  assert.equal(sha(entry.css), entry.css_sha256);
  const css = entry.css;
  const hits = [...css.matchAll(new RegExp(`--mat-stepper-${name}: ([^;\\n]+);`, 'g'))];
  assert.equal(hits.length, 1);
  return hits[0][1];
};
const names = ['header-hover-state-layer-color', 'header-focus-state-layer-color'];
const light = Object.fromEntries(names.map(name => [name, color('contract', name)]));
const dark = Object.fromEntries(names.map(name => [name, color('alternate', name)]));
for (const name of names) {
  assert.equal(light[name], 'rgba(0, 0, 0, 0.04)');
  assert.equal(dark[name], 'rgba(255, 255, 255, 0.04)');
}

export function repairedStepperCss(css, line) {
  assert.ok(line === 'main' || line === '21.x');
  assert.equal(typeof css, 'string');
  const edits = [];
  for (const name of ['header-focus-state-layer-shape', 'header-hover-state-layer-shape']) {
    const pattern = new RegExp(`^  --mat-stepper-${name}: ([^;\\n]+);$`, 'gm');
    for (const match of css.matchAll(pattern)) {
      assert.ok(['4px', '0'].includes(match[1]), `${name}: ${match[1]}`);
      if (line === 'main' && match[1] === '4px') {
        const start = match.index + match[0].indexOf(match[1]);
        edits.push([start, start + match[1].length, '0']);
      }
    }
  }
  for (const [name, percent] of [['header-hover-state-layer-color', '4'], ['header-focus-state-layer-color', '12']]) {
    const pattern = new RegExp(`^  --mat-stepper-${name}: ([^;\\n]+);$`, 'gm');
    for (const match of css.matchAll(pattern)) {
      const beforeLight = `color-mix(in srgb, rgba(0, 0, 0, 0.87) ${percent}%, transparent)`;
      const beforeDark = `color-mix(in srgb, white ${percent}%, transparent)`;
      let expected;
      if (match[1] === beforeLight) expected = light[name];
      else if (match[1] === beforeDark) expected = dark[name];
      else assert.ok([light[name], dark[name]].includes(match[1]), `${name}: ${match[1]}`);
      if (expected !== undefined) {
        const start = match.index + match[0].indexOf(match[1]);
        edits.push([start, start + match[1].length, expected]);
      }
    }
  }
  for (const [start, end, value] of edits.sort((a, b) => b[0] - a[0])) css = css.slice(0, start) + value + css.slice(end);
  return css;
}
export function remeasureStepper(measurement, line) {
  const css = repairedStepperCss(measurement.css, line);
  return {...measurement, css, css_sha256: sha(css), css_bytes: Buffer.byteLength(css)};
}
