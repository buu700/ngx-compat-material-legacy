const ts=require('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/node_modules/typescript');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const base=__dirname, info=JSON.parse(fs.readFileSync(base+'/runtime.json')), historical='/home/parallels/.codex/closeout-state/2026-11-07-recovery/api-contract-owner-v1/material16/package', owned=info.consumer+'/node_modules/@ngx-compat/material-legacy/types';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cases={
 paginatorPlain:['paginator','class Child extends MatLegacyPaginator {}'],
 paginatorCollision:['paginator','class Child extends MatLegacyPaginator { private _handlePageSizeTargetClick(e: string): void {} }'],
 paginatorSuper:['paginator','class Child extends MatLegacyPaginator { protected override _handlePageSizeTargetClick(e: MouseEvent): void { super._handlePageSizeTargetClick(e); } }'],
 bodyPlain:['tabs','abstract class Child extends _MatLegacyTabBodyBase {}'],
 bodyHookCollision:['tabs','abstract class Child extends _MatLegacyTabBodyBase { ngAfterViewInit(x: string): void {} }'],
 bodyGetterCollision:['tabs','abstract class Child extends _MatLegacyTabBodyBase { _contentIsVisible: string = "x"; }'],
 bodyHookSuper:['tabs','abstract class Child extends _MatLegacyTabBodyBase { override ngAfterViewInit(): void { super.ngAfterViewInit(); } }'],
 bodyGetterSuper:['tabs','abstract class Child extends _MatLegacyTabBodyBase { override get _contentIsVisible(): boolean { return super._contentIsVisible; } }']};
const result={typescript:ts.version,scope:'strict subclass typing; skipLibCheck; Material 16 declarations resolved with current dependency types, not an Angular 16 consumer',cases:{}};
for(const [key,[family,body]] of Object.entries(cases)) { result.cases[key]={}; for(const kind of ['historical','owned']) {
 const file=path.join(base,'fixture.ts');fs.writeFileSync(file,`import {${family==='tabs'?'_MatLegacyTabBodyBase':'MatLegacyPaginator'}} from 'target-package';\n${body}\n`);
 const declaration=kind==='historical'?`${historical}/legacy-${family}/index.d.ts`:`${owned}/ngx-compat-material-legacy-legacy-${family}.d.ts`;
 const options={strict:true,skipLibCheck:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,paths:{'target-package':[declaration],'@angular/material/tabs':[`${historical}/tabs/index.d.ts`],'@angular/material/paginator':[`${historical}/paginator/index.d.ts`],'*':[`${info.consumer}/node_modules/*`]}};
 const prog=ts.createProgram([file],options);const diags=ts.getPreEmitDiagnostics(prog).filter(d=>d.file?.fileName===file).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')})); result.cases[key][kind]={declaration,sha256:hash(declaration),diagnostics:diags};
 }}
fs.unlinkSync(base+'/fixture.ts');
for(const k of ['paginatorPlain','bodyPlain'])for(const v of Object.values(result.cases[k]))assert.equal(v.diagnostics.length,0,k);
for(const k of ['paginatorCollision','bodyHookCollision','bodyGetterCollision']){assert.equal(result.cases[k].historical.diagnostics.length,0,k);assert.ok(result.cases[k].owned.diagnostics.some(d=>d.code===2415||d.code===2416),k);}
for(const k of ['paginatorSuper','bodyHookSuper','bodyGetterSuper']){assert.ok(result.cases[k].historical.diagnostics.length,k);assert.equal(result.cases[k].owned.diagnostics.length,0,k);}
fs.writeFileSync(base+'/subclass-result.json',JSON.stringify(result,null,2)+'\n');
