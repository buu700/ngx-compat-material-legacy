# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run browser tests in an owned group monitored for loss of the test owner."""
import os
import select
import signal
import subprocess
import sys
import time


def _supervise(expected_parent, owner_pipe, command):
    assert expected_parent > 1 and command
    assert os.getpgrp() == os.getpid() == os.getsid(0), 'supervisor must own its session'
    if os.getppid() != expected_parent:
        return 1

    def parent_lost():
        # The supervisor stays alive through TERM so it can escalate only its
        # own group, including a command or descendant that ignores TERM.
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        os.killpg(os.getpgrp(), signal.SIGTERM)
        time.sleep(0.2)
        os.killpg(os.getpgrp(), signal.SIGKILL)

    # Start the one group watcher before the command can exist. A handshake
    # ensures it has installed its signal handling and liveness checks.
    ready_read, ready_write = os.pipe()
    supervisor_pid = os.getpid()
    watcher = os.fork()
    if watcher == 0:
        os.close(ready_read);os.close(0);os.close(1);os.close(2)
        try:
            signal.signal(signal.SIGTERM, signal.SIG_IGN)
            os.write(ready_write, b'1');os.close(ready_write)
            while os.getppid() == supervisor_pid:
                readable, _, _ = select.select([owner_pipe], [], [], 0.05)
                if readable and not os.read(owner_pipe, 1):
                    break
            parent_lost()
        finally:
            os._exit(1)
    os.close(ready_write)
    try:
        assert os.read(ready_read, 1) == b'1', 'group watcher failed to start'
    finally:
        os.close(ready_read)
    if os.getppid() != expected_parent:
        parent_lost()
    child = subprocess.Popen(command)
    while True:
        if os.getppid() != expected_parent:
            parent_lost()
        code = child.poll()
        if code is not None:
            if os.getppid() != expected_parent:
                parent_lost()
            # Watcher observes this supervisor's exit and cleans any remaining
            # group descendants without changing this command's return status.
            if code < 0:
                if -code not in (signal.SIGKILL, signal.SIGSTOP):
                    signal.signal(-code, signal.SIG_DFL)
                os.kill(os.getpid(), -code)
            return code
        time.sleep(0.05)



def run_owned(command, *, cwd, timeout):
    owner_read, owner_write = os.pipe()
    try:
        supervisor = [sys.executable, '-B', os.path.abspath(__file__),
                      '--supervise', str(os.getpid()), str(owner_read), '--', *command]
        child = subprocess.Popen(supervisor, cwd=cwd, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, text=True, start_new_session=True,
                                 pass_fds=(owner_read,))
    except BaseException:
        os.close(owner_write)
        raise
    finally:
        os.close(owner_read)
    try:
        stdout, stderr = child.communicate(timeout=timeout)
        return subprocess.CompletedProcess(command, child.returncode, stdout, stderr)
    finally:
        # Only the group created for this invocation is signalled, including
        # descendants that outlive the supervisor's command.
        for sig in (signal.SIGTERM, signal.SIGKILL):
            try:
                os.killpg(child.pid, sig)
            except ProcessLookupError:
                pass
        if child.poll() is None:
            child.communicate()
        os.close(owner_write)


if __name__ == '__main__':
    assert len(sys.argv) >= 6 and sys.argv[1] == '--supervise' and sys.argv[4] == '--'
    raise SystemExit(_supervise(int(sys.argv[2]), int(sys.argv[3]), sys.argv[5:]))
