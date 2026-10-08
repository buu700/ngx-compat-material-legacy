/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

/**
 * Correlate two actual compiler observations: partial factory dependencies and
 * retained constructor reflection metadata. This is not a historical oracle or
 * runtime qualification. Unknown/multiple/manual factory writes are rejected.
 */
export function compilerConstructorContract(source,name,{resolveInherited=false,ancestors=[]}={}){
 if(ancestors.includes(name))throw Error('compiler factory inheritance cycle');
 const ts=require('typescript'),file=ts.createSourceFile('owned.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('owned compiler source does not parse');
 const coreNamespaces=new Set(),imports=new Map(),factories=[],metadata=[],writes=[],classes=[];
 for(const statement of file.statements){
  if(!ts.isImportDeclaration(statement))continue;
  const bindings=statement.importClause?.namedBindings,spec=statement.moduleSpecifier.text;
  if(bindings&&ts.isNamespaceImport(bindings)){
   imports.set(bindings.name.text,{spec,namespace:true});if(spec==='@angular/core')coreNamespaces.add(bindings.name.text);
  }else if(bindings&&ts.isNamedImports(bindings))for(const binding of bindings.elements)
   imports.set(binding.name.text,{spec,imported:binding.propertyName?.text||binding.name.text});
 }
 const text=n=>n.getText(file);
 const fields=n=>{
  if(!n||!ts.isObjectLiteralExpression(n))throw Error('compiler metadata must be an object literal');
  const entries=new Map();
  for(const p of n.properties){if(!ts.isPropertyAssignment(p)||!ts.isIdentifier(p.name)||entries.has(p.name.text))throw Error('unsupported/duplicate compiler metadata property');entries.set(p.name.text,p.initializer);}
  return entries;
 };
 const owner=node=>{
  if(ts.isIdentifier(node))return node.text;
  if(node.kind===ts.SyntaxKind.ThisKeyword){for(let parent=node.parent;parent;parent=parent.parent)if(ts.isClassDeclaration(parent)||ts.isClassExpression(parent))return parent.name?.text;}
  return null;
 };
 const isCoreCall=(node,method)=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)
  &&ts.isIdentifier(node.expression.expression)&&coreNamespaces.has(node.expression.expression.text)&&node.expression.name.text===method;
 const visit=node=>{
  if(ts.isClassDeclaration(node)&&node.name?.text===name)classes.push(node);
  if((ts.isVariableDeclaration(node)||ts.isParameter(node)||ts.isFunctionDeclaration(node)||ts.isClassDeclaration(node))
   &&node.name&&ts.isIdentifier(node.name)&&imports.has(node.name.text))throw Error('imported compiler identity is shadowed');
  if(ts.isBinaryExpression(node)&&ts.isElementAccessExpression(node.left)&&owner(node.left.expression)===name
   &&node.left.argumentExpression?.text==='ɵfac')writes.push(node);
  if(ts.isPropertyDeclaration(node)&&node.name&&text(node.name)==='ɵfac'&&node.parent.name?.text===name
   &&node.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword)){
   writes.push(node);if(node.initializer&&isCoreCall(node.initializer,'ɵɵngDeclareFactory'))factories.push(fields(node.initializer.arguments[0]));
  }
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isPropertyAccessExpression(node.left)
   &&owner(node.left.expression)===name&&node.left.name.text==='ɵfac'){
   writes.push(node);if(isCoreCall(node.right,'ɵɵngDeclareFactory'))factories.push(fields(node.right.arguments[0]));
  }
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='defineProperty'
   &&owner(node.arguments[0])===name&&node.arguments[1]?.text==='ɵfac')writes.push(node);
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='setPrototypeOf'
   &&owner(node.arguments[0])===name)throw Error('manual owned constructor inheritance mutation unsupported');
  if(isCoreCall(node,'ɵɵngDeclareClassMetadata')){const row=fields(node.arguments[0]);if(row.get('type')&&text(row.get('type'))===name)metadata.push(row);}
  ts.forEachChild(node,visit);
 };visit(file);
 if(writes.length!==1||factories.length!==1||metadata.length!==1)throw Error('one compiler factory and class metadata declaration required; manual/multiple writes unsupported');
 const factory=factories[0],classMetadata=metadata[0];
 if(!factory.get('type')||text(factory.get('type'))!==name)throw Error('factory type does not match owned class');
 const deps=factory.get('deps'),ctor=classMetadata.get('ctorParameters');
 if(resolveInherited&&deps?.kind===ts.SyntaxKind.NullKeyword){
  if(ctor||classes.length!==1||classes[0].members.some(ts.isConstructorDeclaration))
   throw Error('inherited compiler factory has ambiguous/explicit own constructor');
  const heritage=classes[0].heritageClauses?.filter(h=>h.token===ts.SyntaxKind.ExtendsKeyword);
  const parent=heritage?.length===1&&heritage[0].types.length===1?heritage[0].types[0].expression:null;
  if(!parent||!ts.isIdentifier(parent))throw Error('explicit owned parent class required for inherited factory');
  const inherited=compilerConstructorContract(source,parent.text,{resolveInherited:true,ancestors:[...ancestors,name]});
  return {...inherited,class_name:name,inheritance:[name,...inherited.inheritance]};
 }
 if(!deps||!ts.isArrayLiteralExpression(deps)||!ctor||!ts.isArrowFunction(ctor)||!ts.isArrayLiteralExpression(ctor.body))throw Error('explicit constructor arrays required; inherited/invalid/unavailable cases remain unresolved');
 if(deps.elements.length!==ctor.body.elements.length)throw Error('factory and constructor metadata counts differ');
 const expression=node=>{
  if(!node)throw Error('constructor token missing');
  if(ts.isIdentifier(node)){const binding=imports.get(node.text);return binding?.imported?binding.spec+'#'+binding.imported:node.text;}
  if(ts.isPropertyAccessExpression(node)){
   const binding=ts.isIdentifier(node.expression)&&imports.get(node.expression.text);
   return binding?.namespace?binding.spec+'#'+node.name.text:expression(node.expression)+'.'+node.name.text;
  }
  if(ts.isStringLiteralLike(node))return JSON.stringify(node.text);
  throw Error('non-pure constructor token expression unsupported');
 };
 const boolean=(map,key)=>{
  if(!map.has(key))return false;
  if(map.get(key).kind!==ts.SyntaxKind.TrueKeyword&&map.get(key).kind!==ts.SyntaxKind.FalseKeyword)throw Error('nonliteral injection flag');
  return map.get(key).kind===ts.SyntaxKind.TrueKeyword;
 };
 const result=[];
 for(let index=0;index<deps.elements.length;index++){
  const dep=fields(deps.elements[index]),param=fields(ctor.body.elements[index]);
  let token=param.get('type'),attribute=null;
  const flags={optional:false,self:false,skipSelf:false,host:false};
  const decorators=param.get('decorators');
  if(decorators){
   if(!ts.isArrayLiteralExpression(decorators))throw Error('constructor decorators must be explicit');
   const seen=new Set();
   for(const item of decorators.elements){
    const decorator=fields(item),type=decorator.get('type');
    const identity=type&&expression(type);
    if(!identity?.startsWith('@angular/core#'))throw Error('unknown constructor decorator identity');
    const kind=identity.slice('@angular/core#'.length);if(seen.has(kind))throw Error('duplicate constructor decorator');seen.add(kind);
    const args=decorator.get('args');
    if(kind==='Inject'||kind==='Attribute'){
     if(!args||!ts.isArrayLiteralExpression(args)||args.elements.length!==1)throw Error('explicit single decorator argument required');
     if(kind==='Inject')token=args.elements[0];
     else{if(!ts.isStringLiteralLike(args.elements[0]))throw Error('literal attribute required');attribute=args.elements[0].text;}
    }else{
     const key={Optional:'optional',Self:'self',SkipSelf:'skipSelf',Host:'host'}[kind];
     if(!key||args)throw Error('unknown decorator or decorator arguments');flags[key]=true;
    }
   }
  }
  if(boolean(dep,'attribute')!==(attribute!==null))throw Error('factory/metadata attribute mode differs');
  const observed=attribute===null?expression(token):JSON.stringify(attribute);
  if(expression(dep.get('token'))!==observed)throw Error('factory/metadata token expression differs');
  for(const key of Object.keys(flags))if(boolean(dep,key)!==flags[key])throw Error('factory/metadata '+key+' differs');
  result.push({index,token_expression:observed,attribute,...flags});
 }
 return {class_name:name,parameter_class_name:name,inheritance:[name],parameters:result,
  role:'actual compiler observation correlation; runtime/historical identity proof still required'};
}
