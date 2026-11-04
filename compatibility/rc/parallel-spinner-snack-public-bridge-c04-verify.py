# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Bounded serial source checks, never the owner/build/browser/full Sass matrix."""
import hashlib,json,os,subprocess,time
from pathlib import Path
PYTHON='/nix/store/3inr3nxzqarhb9rh1z7s2s20j8c0395h-python3-3.14.7/bin/python3'
NODE='/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX='compatibility/rc/parallel-spinner-snack-public-bridge-c04-'
CASES=[('21.x',ROOT,'test_sass_inspection_scope',{}),('main',MAIN,'test_sass_inspection_scope',{}),
 ('21.x',ROOT,'test_theming_inspection_source_review',{'THEMING_INSPECTION_SOURCE_REPORT':PREFIX+'theming-controls-v2.json'}),
 ('21.x',ROOT,'test_inspection_compatibility_source_review',{'INSPECTION_COMPATIBILITY_SOURCE_REPORT':PREFIX+'inspection-controls-v2.json'}),
 ('21.x',ROOT,'test_control_m3_theme_source_review',{'CONTROL_M3_THEME_SOURCE_REPORT':PREFIX+'control-controls-v1.json','CONTROL_M3_THEME_REVIEW_REPORT':PREFIX+'control-source-21-v2.json'}),
 ('21.x',ROOT,'test_modern_control_base_source',{'MODERN_CONTROL_REVIEW_REPORT':PREFIX+'modern-controls-v1.json'}),
 ('21.x',ROOT,'test_unthemable_token_source',{}),('21.x',ROOT,'test_historical_contract_repair_source',{})]
rows=[]
for line,root,module,extra in CASES:
 env=dict(os.environ,PATH=str(Path(NODE).parent)+os.pathsep+os.environ['PATH'],PYTHONPATH='tests',**extra)
 command=[PYTHON,'-m','unittest',module];start=time.monotonic();child=subprocess.run(command,cwd=root,env=env,text=True,capture_output=True,timeout=240)
 row={'line':line,'module':module,'command':command,'cwd':str(root),'exit_code':child.returncode,'elapsed_seconds':round(time.monotonic()-start,3),'stdout':child.stdout,'stderr':child.stderr,'report_arguments':extra}
 rows.append(row);print(line,module,child.returncode,row['elapsed_seconds'],flush=True)
 if child.returncode:print(child.stdout+child.stderr,flush=True)
out={'schema_version':1,'result':'pass' if len(rows)==len(CASES) and all(r['exit_code']==0 for r in rows) else 'fail','node':NODE,'python':PYTHON,'serial':True,'nice':19,'checks':rows,'full_owner_build_browser_matrix_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
(ROOT/(PREFIX+'focused-verification-v3.json')).write_text(json.dumps(out,indent=2)+'\n')
raise SystemExit(out['result']!='pass')
