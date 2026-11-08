import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync,renameSync,symlinkSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareInventoryReferenceMetadata as make,prepareInventoryReferenceSourceMetadata as source,INVENTORY_REFERENCE_LEDGER as ledger} from '../scripts/inventory-reference-proposal.mjs';
const base=process.cwd(), root=mkdtempSync(join(tmpdir(),'inventory-parent-control-'));
try {
 const bootstrap=source({root:base});const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:base,encoding:'utf8'}).trim();writeFileSync(join(root,'.git'),'gitdir: '+gitDir+'\n');
 for(const ref of bootstrap.bound){const dest=join(root,ref.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(base,ref.path),dest)}
 const lp=join(root,ledger);mkdirSync(dirname(lp),{recursive:true});writeFileSync(lp,gunzipSync(readFileSync(join(base,'compatibility/rc/c04-inventory-reference-proposal-after.json.gz'))));
 const dir=join(root,'projects/ngx-material-legacy/legacy-select'), moved=dir+'-moved';let armed=false,triggered=false;
 const read=p=>{const raw=readFileSync(join(root,p));if(armed&&!triggered&&p==='projects/ngx-material-legacy/package.json'){triggered=true;renameSync(dir,moved);symlinkSync(moved,dir,'dir')}return raw};
 for(const mode of ['construction','assertCurrent','verifyAfter']){
  armed=false;triggered=false;const subject=mode==='construction'?null:make({root,read});armed=true;
  try {assert.throws(()=>mode==='construction'?make({root,read}):mode==='assertCurrent'?subject.assertCurrent():subject.verifyAfter(subject.after));assert.equal(triggered,true)}
  finally {armed=false;if(triggered){unlinkSync(dir);renameSync(moved,dir)}}
  if(subject)subject.assertCurrent();
 }
 console.log('PASS same-byte parent symlink retarget rejected at construction/assert/verify and recovery');
} finally {rmSync(root,{recursive:true,force:true})}
