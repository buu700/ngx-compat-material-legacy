/** Normal Angular consumer module resolution, including RxJS 6 directory entries. */
import {createRequire} from 'node:module';
import {readFileSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, isAbsolute, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlerVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies.esbuild;
export function isolatedHarnessInputs(consumer, metadata, resolvePath = realpathSync) {
  const base = resolvePath(consumer);
  const inputs = Object.keys(metadata?.inputs ?? {});
  if (!inputs.length) throw new Error('harness bundle has no source inputs');
  return inputs.map(input => {
    const actual = resolvePath(isAbsolute(input) ? input : join(consumer, input));
    const rel = relative(base, actual);
    if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error(`harness bundle borrowed a source outside the consumer: ${input}`);
    return {path: rel.split('\\').join('/'), actual};
  });
}
export function bundleConsumerHarness(consumer) {
  const consumerRequire = createRequire(join(consumer, 'package.json'));
  const bundlerPath = consumerRequire.resolve('esbuild');
  isolatedHarnessInputs(consumer, {inputs: {[bundlerPath]: {}}});
  const esbuild = consumerRequire('esbuild');
  if (esbuild.version !== bundlerVersion) throw new Error('consumer harness bundler does not match the pinned workspace tool');
  const output = join(consumer, 'out-tsc/harness-runtime.cjs');
  const built = esbuild.buildSync({absWorkingDir: consumer, entryPoints: ['out-tsc/harness-runtime.js'],
    bundle: true, platform: 'node', format: 'cjs', target: 'es2022', keepNames: true,
    // The TestBed fixture explicitly imports the JIT compiler for partial peer declarations.
    ignoreAnnotations: true,
    outfile: output, metafile: true, logLevel: 'silent', nodePaths: [],
    external: ['jsdom', 'zone.js'],
  });
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const inputs = isolatedHarnessInputs(consumer, built.metafile).map(({path, actual}) => ({path, sha256: hash(readFileSync(actual))}));
  for (const name of ['jsdom', 'zone.js']) {
    const consumerRequire = createRequire(join(consumer, 'package.json'));
    isolatedHarnessInputs(consumer, {inputs: {[consumerRequire.resolve(name)]: {}}});
  }
  return {output, receipt: {module_loader: 'bundled-consumer-node-cjs', tool_version: esbuild.version,
    format: 'cjs', platform: 'node', target: 'es2022', preserve_explicit_imports: true, input_paths_confined: true,
    inputs, bundle_sha256: hash(readFileSync(output))}};
}
