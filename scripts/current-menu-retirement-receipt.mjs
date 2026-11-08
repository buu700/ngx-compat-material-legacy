/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Historical menu type receipt, never a historical source reader for current admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_BEFORE,MENU_CONTENT_PANEL_AFTER} from './menu-panel-content-boundary.mjs';
const commit='c5f4d3c185132b2282a4d1d2343d8fb54f8ed3a2',parent='a989ea8aae414c7d370a2c00139555a9c9c959f3';
const proof={path:'compatibility/rc/menu-panel-content-boundary-main.json',sha256:'5f31e100b6e3ec236b935a3c5325c7f9717409a5298f45a6c498f34efa680749'};
const hash=b=>createHash('sha256').update(b).digest('hex'),active=new Map();
export function qualifyCurrentMenuRetirementReceipt({root,readMember,current}){
 const real=realpathSync(root),prior=active.get(real);if(prior){prior.reentered=true;assert.fail('reentrant menu retirement receipt');}const state={reentered:false};active.set(real,state);try{const result=qualify({root:real,readMember,current});assert.equal(state.reentered,false,'reentrant menu retirement receipt');return result;}finally{active.delete(real);}
}
function qualify({root,readMember,current}){
 assert.equal(typeof readMember,'function');const physical=p=>{assert.ok(typeof p==='string'&&!p.includes('\\'));const parts=p.split('/');assert.ok(parts.every(x=>x&&x!=='.'&&x!=='..'));let at=root;for(let i=0;i<parts.length;i++){at=join(at,parts[i]);const s=lstatSync(at);assert.equal(s.isSymbolicLink(),false);assert.ok(i===parts.length-1?s.isFile():s.isDirectory());}return readFileSync(at);};
 const sweep=()=>{assert.equal(realpathSync(root),root);assert.equal(hash(physical(proof.path)),proof.sha256,'changed menu receipt frame');assert.equal(hash(physical(MENU_CONTENT_PANEL_SOURCE)),MENU_CONTENT_PANEL_AFTER,'changed menu source frame');};
 const checked=(p,expected)=>{sweep();const bytes=physical(p),supplied=readMember(p);sweep();assert.ok(Buffer.isBuffer(supplied)&&bytes.equals(supplied),'nonphysical menu input '+p);assert.equal(hash(bytes),expected);assert.ok(bytes.equals(physical(p)));return bytes;};
 const receipt=checked(proof.path,proof.sha256),menu=checked(MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_AFTER),body=JSON.parse(receipt);assert.equal(body.source_parent,parent);
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')));Object.assign(env,{GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'});
 const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
 git('merge-base','--is-ancestor',parent,commit);git('merge-base','--is-ancestor',commit,'HEAD');assert.ok(git('show',commit+':'+proof.path).equals(receipt));assert.equal(hash(git('show',parent+':'+MENU_CONTENT_PANEL_SOURCE)),MENU_CONTENT_PANEL_BEFORE);assert.ok(git('show',commit+':'+MENU_CONTENT_PANEL_SOURCE).equals(menu));
 const roster=[...body.current_source_files,...body.inputs],map=new Map();assert.equal(body.current_source_files.length,53);assert.equal(body.inputs.length,418);assert.equal(roster.length,471);
 for(const row of roster){assert.ok(row&&typeof row.path==='string'&&/^[0-9a-f]{64}$/.test(row.sha256));if(map.has(row.path))assert.equal(map.get(row.path).sha256,row.sha256);else map.set(row.path,row);}assert.equal(map.size,418);
 const historical=new Map();for(const [p,row] of map){const bytes=git('show',commit+':'+p);assert.equal(hash(bytes),row.sha256,'changed historical menu input '+p);historical.set(p,bytes);}
 // This closure exists only inside the historical receipt validator; it is never returned.
 const read=p=>p===proof.path?receipt:p===MENU_CONTENT_PANEL_SOURCE?menu:(assert.ok(historical.has(p),'unlisted menu receipt input '+p),historical.get(p));
 const result=qualifiedMenuContentTypeBoundary({line:'main',readMember:read});assert.deepEqual(result.ref,proof);const validateCurrent=()=>{assert.equal(current.source_files.filter(r=>r.path===MENU_CONTENT_PANEL_SOURCE&&r.sha256===MENU_CONTENT_PANEL_AFTER).length,1);assert.equal(current.symbol_uses.some(r=>r.file==='legacy-menu/internal/menu-panel.ts'&&r.module==='@angular/material/menu'&&r.symbol==='MatMenuContent'),false);};validateCurrent();
 checked(proof.path,proof.sha256);checked(MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_AFTER);sweep();validateCurrent();return {ref:{...proof},historical_input_members:map.size,source_scope_only:true};
}
