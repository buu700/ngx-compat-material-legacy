"""Build only the exact authorized epoch/base reader transition; no canonical writes."""
from pathlib import Path
import difflib,hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[2]
PARENT='519e487c40c9cb2beaf92a5e6564a9af1b355720'
INPUTS='compatibility/rc/historical-contract-repair-reader-inputs.json'
HELPER='scripts/historical-contract-repair-readers.mjs'
def sha(raw): return hashlib.sha256(raw).hexdigest()
def original(path):
    return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',PARENT+':'+path],cwd=ROOT,env=__import__('os').environ|{'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'})
def literals(before,after):
    old=before.decode();new=after.decode();a=old.splitlines(keepends=True);b=new.splitlines(keepends=True)
    for context in [3,6,12,24,48,96]:
        groups=list(difflib.SequenceMatcher(None,a,b,autojunk=False).get_grouped_opcodes(context));edits=[];text=old
        for group in groups:
            first,last=group[0],group[-1];left=''.join(a[first[1]:last[2]]);right=''.join(b[first[3]:last[4]])
            if not left or text.count(left)!=1: break
            edits.append({'before':left,'after':right});text=text.replace(left,right)
        else:
            assert text==new
            return edits
    raise AssertionError('No unique finite line edits')
prior_raw=original(INPUTS);assert sha(prior_raw)=='3af8b447d98b9d0bde687d83399e8c625604dbefa78b00535e142b063d8482f3'
data=json.loads(prior_raw);assert (json.dumps(data,indent=2)+'\n').encode()==prior_raw
prior=json.loads(prior_raw);assert len(data['tool_transitions'])==15
path='scripts/packed-upstream-ledger-epoch.mjs';row=next(row for row in data['tool_transitions'] if row['path']==path)
before=original(path);after=(ROOT/path).read_bytes();assert sha(before)==row['after']['sha256'];row['literal_edits']+=literals(before,after);row['after']={'sha256':sha(after),'bytes':len(after)}
path='scripts/packed-upstream-ledger-base.mjs';before=original(path);after=(ROOT/path).read_bytes();assert sha(before)=='ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715'
data['tool_transitions'].append({'path':path,'source_parent':PARENT,'before':{'sha256':sha(before),'bytes':len(before)},'literal_edits':literals(before,after),'after':{'sha256':sha(after),'bytes':len(after)}})
path='scripts/checker-reference-metadata.mjs';before=original(path);after=(ROOT/path).read_bytes();assert sha(before)=='1fd8883f7f8872cab67003b355b140020c49ed7ce0422660c7ec51460d14b1ea'
data['tool_transitions'].append({'path':path,'source_parent':PARENT,'before':{'sha256':sha(before),'bytes':len(before)},'literal_edits':literals(before,after),'after':{'sha256':sha(after),'bytes':len(after)}})
for old in prior['tool_transitions']:
    if old['path']!='scripts/packed-upstream-ledger-epoch.mjs': assert next(row for row in data['tool_transitions'] if row['path']==old['path'])==old
raw=(json.dumps(data,indent=2)+'\n').encode()
for old in prior['tool_transitions']:
    if old['path']!='scripts/packed-upstream-ledger-epoch.mjs':
        literal='\n'.join('    '+line for line in json.dumps(old,indent=2).splitlines());assert literal in prior_raw.decode() and literal in raw.decode()
data['prior_reader_registry']={'path':INPUTS,'source_parent':PARENT,'sha256':sha(prior_raw),'bytes':len(prior_raw)}
data['extension_kind']='packed-owner-source-lanes'
raw=(json.dumps(data,indent=2)+'\n').encode();(ROOT/INPUTS).write_bytes(raw)
helper=(ROOT/HELPER).read_text();import re
helper,count=re.subn(r"const PINS=\{'21.x':'[0-9a-f]{64}'", "const PINS={'21.x':'"+sha(raw)+"'",helper);assert count==1;(ROOT/HELPER).write_text(helper)
print(json.dumps({'manifest':{'path':INPUTS,'sha256':sha(raw),'bytes':len(raw)},'tools':[{'path':path,'sha256':sha((ROOT/path).read_bytes()),'bytes':len((ROOT/path).read_bytes())} for path in ['scripts/packed-upstream-ledger-epoch.mjs','scripts/packed-upstream-ledger-base.mjs',HELPER]],'prior_rows_unchanged':14,'canonical_changes':0}))
