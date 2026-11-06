/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {dialogFocusFiniteSourceSuccessor} from '../scripts/dialog-focus-finite-source-successor.mjs';
const sourceRoot=process.cwd(),line=JSON.parse(readFileSync(join(sourceRoot,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
const sourceRead=path=>readFileSync(join(sourceRoot,path));
const source=dialogFocusFiniteSourceSuccessor({root:sourceRoot,line,read:sourceRead});
const sandbox=mkdtempSync(join(tmpdir(),'dialog-focus-late-physical-'));
const copy=path=>{const target=join(sandbox,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,sourceRead(path));};
try{
 for(const ref of source.bound)copy(ref.path);
 copy('projects/ngx-material-legacy/package.json');copy('node_modules/@angular/core/package.json');
 const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:sourceRoot,encoding:'utf8'}).trim();
 writeFileSync(join(sandbox,'.git'),'gitdir: '+gitDir+'\n');
 const read=path=>readFileSync(join(sandbox,path));
 const subject=dialogFocusFiniteSourceSuccessor({root:sandbox,line,read});
 const row=subject.packet.branches[line].transitions[0],old={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes};
 const productPath=join(sandbox,row.path),productBytes=read(row.path);
 try{writeFileSync(productPath,'late product corruption');assert.throws(()=>subject.qualify(old),/changed physical focus member/);assert.throws(()=>subject.historicalReference(subject.packet.branches[line].transitions[0].after),/changed physical focus member/);}finally{writeFileSync(productPath,productBytes);}
 subject.assertCurrent();
 const declaration=subject.bound.find(ref=>ref.path.endsWith('/core.d.ts'));
 assert.ok(declaration,'minimum peer declaration absent from public bound');
 const declarationPath=join(sandbox,declaration.path),declarationBytes=read(declaration.path);
 try{writeFileSync(declarationPath,'late declaration corruption');assert.throws(()=>subject.assertCurrent(),/changed physical focus member/);assert.throws(()=>subject.qualify(old),/changed physical focus member/);}finally{writeFileSync(declarationPath,declarationBytes);}
 subject.assertCurrent();
 let mutated=false;
 try{assert.throws(()=>dialogFocusFiniteSourceSuccessor({root:sandbox,line,read:path=>{const bytes=read(path);if(!mutated&&path==='scripts/dialog-focus-finite-source-successor.mjs'){writeFileSync(declarationPath,'callback declaration corruption');mutated=true;}return bytes;}}),/changed physical focus member/);}finally{writeFileSync(declarationPath,declarationBytes);}
 assert.ok(mutated);subject.assertCurrent();
 console.log(JSON.stringify({line,late_product_rejected:true,late_declaration_rejected:true,cross_callback_declaration_rejected:true,peer_declarations_in_bound:subject.bound.filter(ref=>ref.path.startsWith('node_modules/@angular/core/types/')).length}));
}finally{rmSync(sandbox,{recursive:true,force:true});}
