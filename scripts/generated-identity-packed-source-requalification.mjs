/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// New additive guard. Earlier radio/OnPush/npm preimages remain immutable.
export const GENERATED_IDENTITY_PACKED_PREIMAGES = {
  "main": {
    "commit": "06506ea39cca715aca53272f8ab70eaa94e62e0c",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "e53c3fd2e3c05f2fc38ffee59bd89b9e526bf5d267f79bb7d76dd42be5480889",
      "scripts/packed-consumer-evidence.mjs": "60afcc252b3175f195176f61930a32b5707eaae162f94422cea47dee89c1933f",
      "compatibility/rc/matrices/full-verify.json": "ab63473fba5497d4205cd579522e36697a2b2d66ffa31f9a334a2802571b3634",
      "tests/table_onpush_packed_contract_probe.mjs": "6f7634606c19c2de173317ce5a5da70213cc53b66e6c9896dd199d4de39c7144",
      "tests/value_accessor_packed_contract_probe.mjs": "dad853db3887561a89af5f168134ee8c26e9372f5cf0513571b504fd7164eb39",
      "tests/packed_required_contract_admission.mjs": "71d3bd5844bf2f673720a4ff778b9fb35b4ebb2eef2eb35ac44b8e0853ca65ac",
      "tests/npm_tooling_caller_probe.mjs": "62dda7c6d7cfe6285981c0aab228fbcd680f99e5534b4f1280599fa654d52896",
      "tests/radio_identity_packed_contract_probe.mjs": "b42ec0245108f42b3e8174f7d09dd7a1fc4c3286ffee130d7b1cf0b823b91b0c",
      "tests/test_table_onpush_packed_contract.py": "0d6af3ec8007784ab6a62f0155d1c760e1de93456233baf1bff4f8b92b40ecba",
      "tests/test_value_accessor_packed_contract.py": "d2be07d67df4280dfe5147c068ff15fc57fcab42c10b1b211b17c205376fb299",
      "tests/test_radio_identity_packed_contract.py": "c8d3ae951aa8ab6ad6a6180fe8da89a3d70d56f67f14e0d80a269bbfc15a5307"
    }
  },
  "21.x": {
    "commit": "b2e4bcb57c1d0f4661e4fcca3b44bf91fb3b98d0",
    "members": {
      "scripts/packed-consumer-aot-smoke.mjs": "0169352af254c28f710e72f4f9f4ad4d7682cff719588e73062ab1b11c209bc6",
      "scripts/packed-consumer-evidence.mjs": "bb322954989d5ba432cd71628986c0b57d433f18ff29c9c02455e462b29d45a8",
      "compatibility/rc/matrices/full-verify.json": "18003e879a920219201d1a40ded8210da77146857927b4635fc1275343540566",
      "tests/table_onpush_packed_contract_probe.mjs": "6f7634606c19c2de173317ce5a5da70213cc53b66e6c9896dd199d4de39c7144",
      "tests/value_accessor_packed_contract_probe.mjs": "dad853db3887561a89af5f168134ee8c26e9372f5cf0513571b504fd7164eb39",
      "tests/packed_required_contract_admission.mjs": "71d3bd5844bf2f673720a4ff778b9fb35b4ebb2eef2eb35ac44b8e0853ca65ac",
      "tests/npm_tooling_caller_probe.mjs": "62dda7c6d7cfe6285981c0aab228fbcd680f99e5534b4f1280599fa654d52896",
      "tests/radio_identity_packed_contract_probe.mjs": "b42ec0245108f42b3e8174f7d09dd7a1fc4c3286ffee130d7b1cf0b823b91b0c",
      "tests/test_table_onpush_packed_contract.py": "0d6af3ec8007784ab6a62f0155d1c760e1de93456233baf1bff4f8b92b40ecba",
      "tests/test_value_accessor_packed_contract.py": "d2be07d67df4280dfe5147c068ff15fc57fcab42c10b1b211b17c205376fb299",
      "tests/test_radio_identity_packed_contract.py": "c8d3ae951aa8ab6ad6a6180fe8da89a3d70d56f67f14e0d80a269bbfc15a5307"
    }
  }
};
export const GENERATED_IDENTITY_PACKED_EDITS = {
  "scripts/packed-consumer-aot-smoke.mjs": [
    [
      "import {packedRadioIdentityCase} from './radio-identity-packed-contract.mjs';",
      "import {packedRadioIdentityCase} from './radio-identity-packed-contract.mjs';\nimport {generatedIdentityPackedFixture} from './generated-identity-packed-fixture.mjs';\nimport {packedGeneratedIdentityCase} from './generated-identity-packed-contract.mjs';"
    ],
    [
      "  const radioIdentityCase = packedRadioIdentityCase(parsed.radioIdentity);",
      "  const radioIdentityCase = packedRadioIdentityCase(parsed.radioIdentity);\n  const generatedIdentityCase = packedGeneratedIdentityCase(parsed.generatedIdentity);"
    ],
    [
      "    if (caseId === radioIdentityCase.case_id) return radioIdentityCase;",
      "    if (caseId === radioIdentityCase.case_id) return radioIdentityCase;\n    if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;"
    ],
    [
      "    writeFileSync(join(consumer, 'src/radio-identity-contract.mjs'), readFileSync(join(root, 'scripts/radio-identity-packed-contract.mjs')));",
      "    writeFileSync(join(consumer, 'src/radio-identity-contract.mjs'), readFileSync(join(root, 'scripts/radio-identity-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/generated-identity-probe.ts'), generatedIdentityPackedFixture());\n    writeFileSync(join(consumer, 'src/generated-identity-contract.mjs'), readFileSync(join(root, 'scripts/generated-identity-packed-contract.mjs')));"
    ],
    [
      "import {PackedRadioIdentityHost, observePackedRadioIdentity} from './radio-identity-probe';",
      "import {PackedRadioIdentityHost, observePackedRadioIdentity} from './radio-identity-probe';\nimport {GENERATED_IDENTITY_IMPORTS, observePackedGeneratedIdentity} from './generated-identity-probe';"
    ],
    [
      "  const radioIdentity=await observePackedRadioIdentity();",
      "  const radioIdentity=await observePackedRadioIdentity();\n  const generatedIdentity=await observePackedGeneratedIdentity();"
    ],
    [
      "    radioIdentity:radioIdentity.observed,",
      "    radioIdentity:radioIdentity.observed,\n    generatedIdentity:generatedIdentity.observed,"
    ],
    [
      "PackedOnPushTableHost, PackedRadioIdentityHost],",
      "PackedOnPushTableHost, PackedRadioIdentityHost, ...GENERATED_IDENTITY_IMPORTS],"
    ],
    [
      "&& radioIdentity.okay && tableOnPush.okay",
      "&& radioIdentity.okay && generatedIdentity.okay && tableOnPush.okay"
    ]
  ],
  "scripts/packed-consumer-evidence.mjs": [
    [
      "  'packed-consumer/harness/radio-generated-identity-coexistence',",
      "  'packed-consumer/harness/radio-generated-identity-coexistence',\n  'packed-consumer/harness/generated-identity-coexistence',"
    ]
  ],
  "tests/table_onpush_packed_contract_probe.mjs": [
    [
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';",
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';\nimport {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';"
    ],
    [
      "'packedRadioIdentityCase',text+",
      "'packedRadioIdentityCase','packedGeneratedIdentityCase',text+"
    ],
    [
      ",packedRadioIdentityCase);",
      ",packedRadioIdentityCase,packedGeneratedIdentityCase);"
    ],
    [
      "assert.equal(expected.length,103)",
      "assert.equal(expected.length,104)"
    ],
    [
      "import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';",
      "import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';\nimport {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';"
    ],
    [
      "reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,raw,line),line)",
      "reverseOldTableOnPushPackedSource(path,reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,raw,line),line),line)"
    ],
    [
      "reverseRadioIdentityPackedSource(path,raw,line).replace(after,after+'\\n// mutated addition')",
      "reverseRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,raw,line),line).replace(after,after+'\\n// mutated addition')"
    ]
  ],
  "tests/value_accessor_packed_contract_probe.mjs": [
    [
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';",
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';\nimport {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';"
    ],
    [
      "'packedRadioIdentityCase',text+",
      "'packedRadioIdentityCase','packedGeneratedIdentityCase',text+"
    ],
    [
      ",packedRadioIdentityCase);",
      ",packedRadioIdentityCase,packedGeneratedIdentityCase);"
    ],
    [
      "assert.equal(expected.length,103)",
      "assert.equal(expected.length,104)"
    ]
  ],
  "tests/packed_required_contract_admission.mjs": [
    [
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';",
      "import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';\nimport {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';"
    ],
    [
      "'packedRadioIdentityCase',text+",
      "'packedRadioIdentityCase','packedGeneratedIdentityCase',text+"
    ],
    [
      ",packedRadioIdentityCase);",
      ",packedRadioIdentityCase,packedGeneratedIdentityCase);"
    ]
  ],
  "tests/radio_identity_packed_contract_probe.mjs": [
    [
      "import {RADIO_IDENTITY_CASE_ID,packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';",
      "import {RADIO_IDENTITY_CASE_ID,packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';\nimport {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';"
    ],
    [
      "'packedRadioIdentityCase',text+",
      "'packedRadioIdentityCase','packedGeneratedIdentityCase',text+"
    ],
    [
      ",packedRadioIdentityCase);",
      ",packedRadioIdentityCase,packedGeneratedIdentityCase);"
    ],
    [
      "assert.equal(expected.length,103)",
      "assert.equal(expected.length,104)"
    ],
    [
      "assert.equal(new Set(expected).size,103)",
      "assert.equal(new Set(expected).size,104)"
    ],
    [
      "import {RADIO_IDENTITY_PACKED_PREIMAGES,RADIO_IDENTITY_PACKED_EDITS,reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';",
      "import {RADIO_IDENTITY_PACKED_PREIMAGES,RADIO_IDENTITY_PACKED_EDITS,reverseRadioIdentityPackedSource as reverseOldRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';\nimport {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';\nconst reverseRadioIdentityPackedSource=(path,raw,line)=>reverseOldRadioIdentityPackedSource(path,reverseGeneratedIdentityPackedSource(path,raw,line),line);"
    ],
    [
      "if(RADIO_IDENTITY_PACKED_EDITS[path])for(const [,after] of RADIO_IDENTITY_PACKED_EDITS[path]){assert.ok(read(path).includes(after));assert.throws(()=>reverseRadioIdentityPackedSource(path,read(path).replace(after,after+'\\n// mutated addition'),line));sourceNegatives++;}",
      "if(RADIO_IDENTITY_PACKED_EDITS[path])for(const [,after] of RADIO_IDENTITY_PACKED_EDITS[path]){const prior=reverseGeneratedIdentityPackedSource(path,read(path),line);assert.ok(prior.includes(after));assert.throws(()=>reverseOldRadioIdentityPackedSource(path,prior.replace(after,after+'\\n// mutated addition'),line));sourceNegatives++;}"
    ],
    [
      "derived_cases:103",
      "derived_cases:104"
    ]
  ],
  "tests/npm_tooling_caller_probe.mjs": [
    [
      "import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';",
      "import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';\nimport {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';"
    ],
    [
      "reverseRadioIdentityPackedSource(path, source, line)",
      "reverseRadioIdentityPackedSource(path, reverseGeneratedIdentityPackedSource(path, source, line), line)"
    ]
  ],
  "tests/test_table_onpush_packed_contract.py": [
    [
      "observed['derived_cases'], 103",
      "observed['derived_cases'], 104"
    ]
  ],
  "tests/test_value_accessor_packed_contract.py": [
    [
      "observed['derived_cases'], 103",
      "observed['derived_cases'], 104"
    ]
  ],
  "tests/test_radio_identity_packed_contract.py": [
    [
      "('derived_cases', 103)",
      "('derived_cases', 104)"
    ]
  ]
};

const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function reverseGeneratedIdentityPackedSource(path,raw,line){
 const subject=GENERATED_IDENTITY_PACKED_PREIMAGES[line];assert.ok(subject,'unknown source line');assert.ok(subject.members[path],'foreign generated-identity packed source path');let restored;
 if(path==='compatibility/rc/matrices/full-verify.json'){
  const matrix=JSON.parse(raw);assert.equal(raw,JSON.stringify(matrix,null,2)+'\n');const check=matrix.checks.find(row=>row.check_id==='packed-consumer');assert.ok(check);
  for(const branch of ['main','21.x']){const roster=check.acceptance.cases_by_line[branch].harness;if(roster===null)continue;const id='packed-consumer/harness/generated-identity-coexistence';assert.equal(roster.filter(value=>value===id).length,1);check.acceptance.cases_by_line[branch].harness=roster.filter(value=>value!==id);}
  restored=JSON.stringify(matrix,null,2)+'\n';
 }else{
  restored=raw;for(const [before,after] of [...GENERATED_IDENTITY_PACKED_EDITS[path]].reverse()){assert.equal(restored.split(after).length,2,'missing/mutated/duplicate aggregate identity packed addition');restored=restored.replace(after,before);}
 }
 assert.equal(hash(restored),subject.members[path],'unrelated prior source changed');return restored;
}
