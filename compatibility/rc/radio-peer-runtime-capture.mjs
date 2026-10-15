import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,posix} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {prepareRadioDispatcherSubjects} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/radio-dispatcher-use-review.mjs';
const root='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy',require=createRequire('/home/parallels/ngx-compat-material-legacy/package.json'),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),loaded=prepareRadioDispatcherSubjects(root),subjects=[];
try{for(const model of loaded.models){
 const base='/tmp/closeout-configurable-sort-tree-20261015-m02wodg4',archives=model.line==='original'?base+'/reference16/archives':base+'/peer-sources/'+model.line+'/archives',packages=[];
 for(const name of ['@angular/material','@angular/cdk']){const record=model.subject.packages.find(p=>p.name===name);assert.equal(hash(readFileSync(join(archives,name.replace('/','__')+'.tgz'))),record.archive_sha256);packages.push(record);}
 const all=JSON.parse(execFileSync('python3',['-c',`import tarfile,json\nfrom pathlib import Path\nbase=Path(${JSON.stringify(archives)})\nout={}\nfor pkg in ['@angular/material','@angular/cdk']:\n with tarfile.open(base/(pkg.replace('/','__')+'.tgz')) as tar:\n  for m in tar:\n   if m.isfile() and (m.name.startswith('package/fesm2022/') and m.name.endswith('.mjs') or m.name=='package/package.json'):\n    out[pkg+'/'+m.name.removeprefix('package/')]=tar.extractfile(m).read().decode()\nprint(json.dumps(out))`],{encoding:'utf8',maxBuffer:64*1024*1024}));
 for(const record of packages)assert.equal(all[record.name+'/package.json'],model.sources.get(record.name+'/package.json'));
 const members=new Map(),edges=[],external=new Set();
 const route=spec=>{const parts=spec.split('/'),pkg=parts.slice(0,2).join('/'),rest=parts.slice(2).join('/'),manifest=model.packages.get(pkg);assert.ok(manifest,'missing package '+spec);const value=manifest.exports[rest?'./'+rest:'.'];assert.ok(value,'missing public export '+spec);const pick=v=>typeof v==='string'?v:['import','default'].map(k=>v?.[k]).filter(Boolean).map(pick).find(Boolean);return pkg+'/'+pick(value).replace(/^\.\//,'');};
 function visit(key){if(members.has(key))return;const raw=all[key]??model.sources.get(key);assert.equal(typeof raw,'string','missing closure '+key);const sf=ts.createSourceFile(key,raw,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);members.set(key,{key,sha256:hash(raw),bytes:Buffer.byteLength(raw)});
  if(all[key]!==undefined){const stored=gzipSync(Buffer.from(raw)),path='compatibility/rc/radio-peer-runtime-source-members/'+hash(raw)+'.gz';mkdirSync(join(root,'compatibility/rc/radio-peer-runtime-source-members'),{recursive:true});writeFileSync(join(root,path),stored);Object.assign(members.get(key),{path,stored_sha256:hash(stored)});}
  for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const spec=node.moduleSpecifier.text;
   if(!spec.startsWith('.')&&!spec.startsWith('@angular/')){assert.ok(['rxjs','rxjs/operators','tslib'].includes(spec));external.add(spec);continue;}
   const next=spec.startsWith('.')?posix.normalize(posix.join(posix.dirname(key),spec)):route(spec);edges.push({from:key,specifier:spec,to:next});visit(next);}
 }
 const roots=['@angular/material/radio',...(model.line==='original'?['@angular/material/legacy-radio']:[])];for(const spec of roots)visit(route(spec));
 subjects.push({line:model.line,packages,roots,members:[...members.values()].sort((a,b)=>a.key.localeCompare(b.key)),edges,external:[...external].sort()});
}}
finally{loaded.dispose();}
const capsule={schema_version:1,scope:'Exact complete static runtime public radio namespaces; existing canonical framework members reused. No installed package or lifecycle script.',material_capsule_sha256:'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3',subjects};
const bytes=JSON.stringify(capsule,null,2)+'\n';writeFileSync(join(root,'compatibility/rc/radio-peer-runtime-subjects.json'),bytes);console.log(JSON.stringify({sha256:hash(bytes),subjects:subjects.map(s=>({line:s.line,members:s.members.length,captured:s.members.filter(m=>m.path).length,raw_bytes:s.members.filter(m=>m.path).reduce((a,m)=>a+m.bytes,0)}))}));
