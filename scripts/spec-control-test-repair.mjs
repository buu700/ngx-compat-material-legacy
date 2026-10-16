/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Append missing owned regressions without changing any retained case or fixture template. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const parents={main:'804b5c68b177c8eff2ed0fdac92caa73d5e9aaf1','21.x':'58a2faabf1216f6b271f1c688c8861504f55489e'};
export const CONTROL_TEST_ADDITIONS=[{
 path:'projects/ngx-material-legacy/legacy-table/table-data-source.spec.ts',before_sha256:'8ca96a3436189c60c375b15bc12dc6c2c36e07f18e8a6cdad5062b5b019285bb',
 subject:'307ad0c8abf346232796e17ca7b05e4673ef9ac5',describe_path:['MatTableDataSource','sort'],name:'should be able to correctly sort an array of strings and numbers with left zero',
 code:`    it('should be able to correctly sort an array of strings and numbers with left zero', () => {
      testSortWithValues([
        '001',
        '2',
        3,
        4,
        'apples',
        'bananas',
        'cherries',
        'lemons',
        'strawberries',
      ]);
    });\n`,
},{
 path:'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',before_sha256:'5731c5c75f794e504cdb52194ab4e7cc02de3d68128870ffe99d2a4e525ddb54',
 subject:'86a5ab09440815c360adcae82d8662c718ba9974',describe_path:['MatAutocomplete'],name:'should not throw errors when closing without options',
 code:`  it('should not throw errors when closing without options', fakeAsync(() => {
    const fixture = createComponent(SimpleAutocomplete);
    fixture.componentInstance.filteredStates = fixture.componentInstance.states = [];
    fixture.detectChanges();
    expect(fixture.componentInstance.options.length).toBe(0);
    const trigger = fixture.componentInstance.trigger;

    trigger.openPanel();
    expect(() => trigger.closePanel()).not.toThrow();
    fixture.destroy();
  }));\n`,
}];
for(const row of CONTROL_TEST_ADDITIONS){Object.freeze(row.describe_path);Object.freeze(row);}
Object.freeze(CONTROL_TEST_ADDITIONS);
const parse=text=>{const file=ts.createSourceFile('candidate.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const cases=file=>{const found=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='it')found.push({name:node.arguments[0].text,text:node.getText(file)});ts.forEachChild(node,visit);}visit(file);return found;};
export function proposeControlTestAddition(before,row){
 assert.ok(CONTROL_TEST_ADDITIONS.includes(row),'unregistered owned test addition');assert.equal(hash(before),row.before_sha256,'unreviewed preceding candidate source');
 const file=parse(before);let block=file;
 for(const name of row.describe_path){const found=block.statements.filter(ts.isExpressionStatement).map(node=>node.expression).filter(node=>ts.isCallExpression(node)&&node.expression.getText(file)==='describe'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===name);assert.equal(found.length,1);assert.ok(ts.isArrowFunction(found[0].arguments[1])&&ts.isBlock(found[0].arguments[1].body));block=found[0].arguments[1].body;}
 const offset=before.lastIndexOf('\n',block.end-1)+1,inserted='\n'+row.code,proposed=before.slice(0,offset)+inserted+before.slice(offset);
 assert.equal(proposed.slice(0,offset)+proposed.slice(offset+inserted.length),before,'non-append source change');
 const old=cases(file),next=cases(parse(proposed));assert.ok(!old.some(test=>test.name===row.name));assert.equal(next.length,old.length+1);assert.deepEqual(next.filter(test=>test.name!==row.name),old,'existing case body/order changed');
 return {source:proposed,insertion_offset:offset,inserted_text:inserted,before_cases:old.length,after_cases:next.length};
}
export function inspectControlTestRepair({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main',env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const rows=CONTROL_TEST_ADDITIONS.map(row=>{const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parents[line]+':'+row.path],{cwd:root,env,maxBuffer:2*1024*1024}).toString(),proposal=proposeControlTestAddition(before,row),current=read(row.path).toString();assert.ok(current===before||current===proposal.source,'unreviewed current test source '+row.path);return {...row,...proposal,source:proposal.source,applied:current===proposal.source,after_sha256:hash(proposal.source)};});
 return {schema_version:1,line,source_parent:parents[line],rows,additional_cases:2,existing_case_bodies_order_and_templates_preserved:true,production_HTML_CSS_SCSS_or_TS_changes:0,historical_inventory_refresh_required:true,current_source_context_requalification_required:true,actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result=inspectControlTestRepair();if(process.argv.includes('--write')){for(const row of result.rows)writeFileSync(resolve(rootDefault,row.path),row.source);result=inspectControlTestRepair();}
 const report={...result,rows:result.rows.map(({source,...row})=>row),producer_sha256:hash(readFileSync(resolve(rootDefault,'scripts/spec-control-test-repair.mjs')))};
 const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:result.line,additional_cases:2,applied:result.rows.filter(row=>row.applied).length,existing_case_bodies_and_templates_preserved:true,context_requalification_required:true,actual_Angular_browser_native_packed_or_floor_qualified:false}));
}
