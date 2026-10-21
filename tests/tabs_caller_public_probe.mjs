/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact current tab source,public declarations and genuine tagged/minimum constructors. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync, execFileSync} from 'node:child_process';
import {join, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tabsCallerSource, TABS_CALLER_PRIOR} from '../scripts/tabs-caller-contracts.mjs';
import {prepareTabsCallerPublicSubjects, TABS_CALLER_SUBJECTS} from '../scripts/tabs-caller-public-subjects.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = tabsCallerSource({root}), loaded = prepareTabsCallerPublicSubjects(root);
assert.equal(source.sources.size, 69);
for (const [path, text] of source.sources) {
  const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', source.prior.source_parent + ':' + path],
    {cwd: root, maxBuffer: 4 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(original), hash(text), 'current tabs closure differs from its committed source');
}
const result = {schema_version: 1, line: source.prior.line, node: process.version, typescript: ts.version,
  source_files: [...source.sources].map(([path,text]) => ({path, sha256: hash(text)})),
  facts: source.facts.map(f => ({file: f.file, symbol: f.symbol, candidate_source_sha256: f.candidate_source_sha256,
    removed_upstream_use: f.removed_upstream_use, unused_import: f.unused_import, reexport: !!f.reexport})),
  type_subjects: [], runtime_subjects: [], source_mutants: [], inputs: [], canonical_closures: 0,
  current_source_HTML_CSS_SCSS_changes: 0, source_body_or_SDK_rewrites: false,
  emitted_import_resolution_only: true, original_current_source_backcompile_attempted: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
const unstable = new Set(['deprecated','docs-private','experimental','developerPreview','breaking-change']);
function typeProgram(model, includeCurrent) {
  const p = join(model.root, 'public-tabs.ts');
  writeFileSync(p, "import * as peer from '@angular/material/tabs';\n" +
    (model.line === 'original' ? "import * as historical from '@angular/material/legacy-tabs';\n" : 'new peer.MatTabLabel();new peer.MatTabContent();\n'));
  const roots = [p];
  if (includeCurrent) for (const [path, text] of source.sources) {
    const target = join(model.root, path); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, text); roots.push(target);
  }
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true, strict: true, strictPropertyInitialization: false, noImplicitOverride: true,
    skipLibCheck: false, types: [], noEmit: !includeCurrent, rootDir: model.root, outDir: model.root,
    paths: Object.fromEntries([...source.routes].map(([spec,path]) => [spec,[join(model.root,path)]]))};
  const program = ts.createProgram(roots, options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const checker = program.getTypeChecker(), sf = program.getSourceFile(p);
  const namespace = checker.getSymbolAtLocation(sf.statements[0].moduleSpecifier);
  const exports = new Map(checker.getExportsOfModule(namespace).map(s => [s.name,s]));
  const symbols = [], fields = [], parents = [];
  for (const name of ['MAT_TAB','MAT_TAB_CONTENT','MAT_TAB_LABEL','MAT_TABS_CONFIG','MatTabContent','MatTabLabel','MatTabsConfig']) {
    let symbol = exports.get(name); assert.ok(symbol); if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const tags = symbol.getJsDocTags(checker).map(t => t.name);
    if (name === 'MAT_TAB') assert.ok(tags.includes('docs-private'));
    else assert.ok(tags.every(t => !unstable.has(t)), 'unstable tab export ' + name);
    const declarations = symbol.getDeclarations();
    symbols.push({name, tags, use: name === 'MAT_TAB' ? 'removed-current-use' : 'stable-public',
      declarations: declarations.map(d => hash(d.getText(d.getSourceFile())))});
    if (name === 'MatTabLabel' || name === 'MatTabContent') {
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      for (const propertyName of name === 'MatTabLabel' ? ['_closestTab','templateRef','viewContainerRef'] : ['template']) {
        const property = type.getProperty(propertyName); assert.ok(property);
        const tags = property.getJsDocTags(checker).map(t => t.name); assert.ok(tags.every(t => !unstable.has(t)));
        for (const d of property.getDeclarations()) assert.ok(!d.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
        fields.push({owner: name, name: propertyName, tags});
      }
    }
    if (name === 'MatTabsConfig') {
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      for (const propertyName of ['animationDuration','disablePagination','dynamicHeight','contentTabIndex','preserveContent']) {
        const property = type.getProperty(propertyName); assert.ok(property);
        const tags = property.getJsDocTags(checker).map(t => t.name); assert.ok(tags.every(t => !unstable.has(t)));
        fields.push({owner: name, name: propertyName, tags});
      }
    }
  }
  if (model.line !== 'original') for (const n of sf.statements) if (ts.isExpressionStatement(n) && ts.isNewExpression(n.expression)) {
    const signature = checker.getResolvedSignature(n.expression); assert.ok(signature);
    const parameters=signature.getParameters().map(p=>{
      const declaration=p.getDeclarations()?.[0];assert.ok(declaration&&ts.isParameter(declaration));
      return {name:p.name,rest:!!declaration.dotDotDotToken,optional:!!(declaration.questionToken||declaration.initializer),type:checker.typeToString(checker.getTypeOfSymbolAtLocation(p,declaration))};
    });
    assert.ok(parameters.every(p=>p.rest||p.optional),'public parent requires arguments');
    assert.ok(signature.getJsDocTags().every(t => !unstable.has(t.name)));
    parents.push({expression: n.expression.getText(sf), argument_count: 0, required_parameters: 0, parameters});
  }
  const consumed = [];
  if (includeCurrent) for (const path of roots.slice(1)) {
    const sf = program.getSourceFile(path);
    function visit(n) {
      if (ts.isPropertyAccessExpression(n)) {
        const symbol = checker.getSymbolAtLocation(n.name), declarations = symbol?.getDeclarations()?.filter(d => d.getSourceFile().fileName.includes('/node_modules/@angular/material/') && /tabs/.test(d.getSourceFile().fileName)) ?? [];
        if (declarations.length) {
          const tags = symbol.getJsDocTags(checker).map(t => t.name); assert.ok(tags.every(t => !unstable.has(t)), 'unstable consumed tab member');
          for (const d of declarations) assert.ok(!d.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
          consumed.push({file: path.slice(model.root.length+1), expression: n.getText(sf), tags});
        }
      }
      ts.forEachChild(n,visit);
    }
    visit(sf);
  }
  const negative = join(model.root,'invalid-tabs.ts');
  writeFileSync(negative, "import {MatTabsConfig,MatTabContent} from '@angular/material/tabs';\nconst config:MatTabsConfig={animationDuration:23,contentTabIndex:'bad'};declare const content:MatTabContent;content.template=23;\n");
  const invalid = ts.getPreEmitDiagnostics(ts.createProgram([negative], {...options,noEmit:true}));
  assert.equal(invalid.length,3); assert.ok(invalid.every(d => d.file?.fileName === negative && d.code === 2322));
  result.type_subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,Material:model.packages.get('@angular/material').version,
    strict:true,strictPropertyInitialization:false,skipLibCheck:false,diagnostics:0,current_source_files:includeCurrent?69:0,
    public_symbols:symbols,public_consumed_fields:fields,zero_argument_parents:parents,actual_consumed_members:consumed,invalid_type_controls:3});
  return {program, roots, options};
}
function emitCurrent(model, program, overrides = new Map()) {
  const emitted = program.emit(undefined, (filename,data,bom,error,files) => {
    if (!filename.endsWith('.js')) return; assert.equal(files.length,1);
    const path = files[0].fileName.slice(model.root.length+1); if (path === 'public-tabs.ts') return;
    const target = join(model.root,path.replace(/\.ts$/,'.mjs')); mkdirSync(dirname(target),{recursive:true});
    const output = data.replace(/(from\s+['"])([^'"]+)(['"])/g, (_,before,spec,after) => {
      if (!spec.startsWith('.') && !spec.startsWith('@ngx-compat/material-legacy/')) return before+spec+after;
      const edge = source.edges.find(e=>e.from===path&&e.specifier===spec); assert.ok(edge,'unmapped emitted source import');
      return before+pathToFileURL(join(model.root,edge.to.replace(/\.ts$/,'.mjs'))).href+after;
    });
    writeFileSync(target,output);
  });
  assert.equal(emitted.emitSkipped,false);
}
try {
  for (const model of loaded.models) {
    const includeCurrent = model.line === source.prior.line;
    const compiled = typeProgram(model,includeCurrent);
    if (model.line !== 'original' && !includeCurrent) continue;
    if (includeCurrent) emitCurrent(model,compiled.program);
    writeFileSync(join(model.root,'tabs-worker.mjs'),read('tests/tabs_caller_subject.mjs'));
    const execute = mode => spawnSync(process.execPath,[join(model.root,'tabs-worker.mjs'),model.line,mode],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    for (const mode of ['development','production']) {
      const child=execute(mode);assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-7000));
      result.runtime_subjects.push({...JSON.parse(child.stdout.trim().split('\n').at(-1)),Core:model.packages.get('@angular/core').version,Material:model.packages.get('@angular/material').version,borrowed:model.borrowed});
    }
    if (includeCurrent) for (const [id,path,from,to] of [
      ['lost-nearest-tab','tab-label.ts','label._closestTab = closestTab;','label._closestTab = null;'],
      ['required-nearest-token','tab-label.ts','@Optional() @Inject(MAT_TAB)','@Inject(MAT_TAB)'],
      ['lost-content-template','tab-content.ts','{provide: TemplateRef, useValue: template}','{provide: TemplateRef, useValue: null}'],
      ['lost-configured-duration','internal/tab-group-base.ts',"defaultConfig && defaultConfig.animationDuration ? defaultConfig.animationDuration : '500ms'","'500ms'"],
    ]) {
      const full='projects/ngx-material-legacy/legacy-tabs/'+path,original=source.sources.get(full),target=join(model.root,full);assert.ok(original.includes(from));
      try {
        writeFileSync(target,original.replace(from,to));
        const program=ts.createProgram(compiled.roots,compiled.options);assert.equal(ts.getPreEmitDiagnostics(program).length,0,'source mutant must remain type-correct');emitCurrent(model,program);
        const child=execute('development');assert.equal(child.signal,null);
        let rejection;
        if(child.status===0) {
          const current=JSON.parse(child.stdout.trim().split('\n').at(-1));
          const reference=result.runtime_subjects.find(r=>r.line==='original'&&r.mode==='development').observations;
          assert.notDeepEqual(current.observations,reference,id+' escaped');rejection='untouched-reference-observation-mismatch';
        } else {
          assert.match(child.stderr,/AssertionError|NullInjectorError|NG0201/);rejection='constructor-or-identity-assertion';
        }
        result.source_mutants.push({line:model.line,id,rejected:true,rejection});
      } finally {writeFileSync(target,original);emitCurrent(model,compiled.program);}
    }
  }
  const reference=result.runtime_subjects.find(r=>r.line==='original'&&r.mode==='development').observations;
  for(const current of result.runtime_subjects)assert.deepEqual(current.observations,reference,'constructor/config observations differ from untouched tag');
  const caps=['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','compatibility/rc/cdk-module-type-public-subjects.json','compatibility/rc/overlay-caller-public-subjects.json','compatibility/rc/overlay-caller-contract-sdk.json',TABS_CALLER_SUBJECTS];
  const paths=new Set([TABS_CALLER_PRIOR,...caps,'compatibility/rc/api/export-name-allowlist.json','scripts/tabs-caller-contracts.mjs','scripts/tabs-caller-public-subjects.mjs',
    'scripts/material-public-subjects.mjs','scripts/cdk-module-type-public-subjects.mjs','scripts/overlay-caller-public-subjects.mjs','scripts/overlay-caller-contracts.mjs',
    'tests/tabs_caller_subject.mjs','tests/tabs_caller_public_probe.mjs',...source.sources.keys(),...source.metadata.map(m=>m.path),...source.prior.support.map(m=>m.path)]);
  for(const cap of caps){const body=JSON.parse(read(cap));for(const subject of body.subjects)for(const member of subject.members??subject.additions??[])paths.add(member.path);if(body.tagged_original_mixin)paths.add(body.tagged_original_mixin.path);}
  result.inputs=[...paths].sort().map(path=>({path,sha256:hash(read(path))}));
  result.scope='Twenty-one named tab imports/reexports. One current private import is already replaced by the owned legacy token;four imports are unused. Genuine original16 and exact selected minimum class/token/configuration observations agree. Only the selected minimum compiles/emits the69-file current source closure;three SDK declaration subjects verify stable public surfaces and zero-argument current parents. Owned label public injector factory and manual label/content/group constructors execute with disclosed template/container/node/CDR protocols. Ordinary TypeScript semantic emit preserves bodies and rewrites only import resolution to actual captured entry files. No current source is backcompiled to16. Content/group packed/AOT factories,whole legacy module/query/provider matching,native tab geometry/motion/CSP,consumer/compiler/Node/RxJS/peer floors and G01-G13 remain separate. The existing alias allowlist and all product resources are unchanged.';
  assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:result.line,source_files:69,type_subjects:3,runtime_subjects:result.runtime_subjects.length,runtime_cases:result.runtime_subjects.reduce((n,r)=>n+r.cases.length,0),source_mutants:result.source_mutants.length}));
} finally {loaded.dispose();}
