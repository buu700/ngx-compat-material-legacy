import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,symlinkSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]);
const {createStepperSixthSource,stepperSixthLoadedImage}=await import(pathToFileURL(resolve(root,'scripts/stepper-sixth-source.mjs')).href);
const read=path=>readFileSync(resolve(root,path));
const source=createStepperSixthSource({root});
const alias=root+'-alias';try{symlinkSync(root,alias,'dir');assert.throws(()=>createStepperSixthSource({root:alias}),/linked Stepper root/);}finally{unlinkSync(alias);}
assert.equal(source.bound.length,293);
assert.equal(source.bound[0].sha256,stepperSixthLoadedImage.sha256);
const {transition,source_set}=source;
const key=createHash('sha256').update(JSON.stringify(source_set.rows)).digest('hex');
assert.equal(key,source_set.v3_current_sha256);
assert.equal(source.qualify(transition.before).sha256,transition.current.sha256);
assert.equal(source.qualify(transition.current).sha256,transition.current.sha256);
assert.equal(source.qualify({path:'elsewhere.scss',sha256:'0'.repeat(64)}),null);
assert.throws(()=>source.qualify({path:transition.path,sha256:'0'.repeat(64)}));
assert.throws(()=>source.qualify({path:transition.path,sha256:transition.before.sha256,bytes:1}));
let getterCalls=0;assert.throws(()=>source.qualify({get path(){getterCalls++;return transition.path;},sha256:transition.before.sha256}));assert.equal(getterCalls,0);
assert.throws(()=>createStepperSixthSource({root,read:()=>Buffer.from('wrong')}));
for(const path of [transition.path,'projects/ngx-material-legacy/styles/stepper/_stepper-theme.scss',
  'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',
  'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json','scripts/stepper-sixth-source.mjs']){
  const file=resolve(root,path),prior=read(path);
  try{writeFileSync(file,Buffer.concat([prior,Buffer.from('\n// changed\n')]));assert.throws(()=>source.assertPhysical());if(path===transition.path)assert.throws(()=>source.qualify(transition.before));assert.throws(()=>createStepperSixthSource({root}));}
  finally{writeFileSync(file,prior);}
  source.assertCurrent();
}
const earlier='projects/ngx-material-legacy/_index.scss',earlierFile=resolve(root,earlier),prior=read(earlier);
const last=source.bound.at(-1).path;let armed=false;
const guarded=createStepperSixthSource({root,read:path=>{const data=read(path);if(armed&&path===last){armed=false;writeFileSync(earlierFile,Buffer.concat([prior,Buffer.from('\n// late\n')]));}return data;}});
try{armed=true;assert.throws(()=>guarded.assertCurrent());}
finally{writeFileSync(earlierFile,prior);}
guarded.assertCurrent();
console.log(JSON.stringify({line:source.line,transition,source_set_sha256:source_set.v3_current_sha256,bound_count:source.bound.length}));
