/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independently bound public type evidence;no service/caller runtime credit. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {a11yCallerSource} from './a11y-caller-contracts.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),unstable=new Set(['docs-private','deprecated','breaking-change','experimental','developerPreview']);
const pins={main:{path:'compatibility/rc/a11y-caller-public-types-main.json',sha256:'6f3d6b3d5e06430fd8dbab9c1bb91647e59ccfe554f2104e35347cc654336bfd'},'21.x':{path:'compatibility/rc/a11y-caller-public-types-21.json',sha256:'fafaac28c7346e019a65756a12c8dfa5cdfe13dd4f74289badcdb66006f8c13c'}};
export function qualifiedA11yCallerTypes({root=process.cwd(),read=raw(root)}={}){
 const source=a11yCallerSource({root,read}),line=source.prior.line,ref=pins[line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed a11y type proof');const proof=JSON.parse(bytes);assert.equal(proof.line,line);assert.equal(proof.source_parent,source.prior.source_parent);assert.equal(proof.source_files,118);assert.equal(source.sources.size,118);assert.equal(proof.source_closures,0);assert.equal(proof.actual_runtime_native_packed_AOT_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');assert.equal(proof.subjects.length,3);
 const inputs=new Map();for(const m of proof.inputs){assert.equal(inputs.has(m.path),false,'duplicate a11y type input');inputs.set(m.path,m.sha256);assert.equal(hash(read(m.path)),m.sha256,'changed a11y type input '+m.path);assert.ok(!m.path.includes('snack-dom-source-context'),'mutable shared-owner dependency in type proof');}
 for(const[path,text]of source.sources)assert.equal(inputs.get(path),hash(text),'missing raw current caller dependency');for(const m of source.metadata)assert.equal(inputs.get(m.path),m.sha256);
 const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']},seen=new Set(),names=['A11yModule','AriaDescriber','HighContrastModeDetector','LiveAnnouncer','FocusTrap','FocusTrapFactory','InteractivityChecker'];let selected;
 for(const s of proof.subjects){assert.ok(!seen.has(s.line));seen.add(s.line);assert.deepEqual([s.Core,s.CDK],versions[s.line]);assert.equal(s.strict,true);assert.equal(s.strictPropertyInitialization,false);assert.equal(s.noImplicitOverride,true);assert.equal(s.skipLibCheck,false);assert.equal(s.diagnostics,0);assert.equal(s.invalid_type_controls,3);assert.equal(s.SDK_rewrites,false);assert.deepEqual(s.symbols.map(r=>r.name),names);for(const symbol of s.symbols){if(s.line==='original'&&['FocusTrap','FocusTrapFactory'].includes(symbol.name))assert.deepEqual(symbol.tags,['deprecated','breaking-change']);else assert.ok(symbol.tags.every(t=>!unstable.has(t)),'unstable current public a11y class');assert.ok(symbol.declarations.length>0);}
  if(s.line===line){selected=s;assert.equal(s.current_source_files,118);assert.equal(s.actual_consumed_members.length,21);assert.equal(s.actual_resolved_calls.length,12);assert.deepEqual(s.selected_service_any_unknown_casts,[]);for(const m of [...s.actual_consumed_members,...s.actual_resolved_calls])assert.ok(m.tags.every(t=>!unstable.has(t)));assert.deepEqual([...new Set(s.actual_resolved_calls.map(c=>c.owner))].sort(),['AriaDescriber','FocusTrap','FocusTrapFactory','InteractivityChecker','LiveAnnouncer'].sort());assert.deepEqual([...new Set(s.actual_resolved_calls.map(c=>c.owner+'.'+c.member))].sort(),['AriaDescriber.describe','AriaDescriber.removeDescription','FocusTrap.destroy','FocusTrap.focusInitialElement','FocusTrapFactory.create','InteractivityChecker.isFocusable','LiveAnnouncer.announce','LiveAnnouncer.clear'].sort());}else{assert.equal(s.current_source_files,0);assert.deepEqual(s.actual_consumed_members,[]);assert.deepEqual(s.actual_resolved_calls,[]);}
 }
 assert.deepEqual([...seen].sort(),Object.keys(versions).sort());assert.ok(selected);return{source,proof,ref,selected,source_closures_prepared:0,actual_runtime_native_packed_AOT_or_full_floor_qualified:false};
}
