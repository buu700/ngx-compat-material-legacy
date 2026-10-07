"""Eight tree cases: exact original fallback rules and exact current peer tokens."""
import hashlib
import re
from sass_current_companion_admission import peer_measurement_ok

TREE_CASES={
 'mixin-argument/tree-color/custom-full-theme':('fa403fd64c3bbd3312e0356f8e4583fed7fe806e82be74a197a161aacea3fe45','6e71bf3e60060150b901c46b1f8b043d48e8f3169c4a29778c3a0a0f1b26f4c9'),
 'mixin-argument/tree-color/raw-color-config':('fa403fd64c3bbd3312e0356f8e4583fed7fe806e82be74a197a161aacea3fe45','6e71bf3e60060150b901c46b1f8b043d48e8f3169c4a29778c3a0a0f1b26f4c9'),
 'mixin-argument/tree-density/custom-full-theme':('794b08d991fb8a67e78b4efb90a498c5d048781d031b164620ca3c63108e7f02','d77ada38fed6f81f1ca4641403fd160da70d477d841e06024fdeb428d0123426'),
 'mixin-argument/tree-density/raw-density-config':('794b08d991fb8a67e78b4efb90a498c5d048781d031b164620ca3c63108e7f02','d77ada38fed6f81f1ca4641403fd160da70d477d841e06024fdeb428d0123426'),
 'mixin-argument/tree-typography/custom-full-theme':('8f780bf1204aed04212d2d96d1fd42f76c099814877d08416dc3165fc789fae2','089527bc79fbdc8c3bac96276fa91a346ba76cae1a809657928a0021fed261b1'),
 'mixin-argument/tree-typography/raw-typography-config':('8f780bf1204aed04212d2d96d1fd42f76c099814877d08416dc3165fc789fae2','089527bc79fbdc8c3bac96276fa91a346ba76cae1a809657928a0021fed261b1'),
 'mixin-argument/tree-theme/custom-full-theme':('f0c42168029ce1e5a33adc06397a213da2827bfb704996797aaf7d07d7e5a798','9e75ee8ea44c8c3e98af5ad9493c545a5dd7bb9c74b8b1d2adf935726f42880e'),
 'mixin-argument/tree-theme/custom-dark-theme':('3ba982b68f6ff83aed679481c1e2697d9296cf63f31f5a6d3116ec9402147d2a','dd19d5d63e33cb315d32e4d8009672da9217d9f6589fc45350aa0e3f40b587d9'),
}
_SOURCES={
 'tree/_m2-tree.scss':('efb7b17cb55631f6dc3318ed2dc04240055f92aa742b015d00c47864db2429b5',871),
 'tree/_tree-theme.scss':('645c90053453a65e4519c2396a1710f881866a3a589a241108490d86577ec2a2',1977),
}
def tree_companion_expected_css(body):
    try:
        case=body['case_id']
        if case not in TREE_CASES or body.get('comparison')!='current-companion-contract':return None
        contract=body['current_companion']
        if contract['classification']!='conforming-current-companion' or contract['contract']!='current-tree-dimensions-with-original-fallbacks':return None
        original=body['expected'];peer=contract['peer'];digest,program_digest=TREE_CASES[case]
        if original['css_sha256']!=digest or hashlib.sha256(original['css'].encode()).hexdigest()!=digest:return None
        if not peer_measurement_ok(peer,body['line'],program_digest,_SOURCES):return None
        dimension=case.split('/')[1][len('tree-'):];dimensions=['color','typography','density'] if dimension=='theme' else [dimension]
        dark=case.endswith('/custom-dark-theme')
        groups={
            'color':[('container-background-color','#424242' if dark else 'white'),('node-text-color','white' if dark else 'rgba(0, 0, 0, 0.87)')],
            'typography':[('node-text-font','Custom Family'),('node-text-size','14px'),('node-text-weight','400')],
            'density':[('node-min-height','40px')],
        }
        peer_css='.sass-argument-probe {\n'+'\n'.join('  --mat-tree-'+key+': '+value+';' for dim in dimensions for key,value in groups[dim])+'\n}'
        if peer['css']!=peer_css:return None
        tokens={'background':'container-background-color','color':'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'}
        fallback=re.sub(r'^  (background|color|font-weight|font-size|min-height): ([^;\n{}]+);$',
            lambda m:'  '+m[1]+': var(--mat-tree-'+tokens[m[1]]+', '+m[2]+');',original['css'],flags=re.M)
        return fallback+'\n'+peer_css
    except (KeyError,TypeError,ValueError,AttributeError):return None

def tree_companion_results_match(body):
    expected=tree_companion_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==hashlib.sha256(actual['css'].encode()).hexdigest() and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
