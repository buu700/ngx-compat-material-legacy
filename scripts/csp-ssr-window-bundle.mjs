/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const peerDigest='67ea7cb295583cb5ccf8d0472c6631cb10d7b81092dca8d7c46c46a9272bcfb4';
const before='class CdkVirtualScrollableWindow extends CdkVirtualScrollable {\n  constructor() {\n    super();\n    const document = inject(DOCUMENT);';
const prefix='class CdkVirtualScrollableWindow extends CdkVirtualScrollable {\n  constructor() {\n    super();\n    console.error("__WINDOW_CTOR_GLOBAL__" + typeof globalThis.document);\n    ';
export function transformWindowPeer(source,mode){
 if(!['current','instrumented','mutant'].includes(mode))throw Error('invalid window server mode');
 if(createHash('sha256').update(source).digest('hex')!==peerDigest||source.split(before).length!==2)throw Error('unexpected peer or window constructor');
 return mode==='current'?source:source.replace(before,prefix+(mode==='mutant'?'':'const document = inject(DOCUMENT);'));
}
export async function bundleWindowServer(consumer,mode,outfile){
 if(!['current','instrumented','mutant'].includes(mode))throw Error('invalid window server mode');
 const require=createRequire(join(root,'package.json')),esbuild=require('esbuild'),linkerRequire=createRequire(join(consumer,'node_modules/@angular/compiler-cli/package.json'));
 const {transformSync}=linkerRequire('@babel/core'),linkerPlugin=linkerRequire('@angular/compiler-cli/linker/babel').default,{needsLinking}=linkerRequire('@angular/compiler-cli/linker');let matches=0;
 await esbuild.build({absWorkingDir:consumer,entryPoints:[join(consumer,'server-out/render-table-window-scroll.js')],bundle:true,format:'esm',platform:'node',outfile,logLevel:'silent',plugins:[{name:'window-source-and-linker',setup(build){build.onLoad({filter:/\.m?js$/},args=>{
  let source=readFileSync(args.path,'utf8');
  if(args.path.endsWith('/@angular/cdk/fesm2022/scrolling.mjs')){
   source=transformWindowPeer(source,mode);
   matches++;
  }
  if(source.includes('ɵɵngDeclare')&&needsLinking(args.path,source)){const linked=transformSync(source,{filename:args.path,compact:false,configFile:false,babelrc:false,plugins:[[linkerPlugin,{linkerJitMode:false}]]});return{contents:linked.code,loader:'js'};}
  return{contents:source,loader:'js'};
 });}}]});
 if(matches!==1)throw Error('window constructor was not bound exactly once');
 return{mode,peer_sha256:peerDigest,bundle_sha256:createHash('sha256').update(readFileSync(outfile)).digest('hex')};
}
