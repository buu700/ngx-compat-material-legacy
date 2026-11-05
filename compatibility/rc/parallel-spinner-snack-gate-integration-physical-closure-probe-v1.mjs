import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createSpinnerSnackGateContext,spinnerSnackGateDescriptor,spinnerSnackGateMeasurementOk} from '../../scripts/sass-spinner-snack-gate-integration.mjs';
const root=process.cwd(),output=process.argv[2],hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(output&&!existsSync(output));
const packet=JSON.parse(readFileSync('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'));
const manifest=JSON.parse(readFileSync('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
const cut=JSON.parse(readFileSync('compatibility/rc/parallel-spinner-snack-gate-integration-helper-cut-v2.json'));
const paths=cut.lines.find(r=>r.line===line).js_guarded_paths,fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-integration-physical-fixture-')),results=[];
try{
 for(const p of paths){const target=join(fixture,p);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,p),target);}
 const trace=[];let action=null,index=-1,getters=0;
 const read=p=>{const raw=readFileSync(join(fixture,p));trace.push(p);if(action&&trace.length-1===index)action(p,raw);Object.defineProperty(raw,'equals',{get(){getters++;throw Error('caller equals getter');}});return raw;};
 const args={root:fixture,read},subject=createSpinnerSnackGateContext(args);
 results.push({name:'actual constructor accepts exact physical copied closure',pass:true,provided_equals_getters:getters});
 for(const route of ['assertCurrent','descriptor','measurement']){
  const plan=packet.branches[line].cases[0],actual={css:'',css_sha256:hash(''),css_bytes:0,program_sha256:plan.program_sha256,sources:Object.values(packet.branches[line].source_sets)[0]};
  const invoke=()=>route==='assertCurrent'?subject.assertCurrent():route==='descriptor'?spinnerSnackGateDescriptor(subject):spinnerSnackGateMeasurementOk({context:subject,caseId:plan.case_id,actual});
  trace.length=0;const baseline=invoke();assert.notEqual(baseline,false);const order=trace.slice();
  for(const mutation of ['same-final','earlier-member']){
   const trigger=order.at(-1),victim=mutation==='same-final'?trigger:'projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss',before=readFileSync(join(fixture,victim));index=order.length-1;
   let changed=false;action=p=>{assert.equal(p,trigger);action=null;changed=true;writeFileSync(join(fixture,victim),Buffer.concat([before,Buffer.from('\n/* owned copy physical callback test */\n')]));};
   trace.length=0;let rejected=false;try{rejected=invoke()===false;}catch{rejected=true;}assert.ok(changed&&rejected);writeFileSync(join(fixture,victim),before);action=null;assert.notEqual(invoke(),false);
   results.push({name:route+'/'+mutation,rejected,trigger,victim,callback_final_position:index});
  }
 }
 // An as-yet unread source cannot become a trusted candidate-derived baseline.
 const untouched='scripts/sass-spinner-snack-gate-integration.mjs',original=readFileSync(join(fixture,untouched));let first=true;
 const pollutionRead=p=>{const raw=readFileSync(join(fixture,p));if(first){first=false;writeFileSync(join(fixture,untouched),Buffer.concat([original,Buffer.from('\n/* before first helper read */\n')]));}return raw;};
 let rejected=false;try{createSpinnerSnackGateContext({root:fixture,read:pollutionRead});}catch{rejected=true;}assert.ok(rejected);writeFileSync(join(fixture,untouched),original);results.push({name:'first physical image still requires immutable expected pin',rejected});
 assert.equal(getters,0);
 const physical=createSpinnerSnackGateContext({root,read:p=>readFileSync(join(root,p))});physical.assertCurrent();results.push({name:'actual peer package alias policy retained on real root',pass:true});
 const refs=['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass-spinner-snack-bridge-contract.mjs','compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs'].map(path=>{const b=readFileSync(path);return {path,sha256:hash(b),bytes:b.length};});
 writeFileSync(output,JSON.stringify({schema_version:1,role:'Narrow actual NEW helper callback closure replay with copied current inputs',line,results,copied_paths:paths.length,provided_equals_getters:getters,sources:refs,real_inputs_mutated:false,new_compiles:0,actual_packed_or_full_gate:false},null,2)+'\n');console.log(JSON.stringify({line,checks:results.length,getters}));
}finally{rmSync(fixture,{recursive:true});}
