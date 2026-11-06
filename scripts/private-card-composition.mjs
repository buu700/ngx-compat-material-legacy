/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One historical duplicate-check card invocation. Not a generic Sass admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types,isDeepStrictEqual} from 'node:util';
const hash=x=>createHash('sha256').update(x).digest('hex');
const selfPath=fileURLToPath(import.meta.url),selfImage=readFileSync(selfPath),pinUrl=new URL('../fixtures/sass/private-card-peer-pins.json',import.meta.url),programUrl=new URL('../fixtures/sass/private-card-peer.scss',import.meta.url);
const pinRaw=readFileSync(pinUrl);
assert.equal(hash(pinRaw),'975904b6287c0be803cff023d58603fcc2a565be4515545718e60e604a6ea69c');
const pins=JSON.parse(pinRaw),program=readFileSync(programUrl,'utf8');
assert.equal(hash(program),pins.program_sha256);
const EXPECTED='b4e40842f13244e578d93b26919c69f5668e24a0736a46742c1d79cc747fe9ca', contexts=new WeakMap();
const OLD=['--mdc-elevated-card-container-color','--mdc-elevated-card-container-elevation','--mdc-outlined-card-container-color','--mdc-outlined-card-container-elevation','--mdc-outlined-card-outline-color'];
const NEW=['--mat-card-elevated-container-color','--mat-card-elevated-container-elevation','--mat-card-outlined-container-color','--mat-card-outlined-container-elevation','--mat-card-outlined-outline-color'];
function plain(x,keys){assert.ok(x&&typeof x==='object'&&!types.isProxy(x)&&Object.getPrototypeOf(x)===Object.prototype);const d=Object.getOwnPropertyDescriptors(x);assert.deepEqual(Reflect.ownKeys(d).sort(),[...keys].sort());const r={};for(const k of keys){assert.ok(Object.hasOwn(d[k],'value')&&d[k].enumerable);r[k]=d[k].value;}return r;}
function relativeSource(path,roots){for(const [name,base] of Object.entries(roots)){let rel=relative(base,path);if(rel&&!rel.startsWith('..')&&!rel.startsWith('/'))return {package:name,path:rel.replaceAll('\\','/')};}throw Error('unexpected Sass source');}
/** Authenticates peer files, compiler and exact public override output on every creation. */
export function createPrivateCardContext(args){
 const {root,line}=plain(args,['root','line']);assert.equal(process.version,'v24.21.0');assert.equal(typeof root,'string');assert.ok(line==='21.x'||line==='main');const pin=pins.branches[line==='21.x'?'21':'main'];let base=realpathSync(root),roots={material:realpathSync(join(base,'node_modules/@angular/material')),cdk:realpathSync(join(base,'node_modules/@angular/cdk'))},sassRoot=realpathSync(join(base,'node_modules/sass'));
 const check=()=>{assert.ok(readFileSync(selfPath).equals(selfImage));assert.equal(hash(readFileSync(pinUrl)),'975904b6287c0be803cff023d58603fcc2a565be4515545718e60e604a6ea69c');assert.equal(hash(readFileSync(programUrl)),pins.program_sha256);for(const [name,p]of Object.entries(roots)){let raw=readFileSync(join(p,'package.json'));assert.equal(hash(raw),pin.packages[name].sha256);assert.equal(JSON.parse(raw).version,pin.packages[name].version);}let card=readFileSync(join(roots.material,pin.card_component.path),'utf8');assert.equal(hash(card),pin.card_component.sha256);const encoded=[...card.matchAll(/\bstyles:\s*\[\s*(\"(?:[^\"\\]|\\.)*\")/g)].map(m=>JSON.parse(m[1]));assert.equal(encoded.length,pin.card_component.styles_occurrences);assert.ok(encoded.every(x=>hash(x)===pin.card_component.css_sha256));let styles=encoded[0],normal=/\.mat-mdc-card\s*\{([^{}]*)\}/.exec(styles),outlined=/\.mat-mdc-card-outlined\s*\{([^{}]*)\}/.exec(styles);assert.ok(normal&&outlined);for(const key of NEW.slice(0,2))assert.ok(normal[1].includes('var('+key+','));for(const key of NEW.slice(2))assert.ok(outlined[1].includes('var('+key+','));for(const [name,sha]of Object.entries(pin.packages.sass.files))assert.equal(hash(readFileSync(join(sassRoot,name))),sha);for(const row of pin.sources){let p=realpathSync(join(roots[row.package],row.path));assert.deepEqual(relativeSource(p,roots),{package:row.package,path:row.path});let b=readFileSync(p);assert.equal(b.length,row.bytes);assert.equal(hash(b),row.sha256);}};
 check();let sass=createRequire(join(base,'package.json'))('sass');assert.equal(sass.info,pin.sass_info);let result=sass.compileString(program,{loadPaths:[join(base,'node_modules')],logger:sass.Logger.silent});let sources=result.loadedUrls.filter(u=>u.protocol==='file:').map(u=>{let path=realpathSync(fileURLToPath(u)),r=relativeSource(path,roots),b=readFileSync(path);return {...r,bytes:b.length,sha256:hash(b)};}).sort((a,b)=>(a.package+'/'+a.path).localeCompare(b.package+'/'+b.path));assert.ok(isDeepStrictEqual(sources,pin.sources));assert.equal(result.css,pin.peer_css);assert.equal(hash(result.css),pin.peer_css_sha256);check();let context=Object.freeze({});contexts.set(context,{line,css:result.css,check});return context;
}
function compose(s,original){assert.equal(typeof original,'string');assert.equal(Buffer.byteLength(original),989);assert.equal(hash(original),EXPECTED);let blocks=original.split('\n\n');assert.equal(blocks.length,2);let lines=blocks[0].split('\n');assert.equal(lines[0],'.mat-mdc-card {');assert.equal(lines.at(-1),'}');let raw=OLD.map(key=>{let matches=lines.filter(x=>x.startsWith('  '+key+': ')&&x.endsWith(';'));assert.equal(matches.length,1);return matches[0].slice(('  '+key+': ').length,-1);});let peer=s.css.split('\n');assert.equal(peer[0],'.mat-mdc-card {');assert.equal(peer.at(-1),'}');assert.equal(peer.length,7);for(let i=0;i<NEW.length;i++)assert.equal(peer[i+1],'  '+NEW[i]+': '+raw[i]+';');let anchor='  --mat-card-subtitle-text-color: ';let pos=lines.findIndex(x=>x.startsWith(anchor));assert.ok(pos>0);lines.splice(pos,0,...peer.slice(1,-1));blocks[0]=lines.join('\n');return blocks.join('\n\n');}
/** The caller must separately bind candidate and original to actual compilation/artifact identity. */
export function privateCardCompositionMatches(args){try{let {context,line,caseId,originalCss,actualCss}=plain(args,['context','line','caseId','originalCss','actualCss']);let s=contexts.get(context);assert.ok(s);assert.equal(line,s.line);assert.equal(caseId,'mixin-css/private-check-duplicate-theme-styles');assert.equal(typeof actualCss,'string');s.check();let expected=compose(s,originalCss);assert.equal(actualCss,expected);s.check();return true;}catch{return false;}}

/** Fixed snapshot entry only; admission independently binds original and actual. */
export function privateCardExpectedCss(context, originalCss){const s=contexts.get(context);assert.ok(s);s.check();const css=compose(s,originalCss);s.check();return css;}
