/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,symlinkSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
if(args[0]!=='--supervised') {
 if(args.length!==3) throw Error('usage: run PACKAGE_ROOT WORKSPACE NEW_OUT');
 const [packageRoot,workspace,out]=args.map(x=>resolve(x));
 if(existsSync(out)) throw Error('output must not exist');
 mkdirSync(out);
 for(const mode of ['zoneless','zoneful']) {
  const result=spawnSync('python3',['-B',join(here,'supervised.py'),workspace,process.execPath,resolve(process.argv[1]),'--supervised',packageRoot,workspace,join(out,mode),mode],{cwd:workspace,stdio:'inherit'});
  if(result.error) throw result.error; if(result.signal) throw Error('supervisor terminated: '+result.signal); if(result.status!==0) process.exit(result.status ?? 1);
 }
 const a=JSON.parse(readFileSync(join(out,'zoneless/result.json'))), b=JSON.parse(readFileSync(join(out,'zoneful/result.json')));
 assert.equal(a.package_inventory_sha256,b.package_inventory_sha256,'package changed between modes');
 writeFileSync(join(out,'summary.json'),JSON.stringify({status:'pass',package_root:packageRoot,package_inventory_sha256:a.package_inventory_sha256,module_sha256:a.module_sha256,modes:['zoneless','zoneful']},null,2)+'\n',{flag:'wx'});
 console.log('checkbox exhaustive: both modes passed'); process.exit(0);
}
if(args.length!==5) throw Error('usage: --supervised PACKAGE_ROOT WORKSPACE NEW_OUT MODE');
const [packageRoot,workspace,out]=args.slice(1,4).map(x=>resolve(x)),mode=args[4];
if(!['zoneless','zoneful'].includes(mode)||existsSync(out)) throw Error('invalid mode or output already exists');
const nodeModules=join(workspace,'node_modules'),require=createRequire(join(workspace,'package.json'));
const compilerRequire=createRequire(realpathSync(join(nodeModules,'@angular/compiler-cli/package.json'))); const {transformSync}=compilerRequire('@babel/core'),linker=compilerRequire('@angular/compiler-cli/linker/babel').default,{needsLinking}=compilerRequire('@angular/compiler-cli/linker'),esbuild=require('esbuild');
const {withChromium}=await import(pathToFileURL(join(workspace,'scripts/check-companion-computed-styles.mjs')).href);
const filename='fesm2022/ngx-compat-material-legacy-legacy-checkbox.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function inventory(root) {const files=[]; function walk(dir,rel='') {for(const name of readdirSync(dir).sort()){if(!rel&&name==='node_modules')continue;const r=rel?rel+'/'+name:name,p=join(dir,name),st=lstatSync(p);if(st.isSymbolicLink())throw Error('unexpected package symlink: '+r);if(st.isDirectory())walk(p,r);else if(st.isFile())files.push([r,hash(readFileSync(p))]);else throw Error('unexpected package entry: '+r);}}walk(root);return files;}
const before=inventory(packageRoot);assert.ok(before.some(([p])=>p===filename));mkdirSync(out);
const root=out,pkg=join(root,'package');cpSync(packageRoot,pkg,{recursive:true,filter:(src)=>src!==join(packageRoot,'node_modules')});assert.deepEqual(inventory(pkg),before,'package copy differs');
 mkdirSync(join(root,'src'));mkdirSync(join(root,'dist'));mkdirSync(join(root,'node_modules'));for(const name of readdirSync(nodeModules))if(name!=='@ngx-compat'&&name!=='.bin')symlinkSync(join(nodeModules,name),join(root,'node_modules',name));mkdirSync(join(root,'node_modules/@ngx-compat'));symlinkSync(pkg,join(root,'node_modules/@ngx-compat/material-legacy'),'dir');
 writeFileSync(join(root,'src/main.ts'),readFileSync(join(here,'main.ts'),'utf8').replace("new URL(location.href).searchParams.has('zoneful')",mode==='zoneful'?'true':'false')); cpSync(join(here,'tsconfig.json'),join(root,'tsconfig.json'));cpSync(join(here,'index.html'),join(root,'dist/index.html'));
 const ngc=spawnSync(process.execPath,[join(nodeModules,'@angular/compiler-cli/bundles/src/bin/ngc.js'),'-p','tsconfig.json'],{cwd:root,encoding:'utf8'});if(ngc.status!==0)throw Error(ngc.stdout+ngc.stderr);
 let linked=0;const result=await esbuild.build({absWorkingDir:root,entryPoints:['out/main.js'],bundle:true,format:'iife',outfile:'dist/app.js',platform:'browser',metafile:true,plugins:[{name:'linker',setup(build){build.onLoad({filter:/\.m?js$/},args=>{const source=readFileSync(args.path,'utf8');if(!source.includes('ɵɵngDeclare')||!needsLinking(args.path,source))return null;linked++;return {contents:transformSync(source,{filename:args.path,configFile:false,babelrc:false,plugins:[[linker,{linkerJitMode:false}]]}).code,loader:'js'};});}}]});assert.ok(linked);assert.ok(Object.keys(result.metafile.inputs).some(p=>p.includes('legacy-checkbox.mjs')));
 const resultRows=await withChromium(join(root,'dist'),async({evaluate,browser})=>{
 for(let i=0;i<100;i++){if(await evaluate('Object.keys(window.cases||{}).length===4 || !!document.getElementById("bootstrap-error")'))break;await new Promise(r=>setTimeout(r,100));}
 const rows=await evaluate(`(async()=>{if(document.getElementById('bootstrap-error'))throw Error(document.getElementById('bootstrap-error').textContent); const c=window.cases, output={}; const delay=()=>new Promise(r=>setTimeout(r,80)); const state=x=>({value:x.box.indeterminate,checked:x.box.checked,native:x.box._inputElement.nativeElement.indeterminate,nativeChecked:x.box._inputElement.nativeElement.checked,events:[...x.events]});
 for(const [i,v] of [true,false,'','false',null,1,0].entries()) {window.errors.length=0;c.default.events=[];c.default.update(v);await delay(); output['value:'+i]={state:state(c.default),errors:[...window.errors]};} c.default.update(true);c.default.events=[]; await delay(); window.errors.length=0;
 for(const id of ['default','check','noop','destroy']){let x=c[id];window.errors.length=0;x.update(true);await delay();const setupErrors=[...window.errors];x.events=[];window.errors.length=0;const input=x.box._inputElement.nativeElement; let during;input.addEventListener('click',()=>{during=id==='destroy'?{events:[...x.events],connected:input.isConnected}:state(x);},{once:true});input.click();let immediate=id==='destroy'?{events:[...x.events],connected:input.isConnected}:state(x); await Promise.resolve();let micro=id==='destroy'?{events:[...x.events],connected:input.isConnected}:state(x);await delay();output[id]={during,immediate,micro,setupErrors,errors:[...window.errors]};window.errors.length=0;}
 window.errors.length=0;window.control.value='after';await delay();output.positiveControl=[...window.errors];return output;})()`); return {browser,rows};},{debugPort:0,requireAnnouncedEndpoint:true});
 assert.deepEqual(inventory(packageRoot),before,'source package changed');assert.deepEqual(inventory(pkg),before,'tested package changed');
 const rows=resultRows.rows;
 writeFileSync(join(out,'result.json'),JSON.stringify({mode,package_root:packageRoot,package_inventory:before,package_inventory_sha256:hash(JSON.stringify(before)),module_sha256:before.find(([p])=>p===filename)[1],...resultRows},null,2)+'\n',{flag:'wx'});
 const expectedValues=[true,false,true,false,false,true,true];
 const expectedEvents=[['indeterminate:true'],['indeterminate:false'],[],['indeterminate:false'],['indeterminate:false'],['indeterminate:true'],['indeterminate:true']];
 for(let i=0;i<expectedValues.length;i++) {const row=rows['value:'+i];assert.deepEqual(row.errors,[]);assert.equal(row.state.value,expectedValues[i]);assert.equal(row.state.native,expectedValues[i]);assert.equal(row.state.checked,false);assert.equal(row.state.nativeChecked,false);assert.deepEqual(row.state.events,expectedEvents[i]);}
 for(const id of ['default','check','noop','destroy']) {assert.deepEqual(rows[id].setupErrors,[]);assert.deepEqual(rows[id].errors,[]);}
 const def=rows.default.micro;assert.equal(def.value,false);assert.equal(def.checked,true);assert.equal(def.native,false);assert.equal(def.nativeChecked,true);assert.deepEqual(def.events,['change:true','inside-indeterminate:true','indeterminate:false']);
 const check=rows.check.micro;assert.equal(check.value,true);assert.equal(check.checked,true);assert.equal(check.native,false);assert.equal(check.nativeChecked,true);assert.deepEqual(check.events,['change:true','inside-indeterminate:true']);
 const noop=rows.noop.micro;assert.equal(noop.value,true);assert.equal(noop.checked,false);assert.equal(noop.native,true);assert.equal(noop.nativeChecked,false);assert.deepEqual(noop.events,[]);
 // The change callback records the pre-reset component state. Chromium's native click
 // dispatch can run the queued microtask before a later event listener, so only assert
 // the later observations in addition to the synchronous callback trace.
 for(const phase of ['during','immediate']) {
  assert.deepEqual(rows.default[phase],def);
  assert.deepEqual(rows.check[phase],check);
  assert.deepEqual(rows.noop[phase],noop);
  assert.deepEqual(rows.destroy[phase],{events:['change:true','inside-indeterminate:true'],connected:false});
 }
 assert.deepEqual(rows.destroy.micro,{events:['change:true','inside-indeterminate:true'],connected:false});
 assert.ok(rows.positiveControl.length>0 && rows.positiveControl.every(x=>x.includes('NG0100')&&x.includes('_Control')),'exhaustive-check positive control did not fire');
 console.log(`checkbox exhaustive: ${mode} passed`);
