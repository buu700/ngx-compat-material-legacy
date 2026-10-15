/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Earlier preimages stay immutable; unchanged bound subjects pass through exactly.
export const SELECT_FOCUS_CLICK_PREIMAGES={
  "main": {
    "commit": "968fe831660aef19af55625316ba28a1a006c64c",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "87768ebf87c9531ba2918ace2e24a59bb52a037a3f2b141f9cfb4561ce825069",
      "scripts/packed-consumer-evidence.mjs": "1f58b3ce058288910b0887d02692b4d0595daa0f50365216c467600102940a62",
      "compatibility/rc/matrices/full-verify.json": "41e2cdb30d4af995966b00f039dbe67443a1476deba218a017645f0bb763b912",
      "tests/table_onpush_packed_contract_probe.mjs": "88c2e481488c8360e81fbe974345ed7b2a867c7020d7feb7443dc97cb611f75d",
      "tests/value_accessor_packed_contract_probe.mjs": "835e2af1aec0f06d3980b7dcbf40e4deb7d5dc475258124d28ed1b75f572f5d3",
      "tests/packed_required_contract_admission.mjs": "614760223ed5ad4ee080ce0aad85957dc4567ded0f6fa8e52c73c7fccb511d2f",
      "tests/npm_tooling_caller_probe.mjs": "7487701952a9fcf10816116709459d599d77dd8b92a1dbfb60cbe8850cfe767c",
      "tests/radio_identity_packed_contract_probe.mjs": "e5cc2a6f61e2e2cdcbe0f6ba96a9a60137f4d0229d8f308fa0fc5e830be46b7a",
      "tests/generated_identity_packed_contract_probe.mjs": "e5934a962924fbbd631c45b1556ed5c355026e9d1104f87329a293b1700296cd",
      "tests/select_detach_packed_contract_probe.mjs": "7c8608f1ad2882450ac69775a183b7e64b3d2d6bee9eed60d5c4f26444a9c5bf",
      "tests/test_table_onpush_packed_contract.py": "979d4e1adde24e1beee0d0806aba7c57dc39cc433c78038349f675ce62f8ce4f",
      "tests/test_value_accessor_packed_contract.py": "352c09ad5a22271aeb62f2f97fdb9a89f93f93f5a81c45b413f5553e11ce2158",
      "tests/test_radio_identity_packed_contract.py": "1991b12ff1b77e964452f186a88380369e2de3f2f46f007b26469a39643fa0fd",
      "tests/test_generated_identity_packed_contract.py": "c026f9f3d9f761ee89df12ffd1c891d7be7adb87378c3a4d97d18c8643a59895",
      "tests/test_select_detach_packed_contract.py": "efa2ceabec3906fa21b92b0a1c97a4c4c214d868b6e2ec5fd80b647b994407b4",
      "tests/menu_item_token_packed_contract_probe.mjs": "5e6ef7a1d64199720bfa120db898dbcb27ae07f5facc7ebb6ab7a8e8f237a7a0"
    }
  },
  "21.x": {
    "commit": "ebd8e750c0905181074efe26330a79d59ae1405d",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "8b7d31c5745b7bf3f5425d5f5502553cf9fd0decef5b3ed7440363ba267b8a10",
      "scripts/packed-consumer-evidence.mjs": "c2152e7c9144ada5732d0a2f884beaca96f03aef2e740656683748dcebe96672",
      "compatibility/rc/matrices/full-verify.json": "3183957162d74d931bdd1f41c56d48f637599065ea16ff2b02b922ee68fdc224",
      "tests/table_onpush_packed_contract_probe.mjs": "88c2e481488c8360e81fbe974345ed7b2a867c7020d7feb7443dc97cb611f75d",
      "tests/value_accessor_packed_contract_probe.mjs": "835e2af1aec0f06d3980b7dcbf40e4deb7d5dc475258124d28ed1b75f572f5d3",
      "tests/packed_required_contract_admission.mjs": "614760223ed5ad4ee080ce0aad85957dc4567ded0f6fa8e52c73c7fccb511d2f",
      "tests/npm_tooling_caller_probe.mjs": "7487701952a9fcf10816116709459d599d77dd8b92a1dbfb60cbe8850cfe767c",
      "tests/radio_identity_packed_contract_probe.mjs": "e5cc2a6f61e2e2cdcbe0f6ba96a9a60137f4d0229d8f308fa0fc5e830be46b7a",
      "tests/generated_identity_packed_contract_probe.mjs": "e5934a962924fbbd631c45b1556ed5c355026e9d1104f87329a293b1700296cd",
      "tests/select_detach_packed_contract_probe.mjs": "7c8608f1ad2882450ac69775a183b7e64b3d2d6bee9eed60d5c4f26444a9c5bf",
      "tests/test_table_onpush_packed_contract.py": "979d4e1adde24e1beee0d0806aba7c57dc39cc433c78038349f675ce62f8ce4f",
      "tests/test_value_accessor_packed_contract.py": "352c09ad5a22271aeb62f2f97fdb9a89f93f93f5a81c45b413f5553e11ce2158",
      "tests/test_radio_identity_packed_contract.py": "1991b12ff1b77e964452f186a88380369e2de3f2f46f007b26469a39643fa0fd",
      "tests/test_generated_identity_packed_contract.py": "c026f9f3d9f761ee89df12ffd1c891d7be7adb87378c3a4d97d18c8643a59895",
      "tests/test_select_detach_packed_contract.py": "efa2ceabec3906fa21b92b0a1c97a4c4c214d868b6e2ec5fd80b647b994407b4",
      "tests/menu_item_token_packed_contract_probe.mjs": "5e6ef7a1d64199720bfa120db898dbcb27ae07f5facc7ebb6ab7a8e8f237a7a0"
    }
  }
};
export const SELECT_FOCUS_CLICK_EDITS={
  "scripts/packed-consumer-aot-smoke.mjs": [
    [
      "import {packedMenuItemTokenCase} from './menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from './menu-item-token-packed-contract.mjs';\nimport {selectFocusClickPackedFixture} from './select-focus-click-packed-fixture.mjs';\nimport {packedSelectFocusClickCase} from './select-focus-click-packed-contract.mjs';"
    ],
    [
      "  const menuItemTokenCase = packedMenuItemTokenCase(parsed.menuItemToken);",
      "  const menuItemTokenCase = packedMenuItemTokenCase(parsed.menuItemToken);\n  const selectFocusClickCase = packedSelectFocusClickCase(parsed.selectFocusClick);"
    ],
    [
      "    writeFileSync(join(consumer, 'src/menu-item-token-contract.mjs'), readFileSync(join(root, 'scripts/menu-item-token-packed-contract.mjs')));",
      "    writeFileSync(join(consumer, 'src/menu-item-token-contract.mjs'), readFileSync(join(root, 'scripts/menu-item-token-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/select-focus-click-probe.ts'), selectFocusClickPackedFixture());\n    writeFileSync(join(consumer, 'src/select-focus-click-contract.mjs'), readFileSync(join(root, 'scripts/select-focus-click-packed-contract.mjs')));"
    ],
    [
      "import {MENU_ITEM_TOKEN_IMPORTS, observePackedMenuItemToken} from './menu-item-token-probe';",
      "import {MENU_ITEM_TOKEN_IMPORTS, observePackedMenuItemToken} from './menu-item-token-probe';\nimport {SELECT_FOCUS_CLICK_IMPORTS, observePackedSelectFocusClick} from './select-focus-click-probe';"
    ],
    [
      "  const menuItemToken=await observePackedMenuItemToken();",
      "  const menuItemToken=await observePackedMenuItemToken();\n  const selectFocusClick=await observePackedSelectFocusClick();"
    ],
    [
      "    menuItemToken:menuItemToken.observed,",
      "    menuItemToken:menuItemToken.observed,\n    selectFocusClick:selectFocusClick.observed,"
    ],
    [
      "...MENU_ITEM_TOKEN_IMPORTS],",
      "...MENU_ITEM_TOKEN_IMPORTS, ...SELECT_FOCUS_CLICK_IMPORTS],"
    ],
    [
      "&& menuItemToken.okay && tableOnPush.okay",
      "&& menuItemToken.okay && selectFocusClick.okay && tableOnPush.okay"
    ],
    [
      "    if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;",
      "    if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;\n    if (caseId === selectFocusClickCase.case_id) {\n      const ok = harnessMap[caseId] === true && selectFocusClickCase.result === 'pass';\n      return {...selectFocusClickCase, result: ok ? 'pass' : 'fail',\n        legacy_harness_passed: harnessMap[caseId] === true,\n        failure: ok ? null : selectFocusClickCase.failure || 'Original select harness conditions failed'};\n    }"
    ]
  ],
  "tests/table_onpush_packed_contract_probe.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ],
    [
      "import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/value_accessor_packed_contract_probe.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ]
  ],
  "tests/packed_required_contract_admission.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ]
  ],
  "tests/radio_identity_packed_contract_probe.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ],
    [
      "import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/generated_identity_packed_contract_probe.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ],
    [
      "import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/select_detach_packed_contract_probe.mjs": [
    [
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ],
    [
      "import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ]
  ],
  "tests/menu_item_token_packed_contract_probe.mjs": [
    [
      "import {MENU_ITEM_TOKEN_CASE_ID,packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';",
      "import {MENU_ITEM_TOKEN_CASE_ID,packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';\nimport {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';"
    ],
    [
      "'packedMenuItemTokenCase',text+",
      "'packedMenuItemTokenCase','packedSelectFocusClickCase',text+"
    ],
    [
      ",packedMenuItemTokenCase);",
      ",packedMenuItemTokenCase,packedSelectFocusClickCase);"
    ],
    [
      "import {MENU_ITEM_TOKEN_PACKED_PREIMAGES,MENU_ITEM_TOKEN_PACKED_EDITS,reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {MENU_ITEM_TOKEN_PACKED_PREIMAGES,MENU_ITEM_TOKEN_PACKED_EDITS,reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ],
    [
      "if(MENU_ITEM_TOKEN_PACKED_EDITS[path])for(const [,after]of MENU_ITEM_TOKEN_PACKED_EDITS[path]){assert.ok(read(path).includes(after));assert.throws(()=>reverseMenuItemTokenPackedSource(path,read(path).replace(after,()=>after+'\\n// foreign addition'),line));sourceNegatives++;}",
      "if(MENU_ITEM_TOKEN_PACKED_EDITS[path])for(const [,after]of MENU_ITEM_TOKEN_PACKED_EDITS[path]){const prior=reverseSelectFocusClickPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldMenuItemTokenPackedSource(path,prior.replace(after,()=>after+'\\n// foreign addition'),line));sourceNegatives++;}"
    ]
  ],
  "tests/npm_tooling_caller_probe.mjs": [
    [
      "import {reverseMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';",
      "import {reverseMenuItemTokenPackedSource as reverseOldMenuItemTokenPackedSource} from '../scripts/menu-item-token-packed-source-requalification.mjs';\nimport {reverseSelectFocusClickPackedSource} from '../scripts/select-focus-click-packed-source-requalification.mjs';\nconst reverseMenuItemTokenPackedSource=(path,raw,line)=>reverseOldMenuItemTokenPackedSource(path,reverseSelectFocusClickPackedSource(path,raw,line),line);"
    ]
  ]
};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function reverseSelectFocusClickPackedSource(path,raw,line){
 const subject=SELECT_FOCUS_CLICK_PREIMAGES[line];assert.ok(subject,'unknown source line');assert.ok(subject.members[path],'foreign select focus/click source path');
 let restored=raw;
 for(const [before,after]of [...(SELECT_FOCUS_CLICK_EDITS[path]||[])].reverse()){
  assert.equal(restored.split(after).length,2,'missing/mutated/duplicate select focus/click addition');restored=restored.replace(after,()=>before);
 }
 assert.equal(hash(restored),subject.members[path],'unrelated prior source changed');return restored;
}
