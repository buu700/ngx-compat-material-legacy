/**
 * Minimal MatCommonModule stand-in for legacy NgModules.
 * Historical MatCommonModule is gone from current @angular/material/core;
 * export CDK Bidi for directionality consumers.
 */
import {BidiModule} from '@angular/cdk/bidi';
import {NgModule} from '@angular/core';

@NgModule({
  imports: [BidiModule],
  exports: [BidiModule],
})
export class MatCommonModule {}
