/** Fixed semantic probes against the untouched, lock-authenticated16 environment.
 * The same pinned Sass compiler measures both modules. No golden is rewritten.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {SILENCE} from './sass-api-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const FUNCTION_CATALOG = 'fixtures/sass/function-contracts.json';
export function functionCatalog() {
  const raw = readFileSync(join(root, FUNCTION_CATALOG));const catalog = JSON.parse(raw);
  const oracle = JSON.parse(readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-sass-api.json')));
  if (catalog.schema_version !== 1 || !catalog.setup || catalog.cases.length !== 57
    || new Set(catalog.cases.map(c => c.case_id)).size !== 57
    || JSON.stringify([...new Set(catalog.cases.map(c => c.function))].sort()) !== JSON.stringify(Object.keys(oracle.members.functions).sort())
    || catalog.cases.some(c => !c.case_id.startsWith('function-value/'+c.function+'/') || typeof c.expression !== 'string' || !c.expression.startsWith('m.'+c.function+'('))) {
    throw new Error('historical function probe roster is incomplete or invalid');
  }
  return {...catalog,sha256:sha(raw)};
}
export function functionCaseIds() {return functionCatalog().cases.map(c => c.case_id);}
export function measureFunction(sass, entry, loadPaths, catalog, probe, allowedRoots, importers = []) {
  const program = `@use 'sass:meta'; @use '${entry.replaceAll('\\', '/')}' as m;\n${catalog.setup}\n@debug meta.inspect(${probe.expression});`;
  const messages = [];
  const result = sass.compileString(program, {loadPaths,importers,silenceDeprecations:SILENCE,
    logger:{warn(){},debug(message){messages.push(message);}}});
  if (messages.length !== 1 || typeof messages[0] !== 'string' || !messages[0]) throw new Error('probe did not produce exactly one nonempty value');
  const sources = result.loadedUrls.filter(url => url.protocol === 'file:').map(url => {
    const path = realpathSync(fileURLToPath(url));
    const base = allowedRoots.find(base => {const rel = relative(base,path);return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel));});
    if (!base) throw new Error('function probe resolved outside its authenticated roots: '+path);
    const bytes = readFileSync(path);return {root:allowedRoots.indexOf(base),path:relative(base,path).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};
  }).sort((a,b) => a.root-b.root || a.path.localeCompare(b.path));
  return {value:messages[0],value_sha256:sha(messages[0]),value_bytes:Buffer.byteLength(messages[0]),program_sha256:sha(program),sources};
}
export function functionResultsMatch(expected, actual) {
  return typeof expected?.value === 'string' && expected.value.length > 0 && typeof actual?.value === 'string'
    && expected.value === actual.value && expected.value_sha256 === sha(expected.value)
    && actual.value_sha256 === sha(actual.value) && expected.value_bytes === Buffer.byteLength(expected.value)
    && actual.value_bytes === Buffer.byteLength(actual.value);
}
export function runFunctionContracts({sass,entry,loadPaths,allowedRoots,importers=[],line}) {
  const catalog = functionCatalog();const referenceDir = join(root,'reference/material-16.2.14');
  const provenance = JSON.parse(readFileSync(join(referenceDir,'PROVENANCE.json'))).isolated_environment;
  for (const [file,key] of [['environment-package.json','package_json_sha256'],['environment-package-lock.json','package_lock_sha256']]) {
    if (sha(readFileSync(join(referenceDir,file))) !== provenance[key]) throw new Error('historical function environment identity mismatch');
  }
  const original = mkdtempSync(join(tmpdir(),'ngx-sass-functions-original-'));
  try {
    copyFileSync(join(referenceDir,'environment-package.json'),join(original,'package.json'));
    copyFileSync(join(referenceDir,'environment-package-lock.json'),join(original,'package-lock.json'));
    const env = {...process.env,NODE_PATH:'',NODE_OPTIONS:''};
    const child = spawnSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:original,env,encoding:'utf8',timeout:180000});
    if (child.status !== 0) throw new Error('historical function environment npm ci failed: '+String(child.stderr || child.stdout).slice(-2000));
    const manifest = readFileSync(join(original,'node_modules/@angular/material/package.json'));
    if (sha(manifest) !== provenance.material_manifest_sha256 || JSON.parse(manifest).version !== '16.2.14') throw new Error('original function module is not authenticated Material16.2.14');
    const referenceRoot = realpathSync(join(original,'node_modules'));
    const referenceEntry = join(referenceRoot,'@angular/material/_index.scss');
    const entryBytes = readFileSync(referenceEntry);
    if (entryBytes.length !== catalog.original_entry_identity.bytes || sha(entryBytes) !== catalog.original_entry_identity.sha256) throw new Error('untouched16 facade source identity mismatch');
    const lock = JSON.parse(readFileSync(join(referenceDir,'environment-package-lock.json')));
    const identity = {material_version:'16.2.14',material_manifest_sha256:sha(manifest),
      lock_sha256:provenance.package_lock_sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,
      catalog:FUNCTION_CATALOG,catalog_sha256:catalog.sha256,sass_version:sass.info,expected_source:'untouched-installed-material16',candidate_source:'packed-facade'};
    const results = catalog.cases.map(probe => {
      let expected,actual,error;
      try {
        expected = measureFunction(sass,referenceEntry,[referenceRoot],catalog,probe,[referenceRoot]);
        actual = measureFunction(sass,entry,loadPaths,catalog,probe,allowedRoots,importers);
      } catch (caught) {error = String(caught.message || caught);}
      return {case_id:probe.case_id,function:probe.function,expression:probe.expression,line,
        result:!error && functionResultsMatch(expected,actual) ? 'pass':'fail',expected,actual,error:error ?? null,identity};
    });
    const success = results.find(r => r.result === 'pass');
    const mutated = success ? {...success.actual,value:'incorrect-but-nonempty',value_sha256:sha('incorrect-but-nonempty'),value_bytes:Buffer.byteLength('incorrect-but-nonempty')} : null;
    const negative = Boolean(success && !functionResultsMatch(success.expected,mutated));
    return {results,identity,mutation_rejected:negative,ok:negative && results.length===57 && results.every(r=>r.result==='pass')};
  } finally {rmSync(original,{recursive:true,force:true});}
}
