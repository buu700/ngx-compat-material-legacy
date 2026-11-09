/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One terminal metadata stage assembled by its actual source producer. */
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
import {prepareCheckerReferenceOwnerMetadata} from './checker-reference-proposal.mjs';
export function checkerReferenceOwnerContext({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 return prepareCheckerReferenceOwnerMetadata({root,read});
}
