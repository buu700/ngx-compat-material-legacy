# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual Python release-admission route, in a disposable test-owned source copy."""
import copy,hashlib,importlib,importlib.util,json,os,sys
from pathlib import Path
from types import SimpleNamespace
root=Path(sys.argv[1]).resolve();line=sys.argv[2];packet=json.loads(Path(sys.argv[3]).read_bytes())
if (root/'.sass-isolation-disposable').read_text()!='test-owned-disposable\n':raise ValueError('disposable source copy required')
sys.path.insert(0,str(root/'scripts'))
path=root/'scripts/private_card_composition.py';original=path.read_text();js_hash=hashlib.sha256((root/'scripts/private-card-composition.mjs').read_bytes()).hexdigest()
poison=original.replace("return '\\n\\n'.join(blocks)","return '\\n\\n'.join(blocks)+'\\n.unrelated { color: red; }'")
if poison==original:raise ValueError('missing composition anchor')
poison=poison.replace('_SELF_IMAGE = Path(__file__).read_bytes()',"_SELF_IMAGE = bytes.fromhex('"+original.encode().hex()+"')")
poison=poison.replace("_JS = '063187919adc60972ad216c70e57f109184c6433b26318d03bcee022704f1698'","_JS = '"+js_hash+"'")
former_launcher=root/'scripts/sass_expected_isolation.py'
assert not former_launcher.exists()
former_launcher.write_text("raise RuntimeError('poisoned former launcher imported')\n")
try:
    path.write_text(poison)
    helper=importlib.import_module('private_card_composition')
    gate=importlib.import_module('sass_private_card_gate')
finally:path.write_text(original);former_launcher.unlink()
body=packet['body'];active=SimpleNamespace(manifest=packet['run'],binding=body['binding']);bad=copy.deepcopy(body)
bad['actual']['css']+='\n.unrelated { color: red; }';bad['actual']['css_sha256']=hashlib.sha256(bad['actual']['css'].encode()).hexdigest();bad['actual']['css_bytes']=len(bad['actual']['css'].encode());bad['actual_measurement']=copy.deepcopy(bad['actual']);bad['actual_sha256']=bad['actual']['css_sha256'];bad['actual_bytes']=bad['actual']['css_bytes']
wrong=bad['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n';bad['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))
context=helper.create_private_card_context(str(root),line)
assert helper.private_card_composition_matches(context,line,body['case_id'],body['expected']['css'],bad['actual']['css']), 'poisoned imported helper must demonstrate the attack'
assert gate.private_card_assertion_ok(str(root),active,body,'unit')
assert not gate.private_card_assertion_ok(str(root),active,bad,'unit')
spec=importlib.util.spec_from_file_location('isolation_release_coordinator',root/'scripts/rc-verify.py');coordinator=importlib.util.module_from_spec(spec);spec.loader.exec_module(coordinator);coordinator.ACTIVE_RUN=active
assert coordinator._sass_seal_assertion_ok(body,'unit')
assert not coordinator._sass_seal_assertion_ok(bad,'unit')
old={k:os.environ.get(k) for k in ('NODE_OPTIONS','NODE_PATH','PYTHONPATH','PYTHONSTARTUP')}
try:
    os.environ.update(NODE_OPTIONS='--require=/nonexistent-untrusted-preload.cjs',NODE_PATH='/nonexistent',PYTHONPATH='/nonexistent',PYTHONSTARTUP='/nonexistent')
    assert coordinator._sass_seal_assertion_ok(body,'unit')
finally:
    for k,v in old.items():
        if v is None:os.environ.pop(k,None)
        else:os.environ[k]=v
bad=copy.deepcopy(body);bad['tarball_sha256']='0'*64;assert not coordinator._sass_seal_assertion_ok(bad,'unit')
print(json.dumps(dict(schema_version=1,line=line,controls=['captured-Python-helper-attack-active','poisoned-former-Python-launcher-never-imported','actual-Python-admission-positive','rehashed-extra-CSS-rejected','actual-release-coordinator-route-positive','actual-release-coordinator-route-forgery-rejected','startup-environment-sanitized','wrong-artifact-rejected'],scope='Actual rc-verify admission route; prior authenticated packed measurements and simulated envelope; no coordinator execution or final seal pass',source_restored=path.read_text()==original)))
