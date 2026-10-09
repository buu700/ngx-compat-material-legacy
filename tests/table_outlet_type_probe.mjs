/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Strict owned-source and public outlet-protocol diagnostic; native/AOT separate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT || root;
const ts = createRequire(import.meta.url)('typescript');
const path = 'projects/ngx-material-legacy/legacy-table/internal/table-outlet.ts',ownerPath='projects/ngx-material-legacy/legacy-table/internal/definition-owner.ts';
const fixture = resolve(root, '__table_outlet_protocol_diagnostic__.ts');
let positive = `import {_LegacyTableOutlet} from '${resolve(root, path)}';
import {_LegacyTableDefinitionOwner} from '${resolve(root,ownerPath)}';
import {CdkTable, CdkColumnDef, CdkHeaderRowDef, CdkFooterRowDef, CdkRowDef} from '@angular/cdk/table';
import {ElementRef, ViewContainerRef} from '@angular/core';
declare const table:CdkTable<unknown>, container:ViewContainerRef, element:ElementRef;
const outlet = new _LegacyTableOutlet(table, container, element);
table._rowOutlet=outlet; table._headerRowOutlet=outlet; table._footerRowOutlet=outlet; table._noDataRowOutlet=outlet;
table._outletAssigned();
outlet.kind='header'; outlet.kind='data'; outlet.kind='footer'; outlet.kind='empty'; outlet.ngOnInit();
declare const column:CdkColumnDef, header:CdkHeaderRowDef, footer:CdkFooterRowDef, row:CdkRowDef<unknown>;
new _LegacyTableDefinitionOwner(table,column,header,footer,row);
new _LegacyTableDefinitionOwner(null,null,null,null,null);
`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const subjects=JSON.parse(readFileSync(resolve(root,'compatibility/rc/table-public-module-import-source-proof.json'),'utf8')).subjects;
const publicProtocols=[];
for(const [index,subject] of subjects.entries()) {
  const member=subject.members.find(m=>m.path.endsWith('.d.ts')),raw=readFileSync(resolve(root,member.path));
  assert.equal(sha(raw),member.sha256);
  const source=ts.createSourceFile(member.path,raw.toString(),ts.ScriptTarget.Latest,true);
  const cls=name=>source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);
  const selected=[];
  for(const name of ['HeaderRowOutlet','DataRowOutlet','FooterRowOutlet','NoDataRowOutlet']) {
    const declaration=cls(name);assert.ok(declaration);
    const members=declaration.members.filter(m=>['viewContainer','elementRef'].includes(m.name?.getText(source)));
    assert.equal(members.length,2);
    selected.push(`export class ${name} {${members.map(m=>m.getText(source)).join('\n')}}`);
  }
  const table=cls('CdkTable');assert.ok(table);
  const names=['_headerRowOutlet','_rowOutlet','_footerRowOutlet','_noDataRowOutlet','_outletAssigned'];
  const members=table.members.filter(m=>names.includes(m.name?.getText(source)));assert.equal(members.length,5);
  for(const member of [table,...members,...['CdkColumnDef','CdkHeaderRowDef','CdkFooterRowDef','CdkRowDef'].map(name=>{
    const declaration=cls(name);assert.ok(declaration);
    const member=declaration.members.find(m=>m.name?.getText(source)==='_table');assert.ok(member);return member;
  })]) {
    assert.equal((member.modifiers||[]).some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)),false);
    assert.doesNotMatch((member.jsDoc||[]).map(d=>d.getText(source)).join('\n'),/@(?:docs-private|deprecated|breaking-change)/);
  }
  selected.push(`export class CdkTable {${members.map(m=>m.getText(source)).join('\n')}}`);
  positive+=`\ndeclare namespace Minimum${index} {${selected.join('\n')}}
declare const table${index}:Minimum${index}.CdkTable;
table${index}._rowOutlet=outlet;table${index}._headerRowOutlet=outlet;table${index}._footerRowOutlet=outlet;table${index}._noDataRowOutlet=outlet;
table${index}._outletAssigned();\n`;
  publicProtocols.push({line:subject.line,version:subject.version,declaration_sha256:member.sha256,selected_declarations:selected,
    public_unmarked_members:names,definition_owner_members:['CdkColumnDef._table','CdkHeaderRowDef._table','CdkFooterRowDef._table','CdkRowDef._table']});
}
const negative = positive + '\noutlet.kind="unknown";table._rowOutlet={viewContainer:container};new _LegacyTableOutlet(table,element,container);';
const options = {strict:true,noImplicitOverride:true,strictPropertyInitialization:false,noEmit:true,
  skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
  moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,allowImportingTsExtensions:true};
function compile(text) {
  const host=ts.createCompilerHost(options), read=host.readFile.bind(host), exists=host.fileExists.bind(host);
  host.readFile=p=>p===fixture?text:read(p);host.fileExists=p=>p===fixture||exists(p);
  host.resolveModuleNames=(names,from)=>names.map(name=>ts.resolveModuleName(name,
    name.startsWith('.')||name.startsWith('/')?from:runtime+'/source.ts',options,host).resolvedModule);
  return ts.getPreEmitDiagnostics(ts.createProgram([fixture],options,host)).map(d=>({
    path:d.file?.fileName,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
}
const good=compile(positive),bad=compile(negative);
assert.deepEqual(good,[]);assert.deepEqual(bad.map(d=>d.code).sort(),[2322,2345,2741]);
const args=process.argv.slice(2),at=args.indexOf('--report');
const result={node:process.version,compiler:ts.version,options,
  sources:[path,ownerPath].map(path=>({path,sha256:sha(readFileSync(resolve(root,path)))})),positive_fixture:positive,
  positive_diagnostics:good,negative_fixture:negative,expected_negative_diagnostics:bad,public_protocols:publicProtocols,
  limits:['Actual owned source plus borrowed public peer declarations; not actual21 compiler/runtime or native/AOT/packed qualification.']};
if(at>=0)writeFileSync(args[at+1],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({positive:good.length,expected_negative:bad.length}));
