/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Additive guard: every earlier preimage remains unchanged.
export const MENU_ITEM_TOKEN_PACKED_PREIMAGES={
  "main": {
    "commit": "36bdb89c4bb7f86951b44debd8f2afb713210707",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "122541a3940d971e1ebbd8efa2abc53d5b0387b36a92fe04bae17adfa1901f50",
      "scripts/packed-consumer-evidence.mjs": "1bffb1b4ff8cbe209d601c4d8a7672fd571d08948f97381952613b89c3ccdc0c",
      "compatibility/rc/matrices/full-verify.json": "20b8bc6f5b281810d77c98d4f347d1e28b543fd710139772d172a0b34bb133e4",
      "tests/table_onpush_packed_contract_probe.mjs": "4ca39541fba3a7f2bf058c2b872f7e80eebc6d7c3f1bc100bfcf6f5602dd0886",
      "tests/value_accessor_packed_contract_probe.mjs": "fe9cf3f599196127e00712a4af75c5087d30191e8e34fd5404f7dd59abb6d6c9",
      "tests/packed_required_contract_admission.mjs": "9f4cce001d9f0d458c06682e676830d00b79141723d354bf970f4600b21e33e9",
      "tests/npm_tooling_caller_probe.mjs": "0f763c552c8a1b5bf0ac7f43f490aa667562c916dd7902f8de029746cfd2aae7",
      "tests/radio_identity_packed_contract_probe.mjs": "de12a01168130d21f3b2067a113fe8bb9908ccfccf922b4abd6246d43c10a13e",
      "tests/generated_identity_packed_contract_probe.mjs": "447ddd88951d37c46b882638a9525242c21e5354e17b88908fb74608cc6cfec0",
      "tests/select_detach_packed_contract_probe.mjs": "555606a802b2eccc30323d8d32b16888ad555efbb08f24224cbed783afac1a49",
      "tests/test_table_onpush_packed_contract.py": "7c2c95b4076ee90f4757c1a65ece0e3c21e9b05834c1ae5e8faf9424374fe884",
      "tests/test_value_accessor_packed_contract.py": "376dbee039c87ab09d00fac1b2205b22e769f7e31adc448da2cb127ce90781c6",
      "tests/test_radio_identity_packed_contract.py": "eff5bd12a4abfbcaa0e1e15d1b0ea49f9e9b13da043ae735899bf7b94db8a9d0",
      "tests/test_generated_identity_packed_contract.py": "9c9fd9d7bf56c2518ee40ab6dbf027551ab297a1a7102c41db6d4e0d1f884cfd",
      "tests/test_select_detach_packed_contract.py": "ee9421207ae0bf8aa02d7561a2bb7f7cf5fdcbf06f9e2280b773f647a77dcee6"
    }
  },
  "21.x": {
    "commit": "ef5a135865ebff54fd7946953c046469b032349e",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "9f8e7c13a1d39116e1d478a0ff48c6ecef963971d35bf927eaf396fc80dc60f6",
      "scripts/packed-consumer-evidence.mjs": "e3e5fc2d87e2577336bc94989d05067326dd607710f2935edd52154f5950ce7c",
      "compatibility/rc/matrices/full-verify.json": "d5038bad5ac41552e7e30b3ab1308dd56bcc71a767073e451a0bab7baefd3f6d",
      "tests/table_onpush_packed_contract_probe.mjs": "4ca39541fba3a7f2bf058c2b872f7e80eebc6d7c3f1bc100bfcf6f5602dd0886",
      "tests/value_accessor_packed_contract_probe.mjs": "fe9cf3f599196127e00712a4af75c5087d30191e8e34fd5404f7dd59abb6d6c9",
      "tests/packed_required_contract_admission.mjs": "9f4cce001d9f0d458c06682e676830d00b79141723d354bf970f4600b21e33e9",
      "tests/npm_tooling_caller_probe.mjs": "0f763c552c8a1b5bf0ac7f43f490aa667562c916dd7902f8de029746cfd2aae7",
      "tests/radio_identity_packed_contract_probe.mjs": "de12a01168130d21f3b2067a113fe8bb9908ccfccf922b4abd6246d43c10a13e",
      "tests/generated_identity_packed_contract_probe.mjs": "447ddd88951d37c46b882638a9525242c21e5354e17b88908fb74608cc6cfec0",
      "tests/select_detach_packed_contract_probe.mjs": "555606a802b2eccc30323d8d32b16888ad555efbb08f24224cbed783afac1a49",
      "tests/test_table_onpush_packed_contract.py": "7c2c95b4076ee90f4757c1a65ece0e3c21e9b05834c1ae5e8faf9424374fe884",
      "tests/test_value_accessor_packed_contract.py": "376dbee039c87ab09d00fac1b2205b22e769f7e31adc448da2cb127ce90781c6",
      "tests/test_radio_identity_packed_contract.py": "eff5bd12a4abfbcaa0e1e15d1b0ea49f9e9b13da043ae735899bf7b94db8a9d0",
      "tests/test_generated_identity_packed_contract.py": "9c9fd9d7bf56c2518ee40ab6dbf027551ab297a1a7102c41db6d4e0d1f884cfd",
      "tests/test_select_detach_packed_contract.py": "ee9421207ae0bf8aa02d7561a2bb7f7cf5fdcbf06f9e2280b773f647a77dcee6"
    }
  }
};
export const MENU_ITEM_TOKEN_PACKED_EDITS={
  "scripts/packed-consumer-aot-smoke.mjs": [
    [
      "import {packedSelectDetachCase} from './select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from './select-detach-packed-contract.mjs';\nimport {menuItemTokenPackedFixture} from './menu-item-token-packed-fixture.mjs';\nimport {packedMenuItemTokenCase} from './menu-item-token-packed-contract.mjs';"
    ],
    [
      "  const selectDetachCase = packedSelectDetachCase(parsed.selectScrollDetach);",
      "  const selectDetachCase = packedSelectDetachCase(parsed.selectScrollDetach);\n  const menuItemTokenCase = packedMenuItemTokenCase(parsed.menuItemToken);"
    ],
    [
      "    if (caseId === selectDetachCase.case_id) return selectDetachCase;",
      "    if (caseId === selectDetachCase.case_id) return selectDetachCase;\n    if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;"
    ],
    [
      "    writeFileSync(join(consumer, 'src/select-detach-contract.mjs'), readFileSync(join(root, 'scripts/select-detach-packed-contract.mjs')));",
      "    writeFileSync(join(consumer, 'src/select-detach-contract.mjs'), readFileSync(join(root, 'scripts/select-detach-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/menu-item-token-probe.ts'), menuItemTokenPackedFixture());\n    writeFileSync(join(consumer, 'src/menu-item-token-contract.mjs'), readFileSync(join(root, 'scripts/menu-item-token-packed-contract.mjs')));"
    ],
    [
      "import {SELECT_DETACH_IMPORTS, observePackedSelectDetach} from './select-detach-probe';",
      "import {SELECT_DETACH_IMPORTS, observePackedSelectDetach} from './select-detach-probe';\nimport {MENU_ITEM_TOKEN_IMPORTS, observePackedMenuItemToken} from './menu-item-token-probe';"
    ],
    [
      "  const selectScrollDetach=await observePackedSelectDetach();",
      "  const selectScrollDetach=await observePackedSelectDetach();\n  const menuItemToken=await observePackedMenuItemToken();"
    ],
    [
      "    selectScrollDetach:selectScrollDetach.observed,",
      "    selectScrollDetach:selectScrollDetach.observed,\n    menuItemToken:menuItemToken.observed,"
    ],
    [
      "...SELECT_DETACH_IMPORTS],",
      "...SELECT_DETACH_IMPORTS, ...MENU_ITEM_TOKEN_IMPORTS],"
    ],
    [
      "&& selectScrollDetach.okay && tableOnPush.okay",
      "&& selectScrollDetach.okay && menuItemToken.okay && tableOnPush.okay"
    ]
  ],
  "scripts/packed-consumer-evidence.mjs": [
    [
      "  'packed-consumer/harness/select-close-on-real-scroll-detach',",
      "  'packed-consumer/harness/select-close-on-real-scroll-detach',\n  'packed-consumer/harness/nested-menu-item-token-ownership',"
    ]
  ],
  "tests/table_onpush_packed_contract_probe.mjs": [
    [
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ],
    [
      "expected.length,105",
      "expected.length,106"
    ],
    [
      "import {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';",
      "import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nimport {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nconst reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/value_accessor_packed_contract_probe.mjs": [
    [
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ],
    [
      "expected.length,105",
      "expected.length,106"
    ]
  ],
  "tests/packed_required_contract_admission.mjs": [
    [
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ]
  ],
  "tests/radio_identity_packed_contract_probe.mjs": [
    [
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ],
    [
      "expected.length,105",
      "expected.length,106"
    ],
    [
      "new Set(expected).size,105",
      "new Set(expected).size,106"
    ],
    [
      "derived_cases:105",
      "derived_cases:106"
    ],
    [
      "import {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';",
      "import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nimport {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nconst reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/generated_identity_packed_contract_probe.mjs": [
    [
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ],
    [
      "expected.length,105",
      "expected.length,106"
    ],
    [
      "new Set(expected).size,105",
      "new Set(expected).size,106"
    ],
    [
      "derived_cases:105",
      "derived_cases:106"
    ],
    [
      "import {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';",
      "import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nimport {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nconst reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/select_detach_packed_contract_probe.mjs": [
    [
      "import {SELECT_DETACH_CASE_ID,packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';",
      "import {SELECT_DETACH_CASE_ID,packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';\nimport {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';"
    ],
    [
      "'packedSelectDetachCase',text+",
      "'packedSelectDetachCase','packedMenuItemTokenCase',text+"
    ],
    [
      ",packedSelectDetachCase);",
      ",packedSelectDetachCase,packedMenuItemTokenCase);"
    ],
    [
      "expected.length,105",
      "expected.length,106"
    ],
    [
      "new Set(expected).size,105",
      "new Set(expected).size,106"
    ],
    [
      "derived_cases:105",
      "derived_cases:106"
    ],
    [
      "import {SELECT_DETACH_PACKED_PREIMAGES,SELECT_DETACH_PACKED_EDITS,reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';",
      "import {SELECT_DETACH_PACKED_PREIMAGES,SELECT_DETACH_PACKED_EDITS,reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nimport {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nconst reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);"
    ],
    [
      "if(SELECT_DETACH_PACKED_EDITS[path])for(const [,after]of SELECT_DETACH_PACKED_EDITS[path]){assert.ok(read(path).includes(after));assert.throws(()=>reverseSelectDetachPackedSource(path,read(path).replace(after,after+'\\n// foreign addition'),line));sourceNegatives++;}",
      "if(SELECT_DETACH_PACKED_EDITS[path])for(const [,after]of SELECT_DETACH_PACKED_EDITS[path]){const prior=reverseMenuItemTokenPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldSelectDetachPackedSource(path,prior.replace(after,()=>after+'\\n// foreign addition'),line));sourceNegatives++;}"
    ]
  ],
  "tests/npm_tooling_caller_probe.mjs": [
    [
      "import {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';",
      "import {reverseSelectDetachPackedSource as reverseOldSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';\nimport {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nconst reverseSelectDetachPackedSource=(path,raw,line)=>reverseOldSelectDetachPackedSource(path,reverseMenuItemTokenPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/test_table_onpush_packed_contract.py": [
    [
      "observed['derived_cases'], 105",
      "observed['derived_cases'], 106"
    ]
  ],
  "tests/test_value_accessor_packed_contract.py": [
    [
      "observed['derived_cases'], 105",
      "observed['derived_cases'], 106"
    ]
  ],
  "tests/test_radio_identity_packed_contract.py": [
    [
      "('derived_cases', 105)",
      "('derived_cases', 106)"
    ]
  ],
  "tests/test_generated_identity_packed_contract.py": [
    [
      "('derived_cases', 105)",
      "('derived_cases', 106)"
    ]
  ],
  "tests/test_select_detach_packed_contract.py": [
    [
      "('derived_cases', 105)",
      "('derived_cases', 106)"
    ]
  ]
};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function reverseMenuItemTokenPackedSource(path,raw,line){
 const subject=MENU_ITEM_TOKEN_PACKED_PREIMAGES[line];assert.ok(subject,'unknown source line');assert.ok(subject.members[path],'foreign menu-token source path');let restored;
 if(path==='compatibility/rc/matrices/full-verify.json'){
  const matrix=JSON.parse(raw);assert.equal(raw,JSON.stringify(matrix,null,2)+'\n');const check=matrix.checks.find(row=>row.check_id==='packed-consumer');assert.ok(check);
  for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch].harness;if(roster===null)continue;const id='packed-consumer/harness/nested-menu-item-token-ownership';assert.equal(roster.filter(value=>value===id).length,1);check.acceptance.cases_by_line[branch].harness=roster.filter(value=>value!==id);}
  restored=JSON.stringify(matrix,null,2)+'\n';
 }else{
  restored=raw;for(const [before,after]of [...MENU_ITEM_TOKEN_PACKED_EDITS[path]].reverse()){assert.equal(restored.split(after).length,2,'missing/mutated/duplicate menu-token addition');restored=restored.replace(after,()=>before);}
 }
 assert.equal(hash(restored),subject.members[path],'unrelated prior source changed');return restored;
}
