/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from '../../../scripts/authored-use-inventory.mjs';
const read=p=>{try{return readFileSync(p)}catch{return null}}, hash=x=>createHash('sha256').update(x).digest('hex');
const roster=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const delta=JSON.parse(read('compatibility/rc/residual-eleven-v2/row-reference-delta.json'));
const key=x=>JSON.stringify([x.file,x.module,x.symbol]), selected=new Set(delta.rows.map(key));
const rows=roster.symbol_uses.filter(x=>selected.has(key(x))).map(x=>({...x,source_review:delta.source_review}));
if(rows.length!==11||selected.size!==11) throw Error('wrong row population');
const evaluate=fn=>authoredUseReviewEvidence({symbol_uses:rows},'main',fn,hash);
const positive=evaluate(read);
const broken=evaluate(p=>p==='compatibility/rc/residual-eleven/source-lineage.json'?Buffer.from('fault'):read(p));
const sourceFault=evaluate(p=>p==='projects/ngx-material-legacy/legacy-input/input.ts'?Buffer.from('fault'):read(p));
const recovered=evaluate(read);
if(positive.reviewed!==11||broken.insufficient!==11||sourceFault.insufficient!==2||recovered.reviewed!==11)throw Error('source control failed');
console.log(JSON.stringify({positive,changed_lineage:broken,changed_input_source:sourceFault,recovery:recovered,scope:'Ordinary finite review validator only. This is not physical guard, product, runtime or G11 qualification.'},null,2));
