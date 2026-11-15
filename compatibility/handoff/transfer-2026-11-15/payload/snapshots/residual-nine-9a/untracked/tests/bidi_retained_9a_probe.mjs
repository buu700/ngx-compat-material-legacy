/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewBidiModuleUses} from '../scripts/bidi-module-use-review.mjs';
import {authoredUseReviewEvidencePhysical} from '../scripts/authored-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const retained=['legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts'];const prefix='projects/ngx-material-legacy/';
const gitSource=p=>execFileSync('git',['--no-replace-objects','show','0c25c56282d805aaed351b94a9729303462bfb2a:'+p],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:16*1024*1024}).toString();
const seed=JSON.parse(readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'))),uses=seed.symbol_uses.filter(x=>x.module==='@angular/cdk/bidi'&&x.symbol==='BidiModule');assert.equal(uses.length,25);
const legacyPaths=new Set(uses.filter(x=>!retained.includes(x.file)).map(x=>prefix+x.file));assert.equal(legacyPaths.size,23);const sourceRead=p=>legacyPaths.has(p)?gitSource(p):readFileSync(join(root,p),'utf8');
const review=reviewBidiModuleUses({root,readSource:sourceRead});assert.equal(review.cases.length,25);assert.equal(review.cases.filter(x=>retained.includes(x.file)).length,2);
// The physical owner validates all 23 absent paths and its entire pinned current graph; their rows must be admitted.
const physical=authoredUseReviewEvidencePhysical(),absent=new Set(physical.review_evidence.insufficient_uses.filter(x=>x.module==='@angular/cdk/bidi'&&x.symbol==='BidiModule').map(x=>x.file));for(const u of uses.filter(x=>!retained.includes(x.file)))assert.ok(!absent.has(u.file),'physical retirement proof unavailable');
const sourcePath=prefix+retained[0],source=sourceRead(sourcePath),sourceNegatives=[source.replace("from '@angular/cdk/bidi'","from '@angular/cdk/private'"),source.replace('import {BidiModule}','import type {BidiModule}'),source.replace('exports: [BidiModule]','exports: []'),source.replace('imports: [BidiModule, A11yModule]','imports: [A11yModule]'),source+'\nconst unexpected = BidiModule;\n',source+'\nfunction shadow(BidiModule: any) {return BidiModule;}\n'];
for(const bad of sourceNegatives){assert.notEqual(bad,source);assert.throws(()=>reviewBidiModuleUses({root,readSource:p=>p===sourcePath?bad:sourceRead(p)}))}
const loaded = prepareMaterialPublicSubjects(root), results = [], declarations = [], mutations = [];
const worker = readFileSync(join(root,'tests/bidi_module_public_subject.mjs'),'utf8');
try {
  for (const model of loaded.models) {
    const pkg = model.packages.get('@angular/cdk');
    const entry = pkg.exports['./bidi'];
    assert.equal(typeof entry.types,'string');
    const entryKey = '@angular/cdk/' + entry.types.slice(2);
    const entryText = model.sources.get(entryKey);
    assert.equal(typeof entryText,'string');
    const entryAst = ts.createSourceFile(entryKey,entryText,ts.ScriptTarget.Latest,true);
    const links = entryAst.statements.filter(ts.isExportDeclaration).filter(n=>n.exportClause&&ts.isNamedExports(n.exportClause))
      .flatMap(n=>n.exportClause.elements.filter(e=>e.name.text==='BidiModule').map(e=>({node:n,binding:e})));
    let targetKey = entryKey;
    if (model.line !== 'original') {
      assert.equal(links.length,1);
      assert.equal((links[0].binding.propertyName||links[0].binding.name).text,'BidiModule');
      assert.equal(links[0].node.moduleSpecifier.text,'./_bidi-module-chunk.js');
      targetKey = '@angular/cdk/types/_bidi-module-chunk.d.ts';
    }
    const targetText = model.sources.get(targetKey);
    const targetAst = ts.createSourceFile(targetKey,targetText,ts.ScriptTarget.Latest,true);
    const cls = targetAst.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='BidiModule');
    assert.equal(cls.length,1);
    assert.ok(!ts.getJSDocTags(cls[0]).some(tag=>['deprecated','docs-private','experimental'].includes(tag.tagName.text)));
    assert.equal(cls[0].members.filter(n=>!(n.modifiers||[]).some(m=>m.kind===ts.SyntaxKind.StaticKeyword)).length,0);
    if (model.line==='original') assert.ok(cls[0].modifiers.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
    else assert.equal(targetAst.statements.filter(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))
      .flatMap(n=>n.exportClause.elements.filter(e=>e.name.text==='BidiModule'&&(e.propertyName||e.name).text==='BidiModule')).length,1);
    declarations.push({line:model.line,version:pkg.version,entry:{path:entryKey,sha256:hash(entryText)},target:{path:targetKey,sha256:hash(targetText)},declaration:cls[0].getText(targetAst)});
    const workerPath = join(model.root,'bidi-module-public-subject.mjs');
    writeFileSync(workerPath,worker);
    for (const production of [false,true]) {
      const stdout = execFileSync(process.execPath,[workerPath,model.line,String(production)],{cwd:model.root,encoding:'utf8',timeout:10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)),borrowed:model.borrowed});
    }
    const runtimeKey = '@angular/cdk/fesm2022/bidi.mjs';
    const original = model.sources.get(runtimeKey), runtimePath = join(model.root,'node_modules',runtimeKey);
    const replaceAll = (a,b,count) => {assert.equal(original.split(a).length,count+1,a); return original.replaceAll(a,b);};
    const mutated = {
      export:replaceAll('exports: [Dir]', 'exports: []',2),
      provider:replaceAll('useExisting: Dir','useExisting: Directionality',2),
      host:replaceAll("'[attr.dir]': '_rawDir'", "'[attr.dir]': 'value'",1),
      premature:replaceAll('&& this._isInitialized','&& true',1),
      completion:replaceAll('this.change.complete();','this.change.emit("ltr");',model.line==='original'?2:1),
    };
    if(model.line!=='original')mutated.rawDefault=replaceAll("_rawDir = '';","_rawDir = 'rtl';",1);
    for (const [id,text] of Object.entries(mutated)) {
      writeFileSync(runtimePath,text);
      const result = spawnSync(process.execPath,[workerPath,model.line,'false'],{cwd:model.root,encoding:'utf8',timeout:10000});
      assert.notEqual(result.status,0,id+' escaped');
      assert.match(result.stderr,/AssertionError/,id+' failed without reaching assertion');
      mutations.push({line:model.line,id,assertion_rejected:true});
    }
    writeFileSync(runtimePath,original);
  }
  const report = {schema_version:1,role:'Finite public BidiModule reexport and actual Dir behavior diagnostic',
    line:review.line,node:process.version,compiler:ts.version,source_review:review,source_negative_controls:sourceNegatives.length,
    public_namespace_capsule_sha256:loaded.capsule_hash,declarations,results,mutations,
    producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),
    scope:'Two current retained Bidi module imports plus 23 separately physical-owner verified retirements. Whole SRI-authenticated original16/current22/current21 public modules and Angular compiler/Core, with genuine Injector and EventEmitter/signal. Scope limited to 25 historical BidiModule uses and the explicitly identified current module graph; compiler metadata introspection is diagnostic-only. No native DOM/AOT/packed, full runtime floors, component Directionality callers, complete MatCommonModule parity, security or G11 qualification.',
    g11_claim:'not-passed'};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({uses:review.cases.length,subjects:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),source_negative_controls:sourceNegatives.length,retained:2,owner_verified_retirements:23,runtime_mutation_rejections:mutations.length,native_or_packed_qualified:false}));
} finally {loaded.dispose();}
