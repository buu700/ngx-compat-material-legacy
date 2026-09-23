#!/usr/bin/env node
/** Capture Sass @debug/@warn evidence for structural/value fixtures with a pinned Dart Sass.
 * This does not install dependencies and never overwrites evidence directories.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);
if(argv.includes('--help')){
  console.log('Usage: node scripts/run-sass-value-fixtures.mjs --environment DIR --module @angular/material|@ngx-compat/material-legacy --output NEW_DIR [--fixtures DIR]');
  process.exit(0);
}
const opt={};
for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(!['--environment','--module','--output','--fixtures'].includes(k)||!argv[i+1]||argv[i+1].startsWith('--'))throw new Error(`Unknown/missing argument: ${k}`);
  opt[k]=argv[++i];
}
for(const k of ['--environment','--module','--output'])if(!opt[k])throw new Error(`Required argument missing: ${k}`);
const env=path.resolve(opt['--environment']);
const out=path.resolve(opt['--output']);
const fixtures=path.resolve(opt['--fixtures']||path.join(root,'fixtures/sass'));
const target=opt['--module'];
if(!['@angular/material','@ngx-compat/material-legacy'].includes(target))throw new Error('Unexpected module target.');
if(fs.existsSync(out))throw new Error('Output directory must be new; captured evidence is never overwritten.');
if(!fs.existsSync(path.join(env,'package.json')))throw new Error('Environment must contain package.json and installed pinned dependencies.');
const requireFromEnv=createRequire(pathToFileURL(path.join(env,'package.json')));
const sass=requireFromEnv('sass');
if(!sass.compileString||!sass.info)throw new Error('The environment must provide Dart Sass JS API.');
const manifest=JSON.parse(fs.readFileSync(path.join(fixtures,'manifest.json'),'utf8'));
const cases=manifest.cases.filter(c=>c.capture_debug===true);
if(!cases.length)throw new Error('No capture_debug fixtures selected.');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const reports=[];let failures=0;
fs.mkdirSync(out,{recursive:true});
for(const c of cases){
  if(path.basename(c.file)!==c.file||!c.file.endsWith('.scss'))throw new Error('Fixture filenames must be local SCSS files.');
  const sourceFile=path.join(fixtures,c.file);const source=fs.readFileSync(sourceFile,'utf8');
  const old="'@angular/material'";
  if(source.split(old).length!==2)throw new Error(`Expected exactly one historical module URL in ${c.file}`);
  const transformed=source.replace(old,`'${target}'`);
  const debug=[];const warnings=[];
  const rec={id:c.id,file:c.file,module:target,fixture_sha256:sha(source)};
  try{
    const result=sass.compileString(transformed,{url:pathToFileURL(sourceFile),loadPaths:[path.join(env,'node_modules')],style:'expanded',sourceMap:false,charset:false,
      logger:{debug(message){debug.push(String(message));},warn(message,info){warnings.push({message:String(message),deprecation:!!info?.deprecation});}}});
    Object.assign(rec,{status:'compiled',debug,warnings,css_sha256:sha(result.css)});
  }catch(error){failures++;Object.assign(rec,{status:'compile-failed',debug,warnings,error:String(error)});}
  reports.push(rec);
}
const installed={};
for(const pkg of ['@angular/material','@angular/cdk','@ngx-compat/material-legacy','sass']){
  const p=path.join(env,'node_modules',...pkg.split('/'),'package.json');
  if(fs.existsSync(p)){const bytes=fs.readFileSync(p);const m=JSON.parse(bytes);installed[pkg]={version:m.version,manifest_sha256:sha(bytes)};}
}
const report={schema_version:1,node:process.version,sass:sass.info,environment:env,module:target,installed,failures,fixtures:reports,
  limits:'Captured Sass debug/value evidence only. Compare exact fixture hashes, compiler version and ordered debug output; this is not a runtime or browser proof.'};
fs.writeFileSync(path.join(out,'sass-value-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:out,fixtures:reports.length,failures},null,2));
process.exitCode=failures?1:0;
