/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolveCurrentInventoryReference,INVENTORY_REFERENCE_PATH} from '../scripts/inventory-reference-proposal.mjs';
const root=resolve(process.argv[2]);
const {inventoryFiniteToolSuccessor}=await import(pathToFileURL(resolve(root,'scripts/inventory-finite-tool-successor.mjs')));
const {currentToolMatrixSource}=await import(pathToFileURL(resolve(root,'scripts/current-tool-matrix-source.mjs')));
const read=p=>readFileSync(resolve(root,p));
const tool=inventoryFiniteToolSuccessor({root,line:'main',read}),matrix=currentToolMatrixSource({root,read});
const current=resolveCurrentInventoryReference(tool,matrix),matrixRef=matrix.bound.find(r=>r.path===INVENTORY_REFERENCE_PATH);
assert.equal(current.path,INVENTORY_REFERENCE_PATH);assert.equal(current.sha256,matrixRef.sha256);
assert.equal(current.sha256,'c15f9b3b21f0ae6001246243e85be4e61155e60af50c86c9272dd6289514504b');
const wrong={...tool,qualify:()=>({...current,sha256:'0'.repeat(64)})};assert.throws(()=>resolveCurrentInventoryReference(wrong,matrix));
const absent={...matrix,bound:matrix.bound.filter(r=>r.path!==INVENTORY_REFERENCE_PATH)};assert.throws(()=>resolveCurrentInventoryReference(tool,absent));
let toolSwept=0,matrixSwept=0;const watchedTool={...tool,assertCurrent(){toolSwept++;tool.assertCurrent();}},watchedMatrix={...matrix,assertCurrent(){matrixSwept++;matrix.assertCurrent();}};
assert.deepEqual(resolveCurrentInventoryReference(watchedTool,watchedMatrix),current);assert.equal(toolSwept,1);assert.equal(matrixSwept,1);
tool.assertCurrent();matrix.assertCurrent();console.log('PASS current inventory reference resolved through real tool and matrix owners');
