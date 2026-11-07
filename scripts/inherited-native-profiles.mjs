/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {closeSync,existsSync,openSync,readFileSync,readSync,realpathSync} from 'node:fs';
import {delimiter,dirname,isAbsolute,join} from 'node:path';
const digest=path=>{const fd=openSync(path,'r'),h=createHash('sha256'),buffer=Buffer.alloc(1024*1024);try{let n;while((n=readSync(fd,buffer,0,buffer.length,null))>0)h.update(buffer.subarray(0,n));return h.digest('hex')}finally{closeSync(fd)}};
const fail=message=>{throw Error(message)};
/** The catalog must itself be pinned by the calling producer's source gate. */
export function selectInheritedNativeProfile(root){
 const catalog=JSON.parse(readFileSync(join(root,'compatibility/rc/inherited-native-profiles.json')));
 const entry=process.env.CHROME_BIN;if(!entry||!isAbsolute(entry)||!existsSync(entry))fail('missing approved browser entry');
 const browser=realpathSync(entry),browserHash=digest(browser),nodeHash=digest(process.execPath);
 const candidates=catalog.profiles.filter(p=>p.platform===process.platform&&p.arch===process.arch&&p.node_version===process.versions.node&&p.node===nodeHash&&p.browser_entry===browserHash);
 if(candidates.length!==1)fail('unrecognized inherited native profile');const profile=candidates[0];
 const search=(name,expected)=>{for(const dir of (process.env.PATH||'').split(delimiter)){if(!dir||!isAbsolute(dir))continue;const path=join(dir,name);try{if(digest(path)===expected)return realpathSync(path)}catch{}}fail('unrecognized approved executable '+name)};
 const python=search('python3',profile.python),tar=search('tar',profile.tar);
 const launcher=profile.browser_layout==='entry-is-launcher'?browser:profile.browser_layout==='adjacent-chrome-launcher'?join(dirname(browser),'chrome'):fail('unrecognized browser layout');
 if(digest(launcher)!==profile.browser_launcher)fail('unrecognized approved browser launcher');
 const match=readFileSync(launcher,'utf8').match(/exec -a "\$0" "([^"\n]+)"/);if(!match||!isAbsolute(match[1]))fail('unrecognized browser launcher');const binary=realpathSync(match[1]);
 const check=()=>{for(const [path,expected,name] of [[process.execPath,profile.node,'node'],[python,profile.python,'python'],[tar,profile.tar,'tar'],[browser,profile.browser_entry,'browser entry'],[launcher,profile.browser_launcher,'browser launcher'],[binary,profile.browser_binary,'browser binary']])if(digest(path)!==expected)fail('unrecognized approved executable '+name)};
 check();return {id:profile.id,arch:profile.arch,python,tar,browser,browser_product:profile.browser_product,check};
}
