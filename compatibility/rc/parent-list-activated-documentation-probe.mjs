/**
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
const prefix='compatibility/rc/parent-list-activated-documentation-';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const packetRaw=readFileSync(prefix+'originals.json.gz'),packet=JSON.parse(gunzipSync(packetRaw));
assert.equal(packet.sha,'c73ab023af60220f19e98e85c32ea9924b217dae');
assert.equal(packet.sections.length,1);assert.equal(packet.hunks.length,1);
const section=packet.sections[0],before=section.before.body,after=section.after.body;
assert.equal(before.replace('get activated() {','get activated(): boolean {'),after);
const roots={main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy','21.x':process.cwd()};
const bindings=[],rows=[];
function member(root,path){const raw=readFileSync(join(root,path));bindings.push({root,path,sha256:hash(raw),bytes:raw.length});return raw;}
for(const [line,root]of Object.entries(roots)){
 const ts=createRequire(join(root,'package.json'))('typescript');
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true,noLib:true,noResolve:true};
 const parse=(name,text)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
 const getterType=text=>{
  const file=parse('original.ts',text),host=ts.createCompilerHost(options);
  host.getSourceFile=name=>name==='original.ts'?file:undefined;
  const program=ts.createProgram(['original.ts'],options,host),checker=program.getTypeChecker();
  const cls=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatListItem');assert.ok(cls);
  const getter=cls.members.find(n=>ts.isGetAccessorDeclaration(n)&&n.name.getText(file)==='activated');assert.ok(getter);
  return checker.typeToString(checker.getReturnTypeOfSignature(checker.getSignatureFromDeclaration(getter)));
 };
 assert.equal(getterType(before),'boolean');assert.equal(getterType(after),'boolean');
 const emit=text=>ts.transpileModule(text,{compilerOptions:options,fileName:'original.ts'}).outputText;
 const emitted=emit(before);assert.equal(emitted,emit(after));
 assert.notEqual(getterType(after.replace('get activated(): boolean {','get activated(): string {')),'boolean');
 assert.notEqual(emit(after.replace('return this._activated;','return false;')),emitted);
 const peer=parse('list.d.ts',member(root,'node_modules/@angular/material/types/list.d.ts').toString());
 const cls=peer.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatListItem');assert.ok(cls);
 const getter=cls.members.find(n=>ts.isGetAccessorDeclaration(n)&&n.name.getText(peer)==='activated');assert.ok(getter);
 assert.equal(getter.type.kind,ts.SyntaxKind.BooleanKeyword);
 const ownedRaw=member(root,'projects/ngx-material-legacy/legacy-list/list.ts');
 const owned=parse('owned.ts',ownedRaw.toString());
 const legacy=owned.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyListItem');assert.ok(legacy);
 assert.equal(legacy.members.some(n=>n.name?.getText(owned)==='activated'),false);
 assert.match(ownedRaw.toString(),/const _MatListItemMixinBase = mixinDisableRipple\(class \{\}\);/);
 for(const path of ['projects/ngx-material-legacy/legacy-list/public-api.ts','projects/ngx-material-legacy/legacy-list/list-module.ts','projects/ngx-material-legacy/legacy-list/list-item.html','projects/ngx-material-legacy/legacy-list/testing/list-item-harness-base.ts','node_modules/@angular/material/package.json'])member(root,path);
 rows.push({line,typescript:ts.version,original_inferred_type:'boolean',after_explicit_type:'boolean',emitted_javascript_equal:true,emitted_sha256:hash(emitted),peer_public_getter_boolean:true,owned_class_has_no_activated_member:true,negative_controls_rejected:2});
}
for(const row of packet.tagged_members){assert.equal(hash(row.body),row.sha256);const text=row.body;
 if(row.path==='src/material/legacy-list/list.ts')assert.equal(text.includes('get activated'),false);
}
const result={schema_version:1,sha:packet.sha,original_capture:{path:prefix+'originals.json.gz',sha256:hash(packetRaw),bytes:packetRaw.length},rows,bindings,source_only:true,isolated_original_type_inspection:true,whole_module_semantic_AOT_or_runtime_execution:false,upstream_emitted_javascript_executed:false,canonical_or_product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(prefix+'source-controls.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({lines:rows.length,negative_controls:rows.reduce((n,r)=>n+r.negative_controls_rejected,0),source_only:true}));
