/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.cwd(),req=createRequire(join(root,'package.json')),sass=req('sass');
assert.equal(process.versions.node,JSON.parse(readFileSync(join(root,'toolchain-lock.json'))).repository.node);
assert.equal(JSON.parse(readFileSync(join(root,'node_modules/sass/package.json'))).version,JSON.parse(readFileSync(join(root,'package.json'))).devDependencies.sass);
const worksheet=JSON.parse(readFileSync(join(root,'compatibility/rc/sass-wrapper-notice-closeout-worksheet.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const modules=worksheet.scope.map(row=>({path:row.path,source:readFileSync(join(root,row.path)),name:row.path.split('/').at(-2)}));
const entry=pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')).href;
const imports=[`@use '${entry}' as legacy;`,...modules.map((m,i)=>`@use '${pathToFileURL(join(root,m.path)).href}' as wrapper${i};`)].join('\n');
const records=[];
for(const dark of [false,true]){
 const declarations=`$primary: legacy.define-palette(legacy.$indigo-palette);\n$accent: legacy.define-palette(legacy.$pink-palette);\n$typography: legacy.define-typography-config($font-family: 'Notice Diagnostic', $body-1: legacy.define-typography-level(16px, 24px, 600));\n$theme: legacy.define-${dark?'dark':'light'}-theme((color: (primary: $primary, accent: $accent), typography: $typography, density: ${dark?-2:0}));`;
 const source=imports+'\n'+declarations+'\n'+modules.map((m,i)=>`.notice-${m.name} { @include wrapper${i}.theme($theme); }`).join('\n');
 const warnings=[],result=sass.compileString(source,{url:pathToFileURL(join(root,'compatibility/rc/notice-fixture.scss')),loadPaths:[join(root,'node_modules')],style:'expanded',sourceMap:false,logger:{warn:(message,options)=>warnings.push({message,deprecation:options.deprecation}),debug(){}}});
 const loaded=result.loadedUrls.filter(u=>u.protocol==='file:'&&existsSync(fileURLToPath(u))).map(u=>realpathSync(fileURLToPath(u)));
 assert.ok(modules.every(m=>loaded.includes(realpathSync(join(root,m.path)))));
 for(const m of modules)assert.ok(result.css.includes('.notice-'+m.name),'missing emitted CSS '+m.name);
 records.push({name:dark?'dark-custom-typography-density-minus2':'light-custom-typography-density0',css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),warnings,loaded_modules:loaded.length,changed_wrappers_loaded:modules.length});
}
const report={schema_version:1,node:process.version,sass:sass.info,role:'Comment-only source before/after observations; no Material16 golden, packed, rendered or full C02 admission.',source_subjects:modules.map(m=>({path:m.path,sha256:hash(m.source),bytes:m.source.length})),records,actual_packed_rendered_or_floor_executed:false,g13_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:records.length,wrappers:modules.length,css_bytes:records.map(r=>r.css_bytes),warnings:records.map(r=>r.warnings.length),packed_or_rendered_qualified:false}));
