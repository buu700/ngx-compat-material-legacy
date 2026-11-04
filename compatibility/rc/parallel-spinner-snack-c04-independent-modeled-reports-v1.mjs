/** Review-only expected data models. No archived/current producer program executes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spinnerSnackPositionedTokenCss} from '../../scripts/sass-spinner-snack-bridge-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const union=(a,b)=>{const refs=new Map();for(const ref of [...a,...b]){const prior=refs.get(ref.path);if(prior)assert.equal(prior.sha256,ref.sha256,'conflicting expected reference');refs.set(ref.path,ref);}return [...refs.values()].sort((a,b)=>a.path.localeCompare(b.path));};
export function modeledC04Reports(root,source){
 const read=p=>readFileSync(join(root,p)),decode=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(read(p)):read(p));
 const kinds=['theming-inspection','inspection-compatibility','control-m3-theme','remaining-unthemable'],rows=[];
 for(const kind of kinds){
  const path='compatibility/rc/21x-c04-'+kind+'-source-review.json'+(kind==='remaining-unthemable'?'.gz':''),historical=decode(path),current=structuredClone(historical);
  current.current_source_bindings=union(source.bound,historical.current_source_bindings.map(source.qualify));current.current_public_bridge=structuredClone(source.summary);
  if(kind==='theming-inspection'){assert.equal(current.public_override_boundaries,4);current.public_override_boundaries=6;delete current.current_owned_sources_and_loaded_peers_match_retained_measurement;current.historical_owned_sources_and_loaded_peers_match_retained_measurement_except_separate_two_module_successor=true;}
  if(kind==='inspection-compatibility'){current.public_override_boundaries=6;current.historical_public_override_boundaries=4;current.shared_sass_owner=source.qualify(current.shared_sass_owner);}
  if(kind==='control-m3-theme'){
   const ref=historical.current_source_bindings.find(r=>r.path==='compatibility/rc/upstream-sass-inspection-current-scope.json.gz');assert.equal(hash(read(ref.path)),ref.sha256);
   const publicRefs=decode(ref.path).actual.current.loaded_sources.map(r=>({path:'/@angular/'+(r.root===0?'material':'cdk')+'/'+r.path,sha256:r.sha256,bytes:r.bytes}));
   const selected=['progress-spinner-color/custom-full-theme','progress-spinner-color/raw-color-config','progress-spinner-theme/custom-full-theme','progress-spinner-theme/custom-dark-theme','snack-bar-color/custom-full-theme','snack-bar-color/raw-color-config','snack-bar-theme/custom-full-theme','snack-bar-theme/custom-dark-theme','snack-bar-typography/custom-full-theme','snack-bar-typography/raw-typography-config'].map(id=>'mixin-argument/'+id);let count=0;
   for(const row of current.control_measurement.cases){
    row.actual.loaded_sources=row.actual.loaded_sources.map(r=>{if(!r.path.startsWith('/owned/material/'))return r;const qualified=source.qualify({...r,path:'projects/ngx-material-legacy/styles/'+r.path.slice('/owned/material/'.length)});return {...r,sha256:qualified.sha256,bytes:qualified.bytes};});
    if(/^(?:progress-spinner|snack-bar)-(?:color|theme|typography|density)$/.test(row.mixin))row.actual.loaded_sources=union(row.actual.loaded_sources,publicRefs);
    if(selected.includes(row.case_id)){const family=row.mixin.startsWith('snack-bar-')?'snack-bar':'progress-spinner',dimension=row.mixin.slice(family.length+1),css=spinnerSnackPositionedTokenCss({family,dimension,originalCss:row.expected.css});assert.equal(typeof css,'string');row.actual.css=css;row.actual.css_sha256=hash(css);row.actual.css_bytes=Buffer.byteLength(css);row.comparison='finite-current-spinner-snack-positioned-public-tokens';count++;}
   }
   assert.equal(count,10);current.control_measurement.exact_tagged_cases=42;current.control_measurement.current_spinner_snack_bridge_cases=10;
  }
  rows.push({id:kind,kind:'report',historical,current});
 }
 for(const [id,path]of [['legacy-retention','compatibility/rc/21x-c04-modern-control-base-measurement-21x.json'],['token-placement','compatibility/rc/21x-c04-unthemable-token-placement-21-scope.json']]){
  const historical=decode(path),current=structuredClone(historical);
  for(const key of ['input_members','loaded_sources'])current[key]=historical[key].map(source.qualify);
  current.input_members.push(...source.bound.filter(ref=>!current.input_members.some(r=>r.path===ref.path)));current.producer=source.qualify(historical.producer);current.current_public_bridge=structuredClone(source.summary);
  if(id==='legacy-retention'){const snack=current.subjects.find(r=>r.family==='snack-bar');snack.modern_theme_exact_after_MDC_relocation=false;snack.historical_modern_source_exact_after_MDC_relocation=true;snack.separate_current_public_bridge=true;}
  else for(const row of current.families){const spinner=row.family==='progress-spinner';if(spinner)row.modern_theme_exact_tagged_bytes_after_MDC_import_relocation=false;row.historical_modern_source_exact_after_MDC_relocation=spinner;row.separate_current_public_bridge=spinner;}
  rows.push({id,kind:'legacy',historical,current});
 }
 return rows;
}
