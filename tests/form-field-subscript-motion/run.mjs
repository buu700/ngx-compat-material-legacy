/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2), options={};
if (args.length !== 10) throw Error('Usage: node run.mjs --tarball PATH --sha256 HEX --peer-root NODE_MODULES --workspace ROOT --out NEW_DIR');
for(let i=0;i<args.length;i+=2){if(!['--tarball','--sha256','--peer-root','--workspace','--out'].includes(args[i]) || options[args[i]]) throw Error('Invalid or duplicate option: '+args[i]);options[args[i]]=args[i+1];}
for(const k of ['--tarball','--sha256','--peer-root','--workspace','--out']) if(!options[k]) throw Error('Missing '+k);
if(!/^[a-f0-9]{64}$/.test(options['--sha256'])) throw Error('Expected lowercase SHA-256');
const here=dirname(fileURLToPath(import.meta.url)), tarball=resolve(options['--tarball']), peer=resolve(options['--peer-root']), workspace=resolve(options['--workspace']), out=resolve(options['--out']);
const hash=()=>createHash('sha256').update(readFileSync(tarball)).digest('hex');
if(hash()!==options['--sha256']) throw Error('Packed artifact hash mismatch');
const helper=join(workspace,'scripts/check-companion-computed-styles.mjs');
const env={...process.env,MOTION_BROWSER_HELPER:helper,MOTION_OUTPUT:out};
function run(cmd,argv,cwd){const r=spawnSync(cmd,argv,{cwd,env,stdio:'inherit'});if(r.error) throw r.error;if(r.status!==0) throw Error(`${cmd} failed: ${r.status ?? r.signal}`);}
mkdirSync(out);const extracted=join(out,'artifact');mkdirSync(extracted);run('tar',['-xzf',tarball,'-C',extracted],out);
const pkg=join(extracted,'package');
if(JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')).name!=='@ngx-compat/material-legacy') throw Error('Unexpected packed package');
symlinkSync(peer,join(pkg,'node_modules'),'dir');
const cases=[...['zoneful','zoneless','noop'].map(v=>['motion',v]),...['zoneful','zoneless','noop','initial-error'].map(v=>['boundary',v]),['nested','main']];
for(const [kind,variant] of cases){
 const root=join(out,kind+'-'+variant);mkdirSync(root);mkdirSync(join(root,'src'));mkdirSync(join(root,'dist'));mkdirSync(join(root,'node_modules'));
 for(const name of readdirSync(peer)){if(name==='@ngx-compat' || name==='.bin') continue;symlinkSync(join(peer,name),join(root,'node_modules',name));}
 mkdirSync(join(root,'node_modules/@ngx-compat'));symlinkSync(pkg,join(root,'node_modules/@ngx-compat/material-legacy'),'dir');
 copyFileSync(join(here,'fixtures',kind,variant+'.ts'),join(root,'src/main.ts'));copyFileSync(join(here,'tsconfig.json'),join(root,'tsconfig.json'));copyFileSync(join(here,'index.html'),join(root,'dist/index.html'));
 run(process.execPath,[join(peer,'@angular/compiler-cli/bundles/src/bin/ngc.js'),'-p','tsconfig.json'],root);
 run(process.execPath,[join(here,'build.mjs'),root,workspace,peer],root);
 const probe=join(here,kind+'-probe.mjs');
 if(kind==='motion') run(process.execPath,[probe,join(root,'dist'),variant+'-motion'],root);
 else if(kind==='boundary') run(process.execPath,[probe,root,variant],root);
 else run(process.execPath,[probe,join(root,'dist'),'nested'],root);
 if(hash()!==options['--sha256']) throw Error('Packed artifact changed during test');
}
writeFileSync(join(out,'result.json'),JSON.stringify({passed:true,tarball,sha256:hash(),cases},null,2)+'\n');
