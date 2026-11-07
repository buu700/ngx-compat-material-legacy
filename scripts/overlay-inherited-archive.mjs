/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {spawnSync} from 'node:child_process';
// -I removes cwd, PYTHON* variables, and user site from Python's import path.
// tarfile handles gzip in process; no PATH-selected gzip executable is used.
const extractCode="import tarfile,sys,json\nt=tarfile.open(sys.argv[1],'r:gz');m=t.getmembers(); names=[x.name for x in m]\nassert m and len(set(names))==len(names) and all((x.isfile() or x.isdir()) and x.name.startswith('package/') and all(part not in ('','.','..') for part in x.name.split('/')) for x in m)\nt.extractall(sys.argv[2],members=m,filter='data');print(json.dumps(names))";
const verifyCode="import tarfile,sys,pathlib,hashlib\na=tarfile.open(sys.argv[1],'r:gz');root=pathlib.Path(sys.argv[2]);ms=a.getmembers();assert all(m.isfile() or m.isdir() for m in ms)\nfor m in ms:\n if m.isfile():\n  f=root/m.name;assert f.is_file() and not f.is_symlink() and hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256(a.extractfile(m).read()).digest(),m.name";
export function extractArchive(python,archive,stage){const result=spawnSync(python,['-I','-c',extractCode,archive,stage],{encoding:'utf8'});if(result.status!==0)throw Error('unsafe or invalid archive: '+result.stderr);return JSON.parse(result.stdout)}
export function verifyArchive(python,archive,stage){const result=spawnSync(python,['-I','-c',verifyCode,archive,stage],{encoding:'utf8'});if(result.status!==0)throw Error('extracted files differ '+result.stderr)}
