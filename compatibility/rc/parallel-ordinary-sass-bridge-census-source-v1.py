#!/usr/bin/env python3
"""Read-only, lexical source census. Does not evaluate Sass or accept a product gate."""
import collections
import hashlib
import json
import pathlib
import re

PRIMARY = pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy')
ROOTS = {'21.x': PRIMARY, 'main': pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
PREFIX = 'compatibility/rc/parallel-ordinary-sass-bridge-census-'
OWNED = 'projects/ngx-material-legacy/'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ref(root, path):
    path = pathlib.Path(path)
    data = (root / path).read_bytes()
    return {'path': str(path), 'sha256': digest(data), 'bytes': len(data)}


def uncomment(text):
    # Keep offsets/line numbers, strings, and interpolation unchanged.
    out = list(text)
    i = 0
    quote = None
    while i < len(text):
        if quote:
            if text[i] == '\\':
                i += 2
                continue
            if text[i] == quote:
                quote = None
        elif text[i] in "\"'":
            quote = text[i]
        elif text.startswith('//', i):
            end = text.find('\n', i)
            end = len(text) if end < 0 else end
            out[i:end] = ' ' * (end-i)
            i = end
            continue
        elif text.startswith('/*', i):
            end = text.find('*/', i+2)
            assert end >= 0
            end += 2
            out[i:end] = ['\n' if c == '\n' else ' ' for c in text[i:end]]
            i = end
            continue
        i += 1
    return ''.join(out)


def close_brace(text, start):
    depth = 0
    quote = None
    i = start
    while i < len(text):
        c = text[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise AssertionError('Unclosed Sass body')


def norm(name):
    return name.replace('_', '-')


def resolve(root, parent, url):
    if not url.startswith('.'):
        return None
    p = parent.parent / url
    candidates = [p, p.with_suffix('.scss'), p.parent / ('_' + p.name + '.scss'), p / '_index.scss', p / 'index.scss']
    for candidate in candidates:
        if (root / candidate).is_file():
            return str((root / candidate).resolve().relative_to(root.resolve()))
    raise AssertionError(('Unresolved owned import', parent, url))


def census(line, root):
    used = {}

    def bind(path):
        used[str(path)] = ref(root, path)

    for path in ['research/sass-symbols.json', 'research/aggregate-composition.json', 'docs/03-sass-contract.md',
                 OWNED + '_index.scss', 'compatibility/rc/oracles/material-16.2.14-sass-api.json',
                 'node_modules/@angular/material/package.json', 'node_modules/@angular/material/_index.scss',
                 'node_modules/@angular/cdk/package.json']:
        bind(path)
    classified = json.loads((root / 'research/sass-symbols.json').read_text())
    rows = [r for r in classified['entries'] if r['category'] == 'explicit-current-component-bridge']
    assert len(rows) == 154 and len({r['symbol'] for r in rows}) == 154
    companions = json.loads((root / 'research/aggregate-composition.json').read_text())['ordinary_companions']
    assert len(companions) == 13
    oracle = json.loads((root / 'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_text())['members']['mixins']
    modules = {}

    def module(path):
        if path in modules:
            return modules[path]
        raw = (root / path).read_text()
        clean = uncomment(raw)
        obj = {'raw': raw, 'clean': clean, 'mixins': {}, 'functions': {}, 'uses': {}}
        modules[path] = obj
        bind(path)
        for m in re.finditer(r"@use\s+(['\"])([^'\"]+)\1\s*(?:as\s+([\w*-]+))?\s*;", clean):
            url, alias = m.group(2), m.group(3)
            alias = alias or pathlib.PurePosixPath(url).name.lstrip('_')
            obj['uses'][norm(alias)] = {'url': url, 'owned': resolve(root, pathlib.Path(path), url)}
        for m in re.finditer(r'@(mixin|function)\s+([\w-]+)\s*(\([^{}]*?\))?\s*\{', clean):
            start = m.end()-1
            end = close_brace(clean, start)
            kind, name = m.group(1), norm(m.group(2))
            entry = {'line': clean.count('\n', 0, m.start())+1, 'signature': raw[m.start():start].strip(),
                     'start': start+1, 'end': end, 'body': clean[start+1:end],
                     'body_sha256': digest(raw[start+1:end].encode())}
            assert name not in obj[kind+'s'], (path, kind, name)
            obj[kind+'s'][name] = entry
        return obj

    indexpath = OWNED + '_index.scss'
    index = module(indexpath)
    exported = collections.defaultdict(list)
    for m in re.finditer(r"@forward\s+(['\"])([^'\"]+)\1([^;]*);", index['clean']):
        tail = m.group(3)
        show = re.search(r'\bshow\s+(.+)', tail, re.S)
        if not show:
            continue
        prefixmatch = re.search(r'\bas\s+([\w-]+)\*', tail)
        prefix = prefixmatch.group(1) if prefixmatch else ''
        target = resolve(root, pathlib.Path(indexpath), m.group(2))
        for symbol in show.group(1).split(','):
            symbol = norm(symbol.strip())
            if symbol not in {r['symbol'] for r in rows}:
                continue
            assert not prefix or symbol.startswith(prefix)
            exported[symbol].append({'path': target, 'local': symbol[len(prefix):],
                                     'line': index['clean'].count('\n', 0, m.start())+1,
                                     'directive': index['raw'][m.start():m.end()]})

    def includes(path, name):
        obj = module(path)
        body = obj['mixins'][name]
        calls = []
        for m in re.finditer(r'@include\s+([\w-]+)(?:\.([\w-]+))?', body['body']):
            namespace, target = (norm(m.group(1)), norm(m.group(2))) if m.group(2) else (None, norm(m.group(1)))
            use = obj['uses'].get(namespace) if namespace else None
            item = {'path': path, 'line': obj['clean'].count('\n', 0, body['start']+m.start())+1,
                    'call': (namespace+'.' if namespace else '')+target}
            if use and use['url'] == '@angular/material':
                item['kind'] = 'public-peer-override' if target.endswith('-overrides') else 'other-public-peer-call'
            elif use and use['url'] == '@angular/cdk':
                item['kind'] = 'public-cdk-structural-call'
            elif use and use['url'].startswith('sass:'):
                item['kind'] = 'sass-builtin'
            else:
                child = use['owned'] if use else (path if namespace is None else None)
                if child and '/vendor/' in child:
                    item['kind'] = 'owned-vendored-mdc-include'
                    item['target_path'] = child
                    bind(child)
                elif child and child.endswith('/tokens/_token-utils.scss'):
                    item['kind'] = 'owned-token-emission-utility'
                    item['target_path'] = child
                elif child and target in module(child)['mixins']:
                    item['kind'] = 'owned-mixin'
                    item['target_path'], item['target_mixin'] = child, target
                else:
                    item['kind'] = 'unresolved-include'
            calls.append(item)
        return calls

    def trace(path, name):
        queue = collections.deque([(path, name, [])])
        seen, result = set(), []
        while queue:
            p, n, chain = queue.popleft()
            if (p,n) in seen:
                continue
            seen.add((p,n))
            for call in includes(p,n):
                if call['kind'] == 'owned-mixin':
                    queue.append((call['target_path'],call['target_mixin'],chain+[{'path':p,'mixin':n,'line':call['line']}]))
                else:
                    result.append({**call,'chain':chain+[{'path':p,'mixin':n,'line':call['line']}]})
        return seen, result

    entries = []
    family_groups = collections.defaultdict(list)
    for r in rows:
        symbol = r['symbol']
        assert len(exported[symbol]) == 1, (symbol, exported[symbol])
        export = exported[symbol][0]
        path, name = export['path'], export['local']
        obj = module(path)
        assert name in obj['mixins'], (symbol, path, name)
        body = obj['mixins'][name]
        reached, calls = trace(path,name)
        public = [c for c in calls if c['kind'] == 'public-peer-override']
        family = symbol.rsplit('-',1)[0] if name in ['color','typography','density','theme'] else ('datepicker' if name=='date-range-colors' else 'dialog')
        family_groups[family].append(symbol)
        entry = {'symbol':symbol, 'family':family, 'aggregate_companion':family in companions,
                 'forward':export, 'mixin':{k:body[k] for k in ['line','signature','body_sha256']},
                 'empty_source_body':not body['body'].strip(), 'direct_includes':includes(path,name),
                 'reachable_public_overrides':public,
                 'reachable_vendor_include_count':sum(c['kind']=='owned-vendored-mdc-include' for c in calls),
                 'reachable_token_utility_sites':[c for c in calls if c['kind']=='owned-token-emission-utility'],
                 'unresolved_include_sites':[c for c in calls if c['kind']=='unresolved-include'],
                 'reached_owned_mixins':[{'path':p,'mixin':n} for p,n in sorted(reached)],
                 'tagged_default_oracle':oracle[symbol],
                 'source_route':'public-override-reachable' if public else 'no-public-override-on-static-include-graph'}
        entries.append(entry)

    # Literal CSS variable consumers in installed shipped runtime JS, not Sass output evaluation.
    consumers = collections.defaultdict(list)
    for p in sorted((root/'node_modules/@angular/material/fesm2022').glob('*.mjs')):
        if 'testing' in p.name or 'schematic' in p.name:
            continue
        raw = p.read_text()
        tokens = set(re.findall(r'var\(\s*(--[a-zA-Z0-9_-]+)',raw))
        if tokens:
            relative = str(p.relative_to(root))
            bind(relative)
            for token in sorted(tokens):
                consumers[token].append(relative)

    families = []
    for family,symbols in sorted(family_groups.items()):
        es = [e for e in entries if e['family']==family]
        paths = sorted({e['forward']['path'] for e in es})
        token_modules = {}
        direct_css = []
        for path in paths:
            obj = module(path)
            # Inventory source imports, not a claim that every imported token is emitted by every dimension.
            for use in obj['uses'].values():
                tp = use['owned']
                if not tp or '/core/tokens/m2/' not in tp:
                    continue
                tm = module(tp)
                pref = re.search(r'\$prefix:\s*\(([^)]+)\)',tm['clean'])
                if not pref:
                    continue
                prefix = '-'.join(x.strip() for x in pref.group(1).split(','))
                keys = sorted(set(re.findall(r'(?<![\w$-])([a-z][a-z0-9-]*)\s*:', tm['clean'])))
                keys = [k for k in keys if k != 'sass']
                variables = ['--'+prefix+'-'+k for k in keys]
                hits = {v:consumers[v] for v in variables if v in consumers}
                token_modules[tp] = {'prefix':prefix,'lexical_map_keys':keys,
                                     'literal_current_consumers':hits,
                                     'not_found_as_literal_current_var':[v for v in variables if v not in consumers],
                                     'caveat':'Module-level lexical map keys include private/null/base keys; neither emission nor value/selector/lifetime equivalence is inferred.'}
            for m in re.finditer(r'(?m)^\s*([a-zA-Z-][\w-]*)\s*:\s*([^;\n]+);', obj['clean']):
                direct_css.append({'path':path,'line':obj['clean'].count('\n',0,m.start())+1,
                                   'declaration':m.group(1)+': '+m.group(2)})
        families.append({'family':family,'symbols':symbols,'aggregate_companion':family in companions,
                         'modules':paths,'public_override_symbols':[e['symbol'] for e in es if e['reachable_public_overrides']],
                         'empty_source_symbols':[e['symbol'] for e in es if e['empty_source_body']],
                         'imported_owned_token_modules':token_modules,'lexical_property_or_map_sites':direct_css,
                         'property_site_limit':'These lexical colon statements can include map entries; direct CSS is manually distinguished in the findings.'})

    # Authenticate installed public override availability for every family, without calling it.
    peer_index_path = 'node_modules/@angular/material/_index.scss'
    peer_index = module(peer_index_path)
    peer_apis = {}
    for f in families:
        symbol = f['family']+'-overrides'
        matches = []
        for m in re.finditer(r"@forward\s+(['\"])([^'\"]+)\1([^;]*);",peer_index['clean']):
            show = re.search(r'\bshow\s+(.+)',m.group(3),re.S)
            if not show or symbol not in [x.strip() for x in show.group(1).split(',')]:
                continue
            pm = re.search(r'\bas\s+([\w-]+)\*',m.group(3))
            prefix = pm.group(1) if pm else ''
            path = resolve(root,pathlib.Path(peer_index_path),'./'+m.group(2).removeprefix('./'))
            local = symbol[len(prefix):]
            definition = module(path)['mixins'][local]
            matches.append({'symbol':symbol,'path':path,'line':definition['line'],
                            'signature':definition['signature'],'root_forward_line':peer_index['clean'].count('\n',0,m.start())+1})
        assert len(matches)==1,(line,symbol,matches)
        peer_apis[symbol]=matches[0]
    # Targeted, reproducible name-level contrasts. Values/selectors still need focused proof.
    examples = {}
    for old,new in [('mdc-checkbox-selected-icon-color','mat-checkbox-selected-icon-color'),
                    ('mdc-text-button-label-text-color','mat-button-text-label-text-color'),
                    ('mat-option-label-text-color','mat-option-label-text-color'),
                    ('mat-optgroup-label-text-color','mat-optgroup-label-text-color'),
                    ('mat-icon-color','mat-icon-color')]:
        examples[old] = {'old_literal_consumers':consumers.get('--'+old,[]),
                         'proposed_current_name':new,'current_literal_consumers':consumers.get('--'+new,[])}
    result = {'schema_version':1,'role':'Read-only lexical source census; no Sass execution or gate acceptance',
              'line':line,'root':str(root),'material_version':json.loads((root/'node_modules/@angular/material/package.json').read_text())['version'],
              'cdk_version':json.loads((root/'node_modules/@angular/cdk/package.json').read_text())['version'],
              'counts':{'classified_exports':len(entries),'families':len(families),'owned_export_modules':len({e['forward']['path'] for e in entries}),
                        'aggregate_companion_families':len(companions),'aggregate_companion_exports':sum(e['aggregate_companion'] for e in entries),
                        'other_ordinary_exports':sum(not e['aggregate_companion'] for e in entries),
                        'public_override_reachable_exports':sum(bool(e['reachable_public_overrides']) for e in entries),
                        'no_public_override_graph_exports':sum(not e['reachable_public_overrides'] for e in entries),
                        'empty_source_bodies':sum(e['empty_source_body'] for e in entries),
                        'unresolved_include_sites':sum(len(e['unresolved_include_sites']) for e in entries)},
              'method_limits':['Lexical @include graph follows owned mixins; conditions and @content are not evaluated.',
                               'No direct override is not a failure: token variable names or direct/transitive CSS may integrate.',
                               'Literal var consumers establish names only; values, scope, cascade, shape, state and public API use need focused proof.',
                               'Tagged default CSS byte counts are immutable historical oracle metadata, not current integration acceptance.'],
              'entries':entries,'families':families,'installed_public_override_apis':peer_apis,'name_level_examples':examples,
              'bound_inputs':sorted(used.values(),key=lambda x:x['path'])}
    return result


if __name__ == '__main__':
    results = {line:census(line,root) for line,root in ROOTS.items()}
    for line,result in results.items():
        filename = PREFIX + ('21x' if line=='21.x' else 'main') + '-v1.json'
        path = PRIMARY / filename
        assert not path.exists(), str(path)
        path.write_text(json.dumps(result,indent=2)+'\n')
        print(line,json.dumps(result['counts'],sort_keys=True),digest(path.read_bytes()))
