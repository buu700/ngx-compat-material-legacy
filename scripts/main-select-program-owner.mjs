/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Finite callback-free continuation owner; no Sass or artifact admission. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
const root=resolve(process.argv[2]);
const bound=new Map();
function physical(path){if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('invalid path');let p=root;for(const bit of path.split('/')){p=join(p,bit);if(lstatSync(p).isSymbolicLink())throw Error('linked input')}if(!lstatSync(p).isFile())throw Error('not file');const raw=readFileSync(p),old=bound.get(path);if(old&&!raw.equals(old))throw Error('changed physical input');if(!old)bound.set(path,Buffer.from(raw));return raw;}
const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
const git=(commit,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env});
function finalRead(){for(const [path,raw] of bound)if(!physical(path).equals(raw))throw Error('changed final physical input');}
const sha=b=>createHash('sha256').update(b).digest('hex');
function verifySelectProgramSource(root,read){
 const path='compatibility/rc/current-main-select-density-program-v1.json',raw=read(path);if(sha(raw)!=='b924cc88007ac6f84d1a0a32e5bc7533e60e8a9e6b651a2680a8fb833d6f0f65'||raw.length!==18679)throw Error('select continuation packet');const p=JSON.parse(raw),names=['scripts/select-program-transition-source.mjs','scripts/select_program_transition_source.py'];if(p.schema_version!==1||p.role!=='main-select-program-density-resource-continuation'||p.line!=='main'||p.source_parent!=='c2c58388e0777e580fd76234b57c271de0cb4115'||p.source_scope_only!==true||p.artifact_or_audit_admission_granted!==false||!isDeepStrictEqual(p.updates.map(x=>x.path),names))throw Error('select continuation scope');const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',p.source_parent,'HEAD'],{cwd:root,env});for(const r of p.updates){const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p.source_parent+':'+r.path],{cwd:root,env});if(r.before.path!==r.path||sha(before)!==r.before.sha256||before.length!==r.before.bytes)throw Error('select continuation preimage');let at=0,parts=[];for(const e of r.edits){if(!isDeepStrictEqual(Object.keys(e).sort(),['after','before','offset'])||!Number.isSafeInteger(e.offset)||e.offset<at||e.offset>before.length)throw Error('select continuation edit');const old=Buffer.from(e.before);if(!before.subarray(e.offset,e.offset+old.length).equals(old))throw Error('select continuation literal');parts.push(before.subarray(at,e.offset),Buffer.from(e.after));at=e.offset+old.length;}const after=Buffer.concat([...parts,before.subarray(at)]);if(r.after.path!==r.path||sha(after)!==r.after.sha256||after.length!==r.after.bytes||!read(r.path).equals(after))throw Error('select continuation physical');}
}

const leaf=physical('scripts/main-select-program-proof.mjs');if(sha(leaf)!=='ae495586f3584e26a1e324b810b4f6b0e0fa42773857495f9f9ce8bf8246dd29')throw Error('leaf source');verifySelectProgramSource(root,physical);finalRead();process.stdout.write('ok');
