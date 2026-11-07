#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT license; see LICENSE.
"""Run nine fixed typeahead cases against an independently rehashed draft --run."""
import argparse,hashlib,json,os,pathlib,shutil,subprocess,sys,tarfile,tempfile
P=pathlib.Path; ROOT=P(__file__).resolve().parent.parent
H=lambda b:hashlib.sha256(b).hexdigest()
def fh(p): return H(P(p).read_bytes())
def require(x,message):
 if not x: raise ValueError(message)
def snapshot(p): return {str(x.relative_to(p)):fh(x) for x in sorted(p.rglob('*')) if x.is_file() and not x.is_symlink() and 'out' not in x.relative_to(p).parts}
def run():
 ap=argparse.ArgumentParser();ap.add_argument('--run',required=True);args=ap.parse_args();rp=P(args.run).resolve();rd=rp.parent; manifest=json.loads(rp.read_text())
 require(manifest.get('schema_version')==1 and manifest.get('template') is False and manifest.get('stage')=='draft' and manifest.get('purpose')=='candidate','invalid draft')
 require(manifest.get('source',{}).get('line')=='main' and isinstance(manifest.get('run_id'),str) and manifest['run_id'],'wrong run line or identity')
 arts=[x for x in manifest.get('artifacts',[]) if x.get('id')=='library'];require(len(arts)==1,'expected one library');lib=arts[0];rel=P(lib['path']);require(not rel.is_absolute() and '..' not in rel.parts,'bad artifact path');tar=(rd/rel).resolve();require(tar.is_relative_to(rd) and tar.is_file() and fh(tar)==lib['sha256'] and tar.stat().st_size==lib['bytes'],'artifact bytes mismatch')
 envnames=['RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'];present=[n for n in envnames if os.environ.get(n)];require(len(present)==len(envnames),'coordinator environment required')
 if present:
  inv=os.environ['RC_INVOCATION_ID'];binding=json.loads(os.environ['RC_EVIDENCE_BINDING']);out=P(os.environ['RC_ASSERTION_OUTPUT_DIR']).resolve()
  require(os.environ['RC_CHECK_ID']=='typeahead-execution' and os.environ['RC_RUN_ID']==manifest['run_id'] and binding.get('run_id')==manifest['run_id'] and binding.get('source_line')=='main' and binding.get('source_commit')==manifest['source'].get('commit') and binding.get('source_tree')==manifest['source'].get('git_tree_sha'),'invalid coordinator binding')
  require(inv and all(c.isascii() and (c.isalnum() or c in '_-') for c in inv) and out==rd/'evidence'/'typeahead-execution'/inv and out.is_dir() and not out.is_symlink(),'invalid output')
  git=lambda *argv:subprocess.check_output(['git','-c','gc.auto=0','-c','maintenance.auto=0',*argv],cwd=ROOT,text=True).strip()
  source=manifest['source']; inputs=manifest.get('execution_inputs',{})
  require(source.get('clean') is True and inputs.get('clean') is True and inputs.get('line')=='main' and inputs.get('commit')==source.get('commit') and inputs.get('tree')==source.get('git_tree_sha') and binding.get('source_clean') is True and binding.get('input_clean') is True and binding.get('inputs_sha256')==inputs.get('inputs_sha256') and binding.get('source_content_sha256')==source.get('content_sha256') and git('rev-parse','HEAD')==source.get('commit') and git('rev-parse','HEAD^{tree}')==source.get('git_tree_sha') and git('status','--porcelain','--untracked-files=all','--','.',':(exclude)compatibility/rc/reports')=='','source checkout or execution inputs mismatch')
 peer=(ROOT/'node_modules/@angular/cdk').resolve();peers={'fesm2022/_list-key-manager-chunk.mjs':'63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057','fesm2022/_typeahead-chunk.mjs':'c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622'}
 require(json.loads((peer/'package.json').read_text())['version']=='22.1.7' and all(fh(peer/p)==h for p,h in peers.items()),'wrong minimum CDK peer')
 node=shutil.which('node'); require(node is not None and subprocess.check_output([node,'--version'],text=True).strip()=='v24.21.0','wrong Node')
 chrome=os.environ.get('CHROME_BIN');require(chrome and P(chrome).is_file(),'CHROME_BIN required')
 fixtures=ROOT/'compatibility/rc/typeahead-fixture';runner=ROOT/'compatibility/rc/typeahead-runner';base_runner=ROOT/'testing/legacy-runner';project=ROOT/'projects/ngx-material-legacy';initial={'fixture':snapshot(fixtures),'runner':snapshot(runner),'base_runner':snapshot(base_runner),'project':snapshot(project),'peer':{p:fh(peer/p) for p in peers},'peer_manifest':fh(peer/'package.json'),'producer':fh(__file__),'manifest':subprocess.check_output([node,str(ROOT/'scripts/typeahead-run-projection.mjs')],input=rp.read_text(),text=True).strip(),'artifact':fh(tar)}
 (out/'inputs-before.json').write_text(json.dumps(initial,indent=2,sort_keys=True)+'\n')
 with tempfile.TemporaryDirectory(prefix='typeahead-') as td:
  stage=P(td);shutil.copytree(project,stage/'projects/ngx-material-legacy',symlinks=True);shutil.copytree(base_runner,stage/'testing/legacy-runner',symlinks=True,ignore=shutil.ignore_patterns('out'));
  for override in runner.iterdir(): shutil.copy2(override,stage/'testing/legacy-runner'/override.name)
  os.symlink((ROOT/'node_modules').resolve(),stage/'node_modules')
  for f in fixtures.rglob('*.spec.ts'):
   target=stage/'projects/ngx-material-legacy'/f.relative_to(fixtures);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target)
  ex=stage/'artifact';ex.mkdir()
  with tarfile.open(tar,'r:gz') as t:
   members=t.getmembers();require(all(not P(m.name).is_absolute() and '..' not in P(m.name).parts and (m.isfile() or m.isdir()) for m in members),'unsafe tar');t.extractall(ex,filter='data')
   expected={m.name:H(t.extractfile(m).read()) for m in members if m.isfile()}
  require(expected and len(expected)==sum(m.isfile() for m in members) and all(fh(ex/name)==h for name,h in expected.items()),'duplicate or mismatched artifact member')
  stage_project=snapshot(stage/'projects/ngx-material-legacy');stage_runner=snapshot(stage/'testing/legacy-runner')
  phrases=['jump focus down to an item by typing','not select items while using the typeahead','route typeahead focus through the public menu keydown','update menu typeahead targets after dynamic items change','select options by typing on a closed select','skip a disabled option after the closed select options change','not open the select when pressing space while typing','customize the typeahead debounce interval','cancel the typeahead selection on blur']
  env=os.environ.copy()
  for key in list(env):
   if key.startswith('LEGACY_'): del env[key]
  env.update({'LEGACY_SUBJECT_MODE':'artifact','LEGACY_PACKAGE_ROOT':str(ex/'package'),'LEGACY_ARTIFACT_SHA256':lib['sha256'],'LEGACY_RUN_ID':manifest['run_id'],'LEGACY_RESULTS_PATH':str(out/'raw-report.json'),'LEGACY_TYPEAHEAD_GREP':'/('+'|'.join(phrases)+')/'})
  log=[]
  def child(cmd):
   p=subprocess.run(cmd,cwd=stage,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);log.append({'command':cmd,'exit_code':p.returncode,'output':p.stdout});(out/'commands.json').write_text(json.dumps(log,indent=2)+'\n');require(p.returncode==0,'child failed: '+str(cmd))
  # Discover esbuild's complete input graph, then measure the actual build.
  child([node,'testing/legacy-runner/build.mjs'])
  metapath=stage/'testing/legacy-runner/out/metafile.json'; meta=json.loads(metapath.read_text());keys=list(meta['inputs']);require(len(keys)>0 and all(any(k.endswith('@angular/cdk/'+p) for k in keys) for p in peers) and any(k.startswith('artifact/package/fesm2022/') for k in keys),'bundle missing peer or artifact')
  modules=(ROOT/'node_modules').resolve(); rows=[]; physical={}
  for key in keys:
   path=(stage/key).resolve();require(path.is_file(),'missing bundle input '+key)
   if path.is_relative_to(ex): origin='artifact'; rel=str(path.relative_to(ex))
   elif path.is_relative_to(modules): origin='dependency';rel=str(path.relative_to(modules))
   elif path==stage/'testing/legacy-runner/out/entry.generated.ts': origin='generated';rel='entry.generated.ts';shutil.copy2(path,out/rel)
   elif path.is_relative_to(stage/'projects/ngx-material-legacy'):
    rel=str(path.relative_to(stage/'projects/ngx-material-legacy')); source=fixtures/rel
    if source.is_file(): origin='fixture';rel=str(source.relative_to(ROOT))
    else: origin='source';rel='projects/ngx-material-legacy/'+rel
   elif path.is_relative_to(stage/'testing/legacy-runner'):
    rel=str(path.relative_to(stage/'testing/legacy-runner')); source=runner/rel
    if source.is_file(): origin='source';rel=str(source.relative_to(ROOT))
    else: origin='source';rel='testing/legacy-runner/'+rel
   else: raise ValueError('unmapped bundle input '+key)
   if origin in ('source','fixture'): require(fh(ROOT/rel)==fh(path),'staged input differs from source')
   physical[key]=path;rows.append({'key':key,'origin':origin,'path':rel,'sha256':fh(path),'bytes':path.stat().st_size})
  def check_graph():
   require(all(path.is_file() and fh(path)==row['sha256'] and path.stat().st_size==row['bytes'] for row in rows for path in [physical[row['key']]]),'bundle input drift')
  check_graph();(out/'bundle-inputs.json').write_text(json.dumps({'schema_version':1,'inputs':rows},indent=2)+'\n')
  child([node,'testing/legacy-runner/build.mjs']);require(list(json.loads(metapath.read_text())['inputs'])==keys,'bundle input graph changed');check_graph()
  bundle=stage/'testing/legacy-runner/out/legacy-tests.iife.js';bundle_hash=fh(bundle);shutil.copy2(bundle,out/'bundle.js');shutil.copy2(metapath,out/'metafile.json')
  child([node,'node_modules/karma/bin/karma','start','testing/legacy-runner/karma.conf.cjs'])
  check_graph();require(fh(bundle)==bundle_hash and snapshot(stage/'projects/ngx-material-legacy')==stage_project and snapshot(stage/'testing/legacy-runner')==stage_runner,'staged inputs changed')
  require(all(fh(ex/name)==h for name,h in expected.items()),'extracted artifact changed')
 require(snapshot(fixtures)==initial['fixture'] and snapshot(runner)==initial['runner'] and snapshot(base_runner)==initial['base_runner'] and snapshot(project)==initial['project'] and all(fh(peer/p)==h for p,h in peers.items()) and fh(peer/'package.json')==initial['peer_manifest'] and fh(__file__)==initial['producer'] and subprocess.check_output([node,str(ROOT/'scripts/typeahead-run-projection.mjs')],input=rp.read_text(),text=True).strip()==initial['manifest'] and fh(tar)==initial['artifact'],'input changed')
 raw=json.loads((out/'raw-report.json').read_text()); selected=[x for x in raw['specs'] if not x['skipped']]
 cases=['MatSelectionList without forms > with list option > should be able to jump focus down to an item by typing','MatSelectionList without forms > with list option > should not select items while using the typeahead','MatMenu > should route typeahead focus through the public menu keydown and skip disabled matches','MatMenu > should update menu typeahead targets after dynamic items change','MatSelect > core > accessibility > for select > should be able to select options by typing on a closed select','MatSelect > core > accessibility > for select > should skip a disabled option after the closed select options change during typeahead','MatSelect > core > accessibility > for select > should not open the select when pressing space while typing','MatSelect > core > accessibility > for select > should be able to customize the typeahead debounce interval','MatSelect > core > accessibility > for select > should cancel the typeahead selection on blur']
 require(raw.get('subject_mode')=='artifact' and raw.get('mode')=='normal' and raw.get('run_id')==manifest['run_id'] and raw.get('artifact_sha256')==lib['sha256'] and raw.get('totals')=={'executed':496,'passed':9,'failed':0,'skipped':487} and len(raw['specs'])==496 and raw['failures']==[] and [x['full_name'] for x in selected]==cases and all(x['success'] is True and x['skipped'] is False for x in selected) and all(sum(row['full_name']==name for row in raw['specs'])==1 for name in cases),'wrong focused result')
 files={p:{'sha256':fh(out/p),'bytes':(out/p).stat().st_size} for p in ('raw-report.json','commands.json','inputs-before.json','metafile.json','bundle.js','bundle-inputs.json','entry.generated.ts')}
 obs={'schema_version':1,'kind':'typeahead-execution','sha':'ff36c80f9c7a14f0e9f36eafc3e1423d34e7c916','run_id':manifest['run_id'],'line':'main','invocation_id':inv,'binding':binding,'library':{'sha256':lib['sha256'],'bytes':lib['bytes']},'peer_version':'22.1.7','peer_members':peers,'extracted_files':len(expected),'inputs_unchanged':True,'files':files,'selected_cases':selected,'counts':raw['totals'],'claim':'focused cases only; no G11, coverage or seal'}
 (out/'observation.json').write_text(json.dumps(obs,indent=2)+'\n');print('typeahead evidence:',out)
if __name__=='__main__':
 try:run()
 except (ValueError,KeyError,OSError,subprocess.SubprocessError) as e:print('typeahead execution failed:',e,file=sys.stderr);sys.exit(1)
