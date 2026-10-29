/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current lexical caller continuity and two new public imports; never a native pass. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,lstatSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
const ts=createRequire(import.meta.url)('typescript');
const ownPath='scripts/base-class-removal-current-use-review.mjs';
const ownImage=readFileSync(fileURLToPath(import.meta.url));
const worksheetPath='compatibility/rc/base-class-removal-current-use-worksheet.json';
const pins={'21.x':'26a35934ed9b9dd45a5f80a9a1c20c29a2079c7b8b064c67191ef9f839349a3e',main:'34ff321e571fb3590fd4a10549d0dfa38535b05cf4847d560bb1fbb02196810d'};
export const BASE_CURRENT_USE_PROOF='compatibility/rc/base-class-removal-current-use-source-proof.json';
export const BASE_CURRENT_USE_REVIEW='compatibility/f10/authored-use-reviews/base-class-removal-current-uses.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const identities=r=>({file:r.file,module:r.module,symbol:r.symbol});
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const helper='legacy-form-field/testing/error-harness.ts';
const expectedAdded=[JSON.stringify([helper,'@angular/material/form-field/testing','MatErrorHarness']),JSON.stringify(['legacy-snack-bar/internal/snack-bar-base.ts','@angular/material/snack-bar','MatSnackBarRef'])];

/** The checker resolves lexical shadowing without loading or pretending to typecheck peers. */
export function lexicalPeerUses(path,text){
 const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
 const host={fileExists:f=>f===path,readFile:f=>f===path?text:undefined,getSourceFile:f=>f===path?source:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>process.cwd(),getDirectories:()=>[],getCanonicalFileName:f=>f,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n'};
 const program=ts.createProgram([path],{noLib:true,noResolve:true,target:ts.ScriptTarget.Latest},host),checker=program.getTypeChecker();
 const printer=ts.createPrinter({removeComments:true}),symbols=new Map(),rows=new Map();
 for(const node of source.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||!node.moduleSpecifier.text.startsWith('@angular/'))continue;
  const imports=node.importClause?.namedBindings;assert.ok(imports&&ts.isNamedImports(imports),'unexpected import shape in finite four-file subject');
  for(const item of imports.elements){
   const row={file:path.slice('projects/ngx-material-legacy/'.length),module:node.moduleSpecifier.text,symbol:(item.propertyName??item.name).text,local_name:item.name.text,type_only:!!(node.importClause.isTypeOnly||item.isTypeOnly),uses:[]};
   assert.equal(rows.has(key(row)),false);const symbol=checker.getSymbolAtLocation(item.name);assert.ok(symbol);symbols.set(symbol,row);rows.set(key(row),row);
  }
 }
 const visit=node=>{
  if(ts.isIdentifier(node)&&!ts.isImportSpecifier(node.parent)){
   const row=symbols.get(checker.getSymbolAtLocation(node));
   if(row)row.uses.push({role:ts.SyntaxKind[node.parent.kind],expression:printer.printNode(ts.EmitHint.Unspecified,node.parent,source).replace(/\s+/g,' ').trim()});
  }
  ts.forEachChild(node,visit);
 };
 visit(source);return [...rows.values()].sort((a,b)=>key(a).localeCompare(key(b)));
}
export function validateExistingUse(before,after){
 assert.deepEqual(identities(after),identities(before));assert.equal(after.local_name,before.local_name);assert.equal(after.type_only,before.type_only);
 const simple=v=>v.uses.map(u=>u.role+':'+u.expression);
 if(before.file!==helper||before.symbol==='ComponentHarness'){assert.deepEqual(after.uses,before.uses,'changed existing lexical peer use '+key(before));return 'identical lexical use expressions';}
 const expected={
  ComponentHarnessConstructor:{before:['TypeReference:ComponentHarnessConstructor<T>'],after:['TypeReference:ComponentHarnessConstructor<T>','TypeReference:ComponentHarnessConstructor<T>']},
  ErrorHarnessFilters:{before:['TypeReference:ErrorHarnessFilters'],after:['TypeReference:ErrorHarnessFilters','TypeReference:ErrorHarnessFilters']},
  HarnessPredicate:{before:['TypeReference:HarnessPredicate<T>','NewExpression:new HarnessPredicate(this, options)','PropertyAccessExpression:HarnessPredicate.stringMatches'],after:['TypeReference:HarnessPredicate<T>','TypeReference:HarnessPredicate<T>','NewExpression:new HarnessPredicate(type, options)','PropertyAccessExpression:HarnessPredicate.stringMatches']},
 };
 const selected=expected[before.symbol];assert.ok(selected,'unreviewed helper extraction dependency');assert.deepEqual(simple(before),selected.before);assert.deepEqual(simple(after),selected.after);
 return 'exact historical protected-helper extraction; existing public type/factory/string matcher roles retained';
}
function peerRead(root,path){
 // The 21.x repair receipt also binds these two exact read-only Cyph context files.
 const cyph=['../../../../cyph/shared/js/cyph/services/material-dialog.service.ts','../../../../cyph/shared/js/cyph/modules/cyph-web.module.ts'];
 if(cyph.includes(path)){assert.equal(resolve(root,path),resolve('/home/parallels/cyph',path.slice('../../../../cyph/'.length)));return readEvidenceMember('/home/parallels/cyph',path.slice('../../../../cyph/'.length));}
 const match=path.match(/^node_modules\/(@angular\/(?:material|cdk|core|compiler)|typescript|rxjs)\/(.+)$/);if(!match)return readEvidenceMember(root,path);
 let current=realpathSync(join(root,'node_modules',match[1]));
 for(const part of match[2].split('/')){assert.ok(part&&part!=='.'&&part!=='..');current=join(current,part);assert.equal(lstatSync(current).isSymbolicLink(),false);}
 assert.ok(lstatSync(current).isFile());return readFileSync(current);
}
function git(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:4*1024*1024});
}
function resolveNewPublicImports(root,read,line){
 const options={noEmit:true,strict:true,skipLibCheck:false,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler};
 const path=join(root,'compatibility/rc/base-class-removal-current-use-public-consumer.ts');
 const text="import type {MatErrorHarness} from '@angular/material/form-field/testing';\nimport {MatSnackBarRef} from '@angular/material/snack-bar';\ntype HistoricalErrorDomain<T extends MatErrorHarness> = T;\nconst referenceToken = MatSnackBarRef;\n";
 const host=ts.createCompilerHost(options),getSource=host.getSourceFile.bind(host);
 host.getSourceFile=(file,...args)=>resolve(file)===path?ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true):getSource(file,...args);
 const program=ts.createProgram([path],options,host),checker=program.getTypeChecker(),source=program.getSourceFile(path);assert.ok(source);
 assert.deepEqual(program.getSyntacticDiagnostics(source),[]);assert.deepEqual(program.getSemanticDiagnostics(source),[]);
 const manifest=JSON.parse(read('node_modules/@angular/material/package.json')),published=JSON.parse(read('projects/ngx-material-legacy/package.json'));
 assert.equal(published.peerDependencies['@angular/material'],'^'+manifest.version,'public-import check is not at the advertised Material minimum');
 const expectedVersion=line==='21.x'?'21.2.14':'22.1.7';assert.equal(manifest.version,expectedVersion);
 const result=[];
 for(const statement of source.statements){
  if(!ts.isImportDeclaration(statement))continue;
  const entry='.'+statement.moduleSpecifier.text.slice('@angular/material'.length),route=manifest.exports[entry];assert.ok(route&&typeof route.types==='string'&&typeof route.default==='string');
  assert.ok(!/compat|legacy|private/.test(entry));
  const spec=statement.importClause.namedBindings.elements[0],alias=checker.getSymbolAtLocation(spec.name);assert.ok(alias);assert.ok(alias.flags&ts.SymbolFlags.Alias);
  assert.deepEqual(alias.getJsDocTags(checker).filter(t=>t.name==='deprecated'),[]);
  const target=checker.getAliasedSymbol(alias);assert.equal(target.name,spec.name.text);assert.deepEqual(target.getJsDocTags(checker).filter(t=>t.name==='deprecated'),[]);
  const declarations=target.getDeclarations();assert.equal(declarations.length,1);const declaration=declarations[0];assert.ok(ts.isClassDeclaration(declaration));
  const actual=realpathSync(declaration.getSourceFile().fileName),expected=realpathSync(join(root,'node_modules/@angular/material',route.types));assert.equal(actual,expected,'new use bypasses explicit public declaration export');
  const declarationPath='node_modules/@angular/material/'+route.types.replace(/^\.\//,'');
  const raw=read(declarationPath);assert.equal(raw.toString(),declaration.getSourceFile().text);
  result.push({module:statement.moduleSpecifier.text,symbol:target.name,package_version:manifest.version,public_export_entry:entry,public_export_types:route.types,public_export_runtime:route.default,declaration:ref(declarationPath,raw),deprecated:false,declaration_kind:'ClassDeclaration',role:statement.importClause.isTypeOnly?'erased generic constraint':'runtime class value used only as an Injector provider key'});
 }
 assert.deepEqual(result.map(x=>x.symbol),['MatErrorHarness','MatSnackBarRef']);return result;
}

export function prepareBaseClassCurrentUseReview({root=process.cwd(),read:pathRead}={}){
 root=resolve(root);const diskRead=p=>peerRead(root,p);
 // A supplied diagnostic reader cannot substitute projected bytes for the real file.
 const rawRead=pathRead?p=>{const actual=diskRead(p);assert.equal(Buffer.from(pathRead(p)).equals(actual),true,'diagnostic reader differs from actual current file '+p);return actual;}:diskRead,bound=new Map();
 const read=path=>{const raw=Buffer.from(rawRead(path));if(bound.has(path))assert.equal(hash(raw),bound.get(path).sha256,'input changed during current-use preparation '+path);else bound.set(path,ref(path,raw));return raw;};
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':manifest.version.startsWith('22.')?'main':null;assert.ok(line);
 assert.equal(hash(read(worksheetPath)),pins[line],'changed bounded current-use worksheet');const worksheet=JSON.parse(read(worksheetPath));assert.equal(worksheet.line,line);
 assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
 assert.equal(read(ownPath).equals(ownImage),true,'changed current-use producer');
 for(const path of ['scripts/upstream-packed-run-evidence.mjs','scripts/authored-use-inventory.mjs','.node-version','.npm-version'])read(path);
 const checked=record=>{const raw=read(record.path);assert.equal(hash(raw),record.sha256,'changed current-use evidence '+record.path);if(record.bytes!==undefined)assert.equal(raw.length,record.bytes);return raw;};
 const diagnostic=JSON.parse(checked(worksheet.diagnostic)),implementation=JSON.parse(checked(worksheet.implementation));assert.equal(diagnostic.line,line);assert.equal(implementation.line,line);
 assert.equal(implementation.g11_claim,'not-passed');assert.equal(implementation.canonical_admission_ready,false);assert.equal(implementation.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 assert.ok(implementation.source_bindings.length>300);for(const member of implementation.source_bindings)checked(member);
 const rosterRows=new Map();for(const record of worksheet.protected_rosters){const body=JSON.parse(checked(record));assert.equal(body.line,line);for(const row of body.symbol_uses){assert.equal(rosterRows.has(key(row)),false);rosterRows.set(key(row),row);}}
 const beforeRows=new Map(),afterRows=new Map();
 assert.equal(diagnostic.exact_changed_sources.length,4);
 for(const image of diagnostic.exact_changed_sources){
  const before=git(root,diagnostic.baseline_commit,image.path),after=read(image.path);assert.equal(hash(before),image.before_sha256);assert.equal(hash(after),image.after_sha256,'changed current repaired product '+image.path);
  for(const row of lexicalPeerUses(image.path,before.toString())){assert.equal(beforeRows.has(key(row)),false);beforeRows.set(key(row),row);}
  for(const row of lexicalPeerUses(image.path,after.toString())){assert.equal(afterRows.has(key(row)),false);afterRows.set(key(row),row);}
 }
 assert.equal(beforeRows.size,93);assert.equal(afterRows.size,95);assert.deepEqual([...beforeRows.keys()].filter(k=>!afterRows.has(k)),[]);
 const added=[...afterRows.values()].filter(row=>!beforeRows.has(key(row)));assert.deepEqual(added.map(key).sort(),[...expectedAdded].sort());
 const continuity=[],priorReviews=new Map();
 for(const [id,before]of beforeRows){
  const after=afterRows.get(id),assessment=validateExistingUse(before,after),roster=rosterRows.get(id);assert.ok(roster,'missing original reviewed caller '+id);assert.equal(roster.status,'reviewed');assert.equal(roster.disposition,'closed');
  const body=JSON.parse(checked(roster.source_review));assert.equal(body.line,line);assert.equal(body.status,'reviewed');
  const matches=body.reviews.filter(row=>key(row)===id);assert.equal(matches.length,1);const prior=matches[0];
  const beforeImage=diagnostic.exact_changed_sources.find(m=>m.path==='projects/ngx-material-legacy/'+before.file);assert.equal(prior.candidate_source_sha256,beforeImage.before_sha256,'prior review is not bound to exact repair preimage');
  assert.ok(['stable-public-peer','owned-replacement','test-only','removed-use'].includes(prior.conclusion));if(prior.conclusion==='removed-use')assert.equal(after.uses.length,0,'retired use became active');assert.ok(prior.independent_evidence.length);
  for(const evidence of prior.independent_evidence)checked(evidence);
  priorReviews.set(id,{review:structuredClone(prior),reference:structuredClone(roster.source_review)});
  continuity.push({...identities(after),before_source_sha256:beforeImage.before_sha256,candidate_source_sha256:beforeImage.after_sha256,local_name:after.local_name,type_only:after.type_only,before_uses:before.uses,current_uses:after.uses,assessment,prior_source_review:structuredClone(roster.source_review)});
 }
 const error=added.find(r=>r.symbol==='MatErrorHarness'),snack=added.find(r=>r.symbol==='MatSnackBarRef');
 assert.equal(error.type_only,true);assert.deepEqual(error.uses,[{role:'TypeReference',expression:'MatErrorHarness'}]);
 assert.equal(snack.type_only,false);assert.equal(snack.local_name,'PeerMatSnackBarRef');assert.deepEqual(snack.uses,[{role:'PropertyAssignment',expression:'provide: PeerMatSnackBarRef'}]);
 const publicImports=resolveNewPublicImports(root,read,line);
 const sourceBindings=()=>[...bound.values()].sort((a,b)=>a.path.localeCompare(b.path));
 const assertCurrent=()=>{for(const member of bound.values()){const raw=Buffer.from(rawRead(member.path));assert.equal(hash(raw),member.sha256,'late current-use input change '+member.path);assert.equal(raw.length,member.bytes);}};
 assertCurrent();
 const proof={schema_version:1,line,compiler:ts.version,producer:ref(ownPath,ownImage),source_parent:worksheet.source_parent,
  scope:'Exact four-file source-use continuity and two explicit current public imports. Lexical binding is checker-resolved without peer typechecking; separate public declaration resolution and own-line actual repair qualification are bound. Prior reviews remain historical. No native,packed,browser,floor,upstream SHA or G11 admission.',
  existing_reviewed_uses:93,new_uses:2,identical_lexical_use_rows:continuity.filter(r=>r.assessment==='identical lexical use expressions').length,
  explicit_historical_helper_extraction_rows:continuity.filter(r=>r.assessment!=='identical lexical use expressions').length,
  continuity,new_use_bindings:added,public_import_resolution:publicImports,actual_repair_qualification:worksheet.implementation,
  all_prior_independent_evidence_bytes_unchanged:true,source_bindings:sourceBindings(),
  old_product_bytes_exposed_as_current:false,canonical_rosters_changed:false,canonical_dispositions_changed:0,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 const proofBytes=bytes(proof),proofRef=ref(BASE_CURRENT_USE_PROOF,proofBytes);
 const reviews=continuity.map(row=>{
  const prior=priorReviews.get(key(row)),shape=`${row.current_uses.length} checker-resolved lexical reference(s): ${row.current_uses.map(u=>u.role+': '+u.expression).join('; ')||'unused import retained'}`;
  return {...identities(row),candidate_source_sha256:row.candidate_source_sha256,conclusion:prior.review.conclusion,reviewer:'Codex primary implementer',
   decision:`For ${row.file}, the exact imported ${row.module} ${row.symbol} binding has ${shape}. Current versus independently authenticated pre-fix source has ${row.assessment}. The original reviewed contract and its independent evidence bytes remain intact in the retained prior review. This judgment qualifies current source-use continuity after the four finite historical repairs; it does not re-execute or reclassify prior native/packed/floor results, and the newly restored component behavior still requires final product gates.`,
   prior_source_review:prior.reference,prior_decision:prior.review.decision,independent_evidence:[proofRef,worksheet.implementation,prior.reference]};
 });
 for(const row of added){
  const image=diagnostic.exact_changed_sources.find(m=>m.path==='projects/ngx-material-legacy/'+row.file);
  const decision=row.symbol==='MatErrorHarness'?'The explicitly exported nondeprecated public MatErrorHarness class is imported with type-only syntax solely as the historical protected predicate helper generic constraint. The genuine own-line helper/service compiler report proves the historical peer/owned/derived domain, protected access rejection and erased runtime import. This introduces no current-parent inheritance, DOM or style dependency.':'The explicitly exported nondeprecated public MatSnackBarRef class value is used solely as the content Injector provider key, mapped to the existing owned legacy reference instance. The own-line actual service and genuine public Injector replay proves both parent scenarios and rejects the missing-provider control. The class tokens remain distinct and the local provider preserves historical shared-token lookup without requiring modern reference inheritance.';
  reviews.push({...identities(row),candidate_source_sha256:image.after_sha256,conclusion:'stable-public-peer',reviewer:'Codex primary implementer',decision:decision+' This is the finite public source-use boundary; actual Angular node DI, native DOM, packed consumers, full floors, upstream SHA disposition and G11 remain separate.',independent_evidence:[proofRef,worksheet.implementation]});
 }
 reviews.sort((a,b)=>key(a).localeCompare(key(b)));assert.equal(reviews.length,95);
 const reviewBytes=bytes({schema_version:1,line,status:'reviewed',scope:proof.scope,reviews,g11_claim:'not-passed'}),reviewRef=ref(BASE_CURRENT_USE_REVIEW,reviewBytes);
 const writes=new Map([[BASE_CURRENT_USE_PROOF,proofBytes],[BASE_CURRENT_USE_REVIEW,reviewBytes]]);
 const candidate={symbol_uses:reviews.map(row=>({...identities(row),status:'reviewed',disposition:'closed',source_review:reviewRef}))};
 const proposed=p=>writes.get(p)??read(p),accepted=authoredUseReviewEvidence(candidate,line,proposed,hash);assert.equal(accepted.reviewed,95);assert.equal(accepted.insufficient,0);assertCurrent();
 return {line,proof,reviews,candidate,writes,bound:sourceBindings(),assertCurrent,accepted,
  canonical_rosters_changed:false,current_source_owner_reconciliation_complete:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
