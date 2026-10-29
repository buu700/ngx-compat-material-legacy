# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Continue original-hunk reading;full current-contract validation remains open."""
from pathlib import Path
import json,gzip,hashlib
r=Path.cwd();prefix='compatibility/rc/21x-base-class-removal-source-';d=json.loads(gzip.decompress((r/(prefix+'originals.json.gz')).read_bytes()));before=r/(prefix+'review-progress.json');report=json.loads(before.read_bytes());assert(report['original_members_read'],report['original_hunks_read'])==(9,47)
notes={
'src/material/checkbox/checkbox.ts':[
'Removes Directive from ordinary checkbox imports after collapsing the shared base. The legacy-owned generic base and its separate component metadata remain relevant.',
'Removes FocusOrigin when the ordinary current implementation no longer exposes an origin argument. The legacy checkbox still offers focus-origin handling;the current zero-argument focus is not a replacement contract.',
'Merges the MDC Component decorator into the old abstract base. Legacy host classes,template,CVA provider and animation state classes differ and must remain historical.',
'Replaces abstract focus,event creation,animation target and state-class hooks with concrete current implementations. The legacy uses FocusMonitor,MatLegacyCheckboxChange,the host element as animation target and mat-checkbox animation classes;blind consolidation would change behavior and styles.',
'Narrows the change EventEmitter from generic E to MatCheckboxChange. Preserve the retained MatLegacyCheckboxChange source/type relationship;no modern event type is introduced.',
'Removes the idPrefix argument,hardcodes mat-mdc-checkbox IDs,moves attribute/optional injection metadata and makes change detector,zone and options private. Legacy construction,ID namespace and protected extension points require their own evidence;this is an explicit API/DI boundary.',
'Deletes the current wrapper and changes super input-click dispatch to this after moving its methods into the merged class. Preserve legacy focus/event/animation-target behavior;any proposed motion repair would require lifecycle tests and style review.'],
'src/material/checkbox/testing/checkbox-harness.ts':[
'Collapses the abstract input/label locator contract into a current MDC harness with its own container. The owned legacy harness has mat-checkbox-label and mat-checkbox-inner-container and a distinct host selector.',
'Moves current toggle behavior into the merged class,selecting the MDC container for disabled controls and input otherwise. The actual legacy harness clicks its historical inner container;do not copy the current locator or click path.',
'Deletes the old current wrapper after moving its predicate,selectors,locators and toggle implementation. This is not a legacy harness deletion or evidence that both DOM structures are interchangeable.'],
 'tools/public_api_guard/material/checkbox-testing.md':[
'Records removal of the current generic harness/base relationship and concrete flattening. The legacy harness still owns its locator and toggle extension contract;the original current golden is reference data only.',
'Records input becoming public and label no longer appearing as a protected abstract member. Preserve the tagged legacy harness surface pending full signature review;do not regenerate a candidate golden to match the current API.'],
 'tools/public_api_guard/material/checkbox.md':[
'Removes FocusOrigin from the current generated import list. The retained legacy focus-origin API remains a separate contract.',
'Records base collapse,merged interfaces and the new current constructor. The legacy historical constructor and its current public-dependency adaptations need independent assessment;the current generated constructor is not a release baseline for legacy.',
'Records loss of generic event type,protected detector/options hooks and origin-aware abstract focus/animation target. These are concrete extension/API differences,not pure name changes.',
'Records relocated click/touch methods and loss of protected zone/options from the public current declaration. The retained legacy state/focus/animation behavior remains in scope.',
'Records folded current Ivy component/factory input/output metadata. This does not qualify owned legacy AOT,CVA construction or native geometry.'],
}
seen={x['path']for x in report['initial_member_reviews']}
for section in d['sections']:
 if section['path']not in notes:continue
 assert section['path']not in seen;comments=notes[section['path']];assert len(comments)==len(section['hunks'])
 report['initial_member_reviews'].append({'path':section['path'],'patch_sha256':section['patch_sha256'],'status':'original-hunks-read;owned/minimum/family validation incomplete','hunks':[{'index':h['index'],'header':h['header'],'sha256':h['sha256'],'initial_technical_review':text,'final_applicability_qualified':False}for h,text in zip(section['hunks'],comments)]})
read={x['path']for x in report['initial_member_reviews']};total=sum(len(x['hunks'])for x in report['initial_member_reviews']);assert(len(read),total)==(13,64)
report.update(status='in-progress:complete original data authenticated;first13members64hunks read;substantive whole-SHA review incomplete',original_members_read=13,original_hunks_read=64,original_members_remaining=59,original_hunks_remaining=265,remaining_original_members=[{'path':s['path'],'hunks':len(s['hunks']),'patch_sha256':s['patch_sha256']}for s in d['sections']if s['path']not in read],prior_review_progress={'path':str(before.relative_to(r)),'sha256':hashlib.sha256(before.read_bytes()).hexdigest()})
for path in ['projects/ngx-material-legacy/legacy-checkbox/checkbox.ts','projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-base.ts','projects/ngx-material-legacy/legacy-checkbox/testing/checkbox-harness.ts']:
 raw=(r/path).read_bytes();report['current_source_leads'].append({'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'read_scope':'Relevant focus,event,constructor,animation and harness declarations;not full-family/API/native qualification.'})
report['tagged_alias_followup']='Authenticated tagged-alias-supplement.json shows legacy snack-bar publicly aliases MatSnackBarRef from current snack-bar. Complete owned/minimum alias/constructor assessment remains required.'
p=r/(prefix+'review-progress-checkbox.json');assert not p.exists();p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'members_read':13,'hunks_read':64,'remaining_files':59,'remaining_hunks':265,'whole_source_review_complete':False}))
