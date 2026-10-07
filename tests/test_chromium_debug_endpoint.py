"""Ephemeral debug endpoints must belong to the Chromium child we launched."""
import subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ChromiumDebugEndpoint(unittest.TestCase):
    def test_child_identity_and_other_process_negatives(self):
        code=r"""
import assert from 'node:assert/strict';
import {announcedChromeEndpoint,debuggerMatchesChild} from './scripts/chromium-debug-endpoint.mjs';
const log='noise\nDevTools listening on ws://127.0.0.1:43125/devtools/browser/abc-123\n';
const endpoint=announcedChromeEndpoint(log);
assert.deepEqual(endpoint,{port:43125,path:'/devtools/browser/abc-123'});
assert.equal(debuggerMatchesChild({webSocketDebuggerUrl:'ws://localhost:43125/devtools/browser/abc-123'},endpoint),true);
for(const value of ['ws://127.0.0.1:43125/devtools/browser/other','ws://127.0.0.1:43126/devtools/browser/abc-123','ws://example.com:43125/devtools/browser/abc-123','http://127.0.0.1:43125/devtools/browser/abc-123','malformed'])
 assert.equal(debuggerMatchesChild({webSocketDebuggerUrl:value},endpoint),false);
assert.equal(debuggerMatchesChild({},endpoint),false);
assert.equal(debuggerMatchesChild({webSocketDebuggerUrl:'ws://localhost:43125/devtools/browser/abc-123'},null),false);
assert.equal(announcedChromeEndpoint(log,9341),null);
assert.deepEqual(announcedChromeEndpoint(log,43125),endpoint);
for(const text of ['', 'DevTools listening on ws://example.com:43125/devtools/browser/abc-123', 'DevTools listening on ws://127.0.0.1:0/devtools/browser/abc-123', 'DevTools listening on ws://127.0.0.1:43125/devtools/page/abc-123'])
 assert.equal(announcedChromeEndpoint(text),null);
const ipv6=announcedChromeEndpoint('DevTools listening on ws://[::1]:43125/devtools/browser/abc-123');
assert.deepEqual(ipv6,endpoint);
assert.equal(debuggerMatchesChild({webSocketDebuggerUrl:'ws://[::1]:43125/devtools/browser/abc-123'},endpoint),true);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_firefox_listener_comes_from_the_child_and_matches_requested_port(self):
        code=r"""
import assert from 'node:assert/strict';
import {announcedFirefoxEndpoint} from './scripts/chromium-debug-endpoint.mjs';
const text='noise\nWebDriver BiDi listening on ws://127.0.0.1:43125\n';
assert.deepEqual(announcedFirefoxEndpoint(text),{port:43125,url:'ws://127.0.0.1:43125/session'});
assert.deepEqual(announcedFirefoxEndpoint(text,43125),{port:43125,url:'ws://127.0.0.1:43125/session'});
assert.equal(announcedFirefoxEndpoint(text,43126),null);
for(const address of ['ws://example.com:43125','ws://127.0.0.1:0','ws://127.0.0.1:43125/foreign','ws://user:pass@127.0.0.1:43125','ws://127.0.0.1:43125/?foreign','ws://127.0.0.1:43125/#foreign','http://127.0.0.1:43125'])
 assert.equal(announcedFirefoxEndpoint('WebDriver BiDi listening on '+address),null);
assert.equal(announcedFirefoxEndpoint(''),null);
assert.equal(announcedFirefoxEndpoint('unrelated ws://127.0.0.1:43125'),null);
assert.deepEqual(announcedFirefoxEndpoint('WebDriver BiDi listening on ws://[::1]:43125'),{port:43125,url:'ws://[::1]:43125/session'});
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
