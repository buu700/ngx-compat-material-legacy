/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// The coordinator adds execution_record after children exit. The sealer owns
// stage, finished_at, reports, summary, preseal_manifest_sha256 and evidence_files.
// All other top-level fields are immutable and unknown fields fail closed.
const immutable = ['schema_version', 'template', 'run_id', 'purpose', 'created_at', 'source', 'environment', 'oracles', 'artifacts', 'expected_matrix', 'execution_inputs', 'pack_execution', 'pack_metadata'];
const mutable = ['stage', 'reports', 'summary', 'execution_record', 'finished_at', 'preseal_manifest_sha256', 'evidence_files'];
function canonical(v) {
 if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
 if (v && typeof v === 'object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
export function typeaheadRunProjection(run) {
 if (!run || typeof run !== 'object' || Array.isArray(run) || Object.keys(run).some(k=>!immutable.includes(k)&&!mutable.includes(k)) || immutable.some(k=>!Object.hasOwn(run,k)) || !['draft','sealed'].includes(run.stage)) throw Error('invalid typeahead run projection');
 return Object.fromEntries(immutable.map(k=>[k,run[k]]));
}
export function typeaheadRunDigest(run) {
 const s=canonical(typeaheadRunProjection(run)).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 return createHash('sha256').update(s).digest('hex');
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 try { console.log(typeaheadRunDigest(JSON.parse(readFileSync(0,'utf8')))); } catch(e) { console.error(e.message); process.exitCode=1; }
}
