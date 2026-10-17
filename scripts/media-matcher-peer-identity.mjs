/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Inspect installed public layout export bytes; no private API is consumed. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative} from 'node:path';
const peers = {
  "main": {
    "package": "@angular/cdk",
    "version": "22.1.7",
    "archive_sha256": "225d82389797aefbbb2684461576ef950465546a9d28326483e0b816c8a5a558",
    "integrity": "sha512-TN4pPExBZ6ZbxWnfVb77M/0cL83eRY3qpHv/R9Y1KhkNXlxdocd0My7wiueWBBimYacSpBnfHrIRNmHgX7Pc4Q==",
    "members": [
      {
        "module_path": "package.json",
        "path": "compatibility/rc/material-public-source-members/ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933.gz",
        "sha256": "ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933",
        "bytes": 5084,
        "stored_sha256": "fc88bdeee956bc2de19a44a3dc5e2db551accf392ab7f0ba39868c468bf51f61"
      },
      {
        "module_path": "fesm2022/layout.mjs",
        "path": "compatibility/rc/material-public-source-members/2ee894e12f9c4bedfea46aff56f317bb3d4f874e76a95b6b98e304b89866d6f6.gz",
        "sha256": "2ee894e12f9c4bedfea46aff56f317bb3d4f874e76a95b6b98e304b89866d6f6",
        "bytes": 2181,
        "stored_sha256": "db39de18f16713e9aced1f14961c75700e4a709b83ec4af5d9b413bd1b1c66e6"
      },
      {
        "module_path": "fesm2022/_breakpoints-observer-chunk.mjs",
        "path": "compatibility/rc/material-public-source-members/39fc38921aa1f28533becd5027dbcec5192b642121452b8352d94aee9813d9f2.gz",
        "sha256": "39fc38921aa1f28533becd5027dbcec5192b642121452b8352d94aee9813d9f2",
        "bytes": 4741,
        "stored_sha256": "b66fff08478b2f66ff8f803d200e7c39d0d4ecf823b84f75eb980bab0a46cfea"
      },
      {
        "module_path": "types/layout.d.ts",
        "path": "compatibility/rc/material-public-source-members/a383d3ac54007522b06834df39d822a35c09c8ce167a0a75165e96f56ed50f01.gz",
        "sha256": "a383d3ac54007522b06834df39d822a35c09c8ce167a0a75165e96f56ed50f01",
        "bytes": 3171,
        "stored_sha256": "471547f73a86faefe8cee9b8c1956974dd606c4679dee8f17b0287fc50fb59ce"
      }
    ]
  },
  "21.x": {
    "package": "@angular/cdk",
    "version": "21.2.14",
    "archive_sha256": "b54868a0f7aefa471203a0fe419370e156cdf0218db9b625aca3ae6e8de25c63",
    "integrity": "sha512-806REq/CLf37nEhmmd8Q+ILN8z/RVG2vk2n8YZ/4TdHpcBCi5ux4AxLbpMmduLwGPOzPagJ6ggRzE5fnX0rmcQ==",
    "members": [
      {
        "module_path": "package.json",
        "path": "compatibility/rc/material-public-source-members/10c398ae1ae4854e4c98b3715f8e0f225e34b7773fa3c582f11d67852a003ea9.gz",
        "sha256": "10c398ae1ae4854e4c98b3715f8e0f225e34b7773fa3c582f11d67852a003ea9",
        "bytes": 5041,
        "stored_sha256": "5267b1a8cdd0a720894ae1f34fe8f1cf35657ac518e2180ff6c7cd02e38257f0"
      },
      {
        "module_path": "fesm2022/layout.mjs",
        "path": "compatibility/rc/material-public-source-members/7eefe5dc622093ef51a80d72f12a1600867e584fee1dbd9835a3c05411474baf.gz",
        "sha256": "7eefe5dc622093ef51a80d72f12a1600867e584fee1dbd9835a3c05411474baf",
        "bytes": 2185,
        "stored_sha256": "5a804e01ec32c97c36ce2d08636b88ee2ea14b2c4884dc4cc1873e1da22aeead"
      },
      {
        "module_path": "fesm2022/_breakpoints-observer-chunk.mjs",
        "path": "compatibility/rc/material-public-source-members/68b5fe349d7bbc533d63e49fe17a05a2b49518eca42a21e00b5658cbbd1453de.gz",
        "sha256": "68b5fe349d7bbc533d63e49fe17a05a2b49518eca42a21e00b5658cbbd1453de",
        "bytes": 4934,
        "stored_sha256": "b6c6f5e47226c355dd4da7119b35717d9f72a8c5c4643b2956d892c33eaa5830"
      },
      {
        "module_path": "types/layout.d.ts",
        "path": "compatibility/rc/material-public-source-members/2892d958f77727422289973e1c66f56cd18b8954dd41ad5c60b5a36553d0b5a6.gz",
        "sha256": "2892d958f77727422289973e1c66f56cd18b8954dd41ad5c60b5a36553d0b5a6",
        "bytes": 3250,
        "stored_sha256": "e2468d1c1379f1111d5bea6b630dd4d9ee59476940de15ac2a2c4c4ceafe6e66"
      }
    ]
  }
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function mediaMatcherPeerRequirements(line) {
  if (!Object.hasOwn(peers,line)) return null;
  const peer=peers[line], byPath=Object.fromEntries(peer.members.map(row=>[row.module_path,row]));
  return structuredClone({...peer,consumer_peer:{package:peer.package,version:peer.version,
    package_json_sha256:byPath['package.json'].sha256,
    runtime_member:'fesm2022/layout.mjs',runtime_sha256:byPath['fesm2022/layout.mjs'].sha256,
    implementation_member:'fesm2022/_breakpoints-observer-chunk.mjs',implementation_sha256:byPath['fesm2022/_breakpoints-observer-chunk.mjs'].sha256,
    types_member:'types/layout.d.ts',types_sha256:byPath['types/layout.d.ts'].sha256}});
}
export function readMediaMatcherPeer(consumer) {
  const root=realpathSync(join(consumer,'node_modules/@angular/cdk'));
  const member=path=>{
    if(typeof path!=='string'||!path.startsWith('./')||path.includes('\\')||path.split('/').includes('..'))throw Error('invalid public layout export path');
    const resolved=realpathSync(join(root,path)),part=relative(root,resolved);
    if(isAbsolute(part)||part==='..'||part.startsWith('../'))throw Error('public layout export escapes installed package');
    return readFileSync(resolved);
  };
  const manifest=member('./package.json'),pkg=JSON.parse(manifest),layout=pkg.exports?.['./layout'];
  if(pkg.name!=='@angular/cdk'||layout?.default!=='./fesm2022/layout.mjs'||layout?.types!=='./types/layout.d.ts')throw Error('wrong public layout exports');
  const runtime=member(layout.default);
  if(!runtime.toString().includes("export { BreakpointObserver, MediaMatcher } from './_breakpoints-observer-chunk.mjs';"))throw Error('public layout no longer exports authenticated MediaMatcher implementation');
  return {package:pkg.name,version:pkg.version,package_json_sha256:hash(manifest),
    runtime_member:layout.default.slice(2),runtime_sha256:hash(runtime),
    implementation_member:'fesm2022/_breakpoints-observer-chunk.mjs',implementation_sha256:hash(member('./fesm2022/_breakpoints-observer-chunk.mjs')),
    types_member:layout.types.slice(2),types_sha256:hash(member(layout.types))};
}
