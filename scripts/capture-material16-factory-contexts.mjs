/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Derive compiler factory ancestry/parameters from authenticated untouched16 source; never execute it. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {dirname,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const sha=b=>createHash('sha256').update(b).digest('hex');
const argv=process.argv.slice(2),arg=name=>argv[argv.indexOf(name)+1];
for(const name of ['--identities','--core-identity','--core-source','--out'])assert.ok(argv.includes(name),'missing capture input '+name);
const verified=spawnSync('python3',[resolve(root,'scripts/verify_material16_factory_sources.py'),arg('--identities'),arg('--core-identity'),arg('--core-source')],{encoding:'utf8'});
assert.equal(verified.status,0,verified.stderr||verified.stdout);
const archiveValidation=JSON.parse(verified.stdout);
const identities=JSON.parse(readFileSync(arg('--identities'))),lock=readFileSync(resolve(root,'reference/material-16.2.14/environment-package-lock.json'));
assert.equal(sha(lock),identities.lock_sha256);
const metadata=new Map(),modules=new Map(),exportsByModule=new Map(),manifests=new Map();
for(const pkg of identities.packages){
 if(pkg.package!=='@angular/forms'){
 const ref=pkg.package==='@angular/material'?'factory-metadata.json':'cdk-factory-metadata.json';
 const bytes=readFileSync(resolve(root,'reference/material-16.2.14',ref));
 assert.equal(sha(bytes),pkg.package==='@angular/material'?'1b124aab1f570e111647f8142cdea8066ae9db673efc405a6999c178709602b6':'86a98330dda8255dfd6666363aecc2b08ea0730cd39f8f31af998dd0987d4a72');
 const data=JSON.parse(bytes);assert.equal(data.tarball_sha256,pkg.tarball_sha256);assert.equal(data.integrity,pkg.integrity);
 for(const row of Object.values(data.factories))metadata.set(pkg.package+':'+row.source+'#'+row.name,row);
 }
 const manifestBytes=readFileSync(resolve(pkg.directory,'package.json'));assert.equal(sha(manifestBytes),pkg.manifest_sha256);
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.name,pkg.package);assert.equal(manifest.version,pkg.version);manifests.set(pkg.package,manifest);
 for(const [subpath,value]of Object.entries(manifest.exports)){
  const find=v=>!v||typeof v!=='object'?null:typeof v.default==='string'?v.default:find(v.import||v.require);
  const target=find(value);if(target?.endsWith('.mjs'))exportsByModule.set(pkg.package+':'+target.replace(/^\.\//,''),pkg.package+(subpath==='.'?'':subpath.slice(1)));
 }
 for(const member of pkg.members){
  const b=readFileSync(resolve(pkg.directory,member.path));assert.equal(sha(b),member.sha256);assert.equal(b.length,member.bytes);
  const sf=ts.createSourceFile(member.path,b.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0,member.path);
  const imports=new Map(),classes=new Map(),exports=new Map(),variables=new Map(),functions=new Map();
  for(const n of sf.statements){
   if(ts.isClassDeclaration(n)&&n.name)classes.set(n.name.text,n);
   if(ts.isFunctionDeclaration(n)&&n.name)functions.set(n.name.text,n);
   if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer){
     variables.set(d.name.text,d.initializer);let expression=d.initializer;
     while(ts.isBinaryExpression(expression)&&expression.operatorToken.kind===ts.SyntaxKind.EqualsToken)expression=expression.right;
     if(ts.isClassExpression(expression)){classes.set(d.name.text,expression);if(expression.name)classes.set(expression.name.text,expression);}
   }
   if(ts.isImportDeclaration(n)){
    const binding=n.importClause?.namedBindings;
    if(binding&&ts.isNamedImports(binding))for(const e of binding.elements)imports.set(e.name.text,{specifier:n.moduleSpecifier.text,imported:e.propertyName?.text||e.name.text});
    if(binding&&ts.isNamespaceImport(binding))imports.set(binding.name.text,{specifier:n.moduleSpecifier.text,namespace:true});
   }
   if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)exports.set(e.name.text,{local:e.propertyName?.text||e.name.text,specifier:n.moduleSpecifier?.text});
  }
  modules.set(pkg.package+':'+member.path,{pkg:pkg.package,path:member.path,sf,imports,classes,exports,variables,functions,sha256:member.sha256});
 }
}
// The two legacy validator ancestors are public framework validators from the same frozen lock.
// Include their exact compiler rows; the rest of Forms is only an authenticated resolution source.
let frameworkFactoryCount=0;
for(const module of modules.values())if(module.pkg==='@angular/forms'){
 const visit=n=>{
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='ɵɵngDeclareFactory'){
   const fields=properties(n.arguments[0]),name=fields.get('type')?.getText(module.sf);
   if(['RequiredValidator','CheckboxRequiredValidator'].includes(name)){
    const deps=fields.get('deps'),kind=deps.kind===ts.SyntaxKind.NullKeyword?'inherited':ts.isStringLiteralLike(deps)?'invalid':'dependencies';
    const attributes=ts.isArrayLiteralExpression(deps)?deps.elements.filter(e=>properties(e).get('attribute')?.kind===ts.SyntaxKind.TrueKeyword).map(e=>properties(e).get('token').text):[];
    const row={family:'forms',name,deps_kind:kind,declaration:n.arguments[0].getText(module.sf),attributes,source:module.path,source_sha256:module.sha256};
    const key=module.pkg+':'+module.path+'#'+name;assert.ok(!metadata.has(key));metadata.set(key,row);frameworkFactoryCount++;
   }
  }
  ts.forEachChild(n,visit);
 };visit(module.sf);
}
assert.equal(frameworkFactoryCount,2);
// These published testing helpers use public JIT decorators rather than ngDeclareFactory.
// Record their actual constructor metadata independently; existing captured compiler rows stay unchanged.
const jitFactories=new Map();
for(const module of modules.values()){
 const visit=node=>{
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='__decorate'
    &&ts.isArrayLiteralExpression(node.arguments[0])&&ts.isIdentifier(node.arguments[1])){
   const name=node.arguments[1].text,cls=module.classes.get(name);if(cls){
    const decorators=node.arguments[0].elements,angular=decorators.find(d=>ts.isCallExpression(d)&&ts.isIdentifier(d.expression)
      &&module.imports.get(d.expression.text)?.specifier==='@angular/core'
      &&['Component','Directive','Injectable','NgModule'].includes(module.imports.get(d.expression.text).imported));
    if(angular){
     const ctor=cls.members.find(m=>ts.isConstructorDeclaration(m));
     const design=decorators.find(d=>ts.isCallExpression(d)&&ts.isIdentifier(d.expression)&&d.expression.text==='__metadata'
       &&d.arguments[0]?.text==='design:paramtypes'&&ts.isArrayLiteralExpression(d.arguments[1]));
     const params=ctor?ctor.parameters.map((_,index)=>{
      let value=design?.arguments[1].elements[index],attribute=null,optional=false;
      for(const dec of decorators)if(ts.isCallExpression(dec)&&ts.isIdentifier(dec.expression)&&dec.expression.text==='__param'
        &&Number(dec.arguments[0]?.text)===index&&ts.isCallExpression(dec.arguments[1])){
       const call=dec.arguments[1],binding=ts.isIdentifier(call.expression)&&module.imports.get(call.expression.text);
       if(binding?.specifier==='@angular/core'){
        if(binding.imported==='Inject')value=call.arguments[0];
        if(binding.imported==='Optional')optional=true;
        if(binding.imported==='Attribute')attribute=call.arguments[0]?.text;
       }
      }
      assert.ok(value||attribute,'unresolved original JIT constructor parameter');
      return {...(attribute?{ident:attribute,imported:attribute,spec:null,attribute}:token(module,value)),optional,index};
     }):[];
     const inherited=!ctor&&!!cls.heritageClauses?.some(h=>h.token===ts.SyntaxKind.ExtendsKeyword);
     const key=module.pkg+':'+module.path+'#'+name;
     assert.ok(!metadata.has(key),'compiler/JIT context duplicated');
     const row={family:module.path.split('/').slice(1,-1).join('/'),name,deps_kind:inherited?'inherited':'dependencies',
       declaration_kind:'published-jit-decorators',declaration:node.getText(module.sf),attributes:params.filter(p=>p.attribute).map(p=>p.attribute),source:module.path,source_sha256:module.sha256};
     metadata.set(key,row);jitFactories.set(key,params);
    }
   }
  }
  ts.forEachChild(node,visit);
 };visit(module.sf);
}
function targetModule(module,specifier){
 if(specifier.startsWith('.'))return module.pkg+':'+posix.normalize(posix.join(posix.dirname(module.path),specifier));
 const pkg=identities.packages.find(p=>specifier===p.package||specifier.startsWith(p.package+'/'))?.package;
 if(!pkg)return null;const subpath='.'+specifier.slice(pkg.length),value=manifests.get(pkg).exports[subpath];
 const find=v=>!v||typeof v!=='object'?null:typeof v.default==='string'?v.default:find(v.import||v.require);const target=find(value);
 return target?pkg+':'+target.replace(/^\.\//,''):null;
}
function resolveClass(module,name,seen=new Set()){
 const key=module.pkg+':'+module.path+'#'+name;if(seen.has(key))return null;seen=new Set([...seen,key]);
 if(module.classes.has(name))return {key,module,name,node:module.classes.get(name)};
 if(module.variables.has(name)){
  const unwrap=expression=>{
   if(ts.isBinaryExpression(expression)&&expression.operatorToken.kind===ts.SyntaxKind.EqualsToken)return unwrap(expression.right);
   if(ts.isClassExpression(expression))return {key,module,name,node:expression};
   if(ts.isIdentifier(expression))return resolveClass(module,expression.text,seen);
   if(ts.isCallExpression(expression)&&expression.arguments.length===1&&ts.isIdentifier(expression.expression)){
    // Only original core mixins with a simple returned subclass and no direct constructor injection.
    const binding=module.imports.get(expression.expression.text),owner=binding&&modules.get(targetModule(module,binding.specifier));
    const fn=(owner||module).functions.get(binding?.imported||expression.expression.text);
    if(!fn||fn.parameters.length<1||!ts.isIdentifier(fn.parameters[0].name))return null;
    const returned=fn.body?.statements.find(n=>ts.isReturnStatement(n)&&n.expression&&ts.isClassExpression(n.expression))?.expression;
    const parent=returned?.heritageClauses?.find(h=>h.token===ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression;
    if(!parent||!ts.isIdentifier(parent)||parent.text!==fn.parameters[0].name.text)return null;
    if(bodyInjections({node:returned,module:owner||module}).length)return null;
    return unwrap(expression.arguments[0]);
   }
   return null;
  };
  const result=unwrap(module.variables.get(name));if(result)return result;
 }

 const binding=module.imports.get(name),out=module.exports.get(name);
 if(binding&&!binding.namespace){const other=modules.get(targetModule(module,binding.specifier));return other?resolveClass(other,binding.imported,seen):null;}
 if(out){if(!out.specifier)return resolveClass(module,out.local,seen);const other=modules.get(targetModule(module,out.specifier));return other?resolveClass(other,out.local,seen):null;}
 return null;
}
function parentClass(c){
 const heritage=c.node.heritageClauses?.find(n=>n.token===ts.SyntaxKind.ExtendsKeyword)?.types?.[0]?.expression;
 if(!heritage)return {value:null,expression:null};
 if(ts.isIdentifier(heritage))return {value:resolveClass(c.module,heritage.text),expression:heritage.getText(c.module.sf)};
 if(ts.isPropertyAccessExpression(heritage)&&ts.isIdentifier(heritage.expression)){
  const binding=c.module.imports.get(heritage.expression.text);const other=binding?.namespace&&modules.get(targetModule(c.module,binding.specifier));
  return {value:other?resolveClass(other,heritage.name.text):null,expression:heritage.getText(c.module.sf)};
 }
 return {value:null,expression:heritage.getText(c.module.sf)};
}
function token(module,node){
 if(ts.isStringLiteralLike(node))return {ident:node.text,imported:node.text,spec:null,literal:true};
 if(ts.isIdentifier(node)){
  const binding=module.imports.get(node.text);
  if(binding&&!binding.namespace){const target=targetModule(module,binding.specifier),spec=target?exportsByModule.get(target)||binding.specifier:binding.specifier;
   return {ident:binding.imported,imported:binding.imported,spec,local_name:node.text};}
  return {ident:node.text,imported:node.text,spec:null,local_name:node.text};
 }
 if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)){
  const binding=module.imports.get(node.expression.text);if(binding?.namespace)return {ident:node.name.text,imported:node.name.text,spec:binding.specifier,local_name:node.getText()};
 }
 return {unresolved_expression:node.getText()};
}
function properties(node){assert.ok(ts.isObjectLiteralExpression(node));return new Map(node.properties.map(p=>{assert.ok(ts.isPropertyAssignment(p));return [p.name.getText().replace(/^['"]|['"]$/g,''),p.initializer];}));}
function parameters(module,row,key){
 if(jitFactories.has(key))return jitFactories.get(key);
 const fake=ts.createSourceFile('metadata.js','('+row.declaration+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const deps=properties(fake.statements[0].expression.expression).get('deps');
 if(deps.kind===ts.SyntaxKind.NullKeyword||ts.isStringLiteralLike(deps))return null;
 assert.ok(ts.isArrayLiteralExpression(deps));return deps.elements.map((d,index)=>{
  const fields=properties(d),node=fields.get('token');assert.ok(node);
  const p={...token(module,node),optional:fields.get('optional')?.kind===ts.SyntaxKind.TrueKeyword,index};
  for(const flag of ['self','skipSelf','host','attribute'])if(fields.has(flag))p[flag]=fields.get(flag).kind===ts.SyntaxKind.TrueKeyword;
  if(p.attribute){assert.equal(p.literal,true);p.attribute=p.ident;delete p.literal;}
  return p;
 });
}
function bodyInjections(c){
 const found=[];
 const visit=(n,conditions=[])=>{
  if(ts.isFunctionLike(n))return;
  if(ts.isIfStatement(n)){visit(n.thenStatement,[...conditions,n.expression.getText(c.module.sf)]);if(n.elseStatement)visit(n.elseStatement,[...conditions,'!('+n.expression.getText(c.module.sf)+')']);return;}
  if(ts.isCallExpression(n)){
   const name=ts.isIdentifier(n.expression)?n.expression.text:null,binding=name&&c.module.imports.get(name);
   const namespace=ts.isPropertyAccessExpression(n.expression)&&ts.isIdentifier(n.expression.expression)&&c.module.imports.get(n.expression.expression.text);
   if(binding?.specifier==='@angular/core'&&binding.imported==='inject'||namespace?.specifier==='@angular/core'&&n.expression.name?.text==='inject'){
    const opts=n.arguments[1]&&ts.isObjectLiteralExpression(n.arguments[1])?properties(n.arguments[1]):new Map();
    const p={...token(c.module,n.arguments[0]),optional:opts.get('optional')?.kind===ts.SyntaxKind.TrueKeyword,conditions,
      expression:n.getText(c.module.sf),offset:n.getStart(c.module.sf)};
    for(const flag of ['self','skipSelf','host'])if(opts.has(flag))p[flag]=opts.get(flag).kind===ts.SyntaxKind.TrueKeyword;
    found.push(p);
   }
  }
  ts.forEachChild(n,child=>visit(child,conditions));
 };
 for(const member of c.node.members){if(ts.isConstructorDeclaration(member)&&member.body)visit(member.body);
  else if(ts.isPropertyDeclaration(member)&&member.initializer&&!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))visit(member.initializer);}
 return found;
}
const contexts={};
for(const [key,row]of metadata){
 const hash=key.lastIndexOf('#'),module=modules.get(key.slice(0,hash)),name=key.slice(hash+1);assert.ok(module);assert.equal(module.sha256,row.source_sha256);
 const c=resolveClass(module,name);assert.ok(c,key+' class missing');const chain=[],seen=new Set();let current=c,terminal=null,unresolved=null,fallback=false;
 while(current){assert.ok(!seen.has(current.key),'factory ancestry cycle');seen.add(current.key);
  const factory=metadata.get(current.key);chain.push({key:current.key,source:current.module.path,source_sha256:current.module.sha256,name:current.name,factory_kind:factory?.deps_kind||null,body_injections:bodyInjections(current)});
  if(factory&&factory.deps_kind!=='inherited'){terminal={key:current.key,row:factory,module:current.module};break;}
  const parent=parentClass(current);if(!parent.value){unresolved=parent.expression?{class:current.key,parent_expression:parent.expression}:null;fallback=!parent.expression;break;}current=parent.value;
 }
 contexts[key]={compiler_factory:row,package:c.module.pkg,source:row.source,source_sha256:row.source_sha256,name:row.name,declared_factory_kind:row.deps_kind,
  effective_factory_kind:terminal?.row.deps_kind||(fallback?'dependencies':null),parameter_factory_key:terminal?.key||null,zero_argument_inherited_fallback:fallback,
  factory_parameters:terminal?parameters(terminal.module,terminal.row,terminal.key):fallback?[]:null,ancestry:chain,unresolved_ancestry:unresolved,
  body_scope:'Direct inject() calls in resolved class constructor/property initialization through the effective compiler factory; nested function bodies and unresolved mixins are excluded, never a complete transitive behavior audit.'};
}
assert.equal(Object.keys(contexts).length,537+jitFactories.size+frameworkFactoryCount);
const coreIdentity=JSON.parse(readFileSync(arg('--core-identity'))),coreBytes=readFileSync(arg('--core-source'));
assert.equal(sha(coreBytes),coreIdentity.member_sha256);
const lockedCore=JSON.parse(lock).packages['node_modules/@angular/core'];assert.equal(coreIdentity.integrity,lockedCore.integrity);assert.equal(coreIdentity.version,lockedCore.version);
const coreSf=ts.createSourceFile('core.mjs',coreBytes.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const inheritedHelper=coreSf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ɵɵgetInheritedFactory');assert.ok(inheritedHelper);
assert.ok(inheritedHelper.getText(coreSf).includes('return (t) => new t();'),'untouched inherited zero-argument fallback missing');
const result={schema_version:1,archive_validation:archiveValidation,original_core_inherited_factory:{...Object.fromEntries(Object.entries(coreIdentity).filter(([k])=>k!=='archive_path')),helper_source:inheritedHelper.getText(coreSf),helper_sha256:sha(Buffer.from(inheritedHelper.getText(coreSf)))},role:'Additional compiler factory ancestry/parameter facts from untouched locked Material/CDK16 packages, not candidate expectations',lock_sha256:identities.lock_sha256,
 packages:identities.packages.map(({directory,archive_path,...p})=>p),contexts,limits:['Pure AST inspection, no original or candidate JavaScript executed.','All537 original component/CDK compiler rows, five published JIT helper rows and two locked Forms validator ancestors retained. Missing/unresolved ancestry remains explicit, not an empty successful expectation.','Direct constructor/property body injection observations are leads; conditional and transitive/mixin behavior still require contextual review.']};
assert.equal(existsSync(arg('--out')),false);writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({contexts:Object.keys(contexts).length,inherited:Object.values(contexts).filter(c=>c.declared_factory_kind==='inherited').length,
 unresolved:Object.values(contexts).filter(c=>!c.effective_factory_kind).length,direct_body_calls:Object.values(contexts).flatMap(c=>c.ancestry.flatMap(a=>a.body_injections)).length}));
