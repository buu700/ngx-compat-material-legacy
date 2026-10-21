/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact form-field source,public control types and genuine tagged/minimum identities. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync, execFileSync} from 'node:child_process';
import {join, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {formFieldCallerSource, FORM_FIELD_CALLER_PRIOR} from '../scripts/form-field-caller-contracts.mjs';
import {prepareFormFieldCallerPublicSubjects, FORM_FIELD_CALLER_SUBJECTS} from '../scripts/form-field-caller-public-subjects.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = formFieldCallerSource({root}), loaded = prepareFormFieldCallerPublicSubjects(root);
assert.equal(source.sources.size, 81);
for (const [path, text] of source.sources) {
  const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', source.prior.source_parent + ':' + path],
    {cwd: root, maxBuffer: 4 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(original), hash(text), 'current form-field closure differs from its committed source');
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
  const p = join(model.root, 'public-form-field.ts');
  writeFileSync(p, "import * as peer from '@angular/material/form-field';\n" +
    (model.line === 'original' ? "import * as historical from '@angular/material/legacy-form-field';\n" : ''));
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
  const symbols = [], fields = [];
  for (const name of ['MAT_FORM_FIELD','MAT_ERROR','MAT_PREFIX','MAT_SUFFIX','MatError','MatFormField','MatPrefix','MatSuffix','MatFormFieldControl']) {
    let symbol=exports.get(name);assert.ok(symbol);if(symbol.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);
    const tags=symbol.getJsDocTags(checker).map(t=>t.name);assert.ok(tags.every(t=>!unstable.has(t)),'unstable form-field symbol '+name);
    symbols.push({name,tags,use:name.startsWith('MAT_')?'already-owned-legacy-token':'stable-public-control-or-type',declarations:symbol.getDeclarations().map(d=>hash(d.getText(d.getSourceFile())))});
    if(name==='MatFormFieldControl')for(const property of checker.getDeclaredTypeOfSymbol(symbol).getProperties()) {
      const tags=property.getJsDocTags(checker).map(t=>t.name);assert.ok(tags.every(t=>!unstable.has(t)));
      for(const d of property.getDeclarations())assert.ok(!d.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
      fields.push({owner:name,name:property.name,tags,optional:!!(property.flags&ts.SymbolFlags.Optional)});
    }
  }
  for(const name of ['disableAutomaticLabeling','describedByIds']) {
    const field=fields.find(f=>f.name===name);if(model.line==='original')assert.equal(field,undefined);else assert.ok(field&&field.optional,'current additive control field must remain optional');
  }
  const consumed = [];
  if (includeCurrent) for (const path of roots.slice(1)) {
    const sf = program.getSourceFile(path);
    function visit(n) {
      if (ts.isPropertyAccessExpression(n)) {
        const symbol = checker.getSymbolAtLocation(n.name), declarations = symbol?.getDeclarations()?.filter(d => d.getSourceFile().fileName.includes('/node_modules/@angular/material/') && d.getSourceFile().fileName.includes('form-field')) ?? [];
        if (declarations.length) {
          const tags = symbol.getJsDocTags(checker).map(t => t.name); assert.ok(tags.every(t => !unstable.has(t)), 'unstable consumed form-field member');
          for (const d of declarations) assert.ok(!d.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
          consumed.push({file: path.slice(model.root.length+1), expression: n.getText(sf), tags});
        }
      }
      ts.forEachChild(n,visit);
    }
    visit(sf);
  }
  const negative = join(model.root,'invalid-form-field.ts');
  writeFileSync(negative,"import {MatFormFieldControl} from '@angular/material/form-field';declare const control:MatFormFieldControl<string>;control.setDescribedByIds([23]);control.onContainerClick(23);const value:string=control.value;\n");
  const invalid=ts.getPreEmitDiagnostics(ts.createProgram([negative],{...options,noEmit:true}));
  assert.equal(invalid.length,3);assert.ok(invalid.every(d=>d.file?.fileName===negative&&[2322,2345].includes(d.code)));
  result.type_subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,Material:model.packages.get('@angular/material').version,
    strict:true,strictPropertyInitialization:false,skipLibCheck:false,diagnostics:0,current_source_files:includeCurrent?81:0,
    public_symbols:symbols,public_control_fields:fields,actual_consumed_members:consumed,invalid_type_controls:3});
  return {program, roots, options};
}
function emitCurrent(model, program, overrides = new Map()) {
  const emitted = program.emit(undefined, (filename,data,bom,error,files) => {
    if (!filename.endsWith('.js')) return; assert.equal(files.length,1);
    const path = files[0].fileName.slice(model.root.length+1); if (path === 'public-form-field.ts') return;
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
    writeFileSync(join(model.root,'form-field-worker.mjs'),read('tests/form_field_caller_subject.mjs'));
    const execute = mode => spawnSync(process.execPath,[join(model.root,'form-field-worker.mjs'),model.line,mode],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    for (const mode of ['development','production']) {
      const child=execute(mode);assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-7000));
      result.runtime_subjects.push({...JSON.parse(child.stdout.trim().split('\n').at(-1)),Core:model.packages.get('@angular/core').version,Material:model.packages.get('@angular/material').version,borrowed:model.borrowed});
    }
    if (includeCurrent) for (const [id,path,from,to,extraImport] of [
      ['lost-historical-polite-error','error.ts',"setAttribute('aria-live', 'polite')","setAttribute('aria-live', 'assertive')",''],
      ['modern-prefix-alias','owned-tokens.ts',"new InjectionToken<MatPrefix>('MatPrefix')",'MAT_PREFIX',"import {MAT_PREFIX} from '@angular/material/form-field';\n"],
      ['wrong-public-control-class','public-api.ts','MatFormFieldControl as MatLegacyFormFieldControl','MatFormField as MatLegacyFormFieldControl',''],
    ]) {
      const full='projects/ngx-material-legacy/legacy-form-field/'+path,original=source.sources.get(full),target=join(model.root,full);assert.ok(original.includes(from));
      try {
        writeFileSync(target,extraImport+original.replace(from,to));
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
  const caps=['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','compatibility/rc/cdk-module-type-public-subjects.json','compatibility/rc/overlay-caller-public-subjects.json','compatibility/rc/overlay-caller-contract-sdk.json',FORM_FIELD_CALLER_SUBJECTS];
  const paths=new Set([FORM_FIELD_CALLER_PRIOR,...caps,'compatibility/rc/api/export-name-allowlist.json','scripts/form-field-caller-contracts.mjs','scripts/form-field-caller-public-subjects.mjs',
    'scripts/material-public-subjects.mjs','scripts/cdk-module-type-public-subjects.mjs','scripts/overlay-caller-public-subjects.mjs','scripts/overlay-caller-contracts.mjs',
    'tests/form_field_caller_subject.mjs','tests/form_field_caller_public_probe.mjs',...source.sources.keys(),...source.metadata.map(m=>m.path),...source.prior.support.map(m=>m.path)]);
  for(const cap of caps){const body=JSON.parse(read(cap));for(const subject of body.subjects)for(const member of subject.members??subject.additions??[])paths.add(member.path);if(body.tagged_original_mixin)paths.add(body.tagged_original_mixin.path);}
  result.inputs=[...paths].sort().map(path=>({path,sha256:hash(read(path))}));
  result.scope='Eighteen individually bound form-field imports/reexports across eight unchanged selected sources and the81-file owned closure. Eleven current upstream bindings are already replaced by owned legacy tokens/classes;seven public control/type routes remain. Genuine untouched16 token aliases are explicitly distinguished from the intended current owned-token isolation,which uses four distinct objects. Three complete SDK declaration models and the selected current source program verify stable public symbols,all control fields and optional additive current fields. Four genuine development/production contexts execute public Injector identity,lookalike,optional,nearest,skipSelf,modern coexistence and historical prefix/suffix/error manual construction. Error node attributes are protocols. Current source bodies and SDK bytes are unchanged;ordinary semantic emit rewrites import resolution only. Form-field AOT factories,actual template/query/provider matching,full component behavior,geometry,motion,CSP,packed/browser/consumer/compiler/Node/RxJS/peer floors and G01-G13 remain separate. No current source is backcompiled to16. All resources,consumer maps and the finite alias allowlist remain unchanged.';
  assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:result.line,source_files:81,type_subjects:3,runtime_subjects:result.runtime_subjects.length,runtime_cases:result.runtime_subjects.reduce((n,r)=>n+r.cases.length,0),source_mutants:result.source_mutants.length}));
} finally {loaded.dispose();}
