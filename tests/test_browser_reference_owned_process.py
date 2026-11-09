# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real timeout cleanup controls for browser test-owned process groups."""
import os
import json
import signal
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from browser_reference_owned_process import run_owned


class BrowserReferenceOwnedProcessTests(unittest.TestCase):
    def test_normal_output_and_exit(self):
        result = run_owned([sys.executable, '-c', "print('ok')"], cwd=Path.cwd(), timeout=2)
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, 'ok\n', ''))
        failed = run_owned([sys.executable, '-c', 'raise SystemExit(7)'], cwd=Path.cwd(), timeout=2)
        self.assertEqual(failed.returncode, 7)
        killed = run_owned([sys.executable, '-c', 'import os,signal;os.kill(os.getpid(),signal.SIGKILL)'], cwd=Path.cwd(), timeout=2)
        self.assertEqual(killed.returncode, -signal.SIGKILL)

    def test_timeout_kills_owned_descendant(self):
        with tempfile.TemporaryDirectory() as temp:
            pidfile = Path(temp) / 'child.pid'
            descendant = "import os,signal,time,sys;signal.signal(signal.SIGTERM,signal.SIG_IGN);open(sys.argv[1],'w').write(str(os.getpid()));time.sleep(30)"
            parent = "import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[2]]);time.sleep(30)"
            with self.assertRaises(subprocess.TimeoutExpired):
                run_owned([sys.executable, '-c', parent, descendant, str(pidfile)], cwd=Path.cwd(), timeout=1)
            self.assertTrue(pidfile.exists())
            pid = int(pidfile.read_text())
            for _ in range(100):
                stat = Path(f'/proc/{pid}/stat')
                if not stat.exists() or stat.read_text().split(') ')[1].startswith('Z'):
                    break
                time.sleep(0.02)
            else:
                self.fail('owned descendant survived timeout cleanup')


    def test_supervisor_rejects_wrong_owner_before_start(self):
        with tempfile.TemporaryDirectory() as temp:
            marker = Path(temp) / 'not-created'
            helper = Path(__file__).with_name('browser_reference_owned_process.py')
            command = [sys.executable, '-B', str(helper), '--supervise', str(os.getpid()+1000000), '0', '--',
                       sys.executable, '-c', 'import pathlib,sys;pathlib.Path(sys.argv[1]).touch()', str(marker)]
            result = subprocess.run(command, capture_output=True, start_new_session=True, timeout=3)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(marker.exists())

    def test_hard_killed_owner_stops_command_and_descendant(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp); command_file = directory / 'command.json'; descendant_file = directory / 'descendant.pid'
            descendant = "import os,signal,time,sys;signal.signal(signal.SIGTERM,signal.SIG_IGN);open(sys.argv[1],'w').write(str(os.getpid()));time.sleep(30)"
            command = ("import os,signal,subprocess,sys,time,json;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
                       "subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[3]]);"
                       "open(sys.argv[2],'w').write(json.dumps({'pid':os.getpid(),'supervisor':os.getppid()}));time.sleep(30)")
            outer = ("import sys;sys.path.insert(0,sys.argv[1]);from browser_reference_owned_process import run_owned;"
                     "run_owned([sys.executable,'-c',sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]],cwd=sys.argv[6],timeout=20)")
            owner = subprocess.Popen([sys.executable, '-B', '-c', outer, str(Path(__file__).parent), command,
                                      descendant, str(command_file), str(descendant_file), temp],
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            group = None
            try:
                for _ in range(200):
                    if command_file.exists() and descendant_file.exists() and command_file.stat().st_size and descendant_file.stat().st_size:break
                    if owner.poll() is not None:self.fail('owner exited before fixture was ready')
                    time.sleep(0.01)
                else:self.fail('process fixture did not start')
                identities = json.loads(command_file.read_text());group = identities['supervisor']
                pids = [identities['pid'], int(descendant_file.read_text())]
                self.assertEqual(os.getpgid(pids[0]), group);self.assertEqual(os.getpgid(pids[1]), group)
                owner.kill();owner.wait(timeout=3)
                for pid in pids:
                    for _ in range(200):
                        stat = Path(f'/proc/{pid}/stat')
                        if not stat.exists() or stat.read_text().split(') ')[1].startswith('Z'):break
                        time.sleep(0.01)
                    else:self.fail(f'owned process {pid} survived hard owner loss')
            finally:
                if owner.poll() is None:owner.kill();owner.wait(timeout=3)
                if group is not None:
                    try:os.killpg(group, signal.SIGKILL)
                    except ProcessLookupError:pass
                owner.communicate(timeout=3)


    def test_owner_loss_after_command_exit_stops_lingering_descendant(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp); command_file=directory/'command.json'; descendant_file=directory/'descendant.pid'
            descendant="import os,signal,time,sys;signal.signal(signal.SIGTERM,signal.SIG_IGN);open(sys.argv[1],'w').write(str(os.getpid()));time.sleep(30)"
            command=("import os,subprocess,sys,time,json;subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[3]]);"
                     "open(sys.argv[2],'w').write(json.dumps({'pid':os.getpid(),'supervisor':os.getppid()}));time.sleep(.15)")
            outer=("import sys;sys.path.insert(0,sys.argv[1]);from browser_reference_owned_process import run_owned;"
                   "run_owned([sys.executable,'-c',sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]],cwd=sys.argv[6],timeout=20)")
            owner=subprocess.Popen([sys.executable,'-B','-c',outer,str(Path(__file__).parent),command,descendant,
                                    str(command_file),str(descendant_file),temp],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            group=None
            try:
                for _ in range(200):
                    if command_file.exists() and descendant_file.exists() and command_file.stat().st_size and descendant_file.stat().st_size:break
                    if owner.poll() is not None:self.fail('owner exited before fixture was ready')
                    time.sleep(.01)
                else:self.fail('process fixture did not start')
                identities=json.loads(command_file.read_text());group=identities['supervisor'];pid=int(descendant_file.read_text())
                for finished in (identities['pid'],group):
                    for _ in range(200):
                        stat=Path(f'/proc/{finished}/stat')
                        if not stat.exists() or stat.read_text().split(') ')[1].startswith('Z'):break
                        time.sleep(.01)
                    else:self.fail('command or supervisor did not exit')
                self.assertIsNone(owner.poll());self.assertEqual(os.getpgid(pid),group)
                owner.kill();owner.wait(timeout=3)
                for _ in range(200):
                    stat=Path(f'/proc/{pid}/stat')
                    if not stat.exists() or stat.read_text().split(') ')[1].startswith('Z'):break
                    time.sleep(.01)
                else:self.fail('descendant survived owner loss after command exit')
            finally:
                if owner.poll() is None:owner.kill();owner.wait(timeout=3)
                if group is not None:
                    try:os.killpg(group,signal.SIGKILL)
                    except ProcessLookupError:pass
                owner.communicate(timeout=3)


    def test_hard_supervisor_then_owner_loss_stops_group(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp);command_file=directory/'command.json';descendant_file=directory/'descendant.pid'
            descendant="import os,signal,time,sys;signal.signal(signal.SIGTERM,signal.SIG_IGN);open(sys.argv[1],'w').write(str(os.getpid()));time.sleep(30)"
            command=("import os,signal,subprocess,sys,time,json;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
                     "subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[3]]);"
                     "open(sys.argv[2],'w').write(json.dumps({'pid':os.getpid(),'supervisor':os.getppid()}));time.sleep(30)")
            outer=("import sys;sys.path.insert(0,sys.argv[1]);from browser_reference_owned_process import run_owned;"
                   "run_owned([sys.executable,'-c',sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]],cwd=sys.argv[6],timeout=20)")
            owner=subprocess.Popen([sys.executable,'-B','-c',outer,str(Path(__file__).parent),command,descendant,
                                    str(command_file),str(descendant_file),temp],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            group=None
            try:
                for _ in range(200):
                    if command_file.exists() and descendant_file.exists() and command_file.stat().st_size and descendant_file.stat().st_size:break
                    if owner.poll() is not None:self.fail('owner exited before fixture was ready')
                    time.sleep(.01)
                else:self.fail('process fixture did not start')
                identities=json.loads(command_file.read_text());group=identities['supervisor'];pids=[identities['pid'],int(descendant_file.read_text())]
                for pid in pids:self.assertEqual(os.getpgid(pid),group)
                os.kill(group,signal.SIGKILL)
                if owner.poll() is None:owner.kill()
                owner.wait(timeout=3)
                states=[]
                for pid in pids:
                    for _ in range(200):
                        stat=Path(f'/proc/{pid}/stat')
                        if not stat.exists():states.append('absent');break
                        if stat.read_text().split(') ')[1].startswith('Z'):states.append('zombie');break
                        time.sleep(.01)
                    else:self.fail(f'process {pid} survived supervisor and owner loss')
                print('V4_PROCESS_EVIDENCE '+json.dumps({'owner':owner.pid,'supervisor_group':group,'command':pids[0],'descendant':pids[1],'final_states':states}),flush=True)
            finally:
                if owner.poll() is None:owner.kill();owner.wait(timeout=3)
                if group is not None:
                    try:os.killpg(group,signal.SIGKILL)
                    except ProcessLookupError:pass
                owner.communicate(timeout=3)

    def test_supervisor_loss_stops_group_without_owner_signal(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp);command_file=directory/'command.json';descendant_file=directory/'descendant.pid'
            descendant="import os,signal,time,sys;signal.signal(signal.SIGTERM,signal.SIG_IGN);open(sys.argv[1],'w').write(str(os.getpid()));time.sleep(30)"
            command=("import os,signal,subprocess,sys,time,json;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
                     "subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[3]]);"
                     "open(sys.argv[2],'w').write(json.dumps({'pid':os.getpid(),'supervisor':os.getppid()}));time.sleep(30)")
            outer=("import sys;sys.path.insert(0,sys.argv[1]);from browser_reference_owned_process import run_owned;"
                   "run_owned([sys.executable,'-c',sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]],cwd=sys.argv[6],timeout=20)")
            owner=subprocess.Popen([sys.executable,'-B','-c',outer,str(Path(__file__).parent),command,descendant,
                                    str(command_file),str(descendant_file),temp],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            group=None
            try:
                for _ in range(200):
                    if command_file.exists() and descendant_file.exists() and command_file.stat().st_size and descendant_file.stat().st_size:break
                    if owner.poll() is not None:self.fail('owner exited before fixture was ready')
                    time.sleep(.01)
                else:self.fail('process fixture did not start')
                identities=json.loads(command_file.read_text());group=identities['supervisor'];pids=[identities['pid'],int(descendant_file.read_text())]
                for pid in pids:self.assertEqual(os.getpgid(pid),group)
                os.kill(group,signal.SIGKILL)
                states=[]
                for pid in pids:
                    for _ in range(200):
                        stat=Path(f'/proc/{pid}/stat')
                        if not stat.exists():states.append('absent');break
                        if stat.read_text().split(') ')[1].startswith('Z'):states.append('zombie');break
                        time.sleep(.01)
                    else:self.fail(f'process {pid} survived supervisor and owner loss')
                print('V4_SUPERVISOR_ONLY_EVIDENCE '+json.dumps({'owner':owner.pid,'supervisor_group':group,'command':pids[0],'descendant':pids[1],'final_states':states}),flush=True)
            finally:
                if owner.poll() is None:owner.kill();owner.wait(timeout=3)
                if group is not None:
                    try:os.killpg(group,signal.SIGKILL)
                    except ProcessLookupError:pass
                owner.communicate(timeout=3)


if __name__ == '__main__':
    unittest.main()
