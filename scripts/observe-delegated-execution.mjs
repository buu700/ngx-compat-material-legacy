#!/usr/bin/env node
// FIN-02: observe whether the candidate's historical legacy test run executes the installed
// peer code that each inherited upstream fix added.
//
// collect: serve the already-built testing/legacy-runner bundle with karma-jasmine's jasmine-core,
//          run it in headless Chrome with V8 block coverage, save the raw coverage.
// analyze: for each inherited/sensitive row, map the significant added lines of its delegated
//          upstream files into the installed peer's original TypeScript (via the input source maps
//          esbuild followed), then into the bundle, and read the execution counts.
//
// The result is an observation, not a disposition and not an individual proof.
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = join(root, 'testing/legacy-runner/out');
const bundlePath = join(outDir, 'legacy-tests.iife.js');
const rawPath = resolve(arg('--raw', '/tmp/obs/coverage-raw.json'));
const upstream = arg('--upstream', '/tmp/ac-full.git');
const reportPath = join(root, 'compatibility/f10/audit-join/delegated-execution.json');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const jasmineDir = dirname(createRequire(createRequire(join(root, 'package.json')).resolve('karma-jasmine/package.json')).resolve('jasmine-core/package.json'));
const detailed = args.includes('--block-coverage');
const jasmineVersion = JSON.parse(readFileSync(join(jasmineDir, 'package.json'), 'utf8')).version;

async function collect() {
  if (!existsSync(bundlePath)) throw new Error('build testing/legacy-runner first');
  const lib = join(jasmineDir, 'lib/jasmine-core');
  const page = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/jasmine/jasmine.css">
<script src="/jasmine/jasmine.js"></script><script src="/jasmine/jasmine-html.js"></script><script src="/jasmine/boot0.js"></script>
<script>
  jasmine.getEnv().configure({random: false});
  window.__summary = {executed: 0, passed: 0, failed: 0, skipped: 0, failures: []};
  jasmine.getEnv().addReporter({
    specDone(r) {
      const s = window.__summary;
      if (r.status === 'passed') { s.executed++; s.passed++; }
      else if (r.status === 'failed') { s.executed++; s.failed++; if (s.failures.length < 50) s.failures.push(r.fullName); }
      else s.skipped++;
    },
    jasmineDone(r) { window.__summary.overall = r.overallStatus; window.__done = true; },
  });
</script>
<script src="/jasmine/boot1.js"></script><script src="/out/legacy-tests.iife.js"></script>
</head><body></body></html>`;
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = null;
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, {'content-type': 'text/html'});
      return res.end(page);
    }
    if (url.pathname.startsWith('/jasmine/')) file = join(lib, url.pathname.slice(9));
    if (url.pathname.startsWith('/out/')) file = join(outDir, url.pathname.slice(5));
    if (!file || !existsSync(file)) { res.writeHead(404); return res.end(); }
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/json';
    res.writeHead(200, {'content-type': type});
    res.end(readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const debugPort = 9333 + Math.floor(Math.random() * 500);
  const profile = mkdtempSync(join(tmpdir(), 'obs-chrome-'));
  const chromeBin = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  const chrome = spawn(chromeBin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--window-size=1400,1200', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  let targets = [];
  for (let i = 0; i < 100 && !targets.length; i++) {
    await new Promise(r => setTimeout(r, 200));
    try { targets = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).filter(t => t.type === 'page'); } catch {}
  }
  if (!targets.length) throw new Error('no Chrome page target');
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onclose = event => console.error(`devtools socket closed: ${event.code} ${event.reason}`);
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}, timeoutMs = 60000) => new Promise((r, j) => {
    const mid = ++id;
    const timer = setTimeout(() => { pending.delete(mid); j(new Error(`${method}: timed out`)); }, timeoutMs);
    pending.set(mid, msg => { clearTimeout(timer); msg.error ? j(new Error(`${method}: ${msg.error.message}`)) : r(msg.result); });
    ws.send(JSON.stringify({id: mid, method, params}));
  });
  const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  await send('Profiler.enable');
  await send('Profiler.startPreciseCoverage', {callCount: true, detailed});
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', {enabled: true});
  await send('Page.navigate', {url: `http://127.0.0.1:${port}/index.html`});
  const started = Date.now();
  let summary = null;
  while (Date.now() - started < 20 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 3000));
    let out;
    try {
      out = await send('Runtime.evaluate', {expression: 'window.__done ? JSON.stringify(window.__summary) : String((window.__summary || {}).executed)', returnByValue: true}, 30000);
    } catch (error) {
      console.error(`poll: ${error.message}`);
      continue;
    }
    const value = out.result && out.result.value;
    if (value && value.startsWith('{')) { summary = JSON.parse(value); break; }
    console.error(`poll: executed=${value}`);
  }
  if (!summary) throw new Error('jasmine did not finish');
  console.error('taking coverage');
  const {result} = await send('Profiler.takePreciseCoverage', {}, 600000);
  console.error(`coverage scripts=${result.length}`);
  const script = result.find(entry => entry.url.endsWith('/out/legacy-tests.iife.js'));
  ws.close();
  chrome.kill('SIGKILL');
  server.close();
  const raw = {
    browser: version.Browser, jasmine_core: jasmineVersion, summary, coverage_granularity: detailed ? 'block' : 'function',
    bundle_sha256: sha256(readFileSync(bundlePath)),
    functions: script.functions.map(f => ({name: f.functionName, ranges: f.ranges.map(r => [r.startOffset, r.endOffset, r.count])})),
  };
  writeFileSync(rawPath, JSON.stringify(raw));
  console.error(`collected: ${JSON.stringify(summary).slice(0, 300)} functions=${raw.functions.length}`);
}

const SKIP_ADDED = /^(import |export \* from|\/\/|\/\*|\*|\}|\{|\)|\]|$)/;

function addedLines(patch, wanted) {
  const out = new Map();
  let current = null;
  for (const row of patch.split('\n')) {
    if (row.startsWith('diff --git ')) { current = row.split(' b/').pop(); continue; }
    if (!wanted.has(current) || !row.startsWith('+') || row.startsWith('+++')) continue;
    const text = row.slice(1).trim();
    if (text.length < 16 || SKIP_ADDED.test(text)) continue;
    if (!out.has(current)) out.set(current, []);
    out.get(current).push(text);
  }
  return out;
}

function analyze() {
  const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
  const bundle = readFileSync(bundlePath, 'utf8');
  if (sha256(bundle) !== raw.bundle_sha256) throw new Error('bundle changed since collection');
  const {SourceMapConsumer} = createRequire(join(root, 'node_modules/.pnpm/source-map-js@1.2.2/node_modules/source-map-js/package.json'))('source-map-js');
  const map = JSON.parse(readFileSync(`${bundlePath}.map`, 'utf8'));
  const consumer = new SourceMapConsumer(map);
  // generated line starts -> offsets
  const lineStarts = [0];
  for (let i = 0; i < bundle.length; i++) if (bundle.charCodeAt(i) === 10) lineStarts.push(i + 1);
  // Innermost-range count per offset: sort ranges by size descending; later (smaller) ranges overwrite.
  const ranges = raw.functions.flatMap(f => f.ranges).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const countAt = offset => {
    let best = null;
    for (const [start, end, count] of ranges) {
      if (offset >= start && offset < end && (best === null || end - start <= best[1] - best[0])) best = [start, end, count];
    }
    return best ? best[2] : null;
  };
  // Original TS sources from the installed peers, keyed by their upstream path (src/...).
  const byUpstreamPath = new Map();
  map.sources.forEach((source, index) => {
    const match = source.match(/\/bin\/(src\/(?:cdk|material)\/.+\.ts)$/);
    if (match) byUpstreamPath.set(match[1], {source: consumer.sources[index], content: map.sourcesContent[index]});
  });
  // original source -> original line -> generated offsets (one pass; avoids per-query lookups).
  const wantedSources = new Set([...byUpstreamPath.values()].map(entry => entry.source));
  const generated = new Map();
  consumer.eachMapping(m => {
    if (!m.source || !wantedSources.has(m.source)) return;
    if (!generated.has(m.source)) generated.set(m.source, new Map());
    const lines = generated.get(m.source);
    if (!lines.has(m.originalLine)) lines.set(m.originalLine, []);
    lines.get(m.originalLine).push(lineStarts[m.generatedLine - 1] + m.generatedColumn);
  });
  // Which installed fesm file carries each original source.
  const fesmFor = new Map();
  for (const pkg of ['cdk', 'material']) {
    const dir = join(root, 'node_modules/@angular', pkg, 'fesm2022');
    for (const name of readdirSync(dir).filter(n => n.endsWith('.mjs.map'))) {
      const fesm = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      for (const source of fesm.sources) {
        const match = source.match(/\/bin\/(src\/.+\.ts)$/);
        if (match && !fesmFor.has(match[1])) {
          const file = join(dir, name.replace(/\.map$/, ''));
          fesmFor.set(match[1], {path: `@angular/${pkg}/fesm2022/${name.replace(/\.map$/, '')}`, sha256: sha256(readFileSync(file))});
        }
      }
    }
  }
  const versions = Object.fromEntries(['cdk', 'material'].map(pkg => [pkg, JSON.parse(readFileSync(join(root, 'node_modules/@angular', pkg, 'package.json'), 'utf8')).version]));
  const joinReport = JSON.parse(readFileSync(join(root, 'compatibility/f10/audit-join/join.json'), 'utf8'));
  const rows = joinReport.rows.filter(row => row.defects.some(d => d.startsWith('inherited-') || d.startsWith('sensitive-')));
  const results = [];
  const squash = s => s.replace(/\s+/g, '');
  for (const row of rows) {
    const delegated = new Set(row.files.filter(f => f.kind === 'delegated-peer').map(f => f.path));
    const patch = spawnSync('git', ['--git-dir', upstream, 'show', '--format=', '--no-renames', row.sha], {encoding: 'utf8', maxBuffer: 1 << 28}).stdout;
    const added = addedLines(patch, delegated);
    const files = [];
    for (const path of delegated) {
      const lines = added.get(path) || [];
      const original = byUpstreamPath.get(path);
      const entry = {path, installed_member: fesmFor.get(path) || null, in_bundle: Boolean(original), added_lines: lines.length, lines: []};
      if (original && lines.length) {
        const sourceLines = original.content.split('\n');
        for (const text of lines) {
          const numbers = [];
          sourceLines.forEach((line, n) => { if (line.trim() === text || squash(line).includes(squash(text))) numbers.push(n + 1); });
          let executed = null;
          for (const line of numbers) {
            for (const offset of generated.get(original.source)?.get(line) || []) {
              const count = countAt(offset);
              if (count !== null) executed = Math.max(executed ?? 0, count);
            }
          }
          entry.lines.push({text, installed_source_lines: numbers, max_execution_count: executed});
        }
      }
      entry.found_in_installed_source = entry.lines.filter(l => l.installed_source_lines.length).length;
      entry.executed = entry.lines.filter(l => (l.max_execution_count ?? 0) > 0).length;
      files.push(entry);
    }
    const totalAdded = files.reduce((n, f) => n + f.added_lines, 0);
    const found = files.reduce((n, f) => n + (f.found_in_installed_source || 0), 0);
    const executed = files.reduce((n, f) => n + f.executed, 0);
    let status;
    if (!files.some(f => f.path.endsWith('.ts'))) status = 'no-script-delegated-source';
    else if (!files.some(f => f.in_bundle)) status = 'delegated-module-not-in-candidate-bundle';
    else if (!totalAdded) status = 'no-significant-added-lines';
    else if (!found) status = 'added-lines-not-found-in-installed-source';
    else if (!executed) status = 'present-not-executed';
    else if (executed === found && found === totalAdded) status = 'all-added-lines-present-and-executed';
    else status = 'some-added-lines-executed';
    results.push({sha: row.sha, final_disposition: row.final_disposition, status, added_lines: totalAdded, found_in_installed_source: found, executed, files});
  }
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const report = {
    schema_version: 1,
    role: 'FIN-02 executed-delegation observation (main line only; not a disposition or individual proof)',
    g11_claim: 'not-passed',
    line: 'main',
    environment: {
      browser: raw.browser, jasmine_core: raw.jasmine_core, installed: versions,
      candidate_tarball_sha256: arg('--tarball-sha256', null),
      bundle_sha256: raw.bundle_sha256,
      run: raw.summary,
      coverage_granularity: raw.coverage_granularity,
      command: 'LEGACY_SUBJECT_MODE=artifact node testing/legacy-runner/build.mjs && node scripts/observe-delegated-execution.mjs',
    },
    counts,
    rows: results,
    limitations: [
      'Execution is V8 block coverage of the historical legacy spec run against the packed candidate on the main floor only (22.1.7). 21.x is not observed.',
      'A line counts as executed when the innermost covered range around a bundle position mapped from that installed original TypeScript line ran at least once. With function granularity that is the enclosing function, not the branch. Mapping goes through the installed fesm2022 source maps that esbuild followed.',
      'Added lines are matched by text in the installed source; a refactored line is not found, and a generic line can match elsewhere in the same file.',
      'Execution by any spec is not proof that a spec asserts the fixed behavior.',
      'no-script-delegated-source rows change only styles, build or other non-TypeScript delegated files; their evidence must be a rendered or compiled observation, not script coverage.',
      'This observation run is a plain jasmine page driven over the DevTools protocol, not the karma acceptance run; the environment.run failures (positioning specs sensitive to the window) are listed and do not affect the coverage of other specs.',
    ],
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({run: raw.summary.executed, failed: raw.summary.failed, counts}, null, 1));
}

if (!args.includes('--analyze-only')) await collect();
analyze();
