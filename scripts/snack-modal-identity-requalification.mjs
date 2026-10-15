/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const SNACK_MODAL_DIAGNOSTIC_PREIMAGES={
  "tests/remaining_identity_construction_probe.mjs": {
    "sha256": "1df56963671a7469146e06cd94d68db5d6ba95a5fbd21e4711d5e144dd8ada81",
    "snapshot": "compatibility/rc/snack-modal-identity-before-remaining-constructor-probe.mjs"
  },
  "scripts/generated-identity-packed-contract.mjs": {
    "sha256": "efca7db3ee54983f1fadf6f6e2899da6fd96e2dc41d6a56d862ba37835885c7c",
    "snapshot": "compatibility/rc/snack-modal-identity-before-packed-contract.mjs"
  },
  "scripts/generated-identity-packed-fixture.mjs": {
    "sha256": "d8fe884fada9df13e96bc478caa9d097ea7ac85d7b39921d773d5d8411787c14",
    "snapshot": "compatibility/rc/snack-modal-identity-before-packed-fixture.mjs"
  },
  "tests/generated_identity_packed_contract_probe.mjs": {
    "sha256": "2e954861b14b3cab7c38ce7cc96aab662ee3deb9260c5aed96b3b9facde7e78d",
    "snapshot": "compatibility/rc/snack-modal-identity-before-packed-probe.mjs"
  },
  "tests/test_generated_identity_packed_contract.py": {
    "sha256": "1b0d432b1926f90cd8092376febb2caac2ac078d4af3b20f5775888af4170748",
    "snapshot": "compatibility/rc/snack-modal-identity-before-packed-wrapper.py"
  }
};
export const SNACK_MODAL_DIAGNOSTIC_EDITS={
  "tests/remaining_identity_construction_probe.mjs": [
    [
      "import {compileRemainingIdentityGraph,remainingIdentityEntries,remainingIdentityLiteralEdits,remainingIdentityBeforeHashes,reverseRemainingIdentitySource,inspectTabPanelTypeOwnership} from '../scripts/remaining-identity-construction.mjs';\n",
      "import {compileRemainingIdentityGraph,remainingIdentityEntries,remainingIdentityLiteralEdits,remainingIdentityBeforeHashes,reverseRemainingIdentitySource as reversePreviousRemainingIdentitySource,inspectTabPanelTypeOwnership} from '../scripts/remaining-identity-construction.mjs';\n"
    ],
    [
      "",
      "import {SNACK_MODAL_IDENTITY_PATH,reverseSnackModalIdentitySource,currentRemainingIdentityLiteral} from '../scripts/snack-modal-identity-source.mjs';\nconst reverseRemainingIdentitySource=(path,text)=>reversePreviousRemainingIdentitySource(path,path===SNACK_MODAL_IDENTITY_PATH?reverseSnackModalIdentitySource(path,text):text);\n"
    ],
    [
      "const variants=remainingIdentityLiteralEdits.map(([path,before,after],index)=>({id:'old-'+roles[index],family:roleFamilies[index],role:roles[index],modules:compileRemainingIdentityGraph({root,readSource:p=>p===path?read(p).replace(after,before):read(p)}).modules}));\nlet sourceNegatives=0;for(const path of Object.keys(remainingIdentityBeforeHashes)){assert.ok(reverseRemainingIdentitySource(path,read(path)));assert.throws(()=>reverseRemainingIdentitySource(path,read(path)+'\\n// foreign source byte\\n'));sourceNegatives++;}for(const [path,before,after] of remainingIdentityLiteralEdits){assert.throws(()=>reverseRemainingIdentitySource(path,read(path).replace(after,before)));sourceNegatives++;}\n",
      "const variants=remainingIdentityLiteralEdits.map(([path,before,after],index)=>({id:'old-'+roles[index],family:roleFamilies[index],role:roles[index],modules:compileRemainingIdentityGraph({root,readSource:p=>p===path?read(p).replace(currentRemainingIdentityLiteral(path,after),before):read(p)}).modules}));\nlet sourceNegatives=0;for(const path of Object.keys(remainingIdentityBeforeHashes)){assert.ok(reverseRemainingIdentitySource(path,read(path)));assert.throws(()=>reverseRemainingIdentitySource(path,read(path)+'\\n// foreign source byte\\n'));sourceNegatives++;}for(const [path,before,after] of remainingIdentityLiteralEdits){assert.throws(()=>reverseRemainingIdentitySource(path,read(path).replace(currentRemainingIdentityLiteral(path,after),before)));sourceNegatives++;}\n"
    ]
  ],
  "scripts/generated-identity-packed-contract.mjs": [
    [
      "            else demand(new RegExp('^' + prefixes[role] + '[0-9]+' + (generation === 'legacy' ? '-legacy' : '') + '$').test(row.id));\n",
      "            else {const prefix=role==='snack-live'&&generation==='legacy'?'mat-legacy-snack-bar-container-live-':prefixes[role];const suffix=generation==='legacy'&&role!=='snack-live'?'-legacy':'';demand(new RegExp('^'+prefix+'[0-9]+'+suffix+'$').test(row.id));}\n"
    ]
  ],
  "scripts/generated-identity-packed-fixture.mjs": [
    [
      "   for(const item of snacks){const host=document.querySelector('.packed-identity-'+item.model.generation)!,live=host.querySelector('[id^=\"mat-snack-bar-container-live-\"]')!;item.live=live;record(item.model,'snack-live',0,live,!!host);item.model.state.snack_panel_class=host.classList.contains('packed-identity-'+item.model.generation);if(item.model.legacy)item.model.state.legacy_structure.snack_container=host.classList.contains('mat-snack-bar-container');}\n",
      "   for(const item of snacks){const host=document.querySelector('.packed-identity-'+item.model.generation)!,live=host.querySelector(item.model.legacy?'[id^=\"mat-legacy-snack-bar-container-live-\"]':'[id^=\"mat-snack-bar-container-live-\"]')!;item.live=live;record(item.model,'snack-live',0,live,!!host);item.model.state.snack_panel_class=host.classList.contains('packed-identity-'+item.model.generation);if(item.model.legacy)item.model.state.legacy_structure.snack_container=host.classList.contains('mat-snack-bar-container');}\n"
    ],
    [
      "   order.cleanup={fixtures_destroyed:fixtures.filter(fixture=>fixture.destroyed).length,modal_disposed:!!modal&&!modal.isConnected,retained_target_count:order.nodes.filter((node:any)=>allWithId(node.id).length>0).length,overlay_target_count:document.querySelectorAll('.cdk-overlay-container [id^=\"mat-autocomplete-\"],.cdk-overlay-container [id^=\"mat-select-\"],.cdk-overlay-container [id^=\"mat-menu-panel-\"],.cdk-overlay-container [id^=\"mat-snack-bar-container-live-\"]').length};\n",
      "   order.cleanup={fixtures_destroyed:fixtures.filter(fixture=>fixture.destroyed).length,modal_disposed:!!modal&&!modal.isConnected,retained_target_count:order.nodes.filter((node:any)=>allWithId(node.id).length>0).length,overlay_target_count:document.querySelectorAll('.cdk-overlay-container [id^=\"mat-autocomplete-\"],.cdk-overlay-container [id^=\"mat-select-\"],.cdk-overlay-container [id^=\"mat-menu-panel-\"],.cdk-overlay-container [id^=\"mat-snack-bar-container-live-\"],.cdk-overlay-container [id^=\"mat-legacy-snack-bar-container-live-\"]').length};\n"
    ]
  ],
  "tests/generated_identity_packed_contract_probe.mjs": [
    [
      "    return prefix + (role === 'active-option' ? index + 10 : index) + (generation === 'legacy' ? '-legacy' : '');\n",
      "    return (role==='snack-live'&&generation==='legacy'?'mat-legacy-snack-bar-container-live-':prefix) + (role === 'active-option' ? index + 10 : index) + (generation === 'legacy'&&role!=='snack-live' ? '-legacy' : '');\n"
    ],
    [
      "",
      "  change(o=>{const node=o.nodes.find(n=>n.generation==='legacy'&&n.role==='snack-live'),prior=node.id;node.id='mat-snack-bar-container-live-0-legacy';for(const stage of o.snack_lifecycle)stage.modal_owns=stage.modal_owns.map(id=>id===prior?node.id:id);});\n"
    ]
  ],
  "tests/test_generated_identity_packed_contract.py": [
    [
      "                ('negative_cases', 1172), ('collector_mutants', 3), ('writer_cases', 3),\n",
      "                ('negative_cases', 1174), ('collector_mutants', 3), ('writer_cases', 3),\n"
    ]
  ]
};
export function reverseSnackModalDiagnosticSource(path,text){
 const subject=SNACK_MODAL_DIAGNOSTIC_PREIMAGES[path];assert.ok(subject,'foreign snack-modal diagnostic source');
 for(const [before,after] of [...SNACK_MODAL_DIAGNOSTIC_EDITS[path]].reverse()){assert.equal(text.split(after).length,2,'missing/mutated/duplicate bounded diagnostic edit');text=text.replace(after,()=>before);}
 assert.equal(createHash('sha256').update(text).digest('hex'),subject.sha256,'unrelated previous diagnostic source changed');return text;
}
