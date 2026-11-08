/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Actual copied archive image and same-version peer mutation controls.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdtempSync,cpSync,symlinkSync,readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {exactMenuArtifact,exactMenuPeer} from '../scripts/api-menu-artifact.mjs';
import {menuOwnedDeclarationProof} from '../scripts/api-menu-owned-signatures.mjs';
import {menuTriggerOwnedToken} from '../scripts/api-menu-trigger-token.mjs';
import {menuTriggerReference,MENU_TRIGGER_REFERENCE} from '../scripts/api-menu-reference.mjs';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {originalContextDi} from '../scripts/api-original-factory-contexts.mjs';
const arg=name=>{const i=process.argv.indexOf(name);assert.ok(i>=0&&process.argv[i+1],name+' required');return resolve(process.argv[i+1]);};
const packageRoot=arg('--package-root'),tarball=arg('--tarball'),referenceRoot=arg('--reference-root'),req=createRequire(import.meta.url),ts=req('typescript'),load=s=>import(pathToFileURL(req.resolve(s)).href);
await load('@angular/compiler');const peer=await load('@angular/material/menu'),surface=deriveSurface(referenceRoot),symbol=surface.symbols.find(s=>s.symbol_id==='legacy-menu/primary/MatLegacyMenuPanel'),trigger=surface.symbols.find(s=>s.symbol_id==='legacy-menu/primary/MatLegacyMenuTrigger'),param=originalContextDi(trigger.shape,{devMode:true})[5];
const scratch=mkdtempSync(join(tmpdir(),'menu-image-controls-'));
try{
 const copy=join(scratch,'package');cpSync(packageRoot,copy,{recursive:true,errorOnExist:true});
 let dependencyAncestor=dirname(packageRoot);
 while(!existsSync(join(dependencyAncestor,'node_modules'))&&dirname(dependencyAncestor)!==dependencyAncestor)dependencyAncestor=dirname(dependencyAncestor);
 assert.ok(existsSync(join(dependencyAncestor,'node_modules')),'extracted artifact dependency ancestor required');
 symlinkSync(join(dependencyAncestor,'node_modules'),join(scratch,'node_modules'),'dir');
 const context={tarball,packageRoot:copy,referenceRoot},dts=join(copy,'types/ngx-compat-material-legacy-legacy-menu.d.ts'),fesm=join(copy,'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs');
 assert.equal(exactMenuArtifact(context,copy),true,'independent complete copied image');
 const text=readFileSync(dts,'utf8'),source=ts.createSourceFile(dts,text,ts.ScriptTarget.Latest,true);assert.ok(menuOwnedDeclarationProof(symbol,source,context),'copied artifact declaration positive');
 const loaded=await import(pathToFileURL(fesm).href),owned=Object.getPrototypeOf(loaded.MatLegacyMenuItem);assert.ok(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:context}),'copied artifact DI positive');
 const refCopy=join(scratch,'reference-copy');for(const path of Object.keys(MENU_TRIGGER_REFERENCE.sources)){const to=join(refCopy,path);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(referenceRoot,path),to);}
 assert.ok(menuTriggerReference(refCopy),'exact copied tagged references');assert.ok(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:{...context,referenceRoot:refCopy}}),'exact reference copy DI positive');
 assert.equal(menuTriggerReference(undefined),null);assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:{tarball,packageRoot:copy}}),null,'missing reference context');
 assert.equal(menuTriggerReference(copy),null);assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:{...context,referenceRoot:copy}}),null,'wrong reference context');
 for(const path of Object.keys(MENU_TRIGGER_REFERENCE.sources)){const file=join(refCopy,path),original=readFileSync(file);writeFileSync(file,Buffer.concat([original,Buffer.from('\n// modified reference')]));assert.equal(menuTriggerReference(refCopy),null,path);assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:{...context,referenceRoot:refCopy}}),null,'DI changed reference '+path);writeFileSync(file,original);}
 const fesmBytes=readFileSync(fesm);writeFileSync(fesm,Buffer.concat([fesmBytes,Buffer.from('\n// changed physical menu source')]));
 assert.equal(exactMenuArtifact(context,copy),false);assert.equal(menuOwnedDeclarationProof(symbol,source,context),null,'mutated sibling FESM with genuine tarball');assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:context}),null,'mutated DI FESM with genuine tarball');writeFileSync(fesm,fesmBytes);
 writeFileSync(dts,text+'\n// physical drift');assert.equal(menuOwnedDeclarationProof(symbol,source,context),null,'stale preexisting SourceFile rejected after disk mutation');writeFileSync(dts,text);
 const extra=join(copy,'extra-foreign-file');writeFileSync(extra,'foreign');assert.equal(exactMenuArtifact(context,copy),false,'extra image file');rmSync(extra);
 assert.equal(exactMenuArtifact(null,copy),false,'missing context');assert.equal(exactMenuArtifact({...context,packageRoot},copy),false,'wrong package root');
 const fake=join(scratch,'bad.tgz');writeFileSync(fake,readFileSync(tarball).subarray(0,2048));assert.equal(exactMenuArtifact({...context,tarball:fake},copy),false,'forged archive');
 assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy),null,'missing DI context');assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,copy,{artifactContext:{...context,tarball:fake}}),null,'forged DI archive');
 const peerDir=join(scratch,'peer/node_modules/@angular/material'),peerMeta=req.resolve('@angular/material/package.json'),peerMenu=req.resolve('@angular/material/menu');mkdirSync(join(peerDir,'fesm2022'),{recursive:true});copyFileSync(peerMeta,join(peerDir,'package.json'));copyFileSync(peerMenu,join(peerDir,'fesm2022/menu.mjs'));const anchor=join(scratch,'peer/anchor.js');
 assert.equal(exactMenuPeer(anchor),true,'clean copied peer image');const peerPath=join(peerDir,'fesm2022/menu.mjs');writeFileSync(peerPath,readFileSync(peerPath,'utf8')+'\n// foreign same-version peer');assert.equal(JSON.parse(readFileSync(join(peerDir,'package.json'))).version,'22.1.7');assert.equal(exactMenuPeer(anchor),false,'same-version modified peer rejected');
 const peerArtifact=join(scratch,'peer/package');cpSync(packageRoot,peerArtifact,{recursive:true,errorOnExist:true});const peerContext={tarball,packageRoot:peerArtifact,referenceRoot};assert.equal(exactMenuArtifact(peerContext,peerArtifact),true);assert.equal(await menuTriggerOwnedToken(trigger,param,loaded,peer,owned,peerArtifact,{artifactContext:peerContext}),null,'DI rejects actual same-version changed peer resolution');
 console.log(JSON.stringify({independent_full_copy_positive:true,reference_missing_wrong_rejected:true,reference_source_mutants_rejected:6,full_image_file_count:512,original_di_context_positive:true,mutated_sibling_fesm_rejected:true,stale_sourcefile_rejected:true,same_version_modified_peer_rejected:true,same_version_modified_peer_di_rejected:true,missing_wrong_forged_context_controls:5,scope:'finite a488 image and minimum peer provenance; no release claim'}));
}finally{rmSync(scratch,{recursive:true,force:true});}
