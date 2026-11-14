/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const {resolve} = require('node:path');
const root = resolve(__dirname, '../../..');
const ts = require(root + '/node_modules/typescript');
const f=root+'/residual-public-probe.mts';
const positive=`import {Directive, inject, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Optional, ViewEncapsulation} from '@angular/core';
import {MatPaginatorIntl} from '@angular/material/paginator';
const token = new InjectionToken<string>('option');
@Directive({selector:'[x]', standalone:false}) class X { field=inject(ElementRef); optional=inject(token,{optional:true}); }
@Component({selector:'test-x', template:'', standalone:false, changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None}) class Y {constructor(public intl: MatPaginatorIntl, public ref: ChangeDetectorRef, @Optional() @Inject(token) public opt: string | null) {intl.changes.subscribe(()=>ref.markForCheck());}}
`;
const negative=`\ninject(42); ChangeDetectionStrategy.Nonexistent; ViewEncapsulation.Nonexistent; new MatPaginatorIntl().changes.notAMethod();\n`;
const opts={strict:true,noEmit:true,skipLibCheck:false,experimentalDecorators:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]};
function run(text){let host=ts.createCompilerHost(opts),old=host.getSourceFile;host.getSourceFile=(n,l,...rest)=>n===f?ts.createSourceFile(n,text,l,true):old(n,l,...rest);host.fileExists=(old=>n=>n===f||old(n))(host.fileExists.bind(host));host.readFile=(old=>n=>n===f?text:old(n))(host.readFile.bind(host));const p=ts.createProgram([f],opts,host);return ts.getPreEmitDiagnostics(p).map(d=>({code:d.code,file:d.file?.fileName?.replace(root,'<root>'),message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));}
const ok=run(positive),bad=run(positive+negative);console.log(JSON.stringify({typescript:ts.version,core:require(root+'/node_modules/@angular/core/package.json').version,material:require(root+'/node_modules/@angular/material/package.json').version,options:opts,positive:ok,negative:bad,positive_source:positive,negative_faults:negative},null,2));if(ok.length||bad.length<4)process.exit(1);
