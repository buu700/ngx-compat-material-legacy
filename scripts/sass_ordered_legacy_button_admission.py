# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite whole-CSS admission for historical legacy datepicker button themes."""
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORDERED_LEGACY_BUTTON_CONTRACT = 'historical-legacy-datepicker-with-public-ordinary-button-tokens'
ORDERED_LEGACY_BUTTON_CASES = {
    '07-with-configuration': ('a183901f771c82348fba49d9687776869bea17821e5c5bc078d2a56995a0d0c2', 'e3e3ac962a8a704ebecc9b37f2c123624b4e227b8760b2b95bef0b3a15a45320'),
    '05-custom-map-nested': ('e82b4ca28cb36a74fdd7d9c25c25288e4ca2587b06f86fe525e43a68daedc130', '3b84ac535804b859763e75e520472659fb85905ba95c190057c45a2532abc03f'),
    'owned-legacy-button': ('d68091356fca93c590be566ae50ce221d35cdf2327b16f590ee0658797acc311', 'bd06ccaa570a0ae1127369b645e63082737a6e6aa2ba68e0d565ac961077d222'),
}
_MODEL = ROOT / 'scripts/sass-ordered-legacy-button-contract.mjs'
_MODEL_SHA256 = '4b76a850f80ad0181480573895735e2152c1786a03fbe106aea4f7b31815c13c'
_SASS_VERSION = 'dart-sass\t1.104.1\t(Sass Compiler)\t[Dart]\ndart2js\t3.13.3\t(Dart Compiler)\t[Dart]'
_MATERIAL_MANIFEST_SHA256 = '5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'
_PEER_FILES = {
    'node_modules/@angular/material/package.json': _MATERIAL_MANIFEST_SHA256,
    'node_modules/@angular/material/_index.scss': 'e3ad831c2e7679767b0c76d51cf37c455e8d14bf60c5920e53d95bcb762eb08b',
    'node_modules/@angular/material/button/_button-theme.scss': '06b0c0f5684502cb39a18fae857982ea6d61924eca9069ac20ad63c2b8b32b61',
    'node_modules/@angular/material/fesm2022/button.mjs': '589e6b07ed1c0a18928e3ddcf151af6275cf0ab91260a9e0598fe5959741d364',
}


def _sha(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def _expected_css(case):
    if _sha(_MODEL.read_bytes()) != _MODEL_SHA256:
        return None
    code = "import {pathToFileURL} from 'node:url'; import {join} from 'node:path'; const m=await import(pathToFileURL(join(process.argv[1],'scripts/sass-ordered-legacy-button-contract.mjs'))); const css=m.orderedLegacyButtonExpectedCss(process.argv[2]); if(typeof css!=='string')process.exit(2); process.stdout.write(css);"
    run = subprocess.run(['node', '--input-type=module', '-e', code, str(ROOT), case], cwd=ROOT,
                         capture_output=True, timeout=15, check=False)
    if run.returncode != 0 or _sha(_MODEL.read_bytes()) != _MODEL_SHA256:
        return None
    return run.stdout.decode('utf-8')


def ordered_legacy_button_assertion_ok(body):
    try:
        case = body['case_id']
        reference_sha, fixture_sha = ORDERED_LEGACY_BUTTON_CASES[case]
        measurement, companion = body['actual_measurement'], body['current_infrastructure']
        css = measurement['css']
        record = measurement['compiled_record']
        if (body['comparison'] != ORDERED_LEGACY_BUTTON_CONTRACT or body['raw_status'] != 'blocked'
                or body['status'] != 'conforming-current-infrastructure'
                or companion != {'classification': 'conforming-current-infrastructure', 'contract': ORDERED_LEGACY_BUTTON_CONTRACT, 'peer_version': '22.1.7', 'consumer_peer_files': _PEER_FILES}
                or body['reference'] != f'reference/material-16.2.14/sass-css/{case}.css'
                or body['fixture'] != f'fixtures/sass/{case}.scss'
                or body['baseline_sha256'] != reference_sha or body['reference_sha256'] != reference_sha
                or body['fixture_sha256'] != fixture_sha
                or _sha((ROOT / body['reference']).read_bytes()) != reference_sha
                or _sha((ROOT / body['fixture']).read_bytes()) != fixture_sha
                or type(css) is not str or measurement['css_sha256'] != _sha(css)
                or type(measurement['css_bytes']) is not int or measurement['css_bytes'] != len(css.encode())
                or measurement['sass_version'] != _SASS_VERSION
                or measurement['installed_material'] != {'version': '22.1.7', 'manifest_sha256': _MATERIAL_MANIFEST_SHA256}
                or body['candidate_sha256'] != measurement['css_sha256']
                or record['id'] != case or record['status'] != 'compiled'
                or record['module'] != '@ngx-compat/material-legacy'
                or record['fixture_sha256'] != fixture_sha or record['css_sha256'] != measurement['css_sha256']):
            return False
        expected = _expected_css(case)
        return expected is not None and css == expected
    except (KeyError, TypeError, ValueError, OSError, UnicodeError, subprocess.SubprocessError):
        return False


def ordered_legacy_button_envelope_ok(active, body, invocation):
    try:
        expected = dict(kind='assertion', check_id='sass-seal', group='ordered-css-dom', result='pass',
                        exit_code=0, line=active.binding['source_line'], run_id=active.manifest['run_id'],
                        invocation_id=invocation, binding=active.binding)
        if any(body.get(key) != value or type(body.get(key)) is not type(value) for key, value in expected.items()):
            return False
        library = [artifact for artifact in active.manifest['artifacts'] if artifact['id'] == 'library']
        return len(library) == 1 and body['tarball_sha256'] == library[0]['sha256'] and ordered_legacy_button_assertion_ok(body)
    except (KeyError, TypeError, ValueError):
        return False
