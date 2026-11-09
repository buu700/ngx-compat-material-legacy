/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Static source witnesses for the fixture's exact 22.1.7 cascade assumptions.
 * These checks do not substitute for live computed-style measurements.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
const pins={dialog:'29309b44d3cdbb5ebf5185d45513ce204f1678a0cccdd64054ce20d1fba36727',form:'8796ccc010d8fa1862a78c3a799af465b989fecf19a90fb0a8859079a4777d85',input:'8310dfca1200ffd7e426ff64641e1794a2af9a4f1c1860a44a51ac8c6d638b69',legacy:'35b0726ed573b6e785dfc45274279d5b81d7bdd4e1164f90154e1c75692bea5f'};
function uniqueStyles(ts,path,text,required){const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),matches=[];assert.equal(sf.parseDiagnostics.length,0);function walk(n){if(ts.isStringLiteral(n)&&required.every(x=>n.text.includes(x)))matches.push(n.text);ts.forEachChild(n,walk);}walk(sf);assert.ok(matches.length>0,'missing component style payload '+path);const values=[...new Set(matches)];assert.equal(values.length,1,'ambiguous component style payload '+path);return values[0];}
export function checkDeclaredDialogSources({dialogCss,formCss,inputJs,legacyCss,themeCss}){
 for(const text of [dialogCss,formCss,inputJs,legacyCss,themeCss])assert.equal(typeof text,'string');
 for(const witness of ['.mat-mdc-dialog-surface {','.mat-mdc-dialog-title {\n  display: block;', 'margin: 0 0 1px;', 'padding: var(--mat-dialog-headline-padding, 6px 24px 13px);',
  'padding: var(--mat-dialog-content-padding, 20px 24px);', '.mat-mdc-dialog-container-with-actions .mat-mdc-dialog-content {\n  padding: var(--mat-dialog-with-actions-content-padding, 20px 24px 0);',
  '.mat-mdc-dialog-container .mat-mdc-dialog-title + .mat-mdc-dialog-content {\n  padding-top: 0;', '.mat-mdc-dialog-actions {', 'padding: var(--mat-dialog-actions-padding, 16px 24px);'])assert.ok(dialogCss.includes(witness),'missing current dialog witness '+witness);
 const inputRule=formCss.match(/\.mdc-text-field__input\s*\{([^}]*)\}/);assert.ok(inputRule&&/\bpadding:\s*0\s*;/.test(inputRule[1]),'current input padding changed');
 assert.ok(inputJs.includes('classAttribute: "mat-mdc-input-element"'));assert.ok(inputJs.includes('"class.mdc-text-field__input": "_isInFormField"'));
 for(const witness of ['.mat-dialog-container{display:block;padding:24px;', '.mat-dialog-content{display:block;margin:0 -24px;padding:0 24px;', '.mat-dialog-title{margin:0 0 20px;', '.mat-dialog-actions{padding:8px 0;', 'box-sizing:content-box;margin-bottom:-24px'])assert.ok(legacyCss.includes(witness),'missing owned dialog witness '+witness);
 assert.ok(themeCss.includes('--mat-sys-primary:'));assert.ok(themeCss.includes('.dp-current-optin .mat-mdc-dialog-surface'));assert.ok(themeCss.includes('.dp-legacy-optin .mat-mdc-dialog-surface'));
 assert.doesNotMatch(themeCss,/--mat-dialog-(?:headline-padding|content-padding|with-actions-content-padding|actions-padding)\s*:/,'theme changed peer padding defaults');
 return true;
}
/** Authenticate exact installed FESM source bytes and derive the expected cascade witnesses. */
export function inspectDialogPaddingSources({typescript:ts,nodeModules,packedRoot,themeCss,read=readFileSync}){
 const files={dialog:join(nodeModules,'@angular/material/fesm2022/dialog.mjs'),form:join(nodeModules,'@angular/material/fesm2022/_form-field-chunk.mjs'),input:join(nodeModules,'@angular/material/fesm2022/input.mjs'),legacy:join(packedRoot,'fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs')},texts={};
 for(const [key,path] of Object.entries(files)){const b=read(path);assert.equal(hash(b),pins[key],'changed dialog source image '+key);texts[key]=b.toString();}
 const dialogCss=uniqueStyles(ts,files.dialog,texts.dialog,['.mat-mdc-dialog-surface','.mat-mdc-dialog-actions']);
 const formCss=uniqueStyles(ts,files.form,texts.form,['.mat-mdc-form-field-infix','.mdc-text-field__input']);
 const legacyCss=uniqueStyles(ts,files.legacy,texts.legacy,['.mat-dialog-container{','.mat-dialog-actions{']);
 checkDeclaredDialogSources({dialogCss,formCss,inputJs:texts.input,legacyCss,themeCss});
 return {peer_dialog_sha256:pins.dialog,peer_form_field_sha256:pins.form,peer_input_sha256:pins.input,packed_legacy_dialog_sha256:pins.legacy,derived_from:'component FESM styles and fixture theme; input margin remains a Chromium UA observation',browser_observed:false};
}
