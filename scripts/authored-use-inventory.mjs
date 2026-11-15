/** Structural equality with the frozen authored-use roster; not semantic proof. */
export function authoredUseInventory(expected, candidate) {
  const key = row => row && ['file','module','symbol'].every(field => typeof row[field] === 'string' && row[field].length)
    ? JSON.stringify([row.file,row.module,row.symbol]) : null;
  const wanted = new Set(expected.map(key));
  const seen = new Set();
  let duplicates = 0, outside = 0, invalid = 0, open = 0;
  const rows = Array.isArray(candidate?.symbol_uses) ? candidate.symbol_uses : [];
  for (const row of rows) {
    const id = key(row);
    if (!id) { invalid++; continue; }
    if (seen.has(id)) duplicates++;
    seen.add(id);
    if (!wanted.has(id)) outside++;
    if (row.disposition !== 'closed' || row.status !== 'reviewed') open++;
  }
  const missing = [...wanted].filter(id => !seen.has(id)).length;
  const complete = wanted.size === expected.length && !wanted.has(null)
    && Array.isArray(candidate?.symbol_uses) && rows.length === expected.length
    && missing === 0 && duplicates === 0 && outside === 0 && invalid === 0;
  return {complete, expected: expected.length, observed: rows.length, missing, duplicates, outside, invalid, open};
}

/** Exact source-bound review records are required in addition to roster labels.
 * Binding validates evidence identity; complete semantic audit still reviews
 * the recorded conclusions and their independent API/behavior receipts.
 */
export function authoredUseReviewEvidence(candidate, line, readMember, sha256) {
  return evaluateAuthoredUseReview(candidate, line, readMember, sha256, null);
}

function evaluateAuthoredUseReview(candidate, line, readMember, sha256, physicalRetirement, physicalGuard) {
  const rows=Array.isArray(candidate?.symbol_uses)?candidate.symbol_uses:[];
  const insufficient=[];
  let reviewed=0;
  for (const row of rows) {
    if (row.disposition !== 'closed' || row.status !== 'reviewed') continue;
    let valid=false;
    try {
      const ref=row.source_review;
      if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('compatibility/f10/authored-use-reviews/')
          || !/^[0-9a-f]{64}$/.test(ref.sha256 || '')) throw Error('missing review');
      const bytes=readMember(ref.path);
      if (!bytes || !bytes.length || sha256(bytes)!==ref.sha256) throw Error('changed review');
      const body=JSON.parse(bytes.toString('utf8'));
      if (body.schema_version!==1 || body.line!==line || body.status!=='reviewed'
          || !Array.isArray(body.reviews)) throw Error('wrong review scope');
      const matches=body.reviews.filter(r=>r.file===row.file && r.module===row.module && r.symbol===row.symbol);
      if (matches.length!==1) throw Error('missing or ambiguous use');
      const review=matches[0];
      if (!['stable-public-peer','owned-replacement','removed-use','test-only'].includes(review.conclusion)
          || typeof review.decision!=='string' || review.decision.trim().length<80
          || typeof review.reviewer!=='string' || !review.reviewer.trim()
          || !Array.isArray(review.independent_evidence) || !review.independent_evidence.length) throw Error('missing source judgment');
      const source=readMember('projects/ngx-material-legacy/'+row.file);
      if (physicalGuard && !physicalGuard(row,review,ref,source)) throw Error('physical retired-use guard');
      if (!source || !source.length || !/^[0-9a-f]{64}$/.test(review.candidate_source_sha256 || '')
          || sha256(source)!==review.candidate_source_sha256) {
        if (!physicalRetirement || !physicalRetirement(row, review, ref, source)) throw Error('stale source');
      }
      if (review.conclusion==='test-only' && !/(?:^|\/)testing\/|\.spec\.ts$/.test(row.file)) throw Error('production use');
      for (const evidence of review.independent_evidence) {
        if (!evidence || typeof evidence.path!=='string' || (evidence.path===ref.path || evidence.path==='projects/ngx-material-legacy/'+row.file)
            || !/^[0-9a-f]{64}$/.test(evidence.sha256 || '')) throw Error('invalid evidence');
        const data=readMember(evidence.path);
        if (!data || !data.length || sha256(data)!==evidence.sha256) throw Error('missing or changed independent evidence');
      }
      valid=true;
    } catch { /* Unproved closed labels remain failed. */ }
    if (valid) reviewed++;
    else insufficient.push({file:row.file,module:row.module,symbol:row.symbol});
  }
  return {reviewed,insufficient:insufficient.length,insufficient_uses:insufficient};
}

/* Experimental physical-only owner. Disabled until an independently reviewed
 * source-successor packet is adopted. Do not substitute candidate-controlled
 * evidence, root, reader or validator callback for these module-owned pins. */
import {createHash} from 'node:crypto';
import {readFileSync, lstatSync, realpathSync, readdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {inspectBidiEpoch} from './prepare-bidi-physical-epoch.mjs';
const bidiOwnerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bidiSeed = 'compatibility/f10/authored-dependency-inventory-seed.json';
const bidiRoster = 'compatibility/f10/authored-dependency-dispositions.json';
const bidiPriorReview = 'compatibility/f10/authored-use-reviews/public-bidi-module-boundary.json';
const bidiPins = 'scripts/bidi-physical-pins.json';
const bidiBase = '0c25c56282d805aaed351b94a9729303462bfb2a';
const bidiBarrelBase = '8f9f724615ede1b0af0e2c4c347449c5952710e5';
// Mechanical adapter: physical owner verifies every decision against the independent packet.
const bidiSuccessorReview = "compatibility/f10/authored-use-reviews/frozen-public-bidi-retired-source-v1.json";
const bidiSuccessorHash = "7a2f68a993197d6df546f1007d81c6fa0baeb65b5d8872a407ae5c6c9ad0be4b";
const bidiHash = x => createHash('sha256').update(x).digest('hex');
const bidiKey = r => JSON.stringify([r.file,r.module,r.symbol]);
const bidiRetained = new Set(['legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts']);
const bidiEpochPath='compatibility/rc/bidi-product-epoch-f9-v1.json',bidiEpochHash='36b43501c1f3d4b76464f02d1f3e10432d87485ab394dee889de0864500461d9';
const bidiEpochReviewPath='compatibility/rc/bidi-product-epoch-f9-source-review-v1.json',bidiEpochReviewHash='b0cea442074ea95c08eb90d55fb19c895582ed764ee371ff9eb7edefd089098e';
const ngRetiredPath='compatibility/f10/authored-use-reviews/frozen-ngmodule-retired-source-f9-v1.json',ngRetiredHash='3c650e459c3592297655f6d362054eab3697ae17c41697f9e8404b427b1de631';
const bidiEpochCommit='f9aac126ea70fd83731b62305c07fdb993aa3334',commonDeletion='cd716775d7a61d434413b4b7671b27237ceff38c';

let bidiPhysicalActive = false;
let bidiPhysicalReentered = false;
function physicalMember(path, absentAllowed = false) {
  if (typeof path !== 'string' || path.includes('\\')) throw Error('invalid member path');
  const parts = path.split('/'); if (parts.some(x => !x || x==='.' || x==='..')) throw Error('invalid path part');
  let current = bidiOwnerRoot;
  for (let i=0;i<parts.length;i++) {
    current=join(current,parts[i]); let stat;
    try { stat=lstatSync(current); } catch(error) {
      if (error.code==='ENOENT' && absentAllowed) return null;
      throw error;
    }
    if (stat.isSymbolicLink()) throw Error('symlink');
    if (i===parts.length-1) { if (!stat.isFile()) throw Error('not a regular file'); }
    else if (!stat.isDirectory()) throw Error('not a directory');
  }
  return readFileSync(current);
}
function bidiGit(...args) {
  const env={...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
  for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_CONFIG_COUNT','GIT_CONFIG_PARAMETERS','GIT_NAMESPACE','GIT_REPLACE_REF_BASE','GIT_EXEC_PATH','GIT_SHALLOW_FILE'])delete env[k];
  return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:bidiOwnerRoot,env,maxBuffer:16*1024*1024});
}
function need(value,message) {if(!value) throw Error(message);}
function qualifyBidiProductEpoch() {
  const packet=physicalMember(bidiEpochPath),reviewBytes=physicalMember(bidiEpochReviewPath);
  need(bidiHash(packet)===bidiEpochHash&&bidiHash(reviewBytes)===bidiEpochReviewHash,'Bidi epoch DATA changed');
  const expected=JSON.parse(packet),review=JSON.parse(reviewBytes),actual=inspectBidiEpoch({target:bidiEpochCommit,requireHead:false});
  need(isDeepStrictEqual(actual,expected),'Bidi current product epoch changed');
  need(expected.current_source===bidiEpochCommit&&expected.old_source==='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad','Bidi epoch source identity');
  need(review.schema_version===1&&review.line==='main'&&review.status==='reviewed'&&review.source_base===expected.old_source&&review.source_commit===bidiEpochCommit&&review.identity_census_sha256===bidiEpochHash,'Bidi source review identity');
  const changes=expected.transitions.flatMap(row=>row.history.map(step=>({path:row.path,...step})));
  need(changes.length===32&&review.transitions.length===changes.length,'Bidi transition population');
  for(let i=0;i<changes.length;i++){
    const x=changes[i],r=review.transitions[i];
    need(r.path===x.path&&r.commit===x.commit&&r.parent===x.parent&&isDeepStrictEqual(r.before,x.before)&&isDeepStrictEqual(r.after,x.after),'Bidi review transition differs');
    need(bidiHash(bidiGit('diff','--no-ext-diff','--full-index',r.parent,r.commit,'--',r.path))===r.diff_sha256,'Bidi source diff changed');
  }
  need(bidiHash(physicalMember(bidiEpochPath))===bidiEpochHash&&bidiHash(physicalMember(bidiEpochReviewPath))===bidiEpochReviewHash,'late Bidi epoch DATA change');
  return expected;
}
function qualifyBidiPhysical() {
  need(typeof bidiSuccessorReview==='string' && /^[0-9a-f]{64}$/.test(bidiSuccessorHash || ''),'pending source review');
  need(realpathSync(bidiOwnerRoot)===bidiOwnerRoot,'root path is linked');
  const rootStat=lstatSync(bidiOwnerRoot), pinned=physicalMember(bidiPins);
  need(bidiHash(pinned)==='fc4f859358f0d2de44677ef377ddfed9b79e1d2a6557582b1ade7aa8b51b87ef','pins drift');
  const pinBody=JSON.parse(pinned),pins=pinBody.graph_and_evidence;
  const epoch=qualifyBidiProductEpoch();
  const seedBytes=physicalMember(bidiSeed);need(bidiHash(seedBytes)==='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b','seed drift');
  const uses=JSON.parse(seedBytes).symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule');
  need(uses.length===25&&new Set(uses.map(bidiKey)).size===25,'Bidi population');
  const retired=uses.filter(r=>!bidiRetained.has(r.file));need(retired.length===23,'retired population');
  const review=physicalMember(bidiPriorReview);need(bidiHash(review)==='63b2265f6296d54dec0d8f7d76aedece8821348682a46e86158acdce9fe297fc','prior review');
  const prior=JSON.parse(review);need(prior.line==='main'&&prior.status==='reviewed'&&prior.reviews.length===25,'prior review scope');
  const successorBytes=physicalMember(bidiSuccessorReview);need(bidiHash(successorBytes)===bidiSuccessorHash,'successor drift');
  const successor=JSON.parse(successorBytes);need(successor.line==='main'&&successor.status==='reviewed'&&successor.schema_version===1&&successor.reviews.length===23,'successor scope');
  const reviewed=JSON.parse(physicalMember('compatibility/rc/qualification/frozen-public-bidi-source-v2/reviewed-per-use.json'));need(reviewed.status==='reviewed-finite-source-dispositions'&&reviewed.line==='main'&&reviewed.reviews.length===25,'independent per-use packet');
  need(new Set(successor.reviews.map(bidiKey)).size===23,'duplicate successor key');
  for(const row of successor.reviews) {
    need(Array.isArray(row.independent_evidence)&&row.independent_evidence.length>0,'missing successor evidence');
    for(const ref of row.independent_evidence) need(ref&&pins[ref.path]===ref.sha256,'unpinned successor evidence');
  }
  const pkg=JSON.parse(physicalMember('projects/ngx-material-legacy/package.json'));
  need(/^22\./.test(pkg.version)&&['@angular/core','@angular/cdk','@angular/material'].every(x=>pkg.peerDependencies[x]==='^22.1.7'),'peer line');
  // All paths and hashes are fixed in module-pinned data, never supplied by the roster.
  for(const [path,sha] of Object.entries(pins)) {if(Object.hasOwn(pinBody.product_ts_snapshot,path)){need(epoch.old_snapshot[path]===sha,'historic evidence drift '+path);need(bidiHash(physicalMember(path))===epoch.current_snapshot[path],'current product evidence drift '+path);}else need(bidiHash(physicalMember(path))===sha,'physical evidence drift '+path);}
  const capsule=JSON.parse(physicalMember('compatibility/rc/material-public-subjects.json'));
  const main=capsule.subjects.find(s=>s.line==='main');need(main&&['@angular/core','@angular/cdk','@angular/material'].every(n=>main.packages.some(p=>p.name===n&&p.version==='22.1.7'&&p.archive_sri_verified===true)),'peer capsule');
  need(pinBody.peer_declarations.length===2,'peer declaration population');
  for(const decl of pinBody.peer_declarations) {const matches=main.members.filter(m=>m.package==='@angular/cdk'&&m.module_path===decl.module_path);need(matches.length===1&&JSON.stringify(matches[0])===JSON.stringify(decl),'peer declaration manifest');need(bidiHash(gunzipSync(physicalMember(decl.path)))===decl.sha256,'peer declaration bytes');}
  bidiGit('merge-base','--is-ancestor',bidiBase,'HEAD');
  bidiGit('merge-base','--is-ancestor',bidiBarrelBase,'HEAD');
  const checkGit=(commit,path,sha)=>need(bidiHash(bidiGit('show',commit+':'+path))===sha,'Git preimage '+path);
  checkGit(bidiBase,'tests/bidi_module_public_probe.mjs','3a4be9e93c62aa560fd297d0e81159fe587f877b8a12cc6e9eaafd1b1c73d9d1');
  checkGit(bidiBase,'tests/test_bidi_module_public.py','7e7ac772408fb0826a5da28b0d3ff2d73cc8132a40bb65b00b034e3c35caa936');
  need(pinBody.historic_graph.length===44,'historic graph population');
  for(const prior of pinBody.historic_graph) checkGit(prior.commit,prior.path,prior.sha256);
  const graph=Object.keys(pins).filter(p=>p.startsWith('projects/ngx-material-legacy/')&&(/\/public-api\.ts$/.test(p)||/\/[^/]*-module\.ts$/.test(p)));
  need(graph.length===46,'graph population');
  const productCommit='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad';
  need(pinBody.product_ts_source_commit===productCommit,'product TS epoch');
  bidiGit('merge-base','--is-ancestor',productCommit,'HEAD');
  // The fresh epoch inspector reconstructs every historical Git blob, the
  // physical current tree and all original Bidi/core censuses. Keep each old
  // comparison exact while using current bytes only for the f9 afterimage.
  need(isDeepStrictEqual(epoch.old_snapshot,pinBody.product_ts_snapshot),'historical TS snapshot changed');
  need(isDeepStrictEqual(epoch.old_census.graph,pinBody.graph_census),'graph census');
  need(isDeepStrictEqual(epoch.old_census.bidi,pinBody.bidi_import_census),'bidi import census');
  need(isDeepStrictEqual(epoch.old_census.core,pinBody.core_import_census),'core import census');
  // Fixed graph afterimages are backed by the historical successor and surface reviews in pins.
  for(const row of uses) {
    const old=prior.reviews.filter(r=>bidiKey(r)===bidiKey(row));need(old.length===1,'old key');
    const individually=reviewed.reviews.filter(r=>bidiKey(r)===bidiKey(row));need(individually.length===1,'independent key');
    const oldEvidence=old[0].independent_evidence;
    need(Array.isArray(oldEvidence)&&oldEvidence.length===8&&new Set(oldEvidence.map(x=>x.path)).size===8,'prior evidence population');
    for(const ref of oldEvidence) {
      if(ref.path==='tests/bidi_module_public_probe.mjs') need(ref.sha256==='3a4be9e93c62aa560fd297d0e81159fe587f877b8a12cc6e9eaafd1b1c73d9d1','old probe pin');
      else if(ref.path==='tests/test_bidi_module_public.py') need(ref.sha256==='7e7ac772408fb0826a5da28b0d3ff2d73cc8132a40bb65b00b034e3c35caa936','old test pin');
      else need(pins[ref.path]===ref.sha256,'prior evidence drift');
    }
    const path='projects/ngx-material-legacy/'+row.file;checkGit(bidiBase,path,old[0].candidate_source_sha256);
    if(bidiRetained.has(row.file)) need(bidiHash(physicalMember(path))===old[0].candidate_source_sha256,'retained source drift');
    else {need(physicalMember(path,true)===null,'retired file restored'); const matching=successor.reviews.filter(r=>bidiKey(r)===bidiKey(row));need(matching.length===1&&matching[0].conclusion==='removed-use'&&matching[0].candidate_source_sha256===old[0].candidate_source_sha256,'successor key');for(const field of ['file','module','symbol','conclusion','reviewer','decision'])need(matching[0][field]===individually[0][field],'unreviewed successor decision');need(individually[0].historical_source.sha256===old[0].candidate_source_sha256,'reviewed source mismatch');}
  }
  const roster=JSON.parse(physicalMember(bidiRoster));const selected=roster.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule');
  need(selected.length===25&&new Set(selected.map(bidiKey)).size===25&&uses.every(u=>selected.some(r=>bidiKey(r)===bidiKey(u))),'roster population');
  for(const row of uses) {const r=selected.find(x=>bidiKey(x)===bidiKey(row)),priorRow=reviewed.reviews.find(x=>bidiKey(x)===bidiKey(row)).prior_row;if(!bidiRetained.has(row.file)){need(r.source_review?.path===bidiSuccessorReview&&r.source_review?.sha256===bidiSuccessorHash,'not successor-bound');need(isDeepStrictEqual({...r,source_review:priorRow.source_review},priorRow),'other retired row metadata changed');}}
  need(lstatSync(bidiOwnerRoot).ino===rootStat.ino&&lstatSync(bidiOwnerRoot).dev===rootStat.dev&&realpathSync(bidiOwnerRoot)===bidiOwnerRoot,'root changed');
  return retired.map(bidiKey);
}
function qualifyNgmodulePhysical() {
  const epoch=qualifyBidiProductEpoch(),seedBytes=physicalMember(bidiSeed),roster=JSON.parse(physicalMember(bidiRoster));
  need(bidiHash(seedBytes)==='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b','NgModule seed changed');const seed=JSON.parse(seedBytes),oldRoster=JSON.parse(bidiGit('show',bidiEpochCommit+':'+bidiRoster));
  const bytes=physicalMember(ngRetiredPath);need(bidiHash(bytes)===ngRetiredHash,'NgModule retirement review changed');
  const packet=JSON.parse(bytes),priorPath='compatibility/f10/authored-use-reviews/historical-menu-requalified-class-decorator-boundaries.json';
  need(packet.schema_version===1&&packet.line==='main'&&packet.status==='reviewed'&&packet.verified_source_commit===bidiEpochCommit&&packet.reviews.length===23,'NgModule retirement review scope');
  const priorBytes=physicalMember(priorPath);need(bidiHash(priorBytes)==='0a140a0de168616e715702d043102d0de51c0f8540857b8200ee8047a1abfb0b','NgModule prior review changed');const prior=JSON.parse(priorBytes);
  const retiredFiles=seed.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule'&&!bidiRetained.has(r.file)).map(r=>r.file).sort();
  const uses=seed.symbol_uses.filter(r=>r.module==='@angular/core'&&r.symbol==='NgModule'&&retiredFiles.includes(r.file));
  need(uses.length===23&&new Set(uses.map(bidiKey)).size===23&&new Set(packet.reviews.map(bidiKey)).size===23,'NgModule key population');
  need(isDeepStrictEqual(uses.map(r=>r.file).sort(),retiredFiles),'NgModule and Bidi retired file population differs');
  const expectedBytes=Buffer.byteLength(bytes),committedRefs=new Map();
  for(const use of uses){
    const path='projects/ngx-material-legacy/'+use.file,match=packet.reviews.filter(r=>bidiKey(r)===bidiKey(use));need(match.length===1,'NgModule review key');const r=match[0];
    need(r.conclusion==='removed-use'&&r.candidate_source_sha256==='a36d4381d828eccbf40815dcac053048a054b3fa6ce90f6fb41b58b04183c8ee','NgModule old source identity');
    need(r.removal_commit===commonDeletion&&r.historic_source.commit===bidiBase&&r.removal_parent.commit==='9dba1e02b4ed9bc94ed94a3e5010e15e8e926fef','NgModule historical cut');
    for(const cut of [bidiBase,r.removal_parent.commit])need(bidiHash(bidiGit('show',cut+':'+path))===r.candidate_source_sha256,'NgModule historical source changed');
    need(bidiGit('rev-list','--parents','-n','1',commonDeletion).toString().trim()===commonDeletion+' '+r.removal_parent.commit,'NgModule deletion parent');
    need(bidiGit('log','--format=%H',bidiBase+'..'+bidiEpochCommit,'--',path).toString().trim()===commonDeletion,'NgModule source history changed');
    need(bidiGit('ls-tree','-z',bidiEpochCommit,'--',path).length===0&&physicalMember(path,true)===null,'NgModule retired path returned');
    const old=prior.reviews.filter(x=>bidiKey(x)===bidiKey(use));need(old.length===1&&isDeepStrictEqual(r.prior_complete_case,old[0]),'NgModule previous review changed');
    need(r.prior_review.path===priorPath&&r.prior_review.sha256===bidiHash(priorBytes),'NgModule previous review binding');
    need(Array.isArray(r.independent_evidence)&&r.independent_evidence.length>=5,'NgModule evidence missing');
    for(const ref of r.independent_evidence){need(ref&&typeof ref.path==='string'&&/^[0-9a-f]{64}$/.test(ref.sha256||''),'NgModule evidence identity');const current=physicalMember(ref.path);need(bidiHash(current)===ref.sha256,'NgModule evidence changed '+ref.path);if(!committedRefs.has(ref.path))committedRefs.set(ref.path,bidiHash(bidiGit('show',bidiEpochCommit+':'+ref.path)));need(committedRefs.get(ref.path)===ref.sha256,'NgModule committed evidence changed '+ref.path);}
    const now=roster.symbol_uses.filter(x=>bidiKey(x)===bidiKey(use));need(now.length===1,'NgModule roster key');
    const before=r.prior_roster_row,oldRows=oldRoster.symbol_uses.filter(x=>bidiKey(x)===bidiKey(use));need(oldRows.length===1&&isDeepStrictEqual(before,oldRows[0]),'NgModule committed prior roster changed');const history=before.source_review_history||[];
    need(isDeepStrictEqual(now[0].source_review,{path:ngRetiredPath,sha256:ngRetiredHash,bytes:expectedBytes}),'NgModule review route');
    const {source_review:_old,source_review_history:_oldHistory,...oldRest}=before,{source_review:_new,source_review_history:newHistory,...newRest}=now[0];
    need(isDeepStrictEqual(oldRest,newRest)&&Array.isArray(newHistory)&&newHistory.length===history.length+1&&isDeepStrictEqual(newHistory.slice(0,-1),history)&&isDeepStrictEqual(newHistory.at(-1).prior_source_review,before.source_review),'NgModule roster history changed');
  }
  need(isDeepStrictEqual(epoch,qualifyBidiProductEpoch()),'NgModule epoch changed during checks');
  need(bidiHash(physicalMember(ngRetiredPath))===ngRetiredHash,'late NgModule review change');
  return uses.map(bidiKey);
}
/** Production-only physical frozen roster entry point. No external owner inputs. */
export function authoredUseReviewEvidencePhysical() {
  if(bidiPhysicalActive) {bidiPhysicalReentered=true;throw Error('reentrant physical Bidi evidence');}
  bidiPhysicalActive=true;
  bidiPhysicalReentered=false;
  try {
    need(realpathSync(bidiOwnerRoot)===bidiOwnerRoot,'linked physical owner root');
    const anchor=lstatSync(bidiOwnerRoot);
    const rosterBytes=physicalMember(bidiRoster),seedBytes=physicalMember(bidiSeed);
    const roster=JSON.parse(rosterBytes),seed=JSON.parse(seedBytes);
    if(bidiHash(seedBytes)!=='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b') throw Error('frozen seed drift');
    const read=p=>physicalMember(p,true);
    const retiredFiles=new Set(seed.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule'&&!bidiRetained.has(r.file)).map(r=>r.file));
    const protectedKeys=new Set(seed.symbol_uses.filter(r=>retiredFiles.has(r.file)&&((r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule')||(r.module==='@angular/core'&&r.symbol==='NgModule'))).map(bidiKey));
    need(protectedKeys.size===46,'physical retired key population');
    const guard=(row,review,ref,source)=>!protectedKeys.has(bidiKey(row))||source===null;
    const ordinary=()=>evaluateAuthoredUseReview(roster,'main',read,bidiHash,null,guard);
    let bidiKeys=null,ngKeys=null;
    try {bidiKeys=qualifyBidiPhysical();} catch { /* Keep unproved Bidi rows insufficient. */ }
    try {ngKeys=qualifyNgmodulePhysical();} catch { /* Keep unproved NgModule rows insufficient. */ }
    const evaluate=()=>{const bidiSet=new Set(bidiKeys||[]),ngSet=new Set(ngKeys||[]);return evaluateAuthoredUseReview(roster,'main',read,bidiHash,(row,review,ref,source)=>source===null&&review.conclusion==='removed-use'&&((bidiSet.has(bidiKey(row))&&ref.path===bidiSuccessorReview&&ref.sha256===bidiSuccessorHash)||(ngSet.has(bidiKey(row))&&ref.path===ngRetiredPath&&ref.sha256===ngRetiredHash)),guard);};
    let evidence=evaluate(),lost=false;
    if(bidiKeys)try{need(isDeepStrictEqual(qualifyBidiPhysical(),bidiKeys),'changed final Bidi population');}catch{bidiKeys=null;lost=true;}
    if(ngKeys)try{need(isDeepStrictEqual(qualifyNgmodulePhysical(),ngKeys),'changed final NgModule population');}catch{ngKeys=null;lost=true;}
    if(lost){
      evidence=evaluate();
      try{if(bidiKeys)need(isDeepStrictEqual(qualifyBidiPhysical(),bidiKeys),'changed recovery Bidi population');if(ngKeys)need(isDeepStrictEqual(qualifyNgmodulePhysical(),ngKeys),'changed recovery NgModule population');}
      catch{bidiKeys=null;ngKeys=null;evidence=ordinary();}
    }
    need(realpathSync(bidiOwnerRoot)===bidiOwnerRoot&&lstatSync(bidiOwnerRoot).dev===anchor.dev&&lstatSync(bidiOwnerRoot).ino===anchor.ino,'physical owner root changed');
    need(bidiHash(physicalMember(bidiRoster))===bidiHash(rosterBytes),'roster changed during read');
    need(bidiHash(physicalMember(bidiSeed))===bidiHash(seedBytes),'seed changed during read');
    need(!bidiPhysicalReentered,'reentered physical Bidi evidence transaction');
    return {status:roster.status||'missing',sha256:bidiHash(rosterBytes),inventory:authoredUseInventory(seed.symbol_uses,roster),review_evidence:evidence};
  } finally {bidiPhysicalActive=false;bidiPhysicalReentered=false;}
}
