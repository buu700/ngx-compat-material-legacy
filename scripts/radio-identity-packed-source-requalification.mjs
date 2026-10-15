/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Immutable pre-addition subjects. Earlier OnPush/npm preimages are untouched.
export const RADIO_IDENTITY_PACKED_PREIMAGES = {
  "main": {
    "commit": "de9ec75e67cd3852227bb8e5bef3334fbc15f816",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "1a8a6700e753083c32c0aa8a2e3c15d5bfc87a72039c2ed2e0b081c8fa94cd66",
      "scripts/packed-consumer-evidence.mjs": "2ddc3c1284f571403155766306b7b2342ec86af60a28b9c848233a897db20f51",
      "compatibility/rc/matrices/full-verify.json": "a5a500b1701b47a73c37cc7a84477a0f1a55f059f0ddba0531da4ada90ccfbb2",
      "tests/table_onpush_packed_contract_probe.mjs": "c498fd07cf5493b9a8b8dcf20f8563656dc3e4026c15234b59d09abb2965a38b",
      "tests/value_accessor_packed_contract_probe.mjs": "d63219b4f4c19e5b76004cbde4dc68d0ad6b20832453115ae31f6b828e3ca5cd",
      "tests/packed_required_contract_admission.mjs": "dabb48cd07b40c9d0fd330bf558d2cf9e0af8f02048d899d7216a14aae317823",
      "tests/npm_tooling_caller_probe.mjs": "cd8bcf8307730c6e63031c3b53ee7ba19a27b33eeb18ef2631b9580394aee1b7",
      "tests/test_table_onpush_packed_contract.py": "cf1d0511e4cf5c1bc0e7c7f7f2bc0991e41accb51f879914556654184102dbe9",
      "tests/test_value_accessor_packed_contract.py": "f0a3d50ce5ade04ddfe4d6160415d980e151378b3342a63fb0bc2edde995441e"
    }
  },
  "21.x": {
    "commit": "567406eda262e898043ed8730b7045742eb2a665",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "e692856ae84708bef3d88ca195da95c46103c530c7a78e4765e766b2df24c4d4",
      "scripts/packed-consumer-evidence.mjs": "fa8576d8be08d2cd2b49083bdd1191be1028ad02f60bccd34f78a5071e0df755",
      "compatibility/rc/matrices/full-verify.json": "17f088c65d7d838b92db829dfa570a4698382a679d866c20027ccb7d8df8156e",
      "tests/table_onpush_packed_contract_probe.mjs": "c498fd07cf5493b9a8b8dcf20f8563656dc3e4026c15234b59d09abb2965a38b",
      "tests/value_accessor_packed_contract_probe.mjs": "d63219b4f4c19e5b76004cbde4dc68d0ad6b20832453115ae31f6b828e3ca5cd",
      "tests/packed_required_contract_admission.mjs": "dabb48cd07b40c9d0fd330bf558d2cf9e0af8f02048d899d7216a14aae317823",
      "tests/npm_tooling_caller_probe.mjs": "cd8bcf8307730c6e63031c3b53ee7ba19a27b33eeb18ef2631b9580394aee1b7",
      "tests/test_table_onpush_packed_contract.py": "cf1d0511e4cf5c1bc0e7c7f7f2bc0991e41accb51f879914556654184102dbe9",
      "tests/test_value_accessor_packed_contract.py": "f0a3d50ce5ade04ddfe4d6160415d980e151378b3342a63fb0bc2edde995441e"
    }
  }
};
export const RADIO_IDENTITY_PACKED_EDITS = {
  "scripts/packed-consumer-aot-smoke.mjs": [
    [
      "import {packedTableOnPushCase} from './table-onpush-packed-contract.mjs';",
      "import {packedTableOnPushCase} from './table-onpush-packed-contract.mjs';\nimport {radioIdentityPackedFixture} from './radio-identity-packed-fixture.mjs';\nimport {packedRadioIdentityCase} from './radio-identity-packed-contract.mjs';"
    ],
    [
      "  const tableOnPushCase = packedTableOnPushCase(parsed.tableOnPushRendering);",
      "  const tableOnPushCase = packedTableOnPushCase(parsed.tableOnPushRendering);\n  const radioIdentityCase = packedRadioIdentityCase(parsed.radioIdentity);"
    ],
    [
      "    if (caseId === tableOnPushCase.case_id) return tableOnPushCase;",
      "    if (caseId === tableOnPushCase.case_id) return tableOnPushCase;\n    if (caseId === radioIdentityCase.case_id) return radioIdentityCase;"
    ],
    [
      "    writeFileSync(join(consumer, 'src/table-onpush-contract.mjs'), readFileSync(join(root, 'scripts/table-onpush-packed-contract.mjs')));",
      "    writeFileSync(join(consumer, 'src/table-onpush-contract.mjs'), readFileSync(join(root, 'scripts/table-onpush-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/radio-identity-probe.ts'), radioIdentityPackedFixture());\n    writeFileSync(join(consumer, 'src/radio-identity-contract.mjs'), readFileSync(join(root, 'scripts/radio-identity-packed-contract.mjs')));"
    ],
    [
      "import {PackedOnPushTableHost, observePackedTableOnPush} from './table-onpush-probe';",
      "import {PackedOnPushTableHost, observePackedTableOnPush} from './table-onpush-probe';\nimport {PackedRadioIdentityHost, observePackedRadioIdentity} from './radio-identity-probe';"
    ],
    [
      "    imports: [HarnessHost, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule, PackedOnPushTableHost],",
      "    imports: [HarnessHost, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule, PackedOnPushTableHost, PackedRadioIdentityHost],"
    ],
    [
      "  const fixture = TestBed.createComponent(HarnessHost);",
      "  const radioIdentity=await observePackedRadioIdentity();\n  const fixture = TestBed.createComponent(HarnessHost);"
    ],
    [
      "    tableOnPushRendering:tableOnPush.observed,",
      "    tableOnPushRendering:tableOnPush.observed,\n    radioIdentity:radioIdentity.observed,"
    ],
    [
      "&& tabLabelOriginalConstructor && tableOnPush.okay && valueAccessors.okay && engineFreeAnimationPolicy,",
      "&& tabLabelOriginalConstructor && radioIdentity.okay && tableOnPush.okay && valueAccessors.okay && engineFreeAnimationPolicy,"
    ]
  ],
  "scripts/packed-consumer-evidence.mjs": [
    [
      "  'packed-consumer/harness/table-no-data-row-on-push-rendering',",
      "  'packed-consumer/harness/table-no-data-row-on-push-rendering',\n  'packed-consumer/harness/radio-generated-identity-coexistence',"
    ]
  ],
  "tests/table_onpush_packed_contract_probe.mjs": [
    [
      "import {reverseTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES, TABLE_ONPUSH_SOURCE_EDITS}",
      "import {reverseTableOnPushPackedSource as reverseOldTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES, TABLE_ONPUSH_SOURCE_EDITS}"
    ],
    [
      "import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';",
      "import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';\nimport {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';\nimport {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';\nconst reverseTableOnPushPackedSource=(path,raw,line)=>reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,raw,line),line);"
    ],
    [
      "'packedTableOnPushCase',text+",
      "'packedTableOnPushCase','packedRadioIdentityCase',text+"
    ],
    [
      ",packedValueAccessorCases,packedTableOnPushCase);",
      ",packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase);"
    ],
    [
      "assert.equal(expected.length,102);",
      "assert.equal(expected.length,103);"
    ],
    [
      "reverseTableOnPushPackedSource(path,raw.replace(after,after+'\\n// mutated addition'),line)",
      "reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,raw,line).replace(after,after+'\\n// mutated addition'),line)"
    ]
  ],
  "tests/value_accessor_packed_contract_probe.mjs": [
    [
      "import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';",
      "import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';\nimport {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';"
    ],
    [
      "'packedTableOnPushCase',text+",
      "'packedTableOnPushCase','packedRadioIdentityCase',text+"
    ],
    [
      ",packedValueAccessorCases,packedTableOnPushCase);",
      ",packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase);"
    ],
    [
      "assert.equal(expected.length,102);",
      "assert.equal(expected.length,103);"
    ]
  ],
  "tests/packed_required_contract_admission.mjs": [
    [
      "import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';",
      "import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';\nimport {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';"
    ],
    [
      "'packedTableOnPushCase',text+",
      "'packedTableOnPushCase','packedRadioIdentityCase',text+"
    ],
    [
      ",packedValueAccessorCases,packedTableOnPushCase);",
      ",packedValueAccessorCases,packedTableOnPushCase,packedRadioIdentityCase);"
    ]
  ],
  "tests/npm_tooling_caller_probe.mjs": [
    [
      "import {reverseTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES} from '../scripts/table-onpush-packed-source-requalification.mjs';",
      "import {reverseTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES} from '../scripts/table-onpush-packed-source-requalification.mjs';\nimport {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';"
    ],
    [
      "reverseTableOnPushPackedSource(path, source, line)",
      "reverseTableOnPushPackedSource(path, reverseRadioIdentityPackedSource(path, source, line), line)"
    ]
  ],
  "tests/test_table_onpush_packed_contract.py": [
    [
      "observed['derived_cases'], 102",
      "observed['derived_cases'], 103"
    ]
  ],
  "tests/test_value_accessor_packed_contract.py": [
    [
      "observed['derived_cases'], 102",
      "observed['derived_cases'], 103"
    ]
  ]
};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function reverseRadioIdentityPackedSource(path,raw,line){
 const subject=RADIO_IDENTITY_PACKED_PREIMAGES[line];assert.ok(subject,'unknown source line');assert.ok(subject.members[path],'foreign radio packed source path');let restored;
 if(path==='compatibility/rc/matrices/full-verify.json'){
  const matrix=JSON.parse(raw);assert.equal(raw,JSON.stringify(matrix,null,2)+'\n');const check=matrix.checks.find(row=>row.check_id==='packed-consumer');assert.ok(check);
  for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch].harness;if(roster===null)continue;const id='packed-consumer/harness/radio-generated-identity-coexistence';assert.equal(roster.filter(value=>value===id).length,1);check.acceptance.cases_by_line[branch].harness=roster.filter(value=>value!==id);}
  restored=JSON.stringify(matrix,null,2)+'\n';
 }else{
  restored=raw;for(const [before,after] of [...RADIO_IDENTITY_PACKED_EDITS[path]].reverse()){assert.equal(restored.split(after).length,2,'missing/mutated/duplicate radio packed addition');restored=restored.replace(after,before);}
 }
 assert.equal(hash(restored),subject.members[path],'unrelated prior source changed');return restored;
}
