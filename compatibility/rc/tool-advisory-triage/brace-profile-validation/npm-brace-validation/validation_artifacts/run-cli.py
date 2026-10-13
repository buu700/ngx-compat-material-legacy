import json,os,subprocess,time,resource,shutil
from pathlib import Path
work=Path(__file__).resolve().parent
subjects=json.loads((work/'subjects.json').read_text())
cases={
 'control':'ignored/{a,b}/**',
 'triage-011':'{'+'{a},'*16000+'b}',
 'triage-014':'{'*4000+'a,b'+'}'*4000,
}
def no_core():
 resource.setrlimit(resource.RLIMIT_CORE,(0,0))
def private_env(cache):
 env={k:v for k,v in os.environ.items() if not (k.lower().startswith('npm_') or k.lower() in {'node_auth_token','npm_token','npm_auth_token'})}
 cache.parent.mkdir(mode=0o700)
 user=cache.parent/'user.npmrc';glob=cache.parent/'global.npmrc';user.write_text('');glob.write_text('')
 user.chmod(0o600);glob.chmod(0o600);cache.mkdir(mode=0o700)
 env.update({'npm_config_cache':str(cache),'npm_config_userconfig':str(user),'npm_config_globalconfig':str(glob),
 'npm_config_registry':'https://registry.npmjs.org/','npm_config_global':'false','npm_config_workspaces':'false',
 'npm_config_ignore_scripts':'true','npm_config_prefer_online':'true','npm_config_prefer_offline':'false',
 'npm_config_offline':'false','npm_config_update_notifier':'false'})
 return env
results=[]
for case,pattern in cases.items():
 for variant in ['original','fixed']:
  root=work/('cli-'+variant+'-'+case);shutil.rmtree(root,ignore_errors=True);root.mkdir(mode=0o700)
  dep=root/'dep';dep.mkdir()
  (root/'package.json').write_text(json.dumps({'name':'npm-brace-cli-validation','private':True,'version':'1.0.0','dependencies':{'lower-trust':'file:./dep'}},indent=2)+'\n')
  (dep/'package.json').write_text(json.dumps({'name':'lower-trust','version':'1.0.0'},indent=2)+'\n')
  (dep/'.npmignore').write_text(pattern+'\n');(dep/'index.js').write_text('module.exports = true\n')
  npm=work/('npm-'+variant)/'bin/npm-cli.js'
  command=['node','--max-old-space-size=64',str(npm),'install','--ignore-scripts','--no-audit','--no-fund','--package-lock']
  start=time.monotonic()
  try:
   p=subprocess.run(command,cwd=root,env=private_env(root/'profile/cache'),capture_output=True,text=True,timeout=2,preexec_fn=no_core)
   row={'case':case,'variant':variant,'command':command,'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr,'elapsed_seconds':time.monotonic()-start,'timed_out':False}
  except subprocess.TimeoutExpired as e:
   as_text=lambda value:value.decode(errors='replace') if isinstance(value,bytes) else value or ''
   row={'case':case,'variant':variant,'command':command,'returncode':None,'stdout':as_text(e.stdout),'stderr':as_text(e.stderr),'elapsed_seconds':time.monotonic()-start,'timed_out':True}
  row.update({'input_bytes':len(pattern.encode()),'installed':(root/'node_modules/lower-trust').exists(),'lockfile':(root/'package-lock.json').exists(),
   'fatal_oom':'heap out of memory' in row['stderr'],'stack_overflow':'Maximum call stack size exceeded' in (row['stdout']+row['stderr'])})
  results.append(row);(work/'cli-results.json').write_text(json.dumps({'schema_version':1,'results':results},indent=2)+'\n')
  print(json.dumps({k:row[k] for k in ['case','variant','returncode','timed_out','elapsed_seconds','input_bytes','installed','lockfile','fatal_oom','stack_overflow']}),flush=True)
