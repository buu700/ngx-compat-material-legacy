# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent JSON-token splice; no JavaScript producer or canonical writes."""
from pathlib import Path
import argparse,gzip,hashlib,json,os,re,subprocess
from browser_reference_independent_support import (verify_helpers,validate_full_report,verify_physical,assert_strict_frame)
ROOT=Path(__file__).resolve().parents[1]
PINS={'main': {'parent': '0cda109c68d11278b2c348a34b773bf2e623b20e', 'before': '0f3ffb5a86e4838a3fd29d7e47e10a30bc7feb39f23d79dde9706473f6337443', 'after': 'd4f65b5545915bee888a342495a13d756f926d5edc7679a529a881d3e5bc4a3d', 'count': 18, 'entries': 9, 'packet': '6a5ed7a82947ac170e3a051c3f7801ee1a72797fc0d679e78f959fe483255c07'}, '21.x': {'parent': '7378668ffa018b9cbf5498d84a5db32fa824cc26', 'before': '8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17', 'after': 'f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee', 'count': 16, 'entries': 8, 'packet': '52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e'}}
LEDGER='compatibility/f10/disposition-ledger/ledger.json'
hash_bytes=lambda raw:hashlib.sha256(raw).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--metadata',action='store_true')
    args=parser.parse_args()
    line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    pin=PINS[line]
    env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
    before=subprocess.check_output(['git','--no-replace-objects','show',pin['parent']+':'+LEDGER],cwd=ROOT,env=env)
    assert hash_bytes(before)==pin['before'];live_before=(ROOT/LEDGER).read_bytes()
    raw_packet=(ROOT/'compatibility/rc/c04-browser-reference-proposal.json').read_bytes();assert hash_bytes(raw_packet)==pin['packet'];packet=json.loads(raw_packet)
    raw_inputs=(ROOT/packet['qualified_source_inputs']['path']).read_bytes();assert hash_bytes(raw_inputs)==packet['qualified_source_inputs']['sha256'] and len(raw_inputs)==packet['qualified_source_inputs']['bytes']
    transitions={row['path']:row for row in json.loads(raw_inputs)['transitions']};assert len(transitions)==4
    verify_helpers(ROOT,line,transitions)
    inspector="""import {inspectBrowserReferenceSource} from './scripts/browser-reference-source.mjs';
    const s=inspectBrowserReferenceSource({root:process.cwd()});s.assertCurrent();
    console.log(JSON.stringify({bound:s.bound,report:s.report}));"""
    def baseline():
        return json.loads(subprocess.check_output(['node','--input-type=module','-e',inspector],cwd=ROOT,env=env))
    initial=baseline()
    source=json.loads(subprocess.check_output(['node','tests/browser_reference_source_probe.mjs'],cwd=ROOT,env=env))
    final=baseline();assert final==initial
    assert (ROOT/LEDGER).read_bytes()==live_before
    rows=validate_full_report(source,initial,line,live_before)
    verify_helpers(ROOT,line,transitions);verify_physical(ROOT,rows)
    assert (ROOT/LEDGER).read_bytes()==live_before
    assert source['result']=='pass' and source['selected_references']==pin['count'] and source['canonical_frame_admission_granted'] is False
    assert source['old_programs_executed'] is False and source['actual_native_packed_browser_floor_or_full_audit_qualified'] is False
    prior=json.loads(before);expected=json.loads(before);wanted={};selected=set();preserved=0;already_current=0
    kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior']
    for entry_index,entry in enumerate(expected['entries']):
        for kind in kinds:
            for index,ref in enumerate(entry.get('individual_proof',{}).get(kind,{}).get('source_members',[])):
                row=transitions.get(ref['path'])
                if row is None:preserved+=1;continue
                assert ref['sha256'] in [row['before']['sha256'],row['after']['sha256']]
                if ref['sha256']==row['after']['sha256']:preserved+=1;already_current+=1;continue
                pointer=('entries',entry_index,'individual_proof',kind,'source_members',index,'sha256')
                assert pointer not in wanted;wanted[pointer]=(ref['sha256'],row['after']['sha256']);ref['sha256']=row['after']['sha256'];selected.add(entry['sha'])
    assert len(wanted)==pin['count'] and len(selected)==pin['entries'] and already_current==0
    # Locate actual JSON string tokens by structural pointer, never by replacing
    # every occurrence of a hash or serializing the candidate ledger again.
    text=before.decode();decoder=json.JSONDecoder();spans={}
    def whitespace(cursor):
        while cursor<len(text) and text[cursor].isspace():cursor+=1
        return cursor
    def token(cursor,pointer=()):
        cursor=whitespace(cursor);start=cursor;char=text[cursor]
        if char=='{':
            cursor=whitespace(cursor+1);keys=set()
            if text[cursor]=='}':return cursor+1
            while True:
                key,end=decoder.raw_decode(text,cursor);assert isinstance(key,str) and key not in keys;keys.add(key)
                cursor=whitespace(end);assert text[cursor]==':'
                cursor=whitespace(token(cursor+1,pointer+(key,)))
                if text[cursor]=='}':return cursor+1
                assert text[cursor]==',';cursor=whitespace(cursor+1)
        if char=='[':
            cursor=whitespace(cursor+1);index=0
            if text[cursor]==']':return cursor+1
            while True:
                cursor=whitespace(token(cursor,pointer+(index,)));index+=1
                if text[cursor]==']':return cursor+1
                assert text[cursor]==',';cursor=whitespace(cursor+1)
        value,end=decoder.raw_decode(text,cursor)
        if pointer in wanted:
            assert value==wanted[pointer][0] and isinstance(value,str);assert pointer not in spans;spans[pointer]=(start,end)
        return end
    assert whitespace(token(0))==len(text);assert set(spans)==set(wanted)
    parts=[];last=0
    for pointer,(start,end) in sorted(spans.items(),key=lambda pair:pair[1][0]):
        old,new=wanted[pointer];assert text[start:end]==json.dumps(old);replacement=json.dumps(new);assert len(replacement)==end-start
        parts.extend([text[last:start],replacement]);last=end
    parts.append(text[last:]);after=''.join(parts).encode()
    assert json.loads(after)==expected and len(after)==len(before) and hash_bytes(after)==pin['after']
    assert gzip.decompress((ROOT/'compatibility/rc/c04-browser-reference-proposal-after.json.gz').read_bytes())==after
    assert packet['after_ledger']['sha256']==hash_bytes(after) and packet['preserved_native_reference_count']==preserved
    markers=list(re.finditer(r'^    \{\n      "sha": "([0-9a-f]{40})",\n',text,re.M));assert len(markers)==1697
    end_entries=text.index('\n  ],',markers[-1].end());after_text=after.decode();unchanged=0
    for index,marker in enumerate(markers):
        end=markers[index+1].start() if index+1<len(markers) else end_entries
        equal=text[marker.start():end]==after_text[marker.start():end]
        assert equal==(marker.group(1) not in selected);unchanged+=equal
    assert unchanged==1697-pin['entries'];assert (ROOT/LEDGER).read_bytes()==live_before
    if not args.metadata:assert_strict_frame(live_before,before,after)
    print(json.dumps({'schema_version':1,'line':line,'independent_after_sha256':hash_bytes(after),'independent_after_bytes':len(after),'hash_scalar_replacements':len(wanted),'selected_entries':len(selected),'unselected_entry_bytes_preserved':unchanged,'preserved_native_reference_count':preserved,'already_current_browser_references_preserved':already_current,'canonical_ledger_unchanged':True,'source_execution_mode':'source-metadata' if args.metadata else 'strict-canonical-frame','current_canonical_frame_verified':not args.metadata,'current_physical_ledger_sha256':hash_bytes(live_before),'current_physical_ledger_bytes':len(live_before),'canonical_frame_admission_granted':False,'canonical_owner_integration_complete':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}))

if __name__=='__main__':main()
