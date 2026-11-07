/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {createRequire} from 'node:module';
import {readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [root, workspace, peerRoot] = process.argv.slice(2);
const esbuild = createRequire(join(workspace, 'package.json'))('esbuild');
const req = createRequire(realpathSync(join(peerRoot, '@angular/compiler-cli/package.json')));
const {transformSync} = req('@babel/core');
const linkerPlugin = req('@angular/compiler-cli/linker/babel').default;
const {needsLinking} = req('@angular/compiler-cli/linker');
let linked = 0;
const result = await esbuild.build({absWorkingDir:root, entryPoints:['out/main.js'], bundle:true, format:'iife', outfile:'dist/app.js', platform:'browser', metafile:true, sourcemap:'external', plugins:[{name:'angular-linker', setup(build){build.onLoad({filter:/\.m?js$/}, args => {
  const source=readFileSync(args.path,'utf8');
  if (!source.includes('ɵɵngDeclare') || !needsLinking(args.path,source)) return null;
  linked++;
  return {contents:transformSync(source,{filename:args.path,configFile:false,babelrc:false,plugins:[[linkerPlugin,{linkerJitMode:false}]]}).code,loader:'js'};
});}}]});
if (!linked || !Object.keys(result.metafile.inputs).some(p=>p.includes('ngx-compat-material-legacy-legacy-form-field.mjs'))) throw Error('Packed form-field module was not linked into the bundle');
writeFileSync(join(root,'dist/metafile.json'),JSON.stringify(result.metafile,null,2));
