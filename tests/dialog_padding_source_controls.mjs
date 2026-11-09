/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Run after the build-only fixture: node tests/dialog_padding_source_controls.mjs <physical-consumer>.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectDialogPaddingSources,checkDeclaredDialogSources} from '../scripts/dialog-padding-source-contract.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'package.json')),ts=require('typescript'),consumer=resolve(process.argv[2]||''),modules=join(consumer,'node_modules'),packed=join(modules,'@ngx-compat/material-legacy');
assert.ok(process.argv[2]&&!process.argv[3],'physical consumer required');
const files={dialog:join(modules,'@angular/material/fesm2022/dialog.mjs'),form:join(modules,'@angular/material/fesm2022/_form-field-chunk.mjs'),input:join(modules,'@angular/material/fesm2022/input.mjs'),legacy:join(packed,'fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs')},themeCss=readFileSync(join(consumer,'dist/fixture.css'),'utf8');
const got=inspectDialogPaddingSources({typescript:ts,nodeModules:modules,packedRoot:packed,themeCss});assert.equal(got.browser_observed,false);
function styles(path,need){const sf=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),matches=[];function walk(n){if(ts.isStringLiteral(n)&&need.every(v=>n.text.includes(v)))matches.push(n.text);ts.forEachChild(n,walk);}walk(sf);const set=[...new Set(matches)];assert.equal(set.length,1);return set[0];}
const source={dialogCss:styles(files.dialog,['.mat-mdc-dialog-surface','.mat-mdc-dialog-actions']),formCss:styles(files.form,['.mat-mdc-form-field-infix','.mdc-text-field__input']),inputJs:readFileSync(files.input,'utf8'),legacyCss:styles(files.legacy,['.mat-dialog-container{','.mat-dialog-actions{']),themeCss};
assert.equal(checkDeclaredDialogSources(source),true);
const mutations=[['dialogCss','margin: 0 0 1px;','margin: 0 0 2px;'],['dialogCss','6px 24px 13px','6px 23px 13px'],['dialogCss','20px 24px 0','20px 24px 1px'],['dialogCss','padding-top: 0;','padding-top: 1px;'],['dialogCss','16px 24px','16px 23px'],['formCss','background: none;\n  padding: 0;','background: none;\n  padding: 1px;'],['inputJs','classAttribute: "mat-mdc-input-element"','classAttribute: "different-input"'],['legacyCss','.mat-dialog-content{display:block;margin:0 -24px;padding:0 24px;','.mat-dialog-content{display:block;margin:0 -23px;padding:0 24px;'],['legacyCss','.mat-dialog-actions{padding:8px 0;','.mat-dialog-actions{padding:9px 0;'],['themeCss','--mat-sys-primary:','--wrong-primary:']];
for(const [key,from,to] of mutations){assert.ok(source[key].includes(from),'mutation not applicable '+key);assert.throws(()=>checkDeclaredDialogSources({...source,[key]:source[key].replace(from,to)}),e=>e?.code==='ERR_ASSERTION');}
assert.throws(()=>checkDeclaredDialogSources({...source,themeCss:source.themeCss+'\nbody { --mat-dialog-actions-padding: 19px; }'}),e=>e?.code==='ERR_ASSERTION');
for(const path of Object.values(files))assert.throws(()=>inspectDialogPaddingSources({typescript:ts,nodeModules:modules,packedRoot:packed,themeCss,read:p=>p===path?Buffer.concat([readFileSync(p),Buffer.from('\n')]):readFileSync(p)}),e=>e?.code==='ERR_ASSERTION');
console.log(JSON.stringify({source_mutations_rejected:mutations.length+1,source_image_corruptions_rejected:4,browser_observed:false}));
