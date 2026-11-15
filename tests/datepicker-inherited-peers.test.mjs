/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyDatepickerPeers} from '../scripts/datepicker-inherited-peers.mjs';
const root=process.argv[2];if(!root)throw Error('workspace required');const peers=verifyDatepickerPeers(root);assert.equal(Object.keys(peers).length,11);assert.equal(peers['@angular/material'].version,'22.1.7');
const empty=mkdtempSync(join(tmpdir(),'datepicker-missing-peer-'));try{assert.throws(()=>verifyDatepickerPeers(empty));}finally{rmSync(empty,{recursive:true,force:true});}
console.log('minimum peer identities match; missing peer rejected');
