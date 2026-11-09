/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {assessDialogPadding,PEER_PADDING_EXPECTATIONS,LEGACY_PADDING_EXPECTATIONS,WRONG_VALUE_CSS} from '../scripts/dialog-padding-fixture-contract.mjs';
const clone=structuredClone;
function frame(roles,legacy=false){return {found:true,paneCount:1,bodyOverlay:true,outsideNested:true,peerActionContainer:legacy?null:true,peerAdjacent:legacy?null:true,legacyHasNoMdcDialog:legacy?true:null,themePrimary:'rgb(1, 2, 3)',roles:clone(roles)}}
function fixture(){const legacy={...clone(LEGACY_PADDING_EXPECTATIONS),input:{padding:{top:'1px',right:'2px',bottom:'1px',left:'2px'},margin:{top:'0px',right:'0px',bottom:'0px',left:'0px'}}};return {'current-baseline':frame(PEER_PADDING_EXPECTATIONS.baseline),'current-optin':frame(PEER_PADDING_EXPECTATIONS.optin),'legacy-baseline':frame(legacy,true),'legacy-optin':frame(legacy,true)}}
test('all expected boxes and wrong-value mutation are mandatory',()=>{const good=fixture(),bad=clone(good);bad['current-optin'].roles.surface.padding.left='23px';assert.deepEqual(assessDialogPadding(good,bad),{frame:true,peer:true,legacy:true,mutation:true,pass:true});assert.match(WRONG_VALUE_CSS,/padding-left:\s*23px\s*!important/);
 const controls=[x=>delete x['current-optin'].roles.input,x=>x['current-optin'].roles.surface.padding.left='23px',x=>x['current-optin'].roles.content.margin.right='0px',x=>x['current-optin'].roles.title.margin.top='0px',x=>x['current-optin'].roles.actions.margin.bottom='0px',x=>x['current-baseline'].roles.input.padding.left='2px',x=>x['current-optin'].bodyOverlay=false,x=>x['current-optin'].outsideNested=false,x=>x['current-optin'].themePrimary='',x=>x['current-optin'].peerAdjacent=false,x=>x['legacy-optin'].legacyHasNoMdcDialog=false,x=>x['legacy-optin'].roles.content.margin.left='0px',x=>x['legacy-optin'].roles.input.padding.left='3px'];
 for(const mutate of controls){const copy=clone(good);mutate(copy);assert.equal(assessDialogPadding(copy,bad).pass,false);}
 const notWrong=clone(good);assert.equal(assessDialogPadding(good,notWrong).pass,false);const unrelated=clone(good);unrelated['current-optin'].roles.surface.padding.left='23px';unrelated['current-baseline'].roles.surface.padding.left='23px';assert.equal(assessDialogPadding(good,unrelated).pass,false);const legacyBleed=clone(bad);legacyBleed['legacy-optin'].roles.surface.padding.left='23px';assert.equal(assessDialogPadding(good,legacyBleed).pass,false);
});

test('zero-argument direct CSS comparison rejects a wrong value and empty output', async()=>{
 const {assessZeroArgCss}=await import('../scripts/dialog-padding-tagged-reference.mjs');
 const tagged='.mat-mdc-dialog-surface {\n  padding: 24px;\n}';
 assert.equal(assessZeroArgCss(tagged,tagged),true);
 assert.equal(assessZeroArgCss(tagged,tagged.replace('24px','23px')),false);
 assert.equal(assessZeroArgCss('', ''),false);
});
