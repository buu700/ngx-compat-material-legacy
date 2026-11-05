from pathlib import Path
import ast,difflib,hashlib,json,shutil
root=Path.cwd();main=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');pre='compatibility/rc/parallel-spinner-snack-gate-integration-'
for suffix in ['physical-closure-js-main-v1.json','physical-closure-python-main-v1.json','c04-physical-main-v1.json','c04-physical-main-v2.json']:
 shutil.copyfile(main/(pre+suffix),root/(pre+suffix))
def ref(p):
 b=(root/p).read_bytes();return dict(path=p,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b))
oldjs=(root/(pre+'helper-before-postcallback-physical-js-v1.mjs')).read_text();newjs=(root/'scripts/sass-spinner-snack-gate-integration.mjs').read_text()
names=['currentMeasurement','originalIdentity','originalMeasurement','directMatch']
def jsfn(text,name):
 start=text.index('function '+name+'(');end=text.find('\n',start);return text[start:end]
for name in names:assert jsfn(oldjs,name)==jsfn(newjs,name)
marker='/** Only referenceObserver'
assert oldjs[oldjs.index(marker):oldjs.index('export function attachSpinnerSnackDefaultReferences')]==newjs[newjs.index(marker):newjs.index('export function attachSpinnerSnackDefaultReferences')]
oldpy=(root/(pre+'helper-before-postcallback-physical-python-v1.py')).read_text();newpy=(root/'scripts/sass_spinner_snack_gate_integration.py').read_text()
def pyfn(text,name):
 return ast.dump(next(n for n in ast.parse(text).body if isinstance(n,ast.FunctionDef) and n.name==name),include_attributes=False)
pynames=['_plain','_measurement','_sources','_current','_original','_identity','_aggregate']
for name in pynames:assert pyfn(oldpy,name)==pyfn(newpy,name)
packet=json.loads((root/(pre+'source-successors-v1-final.json')).read_bytes());tools=[]
for line in packet['lines']:
 base=root if line['line']=='21.x' else main
 for row in line['tool_transitions']:
  b=(base/row['path']).read_bytes();assert hashlib.sha256(b).hexdigest()==row['after']['sha256'];assert len(b)==row['after']['bytes']
  tools.append(dict(line=line['line'],path=row['path'],sha256=hashlib.sha256(b).hexdigest(),bytes=len(b)))
diff=''
for path,before in [('scripts/sass-spinner-snack-gate-integration.mjs',pre+'helper-before-postcallback-physical-js-v1.mjs'),('scripts/sass_spinner_snack_gate_integration.py',pre+'helper-before-postcallback-physical-python-v1.py'),('scripts/sass-spinner-snack-c04-source.mjs',pre+'c04-before-postcallback-physical-v1.mjs')]:
 diff+=''.join(difflib.unified_diff((root/before).read_text().splitlines(True),(root/path).read_text().splitlines(True),fromfile='a/'+path,tofile='b/'+path))
(root/(pre+'physical-closure-v1.diff')).write_text(diff)
paths=[pre+x for x in ['physical-closure-js-21-v1.json','physical-closure-js-main-v1.json','physical-closure-python-21-v1.json','physical-closure-python-main-v1.json','c04-physical-21-v2.json','c04-physical-main-v2.json']]
reports=[json.loads((root/p).read_bytes()) for p in paths]
for report in reports:
 for result in report['results']:assert result.get('rejected',result.get('pass',result.get('pass_',False)))
out=dict(schema_version=1,role='Author supplemental supplied-callback closure verification; independent closing review remains open',support_cut=ref(pre+'physical-closure-support-cut-v3.json'),diff=ref(pre+'physical-closure-v1.diff'),control_receipts=[ref(p) for p in paths],control_counts=[dict(line=r['line'],role=r['role'],checks=len(r['results'])) for r in reports],unchanged_model_checks=dict(js_current_original_identity_direct_measurement_functions=names,js_entire_genuine_default_reference_routine_byte_identical=True,python_pure_functions_ast_identical=pynames),six_gate_tool_afterimages_verified=tools,prior_matrix_and_compile_scope='Existing matrices and original16 source-view observations remain historical against exact prior helper images; this narrow tightening diff plus byte/AST-equal pure model/reference checks supplies only supplemental current scope. No broad matrix/compiler repeat.',first_image_authentication='Trusted physical bytes pass through unchanged frozen expected-pin guards. First-unbound helper pollution controls reject against loaded immutable helper images. Retained physical bytes do not become candidate-derived expected pins.',c04_performance_boundary='Private two-product plus registered-tool path set. Non-owned refs only return unchanged captured metadata with no source qualification/callback; owned unknown hashes reject. Public source accepting routes retain final full physical union sweep.',limitations=['Supplied synchronous callback closure, not concurrent filesystem atomicity.','No actual packed assertion, installed referenceObserver transport, full Sass gate, runtime/native floor, full owner or audit acceptance.','Independent closing review is uncompleted; no independent final clearance claimed.'],new_compiles=0)
(root/(pre+'physical-closure-verification-v1.json')).write_text(json.dumps(out,indent=2)+'\n')
cut=json.loads((root/(pre+'helper-cut-v2.json')).read_bytes())
cut.update(role='Superseding helper physical closure cut; old matrices remain historical',helpers=[ref('scripts/sass-spinner-snack-gate-integration.mjs'),ref('scripts/sass_spinner_snack_gate_integration.py')],supersedes=ref(pre+'helper-cut-v2.json'),physical_closure_verification=ref(pre+'physical-closure-verification-v1.json'),independent_final_clearance=False)
cut['all_known_reproduced_descriptor_defects_resolved']='Prior descriptor controls are historical; current supplemental closure controls are recorded separately.'
(root/(pre+'helper-cut-v3.json')).write_text(json.dumps(cut,indent=2)+'\n')
for p in (root/'compatibility/rc').glob('parallel-spinner-snack-gate-integration-*'):
 if p.is_file():shutil.copyfile(p,main/p.relative_to(root))
print(json.dumps(dict(verification=ref(pre+'physical-closure-verification-v1.json'),helper_cut=ref(pre+'helper-cut-v3.json'))))
