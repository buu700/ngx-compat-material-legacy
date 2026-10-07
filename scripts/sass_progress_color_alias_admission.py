"""Four finite progress color aliases preserve all authentic historical CSS."""
import hashlib
import re
from sass_current_companion_admission import peer_measurement_ok
_ORIGINAL='e65293d6696aaaa07514f19bc208660605c43ecc79a954092d1a6d5fca156dcc'
_LIGHT='c2b42363effff8e3aa02b4a4cb79b36f0fc9bff24f988c285c351a2c0ef54416'
PROGRESS_COLOR_ALIAS_CASES={
 'mixin-argument/progress-bar-color/custom-full-theme':(_ORIGINAL,_LIGHT),
 'mixin-argument/progress-bar-color/raw-color-config':(_ORIGINAL,_LIGHT),
 'mixin-argument/progress-bar-theme/custom-full-theme':(_ORIGINAL,_LIGHT),
 'mixin-argument/progress-bar-theme/custom-dark-theme':(_ORIGINAL,'8dcbffe5ca48c2520748ba7bbb0e1a137decb22202d574ab4b87dee60daaddb1'),
}
_SOURCES={
 'progress-bar/_m2-progress-bar.scss':('3ef9135469690508db54167b8e907c8d614c2cc8592b960de1296e7c6b2f2ca7',1021),
 'progress-bar/_progress-bar-theme.scss':('886c4282857365d43652c3c18928589defafd2d222a02848b6da70f9121ab4d1',2901),
}
def progress_color_peer_expected_css():
    return '\n'.join('.sass-argument-probe .mat-mdc-progress-bar'+variant+' {\n  --mat-progress-bar-active-indicator-color: '+active+';\n  --mat-progress-bar-track-color: '+track+';\n}'
        for variant,active,track in [('', '#303f9f','rgba(48, 63, 159, 0.25)'),('.mat-accent','#ff4081','rgba(255, 64, 129, 0.25)'),('.mat-warn','#b71c1c','rgba(183, 28, 28, 0.25)')])

def progress_color_alias_expected_css(body):
    try:
        digest,program_digest=PROGRESS_COLOR_ALIAS_CASES[body['case_id']]
        if body.get('comparison')!='current-peer-color-alias-contract' or 'current_companion' in body:return None
        contract=body['current_peer_alias']
        if contract['classification']!='conforming-current-infrastructure' or contract['contract']!='historical-progress-css-with-public-color-aliases':return None
        original=body['expected'];peer=contract['peer']
        if original['css_sha256']!=digest or hashlib.sha256(original['css'].encode()).hexdigest()!=digest or original['css_bytes']!=len(original['css'].encode()):return None
        if not peer_measurement_ok(peer,body['line'],program_digest,_SOURCES) or peer['css']!=progress_color_peer_expected_css():return None
        pattern=r'(\.sass-argument-probe \.mat-mdc-progress-bar(?:\.mat-(?:accent|warn))? \{\n  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);)\n\}'
        css,count=re.subn(pattern,lambda m:m[1]+'\n  --mat-progress-bar-active-indicator-color: '+m[2]+';\n  --mat-progress-bar-track-color: '+m[3]+';\n}',original['css'])
        return css if count==3 else None
    except (KeyError,TypeError,ValueError,AttributeError):return None

def progress_color_alias_results_match(body):
    expected=progress_color_alias_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==hashlib.sha256(actual['css'].encode()).hexdigest() and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
