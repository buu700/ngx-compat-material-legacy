/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite self-contained type aliases. Component behavior and other members stay separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,join,posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const capsulePath='compatibility/rc/public-literal-types-declaration-subjects.json';
const capsuleHash='1a419466a1bc51dd3f514fff74f3e57a13bf3649ec5c02aa1e66befb51f078c5';
export const PUBLIC_LITERAL_SELECTION=Object.freeze({
  '@angular/cdk/a11y':['AriaLivePoliteness'],
  '@angular/material/dialog':['DialogRole'],
  '@angular/material/menu':['MenuCloseReason'],
  '@angular/material/progress-bar':['ProgressBarMode'],
  '@angular/material/progress-spinner':['ProgressSpinnerMode'],
  '@angular/material/snack-bar':['MatSnackBarHorizontalPosition','MatSnackBarVerticalPosition'],
  '@angular/material/tabs':['ScrollDirection'],
  '@angular/material/tooltip':['TooltipPosition','TooltipTouchGestures','TooltipVisibility'],
});
const selected=(module,symbol)=>PUBLIC_LITERAL_SELECTION[module]?.includes(symbol);
const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'unstable public literal declaration/export');
const options={strict:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,types:[],lib:['lib.es2022.d.ts'],experimentalDecorators:true,emitDecoratorMetadata:false,removeComments:true};
const apply=(raw,edits)=>{for(const [start,end,replacement] of edits.sort((a,b)=>b[0]-a[0]))raw=raw.slice(0,start)+replacement+raw.slice(end);return raw;};

function publicAlias(files,path,name,chain=[]) {
  assert.ok(chain.length<8&&!chain.some(r=>r.path===path&&r.name===name),'cyclic public type route');
  const sf=files.get(path);assert.ok(sf,'uncaptured declaration route '+path);
  const direct=sf.statements.filter(n=>ts.isTypeAliasDeclaration(n)&&n.name.text===name&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
  if(direct.length){assert.equal(direct.length,1);stable(direct[0]);return {node:direct[0],source:sf,chain:[...chain,{path,name,kind:'direct-export'}]};}
  const exports=sf.statements.filter(ts.isExportDeclaration).filter(n=>n.exportClause&&ts.isNamedExports(n.exportClause))
    .flatMap(n=>n.exportClause.elements.filter(b=>b.name.text===name).map(binding=>({node:n,binding})));
  assert.equal(exports.length,1,'missing/ambiguous public literal export '+name);const route=exports[0];stable(route.node);stable(route.binding);
  const local=(route.binding.propertyName||route.binding.name).text;
  let specifier=route.node.moduleSpecifier?.text,targetName=local;
  if(!specifier) {
    const nodes=sf.statements.filter(n=>ts.isTypeAliasDeclaration(n)&&n.name.text===local);
    if(nodes.length){assert.equal(nodes.length,1);stable(nodes[0]);return {node:nodes[0],source:sf,chain:[...chain,{path,name,target_name:local,kind:'local-export'}]};}
    const imports=sf.statements.filter(ts.isImportDeclaration).filter(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n=>n.importClause.namedBindings.elements.filter(b=>b.name.text===local).map(binding=>({node:n,binding})));
    assert.equal(imports.length,1,'uncaptured public import-to-export route');stable(imports[0].node);stable(imports[0].binding);
    specifier=imports[0].node.moduleSpecifier.text;targetName=(imports[0].binding.propertyName||imports[0].binding.name).text;
  }
  assert.ok(specifier.startsWith('./')&&specifier.endsWith('.js'),'unexpected public type route');
  const target=posix.join(posix.dirname(path),specifier.replace(/\.js$/,'.d.ts'));
  return publicAlias(files,target,targetName,[...chain,{path,name,target,target_name:targetName,kind:'reexport'}]);
}

export function literalDomain(body) {
  const source=parse('literal.ts','type Alias='+body+';'),node=source.statements[0].type;
  assert.ok(ts.isUnionTypeNode(node),'nonunion public alias requires separate review');
  const values=node.types.map(t=>{
    if(ts.isLiteralTypeNode(t)&&ts.isStringLiteral(t.literal))return {kind:'string',value:t.literal.text};
    assert.equal(t.kind,ts.SyntaxKind.VoidKeyword,'non-self-contained literal alias');return {kind:'void'};
  });
  assert.equal(new Set(values.map(v=>JSON.stringify(v))).size,values.length);
  return values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** Rebuild complete public routes from immutable full declaration members. */
export function preparePublicLiteralTypes({root=rootDefault,readMember}={}) {
  const read=path=>readMember?readMember(path):readFileSync(join(root,path)),raw=read(capsulePath);assert.equal(hash(raw),capsuleHash,'literal capsule changed');
  const capsule=JSON.parse(raw),inputs=new Map([[capsulePath,{path:capsulePath,sha256:hash(raw)}]]),models=[];
  const load=ref=>{
    assert.ok(ref.path.startsWith('compatibility/rc/public-literal-types-sources/')&&!ref.path.split('/').includes('..'));
    const compressed=read(ref.path);assert.equal(hash(compressed),ref.gzip_sha256,'stored declaration changed');const bytes=gunzipSync(compressed);
    assert.equal(hash(bytes),ref.sha256,'declaration bytes changed');assert.equal(bytes.length,ref.bytes);inputs.set(ref.path,{path:ref.path,sha256:hash(compressed)});return bytes.toString();
  };
  assert.equal(capsule.packages.length,6);assert.equal(capsule.subjects.length,24);
  for(const line of ['original','main','21.x'])for(const [module,names] of Object.entries(PUBLIC_LITERAL_SELECTION)) {
    const rows=capsule.subjects.filter(s=>s.line===line&&s.module===module);assert.equal(rows.length,1);const subject=rows[0];
    assert.deepEqual(subject.symbols,names);const packages=capsule.packages.filter(p=>p.line===line&&p.package===subject.package);assert.equal(packages.length,1);
    const pkgSubject=packages[0];assert.equal(pkgSubject.archive_sri_verified,true);assert.equal(subject.version,pkgSubject.version);
    const pkg=JSON.parse(load(pkgSubject.manifest));load(pkgSubject.license);assert.equal(pkg.name,subject.package);assert.equal(pkg.version,subject.version);
    assert.equal(pkg.exports['./'+module.split('/').at(-1)].types,'./'+subject.entry.archive_member.replace(/^package\//,''));
    const files=new Map([subject.entry,subject.source].map(ref=>[ref.archive_member,parse(ref.archive_member,load(ref))]));
    const legacy=subject.original_legacy_entry?parse(subject.original_legacy_entry.archive_member,load(subject.original_legacy_entry)):null;
    for(const name of names) {
      const target=publicAlias(files,subject.entry.archive_member,name);assert.equal(target.node.name.text,name);assert.equal(target.node.typeParameters?.length||0,0);
      const body=target.node.type.getText(target.source),domain=literalDomain(body);
      const oldAliases=[];
      if(legacy)for(const statement of legacy.statements.filter(ts.isExportDeclaration)) {
        if(!statement.exportClause||!ts.isNamedExports(statement.exportClause))continue;
        for(const exported of statement.exportClause.elements) {
          const local=(exported.propertyName||exported.name).text;
          if(statement.moduleSpecifier?.text===module&&local===name)oldAliases.push(exported.name.text);
          if(!statement.moduleSpecifier)for(const imported of legacy.statements.filter(ts.isImportDeclaration)) {
            if(imported.moduleSpecifier.text!==module||!imported.importClause?.namedBindings||!ts.isNamedImports(imported.importClause.namedBindings))continue;
            if(imported.importClause.namedBindings.elements.some(b=>b.name.text===local&&(b.propertyName||b.name).text===name))oldAliases.push(exported.name.text);
          }
        }
      }
      models.push({line,module,symbol:name,version:subject.version,body,domain,public_chain:target.chain,
        declaration_path:target.source.fileName,declaration_sha256:hash(target.source.text),original_legacy_public_aliases:oldAliases});
    }
  }
  assert.equal(models.length,33);
  for(const model of models.filter(m=>m.line!=='original'))assert.deepEqual(model.domain,models.find(m=>m.line==='original'&&m.module===model.module&&m.symbol===model.symbol).domain,'public literal domain changed');
  return {models,inputs:[...inputs.values()],capsule_sha256:capsuleHash};
}

/** Complete aliases only; no other peer API or component is substituted/qualified. */
export function checkPublicLiteralDomains(models,root=rootDefault) {
  assert.equal(models.length,33);const code=['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;','type Assert<T extends true>=T;'];
  let positives=0,negatives=0,assignments=0,equalities=0;
  for(const model of models) {
    const index=models.indexOf(model),type='Subject'+index;literalDomain(model.body);code.push('type '+type+'='+model.body+';');
    const old=models.find(m=>m.line==='original'&&m.module===model.module&&m.symbol===model.symbol);assert.ok(old);
    assert.deepEqual(literalDomain(model.body),literalDomain(old.body),'public literal domain changed');
    for(const value of old.domain)code.push('const accepted'+positives+++':'+type+'='+(value.kind==='void'?'undefined':JSON.stringify(value.value))+';');
    for(const value of ["'invalid-literal-contract'",'null','42','true','[]',...(!old.domain.some(v=>v.kind==='void')?['undefined']:[])])
      code.push('// @ts-expect-error Outside the complete historical domain.\nconst rejected'+negatives+++':'+type+'='+value+';');
    if(model.line!=='original') {
      const original='Subject'+models.indexOf(old);code.push('declare const old'+index+':'+original+';const forward'+index+':'+type+'=old'+index+';',
        'declare const now'+index+':'+type+';const backward'+index+':'+original+'=now'+index+';','type exact'+index+'=Assert<Equal<'+original+','+type+'>>;');
      assignments+=2;equalities++;
    }
  }
  const path=join(root,'__public_literal_domains__.ts'),host=ts.createCompilerHost({...options,noEmit:true}),originalRead=host.readFile.bind(host);
  host.readFile=p=>p===path?code.join('\n'):originalRead(p);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([path],{...options,noEmit:true},host));
  assert.equal(diagnostics.length,0,'strict public literal domain/equality failed: '+ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
  return {positives,negatives,assignments,equalities,strict:true,skip_lib_check:false,fixture_sha256:hash(code.join('\n'))};
}

function reexportProof(root,filePath,raw,stripped,line,model,targets) {
  const sourcePath=join(root,filePath),consumer=join(root,'__literal_surface_consumer__.ts'),virtual=new Map(),bindings=[];
  const fixture=['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;','type Assert<T extends true>=T;'];
  const modules=[...new Set(targets.map(t=>t.module))];
  for(const module of modules) {
    const path=join(root,'__literal_peer_'+modules.indexOf(module)+'.d.ts');
    virtual.set(path,model.models.filter(m=>m.line===line&&m.module===module).map(m=>'export type '+m.symbol+'='+m.body+';').join('\n'));bindings.push([module,path]);
  }
  for(const [index,target] of targets.entries()) {
    const original=model.models.find(m=>m.line==='original'&&m.module===target.module&&m.symbol===target.symbol);assert.ok(original);
    assert.ok(original.original_legacy_public_aliases.includes(target.public_alias),'changed/missing historical public alias');
    fixture.push('import type {'+target.public_alias+' as Alias'+index+"} from './surface';",'type Expected'+index+'='+original.body+';','type exact'+index+'=Assert<Equal<Alias'+index+',Expected'+index+'>>;');
    for(const [valueIndex,value] of original.domain.entries())fixture.push('const accepted'+index+'_'+valueIndex+':Alias'+index+'='+(value.kind==='void'?'undefined':JSON.stringify(value.value))+';');
    fixture.push("// @ts-expect-error Outside historical domain.\nconst rejected"+index+":Alias"+index+"='invalid-literal-contract';");
  }
  virtual.set(consumer,fixture.join('\n'));
  function run(text,checkConsumer) {
    virtual.set(sourcePath,text);const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);
    host.getSourceFile=(path,language,...args)=>virtual.has(path)?parse(path,virtual.get(path)):get(path,language,...args);
    host.resolveModuleNames=(names,from)=>names.map(name=>{
      const path=name==='./surface'&&from===consumer?sourcePath:bindings.find(([module])=>module===name)?.[1];
      return path?{resolvedFileName:path,extension:path===sourcePath?ts.Extension.Ts:ts.Extension.Dts,isExternalLibraryImport:path!==sourcePath}:undefined;
    });
    const program=ts.createProgram([sourcePath,...bindings.map(([,path])=>path),...(checkConsumer?[consumer]:[])],options,host),checker=program.getTypeChecker(),file=program.getSourceFile(sourcePath),resolved=[];
    for(const node of file.statements.filter(ts.isExportDeclaration)) {
      if(!node.moduleSpecifier||!node.exportClause||!ts.isNamedExports(node.exportClause))continue;
      for(const binding of node.exportClause.elements) {
        const name=(binding.propertyName||binding.name).text;if(!selected(node.moduleSpecifier.text,name))continue;
        const alias=checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name));
        assert.ok(alias.flags&ts.SymbolFlags.TypeAlias);assert.equal(alias.flags&ts.SymbolFlags.Value,0);assert.equal(alias.name,name);
        resolved.push({module:node.moduleSpecifier.text,symbol:name,public_alias:binding.name.text});
      }
    }
    if(checkConsumer){assert.deepEqual(resolved,targets);assert.equal(program.getSemanticDiagnostics(program.getSourceFile(consumer)).length,0,'selected public consumer failed');}
    let output;const result=program.emit(file,(path,text)=>{if(path.endsWith('.js'))output=text;});assert.equal(result.emitSkipped,false);assert.equal(typeof output,'string');
    return {output,unqualified_surface_diagnostics:program.getSemanticDiagnostics(file).length};
  }
  const before=run(raw,true),after=run(stripped,false);assert.equal(before.output,after.output,'type-only public exports change executable emit');
  return {targets,strict_selected_consumer_equalities:targets.length,emit_sha256:hash(before.output),emit_without_selected_reexports_sha256:hash(after.output),
    unqualified_surface_diagnostics:before.unqualified_surface_diagnostics,other_members_or_complete_barrel_qualified:false};
}

/** Per-file core for bounded controller negatives; never a whole-population admission. */
export function inspectPublicLiteralSource({root=rootDefault,filePath,uses,prepared,line,readSource}) {
  assert.ok(filePath.startsWith('projects/ngx-material-legacy/')&&!filePath.split('/').includes('..'));
  const read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8'),cases=[],files=[];
    const raw=read(filePath),sf=parse(filePath,raw),edits=[],importCases=[],exportCases=[];
    const sourcePath=join(root,filePath),host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);
    host.getSourceFile=(path,language,...args)=>path===sourcePath?parse(path,raw):get(path,language,...args);
    const program=ts.createProgram([sourcePath],{...options,noResolve:true},host),source=program.getSourceFile(sourcePath),checker=program.getTypeChecker();
    for(const node of source.statements.filter(n=>ts.isImportDeclaration(n)||ts.isExportDeclaration(n))) {
      if(!node.moduleSpecifier||!PUBLIC_LITERAL_SELECTION[node.moduleSpecifier.text])continue;
      const module=node.moduleSpecifier.text,clause=ts.isImportDeclaration(node)?node.importClause?.namedBindings:node.exportClause;
      if(!clause||!(ts.isNamedImports(clause)||ts.isNamedExports(clause)))continue;
      const chosen=clause.elements.filter(b=>selected(module,(b.propertyName||b.name).text));if(!chosen.length)continue;
      for(const binding of chosen) {
        const name=(binding.propertyName||binding.name).text,matching=uses.filter(r=>r.file===filePath.replace(/^projects\/ngx-material-legacy\//,'')&&r.module===module&&r.symbol===name);assert.equal(matching.length,1,'unexpected/ambiguous literal use');
        if(ts.isImportDeclaration(node)) {
          const symbol=checker.getSymbolAtLocation(binding.name);assert.deepEqual(symbol?.declarations,[binding]);const references=[];
          function visit(n){if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===symbol){assert.ok(ts.isTypeReferenceNode(n.parent)&&n.parent.typeName===n,'runtime/unsupported literal reference');assert.equal(n.parent.typeArguments?.length||0,0);references.push(source.getLineAndCharacterOfPosition(n.getStart(source)).line+1);}ts.forEachChild(n,visit);}
          visit(source);assert.ok(references.length||key(matching[0])===JSON.stringify(['legacy-tooltip/internal/tooltip-base.ts','@angular/material/tooltip','TooltipVisibility']),'unexpected unused literal binding');importCases.push({...matching[0],local_name:binding.name.text,references,unused_binding:references.length===0});
        } else exportCases.push({...matching[0],public_alias:binding.name.text});
      }
      const kept=clause.elements.filter(b=>!chosen.includes(b));
      if(!kept.length&&(!ts.isImportDeclaration(node)||!node.importClause.name))edits.push([node.getStart(source),node.end,'']);
      else edits.push([clause.getStart(source),clause.end,'{'+kept.map(b=>b.getText(source)).join(', ')+(clause.elements.hasTrailingComma?',':'')+'}']);
    }
    const stripped=apply(raw,edits),emit=text=>ts.transpileModule(text,{compilerOptions:options}).outputText;
    let proof;
    if(exportCases.length)proof=reexportProof(root,filePath,raw,stripped,line,prepared,exportCases.map(({module,symbol,public_alias})=>({module,symbol,public_alias})));
    else {const before=emit(raw),after=emit(stripped);assert.equal(before,after,'type-only imports change executable emit');proof={emit_sha256:hash(before),emit_without_selected_imports_sha256:hash(after),other_members_or_complete_component_qualified:false};}
    files.push({file:filePath,candidate_source_sha256:hash(raw),...proof});
    for(const use of [...importCases,...exportCases])cases.push({...use,candidate_source_sha256:hash(raw),type_only_erasure:true});
  assert.equal(files.length,1);return {cases,file:files[0]};
}

export function reviewPublicLiteralUses({root=rootDefault,readSource,readMember,model}={}) {
  const read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8');
  const prepared=model||preparePublicLiteralTypes({root,readMember});
  // A supplied prepared model is still reconstructed from every authenticated input.
  const authentic=preparePublicLiteralTypes({root,readMember});assert.deepEqual(prepared,authentic,'changed prepared literal model');
  const domains=checkPublicLiteralDomains(prepared.models,root),manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
  for(const packageName of ['@angular/cdk','@angular/material'])assert.equal(manifest.peerDependencies[packageName],'^'+prepared.models.find(m=>m.line===line&&m.module.startsWith(packageName+'/')).version);
  const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen=JSON.parse(seed).symbol_uses.filter(r=>selected(r.module,r.symbol));assert.equal(frozen.length,10);
  const frozenKeys=new Set(JSON.parse(seed).symbol_uses.map(key)),current=scanCurrentAuthoredUses({root});
  const additions=current.symbol_uses.filter(r=>selected(r.module,r.symbol)&&!frozenKeys.has(key(r)));assert.equal(additions.length,11);
  const uses=[...frozen.map(r=>({...r,population:'frozen'})),...additions.map(r=>({...r,population:'current'}))],cases=[],files=[];
  for(const filePath of [...new Set(uses.map(r=>'projects/ngx-material-legacy/'+r.file))]) {
    const inspected=inspectPublicLiteralSource({root,filePath,uses,prepared,line,readSource});cases.push(...inspected.cases);files.push(inspected.file);
  }
  assert.equal(cases.length,21);assert.deepEqual(cases.map(key).sort(),uses.map(key).sort());
  return {schema_version:1,line,node:process.version,typescript:ts.version,capsule_sha256:prepared.capsule_sha256,models:prepared.models,inputs:prepared.inputs,domains,cases,files,
    source_override_used:!!readSource,member_override_used:!!readMember,limits:'Only eleven self-contained public literal aliases, ten frozen uses and eleven current additions. Complete original/minimum declarations and public routes; strict complete-alias domains and selected consumer reexports; executable erasure with metadata disabled. Partial peer fixtures model no other declarations. Unknown full component/barrel diagnostics, Angular factory metadata, runtime behavior, accessibility, native/packed and compiler/runtime floors are not qualified.',g11_claim:'not-passed'};
}
