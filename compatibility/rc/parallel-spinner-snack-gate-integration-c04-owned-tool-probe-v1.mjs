import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
const roots=[['21.x',process.cwd()],['main','/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy']],hash=b=>createHash('sha256').update(b).digest('hex'),lines=[];
const output=process.argv[2];assert.ok(output&&!existsSync(output));
for(const[line,root]of roots){
 let calls=0;const source=spinnerSnackC04Source({root,read:path=>{calls++;return readFileSync(join(root,path));}});assert.equal(source.bridge.line,line);
 const tool='scripts/sass-api-regressions.mjs',raw=readFileSync(join(root,tool)),good={path:tool,sha256:hash(raw),bytes:raw.length};
 assert.deepEqual(source.qualify(good),good);
 assert.throws(()=>source.qualify({...good,sha256:'0'.repeat(64)}),/unknown owned C04 tool reference/);
 const product=source.bridge.transitions[0];assert.throws(()=>source.qualify({path:product.path,sha256:'0'.repeat(64),bytes:product.current.bytes}));
 const other={path:'unowned-marker.scss',sha256:'0'.repeat(64),bytes:1},before=calls;assert.equal(source.qualify(other),other);assert.equal(calls,before);
 source.assertCurrent();
 lines.push({line,checks:['actual physical constructor/current guard','known tool current identity qualifies','registered tool foreign hash rejects','product foreign hash rejects','non-owned metadata unchanged with zero supplied callbacks'],source:{path:'scripts/sass-spinner-snack-c04-source.mjs',sha256:hash(readFileSync(join(root,'scripts/sass-spinner-snack-c04-source.mjs'))),bytes:readFileSync(join(root,'scripts/sass-spinner-snack-c04-source.mjs')).length}});
}
writeFileSync(output,JSON.stringify({schema_version:1,role:'Final actual C04 known-tool rejection tightening supplement',lines,new_compiles:0,actual_gate_producer_packed_or_owner:false,real_inputs_mutated:false},null,2)+'\n');console.log(JSON.stringify(lines.map(r=>({line:r.line,checks:r.checks.length}))));
