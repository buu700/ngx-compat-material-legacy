/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// DATA ONLY. This module is not an execution validator and grants no pass.
// Immutable original first-parent diff hashes independently regenerated with
// git --no-replace-objects diff --no-ext-diff --no-renames --binary.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const subjects=Object.freeze({
 '0d36e863ba6752596b6cee5810b5d953d536a9a9':Object.freeze({parent:'dce147f6cac375983f1379a366dc40c46e8163e6',patch:'e6a3decc41ff05a82756a006dad0898f9668de62e87120099508a98259fee014',bytes:3694,case_id:'calendar-classes'}),
 '2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b':Object.freeze({parent:'c848d24dbb9bc468b47b107ae6a82ce32ded8502',patch:'19592e303e6741c720bcefef6ec12c3e1e989d3624ffb5dee2a213b1eb84b4f4',bytes:9738,case_id:'nullable-filters'}),
 '5db8dca18b5967c203a5898dfa713ff03d9e7134':Object.freeze({parent:'efa0d4f6f18dea25e30c389a7c4cb4140de112ff',patch:'37d1bd8291c130520aef769f8251dc96c11f58f6b079db555a5ed7b31d05c2f4',bytes:2546,case_id:'early-lifecycle'}),
 'e8b28fa6ba15f536e72d13c0b22765924efaf1f6':Object.freeze({parent:'5bd42eaed46444b372f8db2f3a7d2da036cd5abf',patch:'529f210953323050d3cc4858477525b69c528dd25fcf773bfee02321fa59a712',bytes:7149,case_id:'boundary-focus'}),
});
// Registry tarball SHA-512 equals the existing pnpm lockfile integrity. These
// are tarball-member SHA-256 values independently compared with installation.
export const material2217=Object.freeze({
 'package.json':'5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af',
 'fesm2022/datepicker.mjs':'e337ceca524c17e9894912bdea5809f0369d20fe9eb208689b8e326ed5f595d1',
 'fesm2022/core.mjs':'c411f1fcb4b76b838433f9c4d6dd2da1f489609f82e417ab14730c5c68dc6b60',
 'fesm2022/button.mjs':'589e6b07ed1c0a18928e3ddcf151af6275cf0ab91260a9e0598fe5959741d364',
 'fesm2022/_date-formats-chunk.mjs':'972df8ecfd7159f6c070f9cc172dd519ff2a5f90da9917c5391ff7d0eba8b420',
 'fesm2022/_icon-button-chunk.mjs':'01748b045787fe0a3d6870cdc8f403f6faa4613533cbf1ed05efd7fe1590ba9b',
 'types/datepicker.d.ts':'9ec133b9ba989250c79e2074c331a0bcc0306b8b15ff935fefbea40e1aa0bfe4',
});
const hash=b=>createHash('sha256').update(b).digest('hex');
export function datepickerInheritedRequirements(sha,line){
 return line==='main' && Object.hasOwn(subjects,sha) ? {sha,...subjects[sha]} : null;
}
// readMember is injected from upstream-packed-run-evidence.mjs, which rejects
// symlinks and path escapes. It must be the fixed import in actual integration.
export function checkOriginalPatch(root,sha,line,readMember){
 const scope=datepickerInheritedRequirements(sha,line);if(!scope)throw Error('unknown datepicker SHA or line');
 const bytes=readMember(root,`compatibility/rc/datepicker-inherited-original-patches/${sha}.diff`);
 if(bytes.length!==scope.bytes||hash(bytes)!==scope.patch)throw Error('original patch changed');
 return scope;
}
// Peer root is caller-owned, never ledger or proof selected; production producer
// must bind it to actual resolved bundle inputs and check dependency closure.
export function checkMaterial2217(peerRoot){
 for(const [path,digest] of Object.entries(material2217)){
  const bytes=readFileSync(join(peerRoot,path));if(hash(bytes)!==digest)throw Error('wrong Material peer member: '+path);
 }
 const pkg=JSON.parse(readFileSync(join(peerRoot,'package.json')));
 if(pkg.name!=='@angular/material'||pkg.version!=='22.1.7')throw Error('wrong Material peer package');
 return true;
}

// Original source proposal is preserved byte-for-byte as context, not execution.
export function checkSourceProposals(root,readMember){
 const bytes=readMember(root,'compatibility/rc/datepicker-inherited-source-proposals-original.json');
 if(hash(bytes)!=='897b250d9ecd6e3fb4bb4368e61a98ea3a0f35031b01bb31096baa6b993874b0')throw Error('source proposal changed');
 const doc=JSON.parse(bytes);
 for(const sha of Object.keys(subjects)){
  const matches=doc.records.filter(row=>row.sha===sha);
  if(matches.length!==1||matches[0].patch_sha256!==subjects[sha].patch||matches[0].tests_run!==false)throw Error('source proposal subject changed');
 }
 return true;
}
