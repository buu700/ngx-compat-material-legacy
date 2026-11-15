/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite input first-check successor; this establishes artifact identity, not runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {combinedTarMembers, verifyCombinedD70Members, verifyExtractedCombinedMembers, API_COMBINED_D70_SHA} from './api-combined-d70-image.mjs';

export const API_COMBINED_INPUT_FIRSTCHECK_SHA='f31f87a06321fdd10c16c4d65b433e2c4f1ea3c7dc82fb2a79bf75bd40b71efc';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'), dir=join(root,'compatibility/rc/qualification/api-combined-input-firstcheck-v1');
const sha=x=>createHash('sha256').update(x).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const bundle='fesm2022/ngx-compat-material-legacy-legacy-input.mjs',declaration='types/ngx-compat-material-legacy-legacy-input.d.ts';
const changed=[bundle,bundle+'.map',declaration,declaration+'.map'].sort();
function replaceOnce(text,before,after){assert.equal(text.split(before).length,2);return text.replace(before,after);}
function sourceChange(text){text=replaceOnce(text,'  /** @docs-private Host binding preserves the consumer-supplied aria-disabled value. */',"  private _legacyPlaceholderChecked = false;\n  /** @docs-private Host binding preserves the consumer-supplied aria-disabled value. */");return replaceOnce(text,'    super.ngDoCheck();\n    this._legacyAriaDisabled',`    super.ngDoCheck();
    // The peer initializes its placeholder cache to null. The historical peer's
    // first check also removed an authored placeholder promoted to a label.
    if (!this._legacyPlaceholderChecked) {
      this._legacyPlaceholderChecked = true;
      if (this._legacyFormField?.appearance === 'legacy' && !this._legacyFormField._hasLabel?.()) {
        this._legacyElement.nativeElement.removeAttribute('placeholder');
      }
    }
    this._legacyAriaDisabled`);}
function bundleChange(text){text=replaceOnce(text,'    /** @docs-private Host binding preserves the consumer-supplied aria-disabled value. */',"    _legacyPlaceholderChecked = false;\n    /** @docs-private Host binding preserves the consumer-supplied aria-disabled value. */");return replaceOnce(text,'        super.ngDoCheck();\n        this._legacyAriaDisabled',`        super.ngDoCheck();
        // The peer initializes its placeholder cache to null. The historical peer's
        // first check also removed an authored placeholder promoted to a label.
        if (!this._legacyPlaceholderChecked) {
            this._legacyPlaceholderChecked = true;
            if (this._legacyFormField?.appearance === 'legacy' && !this._legacyFormField._hasLabel?.()) {
                this._legacyElement.nativeElement.removeAttribute('placeholder');
            }
        }
        this._legacyAriaDisabled`);}
function replay(text,edits){let pos=0,out='';assert.ok(Array.isArray(edits)&&edits.length);for(const e of edits){assert.ok(Number.isSafeInteger(e.start)&&Number.isSafeInteger(e.end)&&e.start>=pos&&e.end>=e.start&&e.end<=text.length);assert.equal(text.slice(e.start,e.end),e.old);out+=text.slice(pos,e.start)+e.new;pos=e.end;}return out+text.slice(pos);}
function verifyMap(oldBytes,newBytes,edits,source){const old=JSON.parse(oldBytes),next=JSON.parse(newBytes),{mappings:a,...oa}=old,{mappings:b,...ob}=next;assert.equal(replay(a,edits),b);if(!source){assert.deepEqual(oa,ob);return;}const {sourcesContent:x,...restA}=oa,{sourcesContent:y,...restB}=ob;assert.deepEqual(restA,restB);assert.equal(x.length,old.sources.length);assert.equal(y.length,x.length);let found=0;old.sources.forEach((name,i)=>{if(name==='../../../projects/ngx-material-legacy/legacy-input/input.ts'){found++;assert.equal(sourceChange(x[i]),y[i]);assert.equal(sha(x[i]),'aaa55d58b06ef58c6dfca26053854696526e3529e7ed15ba3ef382ec323e8532');assert.equal(sha(y[i]),'73732c15c8e968f6e13138cc3b045114035cce5ef13f2eabded100f267c02dd7');const ast=ts.createSourceFile(name,y[i],ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0);const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyInput');assert.ok(cls);assert.equal(cls.members.filter(n=>n.name?.getText(ast)==='_legacyPlaceholderChecked').length,1);assert.equal(cls.members.filter(n=>n.name?.getText(ast)==='ngDoCheck').length,1);}else assert.equal(y[i],x[i]);});assert.equal(found,1);}
export function verifyCombinedInputFirstcheckMembers(files,packageRoot){try{
 const raw=readFileSync(join(dir,'transition.json'));assert.equal(sha(raw),'64e127bacb29ccb7d69742d45bc9e3ef267c21690397e08ee6d36cd299490d9f');const m=JSON.parse(raw);
 assert.equal(m.predecessor_sha256,API_COMBINED_D70_SHA);assert.equal(m.artifact_sha256,API_COMBINED_INPUT_FIRSTCHECK_SHA);assert.equal(m.member_count,512);assert.deepEqual(Object.keys(m.changed).sort(),changed);
 const before=new Map(files),prior=new Map();
 for(const name of changed){const row=m.changed[name],bytes=files.get(name),gz=readFileSync(join(dir,row.prior_gz));assert.equal(sha(gz),row.prior_gz_sha256);const old=gunzipSync(gz);assert.equal(old.length,row.old_bytes);assert.equal(sha(old),row.old_sha256);assert.equal(bytes.length,row.new_bytes);assert.equal(sha(bytes),row.new_sha256);before.set(name,old);prior.set(name,old);}
 assert.ok(verifyCombinedD70Members(before));
 assert.equal(bundleChange(prior.get(bundle).toString()),files.get(bundle).toString());
 assert.equal(replaceOnce(prior.get(declaration).toString(),'    private readonly _legacyElement;\n','    private readonly _legacyElement;\n    private _legacyPlaceholderChecked;\n'),files.get(declaration).toString());
 verifyMap(prior.get(bundle+'.map'),files.get(bundle+'.map'),m.mapping_edits[bundle+'.map'],true);
 verifyMap(prior.get(declaration+'.map'),files.get(declaration+'.map'),m.mapping_edits[declaration+'.map'],false);
 if(packageRoot)verifyExtractedCombinedMembers(files,packageRoot);return true;
 }catch{return false;}}

export function qualifyCombinedInputFirstcheckArchive(archive,packageRoot){try{assert.ok(Buffer.isBuffer(archive));assert.equal(sha(archive),API_COMBINED_INPUT_FIRSTCHECK_SHA);return verifyCombinedInputFirstcheckMembers(combinedTarMembers(archive),packageRoot);}catch{return false;}}
