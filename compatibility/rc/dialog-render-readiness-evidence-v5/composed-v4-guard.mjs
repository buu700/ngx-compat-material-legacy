import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root='/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/dialog-readiness-decision/evidence';
const read=n=>JSON.parse(readFileSync(`${root}/${n}.json`));
function check(d){const c=d.cases.find(c=>c.kind==='recapture-post');const events=c.opened.events;const choice=events.findIndex(e=>e.type==='shadow-choice');return !d.error&&choice>=0&&events.some(e=>e.type==='afterOpened')&&c.opened.active==='inside-shadow-host'&&!events.slice(choice+1).some(e=>e.type==='focus'&&e.insideDialog)}
const baseline=read('composed-v2-zoneful');assert.equal(check(baseline),false);assert.equal(baseline.cases.find(c=>c.kind==='recapture-post').opened.active,'first');
const modes=[];for(const n of ['composed-v4-zoneful','composed-v4-zoneless']){const d=read(n);assert.equal(check(d),true);for(const id of ['first','second','mat-dialog-container']){const x=structuredClone(d);x.cases.find(c=>c.kind==='recapture-post').opened.events.push({type:'focus',id,insideDialog:true});assert.equal(check(x),false)}modes.push(n)}
writeFileSync(`${root}/composed-v4-guard-result.json`,JSON.stringify({v2_reproduces_failure:true,modes,mutants_rejected:6},null,2)+'\n');
