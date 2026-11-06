#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run both complete current source-contract fault suites for one RC run."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CHECK = 'source-contract-regressions'
IDS = [f'{CHECK}/checker-source/full-fault-lifetimes', f'{CHECK}/browser-source/full-fault-lifetimes']
COMMANDS = {'checker': ['node', 'tests/checker_reference_source_probe.mjs', '--metadata'],
            'browser': ['node', 'tests/browser_reference_source_probe.mjs']}
TIMEOUTS = {'checker': 180, 'browser': 300}
# Imported functions are the real current semantic inspectors.  They use the
# existing source owners, not historical program execution or fake authority.
INSPECT = r'''
import {inspectCheckerSourceMetadata} from './tests/checker_reference_source_probe.mjs';
import {inspectBrowserReferenceSource} from './scripts/browser-reference-source.mjs';
const kind=process.argv[1];
const subject=kind==='checker'?await inspectCheckerSourceMetadata():inspectBrowserReferenceSource({root:process.cwd()});
subject.assertCurrent();
console.log(JSON.stringify({bound:subject.bound,report:subject.report}));
'''
PHYSICAL = r'''
import {readCheckerOwnerMember} from './scripts/checker-owner-source.mjs';
import {createHash} from 'node:crypto';
let text='';for await (const c of process.stdin)text+=c;
const rows=JSON.parse(text);
for(const ref of rows){const value=readCheckerOwnerMember(process.cwd(),ref.path);if(value.length!==ref.bytes||createHash('sha256').update(value).digest('hex')!==ref.sha256)throw Error('changed final physical source '+ref.path);}
'''
HEX40 = re.compile(r'[0-9a-f]{40}\Z')
HEX64 = re.compile(r'[0-9a-f]{64}\Z')


def need(condition, message):
    if not condition:
        raise ValueError(message)


def child_env():
    return {k: v for k, v in os.environ.items() if not k.startswith('RC_')}


def head(root):
    env = child_env()
    for key in ('GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1', GIT_TERMINAL_PROMPT='0')
    def git(*args):
        return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root,env=env,stderr=subprocess.PIPE,text=True,timeout=20).strip()
    commit, tree = git('rev-parse','HEAD'), git('rev-parse','HEAD^{tree}')
    need(bool(HEX40.fullmatch(commit)) and bool(HEX40.fullmatch(tree)), 'invalid HEAD/tree')
    return commit, tree


def source_line(root):
    version=json.loads((root/'projects/ngx-material-legacy/package.json').read_bytes())['version']
    need(isinstance(version,str),'invalid source version')
    need(version.startswith(('21.','22.')),'unsupported source version')
    return '21.x' if version.startswith('21.') else 'main'


def rows_by_path(rows):
    need(type(rows) is list and bool(rows), 'missing source bindings')
    result={}
    for row in rows:
        need(type(row) is dict and set(row)=={'path','sha256','bytes'}, 'invalid source binding')
        p=row['path']; need(type(p) is str and p and not p.startswith('/') and '\\' not in p and '\0' not in p and all(x not in ('','.','..') for x in p.split('/')), 'invalid source path')
        need(p not in result and type(row['bytes']) is int and row['bytes']>0 and type(row['sha256']) is str and HEX64.fullmatch(row['sha256']), 'duplicate or invalid source binding')
        result[p]={'path':p,'sha256':row['sha256'],'bytes':row['bytes']}
    return result


def validate_report(kind, report, baseline, line):
    need(kind in COMMANDS and line in ('21.x','main'), 'invalid source scope')
    need(type(report) is dict and report.get('result')=='pass' and report.get('line')==line, 'failed or wrong-line child')
    need(report.get('source_execution_mode')=='complete-regression' and report.get('full_source_fault_lifetimes_executed') is True, 'not a complete regression')
    rows=rows_by_path(baseline); paths=set(rows); n=len(paths)
    for prefix in ('cold','late'):
        items=report.get(prefix+'_source_fault_paths_rejected')
        need(type(items) is list and len(items)==n and all(type(x) is str for x in items) and len(set(items))==n and set(items)==paths, prefix+' fault membership mismatch')
        need(type(report.get(prefix+'_source_faults_rejected')) is int and report[prefix+'_source_faults_rejected']==n, prefix+' count mismatch')
    need(type(report.get('bound_current_paths')) is int and report['bound_current_paths']==n, 'bound count mismatch')
    need(report.get('canonical_frame_admission_granted') is False and report.get('g11_claim')=='not-passed', 'source report overclaims admission')
    if kind=='checker':
        need(report.get('actual_guard_exclusion_checks')==(25 if line=='21.x' else 26), 'checker predicate count mismatch')
        need(report.get('old_checker_executed') is False and report.get('actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified') is False, 'checker scope mismatch')
    else:
        need(report.get('title_contract_negative_controls')==47 and type(report.get('whole_current_dialog_probe_collaborator_runs')) is list and len(report['whole_current_dialog_probe_collaborator_runs'])==8, 'browser dialog controls missing')
        need(report.get('complete_source_transitions')==4 and report.get('individually_reviewed_hunks')==23 and report.get('old_programs_executed') is False and report.get('actual_angular_DOM_browser_or_packed_execution') is False and report.get('actual_native_packed_browser_floor_or_full_audit_qualified') is False, 'browser scope mismatch')
    return rows


def run_child(cmd, root, timeout, input_text=None, on_start=None):
    child = subprocess.Popen(cmd, cwd=root, env=child_env(), stdin=subprocess.PIPE if input_text is not None else subprocess.DEVNULL,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    if on_start is not None:
        on_start()
    try:
        stdout, stderr = child.communicate(input=input_text, timeout=timeout)
    except subprocess.TimeoutExpired:
        # A source inspector can itself spawn Git. Kill the entire group before
        # draining pipes so descendants cannot extend the deadline or escape.
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.communicate()
        raise
    return subprocess.CompletedProcess(cmd, child.returncode, stdout, stderr)


def run_json(cmd, root, timeout, on_start=None):
    child=run_child(cmd,root,timeout,on_start=on_start)
    need(child.returncode==0, 'child failed: '+cmd[0]+' '+cmd[1]+' '+child.stderr[-2000:])
    return json.loads(child.stdout)


def inspect(kind, root):
    value=run_json(['node','--input-type=module','-e',INSPECT,kind],root,120)
    need(type(value) is dict and set(value)=={'bound','report'},'invalid fresh source inspector')
    return value


def local_row(root, relative):
    path=root
    for part in relative.split('/'):
        path=path/part
        need(not path.is_symlink(), 'linked producer source')
    need(path.is_file(), 'missing producer source '+relative)
    raw=path.read_bytes()
    return {'path':relative,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}


def request_from_env(env, root, identity, line):
    names=('RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR')
    present=[x for x in names if env.get(x)]
    if not present:return None
    need(len(present)==len(names),'incomplete coordinator environment')
    need(env['RC_CHECK_ID']==CHECK,'wrong check id')
    invocation=env['RC_INVOCATION_ID']; run_id=env['RC_RUN_ID']
    need(bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,191}',invocation)) and bool(run_id),'invalid run or invocation')
    binding=json.loads(env['RC_EVIDENCE_BINDING'])
    need(type(binding) is dict and binding.get('run_id')==run_id and binding.get('source_line')==line and binding.get('source_commit')==identity[0] and binding.get('source_tree')==identity[1] and binding.get('source_clean') is True and binding.get('input_clean') is True, 'run/source binding mismatch')
    output=Path(env['RC_ASSERTION_OUTPUT_DIR'])
    need(output.is_absolute() and not output.is_symlink() and output.is_dir(),'invalid assertion directory')
    need(output.parts[-3:]==('evidence',CHECK,invocation),'wrong assertion directory')
    run_dir=output.parents[2]; need(run_dir.is_dir() and not run_dir.is_symlink(),'invalid run directory')
    cursor=run_dir
    for part in ('evidence',CHECK,invocation):
        cursor=cursor/part;need(not cursor.is_symlink() and cursor.is_dir(),'linked assertion directory')
    return {'binding':binding,'run_id':run_id,'invocation':invocation,'line':line,'output':output,'run_dir':run_dir}


def write_acceptance(request, cases, observations, identity):
    output=request['output']; run_dir=request['run_dir']
    assertion={'kind':'source-contract-regressions-observations','check_id':CHECK,'run_id':request['run_id'],'invocation_id':request['invocation'],'source_commit':identity[0],'source_tree':identity[1],'cases':cases,'observations':observations,'g11_claim':'not-passed'}
    payload=(json.dumps(assertion,indent=2)+'\n').encode(); target=output/'source-contract-regressions-observations.json'
    with target.open('xb') as stream:stream.write(payload)
    relative=target.relative_to(run_dir).as_posix(); ref={'path':relative,'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
    passed=[c['case_id'] for c in cases if c['result']=='pass']; failed=[c['case_id'] for c in cases if c['result']=='fail']; unresolved=[c['case_id'] for c in cases if c['result']=='unresolved']; executed=[c['case_id'] for c in cases if c['result']!='unresolved']
    incomplete=bool(failed or unresolved)
    report={'schema_version':1,'template':False,'run_id':request['run_id'],'check_id':CHECK,'line':request['line'],'invocation_id':request['invocation'],'binding':request['binding'],'coverage':'incomplete' if incomplete else 'complete','result':'fail' if incomplete else 'pass','exit_code':1 if incomplete else 0,'g11_claim':'not-passed','subject_kind':'source','subject_ids':['source'],'artifacts':{},'expected_case_ids':IDS,'discovered_case_ids':IDS,'executed_case_ids':executed,'passed_case_ids':passed,'failed_case_ids':failed,'skipped_case_ids':[],'unresolved_case_ids':unresolved,'exceptions':[],'passed':len(passed),'failed':len(failed),'skipped':0,'outputs':[ref],'case_results':[{'case_id':c['case_id'],'result':c['result'],'kind':'assertion','output_paths':[relative]} for c in cases],'command':['python3','scripts/check-source-contract-regressions.py'],'limitations':['Source regression controls do not qualify browser, native, packed artifact, security, or G11 acceptance.']}
    reports=run_dir/'reports';need(reports.is_dir() and not reports.is_symlink(),'invalid reports directory')
    with (reports/(CHECK+'.json')).open('x') as stream:json.dump(report,stream,indent=2);stream.write('\n')
    return not incomplete


def main():
    need(len(sys.argv)==1, 'no command-line arguments are supported')
    root=ROOT; identity=head(root); line=source_line(root); request=request_from_env(os.environ,root,identity,line)
    observations={}; cases=[]; populations=[local_row(root,p) for p in ('scripts/check-source-contract-regressions.py','tests/checker_reference_source_probe.mjs','tests/browser_reference_source_probe.mjs')]
    for kind, case_id in zip(('checker','browser'),IDS):
        invoked=[]
        try:
            before=inspect(kind,root); base=rows_by_path(before['bound']); need(before['report'].get('line')==line,'wrong baseline line')
            result=run_json(COMMANDS[kind],root,TIMEOUTS[kind],on_start=lambda:invoked.append(True));validate_report(kind,result,before['bound'],line)
            need(all(result.get(k)==v for k,v in before['report'].items()),'full regression semantic report differs from baseline')
            after=inspect(kind,root);need(after['report']==before['report'] and rows_by_path(after['bound'])==base,'semantic report or source population changed during suite')
            need(head(root)==identity and source_line(root)==line,'source HEAD or line changed')
            observations[kind]={'report':result,'bound':list(base.values())}; populations.extend(base.values());cases.append({'case_id':case_id,'result':'pass'})
        except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError) as error:
            observations[kind]={'error':str(error)};cases.append({'case_id':case_id,'result':'fail' if invoked else 'unresolved'})
    try:
        unique={}
        for row in populations:
            old=unique.get(row['path']);need(old is None or old==row,'conflicting source population');unique[row['path']]=row
        child=run_child(['node','--input-type=module','-e',PHYSICAL],root,120,input_text=json.dumps(list(unique.values())))
        need(child.returncode==0,'final physical source sweep failed: '+child.stderr[-2000:]);need(head(root)==identity and source_line(root)==line,'late source HEAD or line changed')
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError) as error:
        observations['final_sweep_error']=str(error)
        for c in cases:
            if c['result'] != 'unresolved':c['result']='fail'
    if request:return 0 if write_acceptance(request,cases,observations,identity) else 1
    print(json.dumps({'result':'pass' if all(c['result']=='pass' for c in cases) else 'fail','line':line,'source_commit':identity[0],'cases':cases,'observations':observations,'g11_claim':'not-passed'}))
    return 0 if all(c['result']=='pass' for c in cases) else 1


if __name__=='__main__':
    try:raise SystemExit(main())
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError) as error:raise SystemExit('source-contract-regressions: '+str(error))
