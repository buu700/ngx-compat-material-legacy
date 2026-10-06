"""Admit actual floor executions; version arithmetic alone is diagnostic."""
import json
import re
from pathlib import Path
from rc_acceptance import EvidenceError, checked_file, assertion_directory

HEX = re.compile(r'^[0-9a-f]{64}$')

def reviewed_configurations(plan, line):
    row = plan['lines'][line]
    configs = [dict(group='library-runtime', case_id=f"library/node-{node}/rxjs-{rxjs}/ts-{row['typescript_minimum']}", node=node, rxjs=rxjs, typescript=row['typescript_minimum'], **row)
               for node in row['library_node_minima'] for rxjs in plan['rxjs_minima']]
    current = dict(row, **plan['current_configuration'])
    current['typescript'] = current['typescript_by_line'][line]
    configs.append(dict(group='library-runtime', case_id='library/current-supported-configuration', **current))
    configs.extend(dict(group='cli-runtime-floors', case_id=f'cli/node-{node}', node=node) for node in plan['cli_node_versions'])
    return {c['case_id']: c for c in configs}

def floor_probe_ids(root):
    matrix = json.loads((root / 'compatibility/rc/matrices/full-verify.json').read_text())
    row = next(row for row in matrix['checks'] if row['check_id'] == 'packed-consumer')
    rosters = [groups for groups in row['acceptance']['cases_by_line'].values() if all(ids is not None for ids in groups.values())]
    if not rosters or any(groups != rosters[0] for groups in rosters):
        raise ValueError('ambiguous packed-consumer source-policy roster')
    return [case for cases in rosters[0].values() for case in cases]


def floor_support_records(body):
    return [body['consumer_detail'], body['consumer_lock']] if body.get('group') == 'library-runtime' else []

def floor_assertion_ok(root: Path, active, body: dict, invocation: str) -> bool:
    case = body.get('case_id', '')
    # Existing source-policy diagnostics remain distinct from execution proofs.
    if not case.startswith(('library/', 'cli/')):
        return True
    try:
        line = active.binding['source_line']
        plan = json.loads((root / 'compatibility/rc/consumer-floor-plan.json').read_text())
        config = reviewed_configurations(plan, line)[case]
        if any(body.get(k) != v for k, v in {'kind':'assertion', 'result':'pass', 'exit_code':0,
              'check_id':'consumer-floors', 'line':line, 'run_id':active.manifest['run_id'],
              'invocation_id':invocation, 'binding':active.binding, 'configuration':config,
              'group':config['group']}.items()):
            return False
        artifacts = {a['id']:a['sha256'] for a in active.manifest['artifacts'] if a['id'] in ('library', 'migrate-cli')}
        if len(artifacts) != 2 or body.get('artifacts') != artifacts:
            return False
        runtime = body['runtime']
        if runtime['version'] != 'v'+config['node'] or runtime['archive_sha256'] != plan['node_sources'][config['node']]['sha256']:
            return False
        if not HEX.fullmatch(runtime['executable_sha256']) or not Path(runtime['executable']).is_absolute():
            return False
        command = body['command']
        if not isinstance(command, list) or len(command) < 2 or command[0] != runtime['executable']:
            return False
        if config['group'] == 'library-runtime':
            prefix = assertion_directory('consumer-floors', invocation)+'/'
            for record in floor_support_records(body):
                if not record['path'].startswith(prefix):
                    return False
                checked_file(active.run_dir, record, 'floor support')
            detail = json.loads(checked_file(active.run_dir, body['consumer_detail'], 'floor detail').read_text())
            versions = {f'@angular/{name}': config['cdk'] if name == 'cdk' else config['material'] if name == 'material' else config['framework']
                        for name in ('animations','cdk','common','compiler','compiler-cli','core','forms','material','platform-browser','platform-browser-dynamic')}
            versions.update(rxjs=config['rxjs'], typescript=config['typescript'])
            if body['installed_versions'] != versions or detail['installed_floor_versions'] != versions:
                return False
            if detail['floor_configuration'] != config or detail['node_runtime'] != {'version':runtime['version'], 'exec_path':runtime['executable']}:
                return False
            if detail['tarball']['sha256'] != artifacts['library'] or detail['status'] != 'ok' or detail.get('errors') != []:
                return False
            bundle = detail['harness']['bundle']
            if bundle.get('module_loader') != 'bundled-consumer-node-cjs' or bundle.get('input_paths_confined') is not True or not bundle.get('inputs'):
                return False
            if bundle.get('preserve_explicit_imports') is not True or bundle.get('format') != 'cjs' or bundle.get('platform') != 'node' or not HEX.fullmatch(bundle['bundle_sha256']):
                return False
            tool = json.loads((root / 'package.json').read_text())['devDependencies']['esbuild']
            if bundle.get('tool_version') != tool:
                return False
            paths = [item['path'] for item in bundle['inputs']]
            if len(paths) != len(set(paths)) or any(path.startswith('/') or '\\' in path or any(part in ('', '.', '..') for part in path.split('/')) for path in paths):
                return False
            if any(not HEX.fullmatch(item['sha256']) for item in bundle['inputs']):
                return False
            if not all(any(path.startswith(prefix) for path in paths) for prefix in ('out-tsc/', 'node_modules/rxjs/', 'node_modules/@ngx-compat/material-legacy/')):
                return False

            if any(detail[k]['status'] != 'ok' for k in ('aot','harness')):
                return False
            cases = detail['acceptanceCases']
            if not cases or any(c.get('result') != 'pass' for c in cases) or len({c['case_id'] for c in cases}) != len(cases) or set(c['case_id'] for c in cases) != set(floor_probe_ids(root)):
                return False
            if detail['isolation'].get('declaration_program_ok') is not True or detail['isolation'].get('declaration_check') != 'skipLibCheck:false':
                return False
            lock = json.loads(checked_file(active.run_dir, body['consumer_lock'], 'floor lock').read_text())
            for name, version in versions.items():
                if lock['packages']['node_modules/'+name]['version'] != version:
                    return False
            if any(detail['consumer_lock'][k] != body['consumer_lock'][k] for k in ('sha256','bytes')):
                return False
        else:
            cli = body['cli']
            files = cli['support_files']
            if set(files) != {'bin/migrate-legacy.js','lib/ts-rewrite.js','lib/sass-rewrite.js','lib/transaction-write.js','package.json'} or not all(HEX.fullmatch(v) for v in files.values()):
                return False
            if cli['cli_bin_sha256'] != files['bin/migrate-legacy.js']:
                return False
            dry, apply, second = (cli[k] for k in ('dry_run','apply','second_apply'))
            if dry['mode'] != 'dry-run' or dry['safe_edits'] < 1 or dry['blocking'] != 0:
                return False
            if apply['applied'] != 1 or apply['blocking'] != 0 or second['applied'] != 0 or second['blocking'] != 0:
                return False
        return True
    except (KeyError, TypeError, ValueError, OSError, EvidenceError):
        return False
