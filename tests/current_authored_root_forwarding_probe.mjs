/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exercise the actual production call expressions with a captured admission argument. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=resolve(process.env.ROSTER_TEST_SOURCE_ROOT??defaultRoot),toolsRoot=resolve(process.env.ROSTER_TEST_TOOLS_ROOT??defaultRoot);
const ts=createRequire(join(toolsRoot,'package.json'))('typescript');
const paths=['bidi-isolated-packed-evidence-requalification.mjs','bidi-peer-source-judgments.mjs','check-upstream-audit-disposition.mjs','chip-focus-role-requalification.mjs','chip-menu-tooltip-packed-evidence-requalification.mjs','chip-source-batch-requalification.mjs','menu-exit-context-requalification.mjs','packed-cva-source-requalification.mjs','remaining-native-admission-source-requalification.mjs','remaining-native-tab-repair-requalification.mjs','selection-comparator-source-judgments.mjs','snack-dom-source-context-review.mjs','spec-control-context-requalification.mjs','spec-small-context-requalification.mjs','spec-stability-context-requalification.mjs','tab-portal-source-successor.mjs'];
let total=0,oldRejected=0;const marker='/explicit/alignment/root-distinct-from-module-and-cwd';
for(const path of paths){const text=readFileSync(join(sourceRoot,'scripts',path),'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(source.parseDiagnostics.length,0);let count=0;
 const visit=node=>{if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='currentAuthoredUseAdmission'){
  count++;total++;assert.equal(node.arguments.length,1);const object=node.arguments[0];assert.ok(ts.isObjectLiteralExpression(object));const roots=object.properties.filter(p=>p.name?.getText(source)==='root');assert.equal(roots.length,1);assert.ok(ts.isShorthandPropertyAssignment(roots[0]));
  const capture=expression=>{let seen=null;const generic=new Proxy(function(){return generic},{get:()=>generic,apply:()=>generic});const scope=new Proxy({root:marker,currentAuthoredUseAdmission:value=>{seen=value;return value},scanCurrentAuthoredUses:()=>({}),JSON:{parse:()=>({symbol_uses:[]})}},{has:()=>true,get:(target,k)=>k===Symbol.unscopables?undefined:(k in target?target[k]:generic)});Function('scope','with(scope){return ('+expression+');}')(scope);assert.ok(seen);return seen;};
  const textCall=node.getText(source);assert.equal(capture(textCall).root,marker,'production caller failed explicit root: '+path);const omitted=textCall.replace('currentAuthoredUseAdmission({root,','currentAuthoredUseAdmission({');assert.notEqual(omitted,textCall);assert.equal(capture(omitted).root,undefined,'omitted-root negative control failed: '+path);oldRejected++;
 }ts.forEachChild(node,visit)};visit(source);assert.equal(count,path==='spec-stability-context-requalification.mjs'?2:1,path);
}
assert.equal(total,17);assert.equal(oldRejected,17);
// Execute the actual successor API body with only its downstream baseline
// substituted, so this checks root propagation without bypassing a real guard.
const apiPath=process.env.ROSTER_TEST_ADMISSION_SOURCE??join(sourceRoot,'scripts/authored-current-use-inventory.mjs'),apiText=readFileSync(apiPath,'utf8'),apiSource=ts.createSourceFile(apiPath,apiText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=apiSource.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='currentAuthoredUseAdmission');assert.equal(declarations.length,1);let apiBody=declarations[0].getText(apiSource).replace(/^export\s+/,'');
const exercise=body=>{let captured;const baseline=args=>{captured=args;return {valid:true,entries:[],retired:[],mode:'captured',qualification:null}},inventory=()=>({invalid:0,complete:true,open:0}),evidence=()=>({insufficient:0}),key=row=>JSON.stringify([row?.file,row?.module,row?.symbol]);const api=Function('additionalUseBaseline','authoredUseInventory','authoredUseReviewEvidence','key','hash','defaultRoot','return ('+body+')')(baseline,inventory,evidence,key,()=>'', '/module/default');
 const current={symbol_uses:[],source_population_sha256:'x',source_files:[]},candidate={schema_version:1,line:'main',status:'in-progress',current_source_population_sha256:'x',current_uses:0,current_source_files:0,symbol_use_count:0,symbol_uses:[]};api({root:marker,current,frozen:[],candidate,line:'main',readMember:()=>null});return captured.root;};
assert.equal(exercise(apiBody),marker,'successor API did not forward explicit root');const noForward=apiBody.replace('additionalUseBaseline({root,','additionalUseBaseline({');assert.notEqual(noForward,apiBody);assert.equal(exercise(noForward),undefined,'omitted-forwarding negative control failed');
console.log('17 actual production call expressions capture the explicit alternate root; successor API forwards it to the baseline; 18 omitted-root controls reject; full inspector and inherited guards not exercised');
