import json,subprocess,time,resource,os
from pathlib import Path
work=Path(__file__).resolve().parent
results=[]
def no_core():
 resource.setrlimit(resource.RLIMIT_CORE,(0,0))
for case in ['control','triage-011','triage-012','triage-013','triage-014','triage-015']:
 for variant in ['original','fixed']:
  command=['node','--max-old-space-size=64',str(work/'worker.cjs'),str(work/('npm-'+variant)),case]
  start=time.monotonic()
  try:
   p=subprocess.run(command,cwd=work,capture_output=True,text=True,timeout=2,preexec_fn=no_core)
   row={'case':case,'variant':variant,'command':command,'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr,'elapsed_seconds':time.monotonic()-start,'timed_out':False}
  except subprocess.TimeoutExpired as e:
   text=lambda value:value.decode(errors='replace') if isinstance(value,bytes) else value or ''
   row={'case':case,'variant':variant,'command':command,'returncode':None,'stdout':text(e.stdout),'stderr':text(e.stderr),'elapsed_seconds':time.monotonic()-start,'timed_out':True}
  try:row['observation']=json.loads(row['stdout'].strip().splitlines()[-1])
  except (json.JSONDecodeError,IndexError):row['observation']=None
  results.append(row)
  (work/'mechanism-results.json').write_text(json.dumps({'schema_version':1,'child_heap_megabytes':64,'timeout_seconds':2,'results':results},indent=2)+'\n')
  print(json.dumps({'case':case,'variant':variant,'returncode':row['returncode'],'timed_out':row['timed_out'],'elapsed_seconds':round(row['elapsed_seconds'],3),'observation':row['observation'],'fatal_oom':'heap out of memory' in row['stderr']}),flush=True)
