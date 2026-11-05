/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four exact CSS expectations; source/program/run authority belongs to callers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {legacyDatepickerButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const raw=readFileSync(new URL('../compatibility/rc/current-sass-legacy-retention-reference-v1.json',import.meta.url));
assert.equal(hash(raw),'38ff89f3707c959c91e9fe2da922c4d8bba29b41756350cc0238ea946f9c4342');
const original=JSON.parse(raw);assert.equal(original.compiler_calls,3);assert.equal(original.candidate_compiled,false);assert.equal(original.current_source_or_artifact_admission,false);
export const CURRENT_LEGACY_RETENTION_COMPARISON='finite-legacy-datepicker-ordinary-button-public-tokens';
const rows=new Map(original.cases.map(row=>[row.case_id,row]));assert.equal(rows.size,3);
export function currentLegacyRetentionExpectedCss(caseId){
 const id=caseId==='direct-legacy-color/fab'?'mixin-css/legacy-button-color':caseId,row=rows.get(id);assert.ok(row,'unowned retention CSS case');
 assert.equal(hash(row.css),row.css_sha256);assert.equal(Buffer.byteLength(row.css),row.css_bytes);
 const css=legacyDatepickerButtonExpectedCss({caseId:id,originalCss:row.css});assert.equal(typeof css,'string');return css;
}
export function currentLegacyRetentionMeasurement(caseId){
 const css=currentLegacyRetentionExpectedCss(caseId);return {css_sha256:hash(css),css_bytes:Buffer.byteLength(css),comparison:CURRENT_LEGACY_RETENTION_COMPARISON};
}
/** The existing retained legacy-color program, with its complete CSS retained. */
export function compileCurrentLegacyRetentionColor({root,body}){
 assert.equal(typeof body,'string');const row=rows.get('mixin-css/legacy-button-color');
 const head="@use '__entry__' as m;\n",tail='\n'+row.call+'\n';assert.ok(row.program.startsWith(head)&&row.program.endsWith(tail));
 const theme=row.program.slice(head.length,-tail.length).replaceAll('m.define-typography-config()','contract_typography.define-typography-config()').replaceAll('m.define-','contract_model.define-').replaceAll('m.$','contract_palette.$');
 const prefix="@use '../core/theming/theming' as contract_model;\n@use '../core/theming/palette' as contract_palette;\n@use '../core/typography/typography' as contract_typography;\n";
 const program=prefix+body+'\n'+theme+'\n.sass-api-probe { @include color($__theme); }\n';
 assert.equal(hash(program),'b436295d657c1c669464aaae3fa61f6e430ec2174d6e37a788ccaa60022ab977');
 const sass=createRequire(join(root,'package.json'))('sass');assert.equal(sass.info,original.compiler);
 const compiled=sass.compileString(program,{url:pathToFileURL(join(root,'projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss')),style:'expanded',loadPaths:[join(root,'node_modules')],silenceDeprecations:['import','if-function','global-builtin','color-functions','mixed-decls','slash-div'],logger:{warn(){},debug(){}}});
 return {program_sha256:hash(program),css:compiled.css,css_sha256:hash(compiled.css),css_bytes:Buffer.byteLength(compiled.css)};
}
