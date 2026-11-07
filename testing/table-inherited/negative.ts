import {Component} from '@angular/core';
@Component({standalone:true,template:`<table mat-table [dataSource]="rows"></table>`})
class NoTableModule {rows:unknown[]=[]}
