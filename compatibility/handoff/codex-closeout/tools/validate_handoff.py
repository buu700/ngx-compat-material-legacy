#!/usr/bin/env python3
"""Read-only document/archive integrity checks; never a library release validator."""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile

TASKS = [f'C{i:02d}' for i in range(6)] + [f'A{i:02d}' for i in range(1, 11)] + [f'R{i:02d}' for i in range(1, 4)]
GATES = {f'G{i:02d}' for i in range(1, 14)}
TASK_DOCUMENTS = {**{f'C{i:02d}': 'CLOSEOUT.md' for i in range(6)},
                  **{f'A{i:02d}': 'AUDIT.md' for i in range(1, 11)},
                  **{f'R{i:02d}': 'FINALIZATION.md' for i in range(1, 4)}}

class Invalid(ValueError):
    pass

def need(value, message):
    if not value:
        raise Invalid(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def pairs(items):
    out = {}
    for key, value in items:
        need(key not in out, f'duplicate JSON key: {key}')
        out[key] = value
    return out

def load(data):
    return json.loads(data, object_pairs_hook=pairs,
                      parse_constant=lambda value: (_ for _ in ()).throw(Invalid('non-finite JSON')))

def safe_name(value):
    need(isinstance(value, str) and value and '\\' not in value, 'invalid path')
    need(not PurePosixPath(value).is_absolute() and all(p not in ('', '.', '..') for p in value.split('/')), f'unsafe path: {value}')
    return value

def local(root, name):
    safe_name(name)
    p = root / name
    need(p.resolve().is_relative_to(root.resolve()) and p.is_file(), f'missing/confined file: {name}')
    cursor = root
    for part in name.split('/'):
        cursor = cursor / part
        need(not cursor.is_symlink(), f'symlink file: {name}')
    return p

def read(root, name):
    return load(local(root, name).read_text(encoding='utf-8'))

def archive_check(root, line, rec):
    p = local(root, rec['archive_path'])
    raw = p.read_bytes()
    need(len(raw) == rec['archive_bytes'] and digest(raw) == rec['archive_sha256'], f'{line}: archive hash/length')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        infos = z.infolist()
        names = [x.filename for x in infos if not x.is_dir()]
        need(len({x.filename for x in infos}) == len(infos), f'{line}: duplicate zip member')
        need(sum(x.file_size for x in infos) < 512 * 1024 * 1024, 'unexpected oversized archive')
        for item in infos:
            safe_name(item.filename.rstrip('/'))
            need(not stat.S_ISLNK(item.external_attr >> 16), 'symlink archive member')
        need(z.testzip() is None, f'{line}: CRC error')
        index = load(z.read('closure-index.json'))
        listed = index['files']
        need(len(listed) == rec['index_entries'], f'{line}: index count')
        need(len({x['path'] for x in listed}) == len(listed), f'{line}: duplicate index path')
        need({x['path'] for x in listed} == set(names) - {'closure-index.json'}, f'{line}: index coverage')
        for item in listed:
            safe_name(item['path'])
            data = z.read(item['path'])
            need(len(data) == item['bytes'] and digest(data) == item['sha256'], f'{line}: indexed bytes mismatch: {item["path"]}')
        run = load(z.read('run.json'))
        summary = load(z.read('verify-summary.json'))
        need(run['source'] == rec['source'] and run['source']['commit'] == rec['commit'] and run['source']['git_tree_sha'] == rec['tree'], f'{line}: source identity')
        need(run['source']['line'] == line and run['run_id'] == rec['run_id'] == summary['run_id'], f'{line}: run/line identity')
        need(index['run_id'] == rec['run_id'] and index['summary_run_id'] == rec['run_id'], f'{line}: index run identity')
        need(run['environment'] == rec['environment'] and run['oracles'] == rec['oracles'], f'{line}: environment/oracle identity')
        need(run['expected_matrix'] == rec['expected_matrix'] == index['matrix'], f'{line}: matrix identity')
        need(run['artifacts'] == rec['artifacts'], f'{line}: artifact identity list')
        for item in run['artifacts']:
            safe_name(item['path'])
            data = z.read(item['path'])
            need(len(data) == item['bytes'] and digest(data) == item['sha256'], f'{line}: tarball mismatch')
        complete = summary['completeness']
        need(complete['automatic_product_result'] == rec['result'] == 'incomplete', f'{line}: baseline result')
        need(complete['complete_checks'] == rec['complete_checks'] and complete['incomplete_checks'] == rec['incomplete_checks'], f'{line}: acceptance observation mismatch')
        small = read(root, rec['summary_path'])
        need(small['source'] == run['source'] and small['run_id'] == run['run_id'] and small['archive_sha256'] == rec['archive_sha256'], f'{line}: derived summary identity')
        need(small['complete_checks'] == complete['complete_checks'] and small['incomplete_checks'] == complete['incomplete_checks'], f'{line}: derived summary result')
        sass = load(z.read('reports/details/sass-seal.json'))
        need(small['sass_api'] == sass['sass_api'] and small['sass_pending_decisions'] == sass['pending_decisions'], f'{line}: Sass summary mismatch')
        need(small['ordered_css']['blocked'] == [r['case_id'] for r in sass['ordered_css_results'] if r['result'] != 'pass'], f'{line}: omitted CSS difference')
        need(small['source_changes'] == rec['source_changes'] == load(z.read('source-inputs.json'))['changes'], f'{line}: source changes')
        floors = load(z.read('consumer-floors-workspace.json'))
        old_cli = load(z.read('old-workspace-cli.json'))
        m3_names = [name for name in names if name.startswith('evidence/m3-coexistence/')
                    and name.endswith('/current-only.json')]
        need(len(m3_names) == 1, f'{line}: unique M3 baseline assertion required')
        m3 = load(z.read(m3_names[0]))
        need(m3['case_id'] == 'current-only' and m3['line'] == line,
             f'{line}: M3 assertion identity')
        expected_scope = {
            'consumer_floors': {
                'report': 'consumer-floors-workspace.json',
                'coverage': floors['coverage'],
                'node_18_executed': floors['cli_runtime']['node_18_executed'],
                'process_node_used_for_floor': floors['process_node_used_for_floor'],
                'limitations': floors['limitations'],
            },
            'old_workspace_cli': {
                'report': 'old-workspace-cli.json',
                'tarball_used': old_cli['tarball_used'],
                'cli': old_cli['cli'],
                'coverage': old_cli['coverage'],
                'limitations': old_cli['limitations'],
            },
            'm3_example': {
                'case_id': m3['case_id'],
                'source_kind': m3['source_kind'],
                'rendered_present': 'rendered' in m3,
            },
        }
        need(small['known_accepted_scope_limits'] == expected_scope,
             f'{line}: derived accepted-scope summary mismatch')
    return len(listed)

def cold_start_check(docs, plan):
    """Check explicit handoff instructions, not whether a future audit occurred."""
    note = plan.get('traceability_note', '')
    need('historical labels only' in note and 'No prior FIN packet' in note,
         'FIN labels must be traceability only; no external packet prerequisite')
    for name in ('AGENT-PROMPT.md', 'START-HERE.md', 'CLOSEOUT.md', 'CHECKLIST.md'):
        text = docs[name]
        need(not re.search(r'active work packet|existing FIN packets', text, re.I),
             f'dangling prior-packet instruction: {name}')
        need('no prior fin packet' in text.lower(), f'cold-start scope missing: {name}')
    for name in ('AGENT-PROMPT.md', 'START-HERE.md'):
        need(all(doc in docs[name] for doc in TASK_DOCUMENTS.values()),
             f'cold-start local task map missing: {name}')
    need('## Maintainer model' in docs['PLAN.md'], 'maintainer model missing')
    model = docs['PLAN.md'].split('## Maintainer model', 1)[1].split('\n## ', 1)[0]
    need(all(term in model for term in ('AI-assisted maintenance', 'frozen-feature',
              'useful Chainman investment', 'hypothetical outside contributors',
              'Conventional package consumers remain independent of Chainman')),
         'maintainer design objectives incomplete')
    heading = '## C05-to-audit context transition'
    need(heading in docs['AUDIT.md'], 'explicit C05 audit-context transition missing')
    transition = docs['AUDIT.md'].split(heading, 1)[1].split('\n## ', 1)[0]
    need(all(term in transition for term in ('committed review checkpoint', 'both C05 commits/trees',
              'If the environment supports a fresh Codex context or independent review subagent, use it',
              'A01–A10', 'same-agent-explicit', 'independent oracles',
              'mutation/negative probes', 'assurance limitations')),
         'C05 transition must require available fresh review and an honest fallback')
    need('Do not preload the closeout conversation or implementation reasoning' in transition,
         'audit transition must not preload implementation reasoning')
    need('not another C00–C05 pass' in transition and 'fresh audit-phase launch' in docs['FIRST-SESSION.md'],
         'fresh audit context must enter audit rather than restart closeout')
    for name in ('AGENT-PROMPT.md', 'PLAN.md', 'OPERATING-RULES.md'):
        need('C05' in docs[name] and 'same-agent-explicit' in docs[name],
             f'audit transition entry guidance missing: {name}')

def validate(root):
    root = root.resolve()
    inventory = {}
    for entry in local(root, 'MANIFEST.sha256').read_text().splitlines():
        h, name = entry.split('  ', 1)
        safe_name(name)
        need(name not in inventory and re.fullmatch('[0-9a-f]{64}', h), 'duplicate/invalid manifest entry')
        need(digest(local(root, name).read_bytes()) == h, f'manifest hash mismatch: {name}')
        inventory[name] = h
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*')
              if p.is_file() and '__pycache__' not in p.parts and p.name != 'MANIFEST.sha256'}
    need(set(inventory) == actual, 'manifest coverage mismatch')
    docs = {name: local(root, name).read_text() for name in inventory if name.endswith('.md')}
    links = 0
    for name, content in docs.items():
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', content):
            if '://' in target or target.startswith(('#', 'mailto:')):
                continue
            target = target.split('#', 1)[0]
            p = (root / name).parent / target
            need(p.resolve().is_relative_to(root) and p.is_file(), f'broken local link: {name}: {target}')
            links += 1
    all_json = {name: read(root, name) for name in inventory if name.endswith('.json')}
    baseline = all_json['baseline.json']
    need(set(baseline['lines']) == {'main', '21.x'}, 'both source lines required')
    need(baseline['gates_closed_by_planning'] == [] and baseline['product_tests_run_in_planning'] is False, 'planning must not claim product execution')
    reference = all_json['reference/source-hashes.json']['sha256']
    need(reference == baseline['references'], 'normative identity disagreement')
    for name, h in reference.items():
        need(digest(local(root, 'reference/' + name).read_bytes()) == h, 'normative reference changed')
    gates = all_json['reference/release-gates.json']['gates']
    need({g['id'] for g in gates} == GATES and len(gates) == 13, 'release-gate coverage')
    rows = list(csv.DictReader(io.StringIO(local(root, 'reference/historical-paths.csv').read_text())))
    need(len(rows) == 57 and len({r['historical_path'] for r in rows}) == 57, 'historical path coverage')
    companions = list(csv.DictReader(io.StringIO(local(root, 'reference/companion-contract.csv').read_text())))
    need(len(companions) == 13, 'companion coverage')
    plan = all_json['plan-index.json']
    cold_start_check(docs, plan)
    tasks = plan['tasks']; ids = [t['id'] for t in tasks]
    need(ids == TASKS and plan['first_task'] == 'C00', 'complete ordered task coverage')
    need(plan['phase_order'] == ['preflight', 'closeout', 'checkpoint', 'audit', 'finalization'], 'phase order')
    need(all(t['status'] == 'not_started' for t in tasks), 'handoff tasks cannot fabricate completion')
    need({g for t in tasks for g in t['gates']} == GATES, 'task gate coverage')
    seen = set(); criteria = []
    for task in tasks:
        need(set(task['after']) <= seen, f'invalid dependency order: {task["id"]}')
        local(root, task['document'])
        need(task['document'] == TASK_DOCUMENTS[task['id']], f'incorrect local task routing: {task["id"]}')
        need(f'## {task["id"]} —' in docs[task['document']], f'missing local task section: {task["id"]}')
        need(len(task['criteria']) == 4, 'criterion count')
        for n, criterion in enumerate(task['criteria'], 1):
            cid = f'{task["id"]}-K{n:02d}'
            need(criterion['id'] == cid and criterion['requirement'], 'criterion identity')
            need(docs['CHECKLIST.md'].count(cid) == 1, f'checklist coverage: {cid}')
            need(f'**{cid}** — {criterion["requirement"]}' in docs['CHECKLIST.md'], f'criterion text mismatch: {cid}')
            criteria.append(cid)
        if task['phase'] == 'audit':
            need(f'## {task["id"]} ' in docs['AUDIT.md'], 'missing audit domain')
        seen.add(task['id'])
    need(len(set(criteria)) == 76, 'criterion total')
    indexed = {}
    for line, rec in baseline['lines'].items():
        need(rec['artifact_name'] == f'closure-{rec["commit"]}-{rec["workflow_run"]}', f'{line}: closure locator')
        indexed[line] = archive_check(root, line, rec)
    return {'result': 'pass', 'hashed_files': len(inventory), 'local_links': links,
            'tasks': len(tasks), 'audit_domains': 10, 'criteria': len(criteria), 'gates': 13,
            'historical_paths': len(rows), 'companions': len(companions), 'archive_index_entries': indexed,
            'cold_start_instructions': 'pass', 'task_sections_resolved_locally': len(tasks),
            'product_tests_executed': False, 'product_or_audit_admission_claimed': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        print(json.dumps(validate(args.root), indent=2))
        return 0
    except (Invalid, OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as exc:
        print(f'validation failed: {exc}')
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
