/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source and emitted field identity, not a runtime, floor or release gate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const ts=createRequire(process.cwd()+'/package.json')('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),git=(...a)=>execFileSync('git',['--no-replace-objects',...a],{env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:8*1024*1024});
const path='projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts',tag='compatibility/rc/pseudo-property-f9-sources/original-pseudo-checkbox.ts',original='compatibility/rc/pseudo-property-f9-sources/material-16-core.mjs',packed='compatibility/rc/pseudo-property-f9-sources/packed-25365-core.mjs';
assert.equal(hash(read(tag)),'a9c76e44bd88bf920b5fd77f309e3a841995193c8f2d5fead49b35e33a40ee37');assert.equal(hash(read(original)),'38b761eb8e9b43297942f6e1412469437bc3ee0291342a766b001f715061d175');assert.equal(hash(read(packed)),'ec891ee8e1fa0aeceeb1142eade590fca110ce70f505e3131ecbc0fff8c14d94');
const current=read(path),before=git('show','072f4c859af66724ee26621ad0f97d41043f3af2:'+path),after=git('show','f9aac126ea70fd83731b62305c07fdb993aa3334:'+path);assert.deepEqual(current,after);
const exact=before.toString().replace('  booleanAttribute,\n','').replace('@Input({transform: booleanAttribute}) disabled: boolean = false;','@Input() disabled: boolean = false;');assert.notEqual(exact,before.toString());assert.equal(exact,after.toString());
function field(text,cls){const sf=ts.createSourceFile('candidate.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(sf.parseDiagnostics.length,0);const c=sf.statements.filter(ts.isClassDeclaration).filter(x=>x.name?.text===cls);assert.equal(c.length,1);const p=c[0].members.filter(ts.isPropertyDeclaration).filter(x=>x.name?.getText(sf)==='disabled');assert.equal(p.length,1);const d=ts.getDecorators(p[0])||[];assert.equal(d.length,1);assert.equal(d[0].getText(sf),'@Input()');assert.equal(p[0].type.getText(sf),'boolean');assert.equal(p[0].initializer.kind,ts.SyntaxKind.FalseKeyword);return p[0].getText(sf)}
assert.equal(field(read(tag).toString(),'MatPseudoCheckbox'),field(current.toString(),'MatLegacyPseudoCheckbox'));
function token(text){assert.match(text,/import \{LEGACY_ANIMATION_MODE\} from '\.\.\/internal\/legacy-animations';/);assert.match(text,/@Inject\(LEGACY_ANIMATION_MODE\)/);assert.doesNotMatch(text,/ANIMATION_MODULE_TYPE/)}token(current.toString());
for(const [file,cls] of [[original,'MatPseudoCheckbox'],[packed,'MatLegacyPseudoCheckbox']]){const s=read(file).toString(),begin=s.indexOf('class '+cls+' {'),end=s.indexOf('class '+cls+'Module',begin);assert.ok(begin>=0&&end>begin);const segment=s.slice(begin,end);assert.match(segment,/(?:this\.)?disabled = false;/);assert.match(segment,/inputs: \{ state: "state", disabled: "disabled", appearance: "appearance" \}/);assert.match(segment,/disabled: \[\{\s*type: Input\s*\}\]/);}
const mutants=[];for(const [id,text] of [['transform-reintroduced',current.toString().replace('@Input() disabled:', '@Input({transform: booleanAttribute}) disabled:')],['default-changed',current.toString().replace('@Input() disabled: boolean = false;', '@Input() disabled: boolean = true;')],['wrong-field',current.toString().replace('@Input() disabled:', '@Input() other:')]]){assert.notEqual(text,current.toString());assert.throws(()=>field(text,'MatLegacyPseudoCheckbox'));mutants.push(id)}
const wrongToken=current.toString().replace('@Inject(LEGACY_ANIMATION_MODE)','@Inject(ANIMATION_MODULE_TYPE)');assert.notEqual(wrongToken,current.toString());assert.throws(()=>token(wrongToken));mutants.push('wrong-token');
console.log(JSON.stringify({tag_commit:'df60e733c60e572ba538f6ad0ceff3e63e527b53',current_commit:'f9aac126ea70fd83731b62305c07fdb993aa3334',original_source_sha256:hash(read(tag)),original_bundle_sha256:hash(read(original)),candidate_bundle_sha256:hash(read(packed)),archive_sha256:'25365d61d3caf5a3adb933e7ee84ea12e5d1facf9e574a1c7607a565680860c5',mutants,scope:'source and emitted metadata; native runtime/floors/G11 remain separate'}));
