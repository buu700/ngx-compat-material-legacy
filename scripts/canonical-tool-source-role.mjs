/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Resolve the actual checkout owner; no guessed tool before-image is current. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as localOwner from './packed-upstream-ledger-epoch.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
export function qualifyCanonicalToolReference(args){
 const root=resolve(args.root),owner=root===ROOT?localOwner:require(join(root,'scripts/packed-upstream-ledger-epoch.mjs'));
 if(typeof owner.qualifyCanonicalToolReference==='function')return owner.qualifyCanonicalToolReference(args);
 assert.match(JSON.parse(args.read('projects/ngx-material-legacy/package.json')).version,/^22\./,'21.x requires its canonical tool owner');
 return null;
}
