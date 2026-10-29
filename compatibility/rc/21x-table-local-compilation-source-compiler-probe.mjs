/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Compile only the three actual owned row declarations, before/after a local literal. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';

const root=process.cwd(),require=createRequire(join(root,'package.json')),ts=require('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const rowPath='projects/ngx-material-legacy/legacy-table/row.ts';
const originalPath='compatibility/rc/21x-table-local-compilation-source-originals.json.gz';
const read=path=>readFileSync(join(root,path)),source=read(rowPath).toString();
const originalRaw=read(originalPath);
assert.equal(hash(originalRaw),'014157272208f6bf74e690f0d32684328b7efded3141d653037c7ac2a65ef137');
const original=JSON.parse(gunzipSync(originalRaw));
const parse=(name,body)=>ts.createSourceFile(name,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
function constant(body,name){
  const sf=parse('reference.ts',body),found=[];
  for(const statement of sf.statements)if(ts.isVariableStatement(statement)){
    for(const declaration of statement.declarationList.declarations)if(declaration.name.getText(sf)===name){
      assert.ok(declaration.initializer&&ts.isStringLiteralLike(declaration.initializer));
      found.push(declaration.initializer.text);
    }
  }
  assert.equal(found.length,1);return found[0];
}
const rowTemplate=constant(original.sections[0].after.body,'ROW_TEMPLATE');
assert.equal(rowTemplate,constant(original.tagged_reference.members.find(m=>m.path==='src/cdk/table/row.ts').body,'CDK_ROW_TEMPLATE'));
const sf=parse(rowPath,source),names=['MatLegacyHeaderRow','MatLegacyFooterRow','MatLegacyRow'];
const declarations=names.map(name=>{
  const found=sf.statements.filter(node=>ts.isClassDeclaration(node)&&node.name?.text===name);
  assert.equal(found.length,1);assert.equal(found[0].members.length,0);
  const text=found[0].getText(sf);assert.equal((text.match(/template: CDK_ROW_TEMPLATE/g)??[]).length,1);
  return text;
}).join('\n\n');
const imports="import {Component,ChangeDetectionStrategy,ViewEncapsulation,NgModule} from '@angular/core';\n"+
  "import {CDK_ROW_TEMPLATE,CdkHeaderRow,CdkFooterRow,CdkRow,CdkTableModule} from '@angular/cdk/table';\n";
const moduleDeclaration='\n@NgModule({imports:[CdkTableModule],declarations:['+names.join(',')+'],exports:['+names.join(',')+']})\nexport class ExtractedLegacyRowModule {}\n';
const before=imports+'\n'+declarations+moduleDeclaration;
const after=imports.replace('CDK_ROW_TEMPLATE,','')+'\nconst ROW_TEMPLATE = '+JSON.stringify(rowTemplate)+';\n\n'+declarations.replaceAll('template: CDK_ROW_TEMPLATE','template: ROW_TEMPLATE')+moduleDeclaration;
const packageNames=['@angular/compiler-cli','@angular/compiler','@angular/core','@angular/cdk','typescript'];
const packages=packageNames.map(name=>{
  const path=relative(root,require.resolve(name+'/package.json')),raw=read(path);
  return {name,path,sha256:hash(raw),bytes:raw.length,version:JSON.parse(raw).version};
});
assert.deepEqual(packages.map(p=>p.version),['21.2.23','21.2.23','21.2.23','21.2.14','5.9.2']);
const cliManifest=require.resolve('@angular/compiler-cli/package.json');
const cli=resolve(dirname(cliManifest),JSON.parse(readFileSync(cliManifest)).bin.ngc);
const cache=join(root,'.cache');mkdirSync(cache,{recursive:true});
const temporary=mkdtempSync(join(cache,'table-local-source-'));
const cells=[];
try{
  for(const mode of ['partial','experimental-local'])for(const [variant,fixture]of [['before',before],['after',after]]){
    const cell=join(temporary,mode+'-'+variant);mkdirSync(cell);
    const config={compilerOptions:{target:'es2022',module:'es2022',moduleResolution:'bundler',experimentalDecorators:true,strict:true,skipLibCheck:false,types:[],lib:['es2022','dom'],declaration:true,noEmitOnError:true,outDir:'out'},angularCompilerOptions:{compilationMode:mode,strictTemplates:true},files:['rows.ts']};
    writeFileSync(join(cell,'rows.ts'),fixture);writeFileSync(join(cell,'tsconfig.json'),JSON.stringify(config,null,2)+'\n');
    const start=performance.now();
    const execution=spawnSync(process.execPath,[cli,'-p',join(cell,'tsconfig.json'),'--pretty','false'],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
    assert.equal(execution.error,undefined,String(execution.error));assert.equal(execution.signal,null);
    const outputs=[];
    function collect(path){for(const entry of readdirSync(path,{withFileTypes:true})){
      const absolute=join(path,entry.name);if(entry.isDirectory())collect(absolute);else if(entry.isFile()){
        const raw=readFileSync(absolute);outputs.push({path:relative(cell,absolute),sha256:hash(raw),bytes:raw.length,body:raw.toString()});
      }
    }}
    if(execution.status===0)collect(join(cell,'out'));
    cells.push({mode,variant,strictTemplates:true,fixture,fixture_sha256:hash(fixture),config,exit_code:execution.status,seconds:Math.round((performance.now()-start)*1000)/1000000,stdout:execution.stdout,stderr:execution.stderr,outputs});
    console.log(JSON.stringify({mode,variant,exit_code:execution.status,outputs:outputs.length,seconds:cells.at(-1).seconds}));
  }
  const report={schema_version:1,line:'21.x',role:'Small extracted-row actual pinned compiler experiment; no whole owned-module or consumer acceptance',node:process.version,producer:{path:relative(root,new URL(import.meta.url).pathname),sha256:hash(readFileSync(new URL(import.meta.url)))},owned_row_source:{path:rowPath,sha256:hash(source),bytes:Buffer.byteLength(source)},originals:{path:originalPath,sha256:hash(originalRaw),bytes:originalRaw.length},packages,compiler_entry:{path:relative(root,cli),sha256:hash(readFileSync(cli))},actual_command:[process.execPath,relative(root,cli),'-p','<temporary-cell>/tsconfig.json','--pretty','false'],exact_extracted_classes:names,row_template:rowTemplate,row_template_matches_untouched16:true,cells,product_changes:0,workspace_build_executed:false,consumer_build_executed:false,native_or_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
  assert.equal(process.argv.length,3);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}finally{rmSync(temporary,{recursive:true,force:true});}
