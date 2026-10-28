/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One reviewed peer/compile input owner for native browser fixtures. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {floorConfigurations} from './consumer-floor-roster.mjs';
const plan=JSON.parse(readFileSync(new URL('../compatibility/rc/consumer-floor-plan.json',import.meta.url)));
export function readBrowserPackedPackage(tarball){
 assert.equal(typeof tarball,'string');
 const result=spawnSync('tar',['-xOzf',tarball,'package/package.json'],{encoding:'utf8',maxBuffer:1024*1024});
 assert.equal(result.status,0,(result.stderr||'unable to read packed package.json').slice(-500));
 return JSON.parse(result.stdout);
}
export function browserLibraryLine(pkg){
 assert.equal(pkg?.name,'@ngx-compat/material-legacy','browser requires the identified legacy library');
 assert.equal(typeof pkg.version,'string');
 const match=pkg.version.match(/^(21|22)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
 assert.ok(match,'unsupported browser library version');return match[1]==='21'?'21.x':'main';
}
export function browserPeerVersions(pkg,{rxjsProfile='minimum',expectedLine}={}){
 const line=browserLibraryLine(pkg);assert.equal(typeof pkg.engines?.node,'string');
 if(expectedLine!==undefined){assert.ok(['21.x','main'].includes(expectedLine));assert.equal(line,expectedLine,'browser artifact line differs from source runner');}
 assert.ok(['minimum','current'].includes(rxjsProfile),'unreviewed browser RxJS profile');
 // This authenticates the advertised exact floor ranges through the existing
 // shared source policy, including both maintained lines and RxJS alternatives.
 floorConfigurations(plan,line,pkg);
 const row=plan.lines[line];
 return {core:row.framework,cdk:row.cdk,material:row.material,
  rxjs:rxjsProfile==='minimum'?plan.rxjs_minima[0]:plan.current_configuration.rxjs,
  typescript:plan.current_configuration.typescript_by_line[line],
  zone:line==='main'?'0.16.3':'0.15.1',tslib:'2.8.1',sass:'1.104.1'};
}
export function browserConsumerDependencies(versions,{zoneless=false,librarySpec,sass=false}={}){
 assert.equal(typeof zoneless,'boolean');assert.equal(typeof sass,'boolean');
 if(librarySpec!==undefined)assert.ok(typeof librarySpec==='string'&&librarySpec.startsWith('file:'));
 const dependencies={
  '@angular/cdk':versions.cdk,'@angular/common':versions.core,'@angular/compiler':versions.core,
  '@angular/compiler-cli':versions.core,'@angular/core':versions.core,'@angular/forms':versions.core,
  '@angular/material':versions.material,'@angular/platform-browser':versions.core,
  '@angular/platform-browser-dynamic':versions.core,
  ...(librarySpec===undefined?{}:{'@ngx-compat/material-legacy':librarySpec}),rxjs:versions.rxjs,
  ...(sass?{sass:versions.sass}:{}),tslib:versions.tslib,typescript:versions.typescript,
 };
 if(!zoneless)dependencies['zone.js']=versions.zone;
 return dependencies;
}
export function browserCompilerOptions(versions){
 const options={target:'ES2022',module:'ES2022',moduleResolution:'bundler',experimentalDecorators:true,
  strict:true,skipLibCheck:false,lib:['ES2022','DOM'],rootDir:'src',outDir:'out',types:[]};
 if(Number(versions.typescript.split('.')[0])>=6)options.ignoreDeprecations='6.0';
 return options;
}
