/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exact physical peer images for d70 viewport qualifications. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {readdirSync,lstatSync,realpathSync,readFileSync} from 'node:fs';import {join,dirname} from 'node:path';
const sha=x=>createHash('sha256').update(x).digest('hex');
const peers={
 '@angular/core':'723ad5070ee993b7b924667668c614d6a291bc7e72c6aed20b9cd1ca0ed8bdb3',
 '@angular/common':'a9a4dfee03b92c8483aa1ac9a16a9767185d6c13e60fa713ef624bbd8b960115',
 '@angular/platform-browser':'a25cfd43df3d87d74edf0b0c4a2f5dd8ee268209adbe738d3a05321d014dd55f',
 '@angular/compiler':'006b4d6176547f6aecef034cce1b607ba4f402e61f30dde5463433e12a67e3bb',
 '@angular/material':'c857deabd2ae784dfc97974679271be3d263ef89524c485f81cbe4680367d7a7',
 '@angular/cdk':'508d804722d830826d63f4c2ed94a89ebe5a07cefe763351141c2397fa0e2843',
 'rxjs':'58c697b910a4ff10ec65a8df5c0b48c88564942b3821097ccd6d10a0df6fbf8b',
 'tslib':'e872e35b2a1745935c5ce30fb038f5c4e0d487e480dfa76da08ac6f00c7f18dc'};
function peerImage(req,name){
 const root=dirname(realpathSync(req.resolve(name+'/package.json'))),rows=[];
 function walk(dir,base=''){for(const e of readdirSync(dir,{withFileTypes:true})){const rel=base?base+'/'+e.name:e.name,path=join(dir,e.name),st=lstatSync(path);if(st.isSymbolicLink())throw Error('symlink inside peer image');if(st.isDirectory())walk(path,rel);else if(st.isFile()){const bytes=readFileSync(path);rows.push({path:rel,bytes:bytes.length,sha256:sha(bytes)});}else throw Error('unexpected peer member');}}
 walk(root);return sha(rows.map(r=>JSON.stringify(r)).sort().join('\n'));
}

export function verifyD70ViewportPeers(packageRoot){const req=createRequire(join(packageRoot,'package.json'));assert.equal(req('@angular/core/package.json').version,'22.1.7');assert.equal(req('@angular/material/package.json').version,'22.1.7');for(const [name,digest] of Object.entries(peers))assert.equal(peerImage(req,name),digest);return true;}
