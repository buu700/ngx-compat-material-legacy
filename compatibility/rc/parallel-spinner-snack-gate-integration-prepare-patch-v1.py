#!/usr/bin/env python3
"""Prepare exact reviewable afterimages without editing any held gate file."""
from pathlib import Path
import difflib
import hashlib
import json
ROOT=Path(__file__).resolve().parents[2]
PREFIX='compatibility/rc/parallel-spinner-snack-gate-integration-'
ROOTS={'21.x':ROOT,'main':Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
worksheet=json.loads((ROOT/(PREFIX+'worksheet-v1.json')).read_bytes())
def change(text,before,after):
    assert text.count(before)==1,(before[:140],text.count(before))
    return text.replace(before,after,1)
def edits(path,text,line):
    if path=='scripts/sass-seal.mjs':
        text=change(text,"import {runOwnedAggregateContracts} from './sass-owned-aggregates.mjs';", "import {runOwnedAggregateContracts} from './sass-owned-aggregates.mjs';\nimport {createSpinnerSnackGateContext,spinnerSnackGateDescriptor,spinnerSnackGateMeasurementOk,SPINNER_SNACK_GATE_CASES,SPINNER_SNACK_DEFAULT_CASES,measureSpinnerSnackDefaultReferences,attachSpinnerSnackDefaultReferences} from './sass-spinner-snack-gate-integration.mjs';")
        text=change(text,"line = '"+line+"', importer = makeImporter()})", "line = '"+line+"', spinnerSnackContext, importer = makeImporter()})")
        text=change(text,'||RIPPLE_COLOR_DEFAULT_CASES[caseId];','||RIPPLE_COLOR_DEFAULT_CASES[caseId]||(SPINNER_SNACK_DEFAULT_CASES.includes(caseId)?plan:null);')
        text=change(text,"        if(Object.hasOwn(RIPPLE_COLOR_DEFAULT_CASES,caseId)){", "        if(SPINNER_SNACK_GATE_CASES.includes(caseId)){\n          if(!spinnerSnackContext||spinnerSnackContext.line!==line||!spinnerSnackGateMeasurementOk({context:spinnerSnackContext,caseId,actual:actual_measurement}))throw Error('spinner/snack current source measurement incomplete');\n          css[name]={...css[name],actual_measurement,current_spinner_snack_bridge:spinnerSnackGateDescriptor(spinnerSnackContext)};\n        }\n        if(SPINNER_SNACK_DEFAULT_CASES.includes(caseId)){\n          // The untouched16 referenceObserver adds the original measurement before inventory comparison.\n        }else if(Object.hasOwn(RIPPLE_COLOR_DEFAULT_CASES,caseId)){")
        text=change(text,"'actual_measurement','comparison']", "'actual_measurement','comparison','current_spinner_snack_bridge','identity','mixin','variant','call','mutation','mutation_rejected','error']")
        text=change(text,'if(result.current_infrastructure||result.current_companion){body.binding=binding;body.exit_code=0;}',"if(result.current_infrastructure||result.current_companion||result.current_spinner_snack_bridge){body.binding=binding;body.exit_code=0;}\n  if(result.current_spinner_snack_bridge){body.error=null;}")
        text=change(text,'  const api = runSassApi({','  const spinnerSnackContext=createSpinnerSnackGateContext({root});\n  const api = runSassApi({')
        text=change(text,'packageRoot: installedLib, allowedRoots,','packageRoot: installedLib, allowedRoots, spinnerSnackContext,')
        before="  const apiResults = classifyPending(compareInventory(oracle, api.members, api.css), decisions);\n  if (JSON.stringify(apiResults.map(item => item.case_id)) !== JSON.stringify(apiIds)) {\n    fail(1, 'sass-api-and-values results do not match the predeclared case ids');\n  }\n  const drift = apiDriftNegative(oracle, api.members, api.css);\n"
        assert text.count(before)==1
        text=text.replace(before,'',1)
        call="runMixinArgumentContracts({sass,entry,loadPaths:[join(consumer,'node_modules')],allowedRoots,importers:[makeImporter({requested,denied})],line:'"+line+"',...reference})"
        text=change(text,call,call.replace(',...reference}',',spinnerSnackContext,...reference}'))
        text=change(text,'    referenceObserver:reference=>({','    referenceObserver:reference=>({\n      spinner_snack_defaults:measureSpinnerSnackDefaultReferences({sass,...reference}),')
        text=change(text,'  catch (error) {functions={ok:false,error:error.message,results:[]};}',"  catch (error) {functions={ok:false,error:error.message,results:[]};}\n  try{if(functions.mixin_arguments?.spinner_snack_defaults)api.css=attachSpinnerSnackDefaultReferences({context:spinnerSnackContext,css:api.css,references:functions.mixin_arguments.spinner_snack_defaults});}\n  catch(error){functions={...functions,ok:false,error:String(error.message||error)};}\n"+before.replace('compareInventory(oracle, api.members, api.css)','compareInventory(oracle, api.members, api.css,{spinnerSnackContext})').replace('apiDriftNegative(oracle, api.members, api.css)','apiDriftNegative(oracle, api.members, api.css,{spinnerSnackContext})'))
    elif path=='scripts/sass-api-inventory.mjs':
        text=change(text,"const companionTypes=[", "import {SPINNER_SNACK_DEFAULT_CASES,spinnerSnackGateDefaultMatch,spinnerSnackGateAggregateMatch} from './sass-spinner-snack-gate-integration.mjs';\nimport {SPINNER_SNACK_AGGREGATE_CASES} from './sass-spinner-snack-aggregate-contract.mjs';\nconst companionTypes=[")
        text=change(text,'function companionFailure(id,got){','function companionFailure(id,got,spinnerSnackContext){\n  if(SPINNER_SNACK_AGGREGATE_CASES.includes(id))return spinnerSnackContext&&got.css===got.actual_measurement?.css&&got.sha256===got.actual_measurement?.css_sha256&&spinnerSnackGateAggregateMatch({context:spinnerSnackContext,caseId:id,actual:got.actual_measurement,companion:got.current_companion,descriptor:got.current_spinner_snack_bridge})?null:\'finite spinner/snack aggregate contract differs\';')
        text=change(text,'export function compareInventory(oracle, candidate, candidateCss) {','export function compareInventory(oracle, candidate, candidateCss,{spinnerSnackContext}={}) {')
        text=change(text,"      : got.error ? `candidate invocation failed: ${got.error}`", "      : got.error ? `candidate invocation failed: ${got.error}`\n        : SPINNER_SNACK_DEFAULT_CASES.includes(`mixin-css/${name}`)\n          ? (spinnerSnackContext&&spinnerSnackGateDefaultMatch({context:spinnerSnackContext,caseId:`mixin-css/${name}`,got})?null:'finite spinner/snack default contract differs')")
        text=change(text,'companionFailure(`mixin-css/${name}`,got)','companionFailure(`mixin-css/${name}`,got,spinnerSnackContext)')
        text=change(text,"      ...(got&&Object.hasOwn(got,'current_infrastructure')?", "      ...(got&&Object.hasOwn(got,'current_spinner_snack_bridge')?{current_spinner_snack_bridge:got.current_spinner_snack_bridge,error:null,actual_measurement:got.actual_measurement}:{}),\n      ...(got&&SPINNER_SNACK_DEFAULT_CASES.includes(`mixin-css/${name}`)?{expected:got.expected,actual:got.actual_measurement,identity:got.identity,mixin:got.mixin,variant:got.variant,call:got.call,comparison:got.comparison,mutation:got.mutation,mutation_rejected:got.mutation_rejected}:{}),\n      ...(got&&Object.hasOwn(got,'current_infrastructure')?")
        text=change(text,'export function apiDriftNegative(oracle, candidate, candidateCss) {','export function apiDriftNegative(oracle, candidate, candidateCss,options={}) {')
        text=change(text,'compareInventory(oracle, candidate, candidateCss).filter','compareInventory(oracle, candidate, candidateCss,options).filter')
        text=change(text,'compareInventory(oracle, copy, css).filter','compareInventory(oracle, copy, css,options).filter')
    elif path=='scripts/sass-mixin-arguments.mjs':
        text=change(text,"const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');", "import {SPINNER_SNACK_GATE_CASES,spinnerSnackGateDescriptor,spinnerSnackGateDirectMatch,spinnerSnackGateAggregateMatch} from './sass-spinner-snack-gate-integration.mjs';\nimport {SPINNER_SNACK_BRIDGE_CASES,SPINNER_SNACK_BRIDGE_CONTRACT} from './sass-spinner-snack-bridge-contract.mjs';\nimport {SPINNER_SNACK_AGGREGATE_CASES} from './sass-spinner-snack-aggregate-contract.mjs';\nconst root=resolve(dirname(fileURLToPath(import.meta.url)),'..');")
        text=change(text,'line,referenceEntry,referenceRoot,identity})','line,referenceEntry,referenceRoot,identity,spinnerSnackContext})')
        text=change(text,'let expected,actual,error,current_companion,current_peer_alias;','let expected,actual,error,current_companion,current_peer_alias,current_spinner_snack_bridge;')
        text=change(text,'      if(Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,probe.case_id))actual=',"      if(SPINNER_SNACK_GATE_CASES.includes(probe.case_id)){if(!spinnerSnackContext||spinnerSnackContext.line!==line)throw Error('spinner/snack current source context missing');current_spinner_snack_bridge=spinnerSnackGateDescriptor(spinnerSnackContext);}\n      if(Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,probe.case_id))actual=")
        text=change(text,'const conforms=value=>Object.hasOwn(RIPPLE_COLOR_ARGUMENT_CASES,probe.case_id)',"const conforms=value=>SPINNER_SNACK_BRIDGE_CASES.includes(probe.case_id)\n      ? spinnerSnackGateDirectMatch({context:spinnerSnackContext,caseId:probe.case_id,original:expected,actual:{...actual,...value},identity:provenance,descriptor:current_spinner_snack_bridge})\n      : SPINNER_SNACK_AGGREGATE_CASES.includes(probe.case_id)\n      ? spinnerSnackGateAggregateMatch({context:spinnerSnackContext,caseId:probe.case_id,original:expected,actual:{...actual,...value},companion:current_companion,descriptor:current_spinner_snack_bridge})\n      : Object.hasOwn(RIPPLE_COLOR_ARGUMENT_CASES,probe.case_id)")
        text=change(text,'...(current_companion?{current_companion}:{}),...(current_peer_alias?{current_peer_alias}:{}),','...(current_companion?{current_companion}:{}),...(current_peer_alias?{current_peer_alias}:{}),...(current_spinner_snack_bridge?{current_spinner_snack_bridge}:{}),')
        text=change(text,"comparison:current_companion?'current-companion-contract'", "comparison:SPINNER_SNACK_BRIDGE_CASES.includes(probe.case_id)?SPINNER_SNACK_BRIDGE_CONTRACT:current_companion?'current-companion-contract'")
    elif path=='scripts/sass_mixin_argument_admission.py':
        text=change(text,'def mixin_argument_measurements_ok(root,body,*,owned=False):',"from sass_spinner_snack_gate_integration import SPINNER_SNACK_GATE_CASES, spinner_snack_gate_assertion_ok\n\ndef mixin_argument_measurements_ok(root,body,*,owned=False):")
        text=change(text,"        original=body['expected']['css'];actual=body['actual']['css']", "        if body['case_id'] in SPINNER_SNACK_GATE_CASES:\n            return spinner_snack_gate_assertion_ok(root,active,body,invocation)\n        if 'current_spinner_snack_bridge' in body:return False\n        original=body['expected']['css'];actual=body['actual']['css']")
    elif path=='scripts/rc-verify.py':
        text=change(text,'from sass_mixin_argument_admission import mixin_argument_assertion_ok',"from sass_mixin_argument_admission import mixin_argument_assertion_ok\nfrom sass_spinner_snack_gate_integration import SPINNER_SNACK_GATE_CASES, spinner_snack_gate_assertion_ok")
        text=change(text,"def _sass_seal_assertion_ok(body: dict, invocation: str) -> bool:\n", "def _sass_seal_assertion_ok(body: dict, invocation: str) -> bool:\n    if body.get('case_id') in SPINNER_SNACK_GATE_CASES and str(body.get('case_id','')).startswith('mixin-css/'):\n        return spinner_snack_gate_assertion_ok(ROOT,ACTIVE_RUN,body,invocation)\n    if 'current_spinner_snack_bridge' in body and body.get('case_id') not in SPINNER_SNACK_GATE_CASES:return False\n")
    elif path=='scripts/sass_default_aggregate_admission.py':
        pass # Its complete old expected model and old pure validator stay unchanged.
    else:raise AssertionError(path)
    return text
if __name__=='__main__':
    manifest=[]
    for line,root in ROOTS.items():
        patch=[];members=[]
        for before in worksheet['preimages'][line]:
            path=before['path'];raw=(root/path).read_bytes();assert len(raw)==before['bytes'] and hashlib.sha256(raw).hexdigest()==before['sha256']
            after=edits(path,raw.decode(),line).encode()
            if raw==after:continue
            patch.extend(difflib.unified_diff(raw.decode().splitlines(True),after.decode().splitlines(True),fromfile='a/'+path,tofile='b/'+path))
            members.append(dict(path=path,before=before,after=dict(sha256=hashlib.sha256(after).hexdigest(),bytes=len(after))))
        p=ROOT/(PREFIX+'proposed-'+('21x' if line=='21.x' else 'main')+'-v3.diff');assert not p.exists();p.write_text(''.join(patch))
        manifest.append(dict(line=line,path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,members=members))
    p=ROOT/(PREFIX+'proposed-patch-manifest-v3.json');assert not p.exists();p.write_text(json.dumps(dict(schema_version=1,status='reviewable data only; existing held gates unchanged',lines=manifest),indent=2)+'\n')
    print(json.dumps([dict(line=m['line'],members=len(m['members']),patch_bytes=m['bytes']) for m in manifest]))
