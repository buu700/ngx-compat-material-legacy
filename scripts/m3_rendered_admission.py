"""Rendered checks must cover the producer's complete predeclared probe schema."""
from functools import lru_cache
import json
from pathlib import Path
import subprocess

@lru_cache(maxsize=1)
def rendered_schema():
    script = Path(__file__).with_name('m3-rendered-coexistence.mjs')
    code = "const m=await import(process.argv[1]); console.log(JSON.stringify(m.assessRendered({})));"
    result = subprocess.run(['node','--input-type=module','-e',code,script.as_uri()],text=True,capture_output=True,timeout=10)
    if result.returncode:
        raise ValueError('cannot derive M3 rendered source-policy schema')
    return json.loads(result.stdout)

def signature(check):
    return (check['label'], check['probe'], check['expect'], check['observed'], check['reference'], tuple(p['property'] for p in check['properties']))

def complete_rendered_checks(case, rendered):
    try:
        schema = rendered_schema()[case]
        actual = rendered['checks']
        expected = schema['checks']
        if len(actual) != len(expected) or [signature(c) for c in actual] != [signature(c) for c in expected]:
            return False
        if case == 'current-shared-scope':
            negative = rendered['contamination_negative']
            probes = negative['checks']
            if negative.get('fixture') != schema['contamination_negative']['fixture']:
                return False
            if [signature(c) for c in probes] != [signature(c) for c in schema['contamination_negative']['checks']]:
                return False
            detected = False
            for check in probes:
                if check.get('found') is not True or not all(isinstance(p.get(k),str) and p[k] for p in check['properties'] for k in ('observed','reference')):
                    return False
                differs = any(p['observed'] != p['reference'] for p in check['properties'])
                if check.get('ok') != differs:
                    return False
                detected |= differs
            if not detected or negative.get('detected') is not True or negative.get('rostered') is not False:
                return False
        return True
    except (KeyError, TypeError, ValueError, OSError, subprocess.TimeoutExpired):
        return False
