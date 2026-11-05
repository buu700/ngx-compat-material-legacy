/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Source-proposal model only; grants no current artifact or reader admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const CASES_SHA='59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf';
const selectors=new Set(['.sass-api-probe .mat-mdc-card','.sass-argument-probe .mat-mdc-card','.ordinary-card-scope .sass-api-probe .mat-mdc-card','.ordinary-card-shadow .sass-argument-probe .mat-mdc-card']);
const oldColor=['--mdc-elevated-card-container-color','--mdc-elevated-card-container-elevation','--mdc-outlined-card-container-color','--mdc-outlined-card-outline-color','--mdc-outlined-card-container-elevation'];
const publicColor=['--mat-card-elevated-container-color','--mat-card-elevated-container-elevation','--mat-card-outlined-container-color','--mat-card-outlined-container-elevation','--mat-card-outlined-outline-color'];
const typeKeys=['title-text-font','title-text-line-height','title-text-size','title-text-tracking','title-text-weight','subtitle-text-font','subtitle-text-line-height','subtitle-text-size','subtitle-text-tracking','subtitle-text-weight'].map(k=>'--mat-card-'+k);
function block(text,selector,keys){const lines=text.split('\n');assert.equal(lines.length,keys.length+2);assert.equal(lines[0],selector+' {');assert.equal(lines.at(-1),'}');return keys.map((key,i)=>{const prefix='  '+key+': ';assert.ok(lines[i+1].startsWith(prefix)&&lines[i+1].endsWith(';'));const value=lines[i+1].slice(prefix.length,-1);assert.ok(value&&!/[;\n{}]/.test(value));return value;});}
/** Caller authenticates complete original before-image; this primitive checks its entire skeleton. */
export function positionedOrdinaryCardCss({dimension,selector,originalCss}){
 assert.ok(selectors.has(selector));assert.equal(typeof originalCss,'string');assert.ok(['color','theme','typography','density'].includes(dimension));
 if(dimension==='density'){assert.equal(originalCss,'');return originalCss;}
 const blocks=dimension==='theme'?originalCss.split('}\n'+selector+' {').map((x,i)=>i===0?x+'}':selector+' {'+x):[originalCss];
 if(dimension==='typography'){assert.equal(blocks.length,1);block(blocks[0],selector,typeKeys);return originalCss;}
 assert.equal(blocks.length,dimension==='theme'?2:1);const values=block(blocks[0],selector,[...oldColor,'--mat-card-subtitle-text-color']);assert.equal(values[0],values[2]);if(dimension==='theme')block(blocks[1],selector,typeKeys);
 const mapped=[values[0],values[1],values[2],values[4],values[3]];const suffix=publicColor.map((key,i)=>'  '+key+': '+mapped[i]+';').join('\n');const lines=blocks[0].split('\n');lines.splice(-2,0,...suffix.split('\n'));blocks[0]=lines.join('\n');return blocks.join('\n');
}
export function ordinaryCardPublicBridgeCss({caseId,originalCss}){
 const raw=readFileSync(new URL('./ordinary-card-public-bridge-original-cases-v1.json',import.meta.url));assert.equal(hash(raw),CASES_SHA);const packet=JSON.parse(raw),row=packet.cases.find(r=>r.case_id===caseId);assert.ok(row,'unknown finite ordinary card case');assert.equal(typeof originalCss,'string');assert.equal(originalCss,row.original.css);assert.equal(hash(originalCss),row.original.css_sha256);assert.equal(Buffer.byteLength(originalCss),row.original.css_bytes);return positionedOrdinaryCardCss({dimension:row.dimension,selector:row.selector,originalCss});
}
export function ordinaryCardPublicBridgeResultsMatch({caseId,original,actual}){
 try{const css=ordinaryCardPublicBridgeCss({caseId,originalCss:original.css});return original.css_sha256===hash(original.css)&&original.css_bytes===Buffer.byteLength(original.css)&&actual.css===css&&actual.css_sha256===hash(css)&&actual.css_bytes===Buffer.byteLength(css);}catch{return false;}
}
