/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite prior embedded-source map to combined artifact transition, with no wildcard class waiver. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),dir=join(root,'compatibility/rc/qualification/api-attribute-owned-mode-v1'),sha=x=>createHash('sha256').update(x).digest('hex');
const configs={
 'legacy-checkbox':['checkbox.ts','3e171f6b96f844741d0a58620cfd43494125514a03266dc430450f1c5d0419e9','91921ea73ac1372e179cc5a2044a4fe03b3e8211b05eb400a9dc7338d9d77b03'],
 'legacy-chips':['chip.ts','12f30cc674fb2e30ee1d1326b7ef5d2540e4d5296299f7159d2189496cf8b5fb','3981e1ac0eb0ca94085bd45d32b85ac0b197897e4f836609256dd8f9c746286c'],
 'legacy-radio':['radio.ts','e7ffcf96d1fe091b3ec3df296e59e44523bba92fd73197cc56c94507a921ef7e','4bd969e3141453c9025053c25f3d5ac15ebad10d9c708447c81d023db4d66f8b'],
 'legacy-slide-toggle':['slide-toggle.ts','f69569878b2c37865d05554827af39402e45a32fa0e2712b85d35d930536f8de','85cce487826261bff3d570eeafca0c5c2ce7edf656d1b6df4012169ba7a91353'],
 'legacy-slider':['slider.ts','b4bc4128161a7a4e2098f6b0c0afb7074e1a55c406c973ce769bd321ce9f583e','22cc2fdbbb271e9905c75cc58f3bc406cb7f47df8aaa7bdc89ec85c6bf28be6f']};
export function verifyAttributeSourceTransition(family,currentMap){const config=configs[family];assert.ok(config);const [leaf,oldHash,gzHash]=config,compressed=readFileSync(join(dir,family+'-prior-map.gz'));assert.equal(sha(compressed),gzHash);const raw=gunzipSync(compressed);assert.equal(sha(raw),oldHash);const prior=JSON.parse(raw);assert.deepEqual(currentMap.sources,prior.sources);assert.equal(currentMap.sourcesContent.length,prior.sourcesContent.length);const index=prior.sources.indexOf('../../../projects/ngx-material-legacy/'+family+'/'+leaf);assert.ok(index>=0&&index===prior.sources.lastIndexOf(prior.sources[index]));
 let text=prior.sourcesContent[index];const replace=(a,b)=>{assert.equal(text.split(a).length,2);text=text.replace(a,b);};const anchor=family==='legacy-chips'?"import {FocusableOption}":"import {FocusMonitor, FocusOrigin}";
 const actualAnchor=family==='legacy-radio'?"import {FocusMonitor}":anchor;
 replace(actualAnchor,"import {LEGACY_ANIMATION_MODE, resolveLegacyAnimationMode} from '@ngx-compat/material-legacy/legacy-core';\n\n"+actualAnchor);replace('  ANIMATION_MODULE_TYPE,\n','');replace('@Inject(ANIMATION_MODULE_TYPE)', '@Inject(LEGACY_ANIMATION_MODE)');
 if(family==='legacy-checkbox')replace("super('mat-checkbox-', elementRef, changeDetectorRef, ngZone, tabIndex, animationMode, options);", "super('mat-checkbox-', elementRef, changeDetectorRef, ngZone, tabIndex, resolveLegacyAnimationMode(animationMode), options);");
 else if(family==='legacy-chips')replace("this._animationsDisabled = animationMode === 'NoopAnimations';", "this._animationsDisabled = resolveLegacyAnimationMode(animationMode) === 'NoopAnimations';");
 else if(family==='legacy-radio')replace('      radioDispatcher,\n      animationMode,\n      providerOverride,','      radioDispatcher,\n      resolveLegacyAnimationMode(animationMode),\n      providerOverride,');
 else if(family==='legacy-slide-toggle')replace("      defaults,\n      animationMode,\n      'mat-slide-toggle-',", "      defaults,\n      resolveLegacyAnimationMode(animationMode),\n      'mat-slide-toggle-',");
 else replace('    super(elementRef);\n    this._document = _document;', '    super(elementRef);\n    this._animationMode = resolveLegacyAnimationMode(this._animationMode);\n    this._document = _document;');
 for(let i=0;i<prior.sources.length;i++)assert.equal(currentMap.sourcesContent[i],i===index?text:prior.sourcesContent[i],family+' source transition '+prior.sources[i]);return {family,prior_map_sha256:oldHash,changed_source:leaf,changed_sources:1,other_sources_unchanged:true,changes:'owned mode import, injected token and resolution only'};
}
