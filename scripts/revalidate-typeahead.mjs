/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
import {readFileSync} from 'node:fs';
import {TYPEAHEAD_KIND, TYPEAHEAD_SHA, typeaheadBehaviorRequirements, validateTypeaheadBehavior} from './upstream-typeahead-evidence.mjs';
try {
 const {root, request} = JSON.parse(readFileSync(0, 'utf8'));
 const req = typeaheadBehaviorRequirements(TYPEAHEAD_SHA, 'main');
 const proof = {proof_kind:TYPEAHEAD_KIND, diff_sha256:req.patch, affected_branches:['main'], reachable_behavior:{kind:'executed-delegation', id:'public-list-menu-select-typeahead'}, typeahead_behavior:{kind:req.kind, case_ids:req.case_ids}};
 const result=validateTypeaheadBehavior({root, entry:{sha:TYPEAHEAD_SHA}, proof, request, line:'main'});
 if (!result.ok) throw Error(result.detail);
 process.stdout.write(JSON.stringify(result)+'\n');
} catch(error) {console.error('typeahead revalidation:',error.message); process.exitCode=1;}
