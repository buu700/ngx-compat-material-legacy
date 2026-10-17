/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite inherited main-only MediaMatcher contract;21.x remains unresolved. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {mediaMatcherPeerRequirements} from './media-matcher-peer-identity.mjs';
export const MEDIA_MATCHER_SHA="231f94f5557bb58afc0070585688b3014d541eb2";
export const MEDIA_MATCHER_KIND='browser-required-individual-media-matcher';
export const MEDIA_MATCHER_CASE_ID='browser-diagnostic/media-matcher/native-brace-filter';
const patch='a89ab37d4dd3819592854002413e12b1840bb047195528455ea90cea8cbcdc44';
const attemptedRule="@media (min-width: 0px) html --closeout-peer-query-css-probe: 1 /* {body{ }}";
const members=[
  'scripts/upstream-media-matcher-evidence.mjs','scripts/media-matcher-peer-identity.mjs',
  'scripts/check-upstream-audit-disposition.mjs','scripts/upstream-browser-run-evidence.mjs','scripts/upstream-packed-run-evidence.mjs',
  'scripts/browser-matrix-acceptance.mjs','scripts/browser-matrix-roster.mjs','scripts/browser-required-cells.mjs','scripts/browser-surface-families.mjs',
  'scripts/rc-verify.py','scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/full-verify.json','compatibility/rc/matrices/library-exports.json',
  'testing/legacy-runner/historical-inventory.json','projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts',
  'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts','projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
  'projects/ngx-material-legacy/legacy-core/internal/common-module.ts',
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const demand=(value,message)=>{if(!value)throw Error(message);};
export function mediaMatcherRequirements(sha,line){
  const peer=mediaMatcherPeerRequirements(line);
  return sha===MEDIA_MATCHER_SHA&&line==='main'?{sha,patch,kind:'native-public-exact-brace-filter',case_ids:[MEDIA_MATCHER_CASE_ID],
    runtimes:['zoneful','zoneless'],members:[...members,...peer.members.map(row=>row.path)],
    installed_member:{package:peer.package,version:peer.version,path:peer.members[2].path,sha256:peer.members[2].sha256,member:'MediaMatcher.matchMedia / createEmptyStyleRule'},
    public_declaration:{path:peer.members[3].path,sha256:peer.members[3].sha256},consumer_peer:peer.consumer_peer}:null;
}
export function requiresMediaMatcher(entry,proof){
  return entry?.sha===MEDIA_MATCHER_SHA||proof?.proof_kind===MEDIA_MATCHER_KIND||(object(proof)&&Object.hasOwn(proof,'media_matcher_behavior'));
}
/** Exact existing reversible native probe. An absent insertion is not proof of sanitization. */
export function mediaMatcherNativeOkay(raw){
  return object(raw)&&raw.available===true&&raw.valid_query_matches===true&&raw.unsafe_query_matches===false
    &&raw.before_marker===''&&raw.after_marker===''&&raw.cleanup_marker===''
    &&raw.unsafe_query_css_injected===false&&raw.removed_probe_rules===0&&raw.error===null
    &&isDeepStrictEqual(raw.attempted_rules,[attemptedRule]);
}
export function validateMediaMatcher({root,entry,proof,request}){
  try{
    const line=request?.line??proof?.affected_branches?.[0],definition=mediaMatcherRequirements(entry?.sha,line),scope=proof?.media_matcher_behavior;
    demand(definition&&entry.final_disposition==='inherited'&&proof?.proof_kind===MEDIA_MATCHER_KIND&&proof.diff_sha256===patch,'unregistered inherited MediaMatcher subject;21.x security review remains open');
    demand(object(scope)&&scope.kind===definition.kind&&isDeepStrictEqual(scope.runtimes,definition.runtimes)&&isDeepStrictEqual(scope.case_ids,definition.case_ids),'wrong MediaMatcher native scope');
    demand(isDeepStrictEqual(proof.affected_branches,[line])&&isDeepStrictEqual(proof.installed_member,definition.installed_member)&&isDeepStrictEqual(proof.public_declaration,definition.public_declaration),'wrong MediaMatcher installed peer');
    demand(proof.reachable_behavior?.kind==='executed-delegation'&&proof.reachable_behavior.id===MEDIA_MATCHER_CASE_ID,'wrong MediaMatcher delegation');
    demand(Array.isArray(scope.source_members)&&scope.source_members.length===definition.members.length
      &&new Set(scope.source_members.map(row=>row?.path)).size===definition.members.length
      &&scope.source_members.every(row=>definition.members.includes(row?.path)),'incomplete MediaMatcher source scope');
    for(const member of scope.source_members)demand(/^[0-9a-f]{64}$/.test(member.sha256)&&hash(readEvidenceMember(root,member.path))===member.sha256,'stale MediaMatcher source member');
    for(const member of mediaMatcherPeerRequirements(line).members){
      const stored=readEvidenceMember(root,member.path);demand(hash(stored)===member.stored_sha256,'wrong authenticated MediaMatcher stored bytes');
      const raw=gunzipSync(stored);demand(raw.length===member.bytes&&hash(raw)===member.sha256,'wrong authenticated MediaMatcher source bytes');
    }
    const browser=validateBrowserMatrixRun({root,request});demand(browser.ok,browser.detail);
    for(const runtime of definition.runtimes){
      const raw=browser.observation.closeout_diagnostics[runtime].observation;
      demand(isDeepStrictEqual(raw.media_matcher_peer,definition.consumer_peer),'wrong '+runtime+' actually installed MediaMatcher peer');
      demand(mediaMatcherNativeOkay(raw.peer_media_matcher),'insufficient '+runtime+' native MediaMatcher observations');
    }
    return {ok:true,detail:'Both native runtimes verify the exact public minimum-peer brace-filter behavior and installed identities in this complete current same-artifact packed/browser run.21.x, other payloads/engines, owned input reachability, CSP and full security/G11 remain separate.',
      invocation_id:browser.invocation_id,output:browser.output,library:browser.library,packed_consumer:browser.packed_consumer,required_runtimes:definition.runtimes,required_cases:definition.case_ids};
  }catch(error){return {ok:false,detail:error.message};}
}
