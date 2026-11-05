/** Exact NEW helper metadata controls. Never compiles Sass or changes held gates. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {createSpinnerSnackGateContext,spinnerSnackGateDescriptor,spinnerSnackGateAggregateMatch} from '../../scripts/sass-spinner-snack-gate-integration.mjs';
const root='/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy',fixed=process.argv[2]==='fixed',read=path=>readFileSync(join(root,path));
const packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json')),branch=packet.branches['21.x'],archive=JSON.parse(read('compatibility/rc/parent-spinner-snack-aggregate-integration-21-v1.json')),fixture=JSON.parse(read('tests/sass_default_aggregate_fixture.json')),catalog=JSON.parse(read('fixtures/sass/default-aggregate-contracts.json'));
const hash=b=>createHash('sha256').update(b).digest('hex'),row=archive.rows[0],e=catalog.cases[row.case_id],stored=fixture.peers[e.profile+'-21.x'],peer={...stored,sources:catalog.peer_inputs['21.x'].sources};delete peer.source_set;
let hook=null;const callback=path=>{if(hook){const fn=hook;hook=null;fn();}return read(path);};
const context=createSpinnerSnackGateContext({root,read:callback}),descriptor=spinnerSnackGateDescriptor(context);
const actual={css:row.current.css,css_sha256:row.current.css_sha256,css_bytes:row.current.css_bytes,program_sha256:row.current.logical_program_sha256,line:'21.x',sass_version:branch.compiler,sources:structuredClone(Object.values(branch.source_sets)[0])};
const model=()=>({context,caseId:row.case_id,actual:structuredClone(actual),companion:{classification:'conforming-current-companion',contract:'historical-default-aggregate-with-qualified-public-members',peer:structuredClone(peer)},descriptor:structuredClone(descriptor)});
assert.ok(spinnerSnackGateAggregateMatch(model()));
const results=[];
for(const[name,mutate]of Object.entries({outer_actual:a=>a.actual={foreign:true},outer_case:a=>a.caseId='foreign',outer_context:a=>a.context={},outer_descriptor:a=>a.descriptor={foreign:true}})){
 const args=model();hook=()=>mutate(args);const accepted=spinnerSnackGateAggregateMatch(args);results.push({name,accepted});if(fixed)assert.equal(accepted,false,name);
}
for(const[name,mutate]of Object.entries({symbol:a=>a.actual[Symbol('foreign')]='metadata',array_subclass:a=>Object.setPrototypeOf(a.actual.sources,class SourceRows extends Array {}.prototype),json_proto:a=>{const old={css:a.actual.css,css_sha256:a.actual.css_sha256,css_bytes:a.actual.css_bytes};delete a.actual.css;delete a.actual.css_sha256;delete a.actual.css_bytes;Object.defineProperty(a.actual,'__proto__',{value:old,enumerable:true,writable:true,configurable:true});}})){
 const args=model();mutate(args);const accepted=spinnerSnackGateAggregateMatch(args);results.push({name,accepted});if(fixed)assert.equal(accepted,false,name);
}
const options={root,read:undefined};options.read=path=>{options.root='/tmp/foreign-root';return read(path);};let factoryAccepted;
try{createSpinnerSnackGateContext(options);factoryAccepted=true;}catch{factoryAccepted=false;}
results.push({name:'factory_outer_root',accepted:factoryAccepted});if(fixed)assert.equal(factoryAccepted,false);
const output='compatibility/rc/parallel-spinner-snack-gate-integration-argument-integrity-'+(fixed?'fixed-v1':'before-v1')+'.json';
writeFileSync(join(root,output),JSON.stringify({schema_version:1,role:'Source-only exact metadata/outer-argument controls',helper_sha256:hash(read('scripts/sass-spinner-snack-gate-integration.mjs')),results,fresh_compiles:0,held_gate_edits:false},null,2)+'\n');console.log(JSON.stringify({output,results}));
