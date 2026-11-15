# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
"""Focused source-only physical Bidi retirement owner controls."""
from pathlib import Path
import copy, hashlib, json, os, re, shutil, subprocess, tempfile, unittest

ROOT=Path(__file__).resolve().parents[1]
REVIEW='compatibility/rc/qualification/frozen-public-bidi-source-v2/reviewed-per-use.json'
ADAPTER='compatibility/f10/authored-use-reviews/frozen-public-bidi-retired-source-v1.json'
ROSTER='compatibility/f10/authored-dependency-dispositions.json'

def check_controls(f,node,reviewed):
    ret={'legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts'}
    old=json.loads((f/'compatibility/f10/authored-use-reviews/public-bidi-module-boundary.json').read_text())
    allkeys={r['file'] for r in old['reviews']};target=allkeys-ret
    results=[]
    def run(name,expect):
     r=subprocess.run([node,'tests/bidi_physical_retirement_probe.mjs','inspect'],cwd=f,text=True,capture_output=True,timeout=20)
     if r.returncode: raise RuntimeError(name+' '+r.stderr)
     actual=set(json.loads(r.stdout));assert actual==expect,(name,len(actual),actual^expect);results.append(name)
    def mutate(p,fn,runname,expect=allkeys):
     p=f/p;before=p.read_bytes();p.write_bytes(fn(before))
     try:run(runname,expect)
     finally:p.write_bytes(before)
    run('reviewed-source-positive-23-only',ret)
    # Every exact retired path is individually required absent.
    for name in sorted(target):
     path=f/'projects/ngx-material-legacy'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('restored')
     try:run('restored-each-'+name,allkeys)
     finally:path.unlink()
    ghost=f/'projects/ngx-material-legacy/legacy-card/internal/common-module.ts';ghost.parent.mkdir(parents=True,exist_ok=True);ghost.write_text('restored')
    try:run('restored-historical-path',allkeys)
    finally:ghost.unlink()
    ghost.symlink_to('missing-target')
    try:run('dangling-target-symlink',allkeys)
    finally:ghost.unlink()
    mutate('projects/ngx-material-legacy/legacy-tabs/tabs-module.ts',lambda b:b+b'\n// drift\n','graph-drift')
    mutate('compatibility/rc/material-public-subjects.json',lambda b:b+b' ','peer-subject-drift')
    mutate('tests/test_bidi_module_public.py',lambda b:b+b'\n# drift\n','python-evidence-drift')
    mutate('tests/bidi_module_public_probe.mjs',lambda b:b+b'\n// drift\n','probe-evidence-drift')
    mutate('compatibility/f10/authored-use-reviews/frozen-public-bidi-retired-source-v1.json',lambda b:b+b' ','successor-drift')
    mutate('projects/ngx-material-legacy/package.json',lambda b:b.replace(b'^22.1.7',b'^22.2.0'), 'peer-floor-drift')
    # A retained source drift cannot gain an absent-source exception.
    mutate('projects/ngx-material-legacy/legacy-core/internal/common-module.ts',lambda b:b+b'\n// changed\n','retained-source-drift')
    # Duplicate/extra/missing Bidi keys cannot inherit the finite exception.
    def duplicate(b):
     d=json.loads(b); row=next(x for x in d['symbol_uses'] if x['file']=='legacy-card/internal/common-module.ts' and x['symbol']=='BidiModule');d['symbol_uses'].append(row);return (json.dumps(d)+'\n').encode()
    mutate('compatibility/f10/authored-dependency-dispositions.json',duplicate,'duplicate-roster-key')
    def missing(b):
     d=json.loads(b);d['symbol_uses']=[x for x in d['symbol_uses'] if not (x['file']=='legacy-card/internal/common-module.ts' and x['symbol']=='BidiModule')];return (json.dumps(d)+'\n').encode()
    mutate('compatibility/f10/authored-dependency-dispositions.json',missing,'missing-roster-key',allkeys-{'legacy-card/internal/common-module.ts'})
    # Removing historical object access must not silently accept a source image.
    alt=f/'.git/objects/info/alternates';b=alt.read_bytes();alt.write_text(str(f.parent/'missing-object-store')+'\n')
    try:run('missing-history-provenance',allkeys)
    finally:alt.write_bytes(b)
    # A caught nested invocation must poison the outer transaction; the next independent call recovers.
    owner=f/'scripts/authored-use-inventory.mjs';before=owner.read_text();needle='  bidiPhysicalReentered=false;\n  try {';assert before.count(needle)==1
    injected=before.replace('export function authoredUseReviewEvidencePhysical() {','let fixtureReentryAttempted=false;\nexport function authoredUseReviewEvidencePhysical() {',1).replace(needle,needle+"\n    if (!fixtureReentryAttempted) { fixtureReentryAttempted=true; try { authoredUseReviewEvidencePhysical(); throw Error('nested unexpectedly succeeded'); } catch (e) { if (e.message !== 'reentrant physical Bidi evidence') throw e; } }",1)
    owner.write_text(injected)
    try:
     r=subprocess.run([node,'tests/bidi_physical_retirement_probe.mjs','reentry'],cwd=f,text=True,capture_output=True,timeout=20);assert r.returncode==0,r.stderr;observed=json.loads(r.stdout);assert observed['caught_nested_poisoned_outer'] and observed['independent_recovery'];results.append('caught-reentry-poisons-outer-and-recovers')
    finally:owner.write_text(before)
    # Force a real graph write between the two qualification passes.
    needle='      const later=qualifyBidiPhysical();';assert before.count(needle)==1
    graph=f/'projects/ngx-material-legacy/legacy-tabs/tabs-module.ts';graph_before=graph.read_bytes();marker='\n// late mutation fixture\n'
    fs_import="import {readFileSync, lstatSync, realpathSync, readdirSync} from 'node:fs';"
    assert before.count(fs_import)==1
    src=before.replace(fs_import,"import {readFileSync, lstatSync, realpathSync, readdirSync, appendFileSync} from 'node:fs';",1)
    src=src.replace(needle,'      appendFileSync('+json.dumps(str(graph))+','+json.dumps(marker)+');\n'+needle,1)
    catch='    } catch {evidence=ordinary();}'
    assert src.count(catch)==1
    reason='physical evidence drift projects/ngx-material-legacy/legacy-tabs/tabs-module.ts'
    src=src.replace(catch,"    } catch (error) {if (error.message !== "+json.dumps(reason)+") throw error;evidence=ordinary();}",1)
    # A missing mutation import must fail this control rather than impersonate drift.
    missing_import=src.replace("import {readFileSync, lstatSync, realpathSync, readdirSync, appendFileSync} from 'node:fs';",fs_import,1)
    assert missing_import!=src;owner.write_text(missing_import)
    try:
     failed=subprocess.run([node,'tests/bidi_physical_retirement_probe.mjs','inspect'],cwd=f,text=True,capture_output=True,timeout=20)
     assert failed.returncode!=0 and 'appendFileSync is not defined' in failed.stderr,failed.stderr
     assert graph.read_bytes()==graph_before,'missing-import control unexpectedly wrote source'
     results.append('late-control-missing-import-rejected')
    finally:owner.write_text(before)
    owner.write_text(src)
    try:
     run('late-graph-change-rejected',allkeys)
     assert graph.read_bytes()==graph_before+marker.encode(),'late mutation was not physically written'
    finally:owner.write_text(before);graph.write_bytes(graph_before)
    run('late-mutation-recovery',ret)
    # The actual candidate intentionally has no production-reviewed review pin.
    owner=f/'scripts/authored-use-inventory.mjs';saved_owner=owner.read_text();import re
    owner.write_text(re.sub(r'const bidiSuccessor(?:Review|Hash) = [^;]+;',lambda m: m.group(0).split(' = ')[0]+' = null;',saved_owner))
    try:run('production-pin-disabled',allkeys)
    finally:owner.write_text(saved_owner)
    # Repinning a modified adapter cannot turn an unreviewed decision into authority.
    import hashlib,re
    adapter=f/'compatibility/f10/authored-use-reviews/frozen-public-bidi-retired-source-v1.json';owner=f/'scripts/authored-use-inventory.mjs';roster_file=f/'compatibility/f10/authored-dependency-dispositions.json';a0=adapter.read_bytes();o0=owner.read_text();r0=roster_file.read_bytes()
    def repin_fault(name,change):
     doc=json.loads(a0);change(doc);raw=(json.dumps(doc,indent=2)+'\n').encode();digest=hashlib.sha256(raw).hexdigest();adapter.write_bytes(raw);owner.write_text(re.sub(r'const bidiSuccessorHash = "[0-9a-f]{64}";',f'const bidiSuccessorHash = "{digest}";',o0));rr=json.loads(r0)
     for row in rr['symbol_uses']:
      if row['module']=='@angular/cdk/bidi' and row['symbol']=='BidiModule' and row['file'] not in ret:row['source_review']['sha256']=digest
     roster_file.write_text(json.dumps(rr,indent=2)+'\n')
     try:run(name,allkeys)
     finally:adapter.write_bytes(a0);owner.write_text(o0);roster_file.write_bytes(r0)
    repin_fault('repinned-unreviewed-decision',lambda d:d['reviews'][0].update(decision='A changed and unreviewed source decision, long enough to pass the generic source review text length rule but not the independently reviewed per-use judgment.'))
    repin_fault('repinned-unapproved-reviewer',lambda d:d['reviews'][0].update(reviewer='different reviewer'))
    repin_fault('repinned-unpinned-evidence',lambda d:d['reviews'][0]['independent_evidence'].append({'path':'unapproved.json','sha256':'0'*64}))
    # A symlinked ancestor of an absent stub must be rejected, even though target is absent.
    ancestor=f/'projects/ngx-material-legacy/legacy-card/internal';saved=ancestor.with_name('internal-fixture-save');ancestor.rename(saved);ancestor.symlink_to(saved,target_is_directory=True)
    try:run('symlinked-ancestor',allkeys)
    finally:ancestor.unlink();saved.rename(ancestor)
    # Physical owner module loaded through a symlinked root must fail rather than follow it.
    link=f.parent/'linked-fixture';link.symlink_to(f,target_is_directory=True)
    try:
     script='import {authoredUseReviewEvidencePhysical as f} from '+json.dumps((link/'scripts/authored-use-inventory.mjs').as_uri())+';f();'
     r=subprocess.run([node,'--preserve-symlinks','--input-type=module','-e',script],text=True,capture_output=True,timeout=20)
     assert r.returncode!=0 and 'linked physical owner root' in r.stderr,r.stderr
     results.append('linked-root-error')
    finally:link.unlink()
    # A new Bidi key cannot be smuggled into the 25-key finite population.
    def extra(b):
     d=json.loads(b);row=next(x for x in d['symbol_uses'] if x['file']=='legacy-card/internal/common-module.ts' and x['symbol']=='BidiModule').copy();row['file']='new-family/internal/common-module.ts';d['symbol_uses'].append(row);return (json.dumps(d)+'\n').encode()
    mutate('compatibility/f10/authored-dependency-dispositions.json',extra,'extra-roster-key',allkeys|{'new-family/internal/common-module.ts'})
    # A new physical source route outside the known graph must fail closed.
    extra_source=f/'projects/ngx-material-legacy/legacy-tabs/rogue-graph.ts';extra_source.write_text("import {BidiModule} from '@angular/cdk/bidi';\n")
    try:run('new-source-graph-route',allkeys)
    finally:extra_source.unlink()
    # Previously a computed property bypassed a name-only census; direct package census must reject it.
    extra_source=f/'projects/ngx-material-legacy/legacy-tabs/rogue-computed.ts';extra_source.write_text("import * as bidi from '@angular/cdk/bidi';\nexport const x = bidi['Bidi' + 'Module'];\n")
    try:run('computed-bidi-route',allkeys)
    finally:extra_source.unlink()
    # Computed owned-core member access must also enter the graph census.
    extra_source=f/'projects/ngx-material-legacy/legacy-tabs/rogue-legacy.ts';extra_source.write_text("import * as core from '@ngx-compat/material-legacy/legacy-core';\nexport const x = core['Mat' + 'LegacyCommonModule'];\n")
    try:run('computed-owned-core-route',allkeys)
    finally:extra_source.unlink()
    mutate('compatibility/rc/material-public-source-members/769187ce194c8dc07761a9e7d3576475e8ace31b42cbc2e2935e3a74f3e4a9b5.gz',lambda b:b+b'changed','peer-declaration-drift')
    # Modifying an existing otherwise-unrelated production source also invalidates the frozen graph frame.
    mutate('projects/ngx-material-legacy/legacy-card/card.ts',lambda b:b+b"\nimport * as core from '../legacy-core/public-api';\nexport const added = core['Mat' + 'LegacyCommonModule'];\n",'existing-file-computed-relative-route')
    # Missing and inaccessible required present sources must fail closed.
    member=f/'projects/ngx-material-legacy/legacy-card/card.ts';saved=member.with_name('card-fixture-save.tmp');member.rename(saved)
    try:run('missing-required-source',allkeys)
    finally:saved.rename(member)
    mode=member.stat().st_mode & 0o777;member.chmod(0)
    try:
     if os.access(member,os.R_OK):results.append('unreadable-source-control-unavailable')
     else:run('unreadable-required-source',allkeys)
    finally:member.chmod(mode)
    # Retained rows remain ordinary present-source reviews and may use a separate valid fixture review.
    import hashlib
    retained_review=f/'compatibility/f10/authored-use-reviews/retained-test-only.json';data=[]
    for item in old['reviews']:
     if item['file'] in ret:data.append({**item,'independent_evidence':[{'path':'compatibility/rc/material-public-subjects.json','sha256':'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3'}]})
    raw=(json.dumps({'schema_version':1,'line':'main','status':'reviewed','reviews':data})+'\n').encode();retained_review.write_bytes(raw);refhash=hashlib.sha256(raw).hexdigest();rp=f/'compatibility/f10/authored-dependency-dispositions.json';old_roster=rp.read_bytes();draft=json.loads(old_roster)
    for row in draft['symbol_uses']:
     if row['module']=='@angular/cdk/bidi' and row['symbol']=='BidiModule' and row['file'] in ret:row['source_review']={'path':'compatibility/f10/authored-use-reviews/retained-test-only.json','sha256':refhash}
    rp.write_text(json.dumps(draft,indent=2)+'\n')
    try:run('retained-normal-present-source',set())
    finally:rp.write_bytes(old_roster);retained_review.unlink()
    # Before the parent routes any source-review rows, all 25 old records remain insufficient.
    roster_file=f/'compatibility/f10/authored-dependency-dispositions.json';staged=roster_file.read_bytes();baseline=json.loads(staged);by_key={(r['file'],r['module'],r['symbol']):r['prior_row'] for r in reviewed['reviews']};baseline['symbol_uses']=[by_key.get((r['file'],r['module'],r['symbol']),r) for r in baseline['symbol_uses']];roster_file.write_text(json.dumps(baseline,indent=2)+'\n')
    try:run('unrouted-real-roster-fails-closed',allkeys)
    finally:roster_file.write_bytes(staged)
    # Generic reader retains the eight focused present/missing/evidence/schema cases.
    r=subprocess.run([node,'tests/bidi_physical_retirement_probe.mjs','generic'],cwd=f,capture_output=True,text=True,timeout=20);assert r.returncode==0,r.stderr;assert json.loads(r.stdout)['generic_cases']==8;results.append('generic-historical-contract')
    assert len(results)>=55, len(results)
    print(json.dumps({"physical_owner_controls":results,"generic_reader_cases":8}))

class PhysicalBidiRetirementTests(unittest.TestCase):
    def test_actual_main_roster_routes_exact_retirements(self):
        package=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())
        if not package['version'].startswith('22.'):
            self.skipTest('physical retirement owner is main-22 only')
        node=shutil.which('node')
        self.assertIsNotNone(node, 'pinned Node must be on PATH')
        self.assertEqual(subprocess.check_output([node,'--version'],text=True).strip(),'v'+(ROOT/'.node-version').read_text().strip())
        result=subprocess.run([node,'tests/bidi_physical_retirement_probe.mjs','actual-roster'],cwd=ROOT,text=True,capture_output=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stderr)
        observed=json.loads(result.stdout)
        self.assertEqual(observed['retired_difference'],23)
        self.assertEqual(observed['retained_same'],2)

    def test_private_owner_and_generic_reader(self):
        node=shutil.which('node')
        self.assertIsNotNone(node, 'pinned Node must be on PATH')
        expected=(ROOT/'.node-version').read_text().strip()
        self.assertEqual(subprocess.check_output([node,'--version'],text=True).strip(),'v'+expected)
        common=Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=ROOT,text=True).strip()).resolve()
        objects=(common/'objects').resolve()
        self.assertTrue(objects.is_dir())
        pin=json.loads((ROOT/'scripts/bidi-physical-pins.json').read_text())
        reviewed=json.loads((ROOT/REVIEW).read_text())
        self.assertEqual(reviewed['status'],'reviewed-finite-source-dispositions')
        self.assertEqual(len(reviewed['reviews']),25)
        with tempfile.TemporaryDirectory(prefix='bidi-physical-owner-') as tmp:
            f=Path(tmp).resolve()/'checkout';f.mkdir()
            paths=set(pin['graph_and_evidence'])|set(pin['product_ts_snapshot'])|{
                'compatibility/f10/authored-dependency-inventory-seed.json',ROSTER,
                'projects/ngx-material-legacy/package.json',ADAPTER,
                'scripts/bidi-physical-pins.json','scripts/authored-use-inventory.mjs',
                'tests/bidi_physical_retirement_probe.mjs'}
            for path in sorted(paths):
                src=ROOT/path;dest=f/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
            # Run the preserved old 55-control program against its actual
            # historical owner and 7e9 product frame, not today's new owner.
            # Current physical behavior is tested separately above and by the
            # f9 successor fixture; this historical run is not current credit.
            historical_owner=subprocess.check_output(
                ['git','--no-replace-objects','-c','gc.auto=0','show',
                 '1c358b126719df5b5bfa1ddcbe44248814d7275e:scripts/authored-use-inventory.mjs'],cwd=ROOT)
            self.assertEqual(hashlib.sha256(historical_owner).hexdigest(),
                             'ddb81b80bee36204322587db6e1583de5987919697c45414bb22c2d5aa5bee12')
            (f/'scripts/authored-use-inventory.mjs').write_bytes(historical_owner)
            for path,expected_hash in pin['product_ts_snapshot'].items():
                body=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','show',
                    '7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad:'+path],cwd=ROOT)
                self.assertEqual(hashlib.sha256(body).hexdigest(),expected_hash,path)
                (f/path).write_bytes(body)
            roster=json.loads((f/ROSTER).read_text())
            prior={(r['file'],r['module'],r['symbol']):r['prior_row'] for r in reviewed['reviews']}
            self.assertEqual(len(prior),25)
            roster['symbol_uses']=[copy.deepcopy(prior.get((r['file'],r['module'],r['symbol']),r)) for r in roster['symbol_uses']]
            adapter_hash=hashlib.sha256((f/ADAPTER).read_bytes()).hexdigest();n=0
            for row in roster['symbol_uses']:
                if (row['file'],row['module'],row['symbol']) in prior and row['file'] not in {
                    'legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts'}:
                    row['source_review']={'path':ADAPTER,'sha256':adapter_hash};n+=1
            self.assertEqual(n,23)
            (f/ROSTER).write_text(json.dumps(roster,indent=2)+'\n')
            git_env=os.environ.copy();git_env.update(GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
            for name in ('GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'):
                git_env.pop(name,None)
            original=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show','7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad:scripts/authored-use-inventory.mjs'],cwd=ROOT,env=git_env)
            self.assertEqual(hashlib.sha256(original).hexdigest(),'220eff0630e5c7a890696030fd4dc67360473ac32be0272a38489f2a4f94a534')
            (f/'scripts/authored-use-inventory-baseline.mjs').write_bytes(original)
            subprocess.run(['git','init','-q'],cwd=f,check=True)
            (f/'.git/objects/info/alternates').write_text(str(objects)+'\n')
            subprocess.run(['git','symbolic-ref','HEAD','refs/heads/bidi-fixture'],cwd=f,check=True)
            subprocess.run(['git','update-ref','refs/heads/bidi-fixture','7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad'],cwd=f,check=True)
            check_controls(f,node,reviewed)

if __name__=='__main__':
    unittest.main()
