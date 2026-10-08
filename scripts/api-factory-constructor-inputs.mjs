/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Capture actual compiler-factory constructor inputs without changing its code or Angular hooks. */
export function captureFactoryConstructorInputs(Type,factory=Type.ɵfac){
 let inputs,calls=0;
 class Receiver extends Type {
  constructor(...values){super(...values);inputs=values;calls++;}
 }
 const value=factory(Receiver);
 if(calls!==1||!(value instanceof Receiver))throw Error('factory did not preserve its constructor-type override; input evidence unavailable');
 return {value,inputs,constructor_calls:calls,receiver:Receiver};
}
