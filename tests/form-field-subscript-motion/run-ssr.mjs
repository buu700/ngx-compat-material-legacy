/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {createHash} from 'node:crypto';
import {copyFileSync,mkdirSync,readFileSync,readdirSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const argv=process.argv.slice(2),o={};
if(argv.length!==8)throw Error('Usage: node run-ssr.mjs --tarball PATH --sha256 HEX --peer-root NODE_MODULES --out NEW_DIR');
for(let i=0;i<argv.length;i+=2){if(!['--tarball','--sha256','--peer-root','--out'].includes(argv[i])||o[argv[i]])throw Error('Invalid or duplicate option');o[argv[i]]=argv[i+1];}
for(const key of ['--tarball','--sha256','--peer-root','--out'])if(!o[key])throw Error('Missing '+key);
if(!/^[a-f0-9]{64}$/.test(o['--sha256']))throw Error('Expected lowercase SHA-256');
const here=dirname(fileURLToPath(import.meta.url)),tar=resolve(o['--tarball']),peer=resolve(o['--peer-root']),out=resolve(o['--out']);
const hash=()=>createHash('sha256').update(readFileSync(tar)).digest('hex');if(hash()!==o['--sha256'])throw Error('Packed artifact hash mismatch');
mkdirSync(out);const logs=[];
function run(command,args,cwd){const p=spawnSync(command,args,{cwd,encoding:'utf8'});logs.push({command:[command,...args],exit_code:p.status,stdout:p.stdout,stderr:p.stderr});writeFileSync(join(out,'commands.json'),JSON.stringify(logs,null,2)+'\n');if(p.error)throw p.error;if(p.status!==0)throw Error('SSR command failed: '+p.stderr);return p.stdout;}
mkdirSync(join(out,'artifact'));run('tar',['-xzf',tar,'-C',join(out,'artifact')],out);const pkg=join(out,'artifact/package');
if(JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')).name!=='@ngx-compat/material-legacy')throw Error('Unexpected packed package');
symlinkSync(peer,join(pkg,'node_modules'),'dir');mkdirSync(join(out,'node_modules'));
for(const name of readdirSync(peer)){if(name==='@ngx-compat'||name==='.bin')continue;symlinkSync(join(peer,name),join(out,'node_modules',name));}
mkdirSync(join(out,'node_modules/@ngx-compat'));symlinkSync(pkg,join(out,'node_modules/@ngx-compat/material-legacy'),'dir');
writeFileSync(join(out,'package.json'),JSON.stringify({private:true,type:'module'})+'\n');mkdirSync(join(out,'src'));copyFileSync(join(here,'fixtures/ssr/main.ts'),join(out,'src/main.ts'));copyFileSync(join(here,'tsconfig.json'),join(out,'tsconfig.json'));
run(process.execPath,[join(peer,'@angular/compiler-cli/bundles/src/bin/ngc.js'),'-p','tsconfig.json'],out);
const stdout=run(process.execPath,['out/main.js'],out),records=stdout.split('\n').filter(line=>line.startsWith('FORM_FIELD_SSR_RESULT '));if(records.length!==1)throw Error('Expected exactly one SSR result record');const data=JSON.parse(records[0].slice('FORM_FIELD_SSR_RESULT '.length));if(hash()!==o['--sha256'])throw Error('Packed artifact changed');
if(data.observations?.platform!==true||data.observations.geometry.length!==0||data.observations.destroyed!==true)throw Error('SSR observations incomplete');
writeFileSync(join(out,'result.json'),JSON.stringify({passed:true,sha256:hash(),observations:data.observations,serialized:data.serialized,scope:'Strict AOT application with actual server rendering. Partially compiled dependencies use Angular JIT; no hydration claim.'},null,2)+'\n');
console.log('Packed form-field SSR regression passed');
