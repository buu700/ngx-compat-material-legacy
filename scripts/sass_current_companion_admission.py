"""Authenticate a peer-only measurement; this grants no CSS difference itself."""
import hashlib
import re

_PEERS = {
    'main': ('22.1.7', '5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'),
    '21.x': ('21.2.14', '26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355'),
}
def peer_measurement_ok(peer, line, program_digest, required_sources):
    try:
        version, manifest_digest = _PEERS[line]
        if peer['line'] != line or peer['peer_version'] != version or peer['peer_package_json_sha256'] != manifest_digest:
            return False
        if peer['program_sha256'] != program_digest or hashlib.sha256(peer['program'].encode()).hexdigest() != program_digest:
            return False
        if peer['css_sha256'] != hashlib.sha256(peer['css'].encode()).hexdigest() or type(peer['css_bytes']) is not int or peer['css_bytes'] != len(peer['css'].encode()):
            return False
        sources = peer['sources']
        if not sources or any(type(s['root']) is not int or s['root'] not in (0, 1)
                or not s['path'] or s['path'].startswith('/') or '\\' in s['path'] or '..' in s['path'].split('/')
                or not re.fullmatch('[0-9a-f]{64}', s['sha256']) or type(s['bytes']) is not int or s['bytes'] < 1 for s in sources):
            return False
        if len({(s['root'], s['path']) for s in sources}) != len(sources):
            return False
        return all(any(s['root'] == 0 and s['path'] == path and s['sha256'] == digest and s['bytes'] == size for s in sources)
                   for path, (digest,size) in required_sources.items())
    except (KeyError, TypeError, ValueError, AttributeError):
        return False
