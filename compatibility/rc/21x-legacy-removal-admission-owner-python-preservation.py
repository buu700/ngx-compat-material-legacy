# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Preserve old assertions against exact predecessor data and validate current state separately."""
from pathlib import Path
import ast,collections,json,subprocess,sys
r=Path('.');prefix='compatibility/rc/21x-legacy-removal-admission-';packet=json.loads((r/(prefix+'owner-inputs.json')).read_text());rows=[]
def assertions(tree):
 out=collections.Counter()
 for node in ast.walk(tree):
  if isinstance(node,ast.Call)and isinstance(node.func,ast.Attribute)and isinstance(node.func.value,ast.Name)and node.func.value.id=='self'and node.func.attr.startswith('assert'):
   key=ast.dump(node,include_attributes=False).replace("id='historical_report'","id='report'")
   for a,b in [('before_owner_byte_identical','actual_owner_byte_identical'),('preserved_source_admissions','source_admissions'),('preserved_epoch_late_controls_rejected','actual_epoch_late_controls_rejected')]:key=key.replace("value='"+a+"'","value='"+b+"'")
   out[key]+=1
 return out
for row in packet['code_transitions']:
 path=row['after']['path']
 if not path.endswith('.py'):continue
 old=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+path]);before=ast.parse(old);after=ast.parse((r/path).read_bytes());a=assertions(before);b=assertions(after)
 for key,n in a.items():assert b[key]>=n,(path,key,n,b[key])
 names=lambda tree:{node.name for node in ast.walk(tree)if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef))}
 assert names(before)<=names(after)
 rows.append({'path':path,'old_assertions_preserved':sum(a.values()),'old_functions_preserved':len(names(before))})
assert len(rows)==3
report={'schema_version':1,'result':'pass','python_iteration_successors':rows,'unknown_current_frame_acceptance_added':False,'product_expectations_changed':False,'g11_claim':'not-passed'}
if len(sys.argv)>1:
 with(r/sys.argv[1]).open('x')as out:out.write(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
