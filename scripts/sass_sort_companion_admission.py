"""Finite C02 current-sort contract; the original CSS seal remains unchanged."""
import hashlib
import re

_LIGHT = 'e97314a64538c85bf6bb0bcf98e156409bf0e10b99f82e3e9ec4f78c801d6efe'
_DARK = 'b727db33639182dc7d8cc6dd5631a8f3f925a28fa0a27028b25d21aa4971efa9'
SORT_CASES = {
    'mixin-argument/sort-color/custom-full-theme': (_LIGHT, 'b14c527d1f6399d9f9dc2b78181004796395b7df55f69533392bcc869f68e161'),
    'mixin-argument/sort-color/raw-color-config': (_LIGHT, 'b14c527d1f6399d9f9dc2b78181004796395b7df55f69533392bcc869f68e161'),
    'mixin-argument/sort-theme/custom-full-theme': (_LIGHT, '63bf9520bf768c68d51acc9c7690e39209e34a7838ee00d8971b7f965626330f'),
    'mixin-argument/sort-theme/custom-dark-theme': (_DARK, '3ea527f3c4b05293f7725131839769afe08583563e0bbcb9a508340f6c7fcd44'),
}
_PEERS = {
    'main': ('22.1.7', '5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'),
    '21.x': ('21.2.14', '26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355'),
}
_SOURCES = {
    'sort/_m2-sort.scss': ('06d77838a6fee948f3e101021da366bf95845a769916b354137103cf454f98d6',267),
    'sort/_sort-theme.scss': ('526fb2229a84a7449a9a4d57cd228089df1c403cdcebd0b84ebed54086636be0',1977),
}
def _sha(text):
    return hashlib.sha256(text.encode()).hexdigest()

def sort_companion_expected_css(body):
    try:
        case_id = body['case_id']
        if case_id not in SORT_CASES or body.get('comparison') != 'current-companion-contract':
            return None
        contract = body['current_companion']
        if contract['classification'] != 'conforming-current-companion' or contract['contract'] != 'current-sort-color-with-original-fallback':
            return None
        original, peer = body['expected'], contract['peer']
        digest, program_digest = SORT_CASES[case_id]
        version, manifest_digest = _PEERS[body['line']]
        if original['css_sha256'] != digest or _sha(original['css']) != digest:
            return None
        if peer['line'] != body['line'] or peer['peer_version'] != version or peer['peer_package_json_sha256'] != manifest_digest:
            return None
        if peer['program_sha256'] != program_digest or _sha(peer['program']) != program_digest:
            return None
        if peer['css_sha256'] != _sha(peer['css']) or type(peer['css_bytes']) is not int or peer['css_bytes'] != len(peer['css'].encode()):
            return None
        sources = peer['sources']
        if not sources or any(type(s['root']) is not int or s['root'] not in (0, 1)
                or not s['path'] or s['path'].startswith('/') or '\\' in s['path'] or '..' in s['path'].split('/')
                or not re.fullmatch('[0-9a-f]{64}', s['sha256']) or type(s['bytes']) is not int or s['bytes'] < 1 for s in sources):
            return None
        if len({(s['root'], s['path']) for s in sources}) != len(sources):
            return None
        for path, (source_digest,source_bytes) in _SOURCES.items():
            if not any(s['root'] == 0 and s['path'] == path and s['sha256'] == source_digest and s['bytes'] == source_bytes for s in sources):
                return None
        match = re.fullmatch(r'\.sass-argument-probe \.mat-sort-header-arrow \{\n  color: ([^;\n{}]+);\n\}', original['css'])
        if not match:
            return None
        value = 'white' if case_id.endswith('/custom-dark-theme') else 'rgba(0, 0, 0, 0.87)'
        peer_css = '.sass-argument-probe {\n  --mat-sort-arrow-color: ' + value + ';\n}'
        if peer['css'] != peer_css:
            return None
        return '.sass-argument-probe .mat-sort-header-arrow {\n  color: var(--mat-sort-arrow-color, ' + match[1] + ');\n}\n' + peer_css
    except (KeyError, TypeError, ValueError, AttributeError):
        return None

def sort_companion_results_match(body):
    expected = sort_companion_expected_css(body)
    actual = body.get('actual') or {}
    try:
        return expected is not None and actual['css'] == expected and actual['css_sha256'] == _sha(actual['css']) and actual['css_bytes'] == len(actual['css'].encode())
    except (KeyError, TypeError, AttributeError):
        return False
