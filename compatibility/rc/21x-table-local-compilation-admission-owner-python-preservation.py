# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Preserve old Python assertions under two exact metadata counter adapters."""
from pathlib import Path
import ast,collections,copy,hashlib,json,subprocess
r=Path.cwd();prefix='compatibility/rc/21x-table-local-compilation-admission-';packet=json.loads((r/(prefix+'owner-inputs.json')).read_bytes());rows=[]
class Normalize(ast.NodeTransformer):
 def visit_BinOp(self,node):
  node=self.generic_visit(node)
  allowed=["report['source_admissions'] - report['table_local_compilation_source_admissions']","report['actual_epoch_late_controls_rejected'] - report['table_epoch_late_controls_rejected']"]
  return node.left if ast.unparse(node)in allowed else node

def calls(tree):return collections.Counter(ast.dump(n,include_attributes=False)for n in ast.walk(tree)if isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and isinstance(n.func.value,ast.Name)and n.func.value.id=='self'and n.func.attr.startswith('assert'))
for row in packet['code_transitions']:
 if not row['after']['path'].endswith('.py'):continue
 path=row['after']['path'];raw=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+path],cwd=r);assert hashlib.sha256(raw).hexdigest()==row['before']['sha256'];after=(r/path).read_bytes();assert hashlib.sha256(after).hexdigest()==row['after']['sha256']
 before=ast.parse(raw);current=ast.parse(after);a=calls(before);b=calls(Normalize().visit(copy.deepcopy(current)))
 missing=a-b;assert not missing,(path,missing)
 names=lambda t:[n.name for n in ast.walk(t)if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))]
 assert names(before)==names(current)
 rows.append({'path':path,'old_assertions_preserved':sum(a.values()),'current_assertions':sum(b.values()),'original_function_names_preserved':names(before)})
report={'schema_version':1,'line':'21.x','result':'pass','source_preservation':rows,'original_Python_assertions_preserved':sum(x['old_assertions_preserved']for x in rows),'finite_counter_adaptations':2,'old_program_executed':False,'canonical_ledger_changed':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
p=r/(prefix+'owner-python-preservation.json');assert not p.exists();p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
