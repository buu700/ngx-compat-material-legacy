/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-only exact-floor reachability; no private framework/CDK symbol is executed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RIPPLE_REPLAY_SHA,rippleReplayRequirements} from './upstream-ripple-replay-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const namespace='compatibility/rc/material-public-subjects.json',namespaceHash='f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function parse(path,text){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(file.parseDiagnostics.length,0);return file;}
function descendants(node,predicate){const found=[];const visit=other=>{if(predicate(other))found.push(other);ts.forEachChild(other,visit);};visit(node);return found;}
function top(file,name){const nodes=file.statements.filter(node=>node.name?.getText(file)===name);
 for(const statement of file.statements.filter(ts.isVariableStatement))for(const declaration of statement.declarationList.declarations)if(declaration.name.getText(file)===name)nodes.push(declaration);
 assert.equal(nodes.length,1,'missing/ambiguous route declaration '+name);return nodes[0];}
function method(file,owner,name){const nodes=top(file,owner).members.filter(node=>node.name?.getText(file)===name);assert.equal(nodes.length,1,'missing/ambiguous route member '+owner+'.'+name);return nodes[0];}
const calls=(node,name)=>descendants(node,other=>ts.isCallExpression(other)&&(ts.isIdentifier(other.expression)?other.expression.text:ts.isPropertyAccessExpression(other.expression)?other.expression.name.text:null)===name);
const callText=(node,file)=>node.getText(file);
function oneCall(node,name,file,args){const found=calls(node,name);assert.equal(found.length,1,'missing/ambiguous route call '+name);if(args)assert.deepEqual(found[0].arguments.map(arg=>arg.getText(file)),args,'route argument changed '+name);return found[0];}
const noDomRedispatch=node=>assert.equal(calls(node,'dispatchEvent').length,0,'replay route redispatches a DOM event');

export function reviewRippleReplayRouteSources({line,core,debug,primitives,material,cdk,platform,platformTypes,fixture}){
 assert.ok(['main','21.x'].includes(line));
 const files=Object.fromEntries(Object.entries({core,debug,primitives,material,cdk,platform,platformTypes,fixture}).map(([name,text])=>[name,parse(name+'.ts',text)]));
 const provider=top(files.platform,'withEventReplay'),declaration=top(files.platformTypes,'withEventReplay');
 assert.ok(!ts.getJSDocTags(declaration).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)),'unstable public replay feature');
 oneCall(provider,'hydrationFeature',files.platform);oneCall(provider,'_withEventReplay',files.platform,[]);
 const publicExport=files.platform.statements.filter(ts.isExportDeclaration).flatMap(node=>node.exportClause&&ts.isNamedExports(node.exportClause)?node.exportClause.elements:[]).find(node=>node.name.text==='withEventReplay');assert.ok(publicExport,'missing public replay export');
 const init=top(files.core,'initEventReplay'),registered=top(files.core,'invokeRegisteredReplayListeners'),invoke=top(files.debug,'invokeListeners');
 const dispatcher=descendants(init,node=>ts.isNewExpression(node)&&node.expression.getText(files.core)==='EventDispatcher');assert.equal(dispatcher.length,1);
 assert.equal(dispatcher[0].arguments.length,1);assert.ok(ts.isArrowFunction(dispatcher[0].arguments[0]));
 oneCall(dispatcher[0].arguments[0],'invokeRegisteredReplayListeners',files.core,['injector','event','event.currentTarget']);
 oneCall(init,'replayEarlyEventInfos',files.core,['eventInfos']);oneCall(init,'registerDispatcher',files.core,['eventContract','dispatcher']);
 oneCall(registered,'invokeListeners',files.core,['event','currentTarget']);
 assert.equal(descendants(invoke,node=>ts.isPropertyAccessExpression(node)&&node.name.text==='__jsaction_fns').length,1,'replay no longer reads the stashed Angular listeners');
 oneCall(invoke,'handler',files.debug,['event']);
 const early=method(files.primitives,'EventContract','replayEarlyEventInfos'),toDelegate=method(files.primitives,'EventDispatcher','dispatchToDelegate'),prepare=top(files.primitives,'prepareEventForReplay');
 oneCall(early,'handleEventInfo',files.primitives,['eventInfo']);oneCall(toDelegate,'dispatchDelegate',files.primitives,['eventInfoWrapper.getEvent()','eventInfoWrapper.getAction().name']);
 oneCall(toDelegate,'prepareEventForReplay',files.primitives,['eventInfoWrapper']);
 const pathPatch=calls(prepare,'patchEventInstance').filter(node=>node.arguments[1]?.getText(files.primitives)==="'composedPath'");assert.equal(pathPatch.length,1);
 assert.equal(pathPatch[0].arguments[0].getText(files.primitives),'event');assert.ok(ts.isArrowFunction(pathPatch[0].arguments[2]));
 assert.equal(descendants(pathPatch[0].arguments[2],ts.isThrowStatement).length,1,'replay composedPath is no longer the throwing callback');
 for(const node of [init,registered,invoke,early,toDelegate,prepare])noDomRedispatch(node);
 const directive=top(files.material,'MatRipple'),manager=top(files.material,'RippleEventManager');
 const metadata=method(files.material,'MatRipple','ɵdir').initializer;assert.ok(ts.isCallExpression(metadata));
 const options=metadata.arguments[0];assert.ok(ts.isObjectLiteralExpression(options));const host=options.properties.find(node=>node.name?.getText(files.material)==='host')?.initializer;assert.ok(ts.isObjectLiteralExpression(host));
 assert.ok(!host.properties.some(node=>node.name?.getText(files.material)==='listeners'),'public ripple acquired an Angular host listener');
 const add=method(files.material,'RippleEventManager','addHandler'),delegate=method(files.material,'RippleEventManager','_delegateEventHandler');
 const native=oneCall(add,'addEventListener',files.material,['name','this._delegateEventHandler','passiveCapturingEventOptions$1']);assert.equal(native.expression.expression.getText(files.material),'document');
 oneCall(delegate,'_getEventTarget',files.material,['event']);
 const helper=top(files.cdk,'_getEventTarget'),catchCount=descendants(helper,node=>ts.isTryStatement(node)&&!!node.catchClause).length;
 assert.equal(catchCount,line==='main'?1:0,'private minimum helper catch differs from the recorded floor');
 const launch=method(files.material,'MatRipple','launch');assert.equal(calls(launch,'_getEventTarget').length,0);assert.ok(calls(launch,'fadeInRipple').length>0,'public launch route changed');
 const literal=top(files.fixture,'rippleHydrationComponentFixture').initializer;assert.ok(ts.isNoSubstitutionTemplateLiteral(literal));
 const fixtureFile=parse('component.ts',literal.text),observe=method(fixtureFile,'RippleHydrationLab','nativeReplay');
 for(const name of ['launch','handleEvent','dispatchEvent'])assert.equal(calls(observe,name).length,0,'diagnostic replay handler forwards or launches');
 oneCall(observe,'push',fixtureFile);oneCall(observe,'composedPath',fixtureFile,[]);
 const subjects=[['public-feature',provider,files.platform],['public-feature-declaration',declaration,files.platformTypes],['core-replay-setup',init,files.core],['registered-replay-callback',registered,files.core],['stashed-listener-invocation',invoke,files.debug],['queued-replay-route',early,files.primitives],['replay-dispatch-to-delegate',toDelegate,files.primitives],['throwing-replay-event-patch',prepare,files.primitives],['public-directive',directive,files.material],['native-document-manager',manager,files.material],['private-target-helper',helper,files.cdk],['diagnostic-no-forwarding-handler',observe,fixtureFile]];
 return {line,public_feature:'@angular/platform-browser#withEventReplay',public_ripple:'@angular/material/core#MatRipple',helper_has_replay_catch:catchCount===1,
  expected_replay_route:'Queued event info -> Angular EventDispatcher -> registered replay delegate -> stashed __jsaction_fns handlers; no DOM redispatch in the complete inspected replay chain.',
  expected_peer_route:'MatRipple has no Angular host listeners. Its RippleEventManager listens directly at document capture; public launch() calls the renderer and receives no replay event.',
  fixture_route:'The nativeReplay Angular handler records delivery only. It neither launches a ripple, forwards to a manager, nor redispatches a DOM event. Actual browser no-launch replay plus genuine live native creation remains mandatory.',
  complete_subjects:subjects.map(([role,node,file])=>({role,complete_source:node.getText(file),sha256:hash(node.getText(file))})),
  new_runtime_dependencies:0,private_symbols_invoked:false,actual_angular_native_or_packed_qualified:false,g11_claim:'not-passed'};
}
export function inspectRippleReplaySourceRoute({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),bytes=read(namespace);assert.equal(hash(bytes),namespaceHash,'ripple source namespace changed');
 const data=JSON.parse(bytes),lines=[];
 for(const line of ['main','21.x']){
  const subject=data.subjects.find(row=>row.line===line);assert.ok(subject);const required=rippleReplayRequirements(RIPPLE_REPLAY_SHA,line);assert.ok(required);
  const loaded=[];
  const member=(pkg,path,sha)=>{
   const matches=subject.members.filter(row=>row.package===pkg&&(path?row.module_path===path:row.sha256===sha));assert.equal(matches.length,1,'missing/ambiguous exact-floor member '+pkg+'/'+path);
   const row=matches[0],stored=read(row.path);assert.equal(hash(stored),row.stored_sha256,'ripple route stored member changed');
   const raw=row.compression==='gzip'?gunzipSync(stored):stored;assert.equal(hash(raw),row.sha256,'ripple route raw member changed');assert.equal(raw.length,row.bytes);
   loaded.push({package:pkg,module_path:row.module_path,path:row.path,stored_sha256:row.stored_sha256,raw_sha256:row.sha256,bytes:row.bytes});return raw.toString();
  };
  const sources={core:member('@angular/core','fesm2022/core.mjs'),debug:member('@angular/core','fesm2022/_debug_node-chunk.mjs'),primitives:member('@angular/core','fesm2022/primitives-event-dispatch.mjs'),material:member('@angular/material',null,required.peer_reference.caller.sha256),cdk:member('@angular/cdk',null,required.peer_reference.helper.sha256),platform:member('@angular/platform-browser','fesm2022/platform-browser.mjs'),platformTypes:member('@angular/platform-browser','types/platform-browser.d.ts'),fixture:read('scripts/ripple-hydration-component-fixture.mjs').toString()};
  const route=reviewRippleReplayRouteSources({line,...sources});assert.equal(route.helper_has_replay_catch,required.peer_reference.helper_has_replay_catch);
  lines.push({...route,peer_reference:required.peer_reference,authenticated_source_members:loaded});
 }
 return {schema_version:1,namespace:{path:namespace,sha256:namespaceHash},lines,fixture:{path:'scripts/ripple-hydration-component-fixture.mjs',sha256:hash(read('scripts/ripple-hydration-component-fixture.mjs'))},
  scope:'Complete exact-floor source reachability only. No private runtime symbols are invoked, no framework/CDK patch is installed, and no source tracing or protocol result qualifies the genuine packed Angular/native application.',actual_angular_native_or_packed_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(inspectRippleReplaySourceRoute(),null,2));
