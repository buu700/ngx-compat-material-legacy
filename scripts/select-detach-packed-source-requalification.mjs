/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Additive guard; all prior identity/radio/OnPush/npm preimages remain immutable.
export const SELECT_DETACH_PACKED_PREIMAGES={
  "main": {
    "commit": "f44be2a1b695f16e528baa2189f09c7155591070",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "8322724d92a14edb57ee4de2dcf78d3a99bb0660f9c873fcca1150aff061d68b",
      "scripts/packed-consumer-evidence.mjs": "fc4dd554dd1c540627eb9278cc64d3cc2aa7fa48caa6db85f2a9744b9f29711c",
      "compatibility/rc/matrices/full-verify.json": "a2f754f8681996d54fe83b2ac2c2c890ba6d890d1b810ca66ed1ba78ee1251b1",
      "tests/table_onpush_packed_contract_probe.mjs": "6d73bc9a4ac5c7d29b43101700e21f18d7caf418194b51ee29d127900c528f6e",
      "tests/value_accessor_packed_contract_probe.mjs": "ed3c23b0b7a4789adcd464022adcfbdad4cc4ed5f0cc8fe616faad4e2956648d",
      "tests/packed_required_contract_admission.mjs": "7272f4a20d7c29e29842f0057e79a4f52862698a2d29c195811563aaaa354846",
      "tests/npm_tooling_caller_probe.mjs": "7d7a02592355578d8918d968166f23a7e863c6092ea1f2bfd656f199655a1921",
      "tests/radio_identity_packed_contract_probe.mjs": "acb622255536ea0cd97fccb3aeae0c142787e6dbf7b6bddf60d1086d4b57d987",
      "tests/generated_identity_packed_contract_probe.mjs": "d568a35568e1d657bee5c9af2004038d02fae200ab1ac6270f0b3d31b0b43ef5",
      "tests/test_table_onpush_packed_contract.py": "d63d0736509a033a7655b9c59441d9bd71773bd34de9ea11e8eb394b2f9690b1",
      "tests/test_value_accessor_packed_contract.py": "01150341ff7e1dbd06603634ab8372a278030c8080a0b2186ebb2be32a05dac3",
      "tests/test_radio_identity_packed_contract.py": "43c51f8b4886e5592ae0f44b4f967318a5fbe64c0251c0205dd69af407ac7c5d",
      "tests/test_generated_identity_packed_contract.py": "466abd2f833375f96123b8e0484b5d320279613b006d85268d2748e6bb25e27d"
    }
  },
  "21.x": {
    "commit": "02e51fd6f4683c8d49dfdfc664adb013611ef585",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "314eae54f1350ad7672c1b848183907e75e81ea20a60372977fd65d15f7c1b23",
      "scripts/packed-consumer-evidence.mjs": "6db43212b26f8f4cb869d8af0cbfe88430bcd73824f333121d305e8693014a0d",
      "compatibility/rc/matrices/full-verify.json": "ac1c87f876e4a8a6785b7c2dcfd8253042d367af7701eae9beb9bd3f3830805f",
      "tests/table_onpush_packed_contract_probe.mjs": "6d73bc9a4ac5c7d29b43101700e21f18d7caf418194b51ee29d127900c528f6e",
      "tests/value_accessor_packed_contract_probe.mjs": "ed3c23b0b7a4789adcd464022adcfbdad4cc4ed5f0cc8fe616faad4e2956648d",
      "tests/packed_required_contract_admission.mjs": "7272f4a20d7c29e29842f0057e79a4f52862698a2d29c195811563aaaa354846",
      "tests/npm_tooling_caller_probe.mjs": "7d7a02592355578d8918d968166f23a7e863c6092ea1f2bfd656f199655a1921",
      "tests/radio_identity_packed_contract_probe.mjs": "acb622255536ea0cd97fccb3aeae0c142787e6dbf7b6bddf60d1086d4b57d987",
      "tests/generated_identity_packed_contract_probe.mjs": "d568a35568e1d657bee5c9af2004038d02fae200ab1ac6270f0b3d31b0b43ef5",
      "tests/test_table_onpush_packed_contract.py": "d63d0736509a033a7655b9c59441d9bd71773bd34de9ea11e8eb394b2f9690b1",
      "tests/test_value_accessor_packed_contract.py": "01150341ff7e1dbd06603634ab8372a278030c8080a0b2186ebb2be32a05dac3",
      "tests/test_radio_identity_packed_contract.py": "43c51f8b4886e5592ae0f44b4f967318a5fbe64c0251c0205dd69af407ac7c5d",
      "tests/test_generated_identity_packed_contract.py": "466abd2f833375f96123b8e0484b5d320279613b006d85268d2748e6bb25e27d"
    }
  }
};
export const SELECT_DETACH_PACKED_EDITS={
  "scripts/packed-consumer-aot-smoke.mjs": [
    [
      "import {packedGeneratedIdentityCase} from './generated-identity-packed-contract.mjs';",
      "import {packedGeneratedIdentityCase} from './generated-identity-packed-contract.mjs';\nimport {selectDetachPackedFixture} from './select-detach-packed-fixture.mjs';\nimport {packedSelectDetachCase} from './select-detach-packed-contract.mjs';"
    ],
    [
      "  const generatedIdentityCase = packedGeneratedIdentityCase(parsed.generatedIdentity);",
      "  const generatedIdentityCase = packedGeneratedIdentityCase(parsed.generatedIdentity);\n  const selectDetachCase = packedSelectDetachCase(parsed.selectScrollDetach);"
    ],
    [
      "    if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;",
      "    if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;\n    if (caseId === selectDetachCase.case_id) return selectDetachCase;"
    ],
    [
      "    writeFileSync(join(consumer, 'src/generated-identity-contract.mjs'), readFileSync(join(root, 'scripts/generated-identity-packed-contract.mjs')));",
      "    writeFileSync(join(consumer, 'src/generated-identity-contract.mjs'), readFileSync(join(root, 'scripts/generated-identity-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/select-detach-probe.ts'), selectDetachPackedFixture());\n    writeFileSync(join(consumer, 'src/select-detach-contract.mjs'), readFileSync(join(root, 'scripts/select-detach-packed-contract.mjs')));"
    ],
    [
      "import {GENERATED_IDENTITY_IMPORTS, observePackedGeneratedIdentity} from './generated-identity-probe';",
      "import {GENERATED_IDENTITY_IMPORTS, observePackedGeneratedIdentity} from './generated-identity-probe';\nimport {SELECT_DETACH_IMPORTS, observePackedSelectDetach} from './select-detach-probe';"
    ],
    [
      "  const generatedIdentity=await observePackedGeneratedIdentity();",
      "  const generatedIdentity=await observePackedGeneratedIdentity();\n  const selectScrollDetach=await observePackedSelectDetach();"
    ],
    [
      "    generatedIdentity:generatedIdentity.observed,",
      "    generatedIdentity:generatedIdentity.observed,\n    selectScrollDetach:selectScrollDetach.observed,"
    ],
    [
      "...GENERATED_IDENTITY_IMPORTS],",
      "...GENERATED_IDENTITY_IMPORTS, ...SELECT_DETACH_IMPORTS],"
    ],
    [
      "&& generatedIdentity.okay && tableOnPush.okay",
      "&& generatedIdentity.okay && selectScrollDetach.okay && tableOnPush.okay"
    ]
  ],
  "scripts/packed-consumer-evidence.mjs": [
    [
      "  'packed-consumer/harness/generated-identity-coexistence',",
      "  'packed-consumer/harness/generated-identity-coexistence',\n  'packed-consumer/harness/select-close-on-real-scroll-detach',"
    ]
  ],
  "tests/table_onpush_packed_contract_probe.mjs": [
    [
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';",
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';\nimport {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';"
    ],
    [
      "'packedGeneratedIdentityCase',text+",
      "'packedGeneratedIdentityCase','packedSelectDetachCase',text+"
    ],
    [
      ",packedGeneratedIdentityCase);",
      ",packedGeneratedIdentityCase,packedSelectDetachCase);"
    ],
    [
      "assert.equal(expected.length,104)",
      "assert.equal(expected.length,105)"
    ],
    [
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';",
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';\nimport {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';"
    ],
    [
      "reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,raw,line),line),line)",
      "reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line),line)"
    ],
    [
      "reverseGeneratedIdentityPackedSource(path,raw,line),line).replace(after,after+'\\n// mutated addition')",
      "reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line).replace(after,after+'\\n// mutated addition')"
    ]
  ],
  "tests/value_accessor_packed_contract_probe.mjs": [
    [
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';",
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';\nimport {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';"
    ],
    [
      "'packedGeneratedIdentityCase',text+",
      "'packedGeneratedIdentityCase','packedSelectDetachCase',text+"
    ],
    [
      ",packedGeneratedIdentityCase);",
      ",packedGeneratedIdentityCase,packedSelectDetachCase);"
    ],
    [
      "assert.equal(expected.length,104)",
      "assert.equal(expected.length,105)"
    ]
  ],
  "tests/packed_required_contract_admission.mjs": [
    [
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';",
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';\nimport {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';"
    ],
    [
      "'packedGeneratedIdentityCase',text+",
      "'packedGeneratedIdentityCase','packedSelectDetachCase',text+"
    ],
    [
      ",packedGeneratedIdentityCase);",
      ",packedGeneratedIdentityCase,packedSelectDetachCase);"
    ]
  ],
  "tests/radio_identity_packed_contract_probe.mjs": [
    [
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';",
      "import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';\nimport {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';"
    ],
    [
      "'packedGeneratedIdentityCase',text+",
      "'packedGeneratedIdentityCase','packedSelectDetachCase',text+"
    ],
    [
      ",packedGeneratedIdentityCase);",
      ",packedGeneratedIdentityCase,packedSelectDetachCase);"
    ],
    [
      "assert.equal(expected.length,104)",
      "assert.equal(expected.length,105)"
    ],
    [
      "assert.equal(new Set(expected).size,104)",
      "assert.equal(new Set(expected).size,105)"
    ],
    [
      "derived_cases:104",
      "derived_cases:105"
    ],
    [
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';",
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';\nimport {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';"
    ],
    [
      "reverseOldRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,raw,line),line)",
      "reverseOldRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line),line)"
    ],
    [
      "const prior=reverseGeneratedIdentityPackedSource(path,read(path),line);",
      "const prior=reverseGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,read(path),line),line);"
    ]
  ],
  "tests/generated_identity_packed_contract_probe.mjs": [
    [
      "import {GENERATED_IDENTITY_CASE_ID, GENERATED_IDENTITY_ROLE_COUNTS, packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';",
      "import {GENERATED_IDENTITY_CASE_ID, GENERATED_IDENTITY_ROLE_COUNTS, packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';\nimport {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';"
    ],
    [
      "'packedGeneratedIdentityCase',text+",
      "'packedGeneratedIdentityCase','packedSelectDetachCase',text+"
    ],
    [
      ",packedGeneratedIdentityCase);",
      ",packedGeneratedIdentityCase,packedSelectDetachCase);"
    ],
    [
      "assert.equal(expected.length,104)",
      "assert.equal(expected.length,105)"
    ],
    [
      "assert.equal(new Set(expected).size,104)",
      "assert.equal(new Set(expected).size,105)"
    ],
    [
      "derived_cases:104",
      "derived_cases:105"
    ],
    [
      "import {GENERATED_IDENTITY_PACKED_PREIMAGES, GENERATED_IDENTITY_PACKED_EDITS, reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';",
      "import {GENERATED_IDENTITY_PACKED_PREIMAGES, GENERATED_IDENTITY_PACKED_EDITS, reverseGeneratedIdentityPackedSource as reverseOldGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';\nimport {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nconst reverseGeneratedIdentityPackedSource=(path,raw,line)=>reverseOldGeneratedIdentityPackedSource(path,reverseSelectDetachPackedSource(path,raw,line),line);"
    ],
    [
      "if(GENERATED_IDENTITY_PACKED_EDITS[path])for(const [,after] of GENERATED_IDENTITY_PACKED_EDITS[path]){assert.ok(read(path).includes(after));assert.throws(()=>reverseGeneratedIdentityPackedSource(path,read(path).replace(after,after+'\\n// mutated addition'),line));sourceNegatives++;}",
      "if(GENERATED_IDENTITY_PACKED_EDITS[path])for(const [,after] of GENERATED_IDENTITY_PACKED_EDITS[path]){const prior=reverseSelectDetachPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldGeneratedIdentityPackedSource(path,prior.replace(after,()=>after+'\\n// mutated addition'),line));sourceNegatives++;}"
    ]
  ],
  "tests/npm_tooling_caller_probe.mjs": [
    [
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';",
      "import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';\nimport {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';"
    ],
    [
      "reverseGeneratedIdentityPackedSource(path, source, line)",
      "reverseGeneratedIdentityPackedSource(path, reverseSelectDetachPackedSource(path, source, line), line)"
    ]
  ],
  "tests/test_table_onpush_packed_contract.py": [
    [
      "observed['derived_cases'], 104",
      "observed['derived_cases'], 105"
    ]
  ],
  "tests/test_value_accessor_packed_contract.py": [
    [
      "observed['derived_cases'], 104",
      "observed['derived_cases'], 105"
    ]
  ],
  "tests/test_radio_identity_packed_contract.py": [
    [
      "('derived_cases', 104)",
      "('derived_cases', 105)"
    ]
  ],
  "tests/test_generated_identity_packed_contract.py": [
    [
      "('derived_cases', 104)",
      "('derived_cases', 105)"
    ]
  ]
};

const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function reverseSelectDetachPackedSource(path,raw,line){
 const subject=SELECT_DETACH_PACKED_PREIMAGES[line];assert.ok(subject,'unknown source line');assert.ok(subject.members[path],'foreign select-detach packed source path');let restored;
 if(path==='compatibility/rc/matrices/full-verify.json'){
  const matrix=JSON.parse(raw);assert.equal(raw,JSON.stringify(matrix,null,2)+'\n');const check=matrix.checks.find(row=>row.check_id==='packed-consumer');assert.ok(check);
  for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch].harness;if(roster===null)continue;const id='packed-consumer/harness/select-close-on-real-scroll-detach';assert.equal(roster.filter(value=>value===id).length,1);check.acceptance.cases_by_line[branch].harness=roster.filter(value=>value!==id);}
  restored=JSON.stringify(matrix,null,2)+'\n';
 }else{
  restored=raw;for(const [before,after]of [...SELECT_DETACH_PACKED_EDITS[path]].reverse()){assert.equal(restored.split(after).length,2,'missing/mutated/duplicate select-detach packed addition');restored=restored.replace(after,()=>before);}
 }
 assert.equal(hash(restored),subject.members[path],'unrelated prior source changed');return restored;
}
