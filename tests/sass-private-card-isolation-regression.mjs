/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual private-card gate must ignore a restored but poisoned expected dependency. */
import assert from 'node:assert/strict';import{readFileSync,writeFileSync,existsSync,unlinkSync}from'node:fs';import{join,resolve}from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const [rootArg,line,inputArg]=process.argv.slice(2),root=resolve(rootArg);
assert.equal(readFileSync(join(root,'.sass-isolation-disposable'),'utf8'),'test-owned-disposable\n');
const input=JSON.parse(readFileSync(resolve(inputArg),'utf8')),path=join(root,'scripts/private-card-composition.mjs'),original=readFileSync(path,'utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
let poison=original.replace("return blocks.join('\\n\\n');","return blocks.join('\\n\\n')+'\\n.unrelated { color: red; }';");assert.notEqual(poison,original);
poison=poison.replace('selfImage=readFileSync(selfPath)',"selfImage=Buffer.from('"+Buffer.from(original).toString('base64')+"','base64')");
const formerLauncher=join(root,'scripts/sass-expected-isolation.mjs');assert.equal(existsSync(formerLauncher),false);writeFileSync(formerLauncher,"throw Error('poisoned former launcher imported');");
let helper,gate;
try{writeFileSync(path,poison);helper=await import(pathToFileURL(path));gate=await import(pathToFileURL(join(root,'scripts/sass-private-card-gate.mjs')));}finally{writeFileSync(path,original);unlinkSync(formerLauncher);}
const forged=structuredClone(input.actual);forged.css+='\n.unrelated { color: red; }';forged.css_sha256=sha(forged.css);forged.css_bytes=Buffer.byteLength(forged.css);
const poisoned=helper.createPrivateCardContext({root,line});assert.equal(helper.privateCardCompositionMatches({context:poisoned,line,caseId:input.caseId,originalCss:input.expected.css,actualCss:forged.css}),true,'attack must remain active in imported helper');
const context=gate.createPrivateCardGateContext({root}),args={context,...input,descriptor:gate.privateCardGateDescriptor(context)};
assert.equal(gate.privateCardGateMatch(args),true);assert.equal(gate.privateCardGateMatch({...args,actual:forged}),false,'full gate must independently compute complete expected CSS');
const oldOptions=process.env.NODE_OPTIONS;process.env.NODE_OPTIONS='--require=/nonexistent-untrusted-preload.cjs';
try{assert.equal(gate.privateCardGateMatch(args),true);}finally{if(oldOptions===undefined)delete process.env.NODE_OPTIONS;else process.env.NODE_OPTIONS=oldOptions;}
const wrong=structuredClone(args);wrong.context=context;wrong.actual.sass_version+=' wrong';assert.equal(gate.privateCardGateMatch(wrong),false);
try{writeFileSync(path,original+'\n// late change\n');assert.equal(gate.privateCardGateMatch(args),false);}finally{writeFileSync(path,original);}
assert.equal(gate.privateCardGateMatch(args),true);
console.log(JSON.stringify({schema_version:1,line,controls:['captured-helper-attack-active','poisoned-former-launcher-never-imported','actual-private-gate-clean-positive','actual-private-gate-rehashed-extra-rule-rejected','startup-environment-sanitized','wrong-compiler','late-physical-change','same-context-restored-positive'],expected_css_sha256:input.actual.css_sha256,expected_css_bytes:input.actual.css_bytes,source_restored:readFileSync(path,'utf8')===original,scope:'actual gate and actual pinned peer compiler; prior authenticated artifact measurements; no full coordinator execution or final packed seal claim'}));
