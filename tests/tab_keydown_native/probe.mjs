/** @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync, existsSync, realpathSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import cp from 'node:child_process';
let observedSpawn;
const spawnOriginal = cp.spawn;
cp.spawn = (cmd, args, opts) => {
    const child = spawnOriginal(cmd, args, opts);
    if (args?.some(arg => String(arg).startsWith('--user-data-dir='))) {
        observedSpawn = {pid: child.pid, args, executable: cmd};
    }
    return child;
};
syncBuiltinESMExports();
const { withChromium } = await import('../../scripts/check-companion-computed-styles.mjs');
const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require('typescript');
const esbuild = require('esbuild');
const sha = value => createHash('sha256').update(value).digest('hex');
const out = process.argv[2];
const mode = process.argv[3] || 'candidate';
assert.ok(out);
assert.ok(['candidate', 'mutant', 'callback-failure'].includes(mode));

const originalPath = 'reference/material-16.2.14/component-behavior-sources/tabs/tab-nav-bar.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts';
const original = readFileSync(originalPath, 'utf8');
assert.equal(sha(original), 'f027ace09827cf65cbcf53b1d969bf4964563466b1f330b7ddd4d8525934dada');
const tagged = execFileSync('git', [
    'show', 'baseline/angular-components-16.2.x:src/material/tabs/tab-nav-bar/tab-nav-bar.ts',
]);
assert.equal(sha(tagged), sha(original));

const source = ts.createSourceFile('original.ts', original, ts.ScriptTarget.Latest, true);
const ownerClass = source.statements.find(node =>
    ts.isClassDeclaration(node) && node.name?.text === '_MatTabLinkBase');
const method = ownerClass.members.find(node => node.name?.getText(source) === '_handleKeydown').getText(source);
const reference = ts.transpileModule(
    'const ENTER=13, SPACE=32; class Tagged { ' + method +
        ' }; window.taggedHandler=Tagged.prototype._handleKeydown;',
    {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, removeComments: true}},
).outputText;

const dist = join(root, 'dist/ngx-material-legacy');
const module = join(dist, 'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
const map = JSON.parse(readFileSync(module + '.map', 'utf8'));
const matches = map.sources.map((name, index) => [name, map.sourcesContent[index]])
    .filter(([name]) => name.endsWith('internal/tab-nav-bar-base.ts'));
assert.equal(matches.length, 1);
assert.equal(sha(matches[0][1]), sha(readFileSync(candidatePath)));
assert.equal(JSON.parse(readFileSync(require.resolve('@angular/core/package.json'))).version, '22.1.7');
const dir = mkdtempSync(join(tmpdir(), 'tab-keydown-angular-'));
const nonce = randomUUID();
let ownership;
const injectedFailure = new Error('injected callback failure');
let outerFailure;
try {
    const plugins = mode === 'mutant' ? [{
        name: 'restore-regression',
        setup(build) {
            build.onLoad({filter: /ngx-compat-material-legacy-legacy-tabs\.mjs$/}, args => {
                const text = readFileSync(args.path, 'utf8');
                const before = 'this._tabNavBar.tabPanel) {\n                this.elementRef.nativeElement.click();';
                const after = 'this._tabNavBar.tabPanel) {\n                if (event.keyCode === SPACE) { event.preventDefault(); }\n                this.elementRef.nativeElement.click();';
                assert.equal(text.split(before).length, 2);
                return {
                    contents: text.replace(before, after),
                    loader: 'js',
                    resolveDir: join(dist, 'fesm2022'),
                };
            });
        },
    }] : [];
    await esbuild.build({
        entryPoints: [join(root, 'tests/tab_keydown_native/subject.mjs')],
        outfile: join(dir, 'bundle.js'),
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2022',
        logLevel: 'silent',
        plugins,
        alias: {
            '@ngx-compat/material-legacy/legacy-tabs': module,
            '@ngx-compat/material-legacy/legacy-core': join(dist, 'fesm2022/ngx-compat-material-legacy-legacy-core.mjs'),
        },
    });
    writeFileSync(join(dir, 'index.html'), '<test-root></test-root><script>window.fixtureNonce=' + JSON.stringify(nonce) + '</script><script src="bundle.js"></script>');
    let result;
    let primaryFailure;
    let cleanupFailure;
    try {
        result = await withChromium(dir, async ({ send, evaluate, browser, port }) => {
        const url = 'http://127.0.0.1:' + port + '/';
        assert.ok(observedSpawn?.pid, 'owned child pid not captured');
        const profile = observedSpawn.args.find(x => x.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length);
        assert.ok(profile);
        const tempRoot = realpathSync(tmpdir());
        assert.equal(realpathSync(dirname(profile)), tempRoot);
        assert.ok(basename(profile).startsWith('ngx-compat-chrome-companion-'));
        assert.equal(realpathSync(profile), join(tempRoot, basename(profile)));
        const profileStat = lstatSync(profile);
        assert(profileStat.isDirectory() && !profileStat.isSymbolicLink());
        assert(observedSpawn.args.includes(url));
        const owner = {pid: observedSpawn.pid, profile};
        const active = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split('\n');
        const version = await (await fetch('http://127.0.0.1:' + active[0] + '/json/version')).json();
        assert.equal(new URL(version.webSocketDebuggerUrl).pathname, active[1]);
        const pages = await (await fetch('http://127.0.0.1:' + active[0] + '/json/list')).json();
        const page = pages.filter(x => x.type === 'page' && x.url === url);
        assert.equal(page.length, 1);
        ownership = {
            nonce, pid: owner.pid, profile: owner.profile, debug_port: Number(active[0]),
            browser_websocket: version.webSocketDebuggerUrl, page_id: page[0].id,
            page_url: url, devtools_active_port: active,
            temp_root: tempRoot, profile_device: profileStat.dev, profile_inode: profileStat.ino,
        };
        for (let i = 0; i < 200; i++) {
            let ready = await evaluate('window.probeError || (window.probeReady ? "ready" : "")');
            if (ready) {
                assert.equal(ready, 'ready');
                break;
            }
            await new Promise(r => setTimeout(r, 50));
            assert(i < 199, 'bootstrap timeout');
        }
        assert.equal(await evaluate('window.fixtureNonce'), nonce);
        if (mode === 'callback-failure') throw injectedFailure;
        await evaluate(reference);
        let cases = [];
        for (const disabled of [false, true])
            for (const panel of [false, true])
                for (const [key, keyCode, altKey, ctrlKey] of [['Enter', 13, false, false], [' ', 32, false, false], ['Escape', 27, false, false], ['Enter', 13, false, true], [' ', 32, true, false], ['a', 65, false, false]]) {
                    const input = { disabled, panel, key, keyCode, altKey, ctrlKey }, go = reference => evaluate('window.keyCases.run(' + JSON.stringify({ ...input, reference }) + ')');
                    const old = await go(true), actual = await go(false);
                    cases.push({ ...input, original: old, candidate: actual });
                }
        let differences = cases.filter(x => JSON.stringify(x.original) !== JSON.stringify(x.candidate));
        if (mode === 'candidate')
            assert.deepEqual(differences, []);
        else
            assert.deepEqual(differences.map(x => [x.disabled, x.panel, x.keyCode, x.altKey]), [[false, true, 32, false], [false, true, 32, true]]);
        const cdp = [];
        for (const disabled of [false, true])
            for (const [key, code, n] of [['Enter', 'Enter', 13], [' ', 'Space', 32]]) {
                await evaluate('window.keyCases.configure(' + JSON.stringify({ disabled, panel: true }) + ')');
                await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: n, nativeVirtualKeyCode: n });
                await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: n, nativeVirtualKeyCode: n });
                let events = await evaluate('window.observed');
                assert.equal(events.length, 1);
                assert.equal(events[0].defaultPrevented, disabled || (mode === 'mutant' && n === 32));
                cdp.push({ disabled, key, events });
            }
        await evaluate('window.keyCases.destroy()');
        return { browser, cases, differences, cdp };
        }, { debugPort: 0, requireAnnouncedEndpoint: true });
    } catch (error) {
        primaryFailure = error;
    } finally {
        try {
            if (observedSpawn) {
                // Never remove a profile whose ownership or closure is uncertain.
                assert.ok(ownership, 'browser ownership could not be proven; preserve profile');
                let endpointClosed = false;
                try {
                    await fetch('http://127.0.0.1:' + ownership.debug_port + '/json/version', {
                        signal: AbortSignal.timeout(500),
                    });
                } catch (error) {
                    endpointClosed = error?.cause?.code === 'ECONNREFUSED';
                }
                assert(endpointClosed, 'owned endpoint still alive; preserve profile');
                const pidGone = !existsSync('/proc/' + ownership.pid);
                assert(pidGone, 'owned browser process still alive; preserve profile');
                const peers = [];
                for (const pid of readdirSync('/proc').filter(x => /^\d+$/.test(x))) {
                    try {
                        if (readFileSync('/proc/' + pid + '/cmdline', 'utf8').includes(ownership.profile)) {
                            peers.push(Number(pid));
                        }
                    } catch (error) {
                        // A disappearing process is harmless; unreadable live processes are not.
                        if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error;
                    }
                }
                assert.deepEqual(peers, [], 'profile still in use; preserve profile');
                const current = lstatSync(ownership.profile);
                assert(current.isDirectory() && !current.isSymbolicLink());
                assert.equal(current.dev, ownership.profile_device);
                assert.equal(current.ino, ownership.profile_inode);
                assert.equal(realpathSync(ownership.profile),
                    join(ownership.temp_root, basename(ownership.profile)));
                rmSync(ownership.profile, {recursive: true});
                ownership.cleanup = {
                    endpoint_closed: endpointClosed, pid_gone: pidGone,
                    profile_processes: peers, profile_removed: !existsSync(ownership.profile),
                };
                assert(ownership.cleanup.profile_removed);
            }
        } catch (error) {
            cleanupFailure = error;
        }
    }
    if (cleanupFailure) {
        if (primaryFailure) {
            primaryFailure.cleanupFailure = cleanupFailure;
            console.error('Cleanup failure; owned profile preserved:', cleanupFailure.message);
            throw primaryFailure;
        }
        throw cleanupFailure;
    }
    if (mode === 'callback-failure') {
        assert.equal(primaryFailure, injectedFailure, 'original callback failure must be preserved');
        result = {browser: null, cases: [], differences: [], cdp: [],
            injected_callback_failure: primaryFailure.message, same_error_object: true};
    } else if (primaryFailure) {
        throw primaryFailure;
    }
    const report = {
        mode,
        ownership,
        node: process.version,
        fixture_sha256: sha(readFileSync('tests/tab_keydown_native/subject.mjs')),
        producer_sha256: sha(readFileSync('tests/tab_keydown_native/probe.mjs')),
        typescript: ts.version,
        angular_core_version: JSON.parse(readFileSync(require.resolve('@angular/core/package.json'))).version,
        artifact_sourcemap_sha256: sha(readFileSync(module + '.map')),
        scope: 'Linux-specific /proc ownership checks. Angular 22.1.7 zoneless Chromium: 24 synthetic browser KeyboardEvents on the real view versus the untouched16 handler on the same instance; four CDP key events observe defaultPrevented only, not click counts. Callback-failure mode verifies primary-error identity and profile cleanup. Reference handler is not a full Material 16 component; no packed/floor/style/G11 claim.',
        candidate_source_sha256: sha(readFileSync(candidatePath)),
        reference_source_sha256: sha(original),
        reference_method_sha256: sha(method),
        package_fesm_sha256: sha(readFileSync(module)),
        source_map_binds_candidate: true,
        browser_executable: realpathSync(observedSpawn.executable),
        chromium_sha256: sha(readFileSync(observedSpawn.executable)),
        ...result,
    };
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ mode, cases: result.cases.length, differences: result.differences.length, cdp: result.cdp.length }));
} catch (error) {
    outerFailure = error;
    throw error;
} finally {
    try {
        rmSync(dir, {recursive: true, force: true});
    } catch (error) {
        if (!outerFailure) throw error;
        outerFailure.fixtureCleanupFailure = error;
        console.error('Fixture cleanup failure:', error.message);
    }
}
