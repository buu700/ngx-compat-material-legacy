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
const args=process.argv.slice(2),options={};
const keys=['--tarball','--sha256','--peer-root','--out'];
if(args.length!==8) throw Error('Usage: node run.mjs --tarball PATH --sha256 HEX --peer-root NODE_MODULES --out NEW_DIR');
for(let i=0;i<args.length;i+=2){if(!keys.includes(args[i])||options[args[i]]||!args[i+1]) throw Error('Invalid option '+args[i]); options[args[i]]=args[i+1];}
if(!/^[a-f0-9]{64}$/.test(options['--sha256'])) throw Error('Expected lowercase SHA-256');
const here=dirname(fileURLToPath(import.meta.url)), workspace=resolve(process.env.TABLE_OWNER_WORKSPACE||join(here,'../..'));
const tarball=resolve(options['--tarball']),peer=resolve(options['--peer-root']),out=resolve(options['--out']);
const hash=()=>createHash('sha256').update(readFileSync(tarball)).digest('hex');
if(hash()!==options['--sha256']) throw Error('Packed artifact hash mismatch');
const helper=join(workspace,'scripts/check-companion-computed-styles.mjs');
function run(cmd,argv,cwd,log){const r=spawnSync(cmd,argv,{cwd,encoding:'utf8',env:process.env});writeFileSync(log,(r.stdout||'')+(r.stderr||''));if(r.error)throw r.error;if(r.status!==0)throw Error(`${cmd} failed (${r.status??r.signal}), see ${log}`);}
mkdirSync(out);
for(const variant of ['good','mutant']){
 const root=join(out,variant),artifact=join(root,'artifact');mkdirSync(root);mkdirSync(artifact);
 run('tar',['-xzf',tarball,'-C',artifact],root,join(out,variant+'-extract.log'));
 const pkg=join(artifact,'package');
 if(JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')).name!=='@ngx-compat/material-legacy')throw Error('Unexpected package');
 if(variant==='mutant'){
  const bundle=join(pkg,'fesm2022/ngx-compat-material-legacy-legacy-table.mjs');
  const original=readFileSync(bundle,'utf8'), from='if (table instanceof MatLegacyTable) {\n            for (const definition of [column, header, footer, row]) {\n                if (definition)\n                    definition._table = table;', to='if (table instanceof MatLegacyTable) {\n            for (const definition of [column, header, footer, row]) {\n                if (definition)\n                    definition._table = null;';
  if(original.split(from).length!==2)throw Error('Expected exactly one owner assignment for mutation');
  writeFileSync(bundle,original.replace(from,to));
 }
 mkdirSync(join(root,'src'));mkdirSync(join(root,'dist'));mkdirSync(join(root,'node_modules'));
 for(const name of readdirSync(peer)){if(name==='@ngx-compat'||name==='.bin')continue;symlinkSync(join(peer,name),join(root,'node_modules',name));}
 mkdirSync(join(root,'node_modules/@ngx-compat'));symlinkSync(pkg,join(root,'node_modules/@ngx-compat/material-legacy'),'dir');
 symlinkSync(peer,join(pkg,'node_modules'),'dir');
 copyFileSync(join(here,'fixture.ts'),join(root,'src/main.ts'));copyFileSync(join(here,'tsconfig.json'),join(root,'tsconfig.json'));copyFileSync(join(here,'index.html'),join(root,'dist/index.html'));
 run(process.execPath,[join(peer,'@angular/compiler-cli/bundles/src/bin/ngc.js'),'-p','tsconfig.json'],root,join(out,variant+'-aot.log'));
 run(process.execPath,[join(here,'build.mjs'),root,workspace,peer],root,join(out,variant+'-build.log'));
 run(process.execPath,[join(here,'probe.mjs'),helper,join(root,'dist'),join(out,variant+'-result.json'),variant],root,join(out,variant+'-browser.log'));
 if(hash()!==options['--sha256'])throw Error('Packed artifact changed during test');
}
writeFileSync(join(out,'result.json'),JSON.stringify({passed:true,tarball,sha256:hash(),positive:'passed',nullAssociationMutant:'rejected'},null,2)+'\n');
