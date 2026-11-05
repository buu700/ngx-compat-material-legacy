from pathlib import Path
import shutil
ROOT=Path.cwd()
JS_PHYSICAL=r"""const bufferEquals=Buffer.prototype.equals;
const equalBytes=(actual,supplied)=>Buffer.isBuffer(supplied)&&Reflect.apply(bufferEquals,actual,[supplied]);
function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
 const regular=(base,parts)=>{let cursor=base;for(const part of parts){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false,'linked source descendant');}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
 const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
 if(!peer)return regular(root,path.split('/'));
 const container=join(root,'node_modules');assert.equal(lstatSync(container).isSymbolicLink(),false);assert.ok(lstatSync(container).isDirectory());
 if(peer[1].startsWith('@angular/')){const scope=join(container,'@angular');assert.equal(lstatSync(scope).isSymbolicLink(),false);assert.ok(lstatSync(scope).isDirectory());}
 const base=realpathSync(join(container,peer[1]));assert.ok(lstatSync(base).isDirectory());
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]));
 assert.equal(JSON.parse(regular(base,['package.json'])).name,peer[1]);return regular(base,peer[2].split('/'));
}
/** Frozen source guards authenticate each retained first image against their pins.
 * This private boundary closes supplied callbacks; it is not an atomic FS snapshot. */
function physicalBoundary(root,providedRead){
 assert.equal(lstatSync(root).isSymbolicLink(),false);assert.ok(lstatSync(root).isDirectory());const retained=new Map();
 const read=path=>{const actual=physical(root,path),prior=retained.get(path);if(prior)assert.ok(equalBytes(actual,prior),'changed retained physical input '+path);else retained.set(path,Buffer.from(actual));
  if(providedRead!==undefined){assert.equal(typeof providedRead,'function');const supplied=providedRead(path);assert.ok(equalBytes(actual,supplied),'nonphysical supplied input '+path);}
  assert.ok(equalBytes(physical(root,path),actual),'physical input changed during supplied read '+path);return actual;};
 const assertPhysical=()=>{for(const[path,before]of retained)assert.ok(equalBytes(physical(root,path),before),'changed final physical input '+path);};
 return {read,assertPhysical};
}
"""
js=ROOT/'scripts/sass-spinner-snack-gate-integration.mjs';text=js.read_text()
old="function tool(root,path,providedRead){let cursor=root;for(const part of path.split('/')){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}assert.ok(lstatSync(cursor).isFile());const b=readFileSync(cursor);if(providedRead){const supplied=providedRead(path);assert.ok(Buffer.isBuffer(supplied)&&supplied.equals(b),'nonphysical gate helper input '+path);}return b;}"
assert old in text
text=text.replace(old,JS_PHYSICAL+"function tool(root,path,read){return read(path);}")
text=text.replace("assert.deepEqual(plain(incoming),snapshot,'gate metadata changed during source guards');return result;","assert.deepEqual(plain(incoming),snapshot,'gate metadata changed during source guards');s.assertPhysical();return result;")
text=text.replace("root=resolve(root);const source=createSpinnerSnackBridgeContract({root,read}),line=source.line,branch=packet.branches[line];","root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;const source=createSpinnerSnackBridgeContract({root,read}),line=source.line,branch=packet.branches[line];")
text=text.replace("source.assertCurrent();};\n const oracle=", "source.assertCurrent();boundary.assertPhysical();};\n const oracle=")
text=text.replace("{root,line,source,assertCurrent,descriptor:","{root,line,source,assertCurrent,assertPhysical:boundary.assertPhysical,descriptor:")
text=text.replace("assertCurrent();sameArgs(captured);return context;","assertCurrent();sameArgs(captured);boundary.assertPhysical();return context;")
text=text.replace("s.assertCurrent();return structuredClone(s.descriptor);","s.assertCurrent();const descriptor=structuredClone(s.descriptor);s.assertPhysical();return descriptor;")
text=text.replace("assert.deepEqual(plain(css),candidate);return out;","assert.deepEqual(plain(css),candidate);s.assertPhysical();return out;")
js.write_text(text)
py=ROOT/'scripts/sass_spinner_snack_gate_integration.py';text=py.read_text()
start=text.index('def _tool(');end=text.index('\nclass SpinnerSnackGateContext:',start)
text=text[:start]+r"""def _physical(root,path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.','..') for part in path.split('/'))
    def regular(base,parts):
        cursor=base
        for part in parts:
            cursor=cursor/part
            assert not cursor.is_symlink()
        assert cursor.is_file()
        return cursor.read_bytes()
    peer=re.fullmatch(r'node_modules/(@angular/(?:core|material|cdk)|sass)/(.+)',path)
    if not peer:return regular(root,path.split('/'))
    container=root/'node_modules'
    assert not container.is_symlink() and container.is_dir()
    if peer[1].startswith('@angular/'):
        scope=container/'@angular'
        assert not scope.is_symlink() and scope.is_dir()
    base=(container/peer[1]).resolve(strict=True)
    assert base.is_dir()
    if peer[1]=='sass':assert peer[2] in ('package.json','sass.node.js','sass.dart.js')
    assert json.loads(regular(base,['package.json']))['name']==peer[1]
    return regular(base,peer[2].split('/'))

def _physical_boundary(root,provided_read):
    # Existing frozen guards authenticate retained first images against exact pins.
    # This closes supplied callbacks, not concurrent filesystem mutation.
    assert not root.is_symlink() and root.is_dir()
    retained={}
    def read(path):
        actual=_physical(root,path)
        if path in retained:assert actual==retained[path]
        else:retained[path]=actual
        if provided_read is not None:
            provided=provided_read(path)
            assert type(provided) is bytes and actual==provided
        assert _physical(root,path)==actual,'physical input changed during supplied read'
        return actual
    def assert_physical():
        for path,before in retained.items():assert _physical(root,path)==before,'changed final physical input'
    return read,assert_physical

def _tool(root,path,read):return read(path)
"""+text[end:]
text=text.replace("root=Path(root).absolute()\n        source=", "root=Path(root).absolute()\n        read,assert_physical=_physical_boundary(root,read)\n        source=")
text=text.replace("            source.assert_current()\n        sets=", "            source.assert_current()\n            assert_physical()\n        sets=")
text=text.replace("plans=plans,assert_current=assert_current)","plans=plans,assert_current=assert_current,assert_physical=assert_physical)")
text=text.replace("        assert_current()\n    @property","        assert_current()\n        assert_physical()\n    @property")
text=text.replace("    return _plain(_CONTEXTS[context]['descriptor'])","    descriptor=_plain(_CONTEXTS[context]['descriptor'])\n    _CONTEXTS[context]['assert_physical']()\n    return descriptor")
text=text.replace("        assert live()==snapshot,'live gate payload changed during source guards'\n        return ok","        assert live()==snapshot,'live gate payload changed during source guards'\n        s['assert_physical']()\n        return ok")
py.write_text(text)
c04=ROOT/'scripts/sass-spinner-snack-c04-source.mjs';text=c04.read_text()
text=text.replace("import {createHash} from 'node:crypto';","import {createHash} from 'node:crypto';\nimport {readFileSync,lstatSync,realpathSync} from 'node:fs';\nimport {isAbsolute,join,resolve} from 'node:path';")
text=text.replace("const states=new WeakMap();",JS_PHYSICAL+"const states=new WeakMap();")
text=text.replace("export function spinnerSnackC04Source({root,read}){\n const bridge=", "export function spinnerSnackC04Source({root,read}){\n root=resolve(root);const boundary=physicalBoundary(root,read);read=boundary.read;\n const bridge=")
text=text.replace("  return tool??source;", "  boundary.assertPhysical();return tool??source;")
text=text.replace("assert.equal(raw.length,ref.bytes);}};", "assert.equal(raw.length,ref.bytes);}boundary.assertPhysical();};")
text=text.replace("during final source guards');return structuredClone(historical);", "during final source guards');const result=structuredClone(historical);boundary.assertPhysical();return result;")
old="const publicBridge={...structuredClone(Object.fromEntries(Object.entries(bridge).filter(([,value])=>typeof value!=='function'))),qualify:bridge.qualify,assertCurrent:bridge.assertCurrent,assertHistoricalSource:bridge.assertHistoricalSource};"
new="const finish=operation=>{const result=operation();boundary.assertPhysical();return result;};\n const publicBridge={...structuredClone(Object.fromEntries(Object.entries(bridge).filter(([,value])=>typeof value!=='function'))),qualify:ref=>finish(()=>bridge.qualify(ref)),assertCurrent:()=>finish(()=>bridge.assertCurrent()),assertHistoricalSource:(path,expected)=>finish(()=>bridge.assertHistoricalSource(path,expected))};"
assert old in text;text=text.replace(old,new)
text=text.replace("assertHistoricalSource:(path,expected)=>bridge.assertHistoricalSource(path,expected)", "assertHistoricalSource:(path,expected)=>finish(()=>bridge.assertHistoricalSource(path,expected))")
text=text.replace("states.set(result,{bound,summary,qualify,assertCurrent});return result;", "states.set(result,{bound,summary,qualify,assertCurrent,assertPhysical:boundary.assertPhysical});boundary.assertPhysical();return result;")
text=text.replace(" return true;\n}", " source.assertPhysical();return true;\n}")
text=text.replace("during final guards');return true;", "during final guards');source.assertPhysical();return true;")
c04.write_text(text)
for target in [js,py,c04]:
    other=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')/target.relative_to(ROOT)
    shutil.copyfile(target,other)
