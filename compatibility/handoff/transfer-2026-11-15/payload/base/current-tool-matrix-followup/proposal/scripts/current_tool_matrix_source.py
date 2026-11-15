# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite MAIN matrix source proof; no artifact or audit admission."""
import copy
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import subprocess
SELF = 'scripts/current_tool_matrix_source.py'
_IMAGE = Path(__file__).read_bytes()
_GIT_PATH = os.environ.get('PATH')
if type(_GIT_PATH) is not str: raise RuntimeError('missing Git path')
PACKET = dict(path='compatibility/rc/current-tool-matrix-source-successor-v1.json', sha256='c549c141764d499b30cd46fede7138ea89903a6d7e709f144ed5eb528fcd3e10', bytes=14943)
INPUT_PACKET = dict(path='compatibility/rc/current-tool-matrix-input-successor-v1.json', sha256='df06856c53ceedd1c3700e2e5b372e34442f04d82438c940fefebb8fe3c9381b', bytes=14712)
FINAL_PACKET = dict(path='compatibility/rc/current-tool-matrix-final-product-v1.json', sha256='ddb70c833108cd3e446a46b29561b7d3ca89f7a50bfe18acad931a83ebc2d077', bytes=26543)
LIVE_PACKET = dict(path='compatibility/rc/current-tool-matrix-live-product-successor-v1.json', sha256='5a3b9139f2916d38c8bce7d3305c284abd501df137ddec7c2d469d78ce17c268', bytes=4563)
PARENT, COMMIT = ('aec05d8f6baf3dfdd92581504291309992abcb89', '1e26eefba6fa380b520ae05cb6f9ff3ea734545a')
POINTER_PARENT, POINTER_COMMIT = ('d648f9de6d325aab1f858130d0cb8d93e5e5adaa', '45bbb3016f631296c08cf0eaa5f54a0e61455cf1')
NEW_CASE = 'historical-legacy-artifact/original-and-shared-cases/src/material/legacy-autocomplete/autocomplete.spec.ts#179'

def _hash(data):
    return hashlib.sha256(data).hexdigest()

def _physical(root, path):
    if not (type(path) is str and path and ('\\' not in path) and ('\x00' not in path)):
        raise AssertionError()
    if not (root.is_dir() and (not root.is_symlink())):
        raise AssertionError()
    cursor = root
    for part in path.split('/'):
        if not (part and part not in ('.', '..')):
            raise AssertionError()
        cursor /= part
        if not not cursor.is_symlink():
            raise AssertionError()
    if not cursor.is_file():
        raise AssertionError()
    return cursor.read_bytes()

def _match(data, ref):
    if not (_hash(data) == ref['sha256'] and len(data) == ref['bytes']):
        raise AssertionError()
def _require(value):
    if not value:
        raise AssertionError()

def _replay(before, edits):
    _require(type(edits) is list)
    cursor, parts = 0, []
    for edit in edits:
        _require(set(edit) == {'offset', 'before', 'after'} and type(edit['offset']) is int and edit['offset'] >= cursor)
        _require(type(edit['before']) is type(edit['after']) is str and edit['before'] != edit['after'])
        old, pos = edit['before'].encode(), edit['offset']
        _require(before[pos:pos + len(old)] == old)
        parts.extend([before[cursor:pos], edit['after'].encode()])
        cursor = pos + len(old)
    return b''.join([*parts, before[cursor:]])

def _json_hash(value):
    return _hash((json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode())

_ACTIVE = {}

@contextmanager
def _transaction(root):
    key = str(root.resolve(strict=True))
    if key in _ACTIVE:
        _ACTIVE[key]['violation'] = True
        raise RuntimeError('reentrant matrix source')
    state = {'violation': False}
    _ACTIVE[key] = state
    try:
        yield
        if not not state['violation']:
            raise AssertionError('swallowed reentrant matrix source')
    finally:
        del _ACTIVE[key]

class CurrentToolMatrixSource:

    def __init__(self, root, *, read=None):
        self.root = Path(root).absolute()
        with _transaction(self.root):
            self._construct(read)

    def _construct(self, read):
        if not (read is None or callable(read)):
            raise AssertionError()
        self._provided, self._bound = (read, {})
        hint_ref = dict(path='compatibility/rc/current-tool-matrix-hint-id-source-successor-v1.json',sha256='1a5a6a9d5650a848ea8df8a9f3efa9715447df1f39b9672327f79f1fd0a86efc',bytes=6743)
        hint_raw=_physical(self.root,hint_ref['path']); _match(hint_raw,hint_ref); hint=json.loads(hint_raw)
        _require(hint['schema_version']==1 and hint['role']=='current-tool-matrix-hint-id-source-successor' and hint['source_only'] is True and hint['historical_programs_executed'] is False and hint['artifact_or_audit_admission_granted'] is False and hint['g11_claim']=='not-passed' and hint['source_parent']=='11767b00a96caa175a206388551c9f014c7513fb' and hint['source_commit']=='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad')
        hint_paths=['projects/ngx-material-legacy/legacy-form-field/form-field.ts','projects/ngx-material-legacy/legacy-form-field/hint.ts','projects/ngx-material-legacy/legacy-form-field/internal/hint-id.ts','tests/form-field-subscript-motion/manual-probe.mjs']
        _require([x['path'] for x in hint['transitions']]==hint_paths and [x['prior_exists'] for x in hint['transitions']]==[True,True,False,True])
        hint_env=dict(PATH=_GIT_PATH,LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
        def hint_git(*args): return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=self.root,env=hint_env)
        _require(hint_git('rev-list','--parents','-n','1',hint['source_commit']).decode().strip()==hint['source_commit']+' '+hint['source_parent']);hint_git('merge-base','--is-ancestor',hint['source_commit'],'HEAD')
        def packet(path, sha, size, role):
            ref=dict(path='compatibility/rc/'+path,sha256=sha,bytes=size);raw=_physical(self.root,ref['path']);_match(raw,ref);obj=json.loads(raw)
            _require(obj['schema_version']==1 and obj['role']==role and obj['source_only'] is True and obj['historical_programs_executed'] is False and obj['artifact_or_audit_admission_granted'] is False and obj['g11_claim']=='not-passed');return ref,obj
        motion_ref,motion=packet('current-tool-matrix-form-motion-source-v1.json','cf82163179414117d45c6dba00af96e3af97dd872860af66ee8d3b64c4430cd1',1471,'finite-current-matrix-form-motion-source')
        window_ref,window=packet('current-tool-matrix-window-ssr-source-v1.json','ede7efed7973d80638f81d5cb31d65079b39be4f193fa90f9fb381c179db5a2b',1230,'finite-current-matrix-window-ssr-source')
        auto_ref,auto_packet=packet('current-tool-matrix-autocomplete-motion-source-v1.json','0299613337744bcba2a97bf8d523f0fb68acf9e2e42b9ccfa0941b3000e719a2',1033,'finite-current-matrix-autocomplete-motion-source')
        inv_ref,inv=packet('current-tool-matrix-inventory-ce9-source-v1.json','7407ffed2590613bc9ac4c0883eaf37540bab4e0040d2c5004f70ec9d152f26d',10253,'finite-current-matrix-inventory-ce9-source')
        follow_ref,follow=packet('current-tool-matrix-roster-current-v1.json','14a0621c52e0c7479f03f7de0a0ddcd9ecd688407d566a2e3c8655214d029440',16224,'finite-current-tool-matrix-roster-continuation')
        _require(follow['review_test_commit']=='105e605b5af64f1226202b6e0c9c08d3757cfe5b' and [r['path'] for r in follow['review_tests']]==['tests/input_firstcheck_inventory_matrix_probe.mjs', 'tests/test_input_firstcheck_inventory_matrix.py', 'tests/historical_eight_matrix_roster_probe.mjs', 'tests/test_historical_eight_matrix_roster.py', 'tests/option_plain_input_inventory_matrix_probe.mjs', 'tests/test_option_plain_input_inventory_matrix.py'])
        for ref in follow['review_tests']:_match(hint_git('show',follow['review_test_commit']+':'+ref['path']),ref);_match(_physical(self.root,ref['path']),ref)
        _require(len(motion['transitions'])==1); change=motion['transitions'][0]; _require(change['path']==hint_paths[0] and change['parent']=='c72d0ed6b9bbb918eb08b4c4efb37bcf89894707' and change['commit']=='ceb5ab6ff0b910436768384a622299f4b01d2da3' and change['before']==hint['transitions'][0]['after'])
        def exact(t):
            _require(t['path']==t['before']['path']==t['after']['path'] and hint_git('rev-list','--parents','-n','1',t['commit']).decode().strip()==t['commit']+' '+t['parent']);hint_git('merge-base','--is-ancestor',t['commit'],'HEAD')
            a=hint_git('show',t['parent']+':'+t['path']);b=hint_git('show',t['commit']+':'+t['path']);_match(a,t['before']);_match(b,t['after']);_require(_replay(a,t['edits'])==b);return a,b
        hint_git('merge-base','--is-ancestor',hint['source_commit'],change['parent']);motion_before,motion_after=exact(change);_require(_physical(self.root,change['path'])==motion_after)
        _require(window['predecessor_commit']=='1cb122d2d4ee39949d0be4203aedea0131c20f75');win=window['transition'];_require(win['path']=='compatibility/rc/matrices/full-verify.json' and win['parent']=='5699d6e556b2f248f80eae9460d41fd24d0fc371' and win['commit']=='4b2dde5cdbfc4e79e97d661d0eddfffbfde4ab26');hint_git('merge-base','--is-ancestor',window['predecessor_commit'],win['parent']);win_before,win_after=exact(win);_require(hint_git('show',window['predecessor_commit']+':'+win['path'])==win_before)
        a,b=json.loads(win_before),json.loads(win_after);window_case='csp-ssr/main/server/dom-free-server-and-leaks/render/table-window-scroll';removed=[]
        def remove_case(x):
            if type(x) is list:
                for i in range(len(x)-1,-1,-1):
                    if x[i]==window_case:removed.append(x.pop(i))
                    else:remove_case(x[i])
            elif type(x) is dict:
                for value in x.values():remove_case(value)
        remove_case(b);_require(len(removed)==1 and b==a)
        auto=auto_packet['transition'];_require(auto['path']=='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts' and auto['parent']==change['parent'] and auto['commit']==change['commit']);auto_before,auto_after=exact(auto);_require(len(auto['edits'])==1 and auto['edits'][0]['before']=='' and auto['edits'][0]['after']=='      providers: [LEGACY_NOOP_ANIMATIONS],\n')
        _require(inv['candidate_before_commit']=='768dfecc21b297e9c4d89940283c63c31a03dab2' and inv['candidate_after_commit']=='2c51dc4e31c4dd08d2ec15af0c360bfdddd676ce');inventory=inv['transition'];_require(inventory['path']=='testing/legacy-runner/historical-inventory.json' and inventory['parent']=='cd7830f9f2feeeb639ac0dd99efcd3dc610a22c2' and inventory['commit']=='ce9cd3d0b76e240ad0ffc03e2a05ff41f8f363ab');hint_git('merge-base','--is-ancestor',inv['candidate_before_commit'],inv['candidate_after_commit']);hint_git('merge-base','--is-ancestor',inv['candidate_after_commit'],inventory['parent']);inventory_before,inventory_after=exact(inventory)
        candidates=['projects/ngx-material-legacy/'+p for p in ['legacy-autocomplete/autocomplete.spec.ts','legacy-core/option/option.spec.ts','legacy-menu/menu.spec.ts','legacy-select/select.spec.ts','legacy-table/table.spec.ts','legacy-tabs/tab-header.spec.ts','legacy-tooltip/tooltip.spec.ts']];_require([r['path'] for r in inv['changed']]==candidates)
        a,b=json.loads(inventory_before),json.loads(inventory_after);_require(len(a['rows'])==len(b['rows'])==57 and len(a['shared_suite_shims'])==21);changed=[]
        for x,y in zip(a['rows'],b['rows']):
            _require(x['candidate']==y['candidate'])
            if x==y:continue
            changed.append(x['candidate']);row=next(r for r in inv['changed'] if r['path']==x['candidate']);_require(x['candidate_sha256']==row['before'] and y['candidate_sha256']==row['after'] and _hash(hint_git('show',inv['candidate_before_commit']+':'+x['candidate']))==row['before'] and _hash(hint_git('show',inv['candidate_after_commit']+':'+x['candidate']))==row['after'] and y['execution']==x['execution'] and y['execution']['bound_to_current_head'] is False);snapshot=y['prior_candidate_snapshots'].pop();_require(set(snapshot)=={'adaptation','candidate_sha256','current_source_binding','execution','reason'} and snapshot['candidate_sha256']==x['candidate_sha256'] and snapshot['adaptation']==x['adaptation'] and snapshot['execution']==x['execution'] and snapshot['current_source_binding'] is False and bool(snapshot['reason']));y['candidate_sha256']=x['candidate_sha256']
        _require(changed==candidates and b==a)
        expected=[('projects/ngx-material-legacy/legacy-input/input.spec.ts','20130e561440b9f44554035b83e5ea3a757f94f9'),('projects/ngx-material-legacy/legacy-input/input.ts','20130e561440b9f44554035b83e5ea3a757f94f9'),(win['path'],'2e85a9c7c74102b7307cfcc5dfaec5d6d5c1331c'),(inventory['path'],'2e85a9c7c74102b7307cfcc5dfaec5d6d5c1331c'),(win['path'],'aa34d99a64b6c02f0b267ccbcb9407f4f9139592'),('projects/ngx-material-legacy/legacy-core/option/option.spec.ts','f9aac126ea70fd83731b62305c07fdb993aa3334'),('projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts','f9aac126ea70fd83731b62305c07fdb993aa3334'),(win['path'],'105e605b5af64f1226202b6e0c9c08d3757cfe5b'),(inventory['path'],'105e605b5af64f1226202b6e0c9c08d3757cfe5b')];_require([(t['path'],t['commit']) for t in follow['transitions']]==expected)
        frames={}
        for t in follow['transitions']:
            before,after=exact(t);frame=frames.get(t['path'])
            if frame:_require(frame['after']==before)
            else:frame={'before':before,'first':t['before']};frames[t['path']]=frame
            frame['after']=after;frame['last']=t['after']
        _require(frames[win['path']]['before']==win_after and frames[inventory['path']]['before']==inventory_after)
        groups=[['legacy-input/input.spec.ts#117','legacy-input/input.spec.ts#118'],['legacy-select/select.spec.ts#274','legacy-select/select.spec.ts#275','legacy-select/select.spec.ts#276','legacy-select/select.spec.ts#277','legacy-table/table.spec.ts#29','legacy-table/table.spec.ts#30','legacy-tabs/tab-header.spec.ts#40','legacy-tooltip/tooltip.spec.ts#71'],['legacy-core/option/option.spec.ts#15','legacy-core/option/option.spec.ts#16']]
        def ids(x):return x['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']
        for t,group in zip([x for x in follow['transitions'] if x['path']==win['path']],groups):
            a=json.loads(hint_git('show',t['parent']+':'+t['path']));b=json.loads(hint_git('show',t['commit']+':'+t['path']));before,after=ids(a),ids(b);added=[x for x in after if x not in before];_require([x.split('/src/material/')[1] for x in added]==group and len(set(after))==len(after) and [x for x in after if x not in added]==before);ids(b)[:]=before;_require(b==a)
        for t,path in zip([x for x in follow['transitions'] if x['path']==inventory['path']],['projects/ngx-material-legacy/legacy-input/input.spec.ts','projects/ngx-material-legacy/legacy-core/option/option.spec.ts']):
            a=json.loads(hint_git('show',t['parent']+':'+t['path']));b=json.loads(hint_git('show',t['commit']+':'+t['path']));x=[r for r in a['rows'] if r['candidate']==path];y=[r for r in b['rows'] if r['candidate']==path];_require(len(x)==len(y)==1 and x[0]['candidate_sha256']==frames[path]['first']['sha256'] and y[0]['candidate_sha256']==frames[path]['last']['sha256']);snapshot=y[0]['prior_candidate_snapshots'].pop();_require(snapshot['candidate_sha256']==x[0]['candidate_sha256'] and snapshot['adaptation']==x[0]['adaptation'] and snapshot['execution']==x[0]['execution'] and snapshot['current_source_binding'] is False and y[0]['execution']['bound_to_current_head'] is False and y[0]['execution']['receipt'] is None);y[0]['candidate_sha256']=x[0]['candidate_sha256'];_require(a==b)
        for frame in frames.values():_match(_physical(self.root,frame['last']['path']),frame['last'])
        for t in hint['transitions']:
            _require(t['before']['path']==t['after']['path']==t['path']);before=hint_git('show',hint['source_parent']+':'+t['path']) if t['prior_exists'] else b''
            if not t['prior_exists']: _require(hint_git('ls-tree',hint['source_parent'],'--',t['path'])==b'')
            after=hint_git('show',hint['source_commit']+':'+t['path']);_match(before,t['before']);_match(after,t['after']);_require(_replay(before,t['edits'])==after and (motion_before if t['path']==change['path'] else _physical(self.root,t['path']))==after)
        _require(hint['packed_evidence']['artifact_sha256']=='877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b' and hint['packed_evidence']['regular_members']==512 and hint['packed_evidence']['changed_members']==3)
        def current_ref(ref):
            if ref['path']==inventory['path']:
                _require(ref==inventory['before']);return frames[inventory['path']]['last']
            if ref['path']==win['path']:
                _require(ref==win['before']);return frames[win['path']]['last']
            if ref['path']==auto['path']:
                _require(ref==auto['before']);return auto['after']
            frame=frames.get(ref['path'])
            if frame:
                _require(ref in (frame['first'],frame['last']));return frame['last']
            transition=next((x for x in hint['transitions'] if x['path']==ref['path']),None)
            if transition is None:return ref
            _require(ref in (transition['before'],transition['after']));return change['after'] if ref['path']==change['path'] else transition['after']
        # Prebind the whole named frame before the first supplied callback.
        roster_ref = dict(path='compatibility/rc/current-tool-matrix-live-frame-roster-v1.json', sha256='a96a3921bbf2e553cdf94f0cc4c9a66390ccd537fcb80b8255e3afc0ceea5ba4', bytes=7180)
        roster_raw = _physical(self.root, roster_ref['path']); _match(roster_raw, roster_ref); roster = json.loads(roster_raw)
        _require(roster['schema_version'] == 1 and roster['role'] == 'current-tool-matrix-live-frame-roster' and roster['source_only'] is True and len(roster['refs']) == 35 and len({x['path'] for x in roster['refs']}) == 35)
        self_ref = dict(path=SELF, sha256=_hash(_IMAGE), bytes=len(_IMAGE))
        for ref in [self_ref, LIVE_PACKET, roster_ref, hint_ref, motion_ref,window_ref,auto_ref,inv_ref,follow_ref,*follow['review_tests'], hint['source_review'], *[current_ref(x) for x in roster['refs']], *[frame['last'] for frame in frames.values() if not any(r['path']==frame['last']['path'] for r in roster['refs'])], *[current_ref(t['after']) for t in hint['transitions'] if not any(r['path']==t['path'] for r in roster['refs'])]]:
            _require(ref['path'] not in self._bound); _match(_physical(self.root,ref['path']),ref); self._bound[ref['path']] = dict(ref)
        self._member(hint_ref); self._member(motion_ref);self._member(window_ref);self._member(auto_ref);self._member(inv_ref);self._member(follow_ref);self._member(hint['source_review'])
        for t in hint['transitions']: self._member(current_ref(t['after']))
        if not json.loads(self._read('projects/ngx-material-legacy/package.json'))['version'].startswith('22.'):
            raise AssertionError()
        if not self._read(SELF) == _IMAGE:
            raise AssertionError()
        packet = json.loads(self._member(PACKET))
        if not (packet['schema_version'] == 1 and packet['role'] == 'current-tool-matrix-source-successor'):
            raise AssertionError()
        if not (packet['source_parent'] == PARENT and packet['source_commit'] == COMMIT):
            raise AssertionError()
        if not (packet['historical_programs_executed'] is False and packet['artifact_or_audit_admission_granted'] is False):
            raise AssertionError()
        env = dict(PATH=_GIT_PATH, LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')

        def git(*args):
            return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=self.root, env=env)
        final = json.loads(self._member(FINAL_PACKET))
        _require(final['schema_version'] == 1 and final['role'] == 'current-tool-matrix-final-product-successor' and final['base_commit'] == '04daa4f8c' and final['source_commit'] == '6b88db228feff1f1598b50fbc00bc17e45d6c899' and final['historical_programs_executed'] is False and final['artifact_or_audit_admission_granted'] is False and final['predecessor_packet'] == INPUT_PACKET)
        git('merge-base', '--is-ancestor', final['base_commit'], final['source_commit'])
        # Historical bytes support only the earlier replay, never the live binding.
        live = json.loads(self._member(LIVE_PACKET)); _require(live['frame_roster'] == roster_ref); _require(live['schema_version'] == 1 and live['role'] == 'current-tool-matrix-reviewed-live-product-source-successor' and live['source_only'] is True and live['historical_programs_executed'] is False and live['artifact_or_audit_admission_granted'] is False and live['historical_cases_changed'] is False)
        form = live['form_field']; _require(form['path'] == 'projects/ngx-material-legacy/legacy-form-field/form-field.ts' and form['parent'] == 'd0b99b5b6975859ca4eff8aa55dd97e4dfeb4749' and form['commit'] == 'a798ff9c58cdd539f115eda00b7cdd898d035353' and form['before']['path'] == form['after']['path'] == form['path'])
        _require(git('rev-list','--parents','-n','1',form['commit']).decode().strip() == form['commit'] + ' ' + form['parent'])
        git('merge-base','--is-ancestor',form['commit'],'HEAD')
        old_form,new_form = git('show',form['parent']+':'+form['path']),git('show',form['commit']+':'+form['path']); _match(old_form,form['before']); _match(new_form,form['after']); _require(_replay(old_form,form['edits']) == new_form and form['after']==hint['transitions'][0]['before']); self._member(current_ref(form['after']))
        receipt=json.loads(self._member(live['receipt'])); _require(receipt['base_head'] == form['parent'] and receipt['root_executed']['source_replay_exit_code'] == 0 and receipt['root_executed']['mutation_rejections'] == 120 and receipt['reviewed_native_and_ssr_evidence']['candidate_motion_cells'] == 11 and receipt['reviewed_native_and_ssr_evidence']['ssr_four_states_equal_to_a488'] is True and receipt['reviewed_native_and_ssr_evidence']['root_repeated_native_suite'] is False)
        _require(len(live['support']) == 9 and len({x['path'] for x in live['support']}) == 9)
        _require(len(receipt['changes']) == 9)
        for ref in live['support']:
            rows=[row for row in receipt['changes'] if row['path'].endswith('/'+ref['path'])]; _require(len(rows) == 1 and rows[0]['sha256'] == ref['sha256'] and rows[0]['bytes'] == ref['bytes']); self._member(current_ref(ref))
        _require(next(x for x in live['support'] if x['path'] == form['path']) == form['after'])
        def historical_member(ref):
            frame=frames.get(ref['path'])
            if frame and ref==frame['first']:
                self._member(current_ref(ref));return bytes(frame['before'])
            if ref['path']==inventory['path'] and ref==inventory['before']:
                self._member(current_ref(ref));return bytes(inventory_before)
            if ref['path']==auto['path'] and ref==auto['before']:
                self._member(current_ref(ref));return bytes(auto_before)
            if ref['path']==win['path'] and ref==win['before']:
                self._member(current_ref(ref));return bytes(win_before)
            if ref['path'] == form['path'] and ref['sha256'] == form['before']['sha256']:
                _require(ref == form['before']); return bytes(old_form)
            return self._member(ref)
        transitions = final['source_transitions'] + final['structural_transitions']; _require(len(final['source_transitions']) == 5 and len(final['structural_transitions']) == 2)
        for t in transitions:
            _require(t['before']['path'] == t['after']['path'] == t['path']); old = self._member(t['archive']); now = historical_member(t['after']); _match(old,t['before']); _require(_replay(old,t['edits']) == now)
            if t in final['source_transitions']: _require(git('show',final['base_commit']+':'+t['path']) == old and git('show',final['source_commit']+':'+t['path']) == now)
        def old_member(ref):
            t = next((x for x in transitions if x['path'] == ref['path'] and x['before']['sha256'] == ref['sha256'] and x['before']['bytes'] == ref['bytes']), None)
            return self._member(t['archive']) if t is not None else historical_member(ref)
        old_roster = json.loads(self._member(final['predecessor_registry'])); new_roster = json.loads(self._member(final['current_registry']))
        _require(final['predecessor_registry']['sha256'] == '9ea6a63cec33d906e2ccea1d5d0b32b9dc5582691adde4d48387b5ae9766de37' and len(old_roster['cases']) == 2324 and len(new_roster['cases']) == 2329 and len(final['new_cases']) == 5)
        add_ids = [x['case_id'] for x in final['new_cases']]; _require([x.split('/')[-1] for x in add_ids] == ['autocomplete.spec.ts#180','input.spec.ts#113','input.spec.ts#114','input.spec.ts#115','input.spec.ts#116'] and len(set(add_ids)) == 5)
        for row in final['new_cases']: _require(next(x for x in new_roster['cases'] if x['case_id'] == row['case_id']) == row)
        restored = copy.deepcopy(new_roster); restored['cases'] = [x for x in restored['cases'] if x['case_id'] not in add_ids]; restored['ids'] = [x for x in restored['ids'] if x not in add_ids]; restored['direct_cases'] -= 5; _require(restored == old_roster)
        mt,it = final['structural_transitions']; _require(mt['path'] == 'compatibility/rc/matrices/full-verify.json' and it['path'] == 'testing/legacy-runner/historical-inventory.json')
        old_m,new_m = json.loads(self._member(mt['archive'])),json.loads(historical_member(mt['after'])); ids=lambda x:x['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']; _require(ids(old_m) == old_roster['ids'] and ids(new_m) == new_roster['ids']); restored_m=copy.deepcopy(new_m); restored_m['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']=ids(old_m); _require(restored_m == old_m)
        old_i,new_i=json.loads(self._member(it['archive'])),json.loads(historical_member(it['after'])); restored_i=copy.deepcopy(new_i); _require(len(old_i['rows']) == 57 and len(old_i['shared_suite_shims']) == 21)
        for path in ('projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts','projects/ngx-material-legacy/legacy-input/input.spec.ts'):
            a=[x for x in old_i['rows'] if x['candidate'] == path]; b=[x for x in restored_i['rows'] if x['candidate'] == path]; t=next(x for x in final['source_transitions'] if x['path'] == path); _require(len(a) == len(b) == 1 and a[0]['candidate_sha256'] == t['before']['sha256'] and b[0]['candidate_sha256'] == t['after']['sha256']); snapshot=b[0]['prior_candidate_snapshots'].pop(); _require(snapshot['candidate_sha256'] == a[0]['candidate_sha256'] and snapshot['adaptation'] == a[0]['adaptation'] and snapshot['execution'] == a[0]['execution'] and snapshot['current_source_binding'] is False and bool(snapshot['reason'])); b[0]['candidate_sha256']=a[0]['candidate_sha256']
        _require(restored_i == old_i)
        for parent, commit in ((PARENT, COMMIT), (POINTER_PARENT, POINTER_COMMIT)):
            if not git('rev-list', '--parents', '-n', '1', commit).decode().strip() == commit + ' ' + parent:
                raise AssertionError()
        before, after = (git('show', PARENT + ':' + packet['before']['path']), git('show', COMMIT + ':' + packet['after']['path']))
        _match(before, packet['before'])
        _match(after, packet['after'])
        cursor, pieces = (0, [])
        if not type(packet['edits']) is list:
            raise AssertionError()
        for edit in packet['edits']:
            if not (set(edit) == {'offset', 'before', 'after'} and type(edit['offset']) is int and (edit['offset'] >= cursor)):
                raise AssertionError()
            if not (type(edit['before']) is type(edit['after']) is str and edit['before'] != edit['after']):
                raise AssertionError()
            old = edit['before'].encode()
            offset = edit['offset']
            if not before[offset:offset + len(old)] == old:
                raise AssertionError()
            pieces += [before[cursor:offset], edit['after'].encode()]
            cursor = offset + len(old)
        _require(b''.join([*pieces, before[cursor:]]) == after)
        input = json.loads(self._member(INPUT_PACKET))
        _require(input['schema_version'] == 1 and input['role'] == 'current-tool-matrix-input-source-successor')
        _require(input['historical_programs_executed'] is False and input['artifact_or_audit_admission_granted'] is False)
        _require(input['historical_base_packet'] == PACKET and input['matrix_before'] == packet['after'])
        edit = input['matrix_edit']; _require(set(edit) == {'offset', 'before', 'after'} and edit['before'] == '')
        _require(type(edit['offset']) is int and 0 <= edit['offset'] <= len(after) and type(edit['after']) is str)
        pos = edit['offset']; latest = after[:pos] + edit['after'].encode() + after[pos:]
        _match(latest, input['matrix_after']); _require(old_member(input['matrix_after']) == latest)
        edges = [('95ae89744396d3071b386058c85ba388f0301020','8a0c4866dba602bd1f9c9916128f7537d986e0b9','projects/ngx-material-legacy/legacy-input/input.spec.ts'), ('8a0c4866dba602bd1f9c9916128f7537d986e0b9','313984c7fe1a2d13bccd0afc33ac17d66cc1d8c5','projects/ngx-material-legacy/legacy-input/input.spec.ts'), ('95ae89744396d3071b386058c85ba388f0301020','8a0c4866dba602bd1f9c9916128f7537d986e0b9','projects/ngx-material-legacy/legacy-form-field/form-field.ts')]
        _require(len(input['product_transitions']) == len(edges))
        for (parent, commit, path), transition in zip(edges, input['product_transitions']):
            _require(transition['parent'] == parent and transition['commit'] == commit and transition['path'] == transition['before']['path'] == transition['after']['path'] == path)
            _require(git('rev-list', '--parents', '-n', '1', commit).decode().strip() == commit + ' ' + parent)
            a, b = git('show', parent + ':' + path), git('show', commit + ':' + path)
            _match(a, transition['before']); _match(b, transition['after']); _require(_replay(a, transition['edits']) == b)
        _require(input['current_product_refs'] == [input['product_transitions'][1]['after'], input['product_transitions'][2]['after']])
        for ref in input['current_product_refs']: old_member(ref)
        _require(len(input['reviews']) == 2)
        repair_review, input_review = [json.loads(self._member(ref)) for ref in input['reviews']]
        _require(repair_review['parent'] == edges[0][0] and input_review['parent'] == edges[1][0])
        _require(input_review['source']['path'] == edges[1][2] and input_review['source']['before_sha256'] == input['product_transitions'][1]['before']['sha256'] and input_review['source']['after_sha256'] == input['product_transitions'][1]['after']['sha256'])
        _require(len(repair_review['sources']) == 2)
        for transition in (input['product_transitions'][0], input['product_transitions'][2]):
            found = [row for row in repair_review['sources'] if row['path'] == transition['path']]
            _require(len(found) == 1 and found[0]['before_sha256'] == transition['before']['sha256'] and found[0]['after_sha256'] == transition['after']['sha256'])
        report = input_review['root_actual_roster']['report']
        _require(report['actual_cases'] == 2324 and report['unchanged_complete_records'] == 2322 and report['old_ids_order_preserved'] is True)
        _require(report['changed_records'] == [input['changed_case']] and report['added_records'] == [input['new_case']] and report['actual_roster_sha256'] == input['current_registry_sha256'])
        _require(input['inventory_before']['path'] == input['inventory_after']['path'] == 'testing/legacy-runner/historical-inventory.json')
        _require(input['inventory_candidate'] == input['product_transitions'][1]['path'])
        old_inventory = git('show', COMMIT + ':' + input['inventory_before']['path']); _match(old_inventory, input['inventory_before'])
        new_inventory = _replay(old_inventory, input['inventory_edits']); _match(new_inventory, input['inventory_after']); _require(old_member(input['inventory_after']) == new_inventory)
        old_inventory_data, new_inventory_data = json.loads(old_inventory), json.loads(new_inventory)
        matches_old = [row for row in old_inventory_data['rows'] if row['candidate'] == input['inventory_candidate']]
        matches_new = [row for row in new_inventory_data['rows'] if row['candidate'] == input['inventory_candidate']]
        _require(len(matches_old) == len(matches_new) == 1)
        old_row, new_row = matches_old[0], matches_new[0]
        _require(old_row['candidate_sha256'] == input['product_transitions'][0]['before']['sha256'] and new_row['candidate_sha256'] == input['product_transitions'][1]['after']['sha256'])
        snapshot = new_row['prior_candidate_snapshots'][-1]
        _require(snapshot == input['inventory_previous_snapshot'] and snapshot['candidate_sha256'] == old_row['candidate_sha256'] and snapshot['adaptation'] == old_row['adaptation'] and snapshot['execution'] == old_row['execution'] and snapshot['current_source_binding'] is False and type(snapshot['reason']) is str and bool(snapshot['reason']))
        normalized_inventory = copy.deepcopy(new_inventory_data)
        normalized_row = next(row for row in normalized_inventory['rows'] if row['candidate'] == input['inventory_candidate'])
        normalized_row['candidate_sha256'] = old_row['candidate_sha256']; normalized_row['prior_candidate_snapshots'].pop()
        _require(normalized_inventory == old_inventory_data)
        pointer = packet['pointer_source']
        if not (pointer['source_parent'] == POINTER_PARENT and pointer['source_commit'] == POINTER_COMMIT):
            raise AssertionError()
        prior_spec = git('show', POINTER_PARENT + ':' + pointer['before']['path'])
        current_spec = git('show', POINTER_COMMIT + ':' + pointer['after']['path'])
        _match(prior_spec, pointer['before'])
        _match(current_spec, pointer['after'])
        if not (current_spec.startswith(prior_spec) and _hash(current_spec[len(prior_spec):]) == pointer['append_sha256'] and (old_member(pointer['after']) == current_spec)):
            raise AssertionError()
        if not len(packet['reviews']) == 2:
            raise AssertionError()
        review, pointer_review = [json.loads(self._member(ref)) for ref in packet['reviews']]
        if not (review['parent'] == PARENT and review['pointer_product_commit'] == POINTER_COMMIT and (review['current_files'][packet['after']['path']] == packet['after']['sha256'])):
            raise AssertionError()
        if not pointer_review['registry']['before_sha256'] == packet['prior_registry']['sha256']:
            raise AssertionError()
        prior = json.loads(self._member(packet['prior_registry']))
        old, current = (json.loads(before), json.loads(after))
        old_cases = old['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']
        cases = current['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']
        if not (len(prior['ids']) == len(prior['cases']) == 2322 and len(cases) == len(set(cases)) == 2323):
            raise AssertionError()
        if not (cases.count(NEW_CASE) == 1 and [x for x in cases if x != NEW_CASE] == prior['ids']):
            raise AssertionError()
        if not len(current['checks'][4]['acceptance']['cases_by_line']['main']['discovery-negatives']) == 5:
            raise AssertionError()
        if not (len(set(old_cases)) == len(old_cases) and set(old_cases) <= set(cases)):
            raise AssertionError()
        normalized = copy.deepcopy(current)
        normalized['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases'] = old_cases
        if not normalized == old:
            raise AssertionError()
        updated = json.loads(latest)
        new_cases = updated['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases']
        _require(len(new_cases) == len(set(new_cases)) == 2324 and new_cases.count(input['new_case']['case_id']) == 1)
        _require([case for case in new_cases if case != input['new_case']['case_id']] == cases)
        restored = copy.deepcopy(updated); restored['checks'][4]['acceptance']['cases_by_line']['main']['original-and-shared-cases'] = cases
        _require(restored == current)
        predecessor = copy.deepcopy(prior); at = cases.index(NEW_CASE)
        _require(input['pointer_case']['case_id'] == NEW_CASE)
        predecessor['ids'].insert(at, NEW_CASE); predecessor['cases'].insert(at, input['pointer_case']); predecessor['direct_cases'] += 1
        _require(_json_hash(predecessor) == input['predecessor_registry_sha256'] == pointer_review['registry']['after_sha256'])
        _require(predecessor['ids'] == cases)
        changed_at = predecessor['ids'].index(input['changed_case']['before']['case_id'])
        _require(predecessor['cases'][changed_at] == input['changed_case']['before'] and input['changed_case']['before']['case_id'] == input['changed_case']['after']['case_id'])
        predecessor['cases'][changed_at] = input['changed_case']['after']
        new_at = new_cases.index(input['new_case']['case_id']); predecessor['ids'].insert(new_at, input['new_case']['case_id']); predecessor['cases'].insert(new_at, input['new_case']); predecessor['direct_cases'] += 1
        _require(predecessor['ids'] == new_cases and _json_hash(predecessor) == input['current_registry_sha256'])
        proof = review['named_source_rebindings']['proof']
        if not (len(proof['rows']) == 19 and proof['current_sha256'] == pointer['before']['sha256'] and (proof['path'] == pointer['after']['path'])):
            raise AssertionError()
        by_id = {row['case_id']: row for row in prior['cases']}
        for row in proof['rows']:
            if not (row['source_body_match'] is True and row['before_callback_sha256'] == row['after_callback_sha256'] and (len(row['current_candidates']) == 1)):
                raise AssertionError()
            if not by_id[row['current_candidates'][0]]['full_name'] == row['full_name']:
                raise AssertionError()
        for path, sha256 in review['current_files'].items():
            if path == packet['after']['path']:
                _require(sha256 == packet['after']['sha256']); old_member(input['matrix_after'])
            elif path == input['inventory_before']['path']:
                _require(sha256 == input['inventory_before']['sha256']); old_member(input['inventory_after'])
            else:
                _require(_hash(self._read(path)) == sha256)
        self._before_ref, self._intermediate_ref, self._after_ref, self._before, self._intermediate = (tuple(sorted(packet['before'].items())), tuple(sorted(packet['after'].items())), tuple(sorted(final['structural_transitions'][0]['after'].items())), before, after)
        self._sweep()

    def _read(self, path):
        raw = _physical(self.root, path)
        ref = dict(path=path, sha256=_hash(raw), bytes=len(raw))
        if not (path in self._bound and self._bound[path] == ref):
            raise AssertionError('unregistered or changed matrix frame path')
        if self._provided is not None:
            provided = self._provided(path)
            if not (type(provided) is bytes and provided == raw):
                raise AssertionError()
            self._sweep()
        if not _physical(self.root, path) == raw:
            raise AssertionError()
        return raw

    def _member(self, ref):
        raw = self._read(ref['path'])
        _match(raw, ref)
        return raw

    def _sweep(self):
        for ref in self._bound.values():
            _match(_physical(self.root, ref['path']), ref)

    @property
    def before(self):
        return dict(self._before_ref)

    @property
    def intermediate(self): return dict(self._intermediate_ref)

    @property
    def after(self):
        return dict(self._after_ref)

    @property
    def bound(self):
        return copy.deepcopy(list(self._bound.values()))

    def assert_current(self):
        with _transaction(self.root):
            for ref in list(self._bound.values()):
                self._member(ref)
            self._sweep()

    def comparison_bytes(self, ref):
        with _transaction(self.root):
            _require(type(ref) is dict)
            keys = tuple(ref)
            _require(all(type(key) is str for key in keys) and set(keys) == {'path', 'sha256', 'bytes'})
            _require(type(ref['path']) is str and type(ref['sha256']) is str and type(ref['bytes']) is int and ref['bytes'] >= 0)
            if ref == dict(self._before_ref): result = self._before
            elif ref == dict(self._intermediate_ref): result = self._intermediate
            else: raise AssertionError()
            self._member(self._bound[dict(self._after_ref)['path']])
            self._sweep()
            return bytes(result)
