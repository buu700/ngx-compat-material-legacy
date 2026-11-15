/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {validateDatepickerInherited as validate} from '../scripts/upstream-datepicker-inherited-evidence.mjs';
const sha='0d36e863ba6752596b6cee5810b5d953d536a9a9',root=process.argv[2];
assert.equal(validate({root,line:'main',entry:{sha:'wrong'}}).ok,false);
assert.equal(validate({root,line:'21.x',entry:{sha}}).ok,false);
assert.equal(validate({root,line:'main',entry:{sha},proof:{}}).ok,false);
assert.equal(validate({root,line:'main',entry:{sha,diff_sha256:'e6a3decc41ff05a82756a006dad0898f9668de62e87120099508a98259fee014'},proof:{proof_kind:'main-datepicker-inherited-native',affected_branches:['main'],diff_sha256:'e6a3decc41ff05a82756a006dad0898f9668de62e87120099508a98259fee014',reachable_behavior:{kind:'executed-delegation',id:'datepicker-inherited-native/'+sha}}}).ok,false);
console.log('unknown SHA, wrong line, missing proof and missing prior/run rejected');
